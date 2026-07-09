# Prototype Index

Copy these files into `prototypes/` when the workspace needs a simple landing and no local index exists.

Expected destination:

```text
prototypes/
  index.html
  prototype-index.css
  prototype-index.js
  <YYYY>/<MM>/<NNN>-<prototype-slug>/index.html
```

Update the `prototypes` array in `prototype-index.js` with each prototype's path and metadata. Keep this landing as navigation only; prototypes must not import its CSS, JavaScript, or data.

Use iframe previews for quick visual scanning, direct links for opening full prototypes, and compact cards for title, question, status, category, tags, model/skill summary, and proof count.

The index is the workspace browser, not the full comparison engine. Pairwise comparisons, blind guess/reveal, rankings, and iteration review should live inside the comparison prototype itself so the URL can preserve exact variant state.

Design read:

- surface: prototype evidence browser for reviewers and builders
- task: decide what to inspect, compare, keep, or retire
- rejected default: portfolio-style gallery with decorative cards
- rejected second reflex: dense dark dashboard with fake metadata noise
- signature move: real scaled prototype previews paired with a compact evidence ledger

Keep the landing quiet. The preview is the asset; card chrome exists only to support filtering, attribution, and opening the real prototype.
