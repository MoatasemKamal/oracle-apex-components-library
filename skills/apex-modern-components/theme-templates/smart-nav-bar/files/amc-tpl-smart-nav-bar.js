/* AMC Smart Nav Bar: list template script for the application Navigation Bar.
   Reads each top entry's role (Attribute 1: search, notifications, help, user) and turns the
   plain links into a compact cluster: a command-palette search dialog, a notification feed with
   a remembered unread state, menus with a roving keyboard model, an initials avatar, and
   automatic overflow into the user menu (or a More menu) when the header runs out of room.
   Delegated listeners on document, textContent only, storage in try/catch. Without this file
   every entry is a plain link and sub entries open as nested links on hover and focus. */
(function (w, d) {
  "use strict";
  if (w.amcTplSmartNavBar) return;

  var ROOT = "amc-TSmartNavBar", P = ROOT + "-";
  var OWNER = "smart-nav-bar", EVT = "amc:command-search";
  var ROLES = { search: 1, notifications: 1, help: 1, user: 1 };
  var ROLE_ICON = { search: "fa-search", notifications: "fa-bell-o", help: "fa-question-circle-o", user: "fa-user" };
  var PRIORITY = { user: 0, notifications: 1, search: 2, help: 3, "": 4 };
  var ESSENTIAL = { user: 1, notifications: 1, search: 1 };
  var MAX_VISIBLE = 4, PHONE = 600, MAX_RESULTS = 50, MAX_RECENT = 5, MAX_IDS = 300;
  var NAV_SOURCES = "#t_TreeNav, #t_MenuNav, .t-TreeNav, .amc-TCommandRail, [data-amc-nav-source]";
  var seq = 0, mem = {}, openItem = null, rafLayout = 0;
  var slice = Array.prototype.slice;

  // ------------------------------------------------------------ helpers
  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function make(tag, cls, parent, text) {
    var el = d.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined && text !== null) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }
  function trim(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").replace(/^\s+|\s+$/g, ""); }
  function str(root, key, fallback) { var v = root.getAttribute("data-" + key); return v == null || v === "" ? fallback : v; }
  function kids(el, cls) {
    var out = [];
    for (var c = el ? el.firstElementChild : null; c; c = c.nextElementSibling) if (c.classList.contains(cls)) out.push(c);
    return out;
  }
  function uid(root, part) { seq++; return (root.id || "amc-snb") + "-" + part + seq; }
  function isMac() { return /Mac|iPhone|iPad/.test((w.navigator && (w.navigator.platform || w.navigator.userAgent)) || ""); }
  function reducedMotion() { return !!(w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function realHref(href) {
    href = trim(href);
    return !!href && href !== "#" && !/^javascript:\s*(void\(0\)|;)?\s*;?$/i.test(href) && href !== "separator";
  }
  function faClasses(el) {
    if (!el) return "";
    return (el.className || "").split(/\s+/).filter(function (c) { return /^fa-/.test(c); }).join(" ");
  }
  function hasFa(el) { return !!faClasses(el); }

  // ------------------------------------------------------------ storage (never throws)
  function appId() {
    var a = w.apex && w.apex.env && w.apex.env.APP_ID;
    return a ? String(a) : w.location.pathname;
  }
  function skey(root, part) { return "amc-tpl-" + OWNER + ":" + appId() + ":" + (root.id || "navbar") + ":" + part; }
  function load(root, part) {
    var k = skey(root, part), v = null;
    try { v = w.localStorage.getItem(k); } catch (e) { v = mem[k] || null; }
    if (v == null && mem[k]) v = mem[k];
    try { return v ? JSON.parse(v) : null; } catch (e2) { return null; }
  }
  function save(root, part, value) {
    var k = skey(root, part), v = JSON.stringify(value);
    mem[k] = v;
    try { w.localStorage.setItem(k, v); } catch (e) { /* blocked or full: memory only */ }
  }

  // ------------------------------------------------------------ announcements
  function announce(root, text) {
    var live = root.querySelector("." + P + "live");
    if (!live) return;
    live.textContent = "";
    setTimeout(function () { live.textContent = text; }, 60);
  }
  function unreadText(root, n) {
    return n + " " + (n === 1 ? str(root, "unread-one", "unread notification") : str(root, "unread", "unread notifications"));
  }

  // ------------------------------------------------------------ init
  function roleOf(item) {
    var r = trim(item.getAttribute("data-role")).toLowerCase();
    return ROLES[r] ? r : "";
  }
  function labelOf(el) { var l = el && el.querySelector("." + P + "label"); return l ? trim(l.textContent) : ""; }

  function initials(name) {
    name = trim(String(name).replace(/@.*$/, ""));
    var words = name.split(/[\s._\-]+/).filter(function (x) { return x; });
    if (!words.length) return "?";
    var s = words.length > 1 ? words[0].charAt(0) + words[words.length - 1].charAt(0) : words[0].slice(0, 2);
    return s.toLocaleUpperCase();
  }
  function isImageUrl(v) {
    v = trim(v);
    return !!v && (/^data:image\//i.test(v) || /^(https?:)?\/\//i.test(v) || /\.(png|jpe?g|gif|svg|webp|avif)(\?|#|$)/i.test(v) || /^\.{0,2}\/[^\s]+$/.test(v) && /\./.test(v));
  }
  function avatar(name, image, large) {
    var a = make("span", P + "avatar" + (large ? " " + P + "avatar--large" : ""));
    a.setAttribute("aria-hidden", "true");
    a.textContent = initials(name);
    if (isImageUrl(image)) {
      var img = make("img", P + "avatarImg", a);
      img.alt = "";
      img.width = large ? 40 : 28;
      img.height = large ? 40 : 28;
      img.addEventListener("error", function () { if (img.parentNode) img.parentNode.removeChild(img); });
      img.src = image;
    }
    return a;
  }

  // Replace the entry's link by a real button that keeps the link's content.
  function toButton(item, link, panel) {
    var btn = make("button", P + "link " + P + "trigger");
    btn.type = "button";
    while (link.firstChild) btn.appendChild(link.firstChild);
    btn.title = link.title || "";
    btn.setAttribute("aria-expanded", "false");
    if (panel) btn.setAttribute("aria-controls", panel.id);
    btn._amcHref = link.getAttribute("href") || "";
    btn._amcImage = link.getAttribute("data-image") || "";
    link.parentNode.replaceChild(btn, link);
    return btn;
  }

  function looksSignOut(a) {
    var t = (a.getAttribute("href") || "") + " " + a.textContent + " " + faClasses(a.querySelector("." + P + "entryIcon"));
    return /log\s?-?out|sign\s?-?out|logoff|fa-sign-out|fa-power-off/i.test(t);
  }

  function prepareMenu(item, ul, label) {
    ul.setAttribute("role", "menu");
    if (label) ul.setAttribute("aria-label", label);
    var entries = kids(ul, P + "entry");
    for (var i = 0; i < entries.length; i++) {
      var li = entries[i], a = li.querySelector("." + P + "entryLink");
      li.setAttribute("role", "none");
      if (!a) continue;
      var text = trim(a.textContent), href = trim(a.getAttribute("href"));
      if (/^-{2,}$/.test(text) || href === "separator") {
        while (li.firstChild) li.removeChild(li.firstChild);
        li.className = P + "entry " + P + "entry--separator";
        li.setAttribute("role", "separator");
        continue;
      }
      a.setAttribute("role", "menuitem");
      a.tabIndex = -1;
      if (looksSignOut(a)) li.classList.add("is-signout");
    }
  }

  function initNotifications(root, item, btn, panel) {
    var title = labelOf(item) || "Notifications";
    if (!panel) {
      panel = make("div", P + "panel", item);
      panel.id = uid(root, "panel");
      btn.setAttribute("aria-controls", panel.id);
    }
    panel.setAttribute("role", "group");
    var head = make("div", P + "panelHead");
    var h = make("span", P + "panelTitle", head, title);
    h.id = uid(root, "title");
    panel.setAttribute("aria-labelledby", h.id);
    var mark = make("button", P + "markRead", head, str(root, "mark-read", "Mark all read"));
    mark.type = "button";
    panel.insertBefore(head, panel.firstChild);
    var ul = panel.querySelector("." + P + "menu");
    if (ul) {
      ul.setAttribute("aria-labelledby", h.id);
      var entries = kids(ul, P + "entry");
      for (var i = 0; i < entries.length; i++) {
        var li = entries[i], a = li.querySelector("." + P + "entryLink");
        if (!a) continue;
        li._amcKey = trim(li.getAttribute("data-key")) || trim(a.textContent) + "|" + (a.getAttribute("href") || "");
        a.tabIndex = -1;
        var dot = make("span", P + "dot", a);
        dot.setAttribute("aria-hidden", "true");
        var sr = make("span", P + "srOnly " + P + "dotText", null, str(root, "unread-dot", "Unread") + ": ");
        a.insertBefore(sr, a.firstChild);
      }
    }
    var empty = make("p", P + "empty", null);
    make("span", P + "emptyIcon fa fa-check-circle-o", empty).setAttribute("aria-hidden", "true");
    make("span", null, empty, str(root, "empty", "You are all caught up"));
    empty.hidden = !!(ul && kids(ul, P + "entry").length);
    if (ul && ul.nextSibling) panel.insertBefore(empty, ul.nextSibling); else panel.appendChild(empty);
    if (realHref(btn._amcHref)) {
      var foot = make("a", P + "footLink", panel, str(root, "view-all", "View all"));
      foot.href = btn._amcHref;
    }
    item._amcPanel = panel;
    applyNotifications(root, item, false);
  }

  function initUser(root, item, btn, panel) {
    var name = labelOf(item), meta = item.querySelector("." + P + "meta");
    var icon = btn.querySelector("." + P + "icon");
    var av = avatar(name, btn._amcImage || (btn.getAttribute && btn.getAttribute("data-image")) || "", false);
    if (icon) icon.parentNode.replaceChild(av, icon); else btn.insertBefore(av, btn.firstChild);
    if (!panel) return;
    make("span", P + "caret", btn).setAttribute("aria-hidden", "true");
    var head = make("div", P + "panelHead");
    head.appendChild(avatar(name, btn._amcImage, true));
    var who = make("span", P + "panelWho", head);
    make("span", P + "panelName", who, name);
    make("span", P + "panelSub", who, meta ? trim(meta.textContent) : "");
    panel.insertBefore(head, panel.firstChild);
  }

  function init(root) {
    if (!root || root._amcSnb) return;
    var list = root.querySelector("." + P + "list");
    if (!list) return;
    root._amcSnb = true;
    root.classList.add("is-js");
    var items = kids(list, P + "item"), hasSearch = false, userMenu = null;
    for (var i = 0; i < items.length; i++) {
      var item = items[i], role = roleOf(item), link = kids(item, P + "link")[0];
      var panel = kids(item, P + "panel")[0] || null;
      item._amcRole = role;
      item._amcIndex = i;
      if (role) item.classList.add(P + "item--" + role);
      if (!link) continue;
      var icon = link.querySelector("." + P + "icon");
      if (role && icon && !hasFa(icon)) icon.className += " " + ROLE_ICON[role];
      if (panel) panel.id = uid(root, "panel");
      var btn = link;
      if (role === "search") {
        hasSearch = true;
        btn = toButton(item, link, null);
        btn.removeAttribute("aria-expanded");
        btn.setAttribute("aria-haspopup", "dialog");
        btn.classList.add(P + "searchBtn");
        var kbd = make("kbd", P + "kbd", btn, isMac() ? "⌘ K" : "Ctrl K");
        kbd.setAttribute("aria-hidden", "true");
        if (panel) panel.parentNode.removeChild(panel); // search has no dropdown
      } else if (role === "notifications") {
        btn = toButton(item, link, panel);
        initNotifications(root, item, btn, panel);
      } else if (panel) {
        btn = toButton(item, link, panel);
        btn.setAttribute("aria-haspopup", "menu");
        if (role !== "user" && !hasFa(btn.querySelector("." + P + "icon"))) make("span", P + "caret", btn).setAttribute("aria-hidden", "true");
      }
      if (role === "user") {
        initUser(root, item, btn, panel);
        if (panel) userMenu = item;
      }
      if (panel && role !== "notifications" && role !== "search") {
        var ul = panel.querySelector("." + P + "menu");
        if (ul) prepareMenu(item, ul, labelOf(item));
        item._amcPanel = panel;
      }
      if (role !== "notifications") {
        var badge = btn.querySelector("." + P + "badge");
        if (badge) badge.classList.toggle("is-zero", !(parseInt(badge.textContent, 10) > 0));
      }
    }
    root._amcUserMenu = userMenu;
    if (!userMenu) buildMore(root, list);
    if (hasSearch && !w.amcCommandK) w.amcCommandK = OWNER;
    if (hasSearch && w.amcCommandK === OWNER) {
      var sb = root.querySelector("." + P + "searchBtn");
      if (sb) {
        sb.setAttribute("aria-keyshortcuts", isMac() ? "Meta+K" : "Control+K");
        sb.title = (sb.title ? sb.title + " " : "") + "(" + (isMac() ? "⌘K" : "Ctrl+K") + ")";
      }
    }
    watchSize(root);
    layout(root);
  }

  function buildMore(root, list) {
    var li = make("li", P + "item " + P + "item--more", list);
    li._amcRole = "more";
    var btn = make("button", P + "link " + P + "trigger", li);
    btn.type = "button";
    btn.title = str(root, "more", "More");
    btn.setAttribute("aria-haspopup", "menu");
    btn.setAttribute("aria-expanded", "false");
    make("span", P + "icon fa fa-ellipsis-h", btn).setAttribute("aria-hidden", "true");
    make("span", P + "label", btn, str(root, "more", "More"));
    var panel = make("div", P + "panel", li);
    panel.id = uid(root, "panel");
    btn.setAttribute("aria-controls", panel.id);
    var ul = make("ul", P + "menu", panel);
    ul.setAttribute("role", "menu");
    ul.setAttribute("aria-label", str(root, "more", "More"));
    li._amcPanel = panel;
    root._amcMore = li;
  }

  function initAll() {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) { init(roots[i]); layout(roots[i]); }
    if (openItem && !d.body.contains(openItem)) openItem = null;
  }

  // ------------------------------------------------------------ notifications state
  function notifEntries(item) {
    var ul = item._amcPanel && item._amcPanel.querySelector("." + P + "menu");
    return ul ? kids(ul, P + "entry").filter(function (li) { return li._amcKey; }) : [];
  }
  function countOf(item) {
    var n = parseInt(item.getAttribute("data-badge"), 10);
    if (isNaN(n)) n = notifEntries(item).filter(function (li) { return !/^read$/i.test(trim(li.getAttribute("data-state"))); }).length;
    return Math.max(0, n);
  }
  function applyNotifications(root, item, live) {
    var st = load(root, "read") || { m: 0, ids: [] };
    if (!st.ids || !st.ids.length) st.ids = [];
    var n = countOf(item);
    if (n < (st.m || 0)) { st.m = n; save(root, "read", st); }
    var shown = Math.max(0, n - (st.m || 0));
    var entries = notifEntries(item), unread = 0;
    for (var i = 0; i < entries.length; i++) {
      var read = st.ids.indexOf(entries[i]._amcKey) !== -1 || /^read$/i.test(trim(entries[i].getAttribute("data-state")));
      entries[i].classList.toggle("is-read", read);
      var sr = entries[i].querySelector("." + P + "dotText");
      if (sr) sr.hidden = read;
      if (!read) unread++;
    }
    var btn = kids(item, P + "link")[0];
    var badge = btn && btn.querySelector("." + P + "badge");
    if (badge) {
      badge.textContent = shown > 99 ? "99+" : shown ? String(shown) : "";
      badge.classList.toggle("is-zero", !shown);
      badge.setAttribute("aria-hidden", "true");
    }
    var sr2 = btn && btn.querySelector("." + P + "badgeText");
    if (btn && !sr2) sr2 = make("span", P + "srOnly " + P + "badgeText", btn);
    if (sr2) sr2.textContent = shown ? ", " + unreadText(root, shown) : "";
    var mark = item._amcPanel && item._amcPanel.querySelector("." + P + "markRead");
    if (mark) mark.setAttribute("aria-disabled", shown || unread ? "false" : "true");
    var seen = load(root, "seen");
    var last = seen && typeof seen.n === "number" ? seen.n : (live ? item._amcShown || 0 : null);
    if (last !== null && shown > last) bump(item);
    if (live && shown !== item._amcShown && shown > 0) announce(root, unreadText(root, shown));
    item._amcShown = shown;
    save(root, "seen", { n: shown });
  }
  function bump(item) {
    item.classList.remove("is-bumped");
    void item.offsetWidth;
    item.classList.add("is-bumped");
    clearTimeout(item._amcBumpTimer);
    item._amcBumpTimer = setTimeout(function () { item.classList.remove("is-bumped"); }, 5200);
  }
  function markAllRead(root, item) {
    var st = load(root, "read") || { m: 0, ids: [] };
    var ids = st.ids || [], entries = notifEntries(item);
    for (var i = 0; i < entries.length; i++) if (ids.indexOf(entries[i]._amcKey) === -1) ids.push(entries[i]._amcKey);
    if (ids.length > MAX_IDS) ids = ids.slice(ids.length - MAX_IDS);
    save(root, "read", { m: countOf(item), ids: ids });
    applyNotifications(root, item, false);
    announce(root, str(root, "marked", "All notifications marked as read"));
  }

  // ------------------------------------------------------------ overflow
  function hostOf(root) {
    return (root.closest && root.closest("header, .t-Header")) || root.parentElement;
  }
  function topItems(root) {
    var list = root.querySelector("." + P + "list");
    return kids(list, P + "item").filter(function (li) { return li._amcRole !== "more"; });
  }
  function fits(root) {
    var list = root.querySelector("." + P + "list");
    var r = list.getBoundingClientRect(), rr = root.getBoundingClientRect();
    var vw = d.documentElement.clientWidth || w.innerWidth;
    if (r.left < Math.max(0, rr.left) - 0.5 || r.right > Math.min(vw, rr.right) + 0.5) return false;
    var host = hostOf(root);
    if (host && host !== d.body) {
      var hr = host.getBoundingClientRect();
      if (r.left < hr.left - 0.5 || r.right > hr.right + 0.5) return false;
    }
    return true;
  }
  function layout(root) {
    if (!root._amcSnb) return;
    var items = topItems(root);
    var vw = d.documentElement.clientWidth || w.innerWidth;
    var phone = vw < PHONE;
    var userMenu = root._amcUserMenu, more = root._amcMore;
    var order = items.slice().sort(function (a, b) {
      return (PRIORITY[a._amcRole] - PRIORITY[b._amcRole]) || (a._amcIndex - b._amcIndex);
    });
    var hidden = [], kept = [];
    for (var i = 0; i < order.length; i++) {
      var it = order[i];
      if (ESSENTIAL[it._amcRole]) { kept.push(it); continue; }
      if (phone || kept.length >= MAX_VISIBLE) hidden.push(it); else kept.push(it);
    }
    // A generated More button takes one of the four places.
    if (hidden.length && !userMenu && kept.length >= MAX_VISIBLE) {
      for (var k = kept.length - 1; k >= 0; k--) if (!ESSENTIAL[kept[k]._amcRole]) { hidden.unshift(kept.splice(k, 1)[0]); break; }
    }
    root.classList.remove("is-tight");
    apply(root, items, hidden);
    if (!fits(root)) {
      root.classList.add("is-tight");
      while (!fits(root)) {
        var victim = null;
        for (var j = kept.length - 1; j >= 0; j--) if (!ESSENTIAL[kept[j]._amcRole]) { victim = kept.splice(j, 1)[0]; break; }
        if (!victim) break;
        hidden.unshift(victim);
        apply(root, items, hidden);
      }
    }
  }
  function apply(root, items, hidden) {
    var sig = hidden.map(function (h) { return h._amcIndex; }).sort().join(",");
    for (var i = 0; i < items.length; i++) {
      var off = hidden.indexOf(items[i]) !== -1;
      items[i].classList.toggle("is-overflow", off);
      if (off && openItem === items[i]) close(openItem, false);
    }
    if (root._amcSig === sig) return;
    root._amcSig = sig;
    var host = root._amcUserMenu || root._amcMore;
    if (!host) return;
    var ul = host._amcPanel.querySelector("." + P + "menu");
    var old = ul.querySelectorAll("." + P + "entry--moved");
    for (var o = 0; o < old.length; o++) old[o].parentNode.removeChild(old[o]);
    if (root._amcMore) root._amcMore.classList.toggle("is-needed", hidden.length > 0 && !root._amcUserMenu);
    if (!hidden.length) return;
    // Plain links first, then entries with sub entries as labelled groups, each in list order.
    var grouped = function (it) { return it._amcPanel && it._amcRole !== "notifications" ? 1 : 0; };
    var byIndex = hidden.slice().sort(function (a, b) { return grouped(a) - grouped(b) || a._amcIndex - b._amcIndex; });
    var anchor = null;
    var signOut = ul.querySelector("." + P + "entry.is-signout");
    if (signOut) {
      anchor = signOut;
      var prev = signOut.previousElementSibling;
      if (prev && prev.classList.contains(P + "entry--separator")) anchor = prev;
    }
    var frag = d.createDocumentFragment();
    if (root._amcUserMenu && kids(ul, P + "entry").length) addMoved(frag, "separator");
    for (var i2 = 0; i2 < byIndex.length; i2++) {
      var it = byIndex[i2], panel = it._amcPanel || kids(it, P + "panel")[0];
      var subs = panel ? panel.querySelectorAll("." + P + "menu ." + P + "entryLink") : [];
      if (subs.length && it._amcRole !== "notifications") {
        addMoved(frag, "group", labelOf(it));
        for (var s = 0; s < subs.length; s++) addMoved(frag, "link", subs[s]);
      } else {
        addMoved(frag, "top", it);
      }
    }
    ul.insertBefore(frag, anchor);
  }
  function addMoved(frag, kind, src) {
    var li = make("li", P + "entry " + P + "entry--moved");
    li.setAttribute("role", "none");
    if (kind === "separator") { li.classList.add(P + "entry--separator"); li.setAttribute("role", "separator"); frag.appendChild(li); return; }
    if (kind === "group") { li.classList.add(P + "entry--group"); li.setAttribute("role", "presentation"); li.textContent = src; frag.appendChild(li); return; }
    var a = make("a", P + "entryLink", li), href, text, iconCls;
    if (kind === "top") {
      var btn = kids(src, P + "link")[0];
      href = btn ? (btn._amcHref !== undefined ? btn._amcHref : btn.getAttribute("href")) : "#";
      text = labelOf(src);
      iconCls = faClasses(btn && btn.querySelector("." + P + "icon"));
      if (btn && btn.getAttribute("aria-current")) a.setAttribute("aria-current", "page");
    } else {
      href = src.getAttribute("href");
      text = trim((src.querySelector("." + P + "entryText") || src).textContent);
      iconCls = faClasses(src.querySelector("." + P + "entryIcon"));
      if (src.getAttribute("aria-current")) a.setAttribute("aria-current", "page");
    }
    if (/^-{2,}$/.test(text) || href === "separator") { li.removeChild(a); li.classList.add(P + "entry--separator"); li.setAttribute("role", "separator"); frag.appendChild(li); return; }
    a.href = href || "#";
    a.setAttribute("role", "menuitem");
    a.tabIndex = -1;
    make("span", P + "entryIcon fa " + iconCls, a).setAttribute("aria-hidden", "true");
    var body = make("span", P + "entryBody", a);
    make("span", P + "entryText", body, text);
    frag.appendChild(li);
  }
  function scheduleLayout(root) {
    if (rafLayout) return;
    var run = function (fn) { return w.requestAnimationFrame ? w.requestAnimationFrame(fn) : setTimeout(fn, 16); };
    rafLayout = run(function () {
      rafLayout = 0;
      var roots = d.querySelectorAll("." + ROOT + ".is-js");
      for (var i = 0; i < roots.length; i++) layout(roots[i]);
      if (openItem) position(openItem);
    });
  }
  function watchSize(root) {
    if (!w.ResizeObserver) return;
    var ro = new w.ResizeObserver(function () { scheduleLayout(root); });
    var host = hostOf(root);
    if (host) ro.observe(host);
    ro.observe(root);
  }

  // ------------------------------------------------------------ dropdowns
  function triggerOf(item) { return kids(item, P + "link")[0]; }
  function entriesOf(item) {
    var p = item._amcPanel;
    if (!p) return [];
    return slice.call(p.querySelectorAll("." + P + "menu ." + P + "entryLink")).filter(function (a) { return a.offsetParent !== null || a.getClientRects().length; });
  }
  function rove(item, target) {
    var list = entriesOf(item);
    for (var i = 0; i < list.length; i++) list[i].tabIndex = list[i] === target ? 0 : -1;
    if (target) target.focus();
  }
  function position(item) {
    var p = item._amcPanel, t = triggerOf(item);
    if (!p || !t) return;
    var r = t.getBoundingClientRect();
    p.style.setProperty("--amc-snb-top", Math.round(r.bottom + 8) + "px");
  }
  function open(item, focus) {
    if (!item._amcPanel) return;
    if (openItem && openItem !== item) close(openItem, false);
    var t = triggerOf(item);
    position(item);
    item.classList.add("is-open");
    t.setAttribute("aria-expanded", "true");
    openItem = item;
    var list = entriesOf(item);
    for (var i = 0; i < list.length; i++) list[i].tabIndex = i === 0 ? 0 : -1;
    if (focus === "first" && list.length) rove(item, list[0]);
    else if (focus === "last" && list.length) rove(item, list[list.length - 1]);
    else if (focus && !list.length) {
      var f = item._amcPanel.querySelector("button, a[href]");
      if (f) f.focus();
    }
  }
  function close(item, refocus) {
    if (!item) return;
    item.classList.remove("is-open");
    var t = triggerOf(item);
    if (t) t.setAttribute("aria-expanded", "false");
    if (openItem === item) openItem = null;
    if (refocus && t) t.focus();
  }

  // ------------------------------------------------------------ search dialog
  function collect(root) {
    var out = [], seen = {};
    function push(a, path, icon) {
      var href = a.getAttribute("href") || "";
      if (!realHref(href)) return;
      var label = trim((a.querySelector("." + P + "entryText, .a-TreeView-label") || a).textContent);
      if (!label || /^-{2,}$/.test(label)) return;
      var k = label + "\u0001" + href;
      if (seen[k]) return;
      seen[k] = 1;
      out.push({ label: label, href: href, path: path, icon: icon, el: a });
    }
    var containers = slice.call(d.querySelectorAll(NAV_SOURCES)).filter(function (c) { return !closest(c, ROOT); });
    for (var i = 0; i < containers.length; i++) {
      var links = containers[i].querySelectorAll("a[href]");
      for (var j = 0; j < links.length; j++) {
        var a = links[j], trail = [], icon = faClasses(a.querySelector("[class*='fa-']"));
        var li = a.parentNode;
        while (li && li !== containers[i] && li.tagName !== "LI") li = li.parentNode;
        if (li && li.tagName === "LI" && !icon) icon = (li.getAttribute("data-icon") || "").split(/\s+/).filter(function (c) { return /^fa-/.test(c); }).join(" ");
        for (var up = li && li.parentNode; up && up !== containers[i]; up = up.parentNode) {
          if (up.tagName === "LI") {
            var own = up.querySelector("a, .a-TreeView-label");
            if (own && own !== a) trail.unshift(trim(own.textContent));
          }
        }
        push(a, trail.join(" › "), icon);
      }
    }
    if (out.length) return { items: out, own: false };
    var items = topItems(root);
    for (var t = 0; t < items.length; t++) {
      var it = items[t];
      if (it._amcRole === "search" || it._amcRole === "notifications") continue;
      var btn = triggerOf(it), label = labelOf(it);
      var href = btn && (btn._amcHref !== undefined ? btn._amcHref : btn.getAttribute("href"));
      if (btn && realHref(href) && !it._amcPanel) {
        out.push({ label: label, href: href, path: "", icon: faClasses(btn.querySelector("." + P + "icon")), el: btn.tagName === "A" ? btn : null });
      }
      var subs = it._amcPanel ? it._amcPanel.querySelectorAll("." + P + "menu ." + P + "entryLink") : [];
      for (var s = 0; s < subs.length; s++) {
        if (closest(subs[s], P + "entry--moved")) continue;
        push(subs[s], label, faClasses(subs[s].querySelector("." + P + "entryIcon")));
      }
    }
    return { items: out, own: true };
  }

  function buildDialog(root) {
    if (root._amcDialog && root.contains(root._amcDialog)) return root._amcDialog;
    var dlg = make("dialog", P + "dialog", root);
    dlg.setAttribute("aria-label", str(root, "search", "Search"));
    var box = make("div", P + "dialogBox", dlg);
    var row = make("div", P + "searchRow", box);
    make("span", P + "searchIcon fa fa-search", row).setAttribute("aria-hidden", "true");
    var input = make("input", P + "input", row);
    input.type = "text";
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    input.placeholder = str(root, "search-placeholder", "Search pages");
    input.setAttribute("aria-label", str(root, "search", "Search"));
    var esc = make("kbd", P + "escKey", row, "Esc");
    esc.setAttribute("aria-hidden", "true");
    var results = make("div", P + "results", box);
    results.id = uid(root, "results");
    results.setAttribute("role", "listbox");
    results.setAttribute("aria-label", str(root, "pages", "Pages"));
    input.setAttribute("aria-controls", results.id);
    var none = make("p", P + "noResults", box, str(root, "no-results", "No matching pages"));
    none.hidden = true;
    var foot = make("div", P + "dialogFoot", box);
    foot.setAttribute("aria-hidden", "true");
    var hint = str(root, "hint", "to move,to open").split(",");
    make("kbd", P + "footKey", foot, "↑↓");
    make("span", P + "footGap", foot, hint[0] || "");
    make("kbd", P + "footKey", foot, "Enter");
    make("span", null, foot, hint[1] || "");
    var status = make("span", P + "srOnly", box);
    status.setAttribute("role", "status");
    dlg._amc = { input: input, results: results, none: none, status: status, root: root, active: -1, options: [] };
    root._amcDialog = dlg;
    return dlg;
  }

  function score(item, tokens) {
    var label = item.label.toLocaleLowerCase(), hay = label + " " + item.path.toLocaleLowerCase();
    for (var i = 0; i < tokens.length; i++) if (hay.indexOf(tokens[i]) === -1) return -1;
    var q = tokens[0];
    if (label.indexOf(q) === 0) return 0;
    if (new RegExp("(^|[\\s/\\-_(])" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(label)) return 1;
    if (label.indexOf(q) !== -1) return 2;
    return 3;
  }
  function highlight(el, text, tokens) {
    var lower = text.toLocaleLowerCase(), at = -1, len = 0;
    for (var i = 0; i < tokens.length && at === -1; i++) { at = lower.indexOf(tokens[i]); len = tokens[i].length; }
    if (at === -1 || !len) { el.textContent = text; return; }
    el.appendChild(d.createTextNode(text.slice(0, at)));
    make("mark", P + "mark", el, text.slice(at, at + len));
    el.appendChild(d.createTextNode(text.slice(at + len)));
  }
  function renderResults(dlg) {
    var s = dlg._amc, root = s.root, q = trim(s.input.value).toLocaleLowerCase();
    var tokens = q ? q.split(" ") : [];
    var src = s.source.items, groups = [];
    if (!tokens.length) {
      var recent = (load(root, "recent") || []).filter(function (r) { return r && r.href && r.label; });
      if (recent.length) groups.push({ label: str(root, "recent", "Recent"), items: recent.map(function (r) { return { label: r.label, href: r.href, path: r.path || "", icon: r.icon || "" }; }), recent: true });
      groups.push({ label: str(root, "pages", "Pages"), items: src.slice(0, MAX_RESULTS) });
    } else {
      var ranked = [];
      for (var i = 0; i < src.length; i++) { var sc = score(src[i], tokens); if (sc >= 0) ranked.push({ it: src[i], sc: sc, i: i }); }
      ranked.sort(function (a, b) { return a.sc - b.sc || a.i - b.i; });
      groups.push({ label: str(root, "pages", "Pages"), items: ranked.slice(0, MAX_RESULTS).map(function (r) { return r.it; }) });
    }
    var res = s.results;
    while (res.firstChild) res.removeChild(res.firstChild);
    s.options = [];
    var total = 0;
    for (var g = 0; g < groups.length; g++) {
      if (!groups[g].items.length) continue;
      var grp = make("div", P + "group", res);
      grp.setAttribute("role", "group");
      var head = make("div", P + "groupLabel" + (groups[g].recent ? " " + P + "groupHead" : ""), grp);
      var hl = make("span", null, head, groups[g].label);
      hl.id = uid(root, "grp");
      grp.setAttribute("aria-labelledby", hl.id);
      if (groups[g].recent) {
        var clr = make("button", P + "clearRecent", head, str(root, "clear-recent", "Clear"));
        clr.type = "button";
        clr.tabIndex = -1;
      }
      for (var j = 0; j < groups[g].items.length; j++) {
        var it = groups[g].items[j];
        var a = make("a", P + "option", grp);
        a.href = it.href;
        a.id = uid(root, "opt");
        a.setAttribute("role", "option");
        a.setAttribute("aria-selected", "false");
        a.tabIndex = -1;
        a._amcItem = it;
        make("span", P + "optionIcon fa " + (it.icon || "fa-file-o"), a).setAttribute("aria-hidden", "true");
        var tx = make("span", P + "optionText", a);
        highlight(make("span", P + "optionLabel", tx), it.label, tokens);
        make("span", P + "optionPath", tx, it.path || "");
        make("span", P + "enter", a, "↵").setAttribute("aria-hidden", "true");
        s.options.push(a);
        total++;
      }
    }
    s.none.hidden = total > 0;
    s.input.setAttribute("aria-expanded", total > 0 ? "true" : "false");
    setActive(dlg, total ? 0 : -1);
    s.status.textContent = tokens.length ? (total ? total + " " + str(root, "results", "results") : str(root, "no-results", "No matching pages")) : "";
  }
  function setActive(dlg, i) {
    var s = dlg._amc;
    if (s.active >= 0 && s.options[s.active]) { s.options[s.active].classList.remove("is-active"); s.options[s.active].setAttribute("aria-selected", "false"); }
    s.active = i;
    var o = s.options[i];
    if (o) {
      o.classList.add("is-active");
      o.setAttribute("aria-selected", "true");
      s.input.setAttribute("aria-activedescendant", o.id);
      if (o.scrollIntoView) o.scrollIntoView({ block: "nearest" });
    } else {
      s.input.removeAttribute("aria-activedescendant");
    }
  }
  function remember(dlg, opt) {
    var s = dlg._amc, it = opt._amcItem;
    var list = (load(s.root, "recent") || []).filter(function (r) { return r && r.href !== it.href; });
    list.unshift({ label: it.label, href: it.href, path: it.path || "", icon: it.icon || "" });
    save(s.root, "recent", list.slice(0, MAX_RECENT));
  }
  function choose(dlg, opt) {
    remember(dlg, opt);
    var it = opt._amcItem, target = it.el && d.body.contains(it.el) ? it.el : null;
    closeSearch(dlg, false);
    if (target && /^javascript:/i.test(it.href)) { target.click(); return; }
    if (w.apex && w.apex.navigation && typeof w.apex.navigation.redirect === "function") w.apex.navigation.redirect(it.href);
    else w.location.href = it.href;
  }

  function dispatchSearch(root) {
    var ev, detail = { source: OWNER, listId: root.id || null };
    try { ev = new w.CustomEvent(EVT, { bubbles: false, cancelable: true, detail: detail }); }
    catch (e) { ev = d.createEvent("CustomEvent"); ev.initCustomEvent(EVT, false, true, detail); }
    return d.dispatchEvent(ev); // false: a listener took over
  }
  // A Command Rail that handles Ctrl/Cmd+K itself but does not listen for the event: hand the
  // search to it with a synthetic shortcut (ignored by our own key handler).
  var synthetic = false;
  function viaRailShortcut() {
    if (!d.querySelector(".amc-TCommandRail")) return false;
    var ev;
    try { ev = new w.KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true }); } catch (e) { return false; }
    synthetic = true;
    try { d.dispatchEvent(ev); } finally { synthetic = false; }
    return ev.defaultPrevented;
  }
  function openSearch(root, opener) {
    if (!dispatchSearch(root) || viaRailShortcut()) return false;
    if (openItem) close(openItem, false);
    var dlg = buildDialog(root), s = dlg._amc;
    if (dlg.open) { s.input.focus(); s.input.select(); return true; }
    s.opener = opener || d.activeElement;
    s.source = collect(root);
    s.input.value = "";
    renderResults(dlg);
    if (typeof dlg.showModal === "function") dlg.showModal(); else { dlg.setAttribute("open", ""); dlg._amcFallback = true; }
    s.input.focus();
    return true;
  }
  function closeSearch(dlg, refocus) {
    var s = dlg._amc;
    if (dlg.open) { if (typeof dlg.close === "function" && !dlg._amcFallback) dlg.close(); else dlg.removeAttribute("open"); }
    if (refocus !== false && s.opener && s.opener.focus && d.body.contains(s.opener)) s.opener.focus();
  }
  function searchRoot() {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) { init(roots[i]); if (roots[i].querySelector("." + P + "searchBtn")) return roots[i]; }
    return null;
  }

  // ------------------------------------------------------------ events
  d.addEventListener("click", function (e) {
    var t = e.target;
    var dlg = closest(t, P + "dialog");
    if (dlg) {
      if (t === dlg) { closeSearch(dlg); return; } // backdrop
      var clr = closest(t, P + "clearRecent");
      if (clr) { save(dlg._amc.root, "recent", []); renderResults(dlg); dlg._amc.input.focus(); return; }
      var opt = closest(t, P + "option");
      if (opt && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) { e.preventDefault(); choose(dlg, opt); }
      else if (opt) remember(dlg, opt);
      return;
    }
    var root = closest(t, ROOT);
    if (root) init(root);
    var mark = closest(t, P + "markRead");
    if (mark) {
      if (mark.getAttribute("aria-disabled") !== "true") markAllRead(root, closest(mark, P + "item"));
      return;
    }
    var trig = closest(t, P + "trigger") || closest(t, P + "searchBtn");
    if (trig && root) {
      var item = closest(trig, P + "item");
      if (item._amcRole === "search") { openSearch(root, trig); return; }
      if (item.classList.contains("is-open")) close(item, false); else open(item, e.detail === 0 ? "first" : null);
      return;
    }
    if (openItem && !openItem.contains(t)) close(openItem, false);
    else if (openItem && closest(t, P + "entryLink")) close(openItem, false);
  });

  d.addEventListener("input", function (e) {
    var dlg = closest(e.target, P + "dialog");
    if (dlg && e.target.classList.contains(P + "input")) renderResults(dlg);
  });

  d.addEventListener("cancel", function (e) {
    var dlg = e.target;
    if (dlg && dlg.classList && dlg.classList.contains(P + "dialog")) { e.preventDefault(); closeSearch(dlg); }
  }, true);

  function tops(root) {
    return topItems(root).concat(root._amcMore && root._amcMore.classList.contains("is-needed") ? [root._amcMore] : [])
      .filter(function (it) { return !it.classList.contains("is-overflow"); })
      .map(triggerOf).filter(function (x) { return x; });
  }

  d.addEventListener("keydown", function (e) {
    var key = e.key, t = e.target;
    // Ctrl/Cmd+K: open search, unless someone else owns or already handled it.
    if ((key === "k" || key === "K") && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
      if (synthetic || e.defaultPrevented || (w.amcCommandK && w.amcCommandK !== OWNER)) return;
      var sr = searchRoot();
      if (!sr) return;
      e.preventDefault();
      openSearch(sr, d.activeElement);
      return;
    }
    var dlg = closest(t, P + "dialog");
    if (dlg) {
      var s = dlg._amc;
      if (key === "Escape" || key === "Esc") { e.preventDefault(); closeSearch(dlg); return; }
      if (key === "Tab" && dlg._amcFallback) { e.preventDefault(); s.input.focus(); return; }
      if (t !== s.input) return;
      if (key === "ArrowDown" || key === "ArrowUp") {
        e.preventDefault();
        if (!s.options.length) return;
        var n = s.active + (key === "ArrowDown" ? 1 : -1);
        setActive(dlg, (n + s.options.length) % s.options.length);
      } else if (key === "Enter" && s.options[s.active]) {
        e.preventDefault();
        choose(dlg, s.options[s.active]);
      }
      return;
    }
    var root = closest(t, ROOT);
    if (!root) return;
    init(root);
    var item = closest(t, P + "item");
    if (!item) return;
    var isTrigger = t.classList.contains(P + "link");
    if (key === "Escape" || key === "Esc") {
      if (item.classList.contains("is-open")) { e.preventDefault(); close(item, true); }
      return;
    }
    if (isTrigger) {
      if ((key === "ArrowDown" || key === "ArrowUp") && item._amcPanel) {
        e.preventDefault();
        open(item, key === "ArrowDown" ? "first" : "last");
        return;
      }
      if (key === "ArrowRight" || key === "ArrowLeft") {
        var list = tops(root), idx = list.indexOf(t);
        if (idx < 0) return;
        var rtl = w.getComputedStyle(root).direction === "rtl";
        var step = (key === "ArrowRight") !== rtl ? 1 : -1;
        e.preventDefault();
        if (openItem) close(openItem, false);
        list[(idx + step + list.length) % list.length].focus();
      }
      return;
    }
    if (!t.classList.contains(P + "entryLink") || !item.classList.contains("is-open")) return;
    var entries = entriesOf(item), at = entries.indexOf(t), next = null;
    if (at < 0) return;
    if (key === "ArrowDown") next = entries[(at + 1) % entries.length];
    else if (key === "ArrowUp") next = entries[(at - 1 + entries.length) % entries.length];
    else if (key === "Home") next = entries[0];
    else if (key === "End") next = entries[entries.length - 1];
    else if (key === " " || key === "Spacebar") { if (t.getAttribute("role") === "menuitem") { e.preventDefault(); t.click(); } return; }
    if (next) { e.preventDefault(); rove(item, next); }
  });

  d.addEventListener("focusout", function (e) {
    if (!openItem) return;
    var to = e.relatedTarget;
    if (to && !openItem.contains(to)) close(openItem, false);
  });

  w.addEventListener("resize", function () { scheduleLayout(); });

  // ------------------------------------------------------------ refresh and startup
  if (w.apex && w.apex.jQuery) w.apex.jQuery(d).on("apexafterrefresh", initAll);
  function observe() {
    if (!w.MutationObserver || !d.body) return;
    var pending = false;
    new w.MutationObserver(function (records) {
      if (pending) return;
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType === 1 && ((n.classList && n.classList.contains(ROOT)) || (n.querySelector && n.querySelector("." + ROOT + ":not(.is-js)")))) {
            pending = true;
            setTimeout(function () { pending = false; initAll(); }, 0);
            return;
          }
        }
      }
    }).observe(d.body, { childList: true, subtree: true });
  }
  function start() { initAll(); observe(); }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start); else start();

  w.amcTplSmartNavBar = {
    init: initAll,
    layout: function () { scheduleLayout(); },
    close: function () { if (openItem) close(openItem, false); },
    openSearch: function (el) {
      var root = typeof el === "string" ? d.getElementById(el) : el && closest(el, ROOT);
      root = root || searchRoot();
      return root ? openSearch(root, d.activeElement) : false;
    },
    setCount: function (el, n) {
      var root = typeof el === "string" ? d.getElementById(el) : el && closest(el, ROOT);
      if (!root) return;
      init(root);
      var items = topItems(root);
      for (var i = 0; i < items.length; i++) {
        if (items[i]._amcRole !== "notifications") continue;
        items[i].setAttribute("data-badge", String(Math.max(0, parseInt(n, 10) || 0)));
        applyNotifications(root, items[i], true);
      }
    },
    event: EVT
  };
})(window, document);
