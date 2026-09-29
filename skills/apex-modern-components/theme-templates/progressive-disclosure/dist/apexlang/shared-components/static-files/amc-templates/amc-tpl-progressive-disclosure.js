/* APEX Modern Components - Progressive Disclosure region template runtime.
 * Tesler's law: the form keeps every option (nothing is removed), but the product carries the
 * sorting. Items with the CSS class amc-pd-more (Page Item > Advanced > CSS Classes, or on the
 * grid column) move, in their order, into a "More options" section after the essentials, behind
 * one toggle that says how many there are ("Show 6 more options").
 * Nothing is hidden silently: a more-option that holds a value or an APEX error opens the section
 * when the page loads or the region refreshes, and the toggle carries a "2 filled" or
 * "1 needs attention" badge whether open or closed. The user's open or closed choice is
 * remembered per page and region in localStorage (key amc-tpl-progressive-disclosure:<app>:<page>:<region>).
 * Grid layout is kept: grid columns that move keep a row wrapper with the original row classes.
 * Without JavaScript every item stays where APEX put it.
 * ES5, delegated listeners on document, textContent only, APEX APIs guarded, re-init on
 * apexafterrefresh with a MutationObserver fallback. Strings come from data-amc-* attributes. */
(function (w, d) {
  "use strict";
  if (w.amcTplProgressiveDisclosure || !d.querySelectorAll || !d.addEventListener) { return; }

  var ROOT = "amc-TProgressiveDisclosure";
  var P = ROOT + "-";
  var SLUG = "amc-tpl-progressive-disclosure";
  var UNIT = ".t-Form-fieldContainer, .apex-item-wrapper";
  var FIELDS = "input, select, textarea";
  var COL = /(^|\s)(col|col-\d+|col-xxs-\d+|col-xs-\d+|col-sm-\d+|col-md-\d+|col-lg-\d+|col-xl-\d+)(\s|$)/;
  var uid = 0;

  function matches(el, sel) {
    var f = el && el.nodeType === 1 && (el.matches || el.msMatchesSelector || el.webkitMatchesSelector);
    return f ? f.call(el, sel) : false;
  }
  function closest(el, sel) {
    while (el && el.nodeType === 1) { if (matches(el, sel)) { return el; } el = el.parentNode; }
    return null;
  }
  function each(list, fn) { for (var i = 0; i < list.length; i++) { fn(list[i], i); } }
  function toArray(list) { var a = []; each(list, function (x) { a.push(x); }); return a; }
  function str(root, key, fallback) { var v = root.getAttribute("data-amc-" + key); return v ? v : fallback; }
  function fmt(t, a) { return String(t).replace("%0", a); }
  function part(root, name) { return root.querySelector("." + P + name); }
  function rootOf(el) { return closest(el, "." + ROOT); }
  function has(root, opt) { return root.classList.contains(ROOT + "--" + opt); }
  function safeItem(id) { try { return w.apex && w.apex.item ? w.apex.item(id) : null; } catch (e) { return null; } }
  function reduced() { return !!(w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches); }

  // ------------------------------------------------------------ storage
  function key(root) {
    var app = w.apex && w.apex.env && w.apex.env.APP_ID ? w.apex.env.APP_ID : "";
    var page = w.apex && w.apex.env && w.apex.env.APP_PAGE_ID ? w.apex.env.APP_PAGE_ID : "";
    if (!app && !page) { page = w.location ? w.location.pathname : ""; }
    return SLUG + ":" + app + ":" + page + ":" + (root.id || "region");
  }
  function load(root) {
    if (has(root, "noMemory")) { return null; }
    try { return w.localStorage.getItem(key(root)); } catch (e) { return null; }
  }
  function save(root, open) {
    if (has(root, "noMemory")) { return; }
    try { w.localStorage.setItem(key(root), open ? "open" : "closed"); } catch (e) { /* private mode */ }
  }

  // ------------------------------------------------------------ gather
  // The unit to move: the item's field container, grown to the largest ancestor that holds only
  // more-options (for example a whole grid row), never past the region body.
  function isMore(root, el) {
    var cls = str(root, "more-class", "amc-pd-more");
    return el.classList.contains(cls) || !!el.querySelector("." + cls);
  }
  function onlyMore(root, el) {
    var units = el.querySelectorAll(UNIT);
    for (var i = 0; i < units.length; i++) { if (!isMore(root, units[i]) && !closest(units[i], "." + str(root, "more-class", "amc-pd-more"))) { return false; } }
    var btns = el.querySelectorAll("button, .t-Button, [role=\"button\"]");
    for (var j = 0; j < btns.length; j++) { if (!closest(btns[j], "." + str(root, "more-class", "amc-pd-more")) && !closest(btns[j], UNIT)) { return false; } }
    return true;
  }
  function unitFor(root, body, el) {
    var u = closest(el, UNIT) || el;
    if (!body.contains(u)) { return null; }
    while (u.parentNode && u.parentNode !== body && body.contains(u.parentNode) && !matches(u.parentNode, "." + P + "more, ." + P + "panel") && onlyMore(root, u.parentNode)) {
      u = u.parentNode;
    }
    return u;
  }
  function collect(root) {
    var body = part(root, "body");
    var more = part(root, "more");
    if (!body || !more) { return []; }
    var cls = str(root, "more-class", "amc-pd-more");
    var units = [];
    each(body.querySelectorAll("." + cls), function (el) {
      if (more.contains(el)) { return; }
      var u = unitFor(root, body, el);
      if (u && u !== more && !u.contains(more) && units.indexOf(u) < 0) { units.push(u); }
    });
    // Drop units inside other units; keep document order.
    units = units.filter(function (u) {
      for (var i = 0; i < units.length; i++) { if (units[i] !== u && units[i].contains(u)) { return false; } }
      return true;
    });
    units.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
    return units;
  }
  function move(root, units) {
    var panel = part(root, "panel");
    var rows = [];
    each(units, function (u) {
      var parent = u.parentNode;
      if (COL.test(u.className || "") && parent && /(^|\s)row(\s|$)/.test(parent.className || "")) {
        // Keep the grid: columns from the same original row share a new row with its classes.
        var target = null;
        for (var i = 0; i < rows.length; i++) { if (rows[i].from === parent) { target = rows[i].row; } }
        if (!target) {
          target = d.createElement("div");
          target.className = parent.className;
          target.setAttribute("data-amc-pd-row", "1");
          panel.appendChild(target);
          rows.push({ from: parent, row: target });
        }
        target.appendChild(u);
      } else {
        panel.appendChild(u);
      }
      u.setAttribute("data-amc-pd-moved", "1");
    });
  }

  // ------------------------------------------------------------ state of the more-options
  function hiddenByApp(el, stop) {
    for (var x = el; x && x !== stop; x = x.parentNode) {
      if (x.nodeType !== 1) { continue; }
      if (x.hidden || w.getComputedStyle(x).display === "none") { return true; }
    }
    return false;
  }
  function controls(unit) {
    var out = [];
    each(matches(unit, FIELDS) ? [unit] : unit.querySelectorAll(FIELDS), function (c) {
      if (!/^(submit|button|reset|image)$/i.test(c.type || "")) { out.push(c); }
    });
    return out;
  }
  function trim(s) { return String(s || "").replace(/^\s+|\s+$/g, ""); }
  // "Filled" means the option carries a value the user would want to know about. A select list
  // without a null entry always has a value, so it counts only when something other than its
  // first entry is chosen; data-amc-default="X" on the item sets the value that counts as unset.
  function isFilled(unit) {
    var list = controls(unit);
    if (!list.length) { return false; }
    var shown = list.filter(function (c) { return c.type !== "hidden"; });
    var dflt = unit.getAttribute("data-amc-default");
    each(list, function (c) { if (dflt === null && c.getAttribute("data-amc-default") !== null) { dflt = c.getAttribute("data-amc-default"); } });
    var id = unit.id && /_CONTAINER$/.test(unit.id) ? unit.id.replace(/_CONTAINER$/, "") : "";
    var api = id ? safeItem(id) : null;
    if (api && api.node && typeof api.getValue === "function" && typeof api.isEmpty === "function") {
      try {
        if (api.isEmpty()) { return false; }
        if (dflt !== null) { return String(api.getValue()) !== dflt; }
      } catch (e) { /* DOM below */ }
    }
    var src = shown.length ? shown : list;
    var radios = src.filter(function (c) { return /^radio$/i.test(c.type || ""); });
    if (radios.length) {
      for (var r = 0; r < radios.length; r++) {
        if (radios[r].checked) { return dflt !== null ? radios[r].value !== dflt : r > 0; }
      }
      return false;
    }
    for (var i = 0; i < src.length; i++) {
      var c = src[i];
      if (/^checkbox$/i.test(c.type || "")) { if (c.checked) { return true; } continue; }
      var v = trim(c.value);
      if (dflt !== null) { if (v !== dflt && v !== "") { return true; } continue; }
      if (c.tagName === "SELECT" && !c.multiple) {
        var nullEntry = false;
        each(c.options, function (o) { if (o.value === "") { nullEntry = true; } });
        if (v !== "" && (nullEntry || c.selectedIndex > 0)) { return true; }
        continue;
      }
      if (v !== "") { return true; }
    }
    return false;
  }
  function hasError(unit) {
    return !!((unit.classList && unit.classList.contains("is-error")) || unit.querySelector(".is-error, .apex-page-item-error, [aria-invalid=\"true\"]"));
  }
  function stats(root) {
    var panel = part(root, "panel");
    var out = { count: 0, filled: 0, errors: 0 };
    if (!panel) { return out; }
    var units = toArray(panel.querySelectorAll(UNIT)).filter(function (u) {
      var outer = u.parentNode ? closest(u.parentNode, UNIT) : null;
      return !outer || !panel.contains(outer);
    });
    // Bare controls moved without a UT container count as one option each.
    each(panel.querySelectorAll(FIELDS), function (c) { if (c.type !== "hidden" && !closest(c, UNIT)) { units.push(c); } });
    each(units, function (u) {
      if (hiddenByApp(u, panel)) { return; }
      out.count++;
      if (isFilled(u)) { out.filled++; }
      if (hasError(u)) { out.errors++; }
    });
    return out;
  }

  // ------------------------------------------------------------ render
  function setOpen(root, open, byUser) {
    var more = part(root, "more");
    var panel = part(root, "panel");
    var btn = part(root, "toggle");
    if (!more || !panel || !btn) { return; }
    var was = !panel.hidden;
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    more.classList.toggle("is-open", open);
    if (open && !was && byUser && !reduced()) {
      panel.classList.remove("is-entering");
      void panel.offsetWidth;
      panel.classList.add("is-entering");
      setTimeout(function () { panel.classList.remove("is-entering"); }, 260);
    }
    if (byUser) { save(root, open); }
    label(root);
  }
  function label(root) {
    var btn = part(root, "toggle");
    var more = part(root, "more");
    if (!btn || !more) { return; }
    var s = stats(root);
    root._amcStats = s;
    more.hidden = s.count === 0 && !part(root, "panel").children.length;
    var open = btn.getAttribute("aria-expanded") === "true";
    var t = open ? (s.count === 1 ? str(root, "label-hide-one", "Hide 1 more option") : fmt(str(root, "label-hide", "Hide %0 more options"), s.count))
      : (s.count === 1 ? str(root, "label-show-one", "Show 1 more option") : fmt(str(root, "label-show", "Show %0 more options"), s.count));
    var tt = part(root, "toggleText");
    if (tt.textContent !== t) { tt.textContent = t; }
    var badges = btn.querySelectorAll("." + P + "badge");
    var fb = badges[0];
    var eb = badges[1];
    var ft = s.filled ? fmt(str(root, "label-filled", "%0 filled"), s.filled) : "";
    var et = s.errors ? fmt(str(root, "label-errors", "%0 need attention"), s.errors) : "";
    if (fb) { fb.hidden = !ft; if (fb.textContent !== ft) { fb.textContent = ft; } }
    if (eb) { eb.hidden = !et; if (eb.textContent !== et) { eb.textContent = et; } }
    more.classList.toggle("has-filled", s.filled > 0);
    more.classList.toggle("has-errors", s.errors > 0);
  }
  function init(root) {
    var units = collect(root);
    var btn = part(root, "toggle");
    var panel = part(root, "panel");
    if (!btn || !panel) { return; }
    if (!panel.id) { panel.id = (root.id || "amc-tpd") + "_amc_more_" + (++uid); }
    btn.setAttribute("aria-controls", panel.id);
    var first = !root.getAttribute("data-amc-pd-ready");
    if (units.length) { move(root, units); }
    root.setAttribute("data-amc-pd-ready", "1");
    var s = stats(root);
    var open;
    if (first || units.length) {
      var stored = load(root);
      open = stored === "open" ? true : stored === "closed" ? false : has(root, "openDefault");
      // Never hide a value or an error silently.
      if (s.filled || s.errors) { open = true; }
      setOpen(root, open, false);
    } else {
      if (s.errors && panel.hidden) { setOpen(root, true, false); } else { label(root); }
    }
  }
  function initAll() { each(d.querySelectorAll("." + ROOT), init); }

  // ------------------------------------------------------------ delegated listeners
  d.addEventListener("click", function (e) {
    var btn = closest(e.target, "." + P + "toggle");
    if (!btn) { return; }
    var root = rootOf(btn);
    if (root) { setOpen(root, btn.getAttribute("aria-expanded") !== "true", true); }
  });
  var labelQueue = [];
  var labelTimer = null;
  function queueLabel(root, full) {
    for (var i = 0; i < labelQueue.length; i++) { if (labelQueue[i].root === root) { labelQueue[i].full = labelQueue[i].full || full; return; } }
    labelQueue.push({ root: root, full: full });
    if (labelTimer) { return; }
    labelTimer = setTimeout(function () {
      labelTimer = null;
      var list = labelQueue;
      labelQueue = [];
      each(list, function (q) { if (d.documentElement.contains(q.root)) { if (q.full) { init(q.root); } else { label(q.root); } } });
    }, 50);
  }
  function onValue(e) {
    var root = rootOf(e.target);
    var panel = root && part(root, "panel");
    if (panel && panel.contains(e.target)) { queueLabel(root, false); }
  }
  d.addEventListener("input", onValue);
  d.addEventListener("change", onValue);
  // Links to an option in a closed section (Error Summary links, APEX notification links with
  // href="#ITEM" or data-for) open it first, in the capture phase, so their focus can land.
  d.addEventListener("click", function (e) {
    var a = closest(e.target, "a[href^=\"#\"], [data-for]");
    if (!a) { return; }
    var id = (a.getAttribute("data-for") || (a.getAttribute("href") || "").slice(1)).replace(/_CONTAINER$/, "");
    if (!id) { return; }
    each(d.querySelectorAll("." + ROOT), function (root) {
      var panel = part(root, "panel");
      if (!panel || !panel.hidden) { return; }
      var hit = false;
      each(panel.querySelectorAll("[id]"), function (x) { if (!hit && (x.id === id || x.id === id + "_CONTAINER")) { hit = true; } });
      if (hit) { setOpen(root, true, false); }
    });
  }, true);
  // Focus that lands in a closed section (a Dynamic Action, an error link, apex.item().setFocus)
  // opens it, so the focused field is never invisible.
  d.addEventListener("focusin", function (e) {
    var root = rootOf(e.target);
    var panel = root && part(root, "panel");
    if (panel && panel.hidden && panel.contains(e.target)) { setOpen(root, true, false); }
  });

  // ------------------------------------------------------------ lifecycle
  function start() {
    initAll();
    if (w.apex && w.apex.jQuery) {
      w.apex.jQuery(d).on("apexafterrefresh", function (e) {
        var t = e.target && e.target.nodeType === 1 ? e.target : null;
        each(d.querySelectorAll("." + ROOT), function (r) { if (!t || r.contains(t) || t.contains(r)) { queueLabel(r, true); } });
      });
    }
    if (w.MutationObserver && d.body) {
      new w.MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var rec = records[i];
          var t = rec.target.nodeType === 1 ? rec.target : rec.target.parentNode;
          if (!t || closest(t, "." + P + "bar")) { continue; }
          var r = rootOf(t);
          if (!r) {
            if (rec.addedNodes && rec.addedNodes.length) { each(d.querySelectorAll("." + ROOT), function (x) { if (t.contains(x)) { queueLabel(x, true); } }); }
            continue;
          }
          // New more-items (region refresh) need a full pass; errors and show or hide a relabel.
          var full = false;
          each(rec.addedNodes || [], function (n) { if (n.nodeType === 1 && !n.getAttribute("data-amc-pd-moved") && !n.getAttribute("data-amc-pd-row") && isMore(r, n) && !part(r, "more").contains(n)) { full = true; } });
          queueLabel(r, full);
          if (!full && rec.type === "attributes") {
            var panel = part(r, "panel");
            if (panel && panel.hidden && panel.contains(t) && hasError(t)) { queueLabel(r, true); }
          }
        }
      }).observe(d.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "aria-invalid"] });
    }
  }
  if (d.readyState === "loading") { d.addEventListener("DOMContentLoaded", start); } else { start(); }

  w.amcTplProgressiveDisclosure = {
    version: "1.0.0",
    refresh: function (el) { var r = el ? rootOf(el) || el : null; if (r) { init(r); } else { initAll(); } },
    open: function (el, open) { var r = el ? rootOf(el) || el : null; if (r) { setOpen(r, open !== false, true); } },
    result: function (el) {
      var r = el ? rootOf(el) || el : null;
      if (!r) { return null; }
      var s = stats(r);
      var p = part(r, "panel");
      return { count: s.count, filled: s.filled, errors: s.errors, open: !!(p && !p.hidden), key: key(r) };
    },
    reset: function (el) {
      var r = el ? rootOf(el) || el : null;
      if (!r) { return; }
      try { w.localStorage.removeItem(key(r)); } catch (e) { /* ignore */ }
    }
  };
})(window, document);
