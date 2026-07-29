const data = window.PROTOTYPE_INDEX_DATA || { prototypes: [], comparisonHubs: [], promptLibrary: { prompts: [] }, summary: {} };
const artifacts = Array.isArray(data.prototypes) ? data.prototypes : [];
const hubs = Array.isArray(data.comparisonHubs) ? data.comparisonHubs : [];
const prompts = Array.isArray(data.promptLibrary?.prompts) ? data.promptLibrary.prompts : [];
const receipts = Array.isArray(data.receipts) ? data.receipts : [];
const issues = artifacts.flatMap((item) => (item.issues || []).map((issue) => ({ ...issue, id: item.id, title: item.title, path: item.path })));
const commandPrefix = data.commandPrefix || "node <skill-root>/scripts/manage-prototype-lab.mjs";
const params = new URLSearchParams(location.search);
const views = ["library", "comparisons", "prompts", "receipts", "health"];
const viewMeta = {
  library: { kicker: "Workspace / Library", title: "Prototype library", description: "Browse every runnable artifact and its evidence.", search: "Search artifacts, models, skills, or tags" },
  comparisons: { kicker: "Workspace / Comparisons", title: "Decision workbench", description: "Build exact pairs and inspect comparable evidence." },
  prompts: { kicker: "Workspace / Prompts", title: "Prompt library", description: "Reuse versioned inputs without losing execution context.", search: "Search prompts, categories, or difficulty" },
  receipts: { kicker: "Workspace / Receipts", title: "Execution receipts", description: "Read the factual trail behind every recorded task.", search: "Search receipts, tasks, models, workers, or status" },
  health: { kicker: "Workspace / Health", title: "Readiness and recovery", description: "Triage unresolved signals and copy the next command." }
};

let activeView = views.includes(params.get("view")) ? params.get("view") : "library";
let activeHub = hubs.find((hub) => hub.id === params.get("hub")) || hubs[0] || null;
let activeReceipt = receipts.find((receipt) => receipt.id === params.get("receipt") || receipt.runId === params.get("receipt")) || receipts.find((receipt) => receipt.verificationCount > 0) || receipts[0] || null;
let toastTimer;

const nav = document.querySelector("#view-nav");
const search = document.querySelector("#search-input");
const searchField = document.querySelector("#search-field");
const groupSelect = document.querySelector("#group-select");
const pageKicker = document.querySelector("#page-kicker");
const pageTitle = document.querySelector("#page-title");
const pageDescription = document.querySelector("#page-description");
const quickCommand = document.querySelector("#quick-command");
const sidebarSignal = document.querySelector("#sidebar-signal");
const libraryInsights = document.querySelector("#library-insights");
const artifactGroups = document.querySelector("#artifact-groups");
const libraryResultCount = document.querySelector("#library-result-count");
const comparisonInsights = document.querySelector("#comparison-insights");
const hubList = document.querySelector("#hub-list");
const hubDetail = document.querySelector("#hub-detail");
const promptInsights = document.querySelector("#prompt-insights");
const promptGrid = document.querySelector("#prompt-grid");
const promptResultCount = document.querySelector("#prompt-result-count");
const receiptInsights = document.querySelector("#receipt-insights");
const receiptList = document.querySelector("#receipt-list");
const receiptDetail = document.querySelector("#receipt-detail");
const receiptResultCount = document.querySelector("#receipt-result-count");
const healthInsights = document.querySelector("#health-insights");
const healthList = document.querySelector("#health-list");
const commandList = document.querySelector("#command-list");
const toast = document.querySelector("#toast");

const tablerIconFiles = {
  library: "layout-grid",
  compare: "arrows-exchange",
  spark: "sparkles",
  pulse: "activity-heartbeat",
  local: "database",
  search: "search",
  plus: "plus",
  layers: "stack-2",
  beaker: "flask",
  code: "code",
  terminal: "terminal-2",
  box: "box",
  calendar: "calendar",
  model: "cpu",
  proof: "shield-check",
  arrow: "arrow-right",
  external: "external-link",
  warning: "alert-triangle",
  error: "circle-x",
  info: "info-circle",
  check: "circle-check",
  copy: "copy",
  activity: "chart-bar",
  route: "route",
  chart: "chart-bar",
  folder: "folder",
  prompt: "file-description",
  eye: "eye",
  gauge: "gauge",
  receipt: "receipt-2",
  worker: "robot",
  reasoning: "brain",
  tool: "tool",
  hash: "hash",
  timeline: "timeline-event",
  device: "device-desktop",
  download: "download"
};

hydrateIcons(document);
renderAll();

function renderAll() {
  renderSidebar();
  renderLibraryInsights();
  renderLibrary();
  renderComparisonInsights();
  renderHubs();
  renderPromptInsights();
  renderPrompts();
  renderReceiptInsights();
  renderReceipts();
  renderHealthInsights();
  renderHealth();
  updateShell();
}

function setView(view, { focus = false } = {}) {
  activeView = views.includes(view) ? view : "library";
  const url = new URL(location.href);
  url.searchParams.set("view", activeView);
  if (activeHub) url.searchParams.set("hub", activeHub.id);
  history.replaceState(null, "", url);
  updateShell();
  if (focus) document.querySelector(`[data-view="${activeView}"].workspace-view`)?.focus();
}

function updateShell() {
  const meta = viewMeta[activeView];
  pageKicker.textContent = meta.kicker;
  pageTitle.textContent = meta.title;
  pageDescription.textContent = meta.description;
  document.title = `${meta.title} · Prototype Lab`;
  searchField.hidden = !meta.search;
  if (meta.search) search.placeholder = meta.search;
  const isMobile = matchMedia("(max-width: 700px)").matches;
  nav.setAttribute("aria-orientation", isMobile ? "horizontal" : "vertical");
  nav.querySelectorAll("button").forEach((button) => {
    const selected = button.dataset.view === activeView;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    button.title = button.querySelector(".nav-label")?.textContent || "";
    button.onclick = () => setView(button.dataset.view);
  });
  document.querySelectorAll(".workspace-view").forEach((node) => {
    const selected = node.dataset.view === activeView;
    node.dataset.active = String(selected);
    node.hidden = !selected;
  });
}

function renderSidebar() {
  const evidence = percent(artifacts.filter((item) => Number(item.proof) > 0).length, artifacts.length);
  const status = issues.some((issue) => issue.severity === "error") ? "Blocked" : issues.length ? "Needs review" : "Ready";
  sidebarSignal.replaceChildren();
  const head = element("div", "sidebar-signal-head");
  head.append(element("span", "", "Workspace signal"), element("strong", "", `${evidence}%`));
  const track = element("div", "signal-track");
  const fill = document.createElement("i");
  fill.style.setProperty("--value", `${evidence}%`);
  track.append(fill);
  sidebarSignal.append(head, track, paragraph(`${status} · ${issues.length} open ${issues.length === 1 ? "issue" : "issues"}`));
}

function renderLibraryInsights() {
  const evidence = percent(artifacts.filter((item) => Number(item.proof) > 0).length, artifacts.length);
  const activity = countBy(artifacts, (item) => item.date || "unknown").slice(-8);
  const statuses = countBy(artifacts, (item) => normalizeStatus(item.status));
  libraryInsights.replaceChildren(
    metricCard({ label: "Artifacts", value: artifacts.length, note: `${data.summary?.prototypes ?? artifacts.filter((item) => !item.isComparisonHub).length} standalone · ${hubs.length} hubs`, tone: "accent", iconName: "box" }),
    ringCard({ label: "Evidence coverage", value: evidence, note: `${artifacts.filter((item) => Number(item.proof) > 0).length} owners include proof`, tone: "blue" }),
    barChartCard({ title: "Recent activity", value: activity.reduce((sum, item) => sum + item.value, 0), series: activity, note: "Artifacts by recorded date", tone: "accent" }),
    distributionCard({ title: "Status mix", value: statuses.length, items: statuses.slice(0, 4), tone: "green" })
  );
}

function renderLibrary() {
  const query = search.value.trim().toLowerCase();
  const filtered = artifacts.filter((item) => !query || searchableArtifact(item).includes(query));
  const groups = groupArtifacts(filtered, groupSelect.value);
  libraryResultCount.textContent = query ? `${filtered.length} of ${artifacts.length} artifacts match “${search.value.trim()}”.` : `${artifacts.length} artifacts across ${groups.length} ${groups.length === 1 ? "group" : "groups"}.`;
  const groupNodes = groups.length ? groups.map((group) => {
    const section = element("section", "artifact-group");
    const header = element("header", "group-header");
    const summary = element("div", "group-summary");
    const hubsInGroup = group.items.filter((item) => item.isComparisonHub).length;
    summary.append(element("span", "", `${group.items.length} artifacts`), ...(hubsInGroup ? [element("span", "", `${hubsInGroup} hubs`)] : []));
    header.append(element("h3", "", formatGroupLabel(group.label, groupSelect.value)), summary);
    const grid = element("div", "artifact-grid");
    grid.replaceChildren(...group.items.map(artifactCard));
    section.append(header, grid);
    return section;
  }) : [emptyState(
    query ? "No matching artifacts" : "No artifacts yet",
    query ? "Try a broader title, model, skill, or tag." : "Run the Quick route to create the first managed owner.",
    query ? "search" : "box"
  )];
  artifactGroups.replaceChildren(...groupNodes);
}

function artifactCard(item) {
  const card = element("article", "artifact-card");
  const preview = link("", item.path, "artifact-preview");
  preview.setAttribute("aria-label", `Open ${item.title}`);
  const iframe = document.createElement("iframe");
  iframe.src = withParams(item.path, { embed: "1" });
  iframe.title = `${item.title} preview`;
  iframe.loading = "lazy";
  preview.append(iframe);

  const body = element("div", "artifact-body");
  const head = element("header", "artifact-head");
  const type = element("span", "artifact-type");
  type.append(icon(item.isComparisonHub ? "compare" : "box", 13), document.createTextNode(item.isComparisonHub ? "Comparison hub" : "Prototype"));
  head.append(type, statusBadge(item.status));

  const title = element("h3");
  title.append(link(item.title, item.path));
  title.className = "artifact-title";

  const meta = element("div", "artifact-meta");
  meta.append(
    metaCell("model", "Model", item.modelExact || item.model || "Unknown"),
    metaCell("spark", "Skill", (item.skills || []).filter(Boolean)[0] || "Baseline"),
    metaCell("proof", "Evidence", `${Number(item.proof) || 0} files`)
  );
  const foot = element("footer", "artifact-foot");
  const id = element("span", "mono", item.id);
  id.title = item.id;
  const actions = element("div", "artifact-actions");
  actions.append(proofSignal(Number(item.proof) || 0), link("Open", item.path, "text-action"));
  foot.append(id, actions);
  body.append(head, title, paragraph(item.question), meta, foot);
  card.append(preview, body);
  return card;
}

function renderComparisonInsights() {
  const variantTotal = hubs.reduce((sum, hub) => sum + (hub.variantIds?.length || 0), 0);
  const managed = hubs.filter((hub) => hub.managed).length;
  const dimensions = countBy(hubs, (hub) => hub.dimension || "comparison");
  const hubEvidence = percent(hubs.filter((hub) => hub.variantIds?.some((id) => Number(artifacts.find((item) => item.id === id)?.proof) > 0)).length, hubs.length);
  comparisonInsights.replaceChildren(
    metricCard({ label: "Comparison hubs", value: hubs.length, note: `${managed} managed · ${hubs.length - managed} legacy`, tone: "blue", iconName: "compare" }),
    metricCard({ label: "Variant links", value: variantTotal, note: hubs.length ? `${(variantTotal / hubs.length).toFixed(1)} average per hub` : "No comparison topology yet", tone: "accent", iconName: "route" }),
    ringCard({ label: "Hub evidence", value: hubEvidence, note: "Hubs with at least one proven variant", tone: "green" }),
    distributionCard({ title: "Dimensions", value: dimensions.length, items: dimensions.slice(0, 4), tone: "blue" })
  );
}

function renderHubs() {
  const hubNodes = hubs.length ? hubs.map((hub) => {
    const button = element("button", "hub-list-item");
    button.type = "button";
    button.dataset.active = String(hub.id === activeHub?.id);
    const copy = element("span", "hub-list-copy");
    copy.append(element("strong", "", hub.title), element("span", "", `${hub.managed ? "Managed" : "Legacy"} · ${hub.dimension || "comparison"}`));
    button.append(entityIcon("beaker"), copy, element("strong", "", String(hub.variantIds?.length || 0)));
    button.onclick = () => {
      activeHub = hub;
      const url = new URL(location.href);
      url.searchParams.set("view", "comparisons");
      url.searchParams.set("hub", hub.id);
      history.replaceState(null, "", url);
      renderHubs();
    };
    return button;
  }) : [emptyState("No comparison hubs", "Create two standalone owners, then use the Compare route.", "compare")];
  hubList.replaceChildren(...hubNodes);

  if (!activeHub) {
    hubDetail.replaceChildren(emptyState("Nothing selected", "Create or select a hub to build an exact decision pair.", "beaker"));
    return;
  }
  const scoped = activeHub.variantIds.map((id) => artifacts.find((item) => item.id === id)).filter(Boolean);
  const layout = element("div", "hub-detail-layout");

  const decision = element("header", "hub-decision");
  const copy = element("div");
  copy.append(element("span", "eyebrow", activeHub.managed ? "Managed decision space" : "Legacy decision space"), element("h2", "", activeHub.title), paragraph(activeHub.question));
  const criteria = element("div", "criteria-row");
  (activeHub.criteria || []).forEach((item) => criteria.append(element("span", "criterion", item)));
  copy.append(criteria);
  const openHub = link("Open hub", activeHub.path, "primary-action");
  openHub.append(icon("external", 14));
  decision.append(copy, openHub);

  const signals = element("section", "hub-signal-grid");
  const proven = scoped.filter((item) => Number(item.proof) > 0).length;
  signals.append(
    hubSignal("Variants", scoped.length),
    hubSignal("Dimension", activeHub.dimension || "comparison"),
    hubSignal("Evidence", `${proven}/${scoped.length || 0} owners`),
    hubSignal("Runtime", activeHub.managed ? "Managed" : "Legacy")
  );

  const compare = element("section", "compare-builder");
  const builderHead = element("div", "compare-builder-head");
  const builderCopy = element("div");
  const builderTitle = element("h3");
  builderTitle.append(icon("compare", 15), document.createTextNode("Build an exact pair"));
  builderCopy.append(builderTitle, paragraph("Choose two independently runnable variants. The URL remains shareable."));
  builderHead.append(builderCopy, element("span", "criterion", "URL-backed"));
  const controls = element("div", "compare-controls");
  const left = selectFrom(scoped, "A");
  const right = selectFrom(scoped, "B");
  if (scoped[1]) right.value = scoped[1].id;
  const open = link("Compare", activeHub.path, "primary-action");
  open.append(icon("arrow", 14));
  const sync = () => {
    if (left.value === right.value && scoped.length > 1) right.value = scoped.find((item) => item.id !== left.value).id;
    open.href = withParams(activeHub.path, { view: "compare", left: shortId(left.value), right: shortId(right.value) });
  };
  left.onchange = sync;
  right.onchange = sync;
  controls.append(left, element("span", "versus", "versus"), right, open);
  compare.append(builderHead, controls);
  sync();

  layout.append(decision, signals, compare, variantTable(scoped));
  hubDetail.replaceChildren(layout);
}

function variantTable(items) {
  if (!items.length) return emptyState("No linked variants", "Repair the hub membership and run Sync.", "route");
  const wrap = element("div", "variant-table-wrap");
  const table = element("table", "variant-table");
  const colgroup = document.createElement("colgroup");
  ["108px", "auto", "180px", "130px", "64px"].forEach((width) => { const col = document.createElement("col"); col.style.width = width; colgroup.append(col); });
  const thead = document.createElement("thead");
  const head = document.createElement("tr");
  ["Status", "Variant", "Model", "Evidence", ""].forEach((value) => head.append(element("th", "", value)));
  thead.append(head);
  const tbody = document.createElement("tbody");
  items.forEach((item) => {
    const row = document.createElement("tr");
    const title = element("div", "variant-title");
    title.append(element("strong", "", item.title), element("span", "mono", item.id));
    const proof = element("div", "proof-bar");
    const track = document.createElement("i");
    track.style.setProperty("--value", `${Math.min(100, (Number(item.proof) || 0) * 12.5)}%`);
    proof.append(track, element("span", "", String(Number(item.proof) || 0)));
    const open = link("Open", item.path, "text-action");
    row.append(cell(statusBadge(item.status)), cell(title), cell(element("span", "mono", item.modelExact || item.model || "Unknown")), cell(proof), cell(open));
    tbody.append(row);
  });
  table.append(colgroup, thead, tbody);
  wrap.append(table);
  return wrap;
}

function renderPromptInsights() {
  const categories = countBy(prompts, (prompt) => prompt.category || "uncategorized");
  const difficulties = countBy(prompts, (prompt) => prompt.difficulty || "unknown");
  const versions = prompts.reduce((sum, prompt) => sum + Number(prompt.currentVersion || 0), 0);
  promptInsights.replaceChildren(
    metricCard({ label: "Reusable prompts", value: prompts.length, note: `${categories.length} categories represented`, tone: "violet", iconName: "prompt" }),
    metricCard({ label: "Version depth", value: versions, note: prompts.length ? `${(versions / prompts.length).toFixed(1)} versions per prompt` : "No versions saved", tone: "blue", iconName: "layers" }),
    distributionCard({ title: "Category mix", value: categories.length, items: categories.slice(0, 4), tone: "violet" }),
    distributionCard({ title: "Difficulty", value: difficulties.length, items: difficulties.slice(0, 4), tone: "accent" })
  );
}

function renderPrompts() {
  const query = search.value.trim().toLowerCase();
  const filtered = prompts.filter((prompt) => !query || [prompt.id, prompt.title, prompt.category, prompt.challenge, prompt.difficulty].join(" ").toLowerCase().includes(query));
  promptResultCount.textContent = query ? `${filtered.length} of ${prompts.length} prompts match “${search.value.trim()}”.` : `${prompts.length} immutable prompt records available.`;
  const promptNodes = filtered.length ? filtered.map((prompt) => {
    const card = element("article", "prompt-card");
    const head = document.createElement("header");
    const copy = element("div");
    copy.append(element("span", "eyebrow", prompt.category || "uncategorized"), element("h3", "", prompt.title));
    head.append(entityIcon("prompt", "prompt-icon"), copy, element("span", "difficulty", prompt.difficulty || "unknown"));
    const meta = element("div", "prompt-meta");
    const id = element("div");
    id.append(element("span", "", "Stable ID"), element("strong", "mono", prompt.id));
    const version = element("div");
    version.append(element("span", "", "Version"), element("strong", "", `v${String(prompt.currentVersion || 0).padStart(3, "0")}`));
    meta.append(id, version);
    const actions = element("footer", "prompt-actions");
    actions.append(link("Open rendered", `./prompts/${prompt.rendered}`, "text-action"));
    const create = element("button", "copy-prompt");
    create.type = "button";
    create.append(icon("copy", 13), document.createTextNode("Create from prompt"));
    create.onclick = () => copyText(labCommand(`quick --title <title> --question <question> --from-prompt ${prompt.id}`), `Command copied for ${prompt.title}`);
    actions.append(create);
    card.append(head, paragraph(prompt.challenge), meta, actions);
    return card;
  }) : [emptyState(
    query ? "No matching prompts" : "No reusable prompts",
    query ? "Try a broader title, ID, category, or difficulty." : "Seed the prompt library or save a reusable input.",
    "prompt"
  )];
  promptGrid.replaceChildren(...promptNodes);
}

function renderReceiptInsights() {
  const isolated = receipts.filter((receipt) => receipt.contextIsolation === "dispatch-recorded" && receipt.receivedOtherVariants === false).length;
  const verified = receipts.filter((receipt) => receipt.verificationCount > 0 && receipt.verificationPassed === receipt.verificationCount).length;
  const models = countBy(receipts, (receipt) => receipt.effectiveModel !== "not captured" ? receipt.effectiveModel : receipt.requestedModel);
  receiptInsights.replaceChildren(
    metricCard({ label: "Recorded tasks", value: receipts.length, note: `${artifacts.filter((item) => item.receiptCount > 0).length} artifact owners`, tone: "accent", iconName: "receipt" }),
    ringCard({ label: "Clean dispatch", value: percent(isolated, receipts.length), note: `${isolated} receipts record isolated context`, tone: "accent" }),
    ringCard({ label: "Verified runs", value: percent(verified, receipts.length), note: `${verified} receipts passed every recorded check`, tone: "green" }),
    distributionCard({ title: "Model routes", value: models.length, items: models.slice(0, 4), tone: "blue" })
  );
}

function renderReceipts() {
  const query = search.value.trim().toLowerCase();
  const filtered = receipts.filter((receipt) => !query || searchableReceipt(receipt).includes(query));
  receiptResultCount.textContent = query ? `${filtered.length} of ${receipts.length} receipts match “${search.value.trim()}”.` : `${receipts.length} factual execution records available.`;
  if (!filtered.includes(activeReceipt)) activeReceipt = filtered[0] || null;
  const items = filtered.map((receipt) => {
    const button = element("button", "receipt-list-item");
    button.type = "button";
    button.dataset.active = String(receipt === activeReceipt);
    const mark = entityIcon("receipt", "receipt-list-icon");
    const copy = element("span", "receipt-list-copy");
    copy.append(element("strong", "", receipt.ownerTitle), element("span", "mono", `${receipt.runId} · ${receipt.requestedModel}`));
    const status = statusBadge(receipt.status);
    button.append(mark, copy, status);
    button.onclick = () => {
      activeReceipt = receipt;
      const url = new URL(location.href);
      url.searchParams.set("view", "receipts");
      url.searchParams.set("receipt", receipt.id);
      history.replaceState(null, "", url);
      renderReceipts();
    };
    return button;
  });
  receiptList.replaceChildren(...(items.length ? items : [emptyState("No matching receipts", "Try a task title, run ID, model, worker, or status.", "receipt")]));
  receiptDetail.replaceChildren(activeReceipt ? taskReceipt(activeReceipt) : emptyState("No receipt selected", "Attach a canonical run receipt with the Record route.", "receipt"));
}

function taskReceipt(receipt) {
  const paper = element("article", "task-receipt");
  paper.dataset.status = receipt.status;
  const masthead = element("header", "receipt-masthead");
  const identity = element("div", "receipt-identity");
  const seal = entityIcon("receipt", "receipt-seal");
  const title = element("div");
  title.append(element("span", "receipt-overline", "Prototype Lab · execution receipt"), element("h2", "", receipt.ownerTitle), element("p", "mono", receipt.ownerId));
  identity.append(seal, title);
  const serial = element("div", "receipt-serial");
  serial.append(statusBadge(receipt.status), element("strong", "mono", receipt.runId));
  masthead.append(identity, serial);

  const summary = element("section", "receipt-summary");
  summary.append(element("span", "receipt-section-label", "Task outcome"), element("p", "", receipt.summary));

  const gauges = element("section", "receipt-gauges");
  gauges.append(
    receiptGauge("Verification", receipt.verificationPassed, receipt.verificationCount, "check"),
    receiptGauge("Artifacts", receipt.filesCount, Math.max(receipt.filesCount, 1), "folder"),
    receiptGauge("Assets", receipt.assetsCount, Math.max(receipt.assetsCount, 1), "spark"),
    receiptGauge("Isolation", receipt.contextIsolation === "dispatch-recorded" && receipt.receivedOtherVariants === false ? 1 : 0, 1, "proof")
  );

  const journey = element("section", "receipt-journey");
  journey.append(element("span", "receipt-section-label", "Run journey"));
  const journeyTrack = element("div", "journey-track");
  const steps = [
    ["Prompt", receipt.schemaVersion >= 1, "prompt"],
    ["Dispatch", receipt.workerId !== "not captured", "worker"],
    ["Build", receipt.filesCount > 0 || receipt.status !== "planned", "tool"],
    ["Verify", receipt.verificationCount > 0, "proof"]
  ];
  steps.forEach(([label, complete, iconName], index) => {
    const step = element("div", "journey-step");
    step.dataset.complete = String(complete);
    step.append(entityIcon(iconName, "journey-icon"), element("strong", "", label), element("span", "", complete ? "recorded" : "not captured"));
    journeyTrack.append(step);
    if (index < steps.length - 1) journeyTrack.append(element("i", "journey-link"));
  });
  journey.append(journeyTrack);

  const columns = element("section", "receipt-columns");
  const execution = receiptBlock("Execution", "device", [
    ["Requested model", receipt.requestedModel],
    ["Effective model", receipt.effectiveModel],
    ["Reasoning", receipt.reasoning],
    ["Agent tool", receipt.agentTool]
  ]);
  const dispatch = receiptBlock("Dispatch", "worker", [
    ["Worker", receipt.workerId],
    ["Isolation adapter", receipt.isolationAdapter],
    ["Variant", receipt.variantId],
    ["Other variants", receipt.receivedOtherVariants === false ? "not received" : String(receipt.receivedOtherVariants)]
  ]);
  columns.append(execution, dispatch);

  const usage = element("section", "receipt-usage");
  usage.append(element("span", "receipt-section-label", "Captured usage"));
  const usageChart = element("div", "usage-chart");
  const input = Number(receipt.inputTokens || 0);
  const output = Number(receipt.outputTokens || 0);
  const total = input + output;
  usageChart.append(
    tokenBar("Input", input, total, "blue"),
    tokenBar("Output", output, total, "accent"),
    tokenBar("Tool calls", Number(receipt.toolCalls || 0), Math.max(Number(receipt.toolCalls || 0), 1), "violet")
  );
  if (!total && !receipt.toolCalls) usageChart.append(element("p", "usage-empty", "Token and tool-call usage was not captured by the runtime."));
  usage.append(usageChart);

  const hashes = element("section", "receipt-hashes");
  hashes.append(element("span", "receipt-section-label", "Integrity marks"), receiptHash("Assignment", receipt.assignmentSha256), receiptHash("Input manifest", receipt.inputManifestSha256));

  if (receipt.limitations.length) {
    const limitations = element("section", "receipt-limitations");
    limitations.append(element("span", "receipt-section-label", "Limitations"));
    const list = document.createElement("ul");
    receipt.limitations.forEach((value) => list.append(element("li", "", value)));
    limitations.append(list);
    paper.append(masthead, summary, gauges, journey, columns, usage, hashes, limitations, receiptFooter(receipt));
  } else {
    paper.append(masthead, summary, gauges, journey, columns, usage, hashes, receiptFooter(receipt));
  }
  return paper;
}

function receiptGauge(label, value, maximum, iconName) {
  const safeMaximum = Math.max(1, Number(maximum) || 1);
  const safeValue = Math.max(0, Number(value) || 0);
  const percentValue = Math.min(100, Math.round((safeValue / safeMaximum) * 100));
  const card = element("article", "receipt-gauge");
  const graphic = svgElement("svg", { viewBox: "0 0 44 44", role: "img", "aria-label": `${label}: ${safeValue} of ${maximum || 0}` });
  const circumference = 2 * Math.PI * 17;
  graphic.append(svgElement("circle", { cx: "22", cy: "22", r: "17", class: "receipt-gauge-track" }), svgElement("circle", { cx: "22", cy: "22", r: "17", class: "receipt-gauge-value", "stroke-dasharray": String(circumference), "stroke-dashoffset": String(circumference * (1 - percentValue / 100)) }));
  const iconWrap = element("span", "receipt-gauge-icon");
  iconWrap.append(icon(iconName, 14));
  const visual = element("div", "receipt-gauge-visual");
  visual.append(graphic, iconWrap);
  const copy = element("div");
  copy.append(element("span", "", label), element("strong", "", maximum ? `${safeValue}/${maximum}` : "—"));
  card.append(visual, copy);
  return card;
}

function receiptBlock(title, iconName, rows) {
  const block = element("section", "receipt-block");
  const heading = element("h3");
  heading.append(icon(iconName, 14), document.createTextNode(title));
  block.append(heading, ...rows.map(([label, value]) => {
    const row = element("div", "receipt-data-row");
    row.append(element("span", "", label), element("strong", "mono", String(value ?? "not captured")));
    return row;
  }));
  return block;
}

function tokenBar(label, value, total, tone) {
  const row = element("div", "token-row");
  row.dataset.tone = tone;
  const track = element("span", "token-track");
  const fill = document.createElement("i");
  fill.style.setProperty("--value", `${total ? Math.max(value ? 6 : 0, (value / total) * 100) : 0}%`);
  track.append(fill);
  row.append(element("span", "", label), track, element("strong", "mono", value ? new Intl.NumberFormat("en").format(value) : "—"));
  return row;
}

function receiptHash(label, value) {
  const row = element("div", "receipt-hash");
  row.append(element("span", "", label), element("code", "", shortHash(value)));
  return row;
}

function receiptFooter(receipt) {
  const footer = element("footer", "receipt-footer");
  const barcode = receiptBarcode(`${receipt.assignmentSha256}${receipt.inputManifestSha256}${receipt.runId}`);
  const copy = element("div");
  copy.append(element("span", "", `Schema v${receipt.schemaVersion}`), element("strong", "mono", receipt.receiptPath));
  const open = link("Open task", receipt.ownerPath, "receipt-open");
  open.prepend(icon("external", 13));
  footer.append(barcode, copy, open);
  return footer;
}

function receiptBarcode(seed) {
  const svg = svgElement("svg", { viewBox: "0 0 164 28", class: "receipt-barcode", role: "img", "aria-label": "Receipt integrity barcode" });
  const source = String(seed || "not-captured");
  let x = 0;
  for (let index = 0; index < 54 && x < 164; index += 1) {
    const width = 1 + (source.charCodeAt(index % source.length) % 3);
    const gap = 1 + (source.charCodeAt((index + 7) % source.length) % 2);
    svg.append(svgElement("rect", { x: String(x), y: "0", width: String(width), height: String(18 + (index % 3) * 5), rx: ".25" }));
    x += width + gap;
  }
  return svg;
}

function searchableReceipt(receipt) {
  return [receipt.id, receipt.runId, receipt.ownerId, receipt.ownerTitle, receipt.status, receipt.variantId, receipt.requestedModel, receipt.effectiveModel, receipt.workerId, receipt.agentTool, receipt.reasoning, receipt.summary, ...(receipt.skills || [])].join(" ").toLowerCase();
}

function shortHash(value) { return /^[a-f0-9]{64}$/i.test(value || "") ? `${value.slice(0, 12)}…${value.slice(-6)}` : value || "not captured"; }

function renderHealthInsights() {
  const severities = countBy(issues, (issue) => issue.severity || "info", ["error", "warning", "info"]);
  const score = healthScore(issues);
  const evidence = percent(artifacts.filter((item) => Number(item.proof) > 0).length, artifacts.length);
  healthInsights.replaceChildren(
    ringCard({ label: "Workspace signal", value: score, note: "Heuristic from unresolved issue severity", tone: score >= 85 ? "green" : score >= 60 ? "amber" : "red" }),
    metricCard({ label: "Open issues", value: issues.length, note: `${issues.filter((issue) => issue.severity === "error").length} errors · ${issues.filter((issue) => issue.severity === "warning").length} warnings`, tone: issues.length ? "amber" : "green", iconName: issues.length ? "warning" : "check" }),
    distributionCard({ title: "Severity mix", value: severities.length, items: severities, tone: "amber" }),
    ringCard({ label: "Evidence coverage", value: evidence, note: `${artifacts.filter((item) => Number(item.proof) > 0).length} of ${artifacts.length} owners`, tone: "blue" })
  );
}

function renderHealth() {
  const severityOrder = ["error", "warning", "info"];
  const grouped = new Map(severityOrder.map((severity) => [severity, issues.filter((issue) => (issue.severity || "info") === severity)]));
  const groups = [];
  for (const severity of severityOrder) {
    const values = grouped.get(severity);
    if (!values.length) continue;
    const group = element("section", "health-group");
    const head = element("header", "health-group-head");
    head.append(element("span", "", `${severity[0].toUpperCase()}${severity.slice(1)}`), element("span", "", String(values.length)));
    group.append(head, ...values.map((issue) => {
      const row = element("article", "health-row");
      row.dataset.severity = issue.severity;
      const copy = element("div", "health-copy");
      copy.append(element("strong", "", issue.title), element("span", "", issue.code || issue.severity));
      row.append(severityIcon(issue.severity), copy, element("span", "health-message", issue.message), link("Open", issue.path, "text-action"));
      return row;
    }));
    groups.push(group);
  }
  const healthNodes = groups.length ? groups : [emptyState("Workspace ready", "No readiness issues were detected in indexed metadata.", "check")];
  healthList.replaceChildren(...healthNodes);

  const commandGroups = [
    ["Create", "plus", [
      ["Quick prototype", labCommand("quick --title <title> --question <question>")],
      ["Adopt static build", labCommand("adopt --path <folder> --title <title> --question <question>")],
      ["Compare variants", labCommand("compare --title <title> --variants <id,id> --dimension <dimension>")]
    ]],
    ["Inspect", "eye", [
      ["Verify artifact", labCommand("verify --id <id> --profile full --init-review")],
      ["Review comparison", labCommand("review --id <hub-id> --init")],
      ["Preview over HTTP", labCommand("preview --id <id> --open")]
    ]],
    ["Recover", "pulse", [
      ["Resume workspace", labCommand("status")],
      ["Check installation", labCommand("doctor")]
    ]],
    ["Ship", "box", [
      ["Ship artifact", labCommand("ship --id <id> --include-proof")]
    ]]
  ];
  commandList.replaceChildren(...commandGroups.map(([title, iconName, commands]) => {
    const group = element("section", "command-group");
    const heading = element("h3");
    heading.append(icon(iconName, 13), document.createTextNode(title));
    group.append(heading, ...commands.map(([label, command]) => commandCard(label, command)));
    return group;
  }));
}

function metricCard({ label, value, note, tone = "blue", iconName = "chart" }) {
  const card = element("article", "metric-card");
  card.dataset.tone = tone;
  const head = element("header", "metric-head");
  head.append(element("span", "metric-label", label), entityIcon(iconName, "metric-icon"));
  card.append(head, element("strong", "metric-value", String(value)), element("span", "metric-note", note));
  return card;
}

function ringCard({ label, value, note, tone = "blue" }) {
  const card = element("article", "ring-card");
  card.dataset.tone = tone;
  const ring = element("div", "signal-ring");
  ring.style.setProperty("--ring-color", `var(--${tone})`);
  ring.setAttribute("role", "progressbar");
  ring.setAttribute("aria-label", label);
  ring.setAttribute("aria-valuemin", "0");
  ring.setAttribute("aria-valuemax", "100");
  ring.setAttribute("aria-valuenow", String(value));
  const circumference = 2 * Math.PI * 29;
  const graphic = svgElement("svg", { viewBox: "0 0 72 72", class: "ring-graphic", "aria-hidden": "true" });
  graphic.append(
    svgElement("circle", { cx: "36", cy: "36", r: "29", class: "ring-track" }),
    svgElement("circle", { cx: "36", cy: "36", r: "29", class: "ring-value", "stroke-dasharray": String(circumference), "stroke-dashoffset": String(circumference * (1 - value / 100)) })
  );
  ring.append(graphic, element("strong", "", `${value}%`));
  const copy = element("div", "ring-copy");
  copy.append(element("span", "", label), paragraph(note));
  card.append(ring, copy);
  return card;
}

function barChartCard({ title, value, series, note, tone = "blue" }) {
  const card = element("figure", "chart-card");
  card.dataset.tone = tone;
  const heading = element("figcaption", "chart-heading");
  heading.append(element("span", "", title), element("strong", "", String(value)));
  const svg = svgElement("svg", { viewBox: "0 0 240 58", class: "spark-chart", role: "img", "aria-label": `${title}: ${series.map((item) => `${item.label} ${item.value}`).join(", ") || "no data"}` });
  [16, 32, 48].forEach((y) => svg.append(svgElement("line", { x1: "0", x2: "240", y1: String(y), y2: String(y), class: "guide", "aria-hidden": "true" })));
  const max = Math.max(1, ...series.map((item) => item.value));
  const gap = 5;
  const width = series.length ? (240 - gap * Math.max(0, series.length - 1)) / series.length : 240;
  series.forEach((item, index) => {
    const height = Math.max(4, (item.value / max) * 50);
    svg.append(svgElement("rect", { x: String(index * (width + gap)), y: String(56 - height), width: String(width), height: String(height), rx: "2", class: "bar" }));
  });
  const footer = element("div", "chart-footer");
  footer.append(element("span", "", series[0]?.label || "No dates"), element("span", "", note), element("span", "", series.at(-1)?.label || ""));
  card.append(heading, svg, footer);
  return card;
}

function distributionCard({ title, value, items, tone = "blue" }) {
  const card = element("article", "distribution-card");
  card.dataset.tone = tone;
  const heading = element("header", "chart-heading");
  heading.append(element("span", "", title), element("strong", "", String(value)));
  const list = element("div", "distribution-list");
  const max = Math.max(1, ...items.map((item) => item.value));
  items.forEach((item) => {
    const row = element("div", "distribution-row");
    const track = element("span", "distribution-track");
    const fill = document.createElement("i");
    fill.style.setProperty("--value", `${(item.value / max) * 100}%`);
    track.append(fill);
    row.append(element("span", "", humanize(item.label)), track, element("strong", "", String(item.value)));
    list.append(row);
  });
  if (!items.length) list.append(element("span", "metric-note", "No distribution available."));
  card.append(heading, list);
  return card;
}

function commandCard(label, command) {
  const node = element("article", "command-card");
  const copy = element("div", "command-copy");
  copy.append(element("span", "", label), element("code", "", command));
  const button = element("button", "icon-action");
  button.type = "button";
  button.setAttribute("aria-label", `Copy ${label} command`);
  button.title = `Copy ${label} command`;
  button.append(icon("copy", 14));
  button.onclick = () => copyText(command, `${label} command copied`);
  node.append(copy, button);
  return node;
}

function metaCell(iconName, label, value) {
  const node = element("div", "meta-cell");
  const key = element("span");
  key.append(icon(iconName, 10), document.createTextNode(label));
  const content = element("strong", iconName === "model" ? "mono" : "", value);
  content.title = value;
  node.append(key, content);
  return node;
}

function proofSignal(value) {
  const node = element("span", "proof-signal");
  const dots = element("span", "proof-dots");
  for (let index = 0; index < 5; index += 1) {
    const dot = document.createElement("i");
    dot.dataset.filled = String(index < Math.min(5, value));
    dots.append(dot);
  }
  node.append(dots, document.createTextNode(`${value} proof`));
  return node;
}

function statusBadge(value) {
  const status = value || "unknown";
  const node = element("span", "status-badge", humanize(status));
  node.dataset.status = status;
  return node;
}

function severityIcon(severity) {
  const name = severity === "error" ? "error" : severity === "warning" ? "warning" : "info";
  const node = element("span", "severity-icon");
  node.append(icon(name, 15));
  return node;
}

function entityIcon(name, className = "entity-icon") {
  const node = element("span", className);
  node.append(icon(name, 15));
  return node;
}

function hubSignal(label, value) {
  const node = element("article", "hub-signal");
  node.append(element("span", "", label), element("strong", "", String(value)));
  return node;
}

function emptyState(title, copy, iconName) {
  const outer = element("section", "empty-state");
  const inner = element("div", "empty-state-inner");
  inner.append(entityIcon(iconName, "empty-state-icon"), element("strong", "", title), paragraph(copy));
  outer.append(inner);
  return outer;
}

function groupArtifacts(items, mode) {
  if (mode === "none") return items.length ? [{ label: "all", items }] : [];
  const groups = new Map();
  items.forEach((item) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : "unknown";
    const key = mode === "year" ? date.slice(0, 4) : mode === "month" ? date.slice(0, 7) : date;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return [...groups.entries()].map(([label, groupItems]) => ({ label, items: groupItems }));
}

function countBy(items, key, preferredOrder = []) {
  const counts = new Map();
  items.forEach((item) => {
    const value = String(key(item) || "unknown");
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((left, right) => {
    const leftOrder = preferredOrder.indexOf(left.label);
    const rightOrder = preferredOrder.indexOf(right.label);
    if (leftOrder >= 0 || rightOrder >= 0) return (leftOrder < 0 ? 999 : leftOrder) - (rightOrder < 0 ? 999 : rightOrder);
    return right.value - left.value || left.label.localeCompare(right.label);
  });
}

function healthScore(values) {
  const penalty = values.reduce((sum, issue) => sum + (issue.severity === "error" ? 20 : issue.severity === "warning" ? 8 : 3), 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function percent(value, total) { return total ? Math.round((value / total) * 100) : 0; }
function normalizeStatus(value) { return ["active", "actual", "ready", "complete"].includes(value) ? "ready" : ["draft", "needs-brief"].includes(value) ? "draft" : value || "unknown"; }
function searchableArtifact(item) { return [item.title, item.question, item.category, item.status, item.modelExact, item.agent, ...(item.skills || []), ...(item.tags || [])].join(" ").toLowerCase(); }
function labCommand(value) { return `${commandPrefix} ${value}`; }
function selectFrom(items, label) { const node = document.createElement("select"); node.setAttribute("aria-label", `${label} variant`); items.forEach((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = `${label} · ${item.title}`; node.append(option); }); return node; }
function shortId(id) { return id?.split("/").at(-1).replace(/^\d+-/, ""); }
function withParams(url, values) { const [base, query = ""] = url.split("?"); const next = new URLSearchParams(query); Object.entries(values).forEach(([key, value]) => next.set(key, value)); return `${base}?${next.toString()}`; }
function humanize(value) { return String(value || "unknown").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatGroupLabel(value, mode) {
  if (value === "unknown") return "Date unknown";
  if (value === "all") return "All artifacts";
  const date = mode === "year" ? new Date(`${value}-01-01T00:00:00Z`) : mode === "month" ? new Date(`${value}-01T00:00:00Z`) : new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  const options = mode === "year" ? { year: "numeric" } : mode === "month" ? { month: "long", year: "numeric" } : { month: "long", day: "numeric", year: "numeric" };
  return new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(date);
}

async function copyText(value, message) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  showToast(message);
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.replaceChildren(icon("check", 15), document.createTextNode(message));
  toast.dataset.visible = "true";
  toastTimer = setTimeout(() => { toast.dataset.visible = "false"; }, 1800);
}

function hydrateIcons(root) {
  root.querySelectorAll("[data-icon]").forEach((node) => {
    const name = node.dataset.icon;
    node.replaceChildren(icon(name, 16));
  });
}

function icon(name, size = 16) {
  const file = tablerIconFiles[name] || tablerIconFiles.info;
  const registry = window.PROTOTYPE_TABLER_ICONS || {};
  const svg = svgElement("svg", { class: "tabler-icon", width: String(size), height: String(size), viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" });
  svg.innerHTML = registry[file] || registry[tablerIconFiles.info] || "";
  return svg;
}

function cell(child) { const node = document.createElement("td"); node.append(child); return node; }
function paragraph(value) { return element("p", "body-copy", value || "No description recorded."); }
function link(value, href, className = "") { const node = element("a", className, value); node.href = href; return node; }
function element(tag, className = "", text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function svgElement(tag, attributes = {}) { const node = document.createElementNS("http://www.w3.org/2000/svg", tag); Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value)); return node; }

search.addEventListener("input", () => activeView === "prompts" ? renderPrompts() : activeView === "receipts" ? renderReceipts() : renderLibrary());
groupSelect.addEventListener("change", renderLibrary);
quickCommand.addEventListener("click", () => copyText(labCommand('quick --title "<title>" --question "<decision-question>"'), "Quick prototype command copied"));
nav.addEventListener("keydown", (event) => {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const buttons = [...nav.querySelectorAll("button")];
  const current = buttons.indexOf(document.activeElement);
  if (current < 0) return;
  event.preventDefault();
  const forward = ["ArrowDown", "ArrowRight"].includes(event.key);
  const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (forward ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next].focus();
  setView(buttons[next].dataset.view);
});
addEventListener("resize", updateShell);
