/* APEX Modern Components - Next Card runtime (Next Collection)
 * Pointer tracking for the Spotlight, Tilt 3D and Holo Foil styles. One delegated
 * pointermove listener on document (so refreshed regions keep working) writes parsed
 * numbers into --amc-mx / --amc-my (0-100, pointer position in % of the card) and
 * --amc-rx / --amc-ry (tilt in degrees), throttled to one update per frame. Mouse and
 * pen only; nothing runs under prefers-reduced-motion. Spotlight lights every card of
 * the same report, like Magic UI magic-card (https://github.com/magicuidesign/magicui,
 * MIT License, (c) Magic UI). */
(function () {
  "use strict";
  if (window.amcNextCard || !window.matchMedia || !document.addEventListener) {
    return;
  }

  var TRACKED = ".amc-NCard--spotlight, .amc-NCard--tilt3d, .amc-NCard--holoFoil";
  var MAX_TILT = 10;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var hover = window.matchMedia("(hover: hover)");
  var pending = null;
  var active = [];

  function closest(el, selector) {
    while (el && el.nodeType === 1) {
      if ((el.matches || el.msMatchesSelector).call(el, selector)) { return el; }
      el = el.parentNode;
    }
    return null;
  }

  function clamp(n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); }

  function reset(root) {
    root.classList.remove("amc-is-active");
    root.style.removeProperty("--amc-mx");
    root.style.removeProperty("--amc-my");
    root.style.removeProperty("--amc-rx");
    root.style.removeProperty("--amc-ry");
  }

  function paint(root, x, y) {
    var card = root.querySelector(".amc-NCard-card");
    if (!card) { return; }
    var r = card.getBoundingClientRect();
    if (!r.width || !r.height) { return; }
    var px = (x - r.left) / r.width;
    var py = (y - r.top) / r.height;
    root.classList.add("amc-is-active");
    if (root.classList.contains("amc-NCard--spotlight")) {
      // Unclamped: neighbouring cards light the edge nearest the pointer.
      root.style.setProperty("--amc-mx", (px * 100).toFixed(2));
      root.style.setProperty("--amc-my", (py * 100).toFixed(2));
      return;
    }
    px = clamp(px, 0, 1);
    py = clamp(py, 0, 1);
    root.style.setProperty("--amc-mx", (px * 100).toFixed(2));
    root.style.setProperty("--amc-my", (py * 100).toFixed(2));
    if (root.classList.contains("amc-NCard--tilt3d")) {
      root.style.setProperty("--amc-rx", ((0.5 - py) * 2 * MAX_TILT).toFixed(2));
      root.style.setProperty("--amc-ry", ((px - 0.5) * 2 * MAX_TILT).toFixed(2));
    }
  }

  function groupFor(target) {
    var group = [];
    var list = closest(target, ".amc-NCards--spotlight");
    if (list) {
      group = Array.prototype.slice.call(list.querySelectorAll(".amc-NCard--spotlight"));
    } else {
      var root = closest(target, TRACKED);
      if (root) { group = [root]; }
    }
    return group;
  }

  function flush() {
    var e = pending;
    pending = null;
    if (!e) { return; }
    var group = groupFor(e.target);
    for (var i = 0; i < active.length; i++) {
      if (group.indexOf(active[i]) < 0) { reset(active[i]); }
    }
    for (var j = 0; j < group.length; j++) { paint(group[j], e.clientX, e.clientY); }
    active = group;
  }

  function clearAll() {
    for (var i = 0; i < active.length; i++) { reset(active[i]); }
    active = [];
  }

  document.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch" || reduce.matches || !hover.matches) { return; }
    if (!pending && !active.length && !closest(e.target, TRACKED + ", .amc-NCards--spotlight")) { return; }
    if (!pending) { window.requestAnimationFrame(flush); }
    pending = e;
  }, { passive: true });

  document.addEventListener("pointerout", function (e) {
    if (!e.relatedTarget) { pending = null; clearAll(); }
  });

  window.amcNextCard = { reset: clearAll };
})();
