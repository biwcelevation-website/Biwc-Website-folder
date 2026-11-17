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

fs.rmSync(publishDirectory, { recursive: true, force: true });
fs.mkdirSync(publishDirectory, { recursive: true });

for (const file of siteFiles) {
  fs.copyFileSync(path.join(root, file), path.join(publishDirectory, file));
}

// Collect every "assets/..." path referenced by the site files.
const assetPattern = /assets\/[^"'()<>\n]+?\.(?:png|jpe?g|gif|webp|svg|avif|ico|mp4|webm)/gi;
const referencedAssets = new Set();
for (const file of siteFiles) {
  const contents = fs.readFileSync(path.join(root, file), "utf8");
  for (const match of contents.matchAll(assetPattern)) {
    referencedAssets.add(decodeURIComponent(match[0]));
  }
}

// Copy each asset into dist, preferring the assets/ folder and falling back
// to a file with the same name at the repository root.
const missing = [];
for (const asset of referencedAssets) {
  const candidates = [path.join(root, asset), path.join(root, path.basename(asset))];
  const source = candidates.find((candidate) => fs.existsSync(candidate));
  if (!source) {
    missing.push(asset);
    continue;
  }
  const destination = path.join(publishDirectory, asset);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

// Also include anything else that lives in an assets/ folder, if present.
const assetsDirectory = path.join(root, "assets");
if (fs.existsSync(assetsDirectory)) {
  fs.cpSync(assetsDirectory, path.join(publishDirectory, "assets"), { recursive: true });
}

console.log(`Copied ${referencedAssets.size - missing.length} referenced assets to dist/assets.`);
if (missing.length > 0) {
  console.warn(`Warning: ${missing.length} referenced asset(s) were not found:\n  ${missing.join("\n  ")}`);
}
