# Prototype Name

question: What are we trying to learn?
status: active
run: cd prototypes && bun run dev
url: http://127.0.0.1:51237/p/<YYYY-MM>/<NNN>-<prototype-slug>/
proof: prototypes/output/playwright/<file>.png

views:
- overview: baseline question and main path
- variation-a: first alternate direction
- edge-cases: stress states

notes:
- Replace this with the decision or next step.
- Shell contract: top toolbar, full-screen stage, optional right drawer hidden by default.
- Standalone contract: keep all runtime files local to this folder; do not import `_shared` or sibling prototype code.
- Proof must include `1920x1080`, `1200x820`, `834x1112`, and mobile sanity without body/page scroll on desktop/tablet.
