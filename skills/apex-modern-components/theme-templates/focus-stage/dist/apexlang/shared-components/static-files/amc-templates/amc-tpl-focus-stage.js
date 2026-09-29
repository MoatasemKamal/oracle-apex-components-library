/* Focus Stage: region template script. The Focus button (or, with "Focus on input", focusing a
   field inside the region) puts one region on stage: a scrim is added to <body> (it ignores the
   pointer), everything outside the region along its ancestor path is faded and blurred with a
   class, and the region is lifted above the scrim. If an ancestor forms a stacking context that
   would keep the region under the scrim, that ancestor is lifted instead. Escape, the button, a
   click on the dimmed page or moving focus onto the dimmed page exits. Focus is never trapped and
   nothing is persisted. Popups that APEX appends to <body> later (menus, date pickers, dialogs)
   are not dimmed and do not end focus mode. */
(function (w, d) {
  "use strict";
  if (w.amcTplFocusStage) return;
  var ROOT = "amc-TFocusStage", MUTED = ROOT + "-muted", DEEP = ROOT + "-mutedDeep", UNMUTING = ROOT + "-unmuting",
    LIFT = ROOT + "-lift", LIFT_POS = ROOT + "-liftPos", SKIP = { SCRIPT: 1, STYLE: 1, LINK: 1, TEMPLATE: 1, META: 1, NOSCRIPT: 1 };
  var active = null, scrim = null, scrimTimer = 0;
  var rm = w.matchMedia ? w.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var FIELD = /^(INPUT|SELECT|TEXTAREA)$/;

  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function part(root, name) { return root.querySelector("." + ROOT + "-" + name); }
  function has(root, mod) { return root.classList.contains(ROOT + "--" + mod); }
  function announce(root, attr) {
    var s = part(root, "status"), msg = root.getAttribute(attr) || "";
    if (!s) return;
    s.textContent = "";
    setTimeout(function () { s.textContent = msg; }, 60);
  }
  function rendered(el) { return el.getClientRects().length > 0; }
  function stacking(el) {
    var cs = w.getComputedStyle(el), p = el.parentElement ? w.getComputedStyle(el.parentElement).display : "",
      ours = el.classList.contains(MUTED) || el.classList.contains(UNMUTING); // our own fade is not a stacking context to lift
    return (cs.position !== "static" && cs.zIndex !== "auto") || cs.position === "fixed" || cs.position === "sticky" ||
      cs.transform !== "none" || (!ours && (cs.filter !== "none" || parseFloat(cs.opacity) < 1)) || cs.isolation === "isolate" ||
      cs.perspective !== "none" || (cs.mixBlendMode && cs.mixBlendMode !== "normal") ||
      /paint|layout|strict|content/.test(cs.contain || "") || /transform|opacity|filter/.test(cs.willChange || "") ||
      (cs.zIndex !== "auto" && /flex|grid/.test(p));
  }
  // Offset for the sticky header: the bottom of a fixed or sticky page header above the region.
  function topOffset(root) {
    var r = root.getBoundingClientRect(), x = Math.max(1, Math.min(w.innerWidth - 1, r.left + r.width / 2)), y, el, cs, max = 0;
    if (!d.elementsFromPoint) return 0;
    for (y = 1; y < 160; y += 24) {
      var list = d.elementsFromPoint(x, y);
      for (var i = 0; i < list.length; i++) {
        el = list[i];
        if (root.contains(el) || el === scrim || el === d.body || el === d.documentElement) continue;
        cs = w.getComputedStyle(el);
        if (cs.position === "fixed" || cs.position === "sticky") {
          var b = el.getBoundingClientRect();
          if (b.top <= 1 && b.bottom < w.innerHeight / 3) max = Math.max(max, Math.round(b.bottom));
        }
      }
    }
    return max;
  }

  function ensureScrim() {
    if (scrim && scrim.parentNode) return scrim;
    scrim = d.createElement("div");
    scrim.className = ROOT + "-scrim";
    scrim.setAttribute("aria-hidden", "true");
    d.body.appendChild(scrim);
    return scrim;
  }

  function enter(root) {
    if (active === root) return;
    if (active) exit(active, true);
    // Finish any fade-back first: a half-faded ancestor (opacity < 1) would look like a stacking context.
    var fading = d.querySelectorAll("." + UNMUTING);
    for (var f = 0; f < fading.length; f++) {
      fading[f].classList.remove(UNMUTING);
      if (fading[f].getAnimations) { var an = fading[f].getAnimations(); for (var g = 0; g < an.length; g++) an[g].finish(); }
    }
    var deep = has(root, "deep"), node = root, parent, kids, i, muted = [], lifted = [], outer = null;
    root.style.setProperty("--amc-tfs-top", topOffset(root) + "px"); // before muting: muted parts ignore the pointer
    // Fade everything outside the region along its ancestor path.
    while (node && node !== d.body && node.parentElement) {
      parent = node.parentElement;
      kids = parent.children;
      for (i = 0; i < kids.length; i++) {
        var k = kids[i];
        if (k === node || SKIP[k.tagName] || k === scrim || k.classList.contains(ROOT + "-scrim") || !rendered(k)) continue;
        k.classList.remove(UNMUTING);
        k.classList.add(MUTED);
        if (deep) k.classList.add(DEEP);
        muted.push(k);
      }
      if (parent !== d.body && parent !== d.documentElement && stacking(parent)) outer = parent;
      node = parent;
    }
    // Lift the outermost ancestor that would otherwise keep the region below the scrim.
    if (outer) {
      outer.classList.add(LIFT);
      if (w.getComputedStyle(outer).position === "static") outer.classList.add(LIFT_POS);
      lifted.push(outer);
    }
    root._amcMuted = muted;
    root._amcLifted = lifted;
    var s = ensureScrim();
    clearTimeout(scrimTimer);
    s.classList.toggle("is-deep", deep);
    void s.offsetWidth;
    s.classList.add("is-on");
    root.classList.add("is-staged");
    var t = part(root, "toggle");
    if (t) t.setAttribute("aria-pressed", "true");
    active = root;
    if (root.scrollIntoView) {
      var r = root.getBoundingClientRect();
      if (r.top < 0 || r.top > w.innerHeight * 0.6) root.scrollIntoView({ block: "start", behavior: rm && rm.matches ? "auto" : "smooth" });
    }
    announce(root, "data-amc-msg-on");
    w.dispatchEvent(new CustomEvent("amcfocusstage", { detail: { region: root, staged: true } }));
  }

  function exit(root, silent) {
    if (!root || !root.classList.contains("is-staged")) return;
    var muted = root._amcMuted || [], lifted = root._amcLifted || [], i;
    for (i = 0; i < muted.length; i++) {
      muted[i].classList.remove(MUTED, DEEP);
      muted[i].classList.add(UNMUTING);
    }
    setTimeout(function () { for (var j = 0; j < muted.length; j++) if (!muted[j].classList.contains(MUTED)) muted[j].classList.remove(UNMUTING); }, 400);
    for (i = 0; i < lifted.length; i++) lifted[i].classList.remove(LIFT, LIFT_POS);
    root._amcMuted = root._amcLifted = null;
    root.classList.remove("is-staged");
    root.style.removeProperty("--amc-tfs-top");
    var t = part(root, "toggle");
    if (t) t.setAttribute("aria-pressed", "false");
    if (active === root) active = null;
    if (!silent && scrim) {
      scrim.classList.remove("is-on");
      clearTimeout(scrimTimer);
      scrimTimer = setTimeout(function () { if (!active && scrim && scrim.parentNode) { scrim.parentNode.removeChild(scrim); scrim = null; } }, 400);
    }
    if (!silent) announce(root, "data-amc-msg-off");
    w.dispatchEvent(new CustomEvent("amcfocusstage", { detail: { region: root, staged: false } }));
  }

  function init(root) {
    if (root._amcStage) return;
    root._amcStage = true;
    root.classList.add("is-ready");
  }
  function initAll() {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }

  d.addEventListener("click", function (e) {
    var t = closest(e.target, ROOT + "-toggle"), root = t && closest(t, ROOT);
    if (root) {
      init(root);
      if (root.classList.contains("is-staged")) { root._amcSuppress = true; exit(root); } else enter(root);
      return;
    }
    // A click that falls through the dimmed page lands on an ancestor of the staged region.
    if (active && e.target && e.target.nodeType === 1 && e.target !== active && !active.contains(e.target) && e.target.contains(active)) {
      active._amcSuppress = true;
      exit(active);
    }
  });
  d.addEventListener("keydown", function (e) {
    if (!active || (e.key !== "Escape" && e.key !== "Esc") || e.defaultPrevented) return;
    var t = e.target;
    // Leave Escape to open comboboxes and popups (they are outside the region or say aria-expanded).
    if (t && t.nodeType === 1 && t.getAttribute("aria-expanded") === "true") return;
    if (t && t.nodeType === 1 && !active.contains(t) && !t.contains(active)) return;
    var root = active;
    root._amcSuppress = true;
    exit(root);
  });
  d.addEventListener("focusin", function (e) {
    var t = e.target;
    if (!t || t.nodeType !== 1) return;
    // Tabbing onto the dimmed page ends focus mode (focus is never trapped).
    if (active && !active.contains(t) && closest(t, MUTED)) { exit(active); return; }
    var root = closest(t, ROOT);
    if (!root || !has(root, "auto") || root.classList.contains("is-staged") || root._amcSuppress) return;
    var body = part(root, "body");
    if (body && body.contains(t) && (FIELD.test(t.tagName) || t.isContentEditable) && t.type !== "hidden") { init(root); enter(root); }
  });
  d.addEventListener("focusout", function (e) {
    var root = closest(e.target, ROOT);
    if (root && root._amcSuppress && (!e.relatedTarget || !root.contains(e.relatedTarget))) root._amcSuppress = false;
  });
  if (w.apex && w.apex.jQuery) w.apex.jQuery(d).on("apexafterrefresh", initAll);
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initAll); else initAll();

  w.amcTplFocusStage = {
    init: initAll,
    enter: function (el) { var r = closest(el, ROOT); if (r) { init(r); enter(r); } },
    exit: function () { if (active) exit(active); },
    active: function () { return active; }
  };
})(window, document);
