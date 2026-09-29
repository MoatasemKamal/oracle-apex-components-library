/* APEX Modern Components - Motion Count Up runtime
 * Counts each number from zero to its value the first time it scrolls into view,
 * formatted with the page language (Intl.NumberFormat). The final value is exposed
 * to assistive technology up front; the animated digits are aria-hidden. */
(function () {
  "use strict";
  if (window.amcMotionCountUp) {
    return;
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lang = document.documentElement.lang || undefined;

  function formatter(decimals) {
    try {
      return new Intl.NumberFormat(lang, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    } catch (e) {
      return new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
  }

  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function run(el) {
    var target = parseFloat(el.getAttribute("data-amc-count"));
    if (!isFinite(target)) { return; }
    var decimals = parseInt(el.getAttribute("data-amc-decimals"), 10) || 0;
    var duration = (parseFloat(el.getAttribute("data-amc-duration")) || 1.6) * 1000;
    var fmt = formatter(decimals);
    var finalText = fmt.format(target);

    // Screen readers read the final value once; the moving digits are hidden.
    var sr = document.createElement("span");
    sr.className = "amc-u-srOnly";
    sr.textContent = finalText;
    el.parentNode.insertBefore(sr, el);
    el.setAttribute("aria-hidden", "true");

    if (reduceMotion) { el.textContent = finalText; return; }

    el.textContent = fmt.format(0);
    var start = null;
    function step(now) {
      if (start === null) { start = now; }
      var t = Math.min(1, (now - start) / duration);
      el.textContent = fmt.format(target * easeOutExpo(t));
      if (t < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = finalText;
        el.classList.add("amc-is-done");
      }
    }
    window.requestAnimationFrame(step);
  }

  var io = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { io.unobserve(en.target); run(en.target); }
    });
  }, { threshold: 0.4 }) : null;

  function init(scope) {
    var list = (scope || document).querySelectorAll(".amc-CountUp-num:not([data-amc-init])");
    Array.prototype.forEach.call(list, function (el) {
      el.setAttribute("data-amc-init", "Y");
      var target = parseFloat(el.getAttribute("data-amc-count"));
      if (isFinite(target)) {
        var decimals = parseInt(el.getAttribute("data-amc-decimals"), 10) || 0;
        el.textContent = formatter(decimals).format(target); // formatted even before animating
      }
      if (io) { io.observe(el); } else { run(el); }
    });
  }

  function start() {
    init(document);
    new MutationObserver(function () { init(document); }).observe(document.body, { childList: true, subtree: true });
  }

  window.amcMotionCountUp = { init: init };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
