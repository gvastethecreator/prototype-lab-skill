const views = [
  {
    id: "overview",
    title: "Overview",
    description: "Summarize the main prototype question and current baseline.",
    items: ["Goal", "Primary path", "Known risk"],
  },
  {
    id: "variation-a",
    title: "Variation A",
    description: "Use this slot for the first meaningful alternate state or layout.",
    items: ["Different hierarchy", "Different control emphasis", "Tradeoff"],
  },
  {
    id: "edge-cases",
    title: "Edge Cases",
    description: "Stress empty, long, loading, error, and dense states here.",
    items: ["Empty", "Long content", "Error"],
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
const stateReadout = document.querySelector("#state-readout");
const statusChip = document.querySelector("#status-chip");
const drawerButton = document.querySelector("[data-action='drawer']");
const drawer = document.querySelector("#prototype-drawer");

const state = {
  viewId: new URLSearchParams(location.search).get("view") || views[0].id,
  density: 1,
  debug: false,
  drawerOpen: false,
};

function setView(viewId, shouldFocus = false) {
  const nextView = views.find((view) => view.id === viewId) || views[0];
  state.viewId = nextView.id;
  const url = new URL(location.href);
  url.searchParams.set("view", nextView.id);
  history.replaceState(null, "", url);
  render(shouldFocus);
}

function setDrawer(open) {
  state.drawerOpen = open;
  shell.dataset.drawer = open ? "open" : "closed";
  drawerButton.setAttribute("aria-expanded", String(open));
  drawer.setAttribute("aria-hidden", String(!open));
  renderControls();
}

function renderNav() {
  nav.replaceChildren(
    ...views.map((view) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "plab-nav-button";
      button.dataset.active = String(view.id === state.viewId);
      button.textContent = view.title;
      button.addEventListener("click", () => setView(view.id, true));
      return button;
    }),
  );
}

function renderStage() {
  const activeView = views.find((view) => view.id === state.viewId) || views[0];
  activeKicker.textContent = activeView.id;
  activeTitle.textContent = activeView.title;
  activeDescription.textContent = activeView.description;
  demoGrid.replaceChildren(
    ...activeView.items.map((item) => {
      const cell = document.createElement("article");
      cell.className = "demo-cell";
      const title = document.createElement("strong");
      title.textContent = item;
      const detail = document.createElement("span");
      detail.textContent = "Replace with real prototype content.";
      cell.append(title, detail);
      return cell;
    }),
  );
}

function fitStatus() {
  const pageScroll =
    Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) >
    innerHeight + 2;
  if (pageScroll) return "page-scroll";
  if (stage.scrollHeight > stage.clientHeight + 2) return "stage-scroll";
  return "fit";
}

function renderControls() {
  document.documentElement.dataset.density = String(state.density);
  document.documentElement.dataset.debug = String(state.debug);
  densityControl.value = String(state.density);
  debugControl.checked = state.debug;
  const snapshot = {
    view: state.viewId,
    drawer: state.drawerOpen ? "open" : "closed",
    density: state.density,
    debug: state.debug,
    viewport: `${innerWidth}x${innerHeight}`,
    fit: fitStatus(),
  };
  stateReadout.textContent = JSON.stringify(snapshot, null, 2);
  statusChip.textContent = `${state.viewId} | ${snapshot.fit}`;
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
  setView(views[0].id, true);
});

document.querySelector("[data-action='snapshot']").addEventListener("click", async () => {
  await navigator.clipboard?.writeText(stateReadout.textContent);
  statusChip.textContent = "copied";
});

document.querySelectorAll("[data-action='drawer'], [data-action='drawer-close']").forEach((button) => {
  button.addEventListener("click", () => setDrawer(!state.drawerOpen));
});

addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.drawerOpen) setDrawer(false);
});

addEventListener("resize", renderControls, { passive: true });

render();
