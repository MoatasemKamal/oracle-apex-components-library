/* Constellation Map: list template script. Turns a flat list of links into a spatial map of the
   app: entries are stars, grouped into constellations by User Defined Attribute 1, each group's
   stars joined by lines (SVG drawn from measured star positions), on a sky you can pan and zoom
   (drag, Ctrl + wheel, pinch, buttons, keyboard). Star positions come from a hash of the group
   and entry names, so the map is the same on every visit and people learn where things are.
   Arrow keys move focus between stars in DOM (reading) order. The current page glows; with the
   "recent" option, stars you use often shine brighter (counts in localStorage, with a reset).
   Without this file the list is a plain list of links, each labelled with its constellation. */
(function (w, d) {
  "use strict";
  if (w.amcTplConstellationMap) return;

  var B = "amc-TConstellationMap", STAR = B + "-star", LINK = B + "-link", SKY = B + "-sky";
  var MIN_S = 0.3, MAX_S = 2.5, STEP = 1.25, DRAG = 5, SVGNS = "http://www.w3.org/2000/svg";
  var reduceMotion = w.matchMedia ? w.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function make(tag, cls, parent) {
    var el = d.createElement(tag);
    if (cls) el.className = cls;
    if (parent) parent.appendChild(el);
    return el;
  }
  function svg(tag, attrs, parent) {
    var el = d.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function text(el, cls) { var x = el.querySelector("." + cls); return x ? x.textContent.replace(/^\s+|\s+$/g, "") : ""; }
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h = (h ^ str.charCodeAt(i)) >>> 0;
      h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
    }
    return h;
  }
  function rng(seed) {
    return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function rtl(root) { return w.getComputedStyle(root).direction === "rtl"; }
  function stars(root) { return Array.prototype.slice.call(root.querySelectorAll("." + STAR)); }

  // ------------------------------------------------------------ storage (per viewer, per list)
  function store() { try { return w.localStorage; } catch (e) { return null; } }
  function storeKey(root, suffix) {
    var env = w.apex && w.apex.env, app = (env && env.APP_ID) || w.location.pathname;
    return "amc-tpl-constellation-map:" + app + ":" + (root.id || "list") + (suffix || "");
  }
  function readJson(key) {
    try { var s = store(), v = s && s.getItem(key); return v ? JSON.parse(v) || {} : {}; } catch (e) { return {}; }
  }
  function write(key, value) {
    try { var s = store(); if (s) { if (value === null) s.removeItem(key); else s.setItem(key, value); } } catch (e) { /* storage blocked */ }
  }
  function starKey(star) {
    var link = star.querySelector("." + LINK), href = link ? link.getAttribute("href") || "" : "";
    var m = /[?&]p=([^:&]*):([^:&]*)/.exec(href);
    if (m) return m[1] + ":" + m[2];
    href = href.split("#")[0].replace(/([?&])(session|clear|cs)=[^&]*&?/g, "$1");
    return href && !/^\s*javascript:/i.test(href) ? href : "t:" + text(star, B + "-name");
  }

  // ------------------------------------------------------------ build
  function init(root) {
    if (!root || root._amc) return;
    var ul = root.querySelector("." + B + "-stars"), list = stars(root);
    if (!ul || !list.length) return;
    var st = root._amc = { x: 0, y: 0, s: 1, touched: false, pointers: {}, dirty: true };

    var bar = make("div", B + "-toolbar", null);
    bar.setAttribute("role", "toolbar");
    st.btnOut = button(bar, root, "data-zoom-out", "fa-minus", "zoomOut");
    st.btnIn = button(bar, root, "data-zoom-in", "fa-plus", "zoomIn");
    st.btnFit = button(bar, root, "data-fit", "fa-arrows-alt", "fit");
    st.btnList = button(bar, root, "data-list-view", "fa-list", "list");
    st.btnList.setAttribute("aria-pressed", "false");
    if (root.classList.contains(B + "--recent")) st.btnReset = button(bar, root, "data-reset", "fa-undo", "reset", true);
    var hint = make("span", B + "-hint", bar);
    hint.textContent = root.getAttribute("data-hint") || "";
    st.status = make("span", B + "-status", bar);
    st.status.setAttribute("role", "status");

    var sky = st.sky = make("div", SKY, null);
    st.layer = make("div", B + "-layer", sky);
    st.svg = svg("svg", { "class": B + "-lines", "aria-hidden": "true", focusable: "false" }, st.layer);
    st.labels = make("div", B + "-labels", st.layer);
    st.labels.setAttribute("aria-hidden", "true");
    st.card = make("div", B + "-card", sky);
    st.card.setAttribute("aria-hidden", "true");
    st.card.hidden = true;
    st.cardName = make("strong", B + "-cardName", st.card);
    st.cardMeta = make("span", B + "-cardMeta", st.card);
    st.cardDesc = make("span", B + "-cardDesc", st.card);
    root.insertBefore(bar, ul);
    root.insertBefore(sky, ul);
    st.layer.appendChild(ul);

    for (var i = 0; i < list.length; i++) {
      var s = list[i], desc = s.querySelector("." + B + "-desc"), link = s.querySelector("." + LINK);
      var r = rng(hash(starKey(s)))();
      s.style.setProperty("--amc-cm-d", (-r * 5).toFixed(2) + "s");
      if (desc && link && desc.textContent.replace(/\s+/g, "")) {
        desc.id = (root.id || "amc-cm") + "_desc" + i;
        link.setAttribute("aria-describedby", desc.id);
      }
    }
    if (root.classList.contains(B + "--recent")) countVisit(root);
    root.classList.add("is-js", "is-map");
    var pref = readJson(storeKey(root, ":view")).view;
    setView(root, pref ? pref === "list" : root.classList.contains(B + "--startList"), false);
    if (w.ResizeObserver) {
      st.ro = new w.ResizeObserver(function () {
        if (root.classList.contains("is-list")) return;
        var wdt = sky.clientWidth;
        if (wdt && wdt !== st.lastW) { st.lastW = wdt; st.dirty = true; relayout(root); }
      });
      st.ro.observe(sky);
    }
  }
  function button(bar, root, attr, icon, action, withText) {
    var b = make("button", B + "-btn", bar), label = root.getAttribute(attr) || action;
    b.type = "button";
    b.setAttribute("data-action", action);
    var i = make("span", "fa " + icon, b);
    i.setAttribute("aria-hidden", "true");
    if (withText) make("span", B + "-btnText", b).textContent = label;
    else { b.setAttribute("aria-label", label); b.title = label; }
    return b;
  }
  function initAll() {
    var roots = d.querySelectorAll("." + B);
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }

  // ------------------------------------------------------------ layout
  function relayout(root) {
    var st = root._amc;
    if (!st || root.classList.contains("is-list")) return;
    if (st.dirty) layout(root);
    if (!st.touched) fit(root, false);
    else apply(root, false);
  }

  function layout(root) {
    var st = root._amc, list = stars(root), groups = [], byName = {}, i, j;
    for (i = 0; i < list.length; i++) {
      var g = text(list[i], B + "-group");
      if (!byName.hasOwnProperty(g)) { byName[g] = { name: g, stars: [] }; groups.push(byName[g]); }
      byName[g].stars.push(list[i]);
    }
    var maxM = 1;
    for (i = 0; i < groups.length; i++) maxM = Math.max(maxM, groups[i].stars.length);
    var R = Math.max(78, maxM * 24), CW = 2 * R + 190, CH = 2 * R + 150;
    var skyW = st.sky.clientWidth || 600, skyH = st.sky.clientHeight || 400;
    var cols = clamp(Math.round(Math.sqrt(groups.length * (skyW / skyH) * (CH / CW))), 1, groups.length);
    var rows = Math.ceil(groups.length / cols);
    var W = cols * CW + (rows > 1 ? CW / 2 : 0), H = rows * CH, mirror = rtl(root);
    st.world = { w: W, h: H };
    st.layer.style.width = W + "px";
    st.layer.style.height = H + "px";

    for (i = 0; i < groups.length; i++) {
      var grp = groups[i], col = i % cols, row = Math.floor(i / cols), rand = rng(hash("g:" + grp.name));
      var cx = CW / 2 + col * CW + (row % 2 ? CW / 2 : 0) + (rand() - 0.5) * 40;
      var cy = CH / 2 + row * CH + (rand() - 0.5) * 30;
      var m = grp.stars.length, a0 = rand() * Math.PI * 2, span = m > 2 ? Math.PI * 2 * (0.62 + rand() * 0.2) : Math.PI;
      var pts = [];
      for (j = 0; j < m; j++) {
        var rr = m === 1 ? 0 : R * (0.72 + rand() * 0.38), a = a0 + (m > 1 ? span * j / (m - 1) : 0);
        var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.78;
        if (mirror) x = W - x;
        pts.push({ x: x, y: y });
        grp.stars[j].style.setProperty("--amc-cm-x", x.toFixed(1) + "px");
        grp.stars[j].style.setProperty("--amc-cm-y", y.toFixed(1) + "px");
      }
      var minY = Infinity, minX = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (j = 0; j < pts.length; j++) {
        minY = Math.min(minY, pts[j].y); maxY = Math.max(maxY, pts[j].y);
        minX = Math.min(minX, pts[j].x); maxX = Math.max(maxX, pts[j].x);
      }
      grp.box = { x0: minX - 80, y0: minY - 84, x1: maxX + 80, y1: maxY + 76 };
      grp.cx = mirror ? W - cx : cx;
      grp.top = minY - 46;
    }
    st.groups = groups;

    // Constellation names (decorative; the names are also in every link for screen readers).
    while (st.labels.firstChild) st.labels.removeChild(st.labels.firstChild);
    for (i = 0; i < groups.length; i++) {
      if (!groups[i].name) continue;
      var lab = make("span", B + "-constellation", st.labels);
      lab.textContent = groups[i].name;
      lab.setAttribute("data-group", String(i));
      lab.style.setProperty("--amc-cm-x", groups[i].cx.toFixed(1) + "px");
      lab.style.setProperty("--amc-cm-y", groups[i].top.toFixed(1) + "px");
    }
    drawLines(root);
    st.dirty = false;
  }

  // Lines from measured dot centres, converted back to layer coordinates.
  function drawLines(root) {
    var st = root._amc, s = st.svg, W = st.world.w, H = st.world.h;
    while (s.firstChild) s.removeChild(s.firstChild);
    s.setAttribute("viewBox", "0 0 " + W + " " + H);
    s.setAttribute("width", W);
    s.setAttribute("height", H);
    // faint celestial grid
    var grid = svg("g", { "class": B + "-grid" }, s), cx = W / 2, cy = H / 2, big = Math.max(W, H);
    for (var k = 1; k <= 4; k++) svg("ellipse", { cx: cx, cy: cy, rx: big * k / 5, ry: big * k / 8 }, grid);
    for (k = 0; k < 6; k++) {
      var a = Math.PI * k / 6;
      svg("line", { x1: cx - Math.cos(a) * big, y1: cy - Math.sin(a) * big * 0.62, x2: cx + Math.cos(a) * big, y2: cy + Math.sin(a) * big * 0.62 }, grid);
    }
    var lr = st.layer.getBoundingClientRect(), sc = lr.width / W || 1, all = stars(root);
    for (var g = 0; g < st.groups.length; g++) {
      var list = st.groups[g].stars, prev = null;
      for (var i = 0; i < list.length; i++) {
        var dot = list[i].querySelector("." + B + "-dot");
        if (!dot) continue;
        var r = dot.getBoundingClientRect();
        var p = { x: (r.left + r.width / 2 - lr.left) / sc, y: (r.top + r.height / 2 - lr.top) / sc, n: all.indexOf(list[i]) };
        if (prev) {
          svg("line", { "class": B + "-line", x1: prev.x.toFixed(1), y1: prev.y.toFixed(1), x2: p.x.toFixed(1), y2: p.y.toFixed(1),
            "data-from": String(prev.n), "data-to": String(p.n), "data-group": String(g) }, s);
        }
        prev = p;
      }
    }
  }

  // ------------------------------------------------------------ view transform
  function apply(root, glide) {
    var st = root._amc, sky = st.sky;
    var ww = st.world.w * st.s, wh = st.world.h * st.s, sw = sky.clientWidth, sh = sky.clientHeight, keep = 80;
    st.x = clamp(st.x, Math.min(keep - ww, (sw - ww) / 2), Math.max(sw - keep, (sw - ww) / 2));
    st.y = clamp(st.y, Math.min(keep - wh, (sh - wh) / 2), Math.max(sh - keep, (sh - wh) / 2));
    sky.classList.toggle("is-glide", !!glide && !(reduceMotion && reduceMotion.matches));
    st.layer.style.transform = "translate(" + st.x.toFixed(1) + "px, " + st.y.toFixed(1) + "px) scale(" + st.s.toFixed(3) + ")";
    root.style.setProperty("--amc-cm-s", st.s.toFixed(3));
    st.btnIn.disabled = st.s >= MAX_S - 0.001;
    st.btnOut.disabled = st.s <= MIN_S + 0.001;
    hideCard(root);
  }
  function fitBox(root, box, maxS, glide) {
    var st = root._amc, sw = st.sky.clientWidth, sh = st.sky.clientHeight;
    var bw = box.x1 - box.x0, bh = box.y1 - box.y0;
    st.s = clamp(Math.min(sw / bw, sh / bh), MIN_S, maxS);
    st.x = (sw - bw * st.s) / 2 - box.x0 * st.s;
    st.y = (sh - bh * st.s) / 2 - box.y0 * st.s;
    apply(root, glide);
  }
  function fit(root, glide) {
    var st = root._amc;
    var box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }, g = st.groups || [];
    for (var i = 0; i < g.length; i++) {
      box.x0 = Math.min(box.x0, g[i].box.x0); box.y0 = Math.min(box.y0, g[i].box.y0);
      box.x1 = Math.max(box.x1, g[i].box.x1); box.y1 = Math.max(box.y1, g[i].box.y1);
    }
    if (!g.length) box = { x0: 0, y0: 0, x1: st.world.w, y1: st.world.h };
    fitBox(root, box, 1.2, glide); // the constellations, not the empty sky around them
  }
  function zoomAt(root, factor, px, py, glide) {
    var st = root._amc, s2 = clamp(st.s * factor, MIN_S, MAX_S);
    if (px === undefined) { px = st.sky.clientWidth / 2; py = st.sky.clientHeight / 2; }
    st.x = px - (px - st.x) * (s2 / st.s);
    st.y = py - (py - st.y) * (s2 / st.s);
    st.s = s2;
    st.touched = true;
    apply(root, glide);
  }
  function announceZoom(root) {
    var st = root._amc;
    st.status.textContent = (root.getAttribute("data-zoom") || "Zoom") + " " + Math.round(st.s * 100) + "%";
  }
  function ensureVisible(root, star) {
    var st = root._amc, dot = star.querySelector("." + B + "-dot");
    if (!dot || root.classList.contains("is-list")) return;
    var r = dot.getBoundingClientRect(), k = st.sky.getBoundingClientRect(), m = 56;
    var cx = r.left + r.width / 2 - k.left, cy = r.top + r.height / 2 - k.top;
    if (cx >= m && cx <= k.width - m && cy >= m && cy <= k.height - m) return false;
    st.x += k.width / 2 - cx;
    st.y += k.height / 2 - cy;
    st.touched = true;
    apply(root, true);
    return true;
  }

  function setView(root, listView, remember) {
    var st = root._amc;
    root.classList.toggle("is-list", listView);
    root.classList.toggle("is-map", !listView);
    st.btnList.setAttribute("aria-pressed", listView ? "true" : "false");
    st.btnIn.disabled = st.btnOut.disabled = st.btnFit.disabled = listView;
    if (remember) write(storeKey(root, ":view"), JSON.stringify({ view: listView ? "list" : "map" }));
    if (listView) {
      st.layer.style.transform = st.layer.style.width = st.layer.style.height = "";
      hideCard(root);
      return;
    }
    st.dirty = true;
    relayout(root);
  }

  // ------------------------------------------------------------ recent use
  function countVisit(root) {
    var cur = root.querySelector("." + STAR + ".is-current");
    var data = readJson(storeKey(root)), now = Date.now();
    if (cur) {
      var k = starKey(cur), e = data[k] || { n: 0, t: 0 };
      e.n += 1; e.t = now;
      data[k] = e;
      write(storeKey(root), JSON.stringify(data));
    }
    shine(root, data);
  }
  function shine(root, data) {
    var list = stars(root), scores = [], max = 0, now = Date.now(), i;
    for (i = 0; i < list.length; i++) {
      var e = data[starKey(list[i])], sc = 0;
      if (e && e.n > 0) sc = e.n / (1 + Math.max(0, now - (e.t || 0)) / (7 * 864e5));
      scores.push(sc);
      max = Math.max(max, sc);
    }
    for (i = 0; i < list.length; i++) {
      var lvl = max > 0 && scores[i] > 0 ? Math.max(1, Math.ceil(3 * scores[i] / max)) : 0;
      list[i].classList.remove("is-shine1", "is-shine2", "is-shine3");
      if (lvl) list[i].classList.add("is-shine" + lvl);
    }
  }
  function resetShine(root) {
    write(storeKey(root), null);
    shine(root, {});
    root._amc.status.textContent = root.getAttribute("data-reset-done") || "";
  }

  // ------------------------------------------------------------ label card
  function showCard(root, star) {
    var st = root._amc;
    if (!st || root.classList.contains("is-list") || st.panning) return;
    var dot = star.querySelector("." + B + "-dot");
    if (!dot) return;
    st.cardName.textContent = text(star, B + "-name");
    var meta = text(star, B + "-group");
    var extra = star.classList.contains("is-current") ? root.getAttribute("data-here") :
      star.classList.contains("is-shine3") || star.classList.contains("is-shine2") ? root.getAttribute("data-recent") : "";
    st.cardMeta.textContent = meta && extra ? meta + " \u00B7 " + extra : meta || extra || "";
    st.cardDesc.textContent = text(star, B + "-desc");
    st.card.hidden = false;
    var r = dot.getBoundingClientRect(), k = st.sky.getBoundingClientRect();
    var cw = st.card.offsetWidth, ch = st.card.offsetHeight;
    var x = clamp(r.left + r.width / 2 - k.left - cw / 2, 8, k.width - cw - 8);
    var y = r.top - k.top - ch - 14;
    if (y < 8) y = r.bottom - k.top + 40;
    st.card.style.left = Math.round(x) + "px";
    st.card.style.top = Math.round(y) + "px";
    st.cardFor = star;
  }
  function hideCard(root) {
    var st = root._amc;
    if (st && st.card) { st.card.hidden = true; st.cardFor = null; }
  }

  // ------------------------------------------------------------ events
  function rootOf(el) { var r = closest(el, B); return r && r._amc ? r : null; }

  d.addEventListener("click", function (e) {
    var root = rootOf(e.target);
    if (!root) return;
    var st = root._amc;
    if (st.suppressClick && closest(e.target, SKY)) {
      st.suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    var btn = closest(e.target, B + "-btn");
    if (btn && btn.parentNode.parentNode === root) {
      var act = btn.getAttribute("data-action");
      if (act === "zoomIn") { zoomAt(root, STEP, undefined, undefined, true); announceZoom(root); }
      else if (act === "zoomOut") { zoomAt(root, 1 / STEP, undefined, undefined, true); announceZoom(root); }
      else if (act === "fit") { st.touched = false; fit(root, true); announceZoom(root); }
      else if (act === "list") setView(root, !root.classList.contains("is-list"), true);
      else if (act === "reset") resetShine(root);
      return;
    }
    var lab = closest(e.target, B + "-constellation");
    if (lab && st.groups) {
      var g = st.groups[+lab.getAttribute("data-group")];
      if (g) { st.touched = true; fitBox(root, g.box, 1.6, true); announceZoom(root); }
    }
  }, true);

  d.addEventListener("keydown", function (e) {
    var root = rootOf(e.target);
    if (!root || e.altKey || e.ctrlKey || e.metaKey) return;
    var st = root._amc, key = e.key, star = closest(e.target, STAR), mapMode = !root.classList.contains("is-list");
    if (star && /^(ArrowRight|ArrowLeft|ArrowUp|ArrowDown|Home|End)$/.test(key)) {
      var list = stars(root), i = list.indexOf(star), n = list.length, r = rtl(root);
      var fwd = key === "ArrowDown" || key === (r ? "ArrowLeft" : "ArrowRight");
      var j = key === "Home" ? 0 : key === "End" ? n - 1 : clamp(i + (fwd ? 1 : -1), 0, n - 1);
      var link = list[j].querySelector("." + LINK);
      if (link) link.focus();
      e.preventDefault();
      return;
    }
    if (!mapMode || !closest(e.target, SKY) && !closest(e.target, B + "-toolbar")) return;
    if (key === "+" || key === "=") { zoomAt(root, STEP, undefined, undefined, true); announceZoom(root); e.preventDefault(); }
    else if (key === "-" || key === "_") { zoomAt(root, 1 / STEP, undefined, undefined, true); announceZoom(root); e.preventDefault(); }
    else if (key === "0") { st.touched = false; fit(root, true); announceZoom(root); e.preventDefault(); }
    else if (key === "Escape" || key === "Esc") hideCard(root);
  });

  d.addEventListener("focusin", function (e) {
    var root = rootOf(e.target), star = root && closest(e.target, STAR);
    if (!star) return;
    if (ensureVisible(root, star) && !(reduceMotion && reduceMotion.matches)) {
      setTimeout(function () { if (star.contains(d.activeElement)) showCard(root, star); }, 340);
    } else showCard(root, star);
  });
  d.addEventListener("focusout", function (e) {
    var root = rootOf(e.target);
    if (root && root._amc.cardFor && closest(e.target, STAR) === root._amc.cardFor) hideCard(root);
  });
  d.addEventListener("pointerover", function (e) {
    if (e.pointerType !== "mouse") return;
    var root = rootOf(e.target), star = root && closest(e.target, STAR);
    if (star && root._amc.cardFor !== star) showCard(root, star);
  });
  d.addEventListener("pointerout", function (e) {
    if (e.pointerType !== "mouse") return;
    var root = rootOf(e.target), star = root && closest(e.target, STAR);
    if (!star || (e.relatedTarget && star.contains(e.relatedTarget))) return;
    if (root._amc.cardFor === star && !star.contains(d.activeElement)) hideCard(root);
  });

  // Drag to pan, two pointers to pinch.
  d.addEventListener("pointerdown", function (e) {
    var sky = closest(e.target, SKY), root = sky && rootOf(sky);
    if (!root || root.classList.contains("is-list") || (e.pointerType === "mouse" && e.button !== 0)) return;
    var st = root._amc;
    st.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    st.start = { x: e.clientX, y: e.clientY, ox: st.x, oy: st.y };
    st.suppressClick = false;
    var ids = Object.keys(st.pointers);
    if (ids.length === 2) {
      var a = st.pointers[ids[0]], b = st.pointers[ids[1]];
      st.pinch = { dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), s: st.s };
      st.panning = true;
    }
  });
  d.addEventListener("pointermove", function (e) {
    var roots = d.querySelectorAll("." + B + ".is-map");
    for (var i = 0; i < roots.length; i++) {
      var root = roots[i], st = root._amc;
      if (!st || !st.pointers[e.pointerId]) continue;
      st.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(st.pointers), k = st.sky.getBoundingClientRect();
      if (ids.length >= 2 && st.pinch) {
        var a = st.pointers[ids[0]], b = st.pointers[ids[1]];
        var f = st.pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / st.pinch.dist / st.s;
        zoomAt(root, f, (a.x + b.x) / 2 - k.left, (a.y + b.y) / 2 - k.top, false);
        st.suppressClick = true;
        e.preventDefault();
        continue;
      }
      var dx = e.clientX - st.start.x, dy = e.clientY - st.start.y;
      if (!st.panning && dx * dx + dy * dy < DRAG * DRAG) continue;
      if (!st.panning) {
        st.panning = true;
        st.sky.classList.add("is-panning");
        try { st.sky.setPointerCapture(e.pointerId); } catch (x) { /* already released */ }
      }
      st.x = st.start.ox + dx;
      st.y = st.start.oy + dy;
      st.touched = true;
      st.suppressClick = true;
      apply(root, false);
      e.preventDefault();
    }
  });
  function endPointer(e) {
    var roots = d.querySelectorAll("." + B + ".is-map");
    for (var i = 0; i < roots.length; i++) {
      var st = roots[i]._amc;
      if (!st || !st.pointers[e.pointerId]) continue;
      delete st.pointers[e.pointerId];
      var left = Object.keys(st.pointers);
      if (left.length < 2) st.pinch = null;
      if (left.length === 1) { var p = st.pointers[left[0]]; st.start = { x: p.x, y: p.y, ox: st.x, oy: st.y }; }
      if (!left.length) { st.panning = false; st.sky.classList.remove("is-panning"); }
    }
  }
  d.addEventListener("pointerup", endPointer);
  d.addEventListener("pointercancel", endPointer);

  d.addEventListener("wheel", function (e) {
    if (!(e.ctrlKey || e.metaKey)) return; // plain wheel keeps scrolling the page
    var sky = closest(e.target, SKY), root = sky && rootOf(sky);
    if (!root || root.classList.contains("is-list")) return;
    var k = sky.getBoundingClientRect();
    zoomAt(root, Math.exp(-e.deltaY * 0.0025), e.clientX - k.left, e.clientY - k.top, false);
    e.preventDefault();
  }, { passive: false });

  // ------------------------------------------------------------ refresh
  if (w.apex && w.apex.jQuery) w.apex.jQuery(d).on("apexafterrefresh", initAll);
  var moTimer;
  if (w.MutationObserver) {
    new w.MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType === 1 && (n.classList.contains(B) || (n.querySelector && n.querySelector("." + B + ":not(.is-js)")))) {
            clearTimeout(moTimer);
            moTimer = setTimeout(initAll, 60);
            return;
          }
        }
      }
    }).observe(d.documentElement, { childList: true, subtree: true });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initAll); else initAll();

  w.amcTplConstellationMap = {
    init: initAll,
    fit: function (root) { if (root && root._amc) { root._amc.touched = false; fit(root, true); } },
    reset: function (root) { if (root && root._amc) resetShine(root); }
  };
})(window, document);
