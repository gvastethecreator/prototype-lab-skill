const canvas = document.querySelector("#prototype-canvas");

function resizePrototypeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    canvas.dispatchEvent(new CustomEvent("prototype:resize", { detail: { width, height, dpr } }));
  }
}

new ResizeObserver(resizePrototypeCanvas).observe(canvas);
resizePrototypeCanvas();
window.PROTOTYPE_PROFILE = { id: "canvas", canvas, resize: resizePrototypeCanvas };
