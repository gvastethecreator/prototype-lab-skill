# Reusable Prompt Templates

Use this contract when prompts will be repeated, compared across models or
skills, tuned over time, or shared with another reviewer.

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
