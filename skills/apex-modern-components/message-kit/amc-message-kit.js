/* =========================================================================
   APEX Modern Components - Message Kit runtime
   Turns native APEX page messages into toasts and restyles the
   apex.message.alert / confirm dialogs. No plug-in, no dependency.

   What it watches (it never replaces APEX functions it does not need to)
     - #APEX_SUCCESS_MESSAGE, #APEX_ERROR_MESSAGE, #t_Alert_Success,
       #t_Alert_Notification (Universal Theme page template output, also what
       apex.message.showPageSuccess / showErrors render). A MutationObserver
       mirrors each visible message into a toast and hides the original; when
       APEX hides or removes the original (clearErrors, hidePageSuccess) the
       toast goes too, and closing a toast closes the original the APEX way.
     - apex.message.alert / confirm dialogs (jQuery UI). alert and confirm are
       wrapped only to read options.style; the originals are always called
       with the same arguments and their return value is passed back.

   Configure (later wins):
     1. window.amcMessageKitConfig = { position: "top-end", look: "soft", timeout: 5 };
     2. <body data-amc-message-kit="position:bottom-center look:glass timeout:8">
     3. Page CSS classes: amc-msg-pos-<position>, amc-msg-look-<look>,
        amc-msg-no-page, amc-msg-no-dialogs, amc-msg-off (page messages and
        dialogs stay native), amc-msg-confirm-danger (every confirm is danger).
   Exclude one message: CSS class "amc-msg-off" on the alert or a parent.

   API (Dynamic Action > Execute JavaScript Code):
     amcMessageKit.toast({ type: "success", title: "Saved", message: "Order 58213", timeout: 5 });
   ========================================================================= */
(function () {
  "use strict";
  if (window.amcMessageKit) {
    return;
  }

  var root = document.documentElement;
  var POSITIONS = ["top-end", "top-center", "bottom-end", "bottom-center"];
  var LOOKS = ["soft", "glass", "solid", "brutal", "minimal"];
  var TYPES = { success: "success", info: "info", information: "info", warning: "warning", error: "error", danger: "error" };
  var SVG_NS = "http://www.w3.org/2000/svg";
  var ICONS = {
    success: "M4 10.5l4 4 8-9",
    info: "M10 9v6M10 5.5v.5",
    warning: "M10 5v6M10 14.5v.5",
    error: "M6 6l8 8M14 6l-8 8",
    close: "M5 5l10 10M15 5L5 15"
  };
  var DEFAULTS = {
    position: "top-end",
    look: "soft",
    timeout: 5,
    max: 4,
    dangerWords: "delete|remove|discard|destroy|erase|purge|revoke|drop",
    labels: { close: "Close", success: "Success", info: "Information", warning: "Warning", error: "Error" }
  };

  var cfg = {};
  var stack = null;
  var toasts = [];
  var mirrored = [];
  var pendingDialog = null;
  var forcedDialogStyle = null;
  var lastOutsideFocus = null;
  var started = false;
  var observedContainers = [];

  /* ---- Helpers ------------------------------------------------------------ */
  function each(list, fn) { Array.prototype.forEach.call(list || [], fn); }
  function norm(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function text(el) { return el ? norm(el.textContent) : ""; }
  function apexMessage() { return window.apex && window.apex.message; }
  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function bodyHas(cls) { return !!(document.body && document.body.classList.contains(cls)); }
  function isOff(el) { return !!(el && el.closest && el.closest(".amc-msg-off")); }
  function hidden(el) {
    if (!el || !root.contains(el)) { return true; }
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      if (n !== el && n.classList && n.classList.contains("amc-msg-is-mirrored")) { return true; }
      if (n.hidden || (n.classList && n.classList.contains("u-hidden")) || (n.style && n.style.display === "none")) { return true; }
    }
    return false;
  }

  function merge(target, src) {
    if (!src) { return target; }
    Object.keys(src).forEach(function (k) {
      if (k === "labels" && src.labels) {
        target.labels = target.labels || {};
        Object.keys(src.labels).forEach(function (l) { target.labels[l] = src.labels[l]; });
      } else if (src[k] !== undefined && src[k] !== null && src[k] !== "") {
        target[k] = src[k];
      }
    });
    return target;
  }

  // "position:bottom-center look:glass timeout:8" or bare tokens "bottom-center glass 8".
  function parseAttr(value) {
    var out = {};
    norm(value).split(/[\s;,]+/).forEach(function (tok) {
      if (!tok) { return; }
      var kv = tok.split(/[:=]/);
      var k = kv.length > 1 ? kv[0] : null;
      var v = kv.length > 1 ? kv[1] : kv[0];
      if (k) { out[k] = v; }
      else if (POSITIONS.indexOf(v) >= 0) { out.position = v; }
      else if (LOOKS.indexOf(v) >= 0) { out.look = v; }
      else if (/^\d+(\.\d+)?$/.test(v)) { out.timeout = v; }
    });
    return out;
  }

  function readConfig(extra) {
    var c = merge({ labels: {} }, DEFAULTS);
    c.labels = merge({}, DEFAULTS.labels);
    merge(c, window.amcMessageKitConfig);
    if (document.body) {
      merge(c, parseAttr(document.body.getAttribute("data-amc-message-kit")));
      POSITIONS.forEach(function (p) { if (bodyHas("amc-msg-pos-" + p)) { c.position = p; } });
      LOOKS.forEach(function (l) { if (bodyHas("amc-msg-look-" + l)) { c.look = l; } });
    }
    merge(c, extra);
    if (POSITIONS.indexOf(c.position) < 0) { c.position = DEFAULTS.position; }
    if (LOOKS.indexOf(c.look) < 0) { c.look = DEFAULTS.look; }
    c.timeout = Math.max(0, parseFloat(c.timeout) || 0);
    c.max = Math.max(1, parseInt(c.max, 10) || DEFAULTS.max);
    return c;
  }

  function applyConfig() {
    each(root.className.split(/\s+/), function (cls) {
      if (/^amc-msg--(pos|look)-/.test(cls)) { root.classList.remove(cls); }
    });
    root.classList.add("amc-msg", "amc-msg--pos-" + cfg.position, "amc-msg--look-" + cfg.look);
  }

  function icon(name) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICONS[name] || ICONS.info);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2.2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    return svg;
  }

  function el(tag, cls, content) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (content) { n.textContent = content; }
    return n;
  }

  function ensureStack() {
    if (stack && root.contains(stack)) { return stack; }
    if (!document.body) { return null; }
    stack = el("div", "amc-msg-stack");
    stack.addEventListener("focusin", function (e) {
      if (e.relatedTarget && !stack.contains(e.relatedTarget)) { lastOutsideFocus = e.relatedTarget; }
    });
    document.body.appendChild(stack);
    return stack;
  }

  /* ---- Toasts ------------------------------------------------------------- */
  function Toast(opts) {
    var self = this;
    var type = TYPES[String(opts.type || "info").toLowerCase()] || "info";
    var seconds = opts.timeout === undefined || opts.timeout === null || opts.timeout === "" ? cfg.timeout : Math.max(0, parseFloat(opts.timeout) || 0);
    this.type = type;
    this.life = type === "error" ? 0 : seconds * 1000; // errors never auto-dismiss
    this.remaining = this.life;
    this.pauses = {};
    this.onClose = opts.onClose || null;
    this.closed = false;

    var node = el("div", "amc-msg-toast amc-msg-toast--" + type + " is-fresh");
    node.setAttribute("role", type === "error" ? "alert" : "status");
    node.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
    node.setAttribute("aria-atomic", "true");
    this.el = node;

    var ic = el("span", "amc-msg-icon");
    ic.setAttribute("aria-hidden", "true");
    ic.appendChild(icon(type));

    var body = el("div", "amc-msg-body");
    var titleText = norm(opts.title);
    var messageText = norm(opts.message);
    if (!titleText && messageText) { titleText = messageText; messageText = ""; }
    var title = el("p", "amc-msg-title");
    title.appendChild(el("span", "amc-msg-sr", (cfg.labels[type] || type) + ": "));
    title.appendChild(document.createTextNode(titleText || cfg.labels[type] || type));
    body.appendChild(title);
    if (messageText) { body.appendChild(el("p", "amc-msg-text", messageText)); }
    if (opts.items && opts.items.length) {
      var ul = el("ul", "amc-msg-list");
      opts.items.forEach(function (item) {
        var li = el("li");
        if (item.action) {
          var link = el("button", "amc-msg-link", item.text);
          link.type = "button";
          link.addEventListener("click", item.action);
          li.appendChild(link);
        } else {
          li.textContent = item.text;
        }
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }

    var close = el("button", "amc-msg-close");
    close.type = "button";
    close.setAttribute("aria-label", opts.closeLabel || cfg.labels.close);
    close.title = opts.closeLabel || cfg.labels.close;
    close.appendChild(icon("close"));
    close.addEventListener("click", function () { self.close("user"); });

    node.appendChild(ic);
    node.appendChild(body);
    node.appendChild(close);

    if (this.life > 0) {
      var bar = el("span", "amc-msg-progress");
      bar.setAttribute("aria-hidden", "true");
      bar.appendChild(el("span", "amc-msg-progress-bar"));
      node.style.setProperty("--amc-msg-life", this.life + "ms");
      node.appendChild(bar);
    }

    node.addEventListener("animationend", function (e) {
      if (e.target === node && e.animationName === "amc-msg-shake") { node.classList.remove("is-fresh"); }
    });
    node.addEventListener("pointerenter", function () { self.pause("hover"); });
    node.addEventListener("pointerleave", function () { self.resume("hover"); });
    node.addEventListener("focusin", function () { self.pause("focus"); });
    node.addEventListener("focusout", function (e) {
      if (!e.relatedTarget || !node.contains(e.relatedTarget)) { self.resume("focus"); }
    });
    wireSwipe(this);
  }

  Toast.prototype.start = function () {
    if (this.life > 0 && !this.closed) {
      var self = this;
      this.startedAt = Date.now();
      clearTimeout(this.timer);
      this.timer = setTimeout(function () { self.close("timeout"); }, this.remaining);
    }
  };
  Toast.prototype.pause = function (why) {
    this.pauses[why] = true;
    this.el.classList.add("is-paused");
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.remaining = Math.max(0, this.remaining - (Date.now() - this.startedAt));
    }
  };
  Toast.prototype.resume = function (why) {
    delete this.pauses[why];
    if (Object.keys(this.pauses).length || this.closed) { return; }
    this.el.classList.remove("is-paused");
    if (!this.timer) { this.start(); }
  };
  Toast.prototype.close = function (reason) {
    if (this.closed) { return; }
    this.closed = true;
    clearTimeout(this.timer);
    var node = this.el;
    var hadFocus = node.contains(document.activeElement);
    toasts.splice(toasts.indexOf(this), 1);
    if (this.onClose) { this.onClose(reason); }
    function remove() { if (node.parentNode) { node.parentNode.removeChild(node); } }
    if (reducedMotion() || !node.parentNode) {
      remove();
    } else {
      if (reason !== "swipe") { node.classList.add("is-leaving"); }
      node.addEventListener("animationend", function (e) { if (e.animationName === "amc-msg-out") { remove(); } });
      setTimeout(remove, 360); // fallback when animations do not run
    }
    if (hadFocus) {
      if (lastOutsideFocus && root.contains(lastOutsideFocus) && lastOutsideFocus.focus) {
        lastOutsideFocus.focus();
      } else if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
    }
  };

  function wireSwipe(t) {
    var node = t.el;
    var startX = null;
    var dx = 0;
    node.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" || (e.target.closest && e.target.closest("button, a"))) { return; }
      startX = e.clientX; dx = 0;
      node.classList.add("is-dragging");
      t.pause("swipe");
      if (node.setPointerCapture) { try { node.setPointerCapture(e.pointerId); } catch (ignore) { /* synthetic events */ } }
    });
    node.addEventListener("pointermove", function (e) {
      if (startX === null) { return; }
      dx = e.clientX - startX;
      node.style.translate = dx + "px 0";
      node.style.opacity = String(Math.max(.3, 1 - Math.abs(dx) / 220));
    });
    function end() {
      if (startX === null) { return; }
      startX = null;
      node.classList.remove("is-dragging");
      if (Math.abs(dx) > 72) {
        node.classList.add("is-swiped");
        node.style.translate = (dx > 0 ? 110 : -110) + "% 0";
        t.close("swipe");
      } else {
        node.style.translate = "";
        node.style.opacity = "";
        t.resume("swipe");
      }
    }
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end);
  }

  function show(opts) {
    var host = ensureStack();
    var t = new Toast(opts || {});
    if (!host) { return t; }
    host.appendChild(t.el);
    toasts.push(t);
    t.start();
    // Keep the stack short: drop the oldest non-error toast.
    var overflow = toasts.length - cfg.max;
    for (var i = 0; i < toasts.length && overflow > 0; i++) {
      if (toasts[i].type !== "error" && toasts[i] !== t) { toasts[i].close("overflow"); overflow--; i--; }
    }
    return t;
  }

  /* ---- Page messages (success / errors) ---------------------------------- */
  var SOURCE_SELECTOR = "#APEX_SUCCESS_MESSAGE .t-Alert, #APEX_ERROR_MESSAGE .t-Alert, #t_Alert_Success, #t_Alert_Notification";

  function sourceType(src) {
    var c = " " + src.className + " ";
    if (src.id === "t_Alert_Success" || / t-Alert--success /.test(c)) { return "success"; }
    if (/ t-Alert--(danger|error) /.test(c)) { return "error"; }
    if (/ t-Alert--warning /.test(c) && !src.closest("#APEX_ERROR_MESSAGE") && src.id !== "t_Alert_Notification") { return "warning"; }
    if (/ t-Alert--info /.test(c) && !src.closest("#APEX_ERROR_MESSAGE")) { return "info"; }
    if (src.closest("#APEX_SUCCESS_MESSAGE")) { return "success"; }
    return "error";
  }

  function targetOf(li, link) {
    var id = (link && link.getAttribute("data-for")) || li.getAttribute("data-for");
    var href = link && link.getAttribute("href");
    if (!id && href && /^#[^#\s]+$/.test(href)) { id = href.slice(1); }
    var onclick = link && link.getAttribute("onclick");
    var m = !id && onclick && /(?:apex\.item\(|\$x\(|\$s\()\s*['"]([^'"]+)['"]/.exec(onclick);
    if (m) { id = m[1]; }
    return id || null;
  }

  function focusItem(id, fallbackLink) {
    var node = id && document.getElementById(id);
    if (node && window.apex && typeof window.apex.item === "function") {
      try { window.apex.item(id).setFocus(); return; } catch (ignore) { /* fall through */ }
    }
    if (node) {
      if (node.scrollIntoView) { node.scrollIntoView({ block: "center" }); }
      node.focus();
    } else if (fallbackLink) {
      fallbackLink.click(); // let APEX's own handler run
    }
  }

  function closeSource(src, type) {
    var am = apexMessage();
    var btn = src.querySelector(".t-Button--closeAlert, .t-Alert-buttons button");
    if (type === "success" && src.closest("#APEX_SUCCESS_MESSAGE") && am && typeof am.hidePageSuccess === "function") {
      am.hidePageSuccess();
    } else if (btn) {
      btn.click();
    } else if (src.parentNode) {
      src.parentNode.removeChild(src);
    }
  }

  function toastFromSource(src) {
    var type = sourceType(src);
    var closeBtn = src.querySelector(".t-Button--closeAlert, .t-Alert-buttons button");
    var opts = {
      type: type,
      closeLabel: closeBtn && (closeBtn.getAttribute("aria-label") || closeBtn.getAttribute("title")) || null,
      onClose: function (reason) {
        unlink(src);
        if (reason !== "source") { closeSource(src, type); }
      }
    };
    var titleEl = src.querySelector(".a-Notification-title, .t-Alert-title");
    var itemEls = src.querySelectorAll(".a-Notification-item, .htmldbStdErr, .t-Alert-body li, .t-Alert-content li");
    if (type === "error" || itemEls.length) {
      var seen = [];
      opts.title = text(titleEl);
      opts.items = [];
      each(itemEls, function (item) {
        var li = item.closest("li") || item;
        if (seen.indexOf(li) >= 0) { return; }
        seen.push(li);
        var link = li.querySelector("a, button");
        var id = targetOf(li, link);
        opts.items.push({
          text: text(li),
          action: id || link ? function () { focusItem(id, link); } : null
        });
      });
      if (!opts.items.length) {
        opts.message = text(src.querySelector(".t-Alert-body")) || (titleEl ? "" : text(src.querySelector(".t-Alert-content") || src));
      }
      if (!opts.title && opts.items.length === 1 && !opts.items[0].action) {
        opts.title = opts.items[0].text;
        opts.items = [];
      }
    } else {
      opts.title = text(titleEl) || text(src.querySelector(".t-Alert-content") || src);
      opts.message = text(src.querySelector(".t-Alert-body"));
    }
    return show(opts);
  }

  function linked(src) {
    for (var i = 0; i < mirrored.length; i++) { if (mirrored[i].src === src) { return mirrored[i]; } }
    return null;
  }
  function unlink(src) {
    var link = linked(src);
    if (link) { mirrored.splice(mirrored.indexOf(link), 1); }
    if (src.classList) { src.classList.remove("amc-msg-is-mirrored"); }
  }

  function scanPage() {
    // Messages APEX hid or removed: close their toasts.
    mirrored.slice().forEach(function (m) {
      if (hidden(m.src) || !text(m.src)) { m.toast.close("source"); }
    });
    var found = [];
    each(document.querySelectorAll(SOURCE_SELECTOR), function (src) {
      if (found.indexOf(src) < 0) { found.push(src); }
    });
    found.forEach(function (src) {
      if (linked(src) || isOff(src) || hidden(src) || !text(src)) { return; }
      var t = toastFromSource(src);
      mirrored.push({ src: src, toast: t });
      src.classList.add("amc-msg-is-mirrored");
    });
    observeContainers();
  }

  var pageObserver = null;

  function observeContainers() {
    if (!pageObserver) { return; }
    each(document.querySelectorAll("#APEX_SUCCESS_MESSAGE, #APEX_ERROR_MESSAGE, .t-Body-alert"), function (c) {
      if (observedContainers.indexOf(c) >= 0) { return; }
      observedContainers.push(c);
      pageObserver.observe(c, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
    });
  }

  function wirePage() {
    pageObserver = new MutationObserver(function () { scanPage(); });
    // Body children only (cheap): catches containers or alerts added later.
    pageObserver.observe(document.body, { childList: true });
    scanPage();
  }

  /* ---- Dialogs (apex.message.alert / confirm) ----------------------------- */
  function wrapDialogFn(name) {
    var am = apexMessage();
    if (!am || typeof am[name] !== "function" || am[name].amcWrapped) { return; }
    var original = am[name];
    var wrapped = function (message, callback, options) {
      pendingDialog = {
        kind: name,
        style: options && typeof options === "object" ? options.style : null,
        message: norm(message),
        at: Date.now()
      };
      return original.apply(this, arguments);
    };
    wrapped.amcWrapped = true;
    wrapped.amcOriginal = original;
    am[name] = wrapped;
  }

  function dialogStyle(d, isConfirm) {
    var style = null;
    if (forcedDialogStyle) { style = forcedDialogStyle; forcedDialogStyle = null; }
    if (!style && pendingDialog && Date.now() - pendingDialog.at < 2000) { style = pendingDialog.style; }
    if (!style) {
      var styled = d.querySelector("[class*='--danger'], [class*='--warning'], [class*='--success'], [class*='--information'], [class*='--info']");
      var cls = (d.className + " " + (styled ? styled.className : ""));
      var m = /--(danger|warning|success|information|info)\b/.exec(cls);
      if (m) { style = m[1]; }
    }
    if (!style && isConfirm && bodyHas("amc-msg-confirm-danger")) { style = "danger"; }
    if (!style && isConfirm && cfg.dangerWords) {
      var words = cfg.dangerWords instanceof RegExp ? cfg.dangerWords : new RegExp("\\b(" + cfg.dangerWords + ")", "i");
      var content = d.querySelector(".ui-dialog-content");
      if (words.test(text(content)) || words.test(text(d.querySelector(".ui-dialog-title")))) { style = "danger"; }
    }
    if (style === "information") { style = "info"; }
    return style;
  }

  function enhanceDialog(d) {
    if (d.amcMsgDone || !d.classList || !d.classList.contains("ui-dialog") || isOff(d)) { return; }
    if (d.querySelector("iframe")) { return; } // modal and drawer pages stay native
    var isMessage = d.classList.contains("ui-dialog--notification") || !!d.querySelector(".a-AlertMessage") ||
      !!(pendingDialog && Date.now() - pendingDialog.at < 2000);
    if (!isMessage) { return; }
    d.amcMsgDone = true;
    var buttons = d.querySelectorAll(".ui-dialog-buttonset .ui-button, .ui-dialog-buttonpane button");
    var isConfirm = (pendingDialog && pendingDialog.kind === "confirm") || buttons.length > 1;
    var style = dialogStyle(d, isConfirm);
    pendingDialog = null;
    d.classList.add("amc-msg-dialog");
    if (style) { d.classList.add("amc-msg-dialog--" + style); }
    // Make the primary button obvious when APEX did not mark one hot.
    if (buttons.length && !d.querySelector(".ui-button--hot")) {
      buttons[buttons.length - 1].classList.add("ui-button--hot");
    }
    new MutationObserver(updateDialogOpen).observe(d, { attributes: true, attributeFilter: ["style", "class"] });
    updateDialogOpen();
  }

  function updateDialogOpen() {
    var open = false;
    each(document.querySelectorAll(".amc-msg-dialog"), function (d) {
      if (d.style.display !== "none" && !d.hidden) { open = true; }
    });
    root.classList.toggle("amc-msg-dialog-open", open);
  }

  function wireDialogs() {
    wrapDialogFn("alert");
    wrapDialogFn("confirm");
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        each(r.addedNodes, function (n) { if (n.nodeType === 1) { enhanceDialog(n); } });
      });
      updateDialogOpen();
    }).observe(document.body, { childList: true, subtree: true });
    each(document.querySelectorAll(".ui-dialog"), enhanceDialog);
  }

  /* ---- Keyboard ----------------------------------------------------------- */
  function wireKeys() {
    document.addEventListener("keydown", function (e) {
      if ((e.key !== "Escape" && e.key !== "Esc") || !stack) { return; }
      for (var i = toasts.length - 1; i >= 0; i--) {
        if (toasts[i].el.contains(document.activeElement)) {
          e.preventDefault();
          e.stopPropagation();
          toasts[i].close("user");
          return;
        }
      }
    }, true);
  }

  /* ---- Start -------------------------------------------------------------- */
  function start() {
    if (started) { return; }
    started = true;
    cfg = readConfig();
    applyConfig();
    ensureStack();
    wireKeys();
    if (bodyHas("amc-msg-off")) { return; }
    if (!bodyHas("amc-msg-no-page")) { wirePage(); }
    if (!bodyHas("amc-msg-no-dialogs")) { wireDialogs(); }
  }

  cfg = readConfig();

  window.amcMessageKit = {
    /**
     * Show a toast. Text only (textContent), never HTML.
     * amcMessageKit.toast({ type: "success"|"info"|"warning"|"error", title, message, timeout })
     * timeout is in seconds (0 keeps it open); errors always stay until closed.
     * Returns { element, close() }.
     */
    toast: function (opts) {
      if (typeof opts === "string") { opts = { message: opts }; }
      opts = opts || {};
      var t = show({ type: opts.type, title: opts.title, message: opts.message, timeout: opts.timeout });
      return { element: t.el, close: function () { t.close("api"); } };
    },
    /** Close every toast (APEX messages they mirror are closed too). */
    dismissAll: function () { toasts.slice().forEach(function (t) { t.close("api"); }); },
    /** Change position, look, timeout or max at runtime. */
    configure: function (options) {
      cfg = readConfig(options);
      if (window.amcMessageKitConfig && options) { merge(window.amcMessageKitConfig, options); }
      else if (options) { window.amcMessageKitConfig = merge({}, options); }
      applyConfig();
      return merge({}, cfg);
    },
    /** Current configuration (copy). */
    config: function () { return merge({ labels: merge({}, cfg.labels) }, cfg); },
    /** Style the next apex.message dialog: "danger", "warning", "success" or "info". */
    nextDialog: function (style) { forcedDialogStyle = style || null; },
    version: "1.0.0"
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
