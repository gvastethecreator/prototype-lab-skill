import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manager = path.join(repositoryRoot, "SKILLS", "prototype-lab", "scripts", "manage-prototype-lab.mjs");
const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "prototype-lab-daily-"));

try {
  await run("init", "--empty");
  const quick = await run("quick", "--title", "Daily board", "--question", "Can the operator recover?", "--profile", "tool");
  assert.equal(quick.profile, "tool");
  const quickFolder = artifactFolder(quick.id);
  const quickArtifactDataFile = path.join(quickFolder, "artifact-data.js");
  await fs.appendFile(quickArtifactDataFile, 'window.ARTIFACTS = [{ id: "worker-owned-navigation" }];\n', "utf8");
  let quickMetadata = await readJson(path.join(quickFolder, "metadata.json"));
  assert.equal(quickMetadata.runtimeLayout, "app-shell");

  const quickVerification = await run("verify", "--id", quick.id, "--profile", "quick");
  assert.equal(quickVerification.status, "passed");
  const plannedFull = await run("verify", "--id", quick.id, "--profile", "full", "--init-review");
  assert.equal(plannedFull.status, "blocked");
  await completeBrowserReview(quickFolder);
  const fullVerification = await run("verify", "--id", quick.id, "--profile", "full", "--write");
  assert.equal(fullVerification.status, "passed");
  assert.equal(fullVerification.browserVerified, true);
  const finalized = await run("finalize", "--id", quick.id);
  assert.equal(finalized.status, "complete");
  const preservedArtifactData = await fs.readFile(quickArtifactDataFile, "utf8");
  assert.match(preservedArtifactData, /prototype-lab:artifact-data:start/);
  assert.match(preservedArtifactData, /window\.ARTIFACTS = \[\{ id: "worker-owned-navigation" \}\]/);

  const forked = await run("fork", "--id", quick.id, "--title", "Daily board compact");
  const forkFolder = artifactFolder(forked.id);
  const forkMetadata = await readJson(path.join(forkFolder, "metadata.json"));
  assert.equal(forkMetadata.lineage.parentId, quick.id);
  assert.equal(forkMetadata.proof.length, 0);

  const proofSource = path.join(workspace, "fork-note.txt");
  await fs.writeFile(proofSource, "manual evidence\n", "utf8");
  const attached = await run("attach-proof", "--id", forked.id, "--files", "fork-note.txt");
  assert.equal(attached.attached.length, 1);

  const importedSource = path.join(workspace, "existing-static");
  await fs.mkdir(importedSource, { recursive: true });
  await fs.writeFile(path.join(importedSource, "index.html"), '<!doctype html><html><head><link rel="stylesheet" href="./style.css"></head><body><main>Imported</main></body></html>\n', "utf8");
  await fs.writeFile(path.join(importedSource, "style.css"), "body{margin:0}\n", "utf8");
  const adopted = await run("adopt", "--path", "existing-static", "--title", "Imported static", "--question", "Is the imported build portable?");
  assert.equal(adopted.profile, "imported");
  assert.equal((await run("verify", "--id", adopted.id, "--profile", "quick")).status, "passed");
  const canvas = await run("quick", "--title", "Canvas recipe", "--question", "Does the stage resize correctly?", "--profile", "canvas");
  assert.match(await fs.readFile(path.join(artifactFolder(canvas.id), "index.html"), "utf8"), /prototype-canvas/);
  assert.equal((await run("verify", "--id", canvas.id, "--profile", "quick")).status, "passed");

  const hub = await run("compare", "--title", "Daily board comparison", "--variants", `${quick.id},${forked.id}`, "--dimension", "design", "--modes", "compare,blind,rank,iterations,review,archive");
  const hubFolder = artifactFolder(hub.id);
  const hubData = await fs.readFile(path.join(hubFolder, "hub-data.js"), "utf8");
  assert.match(hubData, /"blind"/);
  assert.match(hubData, /"rank"/);

  const reviewInit = await run("review", "--id", hub.id, "--init");
  const reviewFile = path.join(workspace, ...reviewInit.template.split("/"));
  const review = await readJson(reviewFile);
  review.status = "final";
  review.summary = "Both variants work; the iteration is clearer.";
  review.recommendation = "Continue with the compact iteration.";
  review.confidence = "high";
  review.criteria = review.criteria.map((item) => ({ ...item, assessment: "Observed in the rendered proof.", evidence: ["proof/compare.png"], verdict: "pass" }));
  review.variants = review.variants.map((item, index) => ({ ...item, strengths: [index ? "Clear hierarchy" : "Complete flow"], weaknesses: [index ? "Needs final proof" : "Dense controls"], evidence: [index ? `${forked.id}/proof/fork-note.txt` : `${quick.id}/proof/browser-review.json`], verdict: index ? "recommended" : "viable", completion: "pass", blockers: [] }));
  review.comparativeFindings = ["The compact iteration reduces scanning cost."];
  review.caveats = ["The fork still needs canonical viewport proof."];
  review.nextSteps = ["Verify the fork at all canonical viewports."];
  await fs.writeFile(reviewFile, `${JSON.stringify(review, null, 2)}\n`, "utf8");
  const reviewed = await run("review", "--id", hub.id, "--report", path.relative(workspace, reviewFile));
  assert.equal(reviewed.status, "reviewed");
  assert.equal(await exists(path.join(hubFolder, "reviews", "coordinator-review.md")), true);
  assert.match(await fs.readFile(path.join(hubFolder, "hub-data.js"), "utf8"), /Continue with the compact iteration/);

  const generatedSpec = await run("experiment", "--init", "--id", "daily-benchmark", "--title", "Daily benchmark", "--intent", "benchmark", "--question", "Which natural response is more usable?", "--brief", "Build a compact browser control for one reversible action.", "--models", "model-a,model-b", "--layout-policy", "app-shell", "--asset-policy", "forbidden");
  assert.equal(generatedSpec.variants.length, 2);
  await run("experiment", "--spec", generatedSpec.spec, "--direct-build");
  const materialized = await run("materialize", "--experiment", "daily-benchmark");
  assert.equal(materialized.artifacts.length, 2);
  assert.equal(await exists(path.join(artifactFolder(materialized.artifacts[0].id), "runs", "build-assignment.md")), true);
  const experimentVariantFolder = artifactFolder(materialized.artifacts[0].id);
  await run("verify", "--id", materialized.artifacts[0].id, "--profile", "full", "--init-review");
  await completeBrowserReview(experimentVariantFolder);
  const blockedExperimentFinalize = await run("finalize", "--id", materialized.artifacts[0].id);
  assert.equal(blockedExperimentFinalize.status, "blocked");
  assert.equal(blockedExperimentFinalize.reviewGate.code, "missing-coordinator-review");
  const experimentHub = await run("compare", "--title", "Daily benchmark comparison", "--variants", materialized.artifacts.map((item) => item.id).join(","), "--dimension", "skill");
  const experimentReviewInit = await run("review", "--id", experimentHub.id, "--init");
  const experimentReviewFile = path.join(workspace, ...experimentReviewInit.template.split("/"));
  const experimentReview = await readJson(experimentReviewFile);
  experimentReview.summary = "The variants were compared after browser verification.";
  experimentReview.recommendation = "Retain both as benchmark evidence.";
  experimentReview.confidence = "medium";
  experimentReview.criteria = experimentReview.criteria.map((item) => ({ ...item, assessment: "Compared in the browser.", evidence: ["proof/benchmark-compare.png"], verdict: "pass" }));
  experimentReview.variants = experimentReview.variants.map((item) => ({ ...item, strengths: ["Runnable"], weaknesses: [], evidence: ["proof/browser-review.json"], verdict: "viable", completion: "pass", blockers: [] }));
  await fs.writeFile(experimentReviewFile, `${JSON.stringify(experimentReview, null, 2)}\n`, "utf8");
  await run("review", "--id", experimentHub.id, "--report", path.relative(workspace, experimentReviewFile));
  assert.equal((await run("finalize", "--id", materialized.artifacts[0].id)).status, "complete");

  const promptList = await run("prompt", "list");
  assert.equal(promptList.count, 0);
  const opened = await run("open", "--id", quick.id, "--print");
  assert.equal(opened.opened, false);
  assert.match(opened.url, /^file:/);
  const previewed = await run("preview", "--id", quick.id, "--port", "0", "--check");
  assert.equal(previewed.status, "passed");
  assert.equal(previewed.stopped, true);
  const doctor = await run("doctor");
  assert.notEqual(doctor.status, "blocked");
  const status = await run("status");
  assert.equal(Array.isArray(status.nextActions), true);

  const shipped = await run("ship", "--id", quick.id, "--include-proof");
  assert.equal(shipped.status, "packed");
  assert.equal(await exists(shipped.pack.folder), true);
  assert.equal(await exists(shipped.pack.archive), true);

  quickMetadata = await readJson(path.join(quickFolder, "metadata.json"));
  assert.equal(quickMetadata.status, "complete");
  console.log("prototype-lab daily workflow ok");
} finally {
  await fs.rm(workspace, { recursive: true, force: true });
}

async function completeBrowserReview(folder) {
  const file = path.join(folder, "proof", "browser-review.json");
  const review = await readJson(file);
  review.status = "passed";
  review.reviewedAt = new Date().toISOString();
  review.reviewer = "test-browser";
  review.runtime = { entrypoint: "index.html", loaded: true, visibleControlCount: 2, exercisedControlCount: 2, navigationChecks: [] };
  review.interactionChecks = [
    { label: "primary action", status: "passed", evidence: "fixture interaction" },
    { label: "reset", status: "passed", evidence: "fixture interaction" }
  ];
  review.accessibilityChecks = [{ label: "keyboard focus", status: "passed", evidence: "fixture keyboard pass" }];
  review.finishChecks = review.finishChecks.map((item) => ({ ...item, status: ["scrollbars", "gradients", "icons-vector-craft"].includes(item.dimension) ? "not-applicable" : "passed", evidence: "fixture finish inspection" }));
  for (const viewport of review.viewports) {
    const screenshot = path.resolve(folder, viewport.screenshot);
    await fs.mkdir(path.dirname(screenshot), { recursive: true });
    await fs.writeFile(screenshot, "fixture\n", "utf8");
    viewport.viewportFit = "passed";
    viewport.horizontalOverflow = false;
    viewport.verticalOverflow = false;
    viewport.scrollOwner = "none";
    viewport.scrollbar = { present: false, nativeVisible: false, customized: false };
    viewport.detailChecks = viewport.width === 1920 ? [{ label: "alignment and control detail", status: "passed", evidence: viewport.screenshot }] : [];
  }
  await fs.writeFile(file, `${JSON.stringify(review, null, 2)}\n`, "utf8");
}

async function run(...args) {
  const { stdout } = await execFileAsync(process.execPath, [manager, ...args, "--workspace", workspace], { cwd: workspace, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(stdout);
}

function artifactFolder(id) { return path.join(workspace, "prototypes", ...id.split("/")); }
async function readJson(file) { return JSON.parse(await fs.readFile(file, "utf8")); }
async function exists(file) { return Boolean(await fs.stat(file).catch(() => null)); }
