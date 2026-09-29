/* APEX Modern Components - Next Compare runtime (Next Collection)
 *
 * The report renders one row per option and criterion as a plain list, which is what users
 * see without JavaScript. This file pivots those rows into an options x criteria matrix:
 *
 * - Options and criteria keep the order of their first row; groups become bands.
 * - Scores: SCORE when given; otherwise, for criteria with Better = lower / higher, the first
 *   number in each value is scored with the tender formula (lowest / value x max, or
 *   value / highest x max).
 * - Weighted total (0-100) = sum(weight x score / max) / sum(weight of scored criteria) x 100.
 *   Ranks use competition ranking (1, 1, 3); rank 1 is the leader, or a tie.
 * - Best per criterion: highest score, else the lowest / highest number; never when all equal.
 * - Identical rows (same value for every option) can be hidden; an option can be pinned as the
 *   first column (and is the baseline of Diff View).
 * - The header row and the criterion column are sticky; narrow regions get one option at a
 *   time with swipe and previous / next buttons.
 * - Numbers are formatted with Intl (Western digits on Arabic pages). Text is inserted with
 *   textContent only; only parsed numbers reach CSS. Columns glide after a pin (FLIP) unless
 *   reduced motion is on. */
(function () {
  "use strict";
  if (window.amcNextCompare) {
    return;
  }

  var STYLES = ["tenderTable", "specSheet", "scorecard", "sideCards", "diffView"];
  var FLAGS = { success: "success", warning: "warning", danger: "danger", y: "info", info: "info" };
  var YES = /^(yes|y|included|available|supported|true|\u2713|\u2714|\u0646\u0639\u0645|\u0645\u062A\u0648\u0641\u0631)$/i;
  var NO = /^(no|n|not included|not available|none|false|\u2717|\u2718|\u0644\u0627|\u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631)$/i;
  var mqReduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var uidSeq = 0;

  function reduced() { return !!(mqReduce && mqReduce.matches); }
  function h(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) { el.className = cls; }
    if (text !== undefined && text !== null) { el.textContent = text; }
    return el;
  }
  function bdi(tag, cls, text) {
    var el = h(tag, cls);
    el.appendChild(h("bdi", "", text));
    return el;
  }
  function add(parent) {
    for (var i = 1; i < arguments.length; i++) {
      if (arguments[i]) { parent.appendChild(arguments[i]); }
    }
    return parent;
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function clean(t) { return String(t === undefined || t === null ? "" : t).replace(/\s+/g, " ").trim(); }
  function fill(t, a, b) { return String(t).replace("%0", a).replace("%1", b === undefined ? "" : b); }
  function uid() { uidSeq++; return "amc-ncmp-" + uidSeq; }
  function icon(name) {
    var i = h("span", "amc-NCompare-icon fa " + name);
    i.setAttribute("aria-hidden", "true");
    return i;
  }
  function sr(text) { return h("span", "amc-NCompare-sr", text); }

  function latinDigits(s) {
    return String(s)
      .replace(/[\u0660-\u0669]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); })
      .replace(/[\u06F0-\u06F9]/g, function (c) { return String(c.charCodeAt(0) - 0x06F0); })
      .replace(/\u066B/g, ".").replace(/\u066C/g, ",").replace(/\u2212/g, "-");
  }
  function plainNum(t) {
    var s = latinDigits(clean(t)).replace(/[\s,]/g, "");
    if (!s) { return NaN; }
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }
  // First number in a display value, with its prefix and suffix ("SAR 412,500", "45 days").
  function valueNum(t) {
    var s = latinDigits(clean(t));
    var re = /-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/g;
    var m = re.exec(s);
    if (!m) { return null; }
    var n = parseFloat(m[0].replace(/,/g, ""));
    if (!isFinite(n)) { return null; }
    var rest = s.slice(m.index + m[0].length);
    // Unit: the word right after the number ("days", "m\u00B2", "%"); more numbers make it text.
    var unit = /^\s*([^\s\d,;]{1,12})/.exec(rest);
    return { n: n, pre: s.slice(0, m.index).trim(), post: unit ? unit[1] : "", single: !re.exec(s) };
  }
  function langOf(el) {
    var host = el.closest ? el.closest("[lang]") : null;
    return (host && host.getAttribute("lang")) || document.documentElement.lang || "en";
  }
  function numLocale(lang) {
    if (/^ar\b/i.test(lang) && !/-u-.*nu-/.test(lang)) { return lang + (/-u-/.test(lang) ? "-nu-latn" : "-u-nu-latn"); }
    return lang;
  }
  function nf(loc, opts) {
    try { return new Intl.NumberFormat(loc, opts); } catch (e) { return new Intl.NumberFormat("en", opts); }
  }

  /* ---------- Reading ---------- */
  function field(row, key) {
    var el = row.querySelector('[data-f="' + key + '"]');
    return el ? clean(el.textContent) : "";
  }
  function read(root) {
    var options = [];
    var optIdx = {};
    var criteria = [];
    var critIdx = {};
    var groups = [];
    var groupIdx = {};
    var cells = {};
    each(root.querySelectorAll(".amc-NCompare-source > .amc-NCompare-row"), function (row) {
      var on = field(row, "option");
      var cn = field(row, "criterion");
      if (!on || !cn) { return; }
      if (!(on in optIdx)) { optIdx[on] = options.length; options.push({ name: on, detail: "", i: options.length }); }
      var o = options[optIdx[on]];
      if (!o.detail) { o.detail = field(row, "optionDetail"); }
      if (!(cn in critIdx)) {
        var g = field(row, "group");
        if (g && !(g in groupIdx)) { groupIdx[g] = groups.length; groups.push({ name: g, weight: 0 }); }
        critIdx[cn] = criteria.length;
        criteria.push({ name: cn, group: g, weight: NaN, better: "", i: criteria.length });
      }
      var c = criteria[critIdx[cn]];
      if (!isFinite(c.weight)) { c.weight = plainNum(field(row, "weight")); }
      if (!c.better) {
        var b = clean(row.getAttribute("data-better")).toLowerCase();
        if (b === "lower" || b === "higher") { c.better = b; }
      }
      cells[o.i + ":" + c.i] = {
        value: field(row, "value"),
        score: plainNum(field(row, "score")),
        note: field(row, "note"),
        flag: FLAGS[clean(row.getAttribute("data-highlight")).toLowerCase()] || ""
      };
    });
    return { options: options, criteria: criteria, groups: groups, cells: cells };
  }

  /* ---------- Calculation ---------- */
  function compute(m, scoreMax) {
    var anyWeight = m.criteria.some(function (c) { return isFinite(c.weight) && c.weight > 0; });
    m.criteria.forEach(function (c) {
      var list = m.options.map(function (o) { return m.cells[o.i + ":" + c.i] || null; });
      var given = list.some(function (x) { return x && isFinite(x.score); });
      var nums = list.map(function (x) { return x ? valueNum(x.value) : null; });
      c.derived = false;
      if (!given && c.better) {
        var vals = nums.filter(function (v) { return v && v.n > 0; }).map(function (v) { return v.n; });
        if (vals.length) {
          var lo = Math.min.apply(null, vals);
          var hi = Math.max.apply(null, vals);
          list.forEach(function (x, k) {
            if (!x) { return; }
            var v = nums[k];
            x.score = v && v.n > 0 ? (c.better === "lower" ? lo / v.n : v.n / hi) * scoreMax : 0;
            x.derivedScore = true;
          });
          c.derived = true;
          given = true;
        }
      }
      c.scored = given;
      c.w = !given ? 0 : anyWeight ? (isFinite(c.weight) && c.weight > 0 ? c.weight : 0) : 1;
      // Best cells.
      var keyVals = list.map(function (x, k) {
        if (!x) { return null; }
        if (given && isFinite(x.score)) { return x.score; }
        if (c.better && nums[k]) { return c.better === "lower" ? -nums[k].n : nums[k].n; }
        return null;
      });
      var defined = keyVals.filter(function (v) { return v !== null; });
      c.best = {};
      if (defined.length > 1) {
        var top = Math.max.apply(null, defined);
        var allSame = defined.every(function (v) { return Math.abs(v - top) < 1e-9; });
        if (!allSame) {
          keyVals.forEach(function (v, k) { if (v !== null && Math.abs(v - top) < 1e-9) { c.best[k] = true; } });
        }
      }
      // Identical: every option has the same value text (and score).
      var texts = list.map(function (x) { return x ? clean(x.value).toLowerCase() + "|" + (isFinite(x.score) ? Math.round(x.score * 1000) : "") : null; });
      c.identical = m.options.length > 1 && texts.every(function (t) { return t !== null && t === texts[0]; });
      c.nums = nums;
    });
    m.groups.forEach(function (g) {
      g.weight = m.criteria.reduce(function (a, c) { return a + (c.group === g.name && isFinite(c.weight) ? c.weight : 0); }, 0);
    });
    var sumW = m.criteria.reduce(function (a, c) { return a + c.w; }, 0);
    // Totals need an evaluation: a Score somewhere or a Weight. Better alone only marks best values.
    var anyGiven = m.criteria.some(function (c) { return c.scored && !c.derived; });
    m.hasTotals = sumW > 0 && (anyWeight || anyGiven);
    m.options.forEach(function (o) {
      if (!m.hasTotals) { o.total = null; return; }
      var t = 0;
      m.criteria.forEach(function (c) {
        if (!c.w) { return; }
        var x = m.cells[o.i + ":" + c.i];
        var s = x && isFinite(x.score) ? Math.max(0, Math.min(scoreMax, x.score)) : 0;
        t += c.w * s / scoreMax;
      });
      o.total = Math.round((t / sumW) * 1000) / 10;
    });
    if (m.hasTotals) {
      m.options.forEach(function (o) {
        o.rank = 1 + m.options.filter(function (p) { return p.total > o.total + 1e-9; }).length;
      });
      var leaders = m.options.filter(function (o) { return o.rank === 1; });
      m.tie = leaders.length > 1;
      leaders.forEach(function (o) { o.leader = true; });
    }
    return m;
  }

  /* ---------- Instance ---------- */
  function labels(root) {
    var el = root.querySelector(".amc-NCompare-i18n");
    var keys = ["criterion", "weight", "total", "rank", "best", "leader", "tied", "pin", "unpin", "pinned", "unpinned", "hide", "hidden",
      "none-identical", "shown", "prev", "next", "position", "baseline", "same", "better", "worse", "changed", "yes", "no", "standings", "points",
      "calculated", "missing", "success", "warning", "danger", "info", "caption"];
    var L = {};
    keys.forEach(function (k) { L[k] = (el && el.getAttribute("data-" + k)) || k; });
    return L;
  }

  function Cmp(root) {
    this.root = root;
    this.style = root.getAttribute("data-variant");
    if (STYLES.indexOf(this.style) < 0) { this.style = "tenderTable"; }
    this.L = labels(root);
    this.lang = langOf(root);
    this.loc = numLocale(this.lang);
    this.nf1 = nf(this.loc, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    this.nfs = nf(this.loc, { maximumFractionDigits: 2 });
    var max = plainNum(root.getAttribute("data-score-max"));
    this.max = isFinite(max) && max > 0 ? max : 10;
    this.totalsOn = root.getAttribute("data-totals") !== "N";
    this.m = compute(read(root), this.max);
    var pinName = clean(root.getAttribute("data-pinned"));
    this.pinned = -1;
    for (var i = 0; i < this.m.options.length; i++) {
      if (this.m.options[i].name.toLowerCase() === pinName.toLowerCase() && pinName) { this.pinned = i; }
    }
    this.hideIdentical = root.getAttribute("data-hide-identical") === "Y" || this.style === "diffView";
    this.id = uid();
  }

  Cmp.prototype.order = function () {
    var opts = this.m.options.slice();
    if (this.pinned >= 0) {
      var p = opts.splice(this.pinned, 1)[0];
      opts.unshift(p);
    }
    return opts;
  };
  Cmp.prototype.baseline = function () {
    return this.pinned >= 0 ? this.pinned : 0;
  };
  Cmp.prototype.visibleCriteria = function () {
    var hide = this.hideIdentical;
    return this.m.criteria.filter(function (c) { return !hide || !c.identical; });
  };
  Cmp.prototype.ordinal = function (n) {
    if (!/^en\b/i.test(this.lang)) { return nf(this.loc, {}).format(n); }
    var s = ["th", "st", "nd", "rd"];
    var v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  /* ---------- Building blocks ---------- */
  Cmp.prototype.optHead = function (o, tag) {
    var L = this.L;
    var box = h(tag || "div", "amc-NCompare-optHead");
    var name = bdi("span", "amc-NCompare-optName", o.name);
    add(box, name);
    if (o.detail) { box.appendChild(bdi("span", "amc-NCompare-optDetail", o.detail)); }
    var meta = h("span", "amc-NCompare-optMeta");
    if (this.style === "diffView" && o.i === this.baseline()) {
      meta.appendChild(h("span", "amc-NCompare-chip amc-NCompare-chip--base", L.baseline));
    }
    if (this.totalsOn && this.m.hasTotals) {
      if (o.leader) {
        var lead = h("span", "amc-NCompare-chip amc-NCompare-chip--lead");
        add(lead, icon("fa-trophy"), h("span", "", this.m.tie ? L.tied : L.leader));
        meta.appendChild(lead);
      } else {
        var rk = h("span", "amc-NCompare-chip amc-NCompare-chip--rank", this.ordinal(o.rank));
        rk.setAttribute("title", L.rank + " " + o.rank);
        meta.appendChild(rk);
      }
    }
    var pinned = o.i === this.pinned;
    var b = h("button", "amc-NCompare-pin" + (pinned ? " is-on" : ""));
    b.type = "button";
    b.setAttribute("data-amc-act", "pin");
    b.setAttribute("data-opt", String(o.i));
    b.setAttribute("aria-pressed", pinned ? "true" : "false");
    b.setAttribute("aria-label", fill(pinned ? L.unpin : L.pin, o.name));
    b.setAttribute("title", fill(pinned ? L.unpin : L.pin, o.name));
    b.appendChild(icon("fa-thumb-tack"));
    meta.appendChild(b);
    box.appendChild(meta);
    return box;
  };

  Cmp.prototype.cellContent = function (o, c, box) {
    var L = this.L;
    var x = this.m.cells[o.i + ":" + c.i];
    var idx = this.m.options.indexOf(o);
    if (!x || !clean(x.value) && !isFinite(x.score)) {
      box.appendChild(h("span", "amc-NCompare-missing", "\u2013"));
      box.appendChild(sr(L.missing));
      return "";
    }
    var cls = "";
    var val = clean(x.value);
    var valEl;
    if (this.style === "specSheet" && (YES.test(val) || NO.test(val))) {
      var yes = YES.test(val);
      valEl = h("span", "amc-NCompare-val amc-NCompare-yn " + (yes ? "is-yes" : "is-no"));
      add(valEl, icon(yes ? "fa-check" : "fa-minus"), h("span", "", yes ? L.yes : L.no));
    } else {
      valEl = bdi("span", "amc-NCompare-val", val || this.nfs.format(x.score));
    }
    box.appendChild(valEl);
    if (c.best[idx]) {
      cls += " is-best";
      var best = h("span", "amc-NCompare-best");
      best.setAttribute("title", L.best);
      add(best, icon("fa-check-circle"), sr(L.best));
      valEl.appendChild(best);
    }
    // Score, as a bar in Scorecard, as a small figure in Tender Table and Side Cards.
    if (isFinite(x.score) && c.scored && (this.style === "scorecard" || this.style === "tenderTable" || this.style === "sideCards")) {
      var sc = Math.max(0, Math.min(this.max, x.score));
      var line = h("span", "amc-NCompare-score");
      if (this.style === "scorecard") {
        var bar = h("span", "amc-NCompare-bar");
        bar.setAttribute("aria-hidden", "true");
        var fillEl = h("span", "amc-NCompare-barFill");
        fillEl.style.setProperty("--amc-ncmp-s", String(Math.round((sc / this.max) * 1000) / 1000));
        bar.appendChild(fillEl);
        line.appendChild(bar);
      }
      var st = h("span", "amc-NCompare-scoreText", this.nfs.format(Math.round(sc * 10) / 10) + " / " + this.nfs.format(this.max));
      if (x.derivedScore) { st.setAttribute("title", L.calculated); }
      line.appendChild(st);
      box.appendChild(line);
    }
    // Diff against the baseline.
    if (this.style === "diffView") {
      var bi = this.baseline();
      if (o.i !== bi) {
        var bx = this.m.cells[bi + ":" + c.i];
        var d = this.diff(c, x, bx);
        if (d) {
          cls += " is-" + d.kind;
          var mark = h("span", "amc-NCompare-delta amc-NCompare-delta--" + d.kind);
          mark.appendChild(h("span", "amc-NCompare-deltaSign", d.sign));
          if (d.text) { mark.appendChild(bdi("span", "amc-NCompare-deltaText", d.text)); }
          mark.appendChild(sr(d.label));
          box.appendChild(mark);
        }
      } else {
        cls += " is-base";
      }
    }
    if (x.note) { box.appendChild(bdi("span", "amc-NCompare-note", x.note)); }
    if (x.flag) {
      cls += " is-flag-" + x.flag;
      var f = h("span", "amc-NCompare-flag amc-NCompare-flag--" + x.flag);
      add(f, icon(x.flag === "danger" ? "fa-exclamation-circle" : x.flag === "warning" ? "fa-exclamation-triangle" : x.flag === "success" ? "fa-star" : "fa-info-circle"), h("span", "", L[x.flag]));
      box.appendChild(f);
    }
    return cls;
  };

  Cmp.prototype.diff = function (c, x, bx) {
    var L = this.L;
    if (!bx) { return null; }
    var a = valueNum(x.value);
    var b = valueNum(bx.value);
    if (a && b && a.single && b.single && clean(x.value) !== clean(bx.value)) {
      var dv = Math.round((a.n - b.n) * 100) / 100;
      if (dv === 0) { return { kind: "same", sign: "=", text: "", label: L.same }; }
      var kind = !c.better ? "changed" : (dv < 0) === (c.better === "lower") ? "better" : "worse";
      var unit = a.post || b.post;
      var pre = a.pre || b.pre;
      var num = this.nfs.format(Math.abs(dv));
      return { kind: kind, sign: dv > 0 ? "+" : "\u2212", text: (pre ? pre + " " : "") + num + (unit ? " " + unit : ""), label: kind === "better" ? L.better : kind === "worse" ? L.worse : L.changed };
    }
    if (clean(x.value).toLowerCase() === clean(bx.value).toLowerCase()) {
      return { kind: "same", sign: "=", text: "", label: L.same };
    }
    var sa = isFinite(x.score) ? x.score : NaN;
    var sb = isFinite(bx.score) ? bx.score : NaN;
    var k2 = isFinite(sa) && isFinite(sb) && sa !== sb ? (sa > sb ? "better" : "worse") : "changed";
    return { kind: k2, sign: k2 === "better" ? "+" : k2 === "worse" ? "\u2212" : "~", text: "", label: k2 === "better" ? L.better : k2 === "worse" ? L.worse : L.changed };
  };

  Cmp.prototype.critLabel = function (c, tag) {
    var el = h(tag, "amc-NCompare-crit");
    el.appendChild(bdi("span", "amc-NCompare-critName", c.name));
    if (this.totalsOn && this.m.hasTotals && c.w && (this.style === "tenderTable" || this.style === "scorecard" || this.style === "sideCards")) {
      var w = h("span", "amc-NCompare-weight", nf(this.loc, { style: "percent", maximumFractionDigits: 1 }).format(isFinite(c.weight) ? c.weight / 100 : c.w / this.m.criteria.filter(function (k) { return k.w; }).length));
      w.setAttribute("title", this.L.weight);
      add(w, sr(" " + this.L.weight));
      el.appendChild(w);
    }
    return el;
  };

  Cmp.prototype.groupsOf = function (crit) {
    // [{group, criteria[]}] in order; criteria without group go in an unnamed block.
    var out = [];
    var map = {};
    crit.forEach(function (c) {
      var k = c.group || "";
      if (!(k in map)) { map[k] = out.length; out.push({ name: k, list: [] }); }
      out[map[k]].list.push(c);
    });
    return out;
  };
  Cmp.prototype.groupWeight = function (name) {
    for (var i = 0; i < this.m.groups.length; i++) {
      if (this.m.groups[i].name === name) { return this.m.groups[i].weight; }
    }
    return 0;
  };

  /* ---------- Table ---------- */
  Cmp.prototype.table = function (opts, crit) {
    var self = this;
    var L = this.L;
    var scroll = h("div", "amc-NCompare-scroll");
    scroll.setAttribute("tabindex", "0");
    scroll.setAttribute("role", "region");
    var cap = fill(L.caption, opts.length, crit.length);
    scroll.setAttribute("aria-label", cap);
    var t = h("table", "amc-NCompare-table");
    t.appendChild(h("caption", "amc-NCompare-sr", cap));
    var thead = h("thead");
    var hr = h("tr");
    var corner = h("th", "amc-NCompare-corner", L.criterion);
    corner.setAttribute("scope", "col");
    hr.appendChild(corner);
    opts.forEach(function (o) {
      var th = h("th", "amc-NCompare-colHead" + (o.leader && self.totalsOn ? " is-leader" : "") + (o.i === self.pinned ? " is-pinned" : ""));
      th.setAttribute("scope", "col");
      th.setAttribute("data-opt", String(o.i));
      th.appendChild(self.optHead(o));
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    t.appendChild(thead);
    var tbody = h("tbody");
    this.groupsOf(crit).forEach(function (g) {
      if (g.name) {
        var gr = h("tr", "amc-NCompare-groupRow");
        var gth = h("th", "amc-NCompare-group");
        gth.setAttribute("scope", "colgroup");
        gth.setAttribute("colspan", String(opts.length + 1));
        var gin = h("span", "amc-NCompare-groupIn");
        gin.appendChild(bdi("span", "amc-NCompare-groupName", g.name));
        var gw = self.groupWeight(g.name);
        if (gw && self.totalsOn && self.m.hasTotals && self.style !== "specSheet") {
          gin.appendChild(h("span", "amc-NCompare-groupWeight", nf(self.loc, { style: "percent", maximumFractionDigits: 1 }).format(gw / 100)));
        }
        gth.appendChild(gin);
        gr.appendChild(gth);
        tbody.appendChild(gr);
      }
      g.list.forEach(function (c) {
        var tr = h("tr", "amc-NCompare-critRow");
        tr.setAttribute("data-crit", String(c.i));
        var th = self.critLabel(c, "th");
        th.setAttribute("scope", "row");
        tr.appendChild(th);
        opts.forEach(function (o) {
          var td = h("td", "amc-NCompare-cell");
          td.setAttribute("data-opt", String(o.i));
          var cls = self.cellContent(o, c, td);
          td.className += cls + (o.i === self.pinned ? " is-pinned" : "") + (o.leader && self.totalsOn ? " is-leaderCol" : "");
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    });
    t.appendChild(tbody);
    if (this.totalsOn && this.m.hasTotals && this.style !== "diffView") {
      var tb2 = h("tbody", "amc-NCompare-totals");
      var tr1 = h("tr", "amc-NCompare-totalRow");
      var th1 = h("th", "amc-NCompare-crit", L.total);
      th1.setAttribute("scope", "row");
      tr1.appendChild(th1);
      var tr2 = h("tr", "amc-NCompare-rankRow");
      var th2 = h("th", "amc-NCompare-crit", L.rank);
      th2.setAttribute("scope", "row");
      tr2.appendChild(th2);
      opts.forEach(function (o) {
        var td = h("td", "amc-NCompare-cell amc-NCompare-totalCell" + (o.i === self.pinned ? " is-pinned" : "") + (o.leader ? " is-leaderCol is-lead" : ""));
        td.setAttribute("data-opt", String(o.i));
        if (self.style === "scorecard") {
          var bar = h("span", "amc-NCompare-bar amc-NCompare-bar--total");
          bar.setAttribute("aria-hidden", "true");
          var f = h("span", "amc-NCompare-barFill");
          f.style.setProperty("--amc-ncmp-s", String(o.total / 100));
          bar.appendChild(f);
          td.appendChild(bar);
        }
        td.appendChild(self.totalFig(o));
        tr1.appendChild(td);
        var rd = h("td", "amc-NCompare-cell amc-NCompare-rankCell" + (o.i === self.pinned ? " is-pinned" : "") + (o.leader ? " is-leaderCol is-lead" : ""));
        rd.setAttribute("data-opt", String(o.i));
        rd.textContent = self.ordinal(o.rank);
        tr2.appendChild(rd);
      });
      add(tb2, tr1, tr2);
      t.appendChild(tb2);
    }
    scroll.appendChild(t);
    return scroll;
  };

  // "83.9 / 100" as one left-to-right run, so RTL pages do not reorder it.
  Cmp.prototype.totalFig = function (o) {
    var f = h("span", "amc-NCompare-fig");
    add(f, h("span", "amc-NCompare-totalNum", this.nf1.format(o.total)), h("span", "amc-NCompare-totalOf", " / 100"));
    return f;
  };

  /* ---------- Cards (Side Cards and the narrow swipe view) ---------- */
  Cmp.prototype.cards = function (opts, crit) {
    var self = this;
    var L = this.L;
    var wrap = h("div", "amc-NCompare-swipe");
    var nav = h("div", "amc-NCompare-nav");
    var prev = h("button", "amc-NCompare-navBtn");
    prev.type = "button";
    prev.setAttribute("data-amc-act", "prev");
    prev.setAttribute("aria-label", L.prev);
    prev.appendChild(icon("fa-chevron-left amc-NCompare-flipRtl"));
    var pos = bdi("span", "amc-NCompare-pos", fill(L.position, 1, opts.length));
    pos.setAttribute("aria-live", "polite");
    var next = h("button", "amc-NCompare-navBtn");
    next.type = "button";
    next.setAttribute("data-amc-act", "next");
    next.setAttribute("aria-label", L.next);
    next.appendChild(icon("fa-chevron-right amc-NCompare-flipRtl"));
    add(nav, prev, pos, next);
    var track = h("ol", "amc-NCompare-track");
    track.setAttribute("tabindex", "0");
    track.setAttribute("aria-label", fill(L.caption, opts.length, crit.length));
    var groups = this.groupsOf(crit);
    var rows = 1 + (this.totalsOn && this.m.hasTotals ? 1 : 0) + crit.length + groups.filter(function (g) { return g.name; }).length;
    track.style.setProperty("--amc-ncmp-rows", String(rows));
    track.style.setProperty("--amc-ncmp-cols", String(opts.length));
    opts.forEach(function (o) {
      var li = h("li", "amc-NCompare-card" + (o.leader && self.totalsOn && self.m.hasTotals ? " is-leader" : "") + (o.i === self.pinned ? " is-pinned" : ""));
      li.setAttribute("data-opt", String(o.i));
      li.appendChild(self.optHead(o));
      if (self.totalsOn && self.m.hasTotals) {
        var tot = h("div", "amc-NCompare-cardTotal");
        var lab = h("span", "amc-NCompare-cardTotalLabel", L.total);
        var num = self.totalFig(o);
        var bar = h("span", "amc-NCompare-bar amc-NCompare-bar--total");
        bar.setAttribute("aria-hidden", "true");
        var f = h("span", "amc-NCompare-barFill");
        f.style.setProperty("--amc-ncmp-s", String(o.total / 100));
        bar.appendChild(f);
        add(tot, lab, num, bar);
        li.appendChild(tot);
      }
      var dl = h("dl", "amc-NCompare-cardRows");
      groups.forEach(function (g) {
        if (g.name) {
          var gh = h("div", "amc-NCompare-cardGroup");
          gh.setAttribute("role", "presentation");
          gh.appendChild(bdi("span", "amc-NCompare-groupName", g.name));
          dl.appendChild(gh);
        }
        g.list.forEach(function (c) {
          var row = h("div", "amc-NCompare-cardRow");
          row.setAttribute("data-crit", String(c.i));
          var dt = self.critLabel(c, "dt");
          var dd = h("dd", "amc-NCompare-cell");
          var cls = self.cellContent(o, c, dd);
          dd.className += cls;
          add(row, dt, dd);
          dl.appendChild(row);
        });
      });
      li.appendChild(dl);
      track.appendChild(li);
    });
    add(wrap, nav, track);
    return wrap;
  };

  /* ---------- Standings ---------- */
  Cmp.prototype.standings = function () {
    var self = this;
    if (!this.totalsOn || !this.m.hasTotals || (this.style !== "tenderTable" && this.style !== "scorecard")) { return null; }
    var fig = h("figure", "amc-NCompare-standings");
    fig.appendChild(h("figcaption", "amc-NCompare-standingsCap", this.L.standings));
    var ol = h("ol", "amc-NCompare-ladder");
    this.m.options.slice().sort(function (a, b) { return a.rank - b.rank || a.i - b.i; }).forEach(function (o) {
      var li = h("li", "amc-NCompare-step" + (o.leader ? " is-leader" : ""));
      var track = h("span", "amc-NCompare-stepTrack");
      track.setAttribute("aria-hidden", "true");
      var dot = h("span", "amc-NCompare-stepMark");
      dot.style.setProperty("--amc-ncmp-x", String(o.total / 100));
      track.appendChild(dot);
      add(li, h("span", "amc-NCompare-stepRank", self.ordinal(o.rank)), bdi("span", "amc-NCompare-stepName", o.name), track,
        h("span", "amc-NCompare-stepNum", self.nf1.format(o.total)));
      ol.appendChild(li);
    });
    fig.appendChild(ol);
    return fig;
  };

  /* ---------- Render ---------- */
  Cmp.prototype.render = function (focusSel) {
    var root = this.root;
    var old = root.querySelector(".amc-NCompare-ui");
    var keep = null;
    if (old) {
      var sc = old.querySelector(".amc-NCompare-scroll");
      var tr = old.querySelector(".amc-NCompare-track");
      keep = { top: sc ? sc.scrollTop : 0, left: sc ? sc.scrollLeft : 0, track: tr ? tr.scrollLeft : 0, rects: this.rects(old) };
    }
    var opts = this.order();
    var crit = this.visibleCriteria();
    var ui = h("div", "amc-NCompare-ui");
    ui.appendChild(this.toolbar());
    ui.appendChild(this.standings() || document.createTextNode(""));
    if (this.style !== "sideCards") { ui.appendChild(this.table(opts, crit)); }
    ui.appendChild(this.cards(opts, crit));
    if (old) { root.replaceChild(ui, old); } else { root.appendChild(ui); }
    root.classList.add("is-built");
    var sc2 = ui.querySelector(".amc-NCompare-scroll");
    if (keep && sc2) { sc2.scrollTop = keep.top; sc2.scrollLeft = keep.left; }
    this.measure();
    this.syncPos();
    if (keep) { this.glide(ui, keep.rects); }
    if (focusSel) {
      var f = ui.querySelector(focusSel);
      if (f) { f.focus({ preventScroll: true }); }
    }
  };

  Cmp.prototype.toolbar = function () {
    var L = this.L;
    var bar = h("div", "amc-NCompare-tools");
    var n = this.m.criteria.filter(function (c) { return c.identical; }).length;
    var b = h("button", "amc-NCompare-toggle" + (this.hideIdentical ? " is-on" : ""));
    b.type = "button";
    b.setAttribute("data-amc-act", "identical");
    b.setAttribute("aria-pressed", this.hideIdentical && n ? "true" : "false");
    if (!n) { b.disabled = true; }
    add(b, h("span", "amc-NCompare-switch"), h("span", "", L.hide));
    var count = bdi("span", "amc-NCompare-count", n ? (this.hideIdentical ? fill(L.hidden, n) : "") : L["none-identical"]);
    var status = h("span", "amc-NCompare-sr amc-NCompare-status");
    status.setAttribute("role", "status");
    status.textContent = this.announce || "";
    this.announce = "";
    add(bar, b, count, status);
    return bar;
  };

  // Keep the pinned column sticky right after the criterion column.
  Cmp.prototype.measure = function () {
    var t = this.root.querySelector(".amc-NCompare-table");
    var corner = t && t.querySelector(".amc-NCompare-corner");
    if (corner) { t.style.setProperty("--amc-ncmp-c1", Math.round(corner.getBoundingClientRect().width) + "px"); }
  };

  Cmp.prototype.rects = function (ui) {
    var out = {};
    each(ui.querySelectorAll(".amc-NCompare-colHead[data-opt], .amc-NCompare-card[data-opt]"), function (el) {
      var k = (el.tagName === "LI" ? "c" : "t") + el.getAttribute("data-opt");
      out[k] = el.getBoundingClientRect().left;
    });
    return out;
  };

  // FLIP: columns and cards slide from their old place after a pin.
  Cmp.prototype.glide = function (ui, before) {
    if (reduced() || !before) { return; }
    var moved = [];
    each(ui.querySelectorAll(".amc-NCompare-colHead[data-opt], .amc-NCompare-card[data-opt]"), function (el) {
      var isCard = el.tagName === "LI";
      var k = (isCard ? "c" : "t") + el.getAttribute("data-opt");
      if (!(k in before)) { return; }
      var dx = Math.round(before[k] - el.getBoundingClientRect().left);
      if (!dx) { return; }
      var group = isCard ? [el] : ui.querySelectorAll('.amc-NCompare-table [data-opt="' + el.getAttribute("data-opt") + '"]');
      each(group, function (g) {
        if (g.classList.contains("amc-NCompare-pin")) { return; }
        g.style.setProperty("--amc-ncmp-dx", dx + "px");
        g.classList.add("is-from");
        moved.push(g);
      });
    });
    if (!moved.length) { return; }
    void ui.offsetWidth;
    window.requestAnimationFrame(function () {
      moved.forEach(function (g) { g.classList.add("is-gliding"); g.classList.remove("is-from"); });
      window.setTimeout(function () {
        moved.forEach(function (g) { g.classList.remove("is-gliding"); g.style.removeProperty("--amc-ncmp-dx"); });
      }, 520);
    });
  };

  /* ---------- Swipe position ---------- */
  Cmp.prototype.index = function () {
    var tr = this.root.querySelector(".amc-NCompare-track");
    if (!tr || !tr.firstElementChild) { return { i: 0, n: 0, tr: tr }; }
    var w = tr.firstElementChild.getBoundingClientRect().width || 1;
    var gap = parseFloat(getComputedStyle(tr).columnGap) || 0;
    var i = Math.round(Math.abs(tr.scrollLeft) / (w + gap));
    var n = tr.children.length;
    return { i: Math.max(0, Math.min(n - 1, i)), n: n, tr: tr, step: w + gap };
  };
  Cmp.prototype.syncPos = function () {
    var p = this.index();
    var pos = this.root.querySelector(".amc-NCompare-pos");
    if (pos) { pos.firstChild.textContent = fill(this.L.position, p.i + 1, p.n); }
    var btns = this.root.querySelectorAll(".amc-NCompare-navBtn");
    if (btns.length === 2) {
      btns[0].disabled = p.i <= 0;
      btns[1].disabled = p.i >= p.n - 1;
    }
  };
  Cmp.prototype.go = function (dir) {
    var p = this.index();
    if (!p.tr) { return; }
    var target = Math.max(0, Math.min(p.n - 1, p.i + dir));
    var rtl = getComputedStyle(p.tr).direction === "rtl";
    var left = target * p.step * (rtl ? -1 : 1);
    if (p.tr.scrollTo) {
      p.tr.scrollTo({ left: left, behavior: reduced() ? "auto" : "smooth" });
    } else {
      p.tr.scrollLeft = left;
    }
  };

  /* ---------- Actions ---------- */
  Cmp.prototype.act = function (act, btn) {
    var L = this.L;
    if (act === "pin") {
      var i = parseInt(btn.getAttribute("data-opt"), 10);
      var o = this.m.options[i];
      if (!o) { return; }
      this.pinned = this.pinned === i ? -1 : i;
      this.announce = this.pinned >= 0 ? fill(L.pinned, o.name) : L.unpinned;
      var inCards = !!btn.closest(".amc-NCompare-track");
      this.render((inCards ? ".amc-NCompare-track" : ".amc-NCompare-table") + ' .amc-NCompare-pin[data-opt="' + i + '"]');
      if (inCards) {
        var tr = this.root.querySelector(".amc-NCompare-track");
        if (tr) { tr.scrollLeft = 0; this.syncPos(); }
      }
    } else if (act === "identical") {
      this.hideIdentical = !this.hideIdentical;
      var n = this.m.criteria.filter(function (c) { return c.identical; }).length;
      this.announce = this.hideIdentical ? fill(L.hidden, n) : L.shown;
      this.render(".amc-NCompare-toggle");
    } else if (act === "prev" || act === "next") {
      this.go(act === "next" ? 1 : -1);
    }
  };

  /* ---------- Boot ---------- */
  var instances = [];
  function find(el) {
    for (var i = 0; i < instances.length; i++) {
      if (instances[i].root === el) { return instances[i]; }
    }
    return null;
  }
  function init(scope) {
    instances = instances.filter(function (x) { return document.contains(x.root); });
    each((scope || document).querySelectorAll(".amc-NCompare:not([data-amc-init])"), function (root) {
      root.setAttribute("data-amc-init", "Y");
      try {
        var c = new Cmp(root);
        instances.push(c);
        c.render();
      } catch (err) {
        root.setAttribute("data-amc-init", "E");
        if (window.console) { window.console.error("amcNextCompare", err); }
      }
    });
  }
  function onClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest(".amc-NCompare [data-amc-act]") : null;
    if (!btn || btn.disabled) { return; }
    var inst = find(btn.closest(".amc-NCompare"));
    if (inst) { inst.act(btn.getAttribute("data-amc-act"), btn); }
  }
  var scrollFrame = 0;
  function onScroll(e) {
    var tr = e.target;
    if (!tr || !tr.classList || !tr.classList.contains("amc-NCompare-track") || scrollFrame) { return; }
    scrollFrame = window.requestAnimationFrame(function () {
      scrollFrame = 0;
      var inst = find(tr.closest(".amc-NCompare"));
      if (inst) { inst.syncPos(); }
    });
  }
  function start() {
    init(document);
    document.addEventListener("click", onClick);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", function () {
      instances.forEach(function (x) { x.measure(); x.syncPos(); });
    });
    if (window.MutationObserver) {
      var pending = 0;
      new MutationObserver(function () {
        if (pending) { return; }
        pending = window.requestAnimationFrame(function () { pending = 0; init(document); });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  window.amcNextCompare = {
    init: init,
    compute: function (root) { var c = find(root); return c ? c.m : null; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
