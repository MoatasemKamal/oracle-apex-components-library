/* Spotlight Grid list template: moves one pointer spotlight across all tiles. It only writes
   --amc-tspot-x / --amc-tspot-y (pixel numbers relative to each tile) on the tiles of the grid
   under the pointer, throttled with requestAnimationFrame. Delegated on document, so refreshed
   List regions keep working; does nothing for touch or under reduced motion. The template is
   complete without it. Technique adapted from Magic UI magic-card (MIT). */
(function () {
  "use strict";
  if (window.amcTplSpotlightGrid) { return; }
  window.amcTplSpotlightGrid = true;

  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var pending = null;
  var frame = 0;

  function gridOf(el) {
    while (el && el !== document) {
      if (el.classList && el.classList.contains("amc-TSpotlightGrid-grid")) { return el; }
      el = el.parentNode;
    }
    return null;
  }
  function paint() {
    frame = 0;
    var p = pending;
    pending = null;
    if (!p) { return; }
    var tiles = p.grid.querySelectorAll(".amc-TSpotlightGrid-link");
    for (var i = 0; i < tiles.length; i++) {
      var r = tiles[i].getBoundingClientRect();
      tiles[i].style.setProperty("--amc-tspot-x", Math.round(p.x - r.left) + "px");
      tiles[i].style.setProperty("--amc-tspot-y", Math.round(p.y - r.top) + "px");
    }
  }
  document.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch" || (reduce && reduce.matches)) { return; }
    var grid = gridOf(e.target);
    if (!grid) { return; }
    pending = { grid: grid, x: e.clientX, y: e.clientY };
    if (!frame) { frame = window.requestAnimationFrame(paint); }
  }, { passive: true });
})();
