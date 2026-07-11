# Prototype Quality Bar

Use this after the core prototype works when it is complex, stateful, async, multi-view, polish-sensitive, or requested as real-user-ready.

## Review Angles

- Product: one clear question, visible success criteria, and enough states to answer it.
- UX: navigation, controls, state, errors, empty/loading states, and reset/back paths are visible without explanation.
- Interface: keep the generated workspace/comparison shell compact and quiet. Do not apply its dark palette, type, density, card, radius, or no-glow preferences to an independently designed variant canvas.
- Taste: the variant has a coherent, task-specific visual language. In a capability showcase, judge its approved direction and skill interventions rather than conformity to Prototype Lab styling.
- Comparison integrity: multi-variant labs keep one shared prompt, clear comparison criteria, actual/planned/simulated attribution, and consistent frames or states for every variant.
- Provenance integrity: prompts, skills, agent mode/tool, models, token counts, tool calls, scratch output paths, and limitations are present when relevant; unknown values are labelled instead of guessed.
- Accessibility: semantic controls, labels, visible focus, keyboard path, accessible names for icon-only actions, and no overlapping hit areas.
- Required viewport fit: apply the experiment's layout policy. `app-shell` forbids body/page overflow on desktop/tablet; `immersive-stage` keeps the primary stage in view; `page-scroll` permits intentional vertical narrative scrolling; `open` requires an intentional choice. Horizontal overflow remains a failure in every mode.
- Responsiveness: preserve the selected direction structurally. Do not force every creative site into a condensed desktop tool or stacked panel list.
- Engineering: local files are readable, state is inspectable, metadata is complete, no shared component/helper/runtime dependency, no imports outside the prototype folder, no one-off server, and no production-looking stale prototype.

## Manual Checks

- Switch every internal view.
- For comparison labs, switch compare/focus views, select every variant, refresh one non-default `view`/`variant` URL, and confirm source labels match the real execution.
- If the lab includes pairwise, blind, rankings, iterations, or archive modes, verify left/right URL params, reveal/reset behavior, ordered notes, iteration links, and hidden archived variants.
- Open the drawer and inspect provenance: prompt, skills, agent mode/tool, model/settings, tokens, tool calls, limitations, and active variant attribution.
- For isolated variant runs, confirm each requested variant has a worker result path or an explicit `single-agent-fallback`/`unavailable` entry.
- Confirm fallback entries include an exact `fallbackReason`; vague notes like "not needed" or "simpler this way" do not pass.
- Confirm the delivered variant count matches the requested count unless the README records a user-approved reduction or hard blocker.
- Confirm every variant labelled independent has a worker receipt and `crossVariantLeakage: false`.
- Change every control.
- Reset state and recover from invalid/empty input where present.
- Copy/snapshot state if the prototype exposes it.
- Resize to ultra-wide, desktop, tablet, and mobile.
- At `1920x1080`, `1200x820`, and `834x1112`, enforce the declared layout policy and always reject horizontal overflow.
- Confirm the main state fits the central stage; only navigation, debug logs, long data, or deliberately scrollable inner panes may overflow.
- Check right drawer scrolling with overflow content and confirm it is hidden by default.
- Check long titles, long labels, empty values, and dense debug data.
- Check that visual direction does not hide the prototype question, user path, or state being tested.
- Check that scaled comparison panels are still legible enough to compare; move details into focus mode instead of shrinking a full app into unreadable thumbnails.
- If `prototypes/index.html` exists, search/filter, inspect scaled iframe cards, and open at least one direct prototype link.
- Check for reflexive slop: three-card rows, nested panels, fake metadata strips, nonfunctional debug controls, oversized radii, decorative glow/glass, and generic copy.
- Check icons are aligned, decorative icons are hidden from assistive tech, and icon-only actions have names.
- Check empty, error, loading, permission, and retry only when the chosen experience can genuinely enter those states.

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
