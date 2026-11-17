const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const publishDirectory = path.join(root, "dist");
const siteFiles = [
  "index.html",
  "admin.html",
  "thank-you.html",
  "style.css",
  "admin.css",
  "script.js",
  "admin.js",
  "supabase-config.js",
];

fs.mkdirSync(publishDirectory, { recursive: true });
fs.mkdirSync(path.join(publishDirectory, "assets"), { recursive: true });

for (const file of siteFiles) {
  fs.copyFileSync(path.join(root, file), path.join(publishDirectory, file));
}

fs.copyFileSync(
  path.join(root, "assets", "biwc-logo.png"),
  path.join(publishDirectory, "assets", "biwc-logo.png"),
);
fs.cpSync(
  path.join(root, "assets", "optimized"),
  path.join(publishDirectory, "assets", "optimized"),
  { recursive: true },
);
