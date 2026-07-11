#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function collectPrototypeIndex({ workspace = process.cwd() } = {}) {
  const workspaceRoot = path.resolve(workspace);
  const prototypesRoot = path.join(workspaceRoot, "prototypes");
  const packageJson = await readJson(path.join(workspaceRoot, "package.json"), {});
  const commandPrefix = packageJson.scripts?.lab ? "npm run lab --" : "node <skill-root>/scripts/manage-prototype-lab.mjs";
  const metadataFiles = await findMetadataFiles(prototypesRoot, prototypesRoot);
  const entries = [];

  for (const file of metadataFiles) {
    const folder = path.dirname(file);
    const metadata = JSON.parse(await fs.readFile(file, "utf8"));
    const id = metadata.id || toPosix(path.relative(prototypesRoot, folder));
    const proof = await proofCount(folder, metadata);
    const isHub = isComparisonHub(metadata);
    const entry = {
      id,
      title: metadata.title || metadata.slug || id,
      path: `./${id}/index.html`,
      question: metadata.question || metadata.details || "No question recorded.",
      category: metadata.category || "uncategorized",
      status: metadata.status || "unknown",
      date: metadata.date || metadata.month || "unknown",
      tags: Array.isArray(metadata.tags) ? metadata.tags : [],
      model: metadata.model || modelExact(metadata),
      modelExact: modelExact(metadata),
      skills: skillList(metadata),
      agent: agentLabel(metadata),
      proof,
      schemaVersion: Number(metadata.schemaVersion) || 1,
      artifactKind: metadata.artifactKind || (isHub ? "comparison-hub" : "prototype"),
      runtimeLayout: metadata.runtimeLayout || "unknown",
      promptCount: promptCount(metadata),
      runCount: runCount(metadata),
      mode: metadata.mode || "single",
      views: Array.isArray(metadata.views) ? metadata.views : [],
      sequence: Number(metadata.number) || sequenceFromId(id),
      isComparisonHub: isHub,
      managed: await exists(path.join(folder, "hub.config.json")),
      issues: [],
      _folder: folder,
      _metadata: metadata
    };
    entry.issues = healthIssues(entry);
    entries.push(entry);
  }

  entries.sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.sequence - a.sequence || a.title.localeCompare(b.title));
  const idSet = new Set(entries.map((entry) => entry.id));
  const hubEntries = entries.filter((entry) => entry.isComparisonHub);
  const hubRecords = hubEntries.map((entry) => buildHub(entry, idSet, prototypesRoot, workspaceRoot));
  for (const hub of hubRecords.filter((item) => item.variantIds.length < 2)) {
    entries.find((entry) => entry.id === hub.id)?.issues.push({ code: "hub-links-unresolved", severity: "error", message: "Resolve at least two standalone variant links." });
  }
  const comparisonHubs = hubRecords.filter((hub) => hub.variantIds.length > 1);
  const promptLibrary = await readPromptLibrary(prototypesRoot);
  const publicEntries = entries.map(({ _folder, _metadata, ...entry }) => entry);
  const issueCount = publicEntries.reduce((total, entry) => total + entry.issues.length, 0);

  return {
    generatedAt: new Date().toISOString(),
    commandPrefix,
    summary: {
      artifacts: publicEntries.length,
      prototypes: publicEntries.filter((entry) => !entry.isComparisonHub).length,
      hubs: hubEntries.length,
      readyHubs: comparisonHubs.length,
      managedHubs: comparisonHubs.filter((hub) => hub.managed).length,
      prompts: promptLibrary.count,
      issues: issueCount
    },
    prototypes: publicEntries,
    comparisonHubs,
    promptLibrary
  };
}

export async function buildPrototypeIndex({ workspace = process.cwd() } = {}) {
  const workspaceRoot = path.resolve(workspace);
  const prototypesRoot = path.join(workspaceRoot, "prototypes");
  await fs.mkdir(prototypesRoot, { recursive: true });
  const payload = await collectPrototypeIndex({ workspace: workspaceRoot });
  const outputFile = path.join(prototypesRoot, "prototype-index-data.js");
  await fs.writeFile(outputFile, `window.PROTOTYPE_INDEX_DATA = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
  return { outputFile, payload };
}

async function findMetadataFiles(root, current, output = []) {
  const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".") || entry.name === "proof") continue;
    if (current === root && entry.isDirectory() && entry.name === "prompts") continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) await findMetadataFiles(root, absolute, output);
    else if (entry.isFile() && entry.name === "metadata.json") output.push(absolute);
  }
  return output;
}

async function proofCount(folder, metadata) {
  const files = await fs.readdir(path.join(folder, "proof"), { withFileTypes: true }).catch(() => []);
  const count = files.filter((entry) => entry.isFile()).length;
  return count || (Array.isArray(metadata.proof) ? metadata.proof.length : 0);
}

function skillList(metadata) {
  const skills = metadata.provenance?.skills || metadata.skills || metadata.skill;
  if (Array.isArray(skills)) return skills;
  if (typeof skills === "string") return [skills];
  return ["unknown"];
}

function modelExact(metadata) {
  return metadata.modelExact || metadata.provenance?.models?.[0] || metadata.model || "unknown";
}

function agentLabel(metadata) {
  const runs = metadata.provenance?.agentRuns || [];
  if (isComparisonHub(metadata) && runs.length > 1) return `coordinator + ${runs.length} agents`;
  return metadata.agent || metadata.agentMode || runs[0]?.agentMode || "unknown";
}

function isComparisonHub(metadata) {
  return metadata.artifactKind === "comparison-hub" || String(metadata.mode || "").includes("comparison") || String(metadata.category || "").includes("comparison");
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

function buildHub(entry, idSet, prototypesRoot, workspaceRoot) {
  const metadata = entry._metadata;
  const variants = new Set();
  for (const value of metadata.linkedPrototypes || []) addNormalizedId(variants, value, entry._folder, idSet, prototypesRoot, workspaceRoot);
  for (const variant of metadata.variants || []) addNormalizedId(variants, variant.indexId || variant.outputPath || variant.path || variant.runPath, entry._folder, idSet, prototypesRoot, workspaceRoot);
  for (const run of metadata.provenance?.agentRuns || []) addNormalizedId(variants, run.standalonePath || run.outputPath, entry._folder, idSet, prototypesRoot, workspaceRoot);
  variants.delete(entry.id);
  return {
    id: entry.id,
    title: entry.title,
    path: entry.path,
    date: entry.date,
    question: entry.question,
    status: entry.status,
    managed: entry.managed,
    dimension: metadata.comparisonDimension || metadata.variantStrategy || "comparison",
    criteria: Array.isArray(metadata.comparisonCriteria) ? metadata.comparisonCriteria : [],
    defaultView: entry.views.includes("compare") ? "compare" : entry.views.includes("pairwise") ? "pairwise" : entry.views[0] || "overview",
    variantIds: [...variants]
  };
}

function addNormalizedId(target, value, hubFolder, idSet, prototypesRoot, workspaceRoot) {
  const id = normalizePrototypeId(value, hubFolder, prototypesRoot, workspaceRoot);
  if (idSet.has(id)) target.add(id);
}

function normalizePrototypeId(value, hubFolder, prototypesRoot, workspaceRoot) {
  if (!value || typeof value !== "string") return null;
  const normalized = toPosix(value).replace(/^\.\/+/, "");
  let absolute;
  if (path.isAbsolute(value)) absolute = value;
  else if (normalized.startsWith("prototypes/")) absolute = path.join(workspaceRoot, normalized);
  else if (/^\d{4}\/\d{2}\//.test(normalized)) absolute = path.join(prototypesRoot, normalized);
  else absolute = path.resolve(hubFolder, value);
  const relative = toPosix(path.relative(prototypesRoot, absolute)).replace(/\/index\.html$/i, "");
  return relative && !relative.startsWith("..") ? relative : null;
}

function healthIssues(entry) {
  const issues = [];
  if (!entry.title || entry.title === entry.id) issues.push({ code: "missing-title", severity: "error", message: "Add a human-readable title." });
  if (!entry.question || entry.question === "No question recorded.") issues.push({ code: "missing-question", severity: "warning", message: "Record the decision question." });
  if (entry.modelExact === "unknown") issues.push({ code: "unknown-model", severity: "info", message: "Capture the model route when available." });
  if (entry.proof === 0) issues.push({ code: "missing-proof", severity: "warning", message: "Add browser or screenshot proof." });
  if (entry.isComparisonHub && entry.runCount < 2) issues.push({ code: "hub-no-variants", severity: "error", message: "Link at least two standalone variants." });
  return issues;
}

async function readPromptLibrary(prototypesRoot) {
  const file = path.join(prototypesRoot, "prompts", "catalog.json");
  const catalog = await readJson(file, null);
  if (!catalog) return { path: "./prompts/catalog.json", count: 0, categories: [], prompts: [] };
  return {
    path: "./prompts/catalog.json",
    count: Number(catalog.count) || 0,
    categories: Array.isArray(catalog.categories) ? catalog.categories : [],
    prompts: Array.isArray(catalog.prompts) ? catalog.prompts : []
  };
}

function sequenceFromId(id) { return Number(id.match(/\/(\d+)-/)?.[1]) || 0; }
function toPosix(value) { return value.replaceAll("\\", "/"); }
async function exists(file) { return Boolean(await fs.stat(file).catch(() => null)); }
async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(file, "utf8")); } catch (error) { if (error.code === "ENOENT") return fallback; throw error; } }

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  const workspaceArg = process.argv.find((arg) => arg.startsWith("--workspace="))?.split("=").slice(1).join("=");
  const { outputFile, payload } = await buildPrototypeIndex({ workspace: workspaceArg || process.cwd() });
  console.log(`Wrote ${toPosix(path.relative(path.resolve(workspaceArg || process.cwd()), outputFile))}`);
  console.log(`Indexed ${payload.summary.prototypes} prototypes, ${payload.summary.hubs} hubs, ${payload.summary.prompts} prompts, and ${payload.summary.issues} issues.`);
}
