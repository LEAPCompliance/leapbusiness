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
