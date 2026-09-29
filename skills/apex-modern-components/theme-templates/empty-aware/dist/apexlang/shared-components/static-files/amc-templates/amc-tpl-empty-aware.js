/* Empty Aware: region template script. Decides whether the native content of the region has
   anything to show, and if not, replaces the dead end with the template's empty state.
   Empty means: no data rows in any report table, no cards in any card list, and at least one of
   an APEX no-data message (Classic Report .nodatafound, Interactive Report .a-IRR-noDataMsg,
   Interactive Grid .a-GV-noDataMsg, any element whose class names no data, or an element marked
   data-amc-no-data), a table with headers but no data rows, an empty card list, or a body with no
   content at all. The no-data message and header-only tables get data-amc-empty-hidden (hidden by
   the CSS, removed again on restore); toolbars and filters stay visible. The region's Create
   button moves into the empty state and back. Re-checks after apexafterrefresh and on body
   mutations. Text is set with textContent only. */
(function (w, d) {
  "use strict";
  if (w.amcTplEmptyAware) return;
  var ROOT = "amc-TEmptyAware", P = ROOT + "-", MARK = "data-amc-empty-hidden";
  var NO_DATA = ".nodatafound, .a-IRR-noDataMsg, .a-GV-noDataMsg, .t-Report-noDataMsg, [data-amc-no-data], [class*='noData'], [class*='nodata'], [class*='NoData'], [class*='no-data']";
  var CARDS = "ul[class*='Cards'], ol[class*='Cards'], ul[class*='CardView'], [class*='CardView-items'], [data-amc-cards]";

  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList && el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function part(root, name) {
    // The root's own part, not one of a nested Empty Aware region.
    var list = root.querySelectorAll("." + P + name);
    for (var i = 0; i < list.length; i++) if (closest(list[i], ROOT) === root) return list[i];
    return null;
  }
  function mine(root, e) { return closest(e, ROOT) === root && !closest(e, P + "empty"); }
  function visible(e) { return !!(e.getClientRects && e.getClientRects().length); }
  function norm(s) { return String(s || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, ""); }

  function dataRows(table) {
    var rows = table.tBodies.length ? table.tBodies[0].rows : table.rows, n = 0;
    for (var b = 0; b < table.tBodies.length; b++) {
      var r = table.tBodies[b].rows;
      for (var i = 0; i < r.length; i++) if (r[i].querySelector("td") && visible(r[i]) && !r[i].querySelector(NO_DATA)) n++;
    }
    if (!table.tBodies.length) for (var j = 0; j < rows.length; j++) if (rows[j].querySelector("td")) n++;
    return n;
  }

  // Returns { empty, markers, text } for the region body.
  function inspect(root) {
    var body = part(root, "body"), res = { empty: false, markers: [], text: "" };
    if (!body) return res;
    // Undo our own marks first so visibility reflects the native state.
    var old = body.querySelectorAll("[" + MARK + "]");
    for (var o = 0; o < old.length; o++) old[o].removeAttribute(MARK);

    var rows = 0, tables = body.querySelectorAll("table"), headerOnly = [];
    for (var t = 0; t < tables.length; t++) {
      if (!mine(root, tables[t]) || !visible(tables[t])) continue;
      var n = dataRows(tables[t]);
      rows += n;
      if (!n && tables[t].querySelector("th")) headerOnly.push(tables[t]);
    }
    var cards = 0, lists = body.querySelectorAll(CARDS), emptyLists = 0;
    for (var c = 0; c < lists.length; c++) {
      if (!mine(root, lists[c])) continue;
      var items = lists[c].children.length;
      cards += items;
      if (!items) emptyLists++;
    }
    var markers = [], cand = body.querySelectorAll(NO_DATA);
    for (var m = 0; m < cand.length; m++) {
      var e = cand[m];
      if (!mine(root, e) || !visible(e)) continue;
      var inner = false;
      for (var k = 0; k < markers.length; k++) if (markers[k].contains(e)) inner = true;
      if (!inner) markers.push(e);
    }
    var bare = !norm(body.textContent) && !body.querySelector("img, svg, canvas, iframe, input, select, textarea, video, object");
    if (rows || cards) return res;
    if (markers.length || headerOnly.length || emptyLists || bare) {
      res.empty = true;
      res.markers = markers.concat(headerOnly);
      res.text = markers.length ? norm(markers[0].textContent) : "";
    }
    return res;
  }

  function moveCreate(root, intoEmpty) {
    var create = root._amcCreate, target = intoEmpty ? part(root, "emptyAction") : root._amcCreateHome;
    if (!create || !target || create.parentNode === target || !create.firstElementChild) return;
    var active = d.activeElement, had = active && create.contains(active);
    target.appendChild(create);
    if (had) try { active.focus({ preventScroll: true }); } catch (e) { active.focus(); }
  }

  function update(root) {
    var body = part(root, "body"), panel = part(root, "empty");
    if (!body || !panel) return;
    root._amcBusy = true;
    root.classList.remove("is-bare");
    var r = inspect(root), was = root.classList.contains("is-empty");
    if (r.empty) {
      for (var i = 0; i < r.markers.length; i++) r.markers[i].setAttribute(MARK, "");
      var title = root.getAttribute("data-amc-empty-title") || r.text || root.getAttribute("data-amc-text-fallback") || "Nothing to show";
      var hint = root.getAttribute("data-amc-empty-hint") || "";
      part(root, "emptyTitle").textContent = title;
      var h = part(root, "emptyHint");
      h.textContent = hint;
      h.hidden = !hint;
      root.classList.add("is-empty");
      panel.hidden = false;
      moveCreate(root, true);
      // Nothing native left to show (no toolbar or filters): collapse the body.
      if (body.getBoundingClientRect().height < 2) root.classList.add("is-bare");
      if (!was || root._amcSaid !== title) {
        var live = part(root, "live");
        if (live) live.textContent = hint ? title + " " + hint : title;
        root._amcSaid = title;
      }
    } else {
      root.classList.remove("is-empty");
      panel.hidden = true;
      moveCreate(root, false);
      if (was) {
        var live2 = part(root, "live"), name = norm((part(root, "title") || {}).textContent);
        if (live2) live2.textContent = (root.getAttribute("data-amc-text-restored") || "%0 updated").replace(/%0/g, name);
        root._amcSaid = null;
      }
    }
    root._amcBusy = false;
    if (root._amcObs) root._amcObs.takeRecords();
  }
  function schedule(root) {
    if (root._amcBusy) return;
    clearTimeout(root._amcT);
    root._amcT = setTimeout(function () { update(root); }, 60);
  }
  function init(root) {
    if (root._amcInit) return;
    root._amcInit = true;
    root._amcCreate = part(root, "create");
    root._amcCreateHome = root._amcCreate && root._amcCreate.parentNode;
    update(root);
    var body = part(root, "body");
    if (w.MutationObserver && body) {
      root._amcObs = new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) if (list[i].attributeName !== MARK) { schedule(root); return; }
      });
      root._amcObs.observe(body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["style", "class", "hidden"] });
    }
  }
  function initAll() {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }
  if (w.apex && w.apex.jQuery) {
    w.apex.jQuery(d).on("apexafterrefresh", function (e) {
      var t = e && e.target && e.target.nodeType === 1 ? e.target : null, roots = d.querySelectorAll("." + ROOT);
      for (var i = 0; i < roots.length; i++) {
        if (!t || roots[i].contains(t) || t.contains(roots[i])) { init(roots[i]); update(roots[i]); }
      }
    });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initAll); else initAll();

  w.amcTplEmptyAware = {
    init: initAll,
    refresh: function (elm) { var r = closest(elm, ROOT); if (r) { init(r); update(r); } },
    isEmpty: function (elm) { var r = closest(elm, ROOT); return !!(r && r.classList.contains("is-empty")); },
    // Refreshes the framed APEX region when the page gives it a region static id.
    reload: function (elm) {
      var r = closest(elm, ROOT);
      try { if (r && w.apex && w.apex.region && r.id && w.apex.region(r.id) && w.apex.region(r.id).refresh) w.apex.region(r.id).refresh(); } catch (e) { /* not an APEX region */ }
    }
  };
})(window, document);
