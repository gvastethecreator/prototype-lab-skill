const data = window.PROTOTYPE_VARY_DATA || {};
const positions = Array.isArray(data.positions) ? data.positions.filter((item) => item && item.n) : [];
const params = new URLSearchParams(location.search);
const embed = params.get("embed") === "1";
const frame = document.querySelector("#vary-frame");
const host = document.querySelector("#vary-card");

if (!positions.length || !frame || !host) {
  throw new Error("Design round host is missing positions or vary-card roots.");
}

let current = Number(params.get("p")) || Number(data.current) || positions[0].n;

function position(n) {
  return positions.find((item) => Number(item.n) === Number(n)) || positions[0];
}

function srcFor(n) {
  const extra = embed ? "?embed=1" : "";
  return `./positions/${Number(n)}/index.html${extra}`;
}

function setPosition(n, { replace = true } = {}) {
  const next = position(n);
  current = Number(next.n);
  const url = new URL(location.href);
  url.searchParams.set("p", String(current));
  if (embed) url.searchParams.set("embed", "1");
  history[replace ? "replaceState" : "pushState"](null, "", url);
  frame.src = srcFor(current);
  render();
  frame.focus({ preventScroll: true });
}

function render() {
  const live = position(current);
  const root = host.shadowRoot || host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      :host { all: initial; }
      .card {
        position: fixed; left: 50%; bottom: 16px; z-index: 2147483646;
        transform: translateX(-50%);
        display: grid; gap: 6px; min-width: min(92vw, 420px); max-width: 92vw;
        padding: 10px 12px; border-radius: 10px;
        background: #111; color: #ededed;
        font: 12px/1.4 ui-sans-serif, system-ui, sans-serif;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
      }
      .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .meta { color: #a1a1a1; }
      .cost { color: #a1a1a1; }
      .pager { display: flex; gap: 4px; }
      button {
        min-width: 28px; min-height: 28px; padding: 0 8px; border: 0; border-radius: 6px;
        background: #1c1c1c; color: inherit; font: inherit; cursor: pointer;
      }
      button[data-active="true"] { background: #c5f36d; color: #111; }
      button:focus-visible { outline: 2px solid #c5f36d; outline-offset: 2px; }
      kbd { font: 11px/1 ui-monospace, SFMono-Regular, Consolas, monospace; color: #737373; }
      @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
    </style>
    <div class="card" role="region" aria-label="Design positions">
      <div class="row">
        <strong>${escapeHtml(live.name || `position ${live.n}`)}</strong>
        <span class="meta">${live.n} of ${positions.length}${Number(data.recommended) === Number(live.n) ? " · recommended" : ""}</span>
      </div>
      ${live.angle ? `<div>${escapeHtml(live.angle)}</div>` : ""}
      ${live.cost ? `<div class="cost">${escapeHtml(live.cost)}</div>` : ""}
      <div class="row">
        <div class="pager">${positions.map((item) => `<button type="button" data-n="${item.n}" data-active="${Number(item.n) === Number(current)}" aria-label="Position ${item.n}: ${escapeHtml(item.name || String(item.n))}" aria-pressed="${Number(item.n) === Number(current)}">${item.n}</button>`).join("")}</div>
        <kbd>← → 1-${positions.length}</kbd>
      </div>
    </div>
  `;
  root.querySelectorAll("button[data-n]").forEach((button) => {
    button.onclick = () => {
      const n = Number(button.dataset.n);
      if (n === current && frame.contentWindow) {
        frame.contentWindow.location.reload();
        return;
      }
      setPosition(n);
    };
  });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

if (embed) {
  document.documentElement.dataset.embed = "true";
  host.hidden = true;
} else {
  host.hidden = false;
}

window.addEventListener("keydown", (event) => {
  if (embed || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
  if (event.key === "ArrowRight") {
    const index = positions.findIndex((item) => Number(item.n) === Number(current));
    setPosition(positions[(index + 1) % positions.length].n);
    event.preventDefault();
  } else if (event.key === "ArrowLeft") {
    const index = positions.findIndex((item) => Number(item.n) === Number(current));
    setPosition(positions[(index - 1 + positions.length) % positions.length].n);
    event.preventDefault();
  } else if (/^[1-9]$/.test(event.key)) {
    const n = Number(event.key);
    if (positions.some((item) => Number(item.n) === n)) {
      setPosition(n);
      event.preventDefault();
    }
  }
});

setPosition(current);
