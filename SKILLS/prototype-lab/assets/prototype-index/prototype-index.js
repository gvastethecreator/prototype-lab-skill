const data = window.PROTOTYPE_INDEX_DATA || { prototypes: [], comparisonHubs: [], promptLibrary: { prompts: [] }, summary: {} };
const artifacts = Array.isArray(data.prototypes) ? data.prototypes : [];
const hubs = Array.isArray(data.comparisonHubs) ? data.comparisonHubs : [];
const prompts = Array.isArray(data.promptLibrary?.prompts) ? data.promptLibrary.prompts : [];
const commandPrefix = data.commandPrefix || "node <skill-root>/scripts/manage-prototype-lab.mjs";
const params = new URLSearchParams(location.search);
const views = ["library", "comparisons", "prompts", "health"];
let activeView = views.includes(params.get("view")) ? params.get("view") : "library";
let activeHub = hubs.find((hub) => hub.id === params.get("hub")) || hubs[0] || null;

const nav = document.querySelector("#view-nav");
const search = document.querySelector("#search-input");
const searchField = document.querySelector(".search-field");
const groupSelect = document.querySelector("#group-select");
const summaryStrip = document.querySelector("#summary-strip");
const artifactGroups = document.querySelector("#artifact-groups");
const hubList = document.querySelector("#hub-list");
const hubDetail = document.querySelector("#hub-detail");
const promptGrid = document.querySelector("#prompt-grid");
const healthList = document.querySelector("#health-list");
const commandList = document.querySelector("#command-list");

function setView(view) {
  activeView = views.includes(view) ? view : "library";
  const url = new URL(location.href);
  url.searchParams.set("view", activeView);
  if (activeHub) url.searchParams.set("hub", activeHub.id);
  history.replaceState(null, "", url);
  render();
}

function render() {
  nav.querySelectorAll("button").forEach((button) => {
    button.dataset.active = String(button.dataset.view === activeView);
    button.onclick = () => setView(button.dataset.view);
  });
  document.querySelectorAll(".workspace-view").forEach((node) => node.dataset.active = String(node.dataset.view === activeView));
  searchField.hidden = !["library", "prompts"].includes(activeView);
  renderSummary();
  renderLibrary();
  renderHubs();
  renderPrompts();
  renderHealth();
}

function renderSummary() {
  const summary = data.summary || {};
  const items = [
    ["Prototypes", summary.prototypes ?? artifacts.filter((item) => !item.isComparisonHub).length],
    ["Hubs", summary.hubs ?? hubs.length],
    ["Prompts", summary.prompts ?? prompts.length],
    ["Issues", summary.issues ?? artifacts.reduce((count, item) => count + (item.issues?.length || 0), 0)]
  ];
  summaryStrip.replaceChildren(...items.map(([label, value]) => {
    const node = element("article", "summary-item");
    node.append(element("span", "", label), element("strong", "", String(value)));
    return node;
  }));
}

function renderLibrary() {
  const query = search.value.trim().toLowerCase();
  const filtered = artifacts.filter((item) => !query || searchable(item).includes(query));
  const groups = groupArtifacts(filtered, groupSelect.value);
  artifactGroups.replaceChildren(...(groups.length ? groups.map((group) => {
    const section = element("section", "artifact-group");
    const header = element("header", "group-header");
    header.append(element("h3", "", group.label), chip(`${group.items.length}`));
    const grid = element("div", "artifact-grid");
    grid.replaceChildren(...group.items.map(artifactCard));
    section.append(header, grid);
    return section;
  }) : [empty("No artifacts match this view.")]));
}

function artifactCard(item) {
  const card = element("article", "artifact-card");
  const preview = link("", withParams(item.path, { embed: "1" }), "artifact-preview");
  const iframe = document.createElement("iframe");
  iframe.src = withParams(item.path, { embed: "1" });
  iframe.title = `${item.title} preview`;
  iframe.loading = "lazy";
  preview.append(iframe);
  const body = element("div", "artifact-body");
  const head = element("header", "artifact-head");
  const copy = element("div");
  copy.append(element("span", "eyebrow", item.category), element("h3", "", item.title));
  head.append(copy, status(item.status));
  const badges = element("div", "badge-row");
  badges.append(chip(item.modelExact || item.model), ...(item.skills || []).slice(0, 2).map(chip), chip(`${item.proof || 0} proof`));
  const foot = element("footer", "artifact-foot");
  foot.append(element("span", "", item.date), element("span", "mono", item.id));
  body.append(head, paragraph(item.question), badges, foot);
  card.append(preview, body);
  return card;
}

function renderHubs() {
  hubList.replaceChildren(...(hubs.length ? hubs.map((hub) => {
    const button = element("button", "hub-list-item");
    button.type = "button";
    button.dataset.active = String(hub.id === activeHub?.id);
    button.append(element("strong", "", hub.title), element("span", "", `${hub.variantIds.length} variants · ${hub.managed ? "managed" : "legacy"}`));
    button.onclick = () => { activeHub = hub; renderHubs(); };
    return button;
  }) : [empty("No comparison hubs yet.")]));

  if (!activeHub) {
    hubDetail.replaceChildren(empty("Create a hub after two standalone variants exist."), commandCard("Create a hub", labCommand("hub --title <title> --variants <id,id> --dimension <model|skill|prompt|design>")));
    return;
  }
  const scoped = activeHub.variantIds.map((id) => artifacts.find((item) => item.id === id)).filter(Boolean);
  const top = element("header", "hub-detail-head");
  const copy = element("div");
  copy.append(element("span", "eyebrow", activeHub.managed ? "Managed hub" : "Legacy hub"), element("h2", "", activeHub.title), paragraph(activeHub.question));
  top.append(copy, link("Open hub", activeHub.path, "primary-link"));
  const criteria = element("div", "criteria-row");
  (activeHub.criteria || []).forEach((item) => criteria.append(chip(item)));
  const compare = element("section", "compare-builder");
  compare.append(element("h3", "", "Open an exact pair"));
  const controls = element("div", "compare-controls");
  const left = selectFrom(scoped, "A");
  const right = selectFrom(scoped, "B");
  if (scoped[1]) right.value = scoped[1].id;
  const open = link("Compare", activeHub.path, "primary-link");
  const sync = () => {
    if (left.value === right.value && scoped.length > 1) right.value = scoped.find((item) => item.id !== left.value).id;
    open.href = withParams(activeHub.path, { view: "compare", left: shortId(left.value), right: shortId(right.value) });
  };
  left.onchange = sync;
  right.onchange = sync;
  controls.append(left, element("span", "versus", "versus"), right, open);
  compare.append(controls);
  sync();
  const variants = element("div", "hub-variant-list");
  variants.replaceChildren(...scoped.map((item) => {
    const row = element("article", "hub-variant-row");
    row.append(status(item.status), element("strong", "", item.title), element("span", "mono", item.modelExact || item.model), link("Open", item.path));
    return row;
  }));
  hubDetail.replaceChildren(top, criteria, compare, variants);
}

function renderPrompts() {
  const query = search.value.trim().toLowerCase();
  const filtered = prompts.filter((prompt) => !query || [prompt.id, prompt.title, prompt.category, prompt.challenge, prompt.difficulty].join(" ").toLowerCase().includes(query));
  promptGrid.replaceChildren(...(filtered.length ? filtered.map((prompt) => {
    const card = element("article", "prompt-card");
    const head = element("header");
    const copy = element("div");
    copy.append(element("span", "eyebrow", prompt.category), element("h3", "", prompt.title));
    head.append(copy, chip(prompt.difficulty));
    card.append(head, paragraph(prompt.challenge), labelValue("Version", `v${String(prompt.currentVersion).padStart(3, "0")}`), labelValue("ID", prompt.id), link("Open rendered prompt", `./prompts/${prompt.rendered}`, "text-link"));
    return card;
  }) : [empty("No reusable prompts in the active workspace.")]));
}

function renderHealth() {
  const issues = artifacts.flatMap((item) => (item.issues || []).map((issue) => ({ ...issue, id: item.id, title: item.title, path: item.path })));
  healthList.replaceChildren(...(issues.length ? issues.map((issue) => {
    const row = element("article", "health-row");
    row.dataset.severity = issue.severity;
    row.append(element("span", "severity", issue.severity), element("strong", "", issue.title), element("span", "", issue.message), link("Open", issue.path));
    return row;
  }) : [empty("No readiness issues detected.")]));
  const commands = [
    ["Create prototype", labCommand("create --title <title> --question <question>")],
    ["Create comparison", labCommand("hub --title <title> --variants <id,id> --dimension <dimension>")],
    ["Regenerate workspace", labCommand("sync")],
    ["Inspect readiness", labCommand("status")],
    ["Package artifact", labCommand("pack --id <id>")]
  ];
  commandList.replaceChildren(...commands.map(([label, command]) => commandCard(label, command)));
}

function commandCard(label, command) {
  const node = element("article", "command-card");
  node.append(element("span", "", label), element("code", "", command));
  const copy = element("button", "", "Copy");
  copy.type = "button";
  copy.onclick = async () => { await navigator.clipboard?.writeText(command); copy.textContent = "Copied"; setTimeout(() => copy.textContent = "Copy", 900); };
  node.append(copy);
  return node;
}

function groupArtifacts(items, mode) {
  if (mode === "none") return items.length ? [{ label: "All artifacts", items }] : [];
  const groups = new Map();
  items.forEach((item) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : "unknown";
    const key = mode === "year" ? date.slice(0, 4) : mode === "month" ? date.slice(0, 7) : date;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return [...groups.entries()].map(([label, groupItems]) => ({ label, items: groupItems }));
}

function searchable(item) { return [item.title, item.question, item.category, item.status, item.modelExact, item.agent, ...(item.skills || []), ...(item.tags || [])].join(" ").toLowerCase(); }
function labCommand(value) { return `${commandPrefix} ${value}`; }
function selectFrom(items, label) { const node = document.createElement("select"); node.setAttribute("aria-label", `${label} variant`); items.forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = `${label} · ${item.title}`; node.append(option); }); return node; }
function shortId(id) { return id?.split("/").at(-1).replace(/^\d+-/, ""); }
function withParams(url, values) { const [base, query = ""] = url.split("?"); const next = new URLSearchParams(query); Object.entries(values).forEach(([key, value]) => next.set(key, value)); return `${base}?${next.toString()}`; }
function status(value) { const node = element("span", "status", value || "unknown"); node.dataset.status = value || "unknown"; return node; }
function labelValue(key, value) { const node = element("div", "label-value"); node.append(element("span", "", key), element("strong", "", value)); return node; }
function paragraph(value) { return element("p", "body-copy", value || "No description recorded."); }
function chip(value) { return element("span", "chip", String(value || "unknown")); }
function empty(value) { return element("section", "empty-state", value); }
function link(value, href, className = "text-link") { const node = element("a", className, value); node.href = href; return node; }
function element(tag, className = "", text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }

search.addEventListener("input", render);
groupSelect.addEventListener("change", renderLibrary);
render();
