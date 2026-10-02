/* ============================================
   LEAP homepage (index.html only)
   Before LEAP / With LEAP switch
   ============================================ */
(function () {
  var el = document.getElementById('flip');
  if (!el) return;

  var tiles = Array.prototype.slice.call(el.querySelectorAll('.hp-flip-tile'));
  var grid = el.querySelector('.hp-flip-grid');
  var manual = false, ticking = false;

  function thumb(state) {
    el.classList.toggle('hp-is-before', state === 'before');
    el.classList.toggle('hp-is-after', state === 'after');
  }

  /* a click on the switch sets every tile and stops the scroll-driven flipping */
  el.querySelectorAll('.hp-flip-switch button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      manual = true;
      var after = btn.dataset.s === 'after';
      tiles.forEach(function (t) { t.classList.toggle('hp-a', after); });
      thumb(after ? 'after' : 'before');
    });
  });

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* While scrolling, tiles turn from Before to With LEAP one after another,
     and turn back if the visitor scrolls up again. No click needed. */
  function update() {
    ticking = false;
    if (manual) return;
    var vh = window.innerHeight;
    var rect = grid.getBoundingClientRect();
    var stacked = rect.height > vh * 0.55;      /* phone: one tall column */
    var done = 0;
    tiles.forEach(function (t, i) {
      var on;
      if (stacked) {
        var r = t.getBoundingClientRect();
        on = r.top + r.height / 2 < vh * 0.58;  /* each row flips as it passes mid-screen */
      } else {
        /* desktop: a wave across the grid as it rises from 78% to 38% of the screen */
        var p = (vh * 0.78 - rect.top) / (vh * 0.40);
        on = p > (i + 0.5) / tiles.length;
      }
      t.classList.toggle('hp-a', on);
      if (on) done++;
    });
    thumb(done * 2 >= tiles.length ? 'after' : 'before');
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();

/* ============================================
   Acts row: badges start scattered and tilted,
   then settle into line as the row scrolls in
   ============================================ */
(function () {
  var row = document.getElementById('actsRow');
  if (!row) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var items = Array.prototype.slice.call(row.children);
  var geo = [];
  var ticking = false;

  /* Where each badge sits relative to the centre of the row (-1 to 1) */
  function measure() {
    var cx = row.offsetWidth / 2;
    var cy = row.offsetHeight / 2;
    geo = items.map(function (el) {
      return {
        dx: (el.offsetLeft - row.offsetLeft + el.offsetWidth / 2 - cx) / cx,
        dy: (el.offsetTop - row.offsetTop + el.offsetHeight / 2 - cy) / (cy || 1)
      };
    });
  }

  function update() {
    ticking = false;
    var rect = row.getBoundingClientRect();
    var vh = window.innerHeight;
    /* 0 when the row enters at the bottom, 1 once its middle reaches 55% of the screen */
    var p = (vh - rect.top) / (vh * 0.45 + rect.height / 2);
    p = Math.max(0, Math.min(1, p));
    var t = 1 - p;
    t = t * t;                       /* ease out: settles gently */
    var spread = Math.min(row.offsetWidth * 0.22, 220);
    items.forEach(function (el, i) {
      var g = geo[i];
      if (t === 0) { el.style.transform = ''; el.style.opacity = ''; return; }
      el.style.transform =
        'translate(' + (g.dx * spread * t).toFixed(1) + 'px,' +
        ((Math.abs(g.dx) * 46 + g.dy * 26) * t).toFixed(1) + 'px) ' +
        'rotate(' + (g.dx * 16 * t).toFixed(2) + 'deg) ' +
        'scale(' + (1 - 0.22 * t).toFixed(3) + ')';
      el.style.opacity = (0.35 + 0.65 * (1 - t)).toFixed(2);
    });
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  measure();
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); onScroll(); });
})();

/* ============================================
   Vendor band: soft glow that trails the mouse
   ============================================ */
(function () {
  var band = document.getElementById('vendorBand');
  if (!band || !window.matchMedia) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var tx = 0, ty = 0, x = 0, y = 0, running = false, inside = false;

  function frame() {
    /* ease towards the pointer so the glow trails slightly behind */
    x += (tx - x) * 0.14;
    y += (ty - y) * 0.14;
    band.style.setProperty('--gx', x.toFixed(1) + 'px');
    band.style.setProperty('--gy', y.toFixed(1) + 'px');
    if (inside || Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) {
      requestAnimationFrame(frame);
    } else {
      running = false;
    }
  }

  band.addEventListener('pointermove', function (e) {
    var b = band.getBoundingClientRect();
    tx = e.clientX - b.left;
    ty = e.clientY - b.top;
    if (!inside) { inside = true; x = tx; y = ty; band.style.setProperty('--go', '1'); }
    if (!running) { running = true; requestAnimationFrame(frame); }
  });
  band.addEventListener('pointerleave', function () {
    inside = false;
    band.style.setProperty('--go', '0');
  });
})();

/* ============================================
   How we work: line draws through the steps
   as the section scrolls through the screen
   ============================================ */
(function () {
  var wrap = document.getElementById('stepsLine');
  if (!wrap) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var steps = Array.prototype.slice.call(wrap.querySelectorAll('.hp-step'));
  var ticking = false;
  wrap.classList.add('hp-steps-js');

  function update() {
    ticking = false;
    var rect = wrap.getBoundingClientRect();
    var vh = window.innerHeight;
    var stacked = steps.length > 1 && steps[1].offsetTop > steps[0].offsetTop + 10;
    var p;
    if (stacked) {
      /* phone: the line runs down the side and follows the scroll */
      p = (vh * 0.62 - rect.top) / rect.height;
    } else {
      /* desktop: draws across while the row moves up the screen */
      p = (vh * 0.88 - rect.top) / (vh * 0.5);
    }
    p = Math.max(0, Math.min(1, p));
    wrap.style.setProperty('--sp', p.toFixed(3));
    steps.forEach(function (el) {
      var at = stacked ? el.offsetTop / wrap.offsetHeight : el.offsetLeft / wrap.offsetWidth;
      el.classList.toggle('hp-on', p > 0 && p >= at);
    });
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();

/* ============================================
   People strip: hand-drawn figures walk along
   the bottom edge. Illustrations: Open Peeps.
   Loads only when scrolled near, pauses off screen.
   ============================================ */
(function () {
  var section = document.getElementById('peopleStrip');
  if (!section || !('IntersectionObserver' in window)) return;
  var canvas = section.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var COLS = 15, ROWS = 7;               /* figures across and down the sheet */
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var img = new Image();
  var cells = [], crowd = [], free = [];
  var W = 0, H = 0, dpr = 1, scale = 0.75, cw = 0, ch = 0;
  var loaded = false, visible = false, running = false, last = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function place(p, fresh) {
    p.dir = Math.random() > 0.5 ? 1 : -1;
    p.speed = (W + cw) / rand(18, 40);                 /* px per second */
    var r = Math.random();
    p.baseY = H - ch + ch * 0.45 - ch * 0.5 * r * r;   /* most stand low, a few taller */
    p.phase = Math.random() * Math.PI * 2;
    var span = W + cw;
    var prog = fresh ? Math.random() : 0;
    p.x = p.dir === 1 ? -cw + span * prog : W - span * prog;
  }

  function fill() {
    crowd.length = 0;
    free = cells.slice();
    var want = Math.max(14, Math.min(60, Math.round(W / 22)));
    while (crowd.length < want && free.length) {
      var p = { cell: free.splice((Math.random() * free.length) | 0, 1)[0] };
      place(p, true);
      crowd.push(p);
    }
    crowd.sort(function (a, b) { return a.baseY - b.baseY; });
  }

  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    scale = W < 560 ? 0.55 : 0.75;
    cw = (img.naturalWidth / COLS) * scale;
    ch = (img.naturalHeight / ROWS) * scale;
    fill();
    draw(0);
  }

  function draw(t) {
    var sw = img.naturalWidth / COLS, sh = img.naturalHeight / ROWS;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < crowd.length; i++) {
      var p = crowd[i];
      var y = p.baseY - Math.abs(Math.sin(t * 6 + p.phase)) * 5;   /* walking bob */
      ctx.save();
      if (p.dir === 1) { ctx.translate(p.x, y); }
      else { ctx.translate(p.x + cw, y); ctx.scale(-1, 1); }
      ctx.drawImage(img, p.cell[0] * sw, p.cell[1] * sh, sw, sh, 0, 0, cw, ch);
      ctx.restore();
    }
  }

  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    var resort = false;
    for (var i = 0; i < crowd.length; i++) {
      var p = crowd[i];
      p.x += p.dir * p.speed * dt;
      if ((p.dir === 1 && p.x > W) || (p.dir === -1 && p.x < -cw)) {
        /* walked off: send a different figure in */
        free.push(p.cell);
        p.cell = free.splice((Math.random() * free.length) | 0, 1)[0];
        place(p, false);
        resort = true;
      }
    }
    if (resort) crowd.sort(function (a, b) { return a.baseY - b.baseY; });
    draw(now / 1000);
    requestAnimationFrame(frame);
  }

  function start() {
    if (still || running || !loaded || !visible) return;
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  }

  img.onload = function () {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) cells.push([c, r]);
    loaded = true;
    resize();
    start();
  };

  /* fetch the artwork only when the strip is about to come into view */
  var loader = new IntersectionObserver(function (e) {
    if (e[0].isIntersecting) { loader.disconnect(); img.src = canvas.getAttribute('data-src'); }
  }, { rootMargin: '400px 0px' });
  loader.observe(section);

  new IntersectionObserver(function (e) {
    visible = e[0].isIntersecting;
    start();
  }).observe(canvas);

  document.addEventListener('visibilitychange', start);
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (loaded) resize(); }, 150);
  });
})();
