import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "SKILLS/README.md",
  "SKILLS/prototype-lab/SKILL.md",
  "SKILLS/prototype-lab/agents/openai.yaml",
  "SKILLS/prototype-lab/assets/prototype-shell/README.md",
  "SKILLS/prototype-lab/assets/prototype-shell/metadata.json",
  "SKILLS/prototype-lab/assets/prototype-shell/index.html",
  "SKILLS/prototype-lab/assets/prototype-shell/styles.css",
  "SKILLS/prototype-lab/assets/prototype-shell/app.js",
  "SKILLS/prototype-lab/assets/prototype-index/README.md",
  "SKILLS/prototype-lab/assets/prototype-index/index.html",
  "SKILLS/prototype-lab/assets/prototype-index/prototype-index.css",
  "SKILLS/prototype-lab/assets/prototype-index/prototype-index.js",
  "SKILLS/prototype-lab/references/product-design-loop.md",
  "SKILLS/prototype-lab/references/quality-bar.md",
  "SKILLS/prototype-lab/references/taste-calibration.md",
  "SKILLS/prototype-lab/references/variant-comparison.md",
  "SKILLS/prototype-lab/references/agent-isolation.md",
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
  if (!content.includes("prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/")) {
    errors.push("SKILL.md missing canonical chronological layout contract");
  }
  if (!content.includes("metadata.json")) {
    errors.push("SKILL.md missing metadata contract");
  }
  if (!content.includes("references/agent-isolation.md")) {
    errors.push("SKILL.md missing agent isolation reference");
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
  for (const key of ["id", "month", "number", "slug", "title", "category", "status", "date", "mode", "question", "details", "comparisonMethods", "provenance", "variants"]) {
    if (!(key in parsed)) errors.push(`metadata.json missing key: ${key}`);
  }
  if (!Array.isArray(parsed.provenance?.agentRuns)) {
    errors.push("metadata.json provenance missing agentRuns array");
  }
  if (!parsed.provenance?.integrity) {
    errors.push("metadata.json provenance missing integrity contract");
  }
  if (!("crossVariantLeakage" in (parsed.provenance?.integrity ?? {}))) {
    errors.push("metadata.json integrity missing crossVariantLeakage");
  }
  for (const run of parsed.provenance?.agentRuns ?? []) {
    for (const key of ["inputScope", "receivedOtherVariants", "editedFinalPrototype"]) {
      if (!(key in run)) errors.push(`metadata.json agentRun missing ${key}: ${run.variantId ?? "unknown"}`);
    }
  }
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
    if ([".git", ".local", ".scratch", ".vscode", "node_modules", "dist", "coverage"].includes(entry.name)) {
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
