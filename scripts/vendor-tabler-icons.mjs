import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputs = [
  path.join(root, "SKILLS", "prototype-lab", "assets", "prototype-index", "icons"),
  path.join(root, "SKILLS", "prototype-lab", "assets", "comparison-hub", "icons"),
  path.join(root, "SKILLS", "prototype-lab", "assets", "prototype-shell", "icons")
];
const version = "3.44.0";
const icons = [
  "activity-heartbeat",
  "alert-triangle",
  "archive",
  "arrow-down",
  "arrow-right",
  "arrow-up",
  "arrows-exchange",
  "box",
  "brain",
  "calendar",
  "chart-bar",
  "checklist",
  "chevron-down",
  "circle-check",
  "circle-x",
  "code",
  "columns-3",
  "copy",
  "cpu",
  "database",
  "device-desktop",
  "download",
  "external-link",
  "eye",
  "eye-off",
  "file-description",
  "file-search",
  "flask",
  "focus-2",
  "folder",
  "gauge",
  "hash",
  "info-circle",
  "layout-grid",
  "list-numbers",
  "notes",
  "plus",
  "receipt-2",
  "refresh",
  "robot",
  "route",
  "search",
  "shield-check",
  "sparkles",
  "stack-2",
  "terminal-2",
  "timeline-event",
  "tool",
  "trophy"
];

const registry = {};
const sourceSvgs = {};
for (const name of icons) {
  const url = `https://raw.githubusercontent.com/tabler/tabler-icons/v${version}/icons/outline/${name}.svg`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to download ${name}: ${response.status} ${response.statusText}`);
  const svg = await response.text();
  if (!svg.includes('viewBox="0 0 24 24"') || !svg.includes('stroke="currentColor"')) throw new Error(`Unexpected Tabler SVG payload for ${name}`);
  const body = svg.match(/<svg[\s\S]*?>([\s\S]*?)<\/svg>/)?.[1]?.trim();
  if (!body) throw new Error(`Unable to extract SVG body for ${name}`);
  registry[name] = body;
  sourceSvgs[name] = svg;
}

const licenseUrl = `https://raw.githubusercontent.com/tabler/tabler-icons/v${version}/LICENSE`;
const licenseResponse = await fetch(licenseUrl);
if (!licenseResponse.ok) throw new Error(`Unable to download Tabler license: ${licenseResponse.status}`);
const license = await licenseResponse.text();
const manifest = `${JSON.stringify({ package: "@tabler/icons", version, style: "outline", source: `https://github.com/tabler/tabler-icons/tree/v${version}/icons/outline`, icons }, null, 2)}\n`;
const registryScript = `window.PROTOTYPE_TABLER_ICONS = ${JSON.stringify(registry, null, 2)};\n`;
for (const output of outputs) {
  await fs.mkdir(output, { recursive: true });
  await Promise.all(icons.map(async (name) => {
    await fs.writeFile(path.join(output, `${name}.svg`), sourceSvgs[name], "utf8");
  }));
  await fs.writeFile(path.join(output, "LICENSE.tabler-icons"), license, "utf8");
  await fs.writeFile(path.join(output, "manifest.json"), manifest, "utf8");
  await fs.writeFile(path.join(output, "tabler-icons.js"), registryScript, "utf8");
}

console.log(`Vendored ${icons.length} Tabler Icons v${version} SVGs to ${outputs.length} runtime surfaces`);
