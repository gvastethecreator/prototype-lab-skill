# Prototype Name

question: What are we trying to learn?
status: active
run: open index.html in a browser
path: prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/index.html
proof: proof/<file>.png
prompt template: prompts/shared.template.md
rendered prompt: prompts/shared.rendered.md
run receipt: runs/<run-id>.json

views:
- overview: baseline question and main path
- compare: all variants at the same scale
- focus: selected variant with source and tradeoff
- stress: edge states and long-content checks

variants:
- baseline: actual model/skill/source and what it tests
- skill-a: planned or actual alternate source and attribution status

provenance:
- prompt: id, version, rendered SHA-256, and shared or variant prompt used
- skills: skill names used or consulted
- model: model and settings when known
- agent: sub-agent, dedicated CLI, separate thread, fallback, or unavailable
- output: worker scratch output path if captured
- fallback reason: exact blocker when worker isolation was not used
- worker receipt: input scope, output path, whether other variants were visible, and whether final files were edited
- integrity: requested variants, delivered variants, and cross-variant leakage check
- tokens: input/output/total if captured, otherwise unknown
- tool calls: relevant calls if captured, otherwise not captured
- limitations: unavailable model/skill/tooling or missing usage capture

notes:
- Replace this with the decision or next step.
- Comparison labs must keep one shared prompt and honest model/skill attribution.
- Reusable/model comparison runs must preserve the template, variables, exact rendered prompt, and one immutable receipt per attempt.
- Multi-variant labs must attempt one isolated worker per variant. If workers are blocked, keep all requested variants and record the blocker as `fallbackReason`.
- Do not claim variants are independent unless a worker receipt exists and `crossVariantLeakage` is false.
- Keep provenance compact in the drawer; `unknown` is acceptable when exact tokens or tool calls were not captured.
- Render each worker receipt as a compact card with status, variant id, agent mode/tool, input scope, scratch output, fallback reason, and isolation/leakage/final-edit chips. Do not bury receipt data in a prose sentence.
- Support `?info=1` or `?drawer=1` as a direct link to the provenance drawer for auditing and screenshots.
- Shell contract: top toolbar, full-screen stage, optional right drawer hidden by default.
- Standalone contract: keep all runtime files local to this folder; do not import `_shared` or sibling prototype code.
- Proof must include `1920x1080`, `1200x820`, `834x1112`, and mobile sanity without body/page scroll on desktop/tablet.
- Portable upload artifacts belong under `dist/prototype-lab/`; do not place ZIP files beside chronological source prototypes.
