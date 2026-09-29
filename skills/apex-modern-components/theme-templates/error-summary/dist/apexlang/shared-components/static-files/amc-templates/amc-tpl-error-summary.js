/* APEX Modern Components - Error Summary region template runtime.
 * When APEX shows item errors inside the region, the frame lists them at the top: a count
 * ("3 fields need attention"), one link per field that moves focus to it, and a plain-language
 * fix hint derived from the error text (or from a data-amc-hint attribute on the item). Focus
 * moves to the summary once when errors appear; the summary clears itself when APEX clears the
 * errors. Editing a listed field marks its entry "Changed" without pretending it is fixed.
 * Sources, both supported and merged per item:
 *   inline errors   is-error containers, apex-page-item-error / aria-invalid="true" controls and
 *                   their #ID_error text inside the region body;
 *   notification    page notification entries (#t_Alert_Notification, .a-Notification-item,
 *                   .htmlDbUlErr li) whose link points at an item inside this region (data-for,
 *                   href="#ID" or apex.item('ID') in the link).
 * ES5, delegated listeners on document, textContent only, APEX APIs guarded, re-scan on
 * apexafterrefresh with a MutationObserver fallback. Strings come from data-amc-* attributes. */
(function (w, d) {
  "use strict";
  if (w.amcTplErrorSummary || !d.querySelectorAll || !d.addEventListener) { return; }

  var ROOT = "amc-TErrorSummary";
  var P = ROOT + "-";
  var OWN = "." + P + "summary, ." + P + "live";
  var UNIT = ".t-Form-fieldContainer, .apex-item-wrapper";
  var FIELDS = "input, select, textarea";
  var NOTE_ITEMS = "#t_Alert_Notification li, .a-Notification-item, .htmlDbUlErr li";
  var uid = 0;
  var userActed = false;

  function matches(el, sel) {
    var f = el && el.nodeType === 1 && (el.matches || el.msMatchesSelector || el.webkitMatchesSelector);
    return f ? f.call(el, sel) : false;
  }
  function closest(el, sel) {
    while (el && el.nodeType === 1) { if (matches(el, sel)) { return el; } el = el.parentNode; }
    return null;
  }
  function each(list, fn) { for (var i = 0; i < list.length; i++) { fn(list[i], i); } }
  function str(root, key, fallback) { var v = root.getAttribute("data-amc-" + key); return v ? v : fallback; }
  function fmt(t, a) { return String(t).replace("%0", a); }
  function part(root, name) { return root.querySelector("." + P + name); }
  function rootOf(el) { return closest(el, "." + ROOT); }
  function isOwn(el) { return !!closest(el, OWN); }
  function clean(s) { return String(s || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, ""); }
  function ensureId(el) { if (!el.id) { el.id = "amc-tes-" + (++uid); } return el.id; }
  function byId(root, id) {
    if (!id) { return null; }
    var el = null;
    // Scoped lookup: previews and some pages repeat ids; the item in THIS region wins.
    each(root.querySelectorAll("[id]"), function (x) { if (!el && x.id === id) { el = x; } });
    return el;
  }
  function safeItem(id) { try { return w.apex && w.apex.item ? w.apex.item(id) : null; } catch (e) { return null; } }

  // ------------------------------------------------------------ fields
  function controlOf(unit) {
    if (matches(unit, FIELDS)) { return unit; }
    var list = unit.querySelectorAll(FIELDS);
    for (var i = 0; i < list.length; i++) { if (list[i].type !== "hidden") { return list[i]; } }
    return list[0] || null;
  }
  function itemIdOf(unit, ctl) {
    if (unit && unit.id && /_CONTAINER$/.test(unit.id)) { return unit.id.replace(/_CONTAINER$/, ""); }
    if (!ctl) { return ""; }
    // Radio and checkbox options are P1_X_0, P1_X_1 with name P1_X ... prefer the group id.
    var grp = closest(ctl, ".apex-item-group, [role=\"radiogroup\"], [role=\"group\"]");
    if (grp && grp.id) { return grp.id; }
    return ctl.id || ctl.name || "";
  }
  function labelOf(root, unit, ctl) {
    var lab = unit ? unit.querySelector(".t-Form-label") || unit.querySelector("label, legend") : null;
    if (!lab && ctl && ctl.id) { each(root.querySelectorAll("label"), function (l) { if (!lab && l.htmlFor === ctl.id) { lab = l; } }); }
    if (!lab && ctl) { lab = closest(ctl, "label"); }
    if (!lab) { return ""; }
    var parts = [];
    (function walk(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { parts.push(c.nodeValue); }
        else if (c.nodeType === 1 && !matches(c, ".u-VisuallyHidden, .visuallyhidden, .t-Form-required, [aria-hidden=\"true\"], [class*=\"-optional\"]")) { walk(c); }
      }
    })(lab);
    return clean(parts.join(" ")).replace(/\s*\*$/, "");
  }
  function unitOf(el) { return closest(el, UNIT) || el; }
  function inlineMessage(unit, ctl, id) {
    var msg = "";
    var ref = id ? d.getElementById(id + "_error") : null;
    if (ref && unit.contains(ref)) { msg = clean(ref.textContent); }
    if (!msg) {
      each(unit.querySelectorAll(".t-Form-error, .a-Form-error"), function (e) { if (!msg) { msg = clean(e.textContent); } });
    }
    if (!msg && ctl) {
      each(String(ctl.getAttribute("aria-describedby") || "").split(/\s+/), function (rid) {
        var r = rid && d.getElementById(rid);
        if (!msg && r && /error/i.test(rid)) { msg = clean(r.textContent); }
      });
    }
    return msg;
  }
  function hasInlineError(unit, ctl) {
    if (unit.classList && unit.classList.contains("is-error")) { return true; }
    if (unit.querySelector(".apex-page-item-error, [aria-invalid=\"true\"]")) { return true; }
    return !!(ctl && (ctl.classList.contains("apex-page-item-error") || ctl.getAttribute("aria-invalid") === "true"));
  }

  // ------------------------------------------------------------ hints (Tesler: the product reads the error, the user gets the fix)
  function hintFor(root, msg, ctl, label) {
    var own = ctl && (ctl.getAttribute("data-amc-hint") || (closest(ctl, "[data-amc-hint]") || { getAttribute: function () { return ""; } }).getAttribute("data-amc-hint"));
    if (own) { return own; }
    var m = String(msg || "");
    var low = m.toLowerCase();
    var x;
    if (/must have (some |a )?value|is required|cannot be (empty|null|blank)|can't be (empty|blank)|must be (entered|specified|provided)/.test(low)) { return fmt(str(root, "hint-required", "Fill in %0 to save the form."), label || str(root, "label-this", "this field")); }
    if ((x = /too long by (\d+)/.exec(low))) { return fmt(str(root, "hint-toolong", "Remove %0 characters."), x[1]); }
    if ((x = /(maximum length|max(imum)? of|at most|no more than|longer than|exceeds?)\D{0,20}(\d+)\s*(characters|chars|bytes)/.exec(low))) { return fmt(str(root, "hint-length", "Shorten it to %0 characters or fewer."), x[3]); }
    if (/e-?mail/.test(low) && /valid|invalid|format|incorrect/.test(low)) { return str(root, "hint-email", "Include an @ and a domain, for example name@company.sa."); }
    if ((x = /(?:match(?:es)? (?:the )?format|date format|in the format)\s*:?\s*["']?([A-Za-z0-9\/\.\-: ]{4,24}?)["']?\.?$/i.exec(m)) && /date|dd|yyyy|mon/i.test(m)) { return fmt(str(root, "hint-date", "Type the date as %0, or pick it from the calendar."), clean(x[1])); }
    if (/valid date|not a date|date is (invalid|not valid)|invalid date/.test(low)) { return str(root, "hint-date-any", "Pick the date from the calendar, or type it like the example."); }
    if (/must be numeric|not a (valid )?number|must be a (valid )?number|number format|numeric value/.test(low)) { return str(root, "hint-number", "Use digits only, with a dot for decimals, for example 1250.50."); }
    if (/already (exists|in use|used|registered)|duplicate|must be unique|not unique/.test(low)) { return str(root, "hint-unique", "This value is already used. Enter a different one."); }
    if (/do(es)? not match|must match|mismatch/.test(low)) { return str(root, "hint-match", "Type the same value in both fields."); }
    return "";
  }

  // ------------------------------------------------------------ scan
  function noteTarget(li) {
    var a = li.querySelector("a") || li;
    var id = a.getAttribute("data-for") || "";
    var href = a.getAttribute("href") || "";
    if (!id && /^#[A-Za-z0-9_$\-]+$/.test(href)) { id = href.slice(1); }
    if (!id) {
      var js = (a.getAttribute("onclick") || "") + " " + href;
      var x = /apex\.item\(\s*['"]([^'"]+)['"]\s*\)|\$x\(\s*['"]([^'"]+)['"]\s*\)|setFocus\(\s*['"]([^'"]+)['"]/.exec(js);
      if (x) { id = x[1] || x[2] || x[3]; }
    }
    return id.replace(/_CONTAINER$/, "");
  }
  function scan(root) {
    var body = part(root, "body");
    var list = [];
    var byKey = {};
    if (!body) { return list; }
    function add(rec) {
      var key = rec.id || ("msg:" + rec.msg);
      if (byKey[key]) { if (!byKey[key].msg && rec.msg) { byKey[key].msg = rec.msg; } return; }
      byKey[key] = rec;
      list.push(rec);
    }
    // 1. inline item errors inside this region
    var seen = [];
    each(body.querySelectorAll(".is-error, .apex-page-item-error, [aria-invalid=\"true\"]"), function (el) {
      if (isOwn(el)) { return; }
      var unit = unitOf(el);
      if (seen.indexOf(unit) > -1) { return; }
      var ctl = controlOf(unit) || (matches(el, FIELDS) ? el : null);
      if (!hasInlineError(unit, ctl)) { return; }
      seen.push(unit);
      var id = itemIdOf(unit, ctl);
      add({ id: id, unit: unit, ctl: ctl, label: labelOf(root, unit, ctl), msg: inlineMessage(unit, ctl, id) });
    });
    // 2. notification entries that point at items in this region (or page errors with the option)
    each(d.querySelectorAll(NOTE_ITEMS), function (li) {
      if (rootOf(li) === root && isOwn(li)) { return; }
      if (li.parentNode && closest(li.parentNode, NOTE_ITEMS)) { return; }
      var msg = clean(li.textContent);
      if (!msg) { return; }
      var id = noteTarget(li);
      var target = id ? byId(body, id) || byId(body, id + "_CONTAINER") : null;
      if (target) {
        var unit = unitOf(target);
        var ctl = controlOf(unit);
        add({ id: id, unit: unit, ctl: ctl, label: labelOf(root, unit, ctl), msg: msg });
      } else if (!id && root.classList.contains(ROOT + "--includePage")) {
        add({ id: "", unit: null, ctl: null, label: "", msg: msg, page: true });
      }
    });
    // Visual order of the fields, page errors last.
    list.sort(function (a, b) {
      if (!a.unit || !b.unit) { return a.unit ? -1 : b.unit ? 1 : 0; }
      if (a.unit === b.unit) { return 0; }
      return a.unit.compareDocumentPosition(b.unit) & 4 ? -1 : 1;
    });
    each(list, function (r) {
      if (!r.msg) { r.msg = r.label || ""; }
      r.hint = r.page || root.classList.contains(ROOT + "--noHints") ? "" : hintFor(root, r.msg, r.ctl, r.label);
    });
    return list;
  }
  function signature(list) {
    var s = [];
    each(list, function (r) { s.push(r.id + "|" + r.msg); });
    return s.join("\n");
  }

  // ------------------------------------------------------------ render
  function render(root) {
    var list = scan(root);
    var sig = signature(list);
    var box = part(root, "summary");
    if (!box) { return; }
    if (sig === root._amcSig) { markChanged(root); return; }
    var had = !!root._amcSig;
    root._amcSig = sig;
    root._amcList = list;
    if (!list.length) {
      // Wait a moment: APEX clears errors right before it shows the next set.
      clearTimeout(root._amcClear);
      root._amcClear = setTimeout(function () {
        if (root._amcSig) { return; }
        box.hidden = true;
        root.classList.remove("is-invalid");
        empty(part(root, "list"));
        root._amcChanged = {};
      }, 150);
      return;
    }
    clearTimeout(root._amcClear);
    var fieldCount = 0;
    each(list, function (r) { if (!r.page) { fieldCount++; } });
    var n = fieldCount || list.length;
    var heading = part(root, "heading");
    heading.textContent = n === 1 ? str(root, "label-one", "1 field needs attention") : fmt(str(root, "label-many", "%0 fields need attention"), n);
    box.setAttribute("aria-labelledby", ensureId(heading));
    part(root, "intro").textContent = str(root, "label-intro", "Fix these, then save again. Select a message to go to its field.");
    var ul = part(root, "list");
    empty(ul);
    var keep = root._amcChanged || {};
    root._amcChanged = {};
    each(list, function (r, i) {
      var li = d.createElement("li");
      li.className = P + "item";
      li.setAttribute("data-amc-i", String(i));
      var main;
      if (r.page) {
        main = d.createElement("span");
        main.className = P + "pageMsg";
      } else {
        main = d.createElement("a");
        main.className = P + "link";
        main.href = "#" + (r.ctl && r.ctl.id ? r.ctl.id : r.id);
      }
      // The message already names the field in APEX's default texts; add the label only if not.
      if (r.label && r.msg.toLowerCase().indexOf(r.label.toLowerCase()) < 0) {
        var f = d.createElement("span");
        f.className = P + "field";
        f.textContent = r.label;
        main.appendChild(f);
      }
      var m = d.createElement("span");
      m.className = P + "msg";
      m.textContent = r.msg;
      main.appendChild(m);
      li.appendChild(main);
      if (r.hint) {
        var h = d.createElement("span");
        h.className = P + "hint";
        h.textContent = r.hint;
        li.appendChild(h);
      }
      var c = d.createElement("span");
      c.className = P + "changed";
      c.textContent = str(root, "label-changed", "Changed. It is checked again when you save.");
      li.appendChild(c);
      if (keep[r.id] && r.id) { li.classList.add("is-changed"); root._amcChanged[r.id] = true; }
      ul.appendChild(li);
    });
    box.hidden = false;
    root.classList.add("is-invalid");
    if (!had) { moveFocus(root, box); }
  }
  function empty(el) { if (el) { while (el.firstChild) { el.removeChild(el.firstChild); } } }
  function markChanged(root) {
    var ul = part(root, "list");
    var list = root._amcList || [];
    if (!ul) { return; }
    each(ul.children, function (li) {
      var r = list[parseInt(li.getAttribute("data-amc-i"), 10)];
      var on = !!(r && r.id && root._amcChanged && root._amcChanged[r.id]);
      if (li.classList.contains("is-changed") !== on) { li.classList.toggle("is-changed", on); }
    });
  }

  // Focus moves to the summary once per appearance of errors, unless the user is already busy
  // elsewhere or the No focus option is set; then the count is announced politely instead.
  function moveFocus(root, box) {
    var text = part(root, "heading").textContent;
    var a = d.activeElement;
    var busy = a && a !== d.body && a !== d.documentElement && !root.contains(a) && userActed;
    if (root.classList.contains(ROOT + "--noFocus") || busy) { say(root, text); return; }
    focusBox(box);
    root._amcFocusPending = true;
    setTimeout(function () { root._amcFocusPending = false; }, 1500);
  }
  function focusBox(box) {
    var rm = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try { box.focus({ preventScroll: true }); } catch (e) { box.focus(); }
    if (box.scrollIntoView) { box.scrollIntoView({ block: "nearest", behavior: rm ? "auto" : "smooth" }); }
  }
  function say(root, text) {
    var live = part(root, "live");
    if (!live) { return; }
    live.textContent = "";
    setTimeout(function () { live.textContent = text; }, 60);
  }
  function goTo(root, r) {
    if (!r) { return; }
    var api = r.id ? safeItem(r.id) : null;
    var rm = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (r.unit && r.unit.scrollIntoView) { r.unit.scrollIntoView({ block: "center", behavior: rm ? "auto" : "smooth" }); }
    if (api && api.node && typeof api.setFocus === "function") {
      try { api.setFocus(); if (r.unit && r.unit.contains(d.activeElement)) { return; } } catch (e) { /* DOM fallback */ }
    }
    var ctl = r.ctl;
    if (ctl && ctl.type === "hidden" && r.unit) { ctl = controlOf(r.unit); }
    if (ctl) { try { ctl.focus({ preventScroll: true }); } catch (e) { ctl.focus(); } }
  }

  // ------------------------------------------------------------ scheduling
  var queued = [];
  var timer = null;
  function queue(root) {
    if (queued.indexOf(root) < 0) { queued.push(root); }
    if (timer) { return; }
    timer = setTimeout(function () {
      timer = null;
      var list = queued;
      queued = [];
      each(list, function (r) { if (d.documentElement.contains(r)) { render(r); } });
    }, 40);
  }
  function initAll() { each(d.querySelectorAll("." + ROOT), render); }

  // ------------------------------------------------------------ delegated listeners
  d.addEventListener("click", function (e) {
    var a = closest(e.target, "." + P + "link");
    if (!a) { return; }
    var root = rootOf(a);
    var li = closest(a, "." + P + "item");
    if (!root || !li) { return; }
    e.preventDefault();
    goTo(root, (root._amcList || [])[parseInt(li.getAttribute("data-amc-i"), 10)]);
  });
  function edited(e) {
    var root = rootOf(e.target);
    if (!root || isOwn(e.target) || !root._amcList || !root._amcList.length) { return; }
    var unit = unitOf(e.target);
    each(root._amcList, function (r) {
      if (r.id && r.unit && (r.unit === unit || r.unit.contains(e.target))) {
        root._amcChanged = root._amcChanged || {};
        root._amcChanged[r.id] = true;
      }
    });
    markChanged(root);
  }
  d.addEventListener("input", edited);
  d.addEventListener("change", edited);
  d.addEventListener("keydown", function (e) { if (!e.isTrusted && e.isTrusted !== undefined) { return; } userActed = true; }, true);
  d.addEventListener("pointerdown", function () { userActed = true; }, true);

  // ------------------------------------------------------------ lifecycle
  function start() {
    // Deferred so APEX's own first-item focus on page load does not win over the summary.
    initAll();
    if (w.apex && w.apex.jQuery) {
      w.apex.jQuery(d).on("apexafterrefresh", function (e) {
        var t = e.target && e.target.nodeType === 1 ? e.target : null;
        each(d.querySelectorAll("." + ROOT), function (r) { if (!t || r.contains(t) || t.contains(r)) { queue(r); } });
      });
      w.apex.jQuery(w).on("apexreadyend", function () {
        each(d.querySelectorAll("." + ROOT), function (r) {
          var box = part(r, "summary");
          if (r._amcFocusPending && box && !box.hidden && d.activeElement !== box && !userActed) { focusBox(box); }
        });
      });
    }
    if (w.MutationObserver && d.body) {
      new w.MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var t = records[i].target;
          if (t.nodeType !== 1) { t = t.parentNode; }
          if (!t || isOwn(t)) { continue; }
          // Notification changes affect every frame; body changes only their own.
          var r = rootOf(t);
          if (r) { queue(r); } else { each(d.querySelectorAll("." + ROOT), queue); }
        }
      }).observe(d.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "aria-invalid"] });
    }
  }
  if (d.readyState === "loading") { d.addEventListener("DOMContentLoaded", start); } else { start(); }

  w.amcTplErrorSummary = {
    version: "1.0.0",
    refresh: function (el) { var r = el ? rootOf(el) || el : null; if (r) { render(r); } else { initAll(); } },
    result: function (el) {
      var r = el ? rootOf(el) || el : null;
      if (!r) { return null; }
      var out = [];
      each(scan(r), function (x) { out.push({ id: x.id, label: x.label, message: x.msg, hint: x.hint, page: !!x.page }); });
      return out;
    },
    hint: function (message, el) { var r = el ? rootOf(el) || el : d.querySelector("." + ROOT); return r ? hintFor(r, message, null) : ""; }
  };
})(window, document);
