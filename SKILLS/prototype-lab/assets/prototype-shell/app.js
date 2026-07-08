const views = [
  {
    id: "overview",
    title: "Overview",
    description: "Summarize the main prototype question and current baseline.",
    note: "Document the main assumption a reviewer should test first.",
    items: ["Goal", "Primary path", "Known risk"],
  },
  {
    id: "variation-a",
    title: "Variation A",
    description: "Use this slot for the first meaningful alternate state or layout.",
    note: "Explain why this option should be compared with the baseline.",
    items: ["Different hierarchy", "Different control emphasis", "Tradeoff"],
  },
  {
    id: "edge-cases",
    title: "Edge Cases",
    description: "Stress empty, long, loading, error, and dense states here.",
    note: "List the edge state that would most affect the product decision.",
    items: ["Empty", "Long content", "Error"],
  },
];

const shell = document.querySelector(".plab-shell");
const nav = document.querySelector("#view-nav");
const stage = document.querySelector("#stage");
const activeKicker = document.querySelector("#active-kicker");
const activeTitle = document.querySelector("#active-title");
const activeDescription = document.querySelector("#active-description");
const activeNotes = document.querySelector("#active-notes");
const demoGrid = document.querySelector("#demo-grid");
const notesControl = document.querySelector("#notes-control");
const stateReadout = document.querySelector("#state-readout");
const statusChip = document.querySelector("#status-chip");
const drawerButton = document.querySelector("[data-action='drawer']");
const drawer = document.querySelector("#prototype-drawer");

const state = {
  viewId: new URLSearchParams(location.search).get("view") || views[0].id,
  notesVisible: false,
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
  activeNotes.textContent = activeView.note;
  activeNotes.hidden = !state.notesVisible;
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
  notesControl.checked = state.notesVisible;
  const snapshot = {
    view: state.viewId,
    drawer: state.drawerOpen ? "open" : "closed",
    notes: state.notesVisible ? "visible" : "hidden",
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

notesControl.addEventListener("change", (event) => {
  state.notesVisible = event.currentTarget.checked;
  render();
});

document.querySelector("[data-action='reset']").addEventListener("click", () => {
  state.notesVisible = false;
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
