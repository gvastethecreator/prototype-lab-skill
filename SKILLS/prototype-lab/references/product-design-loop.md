# Product Design Loop

Use this when a browser/UI prototype has no selected visual direction.

## Brief

Use `product-design:get-context` to confirm:

- what the prototype must let the user do
- what decision the prototype must answer
- visual source, desired look, or constraints
- expected interactivity level

If the user already supplied those details, replay the brief and continue only when the direction is confirmed or safely inferable.

Done when the build target can be judged against a specific user path and visual intent.

## Three Options

Use `product-design:ideate` plus `imagegen` for exactly three independent directions.

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

Do not create three color swaps of the same layout.
Do not create three generic landing-page variations when the prototype question is about a tool, workflow, state model, or game feel.

For each option, include the prototype read and dials from `references/taste-calibration.md`:

- `DESIGN_VARIANCE`
- `MOTION_INTENSITY`
- `VISUAL_DENSITY`

Done when all three options are structurally different enough that choosing one changes the implementation.

## Critique Before Build

For each option, name:

- strongest fit
- likely failure mode
- what to merge or discard

Then ask whether to build option 1, option 2, option 3, a combination, or separate prototype views.

Done when one direction or explicit multi-view comparison scope is selected.
