# Prototype Lab

![Prototype Lab banner](./assets/readme-banner.png)

Codex skill pack for organized, standalone browser/UI prototypes with metadata, compact interaction shells, isolated multi-variant comparison labs, and screenshot-backed proof.

Prototype Lab gives Codex a repeatable organization contract for prototype work: chronological folders, local runtime files, a structural full-screen shell, top-toolbar navigation and controls, a collapsible right-side panel, product-design iteration notes, comparison views for variants/models/skills, isolated worker execution for multi-variant requests, an optional evidence-browser landing, and local proof before handoff. It is meant for teams that use prototypes as working evidence, not loose mockups.

## Quick Start

Install with the Skills CLI:

```powershell
npx skills add gvastethecreator/prototype-lab-skill
```

Then ask Codex to use `prototype-lab` when creating or improving browser/UI prototypes.

## Usage

Example request:

```text
Use prototype-lab to create a standalone browser prototype for a prototype browser calendar view.
```

Comparison request:

```text
Use prototype-lab to create four mobile music-player variants from the same prompt, each attributed to a different model, skill, or approach, with compare and focus views.
```

For requests like this, the skill treats Codex as the coordinator and uses one isolated worker per variant when sub-agent or dedicated coding-agent tooling is available. Worker outputs should land in scratch/temp space first, then the coordinator integrates them into a single comparison shell. If isolated workers are unavailable, the prototype must record `single-agent-fallback` instead of pretending the variants were independently generated.

Comparison labs can expose several review methods: gallery/all-up compare for broad scans, pairwise compare with shareable left/right selections, blind guess/reveal for less biased taste checks, rankings with notes, repeated iterations under the same prompt, and archive toggles for stale variants. Use only the methods that help the decision.

The skill directs new prototypes into this shape:

```text
prototypes/<YYYY>/<MM>/<NNN>-<prototype-slug>/
  metadata.json
  README.md
  index.html
  styles.css
  app.js
  assets/
  proof/
```

Category, model, tags, status, details, views, and proof live in `metadata.json`. Each prototype keeps its runtime local; it should not depend on shared components or sibling prototype code.

When a workspace has several prototypes and no index, the skill can create `prototypes/index.html` as a static evidence browser with scaled iframe previews, compact metadata cards, search, and direct open links. The landing is navigation only; prototypes do not import from it.

Comparison prototypes also record provenance: shared or variant prompts, skills consulted, model/settings when known, agent mode/tool, scratch output path, token usage when visible, tool calls when visible, and limitations. Unknown usage is written as `unknown` or `not captured`; it is never invented.

## What's Included

- [`SKILL.md`](./SKILLS/prototype-lab/SKILL.md): the full Codex structure and handoff contract.
- [`assets/prototype-shell/`](./SKILLS/prototype-lab/assets/prototype-shell): standalone shell starter files.
- [`assets/prototype-index/`](./SKILLS/prototype-lab/assets/prototype-index): optional static prototype browser with scaled iframe cards.
- [`references/quality-bar.md`](./SKILLS/prototype-lab/references/quality-bar.md): structure, behavior, viewport, and proof checklist.
- [`references/product-design-loop.md`](./SKILLS/prototype-lab/references/product-design-loop.md): product-thinking loop for prototype intent, user flows, and feedback states.
- [`references/taste-calibration.md`](./SKILLS/prototype-lab/references/taste-calibration.md): compact visual calibration, density, hierarchy, and interaction polish.
- [`references/variant-comparison.md`](./SKILLS/prototype-lab/references/variant-comparison.md): model, skill, prompt, approach, pairwise, blind, ranking, and iteration comparison workflow.
- [`references/agent-isolation.md`](./SKILLS/prototype-lab/references/agent-isolation.md): coordinator/worker protocol for isolated variant generation.

## Validate

```bash
npm run validate
```

The validator checks required files, frontmatter, JSON metadata, public-doc wording, and accidental local path references.

## Status

Preview skill pack.

- The skill, shell template, and design/proof references are included.
- No prototype browser/server tooling is required.
- The target project's `prototypes/` root should contain year folders plus, when useful, the optional static index files.

## License

[MIT](./LICENSE)
