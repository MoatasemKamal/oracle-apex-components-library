/* APEX Modern Components - Form Progress region template runtime.
 * Zeigarnik effect, used honestly: the frame counts the REQUIRED items of the form it wraps and
 * shows how many are filled ("4 of 7 required fields done") with one meter segment per required
 * item along the top edge. Nothing is invented: only visible, enabled required items count, and a
 * value counts as filled only when the item is not empty (apex.item().isEmpty() when available).
 * Required items are found by Universal Theme markup: an is-required container, a required or
 * aria-required="true" control, or a required marker in the label (a visually hidden
 * "(Value Required)" text, a .t-Form-required element or a trailing "*").
 * The "Next" button and a click on a segment move focus to the next empty required item.
 * Changes are announced politely once per completed edit (change / focusout), never per keystroke.
 * ES5, delegated listeners on document, textContent only, APEX APIs guarded, re-init on
 * apexafterrefresh with a MutationObserver fallback. Strings come from data-amc-* attributes. */
(function (w, d) {
  "use strict";
  if (w.amcTplFormProgress || !d.querySelectorAll || !d.addEventListener) { return; }

  var ROOT = "amc-TFormProgress";
  var P = ROOT + "-";
  var OWN = "." + P + "meter, ." + P + "status, ." + P + "live, ." + P + "draft, ." + P + "optional";
  var SR = ".u-VisuallyHidden, .visuallyhidden, .t-Form-required, ." + P + "optional, [aria-hidden=\"true\"]";
  var UNIT = ".t-Form-fieldContainer, .apex-item-wrapper";
  var FIELDS = "input, select, textarea";

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
  function fmt(t, a, b) { return String(t).replace("%0", a).replace("%1", b === undefined ? "" : b); }
  function part(root, name) { return root.querySelector("." + P + name); }
  function bodyOf(root) { return part(root, "body"); }
  function rootOf(el) { return closest(el, "." + ROOT); }
  function visible(el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); }
  function isOwn(el) { return !!closest(el, OWN); }

  // ------------------------------------------------------------ items
  function controlsOf(unit) {
    if (matches(unit, FIELDS)) { return [unit]; }
    var out = [];
    each(unit.querySelectorAll(FIELDS), function (c) {
      if (!/^(submit|button|reset|image)$/i.test(c.type || "")) { out.push(c); }
    });
    return out;
  }
  function itemId(unit, controls) {
    if (unit.id && /_CONTAINER$/.test(unit.id)) { return unit.id.replace(/_CONTAINER$/, ""); }
    for (var i = 0; i < controls.length; i++) {
      if (controls[i].id && controls[i].type !== "hidden") { return controls[i].id; }
    }
    return controls[0] ? controls[0].id || controls[0].name || "" : "";
  }
  function labelOf(root, unit, controls) {
    var lab = unit.querySelector(".t-Form-label") || unit.querySelector("label, legend");
    if (!lab && controls[0] && controls[0].id) {
      each(root.querySelectorAll("label"), function (l) { if (!lab && l.htmlFor === controls[0].id) { lab = l; } });
    }
    if (!lab) { lab = closest(unit, "label"); }
    return lab;
  }
  // Label text without the hidden "(Value Required)" note, the asterisk or our own tags.
  function labelText(lab, fallback) {
    if (!lab) { return fallback; }
    var parts = [];
    (function walk(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { parts.push(c.nodeValue); }
        else if (c.nodeType === 1 && !matches(c, SR)) { walk(c); }
      }
    })(lab);
    var t = parts.join(" ").replace(/\s+/g, " ").replace(/\s*\*\s*$/, "").replace(/^\s+|\s+$/g, "");
    return t || fallback;
  }
  function isRequired(root, unit, controls, lab) {
    if (unit.classList.contains("is-required")) { return true; }
    for (var i = 0; i < controls.length; i++) {
      if (controls[i].required || controls[i].getAttribute("aria-required") === "true") { return true; }
    }
    if (unit.querySelector("[aria-required=\"true\"]")) { return true; }
    if (!lab) { return false; }
    if (lab.querySelector(".t-Form-required")) { return true; }
    var marker = str(root, "required-marker", "Value Required").toLowerCase();
    var hidden = lab.querySelectorAll(".u-VisuallyHidden, .visuallyhidden");
    for (var j = 0; j < hidden.length; j++) {
      if ((hidden[j].textContent || "").toLowerCase().indexOf(marker) > -1) { return true; }
    }
    return /\*\s*$/.test(lab.textContent || "");
  }
  function isFilled(id, controls) {
    var api = w.apex && w.apex.item && id ? safeItem(id) : null;
    if (api && api.node && typeof api.isEmpty === "function") {
      try { return !api.isEmpty(); } catch (e) { /* fall through to the DOM */ }
    }
    var shown = [];
    each(controls, function (c) { if (c.type !== "hidden") { shown.push(c); } });
    var list = shown.length ? shown : controls;
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (/^(radio|checkbox)$/i.test(c.type || "")) { if (c.checked) { return true; } }
      else if (String(c.value || "").replace(/^\s+|\s+$/g, "") !== "") { return true; }
    }
    return false;
  }
  function safeItem(id) { try { return w.apex.item(id); } catch (e) { return null; } }
  function disabled(controls) {
    if (!controls.length) { return true; }
    for (var i = 0; i < controls.length; i++) { if (!controls[i].disabled) { return false; } }
    return true;
  }

  // Units: UT field containers (outermost only), or bare controls outside any container.
  function unitsOf(body) {
    var units = [];
    each(body.querySelectorAll(UNIT), function (u) {
      if (isOwn(u)) { return; }
      var outer = u.parentNode ? closest(u.parentNode, UNIT) : null;
      if (!outer || !body.contains(outer)) { units.push(u); }
    });
    each(body.querySelectorAll(FIELDS), function (c) {
      if (isOwn(c) || c.type === "hidden" || /^(submit|button|reset|image)$/i.test(c.type || "")) { return; }
      if (!closest(c, UNIT)) { units.push(c); }
    });
    return units;
  }

  function scan(root) {
    var body = bodyOf(root);
    var items = [];
    var optional = [];
    if (!body) { return { items: items, optional: optional }; }
    each(unitsOf(body), function (unit) {
      var controls = controlsOf(unit);
      if (!controls.length || !visible(unit) || disabled(controls)) { return; }
      var lab = labelOf(root, unit, controls);
      var id = itemId(unit, controls);
      var rec = { unit: unit, controls: controls, id: id, label: labelText(lab, id), lab: lab };
      if (isRequired(root, unit, controls, lab)) {
        rec.filled = isFilled(id, controls);
        items.push(rec);
      } else {
        optional.push(rec);
      }
    });
    return { items: items, optional: optional };
  }

  // ------------------------------------------------------------ render
  function render(root, announce) {
    var res = scan(root);
    var items = res.items;
    root._amcItems = items;
    var meter = part(root, "meter");
    var status = part(root, "status");
    var draft = part(root, "draft");
    var done = 0;
    each(items, function (it) { if (it.filled) { done++; } });
    var total = items.length;
    root.classList.toggle("is-tracking", total > 0);
    root.classList.toggle("is-complete", total > 0 && done === total);
    markOptional(root, res.optional);
    if (!total) {
      if (meter) { meter.hidden = true; }
      if (status) { status.hidden = true; }
      if (draft) { draft.hidden = true; }
      root._amcSaid = null;
      return;
    }
    // Meter: one segment per required item, reused so transitions run.
    if (meter) {
      meter.hidden = false;
      meter.classList.toggle(P + "meter--continuous", total > 24 || root.classList.contains(ROOT + "--bar"));
      while (meter.children.length > total) { meter.removeChild(meter.lastChild); }
      while (meter.children.length < total) {
        var seg = d.createElement("span");
        seg.className = P + "seg";
        meter.appendChild(seg);
      }
      var nextIdx = nextEmpty(items, -1);
      each(items, function (it, i) {
        var s = meter.children[i];
        s.setAttribute("data-amc-i", String(i));
        s.classList.toggle("is-filled", !!it.filled);
        s.classList.toggle("is-next", i === nextIdx);
        s.style.setProperty("--amc-tfp-i", String(i));
        s.title = it.label + ": " + (it.filled ? str(root, "label-filled", "filled") : str(root, "label-empty", "still empty"));
      });
      meter.style.setProperty("--amc-tfp-fill", String(done / total));
    }
    var text = done === total ? fmt(str(root, "label-done", "All %0 required fields done"), total)
      : fmt(str(root, "label-count", "%0 of %1 required fields done"), done, total);
    if (status) {
      status.hidden = false;
      var ct = part(root, "countText");
      if (ct && ct.textContent !== text) { ct.textContent = text; }
      var btn = part(root, "next");
      var n = targetIndex(root, items);
      root._amcNextIdx = n;
      if (btn) {
        btn.hidden = n < 0;
        if (n > -1) {
          var bt = fmt(str(root, "label-next", "Next: %0"), items[n].label);
          if (btn.textContent !== bt) { btn.textContent = bt; }
        }
      }
    }
    if (draft) {
      var want = root.classList.contains(ROOT + "--draftHint") && done > 0 && done < total;
      draft.hidden = !want;
      if (want) { draft.textContent = str(root, "label-draft", "Save a draft now and finish the rest later."); }
    }
    // Announce only what changed since the last announcement (typing updates the view silently).
    if (root._amcSaid === undefined || root._amcSaid === null) { root._amcSaid = text; }
    else if (announce && root._amcSaid !== text) { root._amcSaid = text; say(root, text); }
  }
  function say(root, text) {
    var live = part(root, "live");
    if (!live) { return; }
    live.textContent = "";
    setTimeout(function () { live.textContent = text; }, 60);
  }
  function currentIndex(root, items) {
    var a = d.activeElement;
    if (!a || !root.contains(a)) { return -1; }
    for (var i = 0; i < items.length; i++) { if (items[i].unit === a || items[i].unit.contains(a)) { return i; } }
    return -1;
  }
  // The Next button points at the next empty item after the focused one. While focus is on the
  // button itself it keeps pointing where it did, so its label and its action always agree.
  function targetIndex(root, items) {
    var a = d.activeElement;
    var keep = root._amcNextIdx;
    if (a && closest(a, "." + P + "status") && rootOf(a) === root && keep > -1 && items[keep] && !items[keep].filled) { return keep; }
    return nextEmpty(items, currentIndex(root, items));
  }
  function nextEmpty(items, from) {
    for (var k = 1; k <= items.length; k++) {
      var i = (from + k + items.length) % items.length;
      if (from < 0) { i = k - 1; }
      if (!items[i].filled) { return i; }
    }
    return -1;
  }
  function focusItem(root, it) {
    if (!it) { return; }
    var api = w.apex && w.apex.item && it.id ? safeItem(it.id) : null;
    var target = null;
    each(it.controls, function (c) { if (!target && c.type !== "hidden" && !c.disabled) { target = c; } });
    if (api && api.node && typeof api.setFocus === "function") {
      try { api.setFocus(); if (d.activeElement && it.unit.contains(d.activeElement)) { return; } } catch (e) { /* DOM fallback */ }
    }
    if (target) {
      var rm = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;
      try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
      if (it.unit.scrollIntoView) { it.unit.scrollIntoView({ block: "center", behavior: rm ? "auto" : "smooth" }); }
    }
  }

  // Form design: when most fields are required, mark the optional ones instead. The tag goes
  // inside the label so it works with floating and above labels and is read with the label.
  function markOptional(root, optional) {
    var on = root.classList.contains(ROOT + "--markOptional");
    var want = [];
    if (on) { each(optional, function (o) { if (o.lab && (o.lab.tagName === "LABEL" || o.lab.classList.contains("t-Form-label"))) { want.push(o.lab); } }); }
    each(root.querySelectorAll("." + P + "optional"), function (tag) {
      if (want.indexOf(tag.parentNode) < 0 && tag.parentNode) { tag.parentNode.removeChild(tag); }
    });
    each(want, function (lab) {
      if (lab.querySelector("." + P + "optional")) { return; }
      var tag = d.createElement("span");
      tag.className = P + "optional";
      tag.textContent = str(root, "label-optional", "Optional");
      lab.appendChild(tag);
    });
  }

  // ------------------------------------------------------------ scheduling
  var pending = [];
  var rafId = null;
  function queue(root, announce) {
    for (var i = 0; i < pending.length; i++) {
      if (pending[i].root === root) { pending[i].announce = pending[i].announce || announce; return schedule(); }
    }
    pending.push({ root: root, announce: announce });
    schedule();
  }
  function schedule() {
    if (rafId) { return; }
    var run = function () {
      rafId = null;
      var list = pending;
      pending = [];
      each(list, function (p) { if (d.documentElement.contains(p.root)) { render(p.root, p.announce); } });
    };
    rafId = w.requestAnimationFrame ? w.requestAnimationFrame(run) : setTimeout(run, 16);
  }
  function initAll() { each(d.querySelectorAll("." + ROOT), function (r) { render(r, false); }); }

  // ------------------------------------------------------------ delegated listeners
  d.addEventListener("input", function (e) { var r = rootOf(e.target); if (r && !isOwn(e.target)) { queue(r, false); } });
  d.addEventListener("change", function (e) { var r = rootOf(e.target); if (r && !isOwn(e.target)) { queue(r, true); } });
  d.addEventListener("focusout", function (e) { var r = rootOf(e.target); if (r && !isOwn(e.target)) { queue(r, true); } });
  d.addEventListener("focusin", function (e) {
    // The Next label follows the focused item ("the next empty one after this").
    var r = rootOf(e.target);
    if (r && !isOwn(e.target)) { queue(r, false); }
  });
  d.addEventListener("click", function (e) {
    var t = e.target;
    var btn = closest(t, "." + P + "next");
    var seg = !btn && closest(t, "." + P + "seg");
    if (!btn && !seg) { return; }
    var root = rootOf(t);
    if (!root) { return; }
    render(root, false);
    var items = root._amcItems || [];
    var idx;
    if (seg) {
      idx = parseInt(seg.getAttribute("data-amc-i"), 10);
      // A filled segment jumps to its own item; an empty one to itself too (it is the next to do).
      if (!(idx >= 0 && idx < items.length)) { idx = nextEmpty(items, -1); }
    } else {
      idx = root._amcNextIdx;
    }
    focusItem(root, items[idx]);
  });

  // ------------------------------------------------------------ lifecycle
  function start() {
    initAll();
    if (w.apex && w.apex.jQuery) {
      w.apex.jQuery(d).on("apexafterrefresh", function (e) {
        var t = e.target && e.target.nodeType === 1 ? e.target : null;
        each(d.querySelectorAll("." + ROOT), function (r) { if (!t || r.contains(t) || t.contains(r)) { queue(r, true); } });
      });
    }
    if (w.MutationObserver && d.body) {
      new w.MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var t = records[i].target;
          if (t.nodeType !== 1) { t = t.parentNode; }
          if (!t || isOwn(t)) { continue; }
          var r = rootOf(t);
          if (r) { queue(r, false); }
          else if (records[i].addedNodes && records[i].addedNodes.length) {
            each(d.querySelectorAll("." + ROOT), function (x) { if (t.contains(x)) { queue(x, false); } });
          }
        }
      }).observe(d.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden", "disabled", "required", "aria-required"] });
    }
  }
  if (d.readyState === "loading") { d.addEventListener("DOMContentLoaded", start); } else { start(); }

  w.amcTplFormProgress = {
    version: "1.0.0",
    refresh: function (el) { var r = el ? rootOf(el) || el : null; if (r) { render(r, false); } else { initAll(); } },
    result: function (el) {
      var r = el ? rootOf(el) || el : null;
      if (!r) { return null; }
      render(r, false);
      var items = r._amcItems || [];
      var out = { total: items.length, done: 0, items: [] };
      each(items, function (it) { if (it.filled) { out.done++; } out.items.push({ id: it.id, label: it.label, filled: !!it.filled }); });
      return out;
    }
  };
})(window, document);
