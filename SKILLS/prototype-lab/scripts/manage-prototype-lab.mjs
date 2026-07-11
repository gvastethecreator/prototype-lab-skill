#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { buildPrototypeIndex, collectPrototypeIndex } from "./build-prototype-index.mjs";

const execFileAsync = promisify(execFile);
const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptRoot, "..");
const directionFingerprintEnums = {
  layoutTopology: ["split", "sequential", "spatial", "layered", "single-stage", "editorial", "other"],
  primaryInteraction: ["direct", "linking", "revealing", "composing", "simulating", "navigating", "other"],
  representation: ["raster", "svg", "canvas", "document", "dom", "mixed", "other"],
  informationFlow: ["simultaneous", "progressive", "temporal", "comparative", "spatial", "other"],
  register: ["product", "editorial", "game", "scientific", "cultural", "brand", "hybrid", "other"],
  density: ["focused", "balanced", "dense"],
  motionRole: ["none", "feedback", "navigation", "core"],
  assetStrategy: ["code-native", "generated-raster", "supplied", "mixed", "none"]
};
const [command = "status", ...tokens] = process.argv.slice(2);
const args = parseArgs(tokens);
const workspace = path.resolve(args.workspace || process.cwd());
const prototypesRoot = path.join(workspace, "prototypes");
const commandPrefix = await detectCommandPrefix();

if (["help", "--help", "-h"].includes(command)) {
  console.log(helpText());
} else if (command === "init") {
  await installLibraryHub();
  await runNode(path.join(scriptRoot, "manage-prompt-library.mjs"), [args.empty ? "init" : "seed", "--workspace", workspace]);
  const result = await buildPrototypeIndex({ workspace });
  print({ command, workspace: toPosix(workspace), ...resultSummary(result.payload), next: [labCommand("create --title <title> --question <question>"), labCommand("status")] });
} else if (command === "create") {
  const result = await createPrototype();
  print({ command, ...result, next: [`Open prototypes/${result.id}/index.html`, labCommand("sync")] });
} else if (command === "experiment") {
  print({ command, ...(await prepareExperiment()) });
} else if (command === "preflight") {
  print({ command, ...(await reviewExperimentPreflight()) });
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
  throw new Error("Unknown command. Use init, experiment, preflight, create, hub, sync, status, or pack.");
}

async function prepareExperiment() {
  if (!args.spec || args.spec === true) throw new Error("experiment requires --spec <portable-json-file>");
  const specFile = resolveWorkspaceInput(args.spec, "experiment spec");
  const spec = normalizeExperimentSpec(await readJson(specFile, null));
  const directBuild = Boolean(args["direct-build"]);
  if (directBuild && spec.intent !== "benchmark") throw new Error("--direct-build is allowed only for benchmark experiments; showcases require direction preflight and blind review");
  const root = experimentRoot(spec.id);
  if (await exists(root)) throw new Error(`Experiment already exists: ${toPosix(path.relative(workspace, root))}. Archive it or choose a new id.`);

  const sharedEnvelope = {
    sharedBrief: spec.sharedBrief,
    fixedOutcomes: spec.fixedOutcomes,
    openDecisions: spec.openDecisions,
    assetPolicy: spec.assetPolicy,
    layoutPolicy: spec.layoutPolicy,
    targetViewports: spec.targetViewports
  };
  const sharedBriefSha256 = sha256(JSON.stringify(sharedEnvelope));
  const manifest = {
    ...spec,
    status: directBuild ? "build-authorized" : "awaiting-directions",
    createdAt: new Date().toISOString(),
    sharedBriefSha256,
    contextContract: {
      forkTurns: "none",
      coordinatorSkillExposedToWorkers: false,
      memoryInputsAllowed: false,
      otherVariantsAllowed: false
    },
    variants: []
  };

  await fs.mkdir(root, { recursive: true });
  for (const variant of spec.variants) {
    const variantRoot = path.join(root, variant.id);
    await fs.mkdir(variantRoot, { recursive: true });
    if (directBuild) {
      const buildAssignment = benchmarkBuildAssignmentText(spec, variant, sharedBriefSha256);
      const buildAssignmentSha256 = sha256(buildAssignment);
      const buildInputManifest = benchmarkBuildInputManifest(spec, variant, sharedBriefSha256, buildAssignmentSha256);
      const buildInputManifestSha256 = sha256(jsonText(buildInputManifest));
      const receiptTemplate = benchmarkReceiptTemplate(spec, variant, buildAssignmentSha256, buildInputManifestSha256);
      await fs.writeFile(path.join(variantRoot, "build-assignment.md"), buildAssignment, "utf8");
      await writeJson(path.join(variantRoot, "build-input-manifest.json"), buildInputManifest);
      await writeJson(path.join(variantRoot, "build-dispatch.template.json"), buildDispatchTemplate(spec, variant, buildAssignmentSha256, buildInputManifestSha256));
      await writeJson(path.join(variantRoot, "run-receipt.template.json"), receiptTemplate);
      manifest.variants.push({
        ...variant,
        buildAssignment: `${variant.id}/build-assignment.md`,
        buildAssignmentSha256,
        buildInputManifest: `${variant.id}/build-input-manifest.json`,
        buildInputManifestSha256,
        buildDispatch: `${variant.id}/build-dispatch.json`,
        receiptTemplate: `${variant.id}/run-receipt.template.json`
      });
      continue;
    }
    const assignment = directionAssignment(spec, variant, sharedBriefSha256);
    const assignmentSha256 = sha256(assignment);
    const directionInputManifest = buildDirectionInputManifest(spec, variant, sharedBriefSha256, assignmentSha256);
    const directionInputManifestSha256 = sha256(jsonText(directionInputManifest));
    await fs.writeFile(path.join(variantRoot, "assignment.md"), assignment, "utf8");
    await writeJson(path.join(variantRoot, "direction-input-manifest.json"), directionInputManifest);
    await writeJson(path.join(variantRoot, "dispatch.template.json"), dispatchTemplate(spec, variant, assignmentSha256, directionInputManifestSha256));
    await writeJson(path.join(variantRoot, "direction.template.json"), directionTemplate(spec, variant, assignmentSha256, directionInputManifestSha256));
    manifest.variants.push({
      ...variant,
      assignment: `${variant.id}/assignment.md`,
      assignmentSha256,
      directionInputManifest: `${variant.id}/direction-input-manifest.json`,
      directionInputManifestSha256,
      dispatch: `${variant.id}/dispatch.json`,
      direction: `${variant.id}/direction.json`,
      buildAssignment: `${variant.id}/build-assignment.md`,
      buildInputManifest: `${variant.id}/build-input-manifest.json`
    });
  }
  await writeJson(path.join(root, "experiment.json"), manifest);
  if (!directBuild) await writeJson(path.join(root, "preflight-review.template.json"), reviewTemplate(spec));
  if (directBuild) {
    return {
      id: spec.id,
      intent: spec.intent,
      status: manifest.status,
      directBuild: true,
      folder: toPosix(path.relative(workspace, root)),
      sharedBriefSha256,
      buildAssignments: manifest.variants.map((variant) => ({
        id: variant.id,
        model: variant.model,
        reasoning: variant.reasoning,
        skills: variant.skills,
        path: variant.buildAssignment,
        sha256: variant.buildAssignmentSha256,
        inputManifest: variant.buildInputManifest,
        inputManifestSha256: variant.buildInputManifestSha256,
        dispatchTemplate: `${variant.id}/build-dispatch.template.json`,
        dispatch: variant.buildDispatch,
        receiptTemplate: variant.receiptTemplate
      })),
      next: ["Create one artifact owner per variant, then dispatch fresh workers with fork_turns none using only their build packet and output folder."]
    };
  }
  return {
    id: spec.id,
    intent: spec.intent,
    folder: toPosix(path.relative(workspace, root)),
    sharedBriefSha256,
    variants: manifest.variants.map((variant) => ({
      id: variant.id,
      model: variant.model,
      reasoning: variant.reasoning,
      skills: variant.skills,
      assignment: variant.assignment,
      directionTemplate: `${variant.id}/direction.template.json`,
      inputManifest: variant.directionInputManifest,
      inputManifestSha256: variant.directionInputManifestSha256,
      dispatchTemplate: `${variant.id}/dispatch.template.json`,
      dispatch: variant.dispatch,
      direction: variant.direction
    })),
    next: ["Dispatch each variant with fork_turns none and fill its dispatch.json", labCommand(`preflight --experiment ${spec.id}`)]
  };
}

async function reviewExperimentPreflight() {
  if (!args.experiment || args.experiment === true) throw new Error("preflight requires --experiment <id>");
  const root = experimentRoot(args.experiment);
  const manifestFile = path.join(root, "experiment.json");
  const manifest = await readJson(manifestFile, null);
  if (!manifest) throw new Error(`Experiment not found: ${args.experiment}`);
  const cards = new Map();
  const issues = [];
  for (const variant of manifest.variants || []) {
    const dispatchFile = path.join(root, variant.id, "dispatch.json");
    const dispatch = await readJson(dispatchFile, null);
    if (!dispatch) issues.push({ variantId: variant.id, code: "missing-dispatch", message: `Copy dispatch.template.json to ${toPosix(path.relative(workspace, dispatchFile))} and record the coordinator dispatch` });
    else issues.push(...validateDirectionDispatch(manifest, variant, dispatch));
    const file = path.join(root, variant.id, "direction.json");
    const card = await readJson(file, null);
    if (!card) {
      issues.push({ variantId: variant.id, code: "missing-direction", message: `Write ${toPosix(path.relative(workspace, file))}` });
      continue;
    }
    variant.directionSha256 = sha256(await fs.readFile(file));
    cards.set(variant.id, card);
    issues.push(...validateDirectionCard(manifest, variant, card));
  }
  issues.push(...directionDivergenceIssues(manifest, cards));
  const blockingIssues = issues.filter((issue) => issue.severity !== "warning");

  if (!args.review) {
    const allDirectionsPresent = cards.size === manifest.variants.length;
    const mechanicallyReady = blockingIssues.length === 0 && allDirectionsPresent;
    const reviewBlocked = manifest.status === "review-blocked";
    const readyForBlindReview = mechanicallyReady && !reviewBlocked;
    if (!["build-authorized", "review-blocked"].includes(manifest.status)) {
      manifest.status = readyForBlindReview ? "awaiting-blind-review" : allDirectionsPresent ? "preflight-blocked" : "awaiting-directions";
      manifest.preflightCheckedAt = new Date().toISOString();
      await writeJson(manifestFile, manifest);
    }
    return {
      id: manifest.id,
      status: manifest.status,
      directions: cards.size,
      expectedDirections: manifest.variants.length,
      readyForBlindReview,
      buildAuthorized: manifest.status === "build-authorized",
      pairMetrics: directionPairMetrics(manifest, cards),
      issues,
      reviewTemplate: toPosix(path.relative(workspace, path.join(root, "preflight-review.template.json")))
    };
  }

  if (blockingIssues.length) throw new Error(`Preflight cannot be approved:\n${blockingIssues.map((issue) => `- ${issue.variantId || "experiment"}: ${issue.message}`).join("\n")}`);
  const reviewFile = args.review === true ? path.join(root, "preflight-review.json") : resolveWorkspaceInput(args.review, "preflight review");
  const review = await readJson(reviewFile, null);
  if (review?.verdict === "fail") {
    const rejectionIssues = validateFailedPreflightReview(manifest, review);
    if (rejectionIssues.length) throw new Error(`Invalid failed preflight review:\n${rejectionIssues.map((issue) => `- ${issue}`).join("\n")}`);
    manifest.status = "review-blocked";
    manifest.reviewedAt = new Date().toISOString();
    manifest.review = "preflight-review.json";
    await writeJson(path.join(root, "preflight-review.json"), review);
    await writeJson(manifestFile, manifest);
    return {
      id: manifest.id,
      status: manifest.status,
      buildAuthorized: false,
      directions: cards.size,
      review: toPosix(path.relative(workspace, path.join(root, "preflight-review.json"))),
      next: ["Invalidate this showcase prompt version or resample the complete affected matrix; do not selectively coach one worker."]
    };
  }
  const reviewIssues = validatePreflightReview(manifest, review, cards);
  if (reviewIssues.length) throw new Error(`Invalid preflight review:\n${reviewIssues.map((issue) => `- ${issue}`).join("\n")}`);

  for (const variant of manifest.variants) {
    const card = cards.get(variant.id);
    const buildAssignment = buildAssignmentText(manifest, variant, card);
    await fs.writeFile(path.join(root, variant.id, "build-assignment.md"), buildAssignment, "utf8");
    variant.buildAssignmentSha256 = sha256(buildAssignment);
    const buildInputManifest = buildStageInputManifest(manifest, variant, card);
    await writeJson(path.join(root, variant.id, "build-input-manifest.json"), buildInputManifest);
    variant.buildInputManifestSha256 = sha256(jsonText(buildInputManifest));
  }
  manifest.status = "build-authorized";
  manifest.reviewedAt = new Date().toISOString();
  manifest.review = "preflight-review.json";
  await writeJson(path.join(root, "preflight-review.json"), review);
  await writeJson(manifestFile, manifest);
  return {
    id: manifest.id,
    status: manifest.status,
    buildAuthorized: true,
    directions: cards.size,
    review: toPosix(path.relative(workspace, path.join(root, "preflight-review.json"))),
    buildAssignments: manifest.variants.map((variant) => ({
      id: variant.id,
      path: variant.buildAssignment,
      sha256: variant.buildAssignmentSha256,
      inputManifest: variant.buildInputManifest,
      inputManifestSha256: variant.buildInputManifestSha256
    }))
  };
}

function normalizeExperimentSpec(value) {
  if (!value || typeof value !== "object") throw new Error("Experiment spec must be a JSON object");
  const id = String(value.id || "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error("Experiment id must be lowercase hyphenated text");
  const intent = value.intent || "benchmark";
  if (!["benchmark", "showcase"].includes(intent)) throw new Error("Experiment intent must be benchmark or showcase");
  for (const key of ["title", "question", "sharedBrief"]) if (!value[key] || typeof value[key] !== "string") throw new Error(`Experiment requires ${key}`);
  const fixedOutcomes = stringArray(value.fixedOutcomes, "fixedOutcomes", 1);
  const openDecisions = stringArray(value.openDecisions, "openDecisions", intent === "showcase" ? 6 : 1);
  const targetViewports = stringArray(value.targetViewports, "targetViewports", 1);
  if (intent === "showcase" && fixedOutcomes.length > 5) throw new Error("Showcase experiments may declare at most five fixedOutcomes; move implementation choices into openDecisions");
  if (intent === "showcase" && wordCount(value.sharedBrief) > 320) throw new Error("Showcase sharedBrief must stay at or below 320 words");
  const solutionCues = findSolutionCues([value.sharedBrief, ...fixedOutcomes].join(" "));
  if (intent === "showcase" && solutionCues.length > 2) throw new Error(`Showcase brief contains too many solution cues: ${solutionCues.join(", ")}`);
  const layoutPolicy = value.layoutPolicy || "open";
  if (!["open", "page-scroll", "app-shell", "immersive-stage"].includes(layoutPolicy)) throw new Error("layoutPolicy must be open, page-scroll, app-shell, or immersive-stage");
  const assetPolicy = normalizeExperimentAssetPolicy(value.assetPolicy);
  if (!Array.isArray(value.variants) || value.variants.length < 2) throw new Error("Experiment requires at least two variants");
  const seen = new Set();
  const variants = value.variants.map((variant, index) => {
    if (!variant || typeof variant !== "object") throw new Error(`variants[${index}] must be an object`);
    const variantId = String(variant.id || "");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(variantId) || seen.has(variantId)) throw new Error(`Invalid or duplicate variant id: ${variantId}`);
    seen.add(variantId);
    for (const key of ["model", "reasoning", "condition"]) if (!variant[key] || typeof variant[key] !== "string") throw new Error(`${variantId} requires ${key}`);
    const skills = Array.isArray(variant.skills) ? unique(variant.skills.map((skill) => String(skill).trim())) : [];
    if (variant.condition === "baseline" && skills.length) throw new Error(`${variantId} baseline condition must not expose variant skills`);
    return { id: variantId, model: variant.model, reasoning: variant.reasoning, condition: variant.condition, skills, slot: Number(variant.slot) || 1 };
  });
  return {
    schemaVersion: 1,
    id,
    title: value.title,
    intent,
    question: value.question,
    sharedBrief: value.sharedBrief.trim(),
    fixedOutcomes,
    openDecisions,
    assetPolicy,
    layoutPolicy,
    targetViewports,
    canonicalFixtures: Array.isArray(value.canonicalFixtures) ? unique(value.canonicalFixtures.map((item) => String(item).trim())) : [],
    variants
  };
}

function normalizeExperimentAssetPolicy(value) {
  const policy = value && typeof value === "object" ? value : { mode: "worker-choice" };
  if (!["required", "fixed-supplied", "allowed", "forbidden", "worker-choice"].includes(policy.mode)) throw new Error("assetPolicy.mode must be required, fixed-supplied, allowed, forbidden, or worker-choice");
  if (["required", "fixed-supplied"].includes(policy.mode) && (!policy.skill || !policy.deliverable)) throw new Error(`${policy.mode} asset policy needs skill and deliverable`);
  return { mode: policy.mode, ...(policy.skill ? { skill: String(policy.skill) } : {}), ...(policy.deliverable ? { deliverable: String(policy.deliverable) } : {}) };
}

function benchmarkBuildAssignmentText(spec, variant, sharedBriefSha256) {
  const skillText = variant.skills.length
    ? `Read and faithfully apply only these variant skills: ${variant.skills.join(", ")}. Record their exact ids and every skill/reference path actually read.`
    : "Baseline condition: do not consult any design, creative, UI, or target-treatment skill.";
  const assetText = spec.assetPolicy.mode === "required"
    ? `Generate and materially consume ${spec.assetPolicy.deliverable} with ${spec.assetPolicy.skill}.`
    : spec.assetPolicy.mode === "fixed-supplied"
      ? `Materially consume the fixed shared ${spec.assetPolicy.skill} outputs without replacing or regenerating them: ${spec.assetPolicy.deliverable}.`
      : `Asset policy: ${spec.assetPolicy.mode}.`;
  return `# ${spec.title} — direct benchmark build\n\nThis is an \`exploratory-n1\` benchmark, not a forced-diversity showcase. Natural convergence is a result. Build this variant independently in a fresh worker with \`fork_turns: "none"\`; do not read Prototype Lab, workspace memory, another variant, rankings, or prior attempts.\n\n## Shared brief\n\n${spec.sharedBrief}\n\n## Fixed outcomes\n\n${bullets(spec.fixedOutcomes)}\n\n## Open decisions\n\n${bullets(spec.openDecisions)}\n\n## Variant\n\n- id: ${variant.id}\n- requested model: ${variant.model}\n- reasoning: ${variant.reasoning}\n- condition: ${variant.condition}\n- ${skillText}\n- shared brief SHA-256: ${sharedBriefSha256}\n\n## Build contract\n\n- ${assetText}\n- For every supplied/generated raster set, record its source grid or item count and inspect every finite item at its rendered crop. Prove correct mapping, aspect ratio, no stretching/neighbor bleed/subject loss, and one narrow-viewport fixture. A default-item screenshot is not asset proof.\n- Reject error-named captures, a blocked harness assessment, or any unresolved runtime P0/P1; successful clicks do not overrule failed visual proof.\n- Follow layout policy ${spec.layoutPolicy}; horizontal overflow is invalid.\n- Support ${spec.targetViewports.join(", ")}.\n- Keep runtime files, assets, prompt copy, receipt, and proof project-local and portable.\n- Every visible control must work; preserve keyboard focus and reduced-motion behavior where applicable.\n- Fill the supplied \`run-receipt.template.json\` instead of inventing a receipt schema. Register it in metadata.runs as an object with id, variantId, promptId, receipt, and status.\n- Return a canonical v2 run receipt with exact assignment/input hashes, requested/effective model evidence, skill/reference reads, asset hashes and consumption, asset visual review, output hashes, browser proof, usage when visible, and limitations.\n`;
}

function benchmarkBuildInputManifest(spec, variant, sharedBriefSha256, buildAssignmentSha256) {
  return {
    schemaVersion: 1,
    experimentId: spec.id,
    variantId: variant.id,
    stage: "build",
    intent: "benchmark",
    claimScope: "exploratory-n1",
    sharedBriefSha256,
    buildAssignmentSha256,
    requestedModel: variant.model,
    reasoning: variant.reasoning,
    condition: variant.condition,
    variantSkills: variant.skills,
    orchestrationSkillsExposed: [],
    assetPolicy: spec.assetPolicy,
    assetReviewContract: {
      requiredStatus: "passed",
      completeFiniteSet: true,
      checks: ["semantic mapping", "cell/item aspect ratio", "no stretching", "no neighboring-cell bleed", "no unintended subject loss", "narrow viewport"],
      rejectEvidence: ["error-named capture", "runtime P0/P1", "blocked harness assessment"]
    },
    layoutPolicy: spec.layoutPolicy,
    targetViewports: spec.targetViewports,
    canonicalFixtures: spec.canonicalFixtures
  };
}

function buildDispatchTemplate(spec, variant, assignmentSha256, inputManifestSha256) {
  return {
    schemaVersion: 1,
    experimentId: spec.id,
    variantId: variant.id,
    stage: "build",
    workerId: "",
    agentTool: "",
    forkTurns: "none",
    requestedModel: variant.model,
    reasoning: variant.reasoning,
    variantSkills: variant.skills,
    orchestrationSkillsExposed: [],
    assignmentSha256,
    inputManifestSha256,
    sentPaths: [`${variant.id}/build-assignment.md`, `${variant.id}/build-input-manifest.json`, `${variant.id}/run-receipt.template.json`],
    memoryInputs: [],
    receivedOtherVariants: false
  };
}

function benchmarkReceiptTemplate(spec, variant, assignmentSha256, inputManifestSha256) {
  return {
    schemaVersion: 2,
    experimentId: spec.id,
    conditionId: variant.condition,
    stage: "build",
    slot: 1,
    attempt: 1,
    runId: `${spec.id}-${variant.id}-run-1`,
    status: "planned",
    variantId: variant.id,
    prompt: {
      libraryId: "REQUIRED-library-id-or-not-applicable",
      libraryVersion: null,
      templateId: "REQUIRED-prompt-id",
      templateVersion: 1,
      templatePath: "REQUIRED-relative-template-path",
      variablesPath: "REQUIRED-relative-variables-path",
      renderedPath: "REQUIRED-relative-rendered-path",
      renderedSha256: "REQUIRED-rendered-sha256"
    },
    dispatch: {
      workerId: "REQUIRED-worker-id",
      agentTool: "REQUIRED-agent-tool",
      forkTurns: "none",
      assignmentSha256,
      inputManifestSha256
    },
    execution: {
      requestedModel: variant.model,
      effectiveModel: "not captured",
      effectiveModelSource: "not-captured",
      reasoning: variant.reasoning,
      serviceTier: "not captured",
      variantSkills: variant.skills,
      orchestrationSkillsExposed: []
    },
    context: {
      memoryInputs: [],
      contextReads: [],
      receivedOtherVariants: false,
      crossVariantLeakage: "self-reported-false"
    },
    assetPolicy: spec.assetPolicy,
    assets: [],
    artifacts: { scratchOutputPath: "not applicable", finalPrototypePath: "REQUIRED-relative-prototype-path", files: [] },
    verification: [],
    usage: { inputTokens: null, outputTokens: null, totalTokens: null, toolCalls: [] },
    summary: "REQUIRED-run-summary",
    limitations: [],
    fallbackReason: "not applicable"
  };
}

function directionAssignment(spec, variant, sharedBriefSha256) {
  const skillText = variant.skills.length
    ? `Read and faithfully apply only these variant skills: ${variant.skills.join(", ")}. Record each instruction that should create an observable result. In execution.skillsRead use these canonical ids exactly; put the actual SKILL.md/reference file paths in execution.contextReads.`
    : "Baseline condition: do not consult any design, creative, UI, or target-treatment skill. Keep execution.skillsRead empty and put any ordinary file reads in execution.contextReads.";
  const assetText = spec.assetPolicy.mode === "required"
    ? `Plan mandatory generation with ${spec.assetPolicy.skill}: ${spec.assetPolicy.deliverable}. Do not generate it during preflight.`
    : spec.assetPolicy.mode === "fixed-supplied"
      ? `Plan material use of the fixed shared ${spec.assetPolicy.skill} outputs: ${spec.assetPolicy.deliverable}. Inspect them, but do not replace or regenerate them.`
      : `Asset policy: ${spec.assetPolicy.mode}.`;
  return `# ${spec.title} — direction preflight\n\nStage 1 only. Do not write HTML, CSS, JavaScript, or final assets. Return one direction card at \`direction.json\` by copying the supplied template. The coordinator separately records \`dispatch.json\`; do not edit it.\n\n## Shared brief\n\n${spec.sharedBrief}\n\n## Fixed outcomes\n\n${bullets(spec.fixedOutcomes)}\n\n## Open decisions you own\n\n${bullets(spec.openDecisions)}\n\n## Shared execution envelope\n\n- Layout policy: ${spec.layoutPolicy}.\n- Target viewports: ${spec.targetViewports.join(", ")}.\n- ${assetText}\n- Shared brief SHA-256: ${sharedBriefSha256}.\n- Prototype Lab is coordinator-only. Do not read its skill, UI baseline, taste calibration, workspace memory, or another variant.\n- You received no other variant. Do not optimize toward a presumed winner.\n\n## Variant condition\n\n- id: ${variant.id}\n- requested model: ${variant.model}\n- reasoning: ${variant.reasoning}\n- condition: ${variant.condition}\n- ${skillText}\n\n## Fingerprint vocabulary\n\nUse exactly one supplied enum value per axis; do not invent descriptive phrases inside \`fingerprint\`. Put nuance in the surrounding direction fields.\n\n${fingerprintVocabularyText()}\n\nThe direction must be specific enough to build, but it must not include code. Record effective model visibility and every skill/reference read factually in \`execution\`.\n`;
}

function buildDirectionInputManifest(spec, variant, sharedBriefSha256, assignmentSha256) {
  return {
    schemaVersion: 1,
    experimentId: spec.id,
    variantId: variant.id,
    stage: "direction",
    sharedBriefSha256,
    assignmentSha256,
    requestedModel: variant.model,
    reasoning: variant.reasoning,
    condition: variant.condition,
    variantSkills: variant.skills,
    orchestrationSkillsExposed: [],
    assetPolicy: spec.assetPolicy,
    layoutPolicy: spec.layoutPolicy,
    targetViewports: spec.targetViewports
  };
}

function dispatchTemplate(spec, variant, assignmentSha256, inputManifestSha256) {
  return {
    schemaVersion: 1,
    experimentId: spec.id,
    variantId: variant.id,
    stage: "direction",
    workerId: "",
    agentTool: "",
    forkTurns: "none",
    requestedModel: variant.model,
    reasoning: variant.reasoning,
    variantSkills: variant.skills,
    orchestrationSkillsExposed: [],
    assignmentSha256,
    inputManifestSha256,
    sentPaths: [`${variant.id}/assignment.md`, `${variant.id}/direction.template.json`, `${variant.id}/direction-input-manifest.json`],
    memoryInputs: [],
    receivedOtherVariants: false
  };
}

function directionTemplate(spec, variant, assignmentSha256, inputManifestSha256) {
  return {
    schemaVersion: 1,
    variantId: variant.id,
    assignmentSha256,
    inputManifestSha256,
    status: "proposed",
    execution: {
      effectiveModel: "not captured",
      effectiveModelSource: "not-captured",
      contextReads: [],
      skillsRead: []
    },
    fingerprintVocabulary: directionFingerprintEnums,
    selectedDirection: {
      name: "",
      argument: "",
      compositionFamily: "",
      interactionModel: "",
      visualLanguage: "",
      signatureMove: "",
      contentStrategy: "",
      responsiveStrategy: "",
      fingerprint: {
        layoutTopology: "",
        primaryInteraction: "",
        representation: "",
        informationFlow: "",
        register: "",
        density: "",
        motionRole: "",
        assetStrategy: ""
      },
      assetPlan: {
        policy: spec.assetPolicy.mode,
        willUseRequiredSkill: spec.assetPolicy.mode === "required" ? null : "not-applicable",
        skill: spec.assetPolicy.skill || "not-assigned",
        role: "",
        useCase: "",
        promptDraft: "",
        integration: ""
      },
      skillInterventions: variant.skills.map((skill) => ({ skill, instruction: "", observableEffect: "", proofTarget: "" }))
    },
    rejectedDirections: [],
    primaryRisk: "",
    buildOutline: [],
    receivedOtherVariants: false
  };
}

function reviewTemplate(spec) {
  return {
    schemaVersion: 1,
    experimentId: spec.id,
    verdict: "pending",
    reviewMode: "blind-direction",
    variantChecks: spec.variants.map((variant) => ({ variantId: variant.id, specific: null, assetPlanValid: null, skillEffectVisible: variant.skills.length ? null : "not-applicable", verdict: "pending", notes: "" })),
    pairChecks: expectedComparisonPairs(spec).map(([left, right]) => ({ left, right, sameComposition: null, sameInteraction: null, verdict: "pending", notes: "" })),
    notes: ""
  };
}

function validateDirectionCard(manifest, variant, card) {
  const issues = [];
  const selected = card?.selectedDirection;
  if (card.variantId !== variant.id) issues.push(directionIssue(variant.id, "variant-mismatch", "direction variantId does not match its folder"));
  if (card.assignmentSha256 !== variant.assignmentSha256) issues.push(directionIssue(variant.id, "assignment-hash", "direction assignmentSha256 does not match the coordinator packet"));
  if (card.inputManifestSha256 !== variant.directionInputManifestSha256) issues.push(directionIssue(variant.id, "input-manifest-hash", "direction inputManifestSha256 does not match the coordinator packet"));
  if (card.receivedOtherVariants !== false) issues.push(directionIssue(variant.id, "isolation", "receivedOtherVariants must be false"));
  if (!card.execution || typeof card.execution.effectiveModel !== "string" || !["runtime-observed", "not-captured"].includes(card.execution.effectiveModelSource) || !Array.isArray(card.execution.contextReads) || !Array.isArray(card.execution.skillsRead)) issues.push(directionIssue(variant.id, "execution-provenance", "execution requires effectiveModel, effectiveModelSource, contextReads, and skillsRead"));
  if (card.execution?.effectiveModelSource === "not-captured" && card.execution.effectiveModel !== "not captured") issues.push(directionIssue(variant.id, "execution-provenance", "use effectiveModel 'not captured' when runtime identity was not observed"));
  if (card.execution?.effectiveModelSource === "runtime-observed" && card.execution.effectiveModel === "not captured") issues.push(directionIssue(variant.id, "execution-provenance", "runtime-observed effectiveModel needs the observed route"));
  if (variant.skills.some((skill) => !card.execution?.skillsRead?.includes(skill))) issues.push(directionIssue(variant.id, "skill-read", "execution.skillsRead must include every assigned variant skill"));
  for (const key of ["name", "argument", "compositionFamily", "interactionModel", "visualLanguage", "signatureMove", "contentStrategy", "responsiveStrategy"]) {
    if (!selected?.[key] || typeof selected[key] !== "string") issues.push(directionIssue(variant.id, "missing-direction-field", `selectedDirection.${key} is required`));
  }
  const fingerprint = selected?.fingerprint || {};
  for (const [key, values] of Object.entries(directionFingerprintEnums)) if (!values.includes(fingerprint[key])) issues.push(directionIssue(variant.id, "invalid-fingerprint", `fingerprint.${key} must be one of ${values.join(", ")}`));
  if (manifest.assetPolicy.mode === "required") {
    const plan = selected?.assetPlan || {};
    if (plan.policy !== "required" || plan.willUseRequiredSkill !== true || plan.skill !== manifest.assetPolicy.skill) issues.push(directionIssue(variant.id, "required-asset", `asset plan must commit to ${manifest.assetPolicy.skill}`));
    for (const key of ["role", "useCase", "promptDraft", "integration"]) if (!plan[key] || typeof plan[key] !== "string") issues.push(directionIssue(variant.id, "required-asset", `assetPlan.${key} is required`));
    if (!["generated-raster", "mixed"].includes(fingerprint.assetStrategy)) issues.push(directionIssue(variant.id, "required-asset", "fingerprint.assetStrategy must be generated-raster or mixed"));
  }
  if (manifest.assetPolicy.mode === "fixed-supplied") {
    const plan = selected?.assetPlan || {};
    if (plan.policy !== "fixed-supplied" || plan.willUseRequiredSkill !== "not-applicable" || plan.skill !== manifest.assetPolicy.skill) issues.push(directionIssue(variant.id, "fixed-asset", `asset plan must consume the fixed ${manifest.assetPolicy.skill} outputs without regeneration`));
    for (const key of ["role", "useCase", "integration"]) if (!plan[key] || typeof plan[key] !== "string") issues.push(directionIssue(variant.id, "fixed-asset", `assetPlan.${key} is required`));
    if (!["supplied", "mixed"].includes(fingerprint.assetStrategy)) issues.push(directionIssue(variant.id, "fixed-asset", "fingerprint.assetStrategy must be supplied or mixed"));
  }
  const interventions = Array.isArray(selected?.skillInterventions) ? selected.skillInterventions : [];
  for (const skill of variant.skills) {
    const intervention = interventions.find((item) => item?.skill === skill);
    if (!intervention || !intervention.instruction || !intervention.observableEffect || !intervention.proofTarget) issues.push(directionIssue(variant.id, "skill-no-effect", `record instruction, observableEffect, and proofTarget for ${skill}`));
  }
  if (!Array.isArray(card.buildOutline) || card.buildOutline.length < 1) issues.push(directionIssue(variant.id, "missing-build-outline", "buildOutline must contain at least one step"));
  return issues;
}

function validateDirectionDispatch(manifest, variant, dispatch) {
  const issues = [];
  const fail = (message) => issues.push(directionIssue(variant.id, "dispatch-provenance", message));
  if (dispatch.experimentId !== manifest.id || dispatch.variantId !== variant.id || dispatch.stage !== "direction") fail("dispatch experiment/variant/stage does not match");
  if (!dispatch.workerId || !dispatch.agentTool || dispatch.forkTurns !== "none") fail("dispatch requires workerId, agentTool, and forkTurns none");
  if (dispatch.requestedModel !== variant.model || dispatch.reasoning !== variant.reasoning) fail("dispatch model/reasoning does not match the condition");
  if (JSON.stringify(dispatch.variantSkills || []) !== JSON.stringify(variant.skills || [])) fail("dispatch variantSkills does not match the condition");
  if (!Array.isArray(dispatch.orchestrationSkillsExposed) || dispatch.orchestrationSkillsExposed.length) fail("dispatch must not expose coordinator skills");
  if (dispatch.assignmentSha256 !== variant.assignmentSha256 || dispatch.inputManifestSha256 !== variant.directionInputManifestSha256) fail("dispatch assignment/input hashes do not match");
  if (!Array.isArray(dispatch.sentPaths) || dispatch.sentPaths.length < 3 || dispatch.sentPaths.some((item) => typeof item !== "string" || item.includes(".."))) fail("dispatch sentPaths is incomplete or unsafe");
  if ((dispatch.sentPaths || []).some((item) => manifest.variants.some((other) => other.id !== variant.id && item.includes(`${other.id}/`)))) fail("dispatch sentPaths exposes another variant");
  if (!Array.isArray(dispatch.memoryInputs) || dispatch.memoryInputs.length) fail("dispatch memoryInputs must be an empty array");
  if (dispatch.receivedOtherVariants !== false) fail("dispatch must record receivedOtherVariants false");
  return issues;
}

function directionDivergenceIssues(manifest, cards) {
  if (manifest.intent !== "showcase" || cards.size !== manifest.variants.length) return [];
  const issues = [];
  for (const [left, right] of expectedComparisonPairs(manifest)) {
    const distance = fingerprintDistance(cards.get(left), cards.get(right));
    if (distance < 2) issues.push(directionIssue(`${left} ↔ ${right}`, "paired-convergence", `direction fingerprints differ on only ${distance} axis; blind semantic review must decide whether the pair is materially distinct`, "warning"));
  }
  const signatures = new Map();
  for (const [variantId, card] of cards) {
    const fp = card.selectedDirection.fingerprint;
    const key = `${fp.layoutTopology}|${fp.register}|${fp.assetStrategy}`;
    const group = signatures.get(key) || [];
    group.push(variantId);
    signatures.set(key, group);
  }
  const threshold = Math.ceil(manifest.variants.length * 0.75);
  for (const [signature, group] of signatures) if (group.length >= threshold) issues.push(directionIssue("experiment", "matrix-convergence", `${group.length}/${manifest.variants.length} directions share ${signature}; treat this as a blind-review risk, not an automatic verdict`, "warning"));
  return issues;
}

function validatePreflightReview(manifest, review) {
  const issues = [];
  if (!review || typeof review !== "object") return ["review must be a JSON object"];
  if (review.experimentId !== manifest.id) issues.push("experimentId does not match");
  if (review.verdict !== "pass") issues.push("verdict must be pass to authorize builds");
  if (manifest.intent === "showcase" && review.reviewMode !== "blind-direction") issues.push("showcase reviewMode must be blind-direction");
  const checks = new Map((review.variantChecks || []).map((check) => [check.variantId, check]));
  for (const variant of manifest.variants) {
    const check = checks.get(variant.id);
    if (!check || check.verdict !== "pass" || check.specific !== true) issues.push(`${variant.id} needs a passing, specific variant check`);
    if (["required", "fixed-supplied"].includes(manifest.assetPolicy.mode) && check?.assetPlanValid !== true) issues.push(`${variant.id} assetPlanValid must be true`);
    if (manifest.intent === "showcase" && variant.skills.length && check?.skillEffectVisible !== true) issues.push(`${variant.id} skillEffectVisible must be true`);
  }
  const pairChecks = review.pairChecks || [];
  for (const [left, right] of expectedComparisonPairs(manifest)) {
    const check = pairChecks.find((item) => (item.left === left && item.right === right) || (item.left === right && item.right === left));
    if (!check || check.verdict !== "pass") issues.push(`${left} ↔ ${right} needs a passing pair check`);
    if (manifest.intent === "showcase" && check?.sameComposition === true && check?.sameInteraction === true) issues.push(`${left} ↔ ${right} still shares composition and interaction`);
  }
  return issues;
}

function validateFailedPreflightReview(manifest, review) {
  const issues = [];
  if (!review || typeof review !== "object") return ["review must be a JSON object"];
  if (review.experimentId !== manifest.id) issues.push("experimentId does not match");
  if (manifest.intent === "showcase" && review.reviewMode !== "blind-direction") issues.push("showcase reviewMode must be blind-direction");
  const checks = new Map((review.variantChecks || []).map((check) => [check.variantId, check]));
  for (const variant of manifest.variants) {
    const check = checks.get(variant.id);
    if (!check || !["pass", "fail"].includes(check.verdict) || typeof check.specific !== "boolean") issues.push(`${variant.id} needs a completed blind variant check`);
  }
  let pairFailure = false;
  for (const [left, right] of expectedComparisonPairs(manifest)) {
    const check = (review.pairChecks || []).find((item) => (item.left === left && item.right === right) || (item.left === right && item.right === left));
    if (!check || !["pass", "fail"].includes(check.verdict)) issues.push(`${left} ↔ ${right} needs a completed pair check`);
    if (check?.verdict === "fail" && (check.sameComposition === true || check.sameInteraction === true)) pairFailure = true;
  }
  if (!pairFailure && !(review.variantChecks || []).some((check) => check.verdict === "fail")) issues.push("failed review needs a concrete variant or pair failure");
  return issues;
}

function buildAssignmentText(manifest, variant, card) {
  const assetText = manifest.assetPolicy.mode === "required"
    ? `Use ${manifest.assetPolicy.skill} before completing the build. Save the final asset inside the prototype, consume it visibly, and record its prompt, relative path, SHA-256, dimensions, and proof.`
    : manifest.assetPolicy.mode === "fixed-supplied"
      ? `Use the fixed shared ${manifest.assetPolicy.skill} outputs exactly as supplied. Copy them into the prototype, consume them visibly, preserve their SHA-256 values, and do not replace or regenerate them.`
      : `Asset policy: ${manifest.assetPolicy.mode}.`;
  return `# ${manifest.title} — authorized build\n\nBuild only this variant in a fresh isolated worker with \`fork_turns: \"none\"\`. Do not read workspace memory, Prototype Lab design guidance, another variant, or review rankings.\n\n## Shared brief\n\n${manifest.sharedBrief}\n\n## Fixed outcomes\n\n${bullets(manifest.fixedOutcomes)}\n\n## Approved direction\n\n\`\`\`json\n${JSON.stringify(card.selectedDirection, null, 2)}\n\`\`\`\n\n## Variant\n\n- id: ${variant.id}\n- requested model: ${variant.model}\n- reasoning: ${variant.reasoning}\n- condition: ${variant.condition}\n- variant skills: ${variant.skills.join(", ") || "none"}\n- shared brief SHA-256: ${manifest.sharedBriefSha256}\n- direction assignment SHA-256: ${variant.assignmentSha256}\n\n## Build contract\n\n- ${assetText}\n- Keep runtime files and assets local and portable.\n- Follow layout policy ${manifest.layoutPolicy}; page scrolling is valid unless this policy forbids it.\n- Support the approved direction at ${manifest.targetViewports.join(", ")}.\n- Add only states required by the experience. Every visible control must work.\n- Preserve the selected direction. Do not normalize it toward a lab shell.\n- Return a canonical run receipt with worker id, requested/effective model when visible, reasoning, fork mode, assignment hash, skill/reference reads, memory inputs, asset manifest, output hashes, proof, and limitations.\n`;
}

function buildStageInputManifest(manifest, variant, card) {
  return {
    schemaVersion: 1,
    experimentId: manifest.id,
    variantId: variant.id,
    stage: "build",
    sharedBriefSha256: manifest.sharedBriefSha256,
    directionSha256: variant.directionSha256,
    buildAssignmentSha256: variant.buildAssignmentSha256,
    requestedModel: variant.model,
    reasoning: variant.reasoning,
    condition: variant.condition,
    variantSkills: variant.skills,
    orchestrationSkillsExposed: [],
    assetPolicy: manifest.assetPolicy,
    layoutPolicy: manifest.layoutPolicy,
    targetViewports: manifest.targetViewports,
    selectedDirectionFingerprint: card.selectedDirection.fingerprint
  };
}

function expectedComparisonPairs(spec) {
  const pairs = [];
  const seen = new Set();
  const add = (left, right) => {
    if (!left || !right || left === right) return;
    const ordered = [left, right].sort();
    const key = ordered.join("::");
    if (!seen.has(key)) { seen.add(key); pairs.push(ordered); }
  };
  for (const model of unique((spec.variants || []).map((variant) => variant.model))) {
    const group = spec.variants.filter((variant) => variant.model === model);
    const baselines = group.filter((variant) => !variant.skills?.length);
    const treatments = group.filter((variant) => variant.skills?.length);
    for (const baseline of baselines) for (const treatment of treatments) add(baseline.id, treatment.id);
  }
  const signatures = new Map();
  for (const variant of spec.variants || []) {
    const key = `${variant.condition}|${[...(variant.skills || [])].sort().join("+")}`;
    const group = signatures.get(key) || [];
    group.push(variant);
    signatures.set(key, group);
  }
  for (const group of signatures.values()) {
    for (let left = 0; left < group.length; left += 1) {
      for (let right = left + 1; right < group.length; right += 1) if (group[left].model !== group[right].model) add(group[left].id, group[right].id);
    }
  }
  if (!pairs.length && spec.variants?.length === 2) add(spec.variants[0].id, spec.variants[1].id);
  return pairs;
}

function fingerprintDistance(left, right) {
  const a = left?.selectedDirection?.fingerprint || {};
  const b = right?.selectedDirection?.fingerprint || {};
  return ["layoutTopology", "primaryInteraction", "representation", "informationFlow", "register", "density", "motionRole", "assetStrategy"].filter((key) => a[key] !== b[key]).length;
}

function directionPairMetrics(manifest, cards) {
  return expectedComparisonPairs(manifest)
    .filter(([left, right]) => cards.has(left) && cards.has(right))
    .map(([left, right]) => ({ left, right, fingerprintDistance: fingerprintDistance(cards.get(left), cards.get(right)) }));
}

function fingerprintVocabularyText() {
  return Object.entries(directionFingerprintEnums)
    .map(([axis, values]) => `- \`${axis}\`: ${values.map((value) => `\`${value}\``).join(" | ")}`)
    .join("\n");
}

function directionIssue(variantId, code, message, severity = "error") { return { variantId, code, severity, message }; }
function bullets(values) { return values.map((value) => `- ${value}`).join("\n"); }
function wordCount(value) { return String(value || "").trim().split(/\s+/).filter(Boolean).length; }
function findSolutionCues(value) {
  const cues = [
    "sidebar", "panel", "card", "dashboard", "button", "dropdown", "left", "right", "column", "grid", "toolbar", "modal", "drawer", "hero", "carousel", "timeline",
    "rotate", "zoom", "measure", "pin", "annotation", "slider", "reset", "undo", "submit", "tab", "toggle", "inspector", "hotspot", "confidence bar", "progress bar",
    "barra lateral", "tarjeta", "tablero", "boton", "desplegable", "izquierda", "derecha", "columna", "grilla", "cuadricula", "barra de herramientas", "cajon", "carrusel", "cronologia",
    "rotar", "girar", "medir", "marcador", "anotacion", "deslizador", "reiniciar", "deshacer", "enviar", "pestana", "alternar", "punto activo"
  ];
  const text = String(value || "").toLowerCase();
  return cues.filter((cue) => new RegExp(`\\b${cue}s?\\b`, "i").test(text));
}
function stringArray(value, label, minimum) {
  if (!Array.isArray(value)) throw new Error(`Experiment ${label} must be an array`);
  const output = unique(value.map((item) => String(item).trim()).filter(Boolean));
  if (output.length < minimum) throw new Error(`Experiment ${label} requires at least ${minimum} distinct values`);
  return output;
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

  const scaffold = args.scaffold || "blank";
  if (!['blank', 'tool'].includes(scaffold)) throw new Error("create --scaffold must be blank or tool");
  const scaffoldRoot = path.join(skillRoot, "assets", scaffold === "tool" ? "prototype-shell" : "prototype-blank");
  const variantSkills = splitList(args.skills);
  await fs.mkdir(folder, { recursive: true });
  for (const file of ["index.html", "styles.css", "app.js", "artifact-data.js"]) {
    await fs.copyFile(path.join(scaffoldRoot, file), path.join(folder, file));
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
    scaffold,
    condition: args.condition || "unassigned",
    model: args.model || "unknown",
    modelExact: args.model || "unknown",
    tags: unique(["browser-ui", ...(splitList(args.tags))]),
    question,
    sourcePrompt: prompt?.challenge || "Not attached yet.",
    promptTemplates: prompt ? [prompt.record] : [],
    runs: [],
    details: `Standalone ${scaffold} prototype owner managed by prototype-lab.`,
    views: ["prototype"],
    variants: [],
    proof: [],
    runtimeLayout: scaffold === "tool" ? "split" : "open",
    provenance: {
      skills: variantSkills,
      variantSkills,
      orchestrationSkills: ["prototype-lab"],
      models: [args.model || "unknown"],
      reasoning: args.reasoning || "unknown",
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
    condition: metadata.condition,
    skills: variantSkills,
    prompt: prompt ? `${prompt.id}@v${String(prompt.record.version).padStart(3, "0")}` : "not attached"
  };
  await fs.writeFile(path.join(folder, "artifact-data.js"), `window.PROTOTYPE_ARTIFACT_DATA = ${JSON.stringify(artifactData, null, 2)};\n`, "utf8");
  await writeJson(path.join(folder, "metadata.json"), metadata);
  await fs.writeFile(path.join(folder, "README.md"), prototypeReadme(metadata, prompt), "utf8");
  return { id, folder: toPosix(path.relative(workspace, folder)), prompt: prompt?.id || null, scaffold, condition: metadata.condition, skills: variantSkills };
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
    previewViewport: previous.previewViewport || { width: 1200, height: 820 },
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
    const sourceRun = metadata.provenance?.agentRuns?.[0] || metadata.variants?.[0] || {};
    const variantSkills = Array.isArray(metadata.provenance?.variantSkills) ? metadata.provenance.variantSkills : entry.skills;
    variants.push({
      id: override.id || metadata.slug || prototypeId.split("/").at(-1).replace(/^\d+-/, ""),
      prototypeId,
      title: override.title || entry.title,
      path: toPosix(path.relative(folder, path.join(folderFromId(prototypeId), "index.html"))),
      model: entry.modelExact || entry.model,
      reasoning: metadata.provenance?.reasoning || sourceRun.reasoning || "unknown",
      condition: override.condition || metadata.condition || (variantSkills.length ? variantSkills.join(" + ") : "baseline"),
      skills: variantSkills,
      status: entry.status,
      question: entry.question,
      proof: entry.proof,
      hypothesis: override.hypothesis || metadata.variants?.[0]?.hypothesis || "Review this variant against the shared criteria.",
      tradeoff: override.tradeoff || metadata.variants?.[0]?.tradeoff || "Not recorded.",
      tags: entry.tags,
      run: {
        agentMode: sourceRun.agentMode || "not captured",
        agentTool: sourceRun.agentTool || "not captured",
        workerId: sourceRun.workerId || "not captured",
        forkTurns: sourceRun.forkTurns || "not captured",
        assignmentSha256: sourceRun.assignmentSha256 || "not captured",
        inputManifestSha256: sourceRun.inputManifestSha256 || "not captured",
        receipt: sourceRun.receipt || sourceRun.workerReceipt || "not captured",
        fallbackReason: sourceRun.fallbackReason || "not captured",
        receivedOtherVariants: sourceRun.receivedOtherVariants ?? "unknown",
        contextIsolation: sourceRun.contextIsolation || "self-reported"
      }
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
    previewViewport: config.previewViewport || { width: 1200, height: 820 },
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
    previewViewport: config.previewViewport || { width: 1200, height: 820 },
    variantStrategy: `one standalone artifact per ${config.dimension || "prototype"} variant`,
    linkedPrototypes: variants.map((variant) => variant.path),
    variants: variants.map((variant) => ({
      id: variant.id,
      indexId: variant.prototypeId,
      title: variant.title,
      model: variant.model,
      reasoning: variant.reasoning,
      condition: variant.condition,
      skill: variant.skills.length ? variant.skills.join(" + ") : "baseline",
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
        model: variant.model,
        reasoning: variant.reasoning,
        condition: variant.condition,
        skills: variant.skills,
        ...variant.run
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
      experiment: labCommand("experiment --spec <portable-json-file>"),
      preflight: labCommand("preflight --experiment <id> [--review <json>]"),
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
  for (const [key, suffix] of [["template", "template.md"], ["variables", "vars.json"], ["rendered", "rendered.md"]]) {
    if (!prompt[key]) throw new Error(`Prompt catalog entry is missing ${key}: ${requested}`);
    const source = path.join(prototypesRoot, "prompts", ...prompt[key].split("/"));
    const target = path.join(folder, "prompts", `${prompt.id}.${suffix}`);
    await fs.copyFile(source, target);
  }
  return {
    id: prompt.id,
    challenge: prompt.challenge,
    record: {
      id: prompt.id,
      version: prompt.currentVersion,
      template: `prompts/${prompt.id}.template.md`,
      variables: `prompts/${prompt.id}.vars.json`,
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
function helpText() {
  return `Prototype Lab workspace manager\n\nCommands:\n  init [--empty]                         install the workspace and prompt library\n  experiment --spec <json>               prepare showcase direction packets\n  experiment --spec <json> --direct-build\n                                         authorize benchmark build packets directly\n  preflight --experiment <id>            validate dispatches and directions\n  preflight --experiment <id> --review <json>\n                                         authorize hashed build packets after blind review\n  create --title <title> --question <q>  allocate one standalone artifact\n  hub --title <title> --variants <ids>   create a managed comparison hub\n  sync                                   regenerate hubs and workspace health\n  status                                 inspect artifacts, provenance, and issues\n  pack --id <id>                         create a portable folder and ZIP\n\nCommon option: --workspace <path>`;
}
function labCommand(value) { return `${commandPrefix} ${value}`; }
function folderFromId(id) { return path.join(prototypesRoot, ...id.split("/")); }
function experimentRoot(id) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(id || ""))) throw new Error(`Unsafe experiment id: ${id}`);
  return path.join(workspace, ".scratch", "prototype-lab", String(id));
}
function resolveWorkspaceInput(value, label) {
  if (!value || typeof value !== "string") throw new Error(`${label} must be a file path`);
  const file = path.resolve(workspace, value);
  if (!isWithin(workspace, file)) throw new Error(`${label} must stay inside the workspace`);
  return file;
}
function sequenceFromId(id) { return Number(id.match(/\/(\d+)-/)?.[1]) || 0; }
function slugify(value) { const slug = String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); if (!slug) throw new Error("Could not derive a slug"); return slug; }
function splitList(value) { return typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : []; }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function isWithin(root, target) { const relative = path.relative(root, target); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); }
function today() { return new Date().toISOString().slice(0, 10); }
function toPosix(value) { return value.replaceAll("\\", "/"); }
function print(value) { console.log(JSON.stringify(value, null, 2)); }
async function exists(file) { return Boolean(await fs.stat(file).catch(() => null)); }
async function readJson(file, fallback) { try { return JSON.parse(await fs.readFile(file, "utf8")); } catch (error) { if (error.code === "ENOENT") return fallback; throw error; } }
function jsonText(value) { return `${JSON.stringify(value, null, 2)}\n`; }
async function writeJson(file, value) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, jsonText(value), "utf8"); }
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
