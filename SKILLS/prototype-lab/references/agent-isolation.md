# Agent Isolation for Variant Builds

Use this when a request asks for multiple prototypes or variants from one brief, especially when variants compare models, skills, agents, prompts, or execution styles.

## Default Rule

Use one isolated worker per variant whenever sub-agent or dedicated coding-agent tools are available and safe.

The main agent is the coordinator:

- freeze the shared brief
- freeze the integrity contract
- define variant ids and criteria
- dispatch one worker per variant
- collect worker outputs
- integrate the final comparison prototype
- verify the assembled result

Do not build all variants in one continuous context when the request is explicitly about comparing different models, skills, or agents. If worker execution is unavailable, record the fallback as `single-agent-fallback` and do not claim independent generation.

## Isolation Contract

Workers receive only:

- shared prompt or brief
- assigned variant id
- assigned model, skill, prompt treatment, or approach
- output contract
- constraints that apply to every variant

Workers must not receive:

- another variant's output
- another worker's critique
- the coordinator's preferred answer
- hidden conclusions about which variant should win
- unrelated workspace context

This keeps the comparison from collapsing into four versions of the coordinator's current mental state.

## Integrity Contract

Before dispatch, write the contract the workers and coordinator must obey:

- `sharedBriefId`: stable id for the exact prompt every worker receives
- `variantIds`: all requested variants and their assigned source
- `lockedDimension`: model, skill, prompt treatment, interaction strategy, visual language, layout, density, motion, or another declared dimension
- `allowedInputs`: shared brief, assigned variant, output contract, shared constraints
- `blockedInputs`: other variant outputs, screenshots, critiques, rankings, coordinator preferences, final shell code, and sibling worker scratch
- `receiptRequired`: scratch path, summary, files/snippets, provenance, limitations, and worker self-check
- `fallbackRule`: how to label unavailable tooling or single-agent work without claiming independent execution

The contract is complete when a later reviewer can tell which differences were allowed and which differences would be contamination.

## Worker Receipts

Each worker returns a receipt before integration:

- variant id and source assignment
- scratch output path or exact reason no output exists
- prompt id and any declared prompt variation
- skills consulted, model/settings when known, and worker tool/mode
- token usage and tool calls when visible, otherwise `unknown` or `not captured`
- files/snippets/assets intended for integration
- limitations, failed steps, missing tools, or places where the worker could not satisfy the brief
- self-check: `no other variants inspected`, `only assigned inputs used`, or the concrete exception if the experiment allowed cross-variant iteration

No receipt means no independent attribution. The coordinator may still include the variant as `planned`, `simulated`, `inspired`, or `unavailable`, or record `single-agent-fallback` as its agent mode, but not as an isolated model/skill/agent result.

## Worker Prompt Shape

Use this prompt shape for each worker:

```text
Use prototype-lab to create one variant for a multi-variant browser/UI prototype.

Shared brief:
<same prompt for every worker>

Variant:
- id: <variant-id>
- source: <model/skill/approach/prompt treatment>
- hypothesis: <what this variant should test>
- constraints: <viewport, shell, technology, no shared dependencies>
- input scope: shared brief plus this variant only
- blocked inputs: other variants, worker critiques, rankings, final shell code, sibling scratch

Output:
- variant summary
- files or code snippets needed for integration
- provenance: prompt used, skills consulted, model/settings if known, token usage if visible, tool calls if visible, limitations
- receipt: scratch output path or unavailable reason
- self-check: whether any non-assigned variant input was seen
- do not inspect or imitate other variants
- do not edit the final prototype folder unless explicitly assigned that folder
```

Keep the shared brief text identical across workers unless prompt variation is the experiment.

## Output Locations

Prefer worker outputs under a scratch location outside `prototypes/`, for example:

```text
.scratch/prototype-lab/<prototype-slug>/<variant-id>/
```

The coordinator can then integrate outputs into:

```text
prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/
```

Do not let multiple workers edit the same final `index.html`, `styles.css`, `app.js`, `metadata.json`, or `README.md` concurrently.

Do not put all workers in one shared scratch folder where they can read each other by accident. If tooling forces sequential work or a shared location, record that limitation and keep later prompts free of earlier outputs.

## Dedicated Agent Options

Use the best available isolation mechanism in the current environment:

- built-in sub-agent or multi-agent tools
- a dedicated coding-agent CLI in a contained scratch path
- a separate thread only when the user explicitly asks for user-owned threads

Before using CLI workers, verify the CLI exists with `--help`, avoid secrets, keep outputs under scratch/temp, and do not allow commit, push, branch, or worktree operations unless the user explicitly asked for them.

If no safe worker mechanism exists, continue in one agent only after recording the limitation.

## Attribution Integrity Gate

Before integration, classify each variant's status and execution mode:

- `actual`: a worker or explicitly assigned execution produced a receipt for that variant.
- `planned`: the variant is specified but not built.
- `simulated`: the coordinator built an approximation to show what the unavailable source might test.
- `inspired`: the coordinator used a source as loose direction without invoking it.
- `unavailable`: the requested model, skill, agent, or tool could not be used.
- `single-agent-fallback`: execution mode for one agent building multiple variants after worker isolation was unavailable.

Reject independent attribution when:

- the output path is missing for a claimed worker result
- the worker saw another variant, critique, ranking, or final shell without that being the declared experiment
- the coordinator designed every variant from one blended plan and then labelled them as separate sources
- model, skill, token, or tool-call details are guessed instead of captured
- later variants imitate earlier variants because dispatch happened sequentially with leaked context

The fix is not to hide the problem. Keep the variant, downgrade the status, and record the limitation in `metadata.json`, README, and the drawer.

## Integration

When integrating:

- preserve each worker's variant intent
- normalize frame, state, and content only enough to make comparison fair
- keep visible attribution labels
- preserve receipt paths and input-scope notes
- record actual vs planned vs simulated status
- do not erase worker limitations
- do not blend all variant ideas into one undifferentiated design

The final prototype may share one shell and one codebase, but the variant ledger must show how each variant was produced.

## Provenance

Record per variant:

- `agentMode`: `subagent`, `dedicated-cli`, `separate-thread`, `single-agent-fallback`, or `unavailable`
- `agentTool`: tool or CLI name when known
- `promptId`: shared or variant prompt id
- `outputPath`: scratch path or `not captured`
- `inputScope`: what the worker was allowed to see
- `receivedOtherVariants`: boolean or `unknown`
- `editedFinalPrototype`: boolean or `unknown`
- `skills`: skills consulted by the worker
- `model`: model/settings when known
- `tokenUsage`: input/output/total if visible, otherwise `unknown`
- `toolCalls`: captured calls if visible, otherwise `not captured`
- `limitations`: unavailable tools, failed worker runs, missing token capture, or manual integration notes

Unknown usage is acceptable. Invented usage is not.

## Verification

Before handoff, check:

- every requested variant has a worker result or an explicit unavailable/fallback entry
- no worker used another variant as input unless the experiment required it
- every claimed independent variant has a receipt path or exact captured output
- every worker records input scope and cross-variant exposure
- the compare view shows all variants with equal framing
- the focus view exposes source, hypothesis, tradeoff, and provenance
- metadata and README record the worker execution mode
- proof includes at least the compare view and one focused non-default variant
