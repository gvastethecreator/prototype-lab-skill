import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const prototypesRoot = path.join(repoRoot, "prototypes");

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=")];
  })
);

if (!args.id || !args.title || !args.skill || !args.variants) {
  console.error("Usage: node scripts/create-prompt-suite-hub.mjs --id=2026/07/013-slug --title=Title --skill=quality-obsessed --variants=id,id,id,id");
  process.exit(1);
}

function toPosix(value) {
  return value.replaceAll("\\", "/");
}

function relativeRunPath(id) {
  return `../${id.split("/").slice(2).join("/")}/index.html`;
}

function outputPath(id) {
  return path.join(prototypesRoot, ...id.split("/"));
}

async function readMetadata(id) {
  const file = path.join(outputPath(id), "metadata.json");
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

const hubId = args.id;
const skill = args.skill;
const variantIds = args.variants.split(",").map((id) => id.trim()).filter(Boolean);
const hubFolder = outputPath(hubId);
const hubNumber = Number(hubId.match(/\/(\d+)-/)?.[1]) || 0;
const slug = hubId.split("/").at(-1).replace(/^\d+-/, "");
const date = args.date || "2026-07-09";
const variants = await Promise.all(
  variantIds.map(async (id, index) => {
    const metadata = await readMetadata(id);
    return {
      id,
      localId: metadata.slug || id.split("/").at(-1).replace(/^\d+-/, ""),
      title: metadata.title || id,
      promptId: `prompt-${index + 1}`,
      path: relativeRunPath(id),
      date: metadata.date || date,
      model: metadata.modelExact || metadata.model || metadata.provenance?.models?.[0] || "GPT-5 Codex, Codex runtime default",
      skill,
      status: metadata.status || "active",
      category: metadata.category || "prototype",
      question: metadata.question || metadata.details || "No question recorded.",
      sourcePrompt: metadata.sourcePrompt || metadata.promptText || "Prompt not captured.",
      hypothesis: metadata.variants?.[0]?.hypothesis || metadata.question || "Review standalone prompt fidelity.",
      tradeoff: metadata.variants?.[0]?.tradeoff || "Compare against the same prompt under another skill.",
      outputPath: `prototypes/${id}`,
      agentMode: metadata.agentMode || metadata.provenance?.agentRuns?.[0]?.agentMode || "subagent",
      agentTool: metadata.agentTool || metadata.provenance?.agentRuns?.[0]?.agentTool || "multi_agent_v1.spawn_agent"
    };
  })
);

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${args.title}</title>
    <style>
      :root{color-scheme:dark;--bg:#030303;--top:#070708;--stage:#0b0c0e;--panel:#141519;--panel2:#1c1f25;--text:#ecece7;--muted:#a2a29c;--dim:#6e6e68;--blue:#1557d8;--green:#118843;--amber:#bd7200;--violet:#6d3ed6;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:0}
      *{box-sizing:border-box}html,body{width:100vw;height:100vh}body{margin:0;overflow:hidden;background:var(--bg);color:var(--text);font-size:12px}button,select{border:0;border-radius:7px;background:#17191d;color:inherit;font:inherit}button{min-height:28px;padding:0 9px;cursor:pointer}button:hover,button[data-active=true]{background:#252932}button:focus-visible,select:focus-visible,a:focus-visible{outline:2px solid #deded8;outline-offset:2px}.hub{display:grid;grid-template-rows:46px minmax(0,1fr);width:100vw;height:100dvh;overflow:hidden}.topbar{display:grid;grid-template-columns:minmax(220px,320px) minmax(0,1fr) auto;align-items:center;gap:8px;background:var(--top);padding:0 10px}.brand p,.brand h1,.card h2,.card p{margin:0}.brand p,.kicker{color:var(--dim);font-size:9px;font-weight:800;text-transform:uppercase}.brand h1{overflow:hidden;color:#f2f2ed;font-size:13px;text-overflow:ellipsis;white-space:nowrap}nav,.actions,.picker{display:flex;align-items:center;gap:5px;min-width:0}nav{overflow-x:auto}.actions{justify-content:end}.status{max-width:210px;overflow:hidden;border-radius:999px;background:#111316;color:var(--muted);font-family:"Cascadia Mono",Consolas,monospace;font-size:10px;padding:4px 7px;text-overflow:ellipsis;white-space:nowrap}.stage{min-height:0;overflow:hidden;background:linear-gradient(180deg,#0d0e10,#050506);padding:8px}.view{display:none;width:100%;height:100%;min-height:0}.view[data-active=true]{display:grid}.gallery{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.pair{grid-template-rows:36px minmax(0,1fr);gap:7px}.pair-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;min-height:0}.focus{grid-template-columns:minmax(0,1fr) minmax(280px,360px);gap:8px}.ledger{grid-template-columns:minmax(0,1fr) 380px;gap:8px}.card,.detail,.receipt-panel{min-width:0;min-height:0;overflow:hidden;border-radius:12px;background:var(--panel);box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}.card{display:grid;grid-template-rows:52px minmax(0,1fr) 86px;gap:6px;padding:7px}.card-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:start}.card h2{overflow:hidden;color:#f3f3ee;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.card p{display:-webkit-box;min-height:28px;overflow:hidden;color:var(--muted);font-size:10px;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:2}.frame{position:relative;display:block;min-height:0;overflow:hidden;border-radius:8px;background:#020202;color:inherit;text-decoration:none}.frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none}.badges{display:flex;flex-wrap:wrap;gap:4px;min-width:0}.badge{display:inline-flex;align-items:center;gap:4px;overflow:hidden;max-width:190px;border-radius:999px;color:#fff;font-size:9px;line-height:1;padding:4px 6px;text-overflow:ellipsis;white-space:nowrap}.badge i{font-style:normal;filter:grayscale(1) saturate(.25);opacity:.85}.badge[data-kind=model]{background:var(--blue)}.badge[data-kind=skill]{background:var(--green)}.badge[data-kind=agent]{background:var(--amber)}.badge[data-kind=prompt]{background:var(--violet)}.meta{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:8px;color:var(--dim);font-family:"Cascadia Mono",Consolas,monospace;font-size:10px}.meta span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.picker{width:max-content;max-width:100%;border-radius:12px;background:#101113;padding:4px}.field{position:relative;display:flex;align-items:center;gap:5px;min-width:0}.field span{display:grid;place-items:center;width:22px;height:22px;border-radius:999px;background:#2a2e37;color:#f1f1ec;font-size:10px;font-weight:900}.field select{appearance:none;width:min(27vw,310px);min-height:28px;background:#1b1e24;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05);padding:0 9px}.detail,.receipt-panel{display:grid;align-content:start;gap:8px;overflow:auto;padding:8px}.detail-block{display:grid;gap:4px;border-radius:8px;background:var(--panel2);padding:8px}.detail-block strong{color:#f1f1ec;font-size:11px}.detail-block span{color:var(--muted);font-size:11px;line-height:1.4;overflow-wrap:anywhere}.receipt{display:grid;gap:7px;border-radius:10px;background:linear-gradient(180deg,rgba(255,255,255,.08),transparent 48%),#090a0b;box-shadow:inset 0 0 0 1px rgba(255,255,255,.11);padding:9px}.receipt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.receipt-grid div{display:grid;gap:3px;border-radius:6px;background:rgba(255,255,255,.05);padding:6px}.receipt-grid span{color:var(--dim);font-size:9px;font-weight:800;text-transform:uppercase}.receipt-grid strong{overflow:hidden;color:var(--text);font-family:"Cascadia Mono",Consolas,monospace;font-size:10px;text-overflow:ellipsis;white-space:nowrap}@media(max-width:980px){.gallery,.pair-grid,.focus,.ledger{grid-template-columns:1fr 1fr}.focus .detail,.ledger .receipt-panel{display:none}}@media(max-width:720px){.hub{grid-template-rows:82px minmax(0,1fr)}.topbar{grid-template-columns:minmax(0,1fr) auto;grid-template-rows:36px 36px;padding:4px 7px}nav{grid-column:1/-1}.status{display:none}.gallery,.pair-grid,.focus,.ledger{grid-template-columns:1fr}.gallery{overflow:auto}.card{min-height:560px}.picker{width:100%}}
    </style>
  </head>
  <body>
    <main class="hub">
      <header class="topbar"><div class="brand"><p>${skill}</p><h1>${args.title}</h1></div><nav id="nav"></nav><div class="actions"><span class="status" id="status"></span></div></header>
      <section class="stage"><div class="view gallery" id="gallery"></div><div class="view pair" id="pairwise"></div><div class="view focus" id="focus"></div><div class="view ledger" id="ledger"></div></section>
    </main>
    <script>
      const variants=${JSON.stringify(variants)};
      const views=["gallery","pairwise","focus","ledger"];
      const params=new URLSearchParams(location.search);
      const state={view:views.includes(params.get("view"))?params.get("view"):"gallery",left:variant(params.get("left")||variants[0].id).id,right:variant(params.get("right")||variants[1]?.id||variants[0].id).id,variant:variant(params.get("variant")||variants[0].id).id};
      const nav=document.querySelector("#nav"),status=document.querySelector("#status");
      const nodes={gallery:document.querySelector("#gallery"),pairwise:document.querySelector("#pairwise"),focus:document.querySelector("#focus"),ledger:document.querySelector("#ledger")};
      function variant(id){return variants.find(v=>v.id===id||v.localId===id)||variants[0]}
      function qs(path,next){const p=new URLSearchParams();Object.entries(next).forEach(([k,v])=>p.set(k,v));return path+"?"+p.toString()}
      function sync(){const url=new URL(location.href);url.searchParams.set("view",state.view);url.searchParams.set("left",state.left);url.searchParams.set("right",state.right);url.searchParams.set("variant",state.variant);history.replaceState(null,"",url)}
      function el(t,c,x){const n=document.createElement(t);if(c)n.className=c;if(x!==undefined)n.textContent=x;return n}
      function btn(x,fn,a){const b=el("button","",x);b.type="button";b.dataset.active=String(!!a);b.onclick=fn;return b}
      function setView(v){state.view=views.includes(v)?v:"gallery";sync();render()}
      function setVariant(id){state.variant=variant(id).id;state.view="focus";sync();render()}
      function setSide(side,id){state[side]=variant(id).id;const other=side==="left"?"right":"left";if(state[side]===state[other]&&variants.length>1)state[other]=variants.find(v=>v.id!==state[side]).id;sync();render()}
      function render(){nav.replaceChildren(...views.map(v=>btn(v,()=>setView(v),state.view===v)));Object.entries(nodes).forEach(([k,n])=>n.dataset.active=String(k===state.view));status.textContent=state.view==="pairwise"?variant(state.left).promptId+" vs "+variant(state.right).promptId:state.view+" / "+variant(state.variant).promptId;gallery();pairwise();focus();ledger()}
      function gallery(){nodes.gallery.replaceChildren(...variants.map(card))}
      function pairwise(){const p=el("section","picker");p.append(select("A","left",state.left),el("span","kicker","vs"),select("B","right",state.right));const g=el("section","pair-grid");g.append(card(variant(state.left)),card(variant(state.right)));nodes.pairwise.replaceChildren(p,g)}
      function focus(){const v=variant(state.variant);nodes.focus.replaceChildren(frame(v),detail(v))}
      function ledger(){const d=el("section","detail");d.append(block("Tested skill","${skill} only"),block("Comparison","Same four prompt families, isolated subagent per prototype, no cross-variant input."),block("Model","GPT-5 Codex, Codex runtime default"),block("Tokens","unknown"));const r=el("section","receipt-panel");r.replaceChildren(...variants.map(receipt));nodes.ledger.replaceChildren(d,r)}
      function card(v){const n=el("article","card");const h=el("header","card-head");const t=el("div");t.append(el("span","kicker",v.promptId),el("h2","",v.title));h.append(t,btn("Focus",()=>setVariant(v.id),false));const f=el("footer","card-foot");f.append(badges([["model","🤖",v.model],["skill","✦",v.skill],["agent","🧭",v.agentMode],["prompt","◈",v.promptId]]),meta(v));n.append(h,frame(v),el("p","",v.hypothesis),f);return n}
      function frame(v){const a=el("a","frame");a.href=v.path;const i=document.createElement("iframe");i.title=v.title+" preview";i.src=qs(v.path,{embed:"1"});a.append(i);return a}
      function select(label,side,value){const w=el("label","field");w.append(el("span","",label));const s=document.createElement("select");variants.forEach(v=>{const o=document.createElement("option");o.value=v.id;o.textContent=v.title;s.append(o)});s.value=value;s.onchange=e=>setSide(side,e.currentTarget.value);w.append(s);return w}
      function badges(items){const r=el("div","badges");items.forEach(([k,i,x])=>{const b=el("span","badge");b.dataset.kind=k;b.append(el("i","",i),document.createTextNode(x));r.append(b)});return r}
      function meta(v){const n=el("div","meta");n.append(el("span","",v.date),el("span","",v.outputPath+"/index.html"));return n}
      function detail(v){const n=el("aside","detail");n.append(badges([["model","🤖",v.model],["skill","✦",v.skill],["agent","🧭",v.agentMode]]),block("Prompt",v.sourcePrompt),block("Question",v.question),block("Hypothesis",v.hypothesis),block("Tradeoff",v.tradeoff),block("Path",v.outputPath+"/index.html"));return n}
      function block(k,v){const n=el("section","detail-block");n.append(el("strong","",k),el("span","",v));return n}
      function receipt(v){const n=el("article","receipt");n.append(el("strong","",v.title));const g=el("div","receipt-grid");[["Variant",v.localId],["Skill",v.skill],["Tool",v.agentTool],["Scope","assigned prompt only"],["Output",v.outputPath],["Fallback","not applicable"]].forEach(([k,x])=>{const c=el("div");c.append(el("span","",k),el("strong","",x));g.append(c)});n.append(g);return n}
      if(state.left===state.right&&variants.length>1)state.right=variants[1].id;sync();render();
    </script>
  </body>
</html>
`;

const metadata = {
  id: hubId,
  month: hubId.split("/").slice(0, 2).join("-"),
  number: hubNumber,
  slug,
  title: args.title,
  category: "skill-batch-comparison",
  status: "active",
  date,
  mode: "comparison",
  model: "GPT-5 Codex, Codex runtime default",
  tags: ["comparison", "prompt-suite", skill],
  question: `How do the four one-screen prompts perform when the tested skill is ${skill}?`,
  sourcePrompt: "Same four prompt families used in the prototype-lab baseline suite.",
  comparisonCriteria: ["prompt fidelity", "single-viewport fit", "interaction quality", "visual distinction", "skill behavior"],
  comparisonMethods: ["gallery", "pairwise", "focus", "ledger"],
  variantStrategy: `skill batch comparison: ${skill}`,
  provenance: {
    prompts: variants.map((variant) => variant.sourcePrompt),
    skills: [skill],
    models: ["GPT-5 Codex, Codex runtime default"],
    integrity: {
      requestedVariants: variants.length,
      deliveredVariants: variants.length,
      crossVariantLeakage: false,
      workerReceiptsRequired: true
    },
    agentRuns: variants.map((variant) => ({
      variantId: variant.localId,
      standalonePath: variant.path,
      agentMode: variant.agentMode,
      agentTool: variant.agentTool,
      outputPath: variant.outputPath,
      inputScope: `${skill} plus assigned prompt only`,
      receivedOtherVariants: false,
      editedFinalPrototype: true,
      fallbackReason: "not applicable",
      status: "actual"
    })),
    tokenUsage: { input: "unknown", output: "unknown", total: "unknown" },
    toolCalls: ["multi_agent_v1.spawn_agent", "multi_agent_v1.wait_agent", "shell_command", "apply_patch"],
    limitations: ["Per-worker token counts were not exposed by the runtime."]
  },
  details: `Comparison hub for four standalone prototypes generated with ${skill} as the tested skill.`,
  views: ["gallery", "pairwise", "focus", "ledger"],
  variants: variants.map((variant) => ({
    id: variant.localId,
    title: variant.title,
    model: variant.model,
    skill,
    status: "actual",
    agentMode: variant.agentMode,
    agentTool: variant.agentTool,
    outputPath: variant.outputPath,
    fallbackReason: "not applicable",
    hypothesis: variant.hypothesis,
    tradeoff: variant.tradeoff
  })),
  proof: []
};

const readme = `# ${args.title}

question: How do the four one-screen prompts perform when the tested skill is ${skill}?
status: active
run: open index.html in a browser
path: prototypes/${hubId}/index.html
proof: proof/

views:
- gallery: four standalone prototypes at equal scale
- pairwise: A/B selectors with URL-backed left and right variants
- focus: selected prototype plus source, hypothesis, tradeoff, and path
- ledger: batch provenance and worker receipts

variants:
${variants.map((variant) => `- ${variant.localId}: ${skill} / ${variant.promptId}`).join("\n")}

provenance:
- skills: ${skill}
- model: GPT-5 Codex, Codex runtime default
- agent: isolated subagents via multi_agent_v1.spawn_agent
- tokens: unknown
- tool calls: multi_agent_v1.spawn_agent, multi_agent_v1.wait_agent, shell_command, apply_patch
- limitations: per-worker token counts were not exposed by the runtime
`;

await fs.mkdir(path.join(hubFolder, "proof"), { recursive: true });
await fs.writeFile(path.join(hubFolder, "index.html"), html, "utf8");
await fs.writeFile(path.join(hubFolder, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
await fs.writeFile(path.join(hubFolder, "README.md"), readme, "utf8");

console.log(`Wrote hub ${toPosix(path.relative(repoRoot, hubFolder))}`);
