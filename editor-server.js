const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 8787);
const ROOT = __dirname;
const BLOG_HTML_PATH = path.join(ROOT, "blog.html");
const BLOG_IMAGES_DIR = path.join(ROOT, "blog", "images_blog");
const POSTS_START = "<!-- BLOG_POSTS_START -->";
const POSTS_END = "<!-- BLOG_POSTS_END -->";
const ALLOWED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif"]);
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif"]);

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
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

function escapeHtml(raw) {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(raw) {
  return escapeHtml(raw).replace(/"/g, "&quot;");
}

function stripTags(raw) {
  return String(raw ?? "").replace(/<[^>]*>/g, "");
}

function sanitizeBaseName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function slugify(text, fallback = "post") {
  const normalized = String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseDateParts(dateParts) {
  if (dateParts == null) return null;
  if (typeof dateParts === "string") return parseDateFromDatoString(dateParts);
  if (typeof dateParts !== "object" || Array.isArray(dateParts)) return null;
  const yearStr = String(dateParts.year ?? "").trim();
  const dayStr = String(dateParts.day ?? "").trim();
  const month = String(dateParts.month ?? "").trim().toLowerCase();
  if (!/^\d{4}$/.test(yearStr)) return null;
  if (!/^\d{1,2}$/.test(dayStr)) return null;
  const year = Number(yearStr);
  const day = Number(dayStr);
  const monthIndex = MONTH_NAMES.indexOf(month);
  if (!Number.isInteger(year) || year < 1900 || year > 3000) return null;
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  if (monthIndex < 0) return null;
  return `${year} ${String(day).padStart(2, "0")} ${MONTH_NAMES[monthIndex]}`;
}

function parseDateFromDatoString(raw) {
  const m = String(raw ?? "").trim().match(/^(\d{4})\s+(\d{1,2})\s+([a-zA-Z]+)$/i);
  if (!m) return null;
  return parseDateParts({ year: m[1], day: m[2], month: m[3].toLowerCase() });
}

function resolveDateString(body) {
  if (!body || typeof body !== "object") return null;
  let s = parseDateParts(body.dateParts);
  if (s) return s;
  s = parseDateParts({ year: body.year, day: body.day, month: body.month });
  if (s) return s;
  return parseDateFromDatoString(body.dato);
}

function clampScale(scale) {
  const numeric = Number(scale);
  if (!Number.isFinite(numeric)) return 1;
  if (numeric < 0.2) return 0.2;
  if (numeric > 1) return 1;
  return Number(numeric.toFixed(2));
}

function normalizeBlogUrl(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  let u;
  try {
    u = new URL(withScheme);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  return u.href;
}

function linkSecondaryLabel(canonicalHref) {
  try {
    const u = new URL(canonicalHref);
    const tail = u.pathname + (u.search || "") + (u.hash || "");
    if (tail === "/" || tail === "") return u.host || canonicalHref;
    return u.host + tail;
  } catch {
    return canonicalHref;
  }
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

async function ensureUniqueFilename(originalName) {
  const safeName = sanitizeBaseName(originalName || "image");
  const ext = path.extname(safeName).toLowerCase();
  const base = path.basename(safeName, ext) || "image";
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    throw new Error("Ugyldig billedtype. Brug kun png, jpg, jpeg eller gif.");
  }
  const finalExt = ext;
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
  const mimeMatch = dataUrl.match(/^data:([^;,]+)[;,]/i);
  const mimeType = mimeMatch ? String(mimeMatch[1]).toLowerCase() : "";
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error("Ugyldig billedtype. Brug kun png, jpg, jpeg eller gif.");
  }
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) throw new Error("Invalid image payload");
  const base64 = dataUrl.slice(commaIndex + 1);
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) throw new Error("Empty image data");
  const targetName = await ensureUniqueFilename(imagePayload.fileName);
  await fsp.writeFile(path.join(BLOG_IMAGES_DIR, targetName), buffer);
  return targetName;
}

async function readBlogHtml() {
  return fsp.readFile(BLOG_HTML_PATH, "utf8");
}

async function writeBlogHtml(nextHtml) {
  const temp = BLOG_HTML_PATH + ".tmp";
  await fsp.writeFile(temp, nextHtml, "utf8");
  await fsp.rename(temp, BLOG_HTML_PATH);
}

function getPostsRegion(html) {
  const start = html.indexOf(POSTS_START);
  const end = html.indexOf(POSTS_END);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("Could not locate blog post markers in blog.html");
  }
  const before = html.slice(0, start + POSTS_START.length);
  const region = html.slice(start + POSTS_START.length, end);
  const after = html.slice(end);
  return { before, region, after };
}

function extractArticleBlocks(region) {
  const blocks = [];
  const articleRegex = /<article\b[\s\S]*?<\/article>/g;
  let match;
  while ((match = articleRegex.exec(region)) !== null) {
    const block = match[0];
    const start = match.index;
    const end = start + block.length;
    blocks.push({ block, start, end });
  }
  return blocks;
}

function attrFromArticle(openTag, attrName) {
  const m = openTag.match(new RegExp(`${attrName}="([^"]*)"`, "i"));
  return m ? m[1] : "";
}

function parsePostFromArticle(articleHtml, fallbackIndex) {
  const openTagMatch = articleHtml.match(/<article\b[^>]*>/i);
  const openTag = openTagMatch ? openTagMatch[0] : "<article>";
  const id = attrFromArticle(openTag, "id") || `post-${fallbackIndex + 1}`;
  const dateAttr = attrFromArticle(openTag, "data-date");
  const titleMatch = articleHtml.match(/<h2>([\s\S]*?)<\/h2>/i);
  const dateChipMatch = articleHtml.match(/<span class="blog-date">([\s\S]*?)<\/span>/i);
  const pMatches = Array.from(articleHtml.matchAll(/<p>([\s\S]*?)<\/p>/gi));
  const imgMatches = Array.from(articleHtml.matchAll(/<img\b[^>]*>/gi));
  const linkAnchorMatch = articleHtml.match(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
  const linkNameMatch = articleHtml.match(/<p class="blog-post-link-line">Link:\s*([\s\S]*?)<\/p>/i);

  const textA = pMatches[0] ? stripTags(pMatches[0][1]).trim() : "";
  const textB = pMatches[1] ? stripTags(pMatches[1][1]).trim() : "";
  const textC = pMatches[2] ? stripTags(pMatches[2][1]).trim() : "";
  const imageAName = imgMatches[0] ? (imgMatches[0][0].match(/src="blog\/images_blog\/([^"]+)"/i) || [])[1] : null;
  const imageBName = imgMatches[1] ? (imgMatches[1][0].match(/src="blog\/images_blog\/([^"]+)"/i) || [])[1] : null;
  const imageAScale = imgMatches[0] ? parseScaleFromImgTag(imgMatches[0][0]) : 1;
  const imageBScale = imgMatches[1] ? parseScaleFromImgTag(imgMatches[1][0]) : 1;

  const dato = (dateChipMatch ? stripTags(dateChipMatch[1]) : dateAttr || "").trim();
  const post = {
    id,
    titel: (titleMatch ? stripTags(titleMatch[1]) : "").trim(),
    dato,
    sektioner: [{ Atekst: textA }]
  };
  if (imageAName) post.sektioner.push({ Abillede: imageAName, AbilledeScale: imageAScale });
  post.sektioner.push({ Btekst: textB });
  if (imageBName) post.sektioner.push({ Bbillede: imageBName, BbilledeScale: imageBScale });
  post.sektioner.push({ Ctekst: textC });
  if (linkAnchorMatch && linkAnchorMatch[1]) {
    post.linkUrl = linkAnchorMatch[1].trim();
  }
  if (linkNameMatch && linkNameMatch[1]) {
    post.linkNavn = stripTags(linkNameMatch[1]).trim();
  }
  return post;
}

function parseScaleFromImgTag(imgTag) {
  const styleMatch = imgTag.match(/max-width:\s*min\((\d+)px,\s*(\d+)%\)/i);
  if (!styleMatch) return 1;
  const px = Number(styleMatch[1]);
  if (!Number.isFinite(px)) return 1;
  return clampScale(px / 460);
}

function extractPostsFromHtml(html) {
  const { region } = getPostsRegion(html);
  const blocks = extractArticleBlocks(region);
  return blocks.map((entry, index) => parsePostFromArticle(entry.block, index));
}

function buildImageTag(fileName, alignClass, altText, scale) {
  if (!fileName) return "";
  const normalizedScale = clampScale(scale);
  return `                            <img class="blog-image ${alignClass}" src="blog/images_blog/${escapeAttr(fileName)}" alt="${escapeAttr(altText)}" loading="lazy" decoding="async" style="max-width:min(${Math.round(460 * normalizedScale)}px, ${Math.round(60 * normalizedScale)}%);">`;
}

function buildLinkBlock(post) {
  const href = normalizeBlogUrl(post.linkUrl);
  if (!href) return "";
  const name = String(post.linkNavn || "").trim();
  const label = name ? `Link: ${escapeHtml(name)}` : "Link:";
  const secondary = escapeHtml(linkSecondaryLabel(href));
  return [
    '                            <div class="blog-post-link">',
    `                                <p class="blog-post-link-line">${label}</p>`,
    `                                <p class="blog-post-link-line"><a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${secondary}</a></p>`,
    "                            </div>"
  ].join("\n");
}

function sectionValue(post, key) {
  const sections = Array.isArray(post && post.sektioner) ? post.sektioner : [];
  for (const entry of sections) {
    if (entry && typeof entry === "object" && Object.prototype.hasOwnProperty.call(entry, key)) {
      return entry[key];
    }
  }
  return null;
}

function buildArticleHtml(post, index) {
  const title = String(post.titel || "").trim() || `Blog ${index + 1}`;
  const safeDate = parseDateFromDatoString(post.dato) || parseDateFromDatoString(post.dataDate) || "";
  const postId = String(post.id || post.postId || "").trim() || `post-${slugify(title, `post-${index + 1}`)}`;
  const textA = String(sectionValue(post, "Atekst") || "");
  const textB = String(sectionValue(post, "Btekst") || "");
  const textC = String(sectionValue(post, "Ctekst") || "");
  const imageAName = sectionValue(post, "Abillede");
  const imageBName = sectionValue(post, "Bbillede");
  const imageAScale = clampScale(sectionValue(post, "AbilledeScale"));
  const imageBScale = clampScale(sectionValue(post, "BbilledeScale"));

  const lines = [
    `                        <article class="blog-post" id="${escapeAttr(postId)}" data-post-id="${escapeAttr(postId)}" data-date="${escapeAttr(safeDate)}">`,
    `                            <h2>${escapeHtml(title)}</h2>`,
    `                            <span class="blog-date">${escapeHtml(safeDate)}</span>`,
    `                            <p>${escapeHtml(textA)}</p>`
  ];

  const imageA = buildImageTag(imageAName, "blog-image-left", `${title} billede 1`, imageAScale);
  if (imageA) lines.push(imageA);
  lines.push(`                            <p>${escapeHtml(textB)}</p>`);
  const imageB = buildImageTag(imageBName, "blog-image-right", `${title} billede 2`, imageBScale);
  if (imageB) lines.push(imageB);
  lines.push(`                            <p>${escapeHtml(textC)}</p>`);
  const linkBlock = buildLinkBlock(post);
  if (linkBlock) lines.push(linkBlock);
  lines.push("                        </article>");
  return lines.join("\n");
}

function replacePostRegion(html, posts) {
  const { before, after } = getPostsRegion(html);
  const renderedPosts = posts.map((post, index) => buildArticleHtml(post, index)).join("\n\n");
  return `${before}\n${renderedPosts}\n                        ${after}`;
}

async function readPostsFromSource() {
  const html = await readBlogHtml();
  return extractPostsFromHtml(html);
}

async function mutatePosts(mutator) {
  const html = await readBlogHtml();
  const posts = extractPostsFromHtml(html);
  const nextPosts = await mutator(posts);
  const nextHtml = replacePostRegion(html, nextPosts);
  await writeBlogHtml(nextHtml);
  return nextPosts;
}

function payloadToPost(body, fallbackId) {
  const title = String(body.title || "").trim();
  const textA = String(body.textA || "");
  const textB = String(body.textB || "");
  const textC = String(body.textC || "");
  const dateString = resolveDateString(body);
  if (!title) throw new Error("Mangler overskrift");
  if (!dateString) throw new Error("Ugyldig dato");

  const postIdBase = String(body.postId || "").trim() || `post-${slugify(title, fallbackId || "post")}`;
  const postId = postIdBase.startsWith("post-") ? postIdBase : `post-${postIdBase}`;
  const post = {
    id: postId,
    titel: title,
    dato: dateString,
    sektioner: [{ Atekst: textA }]
  };

  const imageAName = body.imageAName ? String(body.imageAName) : null;
  const imageBName = body.imageBName ? String(body.imageBName) : null;
  const imageAScale = clampScale(body.imageAScale);
  const imageBScale = clampScale(body.imageBScale);
  if (imageAName) post.sektioner.push({ Abillede: imageAName, AbilledeScale: imageAScale });
  post.sektioner.push({ Btekst: textB });
  if (imageBName) post.sektioner.push({ Bbillede: imageBName, BbilledeScale: imageBScale });
  post.sektioner.push({ Ctekst: textC });

  const linkUrl = normalizeBlogUrl(body.linkUrl);
  const linkNavn = String(body.linkNavn || "").trim();
  if (linkUrl) post.linkUrl = linkUrl;
  if (linkNavn) post.linkNavn = linkNavn;

  return post;
}

async function resolvePayloadWithUploads(body) {
  const imageAName = body.imageA
    ? await saveImageFromPayload(body.imageA)
    : (body.existingImageAName ? String(body.existingImageAName) : null);
  const imageBName = body.imageB
    ? await saveImageFromPayload(body.imageB)
    : (body.existingImageBName ? String(body.existingImageBName) : null);
  return { ...body, imageAName, imageBName };
}

async function handleApi(req, res) {
  const requestUrl = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = requestUrl.pathname;
  const idMatch = pathname.match(/^\/api\/blogs\/([^/]+)$/);

  if (pathname === "/api/blogs" && req.method === "GET") {
    try {
      const posts = await readPostsFromSource();
      return sendJson(res, 200, { blogs: posts });
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "Failed to read posts" });
    }
  }

  if (pathname === "/api/blogs" && req.method === "POST") {
    try {
      const bodyRaw = await collectRequestBody(req);
      const body = JSON.parse(bodyRaw || "{}");
      const withUploads = await resolvePayloadWithUploads(body);
      const blogs = await mutatePosts(async (posts) => {
        const post = payloadToPost(withUploads, `post-${posts.length + 1}`);
        posts.push(post);
        return posts;
      });
      return sendJson(res, 200, { ok: true, blogs });
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "Failed to save post" });
    }
  }

  if (idMatch && req.method === "PUT") {
    try {
      const targetId = decodeURIComponent(idMatch[1]);
      const bodyRaw = await collectRequestBody(req);
      const body = JSON.parse(bodyRaw || "{}");
      const withUploads = await resolvePayloadWithUploads(body);
      const blogs = await mutatePosts(async (posts) => {
        const idx = posts.findIndex((post) => post.id === targetId);
        if (idx < 0) {
          const e = new Error("Post not found");
          e.code = 404;
          throw e;
        }
        const nextPost = payloadToPost({ ...withUploads, postId: targetId }, targetId);
        posts[idx] = nextPost;
        return posts;
      });
      return sendJson(res, 200, { ok: true, blogs });
    } catch (error) {
      if (error && error.code === 404) {
        return sendJson(res, 404, { error: "Post not found" });
      }
      return sendJson(res, 500, { error: error.message || "Failed to update post" });
    }
  }

  if (idMatch && req.method === "DELETE") {
    try {
      const targetId = decodeURIComponent(idMatch[1]);
      const blogs = await mutatePosts(async (posts) => {
        const idx = posts.findIndex((post) => post.id === targetId);
        if (idx < 0) {
          const e = new Error("Post not found");
          e.code = 404;
          throw e;
        }
        posts.splice(idx, 1);
        return posts;
      });
      return sendJson(res, 200, { ok: true, blogs });
    } catch (error) {
      if (error && error.code === 404) {
        return sendJson(res, 404, { error: "Post not found" });
      }
      return sendJson(res, 500, { error: error.message || "Failed to delete post" });
    }
  }

  return sendJson(res, 404, { error: "Not found" });
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
  if (req.url.startsWith("/api/")) return handleApi(req, res);
  return handleStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Blog editor running at http://${HOST}:${PORT}/blog-editor.html`);
});
