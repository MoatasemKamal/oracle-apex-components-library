// A small, offline stand-in for a Universal Theme page, used only to preview theme styles.
// It uses real Universal Theme class names (t-Header, t-Body-nav, t-TreeNav, t-Region,
// t-Report, t-Form, t-Button, t-Alert, t-Badge...) so a style's refinements apply to it, and
// "UT-lite" CSS that reads the same --ut-* variables. It is not Universal Theme: always
// confirm a style on a real APEX page.

export const UT_LITE_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; }
body.t-PageBody { font: 14px/1.45 var(--ut-font-family, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif); background: var(--ut-body-background-color); color: var(--ut-body-text-color); min-height: 100vh; }
a { color: var(--ut-link-text-color); }
.t-Header { display: flex; align-items: center; gap: 12px; height: 48px; padding-inline: 12px; background: var(--ut-header-background-color, var(--ut-palette-primary)); color: var(--ut-header-text-color, var(--ut-palette-primary-contrast)); position: sticky; top: 0; z-index: 5; }
.t-Header-controls { display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 4px; background: transparent; border: 0; color: inherit; }
.t-Header-logo { font-weight: 700; font-size: 16px; flex: 1; letter-spacing: -.01em; }
.t-NavigationBar { display: flex; gap: 4px; margin: 0; padding: 0; list-style: none; }
.t-NavigationBar-item a { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 4px; color: inherit; text-decoration: none; font-size: 13px; }
.t-Body { display: grid; grid-template-columns: 220px 1fr; min-height: calc(100vh - 48px); }
.t-Body-nav { background: var(--ut-nav-background-color, var(--ut-component-background-color)); border-inline-end: 1px solid var(--ut-component-border-color); padding-block: 8px; }
.t-TreeNav ul { list-style: none; margin: 0; padding: 0; }
.t-TreeNav a { display: flex; align-items: center; gap: 10px; padding: 9px 16px; color: var(--ut-component-text-default-color); text-decoration: none; }
.t-TreeNav .is-current > a { background: color-mix(in srgb, var(--ut-palette-primary) 12%, transparent); color: var(--ut-palette-primary); font-weight: 600; box-shadow: inset 3px 0 0 var(--ut-palette-primary); }
[dir="rtl"] .t-TreeNav .is-current > a { box-shadow: inset -3px 0 0 var(--ut-palette-primary); }
.t-TreeNav .t-TreeNav-sub a { padding-inline-start: 42px; font-size: 13px; }
.t-Body-content { padding: 16px 20px 32px; min-width: 0; }
.t-Breadcrumb { display: flex; gap: 6px; list-style: none; margin: 0 0 4px; padding: 0; font-size: 12px; color: var(--ut-component-text-muted-color); }
.t-Breadcrumb a { color: inherit; text-decoration: none; }
.t-BreadcrumbRegion-title { margin: 0 0 16px; font-size: 22px; font-weight: 650; }
.t-Grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
.col-12 { grid-column: span 12; } .col-8 { grid-column: span 8; } .col-6 { grid-column: span 6; } .col-4 { grid-column: span 4; } .col-3 { grid-column: span 3; }
@media (max-width: 900px) { .col-8, .col-6, .col-4 { grid-column: span 12; } .col-3 { grid-column: span 6; } .t-Body { grid-template-columns: 1fr; } .t-Body-nav { display: none; } }
.t-Region { background: var(--ut-component-background-color); border: 1px solid var(--ut-component-border-color); border-radius: var(--ut-component-border-radius); box-shadow: var(--ut-component-box-shadow, none); color: var(--ut-component-text-default-color); min-width: 0; }
.t-Region-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--ut-component-border-color); }
.t-Region-title { margin: 0; font-size: 15px; font-weight: 600; flex: 1; }
.t-Region-body { padding: 14px 16px; overflow-x: auto; }
.t-Report-report { width: 100%; border-collapse: collapse; font-size: 13px; }
.t-Report-colHead { text-align: start; font-weight: 600; font-size: 12px; color: var(--ut-component-text-muted-color); padding: 8px 10px; border-bottom: 1px solid var(--ut-component-border-color); }
.t-Report-cell { padding: 8px 10px; border-bottom: 1px solid var(--ut-component-border-color); }
.t-Report-cell.u-tE, .t-Report-colHead.u-tE { text-align: end; font-variant-numeric: tabular-nums; }
.t-Form-fieldContainer { display: grid; gap: 4px; margin-block-end: 12px; }
.t-Form-label { font-size: 12px; color: var(--ut-component-text-muted-color); }
.apex-item-text, .apex-item-select { font: inherit; padding: 8px 10px; border-radius: max(2px, calc(var(--ut-component-border-radius) - 2px)); border: 1px solid var(--ut-field-border-color, var(--ut-component-border-color)); background: var(--ut-field-background-color, var(--ut-component-background-color)); color: var(--ut-component-text-default-color); }
.apex-item-text:focus { outline: 2px solid var(--ut-focus-outline-color, var(--ut-palette-primary)); outline-offset: 1px; }
.t-Button { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 13px; font-weight: 500; padding: 8px 14px; border-radius: max(2px, calc(var(--ut-component-border-radius) - 2px)); border: 1px solid var(--ut-component-border-color); background: var(--ut-button-background-color, var(--ut-component-background-color)); color: var(--ut-component-text-default-color); cursor: pointer; }
.t-Button--hot { background: var(--ut-palette-primary); border-color: transparent; color: var(--ut-palette-primary-contrast); }
.t-ButtonRegion { display: flex; gap: 8px; flex-wrap: wrap; }
.t-Alert { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: var(--ut-component-border-radius); border: 1px solid; font-size: 13px; }
.t-Alert--success { border-color: color-mix(in srgb, var(--ut-palette-success) 40%, transparent); background: color-mix(in srgb, var(--ut-palette-success) 10%, var(--ut-component-background-color)); }
.t-Alert--warning { border-color: color-mix(in srgb, var(--ut-palette-warning) 55%, transparent); background: color-mix(in srgb, var(--ut-palette-warning) 14%, var(--ut-component-background-color)); }
.t-Alert--danger { border-color: color-mix(in srgb, var(--ut-palette-danger) 40%, transparent); background: color-mix(in srgb, var(--ut-palette-danger) 10%, var(--ut-component-background-color)); }
.t-Alert-title { font-weight: 600; margin: 0 0 2px; }
.t-Badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; background: color-mix(in srgb, var(--ut-palette-primary) 14%, transparent); color: var(--ut-palette-primary); }
.t-Badge--success { background: color-mix(in srgb, var(--ut-palette-success) 16%, transparent); color: var(--ut-palette-success); }
.t-Badge--warning { background: color-mix(in srgb, var(--ut-palette-warning) 24%, transparent); color: var(--ut-component-text-default-color); }
.t-Badge--danger { background: color-mix(in srgb, var(--ut-palette-danger) 14%, transparent); color: var(--ut-palette-danger); }
.fa { font-style: normal; }
`;

const ROWS = [
  ["SO-55120", "Al Noor Trading", "Shipped", "success", "48,300"],
  ["SO-55127", "Gulf Medical Supplies", "Picking", "warning", "12,780"],
  ["SO-55131", "Red Sea Logistics", "On hold", "danger", "7,450"],
  ["SO-55138", "Najd Industrial Co.", "Confirmed", "", "31,900"]
];

export function mockPage({ components = "", dir = "ltr" } = {}) {
  return `
<header class="t-Header">
  <button class="t-Header-controls" type="button" aria-label="Main navigation"><span class="fa fa-bars" aria-hidden="true"></span></button>
  <div class="t-Header-logo">Northwind Operations</div>
  <ul class="t-NavigationBar"><li class="t-NavigationBar-item"><a href="#"><span class="fa fa-bell" aria-hidden="true"></span>3</a></li><li class="t-NavigationBar-item"><a href="#"><span class="fa fa-user" aria-hidden="true"></span>M. Kamal</a></li></ul>
</header>
<div class="t-Body">
  <nav class="t-Body-nav" aria-label="Main"><div class="t-TreeNav"><ul>
    <li><a href="#"><span class="fa fa-home" aria-hidden="true"></span>Dashboard</a></li>
    <li class="is-current"><a href="#"><span class="fa fa-shopping-cart" aria-hidden="true"></span>Orders</a></li>
    <li><a href="#"><span class="fa fa-file-text-o" aria-hidden="true"></span>Invoices</a><ul class="t-TreeNav-sub"><li><a href="#">Drafts</a></li><li><a href="#">Overdue</a></li></ul></li>
    <li><a href="#"><span class="fa fa-users" aria-hidden="true"></span>Customers</a></li>
    <li><a href="#"><span class="fa fa-cubes" aria-hidden="true"></span>Inventory</a></li>
    <li><a href="#"><span class="fa fa-bar-chart" aria-hidden="true"></span>Reports</a></li>
  </ul></div></nav>
  <main class="t-Body-content">
    <ol class="t-Breadcrumb"><li><a href="#">Home</a></li><li aria-hidden="true">/</li><li><a href="#">Sales</a></li><li aria-hidden="true">/</li><li>Orders</li></ol>
    <h1 class="t-BreadcrumbRegion-title">Orders</h1>
    <div class="t-Grid">
      ${components ? `<div class="col-12">${components}</div>` : ""}
      <section class="t-Region col-8"><div class="t-Region-header"><h2 class="t-Region-title">Open orders</h2><button class="t-Button t-Button--hot" type="button">New order</button></div>
        <div class="t-Region-body"><table class="t-Report-report"><thead><tr><th class="t-Report-colHead">Order</th><th class="t-Report-colHead">Customer</th><th class="t-Report-colHead">Status</th><th class="t-Report-colHead u-tE">Amount</th></tr></thead><tbody>
        ${ROWS.map((r) => `<tr><td class="t-Report-cell">${r[0]}</td><td class="t-Report-cell">${r[1]}</td><td class="t-Report-cell"><span class="t-Badge${r[3] ? " t-Badge--" + r[3] : ""}">${r[2]}</span></td><td class="t-Report-cell u-tE">${r[4]}</td></tr>`).join("")}
        </tbody></table></div></section>
      <section class="t-Region col-4"><div class="t-Region-header"><h2 class="t-Region-title">Customer</h2></div>
        <div class="t-Region-body">
          <div class="t-Form-fieldContainer"><label class="t-Form-label" for="c-${dir}">Name</label><input id="c-${dir}" class="apex-item-text" value="Al Noor Trading Co."></div>
          <div class="t-Form-fieldContainer"><label class="t-Form-label" for="l-${dir}">Credit limit</label><input id="l-${dir}" class="apex-item-text" value="SAR 250,000"></div>
          <div class="t-ButtonRegion"><button class="t-Button" type="button">Cancel</button><button class="t-Button t-Button--hot" type="button">Save</button></div>
        </div></section>
      <div class="col-4"><div class="t-Alert t-Alert--success"><div><p class="t-Alert-title">Invoice approved</p>INV-20431 was approved by Finance.</div></div></div>
      <div class="col-4"><div class="t-Alert t-Alert--warning"><div><p class="t-Alert-title">Month-end close</p>Post supplier invoices by the 27th.</div></div></div>
      <div class="col-4"><div class="t-Alert t-Alert--danger"><div><p class="t-Alert-title">Credit hold</p>Red Sea Logistics is over its limit.</div></div></div>
    </div>
  </main>
</div>`;
}
