# Prototype Lab interface icons

Unmodified Tabler Icons outline SVGs. Pinned version and upstream paths live in `manifest.json`; upstream MIT license is `LICENSE.tabler-icons`.

Run `pnpm run assets:icons` from the repository root to refresh the pinned set.
Vendor script generates `tabler-icons.js` from those SVG bodies and copies the same pinned set into the comparison hub and tool shell.
Every surface renders that geometry inline so `currentColor` works under HTTP and `file://` without changing original SVG files.
