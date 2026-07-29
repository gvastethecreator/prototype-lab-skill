import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manager = path.join(repositoryRoot, "SKILLS", "prototype-lab", "scripts", "manage-prototype-lab.mjs");
const playwrightRoot = process.env.PROTOTYPE_LAB_PLAYWRIGHT_ROOT;
if (!playwrightRoot) throw new Error("Set PROTOTYPE_LAB_PLAYWRIGHT_ROOT to the Playwright package directory.");
const playwrightModule = await import(pathToFileURL(path.join(playwrightRoot, "index.js")).href);
const { chromium } = playwrightModule.default || playwrightModule;
const chromiumExecutablePath = process.env.PROTOTYPE_LAB_CHROMIUM_EXECUTABLE_PATH;
const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "prototype-lab-ui-"));
const proofRoot = path.join(repositoryRoot, ".scratch", "prototype-lab-ui-proof");
if (!path.resolve(proofRoot).startsWith(path.resolve(repositoryRoot, ".scratch") + path.sep)) throw new Error("Unsafe proof output path");
await fs.rm(proofRoot, { recursive: true, force: true });
await fs.mkdir(proofRoot, { recursive: true });

let server;
let browser;
try {
  await run("init", "--empty");
  const alpha = await run("quick", "--title", "Signal board", "--question", "Which direction communicates state faster?", "--profile", "tool", "--model", "model-alpha");
  const beta = await run("quick", "--title", "Pulse canvas", "--question", "Which direction communicates state faster?", "--profile", "canvas", "--model", "model-beta");
  await writeFixture(alpha.id, "Signal board", "#c5f36d", "Structured controls", "A compact operational surface with explicit state.");
  await writeFixture(beta.id, "Pulse canvas", "#ff6d5a", "Immersive signal", "A visual stage with one direct interaction target.");
  const hub = await run("compare", "--title", "Signal direction review", "--variants", `${alpha.id},${beta.id}`, "--dimension", "design", "--criteria", "state clarity,interaction confidence,responsive fit", "--modes", "compare,focus,blind,rank,iterations,review,archive");
  const initialized = await run("review", "--id", hub.id, "--init");
  const reportFile = path.join(workspace, ...initialized.template.split("/"));
  const report = JSON.parse(await fs.readFile(reportFile, "utf8"));
  report.summary = "Both variants are functional; Signal board exposes state more directly while Pulse canvas creates a stronger first impression.";
  report.recommendation = "Use Signal board for task completion and carry Pulse canvas motion into its focused state.";
  report.confidence = "high";
  report.criteria = report.criteria.map((item) => ({ ...item, assessment: `Reviewed ${item.criterion} in both rendered variants.`, evidence: ["browser/desktop-review.png"], verdict: "pass" }));
  report.variants = report.variants.map((item, index) => ({ ...item, strengths: [index ? "Distinctive focal state" : "Immediate state visibility"], weaknesses: [index ? "Less explicit controls" : "Lower visual drama"], evidence: ["browser/desktop-review.png"], verdict: index ? "strong-alternative" : "recommended" }));
  report.comparativeFindings = ["The strongest final direction combines explicit state with one meaningful motion cue."];
  report.caveats = ["This review validates the comparison shell, not production performance."];
  report.nextSteps = ["Prototype the combined focused state before implementation."];
  await fs.writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await run("review", "--id", hub.id, "--report", path.relative(workspace, reportFile));

  server = await serve(path.join(workspace, "prototypes"));
  browser = await chromium.launch({ headless: true, ...(chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1200, height: 820 }, reducedMotion: "reduce" });
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  const hubPath = `${hub.id}/index.html`;
  await page.goto(`${server.url}/${hubPath}`, { waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()), "#c5f36d");
  assert.deepEqual(await visibleBorders(page, ".hub-shell *"), []);
  assert.equal(await page.locator("#hub-nav .tabler-icon").count(), 9, "Every hub view should expose a Tabler icon");

  await page.getByRole("button", { name: "Blind" }).click();
  await page.getByRole("heading", { name: "Variant A", exact: true }).waitFor();
  await page.getByRole("button", { name: "Reveal sources" }).click();
  await page.locator("#view-blind").getByRole("heading", { name: "Signal board", exact: true }).waitFor();
  await page.getByRole("button", { name: "Rank" }).click();
  await page.getByLabel("Review notes").fill("Pulse canvas first; Signal board supplies explicit controls.");
  await page.locator("#view-rank .ranking-row").first().getByRole("button", { name: /Move Signal board down/ }).click();
  await page.locator("#view-rank .ranking-row").first().getByText("Pulse canvas", { exact: true }).waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export review" }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /\.review\.json$/);
  await page.getByRole("button", { name: "Orchestrator review" }).click();
  await page.getByText("Use Signal board for task completion", { exact: false }).waitFor();
  assert.equal(await horizontalOverflow(page), false);
  await page.screenshot({ path: path.join(proofRoot, "desktop-review.png"), fullPage: true });
  await page.getByRole("button", { name: "Provenance" }).click();
  await page.locator(".receipt-card").first().waitFor();
  assert.ok(await page.locator(".receipt-card .tabler-icon").count() >= 7, "Receipt cards should use local Tabler icons");
  await page.screenshot({ path: path.join(proofRoot, "desktop-provenance.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Rank" }).click();
  await page.getByLabel("Review notes").waitFor();
  await page.locator("#view-rank .ranking-row").first().getByText("Pulse canvas", { exact: true }).waitFor();
  assert.equal(await horizontalOverflow(page), false);
  await page.screenshot({ path: path.join(proofRoot, "mobile-rank.png"), fullPage: true });
  assert.deepEqual(errors, []);

  await fs.writeFile(path.join(proofRoot, "browser-result.json"), `${JSON.stringify({ status: "passed", url: `${server.url}/${hubPath}`, viewports: ["1200x820", "390x844"], interactions: ["blind reveal", "ranking notes", "orchestrator review", "provenance receipts"], errors }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ status: "passed", hubId: hub.id, proofRoot, screenshots: [path.join(proofRoot, "desktop-review.png"), path.join(proofRoot, "desktop-provenance.png"), path.join(proofRoot, "mobile-rank.png")] }, null, 2));
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.instance.close(resolve));
  await fs.rm(workspace, { recursive: true, force: true });
}

async function writeFixture(id, title, accent, eyebrow, copy) {
  const folder = path.join(workspace, "prototypes", ...id.split("/"));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100dvh;background:#0b0d10;color:#f4f5ef;font-family:system-ui;display:grid;place-items:center;padding:24px}.stage{width:min(760px,100%);border:1px solid #ffffff18;border-radius:16px;background:#14171c;padding:24px}.eyebrow{color:${accent};font-size:12px;text-transform:uppercase;letter-spacing:.12em}h1{font-size:clamp(32px,7vw,72px);margin:18px 0 8px}p{color:#a9aca7;max-width:48ch;line-height:1.5}.signal{height:8px;background:${accent};width:68%;margin-top:28px}</style></head><body><main class="stage"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${copy}</p><div class="signal"></div></main></body></html>\n`;
  await fs.writeFile(path.join(folder, "index.html"), html, "utf8");
}

async function run(...args) {
  const { stdout } = await execFileAsync(process.execPath, [manager, ...args, "--workspace", workspace], { cwd: workspace, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(stdout);
}

async function horizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth);
}

async function visibleBorders(page, selector) {
  return page.evaluate((target) => [...document.querySelectorAll(target)].flatMap((node) => {
    const style = getComputedStyle(node);
    const widths = [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].map(Number.parseFloat);
    return widths.some((value) => value > 0) ? [`${node.tagName}.${node.className}`] : [];
  }).slice(0, 20), selector);
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
  const address = instance.address();
  return { instance, url: `http://127.0.0.1:${address.port}` };
}
