#!/usr/bin/env node

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

if (!args.template || !args.vars || !args.output) {
  printHelp();
  throw new Error("--template, --vars, and --output are required");
}

const templatePath = path.resolve(args.template);
const variablesPath = path.resolve(args.vars);
const outputPath = path.resolve(args.output);
const template = await fs.readFile(templatePath, "utf8");
const variables = JSON.parse(await fs.readFile(variablesPath, "utf8"));

if (!variables || Array.isArray(variables) || typeof variables !== "object") {
  throw new Error("--vars must point to a JSON object");
}

const missing = new Set();
const used = new Set();
const rendered = template.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_, key) => {
  const value = getValue(variables, key);
  if (value === undefined || value === null) {
    missing.add(key);
    return `{{${key}}}`;
  }
  used.add(key);
  return formatValue(value);
});

if (missing.size) {
  throw new Error(`Missing template variables: ${[...missing].sort().join(", ")}`);
}

const unresolved = [...rendered.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((match) => match[1]);
if (unresolved.length) {
  throw new Error(`Unresolved placeholders: ${[...new Set(unresolved)].sort().join(", ")}`);
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, rendered, "utf8");

const sha256 = createHash("sha256").update(rendered).digest("hex");
const unusedTopLevelVariables = Object.keys(variables).filter((key) => {
  return ![...used].some((usedKey) => usedKey === key || usedKey.startsWith(`${key}.`));
});

console.log(JSON.stringify({
  template: templatePath,
  variables: variablesPath,
  output: outputPath,
  sha256,
  unusedTopLevelVariables
}, null, 2));

function getValue(source, key) {
  return key.split(".").reduce((value, part) => {
    if (value && typeof value === "object" && Object.hasOwn(value, part)) {
      return value[part];
    }
    return undefined;
  }, source);
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join("\n");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      parsed.help = true;
      continue;
    }
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const [name, inlineValue] = token.slice(2).split("=", 2);
    const value = inlineValue ?? argv[index + 1];
    if (inlineValue === undefined) index += 1;
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`);
    parsed[name] = value;
  }
  return parsed;
}

function printHelp() {
  console.log(`Render a reusable Prototype Lab prompt template.

Usage:
  node render-prompt-template.mjs --template <file> --vars <json> --output <file>

Template placeholders use {{variable}} or {{nested.variable}} syntax. Missing
variables fail the render. The command prints the exact rendered SHA-256 hash.`);
}
