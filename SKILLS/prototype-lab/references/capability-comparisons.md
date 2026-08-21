# Capability Comparisons

Use when revealing what different models, reasoning levels, agents, or optional skills can actually do. Stricter than ordinary multi-variant production: technically valid near-identical outputs fail the experiment.

## Choose The Experiment Intent

Declare one intent before writing the shared brief:

- `benchmark`: measure workers' natural response to an invariant prompt. Accept convergence as a finding; never force artificial difference. At least two independent attempts per cell before claiming a stable model/skill effect; otherwise label `exploratory-n1`.
- `showcase`: expose range and effect of a model or skill. Require visible skill activation, high decision freedom, and a direction gate before paying for full builds.

Do not silently mix them. A benchmark cannot promise spectacular divergence. A showcase cannot use a prompt that already fixes the winning layout.

For an `exploratory-n1` natural-response benchmark, create isolated build packets directly:

```text
lab experiment --spec experiments/example-benchmark.json --direct-build
```

Bypasses showcase direction review by design; does not bypass clean dispatch, asset parity, receipts, browser proof, or honest claim limits. `--direct-build` must reject a showcase spec.

Direct build: one primary product surface per variant work unit. Five unrelated interfaces × three conditions = fifteen variants, not three workers each owning five products. Every variant needs `workUnit`; add `sourceFixture` when adopting an existing surface. A skill treatment also needs an `activationContract` with `instruction -> observableEffect -> proofTarget` interventions and named required artifacts. Missing contracts block packet creation.

Each direct-build packet includes a canonical v3 receipt template; workers fill it instead of inventing provenance fields. Generated or fixed-supplied assets also require complete finite-set visual review: mapping, cell/item aspect ratio, stretching/bleed/subject-loss checks, and one narrow-viewport fixture. A blocked harness or runtime P0/P1 keeps the artifact unverified even when interaction assertions pass.

The build worker owns its capture-review-correction loop; coordinator capture is comparison evidence, not a substitute for builder-owned proof. A treatment run that read the skill but omitted its required artifacts is `skill-unverified`, not complete.

## Keep The Coordinator Out Of The Canvas

`prototype-lab` is coordinator, recorder, verifier, and packager — not a design treatment.

- Do not tell variant workers to read or use `prototype-lab` unless that skill itself is the comparison dimension.
- Transport envelope only: shared brief, fixed outcomes, open decisions, target environment, variant condition, isolation rule, and required output paths.
- Keep hub styling, workspace styling, metadata UI, proof chrome, and compact tool-shell preferences out of the variant prompt.
- Blank scaffold for capability comparisons. Tool scaffold only when the product itself is explicitly a compact application shell.
- Record coordinator skills separately from variant skills. A baseline worker with no design skill must remain visibly skill-free.

## Write A High-Freedom Shared Brief

Split the brief into four parts:

1. `sharedBrief`: situation, audience, and desired experience.
2. `fixedOutcomes`: what must become possible or observable.
3. `openDecisions`: choices every worker owns independently.
4. `constraints`: only real portability, safety, accessibility, or runtime limits.

For a creative `showcase`, keep at least six meaningful decisions open: premise interpretation, content strategy, information architecture, composition, interaction metaphor, visual register, typography, media role, motion grammar, and responsive structure.

Do not prescribe controls as outcomes. "The visitor can form and revise an interpretation" is an outcome. "Put evidence on the left, hypotheses on the right, add confidence bars, and provide a reset button" is already a layout.

Do not require a universal state inventory. Loading, empty, error, permission, long-content, and reset states apply only when the chosen experience can genuinely enter those states.

## Declare Layout And Asset Policy

Choose a layout policy instead of applying no-scroll tool rules everywhere:

- `open`: worker chooses page, stage, or application structure.
- `page-scroll`: scrolling and narrative pacing are valid; horizontal overflow is not.
- `app-shell`: desktop/tablet body overflow is a bug; internal scrolling is allowed.
- `immersive-stage`: primary experience fills the viewport; supporting content may open separately.

Choose an asset policy:

- `required`: every worker must use the named asset skill/tool and deliver a consumed project asset.
- `fixed-supplied`: every worker receives and materially consumes the same pre-generated asset files and hashes; workers must not replace or regenerate them.
- `allowed`: worker may use it when it materially improves the direction.
- `forbidden`: keep the experiment code-native.
- `worker-choice`: the asset decision itself is part of the capability test.

When the user explicitly asks to test `imagegen`, use `required`. Stage 1 records asset role, use case, draft prompt, expected composition, and integration plan — generation still forbidden. Stage 2 adds final relative path, dimensions, output hash, consumption sites, and materiality proof. A CSS/SVG substitute fails. Do not mandate image generation when the key artifact is a simple diagram or code-native control; choose a prompt where a bitmap subject, place, material, scene, or narrative image carries real meaning.

Treat asset policy as its own experimental factor. If the question is only whether a design skill changes the result, hold asset input constant across that pair with `fixed-supplied`, or forbid generated assets for both. Requiring the same generator still permits different outputs and therefore adds asset variance. If asset-generation capability is also under test, use a separate block or an explicit factorial matrix; do not attribute the combined effect to one skill.

## Two-Stage Spend Gate

For every creative showcase with more than one variant, run direction preflight before HTML, image generation, or full proof.

### Stage 1 — Direction Only

Each isolated worker receives the same shared brief and only its own condition, returns `direction.json`, and must not write runtime code or generate the final image.

The coordinator—not the worker—copies `dispatch.template.json` to `dispatch.json` and records actual worker id, agent tool, fresh-worker isolation adapter/evidence, sent paths, hashes, exposed skills, memory inputs, and variant exposure. Preflight fails when this dispatch record is missing or contaminated. Worker records effective-model visibility and skill/reference reads in `direction.json`; keep coordinator evidence separate from worker self-report.

Require:

- selected direction and one-sentence argument
- composition family
- interaction model
- visual language
- signature move tied to the experience
- content strategy
- responsive strategy
- asset plan matching the asset policy
- observable interventions from every assigned skill
- rejected alternatives when the assigned skill requires a direction sprint
- primary risk and build outline

Worker must not inspect other variants. Coordinator must not leak another direction while requesting a reset.

### Stage 1 Review

Review direction cards blind to model/skill labels first. Compare within-model baseline/skill pairs before comparing models.

Fingerprint distance and matrix signatures are screening only. Report low distance or a shared topology/register/asset signature as warnings; never let enum distance approve or reject a creative pair — similar labels can hide different experiences, and different labels can disguise the same composition. Anonymous semantic review is authoritative.

For `showcase`, reject a pair before build when both variants share the same composition family and interaction model, or when the skill variant cannot name an observable intervention caused by the skill. Reject an asset-required direction without a real asset plan. Invalidate that prompt version or resample the entire affected matrix with fresh isolated workers; do not selectively coach or rerun only the treatment. No worker sees peer directions or the axis on which convergence occurred.

For `benchmark`, record convergence instead of forcing a reset.

### Stage 2 — Build

Authorize the full build only after the direction review passes. Give each fresh isolated worker:

- its original shared brief
- its own approved direction
- its generated `build-assignment.md` and `build-input-manifest.json`, with the exact hashes returned by preflight
- its own model/reasoning/skill condition
- its own output folder
- required asset and proof contracts

Do not include other directions, rankings, or the coordinator's preferred result.

## Skill Activation Contract

Before dispatch, read each tested skill and extract only the behavior that should change the artifact. Record it as a variant-local contract.

Examples:

- `ruthless-designer`: visual-direction authority, three incompatible directions when the brief is open, killed defaults, one functional signature move, rendered proof, and reset when the direction remains generic.
- `imagegen` with `required` policy: built-in generation, a project-bound raster asset, saved prompt/path, visual inspection, and actual consumption by the site.
- `imagegen` with `fixed-supplied` policy: identical shared files/hashes for every condition, no worker regeneration, copied project-local assets, and materiality proof.
- baseline: no creative/design skill; ordinary model judgment only.

Do not copy the target skill's advice into the shared brief — that leaks the treatment into the control group.

Before direct build, and after preflight for showcases, the skill variant must identify `instruction -> observable effect -> proof target`. If those effects are absent in the rendered result, label the run `skill-no-effect` or `skill-unverified`; do not call it a successful skill comparison.

## Evaluation

Judge three independent questions:

1. Did every variant satisfy the fixed outcomes?
2. What did the model naturally contribute?
3. What changed specifically because of the optional skill?

Equal frame/state/viewport for literal comparisons; do not normalize internal layout or visual system. For creative sites, inspect the first viewport, one meaningful interaction, one later state, and mobile behavior. Blind screenshots before revealing labels.

Report one-shot cells as qualitative examples, not estimates of typical model/skill behavior. For a stronger claim, compare the treatment delta against baseline-to-baseline variation from repeated attempts. A skill effect smaller than ordinary A/A variation is inconclusive even if one pair looks different.

A showcase fails when:

- two paired variants are effectively the same template
- the optional skill has no observable intervention
- a required asset tool was not used or its output is not consumed
- the prompt fixed the information architecture it was supposed to test
- all variants inherit the lab shell or the same scaffold styling
- the coordinator spends on full builds before direction preflight passes

## Managed Preflight Commands

Generate an editable starting spec; do not hand-write the schema:

```text
lab experiment --init --id impossible-object --intent showcase --models model-a,model-b --skill ruthless-designer
lab experiment --init --id prompt-benchmark --intent benchmark --models model-a,model-b --from-prompt <library-id>
```

Initializer expands model/skill conditions, copies reusable prompt fields when selected, validates the result, and writes `experiments/<id>.json`. Review that file before preparing packets.

Prepare assignment packets from a portable JSON spec:

```text
lab experiment --spec experiments/impossible-object.json
```

Workers write direction cards to the returned scratch folders. Inspect readiness without authorizing a build:

```text
lab preflight --experiment impossible-object
```

Experiment states:

- `awaiting-directions`: packets incomplete
- `preflight-blocked`: complete cards fail schema, provenance, isolation, skill-activation, or asset-policy gates
- `awaiting-blind-review`: anonymous reviewer may inspect directions; fingerprint convergence may warn
- `review-blocked`: submitted review with `verdict: fail`; no build packet; invalidate the prompt version or resample the full affected matrix

None of these states authorizes a build.

After blind review, supply a review JSON. A passing review writes isolated build assignments and changes the experiment status to `build-authorized`:

```text
lab preflight --experiment impossible-object --review .scratch/prototype-lab/impossible-object/preflight-review.json
```

Script validates dispatch provenance, exact input hashes, published fingerprint vocabulary, asset requirements, skill interventions, and pair coverage. Fingerprint convergence is a warning. Human/agent blind semantic judgment owns whether two directions are genuinely distinct.

After authorization, run `lab materialize --experiment <id>`: one chronological final owner per variant; local build assignment/input manifest/dispatch template/receipt template copied into `runs/`; shared prompt frozen inside each owner; artifact ids recorded back into the experiment manifest. Dispatch fresh build workers against those owners; do not build directly inside `.scratch`.

## Portable Experiment Spec

```json
{
  "schemaVersion": 1,
  "id": "impossible-object",
  "title": "Impossible Object",
  "intent": "showcase",
  "question": "What changes when the design skill has visual authority?",
  "sharedBrief": "Create an interactive public site for an institution that has discovered one impossible object.",
  "fixedOutcomes": ["Visitors can explore the object", "The experience changes meaningfully after interaction"],
  "openDecisions": ["premise", "content", "information architecture", "composition", "interaction metaphor", "visual language", "motion"],
  "assetPolicy": {
    "mode": "required",
    "skill": "imagegen",
    "deliverable": "one original primary raster asset consumed by the site"
  },
  "layoutPolicy": "open",
  "targetViewports": ["1200x820", "390x844"],
  "variants": [
    { "id": "model-baseline", "model": "model-a", "reasoning": "high", "condition": "baseline", "skills": [], "workUnit": "impossible-object" },
    {
      "id": "model-design",
      "model": "model-a",
      "reasoning": "high",
      "condition": "design-skill",
      "skills": ["ruthless-designer"],
      "workUnit": "impossible-object",
      "activationContract": {
        "interventions": [{ "skill": "ruthless-designer", "instruction": "Run the full choose-build-prove loop.", "observableEffect": "The result has a product-specific direction and signature move.", "proofTarget": "Direction artifacts plus before, after, and DPR 2 detail proof." }],
        "requiredArtifacts": ["context-card.json", "direction-cards.json", "kill-list.json", "finish-ledger.json", "proof/detail.png"]
      }
    }
  ]
}
```
