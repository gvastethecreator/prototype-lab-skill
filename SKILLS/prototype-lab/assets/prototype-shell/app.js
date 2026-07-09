const comparisonBrief = {
  prompt: "Replace with the shared prompt every variant answers.",
  criteria: ["Fit", "Clarity", "Interaction", "Taste"],
  methods: ["gallery", "compare", "focus", "stress"],
  frame: "Responsive prototype canvas",
};

const provenance = {
  prompts: [
    {
      id: "shared",
      label: "Shared prompt",
      text: comparisonBrief.prompt,
    },
  ],
  skills: ["prototype-lab"],
  models: ["GPT-5"],
  integrity: {
    requestedVariants: 4,
    deliveredVariants: 4,
    crossVariantLeakage: false,
    workerReceiptsRequired: false,
  },
  agentRuns: [
    {
      variantId: "baseline",
      agentMode: "single-agent-fallback",
      agentTool: "not captured",
      outputPath: "not captured",
      fallbackReason: "not captured",
      inputScope: "shared brief only",
      receivedOtherVariants: false,
      editedFinalPrototype: false,
      status: "actual",
    },
  ],
  tokenUsage: {
    input: "unknown",
    output: "unknown",
    total: "unknown",
  },
  toolCalls: ["not captured"],
  limitations: ["Replace unknown usage values only when the run captured them."],
};

const variants = [
  {
    id: "baseline",
    title: "Baseline",
    source: "Current model / prototype-lab",
    status: "actual",
    agentMode: "single-agent-fallback",
    agentTool: "not captured",
    outputPath: "not captured",
    fallbackReason: "not captured",
    prompt: "shared",
    tokens: "unknown",
    toolCalls: "not captured",
    hypothesis: "Keep the primary path clear and compact.",
    tradeoff: "May be less exploratory than the other options.",
    tone: "neutral",
    signals: ["Primary path", "Compact shell", "Inspectable state"],
  },
  {
    id: "skill-a",
    title: "Skill A",
    source: "Requested skill or design option",
    status: "planned",
    agentMode: "unavailable",
    agentTool: "not captured",
    outputPath: "not captured",
    fallbackReason: "worker not yet assigned",
    prompt: "shared",
    tokens: "unknown",
    toolCalls: "not captured",
    hypothesis: "Test whether a specialized workflow changes hierarchy.",
    tradeoff: "Needs real skill execution before final attribution.",
    tone: "cyan",
    signals: ["Different hierarchy", "Source label", "Same prompt"],
  },
  {
    id: "skill-b",
    title: "Skill B",
    source: "Second requested skill or model",
    status: "planned",
    agentMode: "unavailable",
    agentTool: "not captured",
    outputPath: "not captured",
    fallbackReason: "worker not yet assigned",
    prompt: "shared",
    tokens: "unknown",
    toolCalls: "not captured",
    hypothesis: "Stress a different interaction or visual direction.",
    tradeoff: "Can become apples-to-oranges if the shared state drifts.",
    tone: "gold",
    signals: ["Alternate controls", "Same viewport", "Visible risk"],
  },
  {
    id: "model-c",
    title: "Model C",
    source: "Requested model or prompt variant",
    status: "planned",
    agentMode: "unavailable",
    agentTool: "not captured",
    outputPath: "not captured",
    fallbackReason: "worker not yet assigned",
    prompt: "shared",
    tokens: "unknown",
    toolCalls: "not captured",
    hypothesis: "Compare a more opinionated layout against the baseline.",
    tradeoff: "Do not claim actual model output unless it was invoked.",
    tone: "rose",
    signals: ["Variant source", "Review criteria", "Focus mode"],
  },
];

const views = [
  {
    id: "overview",
    title: "Overview",
    description: "Shared prompt, comparison criteria, and current variant ledger.",
    layout: "overview",
  },
  {
    id: "compare",
    title: "Compare",
    description: "All variants at the same scale for fast review.",
    layout: "compare",
  },
  {
    id: "focus",
    title: "Focus",
    description: "Inspect one selected variant with source, hypothesis, and tradeoff.",
    layout: "focus",
  },
  {
    id: "stress",
    title: "Stress",
    description: "Check long labels, empty states, and dense notes before handoff.",
    layout: "stress",
  },
];

const shell = document.querySelector(".plab-shell");
const nav = document.querySelector("#view-nav");
const stage = document.querySelector("#stage");
const activeKicker = document.querySelector("#active-kicker");
const activeTitle = document.querySelector("#active-title");
const activeDescription = document.querySelector("#active-description");
const demoGrid = document.querySelector("#demo-grid");
const densityControl = document.querySelector("#density-control");
const debugControl = document.querySelector("#debug-control");
const variantControl = document.querySelector("#variant-control");
const provenancePanel = document.querySelector("#provenance-panel");
const stateReadout = document.querySelector("#state-readout");
const statusChip = document.querySelector("#status-chip");
const drawerButton = document.querySelector("[data-action='drawer']");
const drawer = document.querySelector("#prototype-drawer");

const params = new URLSearchParams(location.search);
const state = {
  viewId: params.get("view") || views[0].id,
  variantId: params.get("variant") || variants[0].id,
  density: 1,
  debug: false,
  drawerOpen: false,
};

function activeView() {
  return views.find((view) => view.id === state.viewId) || views[0];
}

function activeVariant() {
  return variants.find((variant) => variant.id === state.variantId) || variants[0];
}

function syncUrl() {
  const url = new URL(location.href);
  url.searchParams.set("view", state.viewId);
  url.searchParams.set("variant", state.variantId);
  history.replaceState(null, "", url);
}

function setView(viewId, shouldFocus = false) {
  state.viewId = (views.find((view) => view.id === viewId) || views[0]).id;
  syncUrl();
  render(shouldFocus);
}

function setVariant(variantId, nextView = state.viewId, shouldFocus = false) {
  state.variantId = (variants.find((variant) => variant.id === variantId) || variants[0]).id;
  state.viewId = (views.find((view) => view.id === nextView) || views[0]).id;
  syncUrl();
  render(shouldFocus);
}

function setDrawer(open) {
  state.drawerOpen = open;
  shell.dataset.drawer = open ? "open" : "closed";
  drawerButton.setAttribute("aria-expanded", String(open));
  drawer.setAttribute("aria-hidden", String(!open));
  renderControls();
}

function button(label, className, onClick, attributes = {}) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  element.addEventListener("click", onClick);
  return element;
}

function renderNav() {
  nav.replaceChildren(
    ...views.map((view) =>
      button(view.title, "plab-nav-button", () => setView(view.id, true), {
        "data-active": String(view.id === state.viewId),
      }),
    ),
  );
}

function renderOverview() {
  const cards = [
    {
      title: "Shared Prompt",
      detail: comparisonBrief.prompt,
      meta: comparisonBrief.frame,
    },
    {
      title: "Criteria",
      detail: comparisonBrief.criteria.join(" / "),
      meta: "Keep these stable across variants.",
    },
    {
      title: "Methods",
      detail: comparisonBrief.methods.join(" / "),
      meta: "Add pairwise, blind, rankings, iterations, or archive when useful.",
    },
    {
      title: "Active Variant",
      detail: activeVariant().title,
      meta: activeVariant().source,
    },
  ];

  demoGrid.replaceChildren(...cards.map(renderSummaryCard), renderVariantLedger());
}

function renderCompare() {
  const board = document.createElement("section");
  board.className = "variant-board";
  board.setAttribute("aria-label", "Variant comparison board");
  board.append(
    ...variants.map((variant) => {
      const card = document.createElement("article");
      card.className = "variant-card";
      card.dataset.active = String(variant.id === state.variantId);
      card.dataset.tone = variant.tone;
      card.tabIndex = 0;
      card.addEventListener("click", () => setVariant(variant.id, "focus", true));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setVariant(variant.id, "focus", true);
        }
      });
      card.append(renderVariantPreview(variant, "mini"), renderVariantMeta(variant));
      return card;
    }),
  );
  demoGrid.replaceChildren(board);
}

function renderFocus() {
  const variant = activeVariant();
  const layout = document.createElement("section");
  layout.className = "focus-layout";
  layout.dataset.tone = variant.tone;

  const previewWrap = document.createElement("div");
  previewWrap.className = "focus-preview";
  previewWrap.append(renderVariantPreview(variant, "large"));

  const notes = document.createElement("aside");
  notes.className = "variant-notes";
  notes.append(
    labelBlock("Source", variant.source),
    labelBlock("Attribution", variant.status),
    labelBlock("Agent", `${variant.agentMode} / ${variant.agentTool}`),
    labelBlock("Output", variant.outputPath),
    labelBlock("Fallback", variant.fallbackReason),
    labelBlock("Prompt", variant.prompt),
    labelBlock("Tokens", variant.tokens),
    labelBlock("Tool Calls", variant.toolCalls),
    labelBlock("Hypothesis", variant.hypothesis),
    labelBlock("Tradeoff", variant.tradeoff),
  );

  layout.append(previewWrap, notes);
  demoGrid.replaceChildren(layout);
}

function renderStress() {
  const variant = activeVariant();
  const stressItems = [
    ["Empty", "No track loaded, no selection, default controls still aligned."],
    ["Long", "A deliberately long label that should wrap without shifting the shell or hiding actions."],
    ["Loading", "Pending model/skill output is visible without pretending the variant is finished."],
    ["Unavailable", "Requested model or skill is labelled unavailable instead of silently faked."],
  ];
  const grid = document.createElement("section");
  grid.className = "stress-grid";
  grid.dataset.tone = variant.tone;
  grid.append(
    ...stressItems.map(([title, detail]) => {
      const item = document.createElement("article");
      item.className = "stress-card";
      const heading = document.createElement("strong");
      heading.textContent = title;
      const text = document.createElement("span");
      text.textContent = detail;
      item.append(heading, text);
      return item;
    }),
  );
  demoGrid.replaceChildren(grid);
}

function renderStage() {
  const view = activeView();
  activeKicker.textContent = view.id;
  activeTitle.textContent = view.title;
  activeDescription.textContent = view.description;
  demoGrid.className = `demo-grid is-${view.layout}`;
  if (view.layout === "overview") renderOverview();
  if (view.layout === "compare") renderCompare();
  if (view.layout === "focus") renderFocus();
  if (view.layout === "stress") renderStress();
}

function renderSummaryCard(card) {
  const article = document.createElement("article");
  article.className = "summary-card";
  const title = document.createElement("strong");
  title.textContent = card.title;
  const detail = document.createElement("span");
  detail.textContent = card.detail;
  const meta = document.createElement("small");
  meta.textContent = card.meta;
  article.append(title, detail, meta);
  return article;
}

function renderVariantLedger() {
  const ledger = document.createElement("section");
  ledger.className = "variant-ledger";
  ledger.append(
    ...variants.map((variant) => {
      const row = button(`${variant.title} | ${variant.status}`, "variant-row", () =>
        setVariant(variant.id, "focus", true),
      );
      row.dataset.active = String(variant.id === state.variantId);
      const detail = document.createElement("span");
      detail.textContent = variant.source;
      row.append(detail);
      return row;
    }),
  );
  return ledger;
}

function renderVariantPreview(variant, size) {
  const preview = document.createElement("div");
  preview.className = `variant-preview is-${size}`;
  preview.dataset.tone = variant.tone;

  const head = document.createElement("div");
  head.className = "variant-preview-head";
  const title = document.createElement("strong");
  title.textContent = variant.title;
  const status = document.createElement("span");
  status.textContent = variant.status;
  head.append(title, status);

  const display = document.createElement("div");
  display.className = "variant-display";
  const readout = document.createElement("div");
  readout.className = "variant-readout";
  readout.textContent = variant.signals[0];
  const bars = document.createElement("div");
  bars.className = "variant-bars";
  bars.append(...variant.signals.map((signal) => renderSignal(signal)));
  display.append(readout, bars);

  const foot = document.createElement("p");
  foot.textContent = variant.hypothesis;

  preview.append(head, display, foot);
  return preview;
}

function renderSignal(signal) {
  const row = document.createElement("span");
  row.className = "variant-signal";
  row.textContent = signal;
  return row;
}

function renderVariantMeta(variant) {
  const meta = document.createElement("div");
  meta.className = "variant-meta";
  const source = document.createElement("span");
  source.textContent = variant.source;
  const tradeoff = document.createElement("small");
  tradeoff.textContent = variant.tradeoff;
  meta.append(source, tradeoff);
  return meta;
}

function labelBlock(label, value) {
  const block = document.createElement("div");
  block.className = "label-block";
  const title = document.createElement("strong");
  title.textContent = label;
  const detail = document.createElement("span");
  detail.textContent = value;
  block.append(title, detail);
  return block;
}

function fitStatus() {
  const pageScroll =
    Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) >
    innerHeight + 2;
  if (pageScroll) return "page-scroll";
  if (stage.scrollHeight > stage.clientHeight + 2) return "stage-scroll";
  return "fit";
}

function renderVariantPicker() {
  variantControl.replaceChildren(
    ...variants.map((variant) =>
      button(variant.title, "variant-picker-button", () => setVariant(variant.id, state.viewId, true), {
        "data-active": String(variant.id === state.variantId),
      }),
    ),
  );
}

function renderProvenance() {
  const active = activeVariant();
  const rows = [
    ["Prompt", provenance.prompts.map((prompt) => `${prompt.id}: ${prompt.text}`).join(" | ")],
    ["Skills", provenance.skills.join(", ")],
    ["Models", provenance.models.join(", ")],
    [
      "Agent Runs",
      provenance.agentRuns
        .map((run) => `${run.variantId}: ${run.agentMode} via ${run.agentTool}`)
        .join(" | "),
    ],
    [
      "Integrity",
      `${provenance.integrity.deliveredVariants}/${provenance.integrity.requestedVariants} variants, leakage ${provenance.integrity.crossVariantLeakage}`,
    ],
    [
      "Tokens",
      `in ${provenance.tokenUsage.input} / out ${provenance.tokenUsage.output} / total ${provenance.tokenUsage.total}`,
    ],
    ["Tool Calls", provenance.toolCalls.join(", ")],
    ["Active Variant", `${active.title}: ${active.status}, ${active.source}`],
    ["Limitations", provenance.limitations.join(" | ") || "none"],
  ];
  provenancePanel.replaceChildren(...rows.map(([label, value]) => labelBlock(label, value)));
}

function renderControls() {
  document.documentElement.dataset.density = String(state.density);
  document.documentElement.dataset.debug = String(state.debug);
  densityControl.value = String(state.density);
  debugControl.checked = state.debug;
  renderVariantPicker();
  renderProvenance();
  const snapshot = {
    view: state.viewId,
    variant: state.variantId,
    drawer: state.drawerOpen ? "open" : "closed",
    density: state.density,
    debug: state.debug,
    viewport: `${innerWidth}x${innerHeight}`,
    fit: fitStatus(),
    provenance,
    variants: variants.map(({ id, status, source, agentMode, agentTool, fallbackReason }) => ({
      id,
      status,
      source,
      agentMode,
      agentTool,
      fallbackReason,
    })),
  };
  stateReadout.textContent = JSON.stringify(snapshot, null, 2);
  statusChip.textContent = `${state.viewId} | ${state.variantId} | ${snapshot.fit}`;
}

function render(shouldFocus = false) {
  renderNav();
  renderStage();
  renderControls();
  if (shouldFocus) stage.focus({ preventScroll: true });
}

densityControl.addEventListener("input", (event) => {
  state.density = Number(event.currentTarget.value);
  renderControls();
});

debugControl.addEventListener("change", (event) => {
  state.debug = event.currentTarget.checked;
  renderControls();
});

document.querySelector("[data-action='reset']").addEventListener("click", () => {
  state.density = 1;
  state.debug = false;
  setVariant(variants[0].id, views[0].id, true);
});

document.querySelector("[data-action='snapshot']").addEventListener("click", async () => {
  try {
    await navigator.clipboard?.writeText(stateReadout.textContent);
    statusChip.textContent = "copied";
  } catch {
    statusChip.textContent = "copy unavailable";
  }
});

document.querySelectorAll("[data-action='drawer'], [data-action='drawer-close']").forEach((control) => {
  control.addEventListener("click", () => setDrawer(!state.drawerOpen));
});

addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.drawerOpen) setDrawer(false);
});

addEventListener("resize", renderControls, { passive: true });

syncUrl();
render();
