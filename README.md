# Prototype Lab

![Prototype Lab banner](./assets/readme-banner.png)

Codex skill pack for polished, standalone browser/UI prototypes with metadata and screenshot-backed proof.

Prototype Lab gives Codex a repeatable contract for prototype work: chronological folders, local runtime files, a compact full-screen shell, right-side controls, and visual QA before handoff. It is meant for teams that use prototypes as working evidence, not loose mockups.

## Quick Start

1. Clone or download this repository.
2. Install or copy `SKILLS/prototype-lab` into a Codex skills directory.
3. Ask Codex to use `prototype-lab` when creating or improving browser/UI prototypes.

## Usage

Example request:

```text
Use prototype-lab to create a standalone browser prototype for a prototype browser calendar view.
```

The skill directs new prototypes into this shape:

```text
prototypes/months/<YYYY-MM>/<NNN>-<prototype-slug>/
  metadata.json
  README.md
  index.html
  styles.css
  app.js
  assets/
```

Category, model, tags, status, details, views, and proof live in `metadata.json`. Each prototype keeps its runtime local; it should not depend on shared components or sibling prototype code.

## What's Included

- [`SKILL.md`](./SKILLS/prototype-lab/SKILL.md): the full Codex process and rules.
- [`assets/prototype-shell/`](./SKILLS/prototype-lab/assets/prototype-shell): standalone shell starter files.
- [`references/quality-bar.md`](./SKILLS/prototype-lab/references/quality-bar.md): review checklist for serious prototypes.
- [`references/taste-calibration.md`](./SKILLS/prototype-lab/references/taste-calibration.md): visual direction and anti-slop guidance.
- [`references/product-design-loop.md`](./SKILLS/prototype-lab/references/product-design-loop.md): three-option direction loop when the brief is unclear.

## Validate

```bash
npm run validate
```

The validator checks required files, frontmatter, JSON metadata, public-doc wording, and accidental local path references.

## Status

Preview skill pack.

- The skill and shell template are included.
- Prototype browser/server tooling is expected to live in the target project.
- Legacy `prototypes/categories/...` paths are documented only as migration input.

## License

[MIT](./LICENSE)
