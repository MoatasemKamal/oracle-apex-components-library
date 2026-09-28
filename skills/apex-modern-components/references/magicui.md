# Magic UI as a Source

[Magic UI](https://magicui.design) is an open-source (MIT) library of about 75 animated
React + Tailwind + Motion components. Its code is published at
<https://github.com/magicuidesign/magicui>, and its official MCP server
(<https://github.com/magicuidesign/mcp>, `@magicuidesign/mcp`, MIT) lets an agent
list, search and fetch components from the live registry.

MIT allows reuse, so we can adapt Magic UI designs in this library. Keep the
attribution: `"source": { "url", "author": "Magic UI", "license": "MIT" }` in
`component.json`, plus the notice line in the CSS/JS header.

## Getting the source

With network access to `magicui.design`, install the MCP server in your agent:

```json
{ "mcpServers": { "magicuidesign-mcp": { "command": "npx", "args": ["-y", "@magicuidesign/mcp@latest"] } } }
```

Then use `searchRegistryItems` / `getRegistryItem` to get a component's source. Without
that access (the registry host is blocked in some environments), clone the repository.
It holds the same registry and the source:

```bash
git clone --depth 1 https://github.com/magicuidesign/magicui.git /tmp/magicui
# component source: /tmp/magicui/apps/www/registry/magicui/<name>.tsx
# registry index:   /tmp/magicui/registry.json
```

Then follow `porting-external-components.md` (JSX to template, Tailwind to `--ut-*`
tokens, Motion to CSS transitions with a reduced-motion override).

## Already ported

| Magic UI | amc component | Notes |
|---|---|---|
| `animated-circular-progress-bar` | **Circular Progress** (`circularProgress`) | SVG ring; value validated in JS before it reaches CSS |
| `avatar-circles` | **Avatar Group** (`avatarGroup`) | Images or initials; `+N` counter row |
| `bento-grid` | **Bento Grid** (`bentoGrid`) | Launchpad tiles with spans; hover reveal only on pointer devices |

## Worth porting for business apps

| Magic UI | APEX target | Effort |
|---|---|---|
| `number-ticker` | Option on Stat Card (small JS file, count-up on load) | small |
| `magic-card` (spotlight follows cursor) | Card template component with pointer-driven CSS variables | small |
| `border-beam`, `shine-border` | Highlight modifier class for cards and regions (CSS only) | small |
| `marquee` | Template component (report) for announcements or partner logos | small |
| `animated-list` | Notification feed (report) with staggered entry | small |
| `dot-pattern`, `grid-pattern`, `striped-pattern` | Region background CSS utilities (hero / login page) | small |
| `file-tree` | Prefer the native APEX Tree region | skip |
| `shimmer-button`, `pulsating-button`, `rainbow-button`, `ripple-button` | Button template options (CSS on `t-Button`) for one primary call to action | medium |
| `animated-theme-toggler` | Dynamic Action plug-in that switches between a light and a dark theme style | medium |
| `globe` (cobe, WebGL) | Region plug-in; bundle `cobe` as a plug-in file; 3D, decorative | large |
| `icon-cloud` (3D tag cloud) | Region plug-in (canvas) | large |

## Not a good fit

Marketing-only effects (`meteors`, `confetti`, `particles`, `retro-grid`, `warp-background`,
`smooth-cursor`, text scramble and morph effects), device mockups (`iphone-15-pro`,
`android`, `safari`), and components tied to React ecosystems (`tweet-card`,
`code-comparison` with shiki). In data-heavy APEX pages they distract, cost performance,
and fail accessibility. Use them only on landing or login pages, always with
reduced-motion handling.
