# Contributing

Prototype Lab accepts focused fixes and improvements that preserve portable static output, explicit evidence boundaries, and isolated variant ownership.

1. Create a branch from `main`.
2. Run `corepack pnpm@11.21.0 install --frozen-lockfile`.
3. Make the smallest coherent change and update nearby documentation when a public contract changes.
4. Run `corepack pnpm@11.21.0 run check`.
5. If you changed browser UI, run the relevant optional suite with `PROTOTYPE_LAB_PLAYWRIGHT_ROOT` configured.
6. Open a pull request describing the changed outcome, verification, and remaining limitations.

Do not include private prompts, personal workspace data, generated prototypes, or `.scratch` evidence in a contribution.
