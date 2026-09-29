/* APEX Modern Components - Next List runtime (Next Collection)
 * Progressive enhancement only; every style is complete without this file.
 *  - spotlightRows: sets --amc-mx / --amc-my (px) on the list from the pointer.
 *  - liftRows: sets --amc-rx / --amc-ry (-1..1) on the hovered row for the tilt.
 *  - marqueeLogos: builds a track with an aria-hidden copy for a seamless loop
 *    (after Magic UI marquee, https://github.com/magicuidesign/magicui, MIT License).
 * Delegated listeners on document, so refreshed regions keep working. Does nothing
 * when the user prefers reduced motion. */
(function () {
  "use strict";
  if (window.amcNextList) {
    return;
  }
  window.amcNextList = { init: function () {} };

  var mq = window.matchMedia;
  if (!mq || mq("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  var canHover = mq("(hover: hover)").matches;

  /* ---------- pointer tracking ---------- */
  var pending = null;
  var tilted = null;

  function closest(el, sel) {
    while (el && el.nodeType === 1) {
      if (el.matches(sel)) { return el; }
      el = el.parentElement;
    }
    return null;
  }

  function resetTilt() {
    if (tilted) {
      tilted.style.removeProperty("--amc-rx");
      tilted.style.removeProperty("--amc-ry");
      tilted = null;
    }
  }

  function frame() {
    var e = pending;
    pending = null;
    if (!e) { return; }
    var spot = closest(e.target, ".amc-NList--spotlightRows .amc-NList-list");
    if (spot) {
      var r = spot.getBoundingClientRect();
      spot.style.setProperty("--amc-mx", Math.round(e.clientX - r.left) + "px");
      spot.style.setProperty("--amc-my", Math.round(e.clientY - r.top) + "px");
    }
    var row = closest(e.target, ".amc-NList--liftRows .amc-NList-item");
    if (row !== tilted) { resetTilt(); }
    if (row) {
      var b = row.getBoundingClientRect();
      var rx = ((e.clientX - b.left) / (b.width || 1)) * 2 - 1;
      var ry = ((e.clientY - b.top) / (b.height || 1)) * 2 - 1;
      rx = Math.max(-1, Math.min(1, rx));
      ry = Math.max(-1, Math.min(1, ry));
      row.style.setProperty("--amc-rx", rx.toFixed(3));
      row.style.setProperty("--amc-ry", ry.toFixed(3));
      tilted = row;
    }
  }

  if (canHover) {
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") { return; }
      if (!pending) { window.requestAnimationFrame(frame); }
      pending = e;
    }, { passive: true });
    document.addEventListener("pointerleave", resetTilt);
  }

  /* ---------- marquee ---------- */
  function hideCopy(el) {
    el.setAttribute("aria-hidden", "true");
    var links = el.querySelectorAll("a, button, [tabindex]");
    Array.prototype.forEach.call(links, function (a) { a.setAttribute("tabindex", "-1"); });
    if (el.hasAttribute("tabindex")) { el.setAttribute("tabindex", "-1"); }
  }

  function buildMarquee(root) {
    root.setAttribute("data-amc-marquee", "Y");
    var list = root.querySelector(".amc-NList-list");
    if (!list || !list.children.length) { return; }
    var items = Array.prototype.slice.call(list.children);
    var track = document.createElement("div");
    track.className = "amc-NList-track";
    list.parentNode.insertBefore(track, list);
    track.appendChild(list);
    root.classList.add("amc-is-marquee");

    // Repeat the rows until one copy is at least as wide as the region.
    var guard = 0;
    while (list.scrollWidth < root.clientWidth && guard < 8) {
      items.forEach(function (li) {
        var c = li.cloneNode(true);
        hideCopy(c);
        list.appendChild(c);
      });
      guard += 1;
    }
    var copy = list.cloneNode(true);
    hideCopy(copy);
    track.appendChild(copy);
    var secs = Math.max(12, Math.min(90, Math.round(list.children.length * 4)));
    root.style.setProperty("--amc-nl-dur", secs + "s");
  }

  function init(scope) {
    var roots = (scope || document).querySelectorAll(".amc-NList--marqueeLogos:not([data-amc-marquee])");
    Array.prototype.forEach.call(roots, buildMarquee);
  }

  var queued = false;
  function start() {
    init(document);
    if (window.MutationObserver) {
      new MutationObserver(function () {
        if (queued) { return; }
        queued = true;
        window.requestAnimationFrame(function () { queued = false; init(document); });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  window.amcNextList = { init: init };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
