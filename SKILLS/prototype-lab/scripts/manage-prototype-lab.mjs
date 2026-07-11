#!/usr/bin/env node

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { buildPrototypeIndex, collectPrototypeIndex } from "./build-prototype-index.mjs";

const execFileAsync = promisify(execFile);
const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptRoot, "..");
const [command = "status", ...tokens] = process.argv.slice(2);
const args = parseArgs(tokens);
const workspace = path.resolve(args.workspace || process.cwd());
const prototypesRoot = path.join(workspace, "prototypes");
const commandPrefix = await detectCommandPrefix();

if (command === "init") {
  await installLibraryHub();
  await runNode(path.join(scriptRoot, "manage-prompt-library.mjs"), [args.empty ? "init" : "seed", "--workspace", workspace]);
  const result = await buildPrototypeIndex({ workspace });
  print({ command, workspace: toPosix(workspace), ...resultSummary(result.payload), next: [labCommand("create --title <title> --question <question>"), labCommand("status")] });
} else if (command === "create") {
  const result = await createPrototype();
  print({ command, ...result, next: [`Open prototypes/${result.id}/index.html`, labCommand("sync")] });
} else if (command === "hub") {
  const result = await createOrUpdateHub();
  await installLibraryHub();
  await buildPrototypeIndex({ workspace });
  print({ command, ...result, next: [`Open prototypes/${result.id}/index.html`, `Edit hub.config.json, then run ${labCommand("sync")}`] });
} else if (command === "sync") {
  const result = await syncWorkspace();
  print({ command, ...result });
} else if (command === "status") {
  print(await workspaceStatus());
} else if (command === "pack") {
  if (!args.id) throw new Error("pack requires --id <prototype-id-or-short-id>");
  const payload = await collectPrototypeIndex({ workspace });
  const id = resolvePrototypeIds([args.id], payload.prototypes)[0];
  const packageArgs = ["--workspace", workspace, "--id", id];
  if (args["include-proof"]) packageArgs.push("--include-proof");
  const output = await runNode(path.join(scriptRoot, "package-prototype-lab.mjs"), packageArgs);
  process.stdout.write(output.stdout);
} else {
  throw new Error("Unknown command. Use init, create, hub, sync, status, or pack.");
}

async function createPrototype() {
  if (!args.title) throw new Error("create requires --title <title>");
  await fs.mkdir(prototypesRoot, { recursive: true });
  const date = args.date || today();
  const slug = slugify(args.slug || args.title);
  const payload = await collectPrototypeIndex({ workspace });
  const id = args.id || nextId(date, slug, payload.prototypes);
  validateId(id);
  const folder = folderFromId(id);
  if (await exists(folder)) throw new Error(`Artifact already exists: ${id}`);

  await fs.mkdir(folder, { recursive: true });
  for (const file of ["index.html", "styles.css", "app.js", "artifact-data.js"]) {
    await fs.copyFile(path.join(skillRoot, "assets", "prototype-shell", file), path.join(folder, file));
  }
  for (const name of ["assets", "proof", "prompts", "runs"]) await fs.mkdir(path.join(folder, name), { recursive: true });

  const prompt = args.prompt ? await attachLibraryPrompt(folder, args.prompt) : null;
  const sequence = sequenceFromId(id);
  const question = args.question || "What should this prototype help decide?";
  const metadata = {
    schemaVersion: 2,
    artifactKind: "prototype",
    entrypoint: "index.html",
    id,
    month: id.split("/").slice(0, 2).join("-"),
    number: sequence,
    slug,
    title: args.title,
    category: args.category || "prototype",
    status: args.question ? "draft" : "needs-brief",
    date,
    mode: "single",
    model: args.model || "unknown",
    modelExact: args.model || "unknown",
    tags: unique(["browser-ui", ...(splitList(args.tags))]),
    question,
    sourcePrompt: prompt?.challenge || "Not attached yet.",
    promptTemplates: prompt ? [prompt.record] : [],
    runs: [],
    details: "Standalone prototype scaffold managed by prototype-lab.",
    views: ["prototype"],
    variants: [],
    proof: [],
    runtimeLayout: "split",
    provenance: {
      skills: ["prototype-lab"],
      models: [args.model || "unknown"],
      tokenUsage: { input: "unknown", output: "unknown", total: "unknown" },
      toolCalls: "not captured",
      limitations: []
    },
    packaging: { primary: true, includeLinkedPrototypes: false, defaultProofPolicy: "omit" }
  };
  const artifactData = {
    id,
    title: metadata.title,
    question: metadata.question,
    status: metadata.status,
    model: metadata.modelExact,
    prompt: prompt ? `${prompt.id}@v${String(prompt.record.version).padStart(3, "0")}` : "not attached"
  };
  await fs.writeFile(path.join(folder, "artifact-data.js"), `window.PROTOTYPE_ARTIFACT_DATA = ${JSON.stringify(artifactData, null, 2)};\n`, "utf8");
  await writeJson(path.join(folder, "metadata.json"), metadata);
  await fs.writeFile(path.join(folder, "README.md"), prototypeReadme(metadata, prompt), "utf8");
  return { id, folder: toPosix(path.relative(workspace, folder)), prompt: prompt?.id || null };
}

async function createOrUpdateHub() {
  if (!args.title) throw new Error("hub requires --title <title>");
  if (!args.variants) throw new Error("hub requires --variants <id,id,...>");
  const payload = await collectPrototypeIndex({ workspace });
  const variantIds = resolvePrototypeIds(splitList(args.variants), payload.prototypes.filter((entry) => !entry.isComparisonHub));
  if (variantIds.length < 2) throw new Error("A comparison hub requires at least two standalone variants");
  const date = args.date || today();
  const slug = slugify(args.slug || args.title);
  const id = args.id || nextId(date, slug, payload.prototypes);
  validateId(id);
  const folder = folderFromId(id);
  const configFile = path.join(folder, "hub.config.json");
  if ((await exists(folder)) && !(await exists(configFile))) throw new Error(`Refusing to replace unmanaged artifact: ${id}`);
  const previous = await readJson(configFile, {});
  const sharedQuestions = unique(variantIds.map((prototypeId) => payload.prototypes.find((entry) => entry.id === prototypeId)?.question).filter((question) => question && question !== "No question recorded."));
  const inheritedQuestion = sharedQuestions.length === 1 ? sharedQuestions[0] : null;
  const config = {
    schemaVersion: 1,
    managedBy: "prototype-lab",
    id,
    title: args.title,
    question: args.question || previous.question || inheritedQuestion || `Which ${args.dimension || "prototype"} variant best answers the shared brief?`,
    date,
    status: args.status || previous.status || "active",
    dimension: args.dimension || previous.dimension || "prototype",
    criteria: splitList(args.criteria).length ? splitList(args.criteria) : previous.criteria || ["prompt fidelity", "interaction quality", "visual hierarchy", "viewport fit"],
    skill: args.skill || previous.skill || "prototype-lab",
    defaultView: args.view || previous.defaultView || "overview",
    variants: variantIds.map((prototypeId) => ({ prototypeId }))
  };
  await fs.mkdir(path.join(folder, "proof"), { recursive: true });
  await writeJson(configFile, config);
  const synced = await syncManagedHub(configFile);
  return { id, folder: toPosix(path.relative(workspace, folder)), variants: variantIds, files: synced.files };
}

async function syncWorkspace() {
  await installLibraryHub();
  await runNode(path.join(scriptRoot, "manage-prompt-library.mjs"), ["catalog", "--workspace", workspace]);
  const configFiles = await findFiles(prototypesRoot, "hub.config.json");
  const hubs = [];
  for (const file of configFiles) hubs.push(await syncManagedHub(file));
  const { payload } = await buildPrototypeIndex({ workspace });
  return { workspace: toPosix(workspace), hubs: hubs.map((hub) => hub.id), ...resultSummary(payload) };
}

async function syncManagedHub(configFile) {
  const config = await readJson(configFile, null);
  if (!config) throw new Error(`Invalid hub config: ${configFile}`);
  validateId(config.id);
  const folder = folderFromId(config.id);
  if (path.resolve(path.dirname(configFile)) !== folder) throw new Error(`Hub config id/folder mismatch: ${config.id}`);
  const payload = await collectPrototypeIndex({ workspace });
  const variantSpecs = Array.isArray(config.variants) ? config.variants : [];
  const variantIds = resolvePrototypeIds(variantSpecs.map((item) => typeof item === "string" ? item : item.prototypeId), payload.prototypes.filter((entry) => !entry.isComparisonHub));
  if (variantIds.length < 2) throw new Error(`Hub ${config.id} needs at least two variants`);
  const variants = [];
  for (let index = 0; index < variantIds.length; index += 1) {
    const prototypeId = variantIds[index];
    const entry = payload.prototypes.find((item) => item.id === prototypeId);
    const metadata = await readJson(path.join(folderFromId(prototypeId), "metadata.json"), {});
    const override = typeof variantSpecs[index] === "object" ? variantSpecs[index] : {};
    variants.push({
      id: override.id || metadata.slug || prototypeId.split("/").at(-1).replace(/^\d+-/, ""),
      prototypeId,
      title: override.title || entry.title,
      path: toPosix(path.relative(folder, path.join(folderFromId(prototypeId), "index.html"))),
      model: entry.modelExact || entry.model,
      skills: entry.skills,
      status: entry.status,
      question: entry.question,
      proof: entry.proof,
      hypothesis: override.hypothesis || metadata.variants?.[0]?.hypothesis || "Review this variant against the shared criteria.",
      tradeoff: override.tradeoff || metadata.variants?.[0]?.tradeoff || "Not recorded.",
      tags: entry.tags
    });
  }

  const hubData = {
    schemaVersion: 1,
    id: config.id,
    title: config.title,
    question: config.question,
    date: config.date,
    status: config.status || "active",
    dimension: config.dimension || "prototype",
    criteria: config.criteria || [],
    defaultView: config.defaultView || "overview",
    variants
  };
  const assetRoot = path.join(skillRoot, "assets", "comparison-hub");
  for (const file of ["index.html", "hub.css", "hub.js"]) await fs.copyFile(path.join(assetRoot, file), path.join(folder, file));
  await fs.writeFile(path.join(folder, "hub-data.js"), `window.PROTOTYPE_HUB_DATA = ${JSON.stringify(hubData, null, 2)};\n`, "utf8");

  const previous = await readJson(path.join(folder, "metadata.json"), {});
  const metadata = {
    ...previous,
    schemaVersion: 2,
    artifactKind: "comparison-hub",
    entrypoint: "index.html",
    id: config.id,
    month: config.id.split("/").slice(0, 2).join("-"),
    number: sequenceFromId(config.id),
    slug: config.id.split("/").at(-1).replace(/^\d+-/, ""),
    title: config.title,
    category: `${config.dimension || "prototype"}-comparison`,
    status: config.status || "active",
    date: config.date,
    mode: "comparison-hub",
    tags: unique([...(previous.tags || []), "browser-ui", "comparison-hub", `${config.dimension || "prototype"}-comparison`]),
    question: config.question,
    details: `Managed comparison hub for ${variants.length} standalone variants.`,
    comparisonDimension: config.dimension || "prototype",
    comparisonCriteria: config.criteria || [],
    comparisonMethods: ["overview", "compare", "focus", "provenance"],
    variantStrategy: `one standalone artifact per ${config.dimension || "prototype"} variant`,
    linkedPrototypes: variants.map((variant) => variant.path),
    variants: variants.map((variant) => ({
      id: variant.id,
      indexId: variant.prototypeId,
      title: variant.title,
      model: variant.model,
      skill: variant.skills[0] || "unknown",
      status: variant.status,
      outputPath: `prototypes/${variant.prototypeId}`,
      hypothesis: variant.hypothesis,
      tradeoff: variant.tradeoff
    })),
    views: ["overview", "compare", "focus", "provenance"],
    proof: Array.isArray(previous.proof) ? previous.proof : [],
    provenance: {
      ...(previous.provenance || {}),
      skills: unique(variants.flatMap((variant) => variant.skills)),
      models: unique(variants.map((variant) => variant.model)),
      integrity: {
        requestedVariants: variants.length,
        deliveredVariants: variants.length,
        crossVariantLeakage: previous.provenance?.integrity?.crossVariantLeakage ?? "unknown",
        hubOnlyCompares: true
      },
      agentRuns: variants.map((variant) => ({
        variantId: variant.id,
        standalonePath: variant.path,
        outputPath: `prototypes/${variant.prototypeId}`,
        status: variant.status,
        agentMode: "not captured",
        agentTool: "not captured",
        fallbackReason: "not captured"
      }))
    },
    packaging: { primary: true, includeLinkedPrototypes: true, defaultProofPolicy: "omit" }
  };
  await writeJson(path.join(folder, "metadata.json"), metadata);
  await fs.writeFile(path.join(folder, "README.md"), hubReadme(config, variants), "utf8");
  return { id: config.id, files: ["hub.config.json", "hub-data.js", "index.html", "hub.css", "hub.js", "metadata.json", "README.md"] };
}

async function installLibraryHub() {
  await fs.mkdir(prototypesRoot, { recursive: true });
  const assets = path.join(skillRoot, "assets", "prototype-index");
  const mapping = { "index.html": "index.html", "prototype-index.css": "prototype-index.css", "prototype-index.js": "prototype-index.js" };
  for (const [source, target] of Object.entries(mapping)) await fs.copyFile(path.join(assets, source), path.join(prototypesRoot, target));
}

async function workspaceStatus() {
  const payload = await collectPrototypeIndex({ workspace });
  const invalidHubs = payload.prototypes.filter((entry) => entry.isComparisonHub && !payload.comparisonHubs.some((hub) => hub.id === entry.id));
  return {
    command: "status",
    workspace: toPosix(workspace),
    summary: payload.summary,
    managedHubs: payload.comparisonHubs.filter((hub) => hub.managed).map((hub) => hub.id),
    legacyHubs: payload.comparisonHubs.filter((hub) => !hub.managed).map((hub) => hub.id),
    invalidHubs: invalidHubs.map((entry) => entry.id),
    issues: payload.prototypes.flatMap((entry) => entry.issues.map((issue) => ({ id: entry.id, ...issue }))),
    commands: {
      create: labCommand("create --title <title> --question <question>"),
      hub: labCommand("hub --title <title> --variants <id,id> --dimension <model|skill|prompt|design>"),
      sync: labCommand("sync"),
      pack: labCommand("pack --id <hub-or-prototype-id>")
    }
  };
}

async function attachLibraryPrompt(folder, requested) {
  const catalog = await readJson(path.join(prototypesRoot, "prompts", "catalog.json"), null);
  const prompt = catalog?.prompts?.find((item) => item.id === requested);
  if (!prompt) throw new Error(`Prompt not found in library: ${requested}`);
  const source = path.join(prototypesRoot, "prompts", ...prompt.rendered.split("/"));
  const target = path.join(folder, "prompts", `${prompt.id}.rendered.md`);
  await fs.copyFile(source, target);
  return {
    id: prompt.id,
    challenge: prompt.challenge,
    record: {
      id: prompt.id,
      version: prompt.currentVersion,
      rendered: `prompts/${prompt.id}.rendered.md`,
      renderedSha256: prompt.renderedSha256,
      libraryId: prompt.id,
      libraryVersion: prompt.currentVersion
    }
  };
}

function resolvePrototypeIds(tokensToResolve, entries) {
  const resolved = [];
  for (const token of tokensToResolve.filter(Boolean)) {
    const normalized = token.replace(/^prototypes[\\/]/, "").replace(/[\\/]+index\.html$/i, "").replaceAll("\\", "/");
    const matches = entries.filter((entry) => entry.id === normalized || entry.id.split("/").at(-1) === normalized || String(entry.sequence).padStart(3, "0") === normalized || entry.title.toLowerCase() === normalized.toLowerCase());
    if (matches.length !== 1) throw new Error(matches.length ? `Ambiguous prototype reference: ${token}` : `Prototype not found: ${token}`);
    if (!resolved.includes(matches[0].id)) resolved.push(matches[0].id);
  }
  return resolved;
}

function nextId(date, slug, entries) {
  const [year, month] = date.split("-");
  if (!/^\d{4}$/.test(year || "") || !/^\d{2}$/.test(month || "")) throw new Error(`Invalid date: ${date}`);
  const prefix = `${year}/${month}/`;
  const next = Math.max(0, ...entries.filter((entry) => entry.id.startsWith(prefix)).map((entry) => sequenceFromId(entry.id))) + 1;
  return `${prefix}${String(next).padStart(3, "0")}-${slug}`;
}

function validateId(id) {
  if (!/^\d{4}\/\d{2}\/\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id || "")) throw new Error(`Invalid prototype id: ${id}`);
  const folder = folderFromId(id);
  const relative = path.relative(prototypesRoot, folder);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Prototype id escapes workspace: ${id}`);
}

function prototypeReadme(metadata, prompt) {
  return `# ${metadata.title}\n\n- Question: ${metadata.question}\n- Status: ${metadata.status}\n- Open: \`index.html\`\n- Metadata: \`metadata.json\`\n- Prompt: ${prompt ? `\`prompts/${prompt.id}.rendered.md\`` : "not attached"}\n- Proof: \`proof/\`\n\nBuild the prototype in this folder, keep runtime dependencies local, update metadata with factual model/run attribution, then run \`lab sync\`.\n`;
}

function hubReadme(config, variants) {
  return `# ${config.title}\n\n- Question: ${config.question}\n- Dimension: ${config.dimension}\n- Source of truth: \`hub.config.json\`\n- Generated data: \`hub-data.js\`\n- Open: \`index.html\`\n\n## Variants\n\n${variants.map((variant) => `- ${variant.title}: \`${variant.prototypeId}\``).join("\n")}\n\nEdit only \`hub.config.json\` to change membership, labels, criteria, or the default view. Run \`lab sync\` to regenerate the hub and workspace index.\n`;
}

function resultSummary(payload) { return { summary: payload.summary, index: "prototypes/index.html" }; }
function labCommand(value) { return `${commandPrefix} ${value}`; }
function folderFromId(id) { return path.join(prototypesRoot, ...id.split("/")); }
function sequenceFromId(id) { return Number(id.match(/\/(\d+)-/)?.[1]) || 0; }
function slugify(value) { const slug = String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); if (!slug) throw new Error("Could not derive a slug"); return slug; }
function splitList(value) { return typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : []; }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function today() { return new Date().toISOString().slice(0, 10); }
function toPosix(value) { return value.replaceAll("\\", "/"); }
function print(value) { console.log(JSON.stringify(value, null, 2)); }
async function exists(file) { return Boolean(await fs.stat(file).catch(() => null)); }
async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(file, "utf8")); } catch (error) { if (error.code === "ENOENT") return fallback; throw error; } }
async function writeJson(file, value) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
async function findFiles(root, name, output = []) { const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []); for (const entry of entries) { if (entry.name.startsWith(".") || entry.name === "proof" || (root === prototypesRoot && entry.name === "prompts")) continue; const file = path.join(root, entry.name); if (entry.isDirectory()) await findFiles(file, name, output); else if (entry.name === name) output.push(file); } return output; }
async function runNode(script, commandArgs) { return execFileAsync(process.execPath, [script, ...commandArgs], { cwd: workspace, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }); }
async function detectCommandPrefix() { const packageJson = await readJson(path.join(workspace, "package.json"), {}); return packageJson.scripts?.lab ? "npm run lab --" : "node <skill-root>/scripts/manage-prototype-lab.mjs"; }

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const [name, inline] = token.slice(2).split("=", 2);
    if (inline !== undefined) parsed[name] = inline || true;
    else if (values[index + 1] && !values[index + 1].startsWith("--")) parsed[name] = values[++index];
    else parsed[name] = true;
  }
  return parsed;
}
