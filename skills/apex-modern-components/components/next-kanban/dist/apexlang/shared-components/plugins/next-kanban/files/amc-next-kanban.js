/* APEX Modern Components - Next Kanban runtime (Next Collection)
 *
 * The report renders every row as a plain list (<ol class="amc-NKanban-source">), which is
 * what users see without JavaScript. This file groups those rows into columns by
 * data-col (rows arrive already sorted), draws counts and work-in-progress limit slots,
 * and lets users move cards:
 *  - Pointer: drag a card with the mouse, or drag its Move button with touch or pen.
 *  - Keyboard: the Move button picks the card up (Space or Enter), arrow keys move it
 *    (left and right between columns, mirrored in RTL; up and down inside a column),
 *    Space or Enter drops it, Escape or leaving the button cancels. Every step is
 *    announced in a polite live region.
 *  - A finished move first sets the page items named in data-card-item, data-from-item,
 *    data-to-item and data-index-item (apex.item, change event suppressed), then fires the
 *    cancelable DOM event "amc:kanban-move" on the region root with
 *    detail { id, from, to, index, fromIndex }. Calling preventDefault() puts the card back.
 *    The board never saves anything itself.
 *
 * Text is inserted with textContent only; only parsed numbers reach CSS, as custom
 * properties. Delegated listeners on document, re-init on new regions and on
 * apexafterrefresh. Animations are CSS only and are switched off by
 * prefers-reduced-motion. ES5, no dependencies. */
(function () {
  "use strict";
  if (window.amcNextKanban) {
    return;
  }

  var DAYMS = 86400000;
  var MAXSLOTS = 12;
  var ITEM_NAME = /^[A-Za-z][A-Za-z0-9_$]*$/;
  var uidSeq = 0;
  var drag = null;
  var kb = null;

  /* ---------- helpers ---------- */
  function h(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) { el.className = cls; }
    if (text !== undefined && text !== null) { el.textContent = text; }
    return el;
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function uid() { uidSeq++; return "amc-nkb-" + uidSeq; }
  function closest(el, sel) {
    while (el && el.nodeType === 1) {
      if (el.matches(sel)) { return el; }
      el = el.parentElement;
    }
    return null;
  }
  function fmt(pattern, args) {
    return String(pattern || "").replace(/%(\d)/g, function (all, n) {
      var v = args[+n];
      return v === undefined || v === null ? "" : String(v);
    });
  }
  function trim(s) { return String(s || "").replace(/^\s+|\s+$/g, ""); }
  function dayOf(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function parseDay(v) {
    var m = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(v || ""));
    if (!m) { return null; }
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) || d.getMonth() !== +m[2] - 1 ? null : d;
  }
  function langOf(root) {
    var el = closest(root, "[lang]");
    var lang = (el && el.getAttribute("lang")) || document.documentElement.lang || navigator.language || "en";
    try {
      return Intl.DateTimeFormat.supportedLocalesOf([lang]).length ? lang : "en";
    } catch (e) {
      return "en";
    }
  }
  function readI18n(root) {
    var src = root.querySelector(".amc-NKanban-i18n");
    var out = {};
    if (src) {
      each(src.attributes, function (a) {
        if (a.name.indexOf("data-") === 0) {
          out[a.name.slice(5).replace(/-([a-z])/g, function (x, c) { return c.toUpperCase(); })] = a.value;
        }
      });
    }
    return out;
  }
  function setItem(name, value) {
    name = trim(name);
    if (!name || !ITEM_NAME.test(name) || !window.apex || typeof window.apex.item !== "function") { return; }
    try {
      var it = window.apex.item(name);
      if (it && it.node && it.setValue) { it.setValue(String(value), null, true); }
    } catch (e) { /* item not on page */ }
  }
  function rtl(el) { return window.getComputedStyle(el).direction === "rtl"; }

  /* ---------- board ---------- */
  function Board(root) {
    this.root = root;
    root.amcNKanban = this;
    this.style = root.getAttribute("data-view") || "calmLanes";
    this.movable = root.getAttribute("data-move") !== "N";
    this.sorted = this.style === "dueTimeline";
    this.tabbed = this.style === "compactList";
    this.t = readI18n(root);
    this.lang = langOf(root);
    this.today = dayOf(new Date());
    this.cols = [];
    this.build();
    root.setAttribute("data-amc-init", "Y");
    root.classList.add("is-ready");
  }

  Board.prototype.build = function () {
    var self = this;
    var root = this.root;
    var src = root.querySelector(".amc-NKanban-source");
    var map = {};
    var rows = src ? Array.prototype.filter.call(src.children, function (li) { return li.classList.contains("amc-NKanban-item"); }) : [];

    this.helpId = uid();
    var help = h("span", "amc-NKanban-sr", this.t.moveHelp);
    help.id = this.helpId;
    help.hidden = true;

    rows.forEach(function (li) {
      var key = li.getAttribute("data-col") || "";
      var col = map["k" + key];
      if (!col) {
        col = { key: key, label: li.getAttribute("data-col-label") || key, limit: 0, items: [] };
        map["k" + key] = col;
        self.cols.push(col);
      }
      var lim = parseInt(li.getAttribute("data-limit"), 10);
      if (!col.limit && isFinite(lim) && lim > 0) { col.limit = lim; }
      if (li.classList.contains("amc-NKanban-item--column")) {
        li.parentNode.removeChild(li);
        return;
      }
      self.enhanceCard(li);
      col.items.push(li);
    });

    var board = h("div", "amc-NKanban-board");
    this.board = board;
    if (this.tabbed) {
      this.tablist = h("div", "amc-NKanban-tabs");
      this.tablist.setAttribute("role", "tablist");
      this.tablist.setAttribute("aria-label", this.t.columns || "");
      root.insertBefore(this.tablist, src);
    }
    this.cols.forEach(function (col, i) { self.buildColumn(col, i); board.appendChild(col.el); });
    root.insertBefore(board, src);
    this.live = h("p", "amc-NKanban-sr");
    this.live.setAttribute("role", "status");
    this.live.setAttribute("aria-live", "polite");
    root.appendChild(this.live);
    root.appendChild(help);
    if (src) { src.hidden = true; }
    this.cols.forEach(function (col) { self.update(col); });
    if (this.tabbed && this.cols.length) { this.select(this.cols[0], false); }
  };

  Board.prototype.enhanceCard = function (li) {
    var card = li.querySelector(".amc-NKanban-card");
    var tags = li.querySelector(".amc-NKanban-tags");
    if (tags && tags.tagName === "P") {
      var ul = h("ul", "amc-NKanban-tags");
      tags.textContent.split("|").forEach(function (t) {
        t = trim(t);
        if (t) { ul.appendChild(h("li", "amc-NKanban-tag", t)); }
      });
      tags.parentNode.replaceChild(ul, tags);
    }
    var due = li.querySelector(".amc-NKanban-due");
    var d = parseDay(li.getAttribute("data-due"));
    li.amcDue = d;
    if (due && d) {
      var opts = { day: "numeric", month: "short" };
      if (d.getFullYear() !== this.today.getFullYear()) { opts.year = "numeric"; }
      var label = new Intl.DateTimeFormat(this.lang, opts).format(d);
      due.textContent = "";
      due.setAttribute("aria-label", fmt(this.t.due, [label]));
      due.appendChild(h("span", "amc-NKanban-dueDay", new Intl.DateTimeFormat(this.lang, { day: "numeric" }).format(d)));
      due.appendChild(h("span", "amc-NKanban-dueMon", new Intl.DateTimeFormat(this.lang, { month: "short" }).format(d)));
      due.appendChild(h("span", "amc-NKanban-dueFull", label));
      var diff = Math.round((d.getTime() - this.today.getTime()) / DAYMS);
      var done = li.classList.contains("amc-NKanban-item--success");
      var note = !done && diff < 0 ? this.t.overdue : (!done && diff === 0 ? this.t.today : "");
      if (note) {
        li.classList.add(diff < 0 ? "is-overdue" : "is-today");
        due.insertBefore(h("span", "amc-NKanban-dueNote", note), due.firstChild);
        due.setAttribute("aria-label", note + ", " + fmt(this.t.due, [label]));
      }
    }
    if (this.movable && card) {
      var title = li.querySelector(".amc-NKanban-title");
      var grip = h("button", "amc-NKanban-grip");
      grip.type = "button";
      grip.setAttribute("aria-label", fmt(this.t.move, [title ? trim(title.textContent) : ""]));
      grip.setAttribute("aria-describedby", this.helpId);
      grip.setAttribute("aria-pressed", "false");
      card.appendChild(grip);
    }
    li.amcCol = null;
  };

  Board.prototype.buildColumn = function (col, i) {
    var id = uid();
    col.id = id;
    col.el = h("section", "amc-NKanban-col");
    col.el.setAttribute("data-key", col.key);
    col.el.amcCol = col;
    var head = h("header", "amc-NKanban-head");
    var name = h("h3", "amc-NKanban-name", col.label);
    name.id = id + "-n";
    col.count = h("p", "amc-NKanban-count");
    col.slots = h("span", "amc-NKanban-slots");
    col.slots.setAttribute("aria-hidden", "true");
    col.warn = h("p", "amc-NKanban-warn");
    col.warn.hidden = true;
    head.appendChild(name);
    head.appendChild(col.count);
    head.appendChild(col.slots);
    head.appendChild(col.warn);
    col.list = h("ol", "amc-NKanban-cards");
    col.list.setAttribute("aria-labelledby", id + "-n");
    col.list.amcCol = col;
    col.items.forEach(function (li) { col.list.appendChild(li); });
    col.empty = h("p", "amc-NKanban-empty", this.movable ? this.t.empty : this.t.emptyRo);
    col.el.appendChild(head);
    col.el.appendChild(col.list);
    col.el.appendChild(col.empty);
    if (this.tabbed) {
      var tab = h("button", "amc-NKanban-tab");
      tab.type = "button";
      tab.id = id + "-t";
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", id);
      tab.amcCol = col;
      col.tabName = h("span", "amc-NKanban-tabName", col.label);
      col.tabCount = h("span", "amc-NKanban-tabCount");
      tab.appendChild(col.tabName);
      tab.appendChild(col.tabCount);
      col.tab = tab;
      col.el.id = id;
      col.el.setAttribute("role", "tabpanel");
      col.el.setAttribute("aria-labelledby", tab.id);
      this.tablist.appendChild(tab);
    }
    col.index = i;
  };

  Board.prototype.cards = function (col) {
    return Array.prototype.filter.call(col.list.children, function (li) { return li.classList.contains("amc-NKanban-item"); });
  };

  Board.prototype.colOf = function (li) {
    return li && li.parentNode && li.parentNode.amcCol ? li.parentNode.amcCol : null;
  };

  Board.prototype.bucketOf = function (d) {
    if (!d) { return "none"; }
    var diff = Math.round((d.getTime() - this.today.getTime()) / DAYMS);
    if (diff < 0) { return "overdue"; }
    if (diff === 0) { return "today"; }
    if (diff <= 6) { return "week"; }
    return "later";
  };

  /* Due timeline: order by due date (no date last, stable) and insert bucket headings. */
  Board.prototype.arrange = function (col) {
    var self = this;
    each(col.list.querySelectorAll(".amc-NKanban-bucket"), function (b) { col.list.removeChild(b); });
    var cards = this.cards(col).map(function (li, i) { return { li: li, i: i, t: li.amcDue ? li.amcDue.getTime() : Infinity }; });
    cards.sort(function (a, b) { return a.t === b.t ? a.i - b.i : (a.t < b.t ? -1 : 1); });
    var last = null;
    cards.forEach(function (c) {
      var b = self.bucketOf(c.li.amcDue);
      if (b !== last) {
        var li = h("li", "amc-NKanban-bucket amc-NKanban-bucket--" + b);
        li.setAttribute("role", "presentation");
        li.appendChild(h("h4", "amc-NKanban-bucketName", self.t["bucket" + b.charAt(0).toUpperCase() + b.slice(1)]));
        col.list.appendChild(li);
        last = b;
      }
      col.list.appendChild(c.li);
    });
  };

  Board.prototype.update = function (col) {
    if (this.sorted) {
      var keep = kb && kb.board === this ? kb.grip : null;
      if (drag && drag.board === this) { drag.moving = true; }
      if (kb && kb.board === this) { kb.moving = true; }
      this.arrange(col);
      if (keep && document.activeElement !== keep) { keep.focus(); }
      if (drag && drag.board === this) { drag.moving = false; }
      if (kb && kb.board === this) { kb.moving = false; }
    }
    var n = this.cards(col).length;
    var lim = col.limit;
    col.n = n;
    while (col.count.firstChild) { col.count.removeChild(col.count.firstChild); }
    while (col.slots.firstChild) { col.slots.removeChild(col.slots.firstChild); }
    var vis = h("span", "amc-NKanban-countVis");
    vis.setAttribute("aria-hidden", "true");
    if (lim) {
      var parts = String(this.t.countLimit || "%0 / %1").split(/(%[01])/);
      parts.forEach(function (p) {
        if (p === "%0") { vis.appendChild(h("span", "amc-NKanban-n", String(n))); }
        else if (p === "%1") { vis.appendChild(h("span", "amc-NKanban-lim", String(lim))); }
        else if (p) { vis.appendChild(h("span", "amc-NKanban-of", p)); }
      });
      col.count.appendChild(vis);
      col.count.appendChild(h("span", "amc-NKanban-sr", fmt(this.t.countSr, [n, lim])));
      if (lim <= MAXSLOTS) {
        var total = Math.min(Math.max(n, lim), MAXSLOTS + 2);
        for (var i = 0; i < total; i++) {
          col.slots.appendChild(h("span", "amc-NKanban-slot" + (i < n ? " is-filled" : "") + (i >= lim ? " is-over" : "")));
        }
        col.slots.classList.remove("amc-NKanban-slots--bar");
      } else {
        col.slots.classList.add("amc-NKanban-slots--bar");
        col.slots.appendChild(h("span", "amc-NKanban-fill"));
        col.slots.style.setProperty("--amc-kb-fill", String(Math.round(Math.min(n / lim, 1) * 1000) / 1000));
      }
    } else {
      vis.appendChild(h("span", "amc-NKanban-n", String(n)));
      col.count.appendChild(vis);
      col.count.appendChild(h("span", "amc-NKanban-sr", fmt(n === 1 ? this.t.countOne : this.t.countOther, [n])));
    }
    var over = lim && n > lim;
    var at = lim && n === lim;
    col.el.classList.toggle("is-over", !!over);
    col.el.classList.toggle("is-at", !!at);
    col.el.classList.toggle("is-empty", n === 0);
    col.warn.hidden = !(over || at);
    col.warn.textContent = over ? fmt(this.t.overLimit, [n - lim]) : (at ? this.t.atLimit : "");
    col.empty.hidden = n !== 0;
    if (col.tab) {
      col.tabCount.textContent = lim ? fmt(this.t.countLimit, [n, lim]) : String(n);
      col.tab.classList.toggle("is-over", !!over);
      col.tab.classList.toggle("is-at", !!at);
      col.tab.setAttribute("aria-label", col.label + ", " + fmt(lim ? this.t.countSr : (n === 1 ? this.t.countOne : this.t.countOther), [n, lim]) + (over ? ", " + fmt(this.t.overLimit, [n - lim]) : (at ? ", " + this.t.atLimit : "")));
    }
  };

  Board.prototype.select = function (col, focus) {
    this.cols.forEach(function (c) {
      var on = c === col;
      c.el.hidden = !on;
      c.tab.setAttribute("aria-selected", on ? "true" : "false");
      c.tab.tabIndex = on ? 0 : -1;
    });
    this.current = col;
    if (focus) { col.tab.focus(); }
  };

  Board.prototype.say = function (text) {
    var live = this.live;
    live.textContent = "";
    window.setTimeout(function () { live.textContent = text; }, 60);
  };

  Board.prototype.titleOf = function (li) {
    var t = li.querySelector(".amc-NKanban-title");
    return t ? trim(t.textContent) : "";
  };

  Board.prototype.where = function (li) {
    var col = this.colOf(li);
    var cards = this.cards(col);
    return { col: col, index: cards.indexOf(li), total: cards.length };
  };

  /* Put li into col at position index (0-based among cards). */
  Board.prototype.place = function (li, col, index) {
    var cards = this.cards(col).filter(function (c) { return c !== li; });
    var before = cards[index] || null;
    if (before) { col.list.insertBefore(li, before); } else { col.list.appendChild(li); }
  };

  Board.prototype.commit = function (li, from, fromIndex) {
    var w = this.where(li);
    var to = w.col;
    if (to === from && w.index === fromIndex) { return false; }
    var id = li.getAttribute("data-id") || "";
    var root = this.root;
    setItem(root.getAttribute("data-card-item"), id);
    setItem(root.getAttribute("data-from-item"), from.key);
    setItem(root.getAttribute("data-to-item"), to.key);
    setItem(root.getAttribute("data-index-item"), w.index);
    var ev;
    var detail = { id: id, from: from.key, to: to.key, index: w.index, fromIndex: fromIndex };
    try {
      ev = new CustomEvent("amc:kanban-move", { bubbles: true, cancelable: true, detail: detail });
    } catch (e) {
      ev = document.createEvent("CustomEvent");
      ev.initCustomEvent("amc:kanban-move", true, true, detail);
    }
    var ok = root.dispatchEvent(ev);
    if (!ok) {
      this.place(li, from, fromIndex);
      this.update(from);
      if (to !== from) { this.update(to); }
      this.say(fmt(this.t.cancelled, [this.titleOf(li), from.label]));
      return false;
    }
    li.classList.remove("is-dropped");
    void li.offsetWidth;
    li.classList.add("is-dropped");
    window.setTimeout(function () { li.classList.remove("is-dropped"); }, 1400);
    w = this.where(li);
    var msg = fmt(this.t.dropped, [this.titleOf(li), to.label, w.index + 1, w.total]);
    if (to.limit && to.n > to.limit && to !== from) { msg += " " + fmt(this.t.overNote, [to.label, to.n - to.limit]); }
    this.say(msg);
    return true;
  };

  /* ---------- keyboard moving ---------- */
  function startKb(board, li, grip) {
    var w = board.where(li);
    kb = { board: board, li: li, grip: grip, from: w.col, fromIndex: w.index, moving: false };
    li.classList.add("is-grabbed");
    board.root.classList.add("is-moving");
    grip.setAttribute("aria-pressed", "true");
    board.say(fmt(board.t.picked, [board.titleOf(li), w.col.label, w.index + 1, w.total]));
  }

  function endKb(commit) {
    if (!kb) { return; }
    var k = kb;
    kb = null;
    k.li.classList.remove("is-grabbed");
    k.board.root.classList.remove("is-moving");
    k.grip.setAttribute("aria-pressed", "false");
    if (commit) {
      if (!k.board.commit(k.li, k.from, k.fromIndex)) {
        var w0 = k.board.where(k.li);
        if (w0.col === k.from && w0.index === k.fromIndex) { k.board.say(fmt(k.board.t.cancelled, [k.board.titleOf(k.li), k.from.label])); }
      }
    } else {
      var cur = k.board.colOf(k.li);
      k.board.place(k.li, k.from, k.fromIndex);
      k.board.update(k.from);
      if (cur && cur !== k.from) { k.board.update(cur); }
      if (k.board.tabbed) { k.board.select(k.from, false); }
      k.board.say(fmt(k.board.t.cancelled, [k.board.titleOf(k.li), k.from.label]));
    }
    if (document.activeElement !== k.grip && document.documentElement.contains(k.grip) && k.grip.offsetParent) { k.grip.focus(); }
  }

  function kbMove(dx, dy) {
    var b = kb.board;
    var w = b.where(kb.li);
    var col = w.col;
    var target = col;
    var index = w.index;
    if (dx) {
      target = b.cols[col.index + dx];
      if (!target) { return; }
      index = Math.min(w.index, b.cards(target).length);
    } else if (dy) {
      if (b.sorted) { b.say(b.t.sorted); return; }
      index = w.index + dy;
      if (index < 0 || index >= w.total) { return; }
    }
    kb.moving = true;
    b.place(kb.li, target, index);
    if (target !== col) { b.update(col); }
    b.update(target);
    if (b.tabbed && target !== col) { b.select(target, false); }
    kb.grip.focus();
    kb.moving = false;
    var w2 = b.where(kb.li);
    var msg = fmt(b.t.moved, [b.titleOf(kb.li), target.label, w2.index + 1, w2.total]);
    if (target !== col && target.limit && target.n > target.limit) { msg += " " + fmt(b.t.overNote, [target.label, target.n - target.limit]); }
    b.say(msg);
    if (kb.li.scrollIntoView) { kb.li.scrollIntoView({ block: "nearest", inline: "nearest" }); }
  }

  /* ---------- pointer dragging ---------- */
  function onPointerDown(e) {
    swallowClick = false;
    if (e.button !== 0 || drag || kb) { return; }
    var li = closest(e.target, ".amc-NKanban.is-ready .amc-NKanban-item");
    if (!li) { return; }
    var root = closest(li, ".amc-NKanban");
    var b = root && root.amcNKanban;
    if (!b || !b.movable || !b.colOf(li)) { return; }
    var grip = closest(e.target, ".amc-NKanban-grip");
    if (!grip && closest(e.target, "a, button, input, select, textarea, [contenteditable]")) { return; }
    if (e.pointerType !== "mouse" && !grip) { return; }
    var w = b.where(li);
    drag = { board: b, li: li, x: e.clientX, y: e.clientY, started: false, from: w.col, fromIndex: w.index, id: e.pointerId, moving: false };
  }

  function startDrag(e) {
    var b = drag.board;
    var li = drag.li;
    var card = li.querySelector(".amc-NKanban-card");
    var r = li.getBoundingClientRect();
    var g = li.cloneNode(true);
    g.className = li.className + " amc-NKanban-ghost";
    g.classList.remove("is-dropped");
    g.setAttribute("aria-hidden", "true");
    each(g.querySelectorAll("a, button"), function (el) { el.setAttribute("tabindex", "-1"); });
    g.style.setProperty("--amc-kb-w", Math.round(r.width) + "px");
    g.style.setProperty("--amc-kb-h", Math.round(r.height) + "px");
    b.root.appendChild(g);
    drag.ghost = g;
    drag.dx = drag.x - r.left;
    drag.dy = drag.y - r.top;
    drag.started = true;
    li.classList.add("is-placeholder");
    b.root.classList.add("is-dragging");
    if (window.getSelection) { try { window.getSelection().removeAllRanges(); } catch (x) { /* ignore */ } }
    if (card) { card.setAttribute("aria-hidden", "true"); }
    moveGhost(e);
  }

  function moveGhost(e) {
    var rr = drag.board.root.getBoundingClientRect();
    drag.ghost.style.setProperty("--amc-kb-x", Math.round(e.clientX - drag.dx - rr.left) + "px");
    drag.ghost.style.setProperty("--amc-kb-y", Math.round(e.clientY - drag.dy - rr.top) + "px");
  }

  function clearTargets(b) {
    each(b.root.querySelectorAll(".is-target"), function (el) { el.classList.remove("is-target"); });
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.id) { return; }
    if (!drag.started) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 6) { return; }
      startDrag(e);
    }
    e.preventDefault();
    moveGhost(e);
    var b = drag.board;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    clearTargets(b);
    drag.tab = null;
    var tab = el && closest(el, ".amc-NKanban-tab");
    if (tab && b.root.contains(tab)) {
      tab.classList.add("is-target");
      drag.tab = tab.amcCol;
      return;
    }
    var colEl = el && closest(el, ".amc-NKanban-col");
    if (!colEl || !b.root.contains(colEl)) { return; }
    var col = colEl.amcCol;
    colEl.classList.add("is-target");
    var cur = b.colOf(drag.li);
    if (b.sorted) {
      if (cur !== col) {
        col.list.appendChild(drag.li);
        b.update(cur);
        b.update(col);
      }
    } else {
      var cards = b.cards(col).filter(function (c) { return c !== drag.li; });
      var before = null;
      for (var i = 0; i < cards.length; i++) {
        var r = cards[i].getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) { before = cards[i]; break; }
      }
      if (drag.li.parentNode !== col.list || drag.li.nextElementSibling !== before) {
        if (before) { col.list.insertBefore(drag.li, before); } else { col.list.appendChild(drag.li); }
        if (cur !== col) { b.update(cur); }
        b.update(col);
      }
    }
    var sc = b.board;
    var sr = sc.getBoundingClientRect();
    if (sc.scrollWidth > sc.clientWidth) {
      if (e.clientX < sr.left + 40) { sc.scrollLeft -= 14; }
      else if (e.clientX > sr.right - 40) { sc.scrollLeft += 14; }
    }
  }

  function endDrag(commit) {
    var d = drag;
    drag = null;
    if (!d || !d.started) { return; }
    var b = d.board;
    if (d.ghost && d.ghost.parentNode) { d.ghost.parentNode.removeChild(d.ghost); }
    d.li.classList.remove("is-placeholder");
    var card = d.li.querySelector(".amc-NKanban-card");
    if (card) { card.removeAttribute("aria-hidden"); }
    b.root.classList.remove("is-dragging");
    clearTargets(b);
    var cur = b.colOf(d.li);
    if (commit && d.tab) {
      b.place(d.li, d.tab, b.cards(d.tab).length);
      if (cur !== d.tab) { b.update(cur); }
      b.update(d.tab);
    }
    if (!commit) {
      b.place(d.li, d.from, d.fromIndex);
      b.update(d.from);
      if (cur && cur !== d.from) { b.update(cur); }
      b.say(fmt(b.t.cancelled, [b.titleOf(d.li), d.from.label]));
      return;
    }
    b.commit(d.li, d.from, d.fromIndex);
  }

  /* A finished drag is followed by one click on the card; it must not open a link or
     toggle keyboard moving. Cleared by the next pointerdown or key press. */
  var swallowClick = false;

  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.id) { return; }
    if (!drag.started) { drag = null; return; }
    swallowClick = true;
    endDrag(e.type === "pointerup");
  }

  /* ---------- clicks and keys ---------- */
  function onClick(e) {
    if (swallowClick) {
      swallowClick = false;
      if (closest(e.target, ".amc-NKanban")) { e.preventDefault(); e.stopPropagation(); }
      return;
    }
    var grip = closest(e.target, ".amc-NKanban-grip");
    if (grip) {
      var li = closest(grip, ".amc-NKanban-item");
      var b = closest(li, ".amc-NKanban").amcNKanban;
      if (!b || !b.colOf(li)) { return; }
      if (kb && kb.li === li) { endKb(true); } else { if (kb) { endKb(false); } startKb(b, li, grip); }
      return;
    }
    var tab = closest(e.target, ".amc-NKanban-tab");
    if (tab && tab.amcCol) {
      var bt = closest(tab, ".amc-NKanban").amcNKanban;
      if (bt) { bt.select(tab.amcCol, false); }
    }
  }

  function onKey(e) {
    swallowClick = false;
    if (drag && drag.started && e.key === "Escape") {
      e.preventDefault();
      endDrag(false);
      return;
    }
    if (kb && e.target === kb.grip) {
      var r = rtl(kb.board.root);
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); kbMove(r ? 1 : -1, 0); return;
        case "ArrowRight": e.preventDefault(); kbMove(r ? -1 : 1, 0); return;
        case "ArrowUp": e.preventDefault(); kbMove(0, -1); return;
        case "ArrowDown": e.preventDefault(); kbMove(0, 1); return;
        case "Escape": e.preventDefault(); e.stopPropagation(); endKb(false); return;
        default: return;
      }
    }
    var tab = closest(e.target, ".amc-NKanban-tab");
    if (tab && tab.amcCol) {
      var b = closest(tab, ".amc-NKanban").amcNKanban;
      var i = tab.amcCol.index;
      var n = b.cols.length;
      var rr = rtl(b.root);
      var next = null;
      if (e.key === "ArrowRight") { next = b.cols[(i + (rr ? n - 1 : 1)) % n]; }
      else if (e.key === "ArrowLeft") { next = b.cols[(i + (rr ? 1 : n - 1)) % n]; }
      else if (e.key === "Home") { next = b.cols[0]; }
      else if (e.key === "End") { next = b.cols[n - 1]; }
      if (next) { e.preventDefault(); b.select(next, true); }
    }
  }

  function onFocusOut(e) {
    if (kb && e.target === kb.grip && !kb.moving) {
      window.setTimeout(function () {
        if (kb && document.activeElement !== kb.grip && !kb.moving) { endKb(false); }
      }, 0);
    }
  }

  /* ---------- lifecycle ---------- */
  function init(scope) {
    each((scope || document).querySelectorAll(".amc-NKanban:not([data-amc-init])"), function (root) {
      try {
        new Board(root);
      } catch (err) {
        root.setAttribute("data-amc-init", "E");
        if (window.console) { window.console.warn("amcNextKanban", err); }
      }
    });
  }

  function start() {
    init(document);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusout", onFocusOut);
    if (window.MutationObserver) {
      var pending = 0;
      new MutationObserver(function () {
        if (pending) { return; }
        pending = window.requestAnimationFrame(function () { pending = 0; init(document); });
      }).observe(document.body, { childList: true, subtree: true });
    }
    if (window.apex && window.apex.jQuery) {
      window.apex.jQuery(document).on("apexafterrefresh", function () { init(document); });
    }
  }

  window.amcNextKanban = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
