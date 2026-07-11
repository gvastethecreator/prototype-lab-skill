# Prototype Lab

![Prototype Lab banner](./assets/readme-banner.png)

Codex skill and local workspace manager for creating standalone browser prototypes, running honest model/skill/design comparisons, managing reusable prompts, reviewing readiness, and packaging portable static artifacts.

The project uses one command surface. The browser hub is generated from artifact metadata; comparison hubs are generated from small editable manifests. Runtime HTML is no longer the place where membership, criteria, and provenance are manually maintained.

## Install

```powershell
npx skills add gvastethecreator/prototype-lab-skill
```

Then invoke `$prototype-lab` or run the workspace manager directly from the installed skill.

## One Workflow

In this repository:

```powershell
npm run lab -- init
npm run lab -- create --title "Dispatch board" --question "Can an operator resolve an incident without losing queue context?"
npm run lab -- hub --title "Dispatch comparison" --variants 001,002 --dimension model
npm run lab -- sync
npm run lab -- status
npm run lab -- pack --id 003
```

In another workspace:

```powershell
node <skill-root>/scripts/manage-prototype-lab.mjs <command> --workspace .
```

Use `init --empty` for a blank prompt library. Normal `init` installs the workspace hub and seeds the creative prompt suite.

## What Each Command Owns

| Command | Result |
| --- | --- |
| `init` | Installs `prototypes/index.html`, initializes prompts, and writes index data |
| `create` | Allocates the next chronological id and scaffolds one standalone artifact |
| `hub` | Creates a comparison from two or more existing artifacts |
| `sync` | Regenerates managed hubs, prompt catalog, health data, and workspace hub |
| `status` | Reports artifact counts, managed/legacy/invalid hubs, and readiness issues |
| `pack` | Produces a portable folder and ZIP under `dist/prototype-lab/` |

Short numeric references such as `001,002` work when unique. `create` also accepts `--prompt <library-id>` to freeze a rendered prompt version into the new artifact.

## Artifact Model

```text
prototypes/
  index.html                       generated workspace hub
  prototype-index-data.js         generated catalog and health data
  prompts/                         reusable versioned prompts
  <YYYY>/<MM>/<NNN>-prototype/     standalone runtime and evidence owner
  <YYYY>/<MM>/<NNN>-comparison/
    hub.config.json                editable comparison source
    hub-data.js                    generated comparison data
    index.html hub.css hub.js      generated comparison UI
```

Every standalone artifact keeps its runtime, metadata, frozen prompts, run receipts, and proof local. A hub links and compares variants; it does not own or modify their runtime code.

For a managed comparison, edit `hub.config.json` and run `npm run lab -- sync`. Do not maintain variant data inside generated HTML or JavaScript.

## Workspace Hub

Open `prototypes/index.html` directly:

- **Library** browses and searches chronological artifacts.
- **Comparisons** makes hub membership visible and builds exact shareable A/B links.
- **Prompts** exposes reusable prompt versions and challenges.
- **Health** surfaces missing questions, model attribution, proof, or broken comparison links and provides copyable commands.

The hub is static and portable. It cannot execute commands from the browser; run a copied command through Codex or a terminal and refresh after `lab sync`.

## Portable Packs

```powershell
npm run lab -- pack --id 003
npm run lab -- pack --id 003 --include-proof
```

The pack includes the primary artifact, linked variants, normalized prompts and receipts, a root launcher, and SHA-256 manifest. Proof is omitted by default for smaller uploads.

A validated static pack can be adapted to ChatGPT Sites or another static host. Packaging and public publication remain separate permissions.

## Development Validation

```powershell
npm run validate
python <codex-home>/skills/.system/skill-creator/scripts/quick_validate.py SKILLS/prototype-lab
```

The test suite exercises prompt versioning, concurrent writes, path/secret guards, artifact creation, managed hub generation, workspace sync/status, packaging, and archive-safe organization.

## License

[MIT](./LICENSE)
