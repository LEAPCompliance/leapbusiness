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
    el.textContent = Math.floor(current).toLocaleString('en-IN') + suffix;
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
        if (typeof gtag === 'function') {
          gtag('event', 'generate_lead', { form_name: 'contact_form' });
        }
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

/* ── WhatsApp / call click tracking (event delegation catches every
   tel: and wa.me link site-wide, including ones injected by components.js) ── */
function initContactClickTracking() {
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="tel:"], a[href*="wa.me"]');
    if (!link || typeof gtag !== 'function') return;
    const eventName = link.href.includes('wa.me') ? 'whatsapp_click' : 'phone_click';
    gtag('event', eventName, {
      link_url: link.href,
      page_path: window.location.pathname
    });
  });
}

/* ── Gazette Notifications list + filters ── */
function initNotifications() {
  const container = document.getElementById('notifications-list');
  if (!container || typeof NOTIFICATIONS === 'undefined') return;

  const tagFilter = document.getElementById('notif-tag-filter');
  const regionFilter = document.getElementById('notif-region-filter');

  function formatDate(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function populateFilters() {
    [...new Set(NOTIFICATIONS.map(n => n.tag))].forEach(t => {
      tagFilter.insertAdjacentHTML('beforeend', `<option value="${t}">${t}</option>`);
    });
    [...new Set(NOTIFICATIONS.map(n => n.region))].forEach(r => {
      regionFilter.insertAdjacentHTML('beforeend', `<option value="${r}">${r}</option>`);
    });
  }

  function render() {
    const tagVal = tagFilter.value;
    const regionVal = regionFilter.value;
    const filtered = NOTIFICATIONS.filter(n =>
      (tagVal === 'all' || n.tag === tagVal) && (regionVal === 'all' || n.region === regionVal)
    );
    container.innerHTML = filtered.length ? filtered.map(n => `
      <div style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:28px;margin-bottom:20px;background:#fff">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">
          <span style="background:var(--secondary-faint);color:var(--primary);font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;font-family:'Inter',sans-serif">${n.region}</span>
          <span style="font-size:12px;color:var(--text-secondary);font-family:'Inter',sans-serif">Released: ${formatDate(n.releasedDate)}${n.effectiveDate ? ` · Effective: ${formatDate(n.effectiveDate)}` : ''}</span>
        </div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--primary);margin-bottom:8px;font-family:'Inter',sans-serif">${n.tag}</div>
        <h3 style="font-family:'Playfair Display',serif;font-size:19px;color:var(--primary);margin-bottom:10px">${n.title}</h3>
        <p style="font-size:14px;line-height:1.7;color:var(--text-secondary);margin-bottom:16px;font-family:'Inter',sans-serif">${n.excerpt}</p>
        <a href="${n.link}" class="btn btn-primary" style="font-size:14px;padding:9px 18px">${n.linkLabel} →</a>
      </div>
    `).join('') : '<p style="text-align:center;color:var(--text-secondary);padding:40px 0;font-family:\'Inter\',sans-serif">No notifications match this filter yet.</p>';
  }

  populateFilters();
  tagFilter.addEventListener('change', render);
  regionFilter.addEventListener('change', render);
  render();
}

/* ── Boot all modules on DOMContentLoaded ── */
document.addEventListener('DOMContentLoaded', () => {
  initFAQ();
  initScrollReveal();
  initCounters();
  initContactForm();
  initNewsletterForm();
  initNavDropdowns();
  initContactClickTracking();
  initNotifications();
});
