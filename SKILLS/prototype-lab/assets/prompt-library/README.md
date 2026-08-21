# Prototype Prompt Library

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

Stable lowercase ids. Never overwrite an executed version; save a new version. Copy the chosen rendered prompt into the experiment owner folder; record library id, version, and SHA-256 in run receipts.

Seed the creative suite for high-freedom capability coverage; `pick --count <n>` for a small diverse set; `save` when a user or agent authors a reusable test prompt. Creative showcase prompts separate fixed outcomes from open decisions and declare asset/layout policy. `testDimensions` stay in metadata as a held-out review rubric; the renderer does not coach workers with them. Prompts marked ephemeral or containing sensitive material stay out of this library.

`catalog.json` is generated. Edit prompt entries, not the catalog.
