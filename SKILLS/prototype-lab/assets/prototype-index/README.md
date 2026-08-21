# Workspace Hub Asset

`manage-prototype-lab.mjs init` or `sync` copies dashboard HTML, CSS, JavaScript, and local Tabler icon registry into workspace `prototypes/` root. `build-prototype-index.mjs` generates `prototype-index-data.js` from artifact metadata, managed and legacy comparison links, prompt catalog data, and readiness issues.

Five views: Library, Comparisons, Prompts, Receipts, Health. Receipts from canonical run records; never synthesize missing attribution. Hub is navigation and management evidence only; standalone artifacts must not import its files.

Canonical UI: full-black product system, restrained lime accent, local Tabler SVG geometry, CSS-native charts — copied workspaces stay offline-capable. Visualizations must derive from generated workspace data; no decorative or invented metrics.

Edit these asset files to change canonical workspace UI. Do not hand-edit copied workspace files; next `sync` replaces them.
