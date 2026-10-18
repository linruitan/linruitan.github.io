/* =====================================================================
   zen.js — shared background, the opening, and the monk (home page)
   ---------------------------------------------------------------------
   一切有为法，如梦幻泡影 — motion here is sparse and passing.

   The opening (first visit of a browser session, about five seconds):
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
      g.addColorStop(0, '#f5f1e7');
      g.addColorStop(0.6, '#f3eee3');
      g.addColorStop(1, '#ede6d6');
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, W, H);

      var m = Math.min(H, 900);
      RANGES.forEach(function (r, i) {                 // three ink-wash ranges, far to near
        var amp = m * r[1], base = H * r[0];
        var mg = sctx.createLinearGradient(0, base - amp * 1.4, 0, base + m * r[4]);
        mg.addColorStop(0, 'rgba(46, 44, 38,' + r[3] + ')');
        mg.addColorStop(0.45, 'rgba(46, 44, 38,' + (r[3] * 0.55) + ')');
        mg.addColorStop(1, 'rgba(46, 44, 38, 0)');
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
      var h = H * this.hFrac;
      if (h < 20) return;
      var x0 = W * this.fx, y0 = ridgeY(this.range, x0) + h * 0.03;
      var dir = this.flip, self = this;
      var sway = wind * h * 0.030 * Math.sin(time * 1.25 + this.phase)
               + wind * h * 0.010 * Math.sin(time * 2.9 + this.phase * 2);
      function trunkAt(f) {
        return [x0 + dir * (self.lean * f + self.bend * Math.sin(Math.PI * f) * 0.5) * h + sway * f * f,
                y0 - h * f];
      }
      var ink = 'rgba(34, 31, 26,', A = this.alpha;
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
      c.strokeStyle = 'rgba(243, 238, 227,' + (A * 1.2) + ')';
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
    };

    var pines = [
      new Pine(0.045, 2, 0.42, 11, 0.20, false),
      new Pine(0.950, 2, 0.36, 23, 0.20, true),
      new Pine(0.310, 1, 0.10, 37, 0.11, false),
      new Pine(0.665, 0, 0.08, 41, 0.09, true)
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
      g.addColorStop(0, 'rgba(246, 242, 234,' + this.a + ')');
      g.addColorStop(1, 'rgba(246, 242, 234, 0)');
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
      c.strokeStyle = 'rgba(34, 31, 26,' + alpha + ')';
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
        try { sessionStorage.setItem('zen-entered', '1'); } catch (e) { /* ignore */ }

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
            oc.fillStyle = 'rgba(248, 246, 240,' + wash + ')';
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
            g.addColorStop(0, 'rgba(250, 249, 245,' + (p.a * fade) + ')');
            g.addColorStop(1, 'rgba(250, 249, 245, 0)');
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
