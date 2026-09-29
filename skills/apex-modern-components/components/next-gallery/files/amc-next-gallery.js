/* APEX Modern Components - Next Gallery runtime (Next Collection)
 * Loupe (Light Table) adapted from Magic UI "lens" (MIT License, (c) Magic UI,
 * https://magicui.design). Justified rows follow the Flickr / Google Photos row fitting.
 *
 *   all styles  : --amc-ng-ar (aspect ratio) on each item, parsed from Width / Height or
 *                 the loaded image; shared lightbox (native <dialog>, focus trap, Escape,
 *                 arrows, swipe, pinch / wheel / double-click zoom with pan, thumbnail
 *                 rail, neighbour preloading, focus returned to the opener).
 *   masonry     : row-ordered grid of 1px rows, --amc-ng-span per item (ResizeObserver).
 *   justified   : exact row fitting, --amc-ng-w / --amc-ng-h in px, recomputed on resize.
 *   filmstrip   : stage with crossfade and ambient glow, roving thumbnail strip.
 *   coverflow   : --amc-ng-off / --amc-ng-abs / --amc-ng-sgn per item, swipe, keys.
 *   mosaic      : wide / tall cells chosen from the aspect ratio.
 *   hoverZoom   : pointer parallax --amc-mx / --amc-my (-0.5..0.5) on the hovered tile.
 *   compare     : pairs rows by Group into a before / after slider (native range input).
 *   stackSwipe  : --amc-ng-d depth per card, drag to throw, never removes a card.
 *   lightTable  : loupe that magnifies the frame under the pointer.
 * ES5, one set of delegated listeners on document (refreshed regions keep working),
 * requestAnimationFrame throttling, textContent only, only parsed numbers are written
 * to style. Pointer parallax and autoplay are off when reduced motion is preferred. */
(function () {
  "use strict";
  if (window.amcNextGallery) {
    return;
  }

  var ROOT = "amc-NGallery";
  var SVGNS = "http://www.w3.org/2000/svg";
  var STYLE_RE = /\bamc-NGallery--(masonry|justified|filmstrip|coverflow|polaroid|mosaic|hoverZoom|compare|stackSwipe|lightTable)\b/;
  var CAROUSEL = { filmstrip: true, coverflow: true, stackSwipe: true };
  var INTERVAL = 6000;
  var LOUPE_ZOOM = 2.6;
  var MAX_ZOOM = 5;
  var TILTS = [-3, 2.5, -1.5, 3.5, -2.5, 1.75];
  var ICONS = {
    prev: "M15 5l-7 7 7 7",
    next: "M9 5l7 7-7 7",
    pause: "M9 5v14M15 5v14",
    play: "M8 5l11 7-11 7z",
    expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
    arrows: "M9 7l-5 5 5 5M15 7l5 5-5 5"
  };
  var DEFAULT_LABELS = {
    prev: "Previous image",
    next: "Next image",
    play: "Play slideshow",
    pause: "Pause slideshow",
    compare: "Move to compare before and after",
    before: "Before",
    after: "After",
    view: "View larger",
    of: "of"
  };

  var mqReduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var mqHover = window.matchMedia ? window.matchMedia("(hover: hover)") : null;
  var states = [];
  var lb = null;

  /* ------------------------------------------------------------ helpers */

  function reduced() {
    return !!(mqReduce && mqReduce.matches);
  }

  function num(v) {
    var n = parseFloat(v);
    return isFinite(n) && n > 0 && n < 100000 ? n : 0;
  }

  function round(n, d) {
    var f = Math.pow(10, d);
    return Math.round(n * f) / f;
  }

  function clamp(n, lo, hi) {
    return n < lo ? lo : (n > hi ? hi : n);
  }

  function findUp(el, cls, stop) {
    while (el && el.nodeType === 1 && el !== stop) {
      if (el.classList && el.classList.contains(cls)) {
        return el;
      }
      el = el.parentNode;
    }
    return null;
  }

  function make(tag, cls) {
    var n = document.createElement(tag);
    if (cls) {
      n.className = cls;
    }
    return n;
  }

  function icon(name) {
    var svg = document.createElementNS(SVGNS, "svg");
    var path = document.createElementNS(SVGNS, "path");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "amc-NGallery-ico" + (name === "play" ? " amc-NGallery-ico--fill" : ""));
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    path.setAttribute("d", ICONS[name]);
    svg.appendChild(path);
    return svg;
  }

  function button(cls, label, iconName) {
    var b = make("button", "amc-NGallery-btn " + cls);
    b.type = "button";
    b.setAttribute("aria-label", label);
    b.appendChild(icon(iconName));
    return b;
  }

  function setVar(el, name, value) {
    el.style.setProperty(name, String(value));
  }

  function styleOf(root) {
    var m = STYLE_RE.exec(root.className);
    return m ? m[1] : "masonry";
  }

  function readLabels(root) {
    var out = {};
    var k;
    for (k in DEFAULT_LABELS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_LABELS, k)) {
        out[k] = DEFAULT_LABELS[k];
      }
    }
    var nodes = root.querySelectorAll(".amc-NGallery-labels [data-key]");
    for (var i = 0; i < nodes.length; i += 1) {
      var key = nodes[i].getAttribute("data-key");
      var text = (nodes[i].textContent || "").replace(/\s+/g, " ").trim();
      if (key && text) {
        out[key] = text;
      }
    }
    return out;
  }

  function isRtl(el) {
    return window.getComputedStyle(el).direction === "rtl";
  }

  function frameLater(st, fn) {
    if (st.raf) {
      return;
    }
    st.raf = window.requestAnimationFrame(function () {
      st.raf = 0;
      if (st.root.isConnected) {
        fn(st);
      }
    });
  }

  /* centre child inside a horizontal scroller without scrolling the page (RTL safe) */
  function centerIn(scroller, child, smooth) {
    var a = scroller.getBoundingClientRect();
    var b = child.getBoundingClientRect();
    var delta = (b.left + b.width / 2) - (a.left + a.width / 2);
    if (Math.abs(delta) < 1) {
      return;
    }
    if (scroller.scrollBy) {
      try {
        scroller.scrollBy({ left: delta, behavior: smooth && !reduced() ? "smooth" : "auto" });
        return;
      } catch (ignore) { /* old engines */ }
    }
    scroller.scrollLeft += delta;
  }

  /* ------------------------------------------------------------- entries */

  function collect(st) {
    var kids = st.list.children;
    st.items = [];
    for (var i = 0; i < kids.length; i += 1) {
      var li = kids[i];
      if (!li.classList.contains("amc-NGallery-item")) {
        continue;
      }
      var link = li.querySelector(".amc-NGallery-link");
      var img = li.querySelector(".amc-NGallery-img");
      if (!link || !img) {
        continue;
      }
      var t = li.querySelector(".amc-NGallery-title");
      var x = li.querySelector(".amc-NGallery-text");
      st.items.push({
        li: li,
        fig: li.querySelector(".amc-NGallery-figure") || li,
        link: link,
        img: img,
        index: st.items.length,
        full: link.getAttribute("data-full") || img.getAttribute("src") || "",
        detail: link.getAttribute("data-detail") || "",
        alt: img.getAttribute("alt") || "",
        title: t ? (t.textContent || "").trim() : "",
        text: x ? (x.textContent || "").trim() : "",
        w: num(img.getAttribute("width")),
        h: num(img.getAttribute("height")),
        sized: img.getAttribute("data-sized") === "Y",
        ar: 4 / 3
      });
    }
  }

  function applyRatio(st, e) {
    var w = e.w;
    var h = e.h;
    if (!e.sized) {
      if (e.img.complete && e.img.naturalWidth) {
        w = e.img.naturalWidth;
        h = e.img.naturalHeight;
      } else {
        w = 0;
        if (!e.waiting) {
          e.waiting = true;
          e.img.addEventListener("load", function () {
            e.waiting = false;
            applyRatio(st, e);
            relayout(st);
          });
        }
      }
    }
    if (w && h) {
      e.ar = clamp(w / h, 0.2, 5);
      e.w = w;
      e.h = h;
    }
    setVar(e.li, "--amc-ng-ar", round(e.ar, 4));
  }

  function entryOf(st, node) {
    var li = findUp(node, "amc-NGallery-item", st.root);
    for (var i = 0; i < st.items.length; i += 1) {
      if (st.items[i].li === li) {
        return st.items[i];
      }
    }
    return null;
  }

  function relayout(st) {
    if (st.style === "justified") {
      st.lastW = -1;
      frameLater(st, justify);
    } else if (st.style === "masonry") {
      frameLater(st, masonry);
    } else if (st.style === "mosaic") {
      mosaic(st);
    }
  }

  /* ------------------------------------------------------------- masonry */

  function masonry(st) {
    var gap = parseFloat(window.getComputedStyle(st.list).columnGap) || 0;
    var heights = [];
    var i;
    for (i = 0; i < st.items.length; i += 1) {
      heights.push(st.items[i].fig.offsetHeight);
    }
    for (i = 0; i < st.items.length; i += 1) {
      setVar(st.items[i].li, "--amc-ng-span", Math.max(1, Math.ceil(heights[i] + gap)));
    }
  }

  function setupMasonry(st) {
    if (!window.ResizeObserver) {
      return;
    }
    st.root.classList.add("amc-is-masonry");
    st.ro = new window.ResizeObserver(function () {
      frameLater(st, masonry);
    });
    for (var i = 0; i < st.items.length; i += 1) {
      st.ro.observe(st.items[i].fig);
    }
    masonry(st);
  }

  /* ----------------------------------------------------------- justified */

  function lengthOf(raw, el) {
    var n = parseFloat(raw);
    if (!isFinite(n) || n <= 0) {
      return 0;
    }
    if (/rem\s*$/.test(raw)) {
      return n * (parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16);
    }
    if (/em\s*$/.test(raw)) {
      return n * (parseFloat(window.getComputedStyle(el).fontSize) || 16);
    }
    return n;
  }

  function justify(st) {
    var list = st.list;
    var cs = window.getComputedStyle(list);
    var W = list.getBoundingClientRect().width -
      (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0) -
      (parseFloat(cs.borderLeftWidth) || 0) - (parseFloat(cs.borderRightWidth) || 0);
    if (W <= 0) {
      return;
    }
    W -= 0.02; /* never let rounding wrap a row; the last item grows to the exact edge */
    st.lastW = list.clientWidth;
    var gap = parseFloat(cs.columnGap) || 0;
    var H = lengthOf(window.getComputedStyle(st.root).getPropertyValue("--amc-ng-row").trim(), st.root) || 224;
    if (W < 640) {
      H = H * Math.max(0.62, W / 640);
    }
    /* optimal line breaking (as in Knuth-Plass): every row but the last is scaled to fill W;
       choose the breaks that keep all row heights closest to the target H. */
    var items = st.items;
    var n = items.length;
    var best = [0];
    var from = [0];
    var i;
    var j;
    for (i = 1; i <= n; i += 1) {
      best[i] = Infinity;
      from[i] = i - 1;
      var sum = 0;
      for (j = i - 1; j >= 0 && i - j <= 14; j -= 1) {
        sum += items[j].ar;
        var h = (W - (i - j - 1) * gap) / sum;
        var cost;
        if (i === n && h >= H) {
          var fill = (sum * H + (i - j - 1) * gap) / W;
          cost = (1 - fill) * (1 - fill) * 0.6;
        } else {
          var dev = (h - H) / H;
          cost = dev * dev;
          if (h > H * 1.5 && i - j > 1) {
            cost += 4;
          }
        }
        if (best[j] + cost < best[i]) {
          best[i] = best[j] + cost;
          from[i] = j;
        }
        if (h < H * 0.35) {
          break;
        }
      }
    }
    var rows = [];
    for (i = n; i > 0; i = from[i]) {
      var sumAr = 0;
      var members = items.slice(from[i], i);
      for (j = 0; j < members.length; j += 1) {
        sumAr += members[j].ar;
      }
      var rowH = (W - (members.length - 1) * gap) / sumAr;
      var last = i === n && rowH >= H;
      rows.unshift({ items: members, h: last ? H : rowH, full: !last });
    }
    for (i = 0; i < rows.length; i += 1) {
      var r = rows[i];
      for (j = 0; j < r.items.length; j += 1) {
        var e = r.items[j];
        setVar(e.li, "--amc-ng-w", Math.floor(e.ar * r.h * 100) / 100);
        setVar(e.li, "--amc-ng-h", round(r.h, 2));
        e.li.classList.toggle("amc-is-rowEnd", r.full && j === r.items.length - 1);
      }
    }
    st.rows = rows.length;
  }

  function setupJustified(st) {
    st.root.classList.add("amc-is-justified");
    justify(st);
    if (window.ResizeObserver) {
      st.ro = new window.ResizeObserver(function () {
        if (st.list.clientWidth !== st.lastW) {
          frameLater(st, justify);
        }
      });
      st.ro.observe(st.list);
    }
  }

  /* -------------------------------------------------------------- mosaic */

  function mosaic(st) {
    var i;
    var e;
    for (i = 1; i < st.items.length; i += 1) {
      e = st.items[i];
      e.li.classList.toggle("amc-is-wide", e.ar >= 1.7);
      e.li.classList.toggle("amc-is-tall", e.ar <= 0.72);
    }
    /* promote cells so the mosaic ends on a full row (dense flow then leaves no holes) */
    var tracks = window.getComputedStyle(st.list).gridTemplateColumns.split(" ").length;
    st.lastCols = tracks;
    if (tracks < 2) {
      return;
    }
    var cells = 0;
    for (i = 0; i < st.items.length; i += 1) {
      e = st.items[i];
      cells += i === 0 ? 4 : (e.li.classList.contains("amc-is-wide") ? 2 : 1) * (e.li.classList.contains("amc-is-tall") ? 2 : 1);
    }
    var need = (tracks - (cells % tracks)) % tracks;
    for (var pass = 0; pass < 2 && need > 0; pass += 1) {
      for (i = st.items.length - 1; i > 0 && need > 0; i -= 1) {
        e = st.items[i];
        if (!e.li.classList.contains("amc-is-wide") && !e.li.classList.contains("amc-is-tall") && (pass === 1 || e.ar >= 1.2)) {
          e.li.classList.add("amc-is-wide");
          need -= 1;
        }
      }
    }
  }

  function setupMosaic(st) {
    mosaic(st);
    if (window.ResizeObserver) {
      st.ro = new window.ResizeObserver(function () {
        if (window.getComputedStyle(st.list).gridTemplateColumns.split(" ").length !== st.lastCols) {
          frameLater(st, mosaic);
        }
      });
      st.ro.observe(st.list);
    }
  }

  /* ----------------------------------------------------- carousel common */

  function roving(e, on) {
    e.link.tabIndex = on ? 0 : -1;
    if (on) {
      e.link.setAttribute("aria-current", "true");
    } else {
      e.link.removeAttribute("aria-current");
    }
    e.li.classList.toggle("amc-is-active", on);
  }

  function buildControls(st) {
    var L = st.labels;
    var bar = make("div", "amc-NGallery-controls");
    st.prevBtn = button("amc-NGallery-btn--prev", L.prev, "prev");
    st.nextBtn = button("amc-NGallery-btn--next", L.next, "next");
    st.counter = make("span", "amc-NGallery-count");
    st.counter.setAttribute("aria-hidden", "true");
    st.live = make("span", "amc-NGallery-srOnly");
    st.live.setAttribute("aria-live", "polite");
    bar.appendChild(st.prevBtn);
    bar.appendChild(st.counter);
    bar.appendChild(st.nextBtn);
    bar.appendChild(st.live);
    st.controls = bar;
    st.list.parentNode.insertBefore(bar, st.list.nextSibling);
  }

  function updateCounter(st) {
    var n = st.items.length;
    var e = st.items[st.active];
    var pos = st.active + 1;
    if (st.counter) {
      st.counter.textContent = "";
      var b = make("b");
      b.textContent = String(pos);
      st.counter.appendChild(b);
      st.counter.appendChild(document.createTextNode(" / " + n));
    }
    if (st.live) {
      st.live.textContent = pos + " " + st.labels.of + " " + n + (e && e.title ? ": " + e.title : "");
    }
  }

  function go(st, index, fromUser) {
    var n = st.items.length;
    if (!n) {
      return;
    }
    st.active = ((index % n) + n) % n;
    if (st.style === "filmstrip") {
      showFilm(st, fromUser);
    } else if (st.style === "coverflow") {
      updateCoverflow(st);
    } else if (st.style === "stackSwipe") {
      updateStack(st);
    }
    if (fromUser) {
      restartTimer(st);
    }
  }

  function step(st, delta, fromUser) {
    if (st.style === "stackSwipe") {
      stackGo(st, delta, 0);
    } else {
      go(st, st.active + delta, fromUser);
    }
    if (fromUser) {
      restartTimer(st);
    }
  }

  function focusActive(st) {
    var e = st.items[st.active];
    if (e) {
      try {
        e.link.focus({ preventScroll: true });
      } catch (ignore) {
        e.link.focus();
      }
    }
  }

  /* ----------------------------------------------------------- filmstrip */

  function setupFilmstrip(st) {
    var L = st.labels;
    var stage = make("div", "amc-NGallery-stage");
    var amb = make("div", "amc-NGallery-ambient");
    amb.setAttribute("aria-hidden", "true");
    st.ambImg = make("img");
    st.ambImg.alt = "";
    amb.appendChild(st.ambImg);
    var view;
    if (st.lightbox) {
      view = make("button", "amc-NGallery-stageView");
      view.type = "button";
    } else {
      view = make("a", "amc-NGallery-stageView");
    }
    st.stageImgs = [make("img", "amc-NGallery-stageImg amc-is-front"), make("img", "amc-NGallery-stageImg")];
    st.stageImgs[0].alt = "";
    st.stageImgs[1].alt = "";
    st.stageImgs[0].draggable = false;
    st.stageImgs[1].draggable = false;
    view.appendChild(st.stageImgs[0]);
    view.appendChild(st.stageImgs[1]);
    st.front = 0;
    var cap = make("div", "amc-NGallery-stageCap");
    var capText = make("div", "amc-NGallery-stageCapText");
    st.stageTitle = make("p", "amc-NGallery-stageTitle");
    st.stageText = make("p", "amc-NGallery-stageText");
    capText.appendChild(st.stageTitle);
    capText.appendChild(st.stageText);
    st.stageCount = make("span", "amc-NGallery-stageCount");
    st.stageCount.setAttribute("aria-hidden", "true");
    cap.appendChild(capText);
    cap.appendChild(st.stageCount);
    st.live = make("span", "amc-NGallery-srOnly");
    st.live.setAttribute("aria-live", "polite");
    stage.appendChild(amb);
    stage.appendChild(view);
    stage.appendChild(cap);
    stage.appendChild(st.live);
    if (st.items.length > 1) {
      st.prevBtn = button("amc-NGallery-btn--prev", L.prev, "prev");
      st.nextBtn = button("amc-NGallery-btn--next", L.next, "next");
      stage.appendChild(st.prevBtn);
      stage.appendChild(st.nextBtn);
    }
    st.stage = stage;
    st.stageView = view;
    st.root.insertBefore(stage, st.list);
    st.root.classList.add("amc-is-ready");
    for (var i = 0; i < st.items.length; i += 1) {
      st.items[i].link.setAttribute("draggable", "false");
    }
    st.active = 0;
    showFilm(st, false);
  }

  function showFilm(st, smooth) {
    var e = st.items[st.active];
    var L = st.labels;
    var token = (st.token || 0) + 1;
    st.token = token;
    var front = st.stageImgs[st.front];
    var back = st.stageImgs[1 - st.front];
    var swap = function () {
      if (token !== st.token) {
        return;
      }
      back.classList.add("amc-is-front");
      front.classList.remove("amc-is-front");
      st.front = 1 - st.front;
    };
    if (front.getAttribute("src") === e.full) {
      back.removeAttribute("src");
    } else {
      back.onload = swap;
      back.onerror = swap;
      back.src = e.full;
      if (back.complete && back.naturalWidth) {
        swap();
      }
    }
    st.ambImg.src = e.img.currentSrc || e.img.getAttribute("src") || e.full;
    if (st.lightbox) {
      st.stageView.setAttribute("aria-label", L.view + ": " + (e.alt || e.title || String(st.active + 1)));
    } else {
      st.stageImgs[0].alt = "";
      st.stageImgs[1].alt = "";
      back.alt = e.alt || e.title;
      st.stageView.href = e.link.href;
    }
    st.stageTitle.textContent = e.title;
    st.stageText.textContent = e.text;
    st.stageCount.textContent = (st.active + 1) + " / " + st.items.length;
    st.live.textContent = (st.active + 1) + " " + L.of + " " + st.items.length + (e.title ? ": " + e.title : "");
    for (var i = 0; i < st.items.length; i += 1) {
      roving(st.items[i], i === st.active);
    }
    centerIn(st.list, e.li, smooth);
  }

  /* ----------------------------------------------------------- coverflow */

  function setupCoverflow(st) {
    st.root.classList.add("amc-is-ready");
    setVar(st.list, "--amc-ng-dir", st.rtl ? -1 : 1);
    buildControls(st);
    for (var i = 0; i < st.items.length; i += 1) {
      st.items[i].link.setAttribute("draggable", "false");
    }
    st.active = Math.floor((st.items.length - 1) / 2);
    updateCoverflow(st);
  }

  function updateCoverflow(st) {
    for (var i = 0; i < st.items.length; i += 1) {
      var e = st.items[i];
      var off = i - st.active;
      var abs = Math.abs(off);
      setVar(e.li, "--amc-ng-off", off);
      setVar(e.li, "--amc-ng-abs", Math.min(abs, 4));
      setVar(e.li, "--amc-ng-sgn", off > 0 ? 1 : (off < 0 ? -1 : 0));
      e.li.classList.toggle("amc-is-far", abs > 3);
      roving(e, off === 0);
    }
    updateCounter(st);
  }

  /* ---------------------------------------------------------- stackSwipe */

  function setupStack(st) {
    st.root.classList.add("amc-is-ready");
    buildControls(st);
    for (var i = 0; i < st.items.length; i += 1) {
      st.items[i].link.setAttribute("draggable", "false");
    }
    st.active = 0;
    updateStack(st);
  }

  function updateStack(st) {
    var n = st.items.length;
    for (var i = 0; i < n; i += 1) {
      var e = st.items[i];
      var d = (i - st.active + n) % n;
      setVar(e.li, "--amc-ng-d", d);
      setVar(e.li, "--amc-ng-tilt", d === 0 ? 0 : TILTS[i % TILTS.length]);
      e.li.classList.toggle("amc-is-far", d > 3);
      roving(e, d === 0);
    }
    updateCounter(st);
  }

  /* delta +1: throw the top card away (towards throwDir, or the start side);
     delta -1: bring the previous card back on top. Nothing is ever removed. */
  function stackGo(st, delta, throwDir) {
    var n = st.items.length;
    if (n < 2 || st.busy) {
      return;
    }
    var startSide = st.rtl ? 1 : -1;
    var wait = reduced() ? 0 : 420;
    var card;
    if (delta > 0) {
      card = st.items[st.active];
      setVar(card.li, "--amc-ng-fly", throwDir || startSide);
      setVar(card.li, "--amc-ng-dx", 0);
      card.li.classList.remove("amc-is-dragging");
      card.li.classList.add("amc-is-fly");
      st.busy = true;
      st.active = (st.active + 1) % n;
      updateStack(st);
      window.setTimeout(function () {
        card.li.classList.remove("amc-is-fly");
        st.busy = false;
      }, wait);
    } else {
      st.active = (st.active - 1 + n) % n;
      card = st.items[st.active];
      setVar(card.li, "--amc-ng-fly", startSide);
      card.li.classList.add("amc-is-instant");
      card.li.classList.add("amc-is-fly");
      updateStack(st);
      void card.li.offsetWidth;
      card.li.classList.remove("amc-is-instant");
      card.li.classList.remove("amc-is-fly");
    }
  }

  /* ------------------------------------------------------------- compare */

  function setupCompare(st) {
    var groups = {};
    var order = [];
    var i;
    for (i = 0; i < st.items.length; i += 1) {
      var g = st.items[i].li.getAttribute("data-group");
      if (!g) {
        continue;
      }
      if (!groups.hasOwnProperty(g)) {
        groups[g] = [];
        order.push(g);
      }
      groups[g].push(st.items[i]);
    }
    for (i = 0; i < order.length; i += 1) {
      if (groups[order[i]].length >= 2) {
        pair(st, groups[order[i]][0], groups[order[i]][1]);
      }
    }
    st.root.classList.add("amc-is-ready");
  }

  function setPos(box, v) {
    v = clamp(round(v, 1), 0, 100);
    var range = box.querySelector(".amc-NGallery-range");
    var L = box.amcLabels;
    setVar(box, "--amc-ng-pos", v);
    if (range) {
      if (String(range.value) !== String(Math.round(v))) {
        range.value = String(Math.round(v));
      }
      range.setAttribute("aria-valuetext", L.before + " " + Math.round(v) + "%, " + L.after + " " + Math.round(100 - v) + "%");
    }
  }

  function pair(st, a, b) {
    var L = st.labels;
    var fig = a.fig;
    var box = make("div", "amc-NGallery-compare");
    box.amcLabels = L;
    var frame = a.link.querySelector(".amc-NGallery-frame");
    var after = make("span", "amc-NGallery-after");
    after.appendChild(b.img);
    var range = make("input", "amc-NGallery-range");
    range.type = "range";
    range.min = "0";
    range.max = "100";
    range.step = "1";
    range.value = "50";
    range.setAttribute("aria-label", L.compare);
    var divider = make("span", "amc-NGallery-divider");
    divider.setAttribute("aria-hidden", "true");
    var knob = make("span", "amc-NGallery-knob");
    knob.appendChild(icon("arrows"));
    divider.appendChild(knob);
    var tagB = make("span", "amc-NGallery-tag amc-NGallery-tag--before");
    tagB.textContent = L.before;
    tagB.setAttribute("aria-hidden", "true");
    var tagA = make("span", "amc-NGallery-tag amc-NGallery-tag--after");
    tagA.textContent = L.after;
    tagA.setAttribute("aria-hidden", "true");
    if (frame) {
      box.appendChild(frame);
    }
    box.appendChild(after);
    box.appendChild(range);
    box.appendChild(divider);
    box.appendChild(tagB);
    box.appendChild(tagA);
    /* the image link becomes the "view larger" corner button */
    a.link.textContent = "";
    a.link.appendChild(icon("expand"));
    var sr = make("span", "amc-NGallery-srOnly");
    sr.textContent = L.view;
    a.link.appendChild(sr);
    a.link.setAttribute("draggable", "false");
    box.appendChild(a.link);
    fig.insertBefore(box, fig.firstChild);
    if (!fig.querySelector(".amc-NGallery-caption")) {
      var bc = b.li.querySelector(".amc-NGallery-caption");
      if (bc) {
        fig.appendChild(bc);
      }
    }
    a.li.classList.add("amc-is-pair");
    b.li.hidden = true;
    range.addEventListener("input", function () {
      setPos(box, parseFloat(range.value) || 0);
    });
    setPos(box, 50);
  }

  function comparePointer(box, x) {
    var r = box.getBoundingClientRect();
    if (!r.width) {
      return;
    }
    var p = (x - r.left) / r.width;
    if (isRtl(box)) {
      p = 1 - p;
    }
    setPos(box, p * 100);
  }

  /* ---------------------------------------------------------- lightTable */

  function setupLightTable(st) {
    if (!(mqHover && mqHover.matches)) {
      return;
    }
    var loupe = make("div", "amc-NGallery-loupe");
    loupe.setAttribute("aria-hidden", "true");
    var img = make("img");
    img.alt = "";
    loupe.appendChild(img);
    st.list.appendChild(loupe);
    st.loupe = loupe;
    st.loupeImg = img;
    st.root.classList.add("amc-has-loupe");
  }

  function moveLoupe(st, e, frame, x, y) {
    var fr = frame.getBoundingClientRect();
    var lr = st.list.getBoundingClientRect();
    var size = st.loupe.offsetWidth || 144;
    var r = size / 2;
    if (st.loupeSrc !== e.full) {
      st.loupeSrc = e.full;
      st.loupeImg.src = e.full;
    }
    var px = clamp(x - fr.left, 0, fr.width);
    var py = clamp(y - fr.top, 0, fr.height);
    setVar(st.loupe, "--amc-ng-lw", round(fr.width * LOUPE_ZOOM, 1));
    setVar(st.loupe, "--amc-ng-lh", round(fr.height * LOUPE_ZOOM, 1));
    setVar(st.loupe, "--amc-ng-lix", round(r - px * LOUPE_ZOOM - 3, 1));
    setVar(st.loupe, "--amc-ng-liy", round(r - py * LOUPE_ZOOM - 3, 1));
    setVar(st.loupe, "--amc-ng-lx", round(x - lr.left - st.list.clientLeft - r, 1));
    setVar(st.loupe, "--amc-ng-ly", round(y - lr.top - st.list.clientTop - r, 1));
    st.loupe.classList.add("amc-is-on");
  }

  /* ------------------------------------------------------------ autoplay */

  function setupAutoplay(st) {
    if (!st.root.classList.contains("amc-NGallery--autoplay") || !CAROUSEL[st.style] ||
        st.items.length < 2 || reduced()) {
      return;
    }
    st.playing = true;
    st.playBtn = button("amc-NGallery-play", st.labels.pause, "pause");
    st.progress = make("span", "amc-NGallery-progress");
    st.progress.setAttribute("aria-hidden", "true");
    if (st.style === "filmstrip") {
      st.stage.appendChild(st.playBtn);
      st.stage.appendChild(st.progress);
    } else {
      st.playBtn.appendChild(st.progress);
      st.controls.appendChild(st.playBtn);
    }
    st.root.addEventListener("mouseenter", function () { st.hoverPause = true; syncPlay(st); });
    st.root.addEventListener("mouseleave", function () { st.hoverPause = false; syncPlay(st); });
    st.root.addEventListener("focusin", function () { st.focusPause = true; syncPlay(st); });
    st.root.addEventListener("focusout", function (ev) {
      if (!ev.relatedTarget || !st.root.contains(ev.relatedTarget)) {
        st.focusPause = false;
        syncPlay(st);
      }
    });
    syncPlay(st);
  }

  function isPaused(st) {
    return !st.playing || st.userPaused || st.hoverPause || st.focusPause || st.lbOpen || document.hidden;
  }

  function syncPlay(st) {
    if (!st.playBtn) {
      return;
    }
    var paused = isPaused(st);
    st.root.classList.toggle("amc-is-paused", paused);
    if (st.live) {
      st.live.setAttribute("aria-live", paused ? "polite" : "off");
    }
    var label = st.userPaused ? st.labels.play : st.labels.pause;
    if (st.playBtn.getAttribute("aria-label") !== label) {
      st.playBtn.setAttribute("aria-label", label);
      var old = st.playBtn.querySelector("svg");
      st.playBtn.replaceChild(icon(st.userPaused ? "play" : "pause"), old);
    }
    if (paused) {
      window.clearTimeout(st.timer);
      st.timer = 0;
      st.progress.classList.remove("amc-is-running");
    } else if (!st.timer) {
      restartTimer(st);
    }
  }

  function restartTimer(st) {
    if (!st.playBtn) {
      return;
    }
    window.clearTimeout(st.timer);
    st.timer = 0;
    st.progress.classList.remove("amc-is-running");
    if (isPaused(st)) {
      return;
    }
    void st.progress.offsetWidth;
    st.progress.classList.add("amc-is-running");
    st.timer = window.setTimeout(function () {
      st.timer = 0;
      if (!st.root.isConnected) {
        return;
      }
      if (!isPaused(st)) {
        step(st, 1, false);
      }
      restartTimer(st);
    }, INTERVAL);
  }

  /* ---------------------------------------------------------------- init */

  function init(root) {
    if (root.amcNg) {
      return;
    }
    var list = root.querySelector(".amc-NGallery-list");
    if (!list) {
      return;
    }
    var st = {
      root: root,
      list: list,
      style: styleOf(root),
      labels: readLabels(root),
      lightbox: root.classList.contains("amc-NGallery--lightbox"),
      rtl: isRtl(root),
      items: [],
      active: 0
    };
    root.amcNg = st;
    states.push(st);
    collect(st);
    for (var i = 0; i < st.items.length; i += 1) {
      applyRatio(st, st.items[i]);
      st.items[i].img.draggable = false;
    }
    if (!st.items.length) {
      return;
    }
    switch (st.style) {
      case "masonry": setupMasonry(st); break;
      case "justified": setupJustified(st); break;
      case "filmstrip": setupFilmstrip(st); break;
      case "coverflow": setupCoverflow(st); break;
      case "mosaic": setupMosaic(st); break;
      case "compare": setupCompare(st); break;
      case "stackSwipe": setupStack(st); break;
      case "lightTable": setupLightTable(st); break;
      default: break;
    }
    setupAutoplay(st);
  }

  function scan() {
    var i;
    for (i = states.length - 1; i >= 0; i -= 1) {
      if (!states[i].root.isConnected) {
        if (states[i].ro) {
          states[i].ro.disconnect();
        }
        window.clearTimeout(states[i].timer);
        states.splice(i, 1);
      }
    }
    var roots = document.getElementsByClassName(ROOT);
    for (i = 0; i < roots.length; i += 1) {
      init(roots[i]);
    }
  }

  var scanQueued = 0;
  function queueScan() {
    if (!scanQueued) {
      scanQueued = window.requestAnimationFrame(function () {
        scanQueued = 0;
        scan();
      });
    }
  }

  /* ============================================================ lightbox */

  function lbWire(st, dlg) {
    if (dlg.amcWired) {
      return;
    }
    dlg.amcWired = true;
    var stage = dlg.querySelector(".amc-NGallery-lbStage");
    var img = make("img", "amc-NGallery-lbImg");
    img.alt = "";
    img.draggable = false;
    img.decoding = "async";
    stage.insertBefore(img, stage.firstChild);

    dlg.addEventListener("close", function () {
      lbClosed(dlg);
    });

    dlg.addEventListener("click", function (ev) {
      if (!lb || lb.dlg !== dlg) {
        return;
      }
      var t = ev.target;
      if (findUp(t, "amc-NGallery-lbClose", dlg)) {
        dlg.close();
      } else if (findUp(t, "amc-NGallery-lbPrev", dlg)) {
        lbShow(lb.index - 1);
      } else if (findUp(t, "amc-NGallery-lbNext", dlg)) {
        lbShow(lb.index + 1);
      } else if (findUp(t, "amc-NGallery-lbZoom", dlg)) {
        lbZoom(lb.s > 1.01 ? 1 : 2.5);
      } else if (findUp(t, "amc-NGallery-lbThumb", dlg)) {
        lbShow(parseInt(findUp(t, "amc-NGallery-lbThumb", dlg).getAttribute("data-index"), 10) || 0);
      } else if (findUp(t, "amc-NGallery-lbStage", dlg) && lb.backdrop && !lb.moved && lb.s <= 1.01) {
        /* a click on the dark area around the image (not on the image) closes */
        dlg.close();
      }
    });

    dlg.addEventListener("keydown", lbKey);

    stage.addEventListener("wheel", function (ev) {
      if (!lb) {
        return;
      }
      ev.preventDefault();
      var k = ev.deltaMode === 1 ? 0.05 : 0.0022;
      lbZoom(lb.s * Math.exp(-ev.deltaY * k), ev.clientX, ev.clientY);
    }, { passive: false });

    stage.addEventListener("dblclick", function (ev) {
      if (!lb) {
        return;
      }
      ev.preventDefault();
      lbZoom(lb.s > 1.01 ? 1 : 2.5, ev.clientX, ev.clientY);
    });

    stage.addEventListener("pointerdown", lbDown);
    stage.addEventListener("pointermove", lbMove);
    stage.addEventListener("pointerup", lbUp);
    stage.addEventListener("pointercancel", lbUp);
  }

  function lbOpen(st, index, opener) {
    var dlg = st.root.querySelector(".amc-NGallery-lightbox");
    if (!dlg || typeof dlg.showModal !== "function" || !st.items.length) {
      return false;
    }
    lbWire(st, dlg);
    lb = {
      st: st,
      dlg: dlg,
      stage: dlg.querySelector(".amc-NGallery-lbStage"),
      img: dlg.querySelector(".amc-NGallery-lbImg"),
      opener: opener || document.activeElement,
      index: 0,
      s: 1,
      x: 0,
      y: 0,
      pointers: {},
      count: 0,
      token: 0,
      moved: false
    };
    st.lbOpen = true;
    syncPlay(st);
    lbRail(st, dlg);
    dlg.classList.toggle("amc-is-single", st.items.length < 2);
    lbShow(index);
    try {
      dlg.showModal();
    } catch (err) {
      lb = null;
      st.lbOpen = false;
      return false;
    }
    document.documentElement.classList.add("amc-NGallery-scrollLock");
    var close = dlg.querySelector(".amc-NGallery-lbClose");
    if (close) {
      close.focus();
    }
    return true;
  }

  function lbClosed(dlg) {
    document.documentElement.classList.remove("amc-NGallery-scrollLock");
    if (!lb || lb.dlg !== dlg) {
      return;
    }
    var st = lb.st;
    var opener = lb.opener;
    var index = lb.index;
    lb = null;
    st.lbOpen = false;
    var list = opener && opener.classList && opener.classList.contains("amc-NGallery-link");
    if (CAROUSEL[st.style] && st.root.classList.contains("amc-is-ready") && index !== st.active) {
      go(st, index, false);
      if (list) {
        opener = st.items[st.active].link;
      }
    }
    syncPlay(st);
    if (opener && opener.isConnected && typeof opener.focus === "function") {
      opener.focus();
    }
  }

  function lbRail(st, dlg) {
    var rail = dlg.querySelector(".amc-NGallery-lbRail");
    if (!rail || rail.amcCount === st.items.length) {
      return;
    }
    rail.textContent = "";
    rail.amcCount = st.items.length;
    for (var i = 0; i < st.items.length; i += 1) {
      var e = st.items[i];
      var b = make("button", "amc-NGallery-lbThumb");
      b.type = "button";
      b.tabIndex = -1;
      b.setAttribute("data-index", String(i));
      b.setAttribute("aria-label", e.alt || e.title || String(i + 1));
      var im = make("img");
      im.alt = "";
      im.loading = "lazy";
      im.width = 56;
      im.height = 42;
      im.src = e.img.currentSrc || e.img.getAttribute("src") || e.full;
      b.appendChild(im);
      rail.appendChild(b);
    }
  }

  function lbShow(i) {
    if (!lb) {
      return;
    }
    var st = lb.st;
    var dlg = lb.dlg;
    var n = st.items.length;
    i = ((i % n) + n) % n;
    lb.index = i;
    var e = st.items[i];
    var img = lb.img;
    lb.s = 1;
    lb.x = 0;
    lb.y = 0;
    lbApply();
    var token = lb.token + 1;
    lb.token = token;
    var done = function () {
      if (!lb || token !== lb.token) {
        return;
      }
      dlg.classList.remove("amc-is-loading");
      img.classList.remove("amc-is-loading");
    };
    if (img.getAttribute("src") !== e.full) {
      dlg.classList.add("amc-is-loading");
      img.classList.add("amc-is-loading");
      img.onload = done;
      img.onerror = done;
      img.src = e.full;
    }
    img.alt = e.alt || e.title;
    if (img.complete && img.naturalWidth) {
      done();
    }
    var q = function (sel) { return dlg.querySelector(sel); };
    q(".amc-NGallery-lbIndex").textContent = String(i + 1);
    q(".amc-NGallery-lbTotal").textContent = String(n);
    q(".amc-NGallery-lbTitle").textContent = e.title;
    q(".amc-NGallery-lbText").textContent = e.text;
    var detail = q(".amc-NGallery-lbDetail");
    if (detail) {
      if (e.detail) {
        detail.href = e.detail;
        detail.hidden = false;
      } else {
        detail.hidden = true;
        detail.removeAttribute("href");
      }
    }
    var thumbs = dlg.querySelectorAll(".amc-NGallery-lbThumb");
    for (var k = 0; k < thumbs.length; k += 1) {
      var on = k === i;
      thumbs[k].tabIndex = on ? 0 : -1;
      if (on) {
        thumbs[k].setAttribute("aria-current", "true");
      } else {
        thumbs[k].removeAttribute("aria-current");
      }
    }
    if (thumbs[i]) {
      centerIn(thumbs[i].parentNode, thumbs[i], true);
    }
    /* preload the neighbours */
    [i - 1, i + 1].forEach(function (j) {
      var nb = st.items[((j % n) + n) % n];
      if (nb && nb !== e) {
        var p = new window.Image();
        p.src = nb.full;
      }
    });
  }

  function lbApply() {
    var dlg = lb.dlg;
    setVar(dlg, "--amc-ng-zs", round(lb.s, 4));
    setVar(dlg, "--amc-ng-zx", round(lb.x, 1));
    setVar(dlg, "--amc-ng-zy", round(lb.y, 1));
    var zoomed = lb.s > 1.01;
    dlg.classList.toggle("amc-is-zoomed", zoomed);
    var zb = dlg.querySelector(".amc-NGallery-lbZoom");
    if (zb) {
      zb.setAttribute("aria-pressed", zoomed ? "true" : "false");
    }
  }

  function lbClampPan() {
    var w = lb.img.offsetWidth * lb.s;
    var h = lb.img.offsetHeight * lb.s;
    var mx = Math.max(0, (w - lb.stage.clientWidth) / 2);
    var my = Math.max(0, (h - lb.stage.clientHeight) / 2);
    lb.x = clamp(lb.x, -mx, mx);
    lb.y = clamp(lb.y, -my, my);
  }

  /* zoom to s keeping the point under (cx, cy) in place */
  function lbZoom(s, cx, cy) {
    if (!lb) {
      return;
    }
    s = clamp(s, 1, MAX_ZOOM);
    var r = lb.stage.getBoundingClientRect();
    var px = cx === undefined ? 0 : cx - (r.left + r.width / 2);
    var py = cy === undefined ? 0 : cy - (r.top + r.height / 2);
    var k = s / lb.s;
    lb.x = px - (px - lb.x) * k;
    lb.y = py - (py - lb.y) * k;
    lb.s = s;
    if (s <= 1.001) {
      lb.s = 1;
      lb.x = 0;
      lb.y = 0;
    }
    lbClampPan();
    lbApply();
  }

  function lbFocusables(dlg) {
    var all = dlg.querySelectorAll("button, a[href], [tabindex]");
    var out = [];
    for (var i = 0; i < all.length; i += 1) {
      var n = all[i];
      if (!n.hidden && !n.disabled && n.tabIndex >= 0 && n.getClientRects().length) {
        out.push(n);
      }
    }
    return out;
  }

  function lbKey(ev) {
    if (!lb) {
      return;
    }
    var dlg = lb.dlg;
    var key = ev.key;
    var zoomed = lb.s > 1.01;
    var fwd = lb.st.rtl ? -1 : 1;
    if (key === "Tab") {
      var f = lbFocusables(dlg);
      if (!f.length) {
        return;
      }
      var first = f[0];
      var last = f[f.length - 1];
      if (ev.shiftKey && (document.activeElement === first || !dlg.contains(document.activeElement))) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      }
      return;
    }
    if (ev.altKey || ev.ctrlKey || ev.metaKey) {
      return;
    }
    var handled = true;
    var inRail = !!findUp(ev.target, "amc-NGallery-lbRail", dlg);
    if (key === "ArrowRight" || key === "ArrowLeft") {
      var dir = key === "ArrowRight" ? 1 : -1;
      if (zoomed) {
        lb.x -= dir * 80;
        lbClampPan();
        lbApply();
      } else {
        lbShow(lb.index + dir * fwd);
      }
    } else if ((key === "ArrowUp" || key === "ArrowDown") && zoomed) {
      lb.y -= (key === "ArrowDown" ? 1 : -1) * 80;
      lbClampPan();
      lbApply();
    } else if (key === "Home" && !zoomed) {
      lbShow(0);
    } else if (key === "End" && !zoomed) {
      lbShow(lb.st.items.length - 1);
    } else if (key === "+" || key === "=") {
      lbZoom(lb.s * 1.5);
    } else if (key === "-" || key === "_") {
      lbZoom(lb.s / 1.5);
    } else if (key === "0") {
      lbZoom(1);
    } else {
      handled = false;
    }
    if (handled) {
      ev.preventDefault();
      if (inRail) {
        var cur = dlg.querySelector('.amc-NGallery-lbThumb[aria-current="true"]');
        if (cur) {
          cur.focus();
        }
      }
    }
  }

  function lbPoints() {
    var out = [];
    for (var id in lb.pointers) {
      if (Object.prototype.hasOwnProperty.call(lb.pointers, id)) {
        out.push(lb.pointers[id]);
      }
    }
    return out;
  }

  function lbGesture() {
    var pts = lbPoints();
    var r = lb.stage.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    if (pts.length >= 2) {
      var dx = pts[1].x - pts[0].x;
      var dy = pts[1].y - pts[0].y;
      lb.g = {
        mode: "pinch",
        d0: Math.sqrt(dx * dx + dy * dy) || 1,
        s0: lb.s,
        mx: (pts[0].x + pts[1].x) / 2 - cx,
        my: (pts[0].y + pts[1].y) / 2 - cy,
        tx: lb.x,
        ty: lb.y
      };
    } else if (pts.length === 1) {
      lb.g = {
        mode: lb.s > 1.01 ? "pan" : "swipe",
        x0: pts[0].x,
        y0: pts[0].y,
        tx: lb.x,
        ty: lb.y,
        t0: Date.now()
      };
    } else {
      lb.g = null;
    }
  }

  function lbDown(ev) {
    if (!lb || (ev.pointerType === "mouse" && ev.button !== 0)) {
      return;
    }
    lb.pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    lb.moved = false;
    lb.backdrop = ev.target === lb.stage;
    try {
      lb.stage.setPointerCapture(ev.pointerId);
    } catch (ignore) { /* not capturable */ }
    lbGesture();
  }

  function lbMove(ev) {
    if (!lb || !lb.pointers[ev.pointerId] || !lb.g) {
      return;
    }
    lb.pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    var g = lb.g;
    var dlg = lb.dlg;
    if (g.mode === "pinch") {
      var pts = lbPoints();
      if (pts.length < 2) {
        return;
      }
      var r = lb.stage.getBoundingClientRect();
      var dx = pts[1].x - pts[0].x;
      var dy = pts[1].y - pts[0].y;
      var s = clamp(g.s0 * (Math.sqrt(dx * dx + dy * dy) / g.d0), 1, MAX_ZOOM);
      var mx = (pts[0].x + pts[1].x) / 2 - (r.left + r.width / 2);
      var my = (pts[0].y + pts[1].y) / 2 - (r.top + r.height / 2);
      var k = s / g.s0;
      lb.s = s;
      lb.x = mx - (g.mx - g.tx) * k;
      lb.y = my - (g.my - g.ty) * k;
      lb.moved = true;
      dlg.classList.add("amc-is-panning");
      lbClampPan();
      lbApply();
      return;
    }
    var ddx = ev.clientX - g.x0;
    var ddy = ev.clientY - g.y0;
    if (!lb.moved && Math.abs(ddx) + Math.abs(ddy) > 6) {
      lb.moved = true;
    }
    if (!lb.moved) {
      return;
    }
    if (g.mode === "pan") {
      lb.x = g.tx + ddx;
      lb.y = g.ty + ddy;
      dlg.classList.add("amc-is-panning");
      lbClampPan();
      lbApply();
    } else if (g.mode === "swipe") {
      dlg.classList.add("amc-is-swiping");
      setVar(dlg, "--amc-ng-sx", round(ddx, 1));
    }
  }

  function lbUp(ev) {
    if (!lb || !lb.pointers[ev.pointerId]) {
      return;
    }
    var g = lb.g;
    var dlg = lb.dlg;
    var dx = g && g.x0 !== undefined ? ev.clientX - g.x0 : 0;
    delete lb.pointers[ev.pointerId];
    dlg.classList.remove("amc-is-panning");
    dlg.classList.remove("amc-is-swiping");
    setVar(dlg, "--amc-ng-sx", 0);
    if (g && g.mode === "swipe" && lb.moved && ev.type === "pointerup") {
      var fwd = lb.st.rtl ? -1 : 1;
      var fast = Math.abs(dx) > 30 && Date.now() - g.t0 < 250;
      if (Math.abs(dx) > 60 || fast) {
        lbShow(lb.index + (dx < 0 ? fwd : -fwd));
      }
    } else if (g && g.mode !== "pinch" && !lb.moved && ev.type === "pointerup" && ev.pointerType !== "mouse") {
      /* double tap toggles zoom on touch and pen */
      var now = Date.now();
      var tap = lb.lastTap;
      if (tap && now - tap.t < 320 && Math.abs(tap.x - ev.clientX) < 30 && Math.abs(tap.y - ev.clientY) < 30) {
        lb.lastTap = null;
        lbZoom(lb.s > 1.01 ? 1 : 2.5, ev.clientX, ev.clientY);
      } else {
        lb.lastTap = { t: now, x: ev.clientX, y: ev.clientY };
      }
    }
    lbGesture();
  }

  /* ================================================ delegated listeners */

  function stateFor(node) {
    var root = findUp(node, ROOT);
    return root && root.amcNg ? root.amcNg : null;
  }

  document.addEventListener("click", function (ev) {
    var t = ev.target;
    var st = stateFor(t);
    if (!st || findUp(t, "amc-NGallery-lightbox", st.root)) {
      return;
    }
    var btn = findUp(t, "amc-NGallery-btn", st.root);
    if (btn) {
      if (btn.classList.contains("amc-NGallery-btn--prev")) {
        step(st, -1, true);
      } else if (btn.classList.contains("amc-NGallery-btn--next")) {
        step(st, 1, true);
      } else if (btn.classList.contains("amc-NGallery-play")) {
        st.userPaused = !st.userPaused;
        syncPlay(st);
      }
      return;
    }
    if (st.suppress) {
      ev.preventDefault();
      return;
    }
    var view = findUp(t, "amc-NGallery-stageView", st.root);
    if (view) {
      if (st.lightbox) {
        lbOpen(st, st.active, view);
      }
      return;
    }
    var link = findUp(t, "amc-NGallery-link", st.root);
    if (!link || ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) {
      return;
    }
    var e = entryOf(st, link);
    if (!e) {
      return;
    }
    var ready = st.root.classList.contains("amc-is-ready");
    if (st.style === "filmstrip" && ready) {
      ev.preventDefault();
      if (e.index === st.active && st.lightbox) {
        lbOpen(st, e.index, link);
      } else {
        go(st, e.index, true);
      }
      return;
    }
    if ((st.style === "coverflow" || st.style === "stackSwipe") && ready && e.index !== st.active) {
      ev.preventDefault();
      if (st.style === "coverflow") {
        go(st, e.index, true);
      }
      return;
    }
    if (st.lightbox && lbOpen(st, e.index, link)) {
      ev.preventDefault();
    }
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey) {
      return;
    }
    var t = ev.target;
    var st = stateFor(t);
    if (!st || !CAROUSEL[st.style] || !st.root.classList.contains("amc-is-ready") ||
        findUp(t, "amc-NGallery-lightbox", st.root)) {
      return;
    }
    var fwd = st.rtl ? -1 : 1;
    var n = st.items.length;
    var delta = 0;
    if (ev.key === "ArrowRight") {
      delta = fwd;
    } else if (ev.key === "ArrowLeft") {
      delta = -fwd;
    } else if (ev.key === "Home") {
      delta = -st.active;
    } else if (ev.key === "End") {
      delta = n - 1 - st.active;
    } else {
      return;
    }
    ev.preventDefault();
    if (!delta) {
      return;
    }
    var onLink = !!findUp(t, "amc-NGallery-link", st.root);
    if (st.style === "stackSwipe" && Math.abs(delta) === 1) {
      stackGo(st, delta, 0);
    } else {
      go(st, st.active + delta, true);
    }
    restartTimer(st);
    if (onLink) {
      focusActive(st);
    }
  });

  /* drag / swipe for coverflow, stack and the filmstrip stage; compare slider */
  var drag = null;

  document.addEventListener("pointerdown", function (ev) {
    if (ev.pointerType === "mouse" && ev.button !== 0) {
      return;
    }
    var t = ev.target;
    var st = stateFor(t);
    if (!st || findUp(t, "amc-NGallery-lightbox", st.root) || findUp(t, "amc-NGallery-btn", st.root)) {
      return;
    }
    if (st.style === "compare") {
      var box = findUp(t, "amc-NGallery-compare", st.root);
      if (box && !findUp(t, "amc-NGallery-link", box)) {
        drag = { st: st, kind: "compare", box: box, x0: ev.clientX, y0: ev.clientY, moved: ev.pointerType === "mouse" };
        if (ev.pointerType === "mouse") {
          ev.preventDefault();
          box.classList.add("amc-is-dragging");
          comparePointer(box, ev.clientX);
          var range = box.querySelector(".amc-NGallery-range");
          if (range) {
            range.focus({ preventScroll: true });
          }
        }
      }
      return;
    }
    if (!st.root.classList.contains("amc-is-ready")) {
      return;
    }
    var kind = null;
    var el = null;
    if (st.style === "coverflow" && findUp(t, "amc-NGallery-list", st.root)) {
      kind = "coverflow";
    } else if (st.style === "stackSwipe") {
      el = findUp(t, "amc-NGallery-item", st.root);
      if (el && el === st.items[st.active].li && !st.busy) {
        kind = "stack";
      }
    } else if (st.style === "filmstrip" && findUp(t, "amc-NGallery-stage", st.root)) {
      kind = "film";
    }
    if (kind) {
      drag = { st: st, kind: kind, el: el, x0: ev.clientX, y0: ev.clientY, dx: 0, moved: false, t0: Date.now() };
    }
  });

  document.addEventListener("pointermove", function (ev) {
    if (drag) {
      var dx = ev.clientX - drag.x0;
      var dy = ev.clientY - drag.y0;
      if (!drag.moved) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          drag = null; /* vertical scroll intent */
          return;
        }
        if (Math.abs(dx) > 6) {
          drag.moved = true;
          if (drag.kind === "compare") {
            drag.box.classList.add("amc-is-dragging");
          } else {
            drag.st.root.classList.add("amc-is-dragging");
          }
        }
      }
      if (drag.moved) {
        drag.dx = dx;
        if (drag.kind === "compare") {
          comparePointer(drag.box, ev.clientX);
        } else if (drag.kind === "stack") {
          drag.el.classList.add("amc-is-dragging");
          setVar(drag.el, "--amc-ng-dx", round(dx, 1));
        }
      }
      return;
    }
    hoverTrack(ev);
  }, { passive: true });

  function endDrag(ev) {
    if (!drag) {
      return;
    }
    var d = drag;
    drag = null;
    var st = d.st;
    st.root.classList.remove("amc-is-dragging");
    if (d.kind === "compare") {
      d.box.classList.remove("amc-is-dragging");
      return;
    }
    if (d.kind === "stack" && d.el) {
      d.el.classList.remove("amc-is-dragging");
    }
    if (!d.moved) {
      return;
    }
    st.suppress = true;
    window.setTimeout(function () { st.suppress = false; }, 60);
    var dx = ev.type === "pointerup" ? d.dx : 0;
    var fwd = st.rtl ? -1 : 1;
    var fast = Math.abs(dx) > 30 && Date.now() - d.t0 < 250;
    if (d.kind === "stack") {
      var w = d.el.offsetWidth || 240;
      if (Math.abs(dx) > Math.min(110, w * 0.3) || fast) {
        stackGo(st, 1, dx > 0 ? 1 : -1);
        if (st.list.contains(document.activeElement)) {
          focusActive(st);
        }
      } else {
        setVar(d.el, "--amc-ng-dx", 0);
      }
      restartTimer(st);
      return;
    }
    if (d.kind === "coverflow") {
      var item = st.items[st.active].li.offsetWidth || 240;
      var steps = Math.round(-dx * fwd / (item * 0.45));
      if (!steps && (Math.abs(dx) > 40 || fast)) {
        steps = dx * fwd < 0 ? 1 : -1;
      }
      if (steps) {
        go(st, clamp(st.active + steps, 0, st.items.length - 1), true);
        if (st.list.contains(document.activeElement)) {
          focusActive(st);
        }
      }
      return;
    }
    if (d.kind === "film" && (Math.abs(dx) > 50 || fast)) {
      go(st, st.active + (dx * fwd < 0 ? 1 : -1), true);
    }
  }

  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);

  /* pointer effects: hoverZoom parallax and lightTable loupe (mouse / trackpad only) */
  var hover = { pending: null, frame: 0, tile: null, loupeSt: null };

  function hoverTrack(ev) {
    if (ev.pointerType === "touch" || (mqHover && !mqHover.matches)) {
      return;
    }
    hover.pending = { target: ev.target, x: ev.clientX, y: ev.clientY };
    if (!hover.frame) {
      hover.frame = window.requestAnimationFrame(hoverUpdate);
    }
  }

  function hoverUpdate() {
    hover.frame = 0;
    var p = hover.pending;
    hover.pending = null;
    if (!p) {
      return;
    }
    var st = stateFor(p.target);
    var tile = null;
    var frame = null;
    if (st && st.style === "hoverZoom" && !reduced()) {
      tile = findUp(p.target, "amc-NGallery-item", st.root);
    }
    if (hover.tile && hover.tile !== tile) {
      hover.tile.style.removeProperty("--amc-mx");
      hover.tile.style.removeProperty("--amc-my");
      hover.tile.classList.remove("amc-is-tracking");
    }
    hover.tile = tile;
    if (tile) {
      var r = tile.getBoundingClientRect();
      if (r.width && r.height) {
        setVar(tile, "--amc-mx", round(clamp((p.x - r.left) / r.width, 0, 1) - 0.5, 3));
        setVar(tile, "--amc-my", round(clamp((p.y - r.top) / r.height, 0, 1) - 0.5, 3));
        tile.classList.add("amc-is-tracking");
      }
    }
    if (st && st.style === "lightTable" && st.loupe) {
      frame = findUp(p.target, "amc-NGallery-frame", st.root);
    }
    if (hover.loupeSt && (!frame || hover.loupeSt !== st)) {
      hover.loupeSt.loupe.classList.remove("amc-is-on");
      hover.loupeSt = null;
    }
    if (frame) {
      var e = entryOf(st, frame);
      if (e) {
        moveLoupe(st, e, frame, p.x, p.y);
        hover.loupeSt = st;
      }
    }
  }

  document.addEventListener("pointerout", function (ev) {
    if (!ev.relatedTarget) {
      hover.pending = { target: document.documentElement, x: 0, y: 0 };
      if (!hover.frame) {
        hover.frame = window.requestAnimationFrame(hoverUpdate);
      }
    }
  });

  document.addEventListener("visibilitychange", function () {
    for (var i = 0; i < states.length; i += 1) {
      syncPlay(states[i]);
    }
  });

  document.addEventListener("dragstart", function (ev) {
    var st = stateFor(ev.target);
    if (st && (CAROUSEL[st.style] || st.style === "compare")) {
      ev.preventDefault();
    }
  });

  /* ---------------------------------------------------------------- boot */

  function boot() {
    scan();
    if (window.MutationObserver) {
      new window.MutationObserver(queueScan).observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.amcNextGallery = {
    version: "1.0.0",
    refresh: function (root) {
      var st = root && root.amcNg;
      if (st) {
        relayout(st);
      } else {
        scan();
      }
    }
  };
})();
