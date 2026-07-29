const data = window.PROTOTYPE_HUB_DATA || { variants: [], criteria: [] };
const variants = Array.isArray(data.variants) ? data.variants : [];
const activeVariants = variants.filter((variant) => !variant.archived);
const allowedViews = ["overview", "compare", "focus", "blind", "rank", "iterations", "review", "archive", "provenance"];
const views = [...new Set(["overview", ...(data.modes || ["compare", "focus"]), "provenance"])].filter((view) => allowedViews.includes(view));
const viewIcons = { overview: "layout-grid", compare: "columns-3", focus: "focus-2", blind: "eye-off", rank: "list-numbers", iterations: "timeline-event", review: "trophy", archive: "archive", provenance: "file-search" };
const params = new URLSearchParams(location.search);
const previewObservers = new Set();
const reviewKey = `prototype-lab-review:${data.id || "hub"}`;
const savedReview = readSavedReview();
const state = {
  view: views.includes(params.get("view")) ? params.get("view") : views.includes(data.defaultView) ? data.defaultView : "overview",
  left: resolveVariant(params.get("left"))?.id || activeVariants[0]?.id,
  right: resolveVariant(params.get("right"))?.id || activeVariants[1]?.id || activeVariants[0]?.id,
  focus: resolveVariant(params.get("variant"))?.id || activeVariants[0]?.id,
  blindRevealed: false,
  ranking: normalizeRanking(savedReview.ranking),
  notes: savedReview.notes || ""
};

const title = document.querySelector("#hub-title");
const question = document.querySelector("#hub-question");
const summary = document.querySelector("#hub-summary");
const nav = document.querySelector("#hub-nav");
const nodes = Object.fromEntries(allowedViews.map((view) => [view, document.querySelector(`#view-${view}`)]));

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
  previewObservers.forEach((observer) => observer.disconnect());
  previewObservers.clear();
  nav.replaceChildren(...views.map((view) => button(label(view), () => setView(view), state.view === view, viewIcons[view])));
  Object.entries(nodes).forEach(([view, node]) => { if (node) node.dataset.active = String(view === state.view); });
  summary.replaceChildren(chip(`${activeVariants.length} active`), ...(variants.length !== activeVariants.length ? [chip(`${variants.length - activeVariants.length} archived`)] : []), chip(data.dimension || "prototype"), chip(data.status || "unknown"), chip(data.date || "date unknown"));
  renderOverview();
  renderCompare();
  renderFocus();
  renderBlind();
  renderRank();
  renderIterations();
  renderReview();
  renderArchive();
  renderProvenance();
}

function renderOverview() {
  const intro = element("section", "brief-panel");
  intro.append(sectionTitle("Decision brief"), paragraph(data.question || "No question recorded."));
  const criteria = element("div", "criteria-list");
  (data.criteria || []).forEach((item, index) => criteria.append(labelValue(String(index + 1).padStart(2, "0"), item)));
  intro.append(criteria);
  const grid = element("section", "variant-grid");
  grid.replaceChildren(...(activeVariants.length ? activeVariants.map((variant) => variantCard(variant)) : [empty("No active variants.")]));
  nodes.overview.replaceChildren(intro, grid);
}

function renderCompare() {
  const controls = element("section", "compare-controls");
  controls.append(selectVariant("A", "left"), element("span", "versus", "versus"), selectVariant("B", "right"));
  const left = resolveActive(state.left) || activeVariants[0];
  let right = resolveActive(state.right) || activeVariants[1] || left;
  if (left?.id === right?.id && activeVariants.length > 1) right = activeVariants.find((variant) => variant.id !== left.id);
  const grid = element("section", "compare-grid");
  if (left) grid.append(compareFrame(left));
  if (right) grid.append(compareFrame(right));
  nodes.compare.replaceChildren(controls, grid);
}

function renderFocus() {
  const active = resolveActive(state.focus) || activeVariants[0];
  const rail = element("aside", "focus-rail");
  activeVariants.forEach((variant) => rail.append(button(variant.title, () => { state.focus = variant.id; syncUrl(); renderFocus(); }, variant.id === active?.id, "focus-2")));
  const preview = active ? previewPanel(active, "Focus") : empty("No variants available.");
  const detail = element("aside", "focus-detail");
  if (active) detail.append(sectionTitle(active.title), badges(active), labelValue("Hypothesis", active.hypothesis), labelValue("Tradeoff", active.tradeoff), labelValue("Source", active.prototypeId));
  nodes.focus.replaceChildren(rail, preview, detail);
}

function renderBlind() {
  const controls = element("section", "review-toolbar");
  controls.append(paragraph("Source labels stay hidden until reveal. The visual result itself remains unchanged."), button(state.blindRevealed ? "Hide labels" : "Reveal sources", () => { state.blindRevealed = !state.blindRevealed; renderBlind(); }, false, state.blindRevealed ? "eye-off" : "eye"));
  const grid = element("section", "blind-grid");
  activeVariants.forEach((variant, index) => {
    const panel = element("article", "preview-panel blind-panel");
    const head = element("header", "preview-head");
    head.append(element("div", "", undefined), element("h2", "", state.blindRevealed ? variant.title : `Variant ${String.fromCharCode(65 + index)}`));
    panel.append(head, previewLink(variant));
    if (state.blindRevealed) panel.append(badges(variant));
    grid.append(panel);
  });
  nodes.blind.replaceChildren(controls, grid);
}

function renderRank() {
  const intro = element("section", "review-toolbar");
  intro.append(paragraph("Order the variants, record subjective notes, then export the decision as JSON."), button("Export review", exportUserReview, false, "download"));
  const list = element("section", "ranking-list");
  state.ranking.forEach((id, index) => {
    const variant = resolveVariant(id);
    if (!variant) return;
    const row = element("article", "ranking-row");
    row.append(element("strong", "rank-number", String(index + 1)), element("div", "rank-copy", undefined), iconButton("arrow-up", `Move ${variant.title} up`, () => moveRank(index, -1)), iconButton("arrow-down", `Move ${variant.title} down`, () => moveRank(index, 1)));
    row.querySelector(".rank-copy").append(element("strong", "", variant.title), element("span", "mono", variant.condition || "baseline"));
    list.append(row);
  });
  const notes = document.createElement("textarea");
  notes.className = "review-notes";
  notes.value = state.notes;
  notes.placeholder = "Taste notes, decision rationale, unresolved questions…";
  notes.setAttribute("aria-label", "Review notes");
  notes.addEventListener("input", () => { state.notes = notes.value; saveUserReview(); });
  nodes.rank.replaceChildren(intro, list, notes);
}

function renderIterations() {
  const groups = new Map();
  for (const variant of activeVariants) {
    const key = variant.parentId || variant.prototypeId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(variant);
  }
  const content = element("section", "iteration-groups");
  for (const [key, items] of groups) {
    const group = element("article", "iteration-group");
    group.append(element("span", "eyebrow", key), sectionTitle(items.length > 1 ? `${items.length} linked iterations` : "Standalone run"));
    items.sort((a, b) => Number(a.iteration || 1) - Number(b.iteration || 1)).forEach((variant) => group.append(variantCard(variant)));
    content.append(group);
  }
  nodes.iterations.replaceChildren(content);
}

function renderReview() {
  const review = data.coordinatorReview;
  if (!review) {
    nodes.review.replaceChildren(empty("No orchestrator review attached. Run lab review --id <hub-id> --init."));
    return;
  }
  const hero = element("section", "review-hero");
  hero.append(element("span", "eyebrow", `Orchestrator review · ${review.confidence || "unknown"} confidence`), sectionTitle("Recommendation"), paragraph(review.recommendation), link("Open Markdown report", "./reviews/coordinator-review.md", "text-link", "external-link"));
  const summaryPanel = element("section", "review-panel");
  summaryPanel.append(sectionTitle("Assessment"), paragraph(review.summary));
  const criteria = element("section", "review-grid");
  (review.criteria || []).forEach((item) => {
    const card = element("article", "review-card");
    card.append(element("span", "eyebrow", item.verdict || "unclear"), element("h3", "", item.criterion), paragraph(item.assessment), labelValue("Evidence", (item.evidence || []).join(", ") || "not recorded"));
    criteria.append(card);
  });
  const variantsPanel = element("section", "review-grid");
  (review.variants || []).forEach((item) => {
    const card = element("article", "review-card");
    card.append(element("span", "eyebrow", item.verdict || "unclear"), element("h3", "", item.variantId), labelValue("Strengths", (item.strengths || []).join("; ") || "not recorded"), labelValue("Weaknesses", (item.weaknesses || []).join("; ") || "not recorded"), labelValue("Evidence", (item.evidence || []).join(", ") || "not recorded"));
    variantsPanel.append(card);
  });
  const caveats = element("section", "review-panel");
  caveats.append(sectionTitle("Caveats and next steps"), list("Caveats", review.caveats), list("Next steps", review.nextSteps));
  nodes.review.replaceChildren(hero, summaryPanel, criteria, variantsPanel, caveats);
}

function renderArchive() {
  const archived = variants.filter((variant) => variant.archived);
  const grid = element("section", "variant-grid");
  grid.replaceChildren(...(archived.length ? archived.map((variant) => variantCard(variant)) : [empty("No archived variants.")]));
  nodes.archive.replaceChildren(grid);
}

function renderProvenance() {
  const criteria = element("section", "provenance-panel");
  criteria.append(sectionTitle("Comparison contract"), labelValue("Dimension", data.dimension || "unknown"), labelValue("Question", data.question || "unknown"));
  (data.criteria || []).forEach((item) => criteria.append(labelValue("Criterion", item)));
  const ledger = element("section", "ledger");
  ledger.append(sectionTitle("Variant ledger"));
  variants.forEach((variant) => {
    const row = element("article", "ledger-row");
    row.append(element("strong", "", variant.title), chip(variant.archived ? "archived" : variant.status || "unknown"), element("span", "mono", `${variant.model || "unknown model"} · ${variant.reasoning || "unknown reasoning"}`), element("span", "", variant.condition || (variant.skills || []).join(", ") || "baseline"), element("span", "mono", `${variant.proof || 0} proof`), link("Open", variant.path, "text-link", "external-link"));
    ledger.append(row, receiptCard(variant));
  });
  nodes.provenance.replaceChildren(criteria, ledger);
}

function receiptCard(variant) {
  const run = variant.run || {};
  const card = element("article", "receipt-card");
  const header = element("header", "receipt-head");
  const identity = element("div", "receipt-card-title");
  identity.append(icon("receipt-2", 16), element("strong", "", variant.id));
  header.append(identity, chip(run.agentMode || "not captured"));
  const grid = element("div", "receipt-grid");
  grid.append(receiptValue("robot", "Agent", run.agentTool || "not captured"), receiptValue("device-desktop", "Worker", run.workerId || "not captured"), receiptValue("timeline-event", "Adapter", run.isolationAdapter || "not captured"), receiptValue("hash", "Assignment", shortHash(run.assignmentSha256)), receiptValue("hash", "Input", shortHash(run.inputManifestSha256)), receiptValue("file-description", "Receipt", run.receipt || "not captured"));
  const footer = element("footer", "receipt-foot");
  footer.append(chip(run.receivedOtherVariants === false ? "no other variants" : "variant exposure unknown"), chip(run.contextIsolation || "isolation unknown"), chip(run.fallbackReason && run.fallbackReason !== "not applicable" ? "fallback" : "no fallback"));
  card.append(header, grid, footer);
  return card;
}

function receiptValue(iconName, key, value) {
  const node = labelValue(key, value);
  node.prepend(icon(iconName, 13));
  return node;
}

function variantCard(variant) {
  const card = element("article", "variant-card");
  const head = element("header", "variant-head");
  const copy = element("div");
  copy.append(element("span", "eyebrow", variant.id), element("h2", "", variant.title));
  head.append(copy, button("Focus", () => { state.focus = variant.id; setView("focus"); }, false, "focus-2"));
  card.append(head, previewLink(variant), badges(variant), paragraph(variant.hypothesis || "No hypothesis recorded."));
  return card;
}

function previewPanel(variant, slot) {
  const panel = element("article", "preview-panel");
  const head = element("header", "preview-head");
  const copy = element("div");
  copy.append(element("span", "eyebrow", slot), element("h2", "", variant.title));
  head.append(copy, link("Open", variant.path, "text-link", "external-link"));
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
  fitCanonicalPreview(anchor, iframe, variant.previewViewport || data.previewViewport);
  return anchor;
}

function fitCanonicalPreview(frame, iframe, requested) {
  const width = Number(requested?.width) || 1200;
  const height = Number(requested?.height) || 820;
  iframe.style.width = `${width}px`;
  iframe.style.height = `${height}px`;
  iframe.style.transformOrigin = "top left";
  const fit = () => {
    const scale = Math.min(frame.clientWidth / width, frame.clientHeight / height);
    const renderedWidth = width * scale;
    iframe.style.left = `${Math.max(0, (frame.clientWidth - renderedWidth) / 2)}px`;
    iframe.style.top = "0px";
    iframe.style.transform = `scale(${scale})`;
  };
  const observer = new ResizeObserver(fit);
  observer.observe(frame);
  previewObservers.add(observer);
  requestAnimationFrame(fit);
}

function selectVariant(slot, key) {
  const labelNode = element("label", "variant-select");
  labelNode.append(element("span", "", slot));
  const select = document.createElement("select");
  select.setAttribute("aria-label", `${slot} variant`);
  activeVariants.forEach((variant) => {
    const option = document.createElement("option");
    option.value = variant.id;
    option.textContent = variant.title;
    select.append(option);
  });
  select.value = state[key];
  select.addEventListener("change", () => {
    state[key] = select.value;
    const other = key === "left" ? "right" : "left";
    if (state[key] === state[other] && activeVariants.length > 1) state[other] = activeVariants.find((variant) => variant.id !== state[key]).id;
    syncUrl();
    renderCompare();
  });
  labelNode.append(select);
  return labelNode;
}

function moveRank(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= state.ranking.length) return;
  [state.ranking[index], state.ranking[target]] = [state.ranking[target], state.ranking[index]];
  saveUserReview();
  renderRank();
}

function normalizeRanking(value) {
  const activeIds = activeVariants.map((variant) => variant.id);
  const saved = Array.isArray(value) ? value.filter((id) => activeIds.includes(id)) : [];
  return [...saved, ...activeIds.filter((id) => !saved.includes(id))];
}

function readSavedReview() {
  try { return JSON.parse(localStorage.getItem(reviewKey) || "{}"); } catch { return {}; }
}

function saveUserReview() {
  localStorage.setItem(reviewKey, JSON.stringify({ ranking: state.ranking, notes: state.notes, updatedAt: new Date().toISOString() }));
}

function exportUserReview() {
  saveUserReview();
  const payload = { schemaVersion: 1, hubId: data.id, exportedAt: new Date().toISOString(), ranking: state.ranking, notes: state.notes, subjective: true };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${data.id?.split("/").at(-1) || "prototype-review"}.review.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function resolveActive(value) { return activeVariants.find((variant) => variant.id === value || variant.prototypeId === value) || null; }
function badges(variant) { const row = element("div", "badge-row"); row.append(chip(variant.model || "unknown model"), ...(variant.skills || ["unknown skill"]).map(chip), chip(`${variant.proof || 0} proof`)); return row; }
function labelValue(key, value) { const node = element("div", "label-value"); node.append(element("span", "", key), element("strong", "", value || "unknown")); return node; }
function list(title, values) { const node = element("div", "review-list"); node.append(element("strong", "", title)); const items = element("ul"); (values || []).forEach((value) => items.append(element("li", "", value))); if (!items.children.length) items.append(element("li", "", "None recorded.")); node.append(items); return node; }
function withParams(url, values) { const [base, query = ""] = url.split("?"); const next = new URLSearchParams(query); Object.entries(values).forEach(([key, value]) => next.set(key, value)); return `${base}?${next.toString()}`; }
function label(value) { return ({ provenance: "Provenance", rank: "Rank", review: "Orchestrator review" })[value] || value[0].toUpperCase() + value.slice(1); }
function shortHash(value) { return /^[a-f0-9]{64}$/i.test(value || "") ? `${value.slice(0, 10)}…` : value || "not captured"; }
function sectionTitle(value) { return element("h2", "section-title", value); }
function paragraph(value) { return element("p", "body-copy", value); }
function empty(value) { return element("section", "empty-state", value); }
function chip(value) { return element("span", "chip", String(value)); }
function button(value, handler, active = false, iconName = null) { const node = element("button"); node.type = "button"; node.dataset.active = String(active); if (iconName) node.append(icon(iconName, 14)); node.append(document.createTextNode(value)); node.addEventListener("click", handler); return node; }
function iconButton(iconName, labelText, handler) { const node = element("button", "icon-button"); node.type = "button"; node.setAttribute("aria-label", labelText); node.title = labelText; node.append(icon(iconName, 15)); node.addEventListener("click", handler); return node; }
function link(value, href, className = "text-link", iconName = null) { const node = element("a", className); node.href = href; if (iconName) node.append(icon(iconName, 13)); node.append(document.createTextNode(value)); return node; }
function element(tag, className = "", text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }

function hydrateIcons(root) { root.querySelectorAll("[data-icon]").forEach((node) => { node.replaceChildren(icon(node.dataset.icon, 14)); }); }
function icon(name, size = 16) { const registry = window.PROTOTYPE_TABLER_ICONS || {}; const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); Object.entries({ class: "tabler-icon", width: String(size), height: String(size), viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" }).forEach(([key, value]) => svg.setAttribute(key, value)); svg.innerHTML = registry[name] || registry["info-circle"] || ""; return svg; }

if (state.left === state.right && activeVariants.length > 1) state.right = activeVariants[1].id;
hydrateIcons(document);
syncUrl();
render();
