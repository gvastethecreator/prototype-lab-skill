---
name: prototype-lab
description: "Create, compare, manage, verify, and package portable browser/UI prototypes through one workspace workflow. Use for standalone experiments under prototypes/, reusable prompt-driven model tests, isolated model/skill/design variants, managed comparison hubs, workspace library maintenance, visual proof, or portable static/ZIP handoff."
---

# Prototype Lab

Treat `prototypes/` as a managed experiment workspace. Produce standalone artifacts first; derive comparison and library hubs from metadata instead of hand-editing large HTML files.

## Default Workflow

1. Initialize once.
   - Run `node <skill-root>/scripts/manage-prototype-lab.mjs init --workspace <workspace>`.
   - Use `--empty` only when the user wants a blank prompt library.
   - Open `prototypes/index.html` as the workspace hub.

2. Create an artifact owner.
   - Run `... manage-prototype-lab.mjs create --workspace <workspace> --title <title> --question <decision-question>`.
   - Add `--prompt <library-id>` when the experiment starts from a reusable prompt.
   - Use the returned folder; do not invent a parallel path or number.
   - Build only inside that folder. Keep runtime, prompt copies, run receipts, assets, and proof local.

3. Build and prove the standalone artifact.
   - Replace the scaffold with the real prototype while preserving `metadata.json`, `README.md`, `prompts/`, `runs/`, and `proof/` ownership.
   - Keep `index.html`, local CSS/JS, and relative assets independently runnable.
   - Update factual model, skill, agent, run, limitation, and proof fields. Use `unknown` instead of inference.
   - Verify `1920x1080` and `1200x820`; check `834x1112` and `390x844`. Keep desktop/tablet page overflow at zero.

4. Create a hub only for a real comparison.
   - First produce at least two standalone artifacts.
   - Run `... manage-prototype-lab.mjs hub --workspace <workspace> --title <title> --variants <id,id> --dimension <model|skill|prompt|design>`.
   - Short numeric ids such as `001,002` are accepted when unique.
   - Edit only `hub.config.json` to change membership, labels, criteria, question, or default view.
   - Treat `hub-data.js`, `metadata.json`, `README.md`, `index.html`, `hub.css`, and `hub.js` as regenerated outputs.

5. Reconcile the workspace.
   - Run `... manage-prototype-lab.mjs sync --workspace <workspace>` after artifact or hub changes.
   - Run `... manage-prototype-lab.mjs status --workspace <workspace>` before handoff.
   - Use the library hub views: Library for artifacts, Comparisons for exact A/B links, Prompts for reusable inputs, and Health for readiness gaps and copyable commands.

6. Package only a ready owner.
   - Run `... manage-prototype-lab.mjs pack --workspace <workspace> --id <id>`.
   - Add `--include-proof` only for an evidence archive.
   - Surface the unpacked folder and ZIP. Packaging does not authorize publication.
   - For ChatGPT Sites, adapt only the validated pack through `sites-building`, publish through `sites-hosting`, and obtain confirmation before unambiguously public sharing.

## Comparison Integrity Contract

- Freeze the shared prompt, comparison dimension, success criteria, and viewport contract before dispatch.
- For model, skill, or agent comparisons, attempt one isolated worker per variant. Give each worker only the shared brief, its assignment, and its scratch output folder.
- Keep worker output in scratch until integration. Record a worker receipt tied to the rendered prompt hash.
- Record whether a worker received other variants and keep the cross-variant leakage check explicit.
- Record `single-agent-fallback` and the exact reason when isolation is unavailable. Never present simulated attribution as an actual model or skill run.
- Keep one standalone folder per independently generated result. The hub compares; it does not own or modify variant runtime code.

Read `references/variant-comparison.md` and `references/agent-isolation.md` before multi-variant execution.

## Artifact Rules

- Use chronological ids returned by the manager: `prototypes/<YYYY>/<MM>/<NNN>-<slug>/`.
- Keep prototypes independent of siblings, root hub assets, server routes, workspace-only modules, and shared runtime folders.
- Keep reusable prompts in `prototypes/prompts/`; save agent/user prompts unless sensitive or explicitly ephemeral.
- Copy the selected rendered prompt into its artifact owner and record library id, version, and SHA-256.
- Keep generated packs in `dist/prototype-lab/`, temporary workers in `.scratch/prototype-lab/`, and historical resets outside the active `prototypes/` tree.
- Preserve the user's existing work. Do not convert legacy/custom hubs unless explicitly requested; new managed hubs use `hub.config.json`.

## Interface Baseline

- Prefer compact, tool-like desktop layouts with clear hierarchy and purposeful internal scrolling.
- Use a quiet shell; let experiment content carry expressive color.
- Default cards, panels, and toolbars to borderless tonal surfaces. Reserve borders for inputs, grids, media edges, or focus only when they carry real structure or state.
- Avoid nested panel stacks, decorative metadata chrome, broad glow/glass, oversized type/radii, and nonfunctional controls.
- Provide keyboard access, visible focus, accessible names, reduced motion, stable wrapping, and real loading/empty/error/reset states when relevant.
- Use `improve-ui` for deep remediation of an existing prototype; keep this skill responsible for workspace, provenance, comparison, and packaging.

## References And Resources

- `references/workspace-and-hub.md`: commands, ownership, generated files, hub config, status, and recovery.
- `references/prompt-templates.md`: versioned prompt library and hashes.
- `references/variant-comparison.md`: comparison design and variant ledger.
- `references/agent-isolation.md`: coordinator/worker isolation.
- `references/quality-bar.md`: behavior, viewport, and proof gates.
- `references/product-design-loop.md`: product question and direction selection.
- `references/taste-calibration.md`: compact visual-quality calibration.
- `references/portable-run-pack.md`: static/ZIP and publishing safety.
- `assets/prototype-shell/`: standalone scaffold.
- `assets/comparison-hub/`: generated managed comparison runtime.
- `assets/prototype-index/`: generated workspace hub.
- `assets/prompt-library/`: reusable prompt starters.
- `scripts/manage-prototype-lab.mjs`: primary workspace interface.
- `scripts/manage-prompt-library.mjs`: prompt versioning internals.
- `scripts/build-prototype-index.mjs`: portable index/data builder.
- `scripts/package-prototype-lab.mjs`: portable pack implementation.
