import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const renderer = path.join(repoRoot, "SKILLS", "prototype-lab", "scripts", "render-prompt-template.mjs");
const packager = path.join(repoRoot, "SKILLS", "prototype-lab", "scripts", "package-prototype-lab.mjs");
const organizer = path.join(repoRoot, "scripts", "reorganize-prototype-library.mjs");
const promptManager = path.join(repoRoot, "SKILLS", "prototype-lab", "scripts", "manage-prompt-library.mjs");
const workspaceManager = path.join(repoRoot, "SKILLS", "prototype-lab", "scripts", "manage-prototype-lab.mjs");
const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prototype-lab-tools-"));

try {
  const child = path.join(temporaryRoot, "prototypes", "2026", "07", "001-child");
  const hub = path.join(temporaryRoot, "prototypes", "2026", "07", "002-hub");
  await write(path.join(child, "index.html"), "<!doctype html><title>Child</title>");
  await write(path.join(child, "tokens.css"), ":root{--space:8px}");
  await write(path.join(child, "README.md"), `local source: ${child}\\index.html`);
  await write(path.join(child, "proof", "desktop.txt"), "proof");
  await writeJson(path.join(child, "metadata.json"), {
    id: "2026/07/001-child",
    slug: "child",
    title: "Child",
    date: "2026-07-10",
    question: "Does the child load?",
    sourcePrompt: "Build the child.",
    variants: [{ id: "child", status: "actual", model: "test-model", skill: "prototype-lab" }]
  });

  await write(path.join(hub, "index.html"), "<!doctype html><title>Hub</title><a href='../001-child/index.html'>Child</a>");
  await writeJson(path.join(hub, "metadata.json"), {
    id: "2026/07/002-hub",
    slug: "hub",
    title: "Comparison Hub",
    date: "2026-07-10",
    question: "Can the runs be compared?",
    linkedPrototypes: ["../001-child/index.html"],
    provenance: {
      prompts: [{ id: "shared", version: 1, label: "Shared", text: "Build Example for desktop." }],
      agentRuns: [{
        variantId: "child",
        promptId: "shared",
        status: "actual",
        model: "test-model",
        agentMode: "isolated-test",
        agentTool: "node",
        inputScope: "fixture only",
        receivedOtherVariants: false,
        editedFinalPrototype: false,
        standalonePath: "../001-child/index.html",
        fallbackReason: "not applicable"
      }]
    },
    variants: [{
      id: "child",
      status: "actual",
      model: "test-model",
      skill: "prototype-lab",
      outputPath: "../001-child/index.html",
      fallbackReason: "not applicable"
    }]
  });

  const template = path.join(hub, "prompts", "shared.template.md");
  const variables = path.join(hub, "prompts", "shared.vars.json");
  const rendered = path.join(hub, "prompts", "shared.rendered.md");
  await write(template, "Build {{name}} for {{viewport}}.");
  await writeJson(variables, { name: "Example", viewport: "desktop" });

  const renderResult = await run(renderer, ["--template", template, "--vars", variables, "--output", rendered]);
  const renderSummary = JSON.parse(renderResult.stdout);
  assert.match(renderSummary.sha256, /^[a-f0-9]{64}$/);
  assert.equal(await fs.readFile(rendered, "utf8"), "Build Example for desktop.");

  const receiptPath = path.join(hub, "runs", "child-attempt-01.json");
  const validReceipt = {
    schemaVersion: 1,
    runId: "child-attempt-01",
    status: "actual",
    variantId: "child",
    prompt: {
      templateId: "shared",
      templateVersion: 1,
      templatePath: "prompts/shared.template.md",
      variablesPath: "prompts/shared.vars.json",
      renderedPath: "prompts/shared.rendered.md",
      renderedSha256: renderSummary.sha256
    },
    execution: { model: "test-model", agentMode: "isolated-test", agentTool: "node", skills: ["prototype-lab"] },
    integrity: { inputScope: "fixture only", receivedOtherVariants: false, crossVariantLeakage: false, editedFinalPrototype: false },
    artifacts: { finalPrototypePath: "../001-child", filesChanged: ["index.html"] },
    usage: { inputTokens: "unknown", outputTokens: "unknown", totalTokens: "unknown", toolCalls: "not captured" },
    summary: "Fixture child run.",
    limitations: [],
    fallbackReason: "not applicable"
  };
  await writeJson(receiptPath, validReceipt);
  const hubMetadata = JSON.parse(await fs.readFile(path.join(hub, "metadata.json"), "utf8"));
  hubMetadata.schemaVersion = 2;
  hubMetadata.promptTemplates = [{
    id: "shared",
    version: 1,
    template: "prompts/shared.template.md",
    variables: "prompts/shared.vars.json",
    rendered: "prompts/shared.rendered.md",
    renderedSha256: renderSummary.sha256
  }];
  hubMetadata.runs = [{ id: "child-attempt-01", variantId: "child", promptId: "shared", receipt: "runs/child-attempt-01.json", status: "actual" }];
  await writeJson(path.join(hub, "metadata.json"), hubMetadata);

  await run(packager, ["--workspace", temporaryRoot, "--id", "2026/07/002-hub"]);
  const packRoot = path.join(temporaryRoot, "dist", "prototype-lab", "hub-pack");
  const manifest = JSON.parse(await fs.readFile(path.join(packRoot, "pack.json"), "utf8"));
  assert.equal(manifest.primaryId, "2026/07/002-hub");
  assert.deepEqual(manifest.sourceIds, ["2026/07/001-child", "2026/07/002-hub"]);
  assert.equal(manifest.includesProof, false);
  assert.equal(await exists(path.join(packRoot, "prototypes", "2026", "07", "001-child", "index.html")), true);
  assert.equal(await exists(path.join(packRoot, "prototypes", "2026", "07", "001-child", "tokens.css")), true);
  assert.equal(await exists(path.join(packRoot, "prototypes", "2026", "07", "001-child", "proof")), false);
  assert.equal(manifest.prompts.length >= 1, true);
  assert.equal(manifest.runs.length, 1);
  assert.equal(manifest.runs[0].id, "child-attempt-01");
  assert.equal(manifest.sanitizedLocalPaths.some((entry) => entry.path.endsWith("001-child/README.md")), true);
  assert.equal((await fs.readFile(path.join(packRoot, "prototypes", "2026", "07", "001-child", "README.md"), "utf8")).includes(temporaryRoot), false);
  const archive = await fs.readFile(path.join(temporaryRoot, "dist", "prototype-lab", "hub-pack.zip"));
  assert.equal(archive.subarray(0, 4).toString("hex"), "504b0304");

  await run(packager, ["--workspace", temporaryRoot, "--id", "2026/07/002-hub", "--include-proof", "--no-zip"]);
  const reviewManifest = JSON.parse(await fs.readFile(path.join(packRoot, "pack.json"), "utf8"));
  assert.equal(reviewManifest.includesProof, true);
  assert.equal(await exists(path.join(packRoot, "prototypes", "2026", "07", "001-child", "proof", "desktop.txt")), true);

  const invalidReceipt = structuredClone(validReceipt);
  invalidReceipt.prompt.renderedSha256 = "REQUIRED-rendered-sha256";
  await writeJson(receiptPath, invalidReceipt);
  await assert.rejects(
    run(packager, ["--workspace", temporaryRoot, "--id", "2026/07/002-hub", "--no-zip"]),
    /contains unfilled markers/
  );
  await writeJson(receiptPath, validReceipt);

  await write(path.join(child, ".env"), "SHOULD_NOT_SHIP=true");
  await assert.rejects(
    run(packager, ["--workspace", temporaryRoot, "--id", "2026/07/002-hub", "--no-zip"]),
    /Sensitive filename blocks packaging/
  );
  await fs.rm(path.join(child, ".env"));

  const seeded = JSON.parse((await run(promptManager, ["seed", "--workspace", temporaryRoot, "--date", "2026-07-10"])).stdout);
  assert.equal(seeded.created.length, 8);
  assert.equal(seeded.catalog.count, 8);
  const seededAgain = JSON.parse((await run(promptManager, ["seed", "--workspace", temporaryRoot, "--date", "2026-07-10"])).stdout);
  assert.equal(seededAgain.created.length, 0);
  assert.equal(seededAgain.skipped.length, 8);
  const picked = JSON.parse((await run(promptManager, ["pick", "--workspace", temporaryRoot, "--count", "4"])).stdout);
  assert.equal(picked.count, 4);
  assert.equal(new Set(picked.prompts.map((prompt) => prompt.category)).size, 4);

  const customMeta = path.join(temporaryRoot, "prompt-input", "meta.json");
  const customTemplate = path.join(temporaryRoot, "prompt-input", "template.md");
  const customVars = path.join(temporaryRoot, "prompt-input", "vars.json");
  await writeJson(customMeta, {
    id: "custom-model-test",
    title: "Custom Model Test",
    category: "stateful-interaction",
    difficulty: "intermediate",
    origin: "agent-generated",
    challenge: "Build a deterministic custom interaction test.",
    tags: ["browser-ui"],
    requiredBehaviors: ["Change visible state", "Reset deterministically"],
    testDimensions: ["State correctness", "Feedback clarity"],
    targetViewports: ["1200x820", "390x844"]
  });
  await write(customTemplate, "Build {{title}} with deterministic state.");
  await writeJson(customVars, { title: "Custom Model Test" });
  const firstSave = JSON.parse((await run(promptManager, ["save", "--workspace", temporaryRoot, "--meta", customMeta, "--template", customTemplate, "--vars", customVars, "--date", "2026-07-10"])).stdout);
  assert.equal(firstSave.saved.version, 1);
  assert.equal(firstSave.catalogCount, 9);
  await write(customTemplate, "Build {{title}} with deterministic state and recovery.");
  const secondSave = JSON.parse((await run(promptManager, ["save", "--workspace", temporaryRoot, "--meta", customMeta, "--template", customTemplate, "--vars", customVars, "--date", "2026-07-10"])).stdout);
  assert.equal(secondSave.saved.version, 2);
  const customRecord = JSON.parse(await fs.readFile(path.join(temporaryRoot, "prototypes", "prompts", "custom-model-test", "prompt.json"), "utf8"));
  assert.equal(customRecord.currentVersion, 2);
  assert.equal(customRecord.versions.length, 2);
  assert.notEqual(customRecord.versions[0].renderedSha256, customRecord.versions[1].renderedSha256);
  const concurrentSaves = await Promise.all(Array.from({ length: 8 }, () => run(promptManager, ["save", "--workspace", temporaryRoot, "--meta", customMeta, "--template", customTemplate, "--vars", customVars, "--date", "2026-07-10"])));
  assert.deepEqual(concurrentSaves.map((result) => JSON.parse(result.stdout).saved.version).sort((a, b) => a - b), [3, 4, 5, 6, 7, 8, 9, 10]);
  const concurrentRecord = JSON.parse(await fs.readFile(path.join(temporaryRoot, "prototypes", "prompts", "custom-model-test", "prompt.json"), "utf8"));
  assert.equal(concurrentRecord.currentVersion, 10);
  assert.equal(concurrentRecord.versions.length, 10);
  await write(customTemplate, `Inspect ${["C:", "private", "workspace"].join("\\")} before building.`);
  await assert.rejects(
    run(promptManager, ["save", "--workspace", temporaryRoot, "--meta", customMeta, "--template", customTemplate, "--vars", customVars, "--date", "2026-07-10"]),
    /must not contain local absolute paths or likely secrets/
  );
  await write(customTemplate, "Inspect //server/private/file.txt before building.");
  await assert.rejects(
    run(promptManager, ["save", "--workspace", temporaryRoot, "--meta", customMeta, "--template", customTemplate, "--vars", customVars, "--date", "2026-07-10"]),
    /must not contain local absolute paths or likely secrets/
  );
  await write(customTemplate, "Inspect /tmp before building.");
  await assert.rejects(
    run(promptManager, ["save", "--workspace", temporaryRoot, "--meta", customMeta, "--template", customTemplate, "--vars", customVars, "--date", "2026-07-10"]),
    /must not contain local absolute paths or likely secrets/
  );
  await write(customTemplate, "Inspect /etc/passwd before building.");
  await assert.rejects(
    run(promptManager, ["save", "--workspace", temporaryRoot, "--meta", customMeta, "--template", customTemplate, "--vars", customVars, "--date", "2026-07-10"]),
    /must not contain local absolute paths or likely secrets/
  );
  await write(customTemplate, "Inspect /usr/local/private.txt and /project/private/file.txt before building.");
  await assert.rejects(
    run(promptManager, ["save", "--workspace", temporaryRoot, "--meta", customMeta, "--template", customTemplate, "--vars", customVars, "--date", "2026-07-10"]),
    /must not contain local absolute paths or likely secrets/
  );
  await write(customTemplate, `Inspect ${["", "", "server", "private", "file.txt"].join("\\")} before building.`);
  await assert.rejects(
    run(promptManager, ["save", "--workspace", temporaryRoot, "--meta", customMeta, "--template", customTemplate, "--vars", customVars, "--date", "2026-07-10"]),
    /must not contain local absolute paths or likely secrets/
  );
  await write(customTemplate, `Inspect \`${["", "", "server", "private", "file.txt"].join("\\")}\` before building.`);
  await assert.rejects(
    run(promptManager, ["save", "--workspace", temporaryRoot, "--meta", customMeta, "--template", customTemplate, "--vars", customVars, "--date", "2026-07-10"]),
    /must not contain local absolute paths or likely secrets/
  );

  const staleLock = path.join(temporaryRoot, "prototypes", "prompts", ".prompt-library.lock");
  await writeJson(staleLock, { token: "stale-test", pid: 2147483647, startedAt: "2000-01-01T00:00:00.000Z" });
  const recoveredCatalog = JSON.parse((await run(promptManager, ["catalog", "--workspace", temporaryRoot])).stdout);
  assert.equal(recoveredCatalog.count, 9);
  assert.equal(await exists(staleLock), false);
  const staleRecoveryLock = `${staleLock}.recovery`;
  await writeJson(staleRecoveryLock, { token: "stale-recovery-test", pid: 2147483647, startedAt: "2000-01-01T00:00:00.000Z" });
  const recoveredAgain = JSON.parse((await run(promptManager, ["catalog", "--workspace", temporaryRoot])).stdout);
  assert.equal(recoveredAgain.count, 9);
  assert.equal(await exists(staleRecoveryLock), false);
  await writeJson(staleLock, { token: "live-old-test", pid: process.pid, startedAt: "2000-01-01T00:00:00.000Z" });
  await assert.rejects(
    run(promptManager, ["catalog", "--workspace", temporaryRoot, "--lock-timeout-ms", "200"]),
    /Timed out waiting for prompt library lock/
  );
  assert.equal(await exists(staleLock), true);
  await fs.rm(staleLock, { force: true });

  const managedWorkspace = path.join(temporaryRoot, "managed-workspace");
  const initialized = JSON.parse((await run(workspaceManager, ["init", "--empty", "--workspace", managedWorkspace])).stdout);
  assert.equal(initialized.summary.artifacts, 0);
  assert.equal(initialized.summary.prompts, 0);
  const alpha = JSON.parse((await run(workspaceManager, ["create", "--workspace", managedWorkspace, "--date", "2026-07-11", "--title", "Alpha Board", "--question", "Does the board work?", "--model", "test-alpha"])).stdout);
  const beta = JSON.parse((await run(workspaceManager, ["create", "--workspace", managedWorkspace, "--date", "2026-07-11", "--title", "Beta Board", "--question", "Does the board work?", "--model", "test-beta"])).stdout);
  assert.equal(alpha.id, "2026/07/001-alpha-board");
  assert.equal(beta.id, "2026/07/002-beta-board");
  assert.equal(await exists(path.join(managedWorkspace, "prototypes", "2026", "07", "001-alpha-board", "artifact-data.js")), true);
  const managedHub = JSON.parse((await run(workspaceManager, ["hub", "--workspace", managedWorkspace, "--date", "2026-07-11", "--title", "Board Comparison", "--variants", "001,002", "--dimension", "model", "--criteria", "clarity,feedback,fit"])).stdout);
  assert.equal(managedHub.id, "2026/07/003-board-comparison");
  assert.deepEqual(managedHub.variants, [alpha.id, beta.id]);
  const hubFolder = path.join(managedWorkspace, "prototypes", "2026", "07", "003-board-comparison");
  assert.equal(await exists(path.join(hubFolder, "hub.config.json")), true);
  assert.equal(await exists(path.join(hubFolder, "hub-data.js")), true);
  assert.equal(await exists(path.join(hubFolder, "hub.css")), true);
  const hubConfig = JSON.parse(await fs.readFile(path.join(hubFolder, "hub.config.json"), "utf8"));
  assert.equal(hubConfig.question, "Does the board work?");
  hubConfig.question = "Which board is clearer after review?";
  await writeJson(path.join(hubFolder, "hub.config.json"), hubConfig);
  const synced = JSON.parse((await run(workspaceManager, ["sync", "--workspace", managedWorkspace])).stdout);
  assert.equal(synced.summary.artifacts, 3);
  assert.equal(synced.summary.managedHubs, 1);
  const hubData = await fs.readFile(path.join(hubFolder, "hub-data.js"), "utf8");
  assert.match(hubData, /Which board is clearer after review\?/);
  const status = JSON.parse((await run(workspaceManager, ["status", "--workspace", managedWorkspace])).stdout);
  assert.deepEqual(status.managedHubs, [managedHub.id]);
  assert.deepEqual(status.legacyHubs, []);
  assert.deepEqual(status.invalidHubs, []);
  assert.equal(await exists(path.join(managedWorkspace, "prototypes", "index.html")), true);
  assert.equal(await exists(path.join(managedWorkspace, "prototypes", "prototype-index-data.js")), true);

  const legacyArchive = path.join(temporaryRoot, "prototypes", "2026", "07", "legacy-run.zip");
  await write(legacyArchive, "legacy archive fixture");
  const organizeWrite = JSON.parse((await run(organizer, ["--workspace", temporaryRoot, "--write"])).stdout);
  assert.equal(organizeWrite.prototypes, 2);
  assert.equal(organizeWrite.metadataChanges, 2);
  assert.equal(organizeWrite.archiveMoves.length, 1);
  assert.equal(await exists(legacyArchive), false);
  assert.equal(await exists(path.join(temporaryRoot, "dist", "prototype-lab", "legacy-archives", "2026", "07", "legacy-run.zip")), true);
  const organizedChild = JSON.parse(await fs.readFile(path.join(child, "metadata.json"), "utf8"));
  assert.equal(organizedChild.schemaVersion, 2);
  assert.equal(organizedChild.artifactKind, "prototype");
  assert.equal(organizedChild.runtimeLayout, "single-file");
  const organizeCheck = JSON.parse((await run(organizer, ["--workspace", temporaryRoot])).stdout);
  assert.equal(organizeCheck.metadataChanges, 0);
  assert.equal(organizeCheck.archiveMoves.length, 0);

  console.log("prototype-lab portable tools ok");
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
}

async function run(script, args) {
  return execFileAsync(process.execPath, [script, ...args], {
    cwd: temporaryRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
}

async function write(file, contents) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, contents, "utf8");
}

async function writeJson(file, value) {
  await write(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function exists(file) {
  return Boolean(await fs.stat(file).catch(() => null));
}
