const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 8787);
const ROOT = __dirname;
const BLOG_JSON_PATH = path.join(ROOT, "blog", "blog.json");
const BLOG_IMAGES_DIR = path.join(ROOT, "blog", "images_blog");

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sanitizeBaseName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseDateParts(dateParts) {
  const year = Number(dateParts && dateParts.year);
  const day = Number(dateParts && dateParts.day);
  const month = String(dateParts && dateParts.month || "").toLowerCase();
  const monthIndex = MONTH_NAMES.indexOf(month);
  if (!Number.isInteger(year) || year < 1900 || year > 3000) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  if (monthIndex < 0) return null;
  return `${year} ${String(day).padStart(2, "0")} ${MONTH_NAMES[monthIndex]}`;
}

function clampScale(scale) {
  const numeric = Number(scale);
  if (!Number.isFinite(numeric)) return 1;
  if (numeric < 0.2) return 0.2;
  if (numeric > 1) return 1;
  return Number(numeric.toFixed(2));
}

async function readBlogs() {
  const raw = await fsp.readFile(BLOG_JSON_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeBlogs(blogs) {
  const formatted = JSON.stringify(blogs, null, 2) + "\n";
  await fsp.writeFile(BLOG_JSON_PATH, formatted, "utf8");
}

async function ensureUniqueFilename(originalName) {
  const safeName = sanitizeBaseName(originalName || "image");
  const ext = path.extname(safeName).toLowerCase();
  const base = path.basename(safeName, ext) || "image";
  const allowed = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
  const finalExt = allowed.has(ext) ? ext : ".png";
  const firstCandidate = `${base}${finalExt}`;
  const firstPath = path.join(BLOG_IMAGES_DIR, firstCandidate);
  try {
    await fsp.access(firstPath, fs.constants.F_OK);
  } catch {
    return firstCandidate;
  }

  const datedBase = `${base}_${todayIsoDate()}`;
  let counter = 0;
  while (true) {
    const suffix = counter === 0 ? "" : `_${counter}`;
    const candidate = `${datedBase}${suffix}${finalExt}`;
    const candidatePath = path.join(BLOG_IMAGES_DIR, candidate);
    try {
      await fsp.access(candidatePath, fs.constants.F_OK);
      counter += 1;
    } catch {
      return candidate;
    }
  }
}

async function saveImageFromPayload(imagePayload) {
  if (!imagePayload || !imagePayload.dataUrl || !imagePayload.fileName) return null;
  await fsp.mkdir(BLOG_IMAGES_DIR, { recursive: true });
  const dataUrl = String(imagePayload.dataUrl);
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) throw new Error("Invalid image payload");
  const base64 = dataUrl.slice(commaIndex + 1);
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) throw new Error("Empty image data");
  const targetName = await ensureUniqueFilename(imagePayload.fileName);
  const targetPath = path.join(BLOG_IMAGES_DIR, targetName);
  await fsp.writeFile(targetPath, buffer);
  return targetName;
}

function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleApi(req, res) {
  const requestUrl = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = requestUrl.pathname;
  const indexMatch = pathname.match(/^\/api\/blogs\/(\d+)$/);

  if (pathname === "/api/blogs" && req.method === "GET") {
    try {
      const blogs = await readBlogs();
      return sendJson(res, 200, { blogs });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to read blog.json" });
    }
  }

  if (pathname === "/api/blogs" && req.method === "POST") {
    try {
      const bodyRaw = await collectRequestBody(req);
      const body = JSON.parse(bodyRaw || "{}");
      const title = String(body.title || "").trim();
      const textA = String(body.textA || "");
      const textB = String(body.textB || "");
      const textC = String(body.textC || "");
      const dateString = parseDateParts(body.dateParts);
      if (!title || !textA.trim() || !textB.trim() || !textC.trim() || !dateString) {
        return sendJson(res, 400, { error: "Missing required fields" });
      }

      const imageAName = await saveImageFromPayload(body.imageA);
      const imageBName = await saveImageFromPayload(body.imageB);
      const imageAScale = clampScale(body.imageAScale);
      const imageBScale = clampScale(body.imageBScale);

      const sections = [{ Atekst: textA }];
      if (imageAName) {
        sections.push({ Abillede: imageAName, AbilledeScale: imageAScale });
      }
      sections.push({ Btekst: textB });
      if (imageBName) {
        sections.push({ Bbillede: imageBName, BbilledeScale: imageBScale });
      }
      sections.push({ Ctekst: textC });

      const newPost = {
        titel: title,
        dato: dateString,
        sektioner: sections
      };

      const blogs = await readBlogs();
      blogs.push(newPost);
      await writeBlogs(blogs);
      return sendJson(res, 200, { ok: true, blogs });
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "Failed to save post" });
    }
  }

  if (indexMatch && req.method === "PUT") {
    try {
      const targetIndex = Number(indexMatch[1]);
      const blogs = await readBlogs();
      if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= blogs.length) {
        return sendJson(res, 404, { error: "Post not found" });
      }

      const bodyRaw = await collectRequestBody(req);
      const body = JSON.parse(bodyRaw || "{}");
      const title = String(body.title || "").trim();
      const textA = String(body.textA || "");
      const textB = String(body.textB || "");
      const textC = String(body.textC || "");
      const dateString = parseDateParts(body.dateParts);
      if (!title || !textA.trim() || !textB.trim() || !textC.trim() || !dateString) {
        return sendJson(res, 400, { error: "Missing required fields" });
      }

      const imageAScale = clampScale(body.imageAScale);
      const imageBScale = clampScale(body.imageBScale);

      const imageAName = body.imageA
        ? await saveImageFromPayload(body.imageA)
        : (body.existingImageAName ? String(body.existingImageAName) : null);
      const imageBName = body.imageB
        ? await saveImageFromPayload(body.imageB)
        : (body.existingImageBName ? String(body.existingImageBName) : null);

      const sections = [{ Atekst: textA }];
      if (imageAName) {
        sections.push({ Abillede: imageAName, AbilledeScale: imageAScale });
      }
      sections.push({ Btekst: textB });
      if (imageBName) {
        sections.push({ Bbillede: imageBName, BbilledeScale: imageBScale });
      }
      sections.push({ Ctekst: textC });

      blogs[targetIndex] = {
        titel: title,
        dato: dateString,
        sektioner: sections
      };

      await writeBlogs(blogs);
      return sendJson(res, 200, { ok: true, blogs });
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "Failed to update post" });
    }
  }

  if (indexMatch && req.method === "DELETE") {
    try {
      const targetIndex = Number(indexMatch[1]);
      const blogs = await readBlogs();
      if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= blogs.length) {
        return sendJson(res, 404, { error: "Post not found" });
      }
      blogs.splice(targetIndex, 1);
      await writeBlogs(blogs);
      return sendJson(res, 200, { ok: true, blogs });
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "Failed to delete post" });
    }
  }

  sendJson(res, 404, { error: "Not found" });
}

function resolveStaticFile(urlPath) {
  const normalized = urlPath === "/" ? "/blog-editor.html" : urlPath;
  const fullPath = path.normalize(path.join(ROOT, decodeURIComponent(normalized)));
  if (!fullPath.startsWith(ROOT)) return null;
  return fullPath;
}

async function handleStatic(req, res) {
  const filePath = resolveStaticFile(req.url.split("?")[0]);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith("/api/")) {
    return handleApi(req, res);
  }
  return handleStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Blog editor running at http://${HOST}:${PORT}/blog-editor.html`);
});
