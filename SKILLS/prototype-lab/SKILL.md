---
name: prototype-lab
description: "Browser/UI prototype lab. Use when creating or improving standalone prototypes under prototypes/, visual direction options, controls/debug panels, or visual QA."
---

# Prototype Lab

Build polished browser prototypes inside `prototypes/` without scattering one-off UI experiments.

## Process

1. Confirm lab fit.
   - Use this for browser/UI prototypes that belong in `prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/`.
   - If the request is a quick terminal logic/state experiment, use `prototype` instead.
   - Done when the prototype question, year, month, number, slug, category metadata, and expected user path are explicit.

2. Load the local contract.
   - Read `AGENTS.MD` and `assets/prototype-shell/README.md` before editing.
   - Done when the folder shape, metadata file, standalone shell, direct file run path, and local proof location are known.

3. Select the visual direction.
   - If the user supplied a screenshot/mock or already picked a direction, build from that target.
   - If visual quality matters, read `references/taste-calibration.md` and lock the prototype read plus dials for the canvas.
   - If no direction exists, read `references/product-design-loop.md` and run the three-option Product Design loop before building.
   - Done when there is one selected build target, or an explicit decision to keep multiple views.

4. Build as a standalone prototype.
   - Copy `assets/prototype-shell/` into the prototype folder, then replace placeholder content.
   - Keep all runtime files local to that prototype: `index.html`, `styles.css`, `app.js`, `metadata.json`, `README.md`, and optional local `assets/`.
   - Hard ban: do not depend on `prototypes/_shared`, `prototypes/_references`, `prototypes/output`, sibling prototype code, shared components, global CSS, shared runtime helpers, server routes, APIs, or imports outside the prototype folder. Category is metadata, not a folder boundary.
   - Keep the required shell minimal: one full-width top toolbar, one full-screen prototype stage, and one right drawer for controls/info when needed. The drawer is hidden by default.
   - Put view navigation in the top toolbar when the prototype has multiple views. Do not add a left navigation rail.
   - Build ultra-wide/desktop first across `1920x1080` and `1200x820`, then prove tablet `834x1112` and mobile `390x844` sanity. Shell fills `100dvh`, body/page do not scroll, and the primary path fits the stage without requiring page scroll.
   - Use `improve-ui` for semantics, focus, hit areas, wrapping, motion, responsiveness, and browser proof.
   - Keep taste calibration scoped to the prototype canvas unless the request is shell work.
   - Done when every visible control/view has real behavior or is clearly marked as a noninteractive test case.

5. Prove the user path.
   - Run the smallest useful logic/static check for non-trivial behavior.
   - Manually exercise core views, controls, reset/back paths, overflow scrolling, ultra-wide, desktop, tablet, and a mobile sanity layout.
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
- No default left rail, no bottom status bar, no fake metadata strips. Status can live as one compact toolbar chip or inside the drawer.
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
- Prefer plain HTML/CSS/JS for small prototypes. Use TSX/framework code only when the question needs app runtime or framework behavior.
- Keep selected view/variation URL-backed when sharing, refresh, or direct comparison matters.
- Surface runtime state in the right drawer, toolbar status chip, or prototype canvas.
- Add no dependency unless the prototype cannot answer its question without it.
- Keep code readable enough to absorb or delete later.

## Run Contract

Open the prototype directly:

```text
prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/index.html
```

Do not create server, API, package, or browser navigator files under `prototypes/`. If an experiment needs HTTP, use a temporary static server command from the repo root or temp space and keep the prototype files self-contained.

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
  "model": "GPT-5",
  "tags": ["browser-ui"],
  "question": "What are we trying to learn?",
  "details": "What changed, why it exists, and what should be reviewed.",
  "views": ["overview"],
  "proof": []
}
```

Canonical folder shape:

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

`prototypes/` root contains only year folders. Do not create root README/package/server/output/reference/shared folders there.

## Reference Files

- `references/product-design-loop.md`: read when no visual direction has been selected.
- `references/taste-calibration.md`: read when visual quality, redesign, brand feel, or polished interaction matters.
- `references/quality-bar.md`: read for complex, stateful, async, multi-view, or polish-sensitive prototypes.
- `assets/prototype-shell/`: copy for every new browser/UI prototype.
