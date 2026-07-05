/* ============================================
   LEAP Business Solutions – Main JS
   FAQ · Scroll Animations · Form · Newsletter · Nav Dropdowns
   ============================================ */

/* ── FAQ accordion ── */
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item   = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-a');
      const isOpen = item.classList.contains('open');

      /* Close all open items */
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-a').style.maxHeight = '0';
      });

      /* Open clicked item if it was closed */
      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

/* ── Scroll-reveal animations ── */
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.10 });

  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
}

/* ── Counter animation (hero stats) ── */
function animateCounter(el, target, suffix) {
  let current = 0;
  const step  = target / 60;
  const timer = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.floor(current) + suffix;
  }, 25);
}

function initCounters() {
  const statsSection = document.querySelector('.hero-stats');
  if (!statsSection) return;

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.querySelectorAll('.stat-num').forEach(el => {
          const val = parseInt(el.dataset.val);
          if (!isNaN(val)) animateCounter(el, val, el.dataset.suffix || '');
        });
        statsObserver.disconnect();
      }
    });
  }, { threshold: 0.5 });

  statsObserver.observe(statsSection);
}

/* ── Contact form ── */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const formData = new FormData(form);
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData
      });
      const result = await response.json();

      if (result.success) {
        showToast('✅ Thank you! We\'ll call you within 1 hour.');
        form.reset();
      } else {
        showToast('⚠️ Something went wrong. Please call us directly at +91 79772 13501.');
      }
    } catch (err) {
      showToast('⚠️ Something went wrong. Please call us directly at +91 79772 13501.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

/* ── Nav dropdown hover-intent (grace period so the menu doesn't
   snap shut the instant the cursor's path grazes outside the box) ── */
function initNavDropdowns() {
  const dropdowns = document.querySelectorAll('.nav-dropdown');
  dropdowns.forEach(dd => {
    let closeTimer = null;
    dd.addEventListener('mouseenter', () => {
      clearTimeout(closeTimer);
      dd.classList.add('open');
    });
    dd.addEventListener('mouseleave', () => {
      closeTimer = setTimeout(() => dd.classList.remove('open'), 350);
    });
  });
}

/* ── Newsletter form (footer) ── */
function initNewsletterForm() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Subscribing...';

    try {
      const formData = new FormData(form);
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData
      });
      const result = await response.json();

      if (result.success) {
        showToast('✅ Subscribed! You\'ll get compliance updates by email.');
        form.reset();
      } else {
        showToast('⚠️ Something went wrong. Please email support@leapbusiness.in.');
      }
    } catch (err) {
      showToast('⚠️ Something went wrong. Please email support@leapbusiness.in.');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

/* ── Toast notification ── */
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

/* ── Boot all modules on DOMContentLoaded ── */
document.addEventListener('DOMContentLoaded', () => {
  initFAQ();
  initScrollReveal();
  initCounters();
  initContactForm();
  initNewsletterForm();
  initNavDropdowns();
});
