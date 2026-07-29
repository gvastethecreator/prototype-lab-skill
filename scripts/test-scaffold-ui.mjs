import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const playwrightRoot = process.env.PROTOTYPE_LAB_PLAYWRIGHT_ROOT;
if (!playwrightRoot) throw new Error("Set PROTOTYPE_LAB_PLAYWRIGHT_ROOT to the Playwright package directory.");
const playwrightModule = await import(pathToFileURL(path.join(playwrightRoot, "index.js")).href);
const { chromium } = playwrightModule.default || playwrightModule;
const chromiumExecutablePath = process.env.PROTOTYPE_LAB_CHROMIUM_EXECUTABLE_PATH;
const proofRoot = path.join(repositoryRoot, ".scratch", "scaffold-ui-proof");
if (!path.resolve(proofRoot).startsWith(path.resolve(repositoryRoot, ".scratch") + path.sep)) throw new Error("Unsafe proof output path");
await fs.rm(proofRoot, { recursive: true, force: true });
await fs.mkdir(proofRoot, { recursive: true });

const assets = "SKILLS/prototype-lab/assets";
const captures = [];
const errors = [];
let browser;
let server;

try {
  server = await serve(repositoryRoot);
  browser = await chromium.launch({ headless: true, ...(chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {}) });

  const tool = await browser.newPage({ viewport: { width: 1200, height: 820 }, reducedMotion: "reduce" });
  collectErrors(tool, errors, "tool");
  await tool.goto(`${server.url}/${assets}/prototype-shell/index.html`, { waitUntil: "networkidle" });
  await tool.getByRole("button", { name: "States" }).click();
  await tool.locator(".state-card").first().waitFor();
  assert.ok(await tool.locator(".artifact-shell .tabler-icon").count() >= 10, "Tool shell should render local Tabler icons across navigation, actions, and states");
  assert.equal(await accent(tool), "#c5f36d");
  assert.deepEqual(await visibleBorders(tool, ".artifact-shell *"), []);
  await assertNoOverflow(tool, "tool desktop");
  captures.push(await capture(tool, "tool-desktop.png"));

  await tool.setViewportSize({ width: 390, height: 844 });
  await tool.getByRole("button", { name: "Brief" }).click();
  await tool.locator("#view-brief[data-active='true']").waitFor();
  await assertNoOverflow(tool, "tool mobile");
  captures.push(await capture(tool, "tool-mobile.png", true));
  await tool.close();

  const profiles = [
    { id: "blank", path: "prototype-blank/index.html", root: "#app", viewport: { width: 1200, height: 820 } },
    { id: "mobile", path: "prototype-mobile/index.html", root: "#app", viewport: { width: 390, height: 844 } },
    { id: "canvas", path: "prototype-canvas/index.html", root: "#prototype-canvas", viewport: { width: 1200, height: 820 } }
  ];

  for (const profile of profiles) {
    const page = await browser.newPage({ viewport: profile.viewport, reducedMotion: "reduce" });
    collectErrors(page, errors, profile.id);
    await page.goto(`${server.url}/${assets}/${profile.path}`, { waitUntil: "networkidle" });
    await page.locator(profile.root).waitFor();
    await assertNoOverflow(page, profile.id);
    assert.ok(["rgb(0, 0, 0)", "rgb(8, 8, 8)"].includes(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)), `${profile.id} should use the shared black foundation`);
    captures.push(await capture(page, `${profile.id}.png`, profile.viewport.width < 600));
    await page.close();
  }

  assert.deepEqual(errors, []);
  const result = { status: "passed", viewports: ["1200x820", "390x844"], assets: ["tool", "blank", "mobile", "canvas"], captures, errors };
  await fs.writeFile(path.join(proofRoot, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.instance.close(resolve));
}

function collectErrors(page, output, label) {
  page.on("console", (message) => { if (message.type() === "error") output.push(`${label} console: ${message.text()}`); });
  page.on("pageerror", (error) => output.push(`${label} page: ${error.message}`));
}

async function accent(page) { return page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()); }
async function visibleBorders(page, selector) {
  return page.evaluate((target) => [...document.querySelectorAll(target)].flatMap((node) => {
    const style = getComputedStyle(node);
    return [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].some((value) => Number.parseFloat(value) > 0) ? [`${node.tagName}.${node.className}`] : [];
  }).slice(0, 20), selector);
}
async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth);
  assert.equal(overflow, false, `${label} has horizontal overflow`);
}
async function capture(page, name, fullPage = false) {
  const file = path.join(proofRoot, name);
  await page.screenshot({ path: file, fullPage });
  return file;
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
