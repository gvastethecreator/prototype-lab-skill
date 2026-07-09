const prototypes = [
  {
    id: "2026/07/001-prototype-name",
    title: "Prototype Name",
    path: "./2026/07/001-prototype-name/index.html",
    question: "What are we trying to learn?",
    category: "workflow-tools",
    status: "active",
    tags: ["browser-ui"],
    model: "GPT-5",
    skills: ["prototype-lab"],
    proof: 0,
  },
];

const grid = document.querySelector("#prototype-grid");
const count = document.querySelector("#result-count");
const search = document.querySelector("#search-input");
const template = document.querySelector("#prototype-card-template");

function searchableText(prototype) {
  return [
    prototype.title,
    prototype.question,
    prototype.category,
    prototype.status,
    prototype.model,
    ...(prototype.skills || []),
    ...(prototype.tags || []),
  ]
    .join(" ")
    .toLowerCase();
}

function render() {
  const query = search.value.trim().toLowerCase();
  const filtered = prototypes.filter((prototype) => !query || searchableText(prototype).includes(query));
  grid.replaceChildren(...(filtered.length ? filtered.map(renderCard) : [renderEmptyState(query)]));
  count.textContent = `${filtered.length} prototype${filtered.length === 1 ? "" : "s"}`;
  requestAnimationFrame(updatePreviewScales);
}

function renderCard(prototype) {
  const node = template.content.firstElementChild.cloneNode(true);
  const link = node.querySelector(".preview-link");
  const iframe = node.querySelector("iframe");
  const open = node.querySelector(".open-link");
  link.href = prototype.path;
  open.href = prototype.path;
  iframe.src = prototype.path;
  iframe.title = `${prototype.title} preview`;
  node.querySelector(".card-category").textContent = prototype.category || "uncategorized";
  node.querySelector("h2").textContent = prototype.title;
  const status = node.querySelector(".status-pill");
  status.textContent = prototype.status || "unknown";
  status.dataset.status = prototype.status || "unknown";
  node.querySelector(".card-question").textContent = prototype.question || "No question recorded.";
  node.querySelector(".card-model").textContent = prototype.model || "unknown";
  node.querySelector(".card-skills").textContent = (prototype.skills || ["unknown"]).join(", ");
  node.querySelector(".card-proof").textContent = String(prototype.proof ?? "unknown");
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
    const scale = Math.max(0.16, Math.min(0.5, width / 1200));
    frame.style.setProperty("--preview-scale", String(scale));
  });
}

search.addEventListener("input", render);
addEventListener("resize", updatePreviewScales, { passive: true });
render();
