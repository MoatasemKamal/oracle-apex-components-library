/* APEX Modern Components - Next Pricing runtime (Next Collection)
 * Pointer spotlight and tilt ideas adapted from Magic UI
 * (https://github.com/magicuidesign/magicui, MIT License, (c) Magic UI):
 * magic-card, border-beam. Rebuilt without React / Motion.
 *
 * - Features: turns the |-separated value into ul/li with textContent only.
 *   Expand Features keeps three items in view and puts the rest in a panel
 *   that opens on hover or focus (CSS).
 * - Spotlight: one pointer lights every card of the list; each card gets
 *   --amc-mx / --amc-my in px relative to itself.
 * - Tilt 3D / Holo Premium: per card --amc-mx, --amc-my (%) and --amc-rx, --amc-ry.
 * Only parsed numbers reach CSS. Pointer effects are off under reduced motion
 * and on devices without hover. */
(function () {
  "use strict";
  if (window.amcNextPricing) {
    return;
  }

  var VISIBLE = 3;
  var mqReduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var mqHover = window.matchMedia ? window.matchMedia("(hover: hover)") : null;

  function round(n) { return Math.round(n * 100) / 100; }

  /* ---------- Features ---------- */
  function makeList(items, extraClass) {
    var list = document.createElement("ul");
    list.className = "amc-NPricing-list" + (extraClass ? " " + extraClass : "");
    items.forEach(function (text) {
      var li = document.createElement("li");
      var mark = document.createElement("span");
      var label = document.createElement("span");
      li.className = "amc-NPricing-feature";
      mark.className = "amc-NPricing-check";
      mark.setAttribute("aria-hidden", "true");
      label.className = "amc-NPricing-featureText";
      label.textContent = text;
      li.appendChild(mark);
      li.appendChild(label);
      list.appendChild(li);
    });
    return list;
  }

  function build(el) {
    el.setAttribute("data-amc-init", "Y");
    var items = el.textContent.split("|")
      .map(function (s) { return s.replace(/\s+/g, " ").trim(); })
      .filter(Boolean);
    if (!items.length) {
      return;
    }
    var root = el.closest(".amc-NPricing");
    var expand = root && root.classList.contains("amc-NPricing--expandFeatures") && items.length > VISIBLE + 1;
    el.textContent = "";
    if (!expand) {
      el.appendChild(makeList(items));
      return;
    }
    el.appendChild(makeList(items.slice(0, VISIBLE)));
    var extra = document.createElement("div");
    var clip = document.createElement("div");
    extra.className = "amc-NPricing-extra";
    clip.className = "amc-NPricing-extraClip";
    clip.appendChild(makeList(items.slice(VISIBLE), "amc-NPricing-list--extra"));
    extra.appendChild(clip);
    el.appendChild(extra);
    // Visual counter only; the hidden items stay in the accessibility tree.
    var more = document.createElement("span");
    more.className = "amc-NPricing-more";
    more.setAttribute("aria-hidden", "true");
    more.textContent = "+" + (items.length - VISIBLE);
    el.appendChild(more);
  }

  function init(root) {
    var nodes = (root || document).querySelectorAll(".amc-NPricing-features:not([data-amc-init])");
    Array.prototype.forEach.call(nodes, build);
  }

  /* ---------- Pointer effects ---------- */
  var active = null; // element that owns the current effect (list or card)
  var pending = null;
  var frame = 0;

  function clear(el) {
    var cards = el.matches("[data-amc-pointer]") ? [el] : el.querySelectorAll("[data-amc-pointer]");
    el.classList.remove("is-pointer");
    Array.prototype.forEach.call(cards, function (c) {
      c.classList.remove("is-pointer");
      ["--amc-mx", "--amc-my", "--amc-rx", "--amc-ry"].forEach(function (p) { c.style.removeProperty(p); });
    });
  }

  function apply() {
    frame = 0;
    if (!pending) { return; }
    var el = pending.el;
    var px = pending.x;
    var py = pending.y;
    if (el.matches("[data-amc-pointer]") && el.getAttribute("data-amc-pointer") !== "spot") {
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) { return; }
      var x = Math.max(0, Math.min(1, (px - r.left) / r.width));
      var y = Math.max(0, Math.min(1, (py - r.top) / r.height));
      el.style.setProperty("--amc-mx", round(x * 100) + "%");
      el.style.setProperty("--amc-my", round(y * 100) + "%");
      el.style.setProperty("--amc-rx", round((0.5 - y) * 10) + "deg");
      el.style.setProperty("--amc-ry", round((x - 0.5) * 12) + "deg");
      el.classList.add("is-pointer");
      return;
    }
    // Spotlight: every card of the list, coordinates relative to each card.
    var cards = el.matches("[data-amc-pointer]") ? [el] : el.querySelectorAll("[data-amc-pointer='spot']");
    Array.prototype.forEach.call(cards, function (c) {
      var cr = c.getBoundingClientRect();
      c.style.setProperty("--amc-mx", round(px - cr.left) + "px");
      c.style.setProperty("--amc-my", round(py - cr.top) + "px");
      c.classList.add("is-pointer");
    });
    el.classList.add("is-pointer");
  }

  function owner(t) {
    if (!t || !t.closest) { return null; }
    return t.closest(".amc-NPricings--spotlight") ||
      t.closest(".amc-NPricing [data-amc-pointer]");
  }

  function onMove(e) {
    if ((mqReduce && mqReduce.matches) || (mqHover && !mqHover.matches)) { return; }
    var el = owner(e.target);
    if (active && active !== el) { clear(active); }
    active = el;
    if (!el) { pending = null; return; }
    pending = { el: el, x: e.clientX, y: e.clientY };
    if (!frame) { frame = window.requestAnimationFrame(apply); }
  }

  function onOut(e) {
    if (!active) { return; }
    var to = e.relatedTarget;
    if (!to || !active.contains(to)) {
      clear(active);
      active = null;
      pending = null;
    }
  }

  function start() {
    init(document);
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    // Region refresh, pagination and lazy loading insert new markup.
    if (window.MutationObserver) {
      new MutationObserver(function () { init(document); }).observe(document.body, { childList: true, subtree: true });
    }
  }

  window.amcNextPricing = { init: init };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
