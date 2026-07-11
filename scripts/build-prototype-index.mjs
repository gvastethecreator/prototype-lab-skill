#!/usr/bin/env node

import { buildPrototypeIndex } from "../SKILLS/prototype-lab/scripts/build-prototype-index.mjs";

const { outputFile, payload } = await buildPrototypeIndex({ workspace: process.cwd() });
console.log(`Wrote ${outputFile.replaceAll("\\", "/")}`);
console.log(`Indexed ${payload.summary.prototypes} prototypes, ${payload.summary.hubs} hubs, ${payload.summary.prompts} prompts, and ${payload.summary.issues} issues.`);
