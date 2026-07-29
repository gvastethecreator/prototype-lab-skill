#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildPrototypeIndex, collectPrototypeIndex } from "./build-prototype-index.mjs";
import { verifyPrototype } from "./verify-prototype-lab.mjs";
import { codexFreshWorkerIsolation, freshWorkerCapability, isolationAdapterLabel, validatedFreshWorkerIsolation } from "./worker-isolation.mjs";

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
const artifactDataStart = "/* prototype-lab:artifact-data:start */";
const artifactDataEnd = "/* prototype-lab:artifact-data:end */";
const [command = "status", ...rawTokens] = process.argv.slice(2);
const tokens = [...rawTokens];
const nestedCommand = ["prompt", "help"].includes(command) && tokens[0] && !tokens[0].startsWith("--") ? tokens.shift() : null;
const args = parseArgs(tokens);
const workspace = path.resolve(args.workspace || process.cwd());
const prototypesRoot = path.join(workspace, "prototypes");
const commandPrefix = await detectCommandPrefix();

if (["help", "--help", "-h"].includes(command) || args.help) {
  console.log(commandHelp(command === "help" ? nestedCommand : command));
} else if (command === "init") {
  await installLibraryHub();
  await runNode(path.join(scriptRoot, "manage-prompt-library.mjs"), [args.empty ? "init" : "seed", "--workspace", workspace]);
  const result = await buildPrototypeIndex({ workspace });
  print({ command, workspace: toPosix(workspace), ...resultSummary(result.payload), next: [labCommand("create --title <title> --question <question>"), labCommand("status")] });
} else if (command === "quick") {
  if (!args.title) throw new Error("quick requires --title <title>");
  await installLibraryHub();
  await runNode(path.join(scriptRoot, "manage-prompt-library.mjs"), ["init", "--workspace", workspace]);
  const result = await createPrototype({ ...args, profile: args.profile || "blank", quick: true });
  await buildPrototypeIndex({ workspace });
  print({ command, ...result, next: [`Build in prototypes/${result.id}/`, labCommand(`verify --id ${result.id} --profile quick`), labCommand("sync")] });
} else if (command === "create") {
  const result = await createPrototype();
  print({ command, ...result, next: [`Open prototypes/${result.id}/index.html`, labCommand("sync")] });
} else if (command === "experiment") {
  print({ command, ...(args.init ? await initializeExperimentSpec() : await prepareExperiment()) });
} else if (command === "preflight") {
  print({ command, ...(await reviewExperimentPreflight()) });
} else if (["hub", "compare"].includes(command)) {
  const result = await createOrUpdateHub();
  await installLibraryHub();
  await buildPrototypeIndex({ workspace });
  print({ command, ...result, next: [`Open prototypes/${result.id}/index.html`, `Edit hub.config.json, then run ${labCommand("sync")}`] });
} else if (command === "sync") {
  const result = await syncWorkspace();
  print({ command, ...result });
} else if (command === "prompt") {
  await managePromptCommand(nestedCommand || "list");
} else if (command === "doctor") {
  print(await doctorWorkspace());
} else if (command === "adopt") {
  print({ command, ...(await adoptPrototype()) });
} else if (command === "fork") {
  print({ command, ...(await forkPrototype()) });
} else if (command === "materialize") {
  print({ command, ...(await materializeExperiment()) });
} else if (command === "record") {
  print({ command, ...(await recordPrototype()) });
} else if (command === "attach-proof") {
  print({ command, ...(await attachProof()) });
} else if (command === "review") {
  print({ command, ...(await reviewHub()) });
} else if (command === "verify") {
  print({ command, ...(await verifyPrototype({ workspace, id: args.id, profile: args.profile || "quick", initReview: Boolean(args["init-review"]), write: Boolean(args.write) })) });
} else if (command === "finalize") {
  print({ command, ...(await finalizePrototype()) });
} else if (command === "open") {
  print({ command, ...(await openPrototype()) });
} else if (command === "preview") {
  const result = await previewPrototype();
  if (result) print({ command, ...result });
} else if (command === "ship") {
  print({ command, ...(await shipPrototype()) });
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
  throw new Error("Unknown command. Run `lab help` to see quick, compare, experiment, ship, and workspace commands.");
}

async function initializeExperimentSpec() {
  const id = slugify(args.id || args.title || "prototype-experiment");
  const intent = args.intent || "showcase";
  if (!["benchmark", "showcase"].includes(intent)) throw new Error("experiment --init --intent must be benchmark or showcase");
  const output = path.join(workspace, "experiments", `${id}.json`);
  if (await exists(output)) throw new Error(`Experiment spec already exists: ${toPosix(path.relative(workspace, output))}`);
  let prompt = null;
  if (args["from-prompt"]) {
    const catalog = await readJson(path.join(prototypesRoot, "prompts", "catalog.json"), null);
    prompt = catalog?.prompts?.find((item) => item.id === args["from-prompt"]);
    if (!prompt) throw new Error(`Prompt not found in library: ${args["from-prompt"]}`);
  }
  const models = splitList(args.models).length ? splitList(args.models) : ["model-a", "model-b"];
  const testedSkill = args.skill ? String(args.skill) : null;
  const reasoning = args.reasoning || "high";
  const variants = [];
  for (const model of models) {
    const modelId = slugify(model);
    variants.push({ id: `${modelId}-baseline`, model, reasoning, condition: "baseline", skills: [], workUnit: id });
    if (testedSkill) variants.push({ id: `${modelId}-${slugify(testedSkill)}`, model, reasoning, condition: testedSkill, skills: [testedSkill], workUnit: id, activationContract: defaultSkillActivationContract(testedSkill) });
  }
  if (variants.length < 2) throw new Error("experiment --init needs at least two --models or one --skill treatment");
  const spec = {
    schemaVersion: 1,
    id,
    title: args.title || prompt?.title || id.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
    intent,
    question: args.question || `What changes across the ${testedSkill ? "skill" : "model"} conditions?`,
    sharedBrief: args.brief || prompt?.challenge || "Create a portable browser experience that makes the requested user outcome observable.",
    fixedOutcomes: prompt?.fixedOutcomes || prompt?.requiredBehaviors?.slice(0, 3) || ["The primary outcome is observable", "The main interaction can be exercised"],
    openDecisions: prompt?.openDecisions || ["premise", "content strategy", "information architecture", "composition", "interaction model", "visual language", "responsive structure"],
    assetPolicy: prompt?.assetPolicy || { mode: args["asset-policy"] || "worker-choice" },
    layoutPolicy: args["layout-policy"] || prompt?.layoutPolicy || "open",
    targetViewports: splitList(args.viewports).length ? splitList(args.viewports) : prompt?.targetViewports || ["1200x820", "390x844"],
    variants
  };
  normalizeExperimentSpec(spec);
  await writeJson(output, spec);
  return { id, intent, spec: toPosix(path.relative(workspace, output)), variants: variants.map((variant) => variant.id), sourcePrompt: prompt?.id || null, next: [`Review ${toPosix(path.relative(workspace, output))}`, labCommand(`experiment --spec ${toPosix(path.relative(workspace, output))}${intent === "benchmark" ? " --direct-build" : ""}`)] };
}

async function prepareExperiment() {
  if (!args.spec || args.spec === true) throw new Error("experiment requires --spec <portable-json-file>");
  const specFile = resolveWorkspaceInput(args.spec, "experiment spec");
  const spec = normalizeExperimentSpec(await readJson(specFile, null));
  const directBuild = Boolean(args["direct-build"]);
  if (directBuild && spec.intent !== "benchmark") throw new Error("--direct-build is allowed only for benchmark experiments; showcases require direction preflight and blind review");
  if (directBuild) validateDirectBuildContracts(spec);
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
      capability: freshWorkerCapability,
      defaultAdapter: "codex-fork-turns-none",
      requiredHistoryBoundary: "no-inherited-history",
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
        next: ["Create one artifact owner per variant, then dispatch fresh workers with no inherited history using only their build packet and output folder. Record the selected host adapter in build-dispatch.json."]
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
    next: ["Dispatch each variant in a fresh worker with no inherited history and fill its dispatch.json with the host adapter evidence.", labCommand(`preflight --experiment ${spec.id}`)]
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
    await writeJson(
      path.join(root, variant.id, "build-dispatch.template.json"),
      buildDispatchTemplate(manifest, variant, variant.buildAssignmentSha256, variant.buildInputManifestSha256)
    );
    await writeJson(
      path.join(root, variant.id, "run-receipt.template.json"),
      benchmarkReceiptTemplate(manifest, variant, variant.buildAssignmentSha256, variant.buildInputManifestSha256)
    );
    variant.buildDispatch = `${variant.id}/build-dispatch.json`;
    variant.receiptTemplate = `${variant.id}/run-receipt.template.json`;
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
      inputManifestSha256: variant.buildInputManifestSha256,
      dispatchTemplate: `${variant.id}/build-dispatch.template.json`,
      dispatch: variant.buildDispatch,
      receiptTemplate: variant.receiptTemplate
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
    const variantLayoutPolicy = variant.layoutPolicy || layoutPolicy;
    if (!["open", "page-scroll", "app-shell", "immersive-stage"].includes(variantLayoutPolicy)) throw new Error(`${variantId} layoutPolicy must be open, page-scroll, app-shell, or immersive-stage`);
    const variantTargetViewports = variant.targetViewports ? stringArray(variant.targetViewports, `${variantId} targetViewports`, 1) : targetViewports;
    return {
      id: variantId,
      model: variant.model,
      reasoning: variant.reasoning,
      condition: variant.condition,
      skills,
      slot: Number(variant.slot) || 1,
      workUnit: String(variant.workUnit || "").trim(),
      sourceFixture: variant.sourceFixture ? String(variant.sourceFixture).trim() : null,
      verificationScript: variant.verificationScript ? String(variant.verificationScript).trim() : null,
      layoutPolicy: variantLayoutPolicy,
      targetViewports: variantTargetViewports,
      activationContract: normalizeActivationContract(variant.activationContract, skills, variantId)
    };
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

function normalizeActivationContract(value, skills, variantId) {
  if (!skills.length) {
    if (value) throw new Error(`${variantId} baseline condition must not declare activationContract`);
    return null;
  }
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error(`${variantId} activationContract must be an object`);
  const interventions = Array.isArray(value.interventions) ? value.interventions.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`${variantId} activationContract.interventions[${index}] must be an object`);
    const normalized = {};
    for (const key of ["skill", "instruction", "observableEffect", "proofTarget"]) {
      normalized[key] = String(item[key] || "").trim();
      if (!normalized[key]) throw new Error(`${variantId} activationContract.interventions[${index}].${key} is required`);
    }
    return normalized;
  }) : [];
  const requiredArtifacts = stringArray(value.requiredArtifacts, `${variantId} activationContract.requiredArtifacts`, 1);
  return { interventions, requiredArtifacts };
}

function validateDirectBuildContracts(spec) {
  for (const variant of spec.variants) {
    if (!variant.workUnit) throw new Error(`${variant.id} direct-build requires one explicit workUnit; split unrelated surfaces into isolated variants`);
    if (!variant.skills.length) continue;
    if (!variant.activationContract) throw new Error(`${variant.id} direct-build skill treatment requires activationContract; reading a skill is not proof that it changed the artifact`);
    for (const skill of variant.skills) {
      if (!variant.activationContract.interventions.some((item) => item.skill === skill)) throw new Error(`${variant.id} activationContract needs an intervention for ${skill}`);
    }
  }
}

function defaultSkillActivationContract(skill) {
  const normalized = String(skill);
  const shared = {
    skill: normalized,
    instruction: "Apply the skill as a fail-closed execution contract for this one work unit, including its inspect, build, prove, and iterate loop.",
    observableEffect: "The final artifact and evidence visibly reflect the skill-specific decisions rather than merely listing the skill as read.",
    proofTarget: "A same-state before/after comparison, DPR 2 detail evidence, and a completed finish ledger with no applicable failures."
  };
  if (normalized === "improve-ui") {
    return { interventions: [shared], requiredArtifacts: ["context-card.json", "finish-ledger.json", "proof/before.png", "proof/after.png", "proof/detail.png"] };
  }
  if (normalized === "ruthless-designer") {
    return { interventions: [shared], requiredArtifacts: ["context-card.json", "direction-cards.json", "kill-list.json", "finish-ledger.json", "proof/before.png", "proof/after.png", "proof/detail.png"] };
  }
  return { interventions: [shared], requiredArtifacts: ["skill-activation.json", "finish-ledger.json", "proof/browser-review.json"] };
}

function normalizeExperimentAssetPolicy(value) {
  const policy = value && typeof value === "object" ? value : { mode: "worker-choice" };
  if (!["required", "fixed-supplied", "allowed", "forbidden", "worker-choice"].includes(policy.mode)) throw new Error("assetPolicy.mode must be required, fixed-supplied, allowed, forbidden, or worker-choice");
  if (["required", "fixed-supplied"].includes(policy.mode) && (!policy.skill || !policy.deliverable)) throw new Error(`${policy.mode} asset policy needs skill and deliverable`);
  const files = Array.isArray(policy.files) ? policy.files.map((item, index) => {
    if (!item || typeof item !== "object" || !String(item.path || "").trim() || !/^[a-f0-9]{64}$/i.test(String(item.sha256 || ""))) throw new Error(`assetPolicy.files[${index}] requires path and SHA-256`);
    return { path: String(item.path).trim(), sha256: String(item.sha256).toLowerCase() };
  }) : [];
  if (policy.mode === "fixed-supplied" && !files.length) throw new Error("fixed-supplied asset policy requires files[] with path and SHA-256");
  return { mode: policy.mode, ...(policy.skill ? { skill: String(policy.skill) } : {}), ...(policy.deliverable ? { deliverable: String(policy.deliverable) } : {}), ...(files.length ? { files } : {}) };
}

function benchmarkBuildAssignmentText(spec, variant, sharedBriefSha256) {
  const skillText = variant.skills.length
    ? `Read and faithfully apply only these variant skills: ${variant.skills.join(", ")}. They are fail-closed execution contracts, not optional reading. Record their exact ids and every skill/reference path actually read.`
    : "Baseline condition: do not consult any design, creative, UI, or target-treatment skill.";
  const assetText = spec.assetPolicy.mode === "required"
    ? `Generate and materially consume ${spec.assetPolicy.deliverable} with ${spec.assetPolicy.skill}.`
    : spec.assetPolicy.mode === "fixed-supplied"
      ? `Materially consume the fixed shared ${spec.assetPolicy.skill} outputs without replacing or regenerating them: ${spec.assetPolicy.deliverable}. Verify these exact inputs: ${spec.assetPolicy.files.map((item) => `${item.path} (${item.sha256})`).join(", ")}.`
      : `Asset policy: ${spec.assetPolicy.mode}.`;
  const activationText = variant.activationContract
    ? `\n## Skill activation contract\n\nStopping after reading the skill is a failed run. Produce every named effect and artifact, then prove it. If any item is missing, record \`skill-unverified\` and do not claim completion.\n\n${variant.activationContract.interventions.map((item) => `- ${item.skill}: ${item.instruction}\n  - observable effect: ${item.observableEffect}\n  - proof target: ${item.proofTarget}`).join("\n")}\n\nRequired artifacts:\n${bullets(variant.activationContract.requiredArtifacts)}\n`
    : "";
  return `# ${spec.title} — direct benchmark build\n\nThis is an \`exploratory-n1\` benchmark, not a forced-diversity showcase. Natural convergence is a result. Build this variant independently in a fresh worker with no inherited history; do not read Prototype Lab, workspace memory, another variant, rankings, or prior attempts. Use one supported host adapter: Codex records \`fork_turns: "none"\` as \`codex-fork-turns-none\`; a dedicated CLI records \`dedicated-cli-clean-session\` with a fresh packet-only process.\n\n## Isolated work unit\n\n- work unit: ${variant.workUnit}\n- source fixture: ${variant.sourceFixture || "not supplied"}\n- verification script: ${variant.verificationScript || "not supplied"}\n- Build only this primary surface. Do not batch unrelated product archetypes into this run.\n\n## Shared brief\n\n${spec.sharedBrief}\n\n## Fixed outcomes\n\n${bullets(spec.fixedOutcomes)}\n\n## Open decisions\n\n${bullets(spec.openDecisions)}\n\n## Variant\n\n- id: ${variant.id}\n- requested model: ${variant.model}\n- reasoning: ${variant.reasoning}\n- condition: ${variant.condition}\n- ${skillText}\n- shared brief SHA-256: ${sharedBriefSha256}\n${activationText}\n## Build contract\n\n- ${assetText}\n- The build worker owns the capture-review-correction loop. Coordinator screenshots do not replace builder-owned proof.\n- For every supplied/generated raster set, record its source grid or item count and inspect every finite item at its rendered crop. Prove correct mapping, aspect ratio, no stretching/neighbor bleed/subject loss, and one narrow-viewport fixture. A default-item screenshot is not asset proof.\n- Reject error-named captures, a blocked harness assessment, or any unresolved runtime P0/P1; successful clicks do not overrule failed visual proof.\n- Follow layout policy ${variant.layoutPolicy}; horizontal overflow is invalid.\n- Support ${variant.targetViewports.join(", ")}.\n- Keep runtime files, assets, prompt copy, receipt, and proof project-local and portable.\n- Every visible control and navigation target must work; preserve keyboard focus and reduced-motion behavior where applicable.\n- Fill the supplied \`run-receipt.template.json\` instead of inventing a receipt schema. Register it in metadata.runs as an object with id, variantId, promptId, receipt, and status.\n- Return a canonical v3 run receipt with exact assignment/input hashes, fresh-worker adapter evidence, requested/effective model evidence, skill/reference reads, asset hashes and consumption, asset visual review, output hashes, browser proof, usage when visible, and limitations.\n`;
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
    workUnit: variant.workUnit,
    sourceFixture: variant.sourceFixture,
    verificationScript: variant.verificationScript,
    activationContract: variant.activationContract,
    orchestrationSkillsExposed: [],
    assetPolicy: spec.assetPolicy,
    assetReviewContract: {
      requiredStatus: "passed",
      completeFiniteSet: true,
      checks: ["semantic mapping", "cell/item aspect ratio", "no stretching", "no neighboring-cell bleed", "no unintended subject loss", "narrow viewport"],
      rejectEvidence: ["error-named capture", "runtime P0/P1", "blocked harness assessment"]
    },
    layoutPolicy: variant.layoutPolicy,
    targetViewports: variant.targetViewports,
    canonicalFixtures: variant.sourceFixture ? [variant.sourceFixture] : spec.canonicalFixtures
  };
}

function buildDispatchTemplate(spec, variant, assignmentSha256, inputManifestSha256) {
  return {
    schemaVersion: 2,
    experimentId: spec.id,
    variantId: variant.id,
    stage: "build",
    workerId: "",
    agentTool: "",
    isolation: codexFreshWorkerIsolation(),
    forkTurns: "none",
    requestedModel: variant.model,
    reasoning: variant.reasoning,
    variantSkills: variant.skills,
    orchestrationSkillsExposed: [],
    assignmentSha256,
    inputManifestSha256,
    sentPaths: [`${variant.id}/build-assignment.md`, `${variant.id}/build-input-manifest.json`, `${variant.id}/run-receipt.template.json`, ...[variant.sourceFixture, variant.verificationScript].filter(Boolean)],
    memoryInputs: [],
    receivedOtherVariants: false
  };
}

function benchmarkReceiptTemplate(spec, variant, assignmentSha256, inputManifestSha256) {
  return {
    schemaVersion: 3,
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
      isolation: codexFreshWorkerIsolation(),
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
    skillActivation: variant.activationContract ? {
      status: "planned",
      interventions: variant.activationContract.interventions.map((item) => ({ ...item, evidence: [] })),
      requiredArtifacts: variant.activationContract.requiredArtifacts.map((artifact) => ({ artifact, status: "planned" }))
    } : { status: "not-applicable", interventions: [], requiredArtifacts: [] },
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
  return `# ${spec.title} — direction preflight\n\nStage 1 only. Do not write HTML, CSS, JavaScript, or final assets. Return one direction card at \`direction.json\` by copying the supplied template. The coordinator separately records \`dispatch.json\`; do not edit it.\n\n## Shared brief\n\n${spec.sharedBrief}\n\n## Fixed outcomes\n\n${bullets(spec.fixedOutcomes)}\n\n## Open decisions you own\n\n${bullets(spec.openDecisions)}\n\n## Shared execution envelope\n\n- Layout policy: ${variant.layoutPolicy}.\n- Target viewports: ${variant.targetViewports.join(", ")}.\n- ${assetText}\n- Shared brief SHA-256: ${sharedBriefSha256}.\n- You are a fresh worker with no inherited history. The coordinator records a host adapter separately: Codex uses \`codex-fork-turns-none\`; a packet-only dedicated CLI uses \`dedicated-cli-clean-session\`.\n- Prototype Lab is coordinator-only. Do not read its skill, UI baseline, taste calibration, workspace memory, or another variant.\n- You received no other variant. Do not optimize toward a presumed winner.\n\n## Variant condition\n\n- id: ${variant.id}\n- requested model: ${variant.model}\n- reasoning: ${variant.reasoning}\n- condition: ${variant.condition}\n- ${skillText}\n\n## Fingerprint vocabulary\n\nUse exactly one supplied enum value per axis; do not invent descriptive phrases inside \`fingerprint\`. Put nuance in the surrounding direction fields.\n\n${fingerprintVocabularyText()}\n\nThe direction must be specific enough to build, but it must not include code. Record effective model visibility and every skill/reference read factually in \`execution\`.\n`;
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
    layoutPolicy: variant.layoutPolicy,
    targetViewports: variant.targetViewports
  };
}

function dispatchTemplate(spec, variant, assignmentSha256, inputManifestSha256) {
  return {
    schemaVersion: 2,
    experimentId: spec.id,
    variantId: variant.id,
    stage: "direction",
    workerId: "",
    agentTool: "",
    isolation: codexFreshWorkerIsolation(),
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
  if (!dispatch.workerId || !dispatch.agentTool) fail("dispatch requires workerId and agentTool");
  for (const issue of validatedFreshWorkerIsolation(dispatch.isolation, { forkTurns: dispatch.forkTurns, label: "dispatch" })) fail(issue);
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
  return `# ${manifest.title} — authorized build\n\nBuild only this variant in a fresh worker with no inherited history. Do not read workspace memory, Prototype Lab design guidance, another variant, or review rankings. Record either the Codex \`codex-fork-turns-none\` adapter with \`fork_turns: "none"\`, or the \`dedicated-cli-clean-session\` adapter with fresh packet-only process evidence.\n\n## Shared brief\n\n${manifest.sharedBrief}\n\n## Fixed outcomes\n\n${bullets(manifest.fixedOutcomes)}\n\n## Approved direction\n\n\`\`\`json\n${JSON.stringify(card.selectedDirection, null, 2)}\n\`\`\`\n\n## Variant\n\n- id: ${variant.id}\n- requested model: ${variant.model}\n- reasoning: ${variant.reasoning}\n- condition: ${variant.condition}\n- variant skills: ${variant.skills.join(", ") || "none"}\n- shared brief SHA-256: ${manifest.sharedBriefSha256}\n- direction assignment SHA-256: ${variant.assignmentSha256}\n\n## Build contract\n\n- ${assetText}\n- Keep runtime files and assets local and portable.\n- Follow layout policy ${manifest.layoutPolicy}; page scrolling is valid unless this policy forbids it.\n- Support the approved direction at ${manifest.targetViewports.join(", ")}.\n- Add only states required by the experience. Every visible control must work.\n- Preserve the selected direction. Do not normalize it toward a lab shell.\n- Fill the supplied \`run-receipt.template.json\`; do not invent a receipt schema.\n- Return a canonical v3 run receipt with worker id, requested/effective model when visible, reasoning, fresh-worker adapter evidence, assignment/input hashes, skill/reference reads, memory inputs, asset manifest, output hashes, browser proof, usage when visible, and limitations.\n`;
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

async function createPrototype(options = args) {
  if (!options.title) throw new Error("create requires --title <title>");
  await fs.mkdir(prototypesRoot, { recursive: true });
  const date = options.date || today();
  const slug = slugify(options.slug || options.title);
  const payload = await collectPrototypeIndex({ workspace });
  const id = options.id || nextId(date, slug, payload.prototypes);
  validateId(id);
  const folder = folderFromId(id);
  if (await exists(folder)) throw new Error(`Artifact already exists: ${id}`);

  const profile = normalizeProfile(options.profile || options.scaffold || "blank");
  const scaffold = profile.scaffold;
  const scaffoldRoot = path.join(skillRoot, "assets", profile.asset);
  const variantSkills = splitList(options.skills);
  await fs.mkdir(folder, { recursive: true });
  for (const file of ["index.html", "styles.css", "app.js", "artifact-data.js"]) {
    await fs.copyFile(path.join(scaffoldRoot, file), path.join(folder, file));
  }
  if (await exists(path.join(scaffoldRoot, "icons"))) {
    await fs.cp(path.join(scaffoldRoot, "icons"), path.join(folder, "icons"), { recursive: true, force: true });
  }
  for (const name of ["assets", "proof", "prompts", "runs"]) await fs.mkdir(path.join(folder, name), { recursive: true });

  const requestedPrompt = options.prompt || options["from-prompt"];
  const prompt = requestedPrompt ? await attachLibraryPrompt(folder, requestedPrompt) : null;
  const sequence = sequenceFromId(id);
  const question = options.question || "What should this prototype help decide?";
  const metadata = {
    schemaVersion: 2,
    artifactKind: "prototype",
    entrypoint: "index.html",
    id,
    month: id.split("/").slice(0, 2).join("-"),
    number: sequence,
    slug,
    title: options.title,
    category: options.category || profile.category,
    status: options.question ? "draft" : "needs-brief",
    date,
    mode: "single",
    scaffold,
    profile: profile.id,
    template: profile.asset,
    condition: options.condition || "unassigned",
    model: options.model || "unknown",
    modelExact: options.model || "unknown",
    tags: unique(["browser-ui", ...profile.tags, ...(splitList(options.tags))]),
    question,
    sourcePrompt: prompt?.challenge || "Not attached yet.",
    promptTemplates: prompt ? [prompt.record] : [],
    runs: [],
    details: `Standalone ${profile.id} prototype owner managed by prototype-lab.`,
    views: ["prototype"],
    variants: [],
    proof: [],
    runtimeLayout: profile.runtimeLayout,
    targetViewports: profile.targetViewports,
    provenance: {
      skills: variantSkills,
      variantSkills,
      orchestrationSkills: ["prototype-lab"],
      models: [options.model || "unknown"],
      reasoning: options.reasoning || "unknown",
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
  await fs.writeFile(path.join(folder, "artifact-data.js"), renderManagedArtifactData(artifactData), "utf8");
  await writeJson(path.join(folder, "metadata.json"), metadata);
  await fs.writeFile(path.join(folder, "README.md"), prototypeReadme(metadata, prompt), "utf8");
  return { id, folder: toPosix(path.relative(workspace, folder)), prompt: prompt?.id || null, scaffold, profile: profile.id, condition: metadata.condition, skills: variantSkills };
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
    schemaVersion: 2,
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
    modes: normalizeHubModes(splitList(args.modes).length ? splitList(args.modes) : previous.modes || ["compare", "focus", "review"]),
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
      archived: override.archived === true,
      iteration: override.iteration || metadata.lineage?.iteration || 1,
      parentId: metadata.lineage?.parentId || null,
      tags: entry.tags,
      run: {
        agentMode: sourceRun.agentMode || "not captured",
        agentTool: sourceRun.agentTool || "not captured",
        workerId: sourceRun.workerId || "not captured",
        forkTurns: sourceRun.forkTurns || "not captured",
        isolation: sourceRun.isolation || null,
        isolationAdapter: isolationAdapterLabel(sourceRun.isolation),
        assignmentSha256: sourceRun.assignmentSha256 || "not captured",
        inputManifestSha256: sourceRun.inputManifestSha256 || "not captured",
        receipt: sourceRun.receipt || sourceRun.workerReceipt || "not captured",
        fallbackReason: sourceRun.fallbackReason || "not captured",
        receivedOtherVariants: sourceRun.receivedOtherVariants ?? "unknown",
        contextIsolation: validatedFreshWorkerIsolation(sourceRun.isolation, { forkTurns: sourceRun.forkTurns, label: "run" }).length === 0 ? "dispatch-recorded" : (sourceRun.contextIsolation || "unverified")
      }
    });
  }

  const modes = normalizeHubModes(config.modes);
  let coordinatorReview = null;
  if (config.coordinatorReview) {
    const reviewFile = path.resolve(folder, config.coordinatorReview);
    if (!isWithin(folder, reviewFile)) throw new Error(`Hub review escapes its owner: ${config.coordinatorReview}`);
    coordinatorReview = await readJson(reviewFile, null);
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
    modes,
    previewViewport: config.previewViewport || { width: 1200, height: 820 },
    variants,
    coordinatorReview
  };
  const assetRoot = path.join(skillRoot, "assets", "comparison-hub");
  for (const file of ["index.html", "hub.css", "hub.js"]) await fs.copyFile(path.join(assetRoot, file), path.join(folder, file));
  await fs.cp(path.join(assetRoot, "icons"), path.join(folder, "icons"), { recursive: true, force: true });
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
    comparisonMethods: modes,
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
      tradeoff: variant.tradeoff,
      archived: variant.archived,
      iteration: variant.iteration,
      parentId: variant.parentId
    })),
    views: modes,
    reviews: coordinatorReview ? [{ type: "coordinator", status: coordinatorReview.status, reviewedAt: coordinatorReview.reviewedAt, json: config.coordinatorReview, markdown: "reviews/coordinator-review.md" }] : [],
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
  return { id: config.id, files: ["hub.config.json", "hub-data.js", "index.html", "hub.css", "hub.js", "icons/", "metadata.json", "README.md"] };
}

async function installLibraryHub() {
  await fs.mkdir(prototypesRoot, { recursive: true });
  const assets = path.join(skillRoot, "assets", "prototype-index");
  const mapping = { "index.html": "index.html", "prototype-index.css": "prototype-index.css", "prototype-index.js": "prototype-index.js" };
  for (const [source, target] of Object.entries(mapping)) await fs.copyFile(path.join(assets, source), path.join(prototypesRoot, target));
  await fs.cp(path.join(assets, "icons"), path.join(prototypesRoot, "icons"), { recursive: true, force: true });
}

async function managePromptCommand(subcommand) {
  const mapped = subcommand === "list" ? "catalog" : subcommand;
  if (!["help", "init", "seed", "save", "pick", "catalog"].includes(mapped)) throw new Error("prompt uses list, pick, save, seed, init, or help");
  const forwarded = mapped === "help" ? ["help"] : [mapped, ...argsToTokens(args, ["workspace", "help"]), "--workspace", workspace];
  const output = await runNode(path.join(scriptRoot, "manage-prompt-library.mjs"), forwarded);
  process.stdout.write(output.stdout);
}

async function doctorWorkspace() {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  const checks = [
    { id: "node", status: nodeMajor >= 20 ? "passed" : "blocked", detail: `Node ${process.versions.node}; Prototype Lab requires Node 20 or newer.` },
    { id: "skill-assets", status: await exists(path.join(skillRoot, "assets", "prototype-blank", "index.html")) ? "passed" : "blocked", detail: "Bundled scaffolds are available." },
    { id: "workspace", status: await exists(workspace) ? "passed" : "blocked", detail: toPosix(workspace) },
    { id: "library", status: await exists(path.join(prototypesRoot, "index.html")) ? "passed" : "warning", detail: await exists(path.join(prototypesRoot, "index.html")) ? "Workspace hub exists." : `Run ${labCommand("init")}.` },
    { id: "prompts", status: await exists(path.join(prototypesRoot, "prompts", "catalog.json")) ? "passed" : "warning", detail: await exists(path.join(prototypesRoot, "prompts", "catalog.json")) ? "Prompt catalog exists." : `Run ${labCommand("prompt init")}.` }
  ];
  const status = await workspaceStatus();
  const blocked = checks.some((check) => check.status === "blocked");
  return {
    command: "doctor",
    status: blocked ? "blocked" : checks.some((check) => check.status === "warning") ? "warning" : "passed",
    checks,
    workspaceHealth: status.summary,
    nextActions: status.nextActions
  };
}

async function adoptPrototype() {
  if (!args.path) throw new Error("adopt requires --path <static-folder>");
  const source = resolveWorkspaceInput(args.path, "adopt path");
  const stat = await fs.stat(source).catch(() => null);
  if (!stat?.isDirectory()) throw new Error("adopt --path must be a directory");
  if (!(await exists(path.join(source, "index.html")))) throw new Error("adopt source must contain index.html");
  const title = args.title || path.basename(source);
  const created = await createPrototype({ ...args, title, profile: "imported" });
  const folder = folderFromId(created.id);
  await copyTree(source, folder, { exclude: new Set([".git", ".env", "node_modules", "metadata.json", "README.md", "proof", "runs", "prompts"]) });
  const metadata = await readJson(path.join(folder, "metadata.json"), {});
  metadata.profile = "imported";
  metadata.adoptedFrom = toPosix(path.relative(workspace, source));
  metadata.details = "Imported static browser artifact managed by prototype-lab.";
  await writeJson(path.join(folder, "metadata.json"), metadata);
  await updateArtifactFiles(folder, metadata);
  await buildPrototypeIndex({ workspace });
  return { ...created, source: metadata.adoptedFrom, next: [labCommand(`verify --id ${created.id} --profile quick`), labCommand("sync")] };
}

async function forkPrototype() {
  if (!args.id) throw new Error("fork requires --id <prototype-id>");
  const source = await artifactRecord(args.id);
  if (source.entry.isComparisonHub) throw new Error("fork currently supports standalone prototypes, not comparison hubs");
  const sourceMetadata = source.metadata;
  const created = await createPrototype({
    ...args,
    id: undefined,
    title: args.title || `${sourceMetadata.title} iteration`,
    question: args.question || sourceMetadata.question,
    profile: args.profile || sourceMetadata.profile || sourceMetadata.scaffold || "blank",
    condition: args.condition || sourceMetadata.condition,
    tags: unique([...(sourceMetadata.tags || []), ...splitList(args.tags), "iteration"]).join(",")
  });
  const folder = folderFromId(created.id);
  await copyTree(source.folder, folder, { exclude: new Set(["metadata.json", "README.md", "proof", "runs"]) });
  const metadata = await readJson(path.join(folder, "metadata.json"), {});
  metadata.lineage = { parentId: source.entry.id, iteration: Number(sourceMetadata.lineage?.iteration || 0) + 1 };
  metadata.model = args.model || "unknown";
  metadata.modelExact = args.model || "unknown";
  metadata.status = "draft";
  metadata.proof = [];
  metadata.runs = [];
  metadata.provenance = {
    ...metadata.provenance,
    models: [args.model || "unknown"],
    agentRuns: [],
    limitations: [`Forked from ${source.entry.id}; proof and run receipts intentionally reset.`]
  };
  await fs.mkdir(path.join(folder, "proof"), { recursive: true });
  await fs.mkdir(path.join(folder, "runs"), { recursive: true });
  await writeJson(path.join(folder, "metadata.json"), metadata);
  await updateArtifactFiles(folder, metadata);
  await buildPrototypeIndex({ workspace });
  return { ...created, parentId: source.entry.id, iteration: metadata.lineage.iteration, next: [labCommand(`verify --id ${created.id} --profile quick`), labCommand(`compare --title "${metadata.title} comparison" --variants ${source.entry.id},${created.id}`)] };
}

async function materializeExperiment() {
  if (!args.experiment) throw new Error("materialize requires --experiment <id>");
  const root = experimentRoot(args.experiment);
  const manifestFile = path.join(root, "experiment.json");
  const manifest = await readJson(manifestFile, null);
  if (!manifest) throw new Error(`Experiment not found: ${args.experiment}`);
  if (manifest.status !== "build-authorized") throw new Error(`Experiment ${manifest.id} is ${manifest.status}; materialize requires build-authorized`);
  const artifacts = [];
  for (const variant of manifest.variants || []) {
    if (variant.artifactId && await exists(folderFromId(variant.artifactId))) {
      artifacts.push({ variantId: variant.id, id: variant.artifactId, reused: true });
      continue;
    }
    const created = await createPrototype({
      title: `${manifest.title} · ${variant.id}`,
      slug: `${manifest.id}-${variant.id}`,
      question: manifest.question,
      profile: profileFromLayout(variant.layoutPolicy || manifest.layoutPolicy),
      condition: variant.condition,
      model: variant.model,
      reasoning: variant.reasoning,
      skills: (variant.skills || []).join(","),
      tags: `experiment,${manifest.intent}`
    });
    const folder = folderFromId(created.id);
    const variantRoot = path.join(root, variant.id);
    const packetFiles = ["build-assignment.md", "build-input-manifest.json", "build-dispatch.template.json", "run-receipt.template.json"];
    for (const name of packetFiles) {
      const source = path.join(variantRoot, name);
      if (await exists(source)) await fs.copyFile(source, path.join(folder, "runs", name));
    }
    const promptId = manifest.id;
    const rendered = `${manifest.sharedBrief.trim()}\n`;
    await fs.writeFile(path.join(folder, "prompts", `${promptId}.template.md`), rendered, "utf8");
    await writeJson(path.join(folder, "prompts", `${promptId}.vars.json`), {});
    await fs.writeFile(path.join(folder, "prompts", `${promptId}.rendered.md`), rendered, "utf8");
    const metadataFile = path.join(folder, "metadata.json");
    const metadata = await readJson(metadataFile, {});
    metadata.experiment = { id: manifest.id, intent: manifest.intent, variantId: variant.id, status: manifest.status };
    metadata.runtimeLayout = variant.layoutPolicy || manifest.layoutPolicy;
    metadata.targetViewports = variant.targetViewports || manifest.targetViewports;
    metadata.sourcePrompt = manifest.sharedBrief;
    metadata.promptTemplates = [{ id: promptId, version: 1, template: `prompts/${promptId}.template.md`, variables: `prompts/${promptId}.vars.json`, rendered: `prompts/${promptId}.rendered.md`, renderedSha256: sha256(rendered) }];
    metadata.variants = [{ id: variant.id, title: variant.id, model: variant.model, skill: (variant.skills || []).join(" + ") || "baseline", status: "planned", hypothesis: `Evaluate ${variant.condition}.`, tradeoff: "Not evaluated yet." }];
    metadata.provenance.buildPacket = {
      assignment: "runs/build-assignment.md",
      assignmentSha256: variant.buildAssignmentSha256,
      inputManifest: "runs/build-input-manifest.json",
      inputManifestSha256: variant.buildInputManifestSha256,
      dispatchTemplate: "runs/build-dispatch.template.json",
      receiptTemplate: "runs/run-receipt.template.json"
    };
    await writeJson(metadataFile, metadata);
    await updateArtifactFiles(folder, metadata);
    variant.artifactId = created.id;
    variant.artifactFolder = toPosix(path.relative(workspace, folder));
    artifacts.push({ variantId: variant.id, id: created.id, folder: variant.artifactFolder, buildAssignment: `${variant.artifactFolder}/runs/build-assignment.md`, receiptTemplate: `${variant.artifactFolder}/runs/run-receipt.template.json` });
  }
  manifest.materializedAt = new Date().toISOString();
  await writeJson(manifestFile, manifest);
  await buildPrototypeIndex({ workspace });
  return { experiment: manifest.id, status: "materialized", artifacts, next: ["Dispatch one fresh isolated build worker per artifact using only its local build packet.", labCommand("record --id <id> --receipt <workspace-relative-json>"), labCommand(`compare --title "${manifest.title}" --variants ${artifacts.map((item) => item.id).join(",")} --dimension ${args.dimension || "model"}`)] };
}

async function recordPrototype() {
  if (!args.id) throw new Error("record requires --id <prototype-id>");
  const record = await artifactRecord(args.id);
  const metadata = record.metadata;
  if (args.model) {
    metadata.model = args.model;
    metadata.modelExact = args.model;
    metadata.provenance.models = [args.model];
  }
  if (args.reasoning) metadata.provenance.reasoning = args.reasoning;
  if (args.skills) {
    metadata.provenance.skills = splitList(args.skills);
    metadata.provenance.variantSkills = splitList(args.skills);
  }
  if (args.condition) metadata.condition = args.condition;
  if (args.status) metadata.status = args.status;
  if (args.limitation) metadata.provenance.limitations = unique([...(metadata.provenance.limitations || []), args.limitation]);
  let receiptPath = null;
  if (args.receipt) {
    const source = resolveWorkspaceInput(args.receipt, "receipt");
    const receipt = await readJson(source, null);
    if (!receipt) throw new Error("record --receipt must be valid JSON");
    const name = `${slugify(receipt.runId || path.basename(source, path.extname(source)))}.json`;
    const destination = path.join(record.folder, "runs", name);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
    receiptPath = toPosix(path.relative(record.folder, destination));
    metadata.runs = [...(metadata.runs || []).filter((item) => (typeof item === "string" ? item : item.receipt) !== receiptPath), { id: receipt.runId || name.replace(/\.json$/, ""), variantId: receipt.variantId || metadata.experiment?.variantId || "single", promptId: receipt.prompt?.templateId || metadata.promptTemplates?.[0]?.id || "not captured", receipt: receiptPath, status: receipt.status || "actual" }];
    metadata.provenance.agentRuns = [...(metadata.provenance.agentRuns || []).filter((run) => run.receipt !== receiptPath), agentRunFromReceipt(receipt, receiptPath)];
    const observedModel = receipt.execution?.effectiveModelSource === "runtime-observed" ? receipt.execution.effectiveModel : null;
    if (observedModel) {
      metadata.model = observedModel;
      metadata.modelExact = observedModel;
      metadata.provenance.models = unique([observedModel, receipt.execution?.requestedModel]);
    }
  }
  await writeJson(path.join(record.folder, "metadata.json"), metadata);
  await updateArtifactFiles(record.folder, metadata);
  await buildPrototypeIndex({ workspace });
  return { id: record.entry.id, status: metadata.status, model: metadata.modelExact, skills: metadata.provenance.skills, receipt: receiptPath, next: [labCommand(`verify --id ${record.entry.id} --profile full --init-review`)] };
}

async function attachProof() {
  if (!args.id) throw new Error("attach-proof requires --id <prototype-id>");
  const values = splitList(args.files || args.file);
  if (!values.length) throw new Error("attach-proof requires --files <path,path>");
  const record = await artifactRecord(args.id);
  const attached = [];
  for (const value of values) {
    const source = resolveWorkspaceInput(value, "proof file");
    const stat = await fs.stat(source).catch(() => null);
    if (!stat?.isFile()) throw new Error(`Proof file not found: ${value}`);
    const destination = path.join(record.folder, "proof", path.basename(source));
    if (path.resolve(source) !== path.resolve(destination)) await fs.copyFile(source, destination);
    attached.push(toPosix(path.relative(record.folder, destination)));
  }
  record.metadata.proof = unique([...(record.metadata.proof || []), ...attached]);
  await writeJson(path.join(record.folder, "metadata.json"), record.metadata);
  await updateArtifactFiles(record.folder, record.metadata);
  await buildPrototypeIndex({ workspace });
  return { id: record.entry.id, attached, next: [labCommand(`verify --id ${record.entry.id} --profile full`)] };
}

async function reviewHub() {
  if (!args.id) throw new Error("review requires --id <comparison-hub-id>");
  const record = await artifactRecord(args.id);
  if (!record.entry.isComparisonHub) throw new Error("review requires a managed comparison hub");
  const configFile = path.join(record.folder, "hub.config.json");
  const config = await readJson(configFile, null);
  if (!config) throw new Error("review requires a managed hub with hub.config.json");
  const reviewRoot = path.join(record.folder, "reviews");
  const finalJson = path.join(reviewRoot, "coordinator-review.json");
  const finalMarkdown = path.join(reviewRoot, "coordinator-review.md");
  await fs.mkdir(reviewRoot, { recursive: true });

  if (args.init) {
    const templateFile = path.join(reviewRoot, "coordinator-review.template.json");
    const template = coordinatorReviewTemplate(config, record.metadata);
    await writeJson(templateFile, template);
    return { id: record.entry.id, status: "awaiting-review", template: toPosix(path.relative(workspace, templateFile)), next: [`Inspect every variant and its proof, fill the template, then run ${labCommand(`review --id ${record.entry.id} --report ${toPosix(path.relative(workspace, templateFile))}`)}`] };
  }

  if (!args.report) {
    const current = await readJson(finalJson, null);
    return { id: record.entry.id, status: current ? "reviewed" : "missing", review: current, next: current ? [labCommand(`open --id ${record.entry.id}`)] : [labCommand(`review --id ${record.entry.id} --init`)] };
  }

  const source = resolveWorkspaceInput(args.report, "coordinator review");
  const review = await readJson(source, null);
  const issues = validateCoordinatorReview(config, review);
  if (issues.length) throw new Error(`Invalid coordinator review:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
  review.hubId = record.entry.id;
  review.status = "final";
  review.reviewedAt = review.reviewedAt || new Date().toISOString();
  await writeJson(finalJson, review);
  await fs.writeFile(finalMarkdown, coordinatorReviewMarkdown(review, config), "utf8");
  config.coordinatorReview = "reviews/coordinator-review.json";
  config.reviewedAt = review.reviewedAt;
  config.modes = normalizeHubModes([...(config.modes || []), "review"]);
  await writeJson(configFile, config);
  await syncManagedHub(configFile);
  await buildPrototypeIndex({ workspace });
  return { id: record.entry.id, status: "reviewed", review: toPosix(path.relative(workspace, finalJson)), markdown: toPosix(path.relative(workspace, finalMarkdown)), recommendation: review.recommendation, next: [labCommand(`open --id ${record.entry.id}`), labCommand(`ship --id ${record.entry.id} --include-proof`)] };
}

async function finalizePrototype() {
  if (!args.id) throw new Error("finalize requires --id <prototype-id>");
  const profile = args.profile || "full";
  const verification = await verifyPrototype({ workspace, id: args.id, profile, initReview: Boolean(args["init-review"]), write: true });
  if (verification.status !== "passed") return { id: verification.id, status: "blocked", verification, next: [labCommand(`verify --id ${verification.id} --profile ${profile}`)] };
  const record = await artifactRecord(verification.id);
  const reviewGate = await experimentCompletionGate(record);
  if (!["passed", "not-applicable"].includes(reviewGate.status)) {
    return { id: verification.id, status: "blocked", verification, reviewGate, next: reviewGate.next };
  }
  record.metadata.status = "complete";
  record.metadata.proof = verification.proof;
  record.metadata.verification = { profile, browserVerified: verification.browserVerified, verifiedAt: verification.verifiedAt, report: "proof/verification-report.json" };
  await writeJson(path.join(record.folder, "metadata.json"), record.metadata);
  await updateArtifactFiles(record.folder, record.metadata);
  await buildPrototypeIndex({ workspace });
  return { id: verification.id, status: "complete", verification, next: [labCommand("sync"), labCommand(`pack --id ${verification.id}`)] };
}

async function experimentCompletionGate(record) {
  if (!record.metadata.experiment?.id) return { status: "not-applicable" };
  const configFiles = await findFiles(prototypesRoot, "hub.config.json");
  const matches = [];
  for (const configFile of configFiles) {
    const config = await readJson(configFile, null);
    if (!config) continue;
    const variantIds = (config.variants || []).map((item) => typeof item === "string" ? item : item.prototypeId || item.id);
    if (!variantIds.includes(record.entry.id)) continue;
    const folder = path.dirname(configFile);
    const review = config.coordinatorReview ? await readJson(path.resolve(folder, config.coordinatorReview), null) : null;
    const hubMetadata = await readJson(path.join(folder, "metadata.json"), {});
    const hubVariant = (hubMetadata.variants || []).find((item) => item.indexId === record.entry.id);
    const aliases = new Set([record.entry.id, record.metadata.slug, hubVariant?.id].filter(Boolean));
    const assessment = (review?.variants || []).find((item) => aliases.has(item.variantId));
    matches.push({ config, review, assessment });
  }
  const passed = matches.find(({ review, assessment }) => review?.status === "final" && assessment?.completion === "pass" && !(assessment.blockers || []).length);
  if (passed) return { status: "passed", hubId: passed.config.id };
  const blocked = matches.find(({ assessment }) => assessment?.completion === "blocked");
  if (blocked) {
    return { status: "blocked", code: "coordinator-review-blocked", hubId: blocked.config.id, blockers: blocked.assessment.blockers, next: [labCommand(`review --id ${blocked.config.id}`)] };
  }
  return {
    status: "blocked",
    code: "missing-coordinator-review",
    message: `Experiment variant ${record.entry.id} cannot be complete before a coordinator comparison review passes it.`,
    next: matches.length ? matches.map(({ config }) => labCommand(`review --id ${config.id} --init`)) : [labCommand(`compare --title "${record.metadata.experiment.id} comparison" --variants <all-experiment-artifact-ids>`)]
  };
}

async function openPrototype() {
  let file = path.join(prototypesRoot, "index.html");
  let id = null;
  if (args.id) {
    const record = await artifactRecord(args.id);
    id = record.entry.id;
    file = path.join(record.folder, record.metadata.entrypoint || "index.html");
  }
  if (!(await exists(file))) throw new Error(args.id ? `Entrypoint not found for ${args.id}` : `Workspace hub not found. Run ${labCommand("init")}.`);
  const url = pathToFileURL(file).href;
  if (!args.print) await launchUrl(url);
  return { id, file: toPosix(path.relative(workspace, file)), url, opened: !args.print };
}

async function previewPrototype() {
  if (!(await exists(path.join(prototypesRoot, "index.html")))) throw new Error(`Workspace hub not found. Run ${labCommand("init")}.`);
  const host = "127.0.0.1";
  const requestedPort = args.port === undefined ? 8787 : Number(args.port);
  if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) throw new Error("preview --port must be between 0 and 65535");
  let relative = "index.html";
  let id = null;
  if (args.id) {
    const record = await artifactRecord(args.id);
    id = record.entry.id;
    relative = `${record.entry.id}/${record.metadata.entrypoint || "index.html"}`;
  }
  const server = http.createServer(async (request, response) => serveStaticRequest(request, response, prototypesRoot));
  await new Promise((resolve, reject) => server.once("error", reject).listen(requestedPort, host, resolve));
  const address = server.address();
  const url = `http://${host}:${address.port}/${relative}`;
  const info = { id, status: "serving", url, root: toPosix(path.relative(workspace, prototypesRoot)), stop: "Ctrl+C" };
  if (args.check) {
    const response = await fetch(url);
    const body = await response.text();
    await new Promise((resolve) => server.close(resolve));
    return { ...info, status: response.ok && /<!doctype html|<html/i.test(body) ? "passed" : "blocked", httpStatus: response.status, stopped: true };
  }
  if (args.open) await launchUrl(url);
  print({ command: "preview", ...info, opened: Boolean(args.open) });
  await new Promise((resolve) => {
    const stop = () => server.close(resolve);
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
  return null;
}

async function serveStaticRequest(request, response, root) {
  const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname).replace(/^\/+/, "");
  let candidate = path.resolve(root, pathname || "index.html");
  if (!isWithin(root, candidate)) { response.writeHead(403).end("Forbidden"); return; }
  const stat = await fs.stat(candidate).catch(() => null);
  if (stat?.isDirectory()) candidate = path.join(candidate, "index.html");
  const content = await fs.readFile(candidate).catch(() => null);
  if (!content) { response.writeHead(404).end("Not found"); return; }
  const type = ({ ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" })[path.extname(candidate).toLowerCase()] || "application/octet-stream";
  response.writeHead(200, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(content);
}

async function launchUrl(url) {
  if (process.platform === "win32") await execFileAsync("rundll32", ["url.dll,FileProtocolHandler", url]);
  else if (process.platform === "darwin") await execFileAsync("open", [url]);
  else await execFileAsync("xdg-open", [url]);
}

async function shipPrototype() {
  if (!args.id) throw new Error("ship requires --id <prototype-id>");
  const finalized = await finalizePrototype();
  if (finalized.status !== "complete") return { id: finalized.id, status: "blocked", verification: finalized.verification, next: finalized.next };
  const packageArgs = ["--workspace", workspace, "--id", finalized.id];
  if (args["include-proof"]) packageArgs.push("--include-proof");
  const output = await runNode(path.join(scriptRoot, "package-prototype-lab.mjs"), packageArgs);
  const pack = JSON.parse(output.stdout);
  return { id: finalized.id, status: "packed", verification: finalized.verification, pack };
}

function coordinatorReviewTemplate(config, metadata) {
  const variants = Array.isArray(metadata.variants) ? metadata.variants : [];
  return {
    schemaVersion: 2,
    hubId: config.id,
    status: "draft",
    reviewedAt: null,
    reviewer: { role: "orchestrator", model: "not captured", reasoning: "not captured" },
    summary: "",
    recommendation: "",
    confidence: "medium",
    criteria: (config.criteria || []).map((criterion) => ({ criterion, assessment: "", evidence: [], verdict: "unclear" })),
    variants: variants.map((variant) => ({ variantId: variant.id, strengths: [], weaknesses: [], evidence: [], verdict: "unclear", completion: "blocked", blockers: ["Review not completed"] })),
    comparativeFindings: [],
    caveats: [],
    nextSteps: []
  };
}

function validateCoordinatorReview(config, review) {
  const issues = [];
  if (!review || typeof review !== "object") return ["Report must be a JSON object."];
  if (!String(review.summary || "").trim()) issues.push("summary is required");
  if (!String(review.recommendation || "").trim()) issues.push("recommendation is required");
  if (!["low", "medium", "high"].includes(review.confidence)) issues.push("confidence must be low, medium, or high");
  if (!Array.isArray(review.caveats)) issues.push("caveats must be an array");
  const variantIds = (config.variants || []).map((variant) => typeof variant === "string" ? variant : variant.id || variant.prototypeId);
  const assessments = Array.isArray(review.variants) ? review.variants : [];
  const reviewed = new Set(assessments.map((variant) => variant.variantId));
  for (const id of variantIds) if (!reviewed.has(id) && !reviewed.has(String(id).split("/").at(-1).replace(/^\d+-/, ""))) issues.push(`missing variant assessment for ${id}`);
  for (const assessment of assessments) {
    if (!Array.isArray(assessment.evidence) || !assessment.evidence.length) issues.push(`${assessment.variantId || "variant"} requires evidence`);
    if (!Array.isArray(assessment.blockers) || !["pass", "blocked"].includes(assessment.completion)) issues.push(`${assessment.variantId || "variant"} requires completion pass|blocked and blockers[]`);
    else if (assessment.completion === "pass" && assessment.blockers.length) issues.push(`${assessment.variantId} cannot pass completion with blockers`);
    else if (assessment.completion === "blocked" && !assessment.blockers.length) issues.push(`${assessment.variantId} blocked completion requires at least one blocker`);
  }
  if (!Array.isArray(review.criteria) || review.criteria.length < (config.criteria || []).length) issues.push("every comparison criterion needs an assessment");
  return issues;
}

function coordinatorReviewMarkdown(review, config) {
  const criteria = (review.criteria || []).map((item) => `### ${item.criterion}\n\n${item.assessment || "No assessment."}\n\n- Verdict: ${item.verdict || "unclear"}\n- Evidence: ${(item.evidence || []).join(", ") || "not recorded"}`).join("\n\n");
  const variants = (review.variants || []).map((item) => `### ${item.variantId}\n\n- Verdict: ${item.verdict || "unclear"}\n- Completion: ${item.completion || "blocked"}\n- Blockers: ${(item.blockers || []).join("; ") || "none"}\n- Strengths: ${(item.strengths || []).join("; ") || "not recorded"}\n- Weaknesses: ${(item.weaknesses || []).join("; ") || "not recorded"}\n- Evidence: ${(item.evidence || []).join(", ") || "not recorded"}`).join("\n\n");
  return `# Coordinator review — ${config.title}\n\n- Hub: \`${config.id}\`\n- Reviewed: ${review.reviewedAt}\n- Confidence: ${review.confidence}\n\n## Summary\n\n${review.summary}\n\n## Recommendation\n\n${review.recommendation}\n\n## Criteria\n\n${criteria}\n\n## Variants\n\n${variants}\n\n## Comparative findings\n\n${(review.comparativeFindings || []).map((item) => `- ${item}`).join("\n") || "- None recorded."}\n\n## Caveats\n\n${(review.caveats || []).map((item) => `- ${item}`).join("\n") || "- None recorded."}\n\n## Next steps\n\n${(review.nextSteps || []).map((item) => `- ${item}`).join("\n") || "- None recorded."}\n`;
}

async function artifactRecord(id) {
  const payload = await collectPrototypeIndex({ workspace });
  const resolved = resolvePrototypeIds([id], payload.prototypes)[0];
  const entry = payload.prototypes.find((item) => item.id === resolved);
  const folder = folderFromId(resolved);
  return { entry, folder, metadata: await readJson(path.join(folder, "metadata.json"), {}) };
}

function normalizeProfile(value) {
  const profiles = {
    blank: { id: "blank", scaffold: "blank", asset: "prototype-blank", category: "prototype", runtimeLayout: "open", tags: [], targetViewports: ["1200x820", "390x844"] },
    tool: { id: "tool", scaffold: "tool", asset: "prototype-shell", category: "tool-prototype", runtimeLayout: "app-shell", tags: ["compact-tool"], targetViewports: ["1920x1080", "1200x820", "834x1112"] },
    mobile: { id: "mobile", scaffold: "mobile", asset: "prototype-mobile", category: "mobile-flow", runtimeLayout: "page-scroll", tags: ["mobile-flow"], targetViewports: ["390x844", "834x1112"] },
    canvas: { id: "canvas", scaffold: "canvas", asset: "prototype-canvas", category: "canvas-prototype", runtimeLayout: "immersive-stage", tags: ["canvas", "webgl-ready"], targetViewports: ["1920x1080", "1200x820", "390x844"] },
    data: { id: "data", scaffold: "tool", asset: "prototype-shell", category: "data-debug", runtimeLayout: "app-shell", tags: ["data", "debug"], targetViewports: ["1920x1080", "1200x820", "834x1112"] },
    imported: { id: "imported", scaffold: "blank", asset: "prototype-blank", category: "imported-static", runtimeLayout: "open", tags: ["imported"], targetViewports: ["1200x820", "390x844"] }
  };
  const profile = profiles[value || "blank"];
  if (!profile) throw new Error(`Unknown profile: ${value}. Use blank, tool, mobile, canvas, data, or imported.`);
  return profile;
}

function profileFromLayout(layout) {
  return ({ "app-shell": "tool", "immersive-stage": "canvas", "page-scroll": "mobile" })[layout] || "blank";
}

function normalizeHubModes(values) {
  const allowed = ["overview", "compare", "focus", "blind", "rank", "iterations", "review", "archive", "provenance"];
  const requested = Array.isArray(values) && values.length ? values : ["overview", "compare", "focus", "provenance"];
  const invalid = requested.filter((value) => !allowed.includes(value));
  if (invalid.length) throw new Error(`Unknown hub modes: ${invalid.join(", ")}`);
  return unique(["overview", ...requested, "provenance"]);
}

function agentRunFromReceipt(receipt, receiptPath) {
  return {
    variantId: receipt.variantId || "single",
    status: receipt.status || "actual",
    agentMode: "subagent",
    agentTool: receipt.dispatch?.agentTool || "not captured",
    workerId: receipt.dispatch?.workerId || "not captured",
    forkTurns: receipt.dispatch?.forkTurns || "not captured",
    isolation: receipt.dispatch?.isolation || null,
    isolationAdapter: isolationAdapterLabel(receipt.dispatch?.isolation),
    assignmentSha256: receipt.dispatch?.assignmentSha256 || "not captured",
    inputManifestSha256: receipt.dispatch?.inputManifestSha256 || "not captured",
    requestedModel: receipt.execution?.requestedModel || "not captured",
    effectiveModel: receipt.execution?.effectiveModel || "not captured",
    reasoning: receipt.execution?.reasoning || "not captured",
    skills: receipt.execution?.variantSkills || [],
    outputPath: receipt.artifacts?.finalPrototypePath || "not captured",
    receipt: receiptPath,
    fallbackReason: receipt.fallbackReason || "not applicable",
    receivedOtherVariants: receipt.context?.receivedOtherVariants ?? "unknown",
    contextIsolation: validatedFreshWorkerIsolation(receipt.dispatch?.isolation, { forkTurns: receipt.dispatch?.forkTurns, label: "receipt dispatch" }).length === 0 ? "dispatch-recorded" : "unverified"
  };
}

async function updateArtifactFiles(folder, metadata) {
  const artifactDataFile = path.join(folder, "artifact-data.js");
  if (await exists(artifactDataFile)) {
    const artifactData = {
      id: metadata.id,
      title: metadata.title,
      question: metadata.question,
      status: metadata.status,
      model: metadata.modelExact || metadata.model || "unknown",
      condition: metadata.condition || "unassigned",
      skills: metadata.provenance?.variantSkills || metadata.provenance?.skills || [],
      prompt: metadata.promptTemplates?.[0] ? `${metadata.promptTemplates[0].id}@v${String(metadata.promptTemplates[0].version || 1).padStart(3, "0")}` : "not attached"
    };
    await upsertManagedArtifactData(artifactDataFile, artifactData);
  }
  await fs.writeFile(path.join(folder, "README.md"), prototypeReadme(metadata, metadata.promptTemplates?.[0] ? { id: metadata.promptTemplates[0].id } : null), "utf8");
}

function renderManagedArtifactData(artifactData) {
  return `${artifactDataStart}\nwindow.PROTOTYPE_ARTIFACT_DATA = ${JSON.stringify(artifactData, null, 2)};\n${artifactDataEnd}\n`;
}

async function upsertManagedArtifactData(file, artifactData) {
  const managed = renderManagedArtifactData(artifactData);
  const current = await fs.readFile(file, "utf8").catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  const start = current.indexOf(artifactDataStart);
  const end = current.indexOf(artifactDataEnd);
  let next;
  if (start >= 0 || end >= 0) {
    if (start < 0 || end < start) throw new Error(`Refusing to update malformed Prototype Lab artifact-data markers in ${file}`);
    next = `${current.slice(0, start)}${managed}${current.slice(end + artifactDataEnd.length).replace(/^\r?\n/, "")}`;
  } else if ((current.match(/\bwindow\./g) || []).length === 1 && /^\s*window\.PROTOTYPE_ARTIFACT_DATA\s*=\s*[\s\S]*;\s*$/.test(current)) {
    next = managed;
  } else {
    const separator = current && !current.endsWith("\n") ? "\n" : "";
    next = `${current}${separator}${managed}`;
  }
  await fs.writeFile(file, next, "utf8");
}

async function copyTree(source, destination, { exclude = new Set() } = {}) {
  const entries = await fs.readdir(source, { withFileTypes: true });
  await fs.mkdir(destination, { recursive: true });
  for (const entry of entries) {
    if (exclude.has(entry.name)) continue;
    if (entry.isSymbolicLink()) throw new Error(`Refusing to copy symlink: ${toPosix(path.join(source, entry.name))}`);
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyTree(from, to, { exclude });
    else if (entry.isFile()) await fs.copyFile(from, to);
  }
}

function argsToTokens(value, excluded = []) {
  const output = [];
  for (const [key, item] of Object.entries(value)) {
    if (excluded.includes(key) || item === false || item === undefined || item === null) continue;
    output.push(`--${key}`);
    if (item !== true) output.push(String(item));
  }
  return output;
}

async function workspaceStatus() {
  const payload = await collectPrototypeIndex({ workspace });
  const invalidHubs = payload.prototypes.filter((entry) => entry.isComparisonHub && !payload.comparisonHubs.some((hub) => hub.id === entry.id));
  const issues = payload.prototypes.flatMap((entry) => entry.issues.map((issue) => ({ id: entry.id, ...issue })));
  const experiments = await collectExperimentStatuses();
  const nextActions = [];
  for (const experiment of experiments) {
    if (["awaiting-directions", "preflight-blocked", "awaiting-blind-review"].includes(experiment.status)) nextActions.push(labCommand(`preflight --experiment ${experiment.id}`));
    if (experiment.status === "build-authorized" && !experiment.materializedAt) nextActions.push(labCommand(`materialize --experiment ${experiment.id}`));
  }
  for (const issue of issues.slice(0, 8)) {
    if (issue.code === "missing-proof") nextActions.push(labCommand(`verify --id ${issue.id} --profile full --init-review`));
    else if (issue.code === "unknown-model") nextActions.push(labCommand(`record --id ${issue.id} --model <effective-model>`));
    else if (issue.code === "missing-coordinator-review") nextActions.push(labCommand(`review --id ${issue.id} --init`));
    else nextActions.push(`Open prototypes/${issue.id}/index.html and resolve ${issue.code}.`);
  }
  if (!payload.prototypes.length) nextActions.push(labCommand('quick --title "First prototype" --question "What should this idea prove?"'));
  return {
    command: "status",
    workspace: toPosix(workspace),
    summary: payload.summary,
    managedHubs: payload.comparisonHubs.filter((hub) => hub.managed).map((hub) => hub.id),
    legacyHubs: payload.comparisonHubs.filter((hub) => !hub.managed).map((hub) => hub.id),
    invalidHubs: invalidHubs.map((entry) => entry.id),
    issues,
    experiments,
    nextActions: unique(nextActions),
    routes: {
      quick: labCommand('quick --title <title> --question <question> [--profile blank|tool|mobile|canvas|data]'),
      compare: labCommand('compare --title <title> --variants <id,id> [--modes compare,blind,rank,review]'),
      experiment: labCommand('experiment --spec <json>'),
      ship: labCommand('ship --id <id> [--include-proof]')
    },
    commands: {
      quick: labCommand("quick --title <title> --question <question>"),
      experiment: labCommand("experiment --spec <portable-json-file>"),
      preflight: labCommand("preflight --experiment <id> [--review <json>]"),
      materialize: labCommand("materialize --experiment <id>"),
      create: labCommand("create --title <title> --question <question>"),
      compare: labCommand("compare --title <title> --variants <id,id> --dimension <model|skill|prompt|design>"),
      verify: labCommand("verify --id <id> --profile quick|full"),
      review: labCommand("review --id <hub-id> --init"),
      preview: labCommand("preview --id <id> --open"),
      finalize: labCommand("finalize --id <id>"),
      sync: labCommand("sync"),
      pack: labCommand("pack --id <hub-or-prototype-id>"),
      ship: labCommand("ship --id <hub-or-prototype-id>")
    }
  };
}

async function collectExperimentStatuses() {
  const root = path.join(workspace, ".scratch", "prototype-lab");
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const output = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifest = await readJson(path.join(root, entry.name, "experiment.json"), null);
    if (manifest) output.push({ id: manifest.id || entry.name, title: manifest.title || entry.name, intent: manifest.intent || "unknown", status: manifest.status || "unknown", materializedAt: manifest.materializedAt || null, variants: (manifest.variants || []).length });
  }
  return output.sort((a, b) => a.id.localeCompare(b.id));
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
  return `# ${metadata.title}\n\n- Question: ${metadata.question}\n- Status: ${metadata.status}\n- Profile: ${metadata.profile || metadata.scaffold || "unknown"}\n- Open: \`index.html\`\n- Metadata: \`metadata.json\`\n- Prompt: ${prompt ? `\`prompts/${prompt.id}.rendered.md\`` : "not attached"}\n- Proof: \`proof/\`\n\nBuild the prototype in this folder and keep runtime dependencies local. Record factual execution with \`lab record --id ${metadata.id}\`, verify with \`lab verify --id ${metadata.id} --profile full --init-review\`, then close it with \`lab finalize --id ${metadata.id}\`.\n`;
}

function hubReadme(config, variants) {
  return `# ${config.title}\n\n- Question: ${config.question}\n- Dimension: ${config.dimension}\n- Modes: ${normalizeHubModes(config.modes).join(", ")}\n- Source of truth: \`hub.config.json\`\n- Generated data: \`hub-data.js\`\n- Coordinator review: ${config.coordinatorReview ? `\`${config.coordinatorReview}\`` : "not attached"}\n- Open: \`index.html\`\n\n## Variants\n\n${variants.map((variant) => `- ${variant.title}: \`${variant.prototypeId}\`${variant.archived ? " (archived)" : ""}`).join("\n")}\n\nEdit only \`hub.config.json\` to change membership, labels, criteria, modes, or the default view. Run \`lab review --id ${config.id} --init\` for an orchestrator report and \`lab sync\` to regenerate the hub.\n`;
}

function resultSummary(payload) { return { summary: payload.summary, index: "prototypes/index.html" }; }
function helpText() {
  return `Prototype Lab\n\nStart from the outcome you want:\n  quick --title <title>                  create one lightweight prototype owner\n  compare --variants <id,id>             compare standalone artifacts\n  experiment --spec <json>               prepare a rigorous benchmark or showcase\n  ship --id <id>                         verify, finalize, and package one owner\n\nDaily commands:\n  init, create, adopt, fork, open, preview, prompt, record, attach-proof\n  verify, finalize, review, sync, status, doctor, pack\n\nAdvanced commands:\n  preflight                              validate directions and authorize hashed build packets\n  materialize                            create final owners from an authorized experiment\n\nRun \`lab help <command>\` or \`lab <command> --help\`.\nCommon option: --workspace <path>`;
}

function commandHelp(name) {
  const help = {
    quick: `quick --title <title> [--question <q>] [--profile blank|tool|mobile|canvas|data] [--from-prompt <id>]\nCreate the smallest managed owner for a daily prototype.`,
    create: `create --title <title> [--question <q>] [--profile blank|tool|mobile|canvas|data] [--from-prompt <id>]\nAllocate a standalone artifact without running an experiment.`,
    adopt: `adopt --path <static-folder> [--title <title>] [--question <q>]\nCopy an existing self-contained static build into a new managed owner.`,
    fork: `fork --id <prototype-id> [--title <title>] [--question <q>]\nCreate a new iteration while resetting proof and execution receipts.`,
    compare: `compare --title <title> --variants <id,id> [--dimension <value>] [--modes compare,blind,rank,iterations,review,archive]\nCreate a managed comparison hub. \`hub\` is an alias.`,
    hub: `hub --title <title> --variants <id,id> [--dimension <value>] [--modes <list>]\nCreate a managed comparison hub.`,
    experiment: `experiment --init --id <id> --intent benchmark|showcase [--models <list>] [--skill <id>] [--from-prompt <id>]\nexperiment --spec <portable-json-file> [--direct-build]\nGenerate an editable spec, then prepare isolated direction or build packets.`,
    preflight: `preflight --experiment <id> [--review <json>]\nValidate dispatch isolation and direction cards; authorize builds after blind review.`,
    materialize: `materialize --experiment <id>\nCreate one final artifact owner and local build packet per authorized variant.`,
    prompt: `prompt <list|pick|save|seed|init|help> [options]\nUse the versioned prompt library through the main lab interface.`,
    record: `record --id <id> [--model <id>] [--reasoning <level>] [--skills <list>] [--receipt <json>]\nAttach factual execution metadata and canonical receipts.`,
    "attach-proof": `attach-proof --id <id> --files <path,path>\nCopy evidence into the artifact and register it in metadata.`,
    verify: `verify --id <id> [--profile quick|full] [--init-review] [--write]\nQuick checks portability; full also requires a passing four-viewport browser review receipt.`,
    finalize: `finalize --id <id> [--profile full|quick] [--init-review]\nMark complete only after the selected verification profile passes.`,
    review: `review --id <hub-id> --init\nreview --id <hub-id> --report <json>\nCreate and attach the orchestrator's evidence-backed comparison report.`,
    open: `open [--id <id>] [--print]\nOpen the workspace hub or one artifact; --print returns the file URL without launching.`,
    preview: `preview [--id <id>] [--port <n>] [--open] [--check]\nServe the workspace on 127.0.0.1 for artifacts that need an HTTP origin; stop with Ctrl+C.`,
    ship: `ship --id <id> [--include-proof]\nRun full finalization and produce a portable folder plus ZIP.`,
    pack: `pack --id <id> [--include-proof]\nPackage a ready prototype or hub without changing its status.`,
    status: `status\nShow artifacts, experiments, health issues, and exact resume actions.`,
    doctor: `doctor\nCheck runtime, bundled assets, workspace initialization, prompts, and workspace health.`,
    init: `init [--empty]\nInstall the generated library hub and initialize or seed the prompt library.`,
    sync: `sync\nRegenerate managed hubs, prompt catalog, health data, and the workspace library.`
  };
  return help[name] ? `Prototype Lab\n\n${help[name]}\n\nCommon option: --workspace <path>` : helpText();
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
