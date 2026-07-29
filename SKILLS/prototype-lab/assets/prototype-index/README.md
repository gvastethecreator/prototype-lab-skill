# Workspace Hub Asset

`manage-prototype-lab.mjs init` or `sync` copies the dashboard HTML, CSS,
JavaScript, and local Tabler icon registry into the workspace `prototypes/`
root. `build-prototype-index.mjs` generates `prototype-index-data.js` from
artifact metadata, managed and legacy comparison links, prompt catalog data,
and readiness issues.

The static hub has five views: Library, Comparisons, Prompts, Receipts, and
Health. Receipts are derived from canonical run records and never synthesize
missing attribution. The hub is navigation and management evidence only;
standalone artifacts must not import its files.

The canonical UI uses a full-black product system with a restrained lime accent,
local Tabler SVG geometry, and CSS-native charts so copied workspaces
remain offline-capable. Visualizations must be derived from generated workspace
data; do not add decorative or invented metrics.

Edit these asset files to change the canonical workspace UI. Do not hand-edit copied workspace files because the next `sync` replaces them.
