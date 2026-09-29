/* APEX Modern Components - Next Button runtime (Next Collection)
 * Pointer tracking for the Magnetic float and Holo foil styles: while the pointer is
 * over such a button it sets --amc-mx and --amc-my (numbers from -1 to 1, the pointer
 * offset from the button center) on it; the CSS turns them into movement and light.
 * Listeners are delegated on document, so buttons in refreshed regions keep working.
 * Does nothing on touch-only devices or when reduced motion is requested.
 * Magnetic effect inspired by Magic UI (https://magicui.design, MIT License). */
(function () {
  "use strict";
  if (window.amcNextButton) {
    return;
  }
  window.amcNextButton = { version: "1.0.0" };

  var mq = window.matchMedia;
  if (!mq || !mq("(hover: hover) and (pointer: fine)").matches || mq("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  var SELECTOR = ".amc-NButton--magnetic, .amc-NButton--holo";
  var MAGNET_X = 8; /* px: must match the .5rem x travel in the CSS */
  var MAGNET_Y = 6;
  var current = null;
  var lastX = 0;
  var lastY = 0;
  var pointerX = 0;
  var pointerY = 0;
  var queued = false;

  function clamp(n) {
    return n < -1 ? -1 : (n > 1 ? 1 : n);
  }

  function reset(el) {
    el.style.removeProperty("--amc-mx");
    el.style.removeProperty("--amc-my");
  }

  function update() {
    queued = false;
    if (!current || !current.isConnected) {
      current = null;
      return;
    }
    var r = current.getBoundingClientRect();
    if (!r.width || !r.height) {
      return;
    }
    /* Remove the offset we applied ourselves, so the button does not chase itself. */
    var magnetic = current.classList.contains("amc-NButton--magnetic");
    var cx = r.left + r.width / 2 - (magnetic ? lastX * MAGNET_X : 0);
    var cy = r.top + r.height / 2 - (magnetic ? lastY * MAGNET_Y : 0);
    var x = clamp((pointerX - cx) / (r.width / 2 + 8));
    var y = clamp((pointerY - cy) / (r.height / 2 + 8));
    if (isNaN(x) || isNaN(y)) {
      return;
    }
    lastX = x;
    lastY = y;
    current.style.setProperty("--amc-mx", x.toFixed(3));
    current.style.setProperty("--amc-my", y.toFixed(3));
  }

  document.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") {
      return;
    }
    var target = e.target && e.target.closest ? e.target.closest(SELECTOR) : null;
    if (target !== current) {
      if (current) {
        reset(current);
      }
      current = target;
      lastX = 0;
      lastY = 0;
    }
    if (!current) {
      return;
    }
    pointerX = e.clientX;
    pointerY = e.clientY;
    if (!queued) {
      queued = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });

  document.addEventListener("pointerout", function (e) {
    if (!current) {
      return;
    }
    var to = e.relatedTarget;
    if (!to || !current.contains(to)) {
      reset(current);
      current = null;
    }
  }, { passive: true });
})();
