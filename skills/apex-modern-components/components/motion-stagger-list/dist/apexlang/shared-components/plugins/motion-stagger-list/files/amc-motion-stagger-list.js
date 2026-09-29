/* APEX Modern Components - Motion Stagger List runtime
 * Numbers the rows (--i), hides them just before they would be seen, and reveals
 * them in sequence when the list scrolls into view. New markup from a region refresh
 * or pagination is picked up automatically. */
(function () {
  "use strict";
  if (window.amcMotionStaggerList) {
    return;
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var io = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) { return; }
      io.unobserve(en.target);
      window.requestAnimationFrame(function () { en.target.classList.add("amc-is-in"); });
    });
  }, { threshold: 0.1 }) : null;

  function init(scope) {
    var lists = (scope || document).querySelectorAll(".amc-Stagger:not([data-amc-init])");
    Array.prototype.forEach.call(lists, function (list) {
      list.setAttribute("data-amc-init", "Y");
      Array.prototype.forEach.call(list.children, function (item, i) { item.style.setProperty("--i", String(i)); });
      if (reduceMotion || !io) { return; }
      list.classList.add("amc-is-armed");
      void list.offsetWidth; // commit the hidden state before revealing
      io.observe(list);
    });
  }

  function start() {
    init(document);
    new MutationObserver(function () { init(document); }).observe(document.body, { childList: true, subtree: true });
  }

  window.amcMotionStaggerList = { init: init };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
