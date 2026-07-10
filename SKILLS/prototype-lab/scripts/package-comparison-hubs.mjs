import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const args = parseArgs(process.argv.slice(2));
const workspace = path.resolve(args.workspace || process.cwd());
const prototypesRoot = path.join(workspace, "prototypes");
const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const packager = path.join(scriptRoot, "package-prototype-lab.mjs");
const metadataFiles = await findMetadataFiles(prototypesRoot);
const hubIds = [];

for (const file of metadataFiles) {
  const metadata = JSON.parse(await fs.readFile(file, "utf8"));
  if (/comparison/i.test(metadata.mode || "")) hubIds.push(metadata.id || toPosix(path.relative(prototypesRoot, path.dirname(file))));
}

const packs = [];
for (const id of hubIds.sort()) {
  const commandArgs = [packager, "--workspace", workspace, "--id", id];
  if (args["include-proof"]) commandArgs.push("--include-proof");
  const result = await execFileAsync(process.execPath, commandArgs, { cwd: workspace, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  packs.push(JSON.parse(result.stdout));
}

console.log(JSON.stringify({ comparisonHubs: hubIds.length, packs }, null, 2));

async function findMetadataFiles(current, output = []) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) await findMetadataFiles(absolute, output);
    else if (entry.isFile() && entry.name === "metadata.json") output.push(absolute);
  }
  return output;
}

function toPosix(value) {
  return value.replaceAll("\\", "/");
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--include-proof") {
      parsed["include-proof"] = true;
      continue;
    }
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const [name, inlineValue] = token.slice(2).split("=", 2);
    const value = inlineValue ?? argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`);
    parsed[name] = value;
  }
  return parsed;
}
