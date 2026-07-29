const data = window.PROTOTYPE_ARTIFACT_DATA || {};
const views = ["canvas", "states", "brief"];
const viewIcons = { canvas: "layout-grid", states: "checklist", brief: "file-description" };
const params = new URLSearchParams(location.search);
const state = {
  view: views.includes(params.get("view")) ? params.get("view") : "canvas",
  exercised: false
};

const nav = document.querySelector("#artifact-nav");
const stage = document.querySelector("#artifact-stage");
const title = document.querySelector("#artifact-title");
const status = document.querySelector("#artifact-status");
const action = document.querySelector("#demo-action");

title.textContent = data.title || "Prototype artifact";
status.textContent = data.status || "draft";
status.dataset.status = data.status || "draft";
document.title = data.title || "Prototype artifact";
document.querySelector("#artifact-question").textContent = data.question || "No decision question recorded.";
document.querySelector("#artifact-id").textContent = data.id || "unknown";
document.querySelector("#artifact-model").textContent = data.model || "unknown";
document.querySelector("#artifact-prompt").textContent = data.prompt || "not attached";

const stateCards = [
  ["Loading", "Keep layout stable while work is pending.", "activity-heartbeat"],
  ["Empty", "Explain what is missing and offer a useful next action.", "box"],
  ["Error", "Preserve context, explain recovery, and allow retry.", "alert-triangle"],
  ["Success", "Confirm the change and make the next step clear.", "circle-check"],
  ["Long content", "Wrap without hiding controls or changing hierarchy.", "file-description"],
  ["Reset", "Return to deterministic initial state.", "refresh"],
];

document.querySelector("#state-grid").replaceChildren(...stateCards.map(([name, detail, iconName]) => {
  const card = element("article", "state-card");
  const heading = element("strong", "state-card-title");
  heading.append(icon(iconName, 14), document.createTextNode(name));
  card.append(heading, element("span", "", detail));
  return card;
}));

function setView(view) {
  state.view = views.includes(view) ? view : "canvas";
  const url = new URL(location.href);
  url.searchParams.set("view", state.view);
  history.replaceState(null, "", url);
  render();
  stage.focus({ preventScroll: true });
}

function render() {
  nav.replaceChildren(...views.map((view) => {
    const button = element("button");
    button.type = "button";
    button.dataset.active = String(view === state.view);
    button.append(icon(viewIcons[view], 14), document.createTextNode(view[0].toUpperCase() + view.slice(1)));
    button.onclick = () => setView(view);
    return button;
  }));
  document.querySelectorAll(".artifact-view").forEach((node) => node.dataset.active = String(node.dataset.view === state.view));
  action.dataset.exercised = String(state.exercised);
  action.replaceChildren(icon(state.exercised ? "circle-check" : "activity-heartbeat", 14), document.createTextNode(state.exercised ? "Starter state exercised" : "Exercise starter state"));
}

action.onclick = () => { state.exercised = !state.exercised; render(); };
document.querySelector("#reset-button").onclick = () => { state.exercised = false; setView("canvas"); };
function element(tag, className = "", text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function hydrateIcons(root) { root.querySelectorAll("[data-icon]").forEach((node) => node.replaceChildren(icon(node.dataset.icon, 14))); }
function icon(name, size = 16) { const registry = window.PROTOTYPE_TABLER_ICONS || {}; const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); Object.entries({ class: "tabler-icon", width: String(size), height: String(size), viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" }).forEach(([key, value]) => svg.setAttribute(key, value)); svg.innerHTML = registry[name] || registry["info-circle"] || ""; return svg; }

if (params.get("embed") === "1") document.documentElement.dataset.embed = "true";
hydrateIcons(document);
render();
