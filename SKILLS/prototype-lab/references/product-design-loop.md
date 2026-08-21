# Product Design Loop

Use when a browser/UI prototype has no selected visual direction.

If the task is several rendered takes of one brief, use a design round: read `design-rounds.md` and run `lab vary`. Skip this shared loop during model/agent/skill comparisons — it leaks one design process into every condition. Use `capability-comparisons.md` instead.

## Brief

Use `product-design:get-context` to confirm:

- what the prototype must let the user do
- what decision the prototype must answer
- visual source, desired look, or constraints
- expected interactivity level

If already supplied, replay it; continue when direction is confirmed or safely inferable.

Done when build target can be judged against a specific user path and visual intent.

## One Build Or A Round

Build one canvas when the user already picked a direction, or when the question has one defensible answer.

Open a round when they asked for alternatives, directions, or "a few takes". Do not describe three options in chat and then build one. Put rendered positions on the page.

## Three-Option Critique

For a single-build artifact with no round, `product-design:ideate` for exactly three independent directions. `imagegen` only when declared asset policy requires or allows it and raster exploration serves the brief.

Each option must vary at least one meaningful axis:

- information hierarchy
- navigation model
- control placement
- debug/state visibility
- density
- interaction model
- visual language
- motion model
- image/media strategy

No three color swaps of same layout, or three generic landing pages, when question is a tool, workflow, state model, or game feel.

Each option includes prototype read and dials from `references/taste-calibration.md`: `DESIGN_VARIANCE`, `MOTION_INTENSITY`, `VISUAL_DENSITY`.

Done when choosing one of three structurally different options changes the implementation.

## Critique Before Build

For each option, name strongest fit, likely failure mode, and what to merge or discard. Ask whether to build option 1, 2, 3, a combination, or a `vary` round.

Done when one direction or an explicit multi-position round is selected.
