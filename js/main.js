/* ============================================
   LEAP Business Solutions – Main JS
   FAQ · Scroll Animations · Form · Checklist
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

/* ── Checklist download (generates text file, no server needed) ── */
function generateChecklist() {
  const items = [
    'Provident Fund (PF) – Monthly ECR filing & payment by 15th',
    'Employee State Insurance (ESIC) – Monthly contribution & return',
    'Professional Tax (PT) – Monthly deduction & quarterly/annual return',
    'Labour Welfare Fund (LWF) – Half-yearly/annual contribution',
    'Payment of Bonus Act – Annual bonus payment (8.33% – 20%)',
    'Payment of Gratuity Act – Gratuity fund & actuarial valuation',
    'Maternity Benefit Act – Policy, benefits & record maintenance',
    'POSH Act – ICC formation, annual report & training',
    'Employment Exchange Act – Quarterly return filing',
    'Contract Labour (R&A) Act – License & return filing',
    'Shops & Establishment Act – Annual renewal of registration',
    'Minimum Wages Act – Revision compliance & wage register',
    'Payment of Wages Act – Wage slip & deduction register',
    'Equal Remuneration Act – Register of workers',
    'Factory Act – Annual return & license renewal (if applicable)',
  ];

  let content  = 'LEAP BUSINESS SOLUTIONS\n';
      content += 'Labour Law Compliance Checklist – India\n';
      content += 'www.leapbusiness.in  |  support@leapbusiness.in  |  +91 79772 13501\n';
      content += '='.repeat(62) + '\n\n';
  items.forEach((item, i) => { content += `[ ] ${i + 1}. ${item}\n\n`; });
  content += '\n' + '='.repeat(62) + '\n';
  content += 'For a FREE Compliance Audit within 1 hour – just call us!\n';
  content += 'Mumbai, Maharashtra  |  Pan-India Services\n';

  const blob = new Blob([content], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'LEAP-Compliance-Checklist.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Checklist downloaded!');
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

  /* Checklist buttons (may appear on multiple pages) */
  document.querySelectorAll('#downloadChecklist, #downloadChecklist2').forEach(btn => {
    btn.addEventListener('click', generateChecklist);
  });
});
