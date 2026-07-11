# Workspace Hub Asset

`manage-prototype-lab.mjs init` or `sync` copies `index.html`, `prototype-index.css`, and `prototype-index.js` into the workspace `prototypes/` root. `build-prototype-index.mjs` generates `prototype-index-data.js` from artifact metadata, managed and legacy comparison links, prompt catalog data, and readiness issues.

The static hub has four views: Library, Comparisons, Prompts, and Health. It is navigation and management evidence only; standalone artifacts must not import its files.

Edit these asset files to change the canonical workspace UI. Do not hand-edit copied workspace files because the next `sync` replaces them.
