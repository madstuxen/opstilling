"use strict";

const BLOG_TAGS = [
  "App",
  "Dialogue",
  "Journaling",
  "Constellation",
  "BodyScan",
  "Mirroring"
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { BLOG_TAGS };
}

if (typeof window !== "undefined") {
  window.BLOG_TAGS = BLOG_TAGS;
}
