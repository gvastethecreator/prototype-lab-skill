import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const prototypesRoot = path.join(repoRoot, "prototypes");
const outputFile = path.join(prototypesRoot, "prototype-index-data.js");

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findMetadataFiles(dir) {
  if (!(await exists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "proof") continue;
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findMetadataFiles(entryPath));
    } else if (entry.isFile() && entry.name === "metadata.json") {
      files.push(entryPath);
    }
  }
  return files;
}

function toPosix(value) {
  return value.replaceAll("\\", "/");
}

function idFromFolder(folder) {
  return toPosix(path.relative(prototypesRoot, folder));
}

function pathFromId(id) {
  return `./${id}/index.html`;
}

function normalizePrototypeId(value, hubFolder) {
  if (!value || typeof value !== "string") return null;
  const normalized = toPosix(value).replace(/^\.\/+/, "");
  let absolute;
  if (path.isAbsolute(value)) {
    absolute = value;
  } else if (normalized.startsWith("prototypes/")) {
    absolute = path.join(repoRoot, normalized);
  } else if (/^\d{4}\/\d{2}\//.test(normalized)) {
    absolute = path.join(prototypesRoot, normalized);
  } else {
    absolute = path.resolve(hubFolder, value);
  }
  let rel = toPosix(path.relative(prototypesRoot, absolute));
  rel = rel.replace(/\/index\.html$/i, "");
  return rel && !rel.startsWith("..") ? rel : null;
}

async function proofCount(folder, metadata) {
  const proofDir = path.join(folder, "proof");
  if (await exists(proofDir)) {
    const entries = await fs.readdir(proofDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).length;
  }
  return Array.isArray(metadata.proof) ? metadata.proof.length : 0;
}

function skillList(metadata) {
  const skills = metadata.provenance?.skills || metadata.skills || metadata.skill;
  if (Array.isArray(skills)) return skills;
  if (typeof skills === "string") return [skills];
  return ["unknown"];
}

function modelExact(metadata) {
  if (metadata.modelExact) return metadata.modelExact;
  if (metadata.provenance?.models?.[0]) return metadata.provenance.models[0];
  return metadata.model || "unknown";
}

function agentLabel(metadata) {
  const firstRun = metadata.provenance?.agentRuns?.[0];
  if (metadata.mode?.includes("comparison") && metadata.provenance?.agentRuns?.length > 1) {
    return `coordinator + ${metadata.provenance.agentRuns.length} agents`;
  }
  return metadata.agent || metadata.agentMode || firstRun?.agentMode || "unknown";
}

function isComparisonHub(metadata) {
  const mode = String(metadata.mode || "");
  const category = String(metadata.category || "");
  return mode.includes("comparison") || category.includes("comparison");
}

function promptCount(metadata) {
  if (Array.isArray(metadata.promptTemplates) && metadata.promptTemplates.length) return metadata.promptTemplates.length;
  if (Array.isArray(metadata.provenance?.prompts) && metadata.provenance.prompts.length) return metadata.provenance.prompts.length;
  return metadata.sourcePrompt ? 1 : 0;
}

function runCount(metadata) {
  if (Array.isArray(metadata.runs) && metadata.runs.length) return metadata.runs.length;
  if (Array.isArray(metadata.provenance?.agentRuns) && metadata.provenance.agentRuns.length) return metadata.provenance.agentRuns.length;
  return Array.isArray(metadata.variants) ? metadata.variants.length : 0;
}

async function buildEntries() {
  const metadataFiles = await findMetadataFiles(prototypesRoot);
  const entries = [];
  for (const file of metadataFiles) {
    const folder = path.dirname(file);
    const raw = await fs.readFile(file, "utf8");
    const metadata = JSON.parse(raw);
    const id = metadata.id || idFromFolder(folder);
    entries.push({
      id,
      title: metadata.title || metadata.slug || id,
      path: pathFromId(id),
      question: metadata.question || metadata.details || "No question recorded.",
      category: metadata.category || "uncategorized",
      status: metadata.status || "unknown",
      date: metadata.date || metadata.month || "unknown",
      tags: Array.isArray(metadata.tags) ? metadata.tags : [],
      model: metadata.model || modelExact(metadata),
      modelExact: modelExact(metadata),
      skills: skillList(metadata),
      agent: agentLabel(metadata),
      proof: await proofCount(folder, metadata),
      schemaVersion: Number(metadata.schemaVersion) || 1,
      artifactKind: metadata.artifactKind || (isComparisonHub(metadata) ? "comparison-hub" : "prototype"),
      runtimeLayout: metadata.runtimeLayout || "unknown",
      promptCount: promptCount(metadata),
      runCount: runCount(metadata),
      mode: metadata.mode || "single",
      views: Array.isArray(metadata.views) ? metadata.views : [],
      sequence: Number(metadata.number) || 0,
      isComparisonHub: isComparisonHub(metadata),
      _folder: folder,
      _metadata: metadata
    });
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date) || b.sequence - a.sequence || a.title.localeCompare(b.title));
}

function buildHub(entry, idSet) {
  const metadata = entry._metadata;
  const hubFolder = entry._folder;
  const variantIds = new Set();
  for (const linked of metadata.linkedPrototypes || []) {
    const id = normalizePrototypeId(linked, hubFolder);
    if (idSet.has(id)) variantIds.add(id);
  }
  for (const variant of metadata.variants || []) {
    const id = normalizePrototypeId(variant.outputPath || variant.path || variant.runPath, hubFolder);
    if (idSet.has(id)) variantIds.add(id);
  }
  for (const run of metadata.provenance?.agentRuns || []) {
    const id = normalizePrototypeId(run.standalonePath || run.outputPath, hubFolder);
    if (idSet.has(id)) variantIds.add(id);
  }
  variantIds.delete(entry.id);
  const defaultView = entry.views.includes("pairwise")
    ? "pairwise"
    : entry.views.includes("compare")
      ? "compare"
      : entry.views[0] || "compare";
  return {
    id: entry.id,
    title: entry.title,
    path: entry.path,
    date: entry.date,
    defaultView,
    variantIds: [...variantIds]
  };
}

const entries = await buildEntries();
const idSet = new Set(entries.map((entry) => entry.id));
const comparisonHubs = entries
  .filter((entry) => entry.isComparisonHub)
  .map((entry) => buildHub(entry, idSet))
  .filter((hub) => hub.variantIds.length > 1);

const publicEntries = entries.map(({ _folder, _metadata, ...entry }) => entry);
const payload = {
  generatedAt: new Date().toISOString(),
  prototypes: publicEntries,
  comparisonHubs
};

await fs.writeFile(
  outputFile,
  `window.PROTOTYPE_INDEX_DATA = ${JSON.stringify(payload, null, 2)};\n`,
  "utf8"
);

console.log(`Wrote ${toPosix(path.relative(repoRoot, outputFile))}`);
console.log(`Indexed ${publicEntries.length} prototypes and ${comparisonHubs.length} comparison hubs.`);
