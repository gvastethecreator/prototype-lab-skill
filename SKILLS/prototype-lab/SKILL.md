---
name: prototype-lab
description: "Browser/UI prototype lab. Use when creating or improving standalone prototypes under prototypes/, visual direction options, multi-variant comparison labs for testing different models, skills, prompts, agents, or approaches with isolated sub-agent execution by default, controls/debug panels, or visual QA."
---

# Prototype Lab

Build polished browser prototypes inside `prototypes/` without scattering one-off UI experiments.

## Process

1. Confirm lab fit.
   - Use this for browser/UI prototypes that belong in `prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/`.
   - If the request is a quick terminal logic/state experiment, use `prototype` instead.
   - If the user asks for several prototypes from one prompt, different models, different skills, A/B options, side-by-side review, or a gallery of alternate executions, mark it as comparison mode. This is not optional: build the requested number of variants unless a concrete blocker is recorded. When variants compare skills, models, agents, execution modes, or independently judged prototypes, each variant must be its own standalone prototype folder with its own `index.html`, `styles.css`, `app.js`, `metadata.json`, and `README.md`; add a separate comparison hub folder that embeds or links those standalone prototypes. Use one folder with multiple internal visual options only when the user explicitly asks for internal states/options rather than separate prototype executions.
   - Done when the prototype question, year, month, number, slug, category metadata, expected user path, and any variant count/execution dimension are explicit or safely inferred.

2. Load the local contract.
   - Read `AGENTS.MD` and `assets/prototype-shell/README.md` before editing.
   - If the workspace has no prototype landing/index and the user needs to browse multiple prototypes, read `assets/prototype-index/README.md` and create the optional `prototypes/index.html` landing.
   - Done when the folder shape, metadata file, standalone shell, optional landing index, direct file run path, and local proof location are known.

3. Select the visual direction.
   - If the user supplied a screenshot/mock or already picked a direction, build from that target.
   - If comparison mode is active, read `references/variant-comparison.md` before building. Freeze one shared prompt, define the comparison criteria, and vary only the declared dimension: model, skill, prompt treatment, interaction strategy, or visual direction.
   - For comparison mode, choose evaluation methods deliberately: gallery, all-up compare, pairwise compare, blind guess/reveal, rankings, iterations, archive, focus, or stress. Do not add every mode unless it helps the review.
   - If comparison mode has more than one variant, read `references/agent-isolation.md` and plan one isolated worker per variant. Before using `single-agent-fallback`, first attempt the available sub-agent, multi-agent, dedicated CLI, or separate-thread path allowed by the current environment.
   - If visual quality matters, read `references/taste-calibration.md` and lock the prototype read plus dials for the canvas.
   - If no direction exists, read `references/product-design-loop.md` and run the three-option Product Design loop before building.
   - Done when there is one selected build target, or an explicit decision to keep multiple views.

4. Build as a standalone prototype.
   - Copy `assets/prototype-shell/` into the prototype folder, then replace placeholder content.
   - Keep all runtime files local to that prototype: `index.html`, `styles.css`, `app.js`, `metadata.json`, `README.md`, and optional local `assets/`.
   - Hard ban: do not depend on `prototypes/_shared`, `prototypes/_references`, `prototypes/output`, sibling prototype code, shared components, global CSS, shared runtime helpers, server routes, APIs, or imports outside the prototype folder. Category is metadata, not a folder boundary.
   - Keep the required shell minimal: one full-width top toolbar, one full-screen prototype stage, and one right drawer for controls/info when needed. The drawer is hidden by default.
   - Put view navigation in the top toolbar when the prototype has multiple views. Do not add a left navigation rail.
   - For comparison mode across skills/models/agents/execution modes, build one standalone folder per variant plus one comparison hub. The hub includes `overview` or `provenance`, `compare`, and `focus` views by default and may add `pairwise`, `blind`, `rankings`, `iterations`, or `archive` when useful. The compare view embeds or screenshots the standalone prototypes at the same scale; the focus view opens or embeds one selected standalone prototype. Keep selected view, variant, and pairwise left/right ids URL-backed when comparison, refresh, or sharing matters.
   - When the comparison hub can contain many prototypes, include left/right selectors in the compare view instead of forcing every variant onscreen at once. Support `?view=compare&left=<variant-id>&right=<variant-id>` deep links. An all-up gallery may still exist, but pairwise selection must be available when scale would make review cramped.
   - Comparison and index cards must have homogeneous anatomy: preview, compact header, stable two-line description, saturated solid badge rail, optional tag rail, and compact date/path footer. Do not let metadata length create uneven card structures.
   - Show exact model used when known. If the runtime only exposes a default model label, write the exact available label plus `runtime default`; do not reduce it to a generic family name.
   - Give every variant a visible label, source, hypothesis, and tradeoff. Do not claim a variant was produced by another model, skill, agent, or execution option unless that actually happened. If a requested model/skill cannot be invoked, label it as planned, simulated, or inspired and record the limitation.
   - For multi-variant requests, use the coordinator/worker pattern from `references/agent-isolation.md`: the coordinator freezes the shared brief, workers generate isolated variant outputs, and the coordinator integrates the final shell. Do not skip worker dispatch because it is faster to stay in one context. If workers are unavailable, record `single-agent-fallback` plus the exact blocker in provenance and still build the requested variants.
   - If variants use different skills, read each relevant skill before building that variant, keep the variant-specific guidance isolated, and record the skill name in `metadata.json`.
   - Add a provenance panel in the right drawer for prompts, skills, agent mode, model/execution options, token counts, tool calls, scratch output paths, and known limitations. Record unavailable token/tool-call details as `unknown` or `not captured`; never invent usage metrics.
   - Render worker receipts as structured receipt cards, not prose blobs: status header, variant id, agent mode/tool, input scope, scratch output, fallback reason, and chips for isolation/leakage/final-file edits.
   - Add a comparison integrity contract: every independently generated variant needs a worker receipt, and every fallback variant needs a fallback reason. Check for cross-variant leakage before claiming the variants are independent.
   - Build ultra-wide/desktop first across `1920x1080` and `1200x820`, then prove tablet `834x1112` and mobile `390x844` sanity. Shell fills `100dvh`, body/page do not scroll, and the primary path fits the stage without requiring page scroll.
   - Use `improve-ui` for semantics, focus, hit areas, wrapping, motion, responsiveness, and browser proof.
   - Keep taste calibration scoped to the prototype canvas unless the request is shell work.
   - Done when every requested variant exists, every visible control/view has real behavior or is clearly marked as a noninteractive test case, and any missing worker isolation is explained in provenance.

5. Prove the user path.
   - Run the smallest useful logic/static check for non-trivial behavior.
   - Manually exercise core views, controls, reset/back paths, overflow scrolling, ultra-wide, desktop, tablet, and a mobile sanity layout.
   - For comparison mode, exercise the all-variants compare view, each focus variant, the variant selector, refresh/deep-link behavior, and any recorded model/skill attribution. If pairwise, blind, ranking, iteration, or archive modes exist, exercise their selection, reveal/reset, note capture, direct links, and hidden/visible states.
   - Confirm every requested variant has either an isolated worker result or an explicit fallback/unavailable entry in `metadata.json` and the drawer provenance. A missing variant is a blocker, not a note.
   - If a prototype landing exists or was created, open it, confirm each card iframe loads the correct prototype at scale, and confirm the card link opens the prototype directly.
   - If a prototype landing exists or was created, confirm the index uses solid minimal badges for model, skills, agents, status, and proof; hides dead preview controls with an embed mode; uses subtle surface color instead of nested border boxes; and exposes a comparison dropdown when a comparison hub is available.
   - Run `node scripts/validate-prototype-standalone.mjs` so shared runtime references fail before browser QA.
   - Use local browser proof for the prototype folder. If a browser API requires HTTP, run a temporary external static server from outside `prototypes/`; do not add server files to `prototypes/`.
   - For complex or stateful prototypes, read `references/quality-bar.md` and satisfy its proof checklist.
   - Done when screenshots/artifacts are saved under the prototype's local `proof/` folder and the prototype `README.md` records the proof.

## Baseline Rules

- Dark only: neutral black/gray shell; color belongs to prototype content, text, icons, or state, not broad chrome.
- Full-screen first: target `1920x1080` ultra-wide and `1200x820` desktop first, then tablet `834x1112` and mobile `390x844`. `html`/`body` stay `overflow: hidden`; only the right drawer and intentional inner panes scroll.
- Primary path fit: the main canvas/demo state must fit the stage at ultra-wide, desktop, and tablet sizes. Move controls/details into the right drawer before making the stage taller than the viewport.
- Top toolbar only: toolbar is full-width and holds title, key status, navigation pills, and essential commands. Keep it `40px`-`48px`; allow a second compact row only on narrow mobile.
- Right drawer: optional, collapsed by default, opens from the right, width `320px`-`380px` on desktop and `min(92vw, 380px)` on small screens. Put controls, debug, notes, and state there.
- Provenance drawer: include prompts, skills, agent mode/tool, models, token counts, tool calls, scratch output paths, and execution limitations when a prototype compares variants or when reproducibility matters. Worker receipts must be styled as compact cards with visible pass/fallback checks, not hidden in long text. Keep this compact and factual; `unknown` is better than guessed.
- No default left rail, no bottom status bar, no fake metadata strips. Status can live as one compact toolbar chip or inside the drawer.
- Comparison labs use the same quiet shell. Put `overview`, `compare`, `focus`, and optional stress/debug views in the top toolbar; put variant maps, source notes, and execution metadata in the right drawer. Scaled variants must remain inspectable; avoid shrinking a full app until labels, states, and controls become unreadable.
- Compact type: labels/kickers `9px`-`10px`, body/control text `11px`-`12px`, drawer headings `11px`-`13px`, canvas/demo titles only as large as the prototype needs. Avoid hero-scale type inside tool chrome.
- Clear hierarchy: prototype title, active view, stage, drawer controls, and transient status each need distinct placement/weight; do not repeat the same heading treatment everywhere.
- Minimal shell: structural panels, buttons, and controls use readable neutral borders near `10%` opacity. Avoid nested panels unless the prototype itself requires them.
- Icons: Tabler-style icons are allowed for real actions/status. Prefer a local/inline subset and accessible names for icon-only controls.
- Scroll areas: custom scrollbars should match shell tokens, remain visible, and preserve native scrolling. The right drawer may scroll; the page should not.
- Motion: small, purposeful, interruptible feedback only. Avoid broad travel on high-frequency controls.
- Avoid glow, glassmorphism, loud gradients, generic SaaS decoration, oversized radii, and decoration that does not explain the prototype.
- Radii: prefer `0`, `2px`, `4px`, or `6px`.
- Prototype canvas may be expressive when the question is visual direction, brand feel, game feel, or interaction craft. The shell stays quiet and minimal.
- Avoid reflexive prototype slop: three-card SaaS sections, nested panels, fake metadata strips, nonfunctional debug controls, and motion that does not test the hypothesis.

## Code Rules

- Keep each prototype self-contained. Do not share components, helpers, shell assets, runtime imports, or local modules between prototypes.
- The optional `prototypes/index.html` landing may link to prototypes and render scaled iframe cards, but prototypes must not import code, styles, data, or helpers from the landing.
- Prefer plain HTML/CSS/JS for small prototypes. Use TSX/framework code only when the question needs app runtime or framework behavior.
- Keep selected view/variant URL-backed when sharing, refresh, or direct comparison matters.
- Store comparison prototype links and the variant ledger in the hub `app.js` and `metadata.json`; each standalone variant also keeps its own local metadata. Do not scatter variant definitions across comments, markup, and README prose.
- For isolated variant generation, keep worker scratch files outside `prototypes/`, such as `.scratch/prototype-lab/<prototype-slug>/<variant-id>/`. Do not let multiple workers edit the same final prototype files concurrently.
- If sub-agent use is blocked by the active runtime policy, ask the smallest permission question needed or record the policy blocker. Do not silently downgrade the request to one variant or one blended design.
- Surface runtime state in the right drawer, toolbar status chip, or prototype canvas.
- Add no dependency unless the prototype cannot answer its question without it.
- Keep code readable enough to absorb or delete later.

## Run Contract

Open the prototype directly:

```text
prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/index.html
```

Do not create server, API, package, output, shared runtime, or reference folders under `prototypes/`. If an experiment needs HTTP, use a temporary static server command from the repo root or temp space and keep the prototype files self-contained.

If the workspace has a landing index, open it directly:

```text
prototypes/index.html
```

The landing is optional navigation chrome only. It may keep `index.html`, `prototype-index.css`, and `prototype-index.js` at `prototypes/` root. Do not add packages, servers, shared component folders, output folders, or reference folders under `prototypes/`.

## Prototype README

Every prototype folder keeps a short `README.md`:

```md
# Prototype Name

question: What are we trying to learn?
status: active | answered | stale
run: open index.html in a browser
path: prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/index.html
proof: proof/<file>.png

views:
- view-id: purpose

variants:
- variant-id: model/skill/prompt/approach and what it tests

provenance:
- prompt: shared or variant prompt used
- skills: skill names used or consulted
- model: model and settings when known
- agent: sub-agent, dedicated CLI, separate thread, fallback, or unavailable
- tokens: input/output/total if captured, otherwise unknown
- tool calls: relevant calls if captured, otherwise not captured

notes:
- Decision, risk, or next step.
```

For visual-direction prototypes, include the selected design read and dials in `notes`.

When answered, fold the result into production or mark/delete the prototype. Do not leave stale experiments looking finished.

## Prototype Metadata

Every prototype folder keeps `metadata.json`. Category, model, tags, and details live here so folders stay chronological instead of taxonomic.

```json
{
  "id": "2026/07/001-prototype-name",
  "month": "2026-07",
  "number": 1,
  "slug": "prototype-name",
  "title": "Prototype Name",
  "category": "workflow-tools",
  "status": "active",
  "date": "2026-07-08",
  "mode": "single",
  "model": "GPT-5",
  "tags": ["browser-ui"],
  "question": "What are we trying to learn?",
  "sourcePrompt": "Shared prompt or brief used for every variant.",
  "comparisonCriteria": ["fit", "clarity", "interaction"],
  "comparisonMethods": ["gallery", "compare", "focus"],
  "variantStrategy": "single build | model comparison | skill comparison | prompt comparison | design options",
  "provenance": {
    "prompts": ["Shared or variant prompt text."],
    "skills": ["prototype-lab"],
    "models": ["GPT-5"],
    "integrity": {
      "requestedVariants": 1,
      "deliveredVariants": 1,
      "crossVariantLeakage": false,
      "workerReceiptsRequired": false
    },
    "agentRuns": [
      {
        "variantId": "baseline",
        "agentMode": "single-agent-fallback",
        "agentTool": "not captured",
        "outputPath": "not captured",
        "inputScope": "shared brief only",
        "receivedOtherVariants": false,
        "editedFinalPrototype": false,
        "status": "actual"
      }
    ],
    "tokenUsage": {
      "input": "unknown",
      "output": "unknown",
      "total": "unknown"
    },
    "toolCalls": ["not captured"],
    "limitations": []
  },
  "details": "What changed, why it exists, and what should be reviewed.",
  "views": ["overview"],
  "variants": [
    {
      "id": "baseline",
      "title": "Baseline",
      "model": "GPT-5",
      "skill": "prototype-lab",
      "status": "actual",
      "agentMode": "single-agent-fallback",
      "agentTool": "not captured",
      "outputPath": "not captured",
      "fallbackReason": "not captured",
      "hypothesis": "What this variant tests.",
      "tradeoff": "Expected strength or risk."
    }
  ],
  "proof": []
}
```

Canonical folder shape:

```text
prototypes/
  index.html                 # optional landing only
  prototype-index.css        # optional landing only
  prototype-index.js         # optional landing only
  <YYYY>/<MM>/<NNN>-<prototype-slug>/
    metadata.json
    README.md
    index.html
    styles.css
    app.js
    assets/
    proof/
```

`prototypes/` root contains year folders and, when useful, the optional landing files above. Do not create root README/package/server/output/reference/shared folders there.

## Prototype Landing

When the workspace has multiple prototypes and no existing index, create a simple landing by copying `assets/prototype-index/` into `prototypes/`.

The landing should:

- show cards for recent or relevant prototypes
- render each prototype at scale using an iframe preview
- include title, question, category, status, tags, exact model/skill/agent/proof badges, date, path, and proof count
- require a `date` field for every index entry and group cards by day/week/month/year from a top-toolbar selector
- sort index groups newest-first, with newer prototype sequence numbers first inside the same date group
- keep the index as a grid gallery: date groups stack vertically, and cards inside each group stay in rows and columns
- offer direct open links for each prototype
- avoid redundant `Open prototype` text links when the preview itself opens the prototype
- open prototypes in the same window by default so browser back/forward navigation works
- use `?embed=1` or an equivalent preview mode so card iframes do not show dead reset/info/debug controls
- use one rounded main grid surface with a subtle shadow, keep prototype card surfaces neutral gray, and reserve saturated color for badges/status instead of border-heavy nested containers
- desaturated emoji-style icons are allowed in badges and footer metadata when they improve scanning without becoming decoration
- expose a compact A/B left-right comparison dropdown when a comparison hub is present and more than one prototype can be compared; prevent accidental same-vs-same pairs where possible
- behave like an evidence browser, not a portfolio gallery: previews do the visual work, cards provide only the metadata needed to decide what to open
- stay static and local; no server, package, or shared runtime dependency
- be updated when a new comparison lab or prototype is added

If the workspace already has an index, follow that local pattern instead of replacing it.

## Reference Files

- `references/product-design-loop.md`: read when no visual direction has been selected.
- `references/taste-calibration.md`: read when visual quality, redesign, brand feel, or polished interaction matters.
- `references/variant-comparison.md`: read when one request needs multiple model, skill, prompt, execution, or design variants in one navigable prototype.
- `references/agent-isolation.md`: read when multiple variants should be generated by isolated sub-agents or dedicated coding agents before integration.
- `references/quality-bar.md`: read for complex, stateful, async, multi-view, or polish-sensitive prototypes.
- `assets/prototype-shell/`: copy for every new browser/UI prototype.
- `assets/prototype-index/`: copy into `prototypes/` only when the workspace needs an optional landing index and has no local one.
