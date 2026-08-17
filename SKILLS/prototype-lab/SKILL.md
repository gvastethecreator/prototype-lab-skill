---
name: prototype-lab
description: "Create, adopt, iterate, compare, review, verify, and package portable browser/UI prototypes through one managed workspace. Use for quick standalone experiments, existing static demos, reusable prompt tests, visual or interaction variants, model/agent/skill benchmarks and showcases, evidence-backed comparison hubs, orchestrator reviews, or static/ZIP handoff."
---

# Prototype Lab

Treat `prototypes/` as a managed experiment workspace. Keep every result independently runnable; derive library and comparison views from metadata.

## Choose The Smallest Route

| Goal | Route |
| --- | --- |
| Test one idea quickly | `quick` |
| Compare existing or new options | `compare` |
| Measure models, agents, reasoning, or skills | `experiment` |
| Verify, finalize, and package | `ship` |

Run `node <skill-root>/scripts/manage-prototype-lab.mjs help` for the full interface. In this repository use `pnpm run lab -- <command>`.

## Quick Route

1. Initialize once with `... init`; use `--empty` only for a blank prompt library.
2. Create the owner with `... quick --title <title> --question <decision-question> [--profile <profile>]`.
3. Build only inside the returned folder. Keep runtime, local assets, prompts, runs, and proof there.
4. Record factual execution with `... record --id <id> [--receipt <json>]`.
5. Exercise the prototype in a browser. Run `... verify --id <id> --profile full --init-review`, fill the generated browser review from actual evidence, then run `... finalize --id <id>`.
6. Run `... sync` and `... open` to inspect simple static artifacts. Use `... preview [--id <id>] --open` when modules, fetch, media, or browser policy require an HTTP origin.

Use `create` when initialization is already managed. Use `adopt --path <static-folder>` for an existing self-contained build and `fork --id <id>` for a new iteration that intentionally resets proof and execution receipts.

Profiles guide the canvas without imposing one visual system:

- The default `blank` scaffold is neutral and comes from `assets/prototype-blank/`.
- `tool` is a compact app shell.
- `mobile` supplies a neutral mobile root; `canvas` supplies a responsive 2D/WebGL-ready canvas; `data` uses the compact tool shell with data/debug intent.
- `imported` is assigned by `adopt`.

## Compare Route

1. Produce or adopt at least two standalone artifacts.
2. Run `... compare --title <title> --variants <id,id> --dimension <model|skill|prompt|design> [--modes <list>]`.
3. Edit only `hub.config.json`; run `sync` after membership, criteria, archive, iteration, or mode changes.
4. New hubs include `review` by default. Add optional `blind`, `rank`, `iterations`, and `archive` modes only when they help the decision. User ranking is subjective and browser-local until exported.
5. Complete the orchestrator's evidence-backed review: run `... review --id <hub-id> --init`, inspect every variant and its proof, fill the JSON without chain-of-thought, then attach it with `... review --id <hub-id> --report <json>`. Keep recommendation, evidence, caveats, and confidence auditable.

Read `references/variant-comparison.md` for comparison design. For more than one independently generated result, also read `references/agent-isolation.md`.

## Experiment Route

Read `references/capability-comparisons.md` before comparing model, agent, reasoning, or skill capability.

1. Declare `benchmark` or `showcase`. Accept convergence in a benchmark; require meaningful open decisions and direction preflight in a showcase.
2. Generate an editable spec with `... experiment --init --id <id> --intent <intent> [--models <list>] [--skill <id>] [--from-prompt <id>]`, or supply an existing portable JSON spec.
3. Run `... experiment --spec <json> --direct-build` for an exploratory natural-response benchmark, or omit `--direct-build` for showcase direction packets.
4. Dispatch one fresh worker with no inherited history per variant. Keep Prototype Lab, workspace memory, hub styling, and sibling variants out of worker context. Record a host adapter in `dispatch.json`: Codex uses `codex-fork-turns-none` with `fork_turns: "none"`; a packet-only dedicated CLI uses `dedicated-cli-clean-session`.
5. Fill coordinator dispatch records and worker direction cards. Run `preflight`; a showcase needs a passing blind review before full builds.
6. Run `... materialize --experiment <id>` after build authorization. This creates one owner and local build packet per variant.
7. Dispatch one fresh build worker per primary work unit, require builder-owned capture/review/correction artifacts, attach canonical receipts with `record`, and verify every owner.
8. Create the comparison hub and orchestrator review before `finalize`; experiment owners cannot become complete while their review is missing or blocked.

## Ship Route

Run `... ship --id <id> [--include-proof]`. Shipping requires full verification, marks the owner complete, then produces an unpacked static folder and ZIP under `dist/prototype-lab/`.

The unpacked root is host-neutral: no build command, server runtime, clean-URL rewrite, or SPA fallback. Packaging does not authorize publication. For ChatGPT Sites, adapt through `sites-building`, publish through `sites-hosting`, and obtain confirmation before unambiguously public sharing.

Read `references/portable-run-pack.md` before archive, upload, or publication work. `scripts/package-prototype-lab.mjs` owns portable pack validation.

## Integrity Contract

- Keep one owner at `prototypes/<YYYY>/<MM>/<NNN>-<slug>/` per independently generated result.
- Treat `metadata.json` as artifact source of truth and `hub.config.json` as managed-hub source of truth.
- Keep required runtime files local; reject horizontal overflow, root-relative URLs, external runtime dependencies, local paths, and missing references.
- Record unknown values as `unknown` or `not captured`; never infer model, tokens, tool calls, or isolation.
- Require one worker receipt per independent run. Record exact assignment/input hashes, worker id, fresh-worker adapter evidence, context reads, output path, fallback reason, and cross-variant leakage status.
- Keep generated assets tied to source hashes, consumption sites, finite-set inspection, and browser proof when the asset policy requires them.
- Preserve existing work. Never overwrite unmanaged hubs or convert legacy/custom artifacts without explicit instruction.

## Conditional References

- `references/workspace-and-hub.md`: commands, profiles, ownership, Health, recovery, and resume actions.
- `references/product-design-loop.md`: three-direction selection for one standalone prototype.
- `references/taste-calibration.md`: visual calibration for one canvas; never leak it into baseline workers.
- `references/quality-bar.md`: browser review receipt, full verification, accessibility, and proof.
- `references/prompt-templates.md`: immutable reusable prompts and exact hashes.
- `references/variant-comparison.md`: hub modes, rankings, iterations, archives, and orchestrator review.
- `references/agent-isolation.md`: coordinator/worker boundaries and worker receipts.
- `references/capability-comparisons.md`: benchmark/showcase intent, spend gates, and skill activation.
- `references/portable-run-pack.md`: static/ZIP contract and publication safety.

Keep the reusable library under `prototypes/prompts/`. Use `scripts/manage-prototype-lab.mjs` as the primary interface and `scripts/manage-prompt-library.mjs` only for prompt-library internals.
