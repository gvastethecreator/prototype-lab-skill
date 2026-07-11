---
name: prototype-lab
description: "Create, compare, manage, verify, and package portable browser/UI prototypes through one workspace workflow. Use for standalone experiments, high-freedom model/agent/skill capability showcases, honest benchmarks, reusable prompt tests, isolated variants, managed comparison hubs, visual proof, or portable static/ZIP handoff."
---

# Prototype Lab

Treat `prototypes/` as a managed experiment workspace. Produce standalone artifacts first; derive comparison and library hubs from metadata instead of hand-editing large HTML files.

## Default Workflow

1. Initialize once.
   - Run `node <skill-root>/scripts/manage-prototype-lab.mjs init --workspace <workspace>`.
   - Use `--empty` only when the user wants a blank prompt library.
   - Open `prototypes/index.html` as the workspace hub.

2. Gate capability comparisons before spending.
   - Read `references/capability-comparisons.md` when the purpose is to reveal model, agent, reasoning, or skill differences.
   - Declare `benchmark` or `showcase`; never promise both natural measurement and forced diversity.
   - For a natural-response benchmark, run `... experiment --spec <json> --direct-build`; this writes hashed build packets and labels one-shot cells `exploratory-n1` without forcing directional difference.
   - For a showcase, run `... experiment --spec <json>`, then use direction preflight and blind review.
   - Dispatch direction-only workers with `fork_turns: "none"`. Do not expose this skill, workspace memory, hub styling, or another variant. The coordinator must fill each generated `dispatch.json`; worker claims alone are not isolation proof.
   - Run `... preflight --experiment <id>` and perform a blind direction review. Full builds and image generation stay unauthorized until a passing review produces each hashed build assignment plus its build-input manifest.

3. Create an artifact owner.
   - Run `... manage-prototype-lab.mjs create --workspace <workspace> --title <title> --question <decision-question>`.
   - Add `--prompt <library-id>` when the experiment starts from a reusable prompt.
   - The default `blank` scaffold is visually neutral. Add `--scaffold tool` only when the artifact itself is explicitly a compact application shell.
   - Record variant treatment with `--condition`, `--skills`, `--model`, and `--reasoning`. `prototype-lab` remains an orchestration skill and is stored separately from variant skills.
   - Use the returned folder; do not invent a parallel path or number.
   - Build only inside that folder. Keep runtime, prompt copies, run receipts, assets, and proof local.

4. Build and prove the standalone artifact.
   - Replace the scaffold with the real prototype while preserving `metadata.json`, `README.md`, `prompts/`, `runs/`, and `proof/` ownership.
   - Keep `index.html`, local CSS/JS, and relative assets independently runnable.
   - Update factual model, skill, agent, run, limitation, and proof fields. Use `unknown` instead of inference.
   - For generated grids, atlases, spritesheets, galleries, or repeated media, inspect every finite item when small. Prove semantic mapping, correct cell/item aspect ratio, no stretching or neighboring-cell bleed, no unintended subject loss, and one narrow-viewport fixture.
   - Treat error-named captures, a blocked harness assessment, or runtime P0/P1 as failed proof even when action assertions pass.
   - Verify `1920x1080` and `1200x820`; check `834x1112` and `390x844`. Enforce the declared layout policy: page scrolling may be intentional, horizontal overflow never is.

5. Create a hub only for a real comparison.
   - First produce at least two standalone artifacts.
   - Run `... manage-prototype-lab.mjs hub --workspace <workspace> --title <title> --variants <id,id> --dimension <model|skill|prompt|design>`.
   - Short numeric ids such as `001,002` are accepted when unique.
   - Edit only `hub.config.json` to change membership, labels, criteria, question, or default view.
   - Treat `hub-data.js`, `metadata.json`, `README.md`, `index.html`, `hub.css`, and `hub.js` as regenerated outputs.

6. Reconcile the workspace.
   - Run `... manage-prototype-lab.mjs sync --workspace <workspace>` after artifact or hub changes.
   - Run `... manage-prototype-lab.mjs status --workspace <workspace>` before handoff.
   - Use the library hub views: Library for artifacts, Comparisons for exact A/B links, Prompts for reusable inputs, and Health for readiness gaps and copyable commands.

7. Package only a ready owner.
   - Run `... manage-prototype-lab.mjs pack --workspace <workspace> --id <id>`.
   - Add `--include-proof` only for an evidence archive.
   - Require `deploy.json` and `pack.json.deployment.validation.status: passed` before calling the artifact deploy-ready.
   - Surface the unpacked folder and ZIP. The unpacked root is the host-neutral publish directory; it needs no build command, SPA fallback, or server runtime. Packaging does not authorize publication.
   - For ChatGPT Sites, adapt only the validated pack through `sites-building`, publish through `sites-hosting`, and obtain confirmation before unambiguously public sharing.

## Comparison Integrity Contract

- Freeze experiment intent, fixed outcomes, open decisions, asset policy, layout policy, comparison dimension, and viewport contract before dispatch.
- For a `benchmark`, accept convergence as a result and label one-attempt cells exploratory. Use A/A replicates or repeated attempts before claiming a stable skill effect.
- For a creative `showcase`, require direction preflight, at least six open decisions, observable skill interventions, and a divergence gate before full builds.
- For model, skill, or agent comparisons, use one isolated worker per variant with `fork_turns: "none"`. Give each worker only its generated assignment and scratch output folder.
- Keep `prototype-lab` coordinator-only. Do not ask baseline workers to read this skill, taste calibration, quality-bar styling, or workspace memory.
- Treat assets as a declared factor. Use `required` when ImageGen itself is tested; use `fixed-supplied` when a model/skill comparison must receive identical pre-generated imagery. A CSS/SVG substitute, changed fixed hash, pathless generation, unused output, distorted atlas, wrong cell mapping, or default-item-only review fails the condition.
- Keep worker output in scratch until integration. Record a worker receipt tied to the rendered prompt hash.
- Record coordinator worker id, `forkTurns`, assignment/input hashes, requested/effective model, skill/reference reads, memory inputs, asset manifest, and whether a worker received other variants. Keep the cross-variant leakage check explicit, but treat worker leakage claims as self-reported unless the dispatch/context record supports them.
- Record `single-agent-fallback` and the exact reason when isolation is unavailable. Never present simulated attribution as an actual model or skill run.
- Keep one standalone folder per independently generated result. The hub compares; it does not own or modify variant runtime code.

Read `references/variant-comparison.md` and `references/agent-isolation.md` before multi-variant execution.

## Artifact Rules

- Use chronological ids returned by the manager: `prototypes/<YYYY>/<MM>/<NNN>-<slug>/`.
- Keep prototypes independent of siblings, root hub assets, server routes, workspace-only modules, and shared runtime folders.
- Keep reusable prompts in `prototypes/prompts/`; save agent/user prompts unless sensitive or explicitly ephemeral.
- Copy the selected rendered prompt into its artifact owner and record library id, version, and SHA-256.
- Keep generated packs in `dist/prototype-lab/`, temporary workers in `.scratch/prototype-lab/`, and historical resets outside the active `prototypes/` tree.
- Make packs subpath-safe: reject root-relative URLs, missing local references, and external runtime dependencies. Allow external navigation links, but keep required scripts, styles, fonts, media, and frames local.
- Preserve the user's existing work. Do not convert legacy/custom hubs unless explicitly requested; new managed hubs use `hub.config.json`.

## Hub And Canvas Boundary

- Keep the workspace and comparison hubs compact, borderless, quiet, and easy to audit.
- Do not transfer hub palette, typography, density, cards, toolbar, radius, no-scroll behavior, or anti-pattern preferences into variant canvases.
- Let each standalone artifact own its complete visual register and responsive structure. A creative site may scroll; an application may use an app shell; an immersive prototype may fill the stage.
- Provide keyboard access, visible focus, accessible names, reduced motion, stable wrapping, and real loading/empty/error/reset states when relevant.
- Use `improve-ui` for deep remediation of an existing prototype; keep this skill responsible for workspace, provenance, comparison, and packaging.

## References And Resources

- `references/workspace-and-hub.md`: commands, ownership, generated files, hub config, status, and recovery.
- `references/capability-comparisons.md`: benchmark/showcase intent, neutral worker packets, preflight, asset policy, skill activation, divergence, and spend gates.
- `references/prompt-templates.md`: versioned prompt library and hashes.
- `references/variant-comparison.md`: comparison design and variant ledger.
- `references/agent-isolation.md`: coordinator/worker isolation.
- `references/quality-bar.md`: behavior, viewport, and proof gates.
- `references/product-design-loop.md`: product question and direction selection.
- `references/taste-calibration.md`: compact visual-quality calibration.
- `references/portable-run-pack.md`: static/ZIP and publishing safety.
- `assets/prototype-shell/`: opt-in compact tool scaffold.
- `assets/prototype-blank/`: visually neutral default scaffold for greenfield and capability variants.
- `assets/comparison-hub/`: generated managed comparison runtime.
- `assets/prototype-index/`: generated workspace hub.
- `assets/prompt-library/`: reusable prompt starters.
- `scripts/manage-prototype-lab.mjs`: primary workspace interface.
- `scripts/manage-prompt-library.mjs`: prompt versioning internals.
- `scripts/build-prototype-index.mjs`: portable index/data builder.
- `scripts/package-prototype-lab.mjs`: portable pack implementation.
