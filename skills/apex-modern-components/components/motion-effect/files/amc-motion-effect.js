/* APEX Modern Components - Motion Effect runtime
 * JavaScript-driven effects from the Motion Gallery: spring and gravity physics,
 * SVG path morph and the canvas particle effects. Also applies the Speed setting to
 * CSS animations (Web Animations API), replays on click, pauses off-screen effects
 * and respects prefers-reduced-motion. Colors come from the component's CSS tokens,
 * so canvas effects follow the Universal Theme style, including dark mode. */
(function () {
  "use strict";
  if (window.amcMotionEffect) {
    return;
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SPEEDS = { "0.5": 0.5, "1": 1, "1.5": 1.5, "2": 2 };
  var instances = [];

  function rand(a, b) { return a + Math.random() * (b - a); }

  function readColors(el) {
    var cs = getComputedStyle(el);
    var get = function (name, fallback) { return cs.getPropertyValue(name).trim() || fallback; };
    return {
      fg: get("--amc-fx-fg", cs.color),
      c1: get("--amc-fx-1", "#0b7d8c"),
      c2: get("--amc-fx-2", "#df5637"),
      c3: get("--amc-fx-3", "#df9c12"),
      c4: get("--amc-fx-4", "#3a8d58")
    };
  }

  // A crisp canvas that fills the component and follows its size.
  function canvas(root, onResize) {
    var el = document.createElement("canvas");
    el.className = "amc-cv";
    el.setAttribute("aria-hidden", "true");
    root.appendChild(el);
    var ctx = el.getContext("2d");
    var s = { el: el, ctx: ctx, w: 0, h: 0 };
    function fit() {
      var r = root.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) { return; }
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.w = r.width; s.h = r.height;
      el.width = Math.round(r.width * dpr);
      el.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (onResize) { onResize(); }
    }
    fit();
    if (window.ResizeObserver) { new ResizeObserver(fit).observe(root); }
    return s;
  }

  // Trail effect: erase part of the previous frame toward transparency.
  function fade(c, alpha) {
    var ctx = c.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0," + alpha.toFixed(3) + ")";
    ctx.fillRect(0, 0, c.w, c.h);
    ctx.restore();
  }

  /* Each factory gets (root, colors) and returns { tick(dt), replay() }. */
  var FX = {};

  FX.spring = function (root) {
    var coil = root.querySelector(".amc-coil");
    var mass = root.querySelector(".amc-mass");
    var x, v, rest;
    function reset() { x = 46; v = 0; rest = 0; }
    reset();
    return {
      tick: function (dt) {
        for (var i = 0; i < 4; i++) { var h = dt / 4; v += (-90 * x - 3.2 * v) * h; x += v * h; }
        if (Math.abs(x) < 0.4 && Math.abs(v) < 0.4) {
          rest += dt;
          if (rest > 0.7) { x = Math.random() < 0.5 ? 46 : -34; v = 0; rest = 0; }
        }
        mass.style.transform = "translateX(" + x + "px)";
        coil.style.transform = "scaleX(" + (80 + x) / 80 + ")";
      },
      replay: reset
    };
  };

  FX.gravity = function (root) {
    var els = Array.prototype.slice.call(root.querySelectorAll(".amc-b"));
    var balls = [];
    var rest = 0;
    function drop() {
      balls = els.map(function (el, i) { return { el: el, y: rand(70, 108), vy: 0, delay: i * 0.12 }; });
      rest = 0;
    }
    drop();
    return {
      tick: function (dt) {
        var moving = false;
        balls.forEach(function (b) {
          if (b.delay > 0) { b.delay -= dt; moving = true; } else {
            b.vy -= 900 * dt; b.y += b.vy * dt;
            if (b.y <= 0) { b.y = 0; b.vy = -b.vy * 0.62; if (b.vy < 45) { b.vy = 0; } }
            if (b.y > 0 || b.vy !== 0) { moving = true; }
          }
          b.el.style.transform = "translateY(" + (-b.y) + "px)";
        });
        if (!moving) { rest += dt; if (rest > 0.8) { drop(); } }
      },
      replay: drop
    };
  };

  FX.pathMorph = function (root) {
    var path = root.querySelector(".amc-sv-morph path");
    var N = 96;
    var shapes = [
      function () { return 42; },
      function (t) { return 40 + 14 * Math.cos(5 * t); },
      function (t) { return 36 + 10 * Math.cos(8 * t); },
      function (t) { return 38 / Math.pow(Math.pow(Math.abs(Math.cos(t)), 4) + Math.pow(Math.abs(Math.sin(t)), 4), 0.25); }
    ];
    var i = 0;
    var t = 0;
    function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function d(fa, fb, k) {
      var s = "";
      for (var n = 0; n < N; n++) {
        var th = n / N * Math.PI * 2 - Math.PI / 2;
        var r = fa(th) * (1 - k) + fb(th) * k;
        s += (n ? "L" : "M") + (Math.cos(th) * r).toFixed(2) + " " + (Math.sin(th) * r).toFixed(2);
      }
      return s + "Z";
    }
    return {
      tick: function (dt) {
        t += dt;
        if (t > 1.7) { t = 0; i = (i + 1) % shapes.length; }
        var k = t > 0.6 ? Math.min(1, (t - 0.6) / 1.1) : 0;
        path.setAttribute("d", d(shapes[i], shapes[(i + 1) % shapes.length], ease(k)));
      },
      replay: function () { i = 0; t = 0; }
    };
  };

  FX.confetti = function (root, col) {
    var parts = [];
    var timer = 0;
    var c = canvas(root);
    function burst() {
      var cols = [col.c1, col.c2, col.c3, col.c4];
      for (var i = 0; i < 80; i++) {
        var a = -Math.PI / 2 + rand(-0.7, 0.7);
        var sp = rand(200, 330);
        parts.push({ x: c.w / 2, y: c.h + 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(0, 6), vr: rand(-7, 7), w: rand(5, 10), h: rand(8, 14), col: cols[i % 4] });
      }
      timer = 0;
    }
    burst();
    return {
      tick: function (dt) {
        if (!c.w) { return; }
        timer += dt;
        if (timer > 0.4 && parts.length < 10) { burst(); }
        var ctx = c.ctx;
        ctx.clearRect(0, 0, c.w, c.h);
        parts.forEach(function (p) {
          p.vy += 520 * dt; p.vx *= 1 - 1.2 * dt;
          p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
          var squeeze = Math.abs(Math.cos(p.r * 1.3));
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
          ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h * squeeze / 2, p.w, p.h * squeeze + 1);
          ctx.restore();
        });
        parts = parts.filter(function (p) { return p.y < c.h + 40; });
      },
      replay: function () { parts = []; burst(); }
    };
  };

  FX.starfield = function (root, col) {
    var c = canvas(root);
    var stars = [];
    function star(z) { return { x: rand(-1, 1), y: rand(-1, 1), z: z == null ? rand(0.05, 1) : z }; }
    function reset() { stars = []; for (var i = 0; i < 170; i++) { stars.push(star()); } }
    reset();
    return {
      tick: function (dt) {
        if (!c.w) { return; }
        var ctx = c.ctx, cx = c.w / 2, cy = c.h / 2, f = Math.min(c.w, c.h) * 0.5;
        ctx.clearRect(0, 0, c.w, c.h);
        ctx.lineCap = "round"; ctx.strokeStyle = col.fg;
        stars.forEach(function (s) {
          var pz = s.z;
          s.z -= dt * 0.45;
          if (s.z <= 0.02) { var n = star(1); s.x = n.x; s.y = n.y; s.z = 1; return; }
          var a = 1 - s.z;
          ctx.globalAlpha = a; ctx.lineWidth = a * 2.4 + 0.3;
          ctx.beginPath(); ctx.moveTo(cx + s.x / pz * f, cy + s.y / pz * f); ctx.lineTo(cx + s.x / s.z * f, cy + s.y / s.z * f); ctx.stroke();
        });
        ctx.globalAlpha = 1;
      },
      replay: reset
    };
  };

  FX.fireworks = function (root, col) {
    var c = canvas(root);
    var rockets = [], sparks = [], timer = 0;
    function launch() {
      var cols = [col.c1, col.c2, col.c3, col.c4];
      rockets.push({ x: c.w * rand(0.2, 0.8), y: c.h, vy: -rand(150, 190), col: cols[Math.random() * 4 | 0] });
    }
    function reset() { rockets = []; sparks = []; timer = 0; c.ctx.clearRect(0, 0, c.w, c.h); launch(); }
    reset();
    return {
      tick: function (dt) {
        if (!c.w) { return; }
        var ctx = c.ctx;
        timer += dt;
        if (timer > 0.9) { timer = 0; launch(); }
        fade(c, Math.min(1, dt * 10));
        rockets.forEach(function (r) {
          r.vy += 160 * dt; r.y += r.vy * dt;
          ctx.fillStyle = r.col; ctx.fillRect(r.x - 1, r.y, 2, 5);
          if (r.vy > -30) {
            r.dead = true;
            for (var i = 0; i < 46; i++) {
              var a = i / 46 * Math.PI * 2, sp = rand(50, 110);
              sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, col: r.col });
            }
          }
        });
        rockets = rockets.filter(function (r) { return !r.dead; });
        sparks.forEach(function (s) {
          s.vy += 60 * dt; s.vx *= 1 - 0.9 * dt; s.vy *= 1 - 0.9 * dt;
          s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 0.8;
          ctx.globalAlpha = Math.max(0, s.life); ctx.fillStyle = s.col; ctx.fillRect(s.x - 1, s.y - 1, 2.2, 2.2);
        });
        ctx.globalAlpha = 1;
        sparks = sparks.filter(function (s) { return s.life > 0; });
      },
      replay: reset
    };
  };

  FX.network = function (root, col) {
    var c = canvas(root);
    var pts = [];
    function reset() {
      pts = [];
      for (var i = 0; i < 26; i++) { pts.push({ x: rand(0, c.w), y: rand(0, c.h), vx: rand(-22, 22), vy: rand(-22, 22) }); }
    }
    reset();
    return {
      tick: function (dt) {
        if (!c.w) { return; }
        var ctx = c.ctx, w = c.w, h = c.h;
        ctx.clearRect(0, 0, w, h);
        pts.forEach(function (p) {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x < 0 || p.x > w) { p.vx *= -1; }
          if (p.y < 0 || p.y > h) { p.vy *= -1; }
          p.x = Math.max(0, Math.min(w, p.x)); p.y = Math.max(0, Math.min(h, p.y));
        });
        ctx.strokeStyle = col.c1; ctx.lineWidth = 1;
        for (var i = 0; i < pts.length; i++) {
          for (var j = i + 1; j < pts.length; j++) {
            var dd = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
            if (dd < 74) { ctx.globalAlpha = (1 - dd / 74) * 0.7; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
          }
        }
        ctx.globalAlpha = 1; ctx.fillStyle = col.c1;
        pts.forEach(function (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill(); });
      },
      replay: reset
    };
  };

  FX.flowField = function (root, col) {
    var c = canvas(root);
    var ps = [], time = 0;
    function spawn(p) { p.x = rand(0, c.w); p.y = rand(0, c.h); p.life = rand(1, 3); return p; }
    function reset() { ps = []; time = 0; for (var i = 0; i < 220; i++) { ps.push(spawn({ alt: i % 2 })); } c.ctx.clearRect(0, 0, c.w, c.h); }
    reset();
    return {
      tick: function (dt) {
        if (!c.w) { return; }
        var ctx = c.ctx, w = c.w, h = c.h;
        time += dt;
        fade(c, Math.min(1, Math.max(0.06, dt * 4)));
        ctx.lineWidth = 1.2;
        ps.forEach(function (p) {
          var a = (Math.sin(p.x * 0.018 + time * 0.4) + Math.cos(p.y * 0.022 - time * 0.3)) * Math.PI;
          var nx = p.x + Math.cos(a) * 38 * dt, ny = p.y + Math.sin(a) * 38 * dt;
          ctx.strokeStyle = p.alt ? col.c4 : col.c1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
          p.x = nx; p.y = ny; p.life -= dt;
          if (p.life < 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) { spawn(p); }
        });
      },
      replay: reset
    };
  };

  FX.galaxy = function (root, col) {
    var c = canvas(root);
    var st = [];
    function reset() {
      st = [];
      for (var i = 0; i < 420; i++) {
        var r = Math.pow(Math.random(), 0.7), arm = Math.random() * 3 | 0;
        st.push({ r: r, a: arm * 2.094 + r * 5 + rand(-0.3, 0.3), s: rand(0.6, 1.8) });
      }
    }
    reset();
    return {
      tick: function (dt) {
        if (!c.w) { return; }
        var ctx = c.ctx, cx = c.w / 2, cy = c.h / 2, R = Math.min(c.w, c.h) * 0.62;
        ctx.clearRect(0, 0, c.w, c.h);
        st.forEach(function (p) {
          p.a += dt * (0.25 + 0.9 * (1 - p.r));
          ctx.fillStyle = p.r < 0.35 ? col.c3 : p.r < 0.7 ? col.c2 : col.c1;
          ctx.globalAlpha = 0.35 + 0.65 * (1 - p.r);
          ctx.fillRect(cx + Math.cos(p.a) * p.r * R, cy + Math.sin(p.a) * p.r * R * 0.6, p.s, p.s);
        });
        ctx.globalAlpha = 1;
      },
      replay: reset
    };
  };

  /* ---------- wiring ---------- */
  function cssAnimations(root) {
    return root.getAnimations ? root.getAnimations({ subtree: true }).filter(function (a) {
      return typeof CSSAnimation === "undefined" || a instanceof CSSAnimation;
    }) : [];
  }

  function applySpeed(root, speed) {
    cssAnimations(root).forEach(function (a) { if (a.playbackRate !== speed) { a.playbackRate = speed; } });
  }

  function replay(inst) {
    cssAnimations(inst.root).forEach(function (a) { a.cancel(); a.play(); a.playbackRate = inst.speed; });
    if (inst.fx && inst.fx.replay) { inst.fx.replay(); inst.fx.tick(0); }
  }

  var io = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { en.target.amcVisible = en.isIntersecting; });
  }) : null;

  function init(scope) {
    var list = (scope || document).querySelectorAll(".amc-Motion--effect:not([data-amc-init])");
    Array.prototype.forEach.call(list, function (root) {
      root.setAttribute("data-amc-init", "Y");
      var inst = { root: root, speed: SPEEDS[root.getAttribute("data-amc-speed")] || 1, fx: null };
      var factory = FX[root.getAttribute("data-amc-fx")];
      if (factory) {
        inst.fx = factory(root, readColors(root));
        inst.fx.tick(0);
        if (root.querySelector(".amc-cv")) {
          // Canvas effects start once the component has a size (it may begin inside
          // a collapsed region or an inactive tab), then warm up so the component is
          // never empty at rest, and redraw after every resize (resizing clears it).
          var warmed = false;
          var redraw = function () {
            var r = root.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) { return; }
            if (!warmed) {
              warmed = true;
              inst.fx.replay();
              for (var i = 0; i < 40; i++) { inst.fx.tick(1 / 60); }
            }
            inst.fx.tick(0);
          };
          redraw();
          if (window.ResizeObserver) { new ResizeObserver(redraw).observe(root); }
        }
      }
      applySpeed(root, inst.speed);
      root.addEventListener("animationstart", function () { applySpeed(root, inst.speed); }, true);
      if (root.getAttribute("data-amc-replay") === "Y") {
        root.addEventListener("click", function () { replay(inst); });
      }
      root.amcVisible = true;
      if (io) { io.observe(root); }
      instances.push(inst);
    });
  }

  var last = 0;
  function frame(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    instances = instances.filter(function (inst) { return inst.root.isConnected; });
    if (!reduceMotion) {
      instances.forEach(function (inst) {
        if (inst.fx && inst.root.amcVisible) { inst.fx.tick(dt * inst.speed); }
      });
    }
    window.requestAnimationFrame(frame);
  }

  function start() {
    init(document);
    window.requestAnimationFrame(frame);
    new MutationObserver(function () { init(document); }).observe(document.body, { childList: true, subtree: true });
  }

  window.amcMotionEffect = { init: init, replay: function (el) {
    instances.forEach(function (inst) { if (inst.root === el || inst.root.contains(el)) { replay(inst); } });
  } };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
