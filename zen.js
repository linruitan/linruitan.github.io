/* =====================================================================
   zen.js — shared background + the monk (home page only)
   ---------------------------------------------------------------------
   一切有为法，如梦幻泡影 — motion here is sparse and passing:
   a still ink-wash landscape, a little drifting mist, and now and then
   a single bird that crosses the sky and is gone.
   ===================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Background canvas
     ------------------------------------------------------------------ */
  var canvas = document.getElementById('zen-canvas');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var still = document.createElement('canvas');   // landscape, drawn once per resize
    var sctx = still.getContext('2d');
    var W = 0, H = 0, DPR = 1;

    // deterministic "random" so the mountains never jump on resize
    function ridge(x, seed, amp) {
      return amp * (
        0.50 * Math.sin(x * 1.7 + seed) +
        0.28 * Math.sin(x * 4.3 + seed * 2.1) +
        0.14 * Math.sin(x * 9.7 + seed * 3.7) +
        0.08 * Math.sin(x * 21.0 + seed * 5.3)
      );
    }

    function mountain(c, base, amp, seed, alpha, fadeDepth) {
      var top = base - amp * 1.4;
      var g = c.createLinearGradient(0, top, 0, base + fadeDepth);
      g.addColorStop(0, 'rgba(46, 44, 38,' + alpha + ')');
      g.addColorStop(0.45, 'rgba(46, 44, 38,' + (alpha * 0.55) + ')');
      g.addColorStop(1, 'rgba(46, 44, 38, 0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, H);
      for (var x = 0; x <= W; x += 4) {
        c.lineTo(x, base - Math.abs(ridge(x / W * 3.2, seed, amp)) - amp * 0.25);
      }
      c.lineTo(W, H);
      c.closePath();
      c.fill();
    }

    function paintStill() {
      still.width = W * DPR; still.height = H * DPR;
      sctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      // paper
      var g = sctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#f5f1e7');
      g.addColorStop(0.6, '#f3eee3');
      g.addColorStop(1, '#ede6d6');
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, W, H);

      // three ink-wash ranges, far to near
      var m = Math.min(H, 900);
      mountain(sctx, H * 0.70, m * 0.20, 1.3, 0.045, m * 0.25);
      mountain(sctx, H * 0.80, m * 0.15, 4.1, 0.055, m * 0.20);
      mountain(sctx, H * 0.92, m * 0.10, 7.7, 0.070, m * 0.12);
    }

    /* mist: a few slow, wide puffs low in the valley */
    function Mist() { this.reset(true); }
    Mist.prototype.reset = function (init) {
      this.r = 160 + Math.random() * 220;
      this.x = init ? Math.random() * W : -this.r;
      this.y = H * (0.66 + Math.random() * 0.26);
      this.a = 0.22 + Math.random() * 0.2;
      this.v = 0.05 + Math.random() * 0.07;
    };
    Mist.prototype.step = function () {
      this.x += this.v;
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

    /* one bird at a time, rarely */
    var bird = null;
    var nextBirdAt = performance.now() + 6000 + Math.random() * 8000;
    function newBird() {
      var dir = Math.random() < 0.5 ? 1 : -1;
      return {
        dir: dir,
        x: dir > 0 ? -30 : W + 30,
        y0: H * (0.12 + Math.random() * 0.22),
        v: 0.35 + Math.random() * 0.2,
        s: 0.7 + Math.random() * 0.4,
        t: Math.random() * 10
      };
    }
    function drawBird(c, b) {
      var wing = Math.sin(b.t * 0.09) * 5 * b.s;
      var y = b.y0 + Math.sin(b.t * 0.012) * 8;
      c.save();
      c.translate(b.x, y);
      c.strokeStyle = 'rgba(34, 31, 26, 0.55)';
      c.lineWidth = 1.1;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(-9 * b.s, -wing * 0.4);
      c.quadraticCurveTo(-4 * b.s, -wing, 0, 0);
      c.quadraticCurveTo(4 * b.s, -wing, 9 * b.s, -wing * 0.4);
      c.stroke();
      c.restore();
    }

    var mists = [];
    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      paintStill();
      if (!mists.length) for (var i = 0; i < 6; i++) mists.push(new Mist());
      render(performance.now());
    }

    function render(now) {
      ctx.drawImage(still, 0, 0, W, H);
      for (var i = 0; i < mists.length; i++) mists[i].draw(ctx);
      if (bird) drawBird(ctx, bird);
    }

    function loop(now) {
      for (var i = 0; i < mists.length; i++) mists[i].step();
      if (!bird && now > nextBirdAt) bird = newBird();
      if (bird) {
        bird.x += bird.v * bird.dir;
        bird.t += 1;
        if (bird.x < -40 || bird.x > W + 40) {
          bird = null;
          nextBirdAt = now + 20000 + Math.random() * 25000;   // and then, emptiness
        }
      }
      render(now);
      requestAnimationFrame(loop);
    }

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 120);
    });
    resize();
    if (!reduceMotion) requestAnimationFrame(loop);
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
