# Portable Run Packs

Use this contract when a prototype or comparison must be uploaded, archived,
shared, reviewed outside the source workspace, or published as a static site.

## Pack Contract

Create the pack with `scripts/package-prototype-lab.mjs`, resolved relative to
this skill folder. The command accepts a primary prototype id or folder and
discovers linked standalone variants through metadata.

```text
<slug>-pack/
  index.html
  deploy.json
  pack.json
  prompts/
  runs/
  prototypes/
    <YYYY>/<MM>/<NNN>-<slug>/...
<slug>-pack.zip
```

The root launcher is the upload entrypoint. `deploy.json` is the host-neutral
deployment contract: publish the pack root as a multi-page static site with no
build command, server runtime, clean-URL rewrite, or SPA fallback. `pack.json` records the primary
prototype, linked source ids, prompt/run exports, proof policy, file sizes, and
SHA-256 hashes plus the same deployment contract. Relative prototype links remain intact inside `prototypes/`.
When the primary metadata declares `promptTemplates` and `runs`, those records
are canonical for the pack; abbreviated copies in linked variants are not
exported as duplicate prompts or runs. Legacy metadata remains packageable.
Legacy local drive paths are replaced only in the staged pack, never in source
evidence. `pack.json` lists every sanitized file; exported legacy prompts also
retain their original source hash when path sanitization changed the text.

Default packaging omits `proof/` to keep uploads small. Add `--include-proof`
for an evidence/review archive. Both profiles include final runtime, metadata,
local prompt/run records, worker receipts, and README files when present.

## Portability Rules

- Include only final prototype folders reachable from the primary metadata.
- Never include `.scratch`, local CLI transcripts, repository history,
  `node_modules`, build caches, prior archives, credentials, `.env` files,
  private keys, or secret/token files.
- Reject symlinks and sensitive filenames instead of following or silently
  publishing them.
- Reject declared prompt hashes that do not match their rendered files and run
  receipts that still contain `REQUIRED-` markers.
- For canonical v2 receipts, require coordinator worker id, `forkTurns: none`,
  assignment/input hashes, requested model/reasoning, empty coordinator-skill
  exposure, explicit context reads, and uncontaminated variant input. Require
  `effectiveModelSource: runtime-observed|not-captured`; never copy a requested
  route into `effectiveModel` as if the runtime had independently exposed it.
- When asset policy is `required`, reject a receipt without the named skill,
  generated asset source/prompt hashes, hashed project files, `consumedBy`
  references, and materiality proof.
- When asset policy is `fixed-supplied`, reject changed/missing file hashes,
  regenerated replacements, absent project-local copies, or assets without
  `consumedBy` references and materiality proof.
- For `required` and `fixed-supplied` assets, require a passed `visualReview`
  for the complete finite set: expected/reviewed item counts, semantic mapping,
  aspect ratio, narrow-viewport coverage, and existing project-local proof
  paths. Reject error-named captures, atlas stretching, cell bleed, or a
  default-item-only review.
- Keep runtime URLs relative. Do not emit local drive paths, `file://` URLs, or
  references outside the pack.
- Reject root-relative URLs, missing local references, and external runtime
  dependencies in HTML/CSS. External navigation links are allowed; scripts,
  stylesheets, fonts, frames, audio, video, and images required at runtime must
  live inside the pack.
- Open the unpacked root `index.html` and at least the primary prototype before
  handoff. For comparison packs, also open one linked non-primary variant.
- Treat `pack.json` hashes as transport integrity, not proof that the UI works.

## Package Commands

From a target workspace, resolve this skill folder and run:

```text
node <skill-root>/scripts/package-prototype-lab.mjs --workspace . --id <YYYY/MM/NNN-slug>
node <skill-root>/scripts/package-prototype-lab.mjs --workspace . --id <YYYY/MM/NNN-slug> --include-proof
```

The default destination is `dist/prototype-lab/`. Surface both the unpacked
folder and ZIP path in the handoff.

## Publishing

The unpacked pack root is the publish directory for any multi-page static host.
No build command or server runtime is required. Keep clean-URL rewrites and SPA
fallbacks disabled because prototype links intentionally target real
`index.html` files. Do not claim that a host accepts the ZIP directly unless its
upload flow actually does; unpack or adapt the pack when required.

For ChatGPT Sites, use the `sites-building` workflow to adapt or place the exact
validated pack into a Sites-compatible project, then use `sites-hosting` to
publish it. Preserve the pack launcher, `deploy.json`, and prototype-relative
paths; do not rebuild the prototype UI in the adapter. Prefer a
private deployment first. If only shared/public deployment is available, or
the user asks for a public URL, obtain explicit confirmation immediately before
the public deployment call.

Before any public upload, review the pack contents for proprietary prompts,
private model receipts, screenshots, customer data, copyrighted assets, local
paths, and credentials. Packaging authorization is not publication
authorization.

After any adapter or host-specific staging, compare the staged copy against the
pack manifest or copy from the pack again. The adapter may add hosting runtime
files outside the pack, but it must not rewrite the validated prototype assets.
