import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const workspace = path.resolve(args.workspace || process.cwd());
const prototypesRoot = path.join(workspace, "prototypes");
const archiveRoot = path.join(workspace, "dist", "prototype-lab", "legacy-archives");
const write = Boolean(args.write);
const metadataFiles = await findMetadataFiles(prototypesRoot);
const metadataChanges = [];
const archiveMoves = [];
const runtimeLayouts = { split: 0, "single-file": 0 };

await validateRootEntries();

for (const metadataFile of metadataFiles) {
  const folder = path.dirname(metadataFile);
  const relativeFolder = toPosix(path.relative(prototypesRoot, folder));
  const match = relativeFolder.match(/^(\d{4})\/(\d{2})\/(\d{3})-(.+)$/);
  if (!match) throw new Error(`Non-canonical prototype folder: ${relativeFolder}`);

  const [, year, monthNumber, sequence, slug] = match;
  const raw = await fs.readFile(metadataFile, "utf8");
  const metadata = JSON.parse(raw);
  if (metadata.id && metadata.id !== relativeFolder) {
    throw new Error(`metadata id does not match folder: ${metadata.id} != ${relativeFolder}`);
  }
  const entrypoint = metadata.entrypoint || "index.html";
  const entrypointPath = path.resolve(folder, entrypoint);
  if (!isWithin(folder, entrypointPath) || !(await isFile(entrypointPath))) {
    throw new Error(`Missing or unsafe entrypoint for ${relativeFolder}: ${entrypoint}`);
  }
  if (!metadata.date) throw new Error(`Missing date in ${relativeFolder}/metadata.json`);

  const hasApp = await isFile(path.join(folder, "app.js"));
  const hasStyles = await isFile(path.join(folder, "styles.css"));
  const runtimeLayout = hasApp && hasStyles ? "split" : "single-file";
  runtimeLayouts[runtimeLayout] += 1;
  const mode = metadata.mode || "single";
  const artifactKind = metadata.artifactKind || (/comparison/i.test(mode) ? "comparison-hub" : "prototype");
  const values = {
    ...metadata,
    schemaVersion: 2,
    artifactKind,
    entrypoint,
    id: relativeFolder,
    month: metadata.month || `${year}-${monthNumber}`,
    number: metadata.number ?? Number(sequence),
    slug: metadata.slug || slug,
    category: metadata.category || "uncategorized",
    status: metadata.status || "active",
    mode,
    runtimeLayout,
    promptTemplates: Array.isArray(metadata.promptTemplates) ? metadata.promptTemplates : [],
    runs: Array.isArray(metadata.runs) ? metadata.runs : [],
    packaging: {
      primary: true,
      includeLinkedPrototypes: artifactKind === "comparison-hub",
      defaultProofPolicy: "omit",
      ...(metadata.packaging || {})
    }
  };
  const normalized = orderMetadata(values);
  const next = `${JSON.stringify(normalized, null, 2)}\n`;
  if (next !== raw) {
    metadataChanges.push(relativeFolder);
    if (write) await fs.writeFile(metadataFile, next, "utf8");
  }

  for (const link of metadata.linkedPrototypes || []) {
    const linkedPath = path.resolve(folder, link);
    if (!isWithin(prototypesRoot, linkedPath) || !(await isFile(linkedPath))) {
      throw new Error(`Broken linked prototype in ${relativeFolder}: ${link}`);
    }
  }
}

for (const source of await findMonthLevelArchives()) {
  const relative = toPosix(path.relative(prototypesRoot, source));
  const destination = path.join(archiveRoot, ...relative.split("/"));
  archiveMoves.push({ from: `prototypes/${relative}`, to: toPosix(path.relative(workspace, destination)) });
  if (write) await moveWithoutOverwrite(source, destination);
}

console.log(JSON.stringify({
  mode: write ? "write" : "check",
  prototypes: metadataFiles.length,
  metadataChanges: metadataChanges.length,
  changedIds: metadataChanges,
  runtimeLayouts,
  archiveMoves
}, null, 2));

async function validateRootEntries() {
  const allowedFiles = new Set(["index.html", "prototype-index.css", "prototype-index.js", "prototype-index-data.js"]);
  const entries = await fs.readdir(prototypesRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && /^\d{4}$/.test(entry.name)) continue;
    if (entry.isFile() && allowedFiles.has(entry.name)) continue;
    throw new Error(`Unexpected prototypes root entry: ${entry.name}`);
  }
}

async function findMetadataFiles(root, current = root, output = []) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) await findMetadataFiles(root, absolute, output);
    else if (entry.isFile() && entry.name === "metadata.json") output.push(absolute);
  }
  return output;
}

async function findMonthLevelArchives() {
  const output = [];
  const years = await fs.readdir(prototypesRoot, { withFileTypes: true });
  for (const year of years.filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))) {
    const yearPath = path.join(prototypesRoot, year.name);
    const months = await fs.readdir(yearPath, { withFileTypes: true });
    for (const month of months.filter((entry) => entry.isDirectory() && /^\d{2}$/.test(entry.name))) {
      const monthPath = path.join(yearPath, month.name);
      const entries = await fs.readdir(monthPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && /\.(zip|tar|tgz|gz|7z)$/i.test(entry.name)) output.push(path.join(monthPath, entry.name));
      }
    }
  }
  return output.sort();
}

async function moveWithoutOverwrite(source, destination) {
  if (!isWithin(archiveRoot, destination)) throw new Error(`Unsafe archive destination: ${destination}`);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  if (await isFile(destination)) {
    const [sourceHash, destinationHash] = await Promise.all([hashFile(source), hashFile(destination)]);
    if (sourceHash !== destinationHash) throw new Error(`Archive collision with different contents: ${destination}`);
    await fs.rm(source);
    return;
  }
  await fs.rename(source, destination);
}

function orderMetadata(values) {
  const order = [
    "schemaVersion", "artifactKind", "entrypoint", "id", "month", "number", "slug", "title",
    "category", "status", "date", "mode", "runtimeLayout", "model", "modelExact", "modelSettings",
    "tags", "question", "sourcePrompt", "comparisonCriteria", "comparisonMethods", "variantStrategy",
    "promptTemplates", "runs", "infoDrawerRequired", "linkedPrototypes", "provenance", "details", "views",
    "variants", "proof", "packaging"
  ];
  const result = {};
  for (const key of order) if (Object.hasOwn(values, key)) result[key] = values[key];
  for (const [key, value] of Object.entries(values)) if (!Object.hasOwn(result, key)) result[key] = value;
  return result;
}

async function hashFile(file) {
  return createHash("sha256").update(await fs.readFile(file)).digest("hex");
}

async function isFile(file) {
  return Boolean((await fs.stat(file).catch(() => null))?.isFile());
}

function isWithin(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function toPosix(value) {
  return value.replaceAll("\\", "/");
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--write") {
      parsed.write = true;
      continue;
    }
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const [name, inlineValue] = token.slice(2).split("=", 2);
    const value = inlineValue ?? argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`);
    parsed[name] = value;
  }
  return parsed;
}
