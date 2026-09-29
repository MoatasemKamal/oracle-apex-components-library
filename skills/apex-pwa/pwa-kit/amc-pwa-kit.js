/* =========================================================================
   APEX Modern Components - PWA Kit runtime (APEX 21.1+, Universal Theme)

   - <html> classes: amc-is-standalone, amc-is-ios, amc-is-offline
   - Offline / back-online banner (polite live region)
   - Cancels page submits while offline (page CSS class amc-pwa-allow-offline opts out)
   - Page error for AJAX calls that fail because the network is down
   - Elements with data-amc-pwa-install show only while the app is installable
   - "New version available" toast when a new service worker is installed

   Optional config, before this file loads:
     window.amcPwaConfig = { offlineText: "...", updateText: "...", reloadText: "...",
                             onClearLocal: function () { ... } };
   ========================================================================= */
(function () {
  "use strict";
  if (window.amcPwa) {
    return;
  }

  var cfg = window.amcPwaConfig || {};
  var root = document.documentElement;
  var $ = window.apex && window.apex.jQuery;
  var KEY = "amc-pwa";
  var text = {
    offline: cfg.offlineText || "You are offline. Changes can't be saved until you reconnect.",
    online: cfg.onlineText || "You are back online.",
    network: cfg.networkErrorText || "The server could not be reached. Check your connection and try again.",
    update: cfg.updateText || "A new version of this app is available.",
    reload: cfg.reloadText || "Reload",
    iosHint: cfg.iosHintText || "To install this app, tap Share, then Add to Home Screen.",
    close: cfg.closeText || "Close"
  };

  function mq(q) {
    return !!(window.matchMedia && window.matchMedia(q).matches);
  }

  var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function isStandalone() {
    return mq("(display-mode: standalone)") || mq("(display-mode: fullscreen)") ||
      mq("(display-mode: minimal-ui)") || navigator.standalone === true;
  }

  function store(name, value) {
    try {
      if (value === undefined) {
        return window.localStorage.getItem(KEY + "." + name);
      }
      window.localStorage.setItem(KEY + "." + name, value);
    } catch (e) { /* private mode or storage blocked */ }
    return null;
  }

  /* ---------- banner (one polite live region, reused) ---------- */
  var banner, bannerTimer;

  function getBanner() {
    if (!banner) {
      banner = document.createElement("div");
      banner.className = "amc-PwaBanner";
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-live", "polite");
      banner.hidden = true;
      document.body.appendChild(banner);
    }
    return banner;
  }

  function showBanner(message, kind, ms, action) {
    var b = getBanner();
    clearTimeout(bannerTimer);
    b.textContent = "";
    b.className = "amc-PwaBanner amc-PwaBanner--" + (kind || "info");
    var span = document.createElement("span");
    span.className = "amc-PwaBanner-text";
    span.textContent = message;
    b.appendChild(span);
    if (action) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "t-Button t-Button--small t-Button--hot amc-PwaBanner-action";
      btn.textContent = action.label;
      btn.addEventListener("click", action.run);
      b.appendChild(btn);
    }
    b.hidden = false;
    if (ms) {
      bannerTimer = setTimeout(hideBanner, ms);
    }
  }

  function hideBanner() {
    if (banner) {
      banner.hidden = true;
    }
  }

  /* ---------- connectivity ---------- */
  function setOffline(off, announce) {
    root.classList.toggle("amc-is-offline", off);
    if (off) {
      showBanner(text.offline, "warning");
    } else if (announce) {
      showBanner(text.online, "success", 3000);
    }
  }

  /* ---------- install button ---------- */
  function refreshInstall() {
    var els = document.querySelectorAll("[data-amc-pwa-install]");
    if (!els.length) {
      return;
    }
    var pwa = window.apex && window.apex.pwa;
    var check = (!isStandalone() && pwa && typeof pwa.isInstallable === "function") ?
      Promise.resolve(pwa.isInstallable()) : Promise.resolve(false);
    check.then(function (ok) {
      Array.prototype.forEach.call(els, function (el) {
        el.classList.toggle("is-installable", !!ok);
      });
    }, function () { /* keep hidden */ });
  }

  function onInstallClick(e) {
    var el = e.target.closest && e.target.closest("[data-amc-pwa-install]");
    var pwa = window.apex && window.apex.pwa;
    if (!el) {
      return;
    }
    e.preventDefault();
    if (pwa && typeof pwa.openInstallDialog === "function") {
      pwa.openInstallDialog();
    } else if (isIos) {
      showBanner(text.iosHint, "info", 8000);
    }
  }

  /* ---------- service worker update ---------- */
  function watchUpdates() {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.ready.then(function (reg) {
      function prompt(worker) {
        showBanner(text.update, "info", 0, {
          label: text.reload,
          run: function () {
            var reloaded = false;
            function go() {
              if (!reloaded) {
                reloaded = true;
                window.location.reload();
              }
            }
            navigator.serviceWorker.addEventListener("controllerchange", go);
            if (worker && worker.state === "installed") {
              // Handled only if a Service Worker Hook listens for it (see references).
              worker.postMessage({ type: "SKIP_WAITING" });
            }
            setTimeout(go, 1500);
          }
        });
      }
      if (reg.waiting && navigator.serviceWorker.controller) {
        prompt(reg.waiting);
      }
      reg.addEventListener("updatefound", function () {
        var w = reg.installing;
        if (!w) {
          return;
        }
        w.addEventListener("statechange", function () {
          if (w.state === "installed" && navigator.serviceWorker.controller) {
            prompt(w);
          }
        });
      });
    }).catch(function () { /* no service worker */ });
  }

  /* ---------- init ---------- */
  function init() {
    root.classList.toggle("amc-is-standalone", isStandalone());
    root.classList.toggle("amc-is-ios", isIos);

    if (navigator.onLine === false) {
      setOffline(true, false);
    }
    window.addEventListener("offline", function () { setOffline(true, false); });
    window.addEventListener("online", function () { setOffline(false, true); });

    if ($) {
      var ctx = (window.apex && window.apex.gPageContext$) || $(document);
      ctx.on("apexbeforepagesubmit", function () {
        if (navigator.onLine === false && !document.body.classList.contains("amc-pwa-allow-offline")) {
          window.apex.event.gCancelFlag = true;
          showBanner(text.offline, "warning");
        }
      });
      $(document).on("ajaxError", function (e, xhr, settings, err) {
        if (xhr && xhr.status === 0 && xhr.statusText !== "abort" && err !== "abort" &&
            window.apex.message && window.apex.message.showErrors) {
          window.apex.message.clearErrors();
          window.apex.message.showErrors([{ type: "error", location: "page", message: text.network, unsafe: false }]);
        }
      });
    }

    document.addEventListener("click", onInstallClick);
    refreshInstall();
    window.addEventListener("beforeinstallprompt", function () { setTimeout(refreshInstall, 0); });
    window.addEventListener("appinstalled", function () {
      root.classList.add("amc-is-installed");
      refreshInstall();
    });
    if (window.matchMedia) {
      var m = window.matchMedia("(display-mode: standalone)");
      var sync = function () {
        root.classList.toggle("amc-is-standalone", isStandalone());
        refreshInstall();
      };
      if (m.addEventListener) {
        m.addEventListener("change", sync);
      }
    }

    watchUpdates();
  }

  window.amcPwa = {
    isIos: isIos,
    isStandalone: isStandalone,
    showMessage: showBanner,
    hideMessage: hideBanner,
    refreshInstall: refreshInstall,
    /* Shows the iOS "Add to Home Screen" hint once per device, only in the browser. */
    showIosHint: function (force) {
      if (isIos && !isStandalone() && (force || !store("iosHint"))) {
        store("iosHint", "1");
        showBanner(text.iosHint, "info", 10000);
      }
    },
    /* Removes everything this kit (and keys you prefix with "amc-pwa.") stored. Call on logout. */
    clearLocal: function () {
      try {
        Object.keys(window.localStorage).forEach(function (k) {
          if (k.indexOf(KEY + ".") === 0) {
            window.localStorage.removeItem(k);
          }
        });
      } catch (e) { /* storage blocked */ }
      if (typeof cfg.onClearLocal === "function") {
        cfg.onClearLocal();
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
