#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectPrototypeIndex } from "./build-prototype-index.mjs";

const requiredViewportLabels = ["1920x1080", "1200x820", "834x1112", "390x844"];
const requiredFinishDimensions = ["alignment", "spacing-rhythm", "overflow", "scrollbars", "gradients", "icons-vector-craft", "content-integrity", "responsive-detail"];

export async function verifyPrototype({ workspace = process.cwd(), id, profile = "quick", write = false, initReview = false } = {}) {
  const workspaceRoot = path.resolve(workspace);
  const resolved = await resolveArtifact(workspaceRoot, id);
  const folder = path.join(workspaceRoot, "prototypes", ...resolved.id.split("/"));
  const metadataFile = path.join(folder, "metadata.json");
  const metadata = await readJson(metadataFile, null);
  const errors = [];
  const warnings = [];
  const checks = [];

  if (!metadata) {
    errors.push(issue("missing-metadata", "metadata.json is missing or invalid."));
  } else {
    check(Boolean(metadata.title), "metadata-title", "metadata title exists", errors, checks);
    check(Boolean(metadata.question && metadata.question !== "What should this prototype help decide?"), "metadata-question", "decision question is specific", errors, checks);
    check(metadata.entrypoint === "index.html", "metadata-entrypoint", "entrypoint is index.html", errors, checks);
    if ((metadata.modelExact || metadata.provenance?.models?.[0] || metadata.model || "unknown") === "unknown") warnings.push(issue("unknown-model", "Capture the effective model when the runtime exposes it."));
  }

  const entrypoint = path.join(folder, metadata?.entrypoint || "index.html");
  check(await exists(entrypoint), "entrypoint-exists", "entrypoint exists", errors, checks);
  if (await exists(entrypoint)) {
    const runtimeIssues = await inspectRuntime(folder);
    errors.push(...runtimeIssues.errors);
    warnings.push(...runtimeIssues.warnings);
    checks.push(...runtimeIssues.checks);
  }

  const proofFiles = await listFiles(path.join(folder, "proof"));
  const proofPaths = proofFiles.map((file) => toPosix(path.relative(folder, file)));
  if (!proofPaths.length) warnings.push(issue("missing-proof", "Add browser screenshots or a browser review receipt under proof/."));

  let reviewFile = await findBrowserReview(folder);
  if (initReview && !reviewFile) {
    reviewFile = path.join(folder, "proof", "browser-review.json");
    await fs.mkdir(path.dirname(reviewFile), { recursive: true });
    await fs.writeFile(reviewFile, jsonText(browserReviewTemplate(resolved.id)), "utf8");
    warnings.push(issue("review-template-created", `Fill ${toPosix(path.relative(workspaceRoot, reviewFile))} after browser verification.`));
  }

  let browserVerified = false;
  if (profile === "full") {
    if (!reviewFile) {
      errors.push(issue("missing-browser-review", "Full verification requires proof/browser-review.json. Run with --init-review, exercise every viewport in a browser, then fill the receipt."));
    } else {
      const review = await readJson(reviewFile, null);
      const result = await validateBrowserReview(folder, review);
      errors.push(...result.errors);
      checks.push(...result.checks);
      browserVerified = result.errors.length === 0;
    }
  } else if (reviewFile) {
    const review = await readJson(reviewFile, null);
    const result = await validateBrowserReview(folder, review);
    browserVerified = result.errors.length === 0;
    if (!browserVerified) warnings.push(issue("browser-review-incomplete", "A browser review exists but does not yet pass the full evidence contract."));
  }

  if (!['quick', 'full'].includes(profile)) throw new Error("verify --profile must be quick or full");
  const report = {
    schemaVersion: 1,
    id: resolved.id,
    profile,
    status: errors.length ? "blocked" : "passed",
    verifiedAt: new Date().toISOString(),
    browserVerified,
    proofCount: proofPaths.length,
    proof: proofPaths,
    checks,
    warnings,
    errors
  };
  if (write) {
    const output = path.join(folder, "proof", "verification-report.json");
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, jsonText(report), "utf8");
    report.report = toPosix(path.relative(workspaceRoot, output));
  }
  return report;
}

async function inspectRuntime(folder) {
  const errors = [];
  const warnings = [];
  const checks = [];
  const files = (await listFiles(folder)).filter((file) => /\.(?:html|css|js|mjs|json|md)$/i.test(file) && !toPosix(path.relative(folder, file)).startsWith("proof/"));
  const fileSet = new Set((await listFiles(folder)).map((file) => toPosix(path.relative(folder, file))));
  const externalRuntime = /<(?:script|img|iframe|audio|video|source)\b[^>]*\bsrc=["']https?:\/\/|<link\b[^>]*\bhref=["']https?:\/\/|url\(\s*["']?https?:\/\//i;
  const rootRelative = /<(?:script|img|iframe|audio|video|source)\b[^>]*\bsrc=["']\/|<link\b[^>]*\bhref=["']\/|url\(\s*["']?\//i;
  const localPath = /(?:\b[A-Z]:\\|file:\/\/|\/(?:Users|home)\/)/i;
  for (const file of files) {
    const relative = toPosix(path.relative(folder, file));
    const content = await fs.readFile(file, "utf8");
    if (externalRuntime.test(content)) errors.push(issue("external-runtime", `${relative} uses an external runtime dependency.`));
    if (rootRelative.test(content)) errors.push(issue("root-relative-runtime", `${relative} uses a root-relative runtime URL.`));
    if (localPath.test(content)) errors.push(issue("local-path", `${relative} leaks a local filesystem path.`));
    if (/\.html?$/i.test(file)) {
      for (const reference of htmlReferences(content)) {
        if (skipReference(reference)) continue;
        const clean = reference.split(/[?#]/, 1)[0];
        const target = toPosix(path.normalize(path.join(path.dirname(relative), clean)));
        if (target.startsWith("../") || path.isAbsolute(clean)) errors.push(issue("escaping-reference", `${relative} references ${reference} outside the artifact.`));
        else if (!fileSet.has(target) && !target.endsWith("/")) errors.push(issue("missing-reference", `${relative} references missing file ${reference}.`));
      }
    }
  }
  if (!errors.some((entry) => ["external-runtime", "root-relative-runtime", "local-path", "escaping-reference", "missing-reference"].includes(entry.code))) {
    checks.push("runtime is self-contained and subpath-safe");
  }
  if (!files.some((file) => /\.html?$/i.test(file))) warnings.push(issue("no-html-runtime", "No HTML runtime file was found."));
  return { errors, warnings, checks };
}

async function validateBrowserReview(folder, review) {
  const errors = [];
  const checks = [];
  if (!review || review.status !== "passed") errors.push(issue("browser-review-status", "Browser review status must be passed."));
  if (Number(review?.schemaVersion) < 2) errors.push(issue("browser-review-schema", "Full verification requires browser review schemaVersion 2."));
  if (!review?.reviewedAt || !String(review?.reviewer || "").trim()) errors.push(issue("browser-review-provenance", "Browser review requires reviewedAt and reviewer."));
  if ((review?.knownGaps || []).length) errors.push(issue("browser-review-known-gaps", "A passed browser review cannot retain known gaps."));
  const metadata = await readJson(path.join(folder, "metadata.json"), {});
  const runtime = review?.runtime || {};
  if (runtime.entrypoint !== (metadata.entrypoint || "index.html") || runtime.loaded !== true) errors.push(issue("entrypoint-runtime", "Browser review must prove the configured entrypoint loaded."));
  if (!Number.isInteger(runtime.visibleControlCount) || runtime.visibleControlCount < 0 || !Number.isInteger(runtime.exercisedControlCount) || runtime.exercisedControlCount !== runtime.visibleControlCount) {
    errors.push(issue("control-coverage", "Browser review must count and exercise every visible control."));
  }
  const navigationChecks = Array.isArray(runtime.navigationChecks) ? runtime.navigationChecks : [];
  for (const item of navigationChecks) if (!passedCheck(item) || !String(item.target || "").trim()) errors.push(issue("navigation-check", "Every navigation check needs a target and passed status."));
  const interactionChecks = Array.isArray(review?.interactionChecks) ? review.interactionChecks : [];
  if (runtime.visibleControlCount > 0 && !interactionChecks.length) errors.push(issue("interaction-coverage", "Visible controls require structured interaction checks."));
  for (const item of interactionChecks) if (!passedCheck(item)) errors.push(issue("interaction-check", "Every interaction check must be structured and passed."));
  const accessibilityChecks = Array.isArray(review?.accessibilityChecks) ? review.accessibilityChecks : [];
  if (!accessibilityChecks.length || accessibilityChecks.some((item) => !passedCheck(item))) errors.push(issue("accessibility-check", "Browser review requires at least one structured passed accessibility check."));
  const finishChecks = Array.isArray(review?.finishChecks) ? review.finishChecks : [];
  for (const dimension of requiredFinishDimensions) {
    const item = finishChecks.find((check) => check.dimension === dimension);
    if (!item) errors.push(issue("missing-finish-check", `Browser review is missing finish dimension ${dimension}.`));
    else if (!["passed", "not-applicable"].includes(item.status) || !String(item.evidence || "").trim()) errors.push(issue("finish-check", `${dimension} must be passed or explicitly not-applicable with evidence.`));
    else if (["alignment", "spacing-rhythm", "overflow", "content-integrity", "responsive-detail"].includes(dimension) && item.status !== "passed") errors.push(issue("finish-check", `${dimension} is always applicable and must pass.`));
  }
  const viewports = Array.isArray(review?.viewports) ? review.viewports : [];
  for (const label of requiredViewportLabels) {
    const [width, height] = label.split("x").map(Number);
    const viewport = viewports.find((item) => Number(item.width) === width && Number(item.height) === height);
    if (!viewport) {
      errors.push(issue("missing-viewport", `Browser review is missing ${label}.`));
      continue;
    }
    if (viewport.horizontalOverflow !== false) errors.push(issue("horizontal-overflow", `${label} must record horizontalOverflow: false.`));
    if (viewport.viewportFit !== "passed") errors.push(issue("viewport-fit", `${label} must record viewportFit: passed.`));
    if (typeof viewport.verticalOverflow !== "boolean" || !String(viewport.scrollOwner || "").trim()) errors.push(issue("scroll-ownership", `${label} must record verticalOverflow and scrollOwner.`));
    const scrollbar = viewport.scrollbar || {};
    if (typeof scrollbar.present !== "boolean" || typeof scrollbar.nativeVisible !== "boolean") errors.push(issue("scrollbar-review", `${label} must inspect scrollbar presence and native chrome.`));
    if (scrollbar.nativeVisible === true) errors.push(issue("native-scrollbar", `${label} exposes native default scrollbar chrome.`));
    if (scrollbar.present === true && scrollbar.customized !== true) errors.push(issue("scrollbar-review", `${label} scrollbars must be customized.`));
    if (label === "1920x1080" && Number(viewport.deviceScaleFactor) < 2) errors.push(issue("detail-scale", "1920x1080 evidence requires deviceScaleFactor 2 or greater."));
    const detailChecks = Array.isArray(viewport.detailChecks) ? viewport.detailChecks : [];
    if (label === "1920x1080" && (!detailChecks.length || detailChecks.some((item) => !passedCheck(item)))) errors.push(issue("detail-review", "1920x1080 evidence requires structured passed detail checks."));
    if ((viewport.consoleErrors || []).length) errors.push(issue("console-errors", `${label} records console errors.`));
    if ((viewport.runtimeErrors || []).length) errors.push(issue("runtime-errors", `${label} records runtime errors.`));
    if (!viewport.screenshot) errors.push(issue("missing-screenshot", `${label} needs a screenshot path.`));
    else {
      const screenshot = path.resolve(folder, viewport.screenshot);
      if (!isWithin(folder, screenshot) || !(await exists(screenshot))) errors.push(issue("missing-screenshot", `${label} screenshot does not exist inside the artifact.`));
    }
  }
  if (!errors.length) checks.push("browser review passes runtime, navigation, finish, and four canonical viewport gates");
  return { errors, checks };
}

function browserReviewTemplate(id) {
  return {
    schemaVersion: 2,
    artifactId: id,
    status: "planned",
    reviewedAt: null,
    reviewer: "not captured",
    runtime: { entrypoint: "index.html", loaded: null, visibleControlCount: null, exercisedControlCount: null, navigationChecks: [] },
    interactionChecks: [],
    accessibilityChecks: [],
    finishChecks: requiredFinishDimensions.map((dimension) => ({ dimension, status: "planned", evidence: "" })),
    knownGaps: [],
    viewports: requiredViewportLabels.map((label) => {
      const [width, height] = label.split("x").map(Number);
      return { width, height, deviceScaleFactor: label === "1920x1080" ? 2 : 1, screenshot: `proof/browser/${label}.png`, viewportFit: "planned", horizontalOverflow: null, verticalOverflow: null, scrollOwner: "", scrollbar: { present: null, nativeVisible: null, customized: null }, detailChecks: [], consoleErrors: [], runtimeErrors: [] };
    })
  };
}

function passedCheck(value) {
  return Boolean(value && typeof value === "object" && String(value.label || value.name || "").trim() && value.status === "passed" && String(value.evidence || "").trim());
}

async function resolveArtifact(workspace, id) {
  if (!id) throw new Error("verify requires --id <prototype-id-or-short-id>");
  const payload = await collectPrototypeIndex({ workspace });
  const normalized = String(id).replace(/^prototypes[\\/]/, "").replace(/[\\/]+index\.html$/i, "").replaceAll("\\", "/");
  const matches = payload.prototypes.filter((entry) => entry.id === normalized || entry.id.split("/").at(-1) === normalized || String(entry.sequence).padStart(3, "0") === normalized || entry.title.toLowerCase() === normalized.toLowerCase());
  if (matches.length !== 1) throw new Error(matches.length ? `Ambiguous prototype reference: ${id}` : `Prototype not found: ${id}`);
  return matches[0];
}

async function findBrowserReview(folder) {
  for (const name of ["browser-review.json", "verification.json"]) {
    const file = path.join(folder, "proof", name);
    if (await exists(file)) return file;
  }
  return null;
}

function htmlReferences(content) {
  const values = [];
  for (const match of content.matchAll(/<(?:script|img|iframe|audio|video|source|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi)) values.push(match[1]);
  return values;
}

function skipReference(value) {
  return /^(?:https?:|mailto:|tel:|data:|blob:|javascript:|#)/i.test(value) || value === "";
}

function check(condition, code, message, errors, checks) {
  if (condition) checks.push(message);
  else errors.push(issue(code, message));
}

function issue(code, message) { return { code, message }; }
function jsonText(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function toPosix(value) { return value.replaceAll("\\", "/"); }
function isWithin(root, candidate) { const relative = path.relative(root, candidate); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); }
async function exists(file) { return Boolean(await fs.stat(file).catch(() => null)); }
async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(file, "utf8")); } catch (error) { if (error.code === "ENOENT") return fallback; return fallback; } }
async function listFiles(root, current = root, output = []) {
  const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const file = path.join(current, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) await listFiles(root, file, output);
    else if (entry.isFile()) output.push(file);
  }
  return output;
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.id) {
    console.log("Verify one Prototype Lab artifact\n\nUsage:\n  verify-prototype-lab.mjs --id <id> [--workspace <path>] [--profile quick|full] [--init-review] [--write]");
  } else {
    console.log(JSON.stringify(await verifyPrototype({ workspace: args.workspace || process.cwd(), id: args.id, profile: args.profile || "quick", initReview: Boolean(args["init-review"]), write: Boolean(args.write) }), null, 2));
  }
}

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
