/* Peak End Summary: region template script. Runs the one orchestrated moment: the number in the
   body's [data-amc-peak] element counts up from zero to its value (same currency text, group
   separator, decimals and digits, Western or Arabic-Indic), then the text node is set back to
   exactly the original string, so the end state is the static markup. The CSS bloom and bar are
   timed to land with it. It runs once per value: a refresh with the same figure does not replay,
   a new figure does. Under reduced motion or with the Still option nothing counts. The peak is
   announced once through a polite status. Re-inits after apexafterrefresh, with a
   MutationObserver fallback. */
(function (w, d) {
  "use strict";
  if (w.amcTplPeakEndSummary) return;
  var ROOT = "amc-TPeakEndSummary", P = ROOT + "-";
  var AI = "٠١٢٣٤٥٦٧٨٩";

  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList && el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function part(root, name) { return root.querySelector("." + P + name); }
  function reduced() { return !!(w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function toLatin(s) { return s.replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x660); }); }
  function norm(s) { return String(s || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, ""); }
  // Spoken form of the peak: label, figure and note as separate phrases.
  function spoken(peak) {
    var out = [];
    for (var n = peak.firstChild; n; n = n.nextSibling) { var t = norm(n.textContent); if (t) out.push(t); }
    return out.join(", ");
  }

  // Finds the first text node of the peak that holds a number and describes how it is written.
  function findNumber(peak) {
    var walker = d.createTreeWalker(peak, 4, null), n;
    while ((n = walker.nextNode())) {
      if (n.parentNode !== peak && n.parentNode.parentNode !== peak) continue;
      if (n.parentNode !== peak && /^(SPAN|SMALL)$/.test(n.parentNode.tagName)) continue; // labels
      var m = /^([\s\S]*?)([0-9٠-٩](?:[0-9٠-٩.,٫٬   ]*[0-9٠-٩])?)([\s\S]*)$/.exec(n.nodeValue);
      if (!m) continue;
      var raw = m[2], arabic = /[٠-٩]/.test(raw), lat = toLatin(raw).replace(/٫/g, ".").replace(/٬/g, ",");
      var seps = lat.replace(/[0-9]/g, ""), dec = "", grp = "";
      var lc = lat.lastIndexOf(","), ld = lat.lastIndexOf("."), ls = Math.max(lat.lastIndexOf(" "), lat.lastIndexOf(" "), lat.lastIndexOf(" "));
      if (lc >= 0 && ld >= 0) { dec = lc > ld ? "," : "."; grp = lc > ld ? "." : ","; }
      else if (lc >= 0 || ld >= 0) {
        var c = lc >= 0 ? "," : ".", parts = lat.split(c);
        if (parts.length === 2 && parts[1].length !== 3) dec = c; else grp = c;
      }
      if (!grp && ls >= 0) grp = lat.charAt(ls);
      if (dec && ls >= 0 && !grp) grp = lat.charAt(ls);
      var ip = lat, fp = "";
      if (dec) { ip = lat.slice(0, lat.lastIndexOf(dec)); fp = lat.slice(lat.lastIndexOf(dec) + 1); }
      ip = ip.replace(/[^0-9]/g, "");
      if (!ip || seps.length > 12) continue;
      var value = parseFloat(ip + (fp ? "." + fp : ""));
      if (!isFinite(value)) continue;
      var decOut = dec && arabic && raw.indexOf("٫") >= 0 ? "٫" : dec;
      var grpOut = grp && arabic && raw.indexOf("٬") >= 0 ? "٬" : grp;
      return { node: n, pre: m[1], post: m[3], value: value, decimals: fp.length, dec: decOut, grp: grpOut, arabic: arabic, original: n.nodeValue };
    }
    return null;
  }
  function format(x, v) {
    var s = v.toFixed(x.decimals), ip = s.split(".")[0], fp = s.split(".")[1] || "";
    if (x.grp) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, x.grp);
    var out = ip + (fp ? x.dec + fp : "");
    if (x.arabic) out = out.replace(/[0-9]/g, function (c) { return AI.charAt(+c); });
    return x.pre + out + x.post;
  }

  function run(root, force) {
    var body = part(root, "body"), peak = body && body.querySelector("[data-amc-peak]");
    if (!peak) return;
    var key = norm(peak.textContent);
    if (!force && root._amcDoneFor === key) return;
    var first = root._amcDoneFor === undefined;
    root._amcDoneFor = key;
    var live = part(root, "live");
    var say = spoken(peak), tpl = root.getAttribute("data-amc-text-announce");
    if (live) live.textContent = tpl ? tpl.replace(/%0/g, say) : say;
    if (reduced() || root.classList.contains(ROOT + "--still")) { root.classList.add("is-settled"); return; }
    var x = findNumber(peak);
    if (!first) restartCss(root);
    if (!x || x.value === 0) { root.classList.add("is-settled"); return; }
    var ms = Math.min(4000, Math.max(300, parseInt(root.getAttribute("data-amc-ms"), 10) || 1100));
    var t0 = null, raf = w.requestAnimationFrame || function (f) { return setTimeout(function () { f(Date.now()); }, 16); };
    root.classList.remove("is-settled");
    root.classList.add("is-counting");
    peak.setAttribute("aria-busy", "true");
    x.node.nodeValue = format(x, 0);
    root._amcStop = function () {
      x.node.nodeValue = x.original;   // the end state is the original markup, exactly
      peak.removeAttribute("aria-busy");
      root.classList.remove("is-counting");
      root.classList.add("is-settled");
      root._amcStop = null;
    };
    function frame(t) {
      if (!root._amcStop) return;
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / ms);
      var e = 1 - Math.pow(1 - p, 4);   // ease out quart: fast start, soft landing
      if (p >= 1) { root._amcStop(); return; }
      x.node.nodeValue = format(x, x.value * e);
      raf(frame);
    }
    raf(frame);
  }
  // A new figure after a refresh replays the CSS bloom and bar as well.
  function restartCss(root) {
    root.classList.add("is-replay");
    void root.offsetWidth;
    root.classList.remove("is-replay");
  }
  function init(root) {
    if (root._amcInit) return;
    root._amcInit = true;
    run(root);
    var body = part(root, "body");
    if (w.MutationObserver && body) {
      root._amcObs = new MutationObserver(function () {
        if (root.classList.contains("is-counting")) return; // our own count
        clearTimeout(root._amcT);
        root._amcT = setTimeout(function () { run(root); }, 80);
      });
      root._amcObs.observe(body, { childList: true, subtree: true, characterData: true });
    }
  }
  function initAll() {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }
  if (w.apex && w.apex.jQuery) {
    w.apex.jQuery(d).on("apexafterrefresh", function (e) {
      var t = e.target && e.target.nodeType === 1 ? e.target : null, roots = d.querySelectorAll("." + ROOT);
      for (var i = 0; i < roots.length; i++) {
        if (!t || roots[i].contains(t) || t.contains(roots[i])) { if (roots[i]._amcStop) roots[i]._amcStop(); init(roots[i]); run(roots[i]); }
      }
    });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initAll); else initAll();

  w.amcTplPeakEndSummary = {
    init: initAll,
    replay: function (elm) { var r = closest(elm, ROOT); if (r) { if (r._amcStop) r._amcStop(); run(r, true); } },
    finish: function (elm) { var r = closest(elm, ROOT); if (r && r._amcStop) r._amcStop(); },
    parse: function (elm) { var x = findNumber(elm); return x ? { value: x.value, decimals: x.decimals, text: format(x, x.value) } : null; }
  };
})(window, document);
