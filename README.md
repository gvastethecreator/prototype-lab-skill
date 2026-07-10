# Prototype Lab

![Prototype Lab banner](./assets/readme-banner.png)

Codex skill pack for organized, standalone browser/UI prototypes with reusable prompt templates, portable run packs, compact interaction shells, isolated multi-variant comparison labs, attribution integrity, and screenshot-backed proof.

Prototype Lab gives Codex a repeatable organization contract for prototype work: chronological folders, local runtime files, versioned prompt templates, exact rendered prompt hashes, run receipts, a structural full-screen shell, comparison views for variants/models/skills, isolated worker execution, an optional evidence-browser landing, local proof, and a deterministic static-folder/ZIP handoff. It is meant for teams that use prototypes as working evidence, not loose mockups.

## Quick Start

Install with the Skills CLI:

```powershell
npx skills add gvastethecreator/prototype-lab-skill
```

Then ask Codex to use `prototype-lab` when creating or improving browser/UI prototypes.

## Usage

Example request:

```text
Use prototype-lab to create a standalone browser prototype for a prototype browser calendar view.
```

Comparison request:

```text
Use prototype-lab to create four mobile music-player variants from the same prompt, each attributed to a different model, skill, or approach, with compare and focus views.
```

For requests like this, the skill treats Codex as the coordinator and attempts one isolated worker per requested variant by default. The coordinator freezes one shared brief, locks the comparison dimension, blocks cross-variant inputs, and requires a worker receipt or captured output path before calling a variant independently generated. Worker outputs should land in scratch/temp space first, then the coordinator integrates them into a single comparison shell. If isolated workers are blocked, the prototype must still keep the requested variants, record `single-agent-fallback`, and include an exact fallback reason instead of pretending the variants were independently generated.

Comparison labs can expose several review methods: gallery/all-up compare for broad scans, pairwise compare with shareable left/right selections, blind guess/reveal for less biased taste checks, rankings with notes, repeated iterations under the same prompt, and archive toggles for stale variants. Use only the methods that help the decision.

The skill directs new prototypes into this shape:

```text
prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/
  metadata.json
  README.md
  index.html
  styles.css
  app.js
  assets/
  proof/
```

Category, model, tags, status, details, views, and proof live in `metadata.json`. Each prototype keeps its runtime local; it should not depend on shared components or sibling prototype code.

When a workspace has several prototypes and no index, the skill can create `prototypes/index.html` as a static evidence browser with scaled iframe previews, compact metadata cards, search, and direct open links. The landing is navigation only; prototypes do not import from it. The browser page does not scan folders at runtime; run `npm run build:index` to generate `prototypes/prototype-index-data.js` from `prototypes/**/metadata.json`.

Comparison prototypes also record provenance: shared or variant prompts, skills consulted, model/settings when known, agent mode/tool, input scope, leakage check, scratch output path, token usage when visible, tool calls when visible, and limitations. Unknown usage is written as `unknown` or `not captured`; it is never invented.

## Reusable Prompts and Run Packs

For repeatable executions, keep a versioned template, variables, exact rendered prompt, and one JSON receipt per run. The bundled renderer fails on missing placeholders and reports the rendered SHA-256 hash:

```powershell
node SKILLS/prototype-lab/scripts/render-prompt-template.mjs `
  --template prototypes/2026/07/027-example/prompts/shared.template.md `
  --vars prototypes/2026/07/027-example/prompts/shared.vars.json `
  --output prototypes/2026/07/027-example/prompts/shared.rendered.md
```

Package a prototype or comparison hub with all linked standalone variants:

```powershell
node SKILLS/prototype-lab/scripts/package-prototype-lab.mjs `
  --workspace . `
  --id 2026/07/027-example
```

This creates `dist/prototype-lab/027-example-pack/` plus a ZIP. The static root launcher, normalized prompts, run receipts, prototype tree, and `pack.json` hashes travel together. Proof screenshots are omitted by default for smaller uploads; add `--include-proof` for an evidence archive.

## Library Maintenance

Keep chronological source prototypes under `prototypes/<YYYY>/<MM>/`, generated packs under `dist/prototype-lab/`, and worker output under `.scratch/prototype-lab/`. Audit or normalize an existing library without deleting prototypes:

```powershell
npm run organize:library:check
npm run organize:library
npm run package:comparisons
```

The organizer upgrades legacy metadata additively, records split versus single-file runtimes, preserves IDs and links, moves only month-level legacy archives out of `prototypes/`, and regenerates the evidence index. The comparison command packages every comparison hub plus its linked standalone runs.

## ChatGPT Sites

Yes: a validated pack can be adapted and published with ChatGPT Sites when that capability is available. Prototype Lab treats packaging and publishing as separate permissions, prefers a private deployment first, and requires explicit confirmation immediately before a public/shared deployment unless public visibility was already clearly requested.

## What's Included

- [`SKILL.md`](./SKILLS/prototype-lab/SKILL.md): the full Codex structure and handoff contract.
- [`assets/prototype-shell/`](./SKILLS/prototype-lab/assets/prototype-shell): standalone shell starter files.
- [`assets/prototype-index/`](./SKILLS/prototype-lab/assets/prototype-index): optional static prototype browser with scaled iframe cards.
- [`scripts/build-prototype-index.mjs`](./scripts/build-prototype-index.mjs): metadata scanner that regenerates the static prototype index data file.
- [`references/quality-bar.md`](./SKILLS/prototype-lab/references/quality-bar.md): structure, behavior, viewport, and proof checklist.
- [`references/product-design-loop.md`](./SKILLS/prototype-lab/references/product-design-loop.md): product-thinking loop for prototype intent, user flows, and feedback states.
- [`references/taste-calibration.md`](./SKILLS/prototype-lab/references/taste-calibration.md): compact visual calibration, density, hierarchy, and interaction polish.
- [`references/variant-comparison.md`](./SKILLS/prototype-lab/references/variant-comparison.md): model, skill, prompt, approach, pairwise, blind, ranking, and iteration comparison workflow.
- [`references/agent-isolation.md`](./SKILLS/prototype-lab/references/agent-isolation.md): coordinator/worker protocol, worker receipts, and anti-contamination checks for isolated variant generation.
- [`references/prompt-templates.md`](./SKILLS/prototype-lab/references/prompt-templates.md): reusable prompt versions, variables, rendered hashes, and run ids.
- [`references/portable-run-pack.md`](./SKILLS/prototype-lab/references/portable-run-pack.md): static/ZIP packaging, upload safety, and ChatGPT Sites handoff.
- [`scripts/render-prompt-template.mjs`](./SKILLS/prototype-lab/scripts/render-prompt-template.mjs): deterministic prompt renderer.
- [`scripts/package-prototype-lab.mjs`](./SKILLS/prototype-lab/scripts/package-prototype-lab.mjs): linked-prototype packager with manifest hashes.

## Validate

```bash
npm run build:index
npm run validate
```

The validator checks required files, frontmatter, JSON metadata, public-doc wording, and accidental local path references.

## Status

Preview skill pack.

- The skill, shell template, and design/proof references are included.
- No prototype browser/server tooling is required.
- The target project's `prototypes/` root should contain year folders plus, when useful, the optional static index files.

## License

[MIT](./LICENSE)
