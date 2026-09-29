/* APEX Modern Components - Motion Celebrate runtime
 * Draws confetti cannons, confetti rain or fireworks on a temporary full-screen
 * canvas, removed when the last particle is gone. Colors are the theme palette.
 *
 *   amcCelebrate.fire();                                   // uses the first region's settings
 *   amcCelebrate.fire({ effect: "fireworks", message: "Done" });
 *   apex.event.trigger(document, "amc-celebrate");         // fires regions set to On Event
 */
(function () {
  "use strict";
  if (window.amcCelebrate) {
    return;
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var COUNTS = { subtle: 0.5, normal: 1, big: 1.8 };
  var active = null;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function paletteFrom(el) {
    var cs = getComputedStyle(el || document.documentElement);
    var out = [];
    for (var i = 1; i <= 5; i++) {
      var v = cs.getPropertyValue("--amc-cb-" + i).trim();
      if (v) { out.push(v); }
    }
    return out.length ? out : ["#056ac8", "#cb1100", "#f2b134", "#278701", "#0e8a9a"];
  }

  function showMessage(text) {
    if (!text) { return; }
    if (window.apex && apex.message && apex.message.showPageSuccess) {
      apex.message.showPageSuccess(text);
    }
  }

  function stage() {
    if (active) { return active; }
    var c = document.createElement("canvas");
    c.className = "amc-Celebrate-canvas";
    c.setAttribute("aria-hidden", "true");
    document.body.appendChild(c);
    var ctx = c.getContext("2d");
    var s = { el: c, ctx: ctx, w: 0, h: 0, parts: [], rockets: [], timers: [], last: 0 };
    function fit() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.w = window.innerWidth; s.h = window.innerHeight;
      c.width = Math.round(s.w * dpr); c.height = Math.round(s.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    s.onResize = fit;
    window.addEventListener("resize", fit);
    active = s;
    window.requestAnimationFrame(loop);
    return s;
  }

  function confettiPiece(s, x, y, angle, speed, colors) {
    s.parts.push({
      kind: "paper", x: x, y: y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      r: rand(0, 6), vr: rand(-9, 9), w: rand(6, 11), h: rand(10, 16),
      col: colors[Math.random() * colors.length | 0], life: rand(3.5, 5)
    });
  }

  var EFFECTS = {
    cannons: function (s, colors, k) {
      var n = Math.round(90 * k);
      for (var i = 0; i < n; i++) {
        confettiPiece(s, 0, s.h * 0.72, -Math.PI / 3 + rand(-0.35, 0.35), rand(700, 1150), colors);
        confettiPiece(s, s.w, s.h * 0.72, -Math.PI * 2 / 3 + rand(-0.35, 0.35), rand(700, 1150), colors);
      }
    },
    rain: function (s, colors, k) {
      var n = Math.round(220 * k);
      for (var i = 0; i < n; i++) {
        confettiPiece(s, rand(0, s.w), rand(-s.h * 0.8, -20), Math.PI / 2 + rand(-0.3, 0.3), rand(60, 180), colors);
      }
    },
    fireworks: function (s, colors, k) {
      var n = Math.round(7 * k);
      for (var i = 0; i < n; i++) {
        (function (delay) {
          s.timers.push({ at: delay, run: function () {
            s.rockets.push({ x: s.w * rand(0.15, 0.85), y: s.h, vy: -rand(s.h * 0.95, s.h * 1.2), col: colors[Math.random() * colors.length | 0] });
          } });
        })(i * 0.28);
      }
    }
  };

  function loop(now) {
    var s = active;
    if (!s) { return; }
    var dt = s.last ? Math.min(0.05, (now - s.last) / 1000) : 0;
    s.last = now;
    var ctx = s.ctx;
    ctx.clearRect(0, 0, s.w, s.h);

    s.timers = s.timers.filter(function (t) { t.at -= dt; if (t.at <= 0) { t.run(); return false; } return true; });

    s.rockets.forEach(function (r) {
      r.vy += 900 * dt; r.y += r.vy * dt;
      ctx.fillStyle = r.col; ctx.fillRect(r.x - 1.5, r.y, 3, 10);
      if (r.vy > -60) {
        r.dead = true;
        for (var i = 0; i < 70; i++) {
          var a = i / 70 * Math.PI * 2, sp = rand(120, 320);
          s.parts.push({ kind: "spark", x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, col: r.col, life: rand(1, 1.6) });
        }
      }
    });
    s.rockets = s.rockets.filter(function (r) { return !r.dead; });

    s.parts.forEach(function (p) {
      p.life -= dt;
      if (p.kind === "paper") {
        p.vy += 800 * dt; p.vx *= 1 - 1.6 * dt; p.vy *= 1 - 1.1 * dt;
        p.x += p.vx * dt + Math.sin(p.r) * 20 * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        var squeeze = Math.abs(Math.cos(p.r * 1.3));
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.min(1, p.life);
        ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h * squeeze / 2, p.w, p.h * squeeze + 1);
        ctx.restore();
      } else {
        p.vy += 140 * dt; p.vx *= 1 - 1.4 * dt; p.vy *= 1 - 1.4 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.fillStyle = p.col; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
    });
    ctx.globalAlpha = 1;
    s.parts = s.parts.filter(function (p) { return p.life > 0 && p.y < s.h + 60; });

    if (!s.parts.length && !s.rockets.length && !s.timers.length) {
      window.removeEventListener("resize", s.onResize);
      s.el.remove();
      active = null;
      return;
    }
    window.requestAnimationFrame(loop);
  }

  function fire(options) {
    options = options || {};
    var marker = options.element || document.querySelector(".amc-Celebrate");
    var effect = options.effect || (marker && marker.getAttribute("data-amc-effect")) || "cannons";
    var intensity = options.intensity || (marker && marker.getAttribute("data-amc-intensity")) || "normal";
    var message = options.message !== undefined ? options.message : marker && marker.getAttribute("data-amc-message");
    showMessage(message);
    if (reduceMotion || !EFFECTS[effect]) { return; }
    EFFECTS[effect](stage(), paletteFrom(marker), COUNTS[intensity] || 1);
  }

  function fireMarkers(trigger) {
    var markers = document.querySelectorAll(".amc-Celebrate[data-amc-trigger='" + trigger + "']");
    Array.prototype.forEach.call(markers, function (m) { fire({ element: m }); });
  }

  function start() {
    // Wait a moment on load so the celebration is seen after the page settles.
    window.setTimeout(function () { fireMarkers("load"); }, 350);
    var onEvent = function () { fireMarkers("event"); };
    // A jQuery listener receives both apex.event.trigger and native dispatchEvent;
    // a native listener alone would miss apex.event.trigger.
    if (window.apex && apex.jQuery) {
      apex.jQuery(document).on("amc-celebrate", onEvent);
    } else {
      document.addEventListener("amc-celebrate", onEvent);
    }
  }

  window.amcCelebrate = { fire: fire };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
