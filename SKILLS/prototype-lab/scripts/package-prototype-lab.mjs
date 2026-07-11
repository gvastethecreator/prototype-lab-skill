#!/usr/bin/env node

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { deflateRawSync } from "node:zlib";

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  return value >>> 0;
});

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

if (!args.id && !args.path) {
  printHelp();
  throw new Error("Provide --id or --path");
}

const workspace = path.resolve(args.workspace || process.cwd());
const prototypesRoot = path.join(workspace, "prototypes");
const outputRoot = path.resolve(workspace, args.output || "dist/prototype-lab");
const includeProof = Boolean(args["include-proof"]);
const createArchive = !args["no-zip"];

if (isWithin(prototypesRoot, outputRoot)) {
  throw new Error("Package output must stay outside prototypes/");
}

const primaryFolder = await resolvePrimaryFolder();
const records = await collectPrototypeRecords(primaryFolder);
const primaryRecord = records.get(toPosix(path.relative(prototypesRoot, primaryFolder)));
const packName = `${safeName(primaryRecord.metadata.slug || path.basename(primaryFolder))}-pack`;
const packRoot = path.join(outputRoot, packName);
const archivePath = path.join(outputRoot, `${packName}.zip`);

await fs.mkdir(outputRoot, { recursive: true });
await fs.rm(packRoot, { recursive: true, force: true });
await fs.rm(archivePath, { force: true });
await fs.mkdir(packRoot, { recursive: true });

for (const record of [...records.values()].sort((a, b) => a.id.localeCompare(b.id))) {
  const destination = path.join(packRoot, "prototypes", ...record.id.split("/"));
  await copyPrototype(record.folder, destination);
}

const promptExports = await exportPrompts(records, packRoot, primaryRecord.id);
const runExports = await exportRuns(records, packRoot, primaryRecord.id);
await fs.writeFile(path.join(packRoot, "index.html"), buildLauncher(primaryRecord, records), "utf8");
const sanitizedFiles = await sanitizePackTextFiles(packRoot);

const hashedFiles = await describeFiles(packRoot);
const manifest = {
  format: "prototype-lab-portable-pack",
  schemaVersion: 1,
  primaryId: primaryRecord.id,
  entrypoint: "index.html",
  primaryEntrypoint: `prototypes/${primaryRecord.id}/index.html`,
  profile: includeProof ? "review" : "upload",
  includesProof: includeProof,
  sourceIds: [...records.keys()].sort(),
  prompts: promptExports,
  runs: runExports,
  sanitizedLocalPaths: sanitizedFiles,
  files: hashedFiles
};
await fs.writeFile(path.join(packRoot, "pack.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

if (createArchive) await writeZip(packRoot, archivePath);

console.log(JSON.stringify({
  folder: packRoot,
  archive: createArchive ? archivePath : null,
  primaryId: primaryRecord.id,
  sourceCount: records.size,
  promptCount: promptExports.length,
  runCount: runExports.length,
  includesProof: includeProof
}, null, 2));

async function resolvePrimaryFolder() {
  const candidate = args.path
    ? path.resolve(workspace, args.path)
    : path.join(prototypesRoot, ...String(args.id).replace(/^prototypes[\\/]/, "").split(/[\\/]+/));
  const candidateStat = await fs.stat(candidate).catch(() => null);
  const folder = candidateStat?.isFile() ? path.dirname(candidate) : candidate;
  if (!isWithin(prototypesRoot, folder)) {
    throw new Error("Primary prototype must be inside workspace/prototypes");
  }
  await readMetadata(folder);
  return folder;
}

async function collectPrototypeRecords(startFolder) {
  const result = new Map();
  const queue = [startFolder];

  while (queue.length) {
    const folder = queue.shift();
    const id = toPosix(path.relative(prototypesRoot, folder));
    if (result.has(id)) continue;
    const metadata = await readMetadata(folder);
    const record = { id, folder, metadata };
    await validateDeclaredPortableRecords(record);
    result.set(id, record);

    for (const candidate of dependencyCandidates(metadata)) {
      const dependency = await normalizePrototypeFolder(candidate, folder);
      if (dependency) queue.push(dependency);
    }
  }

  return result;
}

function dependencyCandidates(metadata) {
  const values = [...(metadata.linkedPrototypes || [])];
  for (const variant of metadata.variants || []) {
    values.push(variant.indexId, variant.standalonePath, variant.outputPath, variant.path, variant.runPath);
  }
  for (const run of metadata.provenance?.agentRuns || []) {
    values.push(run.indexId, run.standalonePath, run.finalPath, run.outputPath);
  }
  return values.filter((value) => typeof value === "string" && value.trim());
}

async function normalizePrototypeFolder(value, ownerFolder) {
  const normalized = toPosix(value).replace(/^\.\//, "");
  let candidate;
  if (path.isAbsolute(value)) {
    candidate = value;
  } else if (normalized.startsWith("prototypes/")) {
    candidate = path.join(workspace, ...normalized.split("/"));
  } else if (/^\d{4}\/\d{2}\//.test(normalized)) {
    candidate = path.join(prototypesRoot, ...normalized.split("/"));
  } else {
    candidate = path.resolve(ownerFolder, value);
  }

  if (path.basename(candidate).toLowerCase() === "index.html" || path.basename(candidate).toLowerCase() === "metadata.json") {
    candidate = path.dirname(candidate);
  }
  if (!isWithin(prototypesRoot, candidate)) return null;
  const stat = await fs.stat(path.join(candidate, "metadata.json")).catch(() => null);
  return stat?.isFile() ? candidate : null;
}

async function readMetadata(folder) {
  const file = path.join(folder, "metadata.json");
  const raw = await fs.readFile(file, "utf8").catch(() => null);
  if (raw === null) throw new Error(`Missing metadata.json in ${folder}`);
  try {
    const metadata = JSON.parse(raw);
    const entrypoint = metadata.entrypoint || "index.html";
    const entrypointPath = path.resolve(folder, entrypoint);
    if (path.isAbsolute(entrypoint) || !isWithin(folder, entrypointPath)) {
      throw new Error(`Entrypoint must stay inside the prototype folder: ${entrypoint}`);
    }
    const entrypointStat = await fs.stat(entrypointPath).catch(() => null);
    if (!entrypointStat?.isFile()) throw new Error(`Missing prototype entrypoint: ${entrypoint}`);
    return metadata;
  } catch (error) {
    throw new Error(`Invalid metadata.json in ${folder}: ${error.message}`);
  }
}

async function copyPrototype(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not portable: ${path.join(source, entry.name)}`);
    if (isIgnoredName(entry.name)) continue;
    if (isSensitiveName(entry.name)) throw new Error(`Sensitive filename blocks packaging: ${path.join(source, entry.name)}`);
    if (!includeProof && entry.isDirectory() && entry.name.toLowerCase() === "proof") continue;
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyPrototype(sourcePath, destinationPath);
    } else if (entry.isFile() && !isArchive(entry.name)) {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

async function exportPrompts(recordsMap, destinationRoot, primaryId) {
  const output = [];
  const seen = new Set();
  const promptRoot = path.join(destinationRoot, "prompts");
  const primary = recordsMap.get(primaryId);
  const sourceRecords = primary?.metadata.promptTemplates?.length
    ? [primary]
    : [...recordsMap.values()].sort((a, b) => a.id.localeCompare(b.id));

  for (const record of sourceRecords) {
    const prompts = await normalizePrompts(record);
    for (const prompt of prompts) {
      const sourceHash = sha256(prompt.text);
      const sanitized = sanitizePortableString(prompt.text);
      const hash = sha256(sanitized.text);
      const key = `${prompt.id}:${hash}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const file = `prompts/${safeName(prompt.id)}-${hash.slice(0, 8)}.rendered.md`;
      await fs.mkdir(promptRoot, { recursive: true });
      await fs.writeFile(path.join(destinationRoot, ...file.split("/")), sanitized.text, "utf8");
      const descriptor = {
        id: prompt.id,
        label: prompt.label,
        version: prompt.version,
        sourcePrototypeId: record.id,
        rendered: file,
        sha256: hash
      };
      if (sanitized.replacements) {
        descriptor.localPathsSanitized = true;
        descriptor.sourceSha256 = sourceHash;
      }
      output.push(descriptor);
    }
  }

  return output;
}

async function normalizePrompts(record) {
  const metadata = record.metadata;
  if (Array.isArray(metadata.promptTemplates) && metadata.promptTemplates.length) {
    return Promise.all(metadata.promptTemplates.map(async (prompt, index) => ({
      id: prompt.id || `prompt-${index + 1}`,
      label: prompt.label || prompt.id || `Prompt ${index + 1}`,
      version: Number(prompt.version) || 1,
      text: await fs.readFile(resolveOwnedFile(record.folder, prompt.rendered, "rendered prompt"), "utf8")
    })));
  }

  const source = metadata.provenance?.prompts;
  const prompts = [];
  if (Array.isArray(source)) {
    source.forEach((prompt, index) => {
      if (typeof prompt === "string") {
        prompts.push({ id: `prompt-${index + 1}`, label: `Prompt ${index + 1}`, version: 1, text: prompt });
      } else if (prompt && typeof prompt === "object" && typeof prompt.text === "string") {
        prompts.push({
          id: prompt.id || `prompt-${index + 1}`,
          label: prompt.label || prompt.id || `Prompt ${index + 1}`,
          version: Number(prompt.version) || 1,
          text: prompt.text
        });
      }
    });
  }
  if (!prompts.length && typeof metadata.sourcePrompt === "string" && metadata.sourcePrompt.trim()) {
    prompts.push({ id: "shared", label: "Shared prompt", version: 1, text: metadata.sourcePrompt });
  }
  return prompts;
}

async function exportRuns(recordsMap, destinationRoot, primaryId) {
  const output = [];
  const runRoot = path.join(destinationRoot, "runs");
  const primary = recordsMap.get(primaryId);
  if (Array.isArray(primary?.metadata.runs) && primary.metadata.runs.length) {
    await fs.mkdir(runRoot, { recursive: true });
    for (const [index, run] of primary.metadata.runs.entries()) {
      const sourcePath = resolveOwnedFile(primary.folder, run.receipt, "run receipt");
      const receipt = JSON.parse(await fs.readFile(sourcePath, "utf8"));
      const runId = run.id || receipt.runId || `run-${index + 1}`;
      const file = `runs/${safeName(runId)}.json`;
      await fs.copyFile(sourcePath, path.join(destinationRoot, ...file.split("/")));
      output.push({
        id: runId,
        variantId: run.variantId || receipt.variantId || "unknown",
        promptId: run.promptId || receipt.prompt?.templateId || "unknown",
        sourcePrototypeId: primary.id,
        receipt: file
      });
    }
    return output;
  }

  const primaryHasCanonicalRuns = Boolean(primary?.metadata.provenance?.agentRuns?.length);
  const sourceRecords = primaryHasCanonicalRuns
    ? [primary]
    : [...recordsMap.values()].sort((a, b) => a.id.localeCompare(b.id));

  for (const record of sourceRecords) {
    const variants = new Map((record.metadata.variants || []).map((variant) => [variant.id, variant]));
    let runs = record.metadata.provenance?.agentRuns || [];
    if (!runs.length) runs = record.metadata.variants || [];

    for (const [index, run] of runs.entries()) {
      const variantId = run.variantId || run.id || `run-${index + 1}`;
      const runId = `${safeName(record.metadata.slug || path.basename(record.folder))}-${safeName(variantId)}`;
      const receipt = {
        schemaVersion: 1,
        receiptType: "normalized-metadata-export",
        runId,
        sourcePrototypeId: record.id,
        variantId,
        promptId: run.promptId || run.prompt || variants.get(variantId)?.prompt || "unknown",
        status: run.status || variants.get(variantId)?.status || "unknown",
        model: run.model || variants.get(variantId)?.model || "unknown",
        modelRoute: run.modelRoute || "not captured",
        reasoningEffort: run.reasoningEffort || "not captured",
        skills: run.skills || variants.get(variantId)?.skill || record.metadata.provenance?.skills || [],
        agentMode: run.agentMode || variants.get(variantId)?.agentMode || "unknown",
        agentTool: run.agentTool || variants.get(variantId)?.agentTool || "not captured",
        inputScope: run.inputScope || "not captured",
        receivedOtherVariants: run.receivedOtherVariants ?? "unknown",
        editedFinalPrototype: run.editedFinalPrototype ?? "unknown",
        outputPath: run.standalonePath || variants.get(variantId)?.outputPath || "not captured",
        fallbackReason: run.fallbackReason || variants.get(variantId)?.fallbackReason || "not captured",
        tokenUsage: run.tokenUsage || record.metadata.provenance?.tokenUsage || "unknown",
        toolCalls: run.toolCalls || record.metadata.provenance?.toolCalls || "not captured",
        limitations: run.limitations || []
      };
      const file = `runs/${runId}.json`;
      await fs.mkdir(runRoot, { recursive: true });
      await fs.writeFile(path.join(destinationRoot, ...file.split("/")), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
      output.push({ id: runId, variantId, sourcePrototypeId: record.id, receipt: file });
    }
  }

  return output;
}

async function validateDeclaredPortableRecords(record) {
  const prompts = new Map();
  for (const [index, prompt] of (record.metadata.promptTemplates || []).entries()) {
    const label = `promptTemplates[${index}]`;
    if (!prompt?.id || !Number.isInteger(Number(prompt.version))) {
      throw new Error(`${record.id} ${label} requires id and integer version`);
    }
    const templatePath = resolveOwnedFile(record.folder, prompt.template, `${label}.template`);
    const variablesPath = resolveOwnedFile(record.folder, prompt.variables, `${label}.variables`);
    const renderedPath = resolveOwnedFile(record.folder, prompt.rendered, `${label}.rendered`);
    await fs.access(templatePath);
    JSON.parse(await fs.readFile(variablesPath, "utf8"));
    const rendered = await fs.readFile(renderedPath);
    const actualHash = sha256(rendered);
    if (!/^[a-f0-9]{64}$/i.test(prompt.renderedSha256 || "") || prompt.renderedSha256.toLowerCase() !== actualHash) {
      throw new Error(`${record.id} ${label} renderedSha256 does not match ${prompt.rendered}`);
    }
    prompts.set(prompt.id, { hash: actualHash, renderedPath });
  }

  for (const [index, run] of (record.metadata.runs || []).entries()) {
    const label = `runs[${index}]`;
    if (!run?.id || !run?.variantId || !run?.promptId || !run?.receipt) {
      throw new Error(`${record.id} ${label} requires id, variantId, promptId, and receipt`);
    }
    const receiptPath = resolveOwnedFile(record.folder, run.receipt, `${label}.receipt`);
    const receipt = JSON.parse(await fs.readFile(receiptPath, "utf8"));
    const markers = findRequiredMarkers(receipt);
    if (markers.length) {
      throw new Error(`${record.id} ${label} contains unfilled markers: ${markers.join(", ")}`);
    }
    if (receipt.runId !== run.id || receipt.variantId !== run.variantId) {
      throw new Error(`${record.id} ${label} id/variant does not match its receipt`);
    }
    if (run.status && receipt.status !== run.status) {
      throw new Error(`${record.id} ${label} status does not match its receipt`);
    }
    const prompt = prompts.get(run.promptId);
    if (!prompt) throw new Error(`${record.id} ${label} references unknown prompt ${run.promptId}`);
    if (receipt.prompt?.templateId !== run.promptId || receipt.prompt?.renderedSha256 !== prompt.hash) {
      throw new Error(`${record.id} ${label} receipt prompt id/hash does not match the rendered prompt`);
    }
    const receiptRendered = resolveOwnedFile(record.folder, receipt.prompt?.renderedPath, `${label}.prompt.renderedPath`);
    if (path.resolve(receiptRendered) !== path.resolve(prompt.renderedPath)) {
      throw new Error(`${record.id} ${label} receipt points to a different rendered prompt`);
    }
  }
}

function resolveOwnedFile(ownerFolder, value, label) {
  if (!value || typeof value !== "string" || path.isAbsolute(value)) {
    throw new Error(`${label} must be a relative file path`);
  }
  const absolute = path.resolve(ownerFolder, value);
  if (!isWithin(ownerFolder, absolute)) throw new Error(`${label} must stay inside its prototype folder`);
  return absolute;
}

function findRequiredMarkers(value, currentPath = "$", output = []) {
  if (typeof value === "string" && /(?:REQUIRED-|replace-with-)/i.test(value)) output.push(currentPath);
  if (Array.isArray(value)) value.forEach((item, index) => findRequiredMarkers(item, `${currentPath}[${index}]`, output));
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, item] of Object.entries(value)) findRequiredMarkers(item, `${currentPath}.${key}`, output);
  }
  return output;
}

function buildLauncher(primary, recordsMap) {
  const records = [...recordsMap.values()].sort((a, b) => a.id.localeCompare(b.id));
  const cards = records.map((record) => {
    const title = escapeHtml(record.metadata.title || record.id);
    const question = escapeHtml(record.metadata.question || record.metadata.details || "No question recorded.");
    const href = `./prototypes/${encodeURI(record.id)}/index.html`;
    const primaryBadge = record.id === primary.id ? "<span>Primary</span>" : "";
    return `<a class="card" href="${href}">${primaryBadge}<strong>${title}</strong><small>${escapeHtml(record.id)}</small><p>${question}</p></a>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(primary.metadata.title || primary.id)} · Prototype Lab Pack</title>
    <style>
      :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#090a0b;color:#ededeb}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:32px;background:#090a0b}main{width:min(1120px,100%);margin:auto}header{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:22px}h1{margin:0;font-size:clamp(24px,4vw,46px);letter-spacing:-.04em}header p{max-width:520px;margin:0;color:#979995;font-size:13px;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}.card{position:relative;display:grid;gap:8px;min-height:180px;padding:18px;border:1px solid #242628;border-radius:8px;background:#111315;color:inherit;text-decoration:none}.card:hover,.card:focus-visible{border-color:#777b80;outline:none}.card span{position:absolute;top:12px;right:12px;border-radius:999px;background:#2d5e47;padding:4px 7px;font-size:9px;font-weight:800;text-transform:uppercase}.card strong{padding-right:54px;font-size:16px}.card small{color:#737772;font:10px ui-monospace,monospace}.card p{margin:auto 0 0;color:#a8aaa6;font-size:12px;line-height:1.45}@media(max-width:640px){body{padding:18px}header{display:grid}}
    </style>
  </head>
  <body>
    <main>
      <header><div><small>Prototype Lab portable pack</small><h1>${escapeHtml(primary.metadata.title || primary.id)}</h1></div><p>Self-contained review bundle. Open the primary experiment or inspect any linked standalone run.</p></header>
      <section class="grid">${cards}</section>
    </main>
  </body>
</html>
`;
}

async function describeFiles(root) {
  const files = await listFiles(root);
  return Promise.all(files.map(async (file) => {
    const contents = await fs.readFile(file);
    return {
      path: toPosix(path.relative(root, file)),
      bytes: contents.length,
      sha256: sha256(contents)
    };
  }));
}

async function sanitizePackTextFiles(root) {
  const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".txt", ".yaml", ".yml"]);
  const changed = [];
  for (const file of await listFiles(root)) {
    if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
    const raw = await fs.readFile(file, "utf8");
    let next = raw;
    let replacements = 0;
    if (path.extname(file).toLowerCase() === ".json") {
      try {
        const parsed = JSON.parse(raw);
        const sanitized = sanitizePortableValue(parsed);
        next = `${JSON.stringify(sanitized.value, null, 2)}\n`;
        replacements = sanitized.replacements;
      } catch {
        const sanitized = sanitizePortableString(raw);
        next = sanitized.text;
        replacements = sanitized.replacements;
      }
    } else {
      const sanitized = sanitizePortableString(raw);
      next = sanitized.text;
      replacements = sanitized.replacements;
    }
    if (replacements) {
      await fs.writeFile(file, next, "utf8");
      changed.push({ path: toPosix(path.relative(root, file)), replacements });
    }
    if (hasLocalPath(next)) throw new Error(`Local path remains after sanitization: ${path.relative(root, file)}`);
  }
  return changed;
}

function sanitizePortableValue(value) {
  if (typeof value === "string") return sanitizePortableString(value);
  if (Array.isArray(value)) {
    const items = value.map(sanitizePortableValue);
    return { value: items.map((item) => item.value), replacements: items.reduce((sum, item) => sum + item.replacements, 0) };
  }
  if (value && typeof value === "object") {
    const result = {};
    let replacements = 0;
    for (const [key, item] of Object.entries(value)) {
      const sanitized = sanitizePortableValue(item);
      result[key] = sanitized.value;
      replacements += sanitized.replacements;
    }
    return { value: result, replacements };
  }
  return { value, replacements: 0 };
}

function sanitizePortableString(value) {
  let replacements = 0;
  let text = String(value);
  const patterns = [
    /file:\/\/\/[A-Za-z]:\/[^\s"'<>`]*/gi,
    /\b[A-Za-z]:\\[^\s"'<>`]*/g,
    /\b[A-Za-z]:\/[^\s"'<>`]*/g,
    /(^|[\s("'`])\/(?:home|Users|tmp|var|private|etc|usr|opt|workspace|work|project)\/[^\s"'<>`]*/gm
  ];
  for (const pattern of patterns) {
    text = text.replace(pattern, (token, prefix = "") => {
      replacements += 1;
      const leading = typeof prefix === "string" ? prefix : "";
      const value = leading && token.startsWith(leading) ? token.slice(leading.length) : token;
      return `${leading}${portablePathToken(value)}`;
    });
  }
  return { text, replacements };
}

function portablePathToken(token) {
  const suffix = token.match(/[),.;:]+$/)?.[0] || "";
  let core = suffix ? token.slice(0, -suffix.length) : token;
  core = core.replace(/^file:\/\/\/?/i, "");
  if (/^\/[A-Za-z]:\//.test(core)) core = core.slice(1);
  core = core.replace(/\\+/g, "\\");
  const normalized = core.replaceAll("\\", "/");
  const workspaceNormalized = toPosix(workspace).replace(/\/$/, "");
  if (normalized.toLowerCase().startsWith(`${workspaceNormalized.toLowerCase()}/`)) {
    return `${normalized.slice(workspaceNormalized.length + 1)}${suffix}`;
  }
  const basename = normalized.startsWith("/")
    ? path.posix.basename(normalized)
    : path.win32.basename(core) || path.posix.basename(normalized);
  return `<local-path>/${basename}${suffix}`;
}

function hasLocalPath(value) {
  return /file:\/\/\/[A-Za-z]:\//i.test(value)
    || /\b[A-Za-z]:[\\/]/.test(value)
    || /(^|[\s("'`])\/(?:home|Users|tmp|var|private|etc|usr|opt|workspace|work|project)\//m.test(value);
}

async function listFiles(root, current = root, output = []) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) await listFiles(root, absolute, output);
    else if (entry.isFile()) output.push(absolute);
  }
  return output.sort((a, b) => toPosix(path.relative(root, a)).localeCompare(toPosix(path.relative(root, b))));
}

async function writeZip(sourceRoot, destination) {
  const files = await listFiles(sourceRoot);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(toPosix(path.relative(sourceRoot, file)), "utf8");
    const raw = await fs.readFile(file);
    const deflated = deflateRawSync(raw, { level: 9 });
    const useDeflate = deflated.length < raw.length;
    const payload = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(33, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + payload.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  await fs.writeFile(destination, Buffer.concat([...localParts, ...centralParts, end]));
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isWithin(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isIgnoredName(name) {
  return [".git", ".scratch", "node_modules", "dist", "coverage", ".DS_Store", "Thumbs.db"].includes(name);
}

function isSensitiveName(name) {
  const lower = name.toLowerCase();
  return lower === ".env"
    || lower.startsWith(".env.")
    || ["id_rsa", "id_dsa", "id_ecdsa", "id_ed25519"].includes(lower)
    || /\.(pem|key|p12|pfx)$/.test(lower)
    || /^(credentials?|secrets?)\.(json|ya?ml|txt|js|mjs|ts)$/.test(lower)
    || /^tokens?\.(json|ya?ml|txt)$/.test(lower);
}

function isArchive(name) {
  return /\.(zip|tar|tgz|gz|7z|rar)$/i.test(name);
}

function safeName(value) {
  return String(value || "prototype").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "prototype";
}

function toPosix(value) {
  return value.replaceAll("\\", "/");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function parseArgs(argv) {
  const parsed = {};
  const flags = new Set(["include-proof", "no-zip", "help"]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "-h") {
      parsed.help = true;
      continue;
    }
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const [name, inlineValue] = token.slice(2).split("=", 2);
    if (flags.has(name)) {
      parsed[name] = true;
      continue;
    }
    const value = inlineValue ?? argv[index + 1];
    if (inlineValue === undefined) index += 1;
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`);
    parsed[name] = value;
  }
  return parsed;
}

function printHelp() {
  console.log(`Package a Prototype Lab experiment as a static folder and ZIP.

Usage:
  node package-prototype-lab.mjs --workspace <repo> --id <YYYY/MM/NNN-slug>
  node package-prototype-lab.mjs --workspace <repo> --path <prototype-folder>

Options:
  --output <dir>       Output root (default: dist/prototype-lab)
  --include-proof      Include proof/ folders (default: omit for smaller uploads)
  --no-zip             Create only the unpacked static folder

The pack includes linked standalone prototypes, normalized prompts and run
receipts, a root launcher, pack.json hashes, and no scratch/runtime secrets.`);
}
