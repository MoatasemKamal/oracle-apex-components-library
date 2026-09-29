/* =========================================================================
   APEX Modern Components - Theme Kit runtime
   Sets brand tokens from data (a SQL query per tenant or user) on :root.

   Where the tokens come from (first found wins on page load)
     1. <body data-amc-theme-tokens='{"--ut-palette-primary":"#0f766e"}'>
        (Page HTML Body Attribute: data-amc-theme-tokens="&P0_THEME_TOKENS!ATTR.")
     2. An element with id="amc-theme-tokens" whose text is the JSON object, for
        example a Page 0 region: <div id="amc-theme-tokens" hidden>&P0_THEME_TOKENS!HTML.</div>
        (an <input>/<textarea> with that id is read from its value).
     3. From code: amcThemeKit.apply({ "--ut-palette-primary": "#0f766e" }).

   What it accepts
     - Keys: only the variables in ALLOWED below, plus app-defined
       --amc-theme-<name> tokens (a color, or a length when the name ends in
       -radius). A key may be written without the leading "--".
     - Values: colors must pass CSS.supports("color", v); lengths must be
       0 or a number with px, rem, em or %. var(), url(), expressions, CSS-wide
       keywords (inherit, initial...) and anything longer than 64 characters
       are rejected.
     - Nothing is ever parsed as HTML: JSON.parse + style.setProperty only.

   Contrast (WCAG 2.x, relative luminance), after merging the new tokens with
   the values already in effect:
     - --ut-palette-<name>-contrast on --ut-palette-<name>: 4.5:1. When it fails
       (or the palette color changed without a contrast value) the kit picks
       black or white, whichever is stronger, and warns in the console.
     - Text pairs (body text, region text, muted text, links, header, fields):
       4.5:1. A failing pair is skipped: the new tokens of that pair are not
       applied (a warning names them) and the rest are.
     - Primary on the region background: 3:1, warning only.
     Options: apply(tokens, { contrast: "auto" | "warn" | "off", minText: 4.5 }).

   API
     amcThemeKit.apply(tokens, options) -> report { applied, adjusted, rejected, skipped }
     amcThemeKit.reset()                -> removes every token the kit set
     amcThemeKit.read()                 -> the tokens found in the page (object or null)
     amcThemeKit.contrast(fg, bg)       -> contrast ratio of two CSS colors
   The event "amc-theme-kit-applied" (detail = report) fires on document.
   ========================================================================= */
(function () {
  "use strict";
  if (window.amcThemeKit) {
    return;
  }

  var COLOR = "color";
  var LENGTH = "length";
  var PALETTE = ["primary", "success", "warning", "danger", "info"];
  var ALLOWED = {
    "--ut-body-background-color": COLOR,
    "--ut-body-text-color": COLOR,
    "--ut-component-background-color": COLOR,
    "--ut-component-text-default-color": COLOR,
    "--ut-component-text-muted-color": COLOR,
    "--ut-component-border-color": COLOR,
    "--ut-component-border-radius": LENGTH,
    "--ut-link-text-color": COLOR,
    "--ut-focus-outline-color": COLOR,
    "--ut-header-background-color": COLOR,
    "--ut-header-text-color": COLOR,
    "--ut-nav-background-color": COLOR,
    "--ut-nav-text-color": COLOR,
    "--ut-field-background-color": COLOR,
    "--ut-field-border-color": COLOR,
    "--ut-field-text-color": COLOR,
    "--ut-field-label-text-color": COLOR
  };
  PALETTE.forEach(function (p) {
    ALLOWED["--ut-palette-" + p] = COLOR;
    ALLOWED["--ut-palette-" + p + "-contrast"] = COLOR;
  });
  var APP_TOKEN = /^--amc-theme-[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var LENGTH_RE = /^(?:0|\d{1,3}(?:\.\d{1,3})?(?:px|rem|em|%))$/;
  var FORBIDDEN = /var\(|url\(|expression|attr\(|env\(|[;{}<>\\]|^\s*(?:inherit|initial|unset|revert|revert-layer|currentcolor)\s*$/i;

  /* Text pairs checked at 4.5:1: [foreground, background, label]. */
  var TEXT_PAIRS = [
    ["--ut-body-text-color", "--ut-body-background-color", "body text"],
    ["--ut-component-text-default-color", "--ut-component-background-color", "region text"],
    ["--ut-component-text-muted-color", "--ut-component-background-color", "muted text"],
    ["--ut-link-text-color", "--ut-component-background-color", "links"],
    ["--ut-header-text-color", "--ut-header-background-color", "header"],
    ["--ut-nav-text-color", "--ut-nav-background-color", "navigation"],
    ["--ut-field-text-color", "--ut-field-background-color", "fields"]
  ];

  var root = document.documentElement;
  var setByKit = {};
  var firstApplyDone = false;
  var animTimer = 0;

  function warn(msg) {
    if (window.console && console.warn) { console.warn("[amcThemeKit] " + msg); }
  }

  function normKey(k) {
    k = String(k || "").replace(/^\s+|\s+$/g, "").toLowerCase();
    if (k.indexOf("--") !== 0 && /^(ut|amc)-/.test(k)) { k = "--" + k; }
    return k;
  }

  function typeOf(key) {
    if (Object.prototype.hasOwnProperty.call(ALLOWED, key)) { return ALLOWED[key]; }
    if (APP_TOKEN.test(key)) { return /-radius$/.test(key) ? LENGTH : COLOR; }
    return null;
  }

  function supports(prop, v) {
    try { return !!(window.CSS && CSS.supports && CSS.supports(prop, v)); } catch (e) { return false; }
  }

  function validValue(type, v) {
    if (typeof v !== "string" && typeof v !== "number") { return null; }
    v = String(v).replace(/^\s+|\s+$/g, "");
    if (!v || v.length > 64 || FORBIDDEN.test(v)) { return null; }
    if (type === LENGTH) { return LENGTH_RE.test(v) && supports("border-radius", v) ? v : null; }
    return supports("color", v) ? v : null;
  }

  /* ---------- color math ---------- */
  var ctx = null;
  function rgba(color) {
    if (!color) { return null; }
    try {
      if (!ctx) {
        var c = document.createElement("canvas");
        c.width = 1; c.height = 1;
        ctx = c.getContext("2d", { willReadFrequently: true });
      }
      if (!ctx) { return null; }
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "rgba(0, 0, 0, 0)";
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      var d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    } catch (e) { return null; }
  }
  function over(fg, bg) {
    var a = fg[3];
    return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
  }
  function lum(c) {
    var s = [c[0], c[1], c[2]].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
  }
  function ratio(fgColor, bgColor) {
    var bg = rgba(bgColor);
    var fg = rgba(fgColor);
    if (!bg || !fg) { return null; }
    var white = [255, 255, 255, 1];
    if (bg[3] < 1) { bg = over(bg, white); }
    if (fg[3] < 1) { fg = over(fg, bg); }
    var l1 = lum(fg);
    var l2 = lum(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  function bestInk(bgColor) {
    var black = ratio("#000000", bgColor) || 0;
    var white = ratio("#ffffff", bgColor) || 0;
    return white >= black ? "#ffffff" : "#000000";
  }

  function current(key) {
    return (window.getComputedStyle(root).getPropertyValue(key) || "").replace(/^\s+|\s+$/g, "");
  }

  function parseTokens(text) {
    if (!text || typeof text !== "string") { return null; }
    if (text.length > 16384) { warn("token JSON larger than 16 KB ignored"); return null; }
    try {
      var o = JSON.parse(text);
      return o && typeof o === "object" && !Array.isArray(o) ? o : null;
    } catch (e) {
      warn("token JSON could not be parsed: " + e.message);
      return null;
    }
  }

  function read() {
    var body = document.body;
    var attr = body && body.getAttribute("data-amc-theme-tokens");
    if (attr) { return parseTokens(attr); }
    var el = document.getElementById("amc-theme-tokens");
    if (el) {
      var tag = el.tagName;
      return parseTokens(tag === "INPUT" || tag === "TEXTAREA" ? el.value : el.textContent);
    }
    return null;
  }

  function apply(tokens, options) {
    var opts = options || {};
    var mode = opts.contrast === "warn" || opts.contrast === "off" ? opts.contrast : "auto";
    var minText = typeof opts.minText === "number" && opts.minText >= 3 ? opts.minText : 4.5;
    var report = { applied: {}, adjusted: {}, rejected: [], skipped: [] };
    if (!tokens || typeof tokens !== "object") { return report; }

    /* 1. whitelist + value validation */
    var cand = {};
    var count = 0;
    Object.keys(tokens).forEach(function (raw) {
      if (count >= 64) { report.rejected.push({ key: raw, reason: "more than 64 tokens" }); return; }
      var key = normKey(raw);
      var type = typeOf(key);
      if (!type) { report.rejected.push({ key: raw, reason: "not an allowed variable" }); return; }
      var val = tokens[raw];
      if (val === null || val === undefined || val === "") { return; }
      var ok = validValue(type, val);
      if (ok === null) { report.rejected.push({ key: key, value: String(val).slice(0, 80), reason: "invalid " + type }); return; }
      cand[key] = ok;
      count++;
    });
    report.rejected.forEach(function (r) { warn("rejected " + r.key + " (" + r.reason + ")"); });

    var eff = function (k) { return Object.prototype.hasOwnProperty.call(cand, k) ? cand[k] : current(k); };

    if (mode !== "off") {
      /* 2. palette contrast colors: auto-pick black/white when unsafe */
      PALETTE.forEach(function (p) {
        var bgKey = "--ut-palette-" + p;
        var fgKey = bgKey + "-contrast";
        if (!(bgKey in cand) && !(fgKey in cand)) { return; }
        var bg = eff(bgKey);
        var fg = eff(fgKey);
        var r = ratio(fg, bg);
        if (r !== null && r >= 4.5) { return; }
        if (mode === "auto" && bg) {
          var ink = bestInk(bg);
          warn(fgKey + " " + (fg || "(unset)") + " on " + bg + " is " + (r ? r.toFixed(2) : "?") + ":1; using " + ink);
          cand[fgKey] = ink;
          report.adjusted[fgKey] = ink;
        } else {
          warn(fgKey + " on " + bgKey + " is " + (r ? r.toFixed(2) : "?") + ":1 (below 4.5:1)");
        }
      });

      /* 3. text pairs: drop the new tokens of a failing pair, repeat until stable */
      var changed = true;
      while (changed) {
        changed = false;
        for (var i = 0; i < TEXT_PAIRS.length; i++) {
          var pair = TEXT_PAIRS[i];
          if (!(pair[0] in cand) && !(pair[1] in cand)) { continue; }
          var fgv = eff(pair[0]);
          var bgv = eff(pair[1]);
          if (!fgv || !bgv) { continue; }
          var rr = ratio(fgv, bgv);
          if (rr === null || rr >= minText) { continue; }
          warn(pair[2] + ": " + fgv + " on " + bgv + " is " + rr.toFixed(2) + ":1 (below " + minText + ":1)" + (mode === "auto" ? "; not applied" : ""));
          if (mode !== "auto") { continue; }
          [pair[0], pair[1]].forEach(function (k) {
            if (k in cand) {
              report.skipped.push({ key: k, value: cand[k], reason: pair[2] + " contrast " + rr.toFixed(2) + ":1" });
              delete cand[k];
              delete report.adjusted[k];
              changed = true;
            }
          });
        }
      }

      /* 4. primary as a UI color on regions: 3:1, warning only */
      if ("--ut-palette-primary" in cand || "--ut-component-background-color" in cand) {
        var ui = ratio(eff("--ut-palette-primary"), eff("--ut-component-background-color"));
        if (ui !== null && ui < 3) { warn("primary on the region background is " + ui.toFixed(2) + ":1 (below 3:1 for UI parts)"); }
      }
    }

    /* 5. apply */
    var keys = Object.keys(cand);
    if (keys.length && firstApplyDone && !root.classList.contains("amc-theme-kit-animating")) {
      root.classList.add("amc-theme-kit-animating");
    }
    keys.forEach(function (k) {
      root.style.setProperty(k, cand[k]);
      setByKit[k] = true;
      if (!(k in report.adjusted)) { report.applied[k] = cand[k]; }
    });
    if (root.classList.contains("amc-theme-kit-animating")) {
      window.clearTimeout(animTimer);
      animTimer = window.setTimeout(function () { root.classList.remove("amc-theme-kit-animating"); }, 400);
    }
    firstApplyDone = true;
    if (keys.length) { root.setAttribute("data-amc-theme-kit", "applied"); }
    try {
      document.dispatchEvent(new CustomEvent("amc-theme-kit-applied", { detail: report }));
    } catch (e) { /* old browsers: no event */ }
    return report;
  }

  function reset() {
    Object.keys(setByKit).forEach(function (k) { root.style.removeProperty(k); });
    setByKit = {};
    root.removeAttribute("data-amc-theme-kit");
  }

  window.amcThemeKit = {
    apply: apply,
    reset: reset,
    read: read,
    contrast: function (fg, bg) { return ratio(fg, bg); },
    allowed: function () { return Object.keys(ALLOWED).concat(["--amc-theme-*"]); }
  };

  function init() {
    var t = read();
    if (t) { apply(t); } else { firstApplyDone = true; }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
