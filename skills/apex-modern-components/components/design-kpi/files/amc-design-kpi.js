/* APEX Modern Components - Design KPI
 * Ring style: parses data-percent and sets --amc-dkpi-pct on the ring.
 * Spark Bars style: parses data-series (comma-separated numbers) and builds
 * empty bar elements whose height comes from --amc-dkpi-h.
 * Only values that parse as finite numbers ever reach CSS; nothing is written
 * with innerHTML. */
(function () {
  "use strict";
  if (window.amcDesignKpi) {
    return;
  }

  var MAX_BARS = 24;

  function initRing(ring) {
    ring.setAttribute("data-amc-init", "Y");
    var pct = parseFloat(ring.getAttribute("data-percent"));
    pct = isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
    // Two frames so the stroke animates from zero after (re)render.
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        ring.style.setProperty("--amc-dkpi-pct", String(Math.round(pct * 10) / 10));
      });
    });
  }

  function initSpark(spark) {
    spark.setAttribute("data-amc-init", "Y");
    var parts = String(spark.getAttribute("data-series") || "").split(/[,;\s]+/);
    var values = [];
    var i;
    for (i = 0; i < parts.length; i++) {
      if (parts[i] === "") {
        continue;
      }
      var n = parseFloat(parts[i]);
      if (isFinite(n)) {
        values.push(n);
      }
    }
    values = values.slice(-MAX_BARS);
    if (!values.length) {
      spark.setAttribute("data-empty", "Y");
      return;
    }
    var peak = 0;
    for (i = 0; i < values.length; i++) {
      peak = Math.max(peak, Math.abs(values[i]));
    }
    while (spark.firstChild) {
      spark.removeChild(spark.firstChild);
    }
    for (i = 0; i < values.length; i++) {
      var bar = document.createElement("span");
      bar.className = "amc-DKpi-sparkBar" + (i === values.length - 1 ? " is-current" : "");
      // Bars start at zero; a small floor keeps zero values visible as a tick.
      var h = peak > 0 ? Math.max(4, (Math.abs(values[i]) / peak) * 100) : 4;
      bar.style.setProperty("--amc-dkpi-h", String(Math.round(h * 10) / 10));
      spark.appendChild(bar);
    }
  }

  function init(root) {
    var scope = root || document;
    Array.prototype.forEach.call(scope.querySelectorAll(".amc-DKpi-ring:not([data-amc-init])"), initRing);
    Array.prototype.forEach.call(scope.querySelectorAll(".amc-DKpi-spark:not([data-amc-init])"), initSpark);
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

  window.amcDesignKpi = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
