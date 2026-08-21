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
const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "prototype-lab-vary-"));

try {
  await run("init", "--empty");
  const created = await run("quick", "--title", "Round canvas", "--question", "Can the operator recover?", "--profile", "blank");
  const folder = artifactFolder(created.id);
  const originalIndex = await fs.readFile(path.join(folder, "index.html"), "utf8");

  const opened = await run("vary", "--id", created.id, "--question", "How much should the first screen say?", "--n", "4");
  assert.equal(opened.action, "open");
  assert.equal(opened.positions, 4);
  assert.match(await fs.readFile(path.join(folder, "index.html"), "utf8"), /id="vary-frame"/);
  assert.equal(await exists(path.join(folder, "vary-card.js")), true);
  assert.equal(await exists(path.join(folder, "positions", "1", "index.html")), true);
  assert.equal(await exists(path.join(folder, "positions", "4", "index.html")), true);

  const incomplete = await run("vary", "--id", created.id, "--check");
  assert.equal(incomplete.status, "blocked");
  assert.equal(incomplete.issues.some((issue) => issue.code === "missing-angle"), true);

  const baselineFile = path.join(folder, "positions", "1", "index.html");
  const baselineHtml = await fs.readFile(baselineFile, "utf8");
  await fs.appendFile(baselineFile, "<!-- edited-baseline -->\n", "utf8");
  const edited = await run("vary", "--id", created.id, "--check");
  assert.equal(edited.issues.some((issue) => issue.code === "baseline-edited"), true);
  await fs.writeFile(baselineFile, baselineHtml, "utf8");

  await markPosition(folder, 2, "ledger");
  await markPosition(folder, 3, "split");
  await markPosition(folder, 4, "outcome");
  await fs.writeFile(path.join(folder, "positions", "2", "metadata.json"), `${JSON.stringify({ title: "decoy nested owner" }, null, 2)}\n`, "utf8");

  await writePlan(folder, {
    2: { name: "the ledger", angle: "type only", cost: "nothing to look at above the fold" },
    3: { name: "split", angle: "type only", cost: "weaker at 390px" },
    4: { name: "the outcome", angle: "leads with the result", cost: "slower to say what it is" }
  });
  const duplicates = await run("vary", "--id", created.id, "--check");
  assert.equal(duplicates.status, "blocked");
  assert.equal(duplicates.issues.some((issue) => issue.code === "duplicate-angle"), true);

  await writePlan(folder, {
    2: { name: "the ledger", angle: "type only", cost: "nothing to look at above the fold" },
    3: { name: "split", angle: "asymmetric two column", cost: "weaker at 390px" },
    4: { name: "the outcome", angle: "leads with the result", cost: "slower to say what it is" }
  });
  const passed = await run("vary", "--id", created.id, "--check");
  assert.equal(passed.status, "passed");

  const used = await run("vary", "--id", created.id, "--use", "3");
  assert.equal(used.current, 3);
  const standing = await run("vary", "--id", created.id);
  assert.equal(standing.action, "status");
  assert.equal(standing.current, 3);

  const status = await run("status");
  assert.equal(status.summary.prototypes, 1);
  assert.equal(status.issues.some((issue) => issue.code === "open-design-round" && issue.id === created.id), true);
  assert.equal(status.nextActions.some((item) => String(item).includes("vary") && String(item).includes("--check")), true);

  const narrowed = await run("vary", "--id", created.id, "--narrow", "--keep", "3");
  assert.equal(narrowed.action, "narrow");
  assert.equal(narrowed.kept.name, "split");
  assert.equal(await exists(path.join(folder, "positions", "1", "index.html")), true);
  assert.equal(await exists(path.join(folder, "positions", "2", "index.html")), true);
  assert.equal(await exists(path.join(folder, "positions", "3", "index.html")), true);
  const dropped = await fs.readdir(path.join(folder, "positions", ".dropped"));
  assert.ok(dropped.length >= 3);
  assert.match(await fs.readFile(path.join(folder, "positions", "1", "index.html"), "utf8"), /split/);

  await markPosition(folder, 2, "calmer");
  await writePlan(folder, {
    2: { name: "calmer split", angle: "same split quieter", cost: "less presence" },
    3: { name: "denser split", angle: "same split tighter", cost: "harder to scan" }
  });
  assert.equal((await run("vary", "--id", created.id, "--check")).status, "passed");

  const closed = await run("vary", "--id", created.id, "--end", "--keep", "2", "--why", "calmer split");
  assert.equal(closed.status, "closed");
  assert.equal(await exists(path.join(folder, "vary-card.js")), false);
  assert.doesNotMatch(await fs.readFile(path.join(folder, "index.html"), "utf8"), /id="vary-frame"/);
  assert.match(await fs.readFile(path.join(folder, "index.html"), "utf8"), /calmer/);
  const metadata = await readJson(path.join(folder, "metadata.json"));
  assert.equal(metadata.mode, "single");
  assert.equal(metadata.designRound, undefined);
  const plan = await readJson(path.join(folder, "plan.json"));
  assert.equal(plan.status, "closed");
  assert.equal((await run("verify", "--id", created.id, "--profile", "quick")).status, "passed");
  assert.ok(originalIndex.includes("html"));

  const reopened = await run("vary", "--id", created.id, "--question", "How calm should the split stay?");
  assert.equal(reopened.action, "open");
  assert.equal(await exists(path.join(folder, "positions", ".dropped")), true);
  const stillDropped = await fs.readdir(path.join(folder, "positions", ".dropped"));
  assert.ok(stillDropped.length >= 3);

  const doctor = await run("doctor");
  assert.equal(doctor.checks.find((check) => check.id === "skill-assets")?.status, "passed");
  console.log("prototype-lab design round ok");
} finally {
  await fs.rm(workspace, { recursive: true, force: true });
}

async function writePlan(folder, extras) {
  const plan = await readJson(path.join(folder, "plan.json"));
  plan.positions = plan.positions.map((item) => extras[item.n] ? { ...item, ...extras[item.n] } : item);
  await fs.writeFile(path.join(folder, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
}

async function markPosition(folder, n, token) {
  const file = path.join(folder, "positions", String(n), "index.html");
  const html = await fs.readFile(file, "utf8");
  await fs.writeFile(file, html.replace("</body>", `<!-- ${token} --></body>`), "utf8");
}

async function run(...args) {
  const { stdout } = await execFileAsync(process.execPath, [manager, ...args, "--workspace", workspace], { cwd: workspace, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(stdout);
}

function artifactFolder(id) { return path.join(workspace, "prototypes", ...id.split("/")); }
async function readJson(file) { return JSON.parse(await fs.readFile(file, "utf8")); }
async function exists(file) { return Boolean(await fs.stat(file).catch(() => null)); }
