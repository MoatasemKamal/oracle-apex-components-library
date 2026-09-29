/* Dual View: region template script. Reads the report table inside the region body (never
   changes it) and adds a Table / Chart switch to the header. Chart mode draws an SVG bar chart to
   scale (vertical, or horizontal when labels are long, there are many rows or the region is
   narrow) or a donut, from the first descriptive text column as labels and the key numeric column
   as values, with axis ticks, value labels and theme palette colors. The table stays in the DOM as
   the accessible source; the chart is role=img with a text summary. The choice is remembered per
   page and region in localStorage. Without a table, or without JavaScript, the region is a plain
   frame around its content. */
(function (w, d) {
  "use strict";
  if (w.amcTplDualView) return;
  var ROOT = "amc-TDualView", P = ROOT + "-";
  var ID_HEAD = /(^|[^a-z])(id|no|nr|num|number|code|year|#)([^a-z]|$)/i;
  var CODE_LIKE = /^[A-Z0-9][A-Z0-9_\-\/.#]*\d[A-Z0-9_\-\/.#]*$/i;
  var NUM_RE = /^([-+\u2212]?)((?:[A-Za-z]{1,4}\s+)|(?:[^\s\w.,+\-\u2212()%]{1,3}\s*))?([-+\u2212]?)(\d[\d.,'\u2019 ]*\d|\d)((?:\s*%)|(?:\s*[^\s\w.,+\-\u2212()%]{1,3})|(?:\s+[A-Za-z]{1,4}))?$/;

  /* ------------------------------------------------------------ helpers */
  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function el(tag, cls, text) {
    var e = d.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function label(root, key, fallback) { return root.getAttribute("data-amc-label-" + key) || fallback; }
  function has(root, opt) { return root.classList.contains(ROOT + "--" + opt); }
  function rtl(root) { return (w.getComputedStyle(root).direction || "ltr") === "rtl"; }

  /* ------------------------------------------------------------ numbers */
  function normDigits(s) {
    return s.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, function (c) {
      var n = c.charCodeAt(0);
      return String(n >= 0x6f0 ? n - 0x6f0 : n - 0x660);
    }).replace(/\u066b/g, ".").replace(/\u066c/g, ",");
  }
  // Locale-safe number parser: strips group separators and currency, reads "," or "." as the
  // decimal mark by position, accepts (1,200) and -1,200 as negatives. Returns null for text,
  // codes (SO-55120), dates and times.
  function parseNum(text) {
    var s = normDigits(String(text)).replace(/[\s\u00a0\u202f]+/g, " ").replace(/^\s+|\s+$/g, "");
    if (!s || s.length > 40) return null;
    var neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1).replace(/^\s+|\s+$/g, ""); }
    var m = NUM_RE.exec(s);
    if (!m || (m[1] && m[3])) return null;
    var sign = m[1] || m[3];
    if (sign === "-" || sign === "\u2212") neg = !neg;
    var num = m[4], spaced = / /.test(num);
    if (spaced && !/^\d{1,3}( \d{3})+([.,]\d+)?$/.test(num)) return null;
    num = num.replace(/[ '\u2019]/g, "");
    var lc = num.lastIndexOf(","), ld = num.lastIndexOf("."), grp = spaced ? " " : "", dec = "";
    if (lc >= 0 && ld >= 0) { dec = lc > ld ? "," : "."; grp = lc > ld ? "." : ","; }
    else if (lc >= 0 || ld >= 0) {
      var c = lc >= 0 ? "," : ".", bits = num.split(c);
      if (bits.length > 2 || (bits[1].length === 3 && bits[0] !== "0" && bits[0].length <= 3)) grp = c; else dec = c;
    }
    var ip = num, fp = "";
    if (dec) { ip = num.slice(0, num.lastIndexOf(dec)); fp = num.slice(num.lastIndexOf(dec) + 1); }
    if (grp && grp !== " ") {
      var g = ip.split(grp);
      for (var i = 1; i < g.length; i++) if (g[i].length < 2 || g[i].length > 3) return null;
      ip = g.join("");
    }
    if (!ip || /\D/.test(ip + fp)) return null;
    var v = parseFloat(ip + (fp ? "." + fp : ""));
    if (!isFinite(v)) return null;
    return { v: neg ? -v : v, dec: fp.length, grp: grp, decChar: dec, pre: m[2] || "", suf: m[5] || "" };
  }
  function mostCommon(list) {
    var n = {}, best = "", bn = 0;
    for (var i = 0; i < list.length; i++) if (list[i]) { n[list[i]] = (n[list[i]] || 0) + 1; if (n[list[i]] > bn) { bn = n[list[i]]; best = list[i]; } }
    return best;
  }
  function same(list) {
    for (var i = 1; i < list.length; i++) if (list[i] !== list[0]) return "";
    return list[0] || "";
  }
  // Format like the report itself: same group and decimal marks, same currency prefix/suffix.
  function fmt(v, meta, extraDec) {
    var dp = Math.min(6, meta.dec + (extraDec || 0));
    var s = Math.abs(v).toFixed(dp).split("."), ip = s[0];
    if (meta.grp) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, meta.grp);
    return (v < 0 ? "-" : "") + meta.pre + ip + (s[1] ? meta.decChar + s[1] : "") + meta.suf;
  }
  function pct(share) {
    var p = share * 100;
    return (p >= 10 || p === 0 ? Math.round(p) : Math.round(p * 10) / 10) + "%";
  }

  /* ------------------------------------------------------------ table reading */
  function cellsOf(tr) { return tr.cells; }
  function readTable(body) {
    var tables = body.getElementsByTagName("table"), best = null, bestRows = [];
    for (var t = 0; t < tables.length; t++) {
      if (tables[t].getElementsByTagName("table").length) continue; // layout wrapper
      var rows = [];
      for (var r = 0; r < tables[t].rows.length; r++) {
        var tr = tables[t].rows[r], sec = tr.parentNode.tagName;
        if (sec === "THEAD" || sec === "TFOOT" || tr.hidden) continue;
        if (/aggregate|break|pagination/i.test(tr.className)) continue;
        if (!tr.getElementsByTagName("td").length) continue;
        rows.push(tr);
      }
      if (rows.length > bestRows.length) { best = tables[t]; bestRows = rows; }
    }
    if (!best) return null;
    var counts = {}, cols = 0, cn = 0;
    for (var i = 0; i < bestRows.length; i++) {
      var k = cellsOf(bestRows[i]).length;
      counts[k] = (counts[k] || 0) + 1;
      if (counts[k] > cn) { cn = counts[k]; cols = k; }
    }
    var rowsOk = [];
    for (i = 0; i < bestRows.length; i++) if (cellsOf(bestRows[i]).length === cols) rowsOk.push(bestRows[i]);
    var head = null;
    if (best.tHead && best.tHead.rows.length) head = best.tHead.rows[best.tHead.rows.length - 1];
    else for (i = 0; i < best.rows.length; i++) {
      if (!best.rows[i].getElementsByTagName("td").length && best.rows[i].getElementsByTagName("th").length) { head = best.rows[i]; break; }
    }
    var headers = [];
    for (i = 0; i < cols; i++) {
      var hc = head && head.cells.length === cols ? head.cells[i] : null;
      headers.push(hc ? hc.textContent.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "") : "#" + (i + 1));
    }
    return { table: best, rows: rowsOk, headers: headers, cols: cols };
  }

  function analyse(data) {
    var cols = [];
    for (var c = 0; c < data.cols; c++) {
      var vals = [], texts = [], filled = 0, nums = 0;
      for (var r = 0; r < data.rows.length; r++) {
        var t = data.rows[r].cells[c].textContent.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
        texts.push(t);
        var p = t ? parseNum(t) : null;
        vals.push(p);
        if (t) filled++;
        if (p) nums++;
      }
      var col = { index: c, header: data.headers[c], texts: texts, vals: vals, numeric: nums > 0 && nums >= 0.8 * filled };
      if (col.numeric) {
        var dec = 0, grps = [], decs = [], pres = [], sufs = [], allInt = true, yearish = true;
        for (r = 0; r < vals.length; r++) if (vals[r]) {
          var x = vals[r];
          if (x.dec > dec) dec = x.dec;
          grps.push(x.grp); decs.push(x.decChar); pres.push(x.pre); sufs.push(x.suf);
          if (x.dec || x.grp || x.pre || x.suf) allInt = false;
          if (x.v < 1900 || x.v > 2100 || x.dec) yearish = false;
        }
        var grp = mostCommon(grps), decChar = mostCommon(decs) || (grp === "." ? "," : ".");
        col.meta = { dec: dec, grp: grp, decChar: decChar, pre: same(pres), suf: same(sufs) };
        col.percent = /%/.test(col.meta.suf);
        col.idLike = ID_HEAD.test(col.header) || (allInt && yearish);
      } else {
        var code = 0;
        for (r = 0; r < texts.length; r++) if (CODE_LIKE.test(texts[r])) code++;
        col.codeLike = filled > 0 && code >= 0.8 * filled;
      }
      cols.push(col);
    }
    return cols;
  }
  function byHeader(cols, want, test) {
    if (!want) return null;
    for (var i = 0; i < cols.length; i++) {
      if ((/^\d+$/.test(want) ? i === +want - 1 : cols[i].header.toLowerCase() === want.toLowerCase()) && test(cols[i])) return cols[i];
    }
    return null;
  }
  function pickKey(root, cols) {
    var forced = byHeader(cols, root.getAttribute("data-amc-column"), function (c) { return c.numeric; });
    if (forced) return forced;
    var good = [], any = [];
    for (var i = 0; i < cols.length; i++) if (cols[i].numeric) { any.push(cols[i]); if (!cols[i].idLike) good.push(cols[i]); }
    var list = good.length ? good : any;
    if (!list.length) return null;
    return has(root, "first") ? list[0] : list[list.length - 1];
  }
  function pickLabel(root, cols) {
    var forced = byHeader(cols, root.getAttribute("data-amc-label-column"), function () { return true; });
    if (forced) return forced;
    var first = null;
    for (var i = 0; i < cols.length; i++) if (!cols[i].numeric) {
      if (!first) first = cols[i];
      if (!cols[i].codeLike) return cols[i];
    }
    return first;
  }

  /* ------------------------------------------------------------ data */
  var NS = "http://www.w3.org/2000/svg", MAX_V = 30, MAX_H = 50, MAX_SLICES = 6, CH = 6.6;

  function parts(root) {
    if (root._amcDV) return root._amcDV;
    var p = {};
    var walk = function (node, depth) {
      for (var i = 0; i < node.children.length; i++) {
        var ch = node.children[i], m = /amc-TDualView-(\w+)/.exec(typeof ch.className === "string" ? ch.className : "");
        if (m && !p[m[1]]) p[m[1]] = ch;
        if (depth < 2 && m && m[1] !== "body" && m[1] !== "chart") walk(ch, depth + 1);
      }
    };
    walk(root, 0);
    if (!p.body || !p.chart || !p["switch"]) return null;
    root._amcDV = p;
    return p;
  }
  function compute(root) {
    var p = parts(root);
    if (!p) return null;
    var data = readTable(p.body);
    if (!data || !data.rows.length) return null;
    var cols = analyse(data), key = pickKey(root, cols);
    if (!key) return null;
    var lab = pickLabel(root, cols), items = [], total = 0;
    for (var r = 0; r < data.rows.length; r++) {
      var v = key.vals[r];
      if (!v) continue;
      items.push({ label: lab ? lab.texts[r] || "\u2014" : String(r + 1), v: v.v, text: key.texts[r] });
      total += v.v;
    }
    if (!items.length) return null;
    return {
      items: items, key: key, label: lab, total: Math.round(total * 1e6) / 1e6,
      sig: data.headers.join("|") + "#" + key.index + "#" + key.texts.join("|") + "#" + (lab ? lab.texts.join("|") : "")
    };
  }

  /* ------------------------------------------------------------ svg helpers */
  function svgEl(tag, attrs, cls) {
    var e = d.createElementNS(NS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, String(attrs[k]));
    if (cls) e.setAttribute("class", cls);
    return e;
  }
  function text(parent, x, y, str, anchor, cls, baseline) {
    var t = svgEl("text", { x: r1(x), y: r1(y), "text-anchor": anchor || "start" }, cls);
    if (baseline) t.setAttribute("dominant-baseline", baseline);
    t.textContent = str;
    parent.appendChild(t);
    return t;
  }
  function r1(n) { return Math.round(n * 10) / 10; }
  function clip(s, max) { return s.length <= max ? s : max < 2 ? "\u2026" : s.slice(0, max - 1) + "\u2026"; }
  function niceTicks(lo, hi, n) {
    if (lo === hi) { hi = lo === 0 ? 1 : lo > 0 ? lo * 1.2 : 0; lo = lo < 0 ? lo * 1.2 : 0; }
    var raw = (hi - lo) / n, step = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), err = raw / step;
    step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    var a = Math.floor(lo / step + 1e-9) * step, b = Math.ceil(hi / step - 1e-9) * step, t = [];
    for (var v = a; v <= b + step / 2; v += step) t.push(Math.round(v / step) * step);
    return t;
  }
  var compactFmt = null;
  function short(v, meta) {
    if (Math.abs(v) < 1000) return fmt(v, { dec: Math.abs(v) < 10 && v % 1 ? 1 : 0, grp: meta.grp, decChar: meta.decChar, pre: "", suf: meta.suf && /%/.test(meta.suf) ? meta.suf : "" });
    try {
      if (!compactFmt) compactFmt = new Intl.NumberFormat(d.documentElement.lang || undefined, { notation: "compact", maximumFractionDigits: 1 });
      return compactFmt.format(v);
    } catch (e) { return fmt(v, { dec: 0, grp: meta.grp, decChar: meta.decChar, pre: "", suf: "" }); }
  }
  // Bar with 4px rounded data end, square at the baseline.
  function vBar(x, y0, y1, w) {
    var h = Math.abs(y0 - y1), r = Math.min(4, w / 2, h), up = y1 < y0, s = up ? 1 : -1;
    if (h < 0.5) return "M" + r1(x) + "," + r1(y0) + "h" + r1(w);
    return "M" + r1(x) + "," + r1(y0) + "V" + r1(y1 + s * r) + "Q" + r1(x) + "," + r1(y1) + " " + r1(x + r) + "," + r1(y1) +
      "H" + r1(x + w - r) + "Q" + r1(x + w) + "," + r1(y1) + " " + r1(x + w) + "," + r1(y1 + s * r) + "V" + r1(y0) + "Z";
  }
  function hBar(x0, x1, y, h) {
    var w = Math.abs(x1 - x0), r = Math.min(4, h / 2, w), right = x1 > x0, s = right ? 1 : -1;
    if (w < 0.5) return "M" + r1(x0) + "," + r1(y) + "v" + r1(h);
    return "M" + r1(x0) + "," + r1(y) + "H" + r1(x1 - s * r) + "Q" + r1(x1) + "," + r1(y) + " " + r1(x1) + "," + r1(y + r) +
      "V" + r1(y + h - r) + "Q" + r1(x1) + "," + r1(y + h) + " " + r1(x1 - s * r) + "," + r1(y + h) + "H" + r1(x0) + "Z";
  }

  /* ------------------------------------------------------------ charts */
  function barChart(root, fig, res, items, W) {
    var meta = res.key.meta, isRtl = rtl(root), n = items.length, i;
    var min = 0, max = 0, maxLab = 0, maxVal = 0;
    for (i = 0; i < n; i++) {
      if (items[i].v < min) min = items[i].v;
      if (items[i].v > max) max = items[i].v;
      if (items[i].label.length > maxLab) maxLab = items[i].label.length;
      var ft = fmt(items[i].v, meta);
      if (ft.length > maxVal) maxVal = ft.length;
    }
    var ticks = niceTicks(min, max, W < 420 ? 3 : 5), lo = ticks[0], hi = ticks[ticks.length - 1];
    var tickW = 0;
    for (i = 0; i < ticks.length; i++) tickW = Math.max(tickW, short(ticks[i], meta).length * CH);
    var horizontal = has(root, "horizontal") || n > 12;
    if (!horizontal) {
      var bandGuess = (W - tickW - 16) / n;
      // Labels that would need truncating read better as horizontal bars.
      horizontal = maxLab * CH > bandGuess - 8 || maxVal * CH > bandGuess * 1.6 && short(max, meta).length * CH > bandGuess;
    }
    var mx = function (x, w) { return isRtl ? W - x - (w || 0) : x; };
    var anchor = function (a) { return !isRtl || a === "middle" ? a : a === "start" ? "end" : "start"; };
    var svg, H, g = svgEl("g", {}, P + "grid"), bars = svgEl("g", {}, P + "bars"), labels = svgEl("g", {}, P + "labels");

    if (!horizontal) {
      var top = 22, bottom = 28, left = tickW + 10, pw = W - left - 4;
      H = Math.round(Math.max(190, Math.min(300, W * 0.5)));
      var ph = H - top - bottom, band = pw / n, bw = Math.min(56, band * 0.64);
      var y = function (v) { return top + ph * (hi - v) / (hi - lo); };
      svg = svgEl("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H });
      for (i = 0; i < ticks.length; i++) {
        var ty = y(ticks[i]);
        g.appendChild(svgEl("line", { x1: r1(mx(left)), x2: r1(mx(W - 4)), y1: r1(ty), y2: r1(ty) }, ticks[i] === 0 ? P + "zero" : P + "tick"));
        text(g, mx(left - 8), ty, short(ticks[i], meta), anchor("end"), P + "axis", "middle");
      }
      var maxChars = Math.max(2, Math.floor(band / CH) - 1), useShort = false;
      for (i = 0; i < n; i++) if (fmt(items[i].v, meta).length * CH > band - 2) useShort = true;
      for (i = 0; i < n; i++) {
        var it = items[i], cx = left + band * i + (band - bw) / 2, y0 = y(0), y1 = y(it.v);
        var bar = svgEl("path", { d: vBar(mx(cx, bw), y0, y1, bw) }, P + "bar");
        bar.setAttribute("data-amc-i", String(i));
        var tt = svgEl("title");
        tt.textContent = it.label + ": " + it.text;
        bar.appendChild(tt);
        bars.appendChild(bar);
        var vl = useShort ? short(it.v, meta) : fmt(it.v, meta);
        text(labels, mx(cx + bw / 2), it.v >= 0 ? y1 - 6 : y1 + 13, vl, "middle", P + "value");
        text(labels, mx(cx + bw / 2), H - 9, clip(it.label, maxChars), "middle", P + "cat");
      }
    } else {
      var rowH = 30, barH = 16, topH = 6, axisH = 22;
      var labW = Math.min(Math.round(W * 0.38), maxLab * CH + 10), valW = Math.min(Math.round(W * 0.28), maxVal * CH + 10);
      var x0 = labW + 8, pw2 = W - x0 - valW;
      if (pw2 < 60) { valW = Math.max(40, W - x0 - 60); pw2 = W - x0 - valW; }
      H = topH + n * rowH + axisH;
      var x = function (v) { return x0 + pw2 * (v - lo) / (hi - lo); };
      svg = svgEl("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H });
      for (i = 0; i < ticks.length; i++) {
        var tx = x(ticks[i]);
        g.appendChild(svgEl("line", { x1: r1(mx(tx)), x2: r1(mx(tx)), y1: topH, y2: H - axisH + 2 }, ticks[i] === 0 ? P + "zero" : P + "tick"));
        text(g, mx(tx), H - 6, short(ticks[i], meta), i === 0 && ticks[i] === lo && lo === 0 ? anchor("start") : "middle", P + "axis");
      }
      var lChars = Math.max(3, Math.floor((labW - 4) / CH));
      for (i = 0; i < n; i++) {
        var it2 = items[i], by = topH + i * rowH + (rowH - barH) / 2, xa = x(0), xb = x(it2.v);
        var hb = svgEl("path", { d: isRtl ? hBar(W - xa, W - xb, by, barH) : hBar(xa, xb, by, barH) }, P + "bar");
        hb.setAttribute("data-amc-i", String(i));
        var tt2 = svgEl("title");
        tt2.textContent = it2.label + ": " + it2.text;
        hb.appendChild(tt2);
        bars.appendChild(hb);
        text(labels, mx(labW), by + barH / 2, clip(it2.label, lChars), anchor("end"), P + "cat", "central");
        var vl2 = fmt(it2.v, meta);
        if (vl2.length * CH > valW - 6) vl2 = short(it2.v, meta);
        text(labels, mx(it2.v >= 0 ? xb + 6 : xa + 6), by + barH / 2, vl2, anchor("start"), P + "value", "central");
      }
    }
    svg.appendChild(g);
    svg.appendChild(bars);
    svg.appendChild(labels);
    root.setAttribute("data-amc-chart", horizontal ? "hbar" : "bar");
    return svg;
  }

  function arc(cx, cy, r, a0, a1, dir) {
    var x0 = cx + r * Math.cos(a0), y0 = cy + dir * r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + dir * r * Math.sin(a1);
    return "M" + r1(x0) + "," + r1(y0) + "A" + r + "," + r + " 0 " + (a1 - a0 > Math.PI ? 1 : 0) + " " + (dir > 0 ? 1 : 0) + " " + r1(x1) + "," + r1(y1);
  }
  function donut(root, fig, res, items, W) {
    var meta = res.key.meta, pos = [], sum = 0, i, other = label(root, "other", "Other");
    for (i = 0; i < items.length; i++) if (items[i].v > 0) { pos.push(items[i]); sum += items[i].v; }
    if (!sum) return null;
    pos.sort(function (a, b) { return b.v - a.v; });
    if (pos.length > MAX_SLICES + 1) {
      var rest = 0;
      for (i = MAX_SLICES; i < pos.length; i++) rest += pos[i].v;
      pos = pos.slice(0, MAX_SLICES).concat([{ label: other, v: rest, text: fmt(rest, meta), other: true }]);
    }
    var S = Math.round(Math.max(150, Math.min(210, W * 0.42))), c = S / 2, R = S / 2 - 12, dir = rtl(root) ? -1 : 1;
    var wrap = d.createElement("div");
    wrap.className = P + "donut";
    var svg = svgEl("svg", { width: S, height: S, viewBox: "0 0 " + S + " " + S });
    svg.appendChild(svgEl("circle", { cx: c, cy: c, r: R }, P + "track"));
    var a = -Math.PI / 2, legend = d.createElement("ul");
    legend.className = P + "legend";
    legend.setAttribute("aria-hidden", "true");
    for (i = 0; i < pos.length; i++) {
      var share = pos[i].v / sum, a1 = a + share * Math.PI * 2, cls = P + "slice " + P + "c" + (pos[i].other ? "x" : i + 1);
      var seg = pos.length === 1 ? svgEl("circle", { cx: c, cy: c, r: R }, cls) : svgEl("path", { d: arc(c, c, R, a, a1 - Math.min(0.02, share), dir) }, cls);
      seg.setAttribute("data-amc-i", String(i));
      var tt = svgEl("title");
      tt.textContent = pos[i].label + ": " + fmt(pos[i].v, meta) + " (" + pct(share) + ")";
      seg.appendChild(tt);
      svg.appendChild(seg);
      a = a1;
      var li = d.createElement("li");
      li.className = P + "key";
      li.setAttribute("data-amc-i", String(i));
      var sw = d.createElement("span");
      sw.className = P + "swatch " + P + "c" + (pos[i].other ? "x" : i + 1);
      li.appendChild(sw);
      li.appendChild(el("span", P + "keyLabel", pos[i].label));
      li.appendChild(el("span", P + "keyValue", fmt(pos[i].v, meta)));
      li.appendChild(el("span", P + "keyPct", pct(share)));
      legend.appendChild(li);
    }
    var tv = text(svg, c, c - 2, fmt(sum, meta), "middle", P + "centerValue");
    var tl = text(svg, c, c + 16, label(root, "total", "Total"), "middle", P + "centerLabel");
    if (fmt(sum, meta).length * 9.5 > R * 1.5) tv.textContent = short(sum, meta);
    root._amcCenter = { v: tv, l: tl, items: pos, sum: sum, meta: meta, total: tv.textContent, label: tl.textContent };
    wrap.appendChild(svg);
    wrap.appendChild(legend);
    root.setAttribute("data-amc-chart", "donut");
    return wrap;
  }
  function draw(root) {
    var p = parts(root), res = root._amcRes;
    if (!p || !res || !root.classList.contains("is-chart")) return;
    var W = Math.floor(p.chart.clientWidth);
    if (W < 40) return;
    root._amcW = W;
    clear(p.chart);
    root._amcCenter = null;
    var items = res.items.slice(), isDonut = has(root, "donut"), cap = isDonut ? 1e9 : has(root, "horizontal") || items.length > 12 ? MAX_H : MAX_V;
    if (has(root, "sorted")) items.sort(function (a, b) { return b.v - a.v; });
    var shown = items.length > cap ? items.slice(0, cap) : items;
    var node = isDonut ? donut(root, p.chart, res, shown, W) : null;
    if (!node) { node = barChart(root, p.chart, res, shown, W); isDonut = false; }
    var svg = node.tagName.toLowerCase() === "svg" ? node : node.querySelector("svg");
    var meta = res.key.meta, head = res.key.header, by = res.label ? res.label.header : "";
    var caption = by ? label(root, "caption", "%0 by %1").replace("%0", head).replace("%1", by) : head;
    var list = [];
    for (var i = 0; i < shown.length && i < 20; i++) list.push(shown[i].label + " " + fmt(shown[i].v, meta));
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label(root, isDonut ? "donut" : "bar", isDonut ? "Donut chart" : "Bar chart") + ". " + caption + ". " + list.join("; ") + (shown.length > 20 ? "; \u2026" : "") + ".");
    svg.setAttribute("class", P + "svg");
    p.chart.appendChild(node);
    var cap2 = el("figcaption", P + "caption");
    cap2.appendChild(el("span", P + "capTitle", caption));
    cap2.appendChild(el("span", P + "capMeta", label(root, "rows", "Rows") + " " + res.items.length));
    cap2.appendChild(el("span", P + "capMeta", label(root, "total", "Total") + " " + fmt(res.total, meta)));
    if (shown.length < items.length) cap2.appendChild(el("span", P + "capMeta", label(root, "first", "Showing the first %0 of %1 rows").replace("%0", shown.length).replace("%1", items.length)));
    p.chart.appendChild(cap2);
  }

  /* ------------------------------------------------------------ view state */
  function storeKey(root) {
    var app = "", page = "";
    try { app = w.apex && w.apex.env && w.apex.env.APP_ID || ""; page = w.apex && w.apex.env && w.apex.env.APP_PAGE_ID || ""; } catch (e) { /* no apex */ }
    return "amc-tpl-dual-view:" + (app ? app + ":" + page : w.location.pathname) + ":" + (root.id || "");
  }
  function stored(root) {
    try { return w.localStorage.getItem(storeKey(root)); } catch (e) { return null; }
  }
  function remember(root, view) {
    try { w.localStorage.setItem(storeKey(root), view); } catch (e) { /* storage blocked */ }
  }
  function setView(root, view, save) {
    var p = parts(root);
    if (!p) return;
    var chart = view === "chart" && !!root._amcRes;
    root.classList.toggle("is-chart", chart);
    p.chart.hidden = !chart;
    var opts = p["switch"].querySelectorAll("." + P + "opt");
    for (var i = 0; i < opts.length; i++) opts[i].setAttribute("aria-pressed", String(opts[i].getAttribute("data-amc-view") === (chart ? "chart" : "table")));
    if (chart) draw(root);
    else w.dispatchEvent(new Event("resize")); // native charts and grids in the body re-measure
    if (save) remember(root, chart ? "chart" : "table");
  }

  /* ------------------------------------------------------------ lifecycle */
  function refresh(root) {
    var p = parts(root);
    if (!p) return;
    var res = compute(root);
    if (!res) {
      root._amcRes = null;
      p["switch"].hidden = true;
      root.classList.remove("is-live");
      setView(root, "table");
      return;
    }
    var changed = !root._amcRes || root._amcRes.sig !== res.sig;
    root._amcRes = res;
    p["switch"].hidden = false;
    root.classList.add("is-live");
    root.setAttribute("data-amc-total", String(res.total));
    if (!root._amcViewSet) {
      root._amcViewSet = true;
      var s = stored(root);
      setView(root, s === "chart" || s === "table" ? s : has(root, "chartFirst") ? "chart" : "table");
    } else if (changed) draw(root);
  }
  function init(root) {
    if (root._amcObs !== undefined) return;
    root._amcObs = null;
    var p = parts(root);
    if (!p) return;
    if (has(root, "donut")) {
      var ic = p["switch"].querySelector("." + P + "optIcon--chart");
      if (ic) { ic.classList.remove("fa-bar-chart"); ic.classList.add("fa-pie-chart"); }
    }
    refresh(root);
    if (w.MutationObserver) {
      root._amcObs = new MutationObserver(function () {
        clearTimeout(root._amcT);
        root._amcT = setTimeout(function () { refresh(root); }, 120);
      });
      root._amcObs.observe(p.body, { childList: true, subtree: true, characterData: true });
    }
    if (w.ResizeObserver) {
      new w.ResizeObserver(function () {
        if (root.classList.contains("is-chart") && Math.floor(p.chart.clientWidth) !== root._amcW) {
          (w.requestAnimationFrame || setTimeout)(function () { draw(root); });
        }
      }).observe(p.chart);
    }
  }
  function initAll() {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }

  /* ------------------------------------------------------------ events (delegated) */
  d.addEventListener("click", function (e) {
    var t = e.target && e.target.nodeType === 1 ? e.target : null, b = t && closest(t, P + "opt"), root = b && closest(b, ROOT);
    if (!root) return;
    init(root);
    setView(root, b.getAttribute("data-amc-view"), true);
  });
  function centre(root, i) {
    var c = root._amcCenter;
    if (!c) return;
    var it = i === null ? null : c.items[i];
    c.v.textContent = it ? fmt(it.v, c.meta) : c.total;
    if (it && c.v.textContent.length * 9.5 > (c.v.ownerSVGElement.width.baseVal.value / 2 - 12) * 1.5) c.v.textContent = short(it.v, c.meta);
    c.l.textContent = it ? clip(it.label, 18) + " \u00b7 " + pct(it.v / c.sum) : c.label;
    var marks = root.querySelectorAll("[data-amc-i]");
    for (var k = 0; k < marks.length; k++) {
      var on = i !== null && marks[k].getAttribute("data-amc-i") === String(i);
      if (marks[k].classList) marks[k].classList.toggle("is-on", on);
    }
    root.classList.toggle("is-pointing", i !== null);
  }
  d.addEventListener("pointerover", function (e) {
    var t = e.target && e.target.nodeType === 1 ? e.target : null, root = t && closest(t, ROOT);
    if (!root || !root._amcCenter) return;
    var m = t.closest ? t.closest("[data-amc-i]") : null;
    centre(root, m && root.contains(m) ? +m.getAttribute("data-amc-i") : null);
  });
  d.addEventListener("pointerout", function (e) {
    var t = e.target && e.target.nodeType === 1 ? e.target : null, root = t && closest(t, ROOT);
    if (root && root._amcCenter && (!e.relatedTarget || closest(e.relatedTarget, ROOT) !== root)) centre(root, null);
  });
  if (w.apex && w.apex.jQuery) {
    w.apex.jQuery(d).on("apexafterrefresh", function (e) {
      var t = e.target && e.target.nodeType === 1 ? e.target : null, roots = d.querySelectorAll("." + ROOT);
      for (var i = 0; i < roots.length; i++) {
        if (!t || roots[i].contains(t) || t.contains(roots[i])) { init(roots[i]); refresh(roots[i]); }
      }
    });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initAll); else initAll();

  w.amcTplDualView = {
    init: initAll,
    show: function (elm, view) { var r = closest(elm, ROOT); if (r) { init(r); setView(r, view, true); } },
    refresh: function (elm) { var r = closest(elm, ROOT); if (r) { init(r); refresh(r); } },
    data: function (elm) {
      var r = closest(elm, ROOT), x = r && r._amcRes;
      return x ? { column: x.key.header, labels: x.label ? x.label.header : null, items: x.items.map(function (i) { return { label: i.label, value: i.v }; }), total: x.total } : null;
    }
  };
})(window, document);
