/* APEX Modern Components - Next Calendar runtime (Next Collection)
 *
 * The report renders every row as a plain agenda list (<ol class="amc-NCalendar-source">),
 * which is what users see without JavaScript. This file reads those rows, parses the ISO
 * dates (YYYY-MM-DD or YYYY-MM-DDTHH24:MI) and builds the chosen view next to the list:
 * month, agenda, week, heatmap, timelineLanes, posterDay, flipDate, countdown,
 * circularYear or miniDots.
 *
 * - Month and weekday names, numbers, durations and relative labels come only from Intl
 *   (DateTimeFormat, RelativeTimeFormat, NumberFormat, PluralRules) in the page language,
 *   with the Gregorian or Islamic Umm al-Qura calendar. Month grids follow the chosen
 *   calendar's own months.
 * - Text is inserted with textContent only. Links reuse the href APEX already escaped;
 *   javascript:, data: and vbscript: URLs are dropped.
 * - Only parsed numbers reach CSS, as custom properties.
 * - Keyboard: roving tabindex; arrow keys move between days (mirrored in RTL), Home/End,
 *   PageUp/PageDown, Enter opens the day, Escape closes the popover.
 * - Rebuilds on apexafterrefresh and when new regions appear. One shared minute timer
 *   updates countdowns, the now line and "today".
 * - Animations are CSS only and are switched off by prefers-reduced-motion. */
(function () {
  "use strict";
  if (window.amcNextCalendar) {
    return;
  }

  var MIN = 60000;
  var HOUR = 3600000;
  var DAYMS = 86400000;
  var NCAT = 8;
  var MAXCHIPS = 3;
  var STYLES = ["month", "agenda", "week", "heatmap", "timelineLanes", "posterDay", "flipDate", "countdown", "circularYear", "miniDots"];
  var SVGNS = "http://www.w3.org/2000/svg";
  var mqReduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var instances = [];
  var uidSeq = 0;

  function reduced() { return !!(mqReduce && mqReduce.matches); }

  /* ---------- DOM helpers ---------- */
  function h(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) { el.className = cls; }
    if (text !== undefined && text !== null) { el.textContent = text; }
    return el;
  }
  function s(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) { el.setAttribute(k, attrs[k]); }
    }
    return el;
  }
  function set(el, attrs) {
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) { el.setAttribute(k, attrs[k]); }
    }
    return el;
  }
  function clear(el) { while (el.firstChild) { el.removeChild(el.firstChild); } }
  function round(n) { return Math.round(n * 1000) / 1000; }
  function cssVar(el, name, n, unit) { el.style.setProperty(name, String(round(n)) + (unit || "")); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function uid() { uidSeq++; return "amc-ncal-" + uidSeq; }
  function button(cls, act, label) {
    var b = h("button", "amc-NCalendar-btn " + (cls || ""));
    b.type = "button";
    if (act) { b.setAttribute("data-amc-act", act); }
    if (label) { b.setAttribute("aria-label", label); }
    return b;
  }

  /* ---------- Dates ---------- */
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function dayOf(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function keyOf(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function dayDiff(a, b) { return Math.round((dayOf(b).getTime() - dayOf(a).getTime()) / DAYMS); }
  function sameDay(a, b) { return a && b && keyOf(a) === keyOf(b); }
  function minutesOf(d) { return d.getHours() * 60 + d.getMinutes(); }
  function parseISO(v) {
    var m = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?/.exec(String(v || ""));
    if (!m) { return null; }
    var hasTime = m[4] !== undefined && m[4] !== "";
    var d = new Date(+m[1], +m[2] - 1, +m[3], hasTime ? +m[4] : 0, hasTime ? +m[5] : 0);
    if (isNaN(d.getTime()) || d.getMonth() !== +m[2] - 1) { return null; }
    return { d: d, time: hasTime };
  }
  function safeHref(u) {
    u = String(u || "").replace(/^\s+|\s+$/g, "");
    if (!u || /^(javascript|data|vbscript):/i.test(u.replace(/[\s\u0000-\u001f]/g, ""))) { return ""; }
    return u;
  }
  function clampInt(v, lo, hi, dflt) {
    var n = parseInt(v, 10);
    if (!isFinite(n)) { return dflt; }
    return Math.max(lo, Math.min(hi, n));
  }
  function lastDay(ev) {
    var l = dayOf(new Date(ev.end.getTime() - 1));
    return l < dayOf(ev.start) ? dayOf(ev.start) : l;
  }

  /* ---------- Locale helpers ---------- */
  function langOf(root) {
    var el = root.closest ? root.closest("[lang]") : null;
    var lang = (el && el.getAttribute("lang")) || document.documentElement.lang || navigator.language || "en";
    try {
      return Intl.DateTimeFormat.supportedLocalesOf([lang]).length ? lang : "en";
    } catch (e) {
      return "en";
    }
  }
  function calOf(v) {
    var c = /islamic/i.test(String(v || "")) ? "islamic-umalqura" : "gregory";
    if (c === "gregory") { return c; }
    try {
      return new Intl.DateTimeFormat("en", { calendar: c }).resolvedOptions().calendar === c ? c : "gregory";
    } catch (e) {
      return "gregory";
    }
  }
  function weekendOf(lang) {
    try {
      var loc = new Intl.Locale(lang);
      var info = loc.getWeekInfo ? loc.getWeekInfo() : loc.weekInfo;
      if (info && info.weekend && info.weekend.length) {
        return info.weekend.map(function (d) { return d % 7; });
      }
    } catch (e) { /* older engines */ }
    return [6, 0];
  }
  function readI18n(root) {
    var src = root.querySelector(".amc-NCalendar-i18n");
    var out = {};
    var keys = ["prev", "next", "more", "allDay", "close", "noEvents", "noneUpcoming", "now", "day", "week", "month",
      "less", "moreHeat", "other", "eventOne", "eventOther", "nextUp", "startsIn", "zoom", "total", "busiest", "nextEvent"];
    var attrs = ["data-prev", "data-next", "data-more", "data-all-day", "data-close", "data-no-events", "data-none-upcoming",
      "data-now", "data-day", "data-week", "data-month", "data-legend-low", "data-legend-high", "data-other", "data-event-one",
      "data-event-other", "data-next-up", "data-starts-in", "data-zoom", "data-total", "data-busiest", "data-next-event"];
    var dflt = ["Previous", "Next", "more", "All day", "Close", "No events", "No upcoming events", "Happening now", "Day",
      "Week", "Month", "Less", "More", "Other", "event", "events", "Next up", "Starts in", "Zoom", "Total", "Busiest day", "Next"];
    for (var i = 0; i < keys.length; i++) {
      out[keys[i]] = (src && src.getAttribute(attrs[i])) || dflt[i];
    }
    return out;
  }

  /* ---------- Instance ---------- */
  function Cal(root) {
    this.root = root;
    var st = root.getAttribute("data-view");
    this.style = STYLES.indexOf(st) >= 0 ? st : "month";
    var fd = root.getAttribute("data-first-day");
    this.firstDay = fd === "sunday" ? 0 : fd === "saturday" ? 6 : 1;
    this.dayStart = clampInt(root.getAttribute("data-day-start"), 0, 23, 7);
    this.dayEnd = clampInt(root.getAttribute("data-day-end"), 1, 24, 19);
    if (this.dayEnd <= this.dayStart) { this.dayEnd = Math.min(24, this.dayStart + 1); }
    var z = root.getAttribute("data-zoom");
    this.zoom = /^(day|week|month)$/.test(z) ? z : "week";
    this.count = clampInt(root.getAttribute("data-count"), 1, 12, 4);
    this.lang = langOf(root);
    this.cal = calOf(root.getAttribute("data-calendar"));
    this.weekend = weekendOf(this.lang);
    this.i18n = readI18n(root);
    this.fmtCache = {};
    this.partsCache = {};
    this.rtl = window.getComputedStyle(root).direction === "rtl";
    this.events = this.read();
    this.index();
    this.today = dayOf(new Date());
    /* Initial Date Value (a column, so it can come from a page item or the data) wins over
       the static Initial Date: the first event row with a readable date decides. */
    var init = null;
    var rowsWithInit = root.querySelectorAll(".amc-NCalendar-event[data-initial-date]");
    for (var ri = 0; ri < rowsWithInit.length && !init; ri++) {
      init = parseISO(rowsWithInit[ri].getAttribute("data-initial-date"));
    }
    if (!init) { init = parseISO(root.getAttribute("data-initial-date")); }
    this.sel = init ? dayOf(init.d) : this.today;
    this.live = h("span", "amc-NCalendar-sr");
    set(this.live, { "aria-live": "polite", "aria-atomic": "true" });
    this.app = h("div", "amc-NCalendar-app");
    root.appendChild(this.live);
    root.appendChild(this.app);
    root.classList.add("is-ready");
    root.classList.toggle("is-rtl", this.rtl);
    root.style.setProperty("--amc-ncal-dir", this.rtl ? "-1" : "1");
    root.setAttribute("data-amc-init", "Y");
    root.amcNCal = this;
    this.render();
    var self = this;
    if (this.style === "timelineLanes" && window.ResizeObserver) {
      var timer = 0;
      this.ro = new ResizeObserver(function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          if (self.app.clientWidth && Math.abs(self.app.clientWidth - (self.laneWidth || 0)) > 24) { self.render(); }
        }, 120);
      });
      this.ro.observe(root);
    }
  }

  Cal.prototype.read = function () {
    var self = this;
    var out = [];
    var cats = {};
    var hasCat = false;
    each(this.root.querySelectorAll(".amc-NCalendar-source > .amc-NCalendar-event"), function (li) {
      var sp = parseISO(li.getAttribute("data-start"));
      if (!sp) { return; }
      var ep = parseISO(li.getAttribute("data-end"));
      var flag = li.getAttribute("data-all-day") || "";
      var allDay = /^(y|yes|true|1)$/i.test(flag) || (!/^(n|no|false|0)$/i.test(flag) && !sp.time && (!ep || !ep.time));
      var start = allDay ? dayOf(sp.d) : sp.d;
      var end;
      var noEnd = false;
      if (allDay) {
        var endDay = ep ? dayOf(ep.d) : start;
        if (endDay < start) { endDay = start; }
        end = addDays(endDay, 1);
      } else if (ep && ep.d > start) {
        end = ep.d;
      } else {
        end = new Date(start.getTime() + 30 * MIN);
        noEnd = true;
      }
      var titleEl = li.querySelector(".amc-NCalendar-title");
      var link = li.querySelector("a.amc-NCalendar-link");
      var descEl = li.querySelector(".amc-NCalendar-desc");
      var stateEl = li.querySelector(".amc-NCalendar-state");
      var cat = (li.getAttribute("data-category") || "").replace(/\s+/g, " ").trim();
      var state = li.getAttribute("data-state");
      var val = parseFloat(li.getAttribute("data-value"));
      if (cat) { cats[cat] = true; hasCat = true; }
      out.push({
        start: start,
        end: end,
        allDay: allDay,
        noEnd: noEnd,
        title: titleEl ? titleEl.textContent.replace(/\s+/g, " ").trim() : "",
        href: link ? safeHref(link.getAttribute("href")) : "",
        desc: descEl ? descEl.textContent.replace(/\s+/g, " ").trim() : "",
        catName: cat,
        cat: "x",
        state: /^(success|warning|danger|info)$/.test(state) ? state : "neutral",
        stateText: stateEl ? stateEl.textContent.replace(/\s+/g, " ").trim() : "",
        value: isFinite(val) ? val : null
      });
    });
    var names = Object.keys(cats).sort(function (a, b) { return a.localeCompare(b, self.lang); });
    this.catNames = names;
    this.hasCat = hasCat;
    out.forEach(function (ev) {
      if (ev.catName) { ev.cat = String(names.indexOf(ev.catName) % NCAT); }
    });
    out.sort(function (a, b) {
      return (a.start - b.start) || ((b.allDay ? 1 : 0) - (a.allDay ? 1 : 0)) || (a.end - b.end);
    });
    return out;
  };

  Cal.prototype.index = function () {
    var map = {};
    this.events.forEach(function (ev) {
      var d = dayOf(ev.start);
      var l = lastDay(ev);
      for (var i = 0; d <= l && i < 400; i++) {
        var k = keyOf(d);
        (map[k] = map[k] || []).push(ev);
        d = addDays(d, 1);
      }
    });
    Object.keys(map).forEach(function (k) {
      map[k].sort(function (a, b) {
        return ((b.allDay ? 1 : 0) - (a.allDay ? 1 : 0)) || (a.start - b.start);
      });
    });
    this.byDay = map;
  };

  Cal.prototype.on = function (d) { return this.byDay[keyOf(d)] || []; };

  /* ----- Intl ----- */
  Cal.prototype.fo = function (opts, gregory) {
    var key = (gregory ? "g" : "c") + JSON.stringify(opts);
    var f = this.fmtCache[key];
    if (!f) {
      var o = {};
      for (var k in opts) {
        if (Object.prototype.hasOwnProperty.call(opts, k)) { o[k] = opts[k]; }
      }
      o.calendar = gregory ? "gregory" : this.cal;
      try {
        f = new Intl.DateTimeFormat(this.lang, o);
      } catch (e) {
        delete o.calendar;
        f = new Intl.DateTimeFormat(this.lang, o);
      }
      this.fmtCache[key] = f;
    }
    return f;
  };
  Cal.prototype.f = function (d, opts, gregory) { return this.fo(opts, gregory).format(d); };
  Cal.prototype.range = function (a, b, opts) {
    var f = this.fo(opts);
    if (f.formatRange) {
      try { return f.formatRange(a, b); } catch (e) { /* fall through */ }
    }
    return f.format(a) + " \u2013 " + f.format(b);
  };
  Cal.prototype.num = function (n, opts) {
    try { return new Intl.NumberFormat(this.lang, opts || {}).format(n); } catch (e) { return String(n); }
  };
  Cal.prototype.unit = function (n, u, disp) {
    try {
      return new Intl.NumberFormat(this.lang, { style: "unit", unit: u, unitDisplay: disp || "long" }).format(n);
    } catch (e) {
      return n + " " + u;
    }
  };
  Cal.prototype.unitName = function (n, u, disp) {
    try {
      var parts = new Intl.NumberFormat(this.lang, { style: "unit", unit: u, unitDisplay: disp || "long" }).formatToParts(n);
      var out = parts.filter(function (p) { return p.type === "unit"; }).map(function (p) { return p.value; }).join(" ");
      return out || u;
    } catch (e) {
      return u;
    }
  };
  Cal.prototype.rel = function (d) {
    var n = dayDiff(this.today, d);
    if (Math.abs(n) > 6) { return ""; }
    try {
      var t = new Intl.RelativeTimeFormat(this.lang, { numeric: "auto" }).format(n, "day");
      return t.charAt(0).toLocaleUpperCase(this.lang) + t.slice(1);
    } catch (e) {
      return "";
    }
  };
  Cal.prototype.todayText = function () {
    var t = "";
    try { t = new Intl.RelativeTimeFormat(this.lang, { numeric: "auto" }).format(0, "day"); } catch (e) { t = ""; }
    return t ? t.charAt(0).toLocaleUpperCase(this.lang) + t.slice(1) : this.f(this.today, { day: "numeric", month: "short" });
  };
  Cal.prototype.countText = function (n) {
    var one = false;
    try { one = new Intl.PluralRules(this.lang).select(n) === "one"; } catch (e) { one = n === 1; }
    return this.num(n) + " " + (one ? this.i18n.eventOne : this.i18n.eventOther);
  };
  Cal.prototype.fullDate = function (d) {
    return this.f(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  /* ----- calendar arithmetic through Intl, so Hijri months have their true length ----- */
  Cal.prototype.parts = function (d) {
    if (this.cal === "gregory") { return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; }
    var k = keyOf(d);
    var p = this.partsCache[k];
    if (p) { return p; }
    if (!this.pf) {
      this.pf = new Intl.DateTimeFormat("en-US-u-nu-latn", { calendar: this.cal, year: "numeric", month: "numeric", day: "numeric" });
    }
    p = { y: 0, m: 0, d: 0 };
    this.pf.formatToParts(d).forEach(function (x) {
      if (x.type === "year" || x.type === "relatedYear") { p.y = parseInt(x.value, 10); }
      if (x.type === "month") { p.m = parseInt(x.value, 10); }
      if (x.type === "day") { p.d = parseInt(x.value, 10); }
    });
    this.partsCache[k] = p;
    return p;
  };
  Cal.prototype.monthStart = function (d) { return addDays(dayOf(d), 1 - this.parts(d).d); };
  Cal.prototype.monthLen = function (ms) {
    var m = this.parts(ms).m;
    for (var n = 28; n < 32; n++) {
      if (this.parts(addDays(ms, n)).m !== m) { return n; }
    }
    return 31;
  };
  Cal.prototype.shiftMonth = function (d, n) {
    var ms = this.monthStart(d);
    var idx = dayDiff(ms, d);
    while (n > 0) { ms = addDays(ms, this.monthLen(ms)); n--; }
    while (n < 0) { ms = this.monthStart(addDays(ms, -1)); n++; }
    return addDays(ms, Math.min(idx, this.monthLen(ms) - 1));
  };
  Cal.prototype.yearStart = function (d) {
    var ms = this.monthStart(d);
    for (var g = 0; this.parts(ms).m > 1 && g < 14; g++) { ms = this.monthStart(addDays(ms, -1)); }
    return ms;
  };
  Cal.prototype.yearMonths = function (ys) {
    var out = [];
    var ms = ys;
    var y = this.parts(ys).y;
    while (this.parts(ms).y === y && out.length < 13) {
      out.push({ start: ms, len: this.monthLen(ms) });
      ms = addDays(ms, out[out.length - 1].len);
    }
    return out;
  };
  Cal.prototype.weekStart = function (d) { return addDays(dayOf(d), -((d.getDay() - this.firstDay + 7) % 7)); };

  /* ----- event text ----- */
  var TIME = { hour: "numeric", minute: "2-digit" };
  Cal.prototype.timeRange = function (ev) {
    if (ev.allDay) {
      var l = lastDay(ev);
      return sameDay(l, ev.start) ? this.i18n.allDay : this.range(ev.start, l, { day: "numeric", month: "short" });
    }
    if (ev.noEnd) { return this.f(ev.start, TIME); }
    if (sameDay(ev.start, new Date(ev.end.getTime() - 1))) { return this.range(ev.start, ev.end, TIME); }
    return this.range(ev.start, ev.end, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  };
  Cal.prototype.dayTime = function (ev, day) {
    if (ev.allDay) { return this.i18n.allDay; }
    var startsHere = sameDay(ev.start, day);
    var endsHere = sameDay(new Date(ev.end.getTime() - 1), day);
    if (startsHere && (endsHere || ev.noEnd)) { return ev.noEnd ? this.f(ev.start, TIME) : this.range(ev.start, ev.end, TIME); }
    if (startsHere) { return this.f(ev.start, TIME) + " \u2192"; }
    if (endsHere) { return "\u2192 " + this.f(ev.end, TIME); }
    return this.i18n.allDay;
  };
  Cal.prototype.duration = function (ev) {
    if (ev.allDay) {
      var n = dayDiff(ev.start, ev.end);
      return n > 1 ? this.unit(n, "day", "long") : "";
    }
    if (ev.noEnd) { return ""; }
    var mins = Math.round((ev.end - ev.start) / MIN);
    if (mins >= 1440) { return this.unit(Math.round(mins / 1440), "day", "long"); }
    var out = [];
    if (mins >= 60) { out.push(this.unit(Math.floor(mins / 60), "hour", "narrow")); }
    if (mins % 60) { out.push(this.unit(mins % 60, "minute", "narrow")); }
    return out.join(" ");
  };
  Cal.prototype.evLabel = function (ev) {
    var dateText = ev.allDay ? this.f(ev.start, { weekday: "short", day: "numeric", month: "short" }) + ", " + this.timeRange(ev)
      : this.f(ev.start, { weekday: "short", day: "numeric", month: "short" }) + ", " + this.timeRange(ev);
    return [ev.title, dateText, ev.catName, ev.stateText].filter(Boolean).join(", ");
  };
  function catClass(ev) { return " amc-NCalendar-c" + ev.cat + " is-" + ev.state; }

  Cal.prototype.chip = function (ev, cls, day, focusable) {
    var el = h(ev.href ? "a" : "span", cls + catClass(ev));
    if (ev.href) {
      el.setAttribute("href", ev.href);
      if (!focusable) { el.setAttribute("tabindex", "-1"); }
    } else if (focusable) {
      el.setAttribute("tabindex", "0");
    }
    if (focusable) { el.setAttribute("aria-label", this.evLabel(ev)); }
    if (!ev.allDay && day && sameDay(ev.start, day)) {
      el.appendChild(h("span", "amc-NCalendar-chipTime", this.f(ev.start, TIME)));
    }
    el.appendChild(h("span", "amc-NCalendar-chipText", ev.title));
    if (ev.allDay) { el.classList.add("is-allDay"); }
    if (ev.allDay && lastDay(ev) > dayOf(ev.start)) {
      if (day && !sameDay(day, ev.start)) {
        el.classList.add("is-cont");
        if (day.getDay() !== this.firstDay) { el.classList.add("is-mid"); }
      }
      if (day && !sameDay(day, lastDay(ev))) { el.classList.add("is-open"); }
    }
    return el;
  };

  Cal.prototype.row = function (ev, day, i) {
    var li = h("li", "amc-NCalendar-row" + catClass(ev));
    if (i !== undefined) { cssVar(li, "--amc-ncal-i", i); }
    li.appendChild(set(h("span", "amc-NCalendar-rowDot"), { "aria-hidden": "true" }));
    var time = h("span", "amc-NCalendar-rowTime", day ? this.dayTime(ev, day) : this.timeRange(ev));
    li.appendChild(time);
    var body = h("span", "amc-NCalendar-rowBody");
    var t = h(ev.href ? "a" : "span", "amc-NCalendar-rowTitle", ev.title);
    if (ev.href) { t.setAttribute("href", ev.href); }
    body.appendChild(t);
    if (ev.desc) { body.appendChild(h("span", "amc-NCalendar-rowDesc", ev.desc)); }
    var meta = h("span", "amc-NCalendar-rowMeta");
    var dur = this.duration(ev);
    if (dur) { meta.appendChild(h("span", "amc-NCalendar-dur", dur)); }
    if (ev.catName) { meta.appendChild(h("span", "amc-NCalendar-tag", ev.catName)); }
    if (ev.stateText) { meta.appendChild(h("span", "amc-NCalendar-state", ev.stateText)); }
    body.appendChild(meta);
    li.appendChild(body);
    return li;
  };

  Cal.prototype.list = function (evs, day, cls) {
    if (!evs.length) { return h("p", "amc-NCalendar-empty", this.i18n.noEvents); }
    var ol = h("ol", "amc-NCalendar-rows " + (cls || ""));
    var self = this;
    evs.forEach(function (ev, i) { ol.appendChild(self.row(ev, day, i)); });
    return ol;
  };

  Cal.prototype.dots = function (evs, max) {
    var wrap = set(h("span", "amc-NCalendar-dots"), { "aria-hidden": "true" });
    var seen = {};
    var n = 0;
    for (var i = 0; i < evs.length && n < max; i++) {
      if (seen[evs[i].cat]) { continue; }
      seen[evs[i].cat] = true;
      wrap.appendChild(h("span", "amc-NCalendar-dot" + catClass(evs[i])));
      n++;
    }
    return wrap;
  };

  /* ----- toolbar ----- */
  Cal.prototype.toolbar = function (label, opts) {
    opts = opts || {};
    var bar = h("div", "amc-NCalendar-toolbar");
    var title = h("h3", "amc-NCalendar-period", label);
    title.id = uid();
    this.titleId = title.id;
    bar.appendChild(title);
    if (opts.extra) { bar.appendChild(opts.extra); }
    var nav = set(h("div", "amc-NCalendar-nav"), { role: "group", "aria-label": label });
    var prev = button("amc-NCalendar-btn--icon amc-NCalendar-btn--prev", "prev", this.i18n.prev + (opts.prevLabel ? ": " + opts.prevLabel : ""));
    prev.appendChild(set(h("span", "amc-NCalendar-chev"), { "aria-hidden": "true" }));
    var today = button("amc-NCalendar-btn--today", "today");
    today.textContent = this.todayText();
    var next = button("amc-NCalendar-btn--icon amc-NCalendar-btn--next", "next", this.i18n.next + (opts.nextLabel ? ": " + opts.nextLabel : ""));
    next.appendChild(set(h("span", "amc-NCalendar-chev"), { "aria-hidden": "true" }));
    nav.appendChild(prev);
    nav.appendChild(today);
    nav.appendChild(next);
    bar.appendChild(nav);
    this.app.appendChild(bar);
    return bar;
  };

  Cal.prototype.announce = function (text) {
    var live = this.live;
    live.textContent = "";
    window.setTimeout(function () { live.textContent = text; }, 30);
  };

  /* ----- day cells shared by month, miniDots ----- */
  Cal.prototype.dayCell = function (d, inMonth, mini) {
    var evs = this.on(d);
    var cell = h("div", "amc-NCalendar-day");
    var isSel = sameDay(d, this.sel);
    set(cell, {
      role: "gridcell",
      "data-day": keyOf(d),
      "data-amc-nav": "day",
      tabindex: isSel ? "0" : "-1",
      "aria-selected": isSel ? "true" : "false"
    });
    var label = this.fullDate(d) + ", " + (evs.length ? this.countText(evs.length) : this.i18n.noEvents);
    if (sameDay(d, this.today)) { label = this.todayText() + ", " + label; cell.classList.add("is-today"); cell.setAttribute("aria-current", "date"); }
    cell.setAttribute("aria-label", label);
    if (!inMonth) { cell.classList.add("is-outside"); }
    if (isSel) { cell.classList.add("is-selected"); }
    if (evs.length) { cell.classList.add("has-events"); }
    if (this.weekend.indexOf(d.getDay()) >= 0) { cell.classList.add("is-weekend"); }
    var head = set(h("span", "amc-NCalendar-dayHead"), { "aria-hidden": "true" });
    head.appendChild(h("span", "amc-NCalendar-num", this.f(d, { day: "numeric" })));
    if (this.cal !== "gregory" && !mini) {
      head.appendChild(h("span", "amc-NCalendar-alt", this.f(d, { day: "numeric", month: "short" }, true)));
    }
    cell.appendChild(head);
    if (!mini) {
      var chips = set(h("span", "amc-NCalendar-chips"), { "aria-hidden": "true" });
      for (var i = 0; i < evs.length && i < MAXCHIPS; i++) {
        chips.appendChild(this.chip(evs[i], "amc-NCalendar-chip", d, false));
      }
      if (evs.length > MAXCHIPS) {
        var more = button("amc-NCalendar-more", "more");
        more.setAttribute("tabindex", "-1");
        more.textContent = "+" + this.num(evs.length - MAXCHIPS) + " " + this.i18n.more;
        chips.appendChild(more);
      }
      cell.appendChild(chips);
    }
    cell.appendChild(this.dots(evs, mini ? 3 : 4));
    return cell;
  };

  Cal.prototype.monthGrid = function (mini) {
    var ms = this.monthStart(this.sel);
    var len = this.monthLen(ms);
    var me = addDays(ms, len - 1);
    var gs = this.weekStart(ms);
    var weeks = Math.ceil((dayDiff(gs, me) + 1) / 7);
    var grid = set(h("div", "amc-NCalendar-grid"), { role: "grid", "aria-labelledby": this.titleId });
    cssVar(grid, "--amc-ncal-weeks", weeks);
    var head = set(h("div", "amc-NCalendar-weekdays"), { role: "row" });
    for (var i = 0; i < 7; i++) {
      var wd = addDays(gs, i);
      var th = set(h("span", "amc-NCalendar-wd"), {
        role: "columnheader",
        "aria-label": this.f(wd, { weekday: "long" })
      });
      if (!mini) { th.appendChild(set(h("span", "amc-NCalendar-wdShort", this.f(wd, { weekday: "short" })), { "aria-hidden": "true" })); }
      th.appendChild(set(h("span", "amc-NCalendar-wdNarrow", this.f(wd, { weekday: "narrow" })), { "aria-hidden": "true" }));
      if (this.weekend.indexOf(wd.getDay()) >= 0) { th.classList.add("is-weekend"); }
      head.appendChild(th);
    }
    grid.appendChild(head);
    var body = set(h("div", "amc-NCalendar-weeks"), { role: "rowgroup" });
    for (var w = 0; w < weeks; w++) {
      var row = set(h("div", "amc-NCalendar-week"), { role: "row" });
      for (var j = 0; j < 7; j++) {
        var d = addDays(gs, w * 7 + j);
        row.appendChild(this.dayCell(d, d >= ms && d <= me, mini));
      }
      body.appendChild(row);
    }
    grid.appendChild(body);
    this.gridStart = gs;
    return { grid: grid, body: body, ms: ms, label: this.f(ms, { month: "long", year: "numeric" }) };
  };

  Cal.prototype.periodOpts = function (label, stepFn, fmt) {
    return { prevLabel: this.f(stepFn(-1), fmt), nextLabel: this.f(stepFn(1), fmt), label: label };
  };

  /* ========== VIEWS ========== */
  var VIEW = {};

  /* month: grid with chips, "+N more", today ring; narrow = dot calendar + agenda of the day */
  VIEW.month = function (c) {
    var self = c;
    var mfmt = { month: "long", year: "numeric" };
    var ms = c.monthStart(c.sel);
    c.toolbar(c.f(ms, mfmt), c.periodOpts("", function (n) { return self.shiftMonth(ms, n); }, mfmt));
    var g = c.monthGrid(false);
    c.app.appendChild(g.grid);
    c.panel = set(h("div", "amc-NCalendar-dayPanel"), { "aria-live": "polite" });
    c.app.appendChild(c.panel);
    c.fillPanel();
    return g.label;
  };

  Cal.prototype.fillPanel = function () {
    if (!this.panel) { return; }
    clear(this.panel);
    var head = h("p", "amc-NCalendar-panelHead");
    var rel = this.rel(this.sel);
    if (rel) { head.appendChild(h("span", "amc-NCalendar-rel", rel)); }
    head.appendChild(h("span", "amc-NCalendar-panelDate", this.f(this.sel, { weekday: "long", day: "numeric", month: "long" })));
    this.panel.appendChild(head);
    this.panel.appendChild(this.list(this.on(this.sel), this.sel));
  };

  /* miniDots: compact month, category dots, sliding selection, reveal of the day */
  VIEW.miniDots = function (c) {
    var self = c;
    var mfmt = { month: "long", year: "numeric" };
    var ms = c.monthStart(c.sel);
    c.toolbar(c.f(ms, mfmt), c.periodOpts("", function (n) { return self.shiftMonth(ms, n); }, mfmt));
    var g = c.monthGrid(true);
    c.ind = set(h("span", "amc-NCalendar-ind"), { "aria-hidden": "true" });
    g.body.insertBefore(c.ind, g.body.firstChild);
    c.app.appendChild(g.grid);
    c.panel = set(h("div", "amc-NCalendar-reveal"), { "aria-live": "polite" });
    c.panelInner = h("div", "amc-NCalendar-revealInner");
    c.panel.appendChild(c.panelInner);
    c.app.appendChild(c.panel);
    c.placeIndicator();
    c.fillReveal(false);
    return g.label;
  };

  Cal.prototype.placeIndicator = function () {
    if (!this.ind) { return; }
    var i = dayDiff(this.gridStart, this.sel);
    cssVar(this.ind, "--amc-ncal-col", i % 7);
    cssVar(this.ind, "--amc-ncal-row", Math.floor(i / 7));
  };

  Cal.prototype.fillReveal = function (animate) {
    var inner = this.panelInner;
    clear(inner);
    var evs = this.on(this.sel);
    var head = h("p", "amc-NCalendar-panelHead");
    var rel = this.rel(this.sel);
    if (rel) { head.appendChild(h("span", "amc-NCalendar-rel", rel)); }
    head.appendChild(h("span", "amc-NCalendar-panelDate", this.f(this.sel, { weekday: "long", day: "numeric", month: "long" })));
    head.appendChild(h("span", "amc-NCalendar-count", evs.length ? this.countText(evs.length) : ""));
    inner.appendChild(head);
    inner.appendChild(this.list(evs, this.sel));
    if (animate && !reduced()) {
      this.panel.classList.remove("is-swap");
      void this.panel.offsetWidth;
      this.panel.classList.add("is-swap");
    }
  };

  /* agenda: sticky day headers, relative labels, durations */
  VIEW.agenda = function (c) {
    var wrap = h("div", "amc-NCalendar-agenda");
    var groups = {};
    var order = [];
    c.events.forEach(function (ev) {
      var k = keyOf(ev.start);
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(ev);
    });
    if (!order.length) {
      wrap.appendChild(h("p", "amc-NCalendar-empty", c.i18n.noEvents));
    }
    var firstUpcoming = null;
    order.forEach(function (k) {
      var d = parseISO(k).d;
      var sec = h("section", "amc-NCalendar-aDay");
      var diff = dayDiff(c.today, d);
      if (diff < 0) { sec.classList.add("is-past"); }
      if (diff === 0) { sec.classList.add("is-today"); }
      if (diff >= 0 && !firstUpcoming) { firstUpcoming = sec; }
      var id = uid();
      sec.setAttribute("aria-labelledby", id);
      var head = h("h3", "amc-NCalendar-aHead");
      head.id = id;
      head.appendChild(set(h("span", "amc-NCalendar-aNum", c.f(d, { day: "numeric" })), { "aria-hidden": "true" }));
      var txt = h("span", "amc-NCalendar-aText");
      txt.appendChild(h("span", "amc-NCalendar-aWeekday", c.f(d, { weekday: "long" })));
      txt.appendChild(h("span", "amc-NCalendar-aDate", c.f(d, { day: "numeric", month: "long", year: "numeric" })));
      head.appendChild(txt);
      var rel = c.rel(d);
      if (rel) { head.appendChild(h("span", "amc-NCalendar-rel", rel)); }
      sec.appendChild(head);
      sec.appendChild(c.list(groups[k], null, "amc-NCalendar-aList"));
      wrap.appendChild(sec);
    });
    if (firstUpcoming) { firstUpcoming.classList.add("is-next"); }
    c.app.appendChild(wrap);
    return "";
  };

  /* week: hour grid, events by time, overlaps side by side, now line */
  function layoutCols(segs) {
    segs.sort(function (a, b) { return (a.s - b.s) || (b.e - a.e); });
    var cols = [];
    var cluster = [];
    var clusterEnd = -1;
    function done() {
      var n = 0;
      cluster.forEach(function (x) { n = Math.max(n, x.col + 1); });
      cluster.forEach(function (x) { x.n = n; });
    }
    segs.forEach(function (seg) {
      if (cluster.length && seg.s >= clusterEnd) { done(); cluster = []; cols = []; clusterEnd = -1; }
      var i = 0;
      while (i < cols.length && cols[i] > seg.s) { i++; }
      cols[i] = seg.e;
      seg.col = i;
      cluster.push(seg);
      clusterEnd = Math.max(clusterEnd, seg.e);
    });
    if (cluster.length) { done(); }
    return segs;
  }

  VIEW.week = function (c) {
    var ws = c.weekStart(c.sel);
    var we = addDays(ws, 6);
    var label = c.range(ws, we, { day: "numeric", month: "short", year: "numeric" });
    var sfmt = { day: "numeric", month: "short" };
    c.toolbar(label, { prevLabel: c.f(addDays(ws, -7), sfmt), nextLabel: c.f(addDays(ws, 7), sfmt) });
    var h0 = c.dayStart;
    var h1 = c.dayEnd;
    var days = [];
    var i;
    for (i = 0; i < 7; i++) {
      var d = addDays(ws, i);
      var next = addDays(d, 1);
      var segs = [];
      var allDay = [];
      c.on(d).forEach(function (ev) {
        if (ev.allDay) { allDay.push(ev); return; }
        var s0 = ev.start < d ? d : ev.start;
        var e0 = ev.end > next ? next : ev.end;
        var sm = (s0 - d) / MIN;
        var em = (e0 - d) / MIN;
        if (em <= sm) { em = sm + 15; }
        if (ev.start >= d && ev.end > next && em - sm < 15) { return; }
        h0 = Math.min(h0, Math.floor(sm / 60));
        h1 = Math.max(h1, Math.ceil(em / 60));
        segs.push({ ev: ev, s: sm, e: em });
      });
      days.push({ d: d, segs: layoutCols(segs), allDay: allDay });
    }
    h0 = Math.max(0, h0);
    h1 = Math.min(24, Math.max(h1, h0 + 1));
    var hours = h1 - h0;
    var wrap = h("div", "amc-NCalendar-weekWrap");
    var grid = set(h("div", "amc-NCalendar-wk"), { role: "grid", "aria-labelledby": c.titleId });
    cssVar(grid, "--amc-ncal-hours", hours);
    var headRow = set(h("div", "amc-NCalendar-wkRow amc-NCalendar-wkHead"), { role: "row" });
    headRow.appendChild(set(h("span", "amc-NCalendar-wkCorner"), { role: "columnheader", "aria-hidden": "true" }));
    var adRow = set(h("div", "amc-NCalendar-wkRow amc-NCalendar-wkAllDay"), { role: "row" });
    adRow.appendChild(set(h("span", "amc-NCalendar-wkGutterLabel", c.i18n.allDay), { role: "rowheader" }));
    var bodyRow = set(h("div", "amc-NCalendar-wkRow amc-NCalendar-wkBody"), { role: "row" });
    var gutter = set(h("div", "amc-NCalendar-wkGutter"), { role: "rowheader", "aria-hidden": "true" });
    for (i = h0; i < h1; i++) {
      var lab = h("span", "amc-NCalendar-hour", c.f(new Date(2026, 0, 1, i), { hour: "numeric" }));
      cssVar(lab, "--amc-ncal-top", ((i - h0) / hours) * 100);
      gutter.appendChild(lab);
    }
    bodyRow.appendChild(gutter);
    var hasAllDay = false;
    var now = new Date();
    c.nowEls = [];
    days.forEach(function (day) {
      var d = day.d;
      var isSel = sameDay(d, c.sel);
      var evCount = c.on(d).length;
      var th = set(h("div", "amc-NCalendar-wkDay"), {
        role: "columnheader",
        "data-day": keyOf(d),
        "data-amc-nav": "day",
        tabindex: isSel ? "0" : "-1",
        "aria-selected": isSel ? "true" : "false",
        "aria-label": c.fullDate(d) + ", " + (evCount ? c.countText(evCount) : c.i18n.noEvents)
      });
      if (isSel) { th.classList.add("is-selected"); }
      if (c.weekend.indexOf(d.getDay()) >= 0) { th.classList.add("is-weekend"); }
      th.appendChild(set(h("span", "amc-NCalendar-wkWd", c.f(d, { weekday: "short" })), { "aria-hidden": "true" }));
      th.appendChild(set(h("span", "amc-NCalendar-num", c.f(d, { day: "numeric" })), { "aria-hidden": "true" }));
      var isToday = sameDay(d, c.today);
      if (isToday) { th.classList.add("is-today"); th.setAttribute("aria-current", "date"); }
      headRow.appendChild(th);
      var ad = set(h("div", "amc-NCalendar-wkAd"), { role: "gridcell" });
      day.allDay.forEach(function (ev) {
        hasAllDay = true;
        ad.appendChild(c.chip(ev, "amc-NCalendar-chip", d, true));
      });
      adRow.appendChild(ad);
      var col = set(h("div", "amc-NCalendar-wkCol"), { role: "gridcell", "aria-label": c.fullDate(d) });
      if (isToday) { col.classList.add("is-today"); }
      if (c.weekend.indexOf(d.getDay()) >= 0) { col.classList.add("is-weekend"); }
      day.segs.forEach(function (seg) {
        var ev = seg.ev;
        var el = h(ev.href ? "a" : "div", "amc-NCalendar-wEv" + catClass(ev));
        if (ev.href) { el.setAttribute("href", ev.href); } else { el.setAttribute("tabindex", "0"); }
        el.setAttribute("aria-label", c.evLabel(ev));
        var top = ((seg.s - h0 * 60) / (hours * 60)) * 100;
        var len = ((seg.e - seg.s) / (hours * 60)) * 100;
        cssVar(el, "--amc-ncal-top", top);
        cssVar(el, "--amc-ncal-len", len);
        cssVar(el, "--amc-ncal-col", seg.col);
        cssVar(el, "--amc-ncal-cols", seg.n);
        if (seg.e - seg.s < 50) { el.classList.add("is-short"); }
        if (seg.n > 1) { el.classList.add("is-split"); }
        el.setAttribute("data-start-min", String(Math.round(seg.s)));
        el.appendChild(set(h("span", "amc-NCalendar-wTime", c.dayTime(ev, d)), { "aria-hidden": "true" }));
        el.appendChild(set(h("span", "amc-NCalendar-wTitle", ev.title), { "aria-hidden": "true" }));
        col.appendChild(el);
      });
      if (isToday) {
        var line = set(h("span", "amc-NCalendar-now"), { "aria-hidden": "true" });
        col.appendChild(line);
        c.nowEls.push({ el: line, day: d, h0: h0, hours: hours });
      }
      bodyRow.appendChild(col);
    });
    grid.appendChild(headRow);
    if (hasAllDay) { grid.appendChild(adRow); }
    grid.appendChild(bodyRow);
    wrap.appendChild(grid);
    c.app.appendChild(wrap);
    c.updateNow(now);
    c.scrollToSel(wrap);
    return label;
  };

  Cal.prototype.updateNow = function (now) {
    (this.nowEls || []).forEach(function (n) {
      var m = (now - n.day) / MIN;
      var top = ((m - n.h0 * 60) / (n.hours * 60)) * 100;
      n.el.hidden = !sameDay(now, n.day) || top < 0 || top > 100;
      cssVar(n.el, "--amc-ncal-top", Math.max(0, Math.min(100, top)));
    });
  };

  Cal.prototype.scrollToSel = function (wrap) {
    var target = wrap.querySelector("[aria-selected=\"true\"], .is-selected");
    if (!target || wrap.scrollWidth <= wrap.clientWidth + 1) { return; }
    var wr = wrap.getBoundingClientRect();
    var tr = target.getBoundingClientRect();
    var pad = wr.width * 0.25;
    if (tr.left >= wr.left + pad * 0.5 && tr.right <= wr.right - pad * 0.5) { return; }
    wrap.scrollLeft += this.rtl ? (tr.right - wr.right + pad) : (tr.left - wr.left - pad);
  };

  /* heatmap: a year of days, intensity by count or Value */
  VIEW.heatmap = function (c) {
    var ys = c.yearStart(c.sel);
    var months = c.yearMonths(ys);
    var lastM = months[months.length - 1];
    var ye = addDays(lastM.start, lastM.len - 1);
    var yfmt = { year: "numeric" };
    var self = c;
    var label = c.f(ys, yfmt);
    c.toolbar(label, c.periodOpts("", function (n) { return self.shiftMonth(ys, 12 * n); }, yfmt));
    var useValue = c.events.some(function (ev) { return ev.value !== null; });
    var gs = c.weekStart(ys);
    var weeks = Math.ceil((dayDiff(gs, ye) + 1) / 7);
    var vals = {};
    var max = 0;
    var total = 0;
    var busiest = null;
    var d;
    for (d = ys; d <= ye; d = addDays(d, 1)) {
      var evs = c.on(d);
      var v = 0;
      if (useValue) {
        evs.forEach(function (ev) { if (ev.value !== null && sameDay(ev.start, d)) { v += ev.value; } });
      } else {
        v = evs.length;
      }
      vals[keyOf(d)] = v;
      if (v > max) { max = v; busiest = d; }
    }
    if (useValue) {
      c.events.forEach(function (ev) { if (ev.value !== null && ev.start >= ys && ev.start <= addDays(ye, 1)) { total += ev.value; } });
    } else {
      c.events.forEach(function (ev) { if (lastDay(ev) >= ys && dayOf(ev.start) <= ye) { total += 1; } });
    }
    var fmtVal = function (x) { return useValue ? c.num(x, { maximumFractionDigits: 2 }) : c.countText(x); };
    var sum = h("div", "amc-NCalendar-heatSum");
    var big = h("p", "amc-NCalendar-heatTotal");
    big.appendChild(h("span", "amc-NCalendar-heatFigure", c.num(total, { maximumFractionDigits: 0 })));
    big.appendChild(h("span", "amc-NCalendar-heatUnit", useValue ? c.i18n.total : (total === 1 ? c.i18n.eventOne : c.i18n.eventOther)));
    sum.appendChild(big);
    if (busiest) {
      var b = h("p", "amc-NCalendar-heatBusy");
      b.appendChild(h("span", "amc-NCalendar-heatBusyLabel", c.i18n.busiest));
      b.appendChild(h("span", "amc-NCalendar-heatBusyValue", c.f(busiest, { weekday: "short", day: "numeric", month: "short" })));
      b.appendChild(h("span", "amc-NCalendar-heatBusyCount", fmtVal(max)));
      sum.appendChild(b);
    }
    c.app.appendChild(sum);
    var wrap = h("div", "amc-NCalendar-heatWrap");
    var heat = h("div", "amc-NCalendar-heat");
    cssVar(heat, "--amc-ncal-weeks", weeks);
    var mrow = set(h("div", "amc-NCalendar-heatMonths"), { "aria-hidden": "true" });
    months.forEach(function (m) {
      var at = Math.floor(dayDiff(gs, m.start) / 7);
      var lab = h("span", "amc-NCalendar-heatMonth", c.f(m.start, { month: "short" }));
      cssVar(lab, "--amc-ncal-at", at);
      mrow.appendChild(lab);
    });
    heat.appendChild(mrow);
    var wds = set(h("div", "amc-NCalendar-heatWds"), { "aria-hidden": "true" });
    for (var r = 0; r < 7; r++) {
      wds.appendChild(h("span", "amc-NCalendar-heatWd", r % 2 === 0 ? c.f(addDays(gs, r), { weekday: "short" }) : ""));
    }
    heat.appendChild(wds);
    var cells = set(h("div", "amc-NCalendar-heatCells"), { role: "group", "aria-labelledby": c.titleId });
    var selInYear = c.sel >= ys && c.sel <= ye ? c.sel : ys;
    for (var i = 0; i < weeks * 7; i++) {
      d = addDays(gs, i);
      if (d < ys || d > ye) {
        cells.appendChild(set(h("span", "amc-NCalendar-hcell is-void"), { "aria-hidden": "true" }));
        continue;
      }
      var val = vals[keyOf(d)];
      var lvl = val > 0 && max > 0 ? Math.max(1, Math.min(4, Math.ceil((val / max) * 4))) : 0;
      var cell = h("button", "amc-NCalendar-hcell is-l" + lvl);
      cell.type = "button";
      var isSel = sameDay(d, selInYear);
      var tip = c.f(d, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) + ", " + (val ? fmtVal(val) : c.i18n.noEvents);
      set(cell, {
        "data-day": keyOf(d),
        "data-amc-nav": "day",
        "data-tip": tip,
        tabindex: isSel ? "0" : "-1",
        "aria-pressed": isSel ? "true" : "false",
        "aria-label": c.fullDate(d) + ", " + (val ? fmtVal(val) : c.i18n.noEvents)
      });
      if (isSel) { cell.classList.add("is-selected"); }
      if (sameDay(d, c.today)) { cell.classList.add("is-today"); cell.setAttribute("aria-current", "date"); }
      cells.appendChild(cell);
    }
    heat.appendChild(cells);
    wrap.appendChild(heat);
    c.app.appendChild(wrap);
    var legend = set(h("div", "amc-NCalendar-legend"), { "aria-hidden": "true" });
    legend.appendChild(h("span", "amc-NCalendar-legendText", c.i18n.less));
    for (var l = 0; l <= 4; l++) { legend.appendChild(h("span", "amc-NCalendar-hcell amc-NCalendar-swatch is-l" + l)); }
    legend.appendChild(h("span", "amc-NCalendar-legendText", c.i18n.moreHeat));
    c.app.appendChild(legend);
    c.tip = set(h("div", "amc-NCalendar-tip"), { "aria-hidden": "true" });
    c.tip.hidden = true;
    c.app.appendChild(c.tip);
    c.scrollToSel(wrap);
    return label;
  };

  Cal.prototype.showTip = function (cell) {
    if (!this.tip || !cell || !cell.getAttribute("data-tip")) { return; }
    this.tip.textContent = cell.getAttribute("data-tip");
    this.tip.hidden = false;
    var ar = this.app.getBoundingClientRect();
    var r = cell.getBoundingClientRect();
    var tw = this.tip.offsetWidth;
    var center = this.rtl ? ar.right - (r.left + r.width / 2) : r.left + r.width / 2 - ar.left;
    var x = Math.max(0, Math.min(ar.width - tw, center - tw / 2));
    cssVar(this.tip, "--amc-ncal-px", x, "px");
    cssVar(this.tip, "--amc-ncal-py", r.top - ar.top - this.tip.offsetHeight - 6, "px");
  };
  Cal.prototype.hideTip = function () { if (this.tip) { this.tip.hidden = true; } };

  /* timelineLanes: resource lanes per category on a zoomable time scale */
  VIEW.timelineLanes = function (c) {
    var z = c.zoom;
    var r0;
    var r1;
    var ticks = [];
    var label;
    var i;
    var sfmt;
    if (z === "day") {
      r0 = dayOf(c.sel);
      r1 = addDays(r0, 1);
      for (i = 0; i < 24; i++) { ticks.push({ at: new Date(r0.getFullYear(), r0.getMonth(), r0.getDate(), i), text: c.f(new Date(2026, 0, 1, i), { hour: "numeric" }), major: i % 3 === 0 }); }
      label = c.fullDate(r0);
      sfmt = { weekday: "short", day: "numeric", month: "short" };
    } else if (z === "week") {
      r0 = c.weekStart(c.sel);
      r1 = addDays(r0, 7);
      for (i = 0; i < 7; i++) { var wd = addDays(r0, i); ticks.push({ at: wd, text: c.f(wd, { day: "numeric" }), pre: c.f(wd, { weekday: "short" }), major: true, day: wd }); }
      label = c.range(r0, addDays(r0, 6), { day: "numeric", month: "short", year: "numeric" });
      sfmt = { day: "numeric", month: "short" };
    } else {
      r0 = c.monthStart(c.sel);
      var len = c.monthLen(r0);
      r1 = addDays(r0, len);
      for (i = 0; i < len; i++) { var md = addDays(r0, i); ticks.push({ at: md, text: c.f(md, { day: "numeric" }), major: md.getDay() === c.firstDay || i === 0, day: md }); }
      label = c.f(r0, { month: "long", year: "numeric" });
      sfmt = { month: "long", year: "numeric" };
    }
    var span = r1 - r0;
    var stepFn = function (n) { return z === "day" ? addDays(c.sel, n) : z === "week" ? addDays(c.sel, 7 * n) : c.shiftMonth(c.sel, n); };
    var zoom = set(h("div", "amc-NCalendar-zoom"), { role: "group", "aria-label": c.i18n.zoom });
    [["day", c.i18n.day], ["week", c.i18n.week], ["month", c.i18n.month]].forEach(function (zz) {
      var b = button("amc-NCalendar-seg", "zoom");
      b.textContent = zz[1];
      set(b, { "data-zoom": zz[0], "aria-pressed": zz[0] === z ? "true" : "false" });
      zoom.appendChild(b);
    });
    c.toolbar(label, { prevLabel: c.f(stepFn(-1), sfmt), nextLabel: c.f(stepFn(1), sfmt), extra: zoom });
    var board = h("div", "amc-NCalendar-lanes");
    board.classList.add("is-" + z);
    var pct = function (t) { return ((t - r0) / span) * 100; };
    var scale = set(h("div", "amc-NCalendar-laneRow amc-NCalendar-scale"), { "aria-hidden": "true" });
    scale.appendChild(h("span", "amc-NCalendar-laneHead"));
    var strack = h("div", "amc-NCalendar-scaleTrack");
    ticks.forEach(function (t, k) {
      var tk = h("span", "amc-NCalendar-tick" + (t.major ? " is-major" : "") + (t.day && sameDay(t.day, c.today) ? " is-today" : "") + (k % 2 ? " is-odd" : ""));
      cssVar(tk, "--amc-ncal-x", pct(t.at));
      cssVar(tk, "--amc-ncal-w", (z === "day" ? HOUR : DAYMS) / span * 100);
      var tt = h("span", "amc-NCalendar-tickText");
      if (t.pre) { tt.appendChild(h("span", "amc-NCalendar-tickPre", t.pre)); }
      tt.appendChild(h("span", "amc-NCalendar-tickNum", t.text));
      tk.appendChild(tt);
      strack.appendChild(tk);
    });
    scale.appendChild(strack);
    board.appendChild(scale);
    var lanes = c.catNames.slice();
    var other = c.events.some(function (ev) { return !ev.catName; });
    if (other || !lanes.length) { lanes.push(""); }
    var now = new Date();
    var nowPct = now >= r0 && now < r1 ? pct(now) : null;
    var rem = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
    var aw = c.app.clientWidth || 600;
    var narrow = aw < 36 * rem;
    var boardW = Math.max(aw, (z === "month" ? (narrow ? 40 : 52) : (narrow ? 0 : 38)) * rem);
    var trackW = Math.max(120, narrow ? boardW : boardW - 10.5 * rem);
    var minPct = Math.min(40, (6.5 * rem / trackW) * 100);
    c.laneWidth = aw;
    var list = set(h("div", "amc-NCalendar-laneList"), { role: "list" });
    lanes.forEach(function (name) {
      var evs = c.events.filter(function (ev) { return ev.catName === name && ev.end > r0 && ev.start < r1; });
      var row = set(h("div", "amc-NCalendar-laneRow amc-NCalendar-lane"), { role: "listitem" });
      var ci = name ? String(c.catNames.indexOf(name) % NCAT) : "x";
      row.classList.add("amc-NCalendar-c" + ci);
      var headEl = h("div", "amc-NCalendar-laneHead");
      headEl.appendChild(set(h("span", "amc-NCalendar-swatchDot"), { "aria-hidden": "true" }));
      headEl.appendChild(h("span", "amc-NCalendar-laneName", name || c.i18n.other));
      headEl.appendChild(h("span", "amc-NCalendar-laneCount", c.num(evs.length)));
      row.appendChild(headEl);
      var track = set(h("div", "amc-NCalendar-track"), { role: "list", "aria-label": name || c.i18n.other });
      var rowEnds = [];
      evs.forEach(function (ev) {
        var s0 = ev.start < r0 ? r0 : ev.start;
        var e0 = ev.end > r1 ? r1 : ev.end;
        var x = pct(s0);
        var w = Math.max(pct(e0) - x, 0.1);
        var vis = Math.min(Math.max(w, minPct), 100 - x);
        var rr = 0;
        while (rr < rowEnds.length && rowEnds[rr] > x + 0.05) { rr++; }
        rowEnds[rr] = x + vis + 0.4;
        var item = set(h("div", "amc-NCalendar-spanItem"), { role: "listitem" });
        var el = h(ev.href ? "a" : "span", "amc-NCalendar-span" + catClass(ev));
        if (ev.href) { el.setAttribute("href", ev.href); } else { el.setAttribute("tabindex", "0"); }
        el.setAttribute("aria-label", c.evLabel(ev));
        if (ev.start < r0) { el.classList.add("is-clipStart"); }
        if (ev.end > r1) { el.classList.add("is-clipEnd"); }
        cssVar(item, "--amc-ncal-x", x);
        cssVar(item, "--amc-ncal-w", vis);
        if (vis > w + 0.5) { el.classList.add("is-point"); }
        cssVar(item, "--amc-ncal-row", rr);
        el.appendChild(set(h("span", "amc-NCalendar-spanText", ev.title), { "aria-hidden": "true" }));
        el.appendChild(set(h("span", "amc-NCalendar-spanTime", ev.allDay ? c.timeRange(ev) : c.f(ev.start, z === "day" ? TIME : { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })), { "aria-hidden": "true" }));
        item.appendChild(el);
        track.appendChild(item);
      });
      cssVar(track, "--amc-ncal-rows", Math.max(1, rowEnds.length));
      cssVar(track, "--amc-ncal-ticks", ticks.length);
      if (nowPct !== null) {
        var nl = set(h("span", "amc-NCalendar-laneNow"), { "aria-hidden": "true" });
        cssVar(nl, "--amc-ncal-x", nowPct);
        track.appendChild(nl);
      }
      row.appendChild(track);
      list.appendChild(row);
    });
    board.appendChild(list);
    var wrap = h("div", "amc-NCalendar-lanesWrap");
    wrap.appendChild(board);
    c.app.appendChild(wrap);
    return label;
  };

  /* posterDay: giant date poster with the day's events */
  VIEW.posterDay = function (c) {
    var d = c.sel;
    var evs = c.on(d);
    var sfmt = { weekday: "short", day: "numeric", month: "short" };
    var label = c.f(d, { month: "long", year: "numeric" });
    c.toolbar(label, { prevLabel: c.f(addDays(d, -1), sfmt), nextLabel: c.f(addDays(d, 1), sfmt) });
    var poster = h("div", "amc-NCalendar-poster");
    if (sameDay(d, c.today)) { poster.classList.add("is-today"); }
    var stage = set(h("div", "amc-NCalendar-stage"), {
      tabindex: "0",
      role: "group",
      "data-amc-nav": "stage",
      "aria-label": c.fullDate(d) + ", " + (evs.length ? c.countText(evs.length) : c.i18n.noEvents)
    });
    var eyebrow = set(h("p", "amc-NCalendar-pEyebrow"), { "aria-hidden": "true" });
    var rel = c.rel(d);
    if (rel) { eyebrow.appendChild(h("span", "amc-NCalendar-rel", rel)); }
    eyebrow.appendChild(h("span", "amc-NCalendar-pWeekday", c.f(d, { weekday: "long" })));
    stage.appendChild(eyebrow);
    stage.appendChild(set(h("p", "amc-NCalendar-pNum", c.f(d, { day: "numeric" })), { "aria-hidden": "true" }));
    stage.appendChild(set(h("p", "amc-NCalendar-pMonth", c.f(d, { month: "long", year: "numeric" })), { "aria-hidden": "true" }));
    if (c.cal !== "gregory") {
      stage.appendChild(set(h("p", "amc-NCalendar-pAlt", c.f(d, { day: "numeric", month: "long", year: "numeric" }, true)), { "aria-hidden": "true" }));
    }
    poster.appendChild(stage);
    var side = h("div", "amc-NCalendar-pSide");
    side.appendChild(h("p", "amc-NCalendar-pCount", evs.length ? c.countText(evs.length) : c.i18n.noEvents));
    if (evs.length) {
      var ol = c.list(evs, d, "amc-NCalendar-pList");
      if (sameDay(d, c.today)) {
        var now = new Date();
        for (var i = 0; i < evs.length; i++) {
          if (!evs[i].allDay && evs[i].end > now) {
            var li = ol.children[i];
            li.classList.add("is-next");
            li.querySelector(".amc-NCalendar-rowTime").appendChild(h("span", "amc-NCalendar-nextUp", evs[i].start <= now ? c.i18n.now : c.i18n.nextUp));
            break;
          }
        }
      }
      side.appendChild(ol);
    } else {
      var up = null;
      for (var j = 0; j < c.events.length; j++) { if (c.events[j].start >= addDays(d, 1)) { up = c.events[j]; break; } }
      if (up) {
        var nx = h("p", "amc-NCalendar-pNext");
        nx.appendChild(h("span", "amc-NCalendar-pNextLabel", c.i18n.nextEvent));
        nx.appendChild(h("span", "amc-NCalendar-pNextTitle", up.title));
        nx.appendChild(h("span", "amc-NCalendar-pNextWhen", c.f(up.start, { weekday: "short", day: "numeric", month: "short" })));
        side.appendChild(nx);
      }
    }
    poster.appendChild(side);
    c.app.appendChild(poster);
    return c.fullDate(d);
  };

  /* flipDate: desk flip calendar */
  VIEW.flipDate = function (c) {
    var d = c.sel;
    var evs = c.on(d);
    var sfmt = { weekday: "short", day: "numeric", month: "short" };
    c.toolbar(c.f(d, { month: "long", year: "numeric" }), { prevLabel: c.f(addDays(d, -1), sfmt), nextLabel: c.f(addDays(d, 1), sfmt) });
    var desk = h("div", "amc-NCalendar-desk");
    var pad = h("div", "amc-NCalendar-pad");
    var leaf = set(h("div", "amc-NCalendar-leaf"), {
      tabindex: "0",
      role: "group",
      "data-amc-nav": "stage",
      "aria-label": c.fullDate(d) + ", " + (evs.length ? c.countText(evs.length) : c.i18n.noEvents)
    });
    if (sameDay(d, c.today)) { leaf.classList.add("is-today"); }
    leaf.appendChild(set(h("span", "amc-NCalendar-rings"), { "aria-hidden": "true" }));
    var head = set(h("p", "amc-NCalendar-leafHead"), { "aria-hidden": "true" });
    head.appendChild(h("span", "amc-NCalendar-leafMonth", c.f(d, { month: "long" })));
    head.appendChild(h("span", "amc-NCalendar-leafYear", c.f(d, { year: "numeric" })));
    leaf.appendChild(head);
    leaf.appendChild(set(h("p", "amc-NCalendar-leafNum", c.f(d, { day: "numeric" })), { "aria-hidden": "true" }));
    var wd = set(h("p", "amc-NCalendar-leafDay"), { "aria-hidden": "true" });
    wd.appendChild(h("span", "", c.f(d, { weekday: "long" })));
    var rel = c.rel(d);
    if (rel) { wd.appendChild(h("span", "amc-NCalendar-rel", rel)); }
    if (c.cal !== "gregory") { wd.appendChild(h("span", "amc-NCalendar-leafAlt", c.f(d, { day: "numeric", month: "short", year: "numeric" }, true))); }
    leaf.appendChild(wd);
    leaf.appendChild(c.list(evs, d, "amc-NCalendar-notes"));
    pad.appendChild(leaf);
    desk.appendChild(pad);
    c.app.appendChild(desk);
    return c.fullDate(d);
  };

  Cal.prototype.flip = function (dirn, old) {
    if (!old || reduced()) { return; }
    var pad = this.app.querySelector(".amc-NCalendar-pad");
    var leaf = pad && pad.querySelector(".amc-NCalendar-leaf");
    if (!pad || !leaf) { return; }
    old.removeAttribute("tabindex");
    old.removeAttribute("data-amc-nav");
    old.setAttribute("aria-hidden", "true");
    old.setAttribute("inert", "");
    each(old.querySelectorAll("a, [tabindex]"), function (a) { a.setAttribute("tabindex", "-1"); });
    old.classList.add("is-ghost");
    var moving;
    if (dirn > 0) {
      old.classList.add("is-tearing");
      pad.appendChild(old);
      moving = old;
    } else {
      old.classList.add("is-under");
      pad.insertBefore(old, leaf);
      leaf.classList.add("is-landing");
      moving = leaf;
    }
    var done = function () {
      if (old.parentNode) { old.parentNode.removeChild(old); }
      leaf.classList.remove("is-landing");
    };
    moving.addEventListener("animationend", done, { once: true });
    window.setTimeout(done, 1200);
  };

  /* countdown: live tiles for the next events */
  VIEW.countdown = function (c) {
    var now = new Date();
    var up = c.events.filter(function (ev) { return ev.end > now; }).slice(0, c.count);
    c.tiles = [];
    if (!up.length) {
      c.app.appendChild(h("p", "amc-NCalendar-empty", c.i18n.noneUpcoming));
      return "";
    }
    var ul = h("ul", "amc-NCalendar-tiles");
    up.forEach(function (ev, i) {
      var li = h("li", "amc-NCalendar-tile" + catClass(ev));
      if (i === 0) {
        li.classList.add("is-first");
        li.appendChild(set(h("span", "amc-NCalendar-beam"), { "aria-hidden": "true" }));
      }
      var top = h("p", "amc-NCalendar-tileWhen");
      top.appendChild(set(h("span", "amc-NCalendar-rowDot"), { "aria-hidden": "true" }));
      top.appendChild(h("span", "", c.f(ev.start, ev.allDay ? { weekday: "short", day: "numeric", month: "short" } : { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })));
      li.appendChild(top);
      var title = h("h3", "amc-NCalendar-tileTitle");
      var t = h(ev.href ? "a" : "span", "amc-NCalendar-tileLink", ev.title);
      if (ev.href) { t.setAttribute("href", ev.href); }
      title.appendChild(t);
      li.appendChild(title);
      var units = set(h("div", "amc-NCalendar-units"), { "aria-hidden": "true" });
      var tile = { ev: ev, li: li, nums: [], labels: [], units: units };
      ["day", "hour", "minute"].forEach(function (u) {
        var box = h("span", "amc-NCalendar-unit");
        var n = h("span", "amc-NCalendar-unitNum", "");
        var l = h("span", "amc-NCalendar-unitLabel", "");
        var ls = h("span", "amc-NCalendar-unitLabel amc-NCalendar-unitLabel--short", "");
        box.appendChild(n);
        box.appendChild(l);
        box.appendChild(ls);
        units.appendChild(box);
        tile.nums.push(n);
        tile.labels.push(l);
        tile.shortLabels = (tile.shortLabels || []).concat([ls]);
      });
      li.appendChild(units);
      var liveTag = h("p", "amc-NCalendar-liveTag", c.i18n.now);
      li.appendChild(liveTag);
      var meter = set(h("span", "amc-NCalendar-meter"), { "aria-hidden": "true" });
      meter.appendChild(h("span", "amc-NCalendar-meterFill"));
      li.appendChild(meter);
      tile.meter = meter;
      var meta = h("p", "amc-NCalendar-rowMeta");
      if (ev.catName) { meta.appendChild(h("span", "amc-NCalendar-tag", ev.catName)); }
      if (ev.stateText) { meta.appendChild(h("span", "amc-NCalendar-state", ev.stateText)); }
      li.appendChild(meta);
      tile.sr = h("span", "amc-NCalendar-sr");
      li.appendChild(tile.sr);
      ul.appendChild(li);
      c.tiles.push(tile);
    });
    c.app.appendChild(ul);
    c.tick(now, false);
    return "";
  };

  Cal.prototype.tick = function (now, animate) {
    var self = this;
    var gone = false;
    (this.tiles || []).forEach(function (t) {
      var ms = t.ev.start - now;
      if (t.ev.end <= now) { gone = true; return; }
      var live = ms <= 0;
      t.li.classList.toggle("is-live", live);
      if (live) {
        t.sr.textContent = t.ev.title + ": " + self.i18n.now;
        cssVar(t.meter, "--amc-ncal-p", 100);
        return;
      }
      var tm = Math.ceil(ms / MIN);
      var parts = [Math.floor(tm / 1440), Math.floor((tm % 1440) / 60), tm % 60];
      var units = ["day", "hour", "minute"];
      var said = [];
      parts.forEach(function (v, i) {
        var txt = i === 0 ? self.num(v) : self.num(v, { minimumIntegerDigits: 2 });
        if (t.nums[i].textContent !== txt) {
          t.nums[i].textContent = txt;
          if (animate && !reduced()) {
            t.nums[i].classList.remove("is-tick");
            void t.nums[i].offsetWidth;
            t.nums[i].classList.add("is-tick");
          }
        }
        t.labels[i].textContent = self.unitName(v, units[i], "long");
        t.shortLabels[i].textContent = self.unitName(v, units[i], "short");
        if (v || i === 2) { said.push(self.unit(v, units[i], "long")); }
      });
      t.sr.textContent = t.ev.title + ": " + self.i18n.startsIn + " " + said.join(", ");
      cssVar(t.meter, "--amc-ncal-p", Math.max(2, Math.min(100, (1 - ms / (7 * DAYMS)) * 100)));
    });
    if (gone && !this.ticking) {
      this.ticking = true;
      this.render();
      this.ticking = false;
    }
  };

  /* circularYear: the year as a ring of month arcs */
  function pt(r, deg) {
    var a = (deg - 90) * Math.PI / 180;
    return round(200 + r * Math.cos(a)) + " " + round(200 + r * Math.sin(a));
  }
  // Annulus sector from a0 to a1 degrees (clockwise from 12 o'clock); dir -1 mirrors it for RTL.
  function arcPath(r0, r1, a0, a1, dir) {
    var large = a1 - a0 > 180 ? 1 : 0;
    var cw = dir < 0 ? 0 : 1;
    return "M" + pt(r1, a0 * dir) + " A" + r1 + " " + r1 + " 0 " + large + " " + cw + " " + pt(r1, a1 * dir) +
      " L" + pt(r0, a1 * dir) + " A" + r0 + " " + r0 + " 0 " + large + " " + (1 - cw) + " " + pt(r0, a0 * dir) + " Z";
  }

  VIEW.circularYear = function (c) {
    var ys = c.yearStart(c.sel);
    var months = c.yearMonths(ys);
    var yLen = 0;
    months.forEach(function (m) { yLen += m.len; });
    var ye = addDays(ys, yLen - 1);
    var yfmt = { year: "numeric" };
    var label = c.f(ys, yfmt);
    c.toolbar(label, c.periodOpts("", function (n) { return c.shiftMonth(ys, 12 * n); }, yfmt));
    var selIdx = 0;
    var sweep = c.rtl ? -1 : 1;
    months.forEach(function (m, i) { if (c.sel >= m.start && c.sel < addDays(m.start, m.len)) { selIdx = i; } });
    var wrap = h("div", "amc-NCalendar-ringWrap");
    var fig = h("div", "amc-NCalendar-ringFig");
    var svg = s("svg", { viewBox: "0 0 400 400", "class": "amc-NCalendar-ringSvg", role: "group", "aria-labelledby": c.titleId, focusable: "false" });
    var counts = months.map(function (m) {
      var n = 0;
      c.events.forEach(function (ev) { if (ev.start >= m.start && ev.start < addDays(m.start, m.len)) { n++; } });
      return n;
    });
    var maxC = Math.max.apply(null, counts.concat([1]));
    var off = 0;
    c.arcs = [];
    months.forEach(function (m, i) {
      var a0 = off / yLen * 360 + 0.9;
      var a1 = (off + m.len) / yLen * 360 - 0.9;
      off += m.len;
      var g = s("g", { "class": "amc-NCalendar-arcG" });
      var lvl = counts[i] ? Math.max(1, Math.ceil(counts[i] / maxC * 4)) : 0;
      var p = s("path", {
        d: arcPath(128, 172, a0, a1, sweep),
        "class": "amc-NCalendar-arc is-l" + lvl + (i === selIdx ? " is-selected" : ""),
        role: "button",
        tabindex: i === selIdx ? "0" : "-1",
        "aria-pressed": i === selIdx ? "true" : "false",
        "aria-label": c.f(m.start, { month: "long", year: "numeric" }) + ", " + (counts[i] ? c.countText(counts[i]) : c.i18n.noEvents),
        "data-amc-nav": "arc",
        "data-month": String(i)
      });
      if (m.start <= c.today && c.today < addDays(m.start, m.len)) { p.classList.add("is-current"); }
      g.appendChild(p);
      var mid = ((a0 + a1) / 2) * sweep;
      var lp = pt(150, mid).split(" ");
      var t = s("text", { x: lp[0], y: lp[1], "class": "amc-NCalendar-arcLabel", "aria-hidden": "true" });
      t.textContent = c.f(m.start, { month: "short" });
      if (t.textContent.length > 5) { t.setAttribute("class", "amc-NCalendar-arcLabel is-long"); }
      g.appendChild(t);
      svg.appendChild(g);
      c.arcs.push(p);
    });
    var stack = {};
    c.events.forEach(function (ev) {
      if (ev.start < ys || ev.start > ye) { return; }
      var di = dayDiff(ys, ev.start);
      var k = stack[di] = (stack[di] || 0) + 1;
      if (k > 3) { return; }
      var ang = ((di + 0.5) / yLen) * 360 * sweep;
      var xy = pt(182 + (k - 1) * 8, ang).split(" ");
      svg.appendChild(s("circle", { cx: xy[0], cy: xy[1], r: "3.4", "class": "amc-NCalendar-ringDot" + catClass(ev), "aria-hidden": "true" }));
    });
    if (c.today >= ys && c.today <= ye) {
      var ta = ((dayDiff(ys, c.today) + 0.5) / yLen) * 360 * sweep;
      var p1 = pt(118, ta).split(" ");
      var p2 = pt(176, ta).split(" ");
      svg.appendChild(s("line", { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], "class": "amc-NCalendar-todayTick", "aria-hidden": "true" }));
      var tc = pt(113, ta).split(" ");
      svg.appendChild(s("circle", { cx: tc[0], cy: tc[1], r: "4", "class": "amc-NCalendar-todayDot", "aria-hidden": "true" }));
    }
    fig.appendChild(svg);
    c.hub = set(h("div", "amc-NCalendar-hub"), { "aria-live": "polite" });
    fig.appendChild(c.hub);
    wrap.appendChild(fig);
    c.below = h("div", "amc-NCalendar-ringBelow");
    wrap.appendChild(c.below);
    c.app.appendChild(wrap);
    c.months = months;
    c.fillHub(selIdx);
    return label;
  };

  Cal.prototype.fillHub = function (i) {
    var m = this.months[i];
    var self = this;
    var end = addDays(m.start, m.len);
    var evs = this.events.filter(function (ev) { return ev.start >= m.start && ev.start < end; });
    [this.hub, this.below].forEach(function (box, k) {
      clear(box);
      if (k === 0) {
        box.appendChild(h("p", "amc-NCalendar-hubMonth", self.f(m.start, { month: "long" })));
        box.appendChild(h("p", "amc-NCalendar-hubCount", evs.length ? self.countText(evs.length) : self.i18n.noEvents));
      }
      if (evs.length) {
        var ol = h("ol", "amc-NCalendar-rows amc-NCalendar-hubList");
        evs.forEach(function (ev, j) {
          var li = self.row(ev, null, j);
          li.querySelector(".amc-NCalendar-rowTime").textContent = self.f(ev.start, { day: "numeric", month: "short" });
          ol.appendChild(li);
        });
        box.appendChild(ol);
      }
    });
    this.arcs.forEach(function (p, j) {
      p.classList.toggle("is-selected", j === i);
      p.setAttribute("aria-pressed", j === i ? "true" : "false");
      p.setAttribute("tabindex", j === i ? "0" : "-1");
    });
    this.monthIdx = i;
  };

  /* ---------- rendering + interaction ---------- */
  Cal.prototype.render = function (focusSel) {
    this.closePop(false);
    clear(this.app);
    this.panel = this.ind = this.tip = this.hub = this.below = null;
    this.nowEls = [];
    this.tiles = [];
    this.today = dayOf(new Date());
    this.root.classList.toggle("is-empty", !this.events.length);
    var label = VIEW[this.style](this) || "";
    if (focusSel) {
      var el = this.app.querySelector(focusSel);
      if (el) { el.focus({ preventScroll: false }); }
    }
    return label;
  };

  Cal.prototype.go = function (d, focusKind) {
    var style = this.style;
    var old = null;
    var dirn = dayDiff(this.sel, d);
    if (style === "flipDate" && dirn !== 0) {
      var leaf = this.app.querySelector(".amc-NCalendar-leaf:not(.is-ghost)");
      old = leaf ? leaf.cloneNode(true) : null;
    }
    this.sel = dayOf(d);
    var sel = focusKind === "day" ? "[data-amc-nav=\"day\"][data-day=\"" + keyOf(this.sel) + "\"]" :
      focusKind === "stage" ? "[data-amc-nav=\"stage\"]" :
      focusKind === "arc" ? "[data-amc-nav=\"arc\"][tabindex=\"0\"]" : null;
    var label = this.render(sel);
    if (old) { this.flip(dirn, old); }
    if (label) { this.announce(label); }
  };

  Cal.prototype.step = function (n) {
    var st = this.style;
    if (st === "month" || st === "miniDots") { return this.shiftMonth(this.sel, n); }
    if (st === "week") { return addDays(this.sel, 7 * n); }
    if (st === "heatmap" || st === "circularYear") { return this.shiftMonth(this.sel, 12 * n); }
    if (st === "timelineLanes") {
      return this.zoom === "day" ? addDays(this.sel, n) : this.zoom === "week" ? addDays(this.sel, 7 * n) : this.shiftMonth(this.sel, n);
    }
    return addDays(this.sel, n);
  };

  Cal.prototype.inView = function (d) {
    var st = this.style;
    if (st === "month" || st === "miniDots") { return sameDay(this.monthStart(d), this.monthStart(this.sel)); }
    if (st === "week") { return sameDay(this.weekStart(d), this.weekStart(this.sel)); }
    if (st === "heatmap") { return sameDay(this.yearStart(d), this.yearStart(this.sel)); }
    return false;
  };

  Cal.prototype.select = function (d, focus) {
    if (!this.inView(d)) { this.go(d, focus ? "day" : null); return; }
    this.sel = dayOf(d);
    var key = keyOf(this.sel);
    var target = null;
    var pressed = this.style === "heatmap";
    each(this.app.querySelectorAll("[data-amc-nav=\"day\"]"), function (el) {
      var on = el.getAttribute("data-day") === key;
      el.setAttribute("tabindex", on ? "0" : "-1");
      el.setAttribute(pressed ? "aria-pressed" : "aria-selected", on ? "true" : "false");
      el.classList.toggle("is-selected", on);
      if (on) { target = el; }
    });
    if (this.style === "miniDots") { this.placeIndicator(); this.fillReveal(true); } else { this.fillPanel(); }
    if (focus && target) { target.focus(); }
    return target;
  };

  Cal.prototype.openPop = function (d, anchor) {
    this.closePop(false);
    var self = this;
    var evs = this.on(d);
    var pop = set(h("div", "amc-NCalendar-pop"), { role: "dialog", "aria-label": this.fullDate(d) });
    var head = h("div", "amc-NCalendar-popHead");
    var ht = h("p", "amc-NCalendar-popTitle");
    var rel = this.rel(d);
    if (rel) { ht.appendChild(h("span", "amc-NCalendar-rel", rel)); }
    ht.appendChild(h("span", "", this.f(d, { weekday: "long", day: "numeric", month: "long" })));
    head.appendChild(ht);
    var close = button("amc-NCalendar-btn--icon amc-NCalendar-close", "close", this.i18n.close);
    close.appendChild(set(h("span", "amc-NCalendar-x"), { "aria-hidden": "true" }));
    head.appendChild(close);
    pop.appendChild(head);
    pop.appendChild(this.list(evs, d));
    this.app.appendChild(pop);
    var ar = this.app.getBoundingClientRect();
    var r = anchor.getBoundingClientRect();
    var pw = pop.offsetWidth;
    var x = this.rtl ? ar.right - r.right : r.left - ar.left;
    x = Math.max(0, Math.min(x, ar.width - pw));
    cssVar(pop, "--amc-ncal-px", x, "px");
    var ph = pop.offsetHeight;
    var y = r.bottom - ar.top + 6;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.bottom + 6 + ph > vh && r.top - ph - 6 >= 0) { y = r.top - ar.top - ph - 6; }
    cssVar(pop, "--amc-ncal-py", y, "px");
    this.pop = { el: pop, anchor: anchor };
    pop.addEventListener("focusout", function (e) {
      if (self.pop && self.pop.el === pop && e.relatedTarget && !pop.contains(e.relatedTarget)) { self.closePop(false); }
    });
    (pop.querySelector("a[href]") || close).focus();
  };

  Cal.prototype.closePop = function (restore) {
    if (!this.pop) { return; }
    var p = this.pop;
    this.pop = null;
    if (p.el.parentNode) { p.el.parentNode.removeChild(p.el); }
    if (restore && p.anchor && document.body.contains(p.anchor)) { p.anchor.focus(); }
  };

  Cal.prototype.panelVisible = function () {
    return !!(this.panel && this.panel.offsetParent !== null && window.getComputedStyle(this.panel).display !== "none");
  };

  Cal.prototype.activate = function (el, fromKey) {
    var d = parseISO(el.getAttribute("data-day")).d;
    var st = this.style;
    var cell = this.select(d, fromKey) || el;
    if (st === "miniDots") { return; }
    if (st === "month" && this.panelVisible()) { return; }
    if (!fromKey && st === "month" && !this.on(d).length) { return; }
    this.openPop(d, cell);
  };

  Cal.prototype.act = function (name, el) {
    if (name === "prev" || name === "next") { this.go(this.step(name === "prev" ? -1 : 1)); return; }
    if (name === "today") { this.go(dayOf(new Date())); return; }
    if (name === "zoom") {
      this.zoom = el.getAttribute("data-zoom") || "week";
      var label = this.render("[data-amc-act=\"zoom\"][data-zoom=\"" + this.zoom + "\"]");
      this.announce(label);
      return;
    }
    if (name === "more") {
      var cell = el.closest("[data-amc-nav=\"day\"]");
      if (cell) {
        var d = parseISO(cell.getAttribute("data-day")).d;
        this.select(d, false);
        this.openPop(d, cell);
      }
      return;
    }
    if (name === "close") { this.closePop(true); }
  };

  Cal.prototype.key = function (e, t) {
    var nav = t.getAttribute("data-amc-nav");
    var k = e.key;
    var fwd = this.rtl ? -1 : 1;
    var st = this.style;
    var target = null;
    if (nav === "day") {
      var d = parseISO(t.getAttribute("data-day")).d;
      var ws = this.weekStart(d);
      if (st === "heatmap") {
        if (k === "ArrowUp") { target = addDays(d, -1); }
        if (k === "ArrowDown") { target = addDays(d, 1); }
        if (k === "ArrowLeft") { target = addDays(d, -7 * fwd); }
        if (k === "ArrowRight") { target = addDays(d, 7 * fwd); }
        if (k === "PageUp") { target = this.shiftMonth(d, -1); }
        if (k === "PageDown") { target = this.shiftMonth(d, 1); }
      } else {
        if (k === "ArrowLeft") { target = addDays(d, -fwd); }
        if (k === "ArrowRight") { target = addDays(d, fwd); }
        if (k === "ArrowUp" && st !== "week") { target = addDays(d, -7); }
        if (k === "ArrowDown" && st !== "week") { target = addDays(d, 7); }
        if (k === "PageUp") { target = st === "week" ? addDays(d, -7) : this.shiftMonth(d, -1); }
        if (k === "PageDown") { target = st === "week" ? addDays(d, 7) : this.shiftMonth(d, 1); }
      }
      if (k === "Home") { target = ws; }
      if (k === "End") { target = addDays(ws, 6); }
      if (target) {
        e.preventDefault();
        this.select(target, true);
        if (st === "heatmap") { this.showTip(this.app.querySelector("[data-day=\"" + keyOf(target) + "\"]")); }
        return;
      }
      if (k === "Enter" || k === " " || k === "Spacebar") {
        if (e.target !== t) { return; }
        e.preventDefault();
        this.activate(t, true);
      }
      return;
    }
    if (nav === "stage") {
      if (e.target !== t) { return; }
      if (k === "ArrowLeft" || k === "ArrowRight") {
        e.preventDefault();
        this.go(addDays(this.sel, (k === "ArrowRight" ? 1 : -1) * fwd), "stage");
      } else if (k === "Home") {
        e.preventDefault();
        this.go(dayOf(new Date()), "stage");
      } else if (k === "ArrowUp" || k === "ArrowDown") {
        e.preventDefault();
        this.go(addDays(this.sel, k === "ArrowDown" ? 1 : -1), "stage");
      }
      return;
    }
    if (nav === "arc") {
      var i = parseInt(t.getAttribute("data-month"), 10);
      var n = null;
      if (k === "ArrowRight") { n = i + fwd; }
      if (k === "ArrowLeft") { n = i - fwd; }
      if (k === "ArrowDown") { n = i + 1; }
      if (k === "ArrowUp") { n = i - 1; }
      if (k === "Home") { n = 0; }
      if (k === "End") { n = this.months.length - 1; }
      if (k === "Enter" || k === " " || k === "Spacebar") { e.preventDefault(); this.pickMonth(i, true); return; }
      if (n === null) { return; }
      e.preventDefault();
      if (n < 0 || n >= this.months.length) {
        this.go(this.shiftMonth(this.months[i].start, n < 0 ? -1 : 1), "arc");
        return;
      }
      this.pickMonth(n, true);
    }
  };

  Cal.prototype.pickMonth = function (i, focus) {
    var m = this.months[i];
    var end = addDays(m.start, m.len);
    this.sel = this.today >= m.start && this.today < end ? this.today : m.start;
    this.fillHub(i);
    if (focus) { this.arcs[i].focus(); }
  };

  /* ---------- delegated listeners ---------- */
  function instOf(el) {
    var root = el && el.closest ? el.closest(".amc-NCalendar.is-ready") : null;
    return root && root.amcNCal ? root.amcNCal : null;
  }

  function onClick(e) {
    var t = e.target;
    instances.forEach(function (c) {
      if (c.pop && !c.pop.el.contains(t) && !(c.pop.anchor && c.pop.anchor.contains(t))) { c.closePop(false); }
    });
    if (!t || !t.closest) { return; }
    var c = instOf(t);
    if (!c) { return; }
    var actEl = t.closest("[data-amc-act]");
    if (actEl && c.root.contains(actEl)) { c.act(actEl.getAttribute("data-amc-act"), actEl); return; }
    if (t.closest("a[href]")) { return; }
    var navEl = t.closest("[data-amc-nav]");
    if (!navEl) { return; }
    var nav = navEl.getAttribute("data-amc-nav");
    if (nav === "day") { c.activate(navEl, false); }
    if (nav === "arc") { c.pickMonth(parseInt(navEl.getAttribute("data-month"), 10), true); }
  }

  function onKey(e) {
    var t = e.target;
    var c = instOf(t);
    if (!c) { return; }
    if (e.key === "Escape" || e.key === "Esc") {
      if (c.pop) { e.preventDefault(); c.closePop(true); }
      c.hideTip();
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) { return; }
    var navEl = t.closest("[data-amc-nav]");
    if (navEl && c.root.contains(navEl)) { c.key(e, navEl); }
  }

  function onOver(e) {
    var t = e.target;
    if (!t || !t.closest) { return; }
    var cell = t.closest(".amc-NCalendar-heatCells .amc-NCalendar-hcell[data-tip]");
    var c = instOf(t);
    if (!c || c.style !== "heatmap") { return; }
    if (cell) { c.showTip(cell); } else if (e.type === "pointerover") { c.hideTip(); }
  }

  function onOut(e) {
    var c = instOf(e.target);
    if (c && c.style === "heatmap" && (!e.relatedTarget || !c.root.contains(e.relatedTarget))) { c.hideTip(); }
  }

  /* ---------- lifecycle ---------- */
  function init(scope) {
    each((scope || document).querySelectorAll(".amc-NCalendar:not([data-amc-init])"), function (root) {
      try {
        instances.push(new Cal(root));
      } catch (err) {
        root.setAttribute("data-amc-init", "E");
        if (window.console) { window.console.warn("amcNextCalendar", err); }
      }
    });
    instances = instances.filter(function (c) { return document.documentElement.contains(c.root); });
  }

  function rebuild(scope) {
    var roots = [];
    if (scope && scope.classList && scope.classList.contains("amc-NCalendar")) { roots.push(scope); }
    each((scope || document).querySelectorAll(".amc-NCalendar"), function (r) { roots.push(r); });
    roots.forEach(function (root) {
      var c = root.amcNCal;
      if (c) {
        c.closePop(false);
        if (c.ro) { c.ro.disconnect(); }
        if (c.app.parentNode) { c.app.parentNode.removeChild(c.app); }
        if (c.live.parentNode) { c.live.parentNode.removeChild(c.live); }
        instances = instances.filter(function (x) { return x !== c; });
        root.amcNCal = null;
      }
      root.removeAttribute("data-amc-init");
      root.classList.remove("is-ready");
    });
    init(scope && scope.querySelectorAll ? scope : document);
    if (scope && scope.classList && scope.classList.contains("amc-NCalendar") && !scope.amcNCal) {
      try { instances.push(new Cal(scope)); } catch (err) { /* ignore */ }
    }
  }

  function minute() {
    var now = new Date();
    instances = instances.filter(function (c) { return document.documentElement.contains(c.root); });
    instances.forEach(function (c) {
      if (!sameDay(c.today, now)) {
        var followToday = sameDay(c.sel, c.today);
        if (followToday) { c.sel = dayOf(now); }
        c.render();
        return;
      }
      c.updateNow(now);
      if (c.tiles && c.tiles.length) { c.tick(now, true); }
    });
  }

  function start() {
    init(document);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("focusin", onOver);
    document.addEventListener("pointerout", onOut, { passive: true });
    document.addEventListener("focusout", onOut);
    if (window.MutationObserver) {
      var pending = 0;
      new MutationObserver(function () {
        if (pending) { return; }
        pending = window.requestAnimationFrame(function () { pending = 0; init(document); });
      }).observe(document.body, { childList: true, subtree: true });
    }
    if (window.apex && window.apex.jQuery) {
      window.apex.jQuery(document).on("apexafterrefresh", function (ev) { rebuild(ev.target); });
    }
    var nowMs = Date.now();
    window.setTimeout(function () {
      minute();
      window.setInterval(minute, MIN);
    }, MIN - (nowMs % MIN) + 50);
  }

  window.amcNextCalendar = { init: init, refresh: rebuild };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
