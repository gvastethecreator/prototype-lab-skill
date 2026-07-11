#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptRoot, "..");
const assetRoot = path.join(skillRoot, "assets", "prompt-library");
const [command = "catalog", ...argv] = process.argv.slice(2);
const args = parseArgs(argv);
const workspace = path.resolve(args.workspace || process.cwd());
const libraryRoot = path.join(workspace, "prototypes", "prompts");
const lockTimeoutMs = Math.max(100, Number(args["lock-timeout-ms"]) || 15_000);

if (command === "init") {
  await ensureLibrary();
  console.log(JSON.stringify(await withLibraryLock(() => buildCatalog()), null, 2));
} else if (command === "seed") {
  await ensureLibrary();
  const suite = JSON.parse(await fs.readFile(path.join(assetRoot, "creative-test-suite.json"), "utf8"));
  const result = await withLibraryLock(async () => {
    const created = [];
    const skipped = [];
    for (const idea of suite.prompts || []) {
      const folder = promptFolder(idea.id);
      if (await exists(path.join(folder, "prompt.json"))) {
        skipped.push(idea.id);
        continue;
      }
      await savePrompt({
        metadata: { ...idea, origin: "starter-suite", status: "active", tags: ["browser-ui", "model-evaluation", idea.category] },
        templateText: buildSeedPrompt(idea),
        variables: {},
        createdAt: args.date || today()
      });
      created.push(idea.id);
    }
    return { suiteId: suite.suiteId, created, skipped, catalog: await buildCatalog() };
  });
  console.log(JSON.stringify(result, null, 2));
} else if (command === "save") {
  await ensureLibrary();
  if (!args.meta || !args.template) throw new Error("save requires --meta and --template");
  const metadata = JSON.parse(await fs.readFile(path.resolve(workspace, args.meta), "utf8"));
  const templateText = await fs.readFile(path.resolve(workspace, args.template), "utf8");
  const variables = args.vars ? JSON.parse(await fs.readFile(path.resolve(workspace, args.vars), "utf8")) : {};
  const result = await withLibraryLock(async () => {
    const saved = await savePrompt({ metadata, templateText, variables, createdAt: args.date || today() });
    const catalog = await buildCatalog();
    return { saved, catalogCount: catalog.count };
  });
  console.log(JSON.stringify(result, null, 2));
} else if (command === "pick") {
  await ensureLibrary();
  const catalog = await withLibraryLock(() => buildCatalog());
  const count = Math.max(1, Math.min(Number(args.count) || 4, catalog.count));
  const candidates = catalog.prompts.filter((prompt) => (!args.category || prompt.category === args.category) && (!args.difficulty || prompt.difficulty === args.difficulty));
  if (!candidates.length) throw new Error("No prompts match the requested category/difficulty");
  const prompts = selectDiverse(candidates, Math.min(count, candidates.length));
  console.log(JSON.stringify({ count: prompts.length, filters: { category: args.category || null, difficulty: args.difficulty || null }, prompts }, null, 2));
} else if (command === "catalog") {
  await ensureLibrary();
  console.log(JSON.stringify(await withLibraryLock(() => buildCatalog()), null, 2));
} else {
  throw new Error(`Unknown command: ${command}. Use init, seed, save, pick, or catalog.`);
}

async function ensureLibrary() {
  await fs.mkdir(libraryRoot, { recursive: true });
  const readme = path.join(libraryRoot, "README.md");
  if (!(await exists(readme))) await fs.copyFile(path.join(assetRoot, "README.md"), readme);
}

async function withLibraryLock(action) {
  const lockFile = path.join(libraryRoot, ".prompt-library.lock");
  const recoveryFile = `${lockFile}.recovery`;
  const deadline = Date.now() + lockTimeoutMs;
  let handle;
  let token;
  while (!handle) {
    if (await exists(recoveryFile)) {
      await clearStaleLock(recoveryFile);
      if (!(await exists(recoveryFile))) continue;
      if (Date.now() >= deadline) throw lockTimeout(lockFile);
      await delay(25);
      continue;
    }
    try {
      handle = await fs.open(lockFile, "wx");
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      await recoverStaleLibraryLock(lockFile, recoveryFile);
      if (Date.now() >= deadline) throw lockTimeout(lockFile);
      await delay(25);
      continue;
    }
    token = randomUUID();
    try {
      await handle.writeFile(`${JSON.stringify({ token, pid: process.pid, startedAt: new Date().toISOString() })}\n`, "utf8");
      if (await exists(recoveryFile)) {
        await handle.close();
        await removeOwnedLock(lockFile, token);
        handle = undefined;
        token = undefined;
        await delay(25);
      }
    } catch (error) {
      await handle.close().catch(() => {});
      await removeOwnedLock(lockFile, token);
      throw error;
    }
  }
  try {
    return await action();
  } finally {
    await handle.close().catch(() => {});
    await removeOwnedLock(lockFile, token);
  }
}

async function recoverStaleLibraryLock(lockFile, recoveryFile) {
  let recoveryHandle;
  try {
    recoveryHandle = await fs.open(recoveryFile, "wx");
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
  const recoveryToken = randomUUID();
  try {
    await recoveryHandle.writeFile(`${JSON.stringify({ token: recoveryToken, pid: process.pid, startedAt: new Date().toISOString() })}\n`, "utf8");
    const info = await readLockInfo(lockFile);
    if (!info || !isStaleLock(info)) return false;
    await fs.unlink(lockFile).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    return true;
  } finally {
    await recoveryHandle.close().catch(() => {});
    await removeOwnedLock(recoveryFile, recoveryToken);
  }
}

async function readLockInfo(file) {
  const stat = await fs.stat(file).catch(() => null);
  if (!stat) return null;
  const raw = await fs.readFile(file, "utf8").catch(() => "");
  let owner = null;
  try { owner = JSON.parse(raw); } catch {}
  return { owner, mtimeMs: stat.mtimeMs };
}

function isStaleLock({ owner, mtimeMs }) {
  const startedAt = Date.parse(owner?.startedAt || "");
  const age = Date.now() - (Number.isFinite(startedAt) ? startedAt : mtimeMs);
  if (!Number.isInteger(owner?.pid) || owner.pid < 1) return age > 1_000;
  try {
    process.kill(owner.pid, 0);
    return false;
  } catch (error) {
    return error.code !== "EPERM";
  }
}

async function removeOwnedLock(file, token) {
  if (!token) return;
  const info = await readLockInfo(file);
  if (info?.owner?.token !== token) return;
  await fs.unlink(file).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}

async function clearStaleLock(file) {
  const info = await readLockInfo(file);
  if (!info || !isStaleLock(info)) return false;
  if (info.owner?.token) {
    await removeOwnedLock(file, info.owner.token);
  } else {
    await fs.unlink(file).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  return true;
}

function lockTimeout(lockFile) {
  return new Error(`Timed out waiting for prompt library lock: ${toPosix(path.relative(workspace, lockFile))}`);
}

async function savePrompt({ metadata, templateText, variables, createdAt }) {
  validatePromptMetadata(metadata);
  if (!variables || Array.isArray(variables) || typeof variables !== "object") throw new Error("Prompt variables must be a JSON object");
  assertPortablePrompt(`${templateText}\n${JSON.stringify(metadata)}\n${JSON.stringify(variables)}`);
  const folder = promptFolder(metadata.id);
  const promptJson = path.join(folder, "prompt.json");
  const current = await readJson(promptJson, null);
  if (current) await validatePromptRecord(current, metadata.id, folder);
  const version = current ? Number(current.currentVersion) + 1 : 1;
  const versionName = `v${String(version).padStart(3, "0")}`;
  const versionFolder = path.join(folder, versionName);
  if (await exists(versionFolder)) throw new Error(`Prompt version already exists: ${metadata.id}@${version}`);

  const rendered = renderTemplate(templateText, variables);
  const sha256 = hash(rendered);
  await fs.mkdir(folder, { recursive: true });
  await fs.mkdir(versionFolder);
  try {
    await fs.writeFile(path.join(versionFolder, "prompt.template.md"), templateText, "utf8");
    await fs.writeFile(path.join(versionFolder, "prompt.vars.json"), `${JSON.stringify(variables, null, 2)}\n`, "utf8");
    await fs.writeFile(path.join(versionFolder, "prompt.rendered.md"), rendered, "utf8");

    const versionRecord = {
      version,
      createdAt,
      template: `${versionName}/prompt.template.md`,
      variables: `${versionName}/prompt.vars.json`,
      rendered: `${versionName}/prompt.rendered.md`,
      renderedSha256: sha256
    };
    const record = {
      schemaVersion: 1,
      id: metadata.id,
      title: metadata.title,
      category: metadata.category,
      difficulty: metadata.difficulty,
      origin: metadata.origin || current?.origin || "agent-generated",
      status: metadata.status || current?.status || "active",
      challenge: metadata.challenge,
      tags: uniqueStrings(metadata.tags || current?.tags || []),
      requiredBehaviors: uniqueStrings(metadata.requiredBehaviors),
      testDimensions: uniqueStrings(metadata.testDimensions),
      targetViewports: uniqueStrings(metadata.targetViewports),
      currentVersion: version,
      versions: [...(current?.versions || []), versionRecord]
    };
    await fs.writeFile(promptJson, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    return { id: record.id, version, rendered: toPosix(path.relative(libraryRoot, path.join(versionFolder, "prompt.rendered.md"))), sha256 };
  } catch (error) {
    await fs.rm(versionFolder, { recursive: true, force: true });
    throw error;
  }
}

async function buildCatalog() {
  await ensureLibrary();
  const entries = await fs.readdir(libraryRoot, { withFileTypes: true });
  const prompts = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const record = await readJson(path.join(libraryRoot, entry.name, "prompt.json"), null);
    if (!record) continue;
    await validatePromptRecord(record, entry.name, path.join(libraryRoot, entry.name));
    const current = record.versions.find((version) => version.version === record.currentVersion);
    prompts.push({
      id: record.id,
      title: record.title,
      category: record.category,
      difficulty: record.difficulty,
      origin: record.origin,
      status: record.status,
      challenge: record.challenge,
      tags: record.tags,
      requiredBehaviors: record.requiredBehaviors,
      testDimensions: record.testDimensions,
      targetViewports: record.targetViewports,
      currentVersion: record.currentVersion,
      rendered: `${record.id}/${current.rendered}`,
      renderedSha256: current.renderedSha256
    });
  }
  const catalog = {
    schemaVersion: 1,
    count: prompts.length,
    categories: [...new Set(prompts.map((prompt) => prompt.category))].sort(),
    difficulties: Object.fromEntries(["starter", "intermediate", "advanced"].map((difficulty) => [difficulty, prompts.filter((prompt) => prompt.difficulty === difficulty).length])),
    prompts
  };
  await fs.writeFile(path.join(libraryRoot, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return catalog;
}

function validatePromptMetadata(metadata) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.id || "")) throw new Error("Prompt id must be lowercase hyphenated text");
  for (const key of ["title", "category", "difficulty", "challenge"]) if (!metadata[key] || typeof metadata[key] !== "string") throw new Error(`Prompt metadata requires ${key}`);
  if (!["starter", "intermediate", "advanced"].includes(metadata.difficulty)) throw new Error("difficulty must be starter, intermediate, or advanced");
  for (const key of ["requiredBehaviors", "testDimensions", "targetViewports"]) {
    if (!Array.isArray(metadata[key]) || metadata[key].length < 1 || metadata[key].some((value) => typeof value !== "string" || !value.trim())) throw new Error(`Prompt metadata requires a non-empty ${key} array`);
  }
  const markers = JSON.stringify(metadata).match(/REQUIRED-[A-Za-z0-9-]*/g);
  if (markers) throw new Error(`Prompt metadata contains unfilled markers: ${markers.join(", ")}`);
}

async function validatePromptRecord(record, folderName, folder) {
  validatePromptMetadata(record);
  if (record.id !== folderName) throw new Error(`Prompt id/folder mismatch: ${record.id} != ${folderName}`);
  if (!Array.isArray(record.versions) || !record.versions.length) throw new Error(`Prompt has no versions: ${record.id}`);
  const seen = new Set();
  for (const version of record.versions) {
    if (!Number.isInteger(version.version) || version.version < 1 || seen.has(version.version)) throw new Error(`Invalid or duplicate prompt version: ${record.id}@${version.version}`);
    seen.add(version.version);
    for (const key of ["template", "variables", "rendered"]) {
      const file = path.resolve(folder, version[key] || "");
      if (!isWithin(folder, file) || !(await exists(file))) throw new Error(`Missing or unsafe ${key}: ${record.id}@${version.version}`);
    }
    const rendered = await fs.readFile(path.resolve(folder, version.rendered));
    if (!/^[a-f0-9]{64}$/i.test(version.renderedSha256 || "") || hash(rendered) !== version.renderedSha256.toLowerCase()) throw new Error(`Rendered hash mismatch: ${record.id}@${version.version}`);
  }
  const current = record.versions.find((version) => version.version === record.currentVersion);
  if (!current) throw new Error(`Prompt currentVersion is missing: ${record.id}@${record.currentVersion}`);
}

function renderTemplate(template, variables) {
  const missing = new Set();
  const rendered = template.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_, key) => {
    const value = key.split(".").reduce((current, part) => current && typeof current === "object" ? current[part] : undefined, variables);
    if (value === undefined || value === null) { missing.add(key); return `{{${key}}}`; }
    return Array.isArray(value) ? value.join("\n") : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
  });
  if (missing.size) throw new Error(`Missing prompt variables: ${[...missing].sort().join(", ")}`);
  return rendered;
}

function buildSeedPrompt(idea) {
  return `# ${idea.title}\n\nBuild one polished, genuinely interactive, self-contained browser prototype.\n\n## Challenge\n\n${idea.challenge}\n\n## Required behavior\n\n${idea.requiredBehaviors.map((item) => `- ${item}`).join("\n")}\n\n## Evaluation focus\n\n${idea.testDimensions.map((item) => `- ${item}`).join("\n")}\n\n## Shared constraints\n\n- Use local HTML, CSS, and JavaScript with no external APIs, packages, fonts, images, or network dependencies.\n- Use deterministic seed data and make every visible control work.\n- Include loading, empty, error, success, reset, and long-content states when relevant to the challenge.\n- Support keyboard and pointer input, visible focus, accessible names, and reduced motion.\n- Fit ${idea.targetViewports.join(", ")} without body/page scrolling on desktop or tablet.\n- Preserve the exact prompt and honest model/skill/agent provenance for comparison.\n- Deliver index.html, styles.css, app.js, metadata.json, README.md, and focused proof.\n`;
}

function selectDiverse(candidates, count) {
  const selected = [];
  const remaining = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
  while (selected.length < count && remaining.length) {
    remaining.sort((a, b) => {
      const aCategory = selected.filter((item) => item.category === a.category).length;
      const bCategory = selected.filter((item) => item.category === b.category).length;
      const aDifficulty = selected.filter((item) => item.difficulty === a.difficulty).length;
      const bDifficulty = selected.filter((item) => item.difficulty === b.difficulty).length;
      return aCategory - bCategory || aDifficulty - bDifficulty || a.id.localeCompare(b.id);
    });
    selected.push(remaining.shift());
  }
  return selected;
}

function promptFolder(id) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id || "")) throw new Error(`Unsafe prompt id: ${id}`);
  const folder = path.resolve(libraryRoot, id);
  if (!isWithin(libraryRoot, folder)) throw new Error(`Prompt folder escapes library: ${id}`);
  return folder;
}

function uniqueStrings(values) {
  return [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))];
}

function assertPortablePrompt(value) {
  const blocked = [
    /\b[A-Za-z]:[\\/]/,
    /file:\/\/\//i,
    /(?:^|[^\w/:])\/\/[^/\s"'`<>]+\/[^/\s"'`<>]+/,
    /(?:^|[^\w/<])\/(?!\/)[^/\s"'`<>]+(?:\/[^/\s"'`<>]*)*/,
    /(?:^|[^\w\\])\\\\[^\\\s"'`<>]+\\[^\\\s"'`<>]+/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\bsk-[A-Za-z0-9_-]{20,}\b/
  ];
  if (blocked.some((pattern) => pattern.test(value))) throw new Error("Reusable prompts must not contain local absolute paths or likely secrets");
}

function hash(value) { return createHash("sha256").update(value).digest("hex"); }
function delay(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
function today() { return new Date().toISOString().slice(0, 10); }
function toPosix(value) { return value.replaceAll("\\", "/"); }
function isWithin(parent, candidate) { const relative = path.relative(path.resolve(parent), path.resolve(candidate)); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); }
async function exists(file) { return Boolean(await fs.stat(file).catch(() => null)); }
async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(file, "utf8")); } catch (error) { if (error.code === "ENOENT") return fallback; throw error; } }

function parseArgs(tokens) {
  const parsed = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const [name, inlineValue] = token.slice(2).split("=", 2);
    const value = inlineValue ?? tokens[++index];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`);
    parsed[name] = value;
  }
  return parsed;
}
