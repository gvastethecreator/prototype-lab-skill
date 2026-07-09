# Variant Comparison Labs

Use this when one request asks for multiple prototypes, models, skills, prompts, agents, options, or visual directions that should be reviewed as one experiment.

## Default Shape

Build one chronological prototype folder with multiple variants inside it.

Use separate sibling folders only when the user explicitly needs isolated runnable artifacts, different dependencies, or different app runtimes. If separate folders are required, create a small hub prototype that links to them and records the shared prompt, criteria, and proof.

## Shared Brief

Freeze these before building:

- shared prompt or brief
- variant count
- comparison dimension: model, skill, prompt, interaction strategy, visual language, layout, density, or motion
- success criteria reviewers should compare
- viewport target, such as mobile device frame, desktop workbench, tablet dashboard, or responsive product shell
- attribution status for each variant: actual, planned, simulated, inspired, or unavailable
- worker plan: sub-agent, dedicated CLI agent, separate thread, fallback, or unavailable for each variant
- provenance fields available from the run: prompts, skills, models, settings, token counts, and relevant tool calls

Do not silently mutate the prompt between variants unless prompt variation is the declared experiment.

For more than one variant, read `agent-isolation.md` before dispatching or building. Use isolated workers by default. If workers are blocked, record the exact fallback reason and still produce the requested variants unless the blocker prevents any build.

## Variant Ledger

Keep a structured variant ledger in `metadata.json` and in `app.js`.

Each variant needs:

- `id`: stable URL-friendly id
- `title`: short display label
- `model`: actual model used, or requested target when unavailable
- `skill`: actual skill used, or requested target when unavailable
- `status`: `actual`, `planned`, `simulated`, `inspired`, or `unavailable`
- `hypothesis`: what this variant is testing
- `tradeoff`: expected strength or risk
- `notes`: relevant execution limitation or observation
- `prompt`: shared prompt id or variant prompt if prompt variation is the experiment
- `agentMode`: `subagent`, `dedicated-cli`, `separate-thread`, `single-agent-fallback`, or `unavailable`
- `agentTool`: worker tool or CLI name when known
- `outputPath`: worker scratch output path or `not captured`
- `workerReceipt`: receipt id/path for real isolated runs, or `not applicable`
- `tokens`: captured token usage or `unknown`
- `toolCalls`: captured calls or `not captured`

Do not claim a result came from another model, skill, agent, or execution mode unless it actually did.

## Isolated Variant Generation

Use a coordinator/worker pattern:

1. The coordinator freezes the shared brief and success criteria.
2. The coordinator attempts to dispatch one isolated worker per variant using the best available sub-agent, multi-agent, dedicated CLI, or separate-thread mechanism.
3. Each worker receives only the shared brief, its own variant assignment, and the output contract.
4. Workers write to scratch/temp output, not the final prototype files.
5. The coordinator integrates all results into one comparison shell and records provenance.

If worker tooling is unavailable, continue only after recording `single-agent-fallback` and `fallbackReason`; do not describe the variant as independently generated. A fallback does not remove the obligation to build every requested variant.

## Building With Different Skills

When variants use different skills:

1. Read the relevant skill before building that variant.
2. Use the shared brief as the invariant.
3. Apply only that skill's relevant guidance to that variant.
4. Prefer a separate worker per skill so the skill context does not leak across variants.
5. Record the skill name, worker mode, and attribution status in the variant ledger.
6. Avoid blending all skill guidance into every variant, because that makes the comparison unreadable.

If a requested skill is unavailable, label the variant as `unavailable` or `inspired` and explain the limitation in the drawer and README.

## Building With Different Models

When variants use different models:

- Use actual model routing only if the environment provides it.
- Keep the exact shared prompt visible or recorded.
- Record model, date, and any known settings.
- If only one model is available, do not fake model output. Build a planned or simulated comparison and state that limitation.

## Interface Pattern

Use these views by default:

- `overview`: shared prompt, comparison criteria, and variant ledger summary.
- `compare`: all variants together at the same scale. Use consistent frames, device sizes, state labels, and controls.
- `focus`: one selected variant at larger scale with source, hypothesis, tradeoff, and local controls.
- `stress` or `states`: optional view for empty, error, loading, long-content, and responsive stress cases.

Keep `?view=<id>&variant=<id>` URL-backed. Toolbar navigation switches views; the drawer can hold variant selectors and execution notes.

## Comparison Methods

Use these methods when the comparison needs more than one grid:

Pattern note: public comparison galleries such as `https://www.whichai.dev/` use grouped galleries, pairwise compare URLs, blind guessing, iteration links, and rankings. Adapt those evaluation patterns when they help the prototype decision.

- `gallery`: group variants by model, skill, prompt treatment, or run condition. Useful for broad scans.
- `pairwise`: two previews in one URL with independent left/right selectors. Use URL params such as `left=<variant-id>&right=<variant-id>` so reviewers can share exact matchups.
- `blind`: hide source labels until the reviewer guesses or scores. Use this when taste bias toward a model/skill would distort the result.
- `rankings`: capture ordered picks plus short taste notes. Make rankings clearly subjective unless backed by measured criteria.
- `iterations`: expose repeated runs as numbered attempts under the same model/skill. Keep the prompt fixed so iteration quality can be compared.
- `archive`: allow hiding stale or superseded variants without deleting provenance.

These are evaluation modes, not decoration. Include only the modes that help the user's decision.

The drawer must include a provenance section for:

- shared prompt and any variant prompt
- agent mode, agent tool, and worker scratch output when known
- skills used or consulted
- model and settings when known
- token counts when captured
- tool calls when captured
- limitations, unavailable sources, or simulated/planned attribution

## Scaled Review

For side-by-side views:

- Use the same frame size/aspect for every variant.
- Keep labels and primary states legible at the comparison scale.
- Prefer one meaningful screen per variant over tiny full-app screenshots.
- Use focus mode for details that cannot survive scaling.
- For mobile prototypes, use repeated mobile frames in compare view and a larger selected mobile frame in focus view.

## Proof

Exercise:

- compare view with all variants visible
- pairwise links when pairwise mode is included
- blind reveal/reset path when blind mode is included
- ranking save/export or recorded notes when rankings are included
- focus view for every variant
- URL refresh/deep links for at least one non-default variant
- variant selector in toolbar or drawer
- viewport fit at `1920x1080`, `1200x820`, `834x1112`, and mobile sanity
- attribution labels and limitations
- isolated worker results or explicit fallback entries for every requested variant
- fallback reasons for every single-agent variant
- worker receipts for every independently generated variant

Proof must make the comparison useful, not just show that four panels exist. Missing requested variants fail the comparison.

## Landing Index

If the workspace has no prototype landing and the user needs to browse multiple prototypes, copy `assets/prototype-index/` into `prototypes/` and add the comparison lab to `prototype-index.js`.

The landing is for navigation only:

- render each prototype in a scaled iframe card
- show title, question, status, category, tags, model/skill summary, and proof count
- link directly to the prototype folder's `index.html`
- avoid shared code imported by prototypes
- follow any existing workspace index if one already exists

## Example

Request: "Create a mobile Winamp-style music player prototype, four versions, each guided by a different skill or model."

Recommended shape:

- one folder: `prototypes/<YYYY>/<MM>/<NNN>-mobile-winamp-comparison/`
- shared prompt: mobile Winamp-style music player
- variants: `skill-a`, `skill-b`, `model-a`, `model-b`
- worker plan: four isolated workers when available, one per variant
- gallery/compare view: four identical mobile frames, same song/state, visible labels
- pairwise view: left/right selected mobile frames with shareable URL params
- blind view: same frames with source labels hidden until reveal
- rankings view: reviewer ordered picks with short notes
- focus view: selected frame plus source/hypothesis/tradeoff
- drawer: prompt, criteria, agent mode, model/skill attribution, token/tool-call capture, proof checklist
- landing: one card for the comparison lab with a scaled iframe preview and direct open link
