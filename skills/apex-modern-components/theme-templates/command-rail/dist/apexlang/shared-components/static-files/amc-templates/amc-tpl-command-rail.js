/* Command Rail: living side navigation for the Universal Theme Navigation Menu slot.
   - Search: filters every entry and sub entry by label and Attribute 1 keywords, highlights the
     match, opens groups with matches; Enter opens the first match, Escape clears.
     Ctrl+K / Cmd+K, or / outside a field, focuses it from anywhere on the page, when the rail owns
     the shortcut (window.amcCommandK); the cancelable amc:command-search event on document from
     another template (Smart Nav Bar) always opens it.
   - Pinned: a star on every link; pinned pages are listed first. localStorage
     amc-tpl-command-rail:<app>:pins (list of link keys).
   - Recent: frecency (sum of 0.5 ^ (age / 10 days)) over clicks on menu links and loads of the
     current page; top 3 not pinned and not the current page. amc-tpl-command-rail:<app>:recent.
   - Icon rail: follows Universal Theme's collapsed/expanded body classes when the list sits in the
     side navigation slot, otherwise shows its own toggle (amc-tpl-command-rail:<app>:collapsed).
     Groups open as flyouts on hover or focus, single links show a tooltip.
   - Keyboard: roving tabindex; Up/Down, Home/End, Right opens or enters a group, Left closes or
     goes to the parent, type-ahead by first letters, Escape closes flyouts and clears search.
   - Phone (viewport up to 640px): a bottom bar with search, pinned icons and Menu, and a bottom
     sheet with the full menu (drag or tap the handle, Escape or the backdrop to close).
   Nothing leaves the browser; storage blocked = no pins and no recent, everything else works.
   ES5, one guard, delegated listeners on document, textContent only. */
(function () {
  "use strict";
  if (window.amcTplCommandRail) { return; }

  var ROOT = "amc-TCommandRail";
  var SLUG = "amc-tpl-command-rail";
  var DAY = 864e5;
  var HALF_LIFE = 10 * DAY;
  var MAX_STAMPS = 30;
  var FORGET_AFTER = 120 * DAY;
  var SAME_VISIT = 5 * 6e4;
  var RECENT_MAX = 3;
  var DOCK_PINS = 4;
  var PHONE_QUERY = "(max-width: 640px)";
  var SHELL_SLOT = ".t-Body-nav, #t_Body_nav";
  var NARROW_SLOT = 120;
  // One Ctrl+K per app: window.amcCommandK names the AMC template that binds the shortcut (the
  // first one to load with a search claims it). Others ask for search with the cancelable
  // amc:command-search event on document; the rail answers it with preventDefault.
  var OWNER = "command-rail";
  var SEARCH_EVENT = "amc:command-search";

  var C = function (part) { return "." + ROOT + "-" + part; };
  var cls = function (part) { return ROOT + "-" + part; };
  var phoneMq = window.matchMedia ? window.matchMedia(PHONE_QUERY) : null;

  // ------------------------------------------------------------ small helpers
  function each(list, fn) { if (!list) { return; } for (var i = 0; i < list.length; i++) { fn(list[i], i); } }
  function lower(s) { return String(s || "").toLocaleLowerCase(); }
  function make(tag, className, text) {
    var n = document.createElement(tag);
    if (className) { n.className = className; }
    if (text !== undefined && text !== null) { n.textContent = text; }
    return n;
  }
  function clear(node) { while (node && node.firstChild) { node.removeChild(node.firstChild); } }
  function childOf(parent, className) {
    for (var n = parent && parent.firstElementChild; n; n = n.nextElementSibling) {
      if (n.classList.contains(className)) { return n; }
    }
    return null;
  }
  function rootOf(node) { return node && node.closest ? node.closest("." + ROOT) : null; }
  function part(root, name) { return root.querySelector(C(name)); }
  function opt(root, name) { return root.classList.contains(ROOT + "--" + name); }
  function isRtl(root) { return window.getComputedStyle(root).direction === "rtl"; }
  function viewportWidth() { return document.documentElement.clientWidth || window.innerWidth; }
  function editable(t) {
    if (!t || !t.tagName) { return false; }
    return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
  }

  // ------------------------------------------------------------ storage (never throws)
  function storage() {
    try {
      var s = window.localStorage;
      s.setItem("amc-tpl-probe", "1");
      s.removeItem("amc-tpl-probe");
      return s;
    } catch (e) { return null; }
  }
  function readRaw(s, key) { try { return s.getItem(key); } catch (e) { return null; } }
  function readJSON(s, key) { try { var v = s.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function writeRaw(s, key, v) { try { s.setItem(key, v); return true; } catch (e) { return false; } }
  function writeJSON(s, key, v) { return writeRaw(s, key, JSON.stringify(v)); }
  function removeKey(s, key) { try { s.removeItem(key); } catch (e) { /* ignore */ } }

  function appId() {
    var env = window.apex && window.apex.env;
    if (env && env.APP_ID) { return String(env.APP_ID); }
    var m = /\/r\/[^\/]+\/[^\/]+/.exec(location.pathname);
    if (m) { return m[0]; }
    m = /[?&]p=([^:&]+)/.exec(location.search);
    return m ? m[1] : location.pathname;
  }
  function storeKey(name) { return SLUG + ":" + appId() + ":" + name; }

  function readPins(s) {
    var v = s ? readJSON(s, storeKey("pins")) : null;
    return Object.prototype.toString.call(v) === "[object Array]" ? v : [];
  }

  // ------------------------------------------------------------ link keys
  // A link's learning key: its URL without session, checksum, clear-cache and debug values
  // (they change every login), or its label when it has no usable URL.
  var DROP = { session: 1, cs: 1, clear: 1, debug: 1, p_trace: 1, success_msg: 1 };
  function isPlaceholder(href) {
    href = String(href === null || href === undefined ? "" : href).trim();
    return !href || href === "#" || /^javascript:\s*(void\s*\(?\s*0\s*\)?\s*;?|;)?\s*$/i.test(href);
  }
  function urlKey(raw) {
    raw = String(raw || "").trim();
    if (isPlaceholder(raw) || /^javascript:/i.test(raw)) { return ""; }
    var u;
    try { u = new URL(raw, location.href); } catch (e) { return raw; }
    var params = [];
    u.searchParams.forEach(function (v, k) {
      k = k.toLowerCase();
      if (DROP[k]) { return; }
      if (k === "p") {
        var p = v.split(":");
        v = [p[0], p[1], "", p[3] || "", "", "", p[6] || "", p[7] || ""].join(":").replace(/:+$/, "");
      }
      params.push(k + "=" + v);
    });
    params.sort();
    return u.pathname.replace(/\/+$/, "").toLowerCase() + (params.length ? "?" + params.join("&") : "") + (u.hash.length > 1 ? u.hash : "");
  }

  // ------------------------------------------------------------ frecency
  function record(key) {
    var s = storage();
    if (!s || !key) { return; }
    var k = storeKey("recent");
    var data = readJSON(s, k) || {};
    var used = data.e || {};
    var now = Date.now();
    var stamps = used[key] || [];
    // A click and the page load it causes (or quick reloads) are one visit.
    if (stamps.length && now - stamps[stamps.length - 1] < SAME_VISIT) { stamps[stamps.length - 1] = now; } else { stamps.push(now); }
    used[key] = stamps.slice(-MAX_STAMPS);
    for (var name in used) {
      if (Object.prototype.hasOwnProperty.call(used, name)) {
        var last = used[name][used[name].length - 1];
        if (!last || now - last > FORGET_AFTER) { delete used[name]; }
      }
    }
    data.v = 1;
    data.e = used;
    writeJSON(s, k, data);
  }
  function score(stamps, now) {
    var s = 0;
    for (var i = 0; i < stamps.length; i++) { s += Math.pow(0.5, Math.max(0, now - stamps[i]) / HALF_LIFE); }
    return s;
  }

  // ------------------------------------------------------------ model
  function iconClasses(icon) {
    if (!icon) { return ""; }
    var out = [];
    each(icon.className.split(/\s+/), function (c) { if (c && c !== cls("icon") && c !== "fa") { out.push(c); } });
    var s = out.join(" ");
    return /\bfa-/.test(s) ? s : "";
  }
  function entry(st, li, parent) {
    var link = childOf(li, cls("link"));
    var label = link && link.querySelector(C("label"));
    var kw = childOf(li, cls("keywords"));
    var badge = link && link.querySelector(C("badge"));
    var href = link ? link.getAttribute("href") : "";
    var text = label ? label.textContent.trim() : "";
    var e = {
      li: li, link: link, label: label, text: text, parent: parent, href: href,
      hay: lower(text + " " + (kw ? kw.textContent : "")),
      icon: iconClasses(link && link.querySelector(C("icon"))) || (parent ? parent.icon : ""),
      badge: badge ? badge.textContent.trim() : "",
      current: !!(link && link.getAttribute("aria-current") === "page"),
      placeholder: isPlaceholder(href)
    };
    e.key = e.placeholder ? "" : (urlKey(href) || "text:" + text);
    if (e.key && !st.byKey[e.key]) { st.byKey[e.key] = e; }
    if (link) {
      link.amcTcrEntry = e;
      link.setAttribute("tabindex", "-1");
    }
    st.entries.push(e);
    return e;
  }
  function build(root, st) {
    var list = part(root, "list");
    each(list ? list.children : [], function (li) {
      if (!li.classList.contains(cls("item"))) { return; }
      var e = entry(st, li, null);
      st.tops.push(e);
      var details = childOf(li, cls("group"));
      if (!details) { return; }
      e.details = details;
      e.children = [];
      var sub = details.querySelector(C("sub"));
      each(sub ? sub.children : [], function (cli) {
        if (cli.classList.contains(cls("item"))) { e.children.push(entry(st, cli, e)); }
      });
      var summary = details.querySelector("summary");
      if (summary) { summary.setAttribute("tabindex", "-1"); }
      var here = null;
      each(e.children, function (c) { if (c.current) { here = c; } });
      if (here) {
        li.classList.add("is-current");
        details.open = true;
      } else if (li.classList.contains("is-current") && e.link && !e.placeholder) {
        // The group itself is the current page.
        e.link.setAttribute("aria-current", "page");
        e.current = true;
      }
    });
  }
  function currentEntry(st) {
    var found = null;
    each(st.entries, function (e) { if (e.current && !found) { found = e; } });
    return found;
  }

  // ------------------------------------------------------------ rows and roving tabindex
  function collapsedLook(root) { return root.classList.contains("is-collapsed") && !root.classList.contains("is-peek"); }
  function rowVisible(root, a) {
    for (var n = a; n && n !== root; n = n.parentNode) {
      if (n.hidden) { return false; }
      if (n.tagName === "DETAILS" && !n.open) { return false; }
    }
    if (collapsedLook(root) && (a.classList.contains(cls("link--sub")) || a.closest(C("section--recent")))) { return false; }
    if (root.classList.contains("is-searching") && a.closest(C("section"))) { return false; }
    return true;
  }
  function rows(root) {
    var panel = part(root, "panel");
    var out = [];
    each(panel ? panel.querySelectorAll(C("link")) : [], function (a) { if (rowVisible(root, a)) { out.push(a); } });
    return out;
  }
  function pinOf(a) {
    var n = a && a.nextElementSibling;
    return n && n.classList.contains(cls("pin")) ? n : null;
  }
  function setActive(root, a) {
    var st = root.amcTcr;
    if (st.active && st.active !== a) {
      st.active.setAttribute("tabindex", "-1");
      var old = pinOf(st.active);
      if (old) { old.setAttribute("tabindex", "-1"); }
    }
    st.active = a || null;
    if (a) {
      a.setAttribute("tabindex", "0");
      var p = pinOf(a);
      if (p) { p.setAttribute("tabindex", "0"); }
    }
  }
  function ensureActive(root) {
    var st = root.amcTcr;
    var list = rows(root);
    if (st.active && root.contains(st.active) && list.indexOf(st.active) !== -1) { setActive(root, st.active); return; }
    var pick = null;
    var cur = currentEntry(st);
    if (cur) {
      if (list.indexOf(cur.link) !== -1) { pick = cur.link; } else if (cur.parent && list.indexOf(cur.parent.link) !== -1) { pick = cur.parent.link; }
    }
    setActive(root, pick || list[0] || null);
  }
  function syncExpanded(root) {
    var st = root.amcTcr;
    var icon = collapsedLook(root);
    each(st.tops, function (e) {
      if (e.details && e.link) { e.link.setAttribute("aria-expanded", String(icon ? st.fly === e : e.details.open)); }
    });
  }

  // ------------------------------------------------------------ announcements
  function say(root, text) {
    var status = part(root, "status");
    if (!status) { return; }
    status.textContent = "";
    window.clearTimeout(root.amcTcr.sayT);
    root.amcTcr.sayT = window.setTimeout(function () { status.textContent = text; }, 80);
  }

  // ------------------------------------------------------------ pins, recent, dock
  function makePin(root, key, text) {
    var b = make("button", cls("pin"));
    b.type = "button";
    b.setAttribute("tabindex", "-1");
    b.setAttribute("data-key", key);
    b.setAttribute("aria-pressed", "false");
    b.setAttribute("aria-label", (root.getAttribute("data-pin") || "Pin") + " " + text);
    var icon = make("span", cls("pinIcon") + " fa fa-star-o");
    icon.setAttribute("aria-hidden", "true");
    b.appendChild(icon);
    return b;
  }
  function paintPin(b, pinned) {
    b.setAttribute("aria-pressed", pinned ? "true" : "false");
    var icon = b.firstChild;
    if (icon) { icon.className = cls("pinIcon") + " fa " + (pinned ? "fa-star" : "fa-star-o"); }
  }
  function cloneRow(root, e, withPin) {
    var li = make("li", cls("item") + " " + cls("item--clone"));
    var a = make("a", cls("link") + " " + cls("link--clone"));
    a.setAttribute("href", e.href);
    if (e.link.getAttribute("target")) { a.setAttribute("target", e.link.getAttribute("target")); }
    a.setAttribute("data-key", e.key);
    a.setAttribute("tabindex", "-1");
    if (e.current) { a.classList.add("is-here"); }
    var icon = make("span", cls("icon") + " fa " + (e.icon || "fa-file-o"));
    icon.setAttribute("aria-hidden", "true");
    a.appendChild(icon);
    a.appendChild(make("span", cls("label"), e.text));
    if (e.parent) { a.appendChild(make("span", cls("context"), e.parent.text)); }
    if (e.badge) { a.appendChild(make("span", cls("badge"), e.badge)); }
    li.appendChild(a);
    if (withPin) { li.appendChild(makePin(root, e.key, e.text)); }
    return li;
  }
  function renderSmart(root) {
    var st = root.amcTcr;
    if (!st) { return; }
    var s = storage();
    var usePins = !!s && !opt(root, "noPins");
    var useRecent = !!s && !opt(root, "noRecent");
    var pins = [];
    var pinned = {};
    if (usePins) {
      each(readPins(s), function (k) { if (st.byKey[k] && !pinned[k]) { pins.push(k); pinned[k] = true; } });
    }
    each(st.entries, function (e) { if (e.pin) { paintPin(e.pin, !!pinned[e.key]); } });

    var pinSec = part(root, "section--pins");
    var pinUl = part(root, "pins");
    clear(pinUl);
    each(pins, function (k) { var li = cloneRow(root, st.byKey[k], true); paintPin(pinOf(li.firstChild), true); pinUl.appendChild(li); });
    if (pinSec) { pinSec.hidden = !pins.length; }

    var recent = [];
    if (useRecent) {
      var data = readJSON(s, storeKey("recent")) || {};
      var used = data.e || {};
      var now = Date.now();
      var cur = currentEntry(st);
      for (var k in used) {
        if (Object.prototype.hasOwnProperty.call(used, k) && st.byKey[k] && !pinned[k] && !(cur && cur.key === k) && used[k].length) {
          recent.push({ key: k, score: score(used[k], now), last: used[k][used[k].length - 1] });
        }
      }
      recent.sort(function (a, b) { return (b.score - a.score) || (b.last - a.last); });
      recent = recent.slice(0, RECENT_MAX);
    }
    var recSec = part(root, "section--recent");
    var recUl = part(root, "recent");
    clear(recUl);
    each(recent, function (r) { recUl.appendChild(cloneRow(root, st.byKey[r.key], usePins)); });
    if (recSec) { recSec.hidden = !recent.length; }

    var dock = part(root, "dockPins");
    clear(dock);
    each(pins.slice(0, DOCK_PINS), function (k) {
      var e = st.byKey[k];
      var li = make("li");
      var a = make("a", cls("dockLink") + " fa " + (e.icon || "fa-file-o"));
      a.setAttribute("href", e.href);
      a.setAttribute("data-key", e.key);
      if (e.current) { a.classList.add("is-here"); a.setAttribute("aria-current", "page"); }
      a.appendChild(make("span", cls("dockLabel"), e.text));
      li.appendChild(a);
      dock.appendChild(li);
    });
    ensureActive(root);
  }
  function renderAll() {
    each(document.querySelectorAll("." + ROOT), function (r) { if (r.amcTcr) { renderSmart(r); } });
  }
  function togglePin(root, btn) {
    var s = storage();
    var st = root.amcTcr;
    var key = btn.getAttribute("data-key");
    if (!s || !key || !st.byKey[key]) { return; }
    var pins = readPins(s);
    var at = pins.indexOf(key);
    var inSection = !!btn.closest(C("section"));
    var rowIndex = -1;
    if (inSection) { rowIndex = rows(root).indexOf(btn.previousElementSibling); }
    if (at === -1) { pins.push(key); } else { pins.splice(at, 1); }
    writeJSON(s, storeKey("pins"), pins);
    renderAll();
    say(root, (at === -1 ? root.getAttribute("data-pinned") : root.getAttribute("data-unpinned")) + " " + st.byKey[key].text);
    if (inSection) {
      // The clicked row was rebuilt: keep focus at the same place in the list.
      var list = rows(root);
      var next = list[Math.min(Math.max(rowIndex, 0), list.length - 1)];
      if (next) { setActive(root, next); next.focus(); } else { focusInput(root); }
    } else {
      btn.focus();
    }
  }

  // ------------------------------------------------------------ search
  function tokensOf(value) {
    var out = [];
    each(lower(value).trim().split(/\s+/), function (t) { if (t) { out.push(t); } });
    return out;
  }
  function matches(e, tokens) {
    for (var i = 0; i < tokens.length; i++) { if (e.hay.indexOf(tokens[i]) === -1) { return false; } }
    return true;
  }
  function highlight(e, tokens) {
    if (!e.label) { return; }
    var text = e.text;
    var hay = lower(text);
    var ranges = [];
    each(tokens, function (t) {
      var at = hay.indexOf(t);
      if (at !== -1) { ranges.push([at, at + t.length]); }
    });
    clear(e.label);
    if (!ranges.length) { e.label.textContent = text; return; }
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [ranges[0]];
    for (var i = 1; i < ranges.length; i++) {
      var last = merged[merged.length - 1];
      if (ranges[i][0] <= last[1]) { last[1] = Math.max(last[1], ranges[i][1]); } else { merged.push(ranges[i]); }
    }
    var pos = 0;
    each(merged, function (r) {
      if (r[0] > pos) { e.label.appendChild(document.createTextNode(text.slice(pos, r[0]))); }
      e.label.appendChild(make("mark", cls("mark"), text.slice(r[0], r[1])));
      pos = r[1];
    });
    if (pos < text.length) { e.label.appendChild(document.createTextNode(text.slice(pos))); }
  }
  function filter(root, value) {
    var st = root.amcTcr;
    var tokens = tokensOf(value);
    var searching = tokens.length > 0;
    if (searching && !st.saved) {
      st.saved = [];
      each(st.tops, function (e, i) { st.saved[i] = e.details ? e.details.open : null; });
    }
    var count = 0;
    var first = null;
    each(st.tops, function (e, i) {
      var m = searching && matches(e, tokens);
      var anyChild = false;
      each(e.children, function (c) { c.m = searching && matches(c, tokens); if (c.m) { anyChild = true; } });
      e.li.hidden = searching && !m && !anyChild;
      if (m) { count++; if (!first && !e.placeholder) { first = e; } }
      highlight(e, m ? tokens : []);
      each(e.children, function (c) {
        c.li.hidden = searching && !c.m && !m;
        if (c.m) { count++; if (!first) { first = c; } }
        highlight(c, c.m ? tokens : []);
      });
      if (e.details) {
        if (searching) { if (anyChild) { e.details.open = true; } } else if (st.saved) { e.details.open = st.saved[i]; }
      }
    });
    if (!searching) { st.saved = null; }
    root.classList.toggle("is-searching", searching);
    each(st.entries, function (e) { if (e.link) { e.link.classList.toggle("is-first", e === first); } });
    st.first = first;
    var empty = part(root, "empty");
    if (empty) { empty.hidden = !searching || count > 0; }
    window.clearTimeout(st.countT);
    if (searching) {
      st.countT = window.setTimeout(function () {
        say(root, count ? count + " " + (root.getAttribute("data-results") || "") : (empty ? empty.textContent : ""));
      }, 350);
    } else {
      part(root, "status").textContent = "";
    }
    syncExpanded(root);
    ensureActive(root);
  }
  function clearSearch(root) {
    var input = part(root, "input");
    if (input && input.value) { input.value = ""; filter(root, ""); }
  }
  function focusInput(root) {
    var input = part(root, "input");
    if (input) { input.focus(); }
  }
  function focusSearch(root) {
    if (root.classList.contains("is-phone")) { openSheet(root, true); return; }
    if (collapsedLook(root)) { openPeek(root); return; }
    var input = part(root, "input");
    if (!input) { return; }
    input.focus();
    input.select();
  }

  // ------------------------------------------------------------ fixed-position helpers
  function place(root, box, top, center) {
    var panel = part(root, "panel").getBoundingClientRect();
    var x = isRtl(root) ? viewportWidth() - panel.left + 8 : panel.right + 8;
    box.style.setProperty("--amc-tcr-x", Math.round(x) + "px");
    var y = top;
    if (!center) {
      var max = window.innerHeight - box.offsetHeight - 8;
      if (y > max) { y = max; }
      if (y < 8) { y = 8; }
    }
    box.style.setProperty("--amc-tcr-y", Math.round(y) + "px");
  }
  function showTip(root, a) {
    var tip = part(root, "tip");
    var label = a.querySelector(C("label"));
    if (!tip || !label) { return; }
    tip.textContent = a.amcTcrEntry ? a.amcTcrEntry.text : label.textContent;
    tip.hidden = false;
    var r = a.getBoundingClientRect();
    place(root, tip, r.top + r.height / 2, true);
  }
  function hideTip(root) {
    var tip = part(root, "tip");
    if (tip) { tip.hidden = true; }
  }

  // ------------------------------------------------------------ flyouts (icon rail)
  function openFlyout(root, e, focusFirst) {
    var st = root.amcTcr;
    var fly = part(root, "flyout");
    if (!fly || !e.children) { return; }
    window.clearTimeout(st.closeT);
    if (st.fly !== e) {
      closeFlyout(root, false);
      hideTip(root);
      clear(fly);
      fly.setAttribute("aria-label", e.text);
      var head;
      if (e.placeholder) {
        head = make("p", cls("flyTitle"), e.text);
      } else {
        head = make("a", cls("flyLink") + " " + cls("flyTitle"));
        head.setAttribute("href", e.href);
        head.setAttribute("data-key", e.key);
        if (e.current) { head.setAttribute("aria-current", "page"); }
        head.appendChild(make("span", cls("flyLabel"), e.text));
        if (e.badge) { head.appendChild(make("span", cls("badge") + " " + cls("flyBadge"), e.badge)); }
      }
      fly.appendChild(head);
      var ul = make("ul", cls("flyList"));
      each(e.children, function (c) {
        var li = make("li");
        var a = make("a", cls("flyLink"));
        a.setAttribute("href", c.href);
        if (c.key) { a.setAttribute("data-key", c.key); }
        if (c.link && c.link.getAttribute("target")) { a.setAttribute("target", c.link.getAttribute("target")); }
        if (c.current) { a.setAttribute("aria-current", "page"); }
        a.appendChild(make("span", cls("flyLabel"), c.text));
        if (c.badge) { a.appendChild(make("span", cls("badge") + " " + cls("flyBadge"), c.badge)); }
        li.appendChild(a);
        ul.appendChild(li);
      });
      fly.appendChild(ul);
      fly.hidden = false;
      st.fly = e;
      e.li.classList.add("is-flyOpen");
      place(root, fly, e.link.getBoundingClientRect().top - 6, false);
      syncExpanded(root);
    }
    if (focusFirst) {
      var first = fly.querySelector(C("flyList") + " " + C("flyLink")) || fly.querySelector(C("flyLink"));
      if (first) { first.focus(); }
    }
  }
  function closeFlyout(root, restoreFocus) {
    var st = root.amcTcr;
    window.clearTimeout(st.closeT);
    window.clearTimeout(st.openT);
    if (!st.fly) { return; }
    var e = st.fly;
    var fly = part(root, "flyout");
    var hadFocus = fly && fly.contains(document.activeElement);
    st.fly = null;
    if (fly) { fly.hidden = true; clear(fly); }
    e.li.classList.remove("is-flyOpen");
    syncExpanded(root);
    if (restoreFocus || hadFocus) {
      // Focus goes back to the group's icon without opening the flyout again.
      st.quiet = e;
      e.link.focus();
      st.quiet = null;
    }
  }
  function scheduleClose(root) {
    var st = root.amcTcr;
    window.clearTimeout(st.closeT);
    st.closeT = window.setTimeout(function () {
      var fly = part(root, "flyout");
      if (fly && fly.contains(document.activeElement)) { return; }
      closeFlyout(root, false);
    }, 240);
  }

  // ------------------------------------------------------------ peek (search while collapsed)
  function openPeek(root) {
    var panel = part(root, "panel");
    if (!root.classList.contains("is-peek")) {
      closeFlyout(root, false);
      hideTip(root);
      var r = root.getBoundingClientRect();
      root.style.setProperty("--amc-tcr-hold", Math.round(r.height) + "px");
      panel.style.setProperty("--amc-tcr-y", Math.max(8, Math.round(r.top)) + "px");
      panel.style.setProperty("--amc-tcr-x", Math.max(0, Math.round(isRtl(root) ? viewportWidth() - r.right : r.left)) + "px");
      root.classList.add("is-peek");
      syncExpanded(root);
      ensureActive(root);
    }
    focusInput(root);
  }
  function closePeek(root, focusBack) {
    if (!root.classList.contains("is-peek")) { return; }
    root.classList.remove("is-peek");
    clearSearch(root);
    syncExpanded(root);
    ensureActive(root);
    if (focusBack) { var b = part(root, "searchBtn"); if (b) { b.focus(); } }
  }

  // ------------------------------------------------------------ phone bottom sheet
  function openSheet(root, withSearch) {
    var st = root.amcTcr;
    var panel = part(root, "panel");
    if (!root.classList.contains("is-sheetOpen")) {
      root.classList.add("is-sheetOpen");
      panel.style.removeProperty("--amc-tcr-drag");
      part(root, "menu").setAttribute("aria-expanded", "true");
      ensureActive(root);
    }
    if (withSearch) { focusInput(root); } else if (st.active) { st.active.focus(); } else { focusInput(root); }
  }
  function closeSheet(root, restore) {
    if (!root.classList.contains("is-sheetOpen")) { return; }
    root.classList.remove("is-sheetOpen", "is-dragging");
    part(root, "panel").style.removeProperty("--amc-tcr-drag");
    part(root, "menu").setAttribute("aria-expanded", "false");
    clearSearch(root);
    if (restore) { part(root, "menu").focus(); }
  }
  function trapTab(ev, root) {
    var panel = part(root, "panel");
    var list = [];
    each(panel.querySelectorAll("a[href], button, input"), function (n) {
      if (n.tabIndex >= 0 && !n.disabled && n.getClientRects().length && window.getComputedStyle(n).visibility !== "hidden") { list.push(n); }
    });
    if (!list.length) { return; }
    var at = list.indexOf(document.activeElement);
    if (ev.shiftKey && at <= 0) { ev.preventDefault(); list[list.length - 1].focus(); } else if (!ev.shiftKey && at === list.length - 1) { ev.preventDefault(); list[0].focus(); }
  }

  // ------------------------------------------------------------ layout: shell, collapsed, phone
  function phoneOwner() {
    var first = null;
    var roots = document.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) {
      var r = roots[i];
      if (!r.amcTcr) { continue; }
      if (r.amcTcr.slot) { return r; }
      if (!first) { first = r; }
    }
    return first;
  }
  // Universal Theme side navigation: follow its body classes; if they cannot be found, fall
  // back to the width of the navigation column.
  function shellCollapsed(root) {
    var st = root.amcTcr;
    var b = document.body.classList;
    if (b.contains("js-navCollapsed")) { return true; }
    if (b.contains("js-navExpanded")) { return false; }
    var w = st.slot.getBoundingClientRect().width;
    return w > 0 && w < NARROW_SLOT;
  }
  function needsPortal(root) {
    for (var n = root.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      var cs = window.getComputedStyle(n);
      if (cs.transform !== "none" || cs.filter !== "none" || cs.perspective !== "none" || cs.display === "none" || cs.visibility === "hidden" ||
          /paint|layout|strict|content/.test(cs.contain || "") || (cs.backdropFilter && cs.backdropFilter !== "none")) { return true; }
    }
    return false;
  }
  // On phones the dock and sheet are position: fixed; a transformed or hidden ancestor (an
  // off-canvas navigation column) would trap them, so the rail moves to the end of <body> while
  // it is a bottom sheet and returns to its slot afterwards.
  function portal(root, on) {
    var st = root.amcTcr;
    if (on && !st.home && root.parentNode && needsPortal(root)) {
      st.home = document.createComment("amc-command-rail");
      root.parentNode.insertBefore(st.home, root);
      st.host = make("div", cls("host"));
      st.host.appendChild(root);
      document.body.appendChild(st.host);
    } else if (!on && st.home) {
      if (st.home.parentNode) { st.home.parentNode.insertBefore(root, st.home); st.home.parentNode.removeChild(st.home); }
      if (st.host && st.host.parentNode) { st.host.parentNode.removeChild(st.host); }
      st.home = null;
      st.host = null;
    }
  }
  function applyLayout(root) {
    var st = root.amcTcr;
    if (!st) { return; }
    var phone = !!(phoneMq && phoneMq.matches) && phoneOwner() === root;
    var collapsed = !phone && (st.slot ? shellCollapsed(root) : st.own);
    root.classList.toggle("is-shell", !!st.slot);
    root.classList.toggle("is-phone", phone);
    if (collapsed !== root.classList.contains("is-collapsed")) {
      closePeek(root, false);
      closeFlyout(root, false);
      hideTip(root);
    }
    root.classList.toggle("is-collapsed", collapsed);
    if (!phone) { closeSheet(root, false); }
    var toggle = part(root, "collapse");
    if (toggle) {
      toggle.hidden = !!st.slot || phone;
      toggle.setAttribute("aria-label", root.getAttribute(collapsed ? "data-expand" : "data-collapse") || "");
      toggle.setAttribute("title", toggle.getAttribute("aria-label"));
      var icon = toggle.querySelector(C("collapseIcon"));
      if (icon) { icon.className = cls("btnIcon") + " " + cls("collapseIcon") + " fa " + (collapsed ? "fa-angle-double-right" : "fa-angle-double-left"); }
    }
    var panel = part(root, "panel");
    var handle = part(root, "handleBar");
    if (handle) { handle.hidden = !phone; }
    if (phone) {
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-label", root.getAttribute("data-sheet") || "Navigation");
    } else {
      panel.removeAttribute("role");
      panel.removeAttribute("aria-modal");
      panel.removeAttribute("aria-label");
    }
    portal(root, phone);
    syncExpanded(root);
    ensureActive(root);
  }
  var layoutQueued = false;
  function syncAll() {
    layoutQueued = false;
    each(document.querySelectorAll("." + ROOT), function (r) { if (r.amcTcr) { applyLayout(r); } });
  }
  function queueLayout() {
    if (layoutQueued) { return; }
    layoutQueued = true;
    (window.requestAnimationFrame || window.setTimeout)(syncAll);
  }
  function toggleOwn(root) {
    var st = root.amcTcr;
    st.own = !root.classList.contains("is-collapsed");
    var s = storage();
    if (s) { writeRaw(s, storeKey("collapsed"), st.own ? "1" : "0"); }
    applyLayout(root);
  }

  // ------------------------------------------------------------ init
  function init(root) {
    if (root.amcTcr) { return; }
    var st = root.amcTcr = { entries: [], tops: [], byKey: {}, own: false, active: null, fly: null };
    if (!window.amcCommandK) { window.amcCommandK = OWNER; }
    st.slot = root.parentElement ? root.parentElement.closest(SHELL_SLOT) : null;
    build(root, st);
    root.classList.add("is-enhanced");
    var head = part(root, "head");
    if (head) { head.hidden = false; }
    var s = storage();
    if (!s) { root.classList.add("is-noStore"); }
    if (s && !opt(root, "noPins")) {
      each(st.entries, function (e) {
        if (e.key && e.link) { e.pin = makePin(root, e.key, e.text); e.link.parentNode.insertBefore(e.pin, e.link.nextSibling); }
      });
    }
    var saved = s ? readRaw(s, storeKey("collapsed")) : null;
    st.own = saved === "1" ? true : saved === "0" ? false : opt(root, "startCollapsed");
    var kbd = part(root, "kbd");
    if (kbd && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "")) { kbd.textContent = root.getAttribute("data-mac-key") || "⌘ K"; }
    if (!opt(root, "noRecent")) {
      var cur = currentEntry(st);
      if (cur && cur.key) { record(cur.key); }
    }
    renderSmart(root);
    applyLayout(root);
    if (st.slot && window.ResizeObserver) {
      st.ro = new ResizeObserver(queueLayout);
      st.ro.observe(st.slot);
    }
  }

  // ------------------------------------------------------------ keyboard
  var typed = "";
  var typedT = 0;
  function typeAhead(root, from, ch) {
    window.clearTimeout(typedT);
    typed += lower(ch);
    typedT = window.setTimeout(function () { typed = ""; }, 600);
    var list = rows(root);
    var at = list.indexOf(from);
    var n = list.length;
    var start = typed.length > 1 ? at : at + 1;
    for (var i = 0; i < n; i++) {
      var a = list[(start + i + n) % n];
      var e = a.amcTcrEntry;
      var label = e ? e.text : (a.querySelector(C("label")) || a).textContent;
      if (lower(label).indexOf(typed) === 0) { return a; }
    }
    return null;
  }
  function escapeChain(root) {
    var st = root.amcTcr;
    if (st.fly) { closeFlyout(root, true); return true; }
    var input = part(root, "input");
    if (input && input.value) { clearSearch(root); return true; }
    if (root.classList.contains("is-peek")) { closePeek(root, true); return true; }
    if (root.classList.contains("is-sheetOpen")) { closeSheet(root, true); return true; }
    return false;
  }
  function onRowKey(ev, root, a) {
    var key = ev.key;
    var rtl = isRtl(root);
    var fwd = rtl ? "ArrowLeft" : "ArrowRight";
    var back = rtl ? "ArrowRight" : "ArrowLeft";
    var list = rows(root);
    var at = list.indexOf(a);
    var e = a.amcTcrEntry;
    var next = null;
    var handled = true;
    if (key === "ArrowDown") {
      next = list[Math.min(at + 1, list.length - 1)];
    } else if (key === "ArrowUp") {
      next = at > 0 ? list[at - 1] : (collapsedLook(root) ? null : part(root, "input"));
    } else if (key === "Home") {
      next = list[0];
    } else if (key === "End") {
      next = list[list.length - 1];
    } else if (key === fwd) {
      if (e && e.details) {
        if (collapsedLook(root)) { openFlyout(root, e, true); } else if (!e.details.open) { e.details.open = true; syncExpanded(root); } else {
          each(e.children, function (c) { if (!next && rowVisible(root, c.link)) { next = c.link; } });
        }
      } else { handled = false; }
    } else if (key === back) {
      if (e && e.parent && !collapsedLook(root)) { next = e.parent.link; } else if (e && e.details && e.details.open && !collapsedLook(root)) {
        e.details.open = false;
        syncExpanded(root);
      } else { handled = false; }
    } else if (key === "Escape") {
      handled = escapeChain(root);
    } else if (key.length === 1 && key !== " " && key !== "/" && /\S/.test(key)) {
      next = typeAhead(root, a, key);
      handled = !!next;
    } else {
      handled = false;
    }
    if (next && next !== a) {
      if (next.classList.contains(cls("link"))) { setActive(root, next); }
      next.focus();
    }
    if (handled) { ev.preventDefault(); }
  }
  function onFlyKey(ev, root, t) {
    var fly = part(root, "flyout");
    var links = Array.prototype.slice.call(fly.querySelectorAll("a" + C("flyLink")));
    var at = links.indexOf(t);
    var back = isRtl(root) ? "ArrowRight" : "ArrowLeft";
    var next = null;
    if (ev.key === "ArrowDown") { next = links[Math.min(at + 1, links.length - 1)]; } else if (ev.key === "ArrowUp") { next = links[Math.max(at - 1, 0)]; } else if (ev.key === "Home") { next = links[0]; } else if (ev.key === "End") { next = links[links.length - 1]; } else if (ev.key === back || ev.key === "Escape") {
      ev.preventDefault();
      closeFlyout(root, true);
      return;
    } else { return; }
    ev.preventDefault();
    if (next) { next.focus(); }
  }
  function onInputKey(ev, root, input) {
    var st = root.amcTcr;
    if (ev.key === "ArrowDown") {
      var list = rows(root);
      var target = st.first && list.indexOf(st.first.link) !== -1 ? st.first.link : list[0];
      if (target) { ev.preventDefault(); setActive(root, target); target.focus(); }
    } else if (ev.key === "Enter") {
      if (input.value.trim() && st.first && st.first.link) { ev.preventDefault(); st.first.link.click(); }
    } else if (ev.key === "Escape") {
      if (escapeChain(root)) { ev.preventDefault(); }
    }
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.defaultPrevented) { return; }
    var t = ev.target;
    var r;
    var owner = !window.amcCommandK || window.amcCommandK === OWNER;
    if ((ev.key === "k" || ev.key === "K") && (ev.ctrlKey || ev.metaKey) && !ev.altKey && !ev.shiftKey) {
      r = owner && phoneOwner();
      if (r) { ev.preventDefault(); focusSearch(r); }
      return;
    }
    if (ev.key === "/" && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !editable(t)) {
      r = owner && phoneOwner();
      if (r) { ev.preventDefault(); focusSearch(r); }
      return;
    }
    var root = rootOf(t);
    if (!root || !root.amcTcr) { return; }
    if (ev.key === "Tab" && root.classList.contains("is-sheetOpen") && part(root, "panel").contains(t)) { trapTab(ev, root); return; }
    if (t.classList.contains(cls("input"))) { onInputKey(ev, root, t); return; }
    if (t.closest(C("flyout"))) { onFlyKey(ev, root, t); return; }
    if (t.classList.contains(cls("link")) && t.closest(C("panel"))) { onRowKey(ev, root, t); return; }
    if (ev.key === "Escape" && escapeChain(root)) { ev.preventDefault(); }
  });

  // Another template (for example the Smart Nav Bar search button, or its Ctrl+K when it owns the
  // shortcut) asks for search: take over and open the rail's own search.
  document.addEventListener(SEARCH_EVENT, function (ev) {
    if (ev.defaultPrevented) { return; }
    var r = phoneOwner();
    if (!r) { return; }
    ev.preventDefault();
    focusSearch(r);
  });

  document.addEventListener("input", function (ev) {
    var t = ev.target;
    if (!t.classList || !t.classList.contains(cls("input"))) { return; }
    var root = rootOf(t);
    if (root && root.amcTcr) { filter(root, t.value); }
  });

  // ------------------------------------------------------------ pointer and clicks
  var lastPointer = "mouse";
  document.addEventListener("pointerdown", function (ev) {
    lastPointer = ev.pointerType || "mouse";
    each(document.querySelectorAll("." + ROOT + ".is-peek"), function (r) {
      if (!part(r, "panel").contains(ev.target)) { closePeek(r, false); }
    });
    each(document.querySelectorAll("." + ROOT + ".is-collapsed"), function (r) {
      if (r.amcTcr && r.amcTcr.fly && !part(r, "flyout").contains(ev.target) && !r.amcTcr.fly.li.contains(ev.target)) { closeFlyout(r, false); }
    });
  }, true);

  function recordFrom(a) {
    var root = rootOf(a);
    if (!root || !root.amcTcr || opt(root, "noRecent")) { return; }
    var key = a.getAttribute("data-key") || (a.amcTcrEntry && a.amcTcrEntry.key);
    if (key) { record(key); }
  }
  document.addEventListener("auxclick", function (ev) {
    if (ev.button !== 1) { return; }
    var a = ev.target.closest && ev.target.closest(C("link") + "," + C("flyLink") + "," + C("dockLink"));
    if (a) { recordFrom(a); }
  });

  document.addEventListener("click", function (ev) {
    var t = ev.target;
    var root = rootOf(t);
    if (!root || !root.amcTcr || !t.closest) { return; }
    var st = root.amcTcr;
    var btn = t.closest("button");
    if (btn) {
      if (btn.classList.contains(cls("pin"))) { ev.preventDefault(); togglePin(root, btn); } else if (btn.classList.contains(cls("clear"))) {
        var s = storage();
        if (s) { removeKey(s, storeKey("recent")); }
        renderAll();
        say(root, root.getAttribute("data-cleared") || "");
        var list = rows(root);
        if (list[0]) { setActive(root, list[0]); list[0].focus(); } else { focusInput(root); }
      } else if (btn.classList.contains(cls("collapse"))) {
        toggleOwn(root);
      } else if (btn.classList.contains(cls("searchBtn"))) {
        openPeek(root);
      } else if (btn.classList.contains(cls("dockSearch"))) {
        openSheet(root, true);
      } else if (btn.classList.contains(cls("menu"))) {
        if (st.skipClick) { st.skipClick = false; return; }
        if (root.classList.contains("is-sheetOpen")) { closeSheet(root, true); } else { openSheet(root, false); }
      } else if (btn.classList.contains(cls("handle"))) {
        if (st.skipClick) { st.skipClick = false; return; }
        closeSheet(root, true);
      }
      return;
    }
    if (t.classList.contains(cls("backdrop"))) { closeSheet(root, true); return; }
    var a = t.closest(C("link") + "," + C("flyLink") + "," + C("dockLink"));
    if (!a) { return; }
    var e = a.amcTcrEntry;
    if (e && e.details && a.closest(C("panel"))) {
      if (collapsedLook(root)) {
        // Icon rail: a group opens its flyout first on touch, and always when it has no page.
        // Keyboard Enter on a group without a page enters its flyout.
        if (e.placeholder || (lastPointer === "touch" && st.fly !== e)) {
          ev.preventDefault();
          openFlyout(root, e, ev.detail === 0);
          return;
        }
      } else if (e.placeholder) {
        ev.preventDefault();
        e.details.open = !e.details.open;
        syncExpanded(root);
        return;
      }
    }
    recordFrom(a);
    if (root.classList.contains("is-sheetOpen")) { closeSheet(root, false); }
  });

  // Hover: flyouts for groups and tooltips for single links on the icon rail.
  document.addEventListener("mouseover", function (ev) {
    var t = ev.target;
    var root = rootOf(t);
    if (!root || !root.amcTcr || !collapsedLook(root) || root.classList.contains("is-phone")) { return; }
    var st = root.amcTcr;
    if (t.closest(C("flyout"))) { window.clearTimeout(st.closeT); return; }
    var a = t.closest(C("panel") + " " + C("link"));
    if (!a) { return; }
    var e = a.amcTcrEntry;
    window.clearTimeout(st.closeT);
    window.clearTimeout(st.openT);
    if (e && e.details) {
      hideTip(root);
      st.openT = window.setTimeout(function () { openFlyout(root, e, false); }, st.fly ? 0 : 90);
    } else {
      if (st.fly) { scheduleClose(root); }
      showTip(root, a);
    }
  });
  document.addEventListener("mouseout", function (ev) {
    var root = rootOf(ev.target);
    if (!root || !root.amcTcr || !collapsedLook(root)) { return; }
    var st = root.amcTcr;
    var to = ev.relatedTarget;
    if (to && ev.target.closest(C("link")) && to.closest && to.closest(C("link")) === ev.target.closest(C("link"))) { return; }
    hideTip(root);
    window.clearTimeout(st.openT);
    if (!st.fly) { return; }
    if (to && (part(root, "flyout").contains(to) || st.fly.li.contains(to))) { return; }
    scheduleClose(root);
  });

  document.addEventListener("focusin", function (ev) {
    var t = ev.target;
    var root = rootOf(t);
    if (!root || !root.amcTcr) { return; }
    var st = root.amcTcr;
    if (t.classList && t.classList.contains(cls("link")) && t.closest(C("panel"))) {
      setActive(root, t);
      if (collapsedLook(root) && !root.classList.contains("is-phone")) {
        var e = t.amcTcrEntry;
        if (e && e.details) { if (st.quiet !== e) { openFlyout(root, e, false); } } else {
          if (st.fly) { closeFlyout(root, false); }
          showTip(root, t);
        }
      }
    }
  });
  document.addEventListener("focusout", function (ev) {
    var root = rootOf(ev.target);
    if (!root || !root.amcTcr) { return; }
    var st = root.amcTcr;
    var to = ev.relatedTarget;
    hideTip(root);
    if (!to) { return; }
    if (st.fly && !part(root, "flyout").contains(to) && !st.fly.li.contains(to)) { closeFlyout(root, false); }
    if (root.classList.contains("is-peek") && !part(root, "panel").contains(to)) { closePeek(root, false); }
  });

  // Group toggles (the toggle event does not bubble; listen in the capture phase).
  document.addEventListener("toggle", function (ev) {
    var d = ev.target;
    if (!d.classList || !d.classList.contains(cls("group"))) { return; }
    var root = rootOf(d);
    if (!root || !root.amcTcr) { return; }
    syncExpanded(root);
    ensureActive(root);
  }, true);

  // Drag the sheet handle down to close; swipe the dock up to open.
  document.addEventListener("pointerdown", function (ev) {
    var t = ev.target;
    var root = rootOf(t);
    if (!root || !root.amcTcr || !root.classList.contains("is-phone") || !t.closest) { return; }
    var onHandle = t.closest(C("handleBar"));
    var onDock = t.closest(C("dock")) && !t.closest(C("dockLink"));
    if (!onHandle && !onDock) { return; }
    root.amcTcr.drag = { y0: ev.clientY, dy: 0, open: !!onHandle, id: ev.pointerId };
    if (onHandle) { root.classList.add("is-dragging"); }
  });
  document.addEventListener("pointermove", function (ev) {
    each(document.querySelectorAll("." + ROOT + ".is-phone"), function (root) {
      var d = root.amcTcr && root.amcTcr.drag;
      if (!d || d.id !== ev.pointerId) { return; }
      d.dy = ev.clientY - d.y0;
      if (d.open) { part(root, "panel").style.setProperty("--amc-tcr-drag", Math.max(0, d.dy) + "px"); }
    });
  });
  function endDrag(ev) {
    each(document.querySelectorAll("." + ROOT + ".is-phone"), function (root) {
      var st = root.amcTcr;
      var d = st && st.drag;
      if (!d || d.id !== ev.pointerId) { return; }
      st.drag = null;
      root.classList.remove("is-dragging");
      if (d.open) {
        if (Math.abs(d.dy) >= 6) {
          st.skipClick = true;
          if (d.dy > 80) { closeSheet(root, true); } else { part(root, "panel").style.removeProperty("--amc-tcr-drag"); }
        }
      } else if (d.dy < -30) {
        st.skipClick = true;
        openSheet(root, false);
      }
      window.setTimeout(function () { st.skipClick = false; }, 400);
    });
  }
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);

  // ------------------------------------------------------------ lifecycle
  var queued = false;
  function scan() {
    queued = false;
    each(document.querySelectorAll("." + ROOT), function (r) { init(r); });
  }
  function queue() {
    if (queued) { return; }
    queued = true;
    (window.requestAnimationFrame || window.setTimeout)(scan);
  }
  function watch() {
    if (window.apex && window.apex.jQuery) { window.apex.jQuery(document).on("apexafterrefresh", queue); }
    if (!window.MutationObserver) { return; }
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType === 1 && (n.classList.contains(ROOT) || (n.querySelector && n.querySelector("." + ROOT + ":not(.is-enhanced)")))) { queue(); return; }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
    // Universal Theme collapses and expands the side navigation with body classes.
    new MutationObserver(queueLayout).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }
  if (phoneMq) {
    if (phoneMq.addEventListener) { phoneMq.addEventListener("change", queueLayout); } else if (phoneMq.addListener) { phoneMq.addListener(queueLayout); }
  }
  window.addEventListener("resize", function () {
    each(document.querySelectorAll("." + ROOT), function (r) {
      if (!r.amcTcr) { return; }
      closeFlyout(r, false);
      hideTip(r);
      closePeek(r, false);
    });
    queueLayout();
  });
  window.addEventListener("storage", function (ev) {
    if (ev.key && ev.key.indexOf(SLUG + ":") === 0) { renderAll(); }
  });
  window.addEventListener("pageshow", function (ev) { if (ev.persisted) { renderAll(); } });

  function start() { scan(); watch(); }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", start); } else { start(); }

  window.amcTplCommandRail = { refresh: scan, sync: syncAll, key: storeKey };
})();
