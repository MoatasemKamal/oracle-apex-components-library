/* Liquid Tabs: list template script. Adds an SVG goo filter once, then moves two blobs
   (--amc-tlt-x / --amc-tlt-w) to the hovered or focused tab and back to the current tab.
   Does nothing under prefers-reduced-motion: the CSS static pill stays. */
(function (w, d) {
  "use strict";
  if (w.amcTplLiquidTabs) return;
  var ROOT = "amc-TLiquidTabs", LINK = "amc-TLiquidTabs-link", SVGNS = "http://www.w3.org/2000/svg";
  var rm = w.matchMedia ? w.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var ro = w.ResizeObserver ? new w.ResizeObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) schedule(closest(entries[i].target, ROOT));
  }) : null;
  var queued = [], raf = 0;

  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function svg(tag, attrs) {
    var el = d.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
    return el;
  }
  function goo(id, blur, mul, off) {
    var f = svg("filter", { id: id, x: "-20%", y: "-50%", width: "140%", height: "200%", "color-interpolation-filters": "sRGB" });
    f.appendChild(svg("feGaussianBlur", { "in": "SourceGraphic", stdDeviation: blur, result: "b" }));
    f.appendChild(svg("feColorMatrix", { "in": "b", mode: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 " + mul + " " + off, result: "g" }));
    f.appendChild(svg("feComposite", { "in": "SourceGraphic", in2: "g", operator: "atop" }));
    return f;
  }
  function ensureFilter() {
    if (d.getElementById("amc-tliquidtabs-goo")) return;
    var s = svg("svg", { "aria-hidden": "true", focusable: "false", width: "0", height: "0" });
    s.style.position = "absolute";
    s.style.inlineSize = "0";
    s.style.blockSize = "0";
    s.style.overflow = "hidden";
    s.appendChild(goo("amc-tliquidtabs-goo", "7", "20", "-8"));
    s.appendChild(goo("amc-tliquidtabs-goo-s", "2.5", "14", "-5"));
    d.body.appendChild(s);
  }
  function current(root) { return root.querySelector("." + LINK + "[aria-current]"); }

  function place(root, link) {
    var rail = root.querySelector(".amc-TLiquidTabs-rail");
    var blobs = root.querySelectorAll(".amc-TLiquidTabs-blob");
    var lit = root.querySelectorAll("." + LINK + ".is-lit");
    for (var i = 0; i < lit.length; i++) if (lit[i] !== link) lit[i].classList.remove("is-lit");
    var x = 0, wd = 0;
    if (link && rail) {
      var rr = rail.getBoundingClientRect(), lr = link.getBoundingClientRect();
      var rtl = w.getComputedStyle(root).direction === "rtl";
      x = rtl ? lr.right - rr.right : lr.left - rr.left;
      wd = lr.width;
      link.classList.add("is-lit");
    }
    for (var j = 0; j < blobs.length; j++) {
      blobs[j].style.setProperty("--amc-tlt-x", x.toFixed(2) + "px");
      blobs[j].style.setProperty("--amc-tlt-w", wd.toFixed(2) + "px");
    }
    root._amcTarget = link;
  }

  function reveal(root) {
    var link = current(root), sc = root.querySelector(".amc-TLiquidTabs-scroller");
    if (!link || !sc || sc.scrollWidth <= sc.clientWidth) return;
    var lr = link.getBoundingClientRect(), sr = sc.getBoundingClientRect();
    var prev = sc.style.scrollBehavior;
    sc.style.scrollBehavior = "auto";
    sc.scrollLeft += (lr.left + lr.width / 2) - (sr.left + sr.width / 2);
    sc.style.scrollBehavior = prev;
  }

  function init(root) {
    if (!root || root._amcLiquid) return;
    if (!root._amcRevealed) { root._amcRevealed = true; reveal(root); }
    if (rm && rm.matches) return;
    root._amcLiquid = true;
    ensureFilter();
    root.classList.add("is-instant", "is-liquid");
    place(root, current(root));
    void root.offsetWidth;
    w.requestAnimationFrame(function () { w.requestAnimationFrame(function () { root.classList.remove("is-instant"); }); });
    if (ro) ro.observe(root.querySelector(".amc-TLiquidTabs-rail") || root);
  }
  function initAll() {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }

  function schedule(root) {
    if (!root || !root._amcLiquid) return;
    if (queued.indexOf(root) < 0) queued.push(root);
    if (raf) return;
    raf = w.requestAnimationFrame(function () {
      raf = 0;
      var list = queued; queued = [];
      for (var i = 0; i < list.length; i++) {
        list[i].classList.add("is-instant");
        place(list[i], list[i]._amcTarget && d.contains(list[i]._amcTarget) ? list[i]._amcTarget : current(list[i]));
        void list[i].offsetWidth;
        list[i].classList.remove("is-instant");
      }
    });
  }

  function follow(e) {
    var link = closest(e.target, LINK), root = link && closest(link, ROOT);
    if (!root) return;
    init(root);
    if (root._amcLiquid && root._amcTarget !== link) place(root, link);
  }
  function back(e) {
    var root = closest(e.target, ROOT);
    if (!root || !root._amcLiquid) return;
    if (e.relatedTarget && root.contains(e.relatedTarget)) return;
    var focused = e.type === "pointerout" ? closest(d.activeElement, LINK) : null;
    place(root, focused && root.contains(focused) ? focused : current(root));
  }

  d.addEventListener("pointerover", function (e) { if (e.pointerType !== "touch") follow(e); });
  d.addEventListener("pointerout", back);
  d.addEventListener("focusin", follow);
  d.addEventListener("focusout", back);
  w.addEventListener("resize", function () {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) schedule(roots[i]);
  });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { w.dispatchEvent(new Event("resize")); });
  if (w.apex && w.apex.jQuery) w.apex.jQuery(d).on("apexafterrefresh", initAll);
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initAll); else initAll();

  w.amcTplLiquidTabs = { init: initAll };
})(window, document);
