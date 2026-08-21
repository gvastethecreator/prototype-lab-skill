# Agent Isolation for Variant Builds

Use when a request asks for multiple prototypes or variants from one brief, especially when variants compare models, skills, agents, prompts, or execution styles.

## Default Rule

One isolated worker per variant. Default execution path, not a stretch goal.

Coordinator:

- freeze shared brief
- define variant ids and criteria
- dispatch one worker per variant
- collect worker outputs
- integrate the final comparison prototype
- verify the assembled result

For model/skill capability comparisons, keep `prototype-lab` coordinator-only. Variant workers receive the transport packet, not this skill's interface baseline, taste calibration, workspace memory, or hub conventions.

Do not build all variants in one continuous context when comparing different models, skills, or agents. First attempt the best available isolation path. If worker execution is unavailable, record `single-agent-fallback` and do not claim independent generation.

## Non-Negotiables

- Do not refuse multi-variant output because worker setup is inconvenient.
- Do not collapse requested variants into one blended design.
- Do not reduce the variant count unless the user accepts the reduction or a concrete blocker prevents completion.
- Do not use `single-agent-fallback` until after checking for available sub-agent, multi-agent, dedicated CLI, or separate-thread options.
- Do not hide fallback. Record the exact reason in metadata, README, and drawer provenance.
- If the active runtime policy requires explicit permission to spawn sub-agents and the user did not already grant it, ask one short permission question instead of silently avoiding workers.
- If workers are blocked, still build the requested variants in one context and label them `single-agent-fallback` unless the blocker prevents any build.

## Isolation Contract

Every independent variant runs in a **fresh worker with no inherited history**. Coordinator must prove the worker did not receive its transcript, workspace memory, or sibling variants; host flags evidence that capability, never the public contract.

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

## Worker Prompt Shape

Use a generated experiment assignment for capability comparisons. Ordinary isolated builds use this minimal prompt shape:

```text
Shared brief:
<same prompt for every worker>

Variant:
- id: <variant-id>
- source: <model/skill/approach/prompt treatment>
- hypothesis: <what this variant should test>
- constraints: <viewport, shell, technology, no shared dependencies>
- assignment SHA-256: <coordinator hash>
- context: no workspace memory, no coordinator design skill, no other variants

Output:
- variant summary
- files or code snippets needed for integration
- provenance: prompt used, skills consulted, model/settings if known, token usage if visible, tool calls if visible, limitations
- do not inspect or imitate other variants
- do not read prototype-lab unless it is the tested treatment
- do not edit the final prototype folder unless explicitly assigned that folder
```

Keep shared brief text identical across workers unless prompt variation is the experiment.

## Output Locations

Prefer worker outputs under a scratch location outside `prototypes/`, for example:

```text
.scratch/prototype-lab/<prototype-slug>/<variant-id>/
```

Coordinator then integrates outputs into:

```text
prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/
```

Do not let multiple workers edit the same final `index.html`, `styles.css`, `app.js`, `metadata.json`, or `README.md` concurrently.

## Worker Receipt

Every independent worker result needs a receipt. Without one, label the variant fallback or unavailable.

Minimum receipt fields:

- `variantId`
- `agentMode`
- `agentTool`
- `workerId`: id returned by the coordinator's dispatch tool
- `isolation`: object with `capability: fresh-worker-no-inherited-history`, one supported `adapter`, `inheritedHistory: false`, `coordinatorContextExposed: false`, and adapter-specific `evidence`
- `requestedModel`, `effectiveModel`, `effectiveModelSource`, and `reasoning`; use `effectiveModel: not captured` plus `effectiveModelSource: not-captured` unless the runtime independently exposes the effective route
- `assignmentSha256` and `inputManifestSha256`
- `contextReads`: skills, references, memory, files, or inherited context actually read
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

For managed capability preflight, coordinator copies generated `dispatch.template.json` to `dispatch.json` and fills actual worker id, agent tool, isolation adapter, sent paths, and context policy. `preflight` checks that record against assignment/input hashes and condition. Later build receipt cross-links the build dispatch. A worker's own `crossVariantLeakage: false` is self-reported evidence, not proof of clean context. Claim clean-context isolation only when the selected adapter proves no inherited history, the assignment hash matches, no memory input was allowed, and recorded reads contain no sibling or coordinator-only source.

## Dedicated Agent Options

Best available isolation mechanism:

- built-in sub-agent or multi-agent tools
- a dedicated coding-agent CLI in a contained scratch path
- a separate thread only when the user explicitly asks for user-owned threads

Before using CLI workers, check the CLI exists with `--help`; avoid secrets; keep outputs under scratch/temp; no commit, push, branch, or worktree unless the user explicitly asked.

If tool discovery is available, search for multi-agent or sub-agent tooling before falling back. Use one supported adapter and record its evidence:

- **Codex adapter — `codex-fork-turns-none`:** use `agents.spawn_agent` with `fork_turns: "none"`; record `forkTurns: "none"` and `evidence: "fork_turns:none"`.
- **Dedicated CLI adapter — `dedicated-cli-clean-session`:** start one new CLI process in a packet-only scratch directory; do not pass a prior transcript or workspace memory, omit `forkTurns`, and record `evidence: "fresh-process-packet-only"`.
- **Separate-thread adapter — `separate-thread-fresh-context`:** start a new worker thread with no prior conversation, omit `forkTurns`, and record `evidence: "fresh-thread-no-history"`.

Never claim a clean worker because an adapter label is present. The receipt must also prove `inheritedHistory: false`, `coordinatorContextExposed: false`, empty memory inputs, and no sibling path in the sent/observed context.

Fallback is allowed only when one of these is true:

- no sub-agent, multi-agent, dedicated CLI, or separate-thread option exists
- the current runtime policy prohibits worker spawning and the user does not grant permission
- every attempted worker path fails with a recorded error
- credentials, secrets, GUI state, or destructive side effects would be exposed to workers
- the user explicitly requests single-agent execution

If no safe worker mechanism exists, continue in one agent after recording the limitation.

## Integration

When integrating:

- preserve each worker's variant intent
- normalize frame, state, and content only enough to make comparison fair
- keep visible attribution labels
- record actual vs planned vs simulated status
- do not erase worker limitations
- do not blend all variant ideas into one undifferentiated design

Final prototype may share one shell and one codebase, but the variant ledger must show how each variant was produced.

## Provenance

Record Worker Receipt fields per variant, plus:

- `forkTurns`: Codex-only evidence when `isolation.adapter` is `codex-fork-turns-none`; omit it for other adapters
- `skills`: skills consulted by the worker
- `model`: model/settings when known
- `tokenUsage`: input/output/total if visible, otherwise `unknown`
- `toolCalls`: captured calls if visible, otherwise `not captured`

Unknown usage OK; invented usage is not.

## Verification

Before handoff:

- every requested variant has a worker result or an explicit unavailable/fallback entry
- every fallback entry has `fallbackReason`
- every independent variant has a worker receipt
- no worker used another variant as input unless the experiment required it
- the compare view shows all variants with equal framing
- the focus view exposes source, hypothesis, tradeoff, and provenance
- metadata and README record the worker execution mode
- proof includes at least the compare view and one focused non-default variant
