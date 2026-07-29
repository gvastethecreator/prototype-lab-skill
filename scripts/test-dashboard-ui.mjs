import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manager = path.join(repositoryRoot, "SKILLS", "prototype-lab", "scripts", "manage-prototype-lab.mjs");
const playwrightRoot = process.env.PROTOTYPE_LAB_PLAYWRIGHT_ROOT;
if (!playwrightRoot) throw new Error("Set PROTOTYPE_LAB_PLAYWRIGHT_ROOT to the Playwright package directory.");
const playwrightModule = await import(pathToFileURL(path.join(playwrightRoot, "index.js")).href);
const { chromium } = playwrightModule.default || playwrightModule;
const chromiumExecutablePath = process.env.PROTOTYPE_LAB_CHROMIUM_EXECUTABLE_PATH;
const label = argument("label") || "dashboard";
const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "prototype-lab-dashboard-"));
const outputRoot = path.join(repositoryRoot, ".scratch", "dashboard-redesign", label);
if (!path.resolve(outputRoot).startsWith(path.resolve(repositoryRoot, ".scratch") + path.sep)) throw new Error("Unsafe dashboard proof output path");
await fs.rm(outputRoot, { recursive: true, force: true });
await fs.mkdir(outputRoot, { recursive: true });

let browser;
let server;
try {
  await runManager("init", "--empty");
  await buildFixture();
  await runManager("sync");
  server = await serve(path.join(workspace, "prototypes"));
  browser = await chromium.launch({ headless: true, ...(chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  await page.goto(`${server.url}/index.html`, { waitUntil: "networkidle" });
  await page.locator("#library-insights > *").first().waitFor();
  assert.equal(await page.locator("#library-insights > *").count(), 4, "Library should expose four overview signals");
  assert.ok(await page.locator("svg.tabler-icon path").count() >= 30, "Pinned Tabler icon geometry should render inline");
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()), "#c5f36d", "Dashboard accent should use the shared lime token");
  assert.deepEqual(await visibleBorders(page, ".lab-shell *"), [], "Dashboard interface should use surface separation without visible borders");

  const initialCards = await page.locator(".artifact-card").count();
  await page.locator("#search-input").fill("signal");
  assert.ok(await page.locator(".artifact-card").count() < initialCards, "Library search should narrow the artifact catalog");
  await page.locator("#search-input").fill("");
  await page.locator("#group-select").selectOption("none");
  assert.match(await page.locator("#library-result-count").textContent(), /1 group/);
  await page.locator("#group-select").selectOption("day");

  const captures = [];
  for (const view of ["Library", "Comparisons", "Prompts", "Receipts", "Health"]) {
    await page.getByRole("tab", { name: view, exact: true }).click();
    await page.waitForTimeout(180);
    await assertActiveView(page, view);
    assert.equal(await page.locator("#quick-command").isVisible(), true, "Primary creation action should remain visible");
    await assertViewContent(page, view);
    await assertNoHorizontalOverflow(page, view, "1440x900");
    const file = path.join(outputRoot, `desktop-${view.toLowerCase()}.png`);
    await page.screenshot({ path: file });
    captures.push(file);
  }

  await page.setViewportSize({ width: 1024, height: 820 });
  for (const view of ["Library", "Comparisons", "Receipts"]) {
    await page.getByRole("tab", { name: view, exact: true }).click();
    await page.waitForTimeout(180);
    await assertActiveView(page, view);
    await assertNoHorizontalOverflow(page, view, "1024x820");
    const file = path.join(outputRoot, `tablet-${view.toLowerCase()}.png`);
    await page.screenshot({ path: file });
    captures.push(file);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const view of ["Library", "Comparisons", "Prompts", "Receipts", "Health"]) {
    await page.getByRole("tab", { name: view, exact: true }).click();
    await page.waitForTimeout(180);
    await assertActiveView(page, view);
    await assertNoHorizontalOverflow(page, view, "390x844");
    const file = path.join(outputRoot, `mobile-${view.toLowerCase()}.png`);
    await page.screenshot({ path: file, fullPage: true });
    captures.push(file);
  }

  await page.locator("#quick-command").click();
  await page.locator("#toast[data-visible='true']").waitFor();
  await page.getByRole("tab", { name: "Prompts", exact: true }).click();
  await page.locator(".copy-prompt").first().click();
  await page.locator("#toast[data-visible='true']").waitFor();
  await page.getByRole("tab", { name: "Health", exact: true }).click();
  await page.locator(".command-card button").first().click();
  await page.locator("#toast[data-visible='true']").waitFor();

  assert.deepEqual(errors, []);
  const result = { status: "passed", label, url: `${server.url}/index.html`, viewports: ["1440x900", "1024x820", "390x844"], captures, errors };
  await fs.writeFile(path.join(outputRoot, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.instance.close(resolve));
  await fs.rm(workspace, { recursive: true, force: true });
}

async function buildFixture() {
  const sourceRoot = path.join(repositoryRoot, "prototypes");
  const targetRoot = path.join(workspace, "prototypes");
  const metadataFiles = await findFiles(sourceRoot, "metadata.json");
  for (const source of metadataFiles) {
    const relativeFolder = path.relative(sourceRoot, path.dirname(source));
    const targetFolder = path.join(targetRoot, relativeFolder);
    await fs.mkdir(targetFolder, { recursive: true });
    const metadata = JSON.parse(await fs.readFile(source, "utf8"));
    if (metadata.artifactKind !== "comparison-hub") {
      const receiptId = `${String(metadata.slug || "prototype")}-run-01`;
      const receiptPath = `runs/${receiptId}.json`;
      const receipt = {
        schemaVersion: 3,
        runId: receiptId,
        variantId: metadata.slug || "single",
        stage: "build",
        status: "actual",
        dispatch: {
          workerId: `worker-${metadata.number || 1}`,
          agentTool: "agents.spawn_agent",
          isolation: { capability: "fresh-worker-no-inherited-history", adapter: "codex-fork-turns-none", inheritedHistory: false, coordinatorContextExposed: false, evidence: "fork_turns:none" },
          forkTurns: "none",
          assignmentSha256: "a".repeat(64),
          inputManifestSha256: "b".repeat(64)
        },
        execution: { requestedModel: metadata.modelExact || metadata.model || "model-test", effectiveModel: metadata.modelExact || metadata.model || "model-test", reasoning: "high", variantSkills: metadata.provenance?.skills || [] },
        context: { receivedOtherVariants: false, crossVariantLeakage: "self-reported-false" },
        assets: [{ path: "assets/sample.svg" }],
        artifacts: { finalPrototypePath: relativeFolder.replaceAll("\\", "/"), files: [{ path: "index.html" }, { path: "styles.css" }, { path: "app.js" }] },
        verification: [{ id: "desktop", status: "passed" }, { id: "mobile", status: "passed" }],
        usage: { inputTokens: 1840, outputTokens: 960, totalTokens: 2800, toolCalls: ["read", "apply_patch", "browser"] },
        summary: "Produced a portable interaction prototype and verified its primary path across desktop and mobile.",
        limitations: ["Runtime token attribution is fixture data for visual verification only."],
        fallbackReason: "not applicable"
      };
      await fs.mkdir(path.join(targetFolder, "runs"), { recursive: true });
      await fs.writeFile(path.join(targetFolder, ...receiptPath.split("/")), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
      metadata.runs = [{ id: receiptId, variantId: receipt.variantId, receipt: receiptPath, status: "actual" }];
    }
    await fs.writeFile(path.join(targetFolder, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    const config = path.join(path.dirname(source), "hub.config.json");
    if (await exists(config)) await fs.copyFile(config, path.join(targetFolder, "hub.config.json"));
    await fs.writeFile(path.join(targetFolder, "index.html"), `<!doctype html><html><body style="margin:0;background:#0b0d10;color:#eef0eb;font-family:system-ui;display:grid;place-items:center;min-height:100vh"><strong>${relativeFolder.replaceAll("\\", "/")}</strong></body></html>\n`, "utf8");
  }
  const sourcePrompts = path.join(sourceRoot, "prompts");
  const targetPrompts = path.join(targetRoot, "prompts");
  if (await exists(sourcePrompts)) await fs.cp(sourcePrompts, targetPrompts, { recursive: true, force: true });
}

async function findFiles(root, name, current = root, output = []) {
  const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "proof" || (current === root && entry.name === "prompts")) continue;
    const file = path.join(current, entry.name);
    if (entry.isDirectory()) await findFiles(root, name, file, output);
    else if (entry.isFile() && entry.name === name) output.push(file);
  }
  return output;
}

async function runManager(...args) {
  const { stdout } = await execFileAsync(process.execPath, [manager, ...args, "--workspace", workspace], { cwd: workspace, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(stdout);
}

async function serve(root) {
  const instance = http.createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname).replace(/^\/+/, "");
    const candidate = path.resolve(root, pathname || "index.html");
    if (!candidate.startsWith(path.resolve(root) + path.sep) && candidate !== path.resolve(root)) { response.writeHead(403).end("Forbidden"); return; }
    let file = candidate;
    const stat = await fs.stat(file).catch(() => null);
    if (stat?.isDirectory()) file = path.join(file, "index.html");
    const content = await fs.readFile(file).catch(() => null);
    if (!content) { response.writeHead(404).end("Not found"); return; }
    const type = ({ ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" })[path.extname(file)] || "application/octet-stream";
    response.writeHead(200, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" });
    response.end(content);
  });
  await new Promise((resolve) => instance.listen(0, "127.0.0.1", resolve));
  return { instance, url: `http://127.0.0.1:${instance.address().port}` };
}

function argument(name) {
  const inline = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.split("=").slice(1).join("=");
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function assertNoHorizontalOverflow(page, view, viewport) {
  const result = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth,
    width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    offenders: [...document.querySelectorAll("body *")].filter((node) => {
      const box = node.getBoundingClientRect();
      return box.right > window.innerWidth + 1 || box.left < -1;
    }).slice(0, 8).map((node) => ({ tag: node.tagName, className: node.className, left: Math.round(node.getBoundingClientRect().left), right: Math.round(node.getBoundingClientRect().right) }))
  }));
  assert.equal(result.overflow, false, `${view} has horizontal overflow at ${viewport}: ${JSON.stringify(result)}`);
}
async function visibleBorders(page, selector) {
  return page.evaluate((target) => [...document.querySelectorAll(target)].flatMap((node) => {
    const style = getComputedStyle(node);
    const widths = [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].map(Number.parseFloat);
    return widths.some((value) => value > 0) ? [`${node.tagName}.${node.className}`] : [];
  }).slice(0, 20), selector);
}
async function assertActiveView(page, label) {
  const tab = page.getByRole("tab", { name: label, exact: true });
  assert.equal(await tab.getAttribute("aria-selected"), "true", `${label} tab should be selected`);
  assert.equal(await page.locator(`.workspace-view[data-view='${label.toLowerCase()}']`).isVisible(), true, `${label} view should be visible`);
}
async function assertViewContent(page, label) {
  const expectations = {
    Library: [".artifact-card", ".artifact-title"],
    Comparisons: [".hub-list-item", ".variant-table"],
    Prompts: [".prompt-card", ".copy-prompt"],
    Receipts: [".receipt-list-item", ".task-receipt", ".receipt-gauge", ".receipt-barcode"],
    Health: [".health-row", ".command-card"]
  };
  for (const selector of expectations[label] || []) assert.ok(await page.locator(selector).count() > 0, `${label} should render ${selector}`);
}
async function exists(file) { return Boolean(await fs.stat(file).catch(() => null)); }
