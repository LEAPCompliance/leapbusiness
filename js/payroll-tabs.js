/* ============================================
   Payroll Services tabs (PF | ESIC | PT | LWF)
   Accessible tablist, deep links (#pf #esic #pt #lwf), GA4 event
   ============================================ */
(function () {
  var section = document.getElementById('payroll-services');
  if (!section) return;

  var tabs = Array.prototype.slice.call(section.querySelectorAll('[role="tab"]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  var keys = tabs.map(function (t) { return t.getAttribute('data-tab'); });
  if (!tabs.length) return;

  section.classList.add('js-tabs');

  function activate(index, opts) {
    opts = opts || {};
    tabs.forEach(function (t, i) {
      var on = i === index;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.setAttribute('tabindex', on ? '0' : '-1');
      panels[i].hidden = !on;
    });
    if (opts.focus) tabs[index].focus();
    if (opts.updateHash && window.history && history.replaceState) {
      history.replaceState(null, '', '#' + keys[index]);
    }
    if (opts.track && typeof gtag === 'function') {
      gtag('event', 'payroll_tab_click', { tab_name: keys[index] });
    }
  }

  function scrollToSection(instant) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: (reduce || instant) ? 'auto' : 'smooth', block: 'start' });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      activate(i, { updateHash: true, track: true });
    });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next !== null) {
        e.preventDefault();
        activate(next, { focus: true, updateHash: true, track: true });
      }
    });
  });

  function fromHash(scroll, instant) {
    var idx = keys.indexOf((location.hash || '').replace('#', ''));
    if (idx > -1) {
      activate(idx);
      if (scroll) scrollToSection(instant);
      return true;
    }
    return false;
  }

  window.addEventListener('hashchange', function () { fromHash(true); });

  if (!fromHash(false)) {
    activate(0);
  } else {
    /* Deep link on first load: wait for images and fonts so layout above the
       section has settled, then jump straight to it (no mid-load smooth scroll). */
    if (document.readyState === 'complete') scrollToSection(true);
    else window.addEventListener('load', function () { scrollToSection(true); });
  }
})();
