import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
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
  assert.equal(manifest.deployment?.format, "prototype-lab-static-site");
  assert.equal(manifest.deployment?.validation?.status, "passed");
  assert.equal(manifest.deployment?.selfContainedRuntime, true);
  const deployDescriptor = JSON.parse(await fs.readFile(path.join(packRoot, "deploy.json"), "utf8"));
  assert.equal(deployDescriptor.publishDirectory, ".");
  assert.equal(deployDescriptor.entrypoint, "index.html");
  assert.equal(deployDescriptor.buildCommand, null);
  assert.equal(manifest.sanitizedLocalPaths.some((entry) => entry.path.endsWith("001-child/README.md")), true);
  assert.equal((await fs.readFile(path.join(packRoot, "prototypes", "2026", "07", "001-child", "README.md"), "utf8")).includes(temporaryRoot), false);
  const archive = await fs.readFile(path.join(temporaryRoot, "dist", "prototype-lab", "hub-pack.zip"));
  assert.equal(archive.subarray(0, 4).toString("hex"), "504b0304");

  const originalChildHtml = await fs.readFile(path.join(child, "index.html"), "utf8");
  await write(path.join(child, "index.html"), "<!doctype html><title>Child</title><img src='/missing.png'>");
  await assert.rejects(
    run(packager, ["--workspace", temporaryRoot, "--id", "2026/07/002-hub", "--no-zip"]),
    /Root-relative reference blocks subpath deployment/
  );
  await write(path.join(child, "index.html"), "<!doctype html><title>Child</title><script src='https://cdn.example.test/runtime.js'></script>");
  await assert.rejects(
    run(packager, ["--workspace", temporaryRoot, "--id", "2026/07/002-hub", "--no-zip"]),
    /External runtime dependency blocks portable deployment/
  );
  await write(path.join(child, "index.html"), "<!doctype html><title>Child</title><img src='./missing.png'>");
  await assert.rejects(
    run(packager, ["--workspace", temporaryRoot, "--id", "2026/07/002-hub", "--no-zip"]),
    /Missing local reference in static pack/
  );
  await write(path.join(child, "index.html"), originalChildHtml);

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

  const contaminatedV2Receipt = {
    ...structuredClone(validReceipt),
    schemaVersion: 2,
    experimentId: "portable-tools-test",
    conditionId: "baseline",
    stage: "build",
    slot: 1,
    attempt: 1,
    dispatch: {
      workerId: "worker-fixture",
      agentTool: "agents.spawn_agent",
      forkTurns: "all",
      assignmentSha256: "a".repeat(64),
      inputManifestSha256: "b".repeat(64)
    },
    execution: {
      requestedModel: "test-model",
      effectiveModel: "test-model",
      effectiveModelSource: "runtime-observed",
      reasoning: "high",
      variantSkills: [],
      orchestrationSkillsExposed: []
    },
    context: { memoryInputs: [], contextReads: [], receivedOtherVariants: false },
    assetPolicy: { mode: "worker-choice" },
    assets: []
  };
  await writeJson(receiptPath, contaminatedV2Receipt);
  await assert.rejects(
    run(packager, ["--workspace", temporaryRoot, "--id", "2026/07/002-hub", "--no-zip"]),
    /forkTurns none/
  );
  contaminatedV2Receipt.dispatch.forkTurns = "none";
  contaminatedV2Receipt.execution.effectiveModelSource = "not-captured";
  await writeJson(receiptPath, contaminatedV2Receipt);
  await assert.rejects(
    run(packager, ["--workspace", temporaryRoot, "--id", "2026/07/002-hub", "--no-zip"]),
    /must not infer effectiveModel/
  );
  const fixedSuppliedReceipt = structuredClone(contaminatedV2Receipt);
  fixedSuppliedReceipt.execution.effectiveModelSource = "runtime-observed";
  fixedSuppliedReceipt.assetPolicy = { mode: "fixed-supplied", skill: "imagegen" };
  fixedSuppliedReceipt.assets = [{
    id: "shared-atlas",
    role: "primary shared evidence",
    files: [{ path: "assets/shared-atlas.png", sha256: "c".repeat(64) }],
    consumedBy: ["index.html", "styles.css"],
    materialityProof: ["proof/desktop.png"]
  }];
  await write(path.join(hub, "assets", "shared-atlas.png"), "fixture atlas");
  await write(path.join(hub, "proof", "desktop.png"), "fixture visual proof");
  await writeJson(receiptPath, fixedSuppliedReceipt);
  await assert.rejects(
    run(packager, ["--workspace", temporaryRoot, "--id", "2026/07/002-hub", "--no-zip"]),
    /needs a passed visualReview/
  );
  fixedSuppliedReceipt.assets[0].visualReview = {
    status: "passed",
    method: "complete atlas-cell browser review",
    expectedItems: 8,
    reviewedItems: 8,
    checks: ["aspect-ratio", "semantic-mapping", "narrow-viewport"],
    proofPaths: ["proof/desktop.png"]
  };
  await writeJson(receiptPath, fixedSuppliedReceipt);
  await run(packager, ["--workspace", temporaryRoot, "--id", "2026/07/002-hub", "--no-zip"]);
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
  const firstSeedRendered = await fs.readFile(path.join(temporaryRoot, "prototypes", "prompts", ...seeded.catalog.prompts[0].rendered.split("/")), "utf8");
  assert.equal(firstSeedRendered.includes("## Evaluation focus"), false);
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
  const managerHelp = (await run(workspaceManager, ["help"])).stdout;
  assert.match(managerHelp, /experiment --spec/);
  assert.match(managerHelp, /authorize hashed build packets/);
  const initialized = JSON.parse((await run(workspaceManager, ["init", "--empty", "--workspace", managedWorkspace])).stdout);
  assert.equal(initialized.summary.artifacts, 0);
  assert.equal(initialized.summary.prompts, 0);
  const experimentSpecFile = path.join(managedWorkspace, "experiments", "capability-showcase.json");
  await writeJson(experimentSpecFile, {
    schemaVersion: 1,
    id: "capability-showcase",
    title: "Capability Showcase",
    intent: "showcase",
    question: "What changes when the design skill has authority?",
    sharedBrief: "Create an interactive public experience for an institute that documents a previously unknown human sense.",
    fixedOutcomes: ["Visitors can experience an interpretation", "Interaction creates a distinct later state"],
    openDecisions: ["premise", "institution", "content", "information architecture", "composition", "interaction metaphor", "visual language", "motion"],
    assetPolicy: { mode: "required", skill: "imagegen", deliverable: "one primary raster artifact consumed by the site" },
    layoutPolicy: "open",
    targetViewports: ["1200x820", "390x844"],
    variants: [
      { id: "model-baseline", model: "model-a", reasoning: "high", condition: "baseline", skills: [] },
      { id: "model-design", model: "model-a", reasoning: "high", condition: "design", skills: ["ruthless-designer"] }
    ]
  });
  const overconstrainedSpecFile = path.join(managedWorkspace, "experiments", "overconstrained-showcase.json");
  await writeJson(overconstrainedSpecFile, {
    schemaVersion: 1,
    id: "overconstrained-showcase",
    title: "Overconstrained Showcase",
    intent: "showcase",
    question: "Can this reveal creative range?",
    sharedBrief: "Build a dashboard with a left sidebar, three cards, rotate and zoom controls, measurement pins, a confidence slider, reset, undo, and submit buttons.",
    fixedOutcomes: ["Visitors can inspect the subject"],
    openDecisions: ["premise", "content", "composition", "interaction", "visual language", "motion"],
    assetPolicy: { mode: "worker-choice" },
    layoutPolicy: "open",
    targetViewports: ["1200x820"],
    variants: [
      { id: "baseline", model: "model-a", reasoning: "high", condition: "baseline", skills: [] },
      { id: "treatment", model: "model-a", reasoning: "high", condition: "design", skills: ["ruthless-designer"] }
    ]
  });
  await assert.rejects(
    run(workspaceManager, ["experiment", "--workspace", managedWorkspace, "--spec", "experiments/overconstrained-showcase.json"]),
    /too many solution cues/
  );
  await assert.rejects(
    run(workspaceManager, ["experiment", "--workspace", managedWorkspace, "--spec", "experiments/capability-showcase.json", "--direct-build"]),
    /allowed only for benchmark/
  );
  const directBenchmarkSpec = path.join(managedWorkspace, "experiments", "direct-benchmark.json");
  const directBenchmarkAssets = path.join(managedWorkspace, "fixtures", "benchmark-atlas.png");
  await write(directBenchmarkAssets, "fixed supplied benchmark asset");
  await writeJson(directBenchmarkSpec, {
    schemaVersion: 1,
    id: "direct-benchmark",
    title: "Direct Benchmark",
    intent: "benchmark",
    question: "What changes when the design skill is the only treatment?",
    sharedBrief: "Create an interactive public experience for an institute that documents a previously unknown human sense.",
    fixedOutcomes: ["Visitors can experience an interpretation", "Interaction creates a distinct later state"],
    openDecisions: ["premise", "institution", "content", "information architecture", "composition", "interaction metaphor", "visual language", "motion"],
    assetPolicy: {
      mode: "fixed-supplied",
      skill: "imagegen",
      deliverable: "the supplied atlas must be materially consumed",
      files: [{ path: "fixtures/benchmark-atlas.png", sha256: createHash("sha256").update(await fs.readFile(directBenchmarkAssets)).digest("hex") }]
    },
    layoutPolicy: "open",
    targetViewports: ["1200x820", "390x844"],
    variants: [
      { id: "model-baseline", model: "model-a", reasoning: "high", condition: "baseline", skills: [] },
      { id: "model-design", model: "model-a", reasoning: "high", condition: "design", skills: ["ruthless-designer"] }
    ]
  });
  const directPrepared = JSON.parse((await run(workspaceManager, ["experiment", "--workspace", managedWorkspace, "--spec", "experiments/direct-benchmark.json", "--direct-build"])).stdout);
  assert.equal(directPrepared.status, "build-authorized");
  assert.equal(directPrepared.directBuild, true);
  assert.equal(directPrepared.buildAssignments.length, 2);
  const directRoot = path.join(managedWorkspace, ".scratch", "prototype-lab", "direct-benchmark");
  assert.equal(await exists(path.join(directRoot, "model-baseline", "build-assignment.md")), true);
  assert.equal(await exists(path.join(directRoot, "model-baseline", "build-input-manifest.json")), true);
  assert.equal(await exists(path.join(directRoot, "model-baseline", "build-dispatch.template.json")), true);
  assert.equal(await exists(path.join(directRoot, "model-baseline", "run-receipt.template.json")), true);
  assert.equal(await exists(path.join(directRoot, "preflight-review.template.json")), false);
  const directAssignment = await fs.readFile(path.join(directRoot, "model-baseline", "build-assignment.md"), "utf8");
  assert.match(directAssignment, /exploratory-n1/);
  assert.match(directAssignment, /inspect every finite item/);
  const directReceiptTemplate = JSON.parse(await fs.readFile(path.join(directRoot, "model-baseline", "run-receipt.template.json"), "utf8"));
  assert.equal(directReceiptTemplate.schemaVersion, 2);
  assert.equal(directReceiptTemplate.dispatch.assignmentSha256, directPrepared.buildAssignments[0].sha256);
  const prepared = JSON.parse((await run(workspaceManager, ["experiment", "--workspace", managedWorkspace, "--spec", "experiments/capability-showcase.json"])).stdout);
  assert.equal(prepared.intent, "showcase");
  assert.equal(prepared.variants.length, 2);
  assert.equal(prepared.variants[0].dispatchTemplate, "model-baseline/dispatch.template.json");
  assert.match(prepared.variants[0].inputManifestSha256, /^[a-f0-9]{64}$/);
  const experimentRoot = path.join(managedWorkspace, ".scratch", "prototype-lab", "capability-showcase");
  const experimentManifest = JSON.parse(await fs.readFile(path.join(experimentRoot, "experiment.json"), "utf8"));
  assert.equal(experimentManifest.contextContract.forkTurns, "none");
  assert.equal(experimentManifest.contextContract.coordinatorSkillExposedToWorkers, false);
  assert.match(experimentManifest.variants[0].directionInputManifestSha256, /^[a-f0-9]{64}$/);
  const baselineInputManifestFile = path.join(experimentRoot, "model-baseline", "direction-input-manifest.json");
  assert.equal(await exists(baselineInputManifestFile), true);
  assert.equal(createHash("sha256").update(await fs.readFile(baselineInputManifestFile)).digest("hex"), experimentManifest.variants[0].directionInputManifestSha256);
  assert.equal(await exists(path.join(experimentRoot, "model-baseline", "dispatch.template.json")), true);
  const missingDispatch = JSON.parse((await run(workspaceManager, ["preflight", "--workspace", managedWorkspace, "--experiment", "capability-showcase"])).stdout);
  assert.equal(missingDispatch.issues.some((issue) => issue.code === "missing-dispatch"), true);
  await writeJson(path.join(experimentRoot, "model-baseline", "dispatch.json"), dispatchFixture(experimentManifest, experimentManifest.variants[0], "worker-direction-baseline"));
  await writeJson(path.join(experimentRoot, "model-design", "dispatch.json"), dispatchFixture(experimentManifest, experimentManifest.variants[1], "worker-direction-design"));
  const baselineDirection = directionFixture(experimentManifest.variants[0], false);
  const designDirection = directionFixture(experimentManifest.variants[1], true);
  designDirection.selectedDirection.fingerprint = { ...baselineDirection.selectedDirection.fingerprint };
  await writeJson(path.join(experimentRoot, "model-baseline", "direction.json"), baselineDirection);
  await writeJson(path.join(experimentRoot, "model-design", "direction.json"), designDirection);
  const converged = JSON.parse((await run(workspaceManager, ["preflight", "--workspace", managedWorkspace, "--experiment", "capability-showcase"])).stdout);
  assert.equal(converged.readyForBlindReview, true);
  assert.equal(converged.status, "awaiting-blind-review");
  assert.equal(converged.issues.some((issue) => issue.code === "paired-convergence" && issue.severity === "warning"), true);
  designDirection.selectedDirection.fingerprint = {
    layoutTopology: "editorial",
    primaryInteraction: "composing",
    representation: "raster",
    informationFlow: "progressive",
    register: "editorial",
    density: "balanced",
    motionRole: "navigation",
    assetStrategy: "generated-raster"
  };
  await writeJson(path.join(experimentRoot, "model-design", "direction.json"), designDirection);
  const readyPreflight = JSON.parse((await run(workspaceManager, ["preflight", "--workspace", managedWorkspace, "--experiment", "capability-showcase"])).stdout);
  assert.equal(readyPreflight.readyForBlindReview, true);
  assert.equal(readyPreflight.status, "awaiting-blind-review");
  const review = JSON.parse(await fs.readFile(path.join(experimentRoot, "preflight-review.template.json"), "utf8"));
  review.verdict = "pass";
  review.variantChecks.forEach((check) => { check.specific = true; check.assetPlanValid = true; check.skillEffectVisible = check.variantId === "model-design" ? true : "not-applicable"; check.verdict = "pass"; });
  review.pairChecks.forEach((check) => { check.sameComposition = false; check.sameInteraction = false; check.verdict = "pass"; });
  await writeJson(path.join(experimentRoot, "preflight-review.json"), review);
  const approved = JSON.parse((await run(workspaceManager, ["preflight", "--workspace", managedWorkspace, "--experiment", "capability-showcase", "--review", ".scratch/prototype-lab/capability-showcase/preflight-review.json"])).stdout);
  assert.equal(approved.buildAuthorized, true);
  assert.equal(await exists(path.join(experimentRoot, "model-baseline", "build-assignment.md")), true);
  assert.equal(await exists(path.join(experimentRoot, "model-design", "build-assignment.md")), true);
  const buildInputManifestFile = path.join(experimentRoot, "model-baseline", "build-input-manifest.json");
  assert.equal(await exists(buildInputManifestFile), true);
  assert.match(approved.buildAssignments[0].sha256, /^[a-f0-9]{64}$/);
  assert.equal(createHash("sha256").update(await fs.readFile(buildInputManifestFile)).digest("hex"), approved.buildAssignments[0].inputManifestSha256);

  const rejectedSpec = JSON.parse(await fs.readFile(experimentSpecFile, "utf8"));
  rejectedSpec.id = "review-rejected-showcase";
  rejectedSpec.title = "Review Rejected Showcase";
  rejectedSpec.assetPolicy = { mode: "fixed-supplied", skill: "imagegen", deliverable: "the same shared atlas and hash in every condition" };
  const rejectedSpecFile = path.join(managedWorkspace, "experiments", "review-rejected-showcase.json");
  await writeJson(rejectedSpecFile, rejectedSpec);
  await run(workspaceManager, ["experiment", "--workspace", managedWorkspace, "--spec", "experiments/review-rejected-showcase.json"]);
  const rejectedRoot = path.join(managedWorkspace, ".scratch", "prototype-lab", "review-rejected-showcase");
  const rejectedManifest = JSON.parse(await fs.readFile(path.join(rejectedRoot, "experiment.json"), "utf8"));
  await writeJson(path.join(rejectedRoot, "model-baseline", "dispatch.json"), dispatchFixture(rejectedManifest, rejectedManifest.variants[0], "worker-rejected-baseline"));
  await writeJson(path.join(rejectedRoot, "model-design", "dispatch.json"), dispatchFixture(rejectedManifest, rejectedManifest.variants[1], "worker-rejected-design"));
  const rejectedBaseline = directionFixture(rejectedManifest.variants[0], false);
  const rejectedTreatment = directionFixture(rejectedManifest.variants[1], true);
  rejectedTreatment.selectedDirection.fingerprint = { ...designDirection.selectedDirection.fingerprint };
  for (const card of [rejectedBaseline, rejectedTreatment]) {
    card.selectedDirection.assetPlan.policy = "fixed-supplied";
    card.selectedDirection.assetPlan.willUseRequiredSkill = "not-applicable";
    card.selectedDirection.assetPlan.promptDraft = "not applicable; fixed shared asset";
    card.selectedDirection.fingerprint.assetStrategy = "supplied";
  }
  await writeJson(path.join(rejectedRoot, "model-baseline", "direction.json"), rejectedBaseline);
  await writeJson(path.join(rejectedRoot, "model-design", "direction.json"), rejectedTreatment);
  const rejectedReady = JSON.parse((await run(workspaceManager, ["preflight", "--workspace", managedWorkspace, "--experiment", "review-rejected-showcase"])).stdout);
  assert.equal(rejectedReady.status, "awaiting-blind-review");
  const failedReview = JSON.parse(await fs.readFile(path.join(rejectedRoot, "preflight-review.template.json"), "utf8"));
  failedReview.verdict = "fail";
  failedReview.variantChecks.forEach((check) => { check.specific = true; check.assetPlanValid = true; check.skillEffectVisible = check.variantId === "model-design" ? true : "not-applicable"; check.verdict = "pass"; });
  failedReview.pairChecks.forEach((check) => { check.sameComposition = true; check.sameInteraction = true; check.verdict = "fail"; });
  const failedReviewFile = path.join(rejectedRoot, "failed-review.json");
  await writeJson(failedReviewFile, failedReview);
  const rejected = JSON.parse((await run(workspaceManager, ["preflight", "--workspace", managedWorkspace, "--experiment", "review-rejected-showcase", "--review", ".scratch/prototype-lab/review-rejected-showcase/failed-review.json"])).stdout);
  assert.equal(rejected.status, "review-blocked");
  assert.equal(rejected.buildAuthorized, false);
  assert.equal(await exists(path.join(rejectedRoot, "model-baseline", "build-assignment.md")), false);

  const alpha = JSON.parse((await run(workspaceManager, ["create", "--workspace", managedWorkspace, "--date", "2026-07-11", "--title", "Alpha Board", "--question", "Does the board work?", "--model", "test-alpha", "--condition", "baseline", "--reasoning", "high"])).stdout);
  const beta = JSON.parse((await run(workspaceManager, ["create", "--workspace", managedWorkspace, "--date", "2026-07-11", "--title", "Beta Board", "--question", "Does the board work?", "--model", "test-beta", "--condition", "ruthless", "--skills", "ruthless-designer", "--reasoning", "high"])).stdout);
  assert.equal(alpha.id, "2026/07/001-alpha-board");
  assert.equal(beta.id, "2026/07/002-beta-board");
  assert.equal(await exists(path.join(managedWorkspace, "prototypes", "2026", "07", "001-alpha-board", "artifact-data.js")), true);
  assert.equal((await fs.readFile(path.join(managedWorkspace, "prototypes", "2026", "07", "001-alpha-board", "index.html"), "utf8")).includes("artifact-topbar"), false);
  const alphaMetadataFile = path.join(managedWorkspace, "prototypes", "2026", "07", "001-alpha-board", "metadata.json");
  const betaMetadataFile = path.join(managedWorkspace, "prototypes", "2026", "07", "002-beta-board", "metadata.json");
  const alphaMetadata = JSON.parse(await fs.readFile(alphaMetadataFile, "utf8"));
  const betaMetadata = JSON.parse(await fs.readFile(betaMetadataFile, "utf8"));
  assert.equal(alphaMetadata.scaffold, "blank");
  assert.deepEqual(alphaMetadata.provenance.skills, []);
  assert.deepEqual(alphaMetadata.provenance.orchestrationSkills, ["prototype-lab"]);
  assert.deepEqual(betaMetadata.provenance.skills, ["ruthless-designer"]);
  alphaMetadata.provenance.agentRuns = [{ agentMode: "subagent", agentTool: "agents.spawn_agent", workerId: "worker-alpha", forkTurns: "none", assignmentSha256: "a".repeat(64), inputManifestSha256: "b".repeat(64), receipt: "runs/alpha.json", fallbackReason: "not applicable", receivedOtherVariants: false, contextIsolation: "dispatch-recorded" }];
  betaMetadata.provenance.agentRuns = [{ agentMode: "subagent", agentTool: "agents.spawn_agent", workerId: "worker-beta", forkTurns: "none", assignmentSha256: "c".repeat(64), inputManifestSha256: "d".repeat(64), receipt: "runs/beta.json", fallbackReason: "not applicable", receivedOtherVariants: false, contextIsolation: "dispatch-recorded" }];
  await writeJson(alphaMetadataFile, alphaMetadata);
  await writeJson(betaMetadataFile, betaMetadata);
  const managedHub = JSON.parse((await run(workspaceManager, ["hub", "--workspace", managedWorkspace, "--date", "2026-07-11", "--title", "Board Comparison", "--variants", "001,002", "--dimension", "model", "--criteria", "clarity,feedback,fit"])).stdout);
  assert.equal(managedHub.id, "2026/07/003-board-comparison");
  assert.deepEqual(managedHub.variants, [alpha.id, beta.id]);
  const hubFolder = path.join(managedWorkspace, "prototypes", "2026", "07", "003-board-comparison");
  assert.equal(await exists(path.join(hubFolder, "hub.config.json")), true);
  assert.equal(await exists(path.join(hubFolder, "hub-data.js")), true);
  assert.equal(await exists(path.join(hubFolder, "hub.css")), true);
  const hubConfig = JSON.parse(await fs.readFile(path.join(hubFolder, "hub.config.json"), "utf8"));
  assert.equal(hubConfig.question, "Does the board work?");
  assert.deepEqual(hubConfig.previewViewport, { width: 1200, height: 820 });
  hubConfig.question = "Which board is clearer after review?";
  await writeJson(path.join(hubFolder, "hub.config.json"), hubConfig);
  const synced = JSON.parse((await run(workspaceManager, ["sync", "--workspace", managedWorkspace])).stdout);
  assert.equal(synced.summary.artifacts, 3);
  assert.equal(synced.summary.managedHubs, 1);
  const hubData = await fs.readFile(path.join(hubFolder, "hub-data.js"), "utf8");
  assert.match(hubData, /Which board is clearer after review\?/);
  assert.match(hubData, /ruthless-designer/);
  assert.match(hubData, /worker-alpha/);
  assert.match(hubData, /worker-beta/);
  assert.match(hubData, /"forkTurns": "none"/);
  const syncedHubMetadata = JSON.parse(await fs.readFile(path.join(hubFolder, "metadata.json"), "utf8"));
  assert.deepEqual(syncedHubMetadata.provenance.agentRuns.map((run) => run.workerId), ["worker-alpha", "worker-beta"]);
  assert.equal(syncedHubMetadata.provenance.agentRuns.some((run) => run.agentTool === "not captured"), false);
  const status = JSON.parse((await run(workspaceManager, ["status", "--workspace", managedWorkspace])).stdout);
  assert.deepEqual(status.managedHubs, [managedHub.id]);
  assert.deepEqual(status.legacyHubs, []);
  assert.deepEqual(status.invalidHubs, []);
  assert.equal(await exists(path.join(managedWorkspace, "prototypes", "index.html")), true);
  assert.equal(await exists(path.join(managedWorkspace, "prototypes", "prototype-index-data.js")), true);
  const contaminatedHubMetadata = JSON.parse(await fs.readFile(path.join(hubFolder, "metadata.json"), "utf8"));
  contaminatedHubMetadata.provenance.agentRuns[0].forkTurns = "all";
  await writeJson(path.join(hubFolder, "metadata.json"), contaminatedHubMetadata);
  const contaminatedStatus = JSON.parse((await run(workspaceManager, ["status", "--workspace", managedWorkspace])).stdout);
  assert.equal(contaminatedStatus.issues.some((issue) => issue.id === managedHub.id && issue.code === "unverified-variant-isolation"), true);

  const managedSeed = JSON.parse((await run(promptManager, ["seed", "--workspace", managedWorkspace, "--date", "2026-07-11"])).stdout);
  assert.equal(managedSeed.created.length, 8);
  const gamma = JSON.parse((await run(workspaceManager, ["create", "--workspace", managedWorkspace, "--date", "2026-07-11", "--title", "Gamma Experience", "--question", "Does the prompt stay portable?", "--model", "test-gamma", "--prompt", "institute-of-an-impossible-sense"])).stdout);
  assert.equal(gamma.id, "2026/07/004-gamma-experience");
  const gammaFolder = path.join(managedWorkspace, "prototypes", "2026", "07", "004-gamma-experience");
  const gammaMetadata = JSON.parse(await fs.readFile(path.join(gammaFolder, "metadata.json"), "utf8"));
  assert.equal(gammaMetadata.promptTemplates.length, 1);
  assert.equal(await exists(path.join(gammaFolder, gammaMetadata.promptTemplates[0].template)), true);
  assert.equal(await exists(path.join(gammaFolder, gammaMetadata.promptTemplates[0].variables)), true);
  assert.equal(await exists(path.join(gammaFolder, gammaMetadata.promptTemplates[0].rendered)), true);
  const packedGamma = JSON.parse((await run(workspaceManager, ["pack", "--workspace", managedWorkspace, "--id", gamma.id])).stdout);
  assert.equal(packedGamma.sourceCount, 1);
  assert.equal(packedGamma.promptCount, 1);
  assert.equal(packedGamma.runCount, 0);
  assert.equal(await exists(packedGamma.archive), true);

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

function directionFixture(variant, treated) {
  return {
    schemaVersion: 1,
    variantId: variant.id,
    assignmentSha256: variant.assignmentSha256,
    inputManifestSha256: variant.directionInputManifestSha256,
    status: "proposed",
    execution: {
      effectiveModel: "model-a",
      effectiveModelSource: "runtime-observed",
      contextReads: treated ? ["ruthless-designer/SKILL.md"] : [],
      skillsRead: treated ? ["ruthless-designer"] : []
    },
    fingerprintVocabulary: {},
    selectedDirection: {
      name: treated ? "The Missing Margin" : "Resonance Chamber",
      argument: treated ? "Make the unknown sense legible through editorial absence and discovery." : "Let visitors tune a spatial instrument until a hidden perception becomes visible.",
      compositionFamily: treated ? "asymmetric editorial field" : "single-stage spatial chamber",
      interactionModel: treated ? "compose and reveal" : "directly tune and navigate",
      visualLanguage: treated ? "archival paper, voids, and annotated raster traces" : "luminous field recording with tactile controls",
      signatureMove: treated ? "a missing margin grows into the primary artifact" : "the generated artifact resonates in response to visitor input",
      contentStrategy: treated ? "fragmented institutional records reconstructed by interaction" : "sensory observations accumulated as a live spatial record",
      responsiveStrategy: treated ? "mobile becomes a vertical field notebook" : "mobile reframes the chamber as a focused handheld instrument",
      fingerprint: {
        layoutTopology: "single-stage",
        primaryInteraction: "direct",
        representation: "mixed",
        informationFlow: "spatial",
        register: "cultural",
        density: "focused",
        motionRole: "core",
        assetStrategy: "generated-raster"
      },
      assetPlan: {
        policy: "required",
        willUseRequiredSkill: true,
        skill: "imagegen",
        role: "primary perceptual specimen",
        useCase: "the visitor manipulates and interprets this otherwise impossible visual record",
        promptDraft: "Create an unfamiliar sensory specimen with material depth, no readable text, and a composition made for interaction.",
        integration: "Use the generated raster as the central semantic object and prove it remains visible in both target viewports."
      },
      skillInterventions: treated ? [{
        skill: "ruthless-designer",
        instruction: "Commit to one dominant visual argument and remove generic product-shell conventions.",
        observableEffect: "Asymmetric editorial composition led by negative space instead of a centered dashboard.",
        proofTarget: "Desktop and mobile screenshots show the missing margin controlling hierarchy."
      }] : []
    },
    rejectedDirections: ["generic dashboard", "three-column inspector"],
    primaryRisk: "The metaphor could become opaque without immediate interaction feedback.",
    buildOutline: ["Generate the primary specimen", "Build the defining interaction", "Verify both target viewports"],
    receivedOtherVariants: false
  };
}

function dispatchFixture(experiment, variant, workerId) {
  return {
    schemaVersion: 1,
    experimentId: experiment.id,
    variantId: variant.id,
    stage: "direction",
    workerId,
    agentTool: "agents.spawn_agent",
    forkTurns: "none",
    requestedModel: variant.model,
    reasoning: variant.reasoning,
    variantSkills: variant.skills,
    orchestrationSkillsExposed: [],
    assignmentSha256: variant.assignmentSha256,
    inputManifestSha256: variant.directionInputManifestSha256,
    sentPaths: [`${variant.id}/assignment.md`, `${variant.id}/direction.template.json`, `${variant.id}/direction-input-manifest.json`],
    memoryInputs: [],
    receivedOtherVariants: false
  };
}
