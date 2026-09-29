/* APEX Modern Components - Holo Edge region template runtime.
 * One delegated pointermove listener on document (so refreshed and late regions keep working)
 * writes the pointer position as numbers 0-100 into --amc-thol-px / --amc-thol-py on the
 * hovered .amc-THoloEdge, throttled to one update per animation frame, and adds
 * amc-is-tracking (which pauses the slow CSS drift). Mouse and pen only; nothing runs under
 * prefers-reduced-motion, and without this file the foil still drifts on its own. */
(function () {
  "use strict";
  if (window.amcTplHoloEdge || !window.matchMedia || !document.addEventListener || !window.requestAnimationFrame) {
    return;
  }

  var ROOT = "amc-THoloEdge";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var hover = window.matchMedia("(hover: hover)");
  var pending = null;
  var active = null;

  function rootOf(el) {
    while (el && el.nodeType === 1) {
      if (el.classList && el.classList.contains(ROOT)) { return el; }
      el = el.parentNode;
    }
    return null;
  }

  function clamp(n) { return n < 0 ? 0 : (n > 100 ? 100 : n); }

  function reset(root) {
    if (!root) { return; }
    root.classList.remove("amc-is-tracking");
    root.style.removeProperty("--amc-thol-px");
    root.style.removeProperty("--amc-thol-py");
  }

  function flush() {
    var e = pending;
    pending = null;
    if (!e) { return; }
    var root = rootOf(e.target);
    if (active && active !== root) { reset(active); }
    active = root;
    if (!root) { return; }
    var r = root.getBoundingClientRect();
    if (!r.width || !r.height) { return; }
    root.classList.add("amc-is-tracking");
    root.style.setProperty("--amc-thol-px", clamp((e.clientX - r.left) / r.width * 100).toFixed(1));
    root.style.setProperty("--amc-thol-py", clamp((e.clientY - r.top) / r.height * 100).toFixed(1));
  }

  document.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch" || reduce.matches || !hover.matches) { return; }
    if (!pending && !active && !rootOf(e.target)) { return; }
    if (!pending) { window.requestAnimationFrame(flush); }
    pending = e;
  }, { passive: true });

  document.addEventListener("pointerout", function (e) {
    if (!e.relatedTarget) { pending = null; reset(active); active = null; }
  });

  window.amcTplHoloEdge = { reset: function () { reset(active); active = null; } };
})();
