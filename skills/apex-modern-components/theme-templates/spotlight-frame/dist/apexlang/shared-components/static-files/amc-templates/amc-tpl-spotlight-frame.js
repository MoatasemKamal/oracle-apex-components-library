/* APEX Modern Components - Spotlight Frame region template runtime.
 * One delegated pointermove listener on document (so refreshed and late regions keep working)
 * writes the pointer position in px into --amc-tspot-x / --amc-tspot-y on the hovered
 * .amc-TSpotlightFrame, throttled to one update per animation frame, and adds amc-is-lit.
 * Keyboard focus moves the light to the focused control. Mouse and pen only; nothing runs
 * under prefers-reduced-motion, and without this file the light rests in the start corner.
 * Adapted from Magic UI magic-card (https://github.com/magicuidesign/magicui, MIT License). */
(function () {
  "use strict";
  if (window.amcTplSpotlightFrame || !window.matchMedia || !document.addEventListener || !window.requestAnimationFrame) {
    return;
  }

  var ROOT = "amc-TSpotlightFrame";
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

  function place(root, x, y) {
    var r = root.getBoundingClientRect();
    if (!r.width || !r.height) { return; }
    root.style.setProperty("--amc-tspot-x", (x - r.left).toFixed(1) + "px");
    root.style.setProperty("--amc-tspot-y", (y - r.top).toFixed(1) + "px");
    root.classList.add("amc-is-lit");
  }

  function reset(root) {
    if (!root) { return; }
    root.classList.remove("amc-is-lit");
    root.style.removeProperty("--amc-tspot-x");
    root.style.removeProperty("--amc-tspot-y");
  }

  function flush() {
    var e = pending;
    pending = null;
    if (!e) { return; }
    var root = rootOf(e.target);
    if (active && active !== root) { reset(active); }
    active = root;
    if (root) { place(root, e.clientX, e.clientY); }
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

  document.addEventListener("focusin", function (e) {
    if (reduce.matches) { return; }
    var root = rootOf(e.target);
    if (!root || root === active || e.target === root) { return; }
    var r = e.target.getBoundingClientRect();
    place(root, r.left + r.width / 2, r.top + r.height / 2);
  });

  document.addEventListener("focusout", function (e) {
    var root = rootOf(e.target);
    if (root && root !== active && !root.contains(e.relatedTarget)) { reset(root); }
  });

  window.amcTplSpotlightFrame = { reset: function () { reset(active); active = null; } };
})();
