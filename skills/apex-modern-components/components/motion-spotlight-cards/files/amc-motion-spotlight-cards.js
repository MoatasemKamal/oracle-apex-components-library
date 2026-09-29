/* APEX Modern Components - Motion Spotlight Cards runtime
 * One pointer listener per grid writes the pointer position, relative to each card,
 * into --mx / --my (throttled to one update per frame). Touch input is ignored. */
(function () {
  "use strict";
  if (window.amcMotionSpotlightCards) {
    return;
  }

  function wire(grid) {
    var cards = function () { return grid.querySelectorAll(".amc-SpotCard"); };
    var pending = null;
    function update() {
      var e = pending;
      pending = null;
      Array.prototype.forEach.call(cards(), function (card) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    }
    grid.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") { return; }
      grid.classList.add("amc-is-lit");
      if (!pending) { window.requestAnimationFrame(update); }
      pending = e;
    });
    grid.addEventListener("pointerleave", function () { grid.classList.remove("amc-is-lit"); });
  }

  function init(scope) {
    var grids = (scope || document).querySelectorAll(".amc-SpotCards:not([data-amc-init])");
    Array.prototype.forEach.call(grids, function (grid) {
      grid.setAttribute("data-amc-init", "Y");
      wire(grid);
    });
  }

  function start() {
    init(document);
    new MutationObserver(function () { init(document); }).observe(document.body, { childList: true, subtree: true });
  }

  window.amcMotionSpotlightCards = { init: init };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
