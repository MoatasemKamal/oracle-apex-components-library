/* APEX Modern Components - Auth Card region template runtime.
 * Field behaviour is opt-in by the item's CSS class (Page Item > Advanced > CSS Classes) and is
 * scoped to .amc-TAuthCard regions:
 *   amc-auth-password  show/hide toggle (aria-pressed) and a Caps Lock warning (aria-live)
 *   amc-auth-strength  live strength meter; informative only, the server validates the policy
 *   amc-auth-match     match state against the previous amc-auth-password item in the region
 *   amc-auth-otp       the one real text item shown as N boxes; the real item always holds the code
 *   amc-auth-resend    (button) disabled with a live countdown, then enabled
 * Plus: primary button loading state on submit (never prevents it), a single shake and focus on
 * the first invalid item when the page shows APEX errors, the grid-spotlight pointer and moving
 * an .amc-auth-brand sub region into the Split look's brand panel.
 * UI strings come from data-amc-* attributes on the region (translate them in the template).
 * ES5, delegated listeners on document, textContent only, every APEX API guarded, re-init on
 * apexafterrefresh with a MutationObserver fallback. Security stays server-side: nothing here
 * validates, limits or stores anything. */
(function () {
  "use strict";
  if (window.amcTplAuthCard || !document.querySelectorAll || !document.addEventListener) {
    return;
  }

  var ROOT = "amc-TAuthCard";
  var P = ROOT + "-";
  var FIELD_MSG = "." + P + "caps, ." + P + "meter, ." + P + "status";
  var OWN = "." + P + "resend, ." + P + "meter, ." + P + "status, ." + P + "caps, ." + P + "otp, ." + P + "srOnly, ." + P + "primary";
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; };
  var reduce = mq("(prefers-reduced-motion: reduce)");
  var hover = mq("(hover: hover)");
  var uid = 0;
  var timers = {};
  var lastPrimary = null;
  var lastPrimaryAt = 0;

  // ------------------------------------------------------------ helpers
  function matches(el, sel) {
    var f = el && el.nodeType === 1 && (el.matches || el.msMatchesSelector || el.webkitMatchesSelector);
    return f ? f.call(el, sel) : false;
  }
  function closest(el, sel) {
    while (el && el.nodeType === 1) {
      if (matches(el, sel)) { return el; }
      el = el.parentNode;
    }
    return null;
  }
  function rootOf(el) { return closest(el, "." + ROOT); }
  function each(list, fn) { for (var i = 0; i < list.length; i++) { fn(list[i], i); } }
  function str(root, key, fallback) {
    var v = root ? root.getAttribute("data-amc-" + key) : null;
    return v ? v : fallback;
  }
  function fmt(t, a, b) { return String(t).replace("%0", a).replace("%1", b === undefined ? "" : b); }
  function make(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) { el.className = cls; }
    if (text) { el.textContent = text; }
    return el;
  }
  function ensureId(el, prefix) {
    if (!el.id) { el.id = "amc-ta-" + prefix + "-" + (++uid); }
    return el.id;
  }
  function addDescribedBy(el, id) {
    var cur = (el.getAttribute("aria-describedby") || "").split(/\s+/);
    if (cur.indexOf(id) < 0) { el.setAttribute("aria-describedby", (cur.join(" ") + " " + id).replace(/^\s+/, "")); }
  }
  function fire(el, type) {
    var ev;
    try { ev = new Event(type, { bubbles: true }); } catch (e) { ev = document.createEvent("Event"); ev.initEvent(type, true, false); }
    el.dispatchEvent(ev);
  }
  function inputOf(el) {
    if (!el) { return null; }
    if (/^(INPUT|TEXTAREA)$/.test(el.tagName)) { return el; }
    return el.querySelector("input");
  }
  function byClass(root, cls) {
    var out = [];
    each(root.querySelectorAll("." + cls), function (el) {
      var inp = inputOf(el);
      if (inp && out.indexOf(inp) < 0) { out.push(inp); }
    });
    return out;
  }
  function isOwnBox(el) { return el && el.classList && el.classList.contains(P + "otpBox"); }

  // The element that holds only the input (UT: t-Form-itemWrapper). Creates one when the input
  // shares its parent with a label, so the toggle button can sit inside the field.
  function wrapOf(input, create) {
    var parent = input.parentNode;
    if (!parent) { return null; }
    if (parent.classList.contains(P + "fieldWrap") || parent.classList.contains("t-Form-itemWrapper")) { return parent; }
    var others = 0;
    each(parent.children, function (c) { if (c !== input && !matches(c, "." + P + "reveal")) { others++; } });
    if (!others && !matches(parent, "." + ROOT + "-body, label")) { return parent; }
    if (!create) { return null; }
    var wrap = make("span", P + "fieldWrap");
    wrap.style.display = "block";
    parent.insertBefore(wrap, input);
    wrap.appendChild(input);
    return wrap;
  }
  function insertAfterField(input, node) {
    var anchor = wrapOf(input, false) || input;
    while (anchor.nextElementSibling && matches(anchor.nextElementSibling, FIELD_MSG)) { anchor = anchor.nextElementSibling; }
    anchor.parentNode.insertBefore(node, anchor.nextSibling);
  }
  function labelFor(input) {
    var labels = document.getElementsByTagName("label");
    for (var i = 0; i < labels.length; i++) { if (input.id && labels[i].htmlFor === input.id) { return labels[i]; } }
    return closest(input, "label");
  }

  // ------------------------------------------------------------ field emphasis
  function markFields(root) {
    each(root.querySelectorAll("." + P + "body input, ." + P + "body select, ." + P + "body textarea"), function (inp) {
      if (inp.getAttribute("data-amc-ta-field") || isOwnBox(inp) || /^(hidden|checkbox|radio|submit|button)$/i.test(inp.type)) { return; }
      inp.setAttribute("data-amc-ta-field", "1");
      var box = closest(inp, ".t-Form-fieldContainer") || closest(inp, ".apex-item-wrapper");
      if (box) { box.classList.add(P + "field"); }
      if (inp.classList.contains("amc-auth-otp")) { return; }
      var wrap = wrapOf(inp, false);
      if (wrap && wrap !== box) { wrap.classList.add(P + "fieldWrap"); }
    });
  }

  // ------------------------------------------------------------ password toggle + Caps Lock
  function setupPassword(root, input) {
    if (input.getAttribute("data-amc-ta-pw")) { return; }
    input.setAttribute("data-amc-ta-pw", "1");
    var id = ensureId(input, "pw");
    var wrap = wrapOf(input, true);
    wrap.classList.add(P + "fieldWrap", P + "fieldWrap--reveal");
    var btn = make("button", P + "reveal");
    btn.type = "button";
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-label", str(root, "show", "Show password"));
    btn.setAttribute("aria-controls", id);
    btn.title = str(root, "show", "Show password");
    var icon = make("span", "fa fa-eye");
    icon.setAttribute("aria-hidden", "true");
    btn.appendChild(icon);
    wrap.appendChild(btn);
    var caps = make("span", P + "caps");
    caps.id = id + "_amc_caps";
    caps.setAttribute("role", "status");
    caps.setAttribute("aria-live", "polite");
    insertAfterField(input, caps);
    addDescribedBy(input, caps.id);
  }
  function setReveal(btn, show, refocus) {
    var input = document.getElementById(btn.getAttribute("aria-controls"));
    var root = rootOf(btn);
    if (!input) { return; }
    var s = null;
    var e = null;
    try { s = input.selectionStart; e = input.selectionEnd; } catch (x) { /* type=password in old engines */ }
    input.type = show ? "text" : "password";
    btn.setAttribute("aria-pressed", show ? "true" : "false");
    btn.title = show ? str(root, "hide", "Hide password") : str(root, "show", "Show password");
    btn.firstChild.className = "fa " + (show ? "fa-eye-slash" : "fa-eye");
    if (refocus) {
      input.focus();
      // Changing the type resets the caret after the click completes; restore it then.
      var restore = function () {
        try { if (s !== null && document.activeElement === input) { input.setSelectionRange(s, e); } } catch (x) { /* ignore */ }
      };
      restore();
      setTimeout(restore, 0);
    }
  }
  function capsUpdate(ev) {
    var input = ev.target;
    if (!input.getAttribute || !input.getAttribute("data-amc-ta-pw") || !ev.getModifierState) { return; }
    var caps = document.getElementById(input.id + "_amc_caps");
    if (!caps) { return; }
    var on = ev.getModifierState("CapsLock");
    var text = on ? str(rootOf(input), "caps", "Caps Lock is on") : "";
    if (caps.textContent !== text) { caps.textContent = text; }
  }

  // ------------------------------------------------------------ strength
  var COMMON = ["password", "passw0rd", "123456", "12345678", "123456789", "1234567890", "qwerty", "qwertyuiop", "letmein",
    "welcome", "admin", "administrator", "iloveyou", "monkey", "dragon", "football", "baseball", "sunshine", "princess",
    "master", "login", "abc123", "111111", "000000", "trustno1", "shadow", "secret", "oracle", "changeme", "summer",
    "winter", "spring", "autumn", "hello", "freedom", "whatever", "superman", "batman", "starwars", "test", "guest", "root",
    "apex", "default", "access", "computer", "michael", "jordan", "football", "pass"];
  var ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890", "qazwsx", "1qaz2wsx"];
  function leet(s) {
    return s.replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s")
      .replace(/7/g, "t").replace(/@/g, "a").replace(/\$/g, "s").replace(/!/g, "i");
  }
  function hasSequence(s) {
    for (var i = 0; i + 2 < s.length; i++) {
      var a = s.charCodeAt(i);
      var b = s.charCodeAt(i + 1);
      var c = s.charCodeAt(i + 2);
      if (/[a-z0-9]/.test(s.charAt(i)) && b - a === c - b && Math.abs(b - a) === 1) { return true; }
    }
    return false;
  }
  function hasKeyboardRun(s) {
    for (var r = 0; r < ROWS.length; r++) {
      for (var i = 0; i + 4 <= ROWS[r].length; i++) {
        if (s.indexOf(ROWS[r].substr(i, 4)) > -1) { return true; }
      }
    }
    return false;
  }
  // 0 = empty, 1 Weak, 2 Fair, 3 Good, 4 Strong. Informative only.
  function strength(pw, hint) {
    if (!pw) { return 0; }
    var len = pw.length;
    var s = 0;
    if (len >= 8) { s++; }
    if (len >= 12) { s++; }
    if (len >= 16) { s++; }
    if (len >= 20) { s++; }
    var k = (/[a-z]/.test(pw) ? 1 : 0) + (/[A-Z]/.test(pw) ? 1 : 0) + (/[0-9]/.test(pw) ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);
    if (k >= 3) { s++; }
    if (k === 4) { s++; }
    var low = pw.toLowerCase();
    if (/(.)\1\1/.test(pw)) { s--; }
    if (hasSequence(low)) { s--; }
    if (hasKeyboardRun(low)) { s--; }
    if (len < 16 && /(19|20)\d\d/.test(pw)) { s--; }
    var norm = leet(low);
    var core = norm.replace(/^[^a-z]+|[^a-z]+$/g, "");
    for (var i = 0; i < COMMON.length; i++) {
      var w = COMMON[i];
      if (core === w || low === w || (len < 12 && w.length >= 4 && (norm.indexOf(w) > -1 || low.indexOf(w) > -1))) { s = Math.min(s, 1); }
    }
    if (hint && hint.length >= 3 && low.indexOf(hint) > -1) { s = Math.min(s, 1); }
    if (len < 8) { s = Math.min(s, 1); }
    return s <= 1 ? 1 : Math.min(4, s);
  }
  function hintFor(root, input) {
    var hint = "";
    each(root.querySelectorAll("." + P + "body input"), function (inp) {
      if (hint || inp === input || isOwnBox(inp) || inp.getAttribute("data-amc-ta-pw") || !/^(text|email)$/i.test(inp.type)) { return; }
      var v = (inp.value || "").toLowerCase().split("@")[0];
      if (v.length >= 3) { hint = v; }
    });
    return hint;
  }
  function setupStrength(root, input) {
    if (input.getAttribute("data-amc-ta-meter")) { return; }
    input.setAttribute("data-amc-ta-meter", "1");
    var id = ensureId(input, "pw");
    var meter = make("div", P + "meter");
    meter.id = id + "_amc_meter";
    var bar = make("span", P + "meterBar");
    bar.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 4; i++) { bar.appendChild(make("span", P + "meterSeg")); }
    var label = make("span", P + "meterLabel");
    label.setAttribute("aria-hidden", "true");
    var live = make("span", P + "srOnly");
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    meter.appendChild(bar);
    meter.appendChild(label);
    meter.appendChild(live);
    insertAfterField(input, meter);
    updateStrength(input, true);
  }
  var LEVELS = ["", "weak", "fair", "good", "strong"];
  function updateStrength(input, silent) {
    var meter = document.getElementById(input.id + "_amc_meter");
    if (!meter) { return; }
    var root = rootOf(input);
    var level = strength(input.value || "", hintFor(root, input));
    var name = LEVELS[level];
    if (meter.getAttribute("data-level") === String(level)) { return; }
    meter.setAttribute("data-level", String(level));
    each(LEVELS, function (n) { if (n) { meter.classList.remove("is-" + n); } });
    if (name) { meter.classList.add("is-" + name); }
    var text = name ? str(root, name, name.charAt(0).toUpperCase() + name.slice(1)) : "";
    meter.children[1].textContent = text;
    var live = meter.children[2];
    if (timers[meter.id]) { clearTimeout(timers[meter.id]); }
    if (silent) { return; }
    timers[meter.id] = setTimeout(function () {
      live.textContent = text ? fmt(str(root, "strength", "Password strength: %0"), text) : "";
    }, 450);
  }

  // ------------------------------------------------------------ match
  function setupMatch(root, input) {
    if (input.getAttribute("data-amc-ta-against")) { return; }
    var prev = null;
    each(byClass(root, "amc-auth-password"), function (pw) {
      if (pw !== input && (pw.compareDocumentPosition(input) & 4)) { prev = pw; }
    });
    if (!prev) { return; }
    input.setAttribute("data-amc-ta-against", ensureId(prev, "pw"));
    var id = ensureId(input, "pw");
    var status = make("span", P + "status");
    status.id = id + "_amc_match";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    insertAfterField(input, status);
    addDescribedBy(input, status.id);
    updateMatch(input);
  }
  function updateMatch(m) {
    var status = document.getElementById(m.id + "_amc_match");
    var pw = document.getElementById(m.getAttribute("data-amc-ta-against"));
    if (!status || !pw) { return; }
    var root = rootOf(m);
    var a = pw.value || "";
    var b = m.value || "";
    var state = "";
    if (b) {
      if (a === b) { state = "ok"; } else if (!(document.activeElement === m && a.indexOf(b) === 0)) { state = "bad"; }
    }
    var text = state === "ok" ? str(root, "match", "Passwords match") : state === "bad" ? str(root, "mismatch", "Passwords do not match") : "";
    status.classList.toggle("is-ok", state === "ok");
    status.classList.toggle("is-bad", state === "bad");
    if (status.textContent !== text) { status.textContent = text; }
  }
  function matchesOf(pw) {
    return pw.id ? document.querySelectorAll("[data-amc-ta-against=\"" + pw.id.replace(/["\\]/g, "") + "\"]") : [];
  }

  // ------------------------------------------------------------ OTP boxes
  function setupOtp(root, real) {
    if (real.getAttribute("data-amc-ta-otp")) { return; }
    real.setAttribute("data-amc-ta-otp", "1");
    var id = ensureId(real, "otp");
    var n = parseInt(real.getAttribute("data-amc-length"), 10);
    if (!(n >= 3 && n <= 12)) { n = real.maxLength >= 3 && real.maxLength <= 12 ? real.maxLength : 6; }
    var group = make("div", P + "otp");
    group.id = id + "_amc_otp";
    group.setAttribute("role", "group");
    group.setAttribute("dir", "ltr");
    group.setAttribute("data-amc-for", id);
    var label = labelFor(real);
    if (label) { group.setAttribute("aria-labelledby", ensureId(label, "lbl")); } else { group.setAttribute("aria-label", real.getAttribute("aria-label") || real.name || "Code"); }
    var desc = real.getAttribute("aria-describedby");
    if (desc) { group.setAttribute("aria-describedby", desc); }
    for (var i = 0; i < n; i++) {
      var box = make("input", P + "otpBox");
      box.type = "text";
      box.setAttribute("inputmode", "numeric");
      box.setAttribute("pattern", "[0-9]*");
      box.setAttribute("autocomplete", i === 0 ? "one-time-code" : "off");
      box.setAttribute("aria-label", fmt(str(root, "digit", "Digit %0 of %1"), i + 1, n));
      box.setAttribute("data-amc-i", String(i));
      if (real.disabled) { box.disabled = true; }
      if (real.readOnly) { box.readOnly = true; }
      group.appendChild(box);
      if (n >= 6 && n % 2 === 0 && i === n / 2 - 1) {
        var sep = make("span", P + "otpSep");
        sep.setAttribute("aria-hidden", "true");
        group.appendChild(sep);
      }
    }
    group.style.setProperty("--amc-ta-n", String(n));
    group.style.setProperty("--amc-ta-h", String(Math.floor(n / 2)));
    if (n >= 6 && n % 2 === 0) { group.classList.add(P + "otp--split"); }
    real.classList.add(P + "otpReal");
    real.setAttribute("tabindex", "-1");
    real.setAttribute("aria-hidden", "true");
    real.setAttribute("autocomplete", "off");
    real.parentNode.insertBefore(group, real.nextSibling);
    fill(group, 0, (real.value || "").replace(/\D/g, ""), true);
    syncOtp(group, false);
  }
  function boxesOf(group) { return group.querySelectorAll("." + P + "otpBox"); }
  function fill(group, from, digits, all) {
    var boxes = boxesOf(group);
    if (all) { each(boxes, function (b) { b.value = ""; }); }
    for (var i = 0; i < digits.length && from + i < boxes.length; i++) { boxes[from + i].value = digits.charAt(i); pop(boxes[from + i]); }
    return Math.min(from + digits.length, boxes.length - 1);
  }
  function pop(box) {
    if (reduce.matches) { return; }
    box.classList.remove("is-pop");
    void box.offsetWidth;
    box.classList.add("is-pop");
  }
  function syncOtp(group, byUser) {
    var real = document.getElementById(group.getAttribute("data-amc-for"));
    var boxes = boxesOf(group);
    var value = "";
    var complete = true;
    each(boxes, function (b) {
      value += b.value;
      if (!b.value) { complete = false; }
      b.classList.toggle("is-filled", !!b.value);
    });
    group.classList.toggle("is-complete", complete);
    if (!real) { return; }
    // Error state mirrors the real item until the user edits the code.
    if (byUser) { group.setAttribute("data-amc-edited", "1"); }
    var invalid = !group.getAttribute("data-amc-edited") && (real.classList.contains("apex-page-item-error") || real.getAttribute("aria-invalid") === "true");
    group.classList.toggle("is-error", invalid);
    each(boxes, function (b) { if (invalid) { b.setAttribute("aria-invalid", "true"); } else { b.removeAttribute("aria-invalid"); } });
    if (real.value !== value) {
      real.value = value;
      fire(real, "input");
      fire(real, "change");
    }
    var root = rootOf(group);
    if (byUser && complete && root && root.classList.contains(ROOT + "--otpAutoSubmit") && group.getAttribute("data-amc-sent") !== value) {
      group.setAttribute("data-amc-sent", value);
      setTimeout(function () {
        if (!group.classList.contains("is-complete") || real.value !== value) { return; }
        var btn = firstPrimary(root);
        if (btn && !btn.disabled && btn.getAttribute("aria-disabled") !== "true") { btn.click(); }
      }, 180);
    }
    if (!complete) { group.removeAttribute("data-amc-sent"); }
  }
  function focusBox(group, i) {
    var boxes = boxesOf(group);
    var b = boxes[Math.max(0, Math.min(boxes.length - 1, i))];
    if (b) { b.focus(); }
  }
  function firstEmpty(group) {
    var boxes = boxesOf(group);
    for (var i = 0; i < boxes.length; i++) { if (!boxes[i].value) { return i; } }
    return boxes.length - 1;
  }
  function otpKey(ev, box) {
    var group = box.parentNode;
    var i = parseInt(box.getAttribute("data-amc-i"), 10);
    var k = ev.key;
    if (ev.ctrlKey || ev.metaKey || ev.altKey || box.readOnly) { return; }
    if (/^[0-9]$/.test(k)) {
      ev.preventDefault();
      box.value = k;
      pop(box);
      syncOtp(group, true);
      if (i < boxesOf(group).length - 1) { focusBox(group, i + 1); }
    } else if (k === "Backspace") {
      ev.preventDefault();
      if (box.value) { box.value = ""; } else if (i > 0) { boxesOf(group)[i - 1].value = ""; focusBox(group, i - 1); }
      syncOtp(group, true);
    } else if (k === "Delete") {
      ev.preventDefault();
      box.value = "";
      syncOtp(group, true);
    } else if (k === "ArrowLeft" || k === "Left") {
      ev.preventDefault();
      focusBox(group, i - 1);
    } else if (k === "ArrowRight" || k === "Right") {
      ev.preventDefault();
      focusBox(group, i + 1);
    } else if (k === "Home" || k === "End") {
      ev.preventDefault();
      focusBox(group, k === "Home" ? 0 : boxesOf(group).length - 1);
    } else if (k === "Enter") {
      ev.preventDefault();
      var btn = firstPrimary(rootOf(group));
      if (btn) { btn.click(); }
    } else if (k && k.length === 1) {
      ev.preventDefault();
    }
  }
  function otpInput(box) {
    var group = box.parentNode;
    var i = parseInt(box.getAttribute("data-amc-i"), 10);
    var n = boxesOf(group).length;
    var digits = (box.value || "").replace(/\D/g, "");
    if (digits.length <= 1) {
      box.value = digits;
      syncOtp(group, true);
      if (digits && i < n - 1) { focusBox(group, i + 1); }
      return;
    }
    // Autofill or a multi-character input: a full code starts at the first box.
    var last = digits.length >= n ? fill(group, 0, digits.slice(0, n), true) : fill(group, i, digits, false);
    syncOtp(group, true);
    focusBox(group, digits.length >= n ? n - 1 : last);
  }
  function otpPaste(ev, box) {
    var data = ev.clipboardData || window.clipboardData;
    var text = data ? data.getData("text") || data.getData("Text") || "" : "";
    var digits = text.replace(/\D/g, "");
    ev.preventDefault();
    if (!digits) { return; }
    var group = box.parentNode;
    var n = boxesOf(group).length;
    var i = parseInt(box.getAttribute("data-amc-i"), 10);
    var last = digits.length >= n ? fill(group, 0, digits.slice(0, n), true) : fill(group, i, digits, false);
    syncOtp(group, true);
    focusBox(group, digits.length >= n ? n - 1 : last);
  }

  // ------------------------------------------------------------ resend countdown
  function setupResend(root, btn) {
    if (btn.getAttribute("data-amc-ta-resend")) { return; }
    btn.setAttribute("data-amc-ta-resend", "1");
    btn.classList.add(P + "resend");
    ensureId(btn, "resend");
    var labelEl = btn.querySelector(".t-Button-label") || btn;
    btn.setAttribute("data-amc-ta-label", labelEl.textContent);
    var live = make("span", P + "srOnly");
    live.id = btn.id + "_amc_live";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    btn.parentNode.insertBefore(live, btn.nextSibling);
    startResend(btn);
  }
  function mmss(s) { var m = Math.floor(s / 60); var r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; }
  function startResend(btn) {
    var secs = parseInt(btn.getAttribute("data-amc-seconds"), 10);
    if (!(secs > 0)) { secs = 30; }
    secs = Math.min(secs, 3600);
    var root = rootOf(btn);
    var labelEl = btn.querySelector(".t-Button-label") || btn;
    var live = document.getElementById(btn.id + "_amc_live");
    var end = Date.now() + secs * 1000;
    if (timers[btn.id]) { clearInterval(timers[btn.id]); }
    btn.setAttribute("aria-disabled", "true");
    btn.classList.add("is-waiting");
    function tick() {
      var left = Math.ceil((end - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(timers[btn.id]);
        timers[btn.id] = null;
        labelEl.textContent = btn.getAttribute("data-amc-ta-label");
        btn.removeAttribute("aria-disabled");
        btn.classList.remove("is-waiting");
        if (live) { live.textContent = str(root, "resend-ready", "You can request a new code now"); }
        return;
      }
      labelEl.textContent = fmt(str(root, "resend", "Resend in %0"), mmss(left));
    }
    tick();
    if (live) { live.textContent = labelEl.textContent; }
    timers[btn.id] = setInterval(tick, 1000);
  }

  // ------------------------------------------------------------ primary buttons, loading state
  function primaries(root) {
    var out = [];
    each(root.querySelectorAll("." + P + "actions > button, ." + P + "actions > a, ." + P + "actions > input"), function (b) {
      if (rootOf(b) === root) { out.push(b); }
    });
    return out;
  }
  function firstPrimary(root) { return root ? primaries(root)[0] || null : null; }
  function setupPrimary(root) {
    each(primaries(root), function (b) {
      if (b.getAttribute("data-amc-ta-primary")) { return; }
      b.setAttribute("data-amc-ta-primary", "1");
      b.classList.add(P + "primary");
      if (b.tagName === "INPUT") { return; }
      var spin = make("span", P + "spin");
      spin.setAttribute("aria-hidden", "true");
      var shine = make("span", P + "shine");
      shine.setAttribute("aria-hidden", "true");
      b.insertBefore(spin, b.firstChild);
      b.appendChild(shine);
    });
  }
  function setBusy(btn) {
    if (!btn || btn.classList.contains("is-loading")) { return; }
    var root = rootOf(btn);
    btn.classList.add("is-loading");
    btn.setAttribute("aria-busy", "true");
    if (btn.tagName !== "INPUT") {
      var sr = make("span", P + "srOnly " + P + "busyText", str(root, "busy", "Please wait"));
      btn.appendChild(sr);
    }
    timers.busy = setTimeout(clearBusy, 20000);
  }
  function clearBusy() {
    each(document.querySelectorAll("." + P + "primary.is-loading"), function (b) {
      b.classList.remove("is-loading");
      b.removeAttribute("aria-busy");
      each(b.querySelectorAll("." + P + "busyText"), function (s) { s.parentNode.removeChild(s); });
    });
  }
  function onSubmitting() {
    // Hand passwords back to the browser's password manager as passwords.
    each(document.querySelectorAll("." + P + "reveal[aria-pressed=\"true\"]"), function (b) { setReveal(b, false, false); });
    var btn = lastPrimary && Date.now() - lastPrimaryAt < 4000 && document.body.contains(lastPrimary) ? lastPrimary : null;
    if (!btn) {
      var root = rootOf(document.activeElement) || document.querySelector("." + ROOT);
      btn = firstPrimary(root);
    }
    setBusy(btn);
  }

  // ------------------------------------------------------------ APEX errors: one shake + focus
  function pageError() {
    var n = document.getElementById("t_Alert_Notification");
    if (n) { return true; }
    var m = document.getElementById("APEX_ERROR_MESSAGE");
    return !!(m && !m.classList.contains("u-hidden") && (m.textContent || "").replace(/\s+/g, ""));
  }
  function invalidIn(root) {
    var out = [];
    each(root.querySelectorAll(".apex-page-item-error, [aria-invalid=\"true\"]"), function (el) {
      if (!isOwnBox(el)) { out.push(el); }
    });
    return out;
  }
  function checkErrors(root) {
    var list = invalidIn(root);
    var count = list.length + (pageError() ? 1 : 0);
    var before = parseInt(root.getAttribute("data-amc-ta-errors") || "0", 10);
    root.setAttribute("data-amc-ta-errors", String(count));
    var card = root.querySelector("." + P + "card");
    if (card) { card.classList.toggle("is-error", count > 0); }
    each(root.querySelectorAll("." + P + "otp"), function (g) {
      if (count > before) { g.removeAttribute("data-amc-edited"); }
      syncOtp(g, false);
    });
    if (count > before) {
      shake(card);
      focusInvalid(list);
    }
  }
  function shake(card) {
    if (!card || reduce.matches) { return; }
    card.classList.remove("is-shake");
    void card.offsetWidth;
    card.classList.add("is-shake");
    setTimeout(function () { card.classList.remove("is-shake"); }, 700);
  }
  function focusInvalid(list) {
    var el = list[0];
    if (!el) { return; }
    var inp = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) ? el : el.querySelector("input, select, textarea");
    if (!inp) { return; }
    if (inp.classList.contains(P + "otpReal")) {
      var group = document.getElementById(inp.id + "_amc_otp");
      if (group) { focusBox(group, firstEmpty(group)); }
      return;
    }
    try { inp.focus(); } catch (e) { /* hidden item */ }
  }

  // ------------------------------------------------------------ scene
  function isOpaque(el) {
    var cs = window.getComputedStyle(el);
    if (cs.backgroundImage && cs.backgroundImage !== "none") { return true; }
    var c = cs.backgroundColor || "";
    return !(c === "transparent" || /rgba\([^)]*,\s*0\)$/.test(c) || /\/\s*0\)$/.test(c));
  }
  function isStacking(el) {
    var cs = window.getComputedStyle(el);
    return (cs.position !== "static" && cs.zIndex !== "auto") || parseFloat(cs.opacity) < 1 || cs.isolation === "isolate" ||
      (cs.transform && cs.transform !== "none") || (cs.filter && cs.filter !== "none");
  }
  // A fixed layer at z-index -1 hides behind any opaque page wrapper. Lift it by isolating the
  // nearest opaque ancestor that covers the viewport (its background then paints below the scene).
  function liftScene(root) {
    var el = root.parentElement;
    while (el && el !== document.body && el !== document.documentElement) {
      if (isStacking(el)) { return; }
      if (isOpaque(el)) {
        var r = el.getBoundingClientRect();
        if (r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.5) { el.classList.add(P + "sceneHost"); }
        return;
      }
      el = el.parentElement;
    }
  }
  var gridRoots = [];
  function setupScenes() {
    var drawn = false;
    gridRoots = [];
    each(document.querySelectorAll("." + ROOT), function (root) {
      var stage = root.classList.contains(ROOT + "--stage");
      var none = root.classList.contains(ROOT + "--sceneNone");
      if (!stage && !none) {
        root.classList.toggle("is-sceneless", drawn);
        if (!drawn && !root.getAttribute("data-amc-ta-lifted")) { root.setAttribute("data-amc-ta-lifted", "1"); liftScene(root); }
        drawn = true;
      }
      if (root.classList.contains(ROOT + "--sceneGrid") && !root.classList.contains("is-sceneless")) { gridRoots.push(root); }
    });
  }
  var pending = null;
  function flushPointer() {
    var e = pending;
    pending = null;
    if (!e) { return; }
    each(gridRoots, function (root) {
      var x = e.clientX;
      var y = e.clientY;
      if (root.classList.contains(ROOT + "--stage")) {
        var r = root.getBoundingClientRect();
        x -= r.left;
        y -= r.top;
      }
      root.style.setProperty("--amc-ta-mx", x.toFixed(1) + "px");
      root.style.setProperty("--amc-ta-my", y.toFixed(1) + "px");
    });
  }
  function resetPointer() {
    each(gridRoots, function (root) { root.style.removeProperty("--amc-ta-mx"); root.style.removeProperty("--amc-ta-my"); });
  }

  // ------------------------------------------------------------ split brand slot
  function setupBrand(root) {
    if (!root.classList.contains(ROOT + "--split")) { return; }
    var slot = root.querySelector("." + P + "brandSlot");
    var brand = root.querySelector(".amc-auth-brand");
    if (slot && brand && !slot.contains(brand) && rootOf(brand) === root) { slot.appendChild(brand); }
  }

  // ------------------------------------------------------------ init
  function init(root) {
    markFields(root);
    each(byClass(root, "amc-auth-password"), function (i) { setupPassword(root, i); });
    each(byClass(root, "amc-auth-strength"), function (i) { setupStrength(root, i); });
    each(byClass(root, "amc-auth-match"), function (i) { setupMatch(root, i); });
    each(byClass(root, "amc-auth-otp"), function (i) { setupOtp(root, i); });
    each(root.querySelectorAll("button.amc-auth-resend, a.amc-auth-resend, .amc-auth-resend button"), function (b) {
      if (rootOf(b) === root) { setupResend(root, b); }
    });
    setupPrimary(root);
    setupBrand(root);
    checkErrors(root);
  }
  function initAll() {
    each(document.querySelectorAll("." + ROOT), init);
    setupScenes();
  }

  // ------------------------------------------------------------ delegated listeners
  document.addEventListener("pointerdown", function (ev) {
    var btn = closest(ev.target, "." + P + "reveal");
    if (!btn) { return; }
    var input = document.getElementById(btn.getAttribute("aria-controls"));
    if (input && document.activeElement === input) { ev.preventDefault(); }
  });
  document.addEventListener("mousedown", function (ev) {
    var btn = closest(ev.target, "." + P + "reveal");
    var input = btn && document.getElementById(btn.getAttribute("aria-controls"));
    if (input && document.activeElement === input) { ev.preventDefault(); }
  });

  // Capture: a waiting resend button swallows the click before APEX handlers see it.
  document.addEventListener("click", function (ev) {
    var wait = closest(ev.target, "." + P + "resend[aria-disabled=\"true\"]");
    if (wait) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener("click", function (ev) {
    var reveal = closest(ev.target, "." + P + "reveal");
    if (reveal) {
      var input = document.getElementById(reveal.getAttribute("aria-controls"));
      var keepInput = input && document.activeElement === input;
      setReveal(reveal, reveal.getAttribute("aria-pressed") !== "true", keepInput);
      return;
    }
    var prim = closest(ev.target, "." + P + "primary");
    if (prim) {
      lastPrimary = prim;
      lastPrimaryAt = Date.now();
    }
    var resend = closest(ev.target, "." + P + "resend");
    if (resend && resend.getAttribute("aria-disabled") !== "true") {
      setTimeout(function () { startResend(resend); }, 0);
    }
  });

  document.addEventListener("keydown", function (ev) {
    if (isOwnBox(ev.target)) { otpKey(ev, ev.target); return; }
    capsUpdate(ev);
  });
  document.addEventListener("keyup", capsUpdate);

  document.addEventListener("input", function (ev) {
    var t = ev.target;
    if (isOwnBox(t)) { otpInput(t); return; }
    if (!t.getAttribute || !rootOf(t)) { return; }
    if (t.getAttribute("data-amc-ta-meter")) { updateStrength(t, false); }
    if (t.getAttribute("data-amc-ta-against")) { updateMatch(t); }
    if (t.getAttribute("data-amc-ta-pw")) { each(matchesOf(t), updateMatch); }
    if (/^(text|email)$/i.test(t.type || "")) {
      each(rootOf(t).querySelectorAll("[data-amc-ta-meter]"), function (m) { if (m !== t) { updateStrength(m, true); } });
    }
  });

  document.addEventListener("paste", function (ev) {
    if (isOwnBox(ev.target)) { otpPaste(ev, ev.target); }
  });

  document.addEventListener("focusin", function (ev) {
    var t = ev.target;
    if (isOwnBox(t)) {
      // select() can move focus in some engines, so only select a box that still has focus.
      setTimeout(function () { if (document.activeElement === t) { try { t.select(); } catch (e) { /* ignore */ } } }, 0);
      return;
    }
    if (t.classList && t.classList.contains(P + "otpReal")) {
      var group = document.getElementById(t.id + "_amc_otp");
      if (group) { focusBox(group, firstEmpty(group)); }
    }
  });

  document.addEventListener("focusout", function (ev) {
    var t = ev.target;
    if (!t.getAttribute) { return; }
    if (t.getAttribute("data-amc-ta-pw")) {
      var caps = document.getElementById(t.id + "_amc_caps");
      if (caps && caps.textContent) { caps.textContent = ""; }
    }
    if (t.getAttribute("data-amc-ta-against")) { setTimeout(function () { updateMatch(t); }, 0); }
  });

  // Loading state: native form submit, plus APEX's apexpagesubmit (apex.submit calls form.submit(),
  // which fires no submit event). Neither handler prevents anything.
  document.addEventListener("submit", function () { onSubmitting(); }, true);
  window.addEventListener("pageshow", function (ev) { if (ev.persisted) { clearBusy(); } });

  document.addEventListener("pointermove", function (ev) {
    if (!gridRoots.length || ev.pointerType === "touch" || reduce.matches || !hover.matches) { return; }
    if (!pending) { window.requestAnimationFrame(flushPointer); }
    pending = ev;
  }, { passive: true });
  document.addEventListener("pointerout", function (ev) { if (!ev.relatedTarget && gridRoots.length) { pending = null; resetPointer(); } });

  // ------------------------------------------------------------ lifecycle
  var queued = null;
  function queue() {
    if (queued) { return; }
    queued = setTimeout(function () { queued = null; initAll(); }, 60);
  }
  function start() {
    initAll();
    if (window.apex && apex.jQuery) {
      apex.jQuery(document).on("apexafterrefresh", queue);
      apex.jQuery(document).on("apexpagesubmit", onSubmitting);
    }
    if (window.MutationObserver && document.body) {
      new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var t = records[i].target;
          if (t.nodeType !== 1) { t = t.parentNode; }
          if (t && !closest(t, OWN)) { queue(); return; }
        }
      }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "aria-invalid"] });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  window.amcTplAuthCard = { init: initAll, strength: strength, version: "1.0.0" };
})();
