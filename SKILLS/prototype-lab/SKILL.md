---
name: prototype-lab
description: "Prototype Lab: create, adopt, iterate, compare, review, verify, package portable browser/UI prototypes. Quick experiments, design rounds of one canvas, static demos, reusable prompt tests, visual or interaction variants, model/agent/skill benchmarks and showcases, comparison hubs, orchestrator reviews, static/ZIP handoff."
---

# Prototype Lab

`prototypes/`: managed experiment workspace. Every result independently runnable; library and comparison views derive from metadata.

## Choose The Smallest Route

| Goal | Route |
| --- | --- |
| Test one idea quickly | `quick` |
| Several design takes of one canvas | `vary` |
| Compare independently runnable options | `compare` |
| Measure models, agents, reasoning, or skills | `experiment` |
| Verify, finalize, and package | `ship` |

Run `node <skill-root>/scripts/manage-prototype-lab.mjs help` for full interface. In this repository use `pnpm run lab -- <command>`.

## Quick Route

1. Initialize once with `... init`; `--empty` only for a blank prompt library.
2. Create owner with `... quick --title <title> --question <decision-question> [--profile <profile>]`.
3. Build only inside returned folder. Keep runtime, local assets, prompts, runs, and proof there.
4. Record factual execution with `... record --id <id> [--receipt <json>]`.
5. Exercise in a browser. Run `... verify --id <id> --profile full --init-review`, fill generated browser review from actual evidence, then `... finalize --id <id>`.
6. Run `... sync` and `... open` for simple static artifacts. Use `... preview [--id <id>] --open` when modules, fetch, media, or browser policy require an HTTP origin.

`create` when init is already managed. `adopt --path <static-folder>` for existing self-contained build. `fork --id <id>` for a new iteration that resets proof and execution receipts.

## Vary Route

Use when the question is which visual or interaction direction to keep on one owner. Independent model/skill/prompt runs still use `compare` or `experiment`.

1. Have one owner (`quick` if none). Read `references/design-rounds.md` before drafting.
2. Open with `... vary --id <id> [--n 4] [--new] [--question <round-question>]`. Write `plan.json` first: one question, unique `angle` per new position, honest `cost`.
3. Build each position as a complete drop-in under `positions/<n>/`. Do not edit frozen position 1. Do not write the owner root canvas while the round is open.
4. Run `... vary --id <id> --check`. Look at every position, including 390px. `--use` your recommendation, then present in positions (`2 of 4`) with that cost.
5. After a keep, `... vary --id <id> --narrow --keep <n>` before drawing again. `--end --keep <n> --why <direction>` copies the winner over the owner root.

A round narrows; it does not accumulate rejected takes in the pager.

Profiles guide the canvas; no single visual system:

- Default `blank` scaffold is neutral; from `assets/prototype-blank/`.
- `tool`: compact app shell. `mobile`: neutral mobile root. `canvas`: responsive 2D/WebGL-ready canvas. `data`: compact tool shell with data/debug intent. `imported`: assigned by `adopt`.

## Compare Route

1. Produce or adopt at least two standalone artifacts.
2. Run `... compare --title <title> --variants <id,id> --dimension <model|skill|prompt|design> [--modes <list>]`.
3. Edit only `hub.config.json`; run `sync` after membership, criteria, archive, iteration, or mode changes.
4. New hubs include `review` by default. Add `blind`, `rank`, `iterations`, and `archive` only when they help the decision. User ranking is subjective and browser-local until exported.
5. Orchestrator review: `... review --id <hub-id> --init`, inspect every variant and its proof, fill the JSON without chain-of-thought, attach with `... review --id <hub-id> --report <json>`. Keep recommendation, evidence, caveats, and confidence auditable.

Read `references/variant-comparison.md`. For independently generated results, also `references/agent-isolation.md`.

## Experiment Route

Read `references/capability-comparisons.md` before model/agent/reasoning/skill capability comparisons.

1. Declare `benchmark` or `showcase`. Accept convergence in a benchmark; require meaningful open decisions and direction preflight in a showcase.
2. Generate an editable spec with `... experiment --init --id <id> --intent <intent> [--models <list>] [--skill <id>] [--from-prompt <id>]`, or supply existing portable JSON spec.
3. Run `... experiment --spec <json> --direct-build` for exploratory natural-response benchmark, or omit `--direct-build` for showcase direction packets.
4. Dispatch one fresh worker with no inherited history per variant. Keep Prototype Lab, workspace memory, hub styling, and sibling variants out of worker context. Host adapter in `dispatch.json`: Codex `codex-fork-turns-none` with `fork_turns: "none"`; packet-only dedicated CLI `dedicated-cli-clean-session`.
5. Fill coordinator dispatch records and worker direction cards. Run `preflight`; showcase needs a passing blind review before full builds.
6. After build authorization, run `... materialize --experiment <id>` — one owner and local build packet per variant.
7. Dispatch one fresh build worker per primary work unit; require builder-owned capture/review/correction artifacts; attach canonical receipts with `record`; verify every owner.
8. Create comparison hub and orchestrator review before `finalize`; experiment owners cannot become complete while their review is missing or blocked.

## Ship Route

Run `... ship --id <id> [--include-proof]`. Requires full verification, marks owner complete, then writes unpacked static folder and ZIP under `dist/prototype-lab/`.

Unpacked root is host-neutral: no build command, server runtime, clean-URL rewrite, or SPA fallback. Packaging does not authorize publication. ChatGPT Sites: adapt via `sites-building`, publish via `sites-hosting`; confirm before unambiguously public sharing.

Read `references/portable-run-pack.md` before archive, upload, or publication. `scripts/package-prototype-lab.mjs` owns portable pack validation.

## Integrity Contract

- One owner at `prototypes/<YYYY>/<MM>/<NNN>-<slug>/` per independently generated result. Design rounds stay inside that owner; they do not create sibling owners.
- `metadata.json` is artifact source of truth; `hub.config.json` is managed-hub source of truth; `plan.json` is the open design-round source of truth.
- Keep required runtime files local; reject horizontal overflow, root-relative URLs, external runtime dependencies, local paths, and missing references.
- Record unknown values as `unknown` or `not captured`; never infer model, tokens, tool calls, or isolation.
- One worker receipt per independent run. Record exact assignment/input hashes, worker id, fresh-worker adapter evidence, context reads, output path, fallback reason, and cross-variant leakage status.
- Generated assets stay tied to source hashes, consumption sites, finite-set inspection, and browser proof when asset policy requires them.
- Preserve existing work. Never overwrite unmanaged hubs or convert legacy/custom artifacts without explicit instruction.

## Conditional References

- `references/workspace-and-hub.md`: commands, profiles, ownership, Health, recovery, resume
- `references/product-design-loop.md`: brief and single-build direction selection
- `references/design-rounds.md`: in-owner positions, `plan.json`, narrow/keep
- `references/taste-calibration.md`: visual calibration; never leak into baseline workers
- `references/quality-bar.md`: browser review, verification, a11y, proof
- `references/prompt-templates.md`: immutable prompts and hashes
- `references/variant-comparison.md`: hub modes, rankings, iterations, archives, orchestrator review
- `references/agent-isolation.md`: coordinator/worker, receipts
- `references/capability-comparisons.md`: benchmark/showcase, spend gates, skill activation
- `references/portable-run-pack.md`: static/ZIP and publication safety

Reusable library: `prototypes/prompts/`. Primary interface `scripts/manage-prototype-lab.mjs`; `scripts/manage-prompt-library.mjs` only for prompt-library internals.
