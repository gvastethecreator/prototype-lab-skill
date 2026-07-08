# Prototype Structure Checklist

Use this before handoff when a prototype is complex, stateful, async, multi-view, or likely to be reused as evidence.

## Required Checks

- Folder: the prototype lives at `prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/`.
- Files: `metadata.json`, `README.md`, `index.html`, `styles.css`, `app.js`, local `assets/`, and local `proof/` exist when relevant.
- Isolation: runtime code, assets, helpers, and styles are local to the prototype folder.
- No shared dependencies: no imports or runtime references to `_shared`, `_references`, sibling prototypes, `prototypes/output`, repo server routes, APIs, global CSS, or shared components.
- Shell structure: top toolbar, full-screen stage, and optional hidden-by-default right panel are present.
- Toolbar: view navigation and important controls are reachable from the top toolbar.
- Right panel: secondary controls, state, notes, or debug info live there when needed.
- Metadata: id, month, number, slug, title, category, status, date, model, tags, question, details, views, and proof are recorded.
- README: question, status, run path, proof path, views, and notes are recorded.
- Behavior: every visible view/control either works or is clearly marked as a noninteractive test case.
- State coverage: empty, error, loading, permission, retry, long-content, or reset states are covered when they matter to the prototype question.
- Accessibility basics: semantic controls, labels, visible focus, keyboard path, accessible names for icon-only actions, and no overlapping hit areas.
- Viewport fit: toolbar, stage, and right panel remain reachable at `1920x1080`, `1200x820`, `834x1112`, and a mobile sanity size.

## Proof

Save screenshots and review artifacts inside the owning prototype folder, usually `proof/`.

Recommended proof for UI prototypes:

- desktop screenshot
- tablet screenshot when layout changes matter
- mobile sanity screenshot when layout changes affect stacking
- note of any behavior, state, or verification gap that remains

When the target repo provides validation scripts, run the smallest relevant check and fix actionable failures. If a browser API requires HTTP, use a temporary static server outside `prototypes/`.

Done when proof files exist, `metadata.json` and `README.md` point to them, and any skipped check has a concrete reason.
