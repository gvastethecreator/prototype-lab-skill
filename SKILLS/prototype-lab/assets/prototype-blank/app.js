const artifact = window.PROTOTYPE_ARTIFACT_DATA || {};

document.title = artifact.title || "Prototype artifact";
document.documentElement.dataset.embed = String(new URLSearchParams(location.search).get("embed") === "1");
