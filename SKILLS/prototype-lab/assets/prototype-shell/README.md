# Prototype Name

question: What are we trying to learn?
status: active
run: open index.html in a browser
path: prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/index.html
proof: proof/<file>.png

views:
- overview: baseline question and main path
- compare: all variants at the same scale
- focus: selected variant with source and tradeoff
- stress: edge states and long-content checks

variants:
- baseline: actual model/skill/source and what it tests
- skill-a: planned or actual alternate source and attribution status

provenance:
- prompt: shared or variant prompt used
- skills: skill names used or consulted
- model: model and settings when known
- agent: sub-agent, dedicated CLI, separate thread, fallback, or unavailable
- output: worker scratch output path if captured
- integrity: shared brief id, locked dimension, allowed inputs, blocked inputs, leakage check, attribution rule
- tokens: input/output/total if captured, otherwise unknown
- tool calls: relevant calls if captured, otherwise not captured
- limitations: unavailable model/skill/tooling or missing usage capture

notes:
- Replace this with the decision or next step.
- Comparison labs must keep one shared prompt and honest model/skill attribution.
- Multi-variant labs should use one isolated worker per variant when sub-agent or dedicated agent tooling is available, and each independent claim needs a receipt or captured output path.
- Workers should receive only the shared brief, assigned variant, output contract, and shared constraints; record fallback or unavailable status instead of relabelling a coordinator-made variant as independent.
- Keep provenance compact in the drawer; `unknown` is acceptable when exact tokens or tool calls were not captured.
- Shell contract: top toolbar, full-screen stage, optional right drawer hidden by default.
- Standalone contract: keep all runtime files local to this folder; do not import `_shared` or sibling prototype code.
- Proof must include `1920x1080`, `1200x820`, `834x1112`, and mobile sanity without body/page scroll on desktop/tablet.
