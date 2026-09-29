/* Readable Article: region template script. Builds a table of contents from the h2 and h3
   headings of the region body, gives every h2 to h4 an id and a copy-link anchor, shows the
   reading time, tracks reading progress (a hairline on narrow regions, the contents rail on wide
   ones) and the current section, and switches between the sticky side contents and the
   collapsible top contents by the region's own width. Detects Arabic text for taller leading.
   Rebuilds after apexafterrefresh and when the body changes. Without JavaScript the region is a
   plain, well-set article. */
(function (w, d) {
  "use strict";
  if (w.amcTplReadableArticle) return;
  var ROOT = "amc-TReadableArticle", P = ROOT + "-";
  var WIDE = 880, TOC_MIN = 2;
  var AR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, LAT = /[A-Za-z\u00C0-\u024F]/g;

  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList && el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function el(tag, cls, text) {
    var e = d.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function txt(root, key, fallback, arg) {
    var s = root.getAttribute("data-amc-text-" + key) || fallback;
    return arg === undefined ? s : s.replace(/%0/g, arg);
  }
  function has(root, opt) { return root.classList.contains(ROOT + "--" + opt); }
  function reduced() { return !!(w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function part(root, name) { return root.querySelector("." + P + name); }
  function headingText(h) {
    // Heading text without our own anchor glyph.
    var s = "";
    for (var n = h.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 1 && n.classList.contains(P + "anchor")) continue;
      s += n.textContent;
    }
    return s.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  }
  function slug(s) {
    var out = s.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[^a-z0-9\u00C0-\u024F\u0600-\u06FF\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return out.slice(0, 60) || "section";
  }

  /* ------------------------------------------------------------ build */
  function build(root) {
    var body = part(root, "body"), toc = part(root, "toc"), list = part(root, "list"), meta = part(root, "meta");
    if (!body) return;
    root._amcBusy = true;
    var text = body.textContent || "";
    var ar = (text.match(AR) || []).length, lat = (text.match(LAT) || []).length;
    var arabic = ar > lat;
    root.classList.toggle("is-arabic", arabic);

    // Reading time: words over words per minute (Arabic reads a little slower per word).
    var words = text.replace(/^\s+|\s+$/g, "").split(/\s+/).filter(function (x) { return /[0-9A-Za-z\u00C0-\u024F\u0600-\u06FF]/.test(x); }).length;
    var wpm = parseInt(root.getAttribute("data-amc-wpm"), 10) || (arabic ? 180 : 220);
    var minutes = Math.max(1, Math.round(words / wpm));
    var heads = body.querySelectorAll("h2, h3, h4");
    if (meta) {
      clear(meta);
      if (words > 0) {
        var item = el("span", P + "metaItem");
        item.appendChild(el("span", P + "metaIcon fa fa-clock-o")).setAttribute("aria-hidden", "true");
        item.appendChild(el("span", P + "metaText", txt(root, "minutes", "%0 min read", minutes)));
        meta.appendChild(item);
        meta.hidden = false;
      } else meta.hidden = true;
    }

    // Ids and anchors on every h2..h4 of the body; contents from h2 and h3 (or h3 and h4 when
    // the body starts at h3).
    var used = {}, rid = root.id || "amc-article", entries = [];
    var top = body.querySelector("h2") ? 2 : 3;
    for (var i = 0; i < heads.length; i++) {
      var h = heads[i], label = headingText(h);
      if (!label) continue;
      if (!h.id) {
        var base = rid + "-" + slug(label), id = base, k = 2;
        while (used[id] || d.getElementById(id)) id = base + "-" + k++;
        h.id = id;
        h.setAttribute("data-amc-generated-id", "");
      }
      used[h.id] = true;
      var a = h.querySelector("." + P + "anchor");
      if (!a) {
        a = el("a", P + "anchor", "#");
        h.appendChild(a);
      }
      a.setAttribute("href", "#" + h.id);
      a.setAttribute("aria-label", txt(root, "anchor", "Copy link to section: %0", label));
      var lvl = +h.tagName.charAt(1);
      if (lvl === top || lvl === top + 1) entries.push({ h: h, label: label, lvl: lvl === top ? 2 : 3 });
    }
    root._amcHeads = entries;
    if (list) {
      clear(list);
      for (var j = 0; j < entries.length; j++) {
        var li = el("li", P + "item " + P + "item--h" + entries[j].lvl);
        var link = el("a", P + "link", entries[j].label);
        link.setAttribute("href", "#" + entries[j].h.id);
        link.setAttribute("data-amc-target", entries[j].h.id);
        li.appendChild(link);
        list.appendChild(li);
      }
    }
    var tops = 0;
    for (var t = 0; t < entries.length; t++) if (entries[t].lvl === 2) tops++;
    if (toc) toc.hidden = tops < TOC_MIN || has(root, "compact") || has(root, "noToc");
    root._amcBuilt = true;
    layout(root, true);
    root._amcBusy = false;
    if (root._amcObs) root._amcObs.takeRecords();
  }

  /* ------------------------------------------------------------ layout and progress */
  function layout(root, force) {
    var toc = part(root, "toc"), det = part(root, "details"), body = part(root, "body");
    if (!body) return;
    var wide = root.getBoundingClientRect().width >= WIDE && toc && !toc.hidden;
    if (force || wide !== root._amcWide) {
      root.classList.toggle("is-wide", !!wide);
      // Wide: contents open beside the text. Narrow: collapsed on top until the reader opens it.
      if (det && (root._amcWide === undefined || wide !== root._amcWide)) det.open = !!wide;
      root._amcWide = !!wide;
    }
    track(root);
  }
  function track(root) {
    var body = part(root, "body");
    if (!body) return;
    var r = body.getBoundingClientRect(), vh = w.innerHeight || d.documentElement.clientHeight;
    var long = r.height > vh * 1.25;
    root.classList.toggle("is-long", long);
    var p = long ? Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh * 0.6))) : 0;
    if (r.bottom <= vh) p = long ? 1 : 0;
    root.style.setProperty("--amc-tra-p", p.toFixed(4));
    root._amcProgress = p;

    // Current section: the last heading whose top has passed a line a quarter down the view.
    var heads = root._amcHeads || [], line = vh * 0.25, cur = null;
    for (var i = 0; i < heads.length; i++) if (heads[i].h.getBoundingClientRect().top <= line) cur = heads[i].h.id;
    if (!cur && heads.length && r.top < line) cur = heads[0].h.id;
    if (cur !== root._amcCurrent) {
      root._amcCurrent = cur;
      var links = root.querySelectorAll("." + P + "link");
      for (var j = 0; j < links.length; j++) {
        if (links[j].getAttribute("data-amc-target") === cur) links[j].setAttribute("aria-current", "location");
        else links[j].removeAttribute("aria-current");
      }
    }
  }
  var queued = [];
  function raf(root) {
    if (queued.indexOf(root) >= 0) return;
    queued.push(root);
    if (queued.length === 1) (w.requestAnimationFrame || setTimeout)(function () {
      var l = queued; queued = [];
      for (var i = 0; i < l.length; i++) layout(l[i]);
    });
  }
  function schedule(root) {
    if (root._amcBusy) return;
    clearTimeout(root._amcT);
    root._amcT = setTimeout(function () { build(root); }, 120);
  }

  /* ------------------------------------------------------------ navigation */
  function go(root, id, focusIt) {
    var h = d.getElementById(id);
    if (!h || !root.contains(h)) return;
    h.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" });
    if (focusIt) {
      if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
      try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); }
    }
    try { if (w.history && history.replaceState) history.replaceState(null, "", "#" + id); } catch (e2) { /* sandboxed */ }
  }
  function copy(text, done) {
    try {
      if (w.navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
        return;
      }
    } catch (e) { /* not allowed */ }
    done();
  }
  d.addEventListener("click", function (e) {
    var t = e.target && e.target.nodeType === 1 ? e.target : null;
    if (!t) return;
    var link = closest(t, P + "link"), anchor = closest(t, P + "anchor"), root = closest(t, ROOT);
    if (!root || (!link && !anchor)) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button > 0) return;
    e.preventDefault();
    if (link) {
      var id = link.getAttribute("data-amc-target");
      go(root, id, true);
      // Narrow: close the contents after a pick so the text is in view.
      var det = part(root, "details");
      if (det && !root.classList.contains("is-wide")) det.open = false;
      return;
    }
    var hid = anchor.getAttribute("href").slice(1), h = d.getElementById(hid);
    go(root, hid, false);
    var url = String(w.location.href).split("#")[0] + "#" + hid;
    copy(url, function () {
      anchor.classList.add("is-copied");
      anchor.textContent = "\u2713";
      var live = part(root, "live");
      if (live) live.textContent = txt(root, "copied", "Link to %0 copied", h ? headingText(h) : hid);
      clearTimeout(anchor._amcT);
      anchor._amcT = setTimeout(function () { anchor.classList.remove("is-copied"); anchor.textContent = "#"; }, 1800);
    });
  });
  w.addEventListener("scroll", function () {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) if (roots[i]._amcBuilt) raf(roots[i]);
  }, { passive: true, capture: true });
  w.addEventListener("resize", function () {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) if (roots[i]._amcBuilt) raf(roots[i]);
  });

  /* ------------------------------------------------------------ lifecycle */
  function init(root) {
    if (root._amcInit) return;
    root._amcInit = true;
    build(root);
    var body = part(root, "body");
    if (w.MutationObserver && body) {
      root._amcObs = new MutationObserver(function () { schedule(root); });
      root._amcObs.observe(body, { childList: true, subtree: true, characterData: true });
    }
    if (w.ResizeObserver) new w.ResizeObserver(function () { raf(root); }).observe(root);
    // Opening the page on a section link: land on it once the contents exist.
    var hash = (w.location.hash || "").slice(1);
    if (hash) {
      try { hash = decodeURIComponent(hash); } catch (e) { /* keep raw */ }
      var h = d.getElementById(hash);
      if (h && body && body.contains(h)) setTimeout(function () { h.scrollIntoView({ block: "start" }); }, 0);
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
        if (!t || roots[i].contains(t) || t.contains(roots[i])) { init(roots[i]); build(roots[i]); }
      }
    });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initAll); else initAll();

  w.amcTplReadableArticle = {
    init: initAll,
    refresh: function (elm) { var r = closest(elm, ROOT); if (r) { init(r); build(r); } },
    state: function (elm) {
      var r = closest(elm, ROOT);
      if (!r) return null;
      var links = r.querySelectorAll("." + P + "link"), m = r.querySelector("." + P + "meta");
      return {
        contents: Array.prototype.map.call(links, function (a) { return a.textContent; }),
        minutes: m ? m.textContent : "",
        wide: r.classList.contains("is-wide"),
        arabic: r.classList.contains("is-arabic"),
        progress: r._amcProgress || 0,
        current: r._amcCurrent || null
      };
    }
  };
})(window, document);
