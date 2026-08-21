# Design Rounds

Use when one prototype needs several visual or interaction takes of the same brief. Do not use for model, skill, agent, or prompt capability comparisons — those stay isolated owners plus a hub.

A round asks one design question with rendered positions. The user answers by looking, not by choosing from a paragraph of mock descriptions.

## Contract

1. Write `plan.json` before drafting positions.
2. Four positions for exploration. Two or three for a later fine-tune round.
3. Positions must disagree on structure: layout, hierarchy, primary affordance, or visual device. Four padded card grids fail the round.
4. Talk in positions (`2 of 4`), never filenames.
5. Recommend one position and name its cost in one sentence.
6. A round narrows. After a keep, drop the rest before drawing again.
7. Look at every live position, including `390x844`, before presenting.

Done when each live position answers the same question differently, `lab vary --check` is clean, and the user can flip them on the owner's page.

## plan.json

```json
{
  "schemaVersion": 1,
  "status": "open",
  "question": "How much should the first screen say before the next action?",
  "fresh": false,
  "current": 1,
  "recommended": 3,
  "positions": [
    { "n": 1, "name": "as it was" },
    { "n": 2, "name": "the ledger", "angle": "type only", "cost": "nothing to look at above the fold" },
    { "n": 3, "name": "split", "angle": "asymmetric two column", "cost": "weaker at 390px" },
    { "n": 4, "name": "the outcome", "angle": "leads with the result", "cost": "slower to say what it is" }
  ]
}
```

- `question`: one line. Everything else is an answer to it.
- `name`: the word you would use in chat. It rides the pager.
- `angle`: the one thing this position changes. Duplicate angles fail `check`.
- `cost`: what it gives up. A recommendation with no cost reads like salesmanship.
- Position 1 of an existing canvas needs neither `angle` nor `cost`. A `--new` round has no baseline: every position needs both.

Write the plan, then land each position as a complete drop-in under `positions/<n>/`. Same runtime files the owner already uses. No new dependencies. No shared file that only one position introduced.

## Commands

```text
lab vary --id <id> [--n 4] [--new] [--question <q>]
lab vary --id <id> --check
lab vary --id <id> --use <n>
lab vary --id <id> --narrow --keep <n>
lab vary --id <id> --end [--keep <n>] [--why <note>]
```

`vary` snapshots the current canvas as position 1 unless `--new`. Switching is URL-backed (`?p=<n>`) on a host page that iframes `positions/<n>/`. `--use` sets the default position. `--end` copies the kept position over the owner root and removes the host.

Never edit position 1 while it is the frozen original. Never write the owner root canvas while a round is open: write a position, then `--use`.

## After A Verdict

- Keep: `--end --keep <n> --why "<direction name>"`. Confirm by that name.
- Steer (`calmer`, `bolder`, `airier`, `denser`, `playful`): `--narrow --keep <n>` first, then write 2 and 3 on that winner. "Calmer" tightens; "other takes like this" explores around it.
- Merge (`2's layout with 4's stat strip`): each named part comes whole from one donor, including dropped files under `positions/.dropped/`. Never average two directions. Name the donors in the merge `angle`.
- Passed-over directions stay dead unless the user asks for one back; then copy it, do not redraw it.
- Small copy or spacing edits on a winner are ordinary file edits, not a new round.

## Substrate

Before the first generative pass in a session, read the owner's tokens, the target files' imports, neighbouring sections, and real copy. Invented hex, new primitives, and lorem fail the round.

With no design system yet, settle one background, one ink, one accent, one spacing rhythm first. Then let positions differ on structure. Four unrelated palettes are not a layout round.

## Motion

Animate only when the round is about motion, or when the action is rare. Frequent controls stay instant. Move `transform` and `opacity` only. Honor `prefers-reduced-motion`. Clicking the already-live position should replay motion that needs a trigger.

## Not This Skill

Do not attach a sidecar that overwrites files in an unrelated app. Prototype Lab varies a managed owner. Independent model/skill/prompt runs still get one owner each and a comparison hub.
