/* APEX Modern Components - Next Hero (nextHero) runtime, Next Collection
 * 1. Pointer tracking for the Grid Spotlight and Parallax Layers styles: one
 *    delegated pointermove listener on document writes --amc-mx / --amc-my (px)
 *    and --amc-rx / --amc-ry (-1..1) on the hero, throttled to one update per frame.
 *    Only for (hover: hover) pointers; touch input is ignored.
 * 2. Scroll Reveal: splits the headline into word spans (textContent only) and
 *    numbers them with --amc-i, only where CSS scroll-driven animation exists.
 * Does nothing at all under prefers-reduced-motion. ES5, no dependencies.
 * Grid spotlight and parallax ideas adapted from Magic UI
 * (https://github.com/magicuidesign/magicui), MIT License, (c) Magic UI. */
(function () {
  "use strict";
  if (window.amcNextHero) {
    return;
  }

  var TRACKED = ["amc-NHero--gridSpotlight", "amc-NHero--parallaxLayers"];
  var mqReduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var mqHover = window.matchMedia ? window.matchMedia("(hover: hover)") : null;
  var active = null;
  var pending = null;
  var scheduled = false;

  function reduced() {
    return !!(mqReduce && mqReduce.matches);
  }

  function isTracked(el) {
    for (var i = 0; i < TRACKED.length; i += 1) {
      if (el.classList.contains(TRACKED[i])) {
        return true;
      }
    }
    return false;
  }

  function findHero(node) {
    while (node && node.nodeType === 1) {
      if (node.classList.contains("amc-NHero")) {
        return isTracked(node) ? node : null;
      }
      node = node.parentNode;
    }
    return null;
  }

  function reset(hero) {
    hero.classList.remove("amc-is-tracking");
    hero.style.removeProperty("--amc-mx");
    hero.style.removeProperty("--amc-my");
    hero.style.removeProperty("--amc-rx");
    hero.style.removeProperty("--amc-ry");
  }

  function clamp(n) {
    return n < -1 ? -1 : (n > 1 ? 1 : n);
  }

  function flush() {
    scheduled = false;
    var p = pending;
    pending = null;
    if (!p || p.hero !== active) {
      return;
    }
    var r = p.hero.getBoundingClientRect();
    if (!r.width || !r.height) {
      return;
    }
    var x = p.x - r.left;
    var y = p.y - r.top;
    var rx = clamp((x / r.width) * 2 - 1);
    var ry = clamp((y / r.height) * 2 - 1);
    p.hero.classList.add("amc-is-tracking");
    p.hero.style.setProperty("--amc-mx", Math.round(x) + "px");
    p.hero.style.setProperty("--amc-my", Math.round(y) + "px");
    p.hero.style.setProperty("--amc-rx", rx.toFixed(3));
    p.hero.style.setProperty("--amc-ry", ry.toFixed(3));
  }

  function onMove(e) {
    if (reduced() || (mqHover && !mqHover.matches) || e.pointerType === "touch") {
      return;
    }
    var hero = findHero(e.target);
    if (active && active !== hero) {
      reset(active);
    }
    active = hero;
    if (!hero) {
      return;
    }
    pending = { hero: hero, x: e.clientX, y: e.clientY };
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(flush);
    }
  }

  function onOut(e) {
    if (active && !e.relatedTarget) {
      reset(active);
      active = null;
    }
  }

  function canScrollReveal() {
    return !reduced() && !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: view()"));
  }

  function splitInto(el, startIndex) {
    var text = el.textContent;
    var words = text.split(/\s+/);
    var index = startIndex;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
    for (var i = 0; i < words.length; i += 1) {
      if (!words[i]) {
        continue;
      }
      if (el.childNodes.length) {
        el.appendChild(document.createTextNode(" "));
      }
      var span = document.createElement("span");
      span.className = "amc-NHero-word";
      span.textContent = words[i];
      span.style.setProperty("--amc-i", String(index));
      el.appendChild(span);
      index += 1;
    }
    return index;
  }

  function init(scope) {
    if (!canScrollReveal()) {
      return;
    }
    var titles = (scope || document).querySelectorAll(".amc-NHero--scrollReveal .amc-NHero-title:not([data-amc-split])");
    for (var i = 0; i < titles.length; i += 1) {
      var title = titles[i];
      title.setAttribute("data-amc-split", "Y");
      var n = 0;
      var parts = title.querySelectorAll(".amc-NHero-titleText, .amc-NHero-highlight");
      for (var j = 0; j < parts.length; j += 1) {
        n = splitInto(parts[j], n);
      }
    }
  }

  function start() {
    init(document);
    if (window.MutationObserver) {
      new MutationObserver(function () { init(document); }).observe(document.body, { childList: true, subtree: true });
    }
  }

  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerout", onOut, { passive: true });

  window.amcNextHero = { init: init };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
