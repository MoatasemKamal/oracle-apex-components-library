/* APEX Modern Components - Skeleton Region template runtime.
 * Loading states under the Doherty threshold: when the region refreshes (apexbeforerefresh until
 * apexafterrefresh), a skeleton that mirrors the CURRENT content is laid over the body: one bone
 * per line of text, an outline per form field, button or card, a block per image or chart and a
 * rule per report row, all measured from the existing DOM just before the refresh. It appears
 * only when loading takes longer than the threshold (data-amc-delay, 400 ms), and once shown it
 * stays at least data-amc-min-show (350 ms) so it never flashes. The stage keeps its height while
 * loading, so nothing jumps. With the First load option an empty body (lazy-loading regions) gets
 * a synthetic shape (data-amc-skeleton="report|cards|form|text", data-amc-skeleton-rows) until
 * content arrives. Under reduced motion the skeleton is static: no shimmer, no fade.
 * ES5, delegated jQuery events guarded, textContent only, MutationObserver fallback for
 * first-load content. API: amcTplSkeletonRegion.start(el), stop(el), shape(el), state(el). */
(function (w, d) {
  "use strict";
  if (w.amcTplSkeletonRegion || !d.querySelectorAll || !d.addEventListener) { return; }

  var ROOT = "amc-TSkeletonRegion";
  var P = ROOT + "-";
  var MAX_BONES = 700;
  var FAILSAFE = 60000;

  function matches(el, sel) {
    var f = el && el.nodeType === 1 && (el.matches || el.msMatchesSelector || el.webkitMatchesSelector);
    return f ? f.call(el, sel) : false;
  }
  function closest(el, sel) {
    while (el && el.nodeType === 1) { if (matches(el, sel)) { return el; } el = el.parentNode; }
    return null;
  }
  function each(list, fn) { for (var i = 0; i < list.length; i++) { fn(list[i], i); } }
  function str(root, key, fallback) { var v = root.getAttribute("data-amc-" + key); return v ? v : fallback; }
  function num(root, key, fallback) { var v = parseInt(root.getAttribute("data-amc-" + key), 10); return isNaN(v) ? fallback : v; }
  function fmt(t, a) { return String(t).replace("%0", a); }
  function part(root, name) { return root.querySelector("." + P + name); }
  function rootOf(el) { return closest(el, "." + ROOT); }
  function has(root, opt) { return root.classList.contains(ROOT + "--" + opt); }
  function reduced() { return !!(w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function titleOf(root) { var t = part(root, "title"); return t ? (t.textContent || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "") : ""; }
  function now() { return Date.now ? Date.now() : new Date().getTime(); }

  // ------------------------------------------------------------ measure
  function visibleBox(el) {
    var cs = w.getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && parseFloat(cs.opacity || "1") > 0.05;
  }
  function painted(cs) {
    var bg = cs.backgroundColor || "";
    var hasBg = !(bg === "transparent" || /rgba\([^)]*,\s*0\)$/.test(bg) || /\/\s*0\)$/.test(bg)) || (cs.backgroundImage && cs.backgroundImage !== "none");
    var hasBorder = (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none") && (parseFloat(cs.borderLeftWidth) > 0 && cs.borderLeftStyle !== "none");
    return hasBg || hasBorder;
  }
  // The shape of what is in the body now, in px relative to the stage.
  function measure(root) {
    var stage = part(root, "stage");
    var body = part(root, "body");
    var shape = { w: 0, h: 0, bones: [] };
    if (!stage || !body) { return shape; }
    var sr = stage.getBoundingClientRect();
    shape.w = sr.width;
    shape.h = sr.height;
    var bones = shape.bones;
    function push(kind, r, extra) {
      if (bones.length >= MAX_BONES) { return; }
      var x = r.left - sr.left;
      var y = r.top - sr.top;
      if (r.width < 2 || r.height < 2 || x > sr.width || y > sr.height || x + r.width < 0 || y + r.height < 0) { return; }
      bones.push({ k: kind, x: x, y: y, w: Math.min(r.width, sr.width - Math.max(x, 0)), h: r.height, r: extra || 0 });
    }
    // Boxes first (fields, buttons, cards, media), then rules for table rows, then text lines.
    each(body.querySelectorAll("*"), function (el) {
      if (bones.length >= MAX_BONES || el.nodeType !== 1 || !visibleBox(el)) { return; }
      var tag = el.tagName;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) { return; }
      if (/^(IMG|SVG|CANVAS|VIDEO|PICTURE|IFRAME)$/i.test(tag) || tag.toLowerCase() === "svg") {
        if (!closest(el.parentNode, "svg")) { push("block", r, 6); }
        return;
      }
      if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(tag)) {
        if (/^(hidden)$/i.test(el.type || "")) { return; }
        var cr = /^(checkbox|radio)$/i.test(el.type || "") ? 3 : parseFloat(w.getComputedStyle(el).borderTopLeftRadius) || 4;
        push(tag === "BUTTON" ? "button" : "field", r, cr);
        return;
      }
      if (/^(TR)$/.test(tag)) { push("rule", { left: r.left, top: r.bottom - 1, width: r.width, height: 2 }); return; }
      if (/^(TABLE|TBODY|THEAD|TD|TH|HTML|BODY)$/.test(tag)) { return; }
      var cs = w.getComputedStyle(el);
      if (painted(cs) && r.width * r.height < sr.width * sr.height * 0.7 && r.width >= 24 && r.height >= 24) {
        push("box", r, parseFloat(cs.borderTopLeftRadius) || 0);
      }
    });
    var walker = d.createTreeWalker(body, 4, null, false);
    var range = d.createRange();
    var node;
    while ((node = walker.nextNode()) && bones.length < MAX_BONES) {
      if (!/\S/.test(node.nodeValue)) { continue; }
      var parent = node.parentNode;
      if (!parent || closest(parent, "script, style, noscript, option, select, textarea, button, svg")) { continue; }
      if (!visibleBox(parent)) { continue; }
      range.selectNodeContents(node);
      var rects = range.getClientRects();
      var size = parseFloat(w.getComputedStyle(parent).fontSize) || 14;
      for (var j = 0; j < rects.length; j++) {
        var t = rects[j];
        var hh = Math.max(6, Math.min(t.height, size) * 0.72);
        push("line", { left: t.left, top: t.top + (t.height - hh) / 2, width: t.width, height: hh }, 4);
      }
    }
    if (range.detach) { range.detach(); }
    return shape;
  }
  // First load with an empty body: a plain synthetic shape, in % of the stage width.
  function synthetic(root) {
    var stage = part(root, "stage");
    var body = part(root, "body");
    // Settings on the region (Custom Attributes) or on an element in the body (Static Content).
    var src = root.hasAttribute("data-amc-skeleton") || !body ? root : body.querySelector("[data-amc-skeleton]") || root;
    var kind = str(src, "skeleton", "report");
    var rows = Math.max(1, Math.min(20, num(src, "skeleton-rows", kind === "form" ? 4 : kind === "cards" ? 3 : 5)));
    var W = stage ? stage.getBoundingClientRect().width || 600 : 600;
    var bones = [];
    var y = 16;
    var pad = 18;
    var inner = Math.max(40, W - pad * 2);
    var widths = [0.62, 0.48, 0.74, 0.55, 0.68, 0.4];
    var i;
    if (kind === "cards") {
      var cols = Math.max(1, Math.min(4, Math.floor(inner / 180)));
      var cw = (inner - (cols - 1) * 12) / cols;
      for (i = 0; i < rows * cols && i < 24; i++) {
        var cx = pad + (i % cols) * (cw + 12);
        var cy = y + Math.floor(i / cols) * 104;
        bones.push({ k: "box", x: cx, y: cy, w: cw, h: 92, r: 8 });
        bones.push({ k: "line", x: cx + 14, y: cy + 18, w: cw * 0.45, h: 10, r: 4 });
        bones.push({ k: "line", x: cx + 14, y: cy + 44, w: cw * 0.7, h: 16, r: 4 });
      }
      return { w: W, h: y + Math.ceil(Math.min(rows * cols, 24) / cols) * 104 + 8, bones: bones };
    }
    if (kind === "form") {
      for (i = 0; i < rows; i++) {
        bones.push({ k: "line", x: pad, y: y, w: Math.min(160, inner * 0.35), h: 9, r: 4 });
        bones.push({ k: "field", x: pad, y: y + 18, w: inner, h: 36, r: 4 });
        y += 72;
      }
      return { w: W, h: y + 4, bones: bones };
    }
    if (kind === "text") {
      for (i = 0; i < rows; i++) { bones.push({ k: "line", x: pad, y: y, w: inner * (i === rows - 1 ? 0.5 : 0.94 - (i % 3) * 0.06), h: 10, r: 4 }); y += 22; }
      return { w: W, h: y + 12, bones: bones };
    }
    var colsR = inner > 520 ? 4 : inner > 300 ? 3 : 2;
    var colW = inner / colsR;
    for (var r = 0; r <= rows; r++) {
      for (var c = 0; c < colsR; c++) {
        var ww = colW * (r === 0 ? 0.4 : widths[(r + c) % widths.length]);
        var end = c === colsR - 1;
        bones.push({ k: "line", x: end ? pad + colW * (c + 1) - ww - 10 : pad + colW * c + 10, y: y + 12, w: ww, h: r === 0 ? 8 : 10, r: 4 });
      }
      bones.push({ k: "rule", x: pad, y: y + 35, w: inner, h: 1, r: 0 });
      y += 36;
    }
    return { w: W, h: y + 12, bones: bones };
  }

  // ------------------------------------------------------------ draw
  function draw(root, shape) {
    var sk = part(root, "skeleton");
    if (!sk) { return; }
    while (sk.firstChild) { sk.removeChild(sk.firstChild); }
    var frag = d.createDocumentFragment();
    each(shape.bones, function (b) {
      var el = d.createElement("span");
      el.className = P + "bone " + P + "bone--" + b.k;
      el.style.left = Math.round(b.x) + "px";
      el.style.top = Math.round(b.y) + "px";
      el.style.width = Math.max(2, Math.round(b.w)) + "px";
      el.style.height = Math.max(1, Math.round(b.h)) + "px";
      if (b.r) { el.style.borderRadius = Math.min(b.r, 12) + "px"; }
      frag.appendChild(el);
    });
    sk.appendChild(frag);
    root._amcShape = shape;
  }

  // ------------------------------------------------------------ state machine
  // idle -> waiting (threshold timer) -> shown (min show) -> idle. Fast loads never leave waiting.
  function st(root) {
    if (!root._amcSk) { root._amcSk = { phase: "idle" }; }
    return root._amcSk;
  }
  function begin(root, first) {
    var s = st(root);
    if (s.phase !== "idle") { return; }
    var stage = part(root, "stage");
    s.phase = "waiting";
    s.first = !!first;
    s.started = now();
    // Measure now, while the old content is still there.
    var shape = first ? synthetic(root) : measure(root);
    if (!shape.bones.length) { shape = synthetic(root); }
    s.shape = shape;
    if (stage) { stage.setAttribute("aria-busy", "true"); }
    clearTimeout(s.t1);
    s.t1 = setTimeout(function () { show(root); }, Math.max(0, num(root, "delay", 400)));
    clearTimeout(s.fs);
    s.fs = setTimeout(function () { end(root, true); }, FAILSAFE);
  }
  function show(root) {
    var s = st(root);
    if (s.phase !== "waiting") { return; }
    var stage = part(root, "stage");
    var sk = part(root, "skeleton");
    if (!sk || !stage) { return; }
    s.phase = "shown";
    s.shownAt = now();
    // Keep the stage as tall as the content was, so nothing below jumps while rows are replaced.
    if (s.shape.h) { stage.style.minHeight = Math.round(s.shape.h) + "px"; }
    draw(root, s.shape);
    sk.classList.remove("is-leaving");
    sk.hidden = false;
    root.classList.add("is-loading");
    if (has(root, "elapsed")) { tick(root); }
  }
  function tick(root) {
    var s = st(root);
    var el = part(root, "elapsed");
    if (!el || s.phase !== "shown") { return; }
    var secs = Math.floor((now() - s.started) / 1000);
    if (secs >= 3) {
      el.hidden = false;
      el.textContent = fmt(str(root, "label-still", "Still loading, %0 s"), secs);
      if (!s.said) { s.said = true; say(root, fmt(str(root, "label-slow", "%0 is still loading"), titleOf(root))); }
    }
    clearTimeout(s.t3);
    s.t3 = setTimeout(function () { tick(root); }, 1000 - ((now() - s.started) % 1000));
  }
  function end(root, force) {
    var s = st(root);
    if (s.phase === "idle") { return; }
    clearTimeout(s.t1);
    clearTimeout(s.fs);
    if (s.phase === "waiting") { finish(root, false); return; }
    var left = num(root, "min-show", 350) - (now() - s.shownAt);
    if (left > 0 && !force) {
      clearTimeout(s.t2);
      s.t2 = setTimeout(function () { finish(root, true); }, left);
    } else {
      finish(root, true);
    }
  }
  function finish(root, wasShown) {
    var s = st(root);
    var stage = part(root, "stage");
    var sk = part(root, "skeleton");
    var el = part(root, "elapsed");
    clearTimeout(s.t2);
    clearTimeout(s.t3);
    s.phase = "idle";
    s.said = false;
    if (stage) { stage.removeAttribute("aria-busy"); stage.style.minHeight = ""; }
    if (el) { el.hidden = true; el.textContent = ""; }
    root.classList.remove("is-loading");
    if (!sk || !wasShown) { return; }
    say(root, fmt(str(root, "label-done", "%0 updated"), titleOf(root)));
    if (reduced()) { sk.hidden = true; return; }
    sk.classList.add("is-leaving");
    setTimeout(function () { if (st(root).phase === "idle") { sk.hidden = true; sk.classList.remove("is-leaving"); } }, 160);
  }
  function say(root, text) {
    var live = part(root, "live");
    if (!live || !text) { return; }
    live.textContent = "";
    setTimeout(function () { live.textContent = text; }, 60);
  }

  // ------------------------------------------------------------ first load
  function hasContent(body) {
    if (!body) { return false; }
    if (/\S/.test(body.textContent || "")) { return true; }
    return !!body.querySelector("img, svg, canvas, input, select, textarea, table, iframe");
  }
  function initFirst(root) {
    if (root.getAttribute("data-amc-sk-init")) { return; }
    root.setAttribute("data-amc-sk-init", "1");
    if (has(root, "firstLoad") && !hasContent(part(root, "body"))) { begin(root, true); }
  }
  function initAll() { each(d.querySelectorAll("." + ROOT), initFirst); }

  // ------------------------------------------------------------ events
  function match(e, fn) {
    var t = e && e.target && e.target.nodeType === 1 ? e.target : null;
    if (!t) { return; }
    each(d.querySelectorAll("." + ROOT), function (r) {
      // The region element itself, anything inside it, or a wrapper whose only region is this one.
      if (r === t || r.contains(t)) { fn(r); }
    });
  }
  w.addEventListener("resize", function () {
    each(d.querySelectorAll("." + ROOT + ".is-loading"), function (r) {
      var s = st(r);
      if (s.phase !== "shown") { return; }
      // Re-measure only while the old content is still there; otherwise keep the drawn shape.
      if (!s.first && hasContent(part(r, "body"))) {
        var stage = part(r, "stage");
        stage.style.minHeight = "";
        var sh = measure(r);
        if (sh.bones.length) { s.shape = sh; draw(r, sh); }
        stage.style.minHeight = Math.round(s.shape.h) + "px";
      }
    });
  });

  function start() {
    initAll();
    if (w.apex && w.apex.jQuery) {
      w.apex.jQuery(d).on("apexbeforerefresh", function (e) { match(e, function (r) { begin(r, false); }); });
      w.apex.jQuery(d).on("apexafterrefresh", function (e) { match(e, function (r) { end(r, false); }); });
    }
    if (w.MutationObserver && d.body) {
      // Fallbacks: regions added later, and first-load content that arrives without apexafterrefresh.
      new w.MutationObserver(function (records) {
        var seen = [];
        for (var i = 0; i < records.length; i++) {
          var t = records[i].target;
          if (t.nodeType !== 1) { t = t.parentNode; }
          if (!t || closest(t, "." + P + "skeleton")) { continue; }
          var r = rootOf(t);
          if (r && seen.indexOf(r) < 0) {
            seen.push(r);
            var s = st(r);
            if (s.first && s.phase !== "idle" && hasContent(part(r, "body"))) { end(r, false); }
          }
        }
        initAll();
      }).observe(d.body, { childList: true, subtree: true, characterData: true });
    }
  }
  if (d.readyState === "loading") { d.addEventListener("DOMContentLoaded", start); } else { start(); }

  w.amcTplSkeletonRegion = {
    version: "1.0.0",
    start: function (el) { var r = el ? rootOf(el) || el : null; if (r) { begin(r, false); } },
    stop: function (el) { var r = el ? rootOf(el) || el : null; if (r) { end(r, false); } },
    shape: function (el) { var r = el ? rootOf(el) || el : null; return r ? measure(r) : null; },
    state: function (el) {
      var r = el ? rootOf(el) || el : null;
      if (!r) { return null; }
      var s = st(r);
      var sk = part(r, "skeleton");
      return { phase: s.phase, visible: !!(sk && !sk.hidden), bones: sk ? sk.children.length : 0 };
    }
  };
})(window, document);
