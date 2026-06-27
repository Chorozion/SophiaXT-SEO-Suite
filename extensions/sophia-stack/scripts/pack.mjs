// Produce a clean, installable copy of the extension under ./dist/sophia-seo-suite
// containing only the files a Sophia Stack deployment needs. Copy that folder into
// <deployment>/.sophia-data/extensions/ (or point SOPHIA_EXTENSIONS_DIR at ./dist).
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, "dist", "sophia-seo-suite");

const INCLUDE = ["extension.json", "extension.js", "admin", "README.md"];

await rm(join(root, "dist"), { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const entry of INCLUDE) {
  await cp(join(root, entry), join(out, entry), { recursive: true });
}
console.log(`Packed installable extension → ${out}`);
console.log("Copy it into <deployment>/.sophia-data/extensions/ and restart the Stack.");
