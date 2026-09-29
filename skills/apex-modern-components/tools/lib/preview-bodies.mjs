// Stand-ins for native APEX content (report, form, chart, cards, text) that region templates
// wrap in offline previews, plus their CSS. Previews only; APEX renders the real regions.

export const BODIES = {
  report: `<table class="pv-report"><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th class="pv-num">Amount</th></tr></thead><tbody>
<tr><td>SO-55120</td><td>Al Noor Trading</td><td>Shipped</td><td class="pv-num">48,300</td></tr>
<tr><td>SO-55127</td><td>Gulf Medical Supplies</td><td>Picking</td><td class="pv-num">12,780</td></tr>
<tr><td>SO-55131</td><td>Red Sea Logistics</td><td>On hold</td><td class="pv-num">7,450</td></tr></tbody></table>`,
  form: `<div class="pv-form"><label>Customer<input value="Al Noor Trading Co." readonly></label><label>Credit limit<input value="SAR 250,000" readonly></label><label class="pv-wide">Notes<textarea readonly>Net-30 terms. Key account for wholesale electronics.</textarea></label></div>`,
  chart: `<svg class="pv-chart" viewBox="0 0 320 120" role="img" aria-label="Monthly revenue"><g>${[48, 62, 55, 80, 72, 95, 88].map((v, i) => `<rect x="${12 + i * 44}" y="${110 - v}" width="28" height="${v}" rx="4"></rect>`).join("")}</g></svg>`,
  cards: `<div class="pv-cards">${["Open orders|128", "Revenue|SAR 4.2M", "Avg. response|3.4 h"].map((s) => `<div><span>${s.split("|")[0]}</span><strong>${s.split("|")[1]}</strong></div>`).join("")}</div>`,
  text: `<p class="pv-text">Quarter close runs on 30 September. Post all supplier invoices by the 27th so accruals are complete; late items move to October.</p>`
};

export const PREVIEW_BODY_CSS = `/* Stand-ins for native Universal Theme content inside region templates */
.pv-report { width: 100%; border-collapse: collapse; font-size: 13px; }
.pv-report th, .pv-report td { padding: 8px 10px; border-bottom: 1px solid var(--ut-component-border-color); text-align: start; }
.pv-report th { font-weight: 600; color: var(--ut-component-text-muted-color); font-size: 12px; }
.pv-num { text-align: end !important; font-variant-numeric: tabular-nums; }
.pv-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.pv-form label { display: grid; gap: 4px; font-size: 12px; color: var(--ut-component-text-muted-color); }
.pv-form .pv-wide { grid-column: 1 / -1; }
.pv-form input, .pv-form textarea { font: inherit; font-size: 14px; padding: 8px 10px; border-radius: 4px; border: 1px solid var(--ut-component-border-color); background: var(--ut-component-background-color); color: var(--ut-component-text-default-color); }
.pv-chart { width: 100%; height: auto; display: block; } .pv-chart rect { fill: var(--ut-palette-primary); opacity: .85; }
.pv-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
.pv-cards div { display: grid; gap: 2px; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--ut-component-border-color); background: var(--ut-component-background-color); }
.pv-cards span { font-size: 12px; color: var(--ut-component-text-muted-color); } .pv-cards strong { font-size: 18px; }
.pv-text { margin: 0; line-height: 1.5; max-width: 65ch; }
.t-Button { display: inline-flex; align-items: center; padding: 6px 10px; border-radius: 4px; border: 1px solid var(--ut-component-border-color); font: inherit; font-size: 12px; background: var(--ut-component-background-color); color: var(--ut-component-text-default-color); }
.t-Button--hot { background: var(--ut-palette-primary); border-color: transparent; color: var(--ut-palette-primary-contrast, #fff); }
`;
