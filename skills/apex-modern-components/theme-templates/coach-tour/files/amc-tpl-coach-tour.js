/* Coach Tour: a guided tour of the page built from a list. Each entry is a step: Attribute 1 a
   CSS selector of the element to point at (empty = a centred step without a target), the label
   the title, Attribute 2 the text. The tour dims the page, cuts a spotlight around the target
   and shows a coach card with Step 2 of 5, Back, Next and Skip tour. Steps whose target is
   missing or hidden are skipped. It starts by itself once per application and list, unless the
   Manual start option is set; the outcome is kept in localStorage under
     amc-tpl-coach-tour:<appId>:<listId>   { s: "done" | "skipped", t: time, seen: [step indexes] }
   amcTplCoachTour.start() runs it again, amcTplCoachTour.reset() forgets it. Without
   JavaScript the list is a plain checklist of tips. ES5, textContent only. */
(function () {
  "use strict";
  if (window.amcTplCoachTour) { return; }

  var ROOT = "amc-TCoachTour";
  var SLUG = "amc-tpl-coach-tour";
  var C = function (part) { return "." + ROOT + "-" + part; };
  var PAD = 8;       // spotlight margin around the target
  var GAP = 14;      // distance between spotlight and card
  var EDGE = 12;     // minimum distance to the viewport edge
  var THEME_VARS = ["--ut-component-background-color", "--ut-component-text-default-color", "--ut-component-text-muted-color",
    "--ut-component-border-color", "--ut-component-border-radius", "--ut-palette-primary", "--ut-palette-primary-contrast", "--ut-body-background-color"];
  var active = null; // the running tour

  // ------------------------------------------------------------ storage (never throws)
  function storage() {
    try { var s = window.localStorage; s.setItem("amc-tpl-probe", "1"); s.removeItem("amc-tpl-probe"); return s; } catch (e) { return null; }
  }
  function appId() {
    var env = window.apex && window.apex.env;
    if (env && env.APP_ID) { return String(env.APP_ID); }
    return location.pathname.replace(/[^\/]*$/, "");
  }
  function key(root) { return SLUG + ":" + appId() + ":" + (root.getAttribute("data-tour-key") || root.id || "tour"); }
  function readState(root) { var s = storage(); if (!s) { return null; } try { var v = s.getItem(key(root)); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function writeState(root, v) { var s = storage(); if (!s) { return; } try { s.setItem(key(root), JSON.stringify(v)); } catch (e) { /* full or blocked */ } }
  function clearState(root) { var s = storage(); if (!s) { return; } try { s.removeItem(key(root)); } catch (e) { /* ignore */ } }

  function fill(text, map) { return String(text || "").replace(/\{(\w+)\}/g, function (m, k) { return k in map ? map[k] : m; }); }
  function str(root, name, fallback) { return root.getAttribute("data-" + name) || fallback; }
  function reduced() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function printing() { return !!(window.matchMedia && window.matchMedia("print").matches); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) { n.className = cls; } if (text) { n.textContent = text; } return n; }

  // ------------------------------------------------------------ steps
  function tips(root) { return Array.prototype.slice.call(root.querySelectorAll(C("tip"))); }
  function visible(node) {
    if (!node || !node.getBoundingClientRect) { return false; }
    var r = node.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) { return false; }
    var cs = getComputedStyle(node);
    return cs.visibility !== "hidden" && cs.display !== "none";
  }
  function resolve(li) {
    var sel = (li.getAttribute("data-target") || "").trim();
    if (!sel) { return { li: li, target: null }; }
    var node = null;
    try { node = document.querySelector(sel); } catch (e) { return null; } // invalid selector: skip
    if (!node || !visible(node) || node.closest("." + ROOT + "-layer")) { return null; }
    return { li: li, target: node };
  }
  function available(root) {
    var out = [];
    tips(root).forEach(function (li, i) {
      var r = resolve(li);
      li.classList.toggle("is-unavailable", !r);
      if (r) { r.index = i; out.push(r); }
    });
    return out;
  }
  function textOf(li, part) { var n = li.querySelector(C(part)); return n ? n.textContent.replace(/\s+/g, " ").trim() : ""; }

  // ------------------------------------------------------------ layer (built once per tour)
  function buildLayer(root) {
    var id = (root.id || ROOT) + "-coach";
    var layer = el("div", ROOT + "-layer");
    // The layer lives on <body> (no transformed or clipping ancestor); it copies the theme
    // variables and direction of the list so it matches the region it came from.
    var cs = getComputedStyle(root);
    THEME_VARS.forEach(function (v) { var val = cs.getPropertyValue(v); if (val) { layer.style.setProperty(v, val.trim()); } });
    layer.setAttribute("dir", cs.direction === "rtl" ? "rtl" : "ltr");
    ["amc-TCoachTour--pulse", "amc-TCoachTour--docked"].forEach(function (c) { if (root.classList.contains(c)) { layer.classList.add(c.replace(ROOT, ROOT + "-layer")); } });
    var spot = el("div", ROOT + "-spot");
    spot.setAttribute("aria-hidden", "true");
    var card = el("div", ROOT + "-card");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", id + "-title");
    card.setAttribute("aria-describedby", id + "-body");
    card.setAttribute("tabindex", "-1");
    var top = el("div", ROOT + "-cardTop");
    var progress = el("p", ROOT + "-progress");
    var bar = el("div", ROOT + "-bar");
    bar.setAttribute("aria-hidden", "true");
    var close = el("button", ROOT + "-close");
    close.type = "button";
    close.setAttribute("aria-label", str(root, "close", "Close tour"));
    var x = el("span", "fa fa-times");
    x.setAttribute("aria-hidden", "true");
    close.appendChild(x);
    top.appendChild(progress);
    top.appendChild(close);
    var title = el("h2", ROOT + "-title");
    title.id = id + "-title";
    var body = el("p", ROOT + "-body");
    body.id = id + "-body";
    var foot = el("div", ROOT + "-foot");
    var skip = el("button", ROOT + "-skip", str(root, "skip", "Skip tour"));
    skip.type = "button";
    var back = el("button", ROOT + "-back", str(root, "back", "Back"));
    back.type = "button";
    var next = el("button", ROOT + "-next");
    next.type = "button";
    foot.appendChild(skip);
    foot.appendChild(back);
    foot.appendChild(next);
    var live = el("p", ROOT + "-live");
    live.setAttribute("aria-live", "polite");
    card.appendChild(top);
    card.appendChild(bar);
    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(foot);
    card.appendChild(live);
    layer.appendChild(spot);
    layer.appendChild(card);
    document.body.appendChild(layer);
    return { layer: layer, spot: spot, card: card, progress: progress, bar: bar, title: title, body: body, back: back, next: next, skip: skip, live: live };
  }

  // ------------------------------------------------------------ run
  function start(root, opts) {
    if (!root || printing()) { return false; }
    if (active) { finish(active.root === root ? "skipped" : "skipped", true); }
    var steps = available(root);
    if (!steps.length) { return false; }
    var ui = buildLayer(root);
    active = { root: root, steps: steps, i: 0, ui: ui, back: (opts && opts.returnFocus) || document.activeElement, seen: [] };
    // one progress segment per step: the structure encodes the real sequence
    steps.forEach(function () { ui.bar.appendChild(el("span", ROOT + "-seg")); });
    document.documentElement.classList.add(ROOT + "-isTouring");
    show(0, true);
    return true;
  }

  function show(i, first) {
    var a = active;
    if (!a) { return; }
    // a target can disappear while the tour runs (refresh, collapsed region): skip it
    var dir = i >= a.i ? 1 : -1;
    while (i >= 0 && i < a.steps.length && a.steps[i].target && !(document.contains(a.steps[i].target) && visible(a.steps[i].target))) { i += dir; }
    if (i < 0) { i = 0; }
    if (i >= a.steps.length) { finish("done"); return; }
    a.i = i;
    var step = a.steps[i], ui = a.ui, root = a.root, total = a.steps.length;
    var stepText = fill(str(root, "step", "Step {n} of {total}"), { n: i + 1, total: total });
    ui.progress.textContent = stepText;
    var segs = ui.bar.children;
    for (var s = 0; s < segs.length; s++) { segs[s].className = ROOT + "-seg" + (s < i ? " is-done" : s === i ? " is-now" : ""); }
    ui.title.textContent = textOf(step.li, "tipTitle");
    ui.body.textContent = textOf(step.li, "tipBody");
    ui.body.hidden = !ui.body.textContent;
    ui.back.hidden = i === 0;
    ui.next.textContent = i === total - 1 ? str(root, "done", "Done") : str(root, "next", "Next");
    ui.skip.hidden = i === total - 1;
    ui.layer.classList.toggle("is-centred", !step.target);
    tips(root).forEach(function (li) { li.classList.toggle("is-now", li === step.li); });
    step.li.classList.add("is-seen");
    if (a.seen.indexOf(step.index) === -1) { a.seen.push(step.index); }
    if (step.target) {
      try { step.target.scrollIntoView({ block: "center", inline: "nearest", behavior: reduced() ? "auto" : "smooth" }); } catch (e) { step.target.scrollIntoView(); }
    }
    place();
    if (step.target && !reduced()) { window.setTimeout(place, 350); } // after smooth scrolling
    ui.live.textContent = "";
    if (first) {
      ui.card.focus();
    } else {
      // keep the keyboard where it was (Next or Back), announce the new step
      window.setTimeout(function () { if (active) { ui.live.textContent = stepText + ". " + ui.title.textContent; } }, 60);
      if (document.activeElement && (document.activeElement.hidden || !ui.card.contains(document.activeElement))) { ui.next.focus(); }
      if (ui.back.hidden && document.activeElement === ui.back) { ui.next.focus(); }
    }
  }

  function place() {
    var a = active;
    if (!a) { return; }
    var ui = a.ui, step = a.steps[a.i];
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var card = ui.card;
    var docked = ui.layer.classList.contains(ROOT + "-layer--docked") || vw < 640;
    ui.layer.classList.toggle("is-docked", docked && !!step.target);
    if (!step.target) {
      ui.spot.hidden = true;
      card.style.removeProperty("inset-block-start");
      card.style.removeProperty("inset-inline-start");
      return;
    }
    var r = step.target.getBoundingClientRect();
    var sx = Math.max(EDGE / 2, r.left - PAD), sy = Math.max(EDGE / 2, r.top - PAD);
    var sw = Math.min(vw - EDGE / 2, r.right + PAD) - sx, sh = Math.min(vh - EDGE / 2, r.bottom + PAD) - sy;
    ui.spot.hidden = false;
    ui.spot.style.setProperty("transform", "translate(" + Math.round(sx) + "px," + Math.round(sy) + "px)");
    ui.spot.style.setProperty("width", Math.max(0, Math.round(sw)) + "px");
    ui.spot.style.setProperty("height", Math.max(0, Math.round(sh)) + "px");
    if (docked) {
      card.style.removeProperty("inset-block-start");
      card.style.removeProperty("inset-inline-start");
      return;
    }
    var cw = card.offsetWidth, ch = card.offsetHeight;
    var below = sy + sh + GAP, above = sy - GAP - ch;
    var top = below + ch <= vh - EDGE ? below : above >= EDGE ? above : Math.max(EDGE, vh - ch - EDGE);
    var rtl = ui.layer.getAttribute("dir") === "rtl";
    // align the card with the target's inline start, then keep it on screen
    var startX = rtl ? vw - (sx + sw) : sx;
    var left = Math.min(Math.max(EDGE, startX), Math.max(EDGE, vw - cw - EDGE));
    card.style.setProperty("inset-block-start", Math.round(top) + "px");
    card.style.setProperty("inset-inline-start", Math.round(left) + "px");
  }

  function finish(outcome, silent) {
    var a = active;
    if (!a) { return; }
    active = null;
    var prev = readState(a.root) || {};
    var seen = (prev.seen || []).concat(a.seen).filter(function (v, i, arr) { return arr.indexOf(v) === i; });
    writeState(a.root, { s: outcome, t: Date.now(), seen: seen });
    if (a.ui.layer.parentNode) { a.ui.layer.parentNode.removeChild(a.ui.layer); }
    document.documentElement.classList.remove(ROOT + "-isTouring");
    tips(a.root).forEach(function (li) { li.classList.remove("is-now"); });
    refreshHead(a.root);
    if (silent) { return; }
    if (outcome === "done") {
      var status = a.root.querySelector(C("status"));
      if (status) { status.textContent = ""; window.setTimeout(function () { status.textContent = str(a.root, "finished", ""); }, 60); }
    }
    var back = a.back;
    if (!back || !document.contains(back) || back === document.body || !visible(back)) { back = a.root.querySelector(C("start")); }
    if (back && back.focus) { back.focus(); }
  }

  // ------------------------------------------------------------ list head
  function refreshHead(root) {
    var head = root.querySelector(C("head"));
    var btn = root.querySelector(C("start"));
    var meta = root.querySelector(C("headMeta"));
    var st = readState(root);
    var count = available(root).length;
    if (head) { head.hidden = count === 0; }
    if (btn) { btn.textContent = st && st.s ? str(root, "restart", "Take the tour again") : str(root, "start", "Start tour"); }
    if (meta) { meta.textContent = fill(str(root, "count", "{total} tips"), { total: count }); }
    var seen = (st && st.seen) || [];
    tips(root).forEach(function (li, i) { li.classList.toggle("is-seen", seen.indexOf(i) !== -1); });
  }

  function init(root) {
    if (root.amcTctReady) { return; }
    root.amcTctReady = true;
    root.classList.add("is-enhanced");
    refreshHead(root);
    var st = readState(root);
    if (!st && storage() && !root.classList.contains(ROOT + "--manual") && !active && !printing()) {
      // first visit: start once the page has settled; only one tour per page starts by itself
      window.setTimeout(function () {
        if (!active && !readState(root) && document.contains(root) && !printing()) { start(root, { returnFocus: document.activeElement }); }
      }, 700);
    }
  }

  // ------------------------------------------------------------ events
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest) { return; }
    var startBtn = t.closest(C("start"));
    if (startBtn) { start(startBtn.closest("." + ROOT), { returnFocus: startBtn }); return; }
    if (!active || !active.ui.layer.contains(t)) { return; }
    if (t.closest(C("next"))) { show(active.i + 1); }
    else if (t.closest(C("back"))) { show(active.i - 1); }
    else if (t.closest(C("skip")) || t.closest(C("close"))) { finish("skipped"); }
  });
  document.addEventListener("keydown", function (e) {
    if (!active) { return; }
    var card = active.ui.card;
    if (e.key === "Escape" || e.key === "Esc") { e.preventDefault(); finish("skipped"); return; }
    if (e.key === "Tab") {
      var f = Array.prototype.slice.call(card.querySelectorAll("button")).filter(function (b) { return !b.hidden; });
      if (!f.length) { return; }
      var i = f.indexOf(document.activeElement);
      if (i === -1) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
      else if (e.shiftKey && i === 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    } else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && card.contains(document.activeElement)) {
      var fwd = (e.key === "ArrowRight") !== (active.ui.layer.getAttribute("dir") === "rtl");
      e.preventDefault();
      if (fwd) { show(active.i + 1); } else if (active.i > 0) { show(active.i - 1); }
    }
  }, true);
  var raf = 0;
  function onMove() { if (!active || raf) { return; } raf = (window.requestAnimationFrame || window.setTimeout)(function () { raf = 0; place(); }); }
  window.addEventListener("resize", onMove);
  window.addEventListener("scroll", onMove, true);
  window.addEventListener("beforeprint", function () { if (active) { finish("skipped", true); } });

  // ------------------------------------------------------------ lifecycle
  var queued = false;
  function scan() {
    queued = false;
    var roots = document.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) { init(roots[i]); }
    if (active && !document.contains(active.root)) { finish("skipped", true); }
  }
  function queue() { if (queued) { return; } queued = true; (window.requestAnimationFrame || window.setTimeout)(scan); }
  if (window.apex && window.apex.jQuery) { window.apex.jQuery(document).on("apexafterrefresh", queue); }
  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType === 1 && !n.classList.contains(ROOT + "-layer") && (n.classList.contains(ROOT) || (n.querySelector && n.querySelector("." + ROOT + ":not(.is-enhanced)")))) { queue(); return; }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", scan); } else { scan(); }

  function find(ref) {
    if (ref && ref.nodeType === 1) { return ref.classList.contains(ROOT) ? ref : ref.querySelector("." + ROOT); }
    if (typeof ref === "string") { var n = document.getElementById(ref); return n && (n.classList.contains(ROOT) ? n : n.querySelector("." + ROOT)); }
    return document.querySelector("." + ROOT);
  }
  window.amcTplCoachTour = {
    // Runs the tour again, whatever was stored. ref: list id, region static id or element.
    start: function (ref) { return start(find(ref), { returnFocus: document.activeElement }); },
    reset: function (ref) { var r = find(ref); if (r) { clearState(r); refreshHead(r); } },
    close: function () { finish("skipped"); },
    isDone: function (ref) { var r = find(ref); var s = r && readState(r); return !!(s && s.s); },
    key: function (ref) { var r = find(ref); return r ? key(r) : null; }
  };
})();
