// Build a release artifact for the Sophia SEO Suite extension and refresh the
// release-channel descriptor the Stack's one-click installer fetches (WS4).
//
// Steps:
//   1. pack the installable subset → dist/sophia-seo-suite/
//   2. best-effort zip it (system `zip`, else bsdtar `tar -a`) → dist/<name>.zip
//   3. compute sha256 + byte size of the zip (if produced)
//   4. rewrite release/sophia-seo-suite/channel.json for the current version
//
// Idempotent. Safe to run repeatedly. If no zip tool is present, the channel
// still updates with version/requires + the repo-source fallback; sha256 stays
// null (the installer can use the `source` repo+ref path instead).
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const extRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(extRoot)); // extensions/sophia-stack → repo root
const manifest = JSON.parse(await readFile(join(extRoot, "extension.json"), "utf8"));
const { id, version } = manifest;

const INCLUDE = ["extension.json", "extension.js", "admin", "README.md"];
const distDir = join(extRoot, "dist");
const stageDir = join(distDir, id);
const zipPath = join(distDir, `${id}-${version}.zip`);

// 1. stage
await rm(distDir, { recursive: true, force: true });
await mkdir(stageDir, { recursive: true });
for (const f of INCLUDE) await cp(join(extRoot, f), join(stageDir, f), { recursive: true });

// 2. zip (best effort)
let zipped = false;
function tryCmd(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: "ignore" });
  return r.status === 0;
}
if (tryCmd("zip", ["-r", "-q", zipPath, id], distDir)) zipped = true;
else if (tryCmd("tar", ["-a", "-c", "-f", zipPath, id], distDir)) zipped = true;

// 3. hash
let sha256 = null;
let bytes = null;
if (zipped) {
  const buf = await readFile(zipPath);
  sha256 = createHash("sha256").update(buf).digest("hex");
  bytes = (await stat(zipPath)).size;
  console.log(`Built ${zipPath} (${bytes} bytes, sha256 ${sha256.slice(0, 12)}…)`);
} else {
  console.log("No zip tool found (zip/tar). Channel will use the repo `source` fallback; sha256 stays null.");
}

// 4. channel descriptor
const channelPath = join(repoRoot, "release", id, "channel.json");
const channel = JSON.parse(await readFile(channelPath, "utf8"));
channel.latest = version;
const entry = channel.versions.find((v) => v.version === version) ?? channel.versions[0];
entry.version = version;
entry.requires = manifest.requires;
entry.artifact = entry.artifact || {};
entry.artifact.zip = `https://github.com/${entry.source.repo}/releases/download/seo-suite-v${version}/${id}-${version}.zip`;
entry.artifact.sha256 = sha256;
entry.artifact.bytes = bytes;
await writeFile(channelPath, JSON.stringify(channel, null, 2) + "\n");
console.log(`Updated ${channelPath} (latest=${version}).`);
console.log("Attach the zip to a GitHub Release tagged seo-suite-v" + version + " to publish.");
