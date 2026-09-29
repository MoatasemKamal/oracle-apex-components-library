/* APEX Modern Components - Next Approval runtime (Next Collection)
 *
 * Every row is complete without this file (name, role, state as text and icon, raw ISO
 * dates). This file:
 *  - formats Action Date and Due Date with Intl in the page language;
 *  - groups consecutive rows with the same Step into one parallel step, decided by the
 *    region's Parallel Rule (all or any), with a heading such as "1 of 2 approved";
 *  - finds the step that acts now (the first undecided step with a pending approver),
 *    marks it with aria-current="step", and fills its SLA ring from the moment the request
 *    reached it (latest Action Date of the earlier steps) to its Due Date;
 *  - shows "Overdue by 2 days" or "Due in 5 hours" (last quarter of the SLA or last 24 h);
 *  - marks steps after a rejection as not reached;
 *  - writes a one-line summary ("Waiting on Omar Aziz, overdue by 1 day");
 *  - in Audit log, writes each decision as a sentence and orders decisions by time.
 * Text is inserted with textContent only; only parsed numbers reach CSS, as custom
 * properties. Times refresh every minute. Re-inits new regions (MutationObserver) and
 * after apexafterrefresh. Motion is CSS only and stops under prefers-reduced-motion.
 * ES5, no dependencies. */
(function () {
  "use strict";
  if (window.amcNextApproval) {
    return;
  }

  var HOUR = 3600000;
  var DAY = 86400000;
  var instances = [];

  function h(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) { el.className = cls; }
    if (text !== undefined && text !== null) { el.textContent = text; }
    return el;
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
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
  function parseISO(v) {
    var m = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/.exec(String(v || ""));
    if (!m) { return null; }
    var time = m[4] !== undefined && m[4] !== "";
    var d = new Date(+m[1], +m[2] - 1, +m[3], time ? +m[4] : 0, time ? +m[5] : 0);
    if (isNaN(d.getTime()) || d.getMonth() !== +m[2] - 1) { return null; }
    return { d: d, time: time };
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
    var src = root.querySelector(".amc-NApproval-i18n");
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
  function fmtDate(lang, p, now) {
    var o = { day: "numeric", month: "short" };
    if (p.d.getFullYear() !== now.getFullYear()) { o.year = "numeric"; }
    if (p.time) { o.hour = "numeric"; o.minute = "2-digit"; }
    try { return new Intl.DateTimeFormat(lang, o).format(p.d); } catch (e) { return p.d.toDateString(); }
  }
  function duration(lang, ms) {
    ms = Math.abs(ms);
    var unit = ms >= DAY ? "day" : "hour";
    var n = unit === "day" ? Math.max(1, Math.round(ms / DAY)) : Math.max(1, Math.round(ms / HOUR));
    try {
      return new Intl.NumberFormat(lang, { style: "unit", unit: unit, unitDisplay: "long" }).format(n);
    } catch (e) {
      return n + " " + unit + (n === 1 ? "" : "s");
    }
  }
  function stateOf(single) { return single.getAttribute("data-state") || "waiting"; }
  function nameOf(single) {
    var n = single.querySelector(".amc-NApproval-name");
    return n ? trim(n.textContent) : "";
  }
  function textOf(single, sel) {
    var n = single.querySelector(sel);
    return n ? trim(n.textContent) : "";
  }

  /* Times, overdue and the SLA ring of one approver. Returns { overdue, soon, left }. */
  function timeStep(single, lang, now) {
    var out = { overdue: false, soon: false, left: null };
    var when = single.querySelector(".amc-NApproval-when");
    var acted = parseISO(single.getAttribute("data-acted"));
    if (when && acted) { when.textContent = fmtDate(lang, acted, now); }
    var dueEl = single.querySelector(".amc-NApproval-due");
    var due = parseISO(single.getAttribute("data-due"));
    single.classList.remove("is-overdue", "is-due-soon", "has-sla");
    single.style.removeProperty("--amc-ap-sla");
    if (!dueEl || !due) { return out; }
    if (!due.time) { due.d = new Date(due.d.getFullYear(), due.d.getMonth(), due.d.getDate(), 23, 59); }
    var state = stateOf(single);
    var left = due.d.getTime() - now.getTime();
    var reached = single.amcReached;
    out.left = left;
    if (state === "pending" && !single.classList.contains("is-unreached") && !single.classList.contains("is-settled")) {
      var span = reached ? due.d.getTime() - reached.getTime() : 0;
      if (left < 0) {
        out.overdue = true;
        single.classList.add("is-overdue");
        dueEl.textContent = fmt(dueEl.getAttribute("data-overdue"), [duration(lang, left)]);
      } else if (left < DAY || (span > 0 && left < span / 4)) {
        out.soon = true;
        single.classList.add("is-due-soon");
        dueEl.textContent = fmt(dueEl.getAttribute("data-due-in"), [duration(lang, left)]);
      } else {
        dueEl.textContent = fmt(dueEl.getAttribute("data-due-on"), [fmtDate(lang, due, now)]);
      }
      var frac = left < 0 ? 1 : (span > 0 ? Math.min(1, Math.max(0, 1 - left / span)) : null);
      if (frac !== null) {
        single.classList.add("has-sla");
        single.style.setProperty("--amc-ap-sla", String(Math.round(frac * 1000) / 1000));
      }
    } else {
      dueEl.textContent = fmt(dueEl.getAttribute("data-due-on"), [fmtDate(lang, due, now)]);
    }
    return out;
  }

  function joinNames(t, names) {
    if (names.length < 2) { return names[0] || ""; }
    return fmt(t.and, [names.slice(0, -1).join(", "), names[names.length - 1]]);
  }

  /* ---------- a whole chain (report mode) ---------- */
  function Flow(root) {
    this.root = root;
    root.amcNApproval = this;
    this.t = readI18n(root);
    this.lang = langOf(root);
    this.rule = root.getAttribute("data-rule") === "any" ? "any" : "all";
    this.view = root.getAttribute("data-view") || "chain";
    this.build();
    root.setAttribute("data-amc-init", "Y");
    root.classList.add("is-ready");
  }

  Flow.prototype.build = function () {
    var self = this;
    var t = this.t;
    var list = this.root.querySelector(".amc-NApproval-list");
    this.list = list;
    var items = Array.prototype.filter.call(list.children, function (li) { return li.classList.contains("amc-NApproval-item"); });
    var groups = [];
    items.forEach(function (li) {
      var single = li.querySelector(".amc-NApproval--single");
      if (!single) { return; }
      single.setAttribute("data-amc-init", "Y");
      var step = trim(li.getAttribute("data-step"));
      var g = groups[groups.length - 1];
      if (!g || g.step !== step) {
        g = { step: step, members: [] };
        groups.push(g);
      }
      g.members.push({ li: li, el: single });
    });
    this.groups = groups;

    var reached = null;
    var rejectedAt = -1;
    groups.forEach(function (g, gi) {
      var st = g.members.map(function (m) { return stateOf(m.el); });
      var has = function (s) { return st.indexOf(s) >= 0; };
      var approved = st.filter(function (s) { return s === "approved"; }).length;
      g.approved = approved;
      if (has("rejected")) { g.state = "rejected"; }
      else if (self.rule === "any" ? approved > 0 : (approved > 0 && st.every(function (s) { return s === "approved" || s === "skipped"; }))) { g.state = "approved"; }
      else if (has("pending")) { g.state = "pending"; }
      else if (st.every(function (s) { return s === "skipped"; })) { g.state = "skipped"; }
      else { g.state = "waiting"; }
      if (g.state === "rejected" && rejectedAt < 0) { rejectedAt = gi; }
      g.reached = reached;
      var latest = null;
      g.members.forEach(function (m) {
        m.el.amcReached = reached;
        var a = parseISO(m.el.getAttribute("data-acted"));
        if (a && (!latest || a.d > latest)) { latest = a.d; }
      });
      if (latest && (!reached || latest > reached)) { reached = latest; }
      if (g.state === "approved") {
        g.members.forEach(function (m) {
          if (stateOf(m.el) === "pending" || stateOf(m.el) === "waiting") {
            m.el.classList.add("is-settled");
            var lab = m.el.querySelector(".amc-NApproval-state");
            if (lab) { lab.textContent = t.notNeeded; }
          }
        });
      }
      if (rejectedAt >= 0 && gi > rejectedAt) {
        g.unreached = true;
        g.members.forEach(function (m) {
          var s = stateOf(m.el);
          if (s === "waiting" || s === "pending") {
            m.el.classList.add("is-unreached");
            m.li.classList.add("is-unreached");
            var lab = m.el.querySelector(".amc-NApproval-state");
            if (lab) { lab.textContent = t.notReached; }
          }
        });
      }
    });
    this.current = null;
    for (var i = 0; i < groups.length; i++) {
      if (rejectedAt >= 0 && i >= rejectedAt) { break; }
      if (groups[i].state === "pending") { this.current = groups[i]; break; }
      if (groups[i].state === "waiting") { break; }
    }
    if (this.current) {
      this.current.members.forEach(function (m) {
        if (stateOf(m.el) === "pending") {
          m.el.classList.add("is-now");
          m.li.classList.add("is-now");
          m.el.appendChild(h("span", "amc-NApproval-sr", t.now));
        }
      });
    }

    if (this.view === "auditLog") {
      this.buildLog();
    } else {
      groups.forEach(function (g) {
        var cls = "amc-NApproval-g--" + g.state + (g === self.current ? " is-current" : "") + (g.unreached ? " is-unreached" : "");
        if (g.members.length === 1) {
          var li = g.members[0].li;
          cls.split(" ").forEach(function (c) { li.classList.add(c); });
          if (g === self.current) { li.setAttribute("aria-current", "step"); }
          return;
        }
        var wrap = h("li", "amc-NApproval-group " + cls);
        if (g === self.current) { wrap.setAttribute("aria-current", "step"); }
        var head = h("p", "amc-NApproval-groupHead");
        head.appendChild(h("span", "amc-NApproval-groupStep", fmt(t.step, [g.step])));
        head.appendChild(h("span", "amc-NApproval-groupRule", self.rule === "any" ? fmt(t.any, [g.members.length]) : fmt(t.all, [g.approved, g.members.length])));
        var ol = h("ol", "amc-NApproval-members");
        list.insertBefore(wrap, g.members[0].li);
        wrap.appendChild(head);
        wrap.appendChild(ol);
        g.members.forEach(function (m) { ol.appendChild(m.li); });
      });
    }
    this.summary = h("p", "amc-NApproval-summary");
    this.root.insertBefore(this.summary, list);
    this.tick(new Date());
  };

  Flow.prototype.buildLog = function () {
    var t = this.t;
    var list = this.list;
    var done = [];
    var open = [];
    this.groups.forEach(function (g) {
      g.members.forEach(function (m) {
        var s = stateOf(m.el);
        var a = parseISO(m.el.getAttribute("data-acted"));
        var role = textOf(m.el, ".amc-NApproval-role");
        var deleg = textOf(m.el, ".amc-NApproval-delegName");
        var body = m.el.querySelector(".amc-NApproval-body");
        if (s === "approved" || s === "rejected" || s === "skipped") {
          var key = s === "approved" ? "logApproved" : (s === "rejected" ? "logRejected" : "logSkipped");
          var text = role ? fmt(t[key], [nameOf(m.el), role]) : fmt(t[key + "Plain"], [nameOf(m.el)]);
          if (deleg) { text += ", " + fmt(t.logBehalf, [deleg]); }
          body.insertBefore(h("p", "amc-NApproval-sentence", text), body.firstChild);
          m.el.classList.add("is-logged");
          done.push({ li: m.li, t: a ? a.d.getTime() : Infinity, i: done.length });
        } else {
          open.push(m.li);
        }
      });
    });
    done.sort(function (x, y) { return x.t === y.t ? x.i - y.i : x.t - y.t; });
    var sec = function (text) {
      var li = h("li", "amc-NApproval-section");
      li.setAttribute("role", "presentation");
      li.appendChild(h("p", "amc-NApproval-sectionName", text));
      return li;
    };
    if (done.length) { list.appendChild(sec(t.logDecisions)); }
    done.forEach(function (d) { list.appendChild(d.li); });
    if (open.length) { list.appendChild(sec(t.logOpen)); }
    open.forEach(function (li) { list.appendChild(li); });
    if (this.current) {
      this.current.members.forEach(function (m) { if (m.el.classList.contains("is-now")) { m.li.setAttribute("aria-current", "step"); } });
    }
  };

  Flow.prototype.tick = function (now) {
    var self = this;
    var t = this.t;
    var worst = null;
    this.groups.forEach(function (g) {
      g.members.forEach(function (m) {
        var r = timeStep(m.el, self.lang, now);
        m.li.classList.toggle("is-overdue", r.overdue);
        m.li.classList.toggle("is-due-soon", r.soon);
        if (g === self.current && m.el.classList.contains("is-now") && r.left !== null && (worst === null || r.left < worst.left)) { worst = r; }
      });
    });
    var text = "";
    var rej = null;
    var lastAct = null;
    this.groups.forEach(function (g) {
      g.members.forEach(function (m) {
        var a = parseISO(m.el.getAttribute("data-acted"));
        if (!rej && stateOf(m.el) === "rejected") { rej = { m: m, a: a }; }
        if (a && (!lastAct || a.d > lastAct.d)) { lastAct = a; }
      });
    });
    if (rej) {
      text = fmt(t.rejectedBy, [nameOf(rej.m.el), rej.a ? fmtDate(this.lang, rej.a, now) : ""]);
    } else if (this.current) {
      var names = [];
      this.current.members.forEach(function (m) { if (m.el.classList.contains("is-now")) { names.push(nameOf(m.el)); } });
      text = fmt(t.waitingOn, [joinNames(t, names)]);
      if (worst && worst.overdue) { text += ", " + fmt(t.overdue, [duration(this.lang, worst.left)]); }
      else if (worst && worst.soon) { text += ", " + fmt(t.dueIn, [duration(this.lang, worst.left)]); }
    } else if (this.groups.length && this.groups.every(function (g) { return g.state === "approved" || g.state === "skipped"; })) {
      text = fmt(t.approvedAll, [lastAct ? fmtDate(this.lang, lastAct, now) : ""]);
    }
    this.summary.textContent = text;
    this.summary.hidden = !text;
    this.root.classList.toggle("is-overdue", !!(worst && worst.overdue));
    this.root.classList.toggle("is-rejected", !!rej);
  };

  /* ---------- one approver on its own (partial mode) ---------- */
  function Single(el) {
    this.el = el;
    this.lang = langOf(el);
    el.setAttribute("data-amc-init", "Y");
    el.amcReached = null;
    if (stateOf(el) === "pending") { el.classList.add("is-now"); }
    this.tick(new Date());
  }
  Single.prototype.tick = function (now) { timeStep(this.el, this.lang, now); };
  Object.defineProperty(Single.prototype, "root", { get: function () { return this.el; } });

  function init(scope) {
    scope = scope || document;
    each(scope.querySelectorAll(".amc-NApproval--flow:not([data-amc-init])"), function (root) {
      try { instances.push(new Flow(root)); } catch (err) {
        root.setAttribute("data-amc-init", "E");
        if (window.console) { window.console.warn("amcNextApproval", err); }
      }
    });
    each(scope.querySelectorAll(".amc-NApproval--single:not([data-amc-init])"), function (el) {
      if (closest(el.parentElement, ".amc-NApproval--flow")) { return; }
      try { instances.push(new Single(el)); } catch (err) { el.setAttribute("data-amc-init", "E"); }
    });
    instances = instances.filter(function (x) { return document.documentElement.contains(x.root); });
  }

  function start() {
    init(document);
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
    window.setInterval(function () {
      var now = new Date();
      instances = instances.filter(function (x) { return document.documentElement.contains(x.root); });
      instances.forEach(function (x) { x.tick(now); });
    }, 60000);
  }

  window.amcNextApproval = { init: init };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
