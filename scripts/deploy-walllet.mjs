/**
 * Publish deploy/walllet-business-account to sohrabniroo.com/walllet-business-account.
 *
 *   node scripts/deploy-walllet.mjs --list [/abs/path]   list a remote dir, write nothing
 *   node scripts/deploy-walllet.mjs --dry-run            connect, check the target, send nothing
 *   node scripts/deploy-walllet.mjs                      upload
 *
 * Same two rules as the watchlist deploy this is modelled on:
 *
 *   1. It only ever writes inside this page's own subfolder. The account root,
 *      the sohrabniroo.com docroot and the sibling sites are hard-refused, so a
 *      typo in REMOTE_DIR cannot scatter files over the live portfolio.
 *   2. It never deletes.
 *
 * Credentials come from .env.deploy next to package.json (gitignored).
 */
import SftpClient from "ssh2-sftp-client";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, posix } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "deploy", "walllet-business-account");
const PUBLIC_URL = "https://sohrabniroo.com/walllet-business-account";
const EXPECTED_REMOTE = "/home/smhztko/sohrabniroo/walllet-business-account";

/** Anything that is not this page's own folder. */
const FORBIDDEN = new Set([
  "",
  "/",
  "/home",
  "/home/smhztko",
  "/home/smhztko/www",
  "/home/smhztko/sohrabniroo",
  "/home/smhztko/sohrabniroo/MoviesbeforeDoomsday",
  "/home/smhztko/sohrabniroo/punchapp",
  "/home/smhztko/sohrabniroo/fc26",
  "/home/smhztko/sohrabniroo/assets",
  "/home/smhztko/gymclude",
  "/home/smhztko/cluders",
  "/home/smhztko/mahmoud",
]);

function die(message) {
  console.error("\n✖ " + message + "\n");
  process.exit(1);
}

function loadConfig() {
  const path = join(ROOT, ".env.deploy");
  if (!existsSync(path)) die("No .env.deploy next to package.json.");
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  for (const k of ["FTP_HOST", "FTP_USER", "FTP_PASSWORD", "REMOTE_DIR"]) {
    if (!env[k]) die(`${k} is missing from .env.deploy.`);
  }
  const remote = env.REMOTE_DIR.replace(/\/+$/, "");
  if (FORBIDDEN.has(remote)) {
    die(
      `REMOTE_DIR is "${env.REMOTE_DIR}".\n` +
        `  That is the account root, the docroot, or another page on this site.\n` +
        `  It must be this page's own folder:\n  ${EXPECTED_REMOTE}`
    );
  }
  if (remote !== EXPECTED_REMOTE) {
    die(`REMOTE_DIR is "${remote}" but this script only publishes ${EXPECTED_REMOTE}.`);
  }
  return { host: env.FTP_HOST, user: env.FTP_USER, password: env.FTP_PASSWORD, remote };
}

function walk(dir, base = "") {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = base ? posix.join(base, name) : name;
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else out.push({ local: full, rel, size: statSync(full).size });
  }
  return out;
}

async function connect(config) {
  const sftp = new SftpClient();
  await sftp.connect({
    host: config.host,
    port: 22,
    username: config.user,
    password: config.password,
    readyTimeout: 20000,
  }).catch((err) => die("Could not connect over SFTP: " + err.message));
  return sftp;
}

const argv = process.argv.slice(2);
const config = loadConfig();

if (argv.includes("--list")) {
  const where = argv.find((a) => a.startsWith("/")) || config.remote;
  const sftp = await connect(config);
  try {
    console.log(`\n  sftp://${config.user}@${config.host} — ${where}\n`);
    if ((await sftp.exists(where)) !== "d") {
      console.log("  (does not exist yet)\n");
    } else {
      for (const e of await sftp.list(where)) {
        console.log(`  ${e.type === "d" ? "dir " : "file"}  ${e.name}${e.type === "d" ? "" : "   " + e.size + " B"}`);
      }
      console.log("");
    }
  } finally {
    await sftp.end();
  }
} else {
  const dryRun = argv.includes("--dry-run");
  if (!existsSync(DIST)) die("No deploy/walllet-business-account — run `node scripts/pack-walllet.mjs` first.");
  const files = walk(DIST);
  if (!files.length) die("deploy/walllet-business-account is empty.");
  if (!files.some((f) => f.rel === "index.html")) die("No index.html in the packed folder.");

  const bytes = files.reduce((n, f) => n + f.size, 0);
  console.log(`\n  ${files.length} files, ${(bytes / 1024).toFixed(1)} kB`);
  console.log(`  ${DIST}`);
  console.log(`    → ${config.user}@${config.host}:${config.remote}\n`);

  const sftp = await connect(config);
  try {
    const parent = posix.dirname(config.remote);
    if ((await sftp.exists(parent)) !== "d") die(`The parent directory ${parent} does not exist.`);

    const fresh = (await sftp.exists(config.remote)) !== "d";
    if (fresh) {
      console.log("  Target does not exist yet — it will be created.");
    } else {
      const existing = await sftp.list(config.remote);
      console.log(`  Target exists, holding ${existing.length} entr${existing.length === 1 ? "y" : "ies"}.`);
      const collisions = existing.filter((e) => files.some((f) => f.rel === e.name));
      if (collisions.length) console.log(`  Will overwrite: ${collisions.map((e) => e.name).join(", ")}`);
    }

    if (dryRun) {
      console.log(`\n✔ Dry run OK — nothing was written.`);
      console.log(`  Re-run without --dry-run to publish to ${PUBLIC_URL}\n`);
    } else {
      if (fresh) await sftp.mkdir(config.remote, true);
      console.log("\n• Uploading…");
      let done = 0;
      for (const f of files) {
        const target = posix.join(config.remote, f.rel);
        await sftp.mkdir(posix.dirname(target), true).catch(() => {});
        await sftp.put(f.local, target);
        done += 1;
        if (f.rel.endsWith(".html") || f.rel.endsWith(".css") || f.rel.endsWith(".js") || done % 10 === 0) {
          console.log(`  sent  ${done}/${files.length}  ${f.rel}`);
        }
      }
      console.log(`\n✔ Published to ${PUBLIC_URL}\n`);
    }
  } finally {
    await sftp.end();
  }
}
