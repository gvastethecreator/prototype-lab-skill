# Prototype Lab — Interface Design

## Design read

Prototype Lab is a frequently used developer workspace for finding, comparing,
reviewing, and shipping browser prototypes. The register is **product**, not
brand theatre. It should feel direct, quiet, exact, and dependable.

Internal calibration:

- `DESIGN_VARIANCE: 2/10`
- `MOTION_INTENSITY: 1/10`
- `VISUAL_DENSITY: 7/10`

The reference is the restraint of Vercel/v0 product chrome and the operational
clarity of Cloudflare dashboards. We borrow principles, not layouts or marks.

## Non-negotiable visual contract

- The canvas is true black: `#000000`.
- Surfaces are differentiated only with nearby black values and spacing.
- Normal interface elements do not use visible borders; focus uses an outline.
- No gradients, glows, glass, backdrop blur, decorative grids, or ambient art.
- Color is reserved for active state, action, links, and semantic status.
- No invented logo. Until a real identity asset exists, use the product name
  with the official Tabler `flask` glyph as a functional product symbol.
- All interface icons are pinned, unmodified Tabler Icons SVGs.
- Cards exist only when they communicate a repeated object or bounded region.

## Palette

### Neutral foundation

| Token | Value | Role |
| --- | --- | --- |
| `--black` | `#000000` | Page canvas and sidebar |
| `--surface-1` | `#080808` | Main working region |
| `--surface-2` | `#0d0d0d` | Panels and cards |
| `--surface-3` | `#141414` | Controls, selected rows, nested regions |
| `--surface-hover` | `#181818` | Hover and pressed surface |
| `--focus` | `#c5f36d` | Keyboard focus outline |
| `--text` | `#ededed` | Primary text |
| `--muted` | `#a1a1a1` | Supporting text |
| `--dim` | `#737373` | Tertiary metadata |

### Functional accents

| Token | Value | Use |
| --- | --- | --- |
| `--accent` | `#c5f36d` | Primary action, selection, and current product context |
| `--blue` | `#3291ff` | Links, comparable data, focus |
| `--violet` | `#a78bfa` | Prompt and generative-input context only |
| `--green` | `#3ecf8e` | Ready, complete, verified |
| `--amber` | `#eab308` | Warning, incomplete evidence |
| `--red` | `#e5484d` | Blocking error |

Accent backgrounds use a solid dark tint when necessary; never a glow or
gradient. Aim for less than ten percent colored area in a typical viewport.
Status always includes text or an icon, never color alone.

## Typography

- Use the local system sans stack for portability.
- Use system monospace for IDs, commands, versions, and model identifiers.
- Page title: 20–24px, semibold, tight but not display-like.
- Section title: 14–16px, semibold.
- Body: 12–13px with 1.45–1.55 line height.
- Metadata: 10–11px; uppercase only for short labels.
- Use tabular numerals for counts and ratios.

## Geometry and elevation

- Working panels: 8px radius.
- Controls and badges: 6px radius.
- Repeated object cards: 8px radius.
- Elevation model: surface tint only for normal product chrome.
- Shadows are limited to the mobile navigation bar, transient toast, and the
  receipt artifact where physical depth communicates its document metaphor.
- Use spacing and surface transitions before another nested container.

## Icon system

- Source: Tabler Icons outline, pinned for the index, comparison hub, and tool
  shell in each runtime-local `icons/manifest.json`.
- Native geometry: 24×24, 2px stroke.
- Render at 16px for controls, 18px for navigation, 20px for entity glyphs.
- Icon-only controls require an accessible name and at least a 24×24px target.
- Icons render from a local registry generated from the original SVG bodies, so
  semantic `currentColor` works under both HTTP and `file://`.

## Shell

### Desktop

- 220px black sidebar with wordmark, five primary destinations, workspace
  status, and local-first note.
- 72px contextual header with current view, concise purpose, search when
  relevant, and one primary action.
- Main content sits on `--surface-1`; there is no decorative background.
- The page stays viewport-bound; dense regions own their scrolling.

### Tablet

- Sidebar becomes a 64px icon rail.
- Two-column metrics and task surfaces stack by priority.
- Labels remain available through accessible names and native title hints.

### Mobile

- Context header remains at the top.
- Navigation becomes a black bottom bar with a visible selected state.
- Content scrolls naturally with safe-area padding.
- Metrics collapse to one column below 480px.

## View-specific composition

### Library

Purpose: locate and open a runnable artifact.

- Compact summary strip: artifact count, evidence coverage, recent activity,
  status distribution.
- Artifact preview is the dominant object.
- Search and grouping stay adjacent to the catalog.
- Model, skill, status, evidence, and stable ID occupy predictable positions.

### Comparisons

Purpose: choose a decision space and build an exact A/B pair.

- Hub selector is a compact rail, not a card gallery.
- Selected hub leads with question, criteria, and one “Open hub” action.
- A/B selection is the strongest control in the view.
- Variants use a semantic table with stable comparable columns.

### Prompts

Purpose: inspect and reuse a versioned input.

- Violet appears only in prompt distribution graphics; interaction remains lime.
- Cards prioritize title and challenge, followed by ID and version.
- “Create from prompt” is explicit and confirms command copying.
- Category and difficulty charts remain compact, factual, and secondary.

### Receipts

Purpose: understand what happened during one recorded task without reading raw
JSON first.

- The selected receipt is rendered as a dark thermal ticket on the black shell.
- Skeuomorphic cues are functional: torn edge means portable record, seal means
  status, barcode means integrity, and instrument gauges summarize captured data.
- The palette remains graphite and lime; there is no separate cream/light theme.
- Prompt, dispatch, build, and verification form one visible factual journey.
- Missing runtime data is printed as `not captured` or an empty instrument state.
- Hashes, worker identity, model route, limitations, and source path remain
  readable and traceable to the canonical receipt schema.

### Health

Purpose: understand blockers and copy the next recovery command.

- Signal summary is restrained and explicitly labelled as a heuristic.
- Issues are ordered by severity in a readable queue.
- Commands are grouped by Create, Inspect, Recover, and Ship.
- Warning/error colors mark only the affected icon, label, or surface tint.

## Charts

- Use only metadata from `prototype-index-data.js`.
- Use flat SVG strokes, bars, and tracks; never gradient fills.
- Use rings only for bounded 0–100 ratios and include the numeric value.
- Bars share a zero baseline and retain text labels/counts.
- Never imply model quality, skill effectiveness, or trends without evidence.
- Health heuristic: `100 - error×20 - warning×8 - info×3`, clamped to 0–100.

## Interaction and accessibility

- Navigation retains tab semantics and supports arrow keys plus Home and End.
- Active view and selected hub remain URL-backed.
- Focus uses a visible 2px lime outline with offset.
- Inputs retain persistent labels on desktop and accessible names everywhere.
- Copy feedback uses a polite live region without moving focus.
- Reduced-motion removes nonessential travel while preserving state feedback.
- Forced-colors mode retains boundaries, selection, and status text.
- No fixed element may obscure focused content or the end of a mobile list.

## Implementation boundaries

- Static HTML, CSS, JavaScript, and relative local assets only.
- Do not import dashboard styling into independent prototype runtimes.
- Do not hand-edit generated workspace copies; change canonical assets and sync.
- Verify all five views at 1440×900 and 390×844; verify dense Library,
  Comparisons, and Receipts layouts at 1024×820.

## Sources

- Vercel Geist: https://vercel.com/geist/stack
- Vercel Geist colors: https://vercel.com/geist/colors
- Cloudflare Custom Dashboards: https://developers.cloudflare.com/analytics/custom-dashboards/
- v0 Design Systems: https://v0.app/docs/design-systems-2
- Tabler Icons: https://tabler.io/icons
- Tabler Icons source: https://github.com/tabler/tabler-icons
