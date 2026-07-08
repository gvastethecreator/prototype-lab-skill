---
name: prototype-lab
description: "Browser/UI prototype lab. Use when creating or improving standalone prototypes under prototypes/ with chronological folders, local runtime files, metadata, README, shell structure, and proof."
---

# Prototype Lab

Build organized standalone browser prototypes inside `prototypes/`.

## Purpose

Use this skill to keep prototype work discoverable, self-contained, and easy to review. It does not prescribe visual style. Let the prototype choose whatever look, interaction feel, and presentation best fit the user's request.

## Process

1. Confirm lab fit.
   - Use this for browser/UI prototypes that belong in `prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/`.
   - If the request is a quick terminal logic/state experiment, use `prototype` instead.
   - Done when the prototype question, expected user path, year, month, number, slug, category, and status are explicit.

2. Create the prototype folder.
   - Use the canonical folder shape below.
   - Keep `prototypes/` root reserved for year folders only.
   - Copy `assets/prototype-shell/` into the new prototype folder, then replace placeholder content.
   - Keep proof artifacts inside the prototype's local `proof/` folder.

3. Keep the runtime standalone.
   - Keep all runtime files local to that prototype: `index.html`, `styles.css`, `app.js`, `metadata.json`, `README.md`, and optional local `assets/`.
   - Hard ban: do not depend on `prototypes/_shared`, `prototypes/_references`, `prototypes/output`, sibling prototype code, shared components, global CSS, shared runtime helpers, server routes, APIs, or imports outside the prototype folder.
   - Open the prototype directly from `index.html` unless the experiment truly needs HTTP.
   - If HTTP is needed, use a temporary static server from outside `prototypes/`; do not add server, package, API, or navigator files under `prototypes/`.

4. Preserve only the required shell structure.
   - Top toolbar: full-width, used for view navigation and important controls.
   - Stage: full-screen remaining area for the prototype itself.
   - Right panel: optional floating panel for controls or information, hidden by default.
   - Design freely inside that structure. The starter CSS is a convenience, not a style contract.
   - Do not add extra permanent navigation/control regions unless the prototype is explicitly testing them.

5. Record and prove.
   - Fill out `metadata.json` and the prototype `README.md`.
   - Exercise the expected user path, views, controls, reset/back paths, and relevant states.
   - Run the smallest useful static, logic, or browser check available in the target repo.
   - Save screenshots or review artifacts under `proof/`, and point `metadata.json` plus `README.md` to them.
   - For complex, stateful, async, or multi-view prototypes, read `references/quality-bar.md` before handoff.

## Canonical Folder Shape

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

## Reference Files

- `assets/prototype-shell/`: copy for every new browser/UI prototype.
- `references/quality-bar.md`: read before handoff for complex, stateful, async, or multi-view prototypes.
