const indexData = window.PROTOTYPE_INDEX_DATA || { prototypes: [], comparisonHubs: [] };
const prototypes = Array.isArray(indexData.prototypes) ? indexData.prototypes : [];
const comparisonHubs = Array.isArray(indexData.comparisonHubs) ? indexData.comparisonHubs : [];
let activeHub = comparisonHubs[0] || null;

const grid = document.querySelector("#prototype-grid");
const count = document.querySelector("#result-count");
const search = document.querySelector("#search-input");
const groupSelect = document.querySelector("#group-select");
const template = document.querySelector("#prototype-card-template");
const compareControls = document.querySelector(".compare-controls");
const hubSelect = document.querySelector("#hub-select");
const compareLeft = document.querySelector("#compare-left");
const compareRight = document.querySelector("#compare-right");
const compareOpen = document.querySelector("#compare-open");

function pathWithParams(path, params) {
  const [base, query = ""] = path.split("?");
  const searchParams = new URLSearchParams(query);
  Object.entries(params).forEach(([key, value]) => searchParams.set(key, value));
  return `${base}?${searchParams.toString()}`;
}

function searchableText(prototype) {
  return [
    prototype.title,
    prototype.question,
    prototype.category,
    prototype.status,
    prototype.model,
    prototype.agent,
    ...(prototype.skills || []),
    ...(prototype.tags || []),
  ].join(" ").toLowerCase();
}

function prototypeDate(prototype) {
  if (!prototype.date) return null;
  const [year, month, day] = prototype.date.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function prototypeSequence(prototype) {
  const match = prototype.id.match(/\/(\d+)-[^/]+$/);
  return match ? Number(match[1]) : 0;
}

function compareNewestFirst(a, b) {
  const aDate = prototypeDate(a)?.getTime() || 0;
  const bDate = prototypeDate(b)?.getTime() || 0;
  return bDate - aDate || prototypeSequence(b) - prototypeSequence(a) || a.title.localeCompare(b.title);
}

function formatDate(date, options) {
  return new Intl.DateTimeFormat("en", options).format(date);
}

function startOfWeek(date) {
  const start = new Date(date);
  const dayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOffset);
  return start;
}

function localDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function groupInfo(prototype, mode) {
  const date = prototypeDate(prototype);
  if (!date) return { key: "unknown", label: "Date unknown" };
  if (mode === "year") {
    return { key: String(date.getFullYear()), label: String(date.getFullYear()) };
  }
  if (mode === "month") {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { key, label: formatDate(date, { month: "long", year: "numeric" }) };
  }
  if (mode === "week") {
    const start = startOfWeek(date);
    const key = localDateKey(start);
    return { key, label: `Week of ${formatDate(start, { month: "long", day: "numeric", year: "numeric" })}` };
  }
  return { key: prototype.date, label: formatDate(date, { month: "long", day: "numeric", year: "numeric" }) };
}

function groupedPrototypes(items) {
  const mode = groupSelect?.value || "day";
  const groups = new Map();
  items.forEach((prototype) => {
    const info = groupInfo(prototype, mode);
    if (!groups.has(info.key)) groups.set(info.key, { ...info, items: [] });
    groups.get(info.key).items.push(prototype);
  });
  return [...groups.values()];
}

function setupComparePicker() {
  if (!compareLeft || !compareRight || !compareOpen) return;
  if (!comparisonHubs.length) {
    compareControls?.setAttribute("hidden", "");
    return;
  }
  compareControls?.removeAttribute("hidden");
  if (hubSelect) {
    hubSelect.replaceChildren(
      ...comparisonHubs.map((hub) => {
        const option = document.createElement("option");
        option.value = hub.id;
        option.textContent = hub.title;
        return option;
      }),
    );
    hubSelect.value = activeHub.id;
    hubSelect.addEventListener("change", () => {
      activeHub = comparisonHubs.find((hub) => hub.id === hubSelect.value) || comparisonHubs[0];
      populateCompareOptions();
      syncCompareLink();
    });
  }
  populateCompareOptions();
  syncCompareLink();
  compareLeft.addEventListener("change", () => syncCompareLink("left"));
  compareRight.addEventListener("change", () => syncCompareLink("right"));
}

function hubPrototypes() {
  const ids = new Set(activeHub?.variantIds || []);
  const scoped = prototypes.filter((prototype) => ids.has(prototype.id));
  return scoped.length ? scoped : prototypes.filter((prototype) => !prototype.isComparisonHub);
}

function populateCompareOptions() {
  const scoped = hubPrototypes();
  const options = scoped.map((prototype) => {
    const option = document.createElement("option");
    option.value = prototype.id;
    option.textContent = prototype.title;
    return option;
  });
  compareLeft.replaceChildren(...options.map((option) => option.cloneNode(true)));
  compareRight.replaceChildren(...options.map((option) => option.cloneNode(true)));
  compareLeft.value = scoped[0]?.id || "";
  compareRight.value = scoped[1]?.id || scoped[0]?.id || "";
}

function syncCompareLink(changedSide = "right") {
  const scoped = hubPrototypes();
  if (!activeHub || !scoped.length) return;
  let left = scoped.some((prototype) => prototype.id === compareLeft.value) ? compareLeft.value : scoped[0].id;
  let right = scoped.some((prototype) => prototype.id === compareRight.value) ? compareRight.value : scoped[1]?.id || left;
  if (left === right && scoped.length > 1) {
    const alternate = scoped.find((prototype) => prototype.id !== left)?.id || right;
    if (changedSide === "left") {
      right = alternate;
      compareRight.value = right;
    } else {
      left = alternate;
      compareLeft.value = left;
    }
  }
  compareLeft.value = left;
  compareRight.value = right;
  compareOpen.href = pathWithParams(activeHub.path, { view: activeHub.defaultView || "compare", left, right });
  compareOpen.title = `Compare ${prototypeById(left).title} with ${prototypeById(right).title}`;
}

function prototypeById(id) {
  return prototypes.find((prototype) => prototype.id === id) || prototypes[0] || {};
}

function render() {
  const query = search.value.trim().toLowerCase();
  const filtered = prototypes
    .filter((prototype) => !query || searchableText(prototype).includes(query))
    .sort(compareNewestFirst);
  grid.replaceChildren(...(filtered.length ? groupedPrototypes(filtered).map(renderGroup) : [renderEmptyState(query)]));
  count.textContent = `${filtered.length} prototype${filtered.length === 1 ? "" : "s"}`;
  requestAnimationFrame(updatePreviewScales);
}

function renderGroup(group) {
  const section = document.createElement("section");
  section.className = "prototype-group";
  const head = document.createElement("header");
  head.className = "group-head";
  const title = document.createElement("h2");
  title.textContent = group.label;
  const total = document.createElement("span");
  total.textContent = `${group.items.length} prototype${group.items.length === 1 ? "" : "s"}`;
  const cards = document.createElement("div");
  cards.className = "group-grid";
  cards.replaceChildren(...group.items.map(renderCard));
  head.append(title, total);
  section.append(head, cards);
  return section;
}

function renderCard(prototype) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.tone = prototype.id.includes("ruthless") ? "warm" : "cool";
  const link = node.querySelector(".preview-link");
  const iframe = node.querySelector("iframe");
  link.href = prototype.path;
  iframe.src = pathWithParams(prototype.path, { embed: "1" });
  iframe.title = `${prototype.title} preview`;
  node.querySelector(".card-category").textContent = prototype.category || "uncategorized";
  node.querySelector("h2").textContent = prototype.title;
  const status = node.querySelector(".status-pill");
  status.textContent = prototype.status || "unknown";
  status.dataset.status = prototype.status || "unknown";
  node.querySelector(".card-question").textContent = prototype.question || "No question recorded.";
  node.querySelector(".card-meta").replaceChildren(...metadataBadges(prototype));
  node.querySelector(".card-date").textContent = prototype.date || "date unknown";
  node.querySelector(".card-path").textContent = prototype.path;
  node.querySelector(".tag-row").replaceChildren(
    ...(prototype.tags || []).map((tag) => {
      const pill = document.createElement("span");
      pill.textContent = tag;
      return pill;
    }),
  );
  return node;
}

function metadataBadges(prototype) {
  const skills = prototype.skills?.length ? prototype.skills : ["unknown skill"];
  return [
    badge(prototype.modelExact || prototype.model || "unknown model", "model", "🤖"),
    ...skills.map((skill) => badge(skill, "skill", "✦")),
    badge(prototype.agent || "unknown agent", "agent", "🧭"),
    badge(`${prototype.proof ?? "unknown"} proof`, "proof", "✓"),
  ];
}

function badge(label, kind, icon) {
  const node = document.createElement("span");
  node.className = "meta-badge";
  node.dataset.kind = kind;
  const iconNode = document.createElement("span");
  iconNode.className = "badge-icon";
  iconNode.textContent = icon;
  const text = document.createElement("span");
  text.textContent = label;
  node.append(iconNode, text);
  return node;
}

function renderEmptyState(query) {
  const empty = document.createElement("article");
  empty.className = "empty-state";
  const title = document.createElement("strong");
  title.textContent = query ? "No prototypes match this filter." : "No prototypes listed yet.";
  const detail = document.createElement("span");
  detail.textContent = query
    ? "Clear search or add the matching prototype metadata to prototype-index.js."
    : "Add prototype entries to the prototypes array in prototype-index.js.";
  empty.append(title, detail);
  return empty;
}

function updatePreviewScales() {
  document.querySelectorAll(".preview-frame").forEach((frame) => {
    const width = frame.clientWidth;
    const scale = Math.max(0.16, Math.min(0.55, width / 1200));
    frame.style.setProperty("--preview-scale", String(scale));
  });
}

search.addEventListener("input", render);
groupSelect?.addEventListener("change", render);
addEventListener("resize", updatePreviewScales, { passive: true });
setupComparePicker();
render();
