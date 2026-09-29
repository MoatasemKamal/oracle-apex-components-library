/* Peek Nav: list template script. Adds one floating preview card per list: after hover intent
   (the pointer rests on an entry for about 500 ms) or the entry's eye button, the card shows a
   live, scaled-down, non-interactive view of the target page in a sandboxed same-origin iframe,
   with a skeleton while it loads and the entry's description. The last 3 previews stay loaded.
   Never on touch, never for external links, off under Save-Data / prefers-reduced-data.
   Without this file the list is a plain navigation list. */
(function (w, d) {
  "use strict";
  if (w.amcTplPeekNav) return;

  var ROOT = "amc-TPeekNav", ITEM = ROOT + "-item", LINK = ROOT + "-link", EYE = ROOT + "-eye", CARD = ROOT + "-card";
  var INTENT = 500, WARM = 90, CLOSE_DELAY = 180, CACHE = 3, FRAME_W = 1280, TIMEOUT = 10000, JITTER = 40;
  var mm = function (q) { return w.matchMedia ? w.matchMedia(q) : null; };
  var mqNoHover = mm("(hover: none)"), mqReduceData = mm("(prefers-reduced-data: reduce)");

  var active = null;      // { root, item, card, sticky }
  var arm = null;         // { item, timer, x, y }
  var closeTimer = null;

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
  function touchOnly() { return !!(mqNoHover && mqNoHover.matches); }
  function saveData() {
    var c = w.navigator && w.navigator.connection;
    return !!(c && c.saveData) || !!(mqReduceData && mqReduceData.matches);
  }
  function parseUrl(v) { try { return new w.URL(v, w.location.href); } catch (e) { return null; } }

  // The URL to preview, or null when this entry must not be previewed.
  function peekUrl(link) {
    var raw = (link.getAttribute("data-peek") || "").replace(/^\s+|\s+$/g, "");
    var href = link.getAttribute("href") || "";
    if (/^none$/i.test(raw) || link.getAttribute("aria-current") === "page") return null;
    if (!raw && (!href || href.charAt(0) === "#" || /^\s*javascript:/i.test(href))) return null;
    if (raw && /^data:text\/html[,;]/i.test(raw)) return raw; // developer-supplied stand-in page
    var u = parseUrl(raw || href);
    if (!u || (u.protocol !== "http:" && u.protocol !== "https:")) return null;
    if (u.origin !== w.location.origin) return null; // external: never
    if (u.href.split("#")[0] === w.location.href.split("#")[0]) return null; // this page
    return u.href;
  }
  // Short, readable target path for the card: f?p=100:12 or the last two path segments.
  function pathOf(link) {
    var u = parseUrl(link.getAttribute("href") || "");
    if (!u) return "";
    var m = /[?&]p=([^&]*)/.exec(u.search);
    if (m) return "f?p=" + decodeURIComponent(m[1]).split(":").slice(0, 2).join(":");
    return u.pathname.split("/").filter(function (s) { return s; }).slice(-2).join("/");
  }

  function init(root) {
    if (!root || root._amcPeek) return;
    root._amcPeek = true;
    root.classList.add("is-js");
    var items = root.querySelectorAll("." + ITEM);
    for (var i = 0; i < items.length; i++) {
      var link = items[i].querySelector("." + LINK), eye = items[i].querySelector("." + EYE);
      var url = link ? peekUrl(link) : null;
      if (link) link._amcPeekUrl = url;
      items[i].classList.toggle("is-noPeek", !url);
      if (eye) eye.hidden = !url || touchOnly();
    }
  }
  function initAll() {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) init(roots[i]);
    if (active && !d.body.contains(active.item)) close();
  }

  // ------------------------------------------------------------ card
  function card(root) {
    if (root._amcCard && root.contains(root._amcCard)) return root._amcCard;
    var c = make("div", CARD, root);
    c.id = (root.id || "amc-peek") + "_peek";
    c.hidden = true;
    var head = make("div", ROOT + "-cardHead", c);
    c._icon = make("span", ROOT + "-cardIcon fa", head);
    c._icon.setAttribute("aria-hidden", "true");
    c._title = make("span", ROOT + "-cardTitle", head);
    c._path = make("span", ROOT + "-cardPath", head);
    c._view = make("div", ROOT + "-viewport", c);
    var sk = make("div", ROOT + "-skeleton", c._view);
    sk.setAttribute("aria-hidden", "true");
    make("span", "", sk); make("span", "", sk); make("span", "", sk);
    c._status = make("p", ROOT + "-status", c._view);
    c._desc = make("p", ROOT + "-cardDesc", c);
    c._note = make("p", ROOT + "-cardNote", c);
    c._hint = make("p", ROOT + "-cardHint", c);
    c._cache = [];
    root._amcCard = c;
    var eyes = root.querySelectorAll("." + EYE);
    for (var i = 0; i < eyes.length; i++) eyes[i].setAttribute("aria-controls", c.id);
    return c;
  }

  function paintState(c, entry) {
    var root = closest(c, ROOT);
    c._view.classList.toggle("is-loaded", entry.state === "loaded");
    c._view.classList.toggle("is-failed", entry.state === "failed");
    c._status.textContent = entry.state === "loaded" ? "" :
      root.getAttribute(entry.state === "failed" ? "data-unavailable" : "data-loading") || "";
  }

  function frameFor(c, url) {
    var cache = c._cache, entry = null, i;
    for (i = 0; i < cache.length; i++) if (cache[i].url === url) { entry = cache.splice(i, 1)[0]; break; }
    if (!entry) {
      var f = d.createElement("iframe");
      f.className = ROOT + "-frame";
      f.setAttribute("sandbox", "allow-same-origin allow-scripts");
      f.setAttribute("loading", "lazy");
      f.setAttribute("tabindex", "-1");
      f.setAttribute("aria-hidden", "true");
      f.setAttribute("title", "");
      f.setAttribute("referrerpolicy", "same-origin");
      entry = { url: url, frame: f, state: "loading" };
      f.addEventListener("load", function () { onLoad(c, entry); });
      entry.timer = setTimeout(function () { if (entry.state === "loading") { entry.state = "failed"; if (c._shown === entry) paintState(c, entry); } }, TIMEOUT);
      f.src = url;
      c._view.insertBefore(f, c._status);
    }
    cache.push(entry);
    while (cache.length > CACHE) {
      var old = cache.shift();
      clearTimeout(old.timer);
      if (old.frame.parentNode) old.frame.parentNode.removeChild(old.frame);
    }
    return entry;
  }
  function onLoad(c, entry) {
    var ok = true;
    if (!/^data:/i.test(entry.url)) {
      try {
        var doc = entry.frame.contentDocument;
        if (doc && doc.URL === "about:blank") return; // initial blank document, not the target
        ok = !!(doc && doc.body && doc.body.childNodes.length);
        if (ok) doc.documentElement.style.overflow = "hidden";
      } catch (e) { ok = false; } // blocked by frame options: the browser shows its own error page
    }
    clearTimeout(entry.timer);
    entry.state = ok ? "loaded" : "failed";
    entry.frame.classList.toggle("is-loaded", ok);
    if (c._shown === entry) paintState(c, entry);
  }

  function place(c, item, root) {
    var r = item.getBoundingClientRect(), gap = 10, pad = 8;
    var vw = d.documentElement.clientWidth, vh = w.innerHeight || d.documentElement.clientHeight;
    var cw = c.offsetWidth, ch = c.offsetHeight, x, y, below = root.classList.contains(ROOT + "--bar");
    var rtl = w.getComputedStyle(root).direction === "rtl";
    var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(v, hi)); };
    if (!below) {
      var endX = rtl ? r.left - gap - cw : r.right + gap, startX = rtl ? r.right + gap : r.left - gap - cw;
      if (endX >= pad && endX + cw <= vw - pad) x = endX;
      else if (startX >= pad && startX + cw <= vw - pad) x = startX;
      else below = true;
      if (!below) y = clamp(r.top - 12, pad, vh - ch - pad);
    }
    if (below) {
      x = clamp(rtl ? r.right - cw : r.left, pad, vw - cw - pad);
      y = r.bottom + gap;
      if (y + ch > vh - pad && r.top - gap - ch >= pad) y = r.top - gap - ch;
    }
    c.style.left = Math.round(x) + "px";
    c.style.top = Math.round(y) + "px";
  }

  function open(item, sticky) {
    var root = closest(item, ROOT), link = item && item.querySelector("." + LINK);
    if (!root || !link) return;
    init(root);
    var url = link._amcPeekUrl;
    if (!url || touchOnly()) return;
    clearTimeout(closeTimer);
    disarm();
    if (active && active.item === item) { active.sticky = active.sticky || sticky; return; }
    close();
    var c = card(root), icon = item.querySelector("." + ROOT + "-icon"), desc = item.querySelector("." + ROOT + "-desc");
    var label = item.querySelector("." + ROOT + "-label");
    var textOnly = root.classList.contains(ROOT + "--textOnly"), lean = saveData();
    c._icon.className = ROOT + "-cardIcon " + (icon ? icon.className.replace(ROOT + "-icon", "") : "");
    c._title.textContent = label ? label.textContent : link.textContent;
    c._path.textContent = pathOf(link);
    c._desc.textContent = desc ? desc.textContent : "";
    c._note.textContent = !textOnly && lean ? root.getAttribute("data-save-data") || "" : "";
    c._hint.textContent = root.getAttribute("data-hint") || "";
    c.classList.toggle("is-text", textOnly || lean);
    c.hidden = false;
    c._shown = null;
    var frames = c._view.querySelectorAll("." + ROOT + "-frame");
    for (var i = 0; i < frames.length; i++) frames[i].hidden = true;
    if (!textOnly && !lean) {
      c.style.setProperty("--amc-pn-scale", String(c._view.clientWidth / FRAME_W));
      var entry = frameFor(c, url);
      entry.frame.hidden = false;
      c._shown = entry;
      paintState(c, entry);
    }
    place(c, item, root);
    item.classList.add("is-peeking");
    var eye = item.querySelector("." + EYE);
    if (eye) eye.setAttribute("aria-expanded", "true");
    active = { root: root, item: item, card: c, sticky: !!sticky };
  }

  function close() {
    clearTimeout(closeTimer);
    if (!active) return;
    var a = active;
    active = null;
    a.card.hidden = true;
    a.item.classList.remove("is-peeking");
    var eye = a.item.querySelector("." + EYE);
    if (eye) eye.setAttribute("aria-expanded", "false");
  }
  function closeSoon() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(close, CLOSE_DELAY);
  }

  function disarm() {
    if (!arm) return;
    clearTimeout(arm.timer);
    arm.item.classList.remove("is-arming");
    arm = null;
  }
  function startArm(item, delay, e) {
    disarm();
    arm = { item: item, x: e.clientX, y: e.clientY };
    if (delay >= INTENT) { void item.offsetWidth; item.classList.add("is-arming"); }
    arm.timer = setTimeout(function () { var it = arm && arm.item; disarm(); if (it) open(it, false); }, delay);
  }

  function hoverAllowed(root) { return !root.classList.contains(ROOT + "--eyeOnly"); }

  // ------------------------------------------------------------ events
  var lastPointer = "mouse";
  d.addEventListener("pointerdown", function (e) { lastPointer = e.pointerType || "mouse"; }, true);

  d.addEventListener("pointerover", function (e) {
    if (e.pointerType !== "mouse") return;
    if (active && closest(e.target, CARD) === active.card) { clearTimeout(closeTimer); return; }
    var item = closest(e.target, ITEM), root = item && closest(item, ROOT);
    if (!root) return;
    init(root);
    if (active && active.item === item) { clearTimeout(closeTimer); return; }
    if (!hoverAllowed(root)) return;
    var link = item.querySelector("." + LINK);
    if (!link || !link._amcPeekUrl || touchOnly()) { if (active && !active.sticky) closeSoon(); return; }
    if (arm && arm.item === item) return;
    startArm(item, active ? WARM : INTENT, e);
  });

  d.addEventListener("pointermove", function (e) {
    if (!arm || e.pointerType !== "mouse" || !arm.item.contains(e.target)) return;
    var dx = e.clientX - arm.x, dy = e.clientY - arm.y;
    if (dx * dx + dy * dy > JITTER * JITTER) startArm(arm.item, INTENT, e); // still travelling: no intent yet
  });

  d.addEventListener("pointerout", function (e) {
    if (e.pointerType !== "mouse") return;
    var to = e.relatedTarget;
    var item = closest(e.target, ITEM);
    if (item && !(to && item.contains(to))) {
      if (arm && arm.item === item) disarm();
      if (active && active.item === item && !active.sticky && !(to && active.card.contains(to))) closeSoon();
      return;
    }
    if (active && !active.sticky && closest(e.target, CARD) === active.card &&
        !(to && (active.card.contains(to) || active.item.contains(to)))) closeSoon();
  });

  d.addEventListener("click", function (e) {
    var eye = closest(e.target, EYE);
    if (eye) {
      var item = closest(eye, ITEM);
      if (lastPointer === "touch" || touchOnly()) return;
      if (active && active.item === item) close(); else open(item, true);
      return;
    }
    if (active && closest(e.target, CARD) === active.card) {
      var link = active.item.querySelector("." + LINK);
      close();
      if (link) link.click();
      return;
    }
    if (active) close();
  });

  d.addEventListener("keydown", function (e) {
    if ((e.key === "Escape" || e.key === "Esc") && (active || arm)) {
      disarm();
      close(); // focus stays where it is, for example on the eye button
      e.preventDefault();
    }
  });

  d.addEventListener("focusout", function (e) {
    if (!active || !active.item.contains(e.target)) return;
    var to = e.relatedTarget;
    if (to && !active.item.contains(to)) close();
  });

  w.addEventListener("scroll", function (e) {
    if (active && !(e.target && e.target.nodeType === 1 && active.card.contains(e.target))) close();
  }, true);
  w.addEventListener("resize", function () { if (active) close(); });

  if (w.apex && w.apex.jQuery) w.apex.jQuery(d).on("apexafterrefresh", initAll);
  var moTimer;
  if (w.MutationObserver) {
    new w.MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var t = records[i].target;
        if (t.nodeType === 1 && closest(t, CARD)) continue; // our own card changing
        clearTimeout(moTimer);
        moTimer = setTimeout(initAll, 60);
        return;
      }
    }).observe(d.documentElement, { childList: true, subtree: true });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initAll); else initAll();

  w.amcTplPeekNav = { init: initAll, open: function (item) { open(item, true); }, close: close };
})(window, document);
