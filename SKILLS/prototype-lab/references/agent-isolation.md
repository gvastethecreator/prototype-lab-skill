# Agent Isolation for Variant Builds

Use this when a request asks for multiple prototypes or variants from one brief, especially when variants compare models, skills, agents, prompts, or execution styles.

## Default Rule

Use one isolated worker per variant whenever a request asks for multiple variants. Treat this as the default execution path, not a stretch goal.

The main agent is the coordinator:

- freeze the shared brief
- define variant ids and criteria
- dispatch one worker per variant
- collect worker outputs
- integrate the final comparison prototype
- verify the assembled result

Do not build all variants in one continuous context when the request is explicitly about comparing different models, skills, or agents. First attempt the best available isolation path. If worker execution is unavailable, record the fallback as `single-agent-fallback` and do not claim independent generation.

## Non-Negotiables

- Do not refuse multi-variant output because worker setup is inconvenient.
- Do not collapse requested variants into one blended design.
- Do not reduce the variant count unless the user accepts the reduction or a concrete blocker prevents completion.
- Do not use `single-agent-fallback` until after checking for available sub-agent, multi-agent, dedicated CLI, or separate-thread options.
- Do not hide fallback. Record the exact reason in metadata, README, and drawer provenance.
- If the active runtime policy requires explicit permission to spawn sub-agents and the user did not already grant it, ask one short permission question instead of silently avoiding workers.
- If workers are blocked, still build the requested variants in one context and label them `single-agent-fallback` unless the blocker prevents any build.

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

## Worker Receipt

Every independent worker result needs a receipt. Without a receipt, label the variant as fallback or unavailable.

Minimum receipt fields:

- `variantId`
- `agentMode`
- `agentTool`
- `promptId`
- `promptVersion`
- `renderedPromptSha256`
- `inputScope`: what the worker was allowed to see
- `receivedOtherVariants`: must be `false` unless the experiment intentionally compares after seeing other variants
- `editedFinalPrototype`: must be `false` unless the worker had exclusive ownership of final files
- `outputPath`
- `filesChanged` or `filesSuggested`
- `summary`
- `limitations`
- `fallbackReason`: `not applicable` for real worker runs

The coordinator records receipts in metadata and uses them to check cross-variant leakage before claiming variants are independently generated.

## Dedicated Agent Options

Use the best available isolation mechanism in the current environment:

- built-in sub-agent or multi-agent tools
- a dedicated coding-agent CLI in a contained scratch path
- a separate thread only when the user explicitly asks for user-owned threads

Before using CLI workers, verify the CLI exists with `--help`, avoid secrets, keep outputs under scratch/temp, and do not allow commit, push, branch, or worktree operations unless the user explicitly asked for them.

If tool discovery is available, search for multi-agent or sub-agent tooling before falling back. When `multi_agent_v1.spawn_agent` or an equivalent worker tool is available and allowed, spawn one worker per variant with `fork_context` omitted or false unless the worker truly needs inherited context. Pass the skill path and the frozen brief explicitly.

Fallback is allowed only when one of these is true:

- no sub-agent, multi-agent, dedicated CLI, or separate-thread option exists
- the current runtime policy prohibits worker spawning and the user does not grant permission
- every attempted worker path fails with a recorded error
- credentials, secrets, GUI state, or destructive side effects would be exposed to workers
- the user explicitly requests single-agent execution

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
- `promptVersion`: integer template version used for the run
- `renderedPromptSha256`: hash printed by the prompt renderer for the exact worker input
- `outputPath`: scratch path or `not captured`
- `fallbackReason`: why worker isolation was not used, or `not applicable`
- `inputScope`: what context the worker received
- `receivedOtherVariants`: whether another variant was visible to the worker
- `editedFinalPrototype`: whether the worker edited final prototype files
- `skills`: skills consulted by the worker
- `model`: model/settings when known
- `tokenUsage`: input/output/total if visible, otherwise `unknown`
- `toolCalls`: captured calls if visible, otherwise `not captured`
- `limitations`: unavailable tools, failed worker runs, missing token capture, or manual integration notes

Unknown usage is acceptable. Invented usage is not.

## Verification

Before handoff, check:

- every requested variant has a worker result or an explicit unavailable/fallback entry
- every fallback entry has `fallbackReason`
- every independent variant has a worker receipt
- no worker used another variant as input unless the experiment required it
- the compare view shows all variants with equal framing
- the focus view exposes source, hypothesis, tradeoff, and provenance
- metadata and README record the worker execution mode
- proof includes at least the compare view and one focused non-default variant
