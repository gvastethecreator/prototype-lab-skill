# Prototype Taste Calibration

Use this when a prototype needs visual direction, polish, multiple design options, or real-user review. It adapts useful ideas from `Leonxlnx/taste-skill` for prototypes, while preserving this lab's compact dark standalone shell and proof-first workflow.

Upstream source: `https://github.com/Leonxlnx/taste-skill` (MIT). Keep this paraphrased and local.

## Prototype Read

Before building or improving a prototype, lock one short read:

`Reading this as: <prototype kind> for <decision/user>, testing <question>, with <visual language>, under <shell/system constraints>.`

Include:

- Question: what decision the prototype must answer.
- User path: the path a reviewer should exercise.
- Prototype kind: flow, component, interaction model, visual direction, game/tool, data state, or comparison.
- Register split: the standalone lab shell stays product/tool; the prototype canvas can be brand, product, game, editorial, or experimental.
- Constraints: standalone shell, viewport targets, debug visibility, controls, local assets, accessibility, metadata, and proof artifacts.

## Dials

Set dials for the prototype canvas, not the whole shell.

- `DESIGN_VARIANCE`: `1` = conservative/systemic, `10` = exploratory/art-directed.
- `MOTION_INTENSITY`: `1` = static proof, `10` = motion/interaction is the hypothesis.
- `VISUAL_DENSITY`: `1` = one focal idea, `10` = dense debug/data comparison.

Defaults:

- Product interaction prototype: variance `2-4`, motion `2-4`, density `5-8`.
- Visual direction prototype: variance `6-9`, motion `3-6`, density `2-5`.
- Game/tool prototype: variance `4-8`, motion `4-8`, density follows playability.
- Data/debug prototype: variance `1-3`, motion `1-3`, density `7-10`.
- Comparison lab: variance follows the declared experiment, motion `1-4` unless motion is being compared, density `7-10` for the compare view and `4-7` for focus view.

The shell remains compact and quiet even when the canvas is expressive.

## Comparison Read

For multi-variant labs, write one shared read and one short variant read per option:

- Shared read: `Reading this as: comparison prototype for <reviewer>, testing <same prompt> across <model/skill/prompt/design dimension>, judged by <criteria>.`
- Variant read: `<variant-id>: using <actual source/status>, expected to improve <hypothesis>, risking <tradeoff>.`

Keep all variants comparable: same state, same frame, same amount of content, and visible source labels. Let the focus view carry detail that the compare view cannot fit.

## Three-Option Direction

When no visual target exists, options must differ by meaningful structure, not skin.

Vary at least two of:

- layout architecture
- information hierarchy
- control/debug placement
- density
- visual language
- motion model
- image/media strategy
- primary interaction loop

Do not produce three color swaps, three identical bento grids, or three centered hero variants.

For each option, state:

- design read
- dials
- strongest fit
- likely failure mode
- what should be merged or discarded

## Reference-Led Prototypes

Use screenshots, generated images, or section/state references when the prototype is mainly about visual direction, brand feel, hero/landing composition, art direction, or polished interaction.

Rules:

- Prefer clear per-view or per-state references over one tiny board.
- Generate or request detail references when typography, spacing, buttons, or state treatment are too small to inspect.
- Extract before coding: text, type scale, layout, spacing, gutters, color roles, component shape, media treatment, state affordances, and motion implication.
- Keep references as direction for the prototype canvas; do not redesign the standalone shell unless the task is shell work.
- Direct-code first is fine for logic, controls, bug reproduction, and focused state experiments.

## Prototype Anti-Slop

Flag:

- Prototype canvas looks like a generic SaaS landing page unrelated to the question.
- Debug controls are decorative or nonfunctional.
- Tiny labels, pills, fake metadata, or status strips create fake sophistication.
- Three-card grids, nested cards, glow/glass, and huge radii appear by reflex.
- Motion is claimed but not implemented, or implemented but irrelevant to the hypothesis.
- Visual direction hides the state the prototype is supposed to test.
- The first viewport is crowded enough that the test path is unclear.

Prefer:

- One explicit hypothesis per view.
- Real controls and visible state transitions.
- Clear comparison points when multiple options exist.
- Compact typography in the shell; expressive typography only inside the prototype canvas when it serves the question.
- Browser screenshots proving the chosen direction at desktop and mobile/tablet sizes.

## Preflight

- Prototype read exists.
- Dials are set for the canvas when visual quality matters.
- The shell remains usable: top toolbar, toolbar navigation, hidden-by-default right drawer, full-screen stage, and scroll behavior.
- Every visible control either works or is marked as a noninteractive test case.
- State coverage matches the hypothesis: empty/error/loading/permission/long content when relevant.
- Visual proof exists in the prototype's local `proof/` folder.
- Prototype `metadata.json` records month, number, category, details, tags, model, views, and proof.
- Prototype `README.md` records question, status, run URL, proof, views, and known gaps.
