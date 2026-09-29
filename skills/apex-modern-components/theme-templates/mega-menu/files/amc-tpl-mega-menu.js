/* Mega Menu: list template script. Turns the CSS hover/focus-within panels into a disclosure
   menu: aria-expanded on each trigger, open on click, mouse hover with intent delays, ArrowDown
   into the panel, ArrowLeft/ArrowRight along the bar, Escape closes and returns focus, clicks
   outside close. Without it the panels still open on hover and keyboard focus. */
(function (w, d) {
  "use strict";
  if (w.amcTplMegaMenu) return;
  var ROOT = "amc-TMegaMenu", ITEM = "amc-TMegaMenu-item--mega", TRIGGER = "amc-TMegaMenu-trigger";
  var OPEN_DELAY = 70, CLOSE_DELAY = 220;

  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function trigger(item) { return item.querySelector("." + TRIGGER); }
  function panelLinks(item) { return item.querySelectorAll(".amc-TMegaMenu-panel a[href]"); }

  function init(root) {
    if (root._amcMega) return;
    root._amcMega = true;
    var ts = root.querySelectorAll("." + TRIGGER);
    for (var i = 0; i < ts.length; i++) ts[i].setAttribute("aria-expanded", "false");
    root.classList.add("is-js");
  }
  function initAll() {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }

  function setOpen(item, open) {
    if (!item) return;
    clearTimeout(item._amcTimer);
    if (open) {
      var root = closest(item, ROOT), others = root ? root.querySelectorAll("." + ITEM + ".is-open") : [];
      for (var i = 0; i < others.length; i++) if (others[i] !== item) setOpen(others[i], false);
    }
    item.classList.toggle("is-open", open);
    var t = trigger(item);
    if (t) t.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function later(item, open, ms) {
    clearTimeout(item._amcTimer);
    item._amcTimer = setTimeout(function () { setOpen(item, open); }, ms);
  }
  function closeAll(except) {
    var open = d.querySelectorAll("." + ITEM + ".is-open");
    for (var i = 0; i < open.length; i++) if (!except || !open[i].contains(except)) setOpen(open[i], false);
  }

  d.addEventListener("click", function (e) {
    var t = closest(e.target, TRIGGER), item = t && closest(t, ITEM);
    if (item) {
      init(closest(item, ROOT));
      setOpen(item, !item.classList.contains("is-open"));
      return;
    }
    closeAll(e.target);
  });

  d.addEventListener("pointerover", function (e) {
    if (e.pointerType !== "mouse") return;
    var item = closest(e.target, ITEM);
    if (!item || (e.relatedTarget && item.contains(e.relatedTarget))) return;
    init(closest(item, ROOT));
    var root = closest(item, ROOT);
    later(item, true, root && root.querySelector("." + ITEM + ".is-open") ? 0 : OPEN_DELAY);
  });
  d.addEventListener("pointerout", function (e) {
    if (e.pointerType !== "mouse") return;
    var item = closest(e.target, ITEM);
    if (!item || (e.relatedTarget && item.contains(e.relatedTarget))) return;
    if (item.contains(d.activeElement) && d.activeElement !== trigger(item)) return;
    later(item, false, CLOSE_DELAY);
  });

  d.addEventListener("focusout", function (e) {
    var item = closest(e.target, ITEM);
    if (item && item.classList.contains("is-open") && !(e.relatedTarget && item.contains(e.relatedTarget))) {
      if (e.relatedTarget) setOpen(item, false);
    }
  });

  function barLinks(root) {
    return root.querySelectorAll(".amc-TMegaMenu-bar > .amc-TMegaMenu-item > .amc-TMegaMenu-link");
  }
  d.addEventListener("keydown", function (e) {
    var root = closest(e.target, ROOT);
    if (!root) return;
    init(root);
    var key = e.key, item = closest(e.target, ITEM);
    if (key === "Escape" || key === "Esc") {
      if (item && item.classList.contains("is-open")) {
        setOpen(item, false);
        trigger(item).focus();
        e.preventDefault();
      }
      return;
    }
    var onBar = e.target.classList.contains("amc-TMegaMenu-link");
    if (onBar && (key === "ArrowDown") && item) {
      setOpen(item, true);
      var links = panelLinks(item);
      if (links.length) links[0].focus();
      e.preventDefault();
      return;
    }
    if (onBar && (key === "ArrowRight" || key === "ArrowLeft")) {
      var list = barLinks(root), idx = Array.prototype.indexOf.call(list, e.target);
      var rtl = w.getComputedStyle(root).direction === "rtl";
      var step = (key === "ArrowRight") !== rtl ? 1 : -1;
      var next = list[(idx + step + list.length) % list.length];
      if (next) { closeAll(); next.focus(); e.preventDefault(); }
      return;
    }
    if (!onBar && item && (key === "ArrowDown" || key === "ArrowUp")) {
      var pl = panelLinks(item), i = Array.prototype.indexOf.call(pl, e.target);
      if (i < 0) return;
      var n = pl[i + (key === "ArrowDown" ? 1 : -1)];
      if (n) n.focus(); else if (key === "ArrowUp") trigger(item).focus();
      e.preventDefault();
    }
  });

  if (w.apex && w.apex.jQuery) w.apex.jQuery(d).on("apexafterrefresh", initAll);
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initAll); else initAll();

  w.amcTplMegaMenu = { init: initAll, close: closeAll };
})(window, document);
