/* Collapsible Morph: region template script. Toggles .is-collapsed with aria-expanded, measures
   the pill width (--amc-tcm-pill) so the card can morph to it, keeps the body clipped only while
   it animates, applies "Collapsed by default" on load and, with "Remember state", keeps the
   state per page and region in sessionStorage. Without it the region simply stays expanded. */
(function (w, d) {
  "use strict";
  if (w.amcTplCollapsibleMorph) return;
  var ROOT = "amc-TCollapsibleMorph", PILL_PAD = 12;
  var rm = w.matchMedia ? w.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function part(root, name) { return root.querySelector(".amc-TCollapsibleMorph-" + name); }
  function key(root) { return "amc-tcm:" + w.location.pathname + w.location.search.replace(/[?&]session=[^&]*/, "") + ":" + (root.id || ""); }
  function store(root, collapsed) {
    if (!root.classList.contains("amc-TCollapsibleMorph--remember")) return;
    try { w.sessionStorage.setItem(key(root), collapsed ? "1" : "0"); } catch (e) { /* storage blocked */ }
  }
  function stored(root) {
    if (!root.classList.contains("amc-TCollapsibleMorph--remember")) return null;
    try { return w.sessionStorage.getItem(key(root)); } catch (e) { return null; }
  }
  function measure(root) {
    var t = part(root, "toggle");
    if (t) root.style.setProperty("--amc-tcm-pill", Math.ceil(t.getBoundingClientRect().width + PILL_PAD) + "px");
  }
  function settle(root) {
    root.classList.remove("is-animating");
    clearTimeout(root._amcTimer);
  }

  function set(root, collapse, instant) {
    var t = part(root, "toggle"), body = part(root, "body");
    if (!t || !body) return;
    if (collapse === root.classList.contains("is-collapsed")) return;
    instant = instant || (rm && rm.matches);
    if (instant) root.classList.add("is-instant");
    if (collapse) {
      measure(root);
      root.classList.add("is-collapsed");
    } else {
      root.classList.add("is-animating");
      root.classList.remove("is-collapsed");
      clearTimeout(root._amcTimer);
      root._amcTimer = setTimeout(function () { settle(root); w.dispatchEvent(new Event("resize")); }, instant ? 0 : 700);
    }
    t.setAttribute("aria-expanded", collapse ? "false" : "true");
    store(root, collapse);
    if (instant) {
      void root.offsetWidth;
      w.requestAnimationFrame(function () { root.classList.remove("is-instant"); });
    }
  }

  function init(root) {
    if (root._amcMorph) return;
    root._amcMorph = true;
    root.classList.add("is-ready");
    var s = stored(root);
    var collapse = s !== null ? s === "1" : root.classList.contains("amc-TCollapsibleMorph--collapsed");
    if (collapse) set(root, true, true);
  }
  function initAll() {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }

  d.addEventListener("click", function (e) {
    var t = closest(e.target, "amc-TCollapsibleMorph-toggle"), root = t && closest(t, ROOT);
    if (!root) return;
    init(root);
    set(root, !root.classList.contains("is-collapsed"));
  });
  d.addEventListener("transitionend", function (e) {
    if (e.propertyName !== "grid-template-rows" || !e.target.classList.contains("amc-TCollapsibleMorph-body")) return;
    var root = closest(e.target, ROOT);
    if (root && !root.classList.contains("is-collapsed") && root.classList.contains("is-animating")) {
      settle(root);
      w.dispatchEvent(new Event("resize"));
    }
  });
  w.addEventListener("resize", function () {
    var c = d.querySelectorAll("." + ROOT + ".is-collapsed");
    for (var i = 0; i < c.length; i++) {
      c[i].classList.add("is-instant");
      c[i].style.removeProperty("--amc-tcm-pill");
      measure(c[i]);
      void c[i].offsetWidth;
      c[i].classList.remove("is-instant");
    }
  });
  if (w.apex && w.apex.jQuery) w.apex.jQuery(d).on("apexafterrefresh", initAll);
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initAll); else initAll();

  w.amcTplCollapsibleMorph = {
    init: initAll,
    collapse: function (el) { var r = closest(el, ROOT); if (r) { init(r); set(r, true); } },
    expand: function (el) { var r = closest(el, ROOT); if (r) { init(r); set(r, false); } }
  };
})(window, document);
