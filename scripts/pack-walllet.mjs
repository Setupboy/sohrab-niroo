/**
 * Packs the Walllet business-account walk-through into a self-contained folder
 * for upload to sohrabniroo.com/walllet-business-account.
 *
 * The live site keeps standalone pages in their own docroot subfolder
 * (MoviesbeforeDoomsday, punchapp, fc26) rather than as loose .html files, so
 * this emits the same shape: index.html plus only the assets it actually needs.
 * Every asset path in the page is already relative, so they resolve under the
 * subfolder with no rewriting.
 *
 *   node scripts/pack-walllet.mjs        (run `npm run prod` first)
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync, rmSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "dist");
const OUT = join(ROOT, "deploy", "walllet-business-account");
const PAGE = "walllet-business-account.html";
const IMG_REL = "assets/img/Assets/WallletBusinessAccount";

const die = (m) => { console.error("\n✖ " + m + "\n"); process.exit(1); };

if (!existsSync(join(SRC, PAGE))) die(`No dist/${PAGE} — run \`npm run prod\` first.`);

if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(join(OUT, "assets/css"), { recursive: true });
mkdirSync(join(OUT, "assets/js"), { recursive: true });
mkdirSync(join(OUT, IMG_REL), { recursive: true });

let html = readFileSync(join(SRC, PAGE), "utf8");

/*
 * The shared head partial points the favicon at Sohrab's logo. This page is a
 * Walllet deliverable, so it carries its own mark inline instead — no extra
 * request, and no portfolio branding in the browser tab.
 */
const favicon =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
      '<rect width="32" height="32" rx="9" fill="#1332A3"/>' +
      '<text x="16" y="23" font-family="Anta, Onest, sans-serif" font-size="19" fill="#fff" text-anchor="middle">w</text>' +
      "</svg>"
  );
const before = html;
html = html.replace(
  /<link rel="icon"[^>]*>/,
  `<link rel="icon" href="${favicon}" type="image/svg+xml">`
);
if (html === before) console.warn("  ! favicon link not found — left as is");

writeFileSync(join(OUT, "index.html"), html);

const assets = [
  "assets/css/style.css",
  "assets/css/venobox.min.css",
  "assets/js/theme.js",
  "assets/js/venobox.min.js",
];
for (const rel of assets) {
  if (!existsSync(join(SRC, rel))) die(`Missing ${rel} in dist.`);
  copyFileSync(join(SRC, rel), join(OUT, rel));
}

const shots = readdirSync(join(SRC, IMG_REL)).filter((f) => f.endsWith(".webp"));
if (shots.length !== 43) die(`Expected 43 screenshots, found ${shots.length}.`);
for (const f of shots) copyFileSync(join(SRC, IMG_REL, f), join(OUT, IMG_REL, f));

/* Every asset the page references must exist in the packed folder. */
const referenced = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map((m) => m[1]);
const missing = [...new Set(referenced)].filter((r) => !existsSync(join(OUT, r)));
if (missing.length) die("Page references assets that were not packed:\n  " + missing.join("\n  "));

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : [statSync(p).size];
});
const sizes = walk(OUT);
console.log(`\n  packed ${sizes.length} files, ${(sizes.reduce((a, b) => a + b, 0) / 1024).toFixed(0)} kB`);
console.log(`  ${OUT}`);
console.log(`  referenced assets resolved: ${new Set(referenced).size}\n`);
