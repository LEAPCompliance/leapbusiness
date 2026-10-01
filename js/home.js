/* ============================================
   LEAP homepage (index.html only)
   Before LEAP / With LEAP switch
   ============================================ */
(function () {
  var el = document.getElementById('flip');
  if (!el) return;

  function set(state) {
    el.classList.toggle('hp-is-before', state === 'before');
    el.classList.toggle('hp-is-after', state === 'after');
  }

  el.querySelectorAll('.hp-flip-switch button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      el.classList.add('hp-touched');
      set(btn.dataset.s);
    });
  });

  /* Flip once by itself when the section scrolls into view */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        io.disconnect();
        setTimeout(function () {
          if (!el.classList.contains('hp-touched')) set('after');
        }, 1800);
      }
    }, { threshold: 0.5 });
    io.observe(el);
  }
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
