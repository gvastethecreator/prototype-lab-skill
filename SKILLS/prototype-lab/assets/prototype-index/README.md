# Prototype Index

Copy these files into `prototypes/` when the workspace needs a simple landing and no local index exists.

Expected destination:

```text
prototypes/
  index.html
  prototype-index-data.js
  prototype-index.css
  prototype-index.js
  <YYYY>/<MM>/<NNN>-<prototype-slug>/index.html
```

Generate `prototype-index-data.js` from `prototypes/**/metadata.json` whenever possible. In this skill pack, `node scripts/build-prototype-index.mjs` writes that data file for the local workspace. A static `file://` page cannot enumerate folders by itself, so the generated data file is the bridge between correct folders and the browser index. Keep this landing as navigation only; prototypes must not import its CSS, JavaScript, or data.

Use iframe previews for quick visual scanning, direct links for opening full prototypes, and compact cards for title, question, status, category, tags, model/skill/agent/proof badges, and proof count.

The index is the workspace browser, not the full comparison engine. It may expose a simple left/right comparison picker that deep-links into the comparison hub when a hub exists. Pairwise comparisons, blind guess/reveal, rankings, and iteration review should live inside the comparison prototype itself so the URL can preserve exact variant state.

When cards embed prototypes:

- load iframe previews with `?embed=1` when the prototype supports it
- keep standalone open links pointed at the normal `index.html`
- do not show dead reset/info/debug buttons inside card previews
- prefer saturated solid badges for exact model, skills, agents, status, and proof instead of small bordered metadata boxes
- use small desaturated icons in badges and footer metadata when they improve scanning
- keep card anatomy homogeneous: preview, title/status, two-line question, badge rail, tag rail, and action row should occupy stable zones
- use subtle surface color changes to separate cards; avoid border-heavy nested containers
- keep prototype card surfaces neutral gray; let badges and content carry color
- keep the main card grid as one rounded surface with a restrained shadow
- show date and path as compact footer metadata, not as a second call to action
- open prototypes in the same window by default so browser back/forward works naturally
- group cards by date in the top toolbar: day, week, month, or year
- sort groups newest-first, and sort prototypes inside each group newest-first by date plus prototype sequence when available
- keep the browsing format as a card grid: groups are vertical sections, and each group renders its cards in rows and columns

When many prototypes or variants exist, expose a hub selector plus compact A/B dropdowns. The selected hub's metadata should declare the variant ids, and the A/B fields should only offer those variants. Avoid selecting the same prototype on both sides by accident, and deep-link to the hub with `?view=<defaultView>&left=<id>&right=<id>`. The hub must understand those params before exposing the picker.

Design read:

- surface: prototype evidence browser for reviewers and builders
- task: decide what to inspect, compare, keep, or retire
- rejected default: portfolio-style gallery with decorative cards
- rejected second reflex: dense dark dashboard with fake metadata noise
- signature move: real scaled prototype previews paired with a compact evidence ledger

Keep the landing quiet. The preview is the asset; card chrome exists only to support filtering, attribution, and opening the real prototype.
