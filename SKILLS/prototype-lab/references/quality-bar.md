# Prototype Quality Bar

Use after the core prototype works when it is complex, stateful, async, multi-view, polish-sensitive, or requested as real-user-ready.

## Review Angles

- Product: one clear question, visible success criteria, enough states to answer it.
- UX: navigation, controls, state, errors, empty/loading, and reset/back paths visible without explanation.
- Interface: keep the generated workspace/comparison shell compact and quiet. Do not apply its dark palette, type, density, card, radius, or no-glow preferences to an independently designed variant canvas.
- Taste: coherent, task-specific visual language. In a capability showcase, judge approved direction and skill interventions, not conformity to Prototype Lab styling.
- Comparison integrity: one shared prompt, clear criteria, actual/planned/simulated attribution, consistent frames or states for every variant.
- Provenance integrity: prompts, skills, agent mode/tool, models, token counts, tool calls, scratch output paths, and limitations present when relevant; unknown values labelled, never guessed.
- Accessibility: semantic controls, labels, visible focus, keyboard path, accessible names for icon-only actions, no overlapping hit areas.
- Required viewport fit: apply the experiment's layout policy. `app-shell` forbids body/page overflow on desktop/tablet; `immersive-stage` keeps the primary stage in view; `page-scroll` permits intentional vertical narrative scrolling; `open` requires an intentional choice. Horizontal overflow is a failure in every mode.
- Responsiveness: preserve the selected direction structurally. Do not force every creative site into a condensed desktop tool or stacked panel list.
- Engineering: local files readable, state inspectable, metadata complete, no shared component/helper/runtime dependency, no imports outside the prototype folder, no one-off server, no production-looking stale prototype.

## Manual Checks

- Switch every internal view.
- For comparison labs, switch compare/focus views, select every variant, refresh one non-default `view`/`variant` URL, and confirm source labels match the real execution.
- If the lab includes pairwise, blind, rankings, iterations, or archive modes, check left/right URL params, reveal/reset behavior, ordered notes, iteration links, and hidden archived variants.
- If a design round is open, flip every live position including `?p=` refresh, confirm position 1 is the frozen original unless `--new`, and inspect each position at `390x844`.
- Open the drawer and inspect provenance: prompt, skills, agent mode/tool, model/settings, tokens, tool calls, limitations, and active variant attribution.
- For isolated variant runs, each requested variant has a worker result path or an explicit `single-agent-fallback`/`unavailable` entry.
- Fallback entries include an exact `fallbackReason`; vague notes like "not needed" or "simpler this way" do not pass.
- Delivered variant count matches the requested count unless the README records a user-approved reduction or hard blocker.
- Every variant labelled independent has a worker receipt and `crossVariantLeakage: false`.
- Change every control.
- Reset state and recover from invalid/empty input where present.
- Copy/snapshot state if the prototype exposes it.
- Resize to ultra-wide, desktop, tablet, and mobile.
- At `1920x1080`, `1200x820`, and `834x1112`, enforce the declared layout policy and always reject horizontal overflow.
- Main state fits the central stage; only navigation, debug logs, long data, or deliberately scrollable inner panes may overflow.
- Right drawer scrolling with overflow content; hidden by default.
- Long titles, long labels, empty values, and dense debug data.
- Visual direction does not hide the prototype question, user path, or state being tested.
- Scaled comparison panels stay legible enough to compare; move details into focus mode instead of shrinking a full app into unreadable thumbnails.
- If `prototypes/index.html` exists, search/filter, inspect scaled iframe cards, and open at least one direct prototype link.
- Reflexive slop: three-card rows, nested panels, fake metadata strips, nonfunctional debug controls, oversized radii, decorative glow/glass, and generic copy.
- Icons aligned; decorative icons hidden from assistive tech; icon-only actions named.
- Empty, error, loading, permission, and retry only when the chosen experience can genuinely enter those states.

## Proof

Save screenshots and review artifacts in the owning prototype folder, usually `proof/`.

Required for UI changes:

- ultra-wide screenshot
- desktop screenshot
- tablet screenshot
- mobile sanity screenshot when layout changes affect stacking
- comparison labs: one compare-view proof plus focused proof or notes for every variant
- prototype landing: one proof screenshot showing scaled cards and one note that direct links work
- note of any visual or interaction gap that remains
- selected design read and dials for visual-direction prototypes

## Verification Receipt

Run `lab verify --id <id> --profile full --init-review` to create `proof/browser-review.json`. Exercise the real entrypoint, count and exercise every visible control, test navigation targets, then record four canonical viewports, fit, horizontal and vertical overflow, scroll owner, scrollbar treatment, console/runtime errors, structured interaction and accessibility checks, and finish dimensions. The 1920x1080 review needs DPR 2 detail evidence. Set `status: passed` only from actual browser evidence; native default scrollbar chrome, skipped controls, missing navigation, or a failed applicable finish dimension blocks it.

`lab verify --profile quick` checks self-containment, metadata, paths, and references — not browser correctness. `full` also validates the browser receipt and its screenshots. `lab finalize` writes the verification report and marks ordinary artifacts `complete` only after the selected profile passes. Experiment variants also need a coordinator comparison review whose variant completion is `pass` with no blockers; a review blocker keeps or returns the owner to blocked. `lab ship` requires the full profile.

If the repo provides this script, run it before handoff and fix actionable failures:

```bash
node scripts/validate-prototype-standalone.mjs
```

Use direct browser screenshots against `prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/index.html` for focused verification. If file URLs are insufficient, use a temporary static server outside `prototypes/`.

Done when proof files exist, `metadata.json` and `README.md` point to them, and any skipped check has a concrete reason.
