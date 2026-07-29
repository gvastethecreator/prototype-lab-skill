#!/usr/bin/env node

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(root, "SKILLS", "prototype-lab");
const manifestFile = path.join(packageRoot, "package-manifest.json");
const args = new Set(process.argv.slice(2));

if ([...args].some((arg) => !["--write", "--check", "--help"].includes(arg))) {
  throw new Error("Usage: node scripts/verify-published-package.mjs [--write|--check]");
}
if (args.has("--help")) {
  console.log("Verify the deterministic published Prototype Lab package manifest.\n\nUsage:\n  node scripts/verify-published-package.mjs --check\n  node scripts/verify-published-package.mjs --write");
  process.exit(0);
}
if (args.has("--write") && args.has("--check")) throw new Error("Use either --write or --check, not both");

const manifest = await buildManifest(packageRoot);
const text = `${JSON.stringify(manifest, null, 2)}\n`;

if (args.has("--write")) {
  await fs.writeFile(manifestFile, text, "utf8");
  console.log(`Wrote ${toPosix(path.relative(root, manifestFile))} (${manifest.packageSha256})`);
} else {
  const existing = await fs.readFile(manifestFile, "utf8").catch(() => null);
  if (existing !== text) {
    throw new Error("Published package manifest is stale. Run node scripts/verify-published-package.mjs --write and commit the result.");
  }
  console.log(`Published package manifest verified (${manifest.packageSha256})`);
}

async function buildManifest(folder) {
  const files = await listFiles(folder);
  const entries = [];
  for (const file of files) {
    const relative = toPosix(path.relative(folder, file));
    if (relative === "package-manifest.json") continue;
    const bytes = await fs.readFile(file);
    entries.push({
      path: relative,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length
    });
  }
  entries.sort((left, right) => left.path.localeCompare(right.path));
  const digestInput = entries.map((entry) => `${entry.path}\u0000${entry.sha256}\u0000${entry.bytes}\n`).join("");
  return {
    schemaVersion: 1,
    packageRoot: "SKILLS/prototype-lab",
    algorithm: "sha256",
    packageSha256: createHash("sha256").update(digestInput).digest("hex"),
    excludedFromDigest: ["package-manifest.json"],
    repositoryExclusions: [
      "sites/winamp-radio-glsl-public/: nested local Git repository; preserved and excluded from this skill package."
    ],
    files: entries
  };
}

async function listFiles(folder, output = []) {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  for (const entry of entries) {
    const file = path.join(folder, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Published package cannot include a symbolic link: ${toPosix(path.relative(root, file))}`);
    if (entry.isDirectory()) await listFiles(file, output);
    else if (entry.isFile()) output.push(file);
  }
  return output;
}

function toPosix(value) {
  return value.replaceAll("\\", "/");
}
