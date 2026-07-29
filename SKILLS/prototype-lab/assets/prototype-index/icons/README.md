# Prototype Lab interface icons

These SVG files are unmodified outline icons from Tabler Icons. The pinned
version and upstream paths are recorded in `manifest.json`; the upstream MIT
license is included as `LICENSE.tabler-icons`.

Run `npm run assets:icons` from the repository root to refresh the pinned set.
The vendor script also generates `tabler-icons.js` directly from those SVG
bodies and copies the same pinned set into the comparison hub and tool shell.
Every surface renders that official geometry inline so `currentColor` works
under both HTTP and `file://` without changing the original SVG files.
