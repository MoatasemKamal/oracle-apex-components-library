/* Insight Frame: region template script. Reads the report table inside the region body (never
   changes it), finds the numeric columns, and shows an insight strip in the header: row count,
   total, average and largest (optionally smallest) of the key numeric column, a share-of-total
   distribution bar, and a thin share bar under every row drawn in an overlay layer. Hovering or
   focusing a strip value highlights the matching row; hovering a row lights its segment.
   Recomputes after apexafterrefresh and on body mutations. Without a table, or without
   JavaScript, the region is a plain frame. */
(function (w, d) {
  "use strict";
  if (w.amcTplInsightFrame) return;
  var ROOT = "amc-TInsightFrame", P = ROOT + "-";
  var MAX_BARS = 250, MAX_SEGMENTS = 60;
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

  /* ------------------------------------------------------------ compute + render */
  function parts(root) {
    if (root._amcIF) return root._amcIF;
    var p = {};
    var walk = function (node, depth) {
      for (var i = 0; i < node.children.length; i++) {
        var ch = node.children[i], m = /amc-TInsightFrame-(\w+)/.exec(ch.className || "");
        if (m && !p[m[1]]) p[m[1]] = ch;
        if (depth < 2 && m && m[1] !== "body") walk(ch, depth + 1);
      }
    };
    walk(root, 0);
    if (!p.insight || !p.body || !p.layer) return null;
    root._amcIF = p;
    return p;
  }

  function compute(root) {
    var p = parts(root);
    if (!p) return null;
    var data = readTable(p.body);
    if (!data || !data.rows.length) return null;
    var cols = analyse(data), key = pickKey(root, cols);
    if (!key) return null;
    var lab = pickLabel(root, cols), rows = [], total = 0, count = 0, max = null, min = null, neg = false;
    for (var r = 0; r < data.rows.length; r++) {
      var v = key.vals[r];
      rows.push({ tr: data.rows[r], v: v ? v.v : null, label: lab ? lab.texts[r] : "", text: key.texts[r] });
      if (!v) continue;
      count++;
      total += v.v;
      if (v.v < 0) neg = true;
      if (!max || v.v > max.v) max = { v: v.v, i: r };
      if (!min || v.v < min.v) min = { v: v.v, i: r };
    }
    if (!count) return null;
    total = Math.round(total * 1e6) / 1e6;
    return {
      rows: rows, key: key, label: lab, total: total, count: count, avg: total / count,
      max: max, min: min, shares: !neg && total > 0 && !key.percent,
      sig: data.headers.join("|") + "#" + key.index + "#" + key.texts.join("|")
    };
  }

  function stat(dl, name, value, rowIndex, who) {
    var item = el("div", P + "stat");
    item.appendChild(el("dt", P + "statLabel", name));
    var dd = el("dd", P + "statValue");
    if (rowIndex !== undefined) {
      var b = el("button", P + "pick", value);
      b.type = "button";
      b.setAttribute("data-amc-row", String(rowIndex));
      if (who) b.setAttribute("aria-label", value + ", " + who);
      dd.appendChild(b);
      if (who) dd.appendChild(el("span", P + "who", who));
    } else dd.textContent = value;
    item.appendChild(dd);
    dl.appendChild(item);
  }

  function render(root, res) {
    var p = parts(root), meta = res.key.meta, ins = p.insight;
    var avgHead = has(root, "avgHeadline") || res.key.percent;
    var L = {
      rows: label(root, "rows", "Rows"), total: label(root, "total", "Total"), average: label(root, "average", "Average"),
      largest: label(root, "largest", "Largest"), smallest: label(root, "smallest", "Smallest"), share: label(root, "share", "of total")
    };
    var extra = meta.dec === 0 && Math.abs(res.avg) < 10 ? 1 : 0;
    var totalTxt = fmt(res.total, meta), avgTxt = fmt(res.avg, meta, extra);
    var maxTxt = fmt(res.max.v, meta), minTxt = fmt(res.min.v, meta);
    var maxWho = res.rows[res.max.i].label, minWho = res.rows[res.min.i].label;
    clear(ins);

    var head = el("div", P + "headline");
    var hv = el("span", P + "hlValue", avgHead ? avgTxt : totalTxt);
    var hl = el("span", P + "hlLabel");
    hl.appendChild(el("span", P + "hlKind", avgHead ? L.average : L.total));
    hl.appendChild(el("span", P + "hlCol", res.key.header));
    head.appendChild(hl);
    head.appendChild(hv);
    ins.appendChild(head);

    var dl = el("dl", P + "stats");
    stat(dl, L.rows, String(res.rows.length));
    // A total of percentages means nothing: percentage columns show the range instead.
    if (!res.key.percent) stat(dl, avgHead ? L.total : L.average, avgHead ? totalTxt : avgTxt);
    stat(dl, L.largest, maxTxt, res.max.i, maxWho);
    if ((has(root, "minMax") || res.key.percent) && res.count > 1) stat(dl, L.smallest, minTxt, res.min.i, minWho);
    ins.appendChild(dl);

    root._amcSegs = [];
    if (res.shares && res.rows.length <= MAX_SEGMENTS) {
      var dist = el("div", P + "dist");
      dist.setAttribute("aria-hidden", "true");
      for (var i = 0; i < res.rows.length; i++) {
        var v = res.rows[i].v;
        if (!(v > 0)) { root._amcSegs.push(null); continue; }
        var seg = el("span", P + "seg");
        seg.style.flexGrow = String(v / res.total);
        seg.setAttribute("data-amc-row", String(i));
        dist.appendChild(seg);
        root._amcSegs.push(seg);
      }
      ins.appendChild(dist);
    }
    root._amcReadout = null;
    if (res.shares) {
      var ro = el("p", P + "readout");
      ro.setAttribute("aria-hidden", "true");
      ins.appendChild(ro);
      root._amcReadout = ro;
      root._amcDefaultReadout = maxWho ? maxWho + ": " + pct(res.max.v / res.total) + " " + L.share : "";
      ro.textContent = root._amcDefaultReadout;
    }

    // Row share bars in the overlay layer.
    clear(p.layer);
    root._amcBars = [];
    if (res.shares && !has(root, "noBars") && res.rows.length <= MAX_BARS) {
      for (i = 0; i < res.rows.length; i++) {
        var bar = el("span", P + "bar");
        root._amcBars.push(bar);
        p.layer.appendChild(bar);
      }
    }
    root._amcMark = el("span", P + "mark");
    p.layer.appendChild(root._amcMark);

    ins.hidden = false;
    root.classList.add("is-live");
    root.setAttribute("data-amc-total", String(res.total));
    root.setAttribute("data-amc-key-column", res.key.header);

    var summary = L.rows + ": " + res.rows.length + ". " + (res.key.percent ? "" : L.total + " " + res.key.header + ": " + totalTxt + ". ") +
      L.average + (res.key.percent ? " " + res.key.header : "") + ": " + avgTxt + ". " + L.largest + ": " + maxTxt + (maxWho ? ", " + maxWho : "") + ".";
    if (p.live && root._amcAnnounced) p.live.textContent = summary;
    root._amcAnnounced = true;
    root._amcSummary = summary;
    if (root._amcShown) {
      ins.classList.remove("is-updated");
      void ins.offsetWidth;
      ins.classList.add("is-updated");
    }
    root._amcShown = true;
  }

  function plain(root) {
    var p = parts(root);
    if (!p) return;
    p.insight.hidden = true;
    clear(p.insight);
    clear(p.layer);
    root._amcBars = [];
    root._amcSegs = [];
    root._amcMark = null;
    root._amcRes = null;
    root.classList.remove("is-live");
    root.removeAttribute("data-amc-total");
  }

  /* ------------------------------------------------------------ overlay geometry */
  function layout(root) {
    var res = root._amcRes, p = parts(root);
    if (!res || !p) return;
    var s = p.layer.getBoundingClientRect(), isRtl = rtl(root);
    for (var i = 0; i < root._amcBars.length; i++) {
      var bar = root._amcBars[i], row = res.rows[i], r = row.tr.getBoundingClientRect();
      if (!r.height || !(row.v > 0)) { bar.style.display = "none"; continue; }
      var wdt = r.width * (row.v / res.total);
      bar.style.display = "";
      bar.style.top = (r.bottom - s.top - 2) + "px";
      bar.style.left = (isRtl ? r.right - s.left - wdt : r.left - s.left) + "px";
      bar.style.width = wdt + "px";
    }
    if (root._amcMarked !== undefined && root._amcMarked !== null) place(root, root._amcMarked);
  }
  function place(root, i) {
    var res = root._amcRes, m = root._amcMark, p = parts(root);
    if (!res || !m || !res.rows[i]) return;
    var s = p.layer.getBoundingClientRect(), r = res.rows[i].tr.getBoundingClientRect();
    m.style.top = (r.top - s.top) + "px";
    m.style.left = (r.left - s.left) + "px";
    m.style.width = r.width + "px";
    m.style.height = r.height + "px";
  }
  function highlight(root, i) {
    var res = root._amcRes;
    if (!res) return;
    if (root._amcMarked === i) return;
    root._amcMarked = i;
    for (var k = 0; k < root._amcSegs.length; k++) if (root._amcSegs[k]) root._amcSegs[k].classList.toggle("is-on", k === i);
    for (k = 0; k < root._amcBars.length; k++) root._amcBars[k].classList.toggle("is-on", k === i);
    root.classList.toggle("is-marking", i !== null);
    if (i === null) {
      if (root._amcMark) root._amcMark.classList.remove("is-on");
      if (root._amcReadout) root._amcReadout.textContent = root._amcDefaultReadout;
      return;
    }
    place(root, i);
    if (root._amcMark) root._amcMark.classList.add("is-on");
    var row = res.rows[i];
    if (root._amcReadout && row) {
      root._amcReadout.textContent = (row.label ? row.label + ": " : "") + row.text +
        (res.shares && row.v > 0 ? " (" + pct(row.v / res.total) + " " + label(root, "share", "of total") + ")" : "");
    }
  }

  /* ------------------------------------------------------------ lifecycle */
  function refresh(root) {
    var res = compute(root);
    if (!res) { if (root._amcRes || root.classList.contains("is-live") || !root._amcInit) plain(root); root._amcInit = true; return; }
    root._amcInit = true;
    if (root._amcRes && root._amcRes.sig === res.sig) { root._amcRes.rows = res.rows; layout(root); return; }
    root._amcRes = res;
    root._amcMarked = null;
    render(root, res);
    layout(root);
  }
  var pending = [];
  function schedule(root) {
    if (pending.indexOf(root) < 0) pending.push(root);
    clearTimeout(schedule.t);
    schedule.t = setTimeout(function () {
      var list = pending; pending = [];
      for (var i = 0; i < list.length; i++) refresh(list[i]);
    }, 120);
  }
  function init(root) {
    if (root._amcObs !== undefined) return;
    var p = parts(root);
    root._amcObs = null;
    if (!p) return;
    refresh(root);
    if (w.MutationObserver) {
      root._amcObs = new MutationObserver(function () { schedule(root); });
      root._amcObs.observe(p.body, { childList: true, subtree: true, characterData: true });
    }
    if (w.ResizeObserver) {
      new w.ResizeObserver(function () { raf(root); }).observe(p.stage || p.body);
    }
  }
  function initAll() {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }
  var queued = [];
  function raf(root) {
    if (queued.indexOf(root) >= 0) return;
    queued.push(root);
    if (queued.length === 1) (w.requestAnimationFrame || setTimeout)(function () {
      var list = queued; queued = [];
      for (var i = 0; i < list.length; i++) layout(list[i]);
    });
  }

  /* ------------------------------------------------------------ events (delegated) */
  function target(e) {
    var t = e.target && e.target.nodeType === 1 ? e.target : null;
    var root = t && closest(t, ROOT);
    return root && root._amcRes ? { t: t, root: root } : null;
  }
  function rowIndexFor(root, t) {
    var pick = t.closest ? t.closest("[data-amc-row]") : null;
    if (pick && root.contains(pick) && closest(pick, ROOT) === root) return +pick.getAttribute("data-amc-row");
    var p = parts(root);
    if (!p.body.contains(t)) return null;
    var rows = root._amcRes.rows;
    for (var n = t; n && n !== p.body; n = n.parentNode) {
      if (n.tagName === "TR") { for (var i = 0; i < rows.length; i++) if (rows[i].tr === n) return i; return null; }
    }
    return null;
  }
  d.addEventListener("pointerover", function (e) {
    var x = target(e);
    if (!x) return;
    var i = rowIndexFor(x.root, x.t);
    // Hovering the table itself only lights the strip; the ring is for strip-to-row pointing.
    if (i === null) { highlight(x.root, null); return; }
    highlight(x.root, i);
    if (parts(x.root).body.contains(x.t) && x.root._amcMark) x.root._amcMark.classList.remove("is-on");
  });
  d.addEventListener("pointerout", function (e) {
    var x = target(e);
    if (!x) return;
    var to = e.relatedTarget;
    if (!to || closest(to, ROOT) !== x.root) highlight(x.root, null);
  });
  d.addEventListener("focusin", function (e) {
    var x = target(e);
    if (x && x.t.hasAttribute("data-amc-row")) highlight(x.root, +x.t.getAttribute("data-amc-row"));
  });
  d.addEventListener("focusout", function (e) {
    var x = target(e);
    if (x && x.t.hasAttribute("data-amc-row")) highlight(x.root, null);
  });
  d.addEventListener("click", function (e) {
    // Clicking a strip value brings its row into view (keyboard: Enter or Space on the button).
    var x = target(e);
    if (!x || !x.t.classList.contains(P + "pick")) return;
    var i = +x.t.getAttribute("data-amc-row"), row = x.root._amcRes.rows[i];
    if (!row) return;
    var rm = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (row.tr.scrollIntoView) row.tr.scrollIntoView({ block: "nearest", behavior: rm ? "auto" : "smooth" });
    highlight(x.root, null);
    highlight(x.root, i);
  });
  d.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var x = target(e);
    if (x) highlight(x.root, null);
  });
  d.addEventListener("scroll", function (e) {
    var t = e.target && e.target.nodeType === 1 ? e.target : null;
    var roots = d.querySelectorAll("." + ROOT + ".is-live");
    for (var i = 0; i < roots.length; i++) if (!t || roots[i].contains(t) || t.contains(roots[i])) raf(roots[i]);
  }, true);
  w.addEventListener("resize", function () {
    var roots = d.querySelectorAll("." + ROOT + ".is-live");
    for (var i = 0; i < roots.length; i++) raf(roots[i]);
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

  w.amcTplInsightFrame = {
    init: initAll,
    refresh: function (elm) { var r = closest(elm, ROOT); if (r) { init(r); refresh(r); } },
    result: function (elm) {
      var r = closest(elm, ROOT), x = r && r._amcRes;
      return x ? { column: x.key.header, rows: x.rows.length, total: x.total, average: x.avg, max: x.max.v, min: x.min.v, summary: r._amcSummary } : null;
    },
    parseNumber: function (s) { var x = parseNum(s); return x ? x.v : null; }
  };
})(window, document);
