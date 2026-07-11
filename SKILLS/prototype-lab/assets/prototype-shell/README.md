# Standalone Artifact Scaffold

`manage-prototype-lab.mjs create` copies this scaffold into the next chronological artifact folder and generates `artifact-data.js`, `metadata.json`, and the artifact README from the supplied title, question, model, and optional prompt-library entry.

The scaffold is intentionally neutral. Replace the canvas with the actual product experience; do not retain fake variants or example provenance. Keep runtime files local and preserve these owner folders:

```text
assets/
prompts/
runs/
proof/
```

Before handoff, update factual metadata, exercise the real user path, add browser/screenshot proof, run workspace `sync`, and inspect `status`.
