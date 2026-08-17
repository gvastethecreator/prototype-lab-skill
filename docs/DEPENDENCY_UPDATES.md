# Dependency review — 2026-08-12

- Migrated the root skill repository from npm command examples to pnpm 11.21.0 and generated
  `pnpm-lock.yaml`.
- The root package intentionally has no installed dependencies; browser suites consume a separately
  provisioned Playwright root. The nested `sites/winamp-radio-glsl-public` repository is a separate
  project and is reviewed under its own ticket.
- No operational Bun usage was found. No package changelogs apply to the root graph; the policy is
  recorded here so future additions include a lockfile and upstream release notes.
