/* APEX Modern Components - Next Profile runtime (Next Collection)
 * Pointer tilt for the Tilt Holo ID style. One delegated pointermove listener on document
 * (so refreshed regions keep working) writes parsed numbers into --amc-mx / --amc-my
 * (0-100, pointer position in % of the card, drives the holographic sheen) and
 * --amc-rx / --amc-ry (tilt in degrees), throttled to one update per frame. Mouse and
 * pen only; nothing runs under prefers-reduced-motion. Without this file the card stays
 * a static, slightly tilted ID card. */
(function () {
  "use strict";
  if (window.amcNextProfile || !window.matchMedia || !document.addEventListener) {
    return;
  }

  var TRACKED = ".amc-NProfile--tiltHolo";
  var MAX_TILT = 12;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var hover = window.matchMedia("(hover: hover)");
  var pending = null;
  var active = null;

  function closest(el, selector) {
    while (el && el.nodeType === 1) {
      if ((el.matches || el.msMatchesSelector).call(el, selector)) { return el; }
      el = el.parentNode;
    }
    return null;
  }

  function clamp(n) { return n < 0 ? 0 : (n > 1 ? 1 : n); }

  function reset(root) {
    root.classList.remove("amc-is-active");
    root.style.removeProperty("--amc-mx");
    root.style.removeProperty("--amc-my");
    root.style.removeProperty("--amc-rx");
    root.style.removeProperty("--amc-ry");
  }

  function flush() {
    var e = pending;
    pending = null;
    if (!e) { return; }
    var root = closest(e.target, TRACKED);
    if (active && active !== root) { reset(active); }
    active = root;
    if (!root) { return; }
    var card = root.querySelector(".amc-NProfile-card");
    if (!card) { return; }
    var r = card.getBoundingClientRect();
    if (!r.width || !r.height) { return; }
    var px = clamp((e.clientX - r.left) / r.width);
    var py = clamp((e.clientY - r.top) / r.height);
    root.classList.add("amc-is-active");
    root.style.setProperty("--amc-mx", (px * 100).toFixed(2));
    root.style.setProperty("--amc-my", (py * 100).toFixed(2));
    root.style.setProperty("--amc-rx", ((0.5 - py) * 2 * MAX_TILT).toFixed(2));
    root.style.setProperty("--amc-ry", ((px - 0.5) * 2 * MAX_TILT).toFixed(2));
  }

  document.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch" || reduce.matches || !hover.matches) { return; }
    if (!pending && !active && !closest(e.target, TRACKED)) { return; }
    if (!pending) { window.requestAnimationFrame(flush); }
    pending = e;
  }, { passive: true });

  document.addEventListener("pointerout", function (e) {
    if (!e.relatedTarget && active) { pending = null; reset(active); active = null; }
  });

  window.amcNextProfile = {
    reset: function () { if (active) { reset(active); active = null; } }
  };
})();
