/* Arrange Board: region template script (experimental). Finds the regions that use this template,
   groups those that share a parent (a parent region or the same page position) into a board, turns
   the parent into a 12-column grid and flattens the APEX rows and columns in between with
   display: contents. Moving a region moves its own grid wrapper in the DOM, so tab order always
   follows the visual order. Each original position keeps an empty comment as a slot marker, which
   makes Reset exact. Order, widths and collapsed state are stored in localStorage per application
   and page; nothing leaves the browser. A group whose markup is not a plain wrapper chain (other
   visible content in between) is left alone: its regions keep only the collapse button. */
(function (w, d) {
  "use strict";
  if (w.amcTplArrangeBoard) return;
  var ROOT = "amc-TArrangeBoard", FLAT = ROOT + "-flat", OTHER = ROOT + "-other", BOARD = ROOT + "-board",
    SIZES = ["S", "M", "L"], MAX_WRAPPERS = 3, SKIP = { SCRIPT: 1, STYLE: 1, LINK: 1, TEMPLATE: 1, META: 1, NOSCRIPT: 1 };
  var boards = [], seq = 0;

  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function part(root, name) { return root.querySelector("." + ROOT + "-" + name); }
  function has(root, mod) { return root.classList.contains(ROOT + "--" + mod); }
  function attr(root, name) { return (root && root.getAttribute("data-amc-" + name)) || ""; }
  function fmt(s, args) { return s.replace(/%(\d)/g, function (m, i) { return args[+i] !== undefined ? args[+i] : m; }); }
  function title(root) { var h = part(root, "title"); return h ? h.textContent.replace(/\s+/g, " ").trim() : root.id; }
  function scope() {
    var a = w.apex && w.apex.env;
    return a && a.APP_ID ? a.APP_ID + ":" + a.APP_PAGE_ID : w.location.pathname;
  }
  function key() { return "amc-tpl-arrange-board:" + scope(); }
  function load() {
    try { var v = JSON.parse(w.localStorage.getItem(key()) || "null"); if (v && typeof v === "object") return { o: v.o || {}, w: v.w || {}, c: v.c || {} }; } catch (e) { /* blocked or corrupt */ }
    return { o: {}, w: {}, c: {} };
  }
  function save(st) {
    try {
      var empty = !Object.keys(st.o).length && !Object.keys(st.w).length && !Object.keys(st.c).length;
      if (empty) w.localStorage.removeItem(key()); else w.localStorage.setItem(key(), JSON.stringify(st));
    } catch (e) { /* storage blocked */ }
  }
  function say(board, root, msg) {
    var s = board ? board.status : part(root, "status");
    if (!s) return;
    s.textContent = "";
    setTimeout(function () { s.textContent = msg; }, 50);
  }
  function rendered(el) { return el.getClientRects().length > 0; }
  function blank(el) { return !el.children.length && !el.textContent.trim(); }

  // ------------------------------------------------------------ board detection
  function leaves() {
    var all = d.querySelectorAll("." + ROOT), out = [];
    for (var i = 0; i < all.length; i++) if (!all[i].querySelector("." + ROOT)) out.push(all[i]);
    return out;
  }
  function depth(el) { var n = 0; while (el) { n++; el = el.parentElement; } return n; }
  // Wrappers between each leaf and the board must hold nothing visible except the path itself.
  function pure(board, list) {
    for (var i = 0; i < list.length; i++) {
      var n = list[i], hops = 0;
      while (n.parentElement !== board) {
        var p = n.parentElement;
        if (!p || ++hops > MAX_WRAPPERS) return false;
        for (var c = p.firstChild; c; c = c.nextSibling) {
          if (c.nodeType === 3 && c.nodeValue.trim()) return false;
          if (c.nodeType !== 1 || SKIP[c.tagName]) continue;
          var onPath = false;
          for (var j = 0; j < list.length && !onPath; j++) onPath = c.contains(list[j]);
          if (!onPath && rendered(c) && !blank(c)) return false;
        }
        n = p;
      }
    }
    return true;
  }
  // Build on the tightest common parent of the group (APEX grid container), not an outer body.
  function lca(list) {
    var n = list[0].parentElement, i, all;
    for (; n; n = n.parentElement) {
      for (all = true, i = 1; i < list.length && all; i++) all = n.contains(list[i]);
      if (all) return n;
    }
    return d.body;
  }
  function detect() {
    var free = leaves().filter(function (r) { return !r._amcBoard && !r._amcSolo; }), cands = [], i, n;
    if (!free.length) return;
    for (i = 0; i < free.length; i++) {
      for (n = free[i].parentElement; n && n !== d.body && n !== d.documentElement; n = n.parentElement) {
        if (cands.indexOf(n) < 0) cands.push(n);
      }
    }
    cands.sort(function (a, b) { return depth(a) - depth(b); }); // shallow first: widest pure group wins
    for (i = 0; i < cands.length; i++) {
      var inside = free.filter(function (r) { return !r._amcBoard && cands[i].contains(r); });
      if (inside.length >= 2 && pure(cands[i], inside)) build(lca(inside), inside);
    }
    for (i = 0; i < free.length; i++) if (!free[i]._amcBoard) { free[i]._amcSolo = true; initSolo(free[i]); }
  }

  function build(el, list) {
    var b = { el: el, items: {}, slots: [], ids: [], roots: {} }, i, st = load();
    for (i = 0; i < list.length; i++) {
      var r = list[i];
      if (!r.id) r.id = "amc-tab-" + (++seq);
      // The item is the outermost wrapper below the board that holds only this region.
      var top = r;
      while (top.parentElement !== el) {
        var p = top.parentElement, others = false;
        for (var j = 0; j < list.length; j++) if (list[j] !== r && p.contains(list[j])) others = true;
        if (others) break;
        top = p;
      }
      for (var f = r.parentElement; f !== el; f = f.parentElement) f.classList.add(FLAT);
      var marker = d.createComment("amc-arrange-slot");
      top.parentNode.insertBefore(marker, top);
      b.slots.push(marker);
      b.items[r.id] = top;
      b.roots[r.id] = r;
      b.ids.push(r.id);
      r._amcBoard = b;
      r.classList.add("is-boarded");
    }
    // Blank spacers inside flattened wrappers must not become grid cells.
    var flats = el.querySelectorAll("." + FLAT);
    for (i = 0; i < flats.length; i++) {
      for (var c = flats[i].firstElementChild; c; c = c.nextElementSibling) if (blank(c) && !SKIP[c.tagName]) c.classList.add(FLAT);
    }
    for (var k = el.firstElementChild; k; k = k.nextElementSibling) {
      if (!k.classList.contains(FLAT) && !k.classList.contains(ROOT) && !SKIP[k.tagName]) k.classList.add(OTHER);
    }
    el.classList.add(BOARD);
    b.sig = b.ids.join("|");
    b.bar = bar(b, list[0]);
    el.parentNode.insertBefore(b.bar, el);
    boards.push(b);
    // Restore stored state.
    b.order = merge(st.o[b.sig], b.ids);
    for (i = 0; i < b.ids.length; i++) {
      var root = b.roots[b.ids[i]];
      setSize(root, st.w[root.id] || defSize(root));
      setCollapsed(root, st.c.hasOwnProperty(root.id) ? !!st.c[root.id] : has(root, "collapsed"));
      root.classList.add("is-ready");
    }
    place(b);
    watch(b);
    status(b);
  }
  function merge(stored, ids) {
    var out = [], i;
    if (stored && stored.length) for (i = 0; i < stored.length; i++) if (ids.indexOf(stored[i]) >= 0 && out.indexOf(stored[i]) < 0) out.push(stored[i]);
    for (i = 0; i < ids.length; i++) if (out.indexOf(ids[i]) < 0) out.push(ids[i]);
    return out;
  }
  function bar(b, first) {
    var el = d.createElement("div"), g = d.createElement("span"), t = d.createElement("span"), btn = d.createElement("button"), s = d.createElement("span");
    el.className = ROOT + "-bar";
    g.className = ROOT + "-barGlyph";
    g.setAttribute("aria-hidden", "true");
    t.className = ROOT + "-barText";
    btn.type = "button";
    btn.className = ROOT + "-reset";
    btn.textContent = attr(first, "reset") || "Reset layout";
    s.className = ROOT + "-sr";
    s.setAttribute("role", "status");
    s.setAttribute("aria-live", "polite");
    el.appendChild(g); el.appendChild(t); el.appendChild(btn); el.appendChild(s);
    el._amcBoard = b;
    b.text = t;
    b.status = s;
    b.first = first;
    return el;
  }
  function watch(b) {
    function fit() {
      var wd = b.el.getBoundingClientRect().width;
      b.el.classList.toggle("is-narrow", wd < 560);
      b.el.classList.toggle("is-mid", wd >= 560 && wd < 880);
    }
    fit();
    if (w.ResizeObserver) new w.ResizeObserver(fit).observe(b.el); else w.addEventListener("resize", fit);
  }

  // ------------------------------------------------------------ state
  function defSize(root) { return has(root, "defS") ? "S" : has(root, "defL") ? "L" : "M"; }
  function setSize(root, size) {
    if (SIZES.indexOf(size) < 0) size = "M";
    for (var i = 0; i < SIZES.length; i++) root.classList.toggle("is-size" + SIZES[i], SIZES[i] === size);
    var btns = root.querySelectorAll("." + ROOT + "-size");
    for (i = 0; i < btns.length; i++) btns[i].setAttribute("aria-pressed", btns[i].getAttribute("data-amc-size") === size ? "true" : "false");
    root._amcSize = size;
  }
  function setCollapsed(root, on) {
    root.classList.toggle("is-collapsed", on);
    var c = part(root, "collapse");
    if (c) c.setAttribute("aria-expanded", on ? "false" : "true");
  }
  function place(b) {
    for (var k = 0; k < b.order.length; k++) {
      var item = b.items[b.order[k]], slot = b.slots[k];
      if (slot.nextSibling !== item) slot.parentNode.insertBefore(item, slot.nextSibling);
    }
    for (k = 0; k < b.order.length; k++) {
      var r = b.roots[b.order[k]];
      r.querySelector("[data-amc-act=earlier]").setAttribute("aria-disabled", k === 0 ? "true" : "false");
      r.querySelector("[data-amc-act=later]").setAttribute("aria-disabled", k === b.order.length - 1 ? "true" : "false");
    }
  }
  function custom(b, st) {
    if (st.o[b.sig]) return true;
    for (var i = 0; i < b.ids.length; i++) if (st.w.hasOwnProperty(b.ids[i]) || st.c.hasOwnProperty(b.ids[i])) return true;
    return false;
  }
  function status(b) {
    var on = custom(b, load());
    b.bar.classList.toggle("is-custom", on);
    b.text.textContent = attr(b.first, on ? "custom" : "default") || (on ? "Your layout" : "Default layout");
  }
  function persist(b, root, what) {
    var st = load();
    if (what === "o") { if (b.order.join("|") === b.sig) delete st.o[b.sig]; else st.o[b.sig] = b.order.slice(); }
    if (what === "w") { if (root._amcSize === defSize(root)) delete st.w[root.id]; else st.w[root.id] = root._amcSize; }
    if (what === "c") { var c = root.classList.contains("is-collapsed"); if (c === has(root, "collapsed")) delete st.c[root.id]; else st.c[root.id] = c ? 1 : 0; }
    save(st);
    if (b) status(b);
  }
  function flash(root) {
    root.classList.add("is-moved");
    clearTimeout(root._amcFlash);
    root._amcFlash = setTimeout(function () { root.classList.remove("is-moved"); }, 900);
  }
  function resized() { w.requestAnimationFrame(function () { w.dispatchEvent(new Event("resize")); }); }

  // ------------------------------------------------------------ actions
  function move(root, delta, btn) {
    var b = root._amcBoard;
    if (!b) return;
    var i = b.order.indexOf(root.id), j = i + delta;
    if (i < 0 || j < 0 || j >= b.order.length) return;
    b.order.splice(i, 1);
    b.order.splice(j, 0, root.id);
    place(b);
    persist(b, root, "o");
    if (btn) btn.focus(); // moving the node drops focus; put it back on the same button
    if (root.scrollIntoView) root.scrollIntoView({ block: "nearest" });
    flash(root);
    resized();
    say(b, root, fmt(attr(root, "moved") || "%0 moved to position %1 of %2", [title(root), j + 1, b.order.length]));
  }
  function size(root, s, btn) {
    var b = root._amcBoard;
    setSize(root, s);
    persist(b, root, "w");
    resized();
    var label = btn && btn.querySelector("." + ROOT + "-sr");
    say(b, root, fmt(attr(root, "sized") || "%0 width: %1", [title(root), label ? label.textContent : s]));
  }
  function collapse(root) {
    var on = !root.classList.contains("is-collapsed");
    setCollapsed(root, on);
    persist(root._amcBoard, root, "c");
    if (!on) resized();
    say(root._amcBoard, root, fmt(attr(root, on ? "collapsed" : "expanded") || (on ? "%0 collapsed" : "%0 expanded"), [title(root)]));
  }
  function reset(b) {
    var st = load(), i;
    delete st.o[b.sig];
    for (i = 0; i < b.ids.length; i++) { delete st.w[b.ids[i]]; delete st.c[b.ids[i]]; }
    save(st);
    b.order = b.ids.slice();
    for (i = 0; i < b.ids.length; i++) {
      var r = b.roots[b.ids[i]];
      setSize(r, defSize(r));
      setCollapsed(r, has(r, "collapsed"));
    }
    place(b);
    status(b);
    resized();
    say(b, null, attr(b.first, "reset-done") || "Layout reset to default");
  }
  function initSolo(root) {
    if (!root.id) root.id = "amc-tab-" + (++seq);
    var st = load();
    setSize(root, defSize(root));
    setCollapsed(root, st.c.hasOwnProperty(root.id) ? !!st.c[root.id] : has(root, "collapsed"));
    root.classList.add("is-ready");
  }

  d.addEventListener("click", function (e) {
    var r = closest(e.target, ROOT + "-reset"), bb = r && closest(r, ROOT + "-bar");
    if (bb && bb._amcBoard) { reset(bb._amcBoard); return; }
    var btn = closest(e.target, ROOT + "-btn"), root = btn && closest(btn, ROOT);
    if (!root || !root.classList.contains("is-ready") || btn.getAttribute("aria-disabled") === "true") return;
    var act = btn.getAttribute("data-amc-act");
    if (act === "earlier") move(root, -1, btn);
    else if (act === "later") move(root, 1, btn);
    else if (act === "size") size(root, btn.getAttribute("data-amc-size"), btn);
    else if (act === "collapse") collapse(root);
  });

  var pending = false;
  function scan() { pending = false; detect(); }
  function queue() { if (!pending) { pending = true; w.requestAnimationFrame(scan); } }
  if (w.apex && w.apex.jQuery) w.apex.jQuery(d).on("apexafterrefresh", queue);
  if (w.MutationObserver) {
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        for (var j = 0; j < list[i].addedNodes.length; j++) {
          var n = list[i].addedNodes[j];
          if (n.nodeType === 1 && (n.classList.contains(ROOT) || (n.querySelector && n.querySelector("." + ROOT + ":not(.is-ready)")))) { queue(); return; }
        }
      }
    }).observe(d.documentElement, { childList: true, subtree: true });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", detect); else detect();

  w.amcTplArrangeBoard = {
    init: detect,
    reset: function (el) { var r = closest(el, ROOT); if (r && r._amcBoard) reset(r._amcBoard); },
    boards: function () { return boards.map(function (b) { return { element: b.el, order: b.order.slice() }; }); }
  };
})(window, document);
