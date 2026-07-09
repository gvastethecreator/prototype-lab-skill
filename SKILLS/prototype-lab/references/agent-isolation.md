# Agent Isolation for Variant Builds

Use this when a request asks for multiple prototypes or variants from one brief, especially when variants compare models, skills, agents, prompts, or execution styles.

## Default Rule

Use one isolated worker per variant whenever sub-agent or dedicated coding-agent tools are available and safe.

The main agent is the coordinator:

- freeze the shared brief
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

Output:
- variant summary
- files or code snippets needed for integration
- provenance: prompt used, skills consulted, model/settings if known, token usage if visible, tool calls if visible, limitations
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

## Dedicated Agent Options

Use the best available isolation mechanism in the current environment:

- built-in sub-agent or multi-agent tools
- a dedicated coding-agent CLI in a contained scratch path
- a separate thread only when the user explicitly asks for user-owned threads

Before using CLI workers, verify the CLI exists with `--help`, avoid secrets, keep outputs under scratch/temp, and do not allow commit, push, branch, or worktree operations unless the user explicitly asked for them.

If no safe worker mechanism exists, continue in one agent only after recording the limitation.

## Integration

When integrating:

- preserve each worker's variant intent
- normalize frame, state, and content only enough to make comparison fair
- keep visible attribution labels
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
- the compare view shows all variants with equal framing
- the focus view exposes source, hypothesis, tradeoff, and provenance
- metadata and README record the worker execution mode
- proof includes at least the compare view and one focused non-default variant
