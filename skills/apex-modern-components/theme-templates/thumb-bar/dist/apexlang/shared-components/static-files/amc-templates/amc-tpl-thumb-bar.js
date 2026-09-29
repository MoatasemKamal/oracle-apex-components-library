/* Thumb Bar: the page's main actions as a bottom bar on phones (Fitts's law: the primary action
   is the largest target, in the thumb zone at the bottom inline-end corner; secondary actions
   are compact; the rest wait in a bottom sheet) and as an inline action row on wider screens.
   This file: picks the primary entry (Attribute 2 = primary, else the first), puts it last in
   the DOM so focus order matches what is seen, moves what does not fit (and Attribute 2 =
   overflow) into the More sheet, runs the sheet (focus, Escape, swipe down) and pads the page
   body so the floating bar never covers content. ES5, textContent only. */
(function () {
  "use strict";
  if (window.amcTplThumbBar) { return; }

  var ROOT = "amc-TThumbBar";
  var C = function (part) { return "." + ROOT + "-" + part; };
  var SLOT = 64;          // smallest secondary target width in px
  var PRIMARY_MIN = 150;  // primary keeps at least this width
  var PAD = ROOT + "-pad";
  var mq = window.matchMedia ? window.matchMedia("(max-width: 39.99em)") : null;

  function phone() { return mq ? mq.matches : window.innerWidth < 640; }
  function floating(root) { return phone() && !root.classList.contains(ROOT + "--static"); }
  function items(ul) { return Array.prototype.slice.call(ul ? ul.children : []).filter(function (li) { return li.classList.contains(ROOT + "-item") && !li.classList.contains("is-moreSlot"); }); }

  // ------------------------------------------------------------ structure
  function prepare(root) {
    var list = root.querySelector(C("list"));
    var all = items(list);
    if (!all.length) { return false; }
    var primary = all.filter(function (li) { return li.classList.contains(ROOT + "-item--primary"); })[0] || all[0];
    all.forEach(function (li, i) {
      li.amcTtbIndex = i;
      li.classList.toggle("is-primary", li === primary);
      li.classList.toggle("is-overflowOnly", li !== primary && li.classList.contains(ROOT + "-item--overflow"));
    });
    root.amcTtbPrimary = primary;
    root.amcTtbAll = all;
    // The More button lives in its own list slot so the bar is one flex row.
    var more = root.querySelector(C("moreBtn"));
    var slot = document.createElement("li");
    slot.className = ROOT + "-item is-moreSlot";
    slot.hidden = true;
    if (more) { more.hidden = false; slot.appendChild(more); }
    root.amcTtbMoreSlot = slot;
    return true;
  }

  function layout(root) {
    var list = root.querySelector(C("list"));
    var sheetList = root.querySelector(C("sheetList"));
    if (!list || !root.amcTtbAll) { return; }
    var primary = root.amcTtbPrimary;
    var secondaries = root.amcTtbAll.filter(function (li) { return li !== primary; });
    var bar = [], sheet = [];
    if (floating(root) || (phone() && root.classList.contains(ROOT + "--static"))) {
      var width = list.getBoundingClientRect().width || root.getBoundingClientRect().width || window.innerWidth;
      var cap = root.classList.contains(ROOT + "--iconOnly") ? 4 : 3;
      var slotW = root.classList.contains(ROOT + "--iconOnly") ? 54 : SLOT;
      var primaryMin = root.classList.contains(ROOT + "--iconOnly") ? 128 : PRIMARY_MIN;
      var fit = Math.max(0, Math.min(cap, Math.floor((width - primaryMin - 16) / slotW)));
      var candidates = secondaries.filter(function (li) { return !li.classList.contains("is-overflowOnly"); });
      var forced = secondaries.filter(function (li) { return li.classList.contains("is-overflowOnly"); });
      var needMore = candidates.length > fit || forced.length > 0;
      var keep = needMore ? Math.max(0, fit - 1) : candidates.length;
      bar = candidates.slice(0, keep);
      sheet = candidates.slice(keep).concat(forced);
    } else {
      // Wide screens: every action inline, nothing in the sheet; overflow (rare or destructive)
      // actions go to the far start, away from the primary at the end.
      bar = secondaries.filter(function (li) { return li.classList.contains("is-overflowOnly"); })
        .concat(secondaries.filter(function (li) { return !li.classList.contains("is-overflowOnly"); }));
    }
    sheet.sort(function (a, b) { return a.amcTtbIndex - b.amcTtbIndex; });
    // Order: secondaries, More, primary last (inline-end, where the right thumb rests).
    // Centre option: primary in the middle of the secondaries.
    var order = bar.slice();
    var slot = root.amcTtbMoreSlot;
    slot.hidden = sheet.length === 0;
    if (sheet.length) { order.push(slot); }
    if (root.classList.contains(ROOT + "--center") && phone()) {
      order.splice(Math.ceil(order.length / 2), 0, primary);
    } else {
      order.push(primary);
    }
    if (!sheet.length) { order.push(slot); }
    order.forEach(function (li) { list.appendChild(li); });
    sheet.forEach(function (li) { sheetList.appendChild(li); });
    root.classList.toggle("has-more", sheet.length > 0);
    var moreBtn = root.querySelector(C("moreBtn"));
    if (moreBtn) { moreBtn.setAttribute("aria-label", (moreBtn.textContent || "More").trim() + ", " + sheet.length); }
    if (!sheet.length && isOpen(root)) { close(root, false); }
    pad();
  }

  // ------------------------------------------------------------ page padding
  // A floating bar reserves its own height at the end of the page (class amc-TThumbBar-pad on
  // body, also usable by hand in Page > CSS Classes when JavaScript is off).
  function pad() {
    var roots = document.querySelectorAll("." + ROOT + ".is-enhanced");
    var h = 0;
    for (var i = 0; i < roots.length; i++) {
      if (floating(roots[i]) && roots[i].offsetParent !== null) {
        var list = roots[i].querySelector(C("list"));
        h = Math.max(h, Math.ceil((list || roots[i]).getBoundingClientRect().height));
      }
    }
    if (!document.body) { return; }
    if (h) {
      document.body.style.setProperty("--amc-tthumb-h", h + "px");
      if (!document.body.classList.contains(PAD)) { document.body.classList.add(PAD); document.body.amcTtbAddedPad = true; }
    } else {
      document.body.style.removeProperty("--amc-tthumb-h");
      // Only undo what this script did; a class set in Page > CSS Classes stays.
      if (document.body.amcTtbAddedPad) { document.body.classList.remove(PAD); document.body.amcTtbAddedPad = false; }
    }
  }

  // ------------------------------------------------------------ sheet
  function isOpen(root) { var s = root.querySelector(C("sheet")); return s && !s.hidden; }
  function focusables(el) {
    return Array.prototype.slice.call(el.querySelectorAll("a[href], button:not([disabled])")).filter(function (n) { return n.offsetParent !== null; });
  }
  function open(root) {
    var sheet = root.querySelector(C("sheet"));
    var scrim = root.querySelector(C("scrim"));
    var btn = root.querySelector(C("moreBtn"));
    if (!sheet) { return; }
    sheet.hidden = false;
    if (scrim) { scrim.hidden = false; }
    btn.setAttribute("aria-expanded", "true");
    root.classList.add("is-open");
    sheet.style.removeProperty("transform");
    var first = sheet.querySelector(C("sheetList") + " a");
    (first || sheet.querySelector(C("close"))).focus();
  }
  function close(root, restore) {
    var sheet = root.querySelector(C("sheet"));
    var scrim = root.querySelector(C("scrim"));
    var btn = root.querySelector(C("moreBtn"));
    if (!sheet || sheet.hidden) { return; }
    sheet.hidden = true;
    sheet.style.removeProperty("transform");
    if (scrim) { scrim.hidden = true; }
    if (btn) { btn.setAttribute("aria-expanded", "false"); }
    root.classList.remove("is-open");
    if (restore !== false && btn && btn.offsetParent !== null) { btn.focus(); }
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest) { return; }
    var root = t.closest("." + ROOT);
    if (!root || !root.amcTtbReady) { return; }
    if (t.closest(C("moreBtn"))) {
      if (isOpen(root)) { close(root); } else { open(root); }
    } else if (t.closest(C("close")) || t.closest(C("scrim"))) {
      close(root);
    } else if (t.closest(C("sheetList") + " a")) {
      close(root, false);
    }
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (!t.closest) { return; }
    var root = t.closest("." + ROOT);
    if (!root || !isOpen(root)) { return; }
    var sheet = root.querySelector(C("sheet"));
    if (e.key === "Escape" || e.key === "Esc") {
      e.preventDefault();
      close(root);
    } else if (e.key === "Tab" && sheet.contains(t)) {
      var f = focusables(sheet);
      if (!f.length) { return; }
      if (e.shiftKey && t === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && t === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  // Swipe down on the sheet to dismiss: 12px dead zone, vertical direction lock, 72px or a
  // fast flick closes, anything less springs back. Close, Escape and the scrim do the same.
  var drag = null;
  document.addEventListener("pointerdown", function (e) {
    var t = e.target;
    if (!t.closest || e.button > 0) { return; }
    var sheet = t.closest(C("sheet"));
    if (!sheet) { return; }
    // Grab zone: the handle and the sheet header; the list itself keeps native scrolling.
    if (!t.closest(C("handle")) && !t.closest(C("sheetHead"))) { return; }
    if (t.closest("button")) { return; }
    drag = { sheet: sheet, y: e.clientY, x: e.clientX, t: Date.now(), dy: 0, locked: null };
  });
  document.addEventListener("pointermove", function (e) {
    if (!drag) { return; }
    var dy = e.clientY - drag.y, dx = e.clientX - drag.x;
    if (drag.locked === null && (Math.abs(dy) > 12 || Math.abs(dx) > 12)) { drag.locked = Math.abs(dy) > Math.abs(dx) && dy > 0 ? "y" : "none"; }
    if (drag.locked !== "y") { return; }
    drag.dy = Math.max(0, dy - 12);
    drag.sheet.style.setProperty("transform", "translateY(" + drag.dy + "px)");
    drag.sheet.classList.add("is-dragging");
  });
  function endDrag() {
    if (!drag) { return; }
    var d = drag;
    drag = null;
    d.sheet.classList.remove("is-dragging");
    if (d.locked !== "y") { return; }
    var fast = d.dy / Math.max(1, Date.now() - d.t) > 0.6;
    if (d.dy > 72 || (fast && d.dy > 24)) {
      close(d.sheet.closest("." + ROOT));
    } else {
      d.sheet.style.removeProperty("transform");
    }
  }
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);

  // ------------------------------------------------------------ lifecycle
  function init(root) {
    if (root.amcTtbReady) { return; }
    root.amcTtbReady = true;
    if (!prepare(root)) { return; }
    root.classList.add("is-enhanced");
    layout(root);
  }
  function relayoutAll() {
    var roots = document.querySelectorAll("." + ROOT + ".is-enhanced");
    for (var i = 0; i < roots.length; i++) { layout(roots[i]); }
    if (!roots.length) { pad(); }
  }
  var raf = 0;
  function onResize() {
    if (raf) { return; }
    raf = (window.requestAnimationFrame || window.setTimeout)(function () { raf = 0; relayoutAll(); });
  }
  window.addEventListener("resize", onResize);
  if (mq && mq.addEventListener) { mq.addEventListener("change", onResize); }

  var queued = false;
  function scan() {
    queued = false;
    var roots = document.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) { init(roots[i]); }
    // A refreshed region replaces the bar: drop the padding if no floating bar is left.
    pad();
  }
  function queue() {
    if (queued) { return; }
    queued = true;
    (window.requestAnimationFrame || window.setTimeout)(scan);
  }
  if (window.apex && window.apex.jQuery) { window.apex.jQuery(document).on("apexafterrefresh", queue); }
  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var nodes = [].concat(Array.prototype.slice.call(records[i].addedNodes), Array.prototype.slice.call(records[i].removedNodes));
        for (var j = 0; j < nodes.length; j++) {
          var n = nodes[j];
          if (n.nodeType === 1 && (n.classList.contains(ROOT) || (n.querySelector && n.querySelector("." + ROOT)))) { queue(); return; }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", scan); } else { scan(); }

  window.amcTplThumbBar = { refresh: relayoutAll, open: function (root) { root = root || document.querySelector("." + ROOT + ".has-more"); if (root) { open(root); } }, close: function (root) { root = root || document.querySelector("." + ROOT + ".is-open"); if (root) { close(root); } } };
})();
