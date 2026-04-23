"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const SCHEMA_VERSION = 1;
const THREE_MONTHS = 3;

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function subtractMonths(date, months) {
  const out = new Date(date.getTime());
  out.setMonth(out.getMonth() - months);
  return out;
}

function ensureObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `${name} must be an object.`
    );
  }
  return value;
}

function monthKeyLooksValid(key) {
  return /^\d{4}-\d{2}$/.test(key);
}

async function readEligibility(uid) {
  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();
  const data = snap.exists ? snap.data() || {} : {};

  const isPremium = data.isPremium === true;
  const createdAt = toDate(data.createdAt);
  const lastExportAt = toDate(data.lastExportAt);

  return { userRef, data, isPremium, createdAt, lastExportAt };
}

function assertEligibleForExport(state) {
  const now = new Date();
  const minDate = subtractMonths(now, THREE_MONTHS);

  if (!state.isPremium) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Export denied: premium subscription is required."
    );
  }
  if (!state.createdAt || state.createdAt > minDate) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Export denied: account must be at least 3 months old."
    );
  }
  if (state.lastExportAt && state.lastExportAt > minDate) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Export denied: you can export once every 3 months."
    );
  }
}

exports.exportJournalData = functions.https.onCall(async (_data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in."
    );
  }

  const uid = context.auth.uid;
  const state = await readEligibility(uid);
  assertEligibleForExport(state);

  const userRef = state.userRef;
  const rootUser = ensureObject(state.data.user || {}, "user");
  const monthsIndex = rootUser.monthsIndex && typeof rootUser.monthsIndex === "object"
    ? rootUser.monthsIndex
    : {};

  const monthsSnap = await userRef.collection("months").get();
  const months = {};
  monthsSnap.forEach((docSnap) => {
    months[docSnap.id] = docSnap.data() || {};
  });

  await userRef.set(
    {
      lastExportAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    user: {
      monthsIndex,
    },
    months,
  };
});

exports.importJournalData = functions.https.onCall(async (input, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in."
    );
  }

  const payload = ensureObject(input || {}, "payload");
  if (payload.schemaVersion !== SCHEMA_VERSION) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Unsupported schemaVersion. Expected ${SCHEMA_VERSION}.`
    );
  }

  const userData = ensureObject(payload.user || {}, "user");
  const monthsIndex = ensureObject(userData.monthsIndex || {}, "user.monthsIndex");
  const months = ensureObject(payload.months || {}, "months");

  const uid = context.auth.uid;
  const userRef = db.collection("users").doc(uid);

  const userSnap = await userRef.get();
  const existing = userSnap.exists ? userSnap.data() || {} : {};
  const existingRootUser = (existing.user && typeof existing.user === "object") ? existing.user : {};

  await userRef.set(
    {
      user: {
        ...existingRootUser,
        monthsIndex,
      },
      lastImportAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  let writtenMonths = 0;
  const monthEntries = Object.entries(months);
  for (const [monthKey, monthPayload] of monthEntries) {
    if (!monthKeyLooksValid(monthKey)) continue;
    if (!monthPayload || typeof monthPayload !== "object" || Array.isArray(monthPayload)) continue;

    await userRef.collection("months").doc(monthKey).set(monthPayload, { merge: true });
    writtenMonths += 1;
  }

  return {
    ok: true,
    schemaVersion: SCHEMA_VERSION,
    monthsReceived: monthEntries.length,
    monthsWritten: writtenMonths,
  };
});
