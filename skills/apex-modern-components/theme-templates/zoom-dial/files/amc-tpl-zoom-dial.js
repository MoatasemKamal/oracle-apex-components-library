/* Zoom Dial: region template script. Wires the four-step size dial (aria-pressed buttons), sets
   the level class that drives the CSS zoom of the inner wrapper, shows the level and percentage
   in a polite readout, remembers the choice in localStorage per application, page and region,
   and fires a resize so charts redraw at the new size. Where CSS zoom is not supported the dial
   is hidden and the content stays at 100%. */
(function (w, d) {
  "use strict";
  if (w.amcTplZoomDial) return;
  var ROOT = "amc-TZoomDial", LEVELS = 4, DEF = { defCompact: 1, defComfortable: 3, defLarge: 4 };
  var zoomOk = !!(w.CSS && w.CSS.supports && w.CSS.supports("zoom", "1.5"));

  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function part(root, name) { return root.querySelector("." + ROOT + "-" + name); }
  function steps(root) { return root.querySelectorAll("." + ROOT + "-step"); }
  function scope() {
    var a = w.apex && w.apex.env;
    return a && a.APP_ID ? a.APP_ID + ":" + a.APP_PAGE_ID : w.location.pathname;
  }
  function key(root) { return "amc-tpl-zoom-dial:" + scope() + ":" + (root.id || ""); }
  function load(root) {
    try { var v = parseInt(w.localStorage.getItem(key(root)), 10); return v >= 1 && v <= LEVELS ? v : 0; } catch (e) { return 0; }
  }
  function save(root, level) {
    try { w.localStorage.setItem(key(root), String(level)); } catch (e) { /* storage blocked */ }
  }
  function defaultLevel(root) {
    for (var k in DEF) if (DEF.hasOwnProperty(k) && root.classList.contains(ROOT + "--" + k)) return DEF[k];
    return 2;
  }
  function percent(value) {
    var lang = d.documentElement.lang || undefined;
    try { return new Intl.NumberFormat(lang, { style: "percent", maximumFractionDigits: 1 }).format(value); } catch (e) { return Math.round(value * 100) + "%"; }
  }

  function apply(root, level, user) {
    var s = steps(root), i, name = "";
    for (i = 1; i <= LEVELS; i++) root.classList.toggle("is-z" + i, i === level);
    for (i = 0; i < s.length; i++) {
      var on = parseInt(s[i].getAttribute("data-amc-level"), 10) === level;
      s[i].setAttribute("aria-pressed", on ? "true" : "false");
      if (on) name = (s[i].querySelector("." + ROOT + "-name") || s[i]).textContent;
    }
    root._amcLevel = level;
    var z = part(root, "zoom"), r = part(root, "readout");
    var factor = z ? parseFloat(w.getComputedStyle(z).zoom) || 1 : 1;
    if (r) r.textContent = name + " (" + percent(factor) + ")";
    if (user) {
      save(root, level);
      w.requestAnimationFrame(function () {
        w.dispatchEvent(new Event("resize"));
        root.dispatchEvent(new CustomEvent("amczoomdial", { bubbles: true, detail: { level: level, zoom: factor } }));
      });
    }
  }

  function init(root) {
    if (root._amcZoom) return;
    root._amcZoom = true;
    if (!zoomOk) { root.classList.add("is-nozoom"); return; }
    var r = part(root, "readout");
    if (r) r.setAttribute("aria-live", "off"); // do not announce the initial level on page load
    apply(root, load(root) || defaultLevel(root), false);
    root.classList.add("is-ready");
    if (r) setTimeout(function () { r.setAttribute("aria-live", "polite"); }, 400);
  }
  function initAll() {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }

  d.addEventListener("click", function (e) {
    var b = closest(e.target, ROOT + "-step"), root = b && closest(b, ROOT);
    if (!root) return;
    init(root);
    var level = parseInt(b.getAttribute("data-amc-level"), 10);
    if (level >= 1 && level <= LEVELS) apply(root, level, true);
  });
  // Arrow keys, Home and End move along the dial (reading direction aware).
  d.addEventListener("keydown", function (e) {
    var b = closest(e.target, ROOT + "-step"), root = b && closest(b, ROOT);
    if (!root || !root.classList.contains("is-ready")) return;
    var rtl = w.getComputedStyle(root).direction === "rtl", cur = root._amcLevel || 2, next = 0;
    if (e.key === "ArrowRight") next = cur + (rtl ? -1 : 1);
    else if (e.key === "ArrowLeft") next = cur + (rtl ? 1 : -1);
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = LEVELS;
    else return;
    e.preventDefault();
    next = Math.max(1, Math.min(LEVELS, next));
    apply(root, next, true);
    var t = root.querySelector("." + ROOT + "-step[data-amc-level=\"" + next + "\"]");
    if (t) t.focus();
  });
  if (w.apex && w.apex.jQuery) w.apex.jQuery(d).on("apexafterrefresh", initAll);
  if (w.MutationObserver) {
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      w.requestAnimationFrame(function () { pending = false; initAll(); });
    }).observe(d.documentElement, { childList: true, subtree: true });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initAll); else initAll();

  w.amcTplZoomDial = {
    init: initAll,
    set: function (el, level) { var r = closest(el, ROOT); if (r && zoomOk) { init(r); apply(r, Math.max(1, Math.min(LEVELS, level | 0)), true); } },
    get: function (el) { var r = closest(el, ROOT); return r ? r._amcLevel || 0 : 0; }
  };
})(window, document);
