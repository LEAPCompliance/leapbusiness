/* ============================================
   LEAP Business Solutions: EPF wage ceiling impact calculator
   Powers /calculators/epf-wage-ceiling/

   Part 1 is a pure calculation engine (no DOM), so it can be tested in Node.
   Part 2 is the page UI, which only runs in a browser.

   Basis for the figures: Gazette S.O. 5109(E) dated 17 September 2026 fixes the
   wage ceiling for Chapter III of the Code on Social Security, 2020 at Rs 25,000
   per month from that date; the earlier ceiling was Rs 15,000.
   ============================================ */
(function (root) {
  'use strict';

  var OLD_CEILING = 15000;
  var NEW_CEILING = 25000;
  var MONTH_DAYS  = 30;      /* denominator for day-based proration in the changeover month */
  var DAYS_BEFORE = 16;      /* 1 to 16 September 2026, old ceiling */
  var DAYS_AFTER  = 14;      /* 17 to 30 September 2026, new ceiling */

  /* ---------------------------------------------------------------
     PART 1: ENGINE
     All rupee amounts are rounded to whole rupees at each step that is
     displayed, so every figure on screen adds up to the next.
     Integer arithmetic (base * n / d) keeps exact .5 cases exact.
     --------------------------------------------------------------- */
  function rupees(n) { return Math.round(n); }
  function pct(base, num, den) { return Math.round(base * num / den); }

  /* seg = { ceiling, days (null = whole month, no proration),
             pf: 'cap' | 'actual', eps: 'none' | 'cap' | 'actual' } */
  function segmentBases(wages, seg) {
    var capBase = Math.min(wages, seg.ceiling);
    var pfBase  = seg.pf === 'actual' ? wages : capBase;

    /* Pension on actual wages is only meaningful when PF is also on actual wages;
       otherwise the pension share would exceed the employer's 12%. */
    var epsMode = (seg.eps === 'actual' && seg.pf !== 'actual') ? 'cap' : seg.eps;
    var epsBase = epsMode === 'none' ? 0 : (epsMode === 'actual' ? wages : capBase);

    if (seg.days === null || seg.days === undefined) {
      return { pf: rupees(pfBase), eps: rupees(epsBase), cap: rupees(capBase), epsMode: epsMode };
    }
    var f = seg.days / MONTH_DAYS;
    return { pf: rupees(pfBase * f), eps: rupees(epsBase * f), cap: rupees(capBase * f), epsMode: epsMode };
  }

  function contribute(wages, segments, opts) {
    opts = opts || {};
    var includeOverheads = opts.overheads !== false;
    var rows = [], pfTotal = 0, epsTotal = 0, capTotal = 0;

    segments.forEach(function (seg) {
      var b = segmentBases(wages, seg);
      rows.push({ seg: seg, pf: b.pf, eps: b.eps, cap: b.cap, epsMode: b.epsMode });
      pfTotal += b.pf; epsTotal += b.eps; capTotal += b.cap;
    });

    var employee   = pct(pfTotal, 12, 100);
    var employer12 = employee;                                   /* employer matches at 12% */
    var eps        = Math.min(pct(epsTotal, 833, 10000), employer12);   /* 8.33%, rounded first */
    var epf        = employer12 - eps;                           /* balance goes to EPF */
    var edli       = pct(capTotal, 5, 1000);                     /* 0.5% on ceiling-capped wages */
    var admin      = pct(pfTotal, 5, 1000);                      /* 0.5% of PF wages, no Rs 500 floor */
    var overheads  = includeOverheads ? edli + admin : 0;

    return {
      rows: rows, pfTotal: pfTotal, epsTotal: epsTotal, capTotal: capTotal,
      employee: employee, employer12: employer12, eps: eps, epf: epf,
      edli: edli, admin: admin, overheads: overheads, includeOverheads: includeOverheads,
      contribution: employee + employer12,          /* the employee + employer 12% flow */
      employerCost: employer12 + overheads,
      grandTotal: employee + employer12 + overheads
    };
  }

  /* One employee, one whole month, under a single ceiling. */
  function fullMonth(wages, ceiling, pfMode, epsMode, opts) {
    return contribute(wages, [{ ceiling: ceiling, days: null, pf: pfMode, eps: epsMode }], opts);
  }

  /* The changeover month: 16 days on the old ceiling, 14 on the new. */
  function septemberSegments(daysBefore, daysAfter, before, after) {
    before = before || { pf: 'cap', eps: 'cap' };
    after  = after  || { pf: 'cap', eps: 'cap' };
    return [
      { ceiling: OLD_CEILING, days: daysBefore, pf: before.pf, eps: before.eps },
      { ceiling: NEW_CEILING, days: daysAfter,  pf: after.pf,  eps: after.eps }
    ];
  }

  /* Coverage band by statutory PF wage. This classifies the wage only; it does not
     decide enrolment, which depends on membership and excluded-employee rules. */
  function coverageBand(wages) {
    if (wages <= OLD_CEILING) return 'within-old';
    if (wages <= NEW_CEILING) return 'newly-within';
    return 'above';
  }

  /* Monthly change for an existing member contributing on the ceiling-capped wage. */
  function memberDelta(wages) {
    var oldBase = Math.min(wages, OLD_CEILING);
    var newBase = Math.min(wages, NEW_CEILING);
    var ee = pct(newBase, 12, 100) - pct(oldBase, 12, 100);
    return { oldBase: oldBase, newBase: newBase, employee: ee, employer: ee };
  }

  /* Cost of one employee for one month at a given PF base (ceiling-capped). */
  function perHead(pfBase, includeOverheads) {
    var ee = pct(pfBase, 12, 100);
    var ov = includeOverheads ? pct(pfBase, 5, 1000) + pct(pfBase, 5, 1000) : 0;
    return { employee: ee, employer: ee + ov, ov: ov };
  }

  /* rows: [{ label, wage, count, status: 'member' | 'new' }]
     'member' = already in PF, contributing on the ceiling-capped wage.
     'new'    = not in PF today; what-if the employee were enrolled at the new ceiling. */
  function teamImpact(rows, includeOverheads) {
    var out = { rows: [], member: emptyBucket(), fresh: emptyBucket() };

    rows.forEach(function (r) {
      var w = r.wage, n = r.count;
      var oldBase = Math.min(w, OLD_CEILING), newBase = Math.min(w, NEW_CEILING);
      var isNew = r.status === 'new';

      var was   = isNew ? { employee: 0, employer: 0 } : perHead(oldBase, includeOverheads);
      var now   = perHead(newBase, includeOverheads);

      /* September: 16 days at the old ceiling then 14 at the new. A person not in PF
         today would only start from 17 September in this what-if. */
      var sepBase = isNew ? rupees(newBase * DAYS_AFTER / MONTH_DAYS)
                          : rupees(oldBase * DAYS_BEFORE / MONTH_DAYS) + rupees(newBase * DAYS_AFTER / MONTH_DAYS);
      var sep = perHead(sepBase, includeOverheads);

      var d = {
        employee: now.employee - was.employee,
        employer: now.employer - was.employer,
        sepEmployee: sep.employee - was.employee,
        sepEmployer: sep.employer - was.employer
      };
      var row = { label: r.label, wage: w, count: n, status: r.status, oldBase: oldBase, newBase: newBase,
                  was: was, now: now, perHead: d, total: {
                    employee: d.employee * n, employer: d.employer * n,
                    sepEmployee: d.sepEmployee * n, sepEmployer: d.sepEmployer * n } };
      out.rows.push(row);

      var b = isNew ? out.fresh : out.member;
      b.headcount += n;
      b.employee += row.total.employee;      b.employer += row.total.employer;
      b.sepEmployee += row.total.sepEmployee; b.sepEmployer += row.total.sepEmployer;
    });

    [out.member, out.fresh].forEach(function (b) {
      /* Financial year 2026-27: September split month plus October to March. */
      b.fyEmployee = b.sepEmployee + 6 * b.employee;
      b.fyEmployer = b.sepEmployer + 6 * b.employer;
      b.annualEmployee = 12 * b.employee;
      b.annualEmployer = 12 * b.employer;
    });
    return out;
  }
  function emptyBucket() {
    return { headcount: 0, employee: 0, employer: 0, sepEmployee: 0, sepEmployer: 0 };
  }

  var engine = {
    OLD_CEILING: OLD_CEILING, NEW_CEILING: NEW_CEILING,
    DAYS_BEFORE: DAYS_BEFORE, DAYS_AFTER: DAYS_AFTER, MONTH_DAYS: MONTH_DAYS,
    contribute: contribute, fullMonth: fullMonth, septemberSegments: septemberSegments,
    coverageBand: coverageBand, memberDelta: memberDelta, teamImpact: teamImpact
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = engine; return; }
  root.WageCeiling = engine;
  if (typeof document === 'undefined') return;

  /* ---------------------------------------------------------------
     PART 2: PAGE UI
     Results appear only when a Calculate button is pressed, so every
     rendered result matches one tracked calculate_click event.
     --------------------------------------------------------------- */
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
  var signed = function (n) { return (n > 0 ? '+' : n < 0 ? '-' : '') + fmt(Math.abs(n)); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var num = function (id) { return parseFloat(($(id) || {}).value) || 0; };
  var PLACEHOLDER = '<p class="wc-placeholder">Fill in the details and click Calculate to see your result.</p>';

  function track(toolName, eventName) {
    if (typeof root.gtag === 'function') {
      root.gtag('event', eventName || 'calculate_click', { tool_name: toolName });
    }
  }

  /* ---------- Tool 1: contribution calculator ---------- */
  var PERIODS = {
    split: function () { return [
      { label: 'Up to 16 September 2026', short: '1 to 16 Sep', ceiling: OLD_CEILING, max: DAYS_BEFORE, days: DAYS_BEFORE, pf: 'cap', eps: 'cap' },
      { label: 'From 17 September 2026',  short: '17 to 30 Sep', ceiling: NEW_CEILING, max: DAYS_AFTER,  days: DAYS_AFTER,  pf: 'cap', eps: 'cap' }
    ]; },
    'new': function () { return [
      { label: 'October 2026 onwards', short: 'Full month', ceiling: NEW_CEILING, max: null, days: null, pf: 'cap', eps: 'cap' }
    ]; },
    old: function () { return [
      { label: 'Before 17 September 2026', short: 'Full month', ceiling: OLD_CEILING, max: null, days: null, pf: 'cap', eps: 'cap' }
    ]; }
  };
  var PERIOD_TITLE = { split: 'September 2026 (changeover month)', 'new': 'October 2026 onwards, full month', old: 'Before 17 September 2026 (reference)' };
  var currentPeriod = 'split';

  var PF_LABEL  = { cap: 'Ceiling-capped (standard)', actual: 'On actual wages (voluntary)' };
  var EPS_LABEL = { none: 'No pension share', cap: 'Ceiling-capped (standard)', actual: 'On actual wages (higher pension option)' };

  function renderSegments() {
    var segs = PERIODS[currentPeriod]();
    var html = segs.map(function (s, i) {
      var days = s.max === null ? '' :
        '<div class="form-group wc-days"><label for="wc-days-' + i + '">Days worked</label>' +
        '<div class="wc-days-row"><input type="number" id="wc-days-' + i + '" data-idx="' + i + '" data-field="days" value="' + s.days + '" min="0" max="' + s.max + '" inputmode="numeric" />' +
        '<span class="wc-days-max">of ' + s.max + '</span></div></div>';
      return '<div class="wc-seg" data-idx="' + i + '" data-ceiling="' + s.ceiling + '" data-max="' + (s.max === null ? '' : s.max) + '">' +
        '<div class="wc-seg-head"><strong>' + esc(s.label) + '</strong><span class="wc-pill">' + fmt(s.ceiling) + ' ceiling</span></div>' +
        '<div class="wc-seg-fields">' + days +
        '<div class="form-group"><label for="wc-pf-' + i + '">PF wage basis</label>' +
        '<select id="wc-pf-' + i + '" data-idx="' + i + '" data-field="pf"><option value="cap">' + PF_LABEL.cap + '</option><option value="actual">' + PF_LABEL.actual + '</option></select></div>' +
        '<div class="form-group"><label for="wc-eps-' + i + '">Pension (EPS) basis</label>' +
        '<select id="wc-eps-' + i + '" data-idx="' + i + '" data-field="eps"><option value="none">' + EPS_LABEL.none + '</option><option value="cap" selected>' + EPS_LABEL.cap + '</option><option value="actual" disabled>' + EPS_LABEL.actual + '</option></select></div>' +
        '</div></div>';
    }).join('');
    $('wc-segments').innerHTML = html;
    var chips = $('wc-fullmonth');
    if (chips) chips.hidden = currentPeriod !== 'split';
  }

  /* Pension on actual wages only makes sense when PF is on actual wages too. */
  function syncEpsOptions(card) {
    var pf = card.querySelector('[data-field="pf"]');
    var eps = card.querySelector('[data-field="eps"]');
    var actualOpt = eps.querySelector('option[value="actual"]');
    actualOpt.disabled = pf.value !== 'actual';
    if (pf.value !== 'actual' && eps.value === 'actual') eps.value = 'cap';
  }

  function readSegments() {
    var base = PERIODS[currentPeriod]();
    var cards = document.querySelectorAll('#wc-segments .wc-seg');
    return base.map(function (s, i) {
      var card = cards[i];
      var days = null;
      if (s.max !== null) {
        days = Math.max(0, Math.min(s.max, Math.round(parseFloat(card.querySelector('[data-field="days"]').value) || 0)));
      }
      return {
        label: s.label, short: s.short, ceiling: s.ceiling, days: days, max: s.max,
        pf: card.querySelector('[data-field="pf"]').value,
        eps: card.querySelector('[data-field="eps"]').value
      };
    });
  }

  function calcContribution() {
    var out = $('wc-result');
    var wages = num('wc-wages');
    if (wages <= 0) {
      out.innerHTML = '<div class="calc-alert"><span class="calc-alert-icon">⚠</span><div><h5>Enter the PF wages</h5><p>Add the employee\'s statutory PF wages per month, then calculate.</p></div></div>';
      $('wc-print-bar-1').hidden = true;
      return;
    }
    var segs = readSegments();
    var overheads = $('wc-overheads').checked;
    var res = contribute(wages, segs, { overheads: overheads });

    /* Same employee, one whole month under each ceiling, using the basis chosen
       for the latest segment so the comparison reflects the user's settings. */
    var last = segs[segs.length - 1];
    var oldM = fullMonth(wages, OLD_CEILING, last.pf, last.eps, { overheads: overheads });
    var newM = fullMonth(wages, NEW_CEILING, last.pf, last.eps, { overheads: overheads });

    out.innerHTML = renderContribution(wages, segs, res, oldM, newM, overheads);
    $('wc-print-bar-1').hidden = false;
    track('epf-wage-ceiling');
  }

  function bar(label, oldV, newV, max) {
    var ow = max > 0 ? Math.max(2, Math.round(oldV / max * 100)) : 0;
    var nw = max > 0 ? Math.max(2, Math.round(newV / max * 100)) : 0;
    if (oldV === 0) ow = 0;
    if (newV === 0) nw = 0;
    return '<div class="wc-cmp-row"><div class="wc-cmp-label"><span>' + label + '</span><em>' + signed(newV - oldV) + '</em></div>' +
      '<div class="wc-cmp-bar"><small>Old</small><div class="track"><div class="fill old" style="width:' + ow + '%"></div></div><b>' + fmt(oldV) + '</b></div>' +
      '<div class="wc-cmp-bar"><small>New</small><div class="track"><div class="fill new" style="width:' + nw + '%"></div></div><b>' + fmt(newV) + '</b></div></div>';
  }

  function renderContribution(wages, segs, r, oldM, newM, overheads) {
    var isSplit = segs.length > 1;
    var ledger = r.rows.map(function (row) {
      var s = row.seg;
      return '<tr><td>' + esc(s.short) + '</td><td>' + fmt(s.ceiling) + '</td><td>' + (s.days === null ? 'Full' : s.days) + '</td>' +
        '<td>' + fmt(row.pf) + '</td><td>' + fmt(row.eps) + '</td></tr>';
    }).join('');

    var epsShare = r.employer12 > 0 ? Math.round(r.eps / r.employer12 * 100) : 0;
    var overheadRows = overheads
      ? '<div class="epf-group-head">Employer overheads (outside the 12%)</div>' +
        '<div class="epf-line"><span>EDLI, 0.5% of ceiling-capped wages (' + fmt(r.capTotal) + ')</span><strong>' + fmt(r.edli) + '</strong></div>' +
        '<div class="epf-line"><span>EPF admin charges, 0.5% of PF wages (' + fmt(r.pfTotal) + ')</span><strong>' + fmt(r.admin) + '</strong></div>'
      : '';

    var maxRow = Math.max(newM.employee, newM.eps, newM.epf, newM.grandTotal, 1);
    var cmp = bar('Employee PF (12%)', oldM.employee, newM.employee, maxRow) +
      bar('Employer EPS (8.33%)', oldM.eps, newM.eps, maxRow) +
      bar('Employer EPF (balance)', oldM.epf, newM.epf, maxRow) +
      (overheads ? bar('Employer overheads', oldM.overheads, newM.overheads, maxRow) : '') +
      bar('Total monthly outflow', overheads ? oldM.grandTotal : oldM.contribution, overheads ? newM.grandTotal : newM.contribution, maxRow);

    var notes = [];
    if (isSplit) notes.push('The changeover month is worked out in two halves. Each ceiling is spread over a ' + MONTH_DAYS + '-day month and multiplied by the days worked in that half, then the two halves are added. EPFO may prescribe its own method for this month, so confirm against its operational guidance.');
    if (segs.some(function (s) { return s.pf === 'actual'; })) notes.push('PF on actual wages above the ceiling is a voluntary arrangement. It is shown here only because you selected it.');
    if (r.rows.some(function (x) { return x.seg.eps === 'none'; })) notes.push('With no pension share, the whole employer 12% goes to the provident fund account.');
    if (r.rows.some(function (x) { return x.seg.eps === 'actual' && x.epsMode === 'actual'; })) notes.push('Pension on actual wages applies only where a valid higher pension option has already been exercised. It is uncommon, so confirm it before use.');
    notes.push('The ceiling sets the coverage limit and the default contribution base. Whether a particular employee must be enrolled, and on what wage, depends on membership status, the excluded-employee conditions and the effective-date rules in the EPF Scheme, 2026 and EPFO guidance. This calculator applies the figures you select and does not decide those questions.');

    return '' +
      '<div class="wc-print-only wc-print-head">' + printHead('Contribution summary') + '</div>' +
      '<div class="wc-hero-num"><span>Total monthly contribution, employee plus employer</span><strong>' + fmt(r.contribution) + '</strong>' +
      '<em>' + esc(PERIOD_TITLE[currentPeriod]) + '</em></div>' +
      '<div class="epf-sumgrid wc-sum3">' +
      '<div class="epf-sumcard"><span>Employee PF</span><strong>' + fmt(r.employee) + '</strong></div>' +
      '<div class="epf-sumcard"><span>Employer 12%</span><strong>' + fmt(r.employer12) + '</strong></div>' +
      '<div class="epf-sumcard"><span>' + (overheads ? 'Employer total cost' : 'Overheads')+ '</span><strong>' + (overheads ? fmt(r.employerCost) : 'Not included') + '</strong></div>' +
      '</div>' +

      '<div class="epf-group-head">Contribution wage</div>' +
      '<div class="wc-scroll"><table class="wc-table"><thead><tr><th>Period</th><th>Ceiling</th><th>Days</th><th>PF wage</th><th>Pension wage</th></tr></thead><tbody>' + ledger + '</tbody>' +
      (isSplit ? '<tfoot><tr><td colspan="3">Combined</td><td>' + fmt(r.pfTotal) + '</td><td>' + fmt(r.epsTotal) + '</td></tr></tfoot>' : '') +
      '</table></div>' +

      '<div class="epf-group-head">Contribution split</div>' +
      '<div class="epf-line"><span>Employee PF, 12% of ' + fmt(r.pfTotal) + '</span><strong>' + fmt(r.employee) + '</strong></div>' +
      '<div class="epf-line"><span>Employer share, 12% of ' + fmt(r.pfTotal) + '</span><strong>' + fmt(r.employer12) + '</strong></div>' +
      '<div class="calc-sub-row"><span>Pension (EPS), 8.33% of ' + fmt(r.epsTotal) + '</span><strong>' + fmt(r.eps) + '</strong></div>' +
      '<div class="calc-sub-row"><span>Provident fund (EPF), balance of the 12%</span><strong>' + fmt(r.epf) + '</strong></div>' +
      '<div class="wc-split" role="img" aria-label="Employer 12 percent: ' + epsShare + ' percent pension, ' + (100 - epsShare) + ' percent provident fund"><i class="eps" style="width:' + epsShare + '%"></i><i class="epf" style="width:' + (100 - epsShare) + '%"></i></div>' +
      '<div class="wc-legend"><span><i class="eps"></i>EPS ' + fmt(r.eps) + '</span><span><i class="epf"></i>EPF ' + fmt(r.epf) + '</span></div>' +
      overheadRows +
      '<div class="epf-line credit"><span>' + (overheads ? 'Total outflow including overheads' : 'Total employee plus employer') + '</span><strong>' + fmt(overheads ? r.grandTotal : r.contribution) + '</strong></div>' +

      '<div class="epf-group-head">Same employee, one full month under each ceiling</div>' +
      '<p class="wc-lead">Wages of ' + fmt(wages) + ', using the basis selected for ' + esc(segs[segs.length - 1].label.toLowerCase()) + '.</p>' +
      '<div class="wc-compare">' + cmp + '</div>' +

      '<ul class="wc-notes">' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' +
      '<div class="epf-src"><h5>Source provisions</h5><p>Wage ceiling of ' + fmt(NEW_CEILING) + ' per month for Chapter III, Code on Social Security, 2020: Gazette S.O. 5109(E), 17 September 2026, issued under section 2(89), superseding S.O. 2702(E) of 29 May 2026.<br>' +
      'Split of the employer 12% into pension and provident fund follows the prevailing EPF and EPS scheme provisions; verify against the EPF Scheme, 2026 and EPFO circulars.</p></div>';
  }

  function printHead(title) {
    return '<img src="/assets/logo.png" alt="LEAP Business Solutions" class="wc-print-logo" />' +
      '<div><h3>' + esc(title) + ': EPF wage ceiling of ₹25,000</h3>' +
      '<p class="wc-print-meta"><span class="wc-print-for"></span>Prepared on ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ' using leapbusiness.in/calculators/epf-wage-ceiling/. Indicative figures, not legal advice.</p></div>';
  }

  function resetContribution() {
    currentPeriod = 'split';
    document.querySelector('input[name="wc-period"][value="split"]').checked = true;
    paintPeriodCards();
    $('wc-wages').value = 30000;
    $('wc-overheads').checked = true;
    renderSegments();
    $('wc-result').innerHTML = PLACEHOLDER;
    $('wc-print-bar-1').hidden = true;
  }

  function paintPeriodCards() {
    document.querySelectorAll('#wc-period .opt-card').forEach(function (card) {
      card.classList.toggle('on', card.querySelector('input').checked);
    });
  }

  /* ---------- Tool 2: who is affected ---------- */
  function calcCoverage() {
    var out = $('wc-cov-result');
    var wages = num('wc-cov-wages');
    var member = $('wc-cov-member').value;
    if (wages <= 0) {
      out.innerHTML = '<div class="calc-alert"><span class="calc-alert-icon">⚠</span><div><h5>Enter the PF wages</h5><p>Add the employee\'s statutory PF wages per month, then check.</p></div></div>';
      return;
    }
    var band = coverageBand(wages);
    var d = memberDelta(wages);
    var cls, title, lead, points = [];

    if (band === 'within-old') {
      cls = 'is-a'; title = 'Already within the earlier ceiling';
      lead = 'PF wages of ' + fmt(wages) + ' were already at or below ' + fmt(OLD_CEILING) + ', so the coverage limit does not move for this employee.';
      points.push('Contribution continues on actual PF wages. There is no change from the new ceiling.');
      if (member === 'no') points.push('If this employee is not a PF member, that is a separate question. The ceiling change is not the reason, so check it against the EPF Scheme, 2026.');
    } else if (band === 'newly-within') {
      cls = 'is-b'; title = 'Newly within the ' + fmt(NEW_CEILING) + ' limit';
      lead = 'PF wages of ' + fmt(wages) + ' were above the old ' + fmt(OLD_CEILING) + ' ceiling and sit within the new ' + fmt(NEW_CEILING) + ' ceiling from 17 September 2026.';
      if (member === 'yes') {
        points.push('Already a member: the default contribution base moves from ' + fmt(d.oldBase) + ' to ' + fmt(d.newBase) + '. Estimated change per month is ' + signed(d.employee) + ' for the employee and ' + signed(d.employer) + ' for the employer, before overheads.');
      } else if (member === 'no') {
        points.push('Not a member today: being newly within the limit does not mean automatic enrolment. Check the excluded-employee conditions, the date of joining and any transitional rule in the EPF Scheme, 2026 before you enrol anyone or start deductions.');
      } else {
        points.push('Confirm the employee\'s membership status first, using EPFO records. Then apply the matching line: a member\'s base rises with the ceiling, while a non-member needs an excluded-employee review before any enrolment.');
      }
      points.push('Do not recover arrears or begin deductions for previously excluded employees until the effective-date rules are confirmed.');
    } else {
      cls = 'is-c'; title = 'Above the new ceiling';
      lead = 'PF wages of ' + fmt(wages) + ' are above ' + fmt(NEW_CEILING) + '.';
      if (member === 'yes') {
        points.push('Already a member: the default contribution base is capped at ' + fmt(NEW_CEILING) + ', up from ' + fmt(OLD_CEILING) + '. That is at most ' + signed(d.employee) + ' a month for the employee and ' + signed(d.employer) + ' for the employer, before overheads. Higher only if contributions are made on actual wages under a permitted arrangement.');
      } else {
        points.push('Earning above ' + fmt(NEW_CEILING) + ' does not, by itself, put an employee outside EPF. Membership depends on the employee\'s history and the excluded-employee conditions, so review it individually.');
      }
    }

    out.innerHTML =
      '<div class="wc-status ' + cls + '"><span class="wc-status-tag">' + esc(title) + '</span><p>' + esc(lead) + '</p></div>' +
      '<ul class="wc-notes">' + points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
      '<div class="wc-callout"><strong>Use PF wages, not gross pay.</strong> Statutory wages under section 2(88) of the Code on Social Security include basic pay, dearness allowance and retaining allowance, with listed components subject to the 50% rule. <a href="/calculators/allowance-heatmap/">Test your salary structure</a> to see what counts.</div>' +
      '<button type="button" class="btn btn-outline-dark wc-use-btn" onclick="WageCeilingUI.useWages(' + Math.round(wages) + ')">Use ' + fmt(wages) + ' in the contribution calculator</button>';
    track('epf-wage-ceiling-coverage');
  }

  function resetCoverage() {
    $('wc-cov-wages').value = 20000;
    $('wc-cov-member').value = 'unsure';
    $('wc-cov-result').innerHTML = PLACEHOLDER;
  }

  function useWages(w) {
    $('wc-wages').value = w;
    var el = $('wc-contribution');
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var btn = document.querySelector('#wc-contribution .btn-primary');
    if (btn) btn.focus({ preventScroll: true });
  }

  /* ---------- Tool 3: team budget impact ---------- */
  var TEAM_SAMPLE = [
    { label: 'Group A', wage: 18000, count: 20, status: 'member' },
    { label: 'Group B', wage: 24000, count: 8,  status: 'member' },
    { label: 'Group C', wage: 21000, count: 6,  status: 'new' }
  ];

  function teamRowHtml(r) {
    return '<tr>' +
      '<td><input type="text" class="wc-t-label" value="' + esc(r.label) + '" placeholder="Group name" aria-label="Group name" /></td>' +
      '<td><input type="number" class="wc-t-wage" value="' + r.wage + '" min="0" inputmode="numeric" aria-label="Statutory PF wage" /></td>' +
      '<td><input type="number" class="wc-t-count" value="' + r.count + '" min="0" inputmode="numeric" aria-label="Headcount" /></td>' +
      '<td><select class="wc-t-status" aria-label="PF status"><option value="member"' + (r.status === 'member' ? ' selected' : '') + '>Existing PF member</option><option value="new"' + (r.status === 'new' ? ' selected' : '') + '>Not in PF today (what-if)</option></select></td>' +
      '<td><button type="button" class="row-del" title="Remove group" onclick="this.closest(\'tr\').remove()">×</button></td></tr>';
  }
  function buildTeamRows() { $('wc-team-rows').innerHTML = TEAM_SAMPLE.map(teamRowHtml).join(''); }
  function addTeamRow() { $('wc-team-rows').insertAdjacentHTML('beforeend', teamRowHtml({ label: '', wage: 0, count: 0, status: 'member' })); }

  function readTeam() {
    return Array.prototype.map.call($('wc-team-rows').querySelectorAll('tr'), function (tr) {
      return {
        label: tr.querySelector('.wc-t-label').value.trim() || 'Group',
        wage: Math.max(0, parseFloat(tr.querySelector('.wc-t-wage').value) || 0),
        count: Math.max(0, Math.round(parseFloat(tr.querySelector('.wc-t-count').value) || 0)),
        status: tr.querySelector('.wc-t-status').value
      };
    }).filter(function (r) { return r.wage > 0 && r.count > 0; });
  }

  function calcTeam() {
    var out = $('wc-team-result');
    var rows = readTeam();
    if (!rows.length) {
      out.innerHTML = '<div class="calc-alert"><span class="calc-alert-icon">⚠</span><div><h5>Add at least one group</h5><p>Each group needs a PF wage and a headcount above zero.</p></div></div>';
      $('wc-print-bar-3').hidden = true;
      return;
    }
    var ov = $('wc-team-overheads').checked;
    var t = teamImpact(rows, ov);
    out.innerHTML = renderTeam(t, ov);
    $('wc-print-bar-3').hidden = false;
    track('epf-wage-ceiling-team');
  }

  function bucketCards(b, heading, sub) {
    if (!b.headcount) return '';
    return '<div class="wc-bucket"><h4>' + heading + '</h4><p class="wc-lead">' + sub(b.headcount + ' employee' + (b.headcount === 1 ? '' : 's')) + '</p>' +
      '<div class="epf-sumgrid">' +
      '<div class="epf-sumcard"><span>Extra employer cost per month, from October 2026</span><strong>' + fmt(b.employer) + '</strong></div>' +
      '<div class="epf-sumcard"><span>Extra employee deductions per month</span><strong>' + fmt(b.employee) + '</strong></div>' +
      '</div>' +
      '<div class="epf-line"><span>September 2026 (split month, full attendance), employer</span><strong>' + fmt(b.sepEmployer) + '</strong></div>' +
      '<div class="epf-line"><span>Financial year 2026-27 (September to March), employer</span><strong>' + fmt(b.fyEmployer) + '</strong></div>' +
      '<div class="epf-line"><span>Twelve months at the new ceiling, employer</span><strong>' + fmt(b.annualEmployer) + '</strong></div>' +
      '<div class="epf-line"><span>Twelve months at the new ceiling, employees</span><strong>' + fmt(b.annualEmployee) + '</strong></div></div>';
  }

  function renderTeam(t, ov) {
    var table = t.rows.map(function (r) {
      return '<tr><td>' + esc(r.label) + '</td><td>' + fmt(r.wage) + '</td><td>' + r.count + '</td>' +
        '<td>' + (r.status === 'new' ? 'What-if new' : 'Existing') + '</td>' +
        '<td>' + fmt(r.oldBase) + ' to ' + fmt(r.newBase) + '</td>' +
        '<td>' + signed(r.perHead.employer) + '</td><td>' + signed(r.total.employer) + '</td></tr>';
    }).join('');

    var worst = t.member.employer + t.fresh.employer;
    var worstFy = t.member.fyEmployer + t.fresh.fyEmployer;
    var both = t.member.headcount && t.fresh.headcount;

    return '' +
      '<div class="wc-print-only wc-print-head">' + printHead('Team budget impact') + '</div>' +
      bucketCards(t.member, 'Existing PF members', function (n) { return 'The higher ceiling applies to ' + n + '.'; }) +
      bucketCards(t.fresh, 'Possible new enrolments (what-if)', function (n) { return 'The added cost if ' + n + ' turn out to need enrolment.'; }) +
      (both ? '<div class="wc-worst"><span>Worst case, both groups, employer cost per month</span><strong>' + fmt(worst) + '</strong><em>' + fmt(worstFy) + ' for financial year 2026-27</em></div>' : '') +
      '<div class="epf-group-head">Group by group</div>' +
      '<div class="wc-scroll"><table class="wc-table"><thead><tr><th>Group</th><th>PF wage</th><th>Heads</th><th>Status</th><th>Base per head</th><th>Employer per head</th><th>Employer total</th></tr></thead><tbody>' + table + '</tbody></table></div>' +
      '<ul class="wc-notes">' +
      '<li>Existing members are assumed to have contributed on the ceiling-capped wage of ' + fmt(OLD_CEILING) + ', so their base rises to the lower of their wage and ' + fmt(NEW_CEILING) + '. Anyone already contributing on actual wages would see less change.</li>' +
      '<li>The what-if group is a scenario, not a finding. Enrolment depends on excluded-employee status and the rules in the EPF Scheme, 2026.</li>' +
      '<li>' + (ov ? 'Employer cost includes EDLI and admin charges of 0.5% each.' : 'Employer cost excludes EDLI and admin charges.') + ' September assumes 16 days at the old ceiling and 14 at the new.</li>' +
      '<li>Part of the added cost may be recovered under the PMVBRY scheme, an incentive of up to ₹3,000 per employee per month on submitting Aadhaar and KYC details, for 2 years (non-manufacturing) or 4 years (manufacturing). It is not netted off here, and eligibility conditions apply.</li></ul>';
  }

  function resetTeam() {
    buildTeamRows();
    $('wc-team-overheads').checked = true;
    $('wc-team-result').innerHTML = PLACEHOLDER;
    $('wc-print-bar-3').hidden = true;
  }

  /* ---------- Printing ---------- */
  function printTool(tool, barId) {
    var name = ($(barId).querySelector('.wc-prep-name') || {}).value || '';
    document.querySelectorAll('.wc-print-for').forEach(function (el) {
      el.textContent = name.trim() ? 'Prepared for ' + name.trim() + '. ' : '';
    });
    var cls = 'wc-printing-' + tool;
    document.body.classList.add(cls);
    var clean = function () { document.body.classList.remove(cls); window.removeEventListener('afterprint', clean); };
    window.addEventListener('afterprint', clean);
    track('epf-wage-ceiling-' + tool, 'print_summary');
    window.print();
    setTimeout(clean, 1500);
  }

  /* ---------- Checklist ---------- */
  var STORE_KEY = 'leap-epf-ceiling-checklist-v1';
  function loadChecks() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveChecks(o) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(o)); } catch (e) { /* storage blocked, ignore */ }
  }
  function paintProgress() {
    var boxes = document.querySelectorAll('.wc-check input[type="checkbox"]');
    var done = 0;
    boxes.forEach(function (b) { if (b.checked) done++; b.closest('li').classList.toggle('done', b.checked); });
    $('wc-progress-text').textContent = done + ' of ' + boxes.length + ' done';
    $('wc-progress-fill').style.width = (boxes.length ? Math.round(done / boxes.length * 100) : 0) + '%';
  }
  function initChecklist() {
    var saved = loadChecks();
    document.querySelectorAll('.wc-check input[type="checkbox"]').forEach(function (b) {
      b.checked = !!saved[b.dataset.id];
      b.addEventListener('change', function () {
        var s = loadChecks(); s[b.dataset.id] = b.checked; saveChecks(s); paintProgress();
      });
    });
    paintProgress();
  }
  function resetChecklist() {
    saveChecks({});
    document.querySelectorAll('.wc-check input[type="checkbox"]').forEach(function (b) { b.checked = false; });
    paintProgress();
  }

  /* ---------- Wire-up ---------- */
  function init() {
    if (!$('wc-segments')) return;

    document.querySelectorAll('input[name="wc-period"]').forEach(function (r) {
      r.addEventListener('change', function () {
        currentPeriod = r.value; paintPeriodCards(); renderSegments();
        $('wc-result').innerHTML = PLACEHOLDER; $('wc-print-bar-1').hidden = true;
      });
    });
    $('wc-segments').addEventListener('change', function (e) {
      if (e.target.matches('[data-field="pf"]')) syncEpsOptions(e.target.closest('.wc-seg'));
    });
    $('wc-fullmonth').addEventListener('click', function () {
      document.querySelectorAll('#wc-segments .wc-seg').forEach(function (card) {
        var inp = card.querySelector('[data-field="days"]');
        if (inp) inp.value = card.dataset.max;
      });
    });

    paintPeriodCards();
    renderSegments();
    buildTeamRows();
    initChecklist();
  }

  root.WageCeilingUI = {
    calcContribution: calcContribution, resetContribution: resetContribution,
    calcCoverage: calcCoverage, resetCoverage: resetCoverage, useWages: useWages,
    calcTeam: calcTeam, resetTeam: resetTeam, addTeamRow: addTeamRow,
    printTool: printTool, resetChecklist: resetChecklist
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})(typeof window !== 'undefined' ? window : this);
