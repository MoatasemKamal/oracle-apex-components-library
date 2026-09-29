/* =========================================================================
   APEX Modern Components - Motion Kit runtime
   Turns on the Motion Kit for native Universal Theme elements.

   Enabled areas (default: all except "regions"):
     buttons forms reports icons breadcrumbs navbar menubar menus alerts regions

   Choose areas in one of three ways (first match wins):
     1. window.amcMotionKitConfig = { areas: "buttons forms reports" };   before this file
     2. <body data-amc-motion="buttons reports">  (e.g. from a page template attribute)
     3. Page or app CSS classes: add "amc-mk-no-<area>" to the page body to turn one off,
        for example "amc-mk-no-reports" on a data-entry page.
   Exclude any element with the CSS class "amc-mk-off".
   ========================================================================= */
(function () {
  "use strict";
  if (window.amcMotionKit) {
    return;
  }

  var ALL = ["buttons", "forms", "reports", "icons", "breadcrumbs", "navbar", "menubar", "menus", "alerts"];
  var OPTIONAL = ["regions"];
  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = window.apex && window.apex.jQuery;
  var enabled = {};

  function readAreas() {
    var cfg = window.amcMotionKitConfig && window.amcMotionKitConfig.areas;
    var attr = document.body && document.body.getAttribute("data-amc-motion");
    var list = (cfg || attr || ALL.join(" ")).split(/[\s,]+/).filter(Boolean);
    if (list.indexOf("all") >= 0) { list = ALL.concat(OPTIONAL); }
    return list.filter(function (a) {
      return (ALL.indexOf(a) >= 0 || OPTIONAL.indexOf(a) >= 0) &&
        !(document.body && document.body.classList.contains("amc-mk-no-" + a));
    });
  }

  function off(el) { return !!(el && el.closest && el.closest(".amc-mk-off")); }

  /* ---- Buttons: ripple, busy state -------------------------------------- */
  var lastPressed = null;
  var lastPressedAt = 0;

  function ensureHost(btn) {
    var host = btn.querySelector(":scope > .amc-mk-ripple-host");
    if (!host) {
      host = document.createElement("span");
      host.className = "amc-mk-ripple-host";
      host.setAttribute("aria-hidden", "true");
      btn.appendChild(host);
    }
    return host;
  }

  function ripple(btn, x, y) {
    if (reduceMotion) { return; }
    var host = ensureHost(btn);
    var r = btn.getBoundingClientRect();
    var dot = document.createElement("span");
    dot.className = "amc-mk-ripple";
    dot.style.left = x + "px";
    dot.style.top = y + "px";
    // Scale so the circle covers the button from the press point.
    var reach = Math.max(Math.hypot(x, y), Math.hypot(r.width - x, y), Math.hypot(x, r.height - y), Math.hypot(r.width - x, r.height - y));
    dot.style.setProperty("--amc-mk-ripple-scale", String(Math.ceil(reach / 8) + 1));
    host.appendChild(dot);
    dot.addEventListener("animationend", function () { dot.remove(); });
  }

  function wireButtons() {
    document.addEventListener("pointerdown", function (e) {
      var btn = e.target.closest && e.target.closest(".t-Button");
      if (!btn || off(btn) || btn.disabled) { return; }
      lastPressed = btn; lastPressedAt = Date.now();
      var r = btn.getBoundingClientRect();
      ripple(btn, e.clientX - r.left, e.clientY - r.top);
    }, true);
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") { return; }
      var btn = e.target.closest && e.target.closest(".t-Button");
      if (!btn || off(btn)) { return; }
      lastPressed = btn; lastPressedAt = Date.now();
      ripple(btn, btn.offsetWidth / 2, btn.offsetHeight / 2);
    }, true);
    // Hot buttons need the host up front for the hover shine.
    Array.prototype.forEach.call(document.querySelectorAll(".t-Button--hot"), function (b) { if (!off(b)) { ensureHost(b); } });

    // Spinner on the button that submitted the page.
    var markBusy = function () {
      if (lastPressed && Date.now() - lastPressedAt < 1500 && !off(lastPressed)) {
        lastPressed.classList.add("amc-mk-is-busy");
        lastPressed.setAttribute("aria-busy", "true");
      }
    };
    if ($) { $(document).on("apexbeforepagesubmit", markBusy); }
    // Clear it if the user comes back with the browser's Back button.
    window.addEventListener("pageshow", function () {
      Array.prototype.forEach.call(document.querySelectorAll(".amc-mk-is-busy"), function (b) {
        b.classList.remove("amc-mk-is-busy");
        b.removeAttribute("aria-busy");
      });
    });
  }

  /* ---- Reports: row entrance on load and after refresh ------------------ */
  var ROW_SELECTORS = [
    ".t-Report-report tbody tr",
    ".a-IRR-table tr",
    ".a-CardView-item",
    ".t-Cards-item",
    ".t-ContentRow-item",
    ".t-MediaList-item",
    ".t-TimelineItem, .t-Timeline-item"
  ].join(",");

  function enterRows(scope) {
    if (reduceMotion || !scope || off(scope)) { return; }
    var rows = Array.prototype.filter.call(scope.querySelectorAll(ROW_SELECTORS), function (row) {
      return !off(row) && (row.tagName !== "TR" || row.querySelector("td"));
    });
    rows.slice(0, 30).forEach(function (row, i) {
      row.classList.remove("amc-mk-enter");
      row.style.setProperty("--amc-mk-i", String(i));
      void row.offsetWidth;
      row.classList.add("amc-mk-enter");
      row.addEventListener("animationend", function done() {
        row.classList.remove("amc-mk-enter");
        row.removeEventListener("animationend", done);
      });
    });
  }

  function wireReports() {
    enterRows(document);
    if (!$) { return; }
    $(document).on("apexbeforerefresh", function (e) {
      if (!off(e.target)) { e.target.classList.add("amc-mk-refreshing"); }
    });
    $(document).on("apexafterrefresh", function (e) {
      e.target.classList.remove("amc-mk-refreshing");
      enterRows(e.target);
    });
  }

  /* ---- Navigation bar: badge bump when its value changes ---------------- */
  function wireNavbar() {
    var badges = document.querySelectorAll(".t-NavigationBar .t-Button-badge, .t-NavigationBar .a-Badge");
    Array.prototype.forEach.call(badges, function (badge) {
      if (off(badge)) { return; }
      new MutationObserver(function () {
        badge.classList.remove("amc-mk-bump");
        void badge.offsetWidth;
        badge.classList.add("amc-mk-bump");
      }).observe(badge, { childList: true, characterData: true, subtree: true });
    });
  }

  /* ---- Menu bar: sliding highlight that follows the pointer ------------- */
  function wireMenubar() {
    Array.prototype.forEach.call(document.querySelectorAll(".a-MenuBar"), function (bar) {
      if (off(bar)) { return; }
      var ink = document.createElement("span");
      ink.className = "amc-mk-ink";
      ink.setAttribute("aria-hidden", "true");
      bar.appendChild(ink);
      function moveTo(item) {
        if (!item) { ink.style.opacity = "0"; return; }
        var b = bar.getBoundingClientRect();
        var r = item.getBoundingClientRect();
        ink.style.inlineSize = r.width + "px";
        ink.style.transform = "translateX(" + (r.left - b.left) + "px)";
        ink.style.opacity = "1";
      }
      function current() { return bar.querySelector(".a-MenuBar-item.is-current, .a-MenuBar-item.is-selected"); }
      bar.addEventListener("mouseover", function (e) {
        var item = e.target.closest(".a-MenuBar-item");
        if (item && bar.contains(item)) { moveTo(item); }
      });
      bar.addEventListener("focusin", function (e) {
        var item = e.target.closest(".a-MenuBar-item");
        if (item) { moveTo(item); }
      });
      bar.addEventListener("mouseleave", function () { moveTo(current()); });
      window.addEventListener("resize", function () { moveTo(current()); });
      moveTo(current());
    });
  }

  /* ---- Regions: fade up on page load (opt-in) --------------------------- */
  function wireRegions() {
    if (reduceMotion) { return; }
    var regions = document.querySelectorAll(".t-Body-contentInner .t-Region, .t-Body-contentInner .t-Card");
    Array.prototype.slice.call(regions, 0, 20).forEach(function (reg, i) {
      if (off(reg)) { return; }
      reg.style.setProperty("--amc-mk-i", String(i));
      reg.classList.add("amc-mk-region-in");
    });
  }

  /* ---- Start ------------------------------------------------------------ */
  function start() {
    readAreas().forEach(function (a) { enabled[a] = true; root.classList.add("amc-mk--" + a); });
    root.classList.add("amc-mk");
    if (enabled.buttons) { wireButtons(); }
    if (enabled.reports) { wireReports(); }
    if (enabled.navbar) { wireNavbar(); }
    if (enabled.menubar) { wireMenubar(); }
    if (enabled.regions) { wireRegions(); }
  }

  window.amcMotionKit = {
    /** Replay the row entrance for a region, e.g. amcMotionKit.enterRows(document.getElementById("orders")). */
    enterRows: enterRows,
    /** Areas currently enabled. */
    areas: function () { return Object.keys(enabled); }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
