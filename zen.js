/* =====================================================================
   zen.js — shared background, the opening, and the monk (home page)
   ---------------------------------------------------------------------
   一切有为法，如梦幻泡影 — motion here is sparse and passing.

   The opening (home page only, when a visit begins there; about five seconds):
   the eyes are closed; they open slowly, blink once; a breath swells
   through the scene; white fog rises and clears; birds cross while the
   pines move in the wind — and then everything settles into stillness.
   Click, tap, scroll or press any key to skip it.
   ===================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var INTRO_LEN = 5.2;                                  // seconds

  // Any page of the site marks the visit as begun, so the opening (home page
  // only) plays just once, and never while moving between sections.
  try { sessionStorage.setItem('zen-entered', '1'); } catch (e) { /* storage unavailable */ }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(t, a, b) { var x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); }
  function rng(seed) {                                  // small deterministic PRNG
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------------
     Theme: colours come from CSS variables, so the ink-wash landscape
     follows light and dark mode (see :root and [data-theme] in zen.css)
     ------------------------------------------------------------------ */
  var TC = {};
  function readTheme() {
    var cs = getComputedStyle(root);
    function v(n, d) { return (cs.getPropertyValue(n) || '').trim() || d; }
    TC.paper = [v('--cv-paper-1', '#f5f1e7'), v('--cv-paper-2', '#f3eee3'), v('--cv-paper-3', '#ede6d6')];
    TC.mount = v('--cv-mount', '46, 44, 38');
    TC.ink = v('--cv-ink', '34, 31, 26');
    TC.mist = v('--cv-mist', '246, 242, 234');
    TC.paperRgb = v('--paper-rgb', '243, 238, 227');
    TC.inkK = parseFloat(v('--cv-ink-k', '1')) || 1;
    TC.mountK = parseFloat(v('--cv-mount-k', '1')) || 1;
  }
  readTheme();

  // Day / night: follows the system until the visitor chooses; the choice is remembered
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function themeNow() {
    return root.getAttribute('data-theme') || (darkQuery && darkQuery.matches ? 'dark' : 'light');
  }
  function syncToggles() {
    var dark = themeNow() === 'dark';
    document.querySelectorAll('.theme-toggle').forEach(function (b) {
      b.setAttribute('aria-pressed', dark ? 'true' : 'false');
      b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      var label = b.querySelector('.theme-label');
      if (label) label.textContent = dark ? 'Day' : 'Night';
    });
  }
  function themeChanged() {
    readTheme();
    syncToggles();
    window.dispatchEvent(new Event('zen-theme'));
  }
  document.querySelectorAll('.theme-toggle').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = themeNow() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('zen-theme', next); } catch (e) { /* storage unavailable */ }
      themeChanged();
    });
  });
  if (darkQuery && darkQuery.addEventListener) {
    darkQuery.addEventListener('change', function () {
      if (!root.getAttribute('data-theme')) themeChanged();
    });
  }
  syncToggles();

  /* ------------------------------------------------------------------
     The top bar: slips away while reading (scrolling down), returns as
     soon as you scroll up, reach the top, or tab into it
     ------------------------------------------------------------------ */
  var topbar = document.getElementById('topbar');
  if (topbar) (function () {
    var menuBtn = topbar.querySelector('.menu-btn');
    var lastY = window.scrollY, ticking = false;

    function setOpen(open) {
      topbar.classList.toggle('is-open', open);
      if (menuBtn) {
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      }
      if (open) topbar.classList.remove('is-hidden');
    }
    function onScroll() {
      var y = window.scrollY, dy = y - lastY;
      topbar.classList.toggle('is-scrolled', y > 8);
      if (topbar.classList.contains('is-open') || topbar.querySelector(':focus-visible')) {
        topbar.classList.remove('is-hidden');
      } else if (y < 80) {
        topbar.classList.remove('is-hidden');
      } else if (dy > 6) {
        topbar.classList.add('is-hidden');            // reading on: let it go
      } else if (dy < -6) {
        topbar.classList.remove('is-hidden');         // looking back: here it is
      }
      if (Math.abs(dy) > 6 || y < 80) lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    topbar.addEventListener('focusin', function () { topbar.classList.remove('is-hidden'); });

    if (menuBtn) {
      menuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        setOpen(!topbar.classList.contains('is-open'));
      });
      document.addEventListener('click', function (e) {
        if (topbar.classList.contains('is-open') && !topbar.contains(e.target)) setOpen(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && topbar.classList.contains('is-open')) { setOpen(false); menuBtn.focus(); }
      });
      topbar.querySelectorAll('.topbar-link').forEach(function (a) {
        a.addEventListener('click', function () { setOpen(false); });
      });
    }
    onScroll();
  })();

  /* sections and list rows rise gently into view */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var revealIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.sec-head, .about-grid, .pub, .home-photo-feature, .more').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) {   // only what is still below the fold
        el.classList.add('reveal');
        revealIO.observe(el);
      }
    });
  }

  /* ------------------------------------------------------------------
     Background canvas
     ------------------------------------------------------------------ */
  var canvas = document.getElementById('zen-canvas');
  var intro = null;                                     // set below if the opening plays

  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var still = document.createElement('canvas');      // mountains, drawn once per resize
    var sctx = still.getContext('2d');
    var W = 0, H = 0, DPR = 1;

    // deterministic ridges so the mountains never jump on resize
    function ridge(x, seed, amp) {
      return amp * (
        0.50 * Math.sin(x * 1.7 + seed) +
        0.28 * Math.sin(x * 4.3 + seed * 2.1) +
        0.14 * Math.sin(x * 9.7 + seed * 3.7) +
        0.08 * Math.sin(x * 21.0 + seed * 5.3)
      );
    }
    var RANGES = [                                      // base, amp, seed, alpha, fade
      [0.70, 0.20, 1.3, 0.045, 0.25],
      [0.80, 0.15, 4.1, 0.055, 0.20],
      [0.92, 0.10, 7.7, 0.070, 0.12]
    ];
    function ridgeY(i, x) {
      var r = RANGES[i], m = Math.min(H, 900), amp = m * r[1];
      return H * r[0] - Math.abs(ridge(x / W * 3.2, r[2], amp)) - amp * 0.25;
    }

    function paintStill() {
      still.width = W * DPR; still.height = H * DPR;
      sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var g = sctx.createLinearGradient(0, 0, 0, H);   // rice paper
      g.addColorStop(0, TC.paper[0]);
      g.addColorStop(0.6, TC.paper[1]);
      g.addColorStop(1, TC.paper[2]);
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, W, H);

      var m = Math.min(H, 900);
      RANGES.forEach(function (r, i) {                 // three ink-wash ranges, far to near
        var amp = m * r[1], base = H * r[0];
        var mg = sctx.createLinearGradient(0, base - amp * 1.4, 0, base + m * r[4]);
        mg.addColorStop(0, 'rgba(' + TC.mount + ',' + r[3] * TC.mountK + ')');
        mg.addColorStop(0.45, 'rgba(' + TC.mount + ',' + (r[3] * 0.55 * TC.mountK) + ')');
        mg.addColorStop(1, 'rgba(' + TC.mount + ', 0)');
        sctx.fillStyle = mg;
        sctx.beginPath();
        sctx.moveTo(0, H);
        for (var x = 0; x <= W; x += 4) sctx.lineTo(x, ridgeY(i, x));
        sctx.lineTo(W, H);
        sctx.closePath();
        sctx.fill();
      });
    }

    /* ---- pines (松), painted the classical way: an S-curved ink trunk,
            near-level branches, and flat pads of needle fans (车轮松针) ---- */
    function Pine(fx, range, hFrac, seed, alpha, flip) {
      this.fx = fx; this.range = range; this.hFrac = hFrac;
      this.alpha = alpha; this.flip = flip ? -1 : 1;
      var r = rng(seed);
      this.lean = 0.10 + r() * 0.16;                  // leans toward the page centre
      this.bend = (r() - 0.5) * 0.30;
      this.phase = r() * Math.PI * 2;
      this.bark = [];
      for (var i = 0; i < 7; i++) this.bark.push([0.08 + r() * 0.8, (r() - 0.5) * 0.8, 0.03 + r() * 0.05]);

      function makePad(width) {
        var fans = [], n = Math.max(4, Math.round(width * 16));
        for (var k = 0; k < n; k++) {
          var needles = [], m = 9 + Math.floor(r() * 4);
          for (var q = 0; q < m; q++) {
            var a = Math.PI * (1.08 + 0.84 * q / (m - 1)) + (r() - 0.5) * 0.12;   // upper half-circle
            needles.push([a, 0.75 + r() * 0.3]);
          }
          var e = Math.abs(k / (n - 1) - 0.5) * 2;                      // 0 centre → 1 edge
          fans.push({ u: (k / (n - 1) - 0.5) * (0.92 + r() * 0.08), v: (k % 2 ? -0.55 : 0.15) + (r() - 0.5) * 0.3 + e * e * 0.5,
                      s: (0.8 + r() * 0.35) * (1 - e * 0.35), needles: needles });
        }
        return { w: width, fans: fans };
      }

      this.branches = [];
      var nb = 5;
      for (var b = 0; b < nb; b++) {
        var f = 0.40 + b * (0.50 / nb) + r() * 0.05;
        var side = b === nb - 1 ? 1 : (b % 2 ? -1 : 1) * (r() < 0.8 ? 1 : -1);
        var len = (0.42 - b * 0.06) * (0.85 + r() * 0.3);
        this.branches.push({
          f: f, side: side, len: len,
          lift: 0.02 + r() * 0.14,
          droop: 0.05 + r() * 0.06,
          phase: r() * Math.PI * 2,
          pads: [ { t: 1.0, pad: makePad(len * 0.85) },
                  { t: 0.55, pad: makePad(len * 0.55) } ]
        });
      }
      this.crown = makePad(0.30);
    }

    Pine.prototype.draw = function (c, time, wind) {
      var h = H * this.hFrac * Math.min(1, Math.sqrt(W / 1100));   // smaller on narrow screens
      this.h = h;
      if (h < 20) { this.padPts = null; return; }
      var kick = this.kick || 0;
      wind = wind + kick * 1.2;                       // a touched tree tosses in the wind
      var x0 = W * this.fx, y0 = ridgeY(this.range, x0) + h * 0.03;
      var dir = this.flip, self = this;
      var sway = wind * h * 0.030 * Math.sin(time * 1.25 + this.phase)
               + wind * h * 0.010 * Math.sin(time * 2.9 + this.phase * 2)
               + kick * h * 0.022 * Math.sin(time * 8.5 + this.phase);
      function trunkAt(f) {
        return [x0 + dir * (self.lean * f + self.bend * Math.sin(Math.PI * f) * 0.5) * h + sway * f * f,
                y0 - h * f];
      }
      var ink = 'rgba(' + TC.ink + ',', A = this.alpha * TC.inkK;
      c.lineCap = 'round'; c.lineJoin = 'round';

      // trunk: one tapering ink shape (no overlaps, so no beading), then dry bark strokes
      var SEG = 18, L = [], Rr = [];
      for (var s = 0; s <= SEG; s++) {
        var f = s / SEG, a = trunkAt(Math.max(0, f - 0.01)), b = trunkAt(Math.min(1, f + 0.01));
        var tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
        var half = Math.max(0.6, h * (0.024 - 0.017 * f) * (1 + 0.12 * Math.sin(f * 17 + this.phase)));
        var p = trunkAt(f);
        L.push([p[0] - ty / tl * half, p[1] + tx / tl * half]);
        Rr.push([p[0] + ty / tl * half, p[1] - tx / tl * half]);
      }
      c.fillStyle = ink + Math.min(A * 1.7, 0.6) + ')';
      c.beginPath();
      c.moveTo(L[0][0], L[0][1]);
      for (s = 1; s <= SEG; s++) c.lineTo(L[s][0], L[s][1]);
      for (s = SEG; s >= 0; s--) c.lineTo(Rr[s][0], Rr[s][1]);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(' + TC.paperRgb + ',' + (A * 1.2) + ')';
      c.lineWidth = Math.max(0.6, h * 0.004);
      for (var k = 0; k < this.bark.length; k++) {
        var bk = this.bark[k], p = trunkAt(bk[0]), q = trunkAt(bk[0] + bk[2]);
        var off = bk[1] * h * 0.012;
        c.beginPath(); c.moveTo(p[0] + off, p[1]); c.lineTo(q[0] + off * 0.6, q[1]); c.stroke();
      }

      var pads = [];
      // branches
      c.strokeStyle = ink + Math.min(A * 1.5, 0.55) + ')';
      for (var i = 0; i < this.branches.length; i++) {
        var br = this.branches[i];
        var base = trunkAt(br.f), len = br.len * h;
        var ang = br.lift + wind * 0.07 * br.f * Math.sin(time * 1.6 + br.phase);
        var sx = br.side * dir;
        var ex = base[0] + Math.cos(ang) * len * sx, ey = base[1] - Math.sin(ang) * len;
        var cx = base[0] + Math.cos(ang) * len * 0.5 * sx, cy = base[1] - Math.sin(ang) * len * 0.5 + br.droop * len;
        c.lineWidth = Math.max(0.8, h * 0.010);
        c.beginPath(); c.moveTo(base[0], base[1]); c.quadraticCurveTo(cx, cy, ex, ey); c.stroke();
        for (var j = 0; j < br.pads.length; j++) {
          var t = br.pads[j].t, mt = 1 - t;
          var px = mt * mt * base[0] + 2 * mt * t * cx + t * t * ex;
          var py = mt * mt * base[1] + 2 * mt * t * cy + t * t * ey;
          pads.push([px, py - h * 0.012, br.pads[j].pad, ang * 0.3 * -sx]);
        }
      }
      var top = trunkAt(1);
      pads.push([top[0], top[1] - h * 0.01, this.crown, 0]);

      // pads: a pale wash underneath, needle fans on top
      c.fillStyle = ink + (A * 0.42) + ')';
      for (i = 0; i < pads.length; i++) {
        var pd = pads[i], w = pd[2].w * h;
        c.beginPath();
        c.ellipse(pd[0], pd[1] + w * 0.04, w * 0.55, w * 0.13, pd[3], 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = ink + Math.min(A * 2.2, 0.7) + ')';
      c.lineWidth = Math.max(0.5, h * 0.0022);
      c.beginPath();
      for (i = 0; i < pads.length; i++) {
        pd = pads[i]; w = pd[2].w * h;
        var fr = Math.max(4, w * 0.20);
        for (var fi = 0; fi < pd[2].fans.length; fi++) {
          var fan = pd[2].fans[fi];
          var fx = pd[0] + fan.u * w, fy = pd[1] + fan.v * fr + Math.sin(pd[3]) * fan.u * w;
          var R = fr * fan.s;
          for (var n = 0; n < fan.needles.length; n++) {
            var nd = fan.needles[n];
            c.moveTo(fx, fy);
            c.lineTo(fx + Math.cos(nd[0]) * R * nd[1], fy + Math.sin(nd[0]) * R * nd[1] * 0.8);
          }
        }
      }
      c.stroke();

      // remember the shape, for touching and for the birds that perch here
      this.padPts = pads.map(function (pp) { return [pp[0], pp[1], pp[2].w * h]; });
      this.trunkPts = [];
      for (var tp = 0; tp <= 10; tp++) this.trunkPts.push(trunkAt(tp / 10));
    };

    Pine.prototype.hit = function (x, y) {
      if (!this.padPts) return false;
      var i, p;
      for (i = 0; i < this.padPts.length; i++) {
        p = this.padPts[i];
        if (Math.abs(x - p[0]) < p[2] * 0.6 && Math.abs(y - p[1]) < Math.max(14, p[2] * 0.22)) return true;
      }
      var reach = Math.max(12, this.h * 0.04);
      for (i = 0; i < this.trunkPts.length; i++) {
        p = this.trunkPts[i];
        if (Math.abs(x - p[0]) < reach && Math.abs(y - p[1]) < this.h * 0.06) return true;
      }
      return false;
    };

    var pines = [
      new Pine(0.045, 2, 0.42, 11, 0.20, false),
      new Pine(0.950, 2, 0.36, 23, 0.20, true),
      new Pine(0.310, 1, 0.10, 37, 0.07, false),
      new Pine(0.665, 0, 0.08, 41, 0.06, true)
    ];

    /* ---- mist: a few slow, wide puffs low in the valley ---- */
    function Mist() { this.reset(true); }
    Mist.prototype.reset = function (init) {
      this.r = 160 + Math.random() * 220;
      this.x = init ? Math.random() * W : -this.r;
      this.y = H * (0.66 + Math.random() * 0.26);
      this.a = 0.22 + Math.random() * 0.2;
      this.v = 3 + Math.random() * 4;                  // px per second
    };
    Mist.prototype.step = function (dt) {
      this.x += this.v * dt;
      if (this.x - this.r > W) this.reset(false);
    };
    Mist.prototype.draw = function (c) {
      var g = c.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
      g.addColorStop(0, 'rgba(' + TC.mist + ',' + this.a + ')');
      g.addColorStop(1, 'rgba(' + TC.mist + ', 0)');
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(this.x, this.y, this.r, this.r * 0.32, 0, 0, Math.PI * 2);
      c.fill();
    };

    /* ---- birds ---- */
    function drawBird(c, x, y, s, phase, alpha) {
      var wing = Math.sin(phase) * 5 * s;
      c.save();
      c.translate(x, y);
      c.strokeStyle = 'rgba(' + TC.ink + ',' + Math.min(1, alpha * TC.inkK) + ')';
      c.lineWidth = 1.1;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(-9 * s, -wing * 0.4);
      c.quadraticCurveTo(-4 * s, -wing, 0, 0);
      c.quadraticCurveTo(4 * s, -wing, 9 * s, -wing * 0.4);
      c.stroke();
      c.restore();
    }

    // a flock that crosses during the opening
    var flock = [];
    for (var fi = 0; fi < 7; fi++) {
      var k = Math.ceil(fi / 2), side = fi % 2 ? 1 : -1;
      flock.push({ dx: -k * 34 - Math.random() * 6, dy: side * k * 15 + Math.random() * 6,
                   s: 0.75 + Math.random() * 0.35, phase: Math.random() * 6, rate: 9 + Math.random() * 3 });
    }
    var flockT = -1;                                   // seconds since the flock set off

    // afterwards: one bird at a time, rarely
    var bird = null;
    var nextBirdIn = 14 + Math.random() * 10;           // seconds

    var mists = [];
    var clock = 0;                                      // seconds of visible animation
    var wind = 0.15;                                    // resting breath of the pines

    /* ------------------------------------------------------------------
       Touching the pines: they toss, leaves fall, perched birds take flight
       ------------------------------------------------------------------ */
    var leaves = [], fliers = [];

    // birds resting in the two large pines
    var perches = [];
    [[0, 3], [1, 2]].forEach(function (pc) {
      for (var i = 0; i < pc[1]; i++) {
        perches.push({ tree: pc[0], pad: 1 + i * 2, u: (Math.random() - 0.5) * 0.5,
                       s: 0.85 + Math.random() * 0.3, face: Math.random() < 0.5 ? -1 : 1,
                       alpha: 1, gone: false, back: 0 });
      }
    });

    function drawPerched(c, x, y, s, face, alpha) {
      c.save();
      c.translate(x, y);
      c.scale(face, 1);
      c.fillStyle = 'rgba(' + TC.ink + ',' + Math.min(1, 0.62 * alpha * TC.inkK) + ')';
      c.beginPath(); c.ellipse(0, 0, 4.6 * s, 2.9 * s, -0.25, 0, Math.PI * 2); c.fill();     // body
      c.beginPath(); c.arc(4.2 * s, -2.6 * s, 2.1 * s, 0, Math.PI * 2); c.fill();               // head
      c.strokeStyle = c.fillStyle; c.lineWidth = 1.2 * s; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-4 * s, 0.6 * s); c.lineTo(-8.5 * s, 2.4 * s); c.stroke();        // tail
      c.lineWidth = 0.8 * s;
      c.beginPath(); c.moveTo(6.1 * s, -2.7 * s); c.lineTo(7.8 * s, -2.3 * s); c.stroke();      // beak
      c.restore();
    }

    function perchPos(p) {
      var t = pines[p.tree], pad = t.padPts && t.padPts[p.pad % t.padPts.length];
      if (!pad) return null;
      return [pad[0] + p.u * pad[2] * 0.5, pad[1] - Math.max(3, pad[2] * 0.05) - 3 * p.s];
    }

    // a startled bird: flies off on its own wandering path
    function takeOff(x, y, s, awayX) {
      var away = awayX < W / 2 ? 1 : -1;
      fliers.push({
        x: x, y: y, s: s, t: 0, phase: Math.random() * 6,
        heading: -Math.PI / 2 + away * (0.35 + Math.random() * 0.8) * (Math.random() < 0.85 ? 1 : -1),
        turn: (Math.random() - 0.5) * 0.7,                       // slow curve, radians per second
        w1: 1.5 + Math.random() * 2, w2: 3 + Math.random() * 3,  // wobble frequencies
        p1: Math.random() * 6, p2: Math.random() * 6,
        speed: 70 + Math.random() * 40, top: 170 + Math.random() * 90
      });
    }

    function dropLeaf(x, y, push) {
      var kind = Math.random() < 0.55 ? 0 : 1;
      leaves.push({
        x: x, y: y, t: 0,
        vy: 8 + Math.random() * 18, term: 32 + Math.random() * 34,         // terminal fall speed
        drift: (push || 0) * (0.4 + Math.random()) + (Math.random() - 0.5) * 22,
        amp: 14 + Math.random() * 30, freq: 1.2 + Math.random() * 1.8, ph: Math.random() * 6,
        rot: Math.random() * 6, len: 5 + Math.random() * 5, kind: kind, a: 0.5 + Math.random() * 0.25
      });
    }

    function rustle(tree, px) {
      tree.kick = Math.min(1, (tree.kick || 0) + 0.8);
      if (clock - (tree.lastDrop || -9) < 0.9 || !tree.padPts) return;
      tree.lastDrop = clock;
      var push = px < W * tree.fx ? 25 : -25;                  // leaves blow away from the touch
      var n = 16 + Math.floor(Math.random() * 12);
      for (var i = 0; i < n; i++) {
        var pad = tree.padPts[Math.floor(Math.random() * tree.padPts.length)];
        dropLeaf(pad[0] + (Math.random() - 0.5) * pad[2] * 0.9, pad[1] + Math.random() * 6, push);
      }
      perches.forEach(function (p) {
        if (pines[p.tree] !== tree || p.gone) return;
        var pos = perchPos(p);
        if (pos) takeOff(pos[0], pos[1], p.s, W * tree.fx);
        p.gone = true; p.alpha = 0; p.back = 25 + Math.random() * 20;   // they return, in time
      });
    }

    function stepLife(dt) {
      var i;
      for (i = 0; i < pines.length; i++) if (pines[i].kick) pines[i].kick = Math.max(0, pines[i].kick - dt * 0.6);

      for (i = leaves.length - 1; i >= 0; i--) {
        var l = leaves[i];
        l.t += dt;
        l.vy += (l.term - l.vy) * Math.min(1, dt * 1.5);
        l.y += l.vy * dt;
        l.x += (l.drift + l.amp * l.freq * Math.cos(l.t * l.freq + l.ph)) * dt;
        l.drift *= 1 - dt * 0.4;
        l.rot += Math.cos(l.t * l.freq + l.ph) * 2.2 * dt;
        if (l.y > H + 20 || l.t > 18) leaves.splice(i, 1);
      }

      for (i = fliers.length - 1; i >= 0; i--) {
        var f = fliers[i];
        f.t += dt;
        f.speed += (f.top - f.speed) * Math.min(1, dt * 1.2);
        // the path wanders: a slow curve plus two wobbles
        var hd = f.heading + f.turn * f.t + 0.35 * Math.sin(f.t * f.w1 + f.p1) + 0.15 * Math.sin(f.t * f.w2 + f.p2);
        f.x += Math.cos(hd) * f.speed * dt;
        f.y += Math.sin(hd) * f.speed * dt;
        if (f.x < -60 || f.x > W + 60 || f.y < -60 || f.y > H + 60 || f.t > 20) fliers.splice(i, 1);
      }

      perches.forEach(function (p) {
        if (!p.gone) { if (p.alpha < 1) p.alpha = Math.min(1, p.alpha + dt * 0.7); return; }
        p.back -= dt;
        if (p.back <= 0) { p.gone = false; p.alpha = 0; p.u = (Math.random() - 0.5) * 0.5; }
      });

      // now and then, a single needle-cluster lets go by itself
      if (Math.random() < dt / 7) {
        var tr = pines[Math.random() < 0.5 ? 0 : 1];
        if (tr.padPts) { var pd = tr.padPts[Math.floor(Math.random() * tr.padPts.length)]; dropLeaf(pd[0], pd[1], 0); }
      }
    }

    function drawLife(c) {
      var i;
      perches.forEach(function (p) {
        if (p.gone || p.alpha <= 0) return;
        var pos = perchPos(p);
        if (pos) drawPerched(c, pos[0], pos[1], p.s, p.face, p.alpha);
      });
      for (i = 0; i < leaves.length; i++) {
        var l = leaves[i];
        var fade = Math.min(1, l.t * 3) * (l.y > H * 0.93 ? Math.max(0, 1 - (l.y - H * 0.93) / (H * 0.07)) : 1);
        c.save();
        c.translate(l.x, l.y);
        c.rotate(l.rot);
        c.globalAlpha = l.a * fade;
        if (l.kind === 0) {                                 // a little bundle of pine needles
          c.strokeStyle = 'rgb(' + TC.ink + ')'; c.lineWidth = 0.9; c.lineCap = 'round';
          c.beginPath();
          c.moveTo(0, 0); c.lineTo(-l.len * 0.35, -l.len);
          c.moveTo(0, 0); c.lineTo(l.len * 0.35, -l.len);
          c.moveTo(0, 0); c.lineTo(0, -l.len * 1.05);
          c.stroke();
        } else {                                            // a small ink leaf
          c.fillStyle = 'rgb(' + TC.ink + ')';
          c.beginPath(); c.ellipse(0, 0, l.len * 0.55, l.len * 0.2, 0, 0, Math.PI * 2); c.fill();
        }
        c.restore();
      }
      for (i = 0; i < fliers.length; i++) {
        var f = fliers[i];
        drawBird(c, f.x, f.y, f.s * (1 + Math.min(f.t, 2) * 0.1), f.phase + f.t * 14, 0.6);
      }
    }

    // touching: tap/click anywhere on a pine; with a mouse, brushing past it is enough
    function touchAt(x, y, target) {
      if (target && target.closest &&
          target.closest('a, button, input, textarea, select, label, summary, dialog, img, #monk-band, .stupa-figure')) return;
      for (var i = 0; i < pines.length; i++) {
        if (pines[i].hFrac >= 0.2 && pines[i].hit(x, y)) rustle(pines[i], x);
      }
    }
    if (!reduceMotion) {
      window.addEventListener('pointerdown', function (e) { touchAt(e.clientX, e.clientY, e.target); }, { passive: true });
      window.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'mouse') touchAt(e.clientX, e.clientY, e.target);
      }, { passive: true });
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      paintStill();
      if (!mists.length) for (var i = 0; i < 6; i++) mists.push(new Mist());
      render();
      if (intro) intro.resize();
    }

    function render() {
      ctx.drawImage(still, 0, 0, W, H);
      for (var i = 0; i < pines.length; i++) pines[i].draw(ctx, clock, wind);
      for (i = 0; i < mists.length; i++) mists[i].draw(ctx);
      drawLife(ctx);
      if (flockT >= 0) {
        // enters the opening eyes from the left, crosses the middle by ~3 s, climbs away
        var lx = W * 0.10 + flockT * (W * 1.05) / 6.0;
        var ly = H * 0.42 - flockT * H * 0.028 + Math.sin(flockT * 0.9) * 10;
        for (i = 0; i < flock.length; i++) {
          var b = flock[i];
          drawBird(ctx, lx + b.dx, ly + b.dy, b.s, b.phase + flockT * b.rate, 0.6);
        }
      }
      if (bird) drawBird(ctx, bird.x, bird.y0 + Math.sin(bird.t * 0.7) * 8, bird.s, bird.t * 5.4, 0.55);
    }

    var last = 0;
    function loop(now) {
      var raw = last ? (now - last) / 1000 : 0.016;
      var dt = Math.min(raw, 0.05);                      // smooth motion, even after a tab switch
      last = now;
      clock += dt;

      // the opening keeps real time (about five seconds on any device),
      // but does not race ahead while the tab is in the background
      if (intro) intro.step(raw > 0.5 ? 0.016 : raw);
      for (var i = 0; i < mists.length; i++) mists[i].step(dt);
      stepLife(dt);

      if (flockT >= 0) {
        flockT += dt;
        if (flockT > 7.5) flockT = -1;
      }
      if (!bird && flockT < 0) {
        nextBirdIn -= dt;
        if (nextBirdIn <= 0) {
          var dir = Math.random() < 0.5 ? 1 : -1;
          bird = { dir: dir, x: dir > 0 ? -30 : W + 30, y0: H * (0.12 + Math.random() * 0.22),
                   v: 20 + Math.random() * 12, s: 0.7 + Math.random() * 0.4, t: Math.random() * 10 };
        }
      }
      if (bird) {
        bird.x += bird.v * bird.dir * dt;
        bird.t += dt;
        if (bird.x < -40 || bird.x > W + 40) {
          bird = null;
          nextBirdIn = 20 + Math.random() * 25;        // and then, emptiness
        }
      }
      render();
      requestAnimationFrame(loop);
    }

    /* ------------------------------------------------------------------
       The opening: closed eyes → opening, a blink, a breath, fog rising
       ------------------------------------------------------------------ */
    if (root.classList.contains('zen-intro') && !reduceMotion) {
      intro = (function () {

        var ov = document.createElement('canvas');
        ov.id = 'zen-intro';
        ov.setAttribute('aria-hidden', 'true');
        document.body.appendChild(ov);
        var oc = ov.getContext('2d');
        var t = 0, done = false, revealed = false, OW = 0, OH = 0;

        // fog: large soft white puffs that rise and thin away
        var puffs = [];
        for (var i = 0; i < 30; i++) {
          puffs.push({ fx: Math.random(), fy: 0.05 + Math.random() * 1.25,
                       r: 0.22 + Math.random() * 0.30, vy: 0.09 + Math.random() * 0.13,
                       a: 0.25 + Math.random() * 0.25, drift: (Math.random() - 0.5) * 0.02 });
        }

        // how open the eyes are, 0 = closed, 1 = fully open
        function openness(s) {
          if (s < 0.35) return 0;
          if (s < 1.75) return 0.55 * smooth(s, 0.35, 1.75) + 0.03 * Math.sin(s * 3);  // drowsy, half-open
          if (s < 2.05) return 0.55 + 0.03 * Math.sin(s * 3);
          if (s < 2.20) return 0.58 * (1 - smooth(s, 2.05, 2.20));                        // the blink
          if (s < 2.32) return 0;
          return smooth(s, 2.32, 3.35);                                                    // and awake
        }

        function resizeOv() {
          OW = window.innerWidth; OH = window.innerHeight;
          ov.width = OW; ov.height = OH;               // soft visuals: 1x is plenty
        }

        function drawLids(o) {
          if (o >= 1) return;
          var cy = OH / 2, travel = cy + OH * 0.35, pad = 60;
          var apex = cy - o * travel, side = cy - o * travel * 0.6;
          oc.save();
          if ('filter' in oc) oc.filter = 'blur(' + Math.round(10 + 14 * (1 - o)) + 'px)';
          oc.fillStyle = '#16130f';
          // upper lid
          oc.beginPath();
          oc.moveTo(-pad, -pad); oc.lineTo(OW + pad, -pad); oc.lineTo(OW + pad, side);
          oc.quadraticCurveTo(OW / 2, 2 * apex - side, -pad, side);
          oc.closePath(); oc.fill();
          // lower lid
          var bApex = OH - apex, bSide = OH - side;
          oc.beginPath();
          oc.moveTo(-pad, OH + pad); oc.lineTo(OW + pad, OH + pad); oc.lineTo(OW + pad, bSide);
          oc.quadraticCurveTo(OW / 2, 2 * bApex - bSide, -pad, bSide);
          oc.closePath(); oc.fill();
          oc.restore();
          // the dimness of just-opened eyes at the edges
          var v = oc.createRadialGradient(OW / 2, OH / 2, Math.min(OW, OH) * 0.2, OW / 2, OH / 2, Math.max(OW, OH) * 0.75);
          v.addColorStop(0, 'rgba(22, 19, 15, 0)');
          v.addColorStop(1, 'rgba(22, 19, 15,' + (0.55 * (1 - o)) + ')');
          oc.fillStyle = v;
          oc.fillRect(0, 0, OW, OH);
        }

        function drawFog(s) {
          var wash = 0.62 * (1 - smooth(s, 0.8, 3.6));
          if (wash > 0.002) {
            oc.fillStyle = 'rgba(' + TC.paperRgb + ',' + wash + ')';
            oc.fillRect(0, 0, OW, OH);
          }
          var fade = 1 - smooth(s, 2.6, INTRO_LEN);
          if (fade <= 0) return;
          var big = Math.max(OW, OH);
          for (var i = 0; i < puffs.length; i++) {
            var p = puffs[i];
            var rise = p.vy * s + 0.02 * s * s;          // rising, slowly gathering speed
            var x = (p.fx + p.drift * s) * OW, y = (p.fy - rise) * OH, r = p.r * big;
            if (y + r < 0) continue;
            var g = oc.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(' + TC.mist + ',' + (p.a * fade) + ')');
            g.addColorStop(1, 'rgba(' + TC.mist + ', 0)');
            oc.fillStyle = g;
            oc.beginPath();
            oc.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2);
            oc.fill();
          }
        }

        function draw() {
          oc.clearRect(0, 0, OW, OH);
          drawFog(t);
          drawLids(openness(t));
        }

        function finish(fast) {
          if (done) return;
          done = true;
          root.classList.add('zen-reveal');
          ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
            window.removeEventListener(ev, skip, true);
          });
          canvas.style.transform = '';
          ov.style.transition = 'opacity ' + (fast ? 0.5 : 0.9) + 's ease';
          ov.style.opacity = '0';
          wind = 0.15;
          setTimeout(function () {
            if (ov.parentNode) ov.parentNode.removeChild(ov);
            root.classList.remove('zen-intro', 'zen-ready', 'zen-reveal');
            intro = null;
          }, fast ? 550 : 950);
        }
        function skip() { finish(true); }
        ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
          window.addEventListener(ev, skip, { capture: true, passive: true });
        });

        resizeOv();
        draw();
        root.classList.add('zen-ready');               // overlay is painted; drop the CSS cover
        flockT = 0;                                    // the flock sets off as the eyes begin to open

        return {
          resize: function () { resizeOv(); draw(); },
          step: function (dt) {
            if (done) return;
            t += dt;
            // one slow breath: the scene swells on the inhale and settles on the exhale
            var breath = (1 - Math.cos(2 * Math.PI * Math.min(t / INTRO_LEN, 1))) / 2;
            canvas.style.transform = 'scale(' + (1 + 0.03 * breath).toFixed(4) + ')';
            // the wind in the pines, strong at first, then calming to a breath
            wind = 0.15 + 0.85 * (1 - smooth(t, 2.5, INTRO_LEN + 1.5));
            if (!revealed && t > 3.0) { revealed = true; root.classList.add('zen-reveal'); }
            draw();
            if (t >= INTRO_LEN) finish(false);
          }
        };
      })();
    } else {
      root.classList.remove('zen-intro');
    }

    window.addEventListener('zen-theme', function () { readTheme(); paintStill(); render(); });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 120);
    });
    resize();
    if (!reduceMotion) requestAnimationFrame(loop);
  } else {
    root.classList.remove('zen-intro');
  }

  /* ------------------------------------------------------------------
     The jeweled stupa (Buddhism translations page): touch it, and one of
     the seven jewels falls along its own path; its meaning appears.
     ------------------------------------------------------------------ */
  var stupaFig = document.querySelector('.stupa-figure');
  if (stupaFig) (function () {
    // 七圣财 — the seven noble treasures, each matched with one of the seven jewels
    var TREASURES = [
      { name: '信财（信仰）', gem: '金', en: 'Belief', gemEn: 'Gold',
        text: '深信佛法及正道，是一切善行的根源与入门之本。',
        textEn: 'Deep faith in the Dharma and the right path: the root of all good deeds, and the gate through which one enters.' },
      { name: '戒财（持戒）', gem: '银', en: 'Precept', gemEn: 'Silver',
        text: '严守道德规范与行为准则，止恶防非，保持身口意清净。',
        textEn: 'Keeping firmly to moral discipline and right conduct, ceasing wrongdoing and guarding against error, so that body, speech and mind stay pure.' },
      { name: '惭财（自惭）', gem: '琉璃', en: 'Ashamed', gemEn: 'Lapis lazuli',
        text: '自我觉知不足、良心自觉，对自身不善或不当的行为产生羞耻心而力求改进。',
        textEn: 'Seeing one\'s own shortcomings with an awakened conscience: feeling shame at one\'s unwholesome or improper deeds, and striving to do better.' },
      { name: '愧财（羞愧）', gem: '砗磲', en: 'Regret', gemEn: 'Tridacna shell',
        text: '顾及他人与社会道义，反省自己未能尽责而心存羞愧，从而规范自身、关怀他人。',
        textEn: 'Mindful of others and of what is right in society, one reflects on where one has fallen short of one\'s duty; this remorse guides one\'s conduct and one\'s care for others.' },
      { name: '闻财（多闻）', gem: '玛瑙', en: 'Listening', gemEn: 'Agate',
        text: '听闻正法与博学多识，开阔心智与视野。',
        textEn: 'Hearing the true Dharma and learning widely, which opens the mind and broadens one\'s view.' },
      { name: '施财（布施 / 舍离）', gem: '真珠', en: 'Relinquishing', gemEn: 'Pearl',
        text: '乐于给予，慷慨布施（财施、法施、无畏施），舍弃悭贪与执著。',
        textEn: 'Delighting in giving, generous with material gifts, the gift of the Dharma, and the gift of fearlessness, and letting go of stinginess and attachment.' },
      { name: '慧财（智慧 / 定慧）', gem: '玫瑰', gemNote: '一说玻璃，或珊瑚', en: 'Wisdom', gemEn: 'Red gem',
        text: '抉择真理、洞察法相、断除烦恼的最高财富，能让人究竟解脱。',
        textEn: 'The highest wealth: discerning the truth, seeing into the nature of all things, and cutting off the afflictions, leading to complete liberation.' }
    ];
    var SVGNS = 'http://www.w3.org/2000/svg';
    var btn = stupaFig.querySelector('.stupa-btn');
    var svg = btn.querySelector('svg');
    var body = document.querySelector('#treasure-panel .t-body');
    var jewels = Array.prototype.slice.call(svg.querySelectorAll('.jewel'));

    /* ---- the seven jewels, cut anew on every visit ----
       Each jewel gets a random shape — faceted (brilliant, oval, cushion,
       emerald, pear, marquise, trillion, hexagon) or a polished cabochon —
       shaded facet by facet against one light from the upper left, with a
       specular gleam and a small sparkle, so it reads as solid and glossy. */
    var GEM_STYLE = [
      // dark, mid, light, how it is cut
      { c: ['#5e4006', '#d4a12a', '#fff0b8'], cut: 'facet' },                 // 金 gold
      { c: ['#4f555c', '#bfc5cc', '#ffffff'], cut: 'facet' },                 // 银 silver
      { c: ['#0c1f4a', '#2a55a4', '#9ab7ee'], cut: 'opaque', fleck: '#e7c457' }, // 琉璃 lapis lazuli
      { c: ['#9c8f74', '#ece3d0', '#ffffff'], cut: 'opaque', ridges: true },  // 砗磲 tridacna shell
      { c: ['#5a1d0d', '#bc5a2a', '#f5c9a2'], cut: 'opaque', bands: true },   // 玛瑙 agate
      { c: ['#bdb09f', '#f1eae0', '#ffffff'], cut: 'pearl' },                 // 真珠 pearl
      { c: ['#4f0716', '#c4203c', '#ffa3b6'], cut: 'facet' }                  // 玫瑰 red gem
    ];

    function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
    function mix(a, b, t) {
      var A = hex(a), B = hex(b);
      return 'rgb(' + [0, 1, 2].map(function (k) { return Math.round(A[k] + (B[k] - A[k]) * t); }).join(',') + ')';
    }
    function shade(c, b) {           // b: 0 = dark … 0.5 = mid … 1 = light
      b = Math.max(0, Math.min(1, b));
      return b < 0.5 ? mix(c[0], c[1], b * 2) : mix(c[1], c[2], (b - 0.5) * 2);
    }
    function pts(list) { return list.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' '); }

    // outlines, roughly 8 units in radius, before a random turn
    function outline(shape) {
      var P = [], i, n, t;
      function polar(n, rFn) { for (var k = 0; k < n; k++) { var a = -Math.PI / 2 + k * 2 * Math.PI / n; var r = rFn(a); P.push([Math.cos(a) * r[0], Math.sin(a) * r[1]]); } }
      switch (shape) {
        case 'round':   polar(10, function () { return [7.8, 7.8]; }); break;
        case 'oval':    polar(12, function () { return [8.6, 6.3]; }); break;
        case 'hexagon': polar(6, function () { return [8.2, 8.2]; }); break;
        case 'cushion':
          for (i = 0; i < 12; i++) { t = i * Math.PI / 6 + Math.PI / 12; var cs = Math.cos(t), sn = Math.sin(t);
            P.push([7.2 * Math.sign(cs) * Math.pow(Math.abs(cs), 0.55), 7.2 * Math.sign(sn) * Math.pow(Math.abs(sn), 0.55)]); }
          break;
        case 'emerald':
          P = [[-4.6, -6.4], [4.6, -6.4], [7.4, -3.6], [7.4, 3.6], [4.6, 6.4], [-4.6, 6.4], [-7.4, 3.6], [-7.4, -3.6]]; break;
        case 'pear':
          polar(12, function (a) { var up = Math.max(0, -Math.sin(a)); return [6.3 * (1 - 0.35 * Math.pow(up, 2)), 6.3 + 3.4 * Math.pow(up, 3)]; });
          P = P.map(function (p) { return [p[0], p[1] + 1.2]; }); break;
        case 'marquise':
          for (i = 0; i <= 6; i++) { var x = -9 + i * 3; P.push([x, 5.19 - Math.sqrt(107.95 - x * x)]); }
          for (i = 5; i >= 1; i--) { x = -9 + i * 3; P.push([x, -(5.19 - Math.sqrt(107.95 - x * x))]); }
          break;
        case 'trillion':
          for (i = 0; i < 6; i++) { t = -Math.PI / 2 + i * Math.PI / 3; var r = i % 2 ? 6.2 : 8.8; P.push([Math.cos(t) * r, Math.sin(t) * r]); }
          break;
        default:        // smooth outline for cabochons and pearls
          n = 32;
          var rx = shape === 'cab-oval' ? 8.4 : shape === 'cab-pear' ? 6.6 : 7.6,
              ry = shape === 'cab-oval' ? 6.4 : 7.6;
          for (i = 0; i < n; i++) {
            t = i * 2 * Math.PI / n;
            var up2 = shape === 'cab-pear' || shape === 'pearl-drop' ? Math.max(0, -Math.sin(t)) : 0;
            var k2 = 1 - 0.38 * up2 * up2;
            P.push([Math.cos(t) * rx * k2, Math.sin(t) * (ry + 3.2 * Math.pow(up2, 3)) + (up2 || shape === 'cab-pear' || shape === 'pearl-drop' ? 1.2 : 0)]);
          }
      }
      return P;
    }
    function turn(P, a) { var c = Math.cos(a), s = Math.sin(a); return P.map(function (p) { return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }); }
    function scaleTo(P, k, dx, dy) { return P.map(function (p) { return [p[0] * k + dx, p[1] * k + dy]; }); }

    var LIGHT = Math.atan2(-0.8, -0.6);        // light from the upper left

    function sparkle(x, y, s) {
      return '<path class="gem-spark" d="M' + x + ' ' + (y - s) + ' L' + (x + s * 0.22) + ' ' + (y - s * 0.22) + ' L' + (x + s) + ' ' + y +
        ' L' + (x + s * 0.22) + ' ' + (y + s * 0.22) + ' L' + x + ' ' + (y + s) + ' L' + (x - s * 0.22) + ' ' + (y + s * 0.22) +
        ' L' + (x - s) + ' ' + y + ' L' + (x - s * 0.22) + ' ' + (y - s * 0.22) + ' Z" fill="#fff" style="animation-delay:' + (Math.random() * 6).toFixed(2) + 's"/>';
    }

    function facetGem(i, st, shape) {
      var c = st.c, P = turn(outline(shape), (Math.random() - 0.5) * 0.5 + (shape === 'trillion' || shape === 'hexagon' ? Math.random() * 1.2 : 0));
      var T = scaleTo(P, 0.5, -0.7, -0.9);     // the table, nudged toward the light: a slight tilt
      var n = P.length, out = '', k;
      var transparent = i === 6 || i === 0 || i === 1;
      // a dark base keeps the edges crisp
      out += '<polygon points="' + pts(P) + '" fill="' + c[0] + '"/>';
      for (k = 0; k < n; k++) {
        var a = P[k], b = P[(k + 1) % n], ta = T[k], tb = T[(k + 1) % n];
        var m = [(ta[0] + tb[0]) / 2, (ta[1] + tb[1]) / 2];
        var ang = Math.atan2((a[1] + b[1]) / 2, (a[0] + b[0]) / 2);
        var lit = Math.cos(ang - LIGHT);
        var j = function () { return (Math.random() - 0.5) * 0.16; };
        // crown facets catch the light on the near side; inside a clear stone the far side glows too
        var b1 = 0.5 + 0.42 * lit + j();
        var b2 = transparent ? 0.55 - 0.35 * lit + j() : 0.42 + 0.3 * lit + j();
        var b3 = transparent ? 0.62 + 0.3 * Math.cos(ang - LIGHT + 0.8) + j() : 0.5 + 0.3 * lit + j();
        out += '<polygon points="' + pts([a, b, m]) + '" fill="' + shade(c, b1) + '"/>';
        out += '<polygon points="' + pts([a, m, ta]) + '" fill="' + shade(c, b2) + '"/>';
        out += '<polygon points="' + pts([b, tb, m]) + '" fill="' + shade(c, b3) + '"/>';
      }
      var gid = 'gt' + i;
      out += '<linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + shade(c, 0.95) + '"/><stop offset="0.55" stop-color="' + shade(c, 0.6) + '"/><stop offset="1" stop-color="' + shade(c, transparent ? 0.8 : 0.45) + '"/></linearGradient>';
      out += '<polygon points="' + pts(T) + '" fill="url(#' + gid + ')"/>';
      // facet edges, faint
      out += '<polygon points="' + pts(T) + '" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="0.25"/>';
      out += '<polygon points="' + pts(P) + '" fill="none" stroke="' + c[0] + '" stroke-width="0.55"/>';
      // gleam on the table and a sparkle at the edge
      var t0 = T[Math.floor(n * 0.62) % n];
      out += '<polygon points="' + pts(scaleTo(T, 0.42, -1.1, -1.3)) + '" fill="#fff" opacity="0.55"/>';
      out += sparkle(t0[0] * 0.9 - 1.2, t0[1] * 0.9 - 1.2, 2.6);
      return out;
    }

    function cabochon(i, st, shape) {
      var c = st.c, P = turn(outline(shape), (Math.random() - 0.5) * 1.2);
      var g = 'gc' + i, out = '';
      out += '<radialGradient id="' + g + '" cx="0.36" cy="0.32" r="0.78"><stop offset="0" stop-color="' + c[2] + '"/><stop offset="0.42" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[0] + '"/></radialGradient>';
      out += '<clipPath id="' + g + 'c"><polygon points="' + pts(P) + '"/></clipPath>';
      out += '<polygon points="' + pts(P) + '" fill="url(#' + g + ')"/>';
      out += '<g clip-path="url(#' + g + 'c)">';
      if (st.bands) {
        for (var b = 1; b <= 4; b++) {
          var Q = scaleTo(P, 1 - b * 0.19, 0.5 * b * 0.3, 0.4 * b * 0.3);
          out += '<polygon points="' + pts(Q) + '" fill="none" stroke="' + (b % 2 ? c[2] : c[0]) + '" stroke-opacity="' + (b % 2 ? 0.55 : 0.35) + '" stroke-width="0.8"/>';
        }
      }
      if (st.ridges) {
        for (var r = 0; r < 4; r++) {
          var y = -5 + r * 3.4;
          out += '<path d="M-9 ' + (y + 3) + ' Q0 ' + (y - 3) + ' 9 ' + (y + 3) + '" fill="none" stroke="' + c[0] + '" stroke-opacity="0.45" stroke-width="0.55"/>';
        }
      }
      if (st.fleck) {
        for (var f = 0; f < 6; f++) {
          out += '<circle cx="' + ((Math.random() - 0.5) * 10).toFixed(2) + '" cy="' + ((Math.random() - 0.5) * 9).toFixed(2) + '" r="' + (0.3 + Math.random() * 0.45).toFixed(2) + '" fill="' + st.fleck + '"/>';
        }
      }
      // rim shadow, a soft window reflection, a crisp highlight, light bouncing back from below
      out += '<polygon points="' + pts(P) + '" fill="none" stroke="' + c[0] + '" stroke-opacity="0.55" stroke-width="1.6"/>';
      out += '<ellipse cx="-2.4" cy="-3" rx="3.8" ry="2.2" fill="#fff" opacity="0.38" transform="rotate(-28 -2.4 -3)"/>';
      out += '<ellipse cx="-2.9" cy="-3.4" rx="1.7" ry="0.9" fill="#fff" opacity="0.92" transform="rotate(-28 -2.9 -3.4)"/>';
      out += '<path d="M2 5.2 Q5.4 3.6 6 0.6" fill="none" stroke="' + c[2] + '" stroke-opacity="0.5" stroke-width="0.9" stroke-linecap="round"/>';
      out += '</g>';
      out += '<polygon points="' + pts(P) + '" fill="none" stroke="' + c[0] + '" stroke-width="0.5"/>';
      out += sparkle(-3, -3.4, 2);
      return out;
    }

    function pearl(i, st) {
      var c = st.c, drop = Math.random() < 0.4;
      var P = drop ? turn(outline('pearl-drop'), (Math.random() - 0.5) * 0.6) : null;
      var g = 'gp' + i, out = '';
      out += '<radialGradient id="' + g + '" cx="0.38" cy="0.34" r="0.75"><stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="' + c[1] + '"/><stop offset="0.85" stop-color="#d9c9c4"/><stop offset="1" stop-color="' + c[0] + '"/></radialGradient>';
      // orient: the faint rainbow sheen of nacre
      out += '<radialGradient id="' + g + 'i" cx="0.7" cy="0.72" r="0.6"><stop offset="0" stop-color="#d7f0e6" stop-opacity="0.55"/><stop offset="0.5" stop-color="#f3d3e2" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>';
      var shapeEl = drop ? '<polygon points="' + pts(P) + '"' : '<circle r="7.4"';
      out += shapeEl + ' fill="url(#' + g + ')" stroke="' + c[0] + '" stroke-width="0.45"/>';
      out += shapeEl + ' fill="url(#' + g + 'i)"/>';
      out += '<ellipse cx="-2.6" cy="-2.9" rx="2.6" ry="1.6" fill="#fff" opacity="0.9" transform="rotate(-30 -2.6 -2.9)"/>';
      out += '<ellipse cx="2.8" cy="3.3" rx="2.4" ry="1" fill="#fff" opacity="0.3" transform="rotate(-30 2.8 3.3)"/>';
      out += sparkle(-3.4, -3.6, 1.8);
      return out;
    }

    var FACETS = ['round', 'oval', 'cushion', 'emerald', 'pear', 'marquise', 'trillion', 'hexagon'];
    var CABS = ['cab-round', 'cab-oval', 'cab-pear'];
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    GEM_STYLE.forEach(function (st, i) {
      var holder = document.getElementById('gem-' + i);
      if (!holder) return;
      var svgMarkup;
      if (st.cut === 'pearl') svgMarkup = pearl(i, st);
      else if (st.cut === 'opaque') svgMarkup = Math.random() < 0.7 ? cabochon(i, st, pick(CABS)) : facetGem(i, st, pick(FACETS));
      else svgMarkup = facetGem(i, st, pick(FACETS));
      holder.innerHTML = svgMarkup;
    });
    var SIZE = 18, GROUND = 316, GRAV = 1100;
    var drops = [];            // jewels that have fallen (moving or resting)
    var running = false, lastT = 0, restoring = false;

    function home(i) {         // a jewel's place on the stupa, in figure pixels
      var m = /translate\(([\d.]+)[ ,]+([\d.]+)\)/.exec(jewels[i].getAttribute('transform'));
      return [btn.offsetLeft + (+m[1]), btn.offsetTop + (+m[2])];
    }
    function place(d) {
      d.el.style.transform = 'translate(' + (d.x - SIZE / 2).toFixed(1) + 'px,' + (d.y - SIZE / 2).toFixed(1) + 'px) rotate(' + d.rot.toFixed(1) + 'deg)';
    }

    function show(i, count) {
      var t = TREASURES[i];
      var gem = t.gem + (t.gemNote ? '<span class="t-note">（' + t.gemNote + '）</span>' : '');
      body.innerHTML =
        '<div class="t-card">' +
          '<svg class="t-gem" viewBox="-10 -10 20 20" aria-hidden="true"><use href="#gem-' + i + '"/></svg>' +
          '<div><p class="t-name" lang="zh-CN">' + t.name + ' · ' + gem + '</p>' +
          '<p class="t-en">' + t.en + ' · ' + t.gemEn + '</p></div>' +
        '</div>' +
        '<p class="t-text" lang="zh-CN">' + t.text + '</p>' +
        '<p class="t-text-en">' + t.textEn + '</p>' +
        '<p class="t-count">' + count + ' / 7' +
          (count === 7 ? ' — <span lang="zh-CN">七宝俱落，再触宝塔，宝珠归位。</span> All seven have fallen; touch the stupa again and they return.' : '') +
        '</p>';
      body.classList.remove('t-in'); void body.offsetWidth; body.classList.add('t-in');
    }

    function drop() {
      var left = [];
      jewels.forEach(function (j, i) { if (!j.classList.contains('gone')) left.push(i); });
      if (!left.length) return restore();
      var i = left[Math.floor(Math.random() * left.length)];
      var h = home(i);
      var el = document.createElementNS(SVGNS, 'svg');
      el.setAttribute('viewBox', '-10 -10 20 20');
      el.setAttribute('class', 'fallen-jewel');
      el.setAttribute('aria-hidden', 'true');
      var use = document.createElementNS(SVGNS, 'use');
      use.setAttribute('href', '#gem-' + i);
      el.appendChild(use);
      stupaFig.appendChild(el);
      jewels[i].classList.add('gone');

      var d = { i: i, el: el, x: h[0], y: h[1], rot: 0, t: 0, bounces: 0, rest: false,
                vx: (Math.random() - 0.5) * 260, vy: -(60 + Math.random() * 170),
                vr: (Math.random() - 0.5) * 720, fl: 30 + Math.random() * 50,
                fr: 4 + Math.random() * 6, ph: Math.random() * 6,
                floor: btn.offsetTop + GROUND - SIZE / 2 + (Math.random() - 0.5) * 3 };
      drops.push(d);
      if (reduceMotion) {                                      // no flight: it simply rests below
        d.x = Math.max(18, Math.min(stupaFig.clientWidth - 18, h[0] + d.vx * 0.3));
        d.y = d.floor; d.rest = true;
      }
      place(d);
      show(i, drops.length);
      if (!running && !reduceMotion) { running = true; lastT = 0; requestAnimationFrame(step); }
    }

    function step(now) {
      var dt = lastT ? Math.min((now - lastT) / 1000, 0.04) : 0.016;
      lastT = now;
      var maxX = stupaFig.clientWidth - SIZE / 2, moving = 0;
      for (var k = 0; k < drops.length; k++) {
        var d = drops[k];
        if (d.rest) continue;
        moving++;
        d.t += dt;
        d.vy += GRAV * dt;
        d.vx *= 1 - 0.5 * dt;
        // its own wandering: a flutter that dies away as it falls
        d.x += (d.vx + Math.sin(d.t * d.fr + d.ph) * d.fl * Math.max(0, 1 - d.t)) * dt;
        d.y += d.vy * dt;
        d.rot += d.vr * dt;
        if (d.x < SIZE / 2) { d.x = SIZE / 2; d.vx = Math.abs(d.vx) * 0.5; }
        if (d.x > maxX) { d.x = maxX; d.vx = -Math.abs(d.vx) * 0.5; }
        if (d.y >= d.floor) {
          d.y = d.floor;
          if (d.vy > 90 && d.bounces < 3) {                     // a few small bounces
            d.vy = -d.vy * 0.38; d.vx *= 0.8; d.vr *= 0.6; d.bounces++;
          } else {                                             // then it rolls to a stop
            d.vy = 0;
            d.vx *= 1 - Math.min(1, 3.2 * dt);
            d.vr = d.vx / (SIZE / 2) * 57.3;
            if (Math.abs(d.vx) < 5) d.rest = true;
          }
        }
        // jewels on the ground don't sit inside each other
        for (var q = 0; q < drops.length; q++) {
          var o = drops[q];
          if (o === d || !o.rest) continue;
          var dx = d.x - o.x;
          if (Math.abs(dx) < SIZE && Math.abs(d.y - o.y) < SIZE * 0.8) {
            d.x = o.x + (dx >= 0 ? SIZE : -SIZE);
            d.vx = -d.vx * 0.3;
          }
        }
        place(d);
      }
      if (moving) requestAnimationFrame(step); else running = false;
    }

    function restore() {
      if (restoring) return;
      restoring = true;
      drops.forEach(function (d, n) {
        var h = home(d.i);
        setTimeout(function () {
          d.el.style.transition = reduceMotion ? 'none' : 'transform 1.4s cubic-bezier(.3,.7,.2,1)';
          d.x = h[0]; d.y = h[1]; d.rot = 0; place(d);
        }, n * 110);
      });
      setTimeout(function () {
        drops.forEach(function (d) { d.el.remove(); jewels[d.i].classList.remove('gone'); });
        drops = [];
        restoring = false;
        body.innerHTML = '<p class="t-hint"><span lang="zh-CN">宝珠归位。触碰宝塔，一颗宝珠将会落下。</span><br>The jewels have returned. Touch the stupa, and one will fall.</p>';
        body.classList.remove('t-in'); void body.offsetWidth; body.classList.add('t-in');
      }, reduceMotion ? 50 : drops.length * 110 + 1450);
    }

    btn.addEventListener('click', function () { if (!restoring) drop(); });
  })();

  /* ------------------------------------------------------------------
     Research cards: hover previews and the topic filter
     ------------------------------------------------------------------ */
  var rcards = Array.prototype.slice.call(document.querySelectorAll('.rcard'));
  if (rcards.length) (function () {
    var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

    rcards.forEach(function (card) {
      var layer = card.querySelector('.rcard-hover');
      if (!layer) return;
      card.classList.add('has-hover');
      var stopTimer = null;

      function play() {
        clearTimeout(stopTimer);
        if (!layer.getAttribute('src')) {                     // load on first use; WebM where supported
          var webm = layer.getAttribute('data-src-webm');
          layer.setAttribute('src', webm && layer.canPlayType && layer.canPlayType('video/webm') ? webm : layer.getAttribute('data-src'));
        }
        card.classList.add('is-playing');
        if (layer.tagName === 'VIDEO') {
          var p = layer.play();
          if (p && p.catch) p.catch(function () { /* autoplay refused: the poster stays */ });
        }
      }
      function stop() {
        card.classList.remove('is-playing');
        if (layer.tagName === 'VIDEO') {
          stopTimer = setTimeout(function () { layer.pause(); layer.currentTime = 0; }, 450);
        }
      }

      if (canHover) {
        card.addEventListener('pointerenter', play);
        card.addEventListener('pointerleave', stop);
      }
      card.addEventListener('focusin', play);
      card.addEventListener('focusout', function (e) { if (!card.contains(e.relatedTarget)) stop(); });
      card._play = play; card._stop = stop;
    });

    // on touch screens: a preview plays while its card is in the middle of the screen
    if (!canHover && !reduceMotion && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var c = en.target;
          if (en.isIntersecting) c._play(); else c._stop();
        });
      }, { rootMargin: '-30% 0px -30% 0px' });
      rcards.forEach(function (c) { if (c._play) io.observe(c); });
    }

    // the topic filter
    var chips = Array.prototype.slice.call(document.querySelectorAll('.rchip'));
    var empty = document.querySelector('.rcards-empty');
    chips.forEach(function (chip) {
      var f = chip.getAttribute('data-filter');
      var n = f === 'all' ? rcards.length : rcards.filter(function (c) {
        return (' ' + c.getAttribute('data-tags') + ' ').indexOf(' ' + f + ' ') >= 0;
      }).length;
      var badge = document.createElement('span');
      badge.className = 'n';
      badge.textContent = n;
      chip.appendChild(badge);
      chip.addEventListener('click', function () { apply(f, true); });
    });

    function apply(f, remember) {
      if (!chips.some(function (c) { return c.getAttribute('data-filter') === f; })) f = 'all';
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-filter') === f ? 'true' : 'false'); });
      var shown = 0;
      rcards.forEach(function (c, i) {
        var match = f === 'all' || (' ' + c.getAttribute('data-tags') + ' ').indexOf(' ' + f + ' ') >= 0;
        if (match) {
          shown++;
          if (c.hidden) {
            c.hidden = false;
            if (!reduceMotion) {
              c.classList.add('is-entering');
              setTimeout(function () { c.classList.remove('is-entering'); }, 30 + i * 60);
            }
          }
        } else {
          c.hidden = true;
        }
      });
      if (empty) empty.hidden = shown > 0;
      if (remember && history.replaceState) {
        history.replaceState(null, '', f === 'all' ? location.pathname : '#topic=' + f);
      }
    }
    function fromHash() {
      var m = /topic=([\w-]+)/.exec(location.hash);
      if (m) apply(m[1], false);
    }
    window.addEventListener('hashchange', fromHash);
    fromHash();
  })();

  /* ------------------------------------------------------------------
     The monk (only on pages that have #monk-band)
     ------------------------------------------------------------------ */
  var band = document.getElementById('monk-band');
  if (!band) return;
  if (reduceMotion) {
    band.querySelectorAll('svg').forEach(function (s) {
      if (s.pauseAnimations) s.pauseAnimations();
    });
  }
  document.body.classList.add('has-monk');

  // The words. English renderings as chosen by the site owner; the Chinese
  // lines are the canonical Chinese texts (Kumārajīva / Xuanzang).
  var QUOTES = [
    { zh: '色不异空，空不异色；色即是空，空即是色。',
      en: 'Form is not other than emptiness, emptiness is not other than form. Form is only emptiness, emptiness is only form.',
      src: 'Heart Sutra · 般若波罗蜜多心经' },
    { zh: '受想行识，亦复如是。',
      en: 'This is true of feelings, perceptions, mental formations, and consciousness.',
      src: 'Heart Sutra · 般若波罗蜜多心经' },
    { zh: '今此三界，皆是我有；其中众生，悉是吾子。',
      en: 'This threefold world is all my domain, and the living beings in it are all my children.',
      src: 'Lotus Sutra, Chapter 3 · 譬喻品' },
    { zh: '如来如实知见三界之相，无有生死，若退若出。',
      en: 'In the threefold world, there is neither birth nor death, nor going away nor coming forth.',
      src: 'Lotus Sutra, Chapter 16 · 如来寿量品' },
    { zh: '犹如大云，充润一切。',
      en: 'I bring fullness and satisfaction to the world, like a rain that spreads its moisture everywhere.',
      src: 'Lotus Sutra, Chapter 5 · 药草喻品' },
    { zh: '一切有为法，如梦幻泡影，如露亦如电，应作如是观。',
      en: 'So you should view this fleeting world: a star at dawn, a bubble in a stream, a flash of lightning in a summer cloud, a flickering lamp, a phantom, and a dream.',
      src: 'Diamond Sutra · 金刚经' },
    { zh: '',
      en: 'Inconceivable, the Buddha’s body holds within it all lands. He is present everywhere, guiding beings and teaching true Dharma.',
      src: 'Avataṃsaka (Flower Garland) Sutra · 华严经' },
    { zh: '',
      en: 'You yourselves must make the effort; the Buddhas only point the way.',
      src: 'Dhammapada, verse 276 · 法句经' },
    { zh: '',
      en: 'Speak no harsh words to anyone; harsh words are answered in kind. Angry speech brings pain, and blow returns for blow.',
      src: 'Dhammapada, verse 133 · 法句经' }
  ];

  var monkBtn = document.getElementById('monk-btn');
  var quote   = document.getElementById('zen-quote');
  var qZh     = quote.querySelector('.q-zh');
  var qEn     = quote.querySelector('.q-en');
  var qSrc    = quote.querySelector('.q-src');
  var hint    = band.querySelector('.monk-hint');

  var HINT_KEY = 'zen-monk-visited';
  function hintSeen() { try { return localStorage.getItem(HINT_KEY) === '1'; } catch (e) { return false; } }
  function markHintSeen() { try { localStorage.setItem(HINT_KEY, '1'); } catch (e) { /* storage unavailable */ } }
  if (hint && hintSeen()) hint.hidden = true;

  var order = [];          // shuffled deck, so no quote repeats until all are seen
  var hideTimer = null;
  var isOpen = false;

  function nextQuote() {
    if (!order.length) {
      order = QUOTES.map(function (_, i) { return i; });
      for (var i = order.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = order[i]; order[i] = order[j]; order[j] = t;
      }
    }
    return QUOTES[order.pop()];
  }

  function open() {
    var q = nextQuote();
    qZh.textContent = q.zh;
    qEn.textContent = q.en;
    qSrc.textContent = q.src;
    quote.classList.add('visible');
    quote.setAttribute('aria-hidden', 'false');
    monkBtn.setAttribute('aria-expanded', 'true');
    isOpen = true;
    if (hint && !hint.hidden) { hint.hidden = true; markHintSeen(); }
    clearTimeout(hideTimer);
    // long enough to read slowly; longer for longer verses
    hideTimer = setTimeout(close, Math.max(9000, q.en.length * 85));
  }

  function close() {
    clearTimeout(hideTimer);
    hideTimer = null;
    quote.classList.remove('visible');
    quote.setAttribute('aria-hidden', 'true');
    monkBtn.setAttribute('aria-expanded', 'false');
    isOpen = false;
  }

  // Click the monk: open; click again: let it go.
  monkBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (isOpen) close(); else open();
  });
  // Click the words themselves: let them go.
  quote.addEventListener('click', function (e) {
    e.stopPropagation();
    close();
  });
  // Click anywhere else, or press Escape: let them go.
  document.addEventListener('click', function () { if (isOpen) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) close();
  });
})();
