#!/usr/bin/env node
/**
 * Rebuild user.monthsIndex from months payload in a journal export JSON.
 * Usage: node scripts/rebuild-months-index.js <path-to-export.json>
 */

const fs = require("fs");
const path = require("path");

function countSection(section) {
  if (!section) return 0;
  if (Array.isArray(section)) return section.length;
  if (typeof section !== "object") return 0;
  if (Array.isArray(section.setups)) return section.setups.length;
  if (Array.isArray(section.dialogs)) return section.dialogs.length;
  if (Array.isArray(section.comparisons)) return section.comparisons.length;
  if (Array.isArray(section.maps)) return section.maps.length;
  if (section.bodymaps && Array.isArray(section.bodymaps.maps)) {
    return section.bodymaps.maps.length;
  }
  if (typeof section.encrypted === "string") return 0;
  return Object.keys(section).length;
}

function countLogbog(logbog) {
  if (!logbog) return 0;
  if (Array.isArray(logbog)) return logbog.length;
  if (typeof logbog === "object") return Object.keys(logbog).length;
  return 0;
}

function monthKeyLooksValid(key) {
  return /^\d{4}-\d{2}$/.test(key);
}

function buildMonthsIndexFromMonths(months) {
  const index = {};
  for (const [monthKey, monthData] of Object.entries(months || {})) {
    if (!monthKeyLooksValid(monthKey)) continue;
    if (!monthData || typeof monthData !== "object" || Array.isArray(monthData)) {
      continue;
    }
    if (typeof monthData.encrypted === "string") {
      console.warn(`  skip ${monthKey}: encrypted month (cannot count)`);
      continue;
    }
    index[monthKey] = {
      logbogCount: countLogbog(monthData.logbog),
      opstillingCount: countSection(monthData.opstilling),
      dialogCount: countSection(monthData.dialog),
      bodymapCount: countSection(monthData.bodymap ?? monthData.bodymaps),
      spejlingCount: countSection(monthData.spejling),
    };
  }
  return index;
}

function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Usage: node scripts/rebuild-months-index.js <export.json>");
    process.exit(1);
  }

  const filePath = path.resolve(fileArg);
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);

  if (!data.months || typeof data.months !== "object") {
    console.error("Invalid export: missing months object");
    process.exit(1);
  }

  if (!data.user || typeof data.user !== "object") {
    data.user = {};
  }

  const oldIndex = data.user.monthsIndex || {};
  const newIndex = buildMonthsIndexFromMonths(data.months);

  console.log("monthsIndex rebuild:\n");
  const allKeys = new Set([
    ...Object.keys(oldIndex),
    ...Object.keys(newIndex),
  ]);
  for (const mk of [...allKeys].sort()) {
    const o = oldIndex[mk] || {};
    const n = newIndex[mk] || {};
    const fields = [
      "logbogCount",
      "opstillingCount",
      "dialogCount",
      "bodymapCount",
      "spejlingCount",
    ];
    const changed = fields.some((f) => (o[f] ?? 0) !== (n[f] ?? 0));
    if (!newIndex[mk]) continue;
    const fmt = (e) =>
      fields.map((f) => `${f}=${e[f] ?? 0}`).join(" ");
    console.log(`${mk}${changed ? " *" : ""}`);
    console.log(`  before: ${fmt(o)}`);
    console.log(`  after:  ${fmt(n)}`);
  }

  data.user.monthsIndex = newIndex;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`\nUpdated: ${filePath}`);
}

main();
