/* APEX Modern Components - Next Org Chart runtime (Next Collection)
 *
 * The report renders every row as a flat outline list (<ul class="amc-NOrgChart-source">),
 * indented by Level, which is what users see without JavaScript. This file reads those
 * rows (ID and PARENT_ID, in any order), builds the hierarchy and renders it as an ARIA
 * tree in the chosen style: topDown, leftToRight, swimlanes, radial or directory.
 *
 * - Rows whose parent is missing, or that would close a loop, become top-level people.
 * - The person markup APEX rendered (already escaped) is moved into the tree; any text
 *   this file adds uses textContent only. Only parsed numbers reach CSS, as custom
 *   properties.
 * - Keyboard (WAI-ARIA tree pattern): roving tabindex; Up/Down move between visible
 *   people, Right opens a branch or moves into it, Left closes it or moves to the manager
 *   (mirrored in RTL), Home/End, * opens all siblings, Enter follows the person's link or
 *   toggles the branch, typing a letter jumps to the next name that starts with it.
 * - Search matches names, job titles and departments (accent- and case-insensitive),
 *   opens the branches it needs and scrolls to the person; the directory style filters.
 * - Zoom (buttons, Ctrl or Cmd + wheel, Fit) and drag to pan for the chart styles.
 * - Rebuilds on apexafterrefresh and when new regions appear. Motion is CSS only and is
 *   switched off by prefers-reduced-motion. */
(function () {
  "use strict";
  if (window.amcNextOrgChart) {
    return;
  }

  var STYLES = ["topDown", "leftToRight", "swimlanes", "radial", "directory"];
  var ZOOMS = [0.4, 0.5, 0.64, 0.8, 1, 1.25, 1.5];
  var SVGNS = "http://www.w3.org/2000/svg";
  var mqReduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var uidSeq = 0;
  var instances = [];

  function reduced() { return !!(mqReduce && mqReduce.matches); }
  function h(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) { el.className = cls; }
    if (text !== undefined && text !== null) { el.textContent = text; }
    return el;
  }
  function set(el, attrs) {
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) { el.setAttribute(k, attrs[k]); }
    }
    return el;
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function trim(v) { return String(v === null || v === undefined ? "" : v).replace(/^\s+|\s+$/g, ""); }
  function uid(p) { uidSeq++; return "amc-norg-" + p + uidSeq; }
  function yes(v) { return /^(y|yes|true|1)$/i.test(trim(v)); }
  function clampInt(v, lo, hi, dflt) {
    var n = parseInt(v, 10);
    if (!isFinite(n)) { return dflt; }
    return Math.max(lo, Math.min(hi, n));
  }
  function round(n) { return Math.round(n * 100) / 100; }
  function norm(s) {
    s = String(s || "").toLowerCase();
    if (s.normalize) { s = s.normalize("NFD"); }
    return s.replace(/[\u0300-\u036F\u064B-\u065F\u0670]/g, "").replace(/[\u2010-\u2015'\u2019`-]/g, " ").replace(/\s+/g, " ").replace(/^ | $/g, "");
  }
  function closest(el, sel) {
    while (el && el.nodeType === 1) {
      if (el.matches(sel)) { return el; }
      el = el.parentElement;
    }
    return null;
  }
  function button(cls, label, act) {
    var b = h("button", "amc-NOrgChart-btn " + (cls || ""));
    b.type = "button";
    if (act) { b.setAttribute("data-amc-act", act); }
    if (label) { b.setAttribute("aria-label", label); }
    return b;
  }
  function icon(name) {
    var i = h("span", "amc-NOrgChart-icon fa " + name);
    i.setAttribute("aria-hidden", "true");
    return i;
  }

  function langOf(root) {
    var el = root.closest ? root.closest("[lang]") : null;
    var lang = (el && el.getAttribute("lang")) || document.documentElement.lang || navigator.language || "en";
    try { return Intl.NumberFormat.supportedLocalesOf([lang]).length ? lang : "en"; } catch (e) { return "en"; }
  }

  var I18N = {
    search: "Find a person", searchHint: "Name, job title or department", clear: "Clear search", noMatch: "No one matches",
    matchOne: "match", matchOther: "matches", vacant: "Vacant position", zoomIn: "Zoom in", zoomOut: "Zoom out", fit: "Fit chart",
    expandAll: "Open all", collapseAll: "Close all", reportsOne: "direct report", reportsOther: "direct reports", team: "in team",
    reportsTo: "Reports to", peopleOne: "person", peopleOther: "people", vacantOne: "vacant position", vacantOther: "vacant positions",
    other: "Other", chart: "Organization chart", of: "of"
  };
  function readI18n(root) {
    var src = root.querySelector(".amc-NOrgChart-i18n");
    var out = {};
    for (var k in I18N) {
      if (Object.prototype.hasOwnProperty.call(I18N, k)) {
        var attr = "data-" + k.replace(/[A-Z]/g, function (c) { return "-" + c.toLowerCase(); });
        out[k] = (src && src.getAttribute(attr)) || I18N[k];
      }
    }
    return out;
  }

  /* ---------- Instance ---------- */
  function Chart(root) {
    this.root = root;
    var st = root.getAttribute("data-layout");
    this.style = STYLES.indexOf(st) >= 0 ? st : "topDown";
    this.expandLevels = clampInt(root.getAttribute("data-expand"), 1, 12, 2);
    this.hasSearch = trim(root.getAttribute("data-search")).toUpperCase() !== "N";
    this.lang = langOf(root);
    this.i18n = readI18n(root);
    this.rtl = window.getComputedStyle(root).direction === "rtl";
    this.zoomable = this.style !== "directory";
    this.zoom = 1;
    this.matches = [];
    this.cur = -1;
    try { this.plural = new Intl.PluralRules(this.lang); } catch (e) { this.plural = null; }
    try { this.nf = new Intl.NumberFormat(this.lang); } catch (e2) { this.nf = null; }
    this.read();
    this.build();
    root.classList.add("is-ready");
    root.classList.toggle("is-rtl", this.rtl);
    root.setAttribute("data-amc-init", "Y");
    root.amcNOrg = this;
  }

  Chart.prototype.num = function (n) { return this.nf ? this.nf.format(n) : String(n); };
  Chart.prototype.count = function (n, one, other) {
    var cat = this.plural ? this.plural.select(n) : (n === 1 ? "one" : "other");
    return this.num(n) + " " + (cat === "one" ? one : other);
  };

  Chart.prototype.read = function () {
    var self = this;
    var byId = {};
    var list = [];
    each(this.root.querySelectorAll(".amc-NOrgChart-source > .amc-NOrgChart-row"), function (li, i) {
      var card = li.querySelector(".amc-NOrgChart-card");
      if (!card) { return; }
      var id = trim(li.getAttribute("data-id")) || "~" + i;
      if (byId[id]) { id = id + "~" + i; }
      var nameEl = card.querySelector(".amc-NOrgChart-name");
      var jobEl = card.querySelector(".amc-NOrgChart-job");
      var deptEl = card.querySelector(".amc-NOrgChart-dept");
      var hc = parseInt(li.getAttribute("data-headcount"), 10);
      var n = {
        id: id,
        parentId: trim(li.getAttribute("data-parent")),
        vacant: yes(li.getAttribute("data-vacant")),
        dept: trim(li.getAttribute("data-department")),
        headcount: isFinite(hc) && hc >= 0 ? hc : null,
        card: card,
        nameEl: nameEl,
        jobEl: jobEl,
        name: nameEl ? trim(nameEl.textContent) : "",
        job: jobEl ? trim(jobEl.textContent) : "",
        deptText: deptEl ? trim(deptEl.textContent) : "",
        link: card.querySelector("a.amc-NOrgChart-link"),
        order: i,
        children: [],
        p: null
      };
      n.key = norm(n.name + " " + n.job + " " + n.deptText);
      byId[id] = n;
      list.push(n);
    });
    list.forEach(function (n) {
      var p = n.parentId ? byId[n.parentId] : null;
      if (p && p !== n) { n.p = p; }
    });
    // Break loops: a row may not be its own ancestor.
    list.forEach(function (n) {
      var c = n;
      var steps = 0;
      while (c.p) {
        if (c.p === n || ++steps > list.length) { n.p = null; break; }
        c = c.p;
      }
    });
    var roots = [];
    list.forEach(function (n) {
      if (n.p) { n.p.children.push(n); } else { roots.push(n); }
    });
    function walk(n, depth) {
      n.depth = depth;
      var team = 0;
      var open = 0;
      n.children.forEach(function (c) {
        walk(c, depth + 1);
        team += c.team + (c.vacant ? 0 : 1);
        open += c.openBelow + (c.vacant ? 1 : 0);
      });
      n.team = team;
      n.openBelow = open;
    }
    roots.forEach(function (r) { walk(r, 1); });
    this.byId = byId;
    this.list = list;
    this.roots = roots;
    this.vacancies = list.filter(function (n) { return n.vacant; }).length;
    // Swimlanes: lanes in the order departments first appear from the top of the tree.
    if (this.style === "swimlanes") {
      var lanes = [];
      var laneOf = {};
      var pre = [];
      (function visit(ns) { ns.forEach(function (n) { pre.push(n); visit(n.children); }); })(roots);
      pre.forEach(function (n) {
        var key = n.dept ? norm(n.dept) : "";
        if (!laneOf[key]) {
          laneOf[key] = { key: key, name: n.dept || self.i18n.other, roots: [], people: 0, open: 0 };
          lanes.push(laneOf[key]);
        }
        var lane = laneOf[key];
        n.lane = lane;
        if (n.vacant) { lane.open++; } else { lane.people++; }
        if (!n.p || n.p.lane !== lane) { lane.roots.push(n); }
      });
      // "Other" lane last.
      lanes.sort(function (a, b) { return (a.key === "" ? 1 : 0) - (b.key === "" ? 1 : 0); });
      this.lanes = lanes;
    }
  };

  Chart.prototype.kids = function (n) {
    if (this.style === "swimlanes") {
      return n.children.filter(function (c) { return c.lane === n.lane; });
    }
    return n.children;
  };

  /* ---------- Build ---------- */
  Chart.prototype.build = function () {
    var self = this;
    var t = this.i18n;
    var app = h("div", "amc-NOrgChart-app");
    this.app = app;
    this.live = set(h("span", "amc-NOrgChart-sr"), { "aria-live": "polite", "aria-atomic": "true" });
    this.treeId = uid("tree");

    var bar = h("div", "amc-NOrgChart-bar");
    if (this.hasSearch) {
      var find = h("div", "amc-NOrgChart-find");
      var inputId = uid("q");
      var lab = h("label", "amc-NOrgChart-sr", t.search);
      lab.setAttribute("for", inputId);
      var input = set(h("input", "amc-NOrgChart-input"), {
        type: "search", id: inputId, placeholder: t.search, autocomplete: "off", spellcheck: "false",
        "aria-controls": this.treeId, title: t.searchHint
      });
      this.statusId = uid("st");
      input.setAttribute("aria-describedby", this.statusId);
      var status = set(h("span", "amc-NOrgChart-status"), { id: this.statusId, "aria-live": "polite" });
      find.appendChild(icon("fa-search"));
      find.appendChild(lab);
      find.appendChild(input);
      find.appendChild(status);
      bar.appendChild(find);
      this.input = input;
      this.status = status;
    }
    var summary = h("span", "amc-NOrgChart-summary", this.count(this.list.length - this.vacancies, t.peopleOne, t.peopleOther) +
      (this.vacancies ? ", " + this.count(this.vacancies, t.vacantOne, t.vacantOther) : ""));
    bar.appendChild(summary);
    var tools = h("div", "amc-NOrgChart-tools");
    if (this.style !== "directory") {
      var openAll = button("amc-NOrgChart-btn--text", null, "open-all");
      openAll.textContent = t.expandAll;
      var closeAll = button("amc-NOrgChart-btn--text", null, "close-all");
      closeAll.textContent = t.collapseAll;
      tools.appendChild(openAll);
      tools.appendChild(closeAll);
    }
    if (this.zoomable) {
      var zg = set(h("div", "amc-NOrgChart-zoom"), { role: "group", "aria-label": t.zoomIn + ", " + t.zoomOut });
      var zo = button("amc-NOrgChart-btn--icon", t.zoomOut, "zoom-out");
      zo.appendChild(icon("fa-minus"));
      var zl = h("span", "amc-NOrgChart-zoomLabel", "100%");
      var zi = button("amc-NOrgChart-btn--icon", t.zoomIn, "zoom-in");
      zi.appendChild(icon("fa-plus"));
      var zf = button("amc-NOrgChart-btn--icon", t.fit, "fit");
      zf.appendChild(icon("fa-arrows-alt"));
      zg.appendChild(zo);
      zg.appendChild(zl);
      zg.appendChild(zi);
      zg.appendChild(zf);
      tools.appendChild(zg);
      this.zoomLabel = zl;
    }
    bar.appendChild(tools);
    app.appendChild(bar);

    var vp = h("div", "amc-NOrgChart-viewport");
    var canvas = h("div", "amc-NOrgChart-canvas");
    var tree = set(h("ul", "amc-NOrgChart-tree"), { role: "tree", id: this.treeId, "aria-label": t.chart });
    if (this.style === "radial") {
      this.svg = document.createElementNS(SVGNS, "svg");
      this.svg.setAttribute("class", "amc-NOrgChart-wires");
      this.svg.setAttribute("aria-hidden", "true");
      this.svg.setAttribute("focusable", "false");
      canvas.appendChild(this.svg);
    }
    canvas.appendChild(tree);
    vp.appendChild(canvas);
    app.appendChild(vp);
    app.appendChild(this.live);
    this.vp = vp;
    this.canvas = canvas;
    this.tree = tree;

    if (this.style === "swimlanes") {
      this.lanes.forEach(function (lane, i) {
        tree.appendChild(self.laneItem(lane, i + 1, self.lanes.length));
      });
    } else {
      this.roots.forEach(function (r, i) {
        tree.appendChild(self.item(r, 1, i + 1, self.roots.length));
      });
    }
    this.root.appendChild(app);
    var first = tree.querySelector("[role=treeitem]");
    if (first) { first.setAttribute("tabindex", "0"); }
    if (this.style === "radial") { this.layout(); }
    this.home();
  };

  /* Large charts open fitted to the width (down to 64%) and centred on the top person. */
  Chart.prototype.home = function () {
    if (!this.zoomable || !this.vp.clientWidth) { return; }
    var vp = this.vp;
    var over = vp.scrollWidth / vp.clientWidth;
    if (over > 1.01 && over < 1 / 0.64) { this.setZoom(Math.floor((vp.clientWidth - 4) / vp.scrollWidth * 100) / 100); }
    var first = this.tree.querySelector("[role=treeitem] > .amc-NOrgChart-card");
    if (!first || this.style === "swimlanes") { return; }
    // In a narrow region the top person's plate must at least fit.
    var cw = first.getBoundingClientRect().width;
    if (cw > vp.clientWidth - 16) { this.setZoom(Math.max(0.5, Math.floor((vp.clientWidth - 24) / (cw / this.zoom) * 100) / 100)); }
    var v = vp.getBoundingClientRect();
    var r = first.getBoundingClientRect();
    vp.scrollLeft += (r.left + r.width / 2) - (v.left + v.width / 2);
    if (this.style === "radial" || this.style === "leftToRight") {
      vp.scrollTop += (r.top + r.height / 2) - (v.top + v.height / 2);
    }
  };

  Chart.prototype.laneItem = function (lane, pos, size) {
    var self = this;
    var t = this.i18n;
    var li = set(h("li", "amc-NOrgChart-lane"), { role: "treeitem", tabindex: "-1", "aria-level": "1", "aria-posinset": String(pos), "aria-setsize": String(size), "aria-expanded": "true" });
    var headId = uid("lane");
    var head = set(h("div", "amc-NOrgChart-laneHead"), { id: headId });
    head.appendChild(h("span", "amc-NOrgChart-laneName", lane.name));
    var stats = h("span", "amc-NOrgChart-laneStats");
    var ppl = h("span", "amc-NOrgChart-laneNum");
    ppl.appendChild(h("b", "amc-NOrgChart-laneBig", this.num(lane.people)));
    ppl.appendChild(document.createTextNode(" " + (this.plural && this.plural.select(lane.people) === "one" ? t.peopleOne : t.peopleOther)));
    stats.appendChild(ppl);
    if (lane.open) {
      var op = h("span", "amc-NOrgChart-laneNum amc-NOrgChart-laneNum--open");
      op.appendChild(h("b", "amc-NOrgChart-laneBig", this.num(lane.open)));
      op.appendChild(document.createTextNode(" " + (this.plural && this.plural.select(lane.open) === "one" ? t.vacantOne : t.vacantOther)));
      stats.appendChild(op);
    }
    head.appendChild(stats);
    var tog = set(h("span", "amc-NOrgChart-toggle amc-NOrgChart-toggle--lane"), { "aria-hidden": "true", "data-amc-act": "toggle" });
    tog.appendChild(h("span", "amc-NOrgChart-chev"));
    head.appendChild(tog);
    li.setAttribute("aria-labelledby", headId);
    li.appendChild(head);
    var group = set(h("ul", "amc-NOrgChart-group"), { role: "group" });
    lane.roots.forEach(function (r, i) {
      group.appendChild(self.item(r, 2, i + 1, lane.roots.length, true));
    });
    li.appendChild(group);
    return li;
  };

  Chart.prototype.item = function (n, level, pos, size, laneRoot) {
    var self = this;
    var t = this.i18n;
    var kids = this.kids(n);
    var li = set(h("li", "amc-NOrgChart-node"), { role: "treeitem", tabindex: "-1", "aria-level": String(level), "aria-posinset": String(pos), "aria-setsize": String(size) });
    li.setAttribute("data-id", n.id);
    n.el = li;
    if (n.vacant) { li.classList.add("is-vacant"); }
    var card = n.card;
    card.classList.add("amc-NOrgChart-card--d" + Math.min(n.depth, 4));
    var ids = [];
    if (n.nameEl) { n.nameEl.id = uid("n"); ids.push(n.nameEl.id); }
    if (n.jobEl) { n.jobEl.id = uid("j"); ids.push(n.jobEl.id); }
    if (n.link) { n.link.setAttribute("tabindex", "-1"); }
    var text = card.querySelector(".amc-NOrgChart-text");
    var teamSize = n.headcount !== null ? n.headcount : n.team;
    if (text && teamSize > 0) {
      var team = h("span", "amc-NOrgChart-team", this.num(teamSize) + " " + t.team);
      team.id = uid("t");
      ids.push(team.id);
      text.appendChild(team);
    }
    if (n.vacant) {
      var vac = card.querySelector(".amc-NOrgChart-vacant");
      if (vac && n.name !== vac.textContent) { vac.id = uid("v"); ids.push(vac.id); }
    }
    if (text && laneRoot && n.p) {
      var rep = h("span", "amc-NOrgChart-reportsTo");
      rep.appendChild(document.createTextNode(t.reportsTo + " " + (n.p.name || t.vacant) + (n.p.lane && n.p.lane.key ? ", " + n.p.lane.name : "")));
      rep.id = uid("r");
      ids.push(rep.id);
      text.appendChild(rep);
    }
    if (text && this.style === "directory" && n.p) {
      var chain = set(h("ol", "amc-NOrgChart-chain"), { "aria-label": t.reportsTo });
      var anc = [];
      for (var a = n.p; a; a = a.p) { anc.unshift(a); }
      anc.forEach(function (x) { chain.appendChild(h("li", "amc-NOrgChart-crumb", x.name || t.vacant)); });
      text.appendChild(chain);
    }
    li.setAttribute("aria-labelledby", ids.join(" "));
    li.appendChild(card);
    if (kids.length) {
      li.setAttribute("aria-expanded", this.style === "directory" || n.depth < this.expandLevels ? "true" : "false");
      var total = 0;
      kids.forEach(function (k) { total += 1 + k.team + k.openBelow; });
      li.classList.add(total > 6 ? "is-stack3" : total > 1 ? "is-stack2" : "is-stack1");
      var tog = set(h("span", "amc-NOrgChart-toggle"), { "aria-hidden": "true", "data-amc-act": "toggle", title: this.count(kids.length, t.reportsOne, t.reportsOther) });
      tog.appendChild(h("span", "amc-NOrgChart-toggleNum", this.num(kids.length)));
      tog.appendChild(h("span", "amc-NOrgChart-chev"));
      card.appendChild(tog);
      var group = set(h("ul", "amc-NOrgChart-group"), { role: "group" });
      var leavesOnly = kids.length > 1 && kids.every(function (k) { return !self.kids(k).length; });
      if (leavesOnly) { group.classList.add("amc-NOrgChart-group--stack"); }
      kids.forEach(function (k, i) { group.appendChild(self.item(k, level + 1, i + 1, kids.length)); });
      li.appendChild(group);
    }
    return li;
  };

  /* ---------- Tree state ---------- */
  Chart.prototype.items = function () {
    return Array.prototype.slice.call(this.tree.querySelectorAll("[role=treeitem]"));
  };
  Chart.prototype.isVisible = function (li) {
    if (li.hidden) { return false; }
    var p = li.parentElement ? closest(li.parentElement, "[role=treeitem]") : null;
    while (p && this.tree.contains(p)) {
      if (p.getAttribute("aria-expanded") === "false" || p.hidden) { return false; }
      p = p.parentElement ? closest(p.parentElement, "[role=treeitem]") : null;
    }
    return true;
  };
  Chart.prototype.visibleItems = function () {
    var self = this;
    return this.items().filter(function (li) { return self.isVisible(li); });
  };
  Chart.prototype.parentItem = function (li) {
    var p = li.parentElement ? closest(li.parentElement, "[role=treeitem]") : null;
    return p && this.tree.contains(p) ? p : null;
  };
  Chart.prototype.setOpen = function (li, open, quiet) {
    if (!li || !li.hasAttribute("aria-expanded")) { return false; }
    var was = li.getAttribute("aria-expanded") === "true";
    if (was === open) { return false; }
    li.setAttribute("aria-expanded", open ? "true" : "false");
    if (!quiet) { this.changed(open ? li : null); }
    return true;
  };
  Chart.prototype.changed = function (grown) {
    if (this.style === "radial") { this.layout(grown); }
  };
  Chart.prototype.setAll = function (open) {
    var self = this;
    var any = false;
    this.items().forEach(function (li) {
      // Lanes stay open; closing keeps the top of the chart and its direct reports.
      if (li.classList.contains("amc-NOrgChart-lane")) { return; }
      if (!open && self.style !== "swimlanes" && !self.parentItem(li)) { return; }
      any = self.setOpen(li, open, true) || any;
    });
    this.changed(null);
    var cur = this.tree.querySelector("[role=treeitem][tabindex='0']");
    if (cur && !this.isVisible(cur)) {
      var p = cur;
      while (p && !this.isVisible(p)) { p = this.parentItem(p); }
      if (p) { this.focusItem(p, false); }
    }
    return any;
  };
  Chart.prototype.revealItem = function (li) {
    var changed = false;
    for (var p = this.parentItem(li); p; p = this.parentItem(p)) {
      if (p.getAttribute("aria-expanded") === "false") {
        p.setAttribute("aria-expanded", "true");
        changed = true;
      }
    }
    if (changed) { this.changed(null); }
  };
  Chart.prototype.focusItem = function (li, focus, center) {
    if (!li) { return; }
    each(this.tree.querySelectorAll("[role=treeitem][tabindex='0']"), function (x) { x.setAttribute("tabindex", "-1"); });
    li.setAttribute("tabindex", "0");
    if (focus) {
      try { li.focus({ preventScroll: true }); } catch (e) { li.focus(); }
    }
    this.scrollTo(li, center);
  };
  Chart.prototype.scrollTo = function (li, center) {
    var target = li.querySelector(":scope > .amc-NOrgChart-card, :scope > .amc-NOrgChart-laneHead") || li;
    var vp = this.vp;
    var v = vp.getBoundingClientRect();
    var r = target.getBoundingClientRect();
    var behavior = reduced() ? "auto" : "smooth";
    var outside = r.left < v.left || r.right > v.right || r.top < v.top || r.bottom > v.bottom;
    if (center || outside) {
      var dx = (r.left + r.width / 2) - (v.left + v.width / 2);
      var dy = (r.top + r.height / 2) - (v.top + v.height / 2);
      if (!center) {
        dx = r.left < v.left ? r.left - v.left - 24 : r.right > v.right ? r.right - v.right + 24 : 0;
        dy = r.top < v.top ? r.top - v.top - 24 : r.bottom > v.bottom ? r.bottom - v.bottom + 24 : 0;
      }
      if (vp.scrollBy) { vp.scrollBy({ left: dx, top: dy, behavior: behavior }); } else { vp.scrollLeft += dx; vp.scrollTop += dy; }
    }
    // Then bring the viewport itself into the page view when needed.
    var pr = target.getBoundingClientRect();
    if (pr.top < 0 || pr.bottom > (window.innerHeight || 0)) {
      try { target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: behavior }); } catch (e) { target.scrollIntoView(false); }
    }
  };

  /* ---------- Keyboard ---------- */
  Chart.prototype.onKey = function (e, li) {
    var key = e.key;
    var fwd = this.rtl ? "ArrowLeft" : "ArrowRight";
    var back = this.rtl ? "ArrowRight" : "ArrowLeft";
    var vis;
    var i;
    if (key === "ArrowDown" || key === "ArrowUp") {
      vis = this.visibleItems();
      i = vis.indexOf(li) + (key === "ArrowDown" ? 1 : -1);
      if (i >= 0 && i < vis.length) { this.focusItem(vis[i], true); }
    } else if (key === fwd) {
      if (li.getAttribute("aria-expanded") === "false") {
        this.setOpen(li, true);
        this.scrollTo(li);
      } else if (li.getAttribute("aria-expanded") === "true") {
        var child = li.querySelector(":scope > .amc-NOrgChart-group > [role=treeitem]");
        if (child) { this.focusItem(child, true); }
      }
    } else if (key === back) {
      if (li.getAttribute("aria-expanded") === "true") {
        this.setOpen(li, false);
        this.scrollTo(li);
      } else {
        var p = this.parentItem(li);
        if (p) { this.focusItem(p, true); }
      }
    } else if (key === "Home" || key === "End") {
      vis = this.visibleItems();
      this.focusItem(key === "Home" ? vis[0] : vis[vis.length - 1], true);
    } else if (key === "Enter") {
      var link = li.querySelector(":scope > .amc-NOrgChart-card a.amc-NOrgChart-link");
      if (link) { link.click(); } else if (li.hasAttribute("aria-expanded")) {
        this.setOpen(li, li.getAttribute("aria-expanded") !== "true");
      } else { return; }
    } else if (key === "*") {
      var self = this;
      each(li.parentElement.children, function (sib) { self.setOpen(sib, true, true); });
      this.changed(null);
    } else if (key.length === 1 && /\S/.test(key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var ch = norm(key);
      vis = this.visibleItems();
      i = vis.indexOf(li);
      for (var k = 1; k <= vis.length; k++) {
        var cand = vis[(i + k) % vis.length];
        var nm = cand.querySelector(":scope > .amc-NOrgChart-card .amc-NOrgChart-name, :scope > .amc-NOrgChart-laneHead .amc-NOrgChart-laneName");
        if (nm && norm(nm.textContent).indexOf(ch) === 0) { this.focusItem(cand, true); break; }
      }
    } else {
      return;
    }
    e.preventDefault();
  };

  /* ---------- Search ---------- */
  Chart.prototype.search = function (q) {
    var self = this;
    var t = this.i18n;
    var words = norm(q).split(" ").filter(Boolean);
    each(this.tree.querySelectorAll(".is-match, .is-current"), function (el) { el.classList.remove("is-match", "is-current"); });
    this.matches = [];
    this.cur = -1;
    var directory = this.style === "directory";
    if (!words.length) {
      if (directory) {
        each(this.tree.querySelectorAll("[role=treeitem]"), function (li) { li.hidden = false; });
        this.root.classList.remove("is-filtered");
      }
      this.status.textContent = "";
      this.changed(null);
      return;
    }
    this.list.forEach(function (n) {
      var hit = words.every(function (w) { return n.key.indexOf(w) >= 0; });
      if (hit && n.el) { self.matches.push(n); n.el.classList.add("is-match"); }
    });
    if (directory) {
      var keep = {};
      this.matches.forEach(function (n) { for (var a = n; a; a = a.p) { keep[a.id] = true; } });
      this.list.forEach(function (n) { if (n.el) { n.el.hidden = !keep[n.id]; } });
      this.root.classList.add("is-filtered");
    }
    if (!this.matches.length) {
      this.status.textContent = t.noMatch;
      return;
    }
    this.status.textContent = this.count(this.matches.length, t.matchOne, t.matchOther);
    this.go(0, false);
  };
  Chart.prototype.go = function (i, focus) {
    if (!this.matches.length) { return; }
    var n = this.matches.length;
    this.cur = ((i % n) + n) % n;
    var node = this.matches[this.cur];
    each(this.tree.querySelectorAll(".is-current"), function (el) { el.classList.remove("is-current"); });
    node.el.classList.add("is-current");
    this.revealItem(node.el);
    this.focusItem(node.el, !!focus, true);
    if (n > 1) {
      this.status.textContent = this.num(this.cur + 1) + " " + this.i18n.of + " " + this.count(n, this.i18n.matchOne, this.i18n.matchOther);
    }
    this.live.textContent = (node.name || this.i18n.vacant) + (node.job ? ", " + node.job : "");
  };

  /* ---------- Zoom and pan ---------- */
  Chart.prototype.setZoom = function (z) {
    z = Math.max(0.3, Math.min(1.5, z));
    var vp = this.vp;
    var cx = (vp.scrollLeft + vp.clientWidth / 2) / (this.zoom || 1);
    var cy = (vp.scrollTop + vp.clientHeight / 2) / (this.zoom || 1);
    this.zoom = round(z);
    this.canvas.style.setProperty("--amc-norg-zoom", String(this.zoom));
    vp.scrollLeft = cx * this.zoom - vp.clientWidth / 2;
    vp.scrollTop = cy * this.zoom - vp.clientHeight / 2;
    if (this.zoomLabel) { this.zoomLabel.textContent = Math.round(this.zoom * 100) + "%"; }
    this.root.classList.toggle("is-zoomed", this.zoom !== 1);
  };
  Chart.prototype.step = function (dir) {
    var z = this.zoom;
    var next = z;
    if (dir > 0) {
      for (var i = 0; i < ZOOMS.length; i++) { if (ZOOMS[i] > z + 0.001) { next = ZOOMS[i]; break; } }
    } else {
      for (var j = ZOOMS.length - 1; j >= 0; j--) { if (ZOOMS[j] < z - 0.001) { next = ZOOMS[j]; break; } }
    }
    this.setZoom(next);
  };
  Chart.prototype.fit = function () {
    this.canvas.style.setProperty("--amc-norg-zoom", "1");
    var w = this.canvas.scrollWidth;
    var hgt = this.canvas.scrollHeight;
    this.canvas.style.setProperty("--amc-norg-zoom", String(this.zoom));
    var avail = this.vp.clientWidth - 8;
    var availH = this.vp.clientHeight - 8;
    var z = Math.min(1, avail / (w || 1), hgt > availH * 1.05 && availH > 200 ? availH / hgt : 1);
    this.setZoom(z);
    this.vp.scrollLeft = 0;
    this.vp.scrollTop = 0;
  };

  /* ---------- Radial layout ---------- */
  Chart.prototype.layout = function (grown) {
    var self = this;
    var GAP = 150;
    var SLOT = 128;
    var PAD = 96;
    var roots = this.roots;
    var virtual = roots.length > 1;
    var top = virtual ? { children: roots, virtual: true } : roots[0];
    if (!top) { return; }
    function open(n) { return n.virtual || (n.el && n.el.getAttribute("aria-expanded") === "true"); }
    function kids(n) { return open(n) ? n.children : []; }
    function leaves(n) {
      var k = kids(n);
      if (!k.length) { return 1; }
      var s = 0;
      k.forEach(function (c) { s += leaves(c); });
      return s;
    }
    var perDepth = [];
    (function count(n, d) {
      perDepth[d] = (perDepth[d] || 0) + (n.virtual ? 0 : 1);
      kids(n).forEach(function (c) { count(c, d + 1); });
    })(top, 0);
    var radius = [0];
    for (var d = 1; d < perDepth.length; d++) {
      radius[d] = Math.max(radius[d - 1] + GAP, (perDepth[d] * SLOT) / (2 * Math.PI));
    }
    var rmax = radius[radius.length - 1] || 0;
    var size = Math.round(2 * (rmax + PAD));
    var c = size / 2;
    var pos = [];
    (function place(n, d, a0, a1) {
      var mid = (a0 + a1) / 2;
      var r = radius[d];
      n.x = c + r * Math.sin(mid);
      n.y = c - r * Math.cos(mid);
      if (!n.virtual) { pos.push(n); }
      var k = kids(n);
      var total = leaves(n);
      var a = a0;
      // Single-child chains stay on the parent's bearing.
      k.forEach(function (ch) {
        var span = (a1 - a0) * leaves(ch) / total;
        place(ch, d + 1, a, a + span);
        a += span;
      });
    })(top, 0, 0, 2 * Math.PI);
    this.canvas.style.setProperty("--amc-norg-w", String(size));
    this.canvas.style.setProperty("--amc-norg-h", String(size));
    // Wires and rings.
    var svg = this.svg;
    while (svg.firstChild) { svg.removeChild(svg.firstChild); }
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    for (var rr = 1; rr < radius.length; rr++) {
      var ring = document.createElementNS(SVGNS, "circle");
      set(ring, { cx: round(c), cy: round(c), r: round(radius[rr]), "class": "amc-NOrgChart-ring" });
      svg.appendChild(ring);
    }
    pos.forEach(function (n) {
      var p = n.p || (virtual ? { x: c, y: c } : null);
      if (!p) { return; }
      var line = document.createElementNS(SVGNS, "line");
      set(line, { x1: round(p.x), y1: round(p.y), x2: round(n.x), y2: round(n.y), "class": "amc-NOrgChart-wire" + (n.vacant ? " amc-NOrgChart-wire--vacant" : "") });
      svg.appendChild(line);
    });
    var dir = this.rtl ? -1 : 1;
    pos.forEach(function (n) {
      var card = n.card;
      var was = card.getAttribute("data-amc-placed") === "Y";
      card.style.setProperty("--amc-norg-x", String(round(n.x)));
      card.style.setProperty("--amc-norg-y", String(round(n.y)));
      card.setAttribute("data-amc-placed", "Y");
      if (grown && !was && n.p && !reduced()) {
        card.style.setProperty("--amc-norg-fx", String(round((n.p.x - n.x) * dir)));
        card.style.setProperty("--amc-norg-fy", String(round(n.p.y - n.y)));
        card.classList.add("is-growing");
      }
    });
    // Cards of hidden nodes forget their place, so they grow again next time.
    this.list.forEach(function (n) {
      if (pos.indexOf(n) < 0) { n.card.removeAttribute("data-amc-placed"); }
    });
    if (grown) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          each(self.canvas.querySelectorAll(".is-growing"), function (el) { el.classList.remove("is-growing"); });
        });
      });
    }
  };

  /* ---------- Delegated events ---------- */
  function chartOf(el) {
    var root = closest(el, ".amc-NOrgChart");
    return root && root.amcNOrg ? root.amcNOrg : null;
  }

  function onClick(e) {
    var ch = chartOf(e.target);
    if (!ch) { return; }
    var act = closest(e.target, "[data-amc-act]");
    var li = closest(e.target, "[role=treeitem]");
    if (act) {
      var a = act.getAttribute("data-amc-act");
      if (a === "toggle" && li) {
        ch.setOpen(li, li.getAttribute("aria-expanded") !== "true");
        ch.focusItem(li, true);
        e.preventDefault();
        return;
      }
      if (a === "zoom-in") { ch.step(1); }
      if (a === "zoom-out") { ch.step(-1); }
      if (a === "fit") { ch.fit(); }
      if (a === "open-all") { ch.setAll(true); }
      if (a === "close-all") { ch.setAll(false); }
      return;
    }
    if (li && ch.tree.contains(li) && !closest(e.target, "a")) {
      // The big lane heading opens and closes its lane.
      if (li.classList.contains("amc-NOrgChart-lane") && closest(e.target, ".amc-NOrgChart-laneHead")) {
        ch.setOpen(li, li.getAttribute("aria-expanded") !== "true");
      }
      ch.focusItem(li, true);
    }
  }

  function onKey(e) {
    var ch = chartOf(e.target);
    if (!ch) { return; }
    if (e.target === ch.input) {
      if (e.key === "Enter") {
        if (ch.matches.length) { ch.go(ch.cur + (e.shiftKey ? -1 : 1), false); }
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (ch.matches.length) { ch.go(ch.cur < 0 ? 0 : ch.cur, true); e.preventDefault(); }
      } else if (e.key === "Escape" && ch.input.value) {
        ch.input.value = "";
        ch.search("");
        e.preventDefault();
      }
      return;
    }
    var li = e.target.getAttribute && e.target.getAttribute("role") === "treeitem" ? e.target : null;
    if (li && ch.tree.contains(li)) { ch.onKey(e, li); }
  }

  var searchTimer = 0;
  function onInput(e) {
    var ch = chartOf(e.target);
    if (!ch || e.target !== ch.input) { return; }
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(function () { ch.search(ch.input.value); }, 120);
  }

  function onFocusIn(e) {
    var ch = chartOf(e.target);
    if (!ch) { return; }
    var li = e.target.getAttribute && e.target.getAttribute("role") === "treeitem" ? e.target : null;
    if (li && li.getAttribute("tabindex") !== "0") { ch.focusItem(li, false); }
  }

  function onWheel(e) {
    if (!(e.ctrlKey || e.metaKey)) { return; }
    var ch = chartOf(e.target);
    if (!ch || !ch.zoomable || !closest(e.target, ".amc-NOrgChart-viewport")) { return; }
    e.preventDefault();
    ch.step(e.deltaY < 0 ? 1 : -1);
  }

  var pan = null;
  function onDown(e) {
    if (e.button !== 0 || (e.pointerType && e.pointerType !== "mouse")) { return; }
    var vp = closest(e.target, ".amc-NOrgChart-viewport");
    if (!vp || closest(e.target, ".amc-NOrgChart-card, .amc-NOrgChart-laneHead, a, button, input")) { return; }
    var ch = chartOf(vp);
    if (!ch || !ch.zoomable) { return; }
    if (vp.scrollWidth <= vp.clientWidth && vp.scrollHeight <= vp.clientHeight) { return; }
    pan = { vp: vp, x: e.clientX, y: e.clientY, l: vp.scrollLeft, t: vp.scrollTop, id: e.pointerId, moved: false };
    try { vp.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
  }
  function onMove(e) {
    if (!pan || e.pointerId !== pan.id) { return; }
    var dx = e.clientX - pan.x;
    var dy = e.clientY - pan.y;
    if (!pan.moved && Math.abs(dx) + Math.abs(dy) < 4) { return; }
    pan.moved = true;
    pan.vp.classList.add("is-panning");
    pan.vp.scrollLeft = pan.l - dx;
    pan.vp.scrollTop = pan.t - dy;
  }
  function onUp(e) {
    if (!pan || e.pointerId !== pan.id) { return; }
    pan.vp.classList.remove("is-panning");
    pan = null;
  }

  /* ---------- Lifecycle ---------- */
  function init(scope) {
    each((scope || document).querySelectorAll(".amc-NOrgChart:not([data-amc-init])"), function (root) {
      try {
        instances.push(new Chart(root));
      } catch (err) {
        root.setAttribute("data-amc-init", "E");
        if (window.console) { window.console.warn("amcNextOrgChart", err); }
      }
    });
    instances = instances.filter(function (c) { return document.documentElement.contains(c.root); });
  }
  function refresh(scope) {
    init(scope && scope.querySelectorAll ? scope : document);
  }
  function reveal(el, id) {
    var root = el && el.classList && el.classList.contains("amc-NOrgChart") ? el : el && el.querySelector ? el.querySelector(".amc-NOrgChart") : null;
    var ch = root && root.amcNOrg;
    var n = ch && ch.byId[String(id)];
    if (!n || !n.el) { return false; }
    ch.revealItem(n.el);
    ch.focusItem(n.el, true, true);
    return true;
  }

  function start() {
    init(document);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    document.addEventListener("input", onInput);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    if (window.MutationObserver) {
      var pending = 0;
      new MutationObserver(function () {
        if (pending) { return; }
        pending = window.requestAnimationFrame(function () { pending = 0; init(document); });
      }).observe(document.body, { childList: true, subtree: true });
    }
    if (window.apex && window.apex.jQuery) {
      window.apex.jQuery(document).on("apexafterrefresh", function (ev) { refresh(ev.target); });
    }
  }

  window.amcNextOrgChart = { init: init, refresh: refresh, reveal: reveal };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
