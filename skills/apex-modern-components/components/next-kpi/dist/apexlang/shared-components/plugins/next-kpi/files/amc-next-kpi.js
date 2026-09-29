/* APEX Modern Components - Next KPI runtime (Next Collection)
 * Ticker, pointer tilt and sparkline ideas adapted from Magic UI
 * (https://github.com/magicuidesign/magicui, MIT License, (c) Magic UI):
 * number-ticker, magic-card. Rebuilt without React / Motion.
 *
 * - Percent: parses data-percent and sets --amc-nkpi-pct (0..100) on the tile.
 * - Series: parses data-series and draws an SVG sparkline or bar elements.
 * - Breakdown: splits "name: value|name: value" into a dl with textContent only.
 * - Ticker: splits Value into odometer wheels; they spin once when the tile
 *   scrolls into view and always come to rest on the real digits.
 * - Tilt: delegated pointermove sets --amc-mx, --amc-my, --amc-rx, --amc-ry.
 * Only parsed numbers reach CSS. Nothing moves under prefers-reduced-motion. */
(function () {
  "use strict";
  if (window.amcNextKpi) {
    return;
  }

  var SVGNS = "http://www.w3.org/2000/svg";
  var MAX_POINTS = 24;
  var mqReduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var mqHover = window.matchMedia ? window.matchMedia("(hover: hover)") : null;

  function reduced() { return !!(mqReduce && mqReduce.matches); }
  function round(n) { return Math.round(n * 100) / 100; }
  function each(scope, sel, fn) {
    Array.prototype.forEach.call(scope.querySelectorAll(sel), fn);
  }

  /* ---------- Percent ---------- */
  function initPercent(card) {
    card.setAttribute("data-amc-pct-init", "Y");
    var pct = parseFloat(card.getAttribute("data-percent"));
    if (!isFinite(pct)) {
      return;
    }
    pct = Math.max(0, Math.min(100, pct));
    // Two frames so the level rises from zero after (re)render.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        card.style.setProperty("--amc-nkpi-pct", String(round(pct)));
      });
    });
  }

  /* ---------- Series ---------- */
  function parseSeries(text) {
    var parts = String(text || "").split(/[,;\s]+/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === "") { continue; }
      var n = parseFloat(parts[i]);
      if (isFinite(n)) { out.push(n); }
    }
    return out.slice(-MAX_POINTS);
  }

  function svgEl(name, attrs) {
    var el = document.createElementNS(SVGNS, name);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) { el.setAttribute(k, attrs[k]); }
    }
    return el;
  }

  function initSpark(spark) {
    spark.setAttribute("data-amc-init", "Y");
    var values = parseSeries(spark.getAttribute("data-series"));
    if (!values.length) {
      spark.setAttribute("data-empty", "Y");
      return;
    }
    while (spark.firstChild) { spark.removeChild(spark.firstChild); }
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var i;
    if (spark.getAttribute("data-kind") === "bars") {
      var peak = Math.max(Math.abs(min), Math.abs(max));
      for (i = 0; i < values.length; i++) {
        var bar = document.createElement("span");
        bar.className = "amc-NKpi-sparkBar" + (i === values.length - 1 ? " is-current" : "");
        var h = peak > 0 ? Math.max(6, (Math.abs(values[i]) / peak) * 100) : 6;
        bar.style.setProperty("--amc-nkpi-h", String(round(h)));
        spark.appendChild(bar);
      }
      return;
    }
    // Line: 100 x 32 viewBox, stretched; the stroke does not scale.
    var span = max - min || 1;
    var n = values.length;
    var pts = [];
    for (i = 0; i < n; i++) {
      var x = n === 1 ? 100 : (i / (n - 1)) * 100;
      var y = 30 - ((values[i] - min) / span) * 26;
      pts.push(round(x) + " " + round(y));
    }
    var line = "M" + pts.join(" L");
    var area = line + " L100 32 L0 32 Z";
    var svg = svgEl("svg", { viewBox: "0 0 100 32", preserveAspectRatio: "none", focusable: "false", "class": "amc-NKpi-sparkSvg" });
    svg.appendChild(svgEl("path", { d: area, "class": "amc-NKpi-sparkArea" }));
    svg.appendChild(svgEl("path", { d: line, "class": "amc-NKpi-sparkLine", pathLength: "1" }));
    // Plot box: the dot is positioned against the SVG area, not the tile padding.
    var plot = document.createElement("span");
    plot.className = "amc-NKpi-sparkPlot";
    plot.appendChild(svg);
    spark.appendChild(plot);
    // End dot is HTML so the stretched viewBox cannot distort it.
    var last = pts[pts.length - 1].split(" ");
    var dot = document.createElement("span");
    dot.className = "amc-NKpi-sparkDot";
    dot.style.setProperty("--amc-nkpi-ex", last[0]);
    dot.style.setProperty("--amc-nkpi-ey", String(round((parseFloat(last[1]) / 32) * 100)));
    plot.appendChild(dot);
  }

  /* ---------- Breakdown ---------- */
  function initBreakdown(el) {
    el.setAttribute("data-amc-init", "Y");
    var items = el.textContent.split("|");
    var dl = document.createElement("dl");
    dl.className = "amc-NKpi-parts";
    var count = 0;
    for (var i = 0; i < items.length; i++) {
      var raw = items[i].replace(/\s+/g, " ").trim();
      if (!raw) { continue; }
      var at = raw.indexOf(":");
      var row = document.createElement("div");
      var dt = document.createElement("dt");
      var dd = document.createElement("dd");
      row.className = "amc-NKpi-part";
      dt.className = "amc-NKpi-partName";
      dd.className = "amc-NKpi-partValue";
      dt.textContent = at > 0 ? raw.slice(0, at).trim() : raw;
      dd.textContent = at > 0 ? raw.slice(at + 1).trim() : "";
      row.appendChild(dt);
      row.appendChild(dd);
      dl.appendChild(row);
      count++;
    }
    if (!count) { return; }
    el.textContent = "";
    el.appendChild(dl);
  }

  /* ---------- Ticker (odometer wheels) ---------- */
  var io = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        io.unobserve(en.target);
        spin(en.target);
      }
    });
  }, { threshold: 0.5 }) : null;

  function initTicker(num) {
    num.setAttribute("data-amc-init", "Y");
    var text = num.textContent.replace(/\s+/g, " ").trim();
    if (!/[0-9]/.test(text)) {
      return;
    }
    var sr = document.createElement("span");
    sr.className = "amc-NKpi-sr";
    sr.textContent = text;
    var reads = document.createElement("span");
    reads.className = "amc-NKpi-reads";
    reads.setAttribute("aria-hidden", "true");
    var digits = 0;
    var i;
    for (i = 0; i < text.length; i++) {
      if (/[0-9]/.test(text.charAt(i))) { digits++; }
    }
    var seen = 0;
    for (i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (/[0-9]/.test(ch)) {
        var d = parseInt(ch, 10);
        var wheel = document.createElement("span");
        var reel = document.createElement("span");
        wheel.className = "amc-NKpi-wheel";
        reel.className = "amc-NKpi-reel";
        for (var k = 0; k < 30; k++) {
          var cell = document.createElement("span");
          cell.className = "amc-NKpi-cell";
          cell.textContent = String(k % 10);
          reel.appendChild(cell);
        }
        // The two right-most wheels turn twice, the rest once, like an odometer.
        var turns = digits - seen <= 2 ? 2 : 1;
        reel.setAttribute("data-amc-from", String(20 + d - 10 * turns));
        reel.setAttribute("data-amc-to", String(20 + d));
        reel.style.setProperty("--amc-nkpi-d", String(20 + d));
        reel.style.setProperty("--amc-nkpi-i", String(seen));
        wheel.appendChild(reel);
        reads.appendChild(wheel);
        seen++;
      } else {
        var glyph = document.createElement("span");
        glyph.className = "amc-NKpi-glyph";
        glyph.textContent = ch === " " ? " " : ch;
        reads.appendChild(glyph);
      }
    }
    num.textContent = "";
    num.appendChild(sr);
    num.appendChild(reads);
    num.classList.add("is-wheels");
    if (!reduced() && io) {
      io.observe(num);
    }
  }

  function spin(num) {
    if (reduced()) { return; }
    var reels = num.querySelectorAll(".amc-NKpi-reel");
    num.classList.add("is-reset");
    Array.prototype.forEach.call(reels, function (r) {
      r.style.setProperty("--amc-nkpi-d", r.getAttribute("data-amc-from"));
    });
    // Force the start position before re-enabling the transition.
    void num.offsetWidth;
    window.requestAnimationFrame(function () {
      num.classList.remove("is-reset");
      Array.prototype.forEach.call(reels, function (r) {
        r.style.setProperty("--amc-nkpi-d", r.getAttribute("data-amc-to"));
      });
    });
  }

  /* ---------- Pointer tilt ---------- */
  var active = null;
  var pending = null;
  var frame = 0;

  function reset(el) {
    el.classList.remove("is-pointer");
    ["--amc-mx", "--amc-my", "--amc-rx", "--amc-ry"].forEach(function (p) { el.style.removeProperty(p); });
  }

  function apply() {
    frame = 0;
    if (!pending) { return; }
    var el = pending.el;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) { return; }
    var x = Math.max(0, Math.min(1, (pending.x - r.left) / r.width));
    var y = Math.max(0, Math.min(1, (pending.y - r.top) / r.height));
    el.style.setProperty("--amc-mx", round(x * 100) + "%");
    el.style.setProperty("--amc-my", round(y * 100) + "%");
    el.style.setProperty("--amc-rx", round((0.5 - y) * 12) + "deg");
    el.style.setProperty("--amc-ry", round((x - 0.5) * 14) + "deg");
    el.classList.add("is-pointer");
  }

  function onMove(e) {
    if (reduced() || (mqHover && !mqHover.matches) || !e.target || !e.target.closest) { return; }
    var el = e.target.closest(".amc-NKpi [data-amc-pointer]");
    if (active && active !== el) { reset(active); }
    active = el;
    if (!el) { pending = null; return; }
    pending = { el: el, x: e.clientX, y: e.clientY };
    if (!frame) { frame = window.requestAnimationFrame(apply); }
  }

  function onOut(e) {
    if (!active) { return; }
    var to = e.relatedTarget;
    if (!to || !active.contains(to)) {
      reset(active);
      active = null;
      pending = null;
    }
  }

  /* ---------- Boot ---------- */
  function init(root) {
    var scope = root || document;
    each(scope, ".amc-NKpi-card[data-percent]:not([data-amc-pct-init])", initPercent);
    each(scope, ".amc-NKpi-spark:not([data-amc-init])", initSpark);
    each(scope, ".amc-NKpi-breakdown:not([data-amc-init])", initBreakdown);
    each(scope, ".amc-NKpi-num[data-amc-ticker]:not([data-amc-init])", initTicker);
  }

  function start() {
    init(document);
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    // Region refresh, lazy loading and pagination insert new markup.
    if (window.MutationObserver) {
      new MutationObserver(function () { init(document); }).observe(document.body, { childList: true, subtree: true });
    }
  }

  window.amcNextKpi = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
