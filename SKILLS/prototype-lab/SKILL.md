---
name: prototype-lab
description: "Browser/UI prototype lab for creating, comparing, packaging, and publishing self-contained experiments. Use for standalone prototypes under prototypes/, reusable prompt templates, portable ZIP/static run packs, visual direction options, multi-variant model/skill/prompt/agent comparisons with isolated execution by default, controls/debug panels, evidence browsers, or visual QA."
---

# Prototype Lab

Build polished browser prototypes inside `prototypes/` with enough prompt, run, artifact, and proof provenance to compare or move them without the original workspace.

## Process

1. Confirm lab fit.
   - Use `prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/` for browser/UI experiments; use `prototype` for terminal-only logic experiments.
   - Comparison requests produce the requested number of standalone variant folders plus a separate hub. Internal states share one folder only when the user explicitly asks for states rather than independent executions.
   - Done when the question, path, category, user path, variant count, and comparison dimension are explicit.

2. Load only the active branch.
   - Read `AGENTS.MD` and `assets/prototype-shell/README.md` before editing.
   - Read `references/variant-comparison.md` for comparisons and `references/agent-isolation.md` for multiple variants.
   - Read `references/prompt-templates.md` and `references/portable-run-pack.md` for reusable prompts, model runs, exports, archives, uploads, or publication.
   - Read `references/product-design-loop.md` when visual direction is missing, `references/taste-calibration.md` when visual craft matters, and `references/quality-bar.md` for complex/stateful work.
   - Read `assets/prototype-index/README.md` only when the workspace needs a prototype landing.
   - Done when the shell, metadata, prompt/run owner, proof location, and handoff target are known.

3. Freeze direction and provenance.
   - Keep one shared prompt and vary only the declared comparison dimension.
   - For repeatable runs, copy `assets/portable-lab/`, render through `scripts/render-prompt-template.mjs`, and freeze run id, prompt version/hash, model route/settings, skill condition, attempt, and output folder.
   - For multiple variants, attempt one isolated worker per variant before using `single-agent-fallback`. Record the exact blocker when isolation is unavailable.
   - Every independently generated variant needs a worker receipt tied to the exact prompt hash. Every fallback needs a reason. The comparison integrity contract requires requested/delivered counts and a cross-variant leakage check.
   - Done when one build target or explicit retained option set is selected and every planned run has an honest status.

4. Build standalone artifacts.
   - Copy `assets/prototype-shell/` into every prototype folder and replace its placeholders.
   - Keep `index.html`, `styles.css`, `app.js`, `metadata.json`, `README.md`, optional `assets/`, and any `prompts/`, `runs/`, or `proof/` local to that folder.
   - Do not import sibling prototypes, `_shared`, `_references`, shared CSS/runtime helpers, server routes, APIs, or files outside the prototype folder.
   - Use a full-width top toolbar, full-screen stage, and optional right drawer hidden by default. Put view navigation in the toolbar; do not add a default left rail.
   - Comparison hubs default to overview/provenance, compare, and focus. Keep selected view/variant and pair ids URL-backed; expose A/B selectors when many variants would become unreadable all-up.
   - Show exact model/skill/agent attribution only when observed. Render worker receipts as structured cards and keep unknown metrics explicitly unknown.
   - Build for `1920x1080` and `1200x820`, then prove `834x1112` and `390x844` sanity. The shell fills `100dvh`; page/body do not scroll.
   - Done when every requested variant exists, controls/views behave, and missing isolation is visible in provenance.

5. Prove the user path.
   - Run the smallest useful logic/static check, then exercise core views, controls, reset/back paths, overflow, deep links, and supported viewports.
   - For comparisons, exercise every focus variant, compare/A-B selectors, attribution, receipts, integrity status, and any blind/ranking/archive mode that actually exists.
   - Regenerate index data from `metadata.json` when the workspace uses a generated landing. Run `scripts/validate-prototype-standalone.mjs` from the host repository when available.
   - Use local browser proof. Keep screenshots/artifacts under the prototype's `proof/` folder and record them in its `README.md`.
   - A requested variant without an isolated result or explicit fallback is a blocker. A planned/unfilled receipt cannot support `status: actual`.
   - Done when the real path and evidence are locally reproducible.

6. Package or publish only when requested.
   - Run `scripts/package-prototype-lab.mjs` with the workspace and primary prototype id. Linked variants must be discovered from metadata; generated packs live under `dist/prototype-lab/`.
   - Validate the unpacked launcher, primary prototype, one linked variant for comparisons, `pack.json`, prompt/run exports, and hashes. Surface the folder and ZIP path.
   - Packaging does not authorize publication. For ChatGPT Sites, use `sites-building` then `sites-hosting` on the validated pack; prefer private deployment and obtain confirmation before unambiguously public sharing.
   - Done when the portable artifact is retrievable and validated, or the explicitly requested deployment succeeds.

## Baseline Rules

- Quiet dark shell; expressive color belongs to prototype content and state.
- Compact controls and labels; prototype canvas titles scale only as the experiment needs.
- Primary path fits the stage at desktop/tablet sizes; controls and detail move into the drawer before the page grows.
- Structural borders stay subtle; avoid nested panel stacks, fake metadata strips, broad glow/glass, loud gradients, oversized radii, and nonfunctional debug chrome.
- Use accessible names, real state, interruptible motion, visible scroll areas, stable wrapping, and purposeful icons.
- Keep exact model, prompt, skill, agent, output, limitation, token/tool-call, and proof attribution factual. `unknown` beats invention.
- `improve-ui` owns semantics, focus, hit areas, wrapping, motion, responsiveness, and browser proof for an existing prototype.

## Run And Artifact Contracts

Open source prototypes directly at:

```text
prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/index.html
```

Open generated packs at `dist/prototype-lab/<slug>-pack/index.html`. If HTTP is required, use a temporary server outside `prototypes/`; do not add server/package/output/shared-runtime folders under the source tree.

The canonical README, `metadata.json`, shell, folder shape, provenance fields, view defaults, and responsive contract live in `assets/prototype-shell/`. Copy them instead of duplicating templates in this entrypoint. The optional evidence-browser landing contract lives in `assets/prototype-index/README.md` and its sibling assets.

## Reference Files

- `references/product-design-loop.md`: visual direction selection.
- `references/taste-calibration.md`: visual-quality dials and anti-slop review.
- `references/variant-comparison.md`: multi-variant comparison structure.
- `references/agent-isolation.md`: coordinator/worker isolation and receipts.
- `references/quality-bar.md`: complex/stateful proof gates.
- `references/prompt-templates.md`: reusable, versioned, hash-addressed prompts.
- `references/portable-run-pack.md`: static packaging, upload safety, archives, and publication.
- `assets/prototype-shell/`: canonical prototype runtime, README, and metadata templates.
- `assets/prototype-index/`: optional static prototype evidence browser.
- `assets/portable-lab/`: prompt, variables, and run-receipt starters.
- `scripts/render-prompt-template.mjs`: exact prompt rendering and SHA-256.
- `scripts/package-prototype-lab.mjs`: portable pack and ZIP builder.
- `scripts/reorganize-prototype-library.mjs`: library normalization and legacy archive movement.
- `scripts/package-comparison-hubs.mjs`: batch comparison-hub packaging.
