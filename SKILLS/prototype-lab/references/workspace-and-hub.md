# Workspace and Hub Contract

Use this reference when creating artifacts, managing the library hub, creating comparisons, repairing generated files, or handing the workspace to another agent.

## One Interface

Resolve the script from the installed skill folder:

```text
node <skill-root>/scripts/manage-prototype-lab.mjs <command> --workspace <workspace>
```

Repository-local development can use the shorter npm wrapper:

```text
npm run lab -- <command>
```

Commands:

| Command | Purpose | Required input |
| --- | --- | --- |
| `init` | Install the workspace hub and seed reusable prompts | none; add `--empty` for a blank library |
| `experiment` | Prepare isolated direction packets for a capability comparison | `--spec <json>` |
| `preflight` | Validate direction cards and authorize builds after blind review | `--experiment <id>`; add `--review <json>` to approve |
| `create` | Allocate an id and scaffold one standalone artifact | `--title`, preferably `--question` |
| `hub` | Create/update a managed comparison | `--title`, `--variants`; optionally `--dimension`, `--criteria` |
| `sync` | Regenerate managed hubs, prompt catalog, and workspace hub | none |
| `status` | Report counts, legacy/invalid hubs, and readiness issues | none |
| `pack` | Create a portable static folder and ZIP | `--id`; optionally `--include-proof` |

## Ownership

```text
prototypes/
  index.html                  generated workspace hub
  prototype-index-data.js    generated catalog data
  prompts/                    versioned reusable input library
  <YYYY>/<MM>/<NNN>-artifact/
    metadata.json             artifact source of truth
    index.html                artifact runtime
    styles.css / app.js       artifact runtime
    prompts/ runs/ proof/     local evidence and provenance
  <YYYY>/<MM>/<NNN>-hub/
    hub.config.json           editable comparison source of truth
    hub-data.js               generated
    metadata.json             generated with preserved proof fields
    index.html hub.css hub.js generated
```

Do not edit generated hub files to change variants or criteria. Those changes disappear on `sync`. Edit `hub.config.json`.

## Creating A Standalone Artifact

```text
lab create --title "Dispatch board" --question "Can an operator resolve an incident without losing queue context?"
lab create --title "Dispatch board" --question "..." --prompt midnight-dispatch-board
lab create --title "Open creative site" --question "..." --scaffold blank --condition baseline --model model-a --reasoning high
lab create --title "Compact operator tool" --question "..." --scaffold tool
```

The manager scans the active month, allocates the next chronological number, copies a scaffold, creates local ownership folders, and optionally freezes the prompt template, variables, rendered version, and hash into the artifact. `blank` is the neutral default; `tool` is opt-in.

For model/agent/skill capability comparisons, prepare and approve the experiment before creating artifact owners. See `capability-comparisons.md`.

The initial status is `draft` when a question is supplied and `needs-brief` when it is omitted. Change to `active` only after the artifact and factual attribution exist.

## Creating A Managed Hub

```text
lab hub --title "Dispatch model comparison" --variants 001,002 --dimension model --criteria "task clarity,interaction feedback,viewport fit"
```

The manager resolves unique short ids, links standalone artifacts, creates `hub.config.json`, and derives the runtime and metadata. It refuses to replace an unmanaged folder.
When every selected artifact records the same decision question, the hub inherits it automatically; pass `--question` only to override or clarify it.

Editable fields:

```json
{
  "title": "Dispatch model comparison",
  "question": "Which model produces the more usable dispatch workflow?",
  "dimension": "model",
  "criteria": ["task clarity", "interaction feedback", "viewport fit"],
  "defaultView": "overview",
  "variants": [
    {
      "prototypeId": "2026/07/001-dispatch-sol",
      "title": "Sol",
      "hypothesis": "Richer systems reasoning",
      "tradeoff": "Higher density"
    }
  ]
}
```

After editing, run `lab sync`. The hub provides overview, exact URL-backed A/B comparison, focus, and provenance views.

## Workspace Hub

Open `prototypes/index.html` directly. It is a static management surface, not a runtime dependency of artifacts.

- **Library**: search and browse chronological artifact previews.
- **Comparisons**: select a hub, inspect members, and open an exact A/B URL.
- **Prompts**: inspect active reusable inputs and rendered versions.
- **Health**: find missing decisions, model attribution, proof, or broken hub links; copy canonical commands.

The hub cannot execute shell commands from the browser. Run copied commands through Codex or a terminal, then refresh after `lab sync`.

## Legacy And Recovery

- `status` reports managed hubs, legacy hubs, and invalid hubs separately.
- `sync` updates only hubs that contain `hub.config.json`; it does not overwrite custom legacy hubs.
- To archive a workspace, move the complete `prototypes/`, relevant `dist/prototype-lab/`, and scratch evidence outside the active tree. Re-run `init --empty` for a blank workspace or `init` for starter prompts.
- To restore, move the archived `prototypes/` tree back only after archiving the current active tree, then run `sync`.
