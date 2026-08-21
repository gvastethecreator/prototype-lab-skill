# Portable Run Packs

Use this contract when a prototype or comparison must be uploaded, archived, shared, reviewed outside the source workspace, or published as a static site.

## Pack Contract

Create the pack with `scripts/package-prototype-lab.mjs`, resolved relative to this skill folder. Accepts a primary prototype id or folder; discovers linked standalone variants through metadata.

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

- Root launcher: upload entrypoint.
- `deploy.json`: host-neutral deployment contract — publish pack root as a multi-page static site; no build command, server runtime, clean-URL rewrite, or SPA fallback.
- `pack.json`: primary prototype, linked source ids, prompt/run exports, proof policy, file sizes, SHA-256 hashes, same deployment contract. Lists every sanitized file.
- Relative prototype links stay intact inside `prototypes/`.
- When primary metadata declares `promptTemplates` and `runs`, those records are canonical; abbreviated copies in linked variants are not exported as duplicate prompts or runs.
- Legacy metadata remains packageable. Legacy local drive paths replaced only in the staged pack, never in source evidence. Exported legacy prompts retain original source hash when path sanitization changed the text.

Default packaging omits `proof/` to keep uploads small. Add `--include-proof` for an evidence/review archive. Both profiles include final runtime, metadata, local prompt/run records, worker receipts, and README files when present.

## Portability Rules

- Include only final prototype folders reachable from the primary metadata.
- Never include `.scratch`, local CLI transcripts, repository history, `node_modules`, build caches, prior archives, credentials, `.env` files, private keys, or secret/token files.
- Reject symlinks and sensitive filenames instead of following or silently publishing them.
- Reject declared prompt hashes that do not match their rendered files and run receipts that still contain `REQUIRED-` markers.
- Canonical v3 receipts require: coordinator worker id; verified fresh-worker isolation adapter (Codex `forkTurns: none` only with its adapter); assignment/input hashes; requested model/reasoning; empty coordinator-skill exposure; explicit context reads; uncontaminated variant input. Require `effectiveModelSource: runtime-observed|not-captured`; never copy a requested route into `effectiveModel` as if the runtime had independently exposed it.
- Asset policy `required`: reject a receipt without the named skill, generated asset source/prompt hashes, hashed project files, `consumedBy` references, and materiality proof.
- Asset policy `fixed-supplied`: reject changed/missing file hashes, regenerated replacements, absent project-local copies, or assets without `consumedBy` references and materiality proof.
- `required` and `fixed-supplied` assets: require a passed `visualReview` for the complete finite set — expected/reviewed item counts, semantic mapping, aspect ratio, narrow-viewport coverage, and existing project-local proof paths. Reject error-named captures, atlas stretching, cell bleed, or a default-item-only review.
- Runtime URLs relative. Do not emit local drive paths, `file://` URLs, or references outside the pack.
- Reject root-relative URLs, missing local references, and external runtime dependencies in HTML/CSS. External navigation links are allowed; scripts, stylesheets, fonts, frames, audio, video, and images required at runtime must live inside the pack.
- Open unpacked root `index.html` and at least the primary prototype before handoff. For comparison packs, also open one linked non-primary variant.
- `pack.json` hashes are transport integrity, not proof that the UI works.

## Package Commands

From a target workspace, resolve this skill folder and run:

```text
node <skill-root>/scripts/package-prototype-lab.mjs --workspace . --id <YYYY/MM/NNN-slug>
node <skill-root>/scripts/package-prototype-lab.mjs --workspace . --id <YYYY/MM/NNN-slug> --include-proof
```

Normal handoff: `lab ship --id <id> [--include-proof]`. Requires full verification, finalizes the owner, then invokes this packager. Use `lab pack` directly only when status management and browser evidence have already been handled separately.

Default destination: `dist/prototype-lab/`. Surface both the unpacked folder and ZIP path in the handoff.

## Publishing

Unpacked pack root is the publish directory for any multi-page static host — no build command or server runtime. Keep clean-URL rewrites and SPA fallbacks disabled; prototype links target real `index.html` files. Do not claim a host accepts the ZIP directly unless its upload flow does; unpack or adapt when required.

For ChatGPT Sites, use `sites-building` to adapt or place the exact validated pack into a Sites-compatible project, then `sites-hosting` to publish. Preserve pack launcher, `deploy.json`, and prototype-relative paths; do not rebuild the prototype UI in the adapter. Prefer private deployment first. If only shared/public deployment is available, or the user asks for a public URL, obtain explicit confirmation immediately before the public deployment call.

Before any public upload, review the pack for proprietary prompts, private model receipts, screenshots, customer data, copyrighted assets, local paths, and credentials. Packaging authorization is not publication authorization.

After adapter or host-specific staging, compare the staged copy against the pack manifest or copy from the pack again. Adapter may add hosting runtime files outside the pack; it must not rewrite validated prototype assets.
