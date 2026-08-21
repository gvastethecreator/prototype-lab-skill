import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "README.md",
  "DESIGN.md",
  "LICENSE",
  "SECURITY.md",
  "SKILLS/README.md",
  "SKILLS/prototype-lab/SKILL.md",
  "SKILLS/prototype-lab/package-manifest.json",
  "SKILLS/prototype-lab/agents/openai.yaml",
  "SKILLS/prototype-lab/assets/prototype-shell/README.md",
  "SKILLS/prototype-lab/assets/prototype-shell/metadata.json",
  "SKILLS/prototype-lab/assets/prototype-shell/index.html",
  "SKILLS/prototype-lab/assets/prototype-shell/styles.css",
  "SKILLS/prototype-lab/assets/prototype-shell/app.js",
  "SKILLS/prototype-lab/assets/prototype-shell/artifact-data.js",
  "SKILLS/prototype-lab/assets/prototype-shell/icons/manifest.json",
  "SKILLS/prototype-lab/assets/prototype-shell/icons/tabler-icons.js",
  "SKILLS/prototype-lab/assets/prototype-blank/index.html",
  "SKILLS/prototype-lab/assets/prototype-blank/styles.css",
  "SKILLS/prototype-lab/assets/prototype-blank/app.js",
  "SKILLS/prototype-lab/assets/prototype-blank/artifact-data.js",
  "SKILLS/prototype-lab/assets/prototype-mobile/index.html",
  "SKILLS/prototype-lab/assets/prototype-mobile/styles.css",
  "SKILLS/prototype-lab/assets/prototype-mobile/app.js",
  "SKILLS/prototype-lab/assets/prototype-mobile/artifact-data.js",
  "SKILLS/prototype-lab/assets/prototype-canvas/index.html",
  "SKILLS/prototype-lab/assets/prototype-canvas/styles.css",
  "SKILLS/prototype-lab/assets/prototype-canvas/app.js",
  "SKILLS/prototype-lab/assets/prototype-canvas/artifact-data.js",
  "SKILLS/prototype-lab/assets/prototype-index/README.md",
  "SKILLS/prototype-lab/assets/prototype-index/index.html",
  "SKILLS/prototype-lab/assets/prototype-index/prototype-index.css",
  "SKILLS/prototype-lab/assets/prototype-index/prototype-index.js",
  "SKILLS/prototype-lab/assets/prototype-index/icons/README.md",
  "SKILLS/prototype-lab/assets/prototype-index/icons/LICENSE.tabler-icons",
  "SKILLS/prototype-lab/assets/prototype-index/icons/manifest.json",
  "SKILLS/prototype-lab/assets/prototype-index/icons/tabler-icons.js",
  "SKILLS/prototype-lab/assets/comparison-hub/index.html",
  "SKILLS/prototype-lab/assets/comparison-hub/hub.css",
  "SKILLS/prototype-lab/assets/comparison-hub/hub.js",
  "SKILLS/prototype-lab/assets/comparison-hub/hub-data.js",
  "SKILLS/prototype-lab/assets/comparison-hub/icons/manifest.json",
  "SKILLS/prototype-lab/assets/comparison-hub/icons/tabler-icons.js",
  "SKILLS/prototype-lab/assets/portable-lab/prompt.template.md",
  "SKILLS/prototype-lab/assets/portable-lab/prompt.vars.json",
  "SKILLS/prototype-lab/assets/portable-lab/run-receipt.json",
  "SKILLS/prototype-lab/assets/prompt-library/README.md",
  "SKILLS/prototype-lab/assets/prompt-library/prompt-meta.json",
  "SKILLS/prototype-lab/assets/prompt-library/creative-test-suite.json",
  "SKILLS/prototype-lab/assets/vary-card/vary-card.js",
  "SKILLS/prototype-lab/references/product-design-loop.md",
  "SKILLS/prototype-lab/references/design-rounds.md",
  "SKILLS/prototype-lab/references/capability-comparisons.md",
  "SKILLS/prototype-lab/references/quality-bar.md",
  "SKILLS/prototype-lab/references/taste-calibration.md",
  "SKILLS/prototype-lab/references/variant-comparison.md",
  "SKILLS/prototype-lab/references/agent-isolation.md",
  "SKILLS/prototype-lab/references/prompt-templates.md",
  "SKILLS/prototype-lab/references/portable-run-pack.md",
  "SKILLS/prototype-lab/references/workspace-and-hub.md",
  "SKILLS/prototype-lab/scripts/render-prompt-template.mjs",
  "SKILLS/prototype-lab/scripts/package-prototype-lab.mjs",
  "SKILLS/prototype-lab/scripts/reorganize-prototype-library.mjs",
  "SKILLS/prototype-lab/scripts/package-comparison-hubs.mjs",
  "SKILLS/prototype-lab/scripts/manage-prompt-library.mjs",
  "SKILLS/prototype-lab/scripts/manage-prototype-lab.mjs",
  "SKILLS/prototype-lab/scripts/worker-isolation.mjs",
  "SKILLS/prototype-lab/scripts/verify-prototype-lab.mjs",
  "SKILLS/prototype-lab/scripts/build-prototype-index.mjs",
  "scripts/reorganize-prototype-library.mjs",
  "scripts/package-comparison-hubs.mjs",
  "scripts/manage-prompt-library.mjs",
  "scripts/manage-prototype-lab.mjs",
  "scripts/verify-prototype-lab.mjs",
  "scripts/test-portable-tools.mjs",
  "scripts/test-lab-daily-workflow.mjs",
  "scripts/test-vary-round.mjs",
  "scripts/test-hub-ui.mjs",
  "scripts/test-dashboard-ui.mjs",
  "scripts/test-scaffold-ui.mjs",
  "scripts/vendor-tabler-icons.mjs",
  "scripts/verify-published-package.mjs",
  "assets/readme-banner.png",
];

const publicDocs = [
  "README.md",
  "SKILLS/README.md",
  "SECURITY.md",
];

const errors = [];

async function main() {
  await checkRequiredFiles();
  await checkNoLinkedSkillFolders();
  await checkSkillFrontmatter();
  await checkMetadataJson();
  await checkPromptLibraryAssets();
  await checkTablerIconAssets();
  await checkPublicDocs();
  await checkLocalPathLeaks();

  if (errors.length) {
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("prototype-lab-skill validation ok");
}

async function checkRequiredFiles() {
  for (const file of requiredFiles) {
    const absolute = path.join(root, file);
    const stat = await fs.stat(absolute).catch(() => null);
    if (!stat?.isFile()) errors.push(`missing required file: ${file}`);
  }
}

async function checkNoLinkedSkillFolders() {
  const skillRoot = path.join(root, "SKILLS", "prototype-lab");
  const entries = [skillRoot, ...(await walk(skillRoot))];
  for (const file of entries) {
    const stat = await fs.lstat(file).catch(() => null);
    if (stat?.isSymbolicLink()) {
      errors.push(`linked path is not public-repo safe: ${relative(file)}`);
    }
  }
}

async function checkSkillFrontmatter() {
  const file = path.join(root, "SKILLS", "prototype-lab", "SKILL.md");
  const content = await readText(file);
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    errors.push("SKILL.md missing YAML frontmatter");
    return;
  }
  const frontmatter = match[1];
  if (!/^name:\s*prototype-lab\s*$/m.test(frontmatter)) {
    errors.push("SKILL.md frontmatter missing name: prototype-lab");
  }
  if (!/^description:\s*".+"/m.test(frontmatter)) {
    errors.push("SKILL.md frontmatter needs a quoted description");
  }
  if (!/prototypes\/<YYYY>\/<MM>\/<NNN>-<(?:prototype-)?slug>\//.test(content)) {
    errors.push("SKILL.md missing canonical chronological layout contract");
  }
  if (!content.includes("metadata.json")) {
    errors.push("SKILL.md missing metadata contract");
  }
  if (!content.includes("references/agent-isolation.md")) {
    errors.push("SKILL.md missing agent isolation reference");
  }
  if (!content.includes("references/prompt-templates.md")) {
    errors.push("SKILL.md missing reusable prompt template reference");
  }
  if (!content.includes("references/portable-run-pack.md")) {
    errors.push("SKILL.md missing portable run pack reference");
  }
  if (!content.includes("scripts/package-prototype-lab.mjs")) {
    errors.push("SKILL.md missing portable package command");
  }
  if (!content.includes("scripts/manage-prototype-lab.mjs") || !content.includes("hub.config.json")) {
    errors.push("SKILL.md missing unified workspace and managed hub contract");
  }
  if (!content.includes("references/capability-comparisons.md") || !/\bexperiment\b/.test(content) || !/\bpreflight\b/.test(content)) {
    errors.push("SKILL.md missing capability comparison spend gate");
  }
  if (!content.includes("fresh worker with no inherited history")) {
    errors.push("SKILL.md missing portable fresh-worker isolation contract");
  }
  if (!content.includes("codex-fork-turns-none") || !content.includes("dedicated-cli-clean-session")) {
    errors.push("SKILL.md missing documented host isolation adapters");
  }
  if (!/default\s+`?blank`?\s+scaffold/i.test(content) || !content.includes("assets/prototype-blank/")) {
    errors.push("SKILL.md missing neutral blank scaffold default");
  }
  if (!content.includes("prototypes/prompts/") || !content.includes("scripts/manage-prompt-library.mjs")) {
    errors.push("SKILL.md missing workspace prompt library contract");
  }
  for (const command of ["quick", "vary", "compare", "materialize", "verify", "finalize", "review", "ship"]) {
    if (!new RegExp(`\\b${command}\\b`).test(content)) errors.push(`SKILL.md missing ${command} route`);
  }
  if (!content.includes("scripts/verify-prototype-lab.mjs") && !content.includes("verify --id")) {
    errors.push("SKILL.md missing reusable verification contract");
  }
  if (!/orchestrator.{0,24}review/i.test(content)) {
    errors.push("SKILL.md missing orchestrator review handoff");
  }
  if (!/ChatGPT Sites/i.test(content)) {
    errors.push("SKILL.md missing ChatGPT Sites publication handoff");
  }
  if (!/integrity contract/i.test(content)) {
    errors.push("SKILL.md missing comparison integrity contract");
  }
  if (!/worker receipt/i.test(content)) {
    errors.push("SKILL.md missing worker receipt requirement");
  }
  if (!/cross-variant leakage/i.test(content)) {
    errors.push("SKILL.md missing cross-variant leakage check");
  }
}

async function checkPromptLibraryAssets() {
  const suiteFile = path.join(root, "SKILLS", "prototype-lab", "assets", "prompt-library", "creative-test-suite.json");
  const suite = JSON.parse(await readText(suiteFile));
  if (!Array.isArray(suite.prompts) || suite.prompts.length !== 8) {
    errors.push("creative prompt suite must contain exactly 8 prompts");
    return;
  }
  const ids = new Set();
  for (const prompt of suite.prompts) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(prompt.id || "")) errors.push(`invalid creative prompt id: ${prompt.id ?? "missing"}`);
    if (ids.has(prompt.id)) errors.push(`duplicate creative prompt id: ${prompt.id}`);
    ids.add(prompt.id);
    for (const key of ["title", "category", "difficulty", "challenge"]) {
      if (!prompt[key] || typeof prompt[key] !== "string") errors.push(`creative prompt ${prompt.id} missing ${key}`);
    }
    if (prompt.comparisonIntent !== "showcase" || prompt.creativeFreedom !== "high") errors.push(`creative prompt ${prompt.id} must be a high-freedom showcase`);
    if (!Array.isArray(prompt.fixedOutcomes) || prompt.fixedOutcomes.length < 1 || prompt.fixedOutcomes.length > 5) errors.push(`creative prompt ${prompt.id} needs 1-5 fixedOutcomes`);
    if (!Array.isArray(prompt.openDecisions) || prompt.openDecisions.length < 6) errors.push(`creative prompt ${prompt.id} needs at least 6 openDecisions`);
    if (!prompt.assetPolicy || !["required", "fixed-supplied", "allowed", "forbidden", "worker-choice"].includes(prompt.assetPolicy.mode)) errors.push(`creative prompt ${prompt.id} has invalid assetPolicy`);
    if (!prompt.layoutPolicy || !["open", "page-scroll", "app-shell", "immersive-stage"].includes(prompt.layoutPolicy)) errors.push(`creative prompt ${prompt.id} has invalid layoutPolicy`);
    for (const [key, minimum] of [["requiredBehaviors", 3], ["testDimensions", 4], ["targetViewports", 2]]) {
      if (!Array.isArray(prompt[key]) || prompt[key].length < minimum) errors.push(`creative prompt ${prompt.id} needs at least ${minimum} ${key}`);
    }
  }
}

async function checkTablerIconAssets() {
  const iconRoot = path.join(root, "SKILLS", "prototype-lab", "assets", "prototype-index", "icons");
  const manifest = JSON.parse(await readText(path.join(iconRoot, "manifest.json")));
  if (manifest.package !== "@tabler/icons" || manifest.style !== "outline" || !/^\d+\.\d+\.\d+$/.test(manifest.version || "")) {
    errors.push("Tabler icon manifest must pin an outline package version");
    return;
  }
  if (!Array.isArray(manifest.icons) || manifest.icons.length < 40) errors.push("Tabler icon manifest must list the complete cross-surface set");
  for (const surface of ["comparison-hub", "prototype-shell"]) {
    const surfaceManifest = JSON.parse(await readText(path.join(root, "SKILLS", "prototype-lab", "assets", surface, "icons", "manifest.json")));
    if (JSON.stringify(surfaceManifest) !== JSON.stringify(manifest)) errors.push(`${surface} must use the same pinned Tabler icon manifest as the dashboard`);
  }
  const registry = await readText(path.join(iconRoot, "tabler-icons.js"));
  for (const name of manifest.icons || []) {
    const svg = await readText(path.join(iconRoot, `${name}.svg`));
    if (!svg.includes('viewBox="0 0 24 24"') || !svg.includes('stroke="currentColor"') || !svg.includes('stroke-width="2"')) errors.push(`invalid Tabler outline SVG: ${name}`);
    if (!registry.includes(`"${name}"`)) errors.push(`Tabler registry missing icon: ${name}`);
  }
}

async function checkMetadataJson() {
  const file = path.join(root, "SKILLS", "prototype-lab", "assets", "prototype-shell", "metadata.json");
  const raw = await readText(file);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    errors.push(`metadata.json invalid JSON: ${error.message}`);
    return;
  }
  for (const key of ["schemaVersion", "artifactKind", "entrypoint", "id", "title", "status", "date", "mode", "question", "model", "modelExact", "promptTemplates", "runs", "views", "proof", "runtimeLayout", "provenance", "packaging"]) {
    if (!(key in parsed)) errors.push(`metadata.json missing key: ${key}`);
  }
  if (!Array.isArray(parsed.promptTemplates)) {
    errors.push("metadata.json promptTemplates must be an array");
  }
  if (!Array.isArray(parsed.runs)) {
    errors.push("metadata.json runs must be an array");
  }
  if (parsed.entrypoint !== "index.html") {
    errors.push("metadata.json entrypoint must be index.html");
  }
  if (!parsed.packaging?.defaultProofPolicy) {
    errors.push("metadata.json packaging missing defaultProofPolicy");
  }
  if (parsed.artifactKind !== "prototype" || parsed.mode !== "single") errors.push("prototype shell metadata must describe one standalone artifact");
  if (!Array.isArray(parsed.provenance?.skills) || !Array.isArray(parsed.provenance?.models)) errors.push("metadata.json provenance missing skills/models arrays");
}

async function checkPublicDocs() {
  for (const file of publicDocs) {
    const content = await readText(path.join(root, file));
    if (/shared shell/i.test(content)) errors.push(`${file} still says shared shell`);
    if (/prototypes\/categories\/<domain>\/<slug>/i.test(content)) {
      errors.push(`${file} still advertises legacy category layout`);
    }
  }
}

async function checkLocalPathLeaks() {
  const textFiles = (await walk(root)).filter((file) => /\.(md|json|ya?ml|mjs|js|css|html|txt|gitignore|gitattributes)$/i.test(file));
  const localMarkers = [
    "[A-Z]:\\\\",
    "/" + "Users" + "/",
    "/" + "home" + "/",
    "agents-" + "matrix\\b",
  ];
  const localPathPattern = new RegExp(`\\b(?:${localMarkers.join("|")})`, "i");
  for (const file of textFiles) {
    if (file.includes(`${path.sep}.git${path.sep}`)) continue;
    const content = await readText(file);
    if (localPathPattern.test(content)) {
      errors.push(`possible local path leak: ${relative(file)}`);
    }
  }
}

async function walk(dir, output = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if ([".git", ".local", ".scratch", ".vscode", "node_modules", "dist", "coverage", "prototypes"].includes(entry.name)) {
      continue;
    }
    const absolute = path.join(dir, entry.name);
    output.push(absolute);
    if (entry.isDirectory()) await walk(absolute, output);
  }
  return output;
}

async function readText(file) {
  return fs.readFile(file, "utf8").catch(() => "");
}

function relative(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
