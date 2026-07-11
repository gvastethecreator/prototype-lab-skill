# Prototype Prompt Library

This folder stores reusable prompts for repeatable model, skill, and agent tests.

```text
prototypes/prompts/
  catalog.json
  <prompt-id>/
    prompt.json
    v001/
      prompt.template.md
      prompt.vars.json
      prompt.rendered.md
```

Use stable lowercase ids. Never overwrite a version that has been executed;
save a new version instead. Copy the chosen rendered prompt into the experiment
owner folder and record its library id, version, and SHA-256 in run receipts.

Seed the creative suite for broad coverage, use `pick --count <n>` for a small
diverse benchmark, and use `save` whenever a user or agent authors a reusable
test prompt. Prompts marked ephemeral or containing sensitive material stay out
of this library.

`catalog.json` is generated. Edit prompt entries, not the catalog.
