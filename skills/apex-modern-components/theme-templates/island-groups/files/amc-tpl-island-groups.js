/* Island Groups: region template script. Finds the islands of each top-level Island Groups
   region (body blocks marked data-amc-island, and its sub regions, looking through the APEX
   grid wrappers), and balances them on the 12-column grid: an island's own data-amc-span, else
   the APEX column span of its grid wrapper, else a balanced layout that never leaves one island
   alone on the last row (4 islands: two rows of two; 5: three and two; 7: three, two, two).
   The spans are written as data-amc-island-span (wide) and data-amc-island-md (medium) on the
   islands; the CSS container queries decide which one applies. Hidden sub regions are left out.
   Re-runs after apexafterrefresh and when islands are added, removed, shown or hidden. Without
   JavaScript every island gets the default span of its width band. */
(function (w, d) {
  "use strict";
  if (w.amcTplIslandGroups) return;
  var ROOT = "amc-TIslandGroups", P = ROOT + "-";
  var SPANS = { 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1, 12: 1 };

  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList && el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function kid(root, name) {
    // The root's own part (not a nested island's).
    var g = null;
    for (var i = 0; i < root.children.length; i++) if (root.children[i].classList.contains(P + "grid")) g = root.children[i];
    if (!g || name === "grid") return g;
    for (var j = 0; j < g.children.length; j++) if (g.children[j].classList.contains(P + name)) return g.children[j];
    return null;
  }
  function visible(e) { return !!(e.getClientRects && e.getClientRects().length); }
  function wrapperCol(e) {
    for (var a = e.parentElement, n = 0; a && n < 3 && !a.id; a = a.parentElement, n++) {
      if (a.classList.contains(P + "subs")) break;
      var m = /(?:^|\s)col-(\d{1,2})(?:\s|$)/.exec(a.className || "");
      // Automatic column spans (apex-col-auto) are APEX's guess, not the developer's choice.
      if (m) return /(?:^|\s)apex-col-auto(?:\s|$)/.test(a.className) ? 0 : +m[1];
    }
    return 0;
  }
  function islands(root) {
    var out = [], body = kid(root, "body"), subs = kid(root, "subs");
    if (body) for (var i = 0; i < body.children.length; i++) if (body.children[i].hasAttribute("data-amc-island")) out.push(body.children[i]);
    (function walk(node, depth) {
      if (!node) return;
      for (var j = 0; j < node.children.length; j++) {
        var c = node.children[j];
        if (c.id) out.push(c);
        else if (depth < 3 && c.tagName === "DIV") walk(c, depth + 1);
      }
    })(subs, 0);
    return out;
  }
  // Balanced spans for n auto islands on 12 columns: rows of three, no orphan on the last row.
  function balance(n) {
    var s = [];
    if (n <= 0) return s;
    if (n === 1) return [12];
    if (n === 2 || n === 4) { for (var a = 0; a < n; a++) s.push(6); return s; }
    var tail = n % 3 === 1 ? 4 : n % 3 === 2 ? 2 : 0;
    for (var i = 0; i < n; i++) s.push(i >= n - tail ? 6 : 4);
    return s;
  }
  function layout(root) {
    if (closest(root.parentElement, ROOT)) return; // islands are laid out by their parent
    var all = islands(root), shown = [];
    for (var i = 0; i < all.length; i++) {
      var isl = all[i];
      if (!visible(isl)) { isl.removeAttribute("data-amc-island-span"); isl.removeAttribute("data-amc-island-md"); continue; }
      shown.push(isl);
    }
    // Pack in DOM order: explicit spans stay; a run of automatic islands first fills what is
    // left of the current row, then the rest of the run is balanced on fresh rows.
    var rem = 12, x = 0;
    while (x < shown.length) {
      var own = parseInt(shown[x].getAttribute("data-amc-span"), 10) || wrapperCol(shown[x]);
      if (own && SPANS[own]) {
        if (own > rem) rem = 12;
        shown[x].setAttribute("data-amc-island-span", String(own));
        rem -= own;
        if (rem <= 0) rem = 12;
        x++;
        continue;
      }
      var run = [];
      while (x < shown.length && !SPANS[parseInt(shown[x].getAttribute("data-amc-span"), 10) || wrapperCol(shown[x])]) run.push(shown[x++]);
      var fill = [];
      if (rem < 12) fill = rem === 8 && run.length >= 2 ? [4, 4] : SPANS[rem] ? [rem] : [];
      var spans = fill.concat(balance(run.length - fill.length));
      for (var k = 0; k < run.length; k++) run[k].setAttribute("data-amc-island-span", String(spans[k]));
      rem = 12;
    }
    // Medium band: pairs; an odd last island spans the row. Wide islands (8 and up) span it too.
    var col = 0;
    function isWide(e) { return !!e && +e.getAttribute("data-amc-island-span") >= 8; }
    for (var m = 0; m < shown.length; m++) {
      var wide = isWide(shown[m]);
      var alone = col === 0 && (m === shown.length - 1 || isWide(shown[m + 1]));
      if (wide || alone) { shown[m].setAttribute("data-amc-island-md", "12"); col = 0; }
      else { shown[m].setAttribute("data-amc-island-md", "6"); col = col ? 0 : 1; }
    }
    root.setAttribute("data-amc-islands", String(shown.length));
    root._amcCount = shown.length;
  }
  function schedule(root) {
    clearTimeout(root._amcT);
    root._amcT = setTimeout(function () { layout(root); }, 60);
  }
  function init(root) {
    if (root._amcInit) return;
    root._amcInit = true;
    layout(root);
    var grid = kid(root, "grid");
    if (w.MutationObserver && grid && !closest(root.parentElement, ROOT)) {
      root._amcObs = new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) {
          var r = list[i];
          if (r.type === "attributes" && /^data-amc-island/.test(r.attributeName || "")) continue;
          schedule(root);
          return;
        }
      });
      root._amcObs.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden", "data-amc-span"] });
    }
  }
  function initAll() {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }
  if (w.apex && w.apex.jQuery) {
    w.apex.jQuery(d).on("apexafterrefresh", function (e) {
      var t = e.target && e.target.nodeType === 1 ? e.target : null, roots = d.querySelectorAll("." + ROOT);
      for (var i = 0; i < roots.length; i++) {
        if (!t || roots[i].contains(t) || t.contains(roots[i])) { init(roots[i]); layout(roots[i]); }
      }
    });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initAll); else initAll();

  w.amcTplIslandGroups = {
    init: initAll,
    refresh: function (elm) {
      var r = closest(elm, ROOT);
      while (r && closest(r.parentElement, ROOT)) r = closest(r.parentElement, ROOT);
      if (r) { init(r); layout(r); }
    },
    islands: function (elm) {
      var r = closest(elm, ROOT);
      return r ? islands(r).map(function (e) {
        return { id: e.id || null, span: e.getAttribute("data-amc-island-span"), md: e.getAttribute("data-amc-island-md"), visible: visible(e) };
      }) : [];
    }
  };
})(window, document);
