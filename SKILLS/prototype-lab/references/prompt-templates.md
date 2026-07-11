# Reusable Prompt Templates

Use this contract when prompts will be repeated, compared across models or
skills, tuned over time, or shared with another reviewer.

## Workspace Prompt Library

Keep reusable test prompts in `prototypes/prompts/`, separate from chronological
prototype folders:

```text
prototypes/prompts/
  README.md
  catalog.json
  <prompt-id>/
    prompt.json
    v001/
      prompt.template.md
      prompt.vars.json
      prompt.rendered.md
```

Run `scripts/manage-prompt-library.mjs init` to create the library, `seed` to
install the bundled creative evaluation suite, `save --meta <json> --template
<md> [--vars <json>]` to persist a user- or agent-authored prompt, and `catalog`
to rebuild the index. Resolve the script relative to this skill folder.
Use `pick --count 4` for a deterministic, category-diverse subset; add
`--difficulty` or `--category` only for a deliberately narrower benchmark.

Default to saving prompts created for model/skill/agent tests. Skip automatic
storage when the user marks a prompt ephemeral or when it contains secrets,
customer data, or other material that should not become reusable. Saving creates
a new immutable version; it never overwrites an executed prompt.
The manager rejects local absolute paths and obvious secret/private-key shapes;
use portable placeholders and relative paths in reusable prompts.

When an agent invents a test prompt, require a stable id, title, category,
difficulty, one-sentence challenge, required behaviors, test dimensions, and
target viewports. For creative capability prompts also record
`comparisonIntent`, `creativeFreedom`, `fixedOutcomes`, `openDecisions`,
`assetPolicy`, and `layoutPolicy`. Use the creative starter suite when the user
wants broad model coverage without supplying a prompt. Copy the selected
rendered version into the experiment owner folder and record the library
id/version/hash in receipts.

Do not treat a long list of required controls as creative freedom. In a
`showcase`, keep the shared brief at or below 320 words, declare at most five
fixed outcomes, leave at least six meaningful decisions open, and keep visual
judgment criteria out of the worker prompt. Use
`capability-comparisons.md` for the direction/spend gate.

## Artifact Set

Keep these files in the experiment owner folder. For a single prototype that is
the prototype folder. For a comparison, that is the comparison hub.

```text
prompts/
  <prompt-id>.template.md
  <prompt-id>.vars.json
  <prompt-id>.rendered.md
runs/
  <run-id>.json
```

- The template is reusable and uses `{{variable}}` placeholders.
- The variables file contains the concrete values for one prompt version.
- The rendered file is the exact text sent to the model or worker.
- The run receipt points to all three and stores the rendered SHA-256 hash.

Copy the starter files from `assets/portable-lab/`. Render with
`scripts/render-prompt-template.mjs`, resolved relative to this skill folder.
Missing variables must fail instead of leaving ambiguous placeholders.
The receipt starter is intentionally `planned` and contains `REQUIRED-`
markers. Replace every marker and set `status: actual` only after the run
produces a real artifact. Packaging must fail when a declared receipt still
contains a marker or its prompt hash does not match the rendered file.

## Template Rules

- Give each logical prompt a stable lowercase id and integer version.
- Increment the version when instructions or evaluation criteria change.
- Keep model, skill, and reasoning settings out of the shared template when
  they are the comparison dimension; put them in `variant_assignment` and the
  run receipt.
- Keep coordinator-only skills, memory, hub styling, and taste guidance out of
  worker prompts.
- Treat assets as an explicit policy. When `required`, the receipt must include
  the tool/skill, prompt, project-relative file, SHA-256, dimensions,
  `consumedBy` references, and materiality proof. `allowed` is not evidence that
  the asset skill was tested.
- Use `fixed-supplied` when every comparison condition must receive the same
  pre-generated files. Freeze their hashes, prohibit regeneration, and require
  project-local copies plus `consumedBy` and materiality proof.
- Keep invariant content, state, viewport, and output requirements identical
  across runs unless one of them is the declared comparison dimension.
- Do not overwrite a rendered prompt after a run. Create a new version or run.
- Record the exact rendered hash before dispatching isolated workers.
- Store reusable instructions, not hidden reasoning or chain-of-thought.

## Run IDs

Use stable, sortable ids such as:

```text
<experiment>-<variant>-attempt-01
```

Every rerun gets a new attempt id, even when the files look identical. This
keeps model retries, tool failures, and fallbacks comparable instead of erasing
the history.

## Comparison Matrix

Before dispatch, freeze a small matrix:

| Run id | Prompt version | Model route | Skill condition | Attempt |
| --- | --- | --- | --- | --- |
| `lab-sol-base-attempt-01` | `shared@1` | `gpt-5.6-sol` | baseline | 1 |
| `lab-sol-design-attempt-01` | `shared@1` | `gpt-5.6-sol` | design skill | 1 |

Only declare a result comparable when the receipt confirms the intended route,
prompt hash, input isolation, and artifact path. Label missing confirmation as
`not captured`; do not infer it from the requested setup.

## Metadata Links

Add `promptTemplates` and `runs` to the owner `metadata.json`. Store paths
relative to that folder so moving or packaging the experiment does not break
them. Use the run receipt as the detailed source of truth; metadata should be a
compact index, not a second full receipt.
