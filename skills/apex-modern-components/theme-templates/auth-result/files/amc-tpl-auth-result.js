/* Auth Result: region template script.
   1. Live region role: the message wrapper is role="status" in the markup (polite, right for
      success, email sent, verified and signed out). For the Link expired, Something went wrong and
      Access denied outcomes (amc-TAuthResult--expired / --error / --denied) it becomes
      role="alert". Without JavaScript it stays role="status"; the kicker and heading text carry
      the state either way.
   2. Countdown redirect (amc-TAuthResult--countdown): after data-amc-seconds seconds (Custom
      Attributes of the region, default 5, 1 to 3600) it activates the first link or button in the
      region body, or else the primary (hot) button of the region, or else its first button. A
      progress ring and "Continuing in 5..." show the time left. It pauses while the pointer is
      over the card, while focus is inside it and while the tab is hidden, and a visible "Stay on
      this page" button (or Escape) cancels it. The cancel button is always shown, also under
      reduced motion, where only the ring's smoothing transition is removed.
   English strings come from data-amc-text-* attributes on the region (see the template
   helpText); %0 is replaced by the number of seconds.
   ES5, one timer per running countdown, delegated listeners on document, textContent only. */
(function (w, d) {
  "use strict";
  if (w.amcTplAuthResult) return;
  var ROOT = "amc-TAuthResult", P = ROOT + "-", ALERT = ["expired", "error", "denied"],
    OUTCOMES = ["denied", "error", "expired", "signedOut", "verified", "email"], TICK = 100;

  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList && el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function has(root, opt) { return root.classList.contains(ROOT + "--" + opt); }
  function text(root, key, fallback, n) {
    var s = root.getAttribute("data-amc-text-" + key) || fallback;
    return n === undefined ? s : s.replace(/%0/g, String(n));
  }
  function part(root, name) {
    var all = root.getElementsByClassName(P + name);
    for (var i = 0; i < all.length; i++) if (closest(all[i].parentNode, ROOT) === root) return all[i];
    return null;
  }
  function outcome(root) {
    for (var i = 0; i < OUTCOMES.length; i++) if (has(root, OUTCOMES[i])) return OUTCOMES[i];
    return "success";
  }
  function reduced() {
    return !!(w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  // ------------------------------------------------------------------ countdown
  function usable(el) {
    if (!el || el.disabled || el.getAttribute("aria-disabled") === "true" || el.hidden) return false;
    if (closest(el, P + "countdown")) return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }
  function findTarget(root) {
    var body = part(root, "body"), actions = part(root, "actions"), list, i;
    if (body) {
      list = body.querySelectorAll("a[href], button, input[type='submit'], input[type='button']");
      for (i = 0; i < list.length; i++) if (usable(list[i])) return list[i];
    }
    if (actions) {
      list = actions.querySelectorAll(".t-Button--hot, [data-amc-primary]");
      for (i = 0; i < list.length; i++) if (usable(list[i])) return list[i];
      list = actions.querySelectorAll("a[href], button");
      for (i = 0; i < list.length; i++) if (usable(list[i])) return list[i];
    }
    return null;
  }
  function seconds(root) {
    var n = parseInt(root.getAttribute("data-amc-seconds"), 10);
    if (!(n > 0)) n = 5;
    return Math.min(3600, n);
  }
  function render(root, s) {
    var left = Math.max(0, Math.ceil((s.total - s.elapsed) / 1000));
    s.count.textContent = String(left);
    s.label.textContent = s.paused ? text(root, "paused", "Paused") : text(root, "continuing", "Continuing in %0\u2026", left);
    root.style.setProperty("--amc-tar-p", String(Math.max(0, 1 - s.elapsed / s.total)));
  }
  function stop(s) { if (s.timer) { w.clearInterval(s.timer); s.timer = null; } }
  function isPaused(root, s) {
    var a = d.activeElement;
    s.focus = !!(a && a !== d.body && s.card && s.card.contains(a) && a !== s.label);
    return s.hover || s.focus || d.hidden;
  }
  function tick(root) {
    var s = root._amcTAR;
    if (!s || s.state !== "running") return;
    if (!d.documentElement.contains(root)) { stop(s); s.state = "gone"; return; }
    var now = Date.now(), dt = Math.max(0, Math.min(1000, now - s.last)), paused = isPaused(root, s);
    s.last = now;
    if (!paused) s.elapsed += dt;
    if (paused !== s.paused) {
      s.paused = paused;
      root.classList.toggle("is-paused", paused);
      if (paused) s.live.textContent = text(root, "paused", "Paused");
    }
    if (s.elapsed >= s.total) {
      s.elapsed = s.total;
      render(root, s);
      stop(s);
      s.state = "done";
      root.classList.add("is-done");
      var target = findTarget(root);
      if (target) target.click();
      return;
    }
    render(root, s);
  }
  function startCountdown(root) {
    var box = part(root, "countdown"), s = root._amcTAR;
    if (!box || !has(root, "countdown") || !findTarget(root)) return;
    s.box = box;
    s.card = part(root, "card") || root;
    s.count = part(root, "count");
    s.label = part(root, "countText");
    s.cancel = part(root, "cancel");
    s.live = part(root, "live");
    if (!s.count || !s.label || !s.cancel || !s.live) return;
    s.total = seconds(root) * 1000;
    s.elapsed = 0;
    s.last = Date.now();
    s.paused = false;
    s.state = "running";
    s.cancel.textContent = text(root, "cancel", "Stay on this page");
    root.classList.add("is-counting");
    box.hidden = false;
    render(root, s);
    s.live.textContent = text(root, "announce", "You will continue automatically in %0 seconds.", s.total / 1000);
    s.timer = w.setInterval(function () { tick(root); }, TICK);
  }
  function cancel(root, moveFocus) {
    var s = root._amcTAR;
    if (!s || s.state !== "running") return;
    stop(s);
    s.state = "cancelled";
    root.classList.remove("is-counting", "is-paused");
    root.classList.add("is-cancelled");
    s.label.textContent = text(root, "cancelled", "Automatic redirect cancelled.");
    s.live.textContent = "";
    if (moveFocus) { try { s.label.focus(); } catch (e) { /* ignore */ } }
  }

  // ------------------------------------------------------------------ init
  function init(root) {
    if (root._amcTAR) return;
    root._amcTAR = { state: "idle", hover: false, focus: false };
    var o = outcome(root), announce = part(root, "announce");
    root.setAttribute("data-amc-outcome", o);
    if (announce) announce.setAttribute("role", ALERT.indexOf(o) >= 0 ? "alert" : "status");
    startCountdown(root);
  }
  function scan(scope) {
    var el = scope && scope.nodeType === 1 ? scope : d, list = el.getElementsByClassName ? el.getElementsByClassName(ROOT) : [];
    if (el.classList && el.classList.contains(ROOT)) init(el);
    for (var i = 0; i < list.length; i++) init(list[i]);
  }

  // Delegated listeners: they keep working for regions added or refreshed later.
  d.addEventListener("click", function (e) {
    var btn = closest(e.target, P + "cancel"), root = btn && closest(btn, ROOT);
    if (root) { e.preventDefault(); cancel(root, true); }
  });
  d.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || (e.key !== "Escape" && e.key !== "Esc")) return;
    var list = d.getElementsByClassName(ROOT);
    for (var i = 0; i < list.length; i++) if (list[i]._amcTAR && list[i]._amcTAR.state === "running") cancel(list[i], true);
  });
  function hover(e, on) {
    var root = closest(e.target, ROOT), s = root && root._amcTAR;
    if (!s || !s.card) return;
    var inside = function (n) { return !!(n && s.card.contains(n)); };
    if (on && inside(e.target)) s.hover = true;
    if (!on && inside(e.target) && !inside(e.relatedTarget)) s.hover = false;
  }
  d.addEventListener("mouseover", function (e) { hover(e, true); });
  d.addEventListener("mouseout", function (e) { hover(e, false); });
  d.addEventListener("visibilitychange", function () {
    var list = d.getElementsByClassName(ROOT);
    for (var i = 0; i < list.length; i++) if (list[i]._amcTAR && list[i]._amcTAR.state === "running") list[i]._amcTAR.last = Date.now();
  });

  function boot() {
    scan(d);
    if (w.apex && w.apex.jQuery) {
      w.apex.jQuery(d).on("apexafterrefresh", function (e) { scan(e && e.target); });
    }
    if (w.MutationObserver && d.body) {
      var queued = false;
      new MutationObserver(function (records) {
        if (queued) return;
        // Only added elements matter; the countdown's own text updates add text nodes only.
        for (var i = 0; i < records.length; i++) {
          var added = records[i].addedNodes || [];
          for (var j = 0; j < added.length; j++) {
            if (added[j].nodeType !== 1) continue;
            queued = true;
            w.setTimeout(function () { queued = false; scan(d); }, 0);
            return;
          }
        }
      }).observe(d.body, { childList: true, subtree: true });
    }
  }

  w.amcTplAuthResult = { init: scan, cancel: function (el) { var r = closest(el, ROOT) || (el && el.nodeType === 1 && el.querySelector("." + ROOT)); if (r) cancel(r, false); }, reducedMotion: reduced };
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})(window, document);
