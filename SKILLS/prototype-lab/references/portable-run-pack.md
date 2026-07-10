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
  pack.json
  prompts/
  runs/
  prototypes/
    <YYYY>/<MM>/<NNN>-<slug>/...
<slug>-pack.zip
```

The root launcher is the upload entrypoint. `pack.json` records the primary
prototype, linked source ids, prompt/run exports, proof policy, file sizes, and
SHA-256 hashes. Relative prototype links remain intact inside `prototypes/`.
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
- Keep runtime URLs relative. Do not emit local drive paths, `file://` URLs, or
  references outside the pack.
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

The static pack can be uploaded to a normal static host. Do not claim that a
host accepts the ZIP directly unless its upload flow actually does; unpack or
adapt the pack when required.

For ChatGPT Sites, use the `sites-building` workflow to adapt or place the exact
validated pack into a Sites-compatible project, then use `sites-hosting` to
publish it. Preserve the pack launcher and prototype-relative paths. Prefer a
private deployment first. If only shared/public deployment is available, or
the user asks for a public URL, obtain explicit confirmation immediately before
the public deployment call.

Before any public upload, review the pack contents for proprietary prompts,
private model receipts, screenshots, customer data, copyrighted assets, local
paths, and credentials. Packaging authorization is not publication
authorization.
