# Prototype Quality Bar

Use this after the core prototype works when it is complex, stateful, async, multi-view, polish-sensitive, or requested as real-user-ready.

## Review Angles

- Product: one clear question, visible success criteria, and enough states to answer it.
- UX: navigation, controls, state, errors, empty/loading states, and reset/back paths are visible without explanation.
- Interface: dark standalone shell, restrained contrast, very compact type, functional icons, no glow/glass, no decorative noise, no oversized radii.
- Taste: prototype read and dials are explicit when visual quality matters; the canvas has a coherent visual language without generic SaaS/card/glow defaults.
- Comparison integrity: multi-variant labs keep one shared prompt, clear comparison criteria, actual/planned/simulated attribution, and consistent frames or states for every variant.
- Provenance integrity: prompts, skills, agent mode/tool, models, token counts, tool calls, scratch output paths, and limitations are present when relevant; unknown values are labelled instead of guessed.
- Accessibility: semantic controls, labels, visible focus, keyboard path, accessible names for icon-only actions, and no overlapping hit areas.
- Required viewport fit: at `1920x1080`, `1200x820`, and `834x1112`, the shell fills the viewport with compact chrome, body/page do not scroll, and the primary canvas/demo state is fully inspectable without vertical or horizontal content scroll.
- Responsiveness: ultra-wide remains bounded and readable, desktop shell comes first, tablet compression stays intentional, mobile stacks panels with intentional text wrapping.
- Engineering: local files are readable, state is inspectable, metadata is complete, no shared component/helper/runtime dependency, no imports outside the prototype folder, no one-off server, and no production-looking stale prototype.

## Manual Checks

- Switch every internal view.
- For comparison labs, switch compare/focus views, select every variant, refresh one non-default `view`/`variant` URL, and confirm source labels match the real execution.
- If the lab includes pairwise, blind, rankings, iterations, or archive modes, verify left/right URL params, reveal/reset behavior, ordered notes, iteration links, and hidden archived variants.
- Open the drawer and inspect provenance: prompt, skills, agent mode/tool, model/settings, tokens, tool calls, limitations, and active variant attribution.
- For isolated variant runs, confirm each requested variant has a worker result path or an explicit `single-agent-fallback`/`unavailable` entry.
- Change every control.
- Reset state and recover from invalid/empty input where present.
- Copy/snapshot state if the prototype exposes it.
- Resize to ultra-wide, desktop, tablet, and mobile.
- At `1920x1080`, `1200x820`, and `834x1112`, confirm no body/page scroll and no shell row/panel extends outside the viewport.
- Confirm the main state fits the central stage; only navigation, debug logs, long data, or deliberately scrollable inner panes may overflow.
- Check right drawer scrolling with overflow content and confirm it is hidden by default.
- Check long titles, long labels, empty values, and dense debug data.
- Check that visual direction does not hide the prototype question, user path, or state being tested.
- Check that scaled comparison panels are still legible enough to compare; move details into focus mode instead of shrinking a full app into unreadable thumbnails.
- If `prototypes/index.html` exists, search/filter, inspect scaled iframe cards, and open at least one direct prototype link.
- Check for reflexive slop: three-card rows, nested panels, fake metadata strips, nonfunctional debug controls, oversized radii, decorative glow/glass, and generic copy.
- Check icons are aligned, decorative icons are hidden from assistive tech, and icon-only actions have names.
- Check empty, error, loading, permission, and retry cases when the prototype has data or async behavior.

## Proof

Save screenshots and review artifacts inside the owning prototype folder, usually `proof/`.

Required for UI changes:

- ultra-wide screenshot
- desktop screenshot
- tablet screenshot
- mobile sanity screenshot when layout changes affect stacking
- comparison labs: one compare-view proof plus focused proof or notes for every variant
- prototype landing: one proof screenshot showing scaled cards and one note that direct links work
- note of any visual or interaction gap that remains
- selected design read and dials for visual-direction prototypes

When the repo provides these scripts, run them before handoff and fix actionable failures:

```bash
node scripts/validate-prototype-standalone.mjs
```

Use direct browser screenshots against `prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/index.html` for focused verification. If file URLs are insufficient, use a temporary static server outside `prototypes/`.

Done when proof files exist, `metadata.json` and `README.md` point to them, and any skipped check has a concrete reason.
