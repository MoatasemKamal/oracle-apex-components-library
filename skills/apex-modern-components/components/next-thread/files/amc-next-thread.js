/* APEX Modern Components - Next Thread runtime (Next Collection)
 *
 * The report renders every row as a plain list (<ol class="amc-NThread-source">), which is
 * what users see without JavaScript. This file reads those rows and rebuilds them as a
 * thread in the chosen style: chat, auditTimeline, emailThread, activityFeed or caseFile.
 *
 * - Entries are sorted by Created (ISO text), grouped by day under Today, Yesterday or an
 *   Intl day name, and replies are nested one level under the first entry of their thread.
 * - Relative times ("12 minutes ago") come from Intl.RelativeTimeFormat for today, clock
 *   times from Intl.DateTimeFormat for earlier days; a shared minute timer keeps them and
 *   the day names current.
 * - Long threads fold behind "Show N earlier updates"; after a region refresh the thread
 *   remembers that choice, marks entries it has not seen before and announces them.
 * - The entry markup APEX rendered (already escaped) is moved, never re-parsed; any text
 *   this file adds uses textContent only. Mentions are wrapped by splitting text nodes.
 * - Motion is CSS only and is switched off by prefers-reduced-motion. */
(function () {
  "use strict";
  if (window.amcNextThread) {
    return;
  }

  var STYLES = ["chat", "auditTimeline", "emailThread", "activityFeed", "caseFile"];
  var MIN = 60000;
  var DAYMS = 86400000;
  var RUN_GAP = 5 * MIN;
  var registry = {};
  var instances = [];
  var uidSeq = 0;

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
  function uid(p) { uidSeq++; return "amc-nthr-" + p + uidSeq; }
  function clampInt(v, lo, hi, dflt) {
    var n = parseInt(v, 10);
    if (!isFinite(n)) { return dflt; }
    return Math.max(lo, Math.min(hi, n));
  }
  function closest(el, sel) {
    while (el && el.nodeType === 1) {
      if (el.matches(sel)) { return el; }
      el = el.parentElement;
    }
    return null;
  }
  function parseISO(v) {
    var m = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(String(v || ""));
    if (!m) { return null; }
    var d = new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0);
    if (isNaN(d.getTime()) || d.getMonth() !== +m[2] - 1) { return null; }
    return d;
  }
  function dayOf(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function dayKey(d) { return d ? d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() : ""; }
  function dayDiff(a, b) { return Math.round((dayOf(b).getTime() - dayOf(a).getTime()) / DAYMS); }
  function langOf(root) {
    var el = root.closest ? root.closest("[lang]") : null;
    var lang = (el && el.getAttribute("lang")) || document.documentElement.lang || navigator.language || "en";
    try { return Intl.DateTimeFormat.supportedLocalesOf([lang]).length ? lang : "en"; } catch (e) { return "en"; }
  }
  function upperFirst(s, lang) {
    s = String(s || "");
    try { return s.charAt(0).toLocaleUpperCase(lang) + s.slice(1); } catch (e) { return s.charAt(0).toUpperCase() + s.slice(1); }
  }

  var I18N = {
    today: "Today", yesterday: "Yesterday", earlierOne: "Show 1 earlier update", earlierOther: "Show %0 earlier updates",
    shownOne: "1 earlier update shown", shownOther: "%0 earlier updates shown", newOne: "1 new update", newOther: "%0 new updates",
    mentioned: "Mentioned", to: "To", replyingTo: "Replying to", commented: "commented", replied: "replied",
    noted: "added an internal note", open: "Show message", updatesOne: "update", updatesOther: "updates",
    empty: "No updates yet. Add the first comment to start the thread."
  };
  function readI18n(root) {
    var src = root.querySelector(".amc-NThread-i18n");
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
  function Thread(root) {
    this.root = root;
    var st = root.getAttribute("data-layout");
    this.style = STYLES.indexOf(st) >= 0 ? st : "chat";
    this.show = clampInt(root.getAttribute("data-show"), 0, 200, 6);
    this.newestFirst = root.getAttribute("data-order") === "newestFirst";
    this.lang = langOf(root);
    this.i18n = readI18n(root);
    var region = root.parentElement ? closest(root.parentElement, "[id]") : null;
    this.key = region ? region.id : "";
    this.state = this.key ? (registry[this.key] || (registry[this.key] = { seen: null, expanded: false, open: {} })) : { seen: null, expanded: false, open: {} };
    try { this.plural = new Intl.PluralRules(this.lang); } catch (e) { this.plural = null; }
    try { this.nf = new Intl.NumberFormat(this.lang); } catch (e2) { this.nf = null; }
    try { this.rtf = new Intl.RelativeTimeFormat(this.lang, { numeric: "auto" }); } catch (e3) { this.rtf = null; }
    this.fClock = new Intl.DateTimeFormat(this.lang, { hour: "numeric", minute: "2-digit" });
    this.fFull = new Intl.DateTimeFormat(this.lang, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });
    this.fDay = new Intl.DateTimeFormat(this.lang, { weekday: "long", day: "numeric", month: "long" });
    this.fDayYear = new Intl.DateTimeFormat(this.lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    this.fShort = new Intl.DateTimeFormat(this.lang, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
    this.read();
    this.build();
    root.classList.add("is-ready");
    root.setAttribute("data-amc-init", "Y");
    root.amcNThread = this;
  }

  Thread.prototype.fmt = function (one, other, n) {
    var cat = this.plural ? this.plural.select(n) : (n === 1 ? "one" : "other");
    return (cat === "one" ? one : other).replace("%0", this.nf ? this.nf.format(n) : String(n));
  };

  Thread.prototype.read = function () {
    var byId = {};
    var list = [];
    each(this.root.querySelectorAll(".amc-NThread-source > .amc-NThread-row"), function (li, i) {
      var entry = li.querySelector(".amc-NThread-entry");
      if (!entry) { return; }
      var id = trim(li.getAttribute("data-id")) || "~" + i;
      if (byId[id]) { id = id + "~" + i; }
      var kind = /amc-NThread-row--(status|system|attachment)/.exec(li.className);
      var author = entry.querySelector(".amc-NThread-author");
      var d = parseISO(li.getAttribute("data-created"));
      var n = {
        id: id,
        parentId: trim(li.getAttribute("data-parent")),
        li: li,
        entry: entry,
        kind: kind ? kind[1] : "comment",
        internal: li.classList.contains("is-internal"),
        mine: li.classList.contains("is-mine"),
        author: author ? trim(author.textContent) : "",
        date: d,
        t: d ? d.getTime() : Infinity,
        order: i,
        mentions: trim(li.getAttribute("data-mentions")).split("|").map(trim).filter(Boolean),
        replies: [],
        p: null
      };
      byId[id] = n;
      list.push(n);
    });
    list.forEach(function (n) {
      var p = n.parentId ? byId[n.parentId] : null;
      if (p && p !== n) { n.p = p; }
    });
    list.forEach(function (n) {
      var c = n;
      var steps = 0;
      while (c.p) {
        if (c.p === n || ++steps > list.length) { n.p = null; break; }
        c = c.p;
      }
    });
    var tops = [];
    list.forEach(function (n) {
      if (!n.p) { tops.push(n); return; }
      var r = n.p;
      while (r.p) { r = r.p; }
      n.top = r;
      if (n.p !== r) { n.replyTo = n.p; }
      r.replies.push(n);
    });
    function byTime(a, b) { return a.t === b.t ? a.order - b.order : (a.t < b.t ? -1 : 1); }
    tops.sort(byTime);
    tops.forEach(function (tp) { tp.replies.sort(byTime); });
    this.byId = byId;
    this.list = list;
    this.tops = tops;
  };

  /* ---------- Build ---------- */
  Thread.prototype.build = function () {
    var self = this;
    var t = this.i18n;
    var app = h("div", "amc-NThread-app");
    this.app = app;
    this.live = set(h("span", "amc-NThread-sr"), { "aria-live": "polite", "aria-atomic": "true" });
    if (!this.tops.length) {
      app.appendChild(h("p", "amc-NThread-empty", t.empty));
      app.appendChild(this.live);
      this.root.appendChild(app);
      this.state.seen = {};
      return;
    }
    var hidden = this.state.expanded || !this.show ? 0 : Math.max(0, this.tops.length - this.show);
    this.hiddenCount = hidden;
    var shown = this.newestFirst ? this.tops.slice().reverse() : this.tops;
    var days = h("ol", "amc-NThread-days");
    days.id = uid("days");
    this.days = days;
    var group = null;
    var lastKey = null;
    var prev = null;
    shown.forEach(function (n) {
      var k = dayKey(n.date);
      if (k !== lastKey || !group) {
        group = h("li", "amc-NThread-day");
        var head = h("h3", "amc-NThread-dayHead");
        var label = h("span", "amc-NThread-dayLabel");
        head.appendChild(label);
        group.amcDate = n.date;
        group.amcLabel = label;
        group.appendChild(head);
        group.appendChild(h("ol", "amc-NThread-list"));
        days.appendChild(group);
        lastKey = k;
        prev = null;
      }
      var li = n.li;
      li.classList.add("amc-NThread-item");
      n.entry.setAttribute("tabindex", "-1");
      if (self.tops.indexOf(n) < hidden) { li.hidden = true; n.folded = true; }
      group.lastChild.appendChild(li);
      if (n.replies.length) {
        var ol = h("ol", "amc-NThread-replies");
        n.replies.forEach(function (r) {
          r.li.classList.add("amc-NThread-item", "is-reply");
          r.entry.setAttribute("tabindex", "-1");
          ol.appendChild(r.li);
          self.decorate(r, null);
        });
        li.appendChild(ol);
        li.classList.add("has-replies");
      }
      self.decorate(n, prev);
      prev = n;
    });
    each(days.children, function (g) {
      var list = g.lastChild;
      var visible = Array.prototype.some.call(list.children, function (li) { return !li.hidden; });
      g.hidden = !visible;
    });
    if (hidden) {
      var more = set(h("button", "amc-NThread-more"), { type: "button", "aria-controls": days.id, "data-amc-act": "earlier" });
      var icon = set(h("span", "amc-NThread-moreIcon fa fa-history"), { "aria-hidden": "true" });
      more.appendChild(icon);
      more.appendChild(h("span", "amc-NThread-moreText", this.fmt(t.earlierOne, t.earlierOther, hidden)));
      this.more = more;
    }
    if (this.more && !this.newestFirst) { app.appendChild(this.more); }
    app.appendChild(days);
    if (this.more && this.newestFirst) { app.appendChild(this.more); }
    app.appendChild(this.live);
    this.root.appendChild(app);
    if (this.style === "emailThread") { this.fold(); }
    this.tick();
    this.markNew();
  };

  Thread.prototype.decorate = function (n, prev) {
    var t = this.i18n;
    var li = n.li;
    var head = n.entry.querySelector(".amc-NThread-head");
    var verb = n.entry.querySelector(".amc-NThread-verb");
    if (verb && !trim(verb.textContent) && n.kind === "comment" && this.style === "activityFeed") {
      verb.textContent = n.internal ? t.noted : (n.top ? t.replied : t.commented);
      if (n.internal) { li.classList.add("is-noted"); }
    }
    if (n.replyTo && head) {
      var rt = h("span", "amc-NThread-replyTo", t.replyingTo + " " + n.replyTo.author);
      head.appendChild(rt);
    }
    // Chat: consecutive messages from one author within five minutes read as one run.
    if (prev && !n.top && /^(comment|attachment)$/.test(n.kind) && /^(comment|attachment)$/.test(prev.kind) && prev.author === n.author &&
        prev.mine === n.mine && prev.internal === n.internal && Math.abs(n.t - prev.t) < RUN_GAP && !prev.replies.length) {
      li.classList.add("is-cont");
    }
    this.mention(n);
    if (this.style === "emailThread" && n.mentions.length && head && !n.top) {
      var to = h("span", "amc-NThread-to", t.to + " " + n.mentions.join(", "));
      head.appendChild(to);
    }
  };

  Thread.prototype.mention = function (n) {
    if (!n.mentions.length) { return; }
    var body = n.entry.querySelector(".amc-NThread-body");
    var missing = [];
    var self = this;
    n.mentions.forEach(function (name) {
      if (!body || !self.wrapName(body, name)) { missing.push(name); }
    });
    if (missing.length && this.style !== "emailThread") {
      var main = n.entry.querySelector(".amc-NThread-main");
      var p = h("p", "amc-NThread-mentions");
      p.appendChild(document.createTextNode(this.i18n.mentioned + " "));
      missing.forEach(function (name, i) {
        if (i) { p.appendChild(document.createTextNode(", ")); }
        p.appendChild(h("span", "amc-NThread-mention", "@" + name));
      });
      main.appendChild(p);
    }
  };

  /* Wraps "@Name" or "Name" in the body's text nodes; returns true when found. */
  Thread.prototype.wrapName = function (body, name) {
    var lower = name.toLowerCase();
    var found = false;
    var walker = document.createTreeWalker(body, 4, null);
    var nodes = [];
    var node;
    while ((node = walker.nextNode())) {
      if (!closest(node.parentNode, ".amc-NThread-mention")) { nodes.push(node); }
    }
    nodes.forEach(function (tn) {
      var text = tn.nodeValue;
      var idx = text.toLowerCase().indexOf(lower);
      if (idx < 0 || found) { return; }
      var start = idx > 0 && text.charAt(idx - 1) === "@" ? idx - 1 : idx;
      var end = idx + name.length;
      var after = tn.splitText(start);
      after.splitText(end - start);
      var span = h("span", "amc-NThread-mention", after.nodeValue);
      tn.parentNode.replaceChild(span, after);
      found = true;
    });
    return found;
  };

  /* Email: every top-level message except the latest folds to one line. */
  Thread.prototype.fold = function () {
    var self = this;
    var latest = null;
    this.tops.forEach(function (n) { if (n.kind === "comment" || n.kind === "attachment") { latest = n; } });
    this.tops.forEach(function (n) {
      if (n.kind !== "comment" && n.kind !== "attachment") { return; }
      var main = n.entry.querySelector(".amc-NThread-main");
      var body = n.entry.querySelector(".amc-NThread-body");
      var btn = set(h("button", "amc-NThread-open"), { type: "button", "data-amc-act": "open" });
      var excerpt = h("span", "amc-NThread-excerpt", body ? trim(body.textContent).replace(/\s+/g, " ").slice(0, 160) : "");
      excerpt.setAttribute("aria-hidden", "true");
      btn.setAttribute("aria-label", self.i18n.open + ": " + n.author + (n.date ? ", " + self.fFull.format(n.date) : ""));
      main.insertBefore(btn, main.firstChild);
      var head = n.entry.querySelector(".amc-NThread-head");
      if (head && head.nextSibling) { main.insertBefore(excerpt, head.nextSibling); } else { main.appendChild(excerpt); }
      n.openBtn = btn;
      self.setFold(n, n !== latest && !self.state.open[n.id]);
    });
  };
  Thread.prototype.setFold = function (n, folded) {
    n.li.classList.toggle("is-folded", folded);
    if (n.openBtn) { n.openBtn.setAttribute("aria-expanded", folded ? "false" : "true"); }
    if (!folded) { this.state.open[n.id] = true; } else { delete this.state.open[n.id]; }
  };

  Thread.prototype.expand = function () {
    var count = this.hiddenCount;
    if (!count) { return; }
    this.tops.forEach(function (n) {
      if (n.folded) {
        n.li.hidden = false;
        n.folded = false;
      }
    });
    each(this.days.children, function (g) { g.hidden = false; });
    this.hiddenCount = 0;
    this.state.expanded = true;
    var btn = this.more;
    var hadFocus = btn && document.activeElement === btn;
    if (btn && btn.parentNode) { btn.parentNode.removeChild(btn); }
    this.more = null;
    // Focus the first revealed entry in reading order, so keyboard users continue there.
    var target = this.newestFirst ? this.tops[count - 1] : this.tops[0];
    if (hadFocus && target) { target.entry.focus(); }
    this.live.textContent = this.fmt(this.i18n.shownOne, this.i18n.shownOther, count);
  };

  /* ---------- Time ---------- */
  Thread.prototype.rel = function (d, now) {
    if (!d) { return ""; }
    var diff = now - d.getTime();
    if (dayDiff(d, new Date(now)) === 0 && diff >= -MIN && this.rtf) {
      if (diff < 45000) { return this.rtf.format(0, "second"); }
      if (diff < 3600000) { return this.rtf.format(-Math.round(diff / MIN), "minute"); }
      return this.rtf.format(-Math.floor(diff / 3600000), "hour");
    }
    return this.fClock.format(d);
  };
  Thread.prototype.dayLabel = function (d, now) {
    if (!d) { return ""; }
    var today = new Date(now);
    var dd = dayDiff(d, today);
    if (dd === 0) { return this.i18n.today; }
    if (dd === 1) { return this.i18n.yesterday; }
    return upperFirst((d.getFullYear() === today.getFullYear() ? this.fDay : this.fDayYear).format(d), this.lang);
  };
  Thread.prototype.tick = function () {
    var self = this;
    var now = Date.now();
    this.list.forEach(function (n) {
      var tm = n.entry.querySelector(".amc-NThread-time");
      if (!tm || !n.date) { return; }
      // A reply on another day than its thread's day heading carries its own date.
      var txt = n.top && n.top.date && dayDiff(n.top.date, n.date) !== 0 && dayDiff(n.date, new Date(now)) !== 0 ?
        self.fShort.format(n.date) : self.rel(n.date, now);
      if (tm.textContent !== txt) { tm.textContent = txt; }
      tm.setAttribute("title", self.fFull.format(n.date));
    });
    if (this.days) {
      each(this.days.children, function (g) {
        var lab = g.amcLabel;
        var txt = self.dayLabel(g.amcDate, now);
        if (lab && lab.textContent !== txt) { lab.textContent = txt; }
        g.classList.toggle("is-today", !!g.amcDate && dayDiff(g.amcDate, new Date(now)) === 0);
      });
    }
  };

  /* ---------- New entries after a refresh ---------- */
  Thread.prototype.markNew = function () {
    var seen = this.state.seen;
    var ids = {};
    var fresh = [];
    this.list.forEach(function (n) {
      ids[n.id] = true;
      if (seen && !seen[n.id]) { fresh.push(n); }
    });
    this.state.seen = ids;
    if (!fresh.length) { return; }
    fresh.forEach(function (n) {
      n.li.classList.add("is-new");
      if (n.li.hidden) { n.li.hidden = false; }
    });
    this.live.textContent = this.fmt(this.i18n.newOne, this.i18n.newOther, fresh.length);
    var last = fresh[fresh.length - 1];
    var r = last.entry.getBoundingClientRect();
    if (r.bottom > (window.innerHeight || 0) || r.top < 0) {
      try { last.entry.scrollIntoView({ block: "nearest" }); } catch (e) { last.entry.scrollIntoView(false); }
    }
  };

  /* ---------- Events ---------- */
  function onClick(e) {
    var act = closest(e.target, "[data-amc-act]");
    var root = act ? closest(act, ".amc-NThread") : null;
    var th = root && root.amcNThread;
    if (!th) { return; }
    var a = act.getAttribute("data-amc-act");
    if (a === "earlier") {
      th.expand();
    } else if (a === "open") {
      var li = closest(act, ".amc-NThread-item");
      var n = li && th.byId[li.getAttribute("data-id")];
      if (n) { th.setFold(n, !li.classList.contains("is-folded")); }
    }
  }

  function init(scope) {
    each((scope || document).querySelectorAll(".amc-NThread:not([data-amc-init])"), function (root) {
      try {
        instances.push(new Thread(root));
      } catch (err) {
        root.setAttribute("data-amc-init", "E");
        if (window.console) { window.console.warn("amcNextThread", err); }
      }
    });
    instances = instances.filter(function (c) { return document.documentElement.contains(c.root); });
  }
  function refresh(scope) { init(scope && scope.querySelectorAll ? scope : document); }
  function minute() {
    instances.forEach(function (th) { th.tick(); });
  }

  function start() {
    init(document);
    document.addEventListener("click", onClick);
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
    var ms = Date.now();
    window.setTimeout(function () {
      minute();
      window.setInterval(minute, MIN);
    }, MIN - (ms % MIN) + 50);
  }

  window.amcNextThread = { init: init, refresh: refresh };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
