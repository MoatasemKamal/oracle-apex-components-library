/* Moment Launcher: lifts the entries whose moments match the user's local date and time into a
   "Right now" section and says why ("Month-end: 2 working days left"). Moments come from
   Attribute 1: space-separated alternatives, each one or more tokens joined with "+" that must all
   match (friday+afternoon). Working days skip the weekend of the page locale (Intl.Locale week
   info) unless data-weekend on the wrapper names the days. Names of days and dates come from Intl.
   Nothing is stored. The set is computed at load and re-checked every minute and when the tab
   becomes visible, but never moves while focus is inside the list. ES5, textContent only. */
(function () {
  "use strict";
  if (window.amcTplMomentLauncher) { return; }

  var ROOT = "amc-TMomentLauncher";
  var C = function (part) { return "." + ROOT + "-" + part; };
  var DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  var override = null;
  var uid = 0;

  function now() { return override ? new Date(override.getTime()) : new Date(); }

  // ------------------------------------------------------------ locale
  function lang() {
    var doc = document.documentElement.getAttribute("lang") || "";
    var nav = navigator.language || "en";
    if (!doc) { return nav; }
    if (doc.indexOf("-") === -1 && nav.toLowerCase().indexOf(doc.toLowerCase() + "-") === 0) { return nav; }
    return doc;
  }
  function dayIndex(name) {
    name = String(name).toLowerCase();
    for (var i = 0; i < DAYS.length; i++) { if (DAYS[i] === name || DAYS[i].slice(0, 3) === name) { return i; } }
    return /^[0-6]$/.test(name) ? +name : -1;
  }
  function weekend(root) {
    var set = {};
    var own = (root.getAttribute("data-weekend") || "").trim();
    if (own) {
      own.split(/[\s,]+/).forEach(function (d) { var i = dayIndex(d); if (i >= 0) { set[i] = true; } });
      return set;
    }
    try {
      var loc = new Intl.Locale(lang());
      if (loc.maximize) { loc = loc.maximize(); }
      var info = loc.getWeekInfo ? loc.getWeekInfo() : loc.weekInfo;
      if (info && info.weekend && info.weekend.length) {
        info.weekend.forEach(function (d) { set[d % 7] = true; });
        return set;
      }
    } catch (e) { /* fall back */ }
    set[0] = set[6] = true;
    return set;
  }

  // ------------------------------------------------------------ calendar facts
  var monthCache = {};
  function workDays(y, m, we) {
    var key = y + "-" + m + "-" + Object.keys(we).join("");
    if (monthCache[key]) { return monthCache[key]; }
    var last = new Date(y, m + 1, 0).getDate();
    var list = [];
    for (var d = 1; d <= last; d++) { if (!we[new Date(y, m, d).getDay()]) { list.push(d); } }
    monthCache[key] = { list: list, last: last };
    return monthCache[key];
  }
  function facts(date, we) {
    var y = date.getFullYear(), m = date.getMonth(), d = date.getDate(), dow = date.getDay();
    var wd = workDays(y, m, we);
    var elapsed = 0, left = 0;
    for (var i = 0; i < wd.list.length; i++) {
      if (wd.list[i] <= d) { elapsed++; }
      if (wd.list[i] >= d) { left++; }
    }
    return {
      y: y, m: m, d: d, dow: dow, h: date.getHours(), work: !we[dow], last: wd.last,
      elapsed: elapsed, left: left,
      weekstart: !we[dow] && !!we[(dow + 6) % 7],
      weekclose: !we[dow] && !!we[(dow + 1) % 7]
    };
  }

  // token -> { ok, weight, kind, left }
  function test(token, f) {
    var t = token.toLowerCase();
    var h = f.h;
    switch (t) {
      case "morning": return { ok: h >= 5 && h < 12, w: 1, kind: "time" };
      case "afternoon": return { ok: h >= 12 && h < 17, w: 1, kind: "time" };
      case "evening": return { ok: h >= 17 && h < 22, w: 1, kind: "time" };
      case "night": return { ok: h >= 22 || h < 5, w: 1, kind: "time" };
      case "workhours": return { ok: f.work && h >= 8 && h < 18, w: 1, kind: "time" };
      case "weekday": return { ok: f.work, w: 1, kind: "date" };
      case "weekend": return { ok: !f.work, w: 2, kind: "date" };
      case "weekstart": return { ok: f.weekstart, w: 2, kind: "date" };
      case "weekclose": return { ok: f.weekclose, w: 2, kind: "date" };
      case "monthstart": return { ok: f.elapsed >= 1 && f.elapsed <= 3, w: 3, kind: "date" };
      case "monthend": return { ok: f.left >= 1 && f.left <= 3, w: 3, kind: "date", left: f.left };
      case "quarterstart": return { ok: f.m % 3 === 0 && f.elapsed >= 1 && f.elapsed <= 3, w: 4, kind: "date" };
      case "quarterend": return { ok: f.m % 3 === 2 && f.left >= 1 && f.left <= 5, w: 4, kind: "date", left: f.left };
      case "yearend": return { ok: f.m === 11 && f.left >= 1 && f.left <= 10, w: 5, kind: "date", left: f.left };
      case "lastday": return { ok: f.d === f.last, w: 4, kind: "date" };
    }
    var day = dayIndex(t);
    if (day >= 0 && !/^\d$/.test(t)) { return { ok: f.dow === day, w: 2, kind: "day" }; }
    var dm = /^day(\d{1,2})$/.exec(t);
    if (dm) { return { ok: f.d === Math.min(+dm[1], f.last), w: 4, kind: "dom" }; }
    return null;
  }

  function parse(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean).map(function (g) { return g.split("+").filter(Boolean); });
  }

  // Best matching alternative for an entry at facts f, or null.
  function match(groups, f) {
    var best = null;
    for (var g = 0; g < groups.length; g++) {
      var weight = 0, hits = [], ok = groups[g].length > 0;
      for (var t = 0; t < groups[g].length && ok; t++) {
        var r = test(groups[g][t], f);
        if (!r || !r.ok) { ok = false; break; }
        weight += r.w;
        r.token = groups[g][t].toLowerCase();
        hits.push(r);
      }
      if (ok && (!best || weight > best.weight)) { best = { weight: weight, hits: hits }; }
    }
    return best;
  }

  // ------------------------------------------------------------ text
  function fmt(opts, date) {
    try { return new Intl.DateTimeFormat(lang(), opts).format(date); } catch (e) { return ""; }
  }
  function plural(root, n) {
    var cat = "other";
    try { cat = new Intl.PluralRules(lang()).select(n); } catch (e) { /* other */ }
    var text = root.getAttribute("data-left-" + cat) || root.getAttribute("data-left-other") || "{n}";
    return text.replace("{n}", new Intl.NumberFormat(lang()).format(n));
  }
  function reason(root, hit, f, date) {
    var t = hit.token;
    if (hit.kind === "day") { return fmt({ weekday: "long" }, date); }
    if (hit.kind === "dom") { return fmt({ day: "numeric", month: "long" }, date); }
    var label = root.getAttribute("data-l-" + t) || t;
    if (hit.left !== undefined) {
      label += ": " + (hit.left === 1 ? root.getAttribute("data-left-last") : plural(root, hit.left));
    }
    return label;
  }

  var SEGMENTS = [0, 5, 8, 12, 17, 18, 22];
  function nextTime(groups, from, we) {
    for (var off = 0; off <= 400; off++) {
      var day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + off);
      for (var s = 0; s < SEGMENTS.length; s++) {
        var at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), SEGMENTS[s]);
        if (at <= from) { continue; }
        if (match(groups, facts(at, we))) { return at; }
      }
    }
    return null;
  }
  function nextText(root, at, from) {
    var a = new Date(at.getFullYear(), at.getMonth(), at.getDate());
    var b = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    var days = Math.round((a - b) / 864e5);
    if (days === 0) {
      var h = at.getHours();
      var part = h >= 22 || h < 5 ? "night" : h >= 17 ? "evening" : h >= 12 ? "afternoon" : "morning";
      return root.getAttribute("data-l-" + part) || fmt({ hour: "numeric", minute: "2-digit" }, at);
    }
    if (days === 1 && window.Intl && Intl.RelativeTimeFormat) {
      return new Intl.RelativeTimeFormat(lang(), { numeric: "auto" }).format(1, "day");
    }
    if (days < 7) { return fmt({ weekday: "long" }, at); }
    return fmt({ day: "numeric", month: "short" }, at);
  }

  // ------------------------------------------------------------ render
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = ROOT + "-" + cls; }
    if (text !== undefined) { e.textContent = text; }
    return e;
  }
  function items(root) { return Array.prototype.slice.call(root.querySelectorAll(C("item"))); }

  function evaluate(root) {
    var date = now();
    var we = weekend(root);
    var f = facts(date, we);
    var result = [];
    items(root).forEach(function (li) {
      var m = match(li.amcTmlGroups, f);
      result.push({ li: li, m: m });
    });
    return { date: date, we: we, f: f, list: result };
  }

  function signature(ev) {
    return ev.list.filter(function (r) { return r.m; }).map(function (r) { return r.li.amcTmlIndex; }).join(",");
  }

  function render(root, announce) {
    var ev = evaluate(root);
    root.amcTmlSig = signature(ev);
    var nowBox = root.querySelector(C("now"));
    var nowList = root.querySelector(C("nowList"));
    var list = root.querySelector(C("list"));
    var restHead = root.querySelector(C("restHead"));
    var clock = root.querySelector(C("clock"));
    if (!nowList || !list) { return; }

    // back to developer order, drop previous annotations
    ev.list.slice().sort(function (a, b) { return a.li.amcTmlIndex - b.li.amcTmlIndex; }).forEach(function (r) {
      var old = r.li.querySelectorAll(C("why") + "," + C("next"));
      for (var i = 0; i < old.length; i++) { old[i].parentNode.removeChild(old[i]); }
      r.li.classList.remove("is-now", "is-urgent");
      list.appendChild(r.li);
    });

    var lifted = ev.list.filter(function (r) { return r.m; }).sort(function (a, b) {
      return (b.m.weight - a.m.weight) || (a.li.amcTmlIndex - b.li.amcTmlIndex);
    });
    var names = [];
    lifted.forEach(function (r) {
      var link = r.li.querySelector(C("link"));
      var why = el("span", "why");
      var kind = r.m.hits[0].kind;
      for (var i = 0; i < r.m.hits.length; i++) { if (r.m.hits[i].kind !== "time") { kind = r.m.hits[i].kind; } }
      var icon = el("span", "whyIcon");
      icon.className += " fa " + (kind === "time" ? "fa-clock-o" : "fa-calendar");
      icon.setAttribute("aria-hidden", "true");
      why.appendChild(icon);
      // workhours and weekday only qualify another token; they are named only when alone.
      var shown = r.m.hits.filter(function (h) { return h.token !== "workhours" && h.token !== "weekday"; });
      if (!shown.length) { shown = r.m.hits; }
      why.appendChild(el("span", "whyText", shown.map(function (h) { return reason(root, h, ev.f, ev.date); }).join(", ")));
      var left = r.m.hits.filter(function (h) { return h.left !== undefined; });
      if (left.length && left[0].left <= 1) { r.li.classList.add("is-urgent"); }
      if (link) { link.appendChild(why); }
      r.li.classList.add("is-now");
      nowList.appendChild(r.li);
      var label = r.li.querySelector(C("label"));
      names.push(label ? label.textContent.trim() : "");
    });

    if (!root.classList.contains(ROOT + "--noNext")) {
      ev.list.forEach(function (r) {
        if (r.m || !r.li.amcTmlGroups.length) { return; }
        var at = nextTime(r.li.amcTmlGroups, ev.date, ev.we);
        var link = r.li.querySelector(C("link"));
        if (!at || !link) { return; }
        var next = el("span", "next");
        var icon = el("span", "nextIcon");
        icon.className += " fa fa-hourglass-half";
        icon.setAttribute("aria-hidden", "true");
        next.appendChild(icon);
        next.appendChild(el("span", "nextText", (root.getAttribute("data-next") || "Next") + ": " + nextText(root, at, ev.date)));
        link.appendChild(next);
      });
    }

    var restCount = list.children.length;
    if (nowBox) { nowBox.hidden = !lifted.length; }
    if (restHead) { restHead.hidden = !lifted.length || !restCount; }
    if (clock) { clock.textContent = fmt({ weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }, ev.date); }
    root.classList.toggle("has-now", lifted.length > 0);

    var toggle = root.querySelector(C("toggle"));
    if (toggle && root.classList.contains(ROOT + "--focus")) {
      toggle.hidden = !lifted.length || !restCount;
      if (!list.id) { list.id = (root.id || ROOT) + "-rest-" + (++uid); }
      toggle.setAttribute("aria-controls", list.id);
      var open = toggle.getAttribute("aria-expanded") === "true";
      root.classList.toggle("is-collapsed", lifted.length > 0 && !open);
    }
    if (announce && names.length) { say(root, root.getAttribute("data-announce") + " " + names.join(", ")); }
  }

  function say(root, text) {
    var status = root.querySelector(C("status"));
    if (!status) { return; }
    status.textContent = "";
    window.setTimeout(function () { status.textContent = text; }, 60);
  }

  function init(root) {
    if (root.amcTmlReady) { return; }
    root.amcTmlReady = true;
    items(root).forEach(function (li, i) {
      li.amcTmlIndex = i;
      li.amcTmlGroups = parse(li.getAttribute("data-moments"));
    });
    root.classList.add("is-enhanced");
    render(root, false);
  }

  // Re-check; only re-render (and announce) when the lifted set changed and the user is not in it.
  function recheck(force) {
    var roots = document.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      if (!root.amcTmlReady) { init(root); continue; }
      if (!force && root.contains(document.activeElement) && document.activeElement !== document.body) { root.amcTmlPending = true; continue; }
      if (force || signature(evaluate(root)) !== root.amcTmlSig) { render(root, !force); }
    }
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(C("toggle"));
    if (!btn) { return; }
    var root = btn.closest("." + ROOT);
    var open = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    root.classList.toggle("is-collapsed", !open);
  });
  document.addEventListener("focusout", function (e) {
    var root = e.target.closest && e.target.closest("." + ROOT);
    if (!root || !root.amcTmlPending) { return; }
    window.setTimeout(function () {
      if (root.contains(document.activeElement)) { return; }
      root.amcTmlPending = false;
      if (signature(evaluate(root)) !== root.amcTmlSig) { render(root, true); }
    }, 0);
  });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { recheck(false); } });
  window.setInterval(function () { if (!document.hidden) { recheck(false); } }, 60000);

  // ------------------------------------------------------------ lifecycle
  var queued = false;
  function scan() {
    queued = false;
    var roots = document.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) { init(roots[i]); }
  }
  function queue() {
    if (queued) { return; }
    queued = true;
    (window.requestAnimationFrame || window.setTimeout)(scan);
  }
  if (window.apex && window.apex.jQuery) { window.apex.jQuery(document).on("apexafterrefresh", queue); }
  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) { if (records[i].addedNodes.length) { queue(); return; } }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", scan); } else { scan(); }

  // Developer helper: amcTplMomentLauncher.at("2026-09-29T15:00") shows the lists at that
  // moment; amcTplMomentLauncher.at(null) goes back to the real clock.
  window.amcTplMomentLauncher = {
    at: function (when) {
      override = when ? new Date(when) : null;
      if (override && isNaN(override.getTime())) { override = null; }
      recheck(true);
    },
    match: function (moments, when, weekendDays) {
      var fake = document.createElement("div");
      fake.setAttribute("data-weekend", weekendDays || "");
      var m = match(parse(moments), facts(new Date(when), weekend(fake)));
      return m ? m.hits.map(function (h) { return h.token; }) : null;
    }
  };
})();
