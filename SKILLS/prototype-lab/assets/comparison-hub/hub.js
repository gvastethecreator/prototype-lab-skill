const data = window.PROTOTYPE_HUB_DATA || { variants: [], criteria: [] };
const variants = Array.isArray(data.variants) ? data.variants : [];
const views = ["overview", "compare", "focus", "provenance"];
const params = new URLSearchParams(location.search);
const state = {
  view: views.includes(params.get("view")) ? params.get("view") : data.defaultView || "overview",
  left: resolveVariant(params.get("left"))?.id || variants[0]?.id,
  right: resolveVariant(params.get("right"))?.id || variants[1]?.id || variants[0]?.id,
  focus: resolveVariant(params.get("variant"))?.id || variants[0]?.id
};

const title = document.querySelector("#hub-title");
const question = document.querySelector("#hub-question");
const summary = document.querySelector("#hub-summary");
const nav = document.querySelector("#hub-nav");
const nodes = Object.fromEntries(views.map((view) => [view, document.querySelector(`#view-${view}`)]));

title.textContent = data.title || "Prototype comparison";
question.textContent = data.question || "No comparison question recorded.";
document.title = data.title || "Prototype comparison";

function resolveVariant(value) {
  return variants.find((variant) => variant.id === value || variant.prototypeId === value) || null;
}

function setView(view) {
  state.view = views.includes(view) ? view : "overview";
  syncUrl();
  render();
}

function syncUrl() {
  const url = new URL(location.href);
  url.searchParams.set("view", state.view);
  if (state.left) url.searchParams.set("left", state.left);
  if (state.right) url.searchParams.set("right", state.right);
  if (state.focus) url.searchParams.set("variant", state.focus);
  history.replaceState(null, "", url);
}

function render() {
  nav.replaceChildren(...views.map((view) => button(label(view), () => setView(view), state.view === view)));
  Object.entries(nodes).forEach(([view, node]) => node.dataset.active = String(view === state.view));
  summary.replaceChildren(chip(`${variants.length} variants`), chip(data.dimension || "prototype"), chip(data.status || "unknown"), chip(data.date || "date unknown"));
  renderOverview();
  renderCompare();
  renderFocus();
  renderProvenance();
}

function renderOverview() {
  const intro = element("section", "brief-panel");
  intro.append(sectionTitle("Decision brief"), paragraph(data.question || "No question recorded."));
  const criteria = element("div", "criteria-list");
  (data.criteria || []).forEach((item, index) => criteria.append(labelValue(String(index + 1).padStart(2, "0"), item)));
  intro.append(criteria);
  const grid = element("section", "variant-grid");
  grid.replaceChildren(...variants.map((variant) => variantCard(variant)));
  nodes.overview.replaceChildren(intro, grid);
}

function renderCompare() {
  const controls = element("section", "compare-controls");
  controls.append(selectVariant("A", "left"), element("span", "versus", "versus"), selectVariant("B", "right"));
  const left = resolveVariant(state.left) || variants[0];
  let right = resolveVariant(state.right) || variants[1] || left;
  if (left?.id === right?.id && variants.length > 1) right = variants.find((variant) => variant.id !== left.id);
  const grid = element("section", "compare-grid");
  if (left) grid.append(compareFrame(left));
  if (right) grid.append(compareFrame(right));
  nodes.compare.replaceChildren(controls, grid);
}

function renderFocus() {
  const active = resolveVariant(state.focus) || variants[0];
  const rail = element("aside", "focus-rail");
  variants.forEach((variant) => rail.append(button(variant.title, () => { state.focus = variant.id; syncUrl(); renderFocus(); }, variant.id === active?.id)));
  const preview = active ? previewPanel(active, "Focus") : empty("No variants available.");
  const detail = element("aside", "focus-detail");
  if (active) {
    detail.append(sectionTitle(active.title), badges(active), labelValue("Hypothesis", active.hypothesis), labelValue("Tradeoff", active.tradeoff), labelValue("Source", active.prototypeId));
  }
  nodes.focus.replaceChildren(rail, preview, detail);
}

function renderProvenance() {
  const criteria = element("section", "provenance-panel");
  criteria.append(sectionTitle("Comparison contract"), labelValue("Dimension", data.dimension || "unknown"), labelValue("Question", data.question || "unknown"));
  (data.criteria || []).forEach((item) => criteria.append(labelValue("Criterion", item)));
  const ledger = element("section", "ledger");
  ledger.append(sectionTitle("Variant ledger"));
  variants.forEach((variant) => {
    const row = element("article", "ledger-row");
    row.append(element("strong", "", variant.title), chip(variant.status || "unknown"), element("span", "mono", variant.model || "unknown model"), element("span", "", (variant.skills || []).join(", ") || "unknown skill"), element("span", "mono", `${variant.proof || 0} proof`), link("Open", variant.path));
    ledger.append(row);
  });
  nodes.provenance.replaceChildren(criteria, ledger);
}

function variantCard(variant) {
  const card = element("article", "variant-card");
  const head = element("header", "variant-head");
  const copy = element("div");
  copy.append(element("span", "eyebrow", variant.id), element("h2", "", variant.title));
  head.append(copy, button("Focus", () => { state.focus = variant.id; setView("focus"); }));
  card.append(head, previewLink(variant), badges(variant), paragraph(variant.hypothesis || "No hypothesis recorded."));
  return card;
}

function previewPanel(variant, slot) {
  const panel = element("article", "preview-panel");
  const head = element("header", "preview-head");
  const copy = element("div");
  copy.append(element("span", "eyebrow", slot), element("h2", "", variant.title));
  head.append(copy, link("Open", variant.path));
  panel.append(head, previewLink(variant), badges(variant));
  return panel;
}

function compareFrame(variant) {
  const frame = previewLink(variant);
  frame.classList.add("compare-frame");
  frame.setAttribute("aria-label", `Open ${variant.title}`);
  return frame;
}

function previewLink(variant) {
  const anchor = link("", variant.path, "preview-frame");
  const iframe = document.createElement("iframe");
  iframe.title = `${variant.title} preview`;
  iframe.src = withParams(variant.path, { embed: "1" });
  iframe.loading = "lazy";
  anchor.replaceChildren(iframe);
  return anchor;
}

function selectVariant(slot, key) {
  const labelNode = element("label", "variant-select");
  labelNode.append(element("span", "", slot));
  const select = document.createElement("select");
  select.setAttribute("aria-label", `${slot} variant`);
  variants.forEach((variant) => {
    const option = document.createElement("option");
    option.value = variant.id;
    option.textContent = variant.title;
    select.append(option);
  });
  select.value = state[key];
  select.addEventListener("change", () => {
    state[key] = select.value;
    const other = key === "left" ? "right" : "left";
    if (state[key] === state[other] && variants.length > 1) state[other] = variants.find((variant) => variant.id !== state[key]).id;
    syncUrl();
    renderCompare();
  });
  labelNode.append(select);
  return labelNode;
}

function badges(variant) {
  const row = element("div", "badge-row");
  row.append(chip(variant.model || "unknown model"), ...(variant.skills || ["unknown skill"]).map(chip), chip(`${variant.proof || 0} proof`));
  return row;
}

function labelValue(key, value) {
  const node = element("div", "label-value");
  node.append(element("span", "", key), element("strong", "", value || "unknown"));
  return node;
}

function withParams(url, values) {
  const [base, query = ""] = url.split("?");
  const next = new URLSearchParams(query);
  Object.entries(values).forEach(([key, value]) => next.set(key, value));
  return `${base}?${next.toString()}`;
}

function label(value) { return value === "provenance" ? "Provenance" : value[0].toUpperCase() + value.slice(1); }
function sectionTitle(value) { return element("h2", "section-title", value); }
function paragraph(value) { return element("p", "body-copy", value); }
function empty(value) { return element("section", "empty-state", value); }
function chip(value) { return element("span", "chip", String(value)); }
function button(value, handler, active = false) { const node = element("button", "", value); node.type = "button"; node.dataset.active = String(active); node.addEventListener("click", handler); return node; }
function link(value, href, className = "text-link") { const node = element("a", className, value); node.href = href; return node; }
function element(tag, className = "", text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }

if (state.left === state.right && variants.length > 1) state.right = variants[1].id;
syncUrl();
render();
