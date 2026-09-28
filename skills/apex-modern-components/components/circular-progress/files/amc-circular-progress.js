/* APEX Modern Components - Circular Progress
 * Design adapted from Magic UI "Animated Circular Progress Bar" (MIT License, (c) Magic UI).
 * Reads data-value / data-max, validates them as numbers and sets --amc-ring-pct.
 * Values never reach CSS unless they parse as finite numbers. */
/* global apex */
(function () {
  "use strict";

  function init(root) {
    var gauges = (root || document).querySelectorAll(".amc-Ring-gauge:not([data-amc-init])");
    Array.prototype.forEach.call(gauges, function (gauge) {
      gauge.setAttribute("data-amc-init", "Y");
      var value = parseFloat(gauge.getAttribute("data-value"));
      var max = parseFloat(gauge.getAttribute("data-max"));
      if (!isFinite(max) || max <= 0) {
        max = 100;
      }
      var pct = isFinite(value) ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
      var center = gauge.querySelector(".amc-Ring-center");
      if (center && !center.textContent.trim() && isFinite(value)) {
        center.textContent = Math.round(pct) + "%";
      }
      // Start at 0 and let the CSS transition run to the real value.
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          gauge.style.setProperty("--amc-ring-pct", String(Math.round(pct * 10) / 10));
        });
      });
    });
  }

  function start() {
    init(document);
    // Region refresh, lazy loading and pagination insert new markup.
    if (window.MutationObserver) {
      new MutationObserver(function () {
        init(document);
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
