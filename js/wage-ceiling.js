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

  /* September 2026 can be treated three ways. None is confirmed by the notification, so the
     methods are offered side by side: split by days, whole month at the new ceiling, or whole
     month at the earlier ceiling (new ceiling from October). */
  function septemberSegmentsFor(method, daysBefore, daysAfter, before, after) {
    if (method === 'whole25') return [{ ceiling: NEW_CEILING, days: null, pf: after.pf, eps: after.eps }];
    if (method === 'whole15') return [{ ceiling: OLD_CEILING, days: null, pf: before.pf, eps: before.eps }];
    return septemberSegments(daysBefore, daysAfter, before, after);
  }
  function wholeMonthCeiling(period, method) {
    if (period === 'old') return OLD_CEILING;
    if (period === 'new') return NEW_CEILING;
    return method === 'whole25' ? NEW_CEILING : OLD_CEILING;
  }

  /* ---------------------------------------------------------------
     BULK: one PF calculation per row of a salary file.
     rec = { code, name, gross (number or null), heads: {name: amount},
             d1, d2 (days in the split month, null = full), member, pension }
     cfg = { period: 'old' | 'split' | 'new', pfBasis: 'cap' | 'actual',
             mode: 'sum' | 'grossless', incl: [head names], excl: [head names],
             overheads: bool, warn50: bool }
     PF wage is either the sum of the ticked heads (mode 'sum') or the
     gross less the ticked heads (mode 'grossless').
     --------------------------------------------------------------- */
  function bulkCompute(records, cfg) {
    var incl = cfg.incl || [], excl = cfg.excl || [];
    var rows = [];
    var totals = { pfWage: 0, contribWage: 0, epsWage: 0, employee: 0, employer12: 0, eps: 0, epf: 0, edli: 0, admin: 0, total: 0 };
    var counts = { processed: 0, skipped: 0, flagged: 0 };

    records.forEach(function (rec) {
      var flags = [], headsSum = 0, name;
      for (name in rec.heads) if (Object.prototype.hasOwnProperty.call(rec.heads, name)) headsSum += rec.heads[name];
      var hasGross = rec.gross !== null && rec.gross !== undefined && !isNaN(rec.gross);
      var gross = hasGross ? rec.gross : headsSum;

      var pfWage = 0;
      if (cfg.mode === 'grossless') {
        var out = 0;
        excl.forEach(function (h) { out += rec.heads[h] || 0; });
        pfWage = gross - out;
      } else {
        incl.forEach(function (h) { pfWage += rec.heads[h] || 0; });
      }
      if (pfWage < 0) { flags.push('PF wage is negative'); pfWage = 0; }
      pfWage = Math.round(pfWage);

      if (hasGross && Math.abs(headsSum - gross) > 1) {
        flags.push('Heads in the file add up to ' + Math.round(headsSum) + ', Gross is ' + Math.round(gross) + ' (a pay head may be missing)');
      }
      if (cfg.warn50 && gross > 0 && pfWage < gross * 0.5 - 0.5) {
        flags.push('50% check: PF wage is ' + Math.round(pfWage / gross * 100) + '% of gross. If the heads left out are all listed exclusions under s.2(88), wages would be at least ' + Math.round(gross * 0.5));
      }

      var row = { code: rec.code, name: rec.name, gross: Math.round(gross), pfWage: pfWage, contribWage: 0, epsWage: 0, segs: [],
                  employee: 0, employer12: 0, eps: 0, epf: 0, edli: 0, admin: 0, total: 0,
                  flags: flags, skipped: false };

      if (rec.member === false) {
        row.skipped = true; flags.unshift('Not a PF member, skipped');
      } else if (pfWage <= 0) {
        row.skipped = true; flags.unshift('PF wage is zero, skipped');
      } else {
        var epsMode = rec.pension === false ? 'none' : 'cap';
        if (rec.pension === false) flags.push('Pension not applicable, whole 12% goes to EPF');
        var segs;
        if (cfg.period === 'split' && (cfg.method || 'split') === 'split') {
          var d1 = rec.d1 === null || rec.d1 === undefined ? DAYS_BEFORE : rec.d1;
          var d2 = rec.d2 === null || rec.d2 === undefined ? DAYS_AFTER : rec.d2;
          if (d1 < 0 || d1 > DAYS_BEFORE || d2 < 0 || d2 > DAYS_AFTER) flags.push('Days outside 0 to ' + DAYS_BEFORE + ' and 0 to ' + DAYS_AFTER + ', adjusted');
          d1 = Math.max(0, Math.min(DAYS_BEFORE, Math.round(d1)));
          d2 = Math.max(0, Math.min(DAYS_AFTER, Math.round(d2)));
          segs = septemberSegments(d1, d2, { pf: cfg.pfBasis, eps: epsMode }, { pf: cfg.pfBasis, eps: epsMode });
        } else {
          segs = [{ ceiling: wholeMonthCeiling(cfg.period, cfg.method), days: null, pf: cfg.pfBasis, eps: epsMode }];
        }
        var r = contribute(pfWage, segs, { overheads: cfg.overheads });
        if (r.pfTotal <= 0) {
          row.skipped = true; flags.unshift('No days to count, skipped');
        } else {
          row.contribWage = r.pfTotal; row.epsWage = r.epsTotal; row.employee = r.employee; row.employer12 = r.employer12;
          row.segs = r.rows.map(function (x) { return { ceiling: x.seg.ceiling, days: x.seg.days, pf: x.pf, eps: x.eps }; });
          row.eps = r.eps; row.epf = r.epf; row.edli = r.includeOverheads ? r.edli : 0;
          row.admin = r.includeOverheads ? r.admin : 0; row.total = r.grandTotal;
        }
      }

      if (row.skipped) counts.skipped++; else {
        counts.processed++;
        totals.pfWage += row.pfWage; totals.contribWage += row.contribWage; totals.epsWage += row.epsWage; totals.employee += row.employee;
        totals.employer12 += row.employer12; totals.eps += row.eps; totals.epf += row.epf;
        totals.edli += row.edli; totals.admin += row.admin; totals.total += row.total;
      }
      if (flags.length) counts.flagged++;
      rows.push(row);
    });
    return { rows: rows, totals: totals, counts: counts };
  }

  var engine = {
    OLD_CEILING: OLD_CEILING, NEW_CEILING: NEW_CEILING,
    DAYS_BEFORE: DAYS_BEFORE, DAYS_AFTER: DAYS_AFTER, MONTH_DAYS: MONTH_DAYS,
    contribute: contribute, fullMonth: fullMonth, septemberSegments: septemberSegments,
    septemberSegmentsFor: septemberSegmentsFor, bulkCompute: bulkCompute
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

  var METHOD_SHORT = { split: 'split by days', whole25: 'whole month at \u20B925,000', whole15: 'whole month at \u20B915,000' };
  var METHOD_ROW = { split: 'Split by days', whole25: 'Whole month at \u20B925,000', whole15: 'Whole month at \u20B915,000 (new ceiling from October)' };
  function methodNote(method) {
    if (method === 'whole25') return 'September is treated as one whole month at the \u20B925,000 ceiling, so the higher ceiling applies to all 30 days even though the notification took effect on 17 September. Days worked are not used. This is a simplification, so confirm the treatment with EPFO before filing.';
    if (method === 'whole15') return 'September is treated as one whole month at the earlier \u20B915,000 ceiling, with the new ceiling starting from October. This is a simplification, because the notification took effect on 17 September, so confirm the treatment with EPFO before filing.';
    return '';
  }
  var HOW = [
    'PF wage in each slab: the lower of the wage and the ceiling, multiplied by days worked and divided by 30, rounded to whole rupees. On the actual basis the full wage is used instead of the lower figure.',
    'Employee A/c 1: 12% of the combined PF wage.',
    'Employer share: 12% of the combined PF wage. It is split into EPS and EPF.',
    'Employer A/c 10, EPS: 8.33% of the pension wage, which is capped at the ceiling and never more than the employer 12%.',
    'Employer A/c 1, EPF: the employer 12% minus EPS, which is the 3.67% balance.',
    'Employer A/c 2, admin: 0.5% of the combined PF wage, with no \u20B9500 minimum applied per employee.',
    'Employer A/c 21, EDLI: 0.5% of the wage capped at the ceiling.',
    'Each line is rounded to whole rupees, and totals add the rounded lines.'
  ];

  function track(toolName, eventName) {
    if (typeof root.gtag === 'function') {
      root.gtag('event', eventName || 'calculate_click', { tool_name: toolName });
    }
  }

  /* ---------- Tool 1: contribution calculator ---------- */
  var PERIODS = {
    split: function () {
      if (currentMethod === 'whole25') return [{ label: 'September 2026, whole month', short: 'Whole month', ceiling: NEW_CEILING, max: null, days: null, pf: 'cap', eps: 'cap' }];
      if (currentMethod === 'whole15') return [{ label: 'September 2026, whole month', short: 'Whole month', ceiling: OLD_CEILING, max: null, days: null, pf: 'cap', eps: 'cap' }];
      return [
        { label: 'Up to 16 September 2026', short: '1 to 16 Sep', ceiling: OLD_CEILING, max: DAYS_BEFORE, days: DAYS_BEFORE, pf: 'cap', eps: 'cap' },
        { label: 'From 17 September 2026',  short: '17 to 30 Sep', ceiling: NEW_CEILING, max: DAYS_AFTER,  days: DAYS_AFTER,  pf: 'cap', eps: 'cap' }
      ];
    },
    'new': function () { return [
      { label: 'October 2026 onwards', short: 'Full month', ceiling: NEW_CEILING, max: null, days: null, pf: 'cap', eps: 'cap' }
    ]; },
    old: function () { return [
      { label: 'Before 17 September 2026', short: 'Full month', ceiling: OLD_CEILING, max: null, days: null, pf: 'cap', eps: 'cap' }
    ]; }
  };
  var PERIOD_TITLE = { split: 'September 2026 (changeover month)', 'new': 'October 2026 onwards, full month', old: 'Before 17 September 2026 (reference)' };
  var currentPeriod = 'split';
  var currentMethod = 'split';
  var lastDays = { d1: DAYS_BEFORE, d2: DAYS_AFTER };

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
    if (chips) chips.hidden = !(currentPeriod === 'split' && currentMethod === 'split');
    var mw = $('wc-method-wrap');
    if (mw) mw.hidden = currentPeriod !== 'split';
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
    var out = base.map(function (s, i) {
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
    if (currentPeriod === 'split' && currentMethod === 'split') lastDays = { d1: out[0].days, d2: out[1].days };
    return out;
  }

  /* September under each of the three methods, for the same wages and basis. */
  function septemberComparison(wages, segs, overheads) {
    var before = { pf: segs[0].pf, eps: segs[0].eps };
    var after = { pf: segs[segs.length - 1].pf, eps: segs[segs.length - 1].eps };
    return {
      selected: currentMethod, wages: wages, d1: lastDays.d1, d2: lastDays.d2,
      rows: ['split', 'whole25', 'whole15'].map(function (m) {
        return { method: m, r: contribute(wages, septemberSegmentsFor(m, lastDays.d1, lastDays.d2, before, after), { overheads: overheads }) };
      })
    };
  }
  function sepCmpHtml(c, oh) {
    var tot = function (r) { return oh ? r.grandTotal : r.contribution; };
    var sel = c.rows.filter(function (x) { return x.method === c.selected; })[0];
    var body = c.rows.map(function (x) {
      var r = x.r, isSel = x.method === c.selected;
      return '<tr class="' + (isSel ? 'is-sel' : '') + '"><td>' + esc(METHOD_ROW[x.method]) + (isSel ? ' (selected)' : '') + '</td><td>' + fmt(r.pfTotal) + '</td><td>' + fmt(r.employee) + '</td><td>' + fmt(r.employer12) + '</td>' +
        (oh ? '<td>' + fmt(r.overheads) + '</td>' : '') + '<td>' + fmt(tot(r)) + '</td><td>' + (isSel ? '-' : signed(tot(r) - tot(sel.r))) + '</td></tr>';
    }).join('');
    return '<div class="epf-group-head">September method comparison</div>' +
      '<p class="wc-lead">Wages of ' + fmt(c.wages) + '. The split method uses ' + c.d1 + ' days before and ' + c.d2 + ' days after 17 September. None of the three is confirmed by the Gazette, the EPFO press release or the PIB release, so confirm with EPFO before you file.</p>' +
      '<div class="wc-scroll"><table class="wc-table wc-mtable"><thead><tr><th>Method</th><th>PF wage</th><th>Employee</th><th>Employer 12%</th>' + (oh ? '<th>Overheads</th>' : '') + '<th>Total</th><th>Against selected</th></tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  function periodTitle() {
    return currentPeriod === 'split' ? 'September 2026, ' + METHOD_SHORT[currentMethod] : PERIOD_TITLE[currentPeriod];
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

    var sepCmp = currentPeriod === 'split' ? septemberComparison(wages, segs, overheads) : null;
    out.innerHTML = renderContribution(wages, segs, res, oldM, newM, overheads, sepCmp);
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

  function renderContribution(wages, segs, r, oldM, newM, overheads, sepCmp) {
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
    if (!isSplit && currentPeriod === 'split') notes.push(methodNote(currentMethod));
    if (isSplit) notes.push('The changeover month is worked out in two halves. Each ceiling is spread over a ' + MONTH_DAYS + '-day month and multiplied by the days worked in that half, then the two halves are added. EPFO may prescribe its own method for this month, so confirm against its operational guidance.');
    if (segs.some(function (s) { return s.pf === 'actual'; })) notes.push('PF on actual wages above the ceiling is a voluntary arrangement. It is shown here only because you selected it.');
    if (r.rows.some(function (x) { return x.seg.eps === 'none'; })) notes.push('With no pension share, the whole employer 12% goes to the provident fund account.');
    if (r.rows.some(function (x) { return x.seg.eps === 'actual' && x.epsMode === 'actual'; })) notes.push('Pension on actual wages applies only where a valid higher pension option has already been exercised. It is uncommon, so confirm it before use.');
    notes.push('The ceiling sets the coverage limit and the default contribution base. Whether a particular employee must be enrolled, and on what wage, depends on membership status, the excluded-employee conditions and the effective-date rules in the EPF Scheme, 2026 and EPFO guidance. This calculator applies the figures you select and does not decide those questions.');

    return '' +
      '<div class="wc-print-only wc-print-head">' + printHead('Contribution summary') + '</div>' +
      '<div class="wc-hero-num"><span>Total monthly contribution, employee plus employer</span><strong>' + fmt(r.contribution) + '</strong>' +
      '<em>' + esc(periodTitle()) + '</em></div>' +
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

      (sepCmp ? sepCmpHtml(sepCmp, overheads) : '') +
      '<div class="epf-group-head">Same employee, one full month under each ceiling</div>' +
      '<p class="wc-lead">Wages of ' + fmt(wages) + ', using the basis selected for ' + esc(segs[segs.length - 1].label.toLowerCase()) + '.</p>' +
      '<div class="wc-compare">' + cmp + '</div>' +

      '<details class="wc-how"><summary>How each line is worked out</summary><ul>' + HOW.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul></details>' +
      '<p class="wc-lead" style="margin-top:14px"><a href="#wc-excel">Get this working in Excel</a>, with formulas and notes for every line, or read the <a href="#wc-sources">sources</a>.</p>' +
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
    currentMethod = 'split';
    $('wc-method').value = 'split';
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

  /* ---------- Tool 2: bulk salary file ---------- */
  var BULK_MAX_ROWS = 20000;
  var BULK_SHOW_ROWS = 200;
  var XLSX_SRC = '/js/vendor/xlsx.full.min.js?v=1';
  var bulk = null;          /* { headers, rows, map, heads, mode, incl, excl, fileName } */
  var bulkResult = null;

  var TEMPLATE_HEADERS = ['Emp Code', 'Name', 'Basic+DA', 'HRA', 'Bonus', 'Medical Allowance', 'Special Allowance', 'Gross Salary',
    'Days 1-16 Sep (max 16)', 'Days 17-30 Sep (max 14)', 'PF Member (Y/N)', 'Pension (Y/N)'];
  var TEMPLATE_ROWS = [
    ['E001', 'Sample Employee 1', 12000, 6000, 1000, 1250, 4750, 25000, 16, 14, 'Y', 'Y'],
    ['E002', 'Sample Employee 2', 20000, 10000, 1500, 1250, 7250, 40000, 16, 14, 'Y', 'Y'],
    ['E003', 'Sample Employee 3', 18000, 9000, 1000, 1250, 5750, 35000, 0, 14, 'Y', 'Y']
  ];

  function norm(s) { return String(s === null || s === undefined ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function toNum(v) {
    if (typeof v === 'number') return v;
    var s = String(v === null || v === undefined ? '' : v).replace(/[₹,\s]/g, '');
    if (s === '') return NaN;
    return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
  }
  function isBlank(v) { return v === null || v === undefined || String(v).trim() === ''; }
  function yesNo(v) {
    if (isBlank(v)) return true;
    return !/^(n|no|0|false|nil|na|n\/a|not applicable)$/i.test(String(v).trim());
  }

  /* Header detection: index of the first untaken header that passes the test, else -1. */
  function findCol(headers, taken, test) {
    for (var i = 0; i < headers.length; i++) {
      if (taken.indexOf(i) === -1 && test(norm(headers[i]))) return i;
    }
    return -1;
  }
  function detectColumns(headers) {
    var taken = [], map = {};
    function pick(key, test) { var i = findCol(headers, taken, test); map[key] = i; if (i > -1) taken.push(i); }
    pick('code', function (h) { return /^(emp(loyee)?(code|id|no|number)|ecode|code|empid)$/.test(h); });
    pick('name', function (h) { return /^(emp(loyee)?name|name|nameofemployee)$/.test(h); });
    pick('gross', function (h) { return /^(gross|grosssalary|grosspay|grosswages|grossearnings|totalgross|totalearnings|grossmonthly)/.test(h); });
    pick('d1', function (h) { return h.indexOf('days') > -1 && (h.indexOf('116') > -1 || h.indexOf('before') > -1); });
    pick('d2', function (h) { return h.indexOf('days') > -1 && (h.indexOf('1730') > -1 || h.indexOf('after') > -1); });
    pick('member', function (h) { return h.indexOf('member') > -1 || h.indexOf('pfapplicable') > -1; });
    pick('pension', function (h) { return h.indexOf('pension') === 0 || h === 'eps' || h.indexOf('epsapplicable') === 0; });
    return { map: map, taken: taken };
  }

  function isBasicHead(name) { var h = norm(name); return h.indexOf('basic') > -1 || h === 'da' || h.indexOf('dearness') > -1; }
  function isHraHead(name) { var h = norm(name); return h === 'hra' || h.indexOf('houserent') > -1; }

  function parseDelimited(text) {
    text = text.replace(/^﻿/, '');
    var first = text.split(/\r?\n/, 1)[0] || '';
    var delim = first.indexOf('\t') > -1 ? '\t' : (first.split(';').length > first.split(',').length ? ';' : ',');
    var rows = [], row = [], cell = '', q = false, i, c;
    for (i = 0; i < text.length; i++) {
      c = text.charAt(i);
      if (q) {
        if (c === '"') { if (text.charAt(i + 1) === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text.charAt(i + 1) === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function ensureXlsx() {
    return new Promise(function (resolve, reject) {
      if (root.XLSX) return resolve(root.XLSX);
      var s = document.createElement('script');
      s.src = XLSX_SRC;
      s.onload = function () { root.XLSX ? resolve(root.XLSX) : reject(new Error('xlsx')); };
      s.onerror = function () { reject(new Error('xlsx')); };
      document.head.appendChild(s);
    });
  }

  function bulkMessage(html, isError) {
    var el = $('wc-bulk-msg');
    el.innerHTML = html ? '<div class="' + (isError ? 'calc-alert' : 'wc-callout') + '" style="margin-top:14px">' + html + '</div>' : '';
  }

  function loadBulkMatrix(matrix, fileName) {
    matrix = matrix.filter(function (r) { return r.some(function (c) { return !isBlank(c); }); });
    if (matrix.length < 2) { bulkMessage('<p style="margin:0">That file needs a header row and at least one employee row.</p>', true); return; }
    /* header row = first row with two or more filled cells */
    var h = 0;
    while (h < matrix.length - 1 && matrix[h].filter(function (c) { return !isBlank(c); }).length < 2) h++;
    var headers = matrix[h].map(function (c) { return String(c === null || c === undefined ? '' : c).trim(); });
    var rows = matrix.slice(h + 1);
    var note = '';
    if (rows.length > BULK_MAX_ROWS) { rows = rows.slice(0, BULK_MAX_ROWS); note = ' Only the first ' + BULK_MAX_ROWS.toLocaleString('en-IN') + ' rows were read.'; }

    var det = detectColumns(headers);
    var heads = [];
    headers.forEach(function (name, i) {
      if (det.taken.indexOf(i) > -1 || isBlank(name)) return;
      var filled = 0, numeric = 0;
      rows.forEach(function (r) { if (!isBlank(r[i])) { filled++; if (!isNaN(toNum(r[i]))) numeric++; } });
      if (filled > 0 && numeric / filled >= 0.5) heads.push({ name: name, idx: i });
    });
    if (!heads.length) { bulkMessage('<p style="margin:0">No amount columns were found. Check that the header row is the first filled row of the file.</p>', true); return; }

    bulk = { headers: headers, rows: rows, map: det.map, heads: heads, mode: 'basic', incl: [], excl: [], fileName: fileName };
    presetHeads();
    bulkResult = null;
    $('wc-bulk-result').innerHTML = PLACEHOLDER;
    $('wc-bulk-tools').hidden = true;
    bulkMessage('<p style="margin:0"><strong>' + esc(fileName) + '</strong> loaded: ' + rows.length.toLocaleString('en-IN') + ' rows, ' + heads.length + ' pay heads found.' + esc(note) + ' Your file stays on your device.</p>', false);
    renderBulkSetup();
  }

  function presetHeads() {
    bulk.incl = bulk.heads.filter(function (h) { return isBasicHead(h.name); }).map(function (h) { return h.name; });
    bulk.excl = bulk.heads.filter(function (h) { return isHraHead(h.name); }).map(function (h) { return h.name; });
  }

  function colSelect(id, label, key) {
    var opts = '<option value="-1">Not in my file</option>' + bulk.headers.map(function (h, i) {
      return '<option value="' + i + '"' + (bulk.map[key] === i ? ' selected' : '') + '>' + esc(h || ('Column ' + (i + 1))) + '</option>';
    }).join('');
    return '<div class="form-group"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-key="' + key + '">' + opts + '</select></div>';
  }

  function ruleCard(value, title, sub) {
    return '<label class="opt-card' + (bulk.mode === value ? ' on' : '') + '"><input type="radio" name="wc-bulk-rule" value="' + value + '"' + (bulk.mode === value ? ' checked' : '') + ' /><span><strong>' + title + '</strong><em>' + sub + '</em></span></label>';
  }

  function renderBulkSetup() {
    var also = [];
    if (bulk.map.d1 > -1 || bulk.map.d2 > -1) also.push('days worked in September');
    if (bulk.map.member > -1) also.push('PF member');
    if (bulk.map.pension > -1) also.push('pension applicable');
    var html =
      '<div class="wc-step-title">Match your columns</div>' +
      '<div class="wc-map-grid">' + colSelect('wc-map-code', 'Employee code', 'code') + colSelect('wc-map-name', 'Employee name', 'name') + colSelect('wc-map-gross', 'Gross salary', 'gross') + '</div>' +
      (also.length ? '<p class="wc-lead">Also picked up from your file: ' + also.join(', ') + '.</p>' : '') +
      '<div class="wc-step-title">Which pay counts as PF wage?</div>' +
      '<div class="wc-rule-grid" id="wc-rule">' +
        ruleCard('basic', 'Basic + DA only', 'Only the heads ticked below, starting with Basic and DA.') +
        ruleCard('sum', 'Basic + DA + chosen allowances', 'Add allowances you treat as part of basic wages, such as those paid uniformly to all.') +
        ruleCard('grossless', 'Gross minus HRA', 'Start from Gross and leave out HRA, plus any other heads you tick.') +
      '</div>' +
      '<div class="wc-step-title" id="wc-heads-title"></div><div class="wc-chips" id="wc-heads" role="group" aria-label="Pay heads"></div>' +
      '<p class="wc-lead" id="wc-rule-note"></p>';
    $('wc-bulk-setup').innerHTML = html;
    $('wc-bulk-setup').hidden = false;
    $('wc-bulk-settings').hidden = false;
    paintRule();
  }

  function paintRule() {
    document.querySelectorAll('#wc-rule .opt-card').forEach(function (c) { c.classList.toggle('on', c.querySelector('input').checked); });
    var gl = bulk.mode === 'grossless';
    var set = gl ? bulk.excl : bulk.incl;
    $('wc-heads-title').textContent = gl ? 'Heads left out of PF wage' : 'Heads counted as PF wage';
    $('wc-heads').innerHTML = bulk.heads.map(function (h) {
      var on = set.indexOf(h.name) > -1;
      return '<button type="button" class="wc-headchip' + (on ? ' on' : '') + (gl ? ' out' : '') + '" aria-pressed="' + on + '" data-head="' + esc(h.name) + '">' + (on ? (gl ? '− ' : '✓ ') : '+ ') + esc(h.name) + '</button>';
    }).join('');
    $('wc-rule-note').textContent = gl
      ? 'PF wage = Gross' + (bulk.map.gross > -1 ? '' : ' (worked out as the sum of all heads, since no Gross column is chosen)') + ' minus the heads ticked here.'
      : 'PF wage = the sum of the ticked heads. Clients differ here: some use Basic + DA only, others include allowances paid uniformly to every employee. Pick the option that matches the client’s practice.';
  }

  function readBulkRecords() {
    var m = bulk.map, warnCols = {};
    var recs = bulk.rows.map(function (r, n) {
      var heads = {};
      bulk.heads.forEach(function (h) {
        var raw = r[h.idx], v = toNum(raw);
        if (isNaN(v)) { v = 0; if (!isBlank(raw)) warnCols[h.name] = true; }
        heads[h.name] = v;
      });
      var gross = null;
      if (m.gross > -1 && !isBlank(r[m.gross])) { gross = toNum(r[m.gross]); if (isNaN(gross)) gross = null; }
      var days = function (i) { if (i < 0 || isBlank(r[i])) return null; var d = toNum(r[i]); return isNaN(d) ? null : d; };
      return {
        code: m.code > -1 ? String(r[m.code] === undefined ? '' : r[m.code]).trim() : String(n + 1),
        name: m.name > -1 ? String(r[m.name] === undefined ? '' : r[m.name]).trim() : '',
        gross: gross, heads: heads, d1: days(m.d1), d2: days(m.d2),
        member: m.member > -1 ? yesNo(r[m.member]) : true,
        pension: m.pension > -1 ? yesNo(r[m.pension]) : true
      };
    });
    return { recs: recs, warnCols: Object.keys(warnCols) };
  }

  function calcBulk() {
    var out = $('wc-bulk-result');
    $('wc-lead').hidden = true;
    if (!bulk) {
      out.innerHTML = '<div class="calc-alert"><span class="calc-alert-icon">⚠</span><div><h5>Add a salary file first</h5><p>Upload a file or paste rows from Excel, then calculate.</p></div></div>';
      $('wc-bulk-tools').hidden = true;
      return;
    }
    if (bulk.mode !== 'grossless' && !bulk.incl.length) {
      out.innerHTML = '<div class="calc-alert"><span class="calc-alert-icon">⚠</span><div><h5>Tick at least one head</h5><p>PF wage is the sum of the heads you tick, so choose at least one.</p></div></div>';
      $('wc-bulk-tools').hidden = true;
      return;
    }
    var cfg = {
      period: document.querySelector('input[name="wc-bulk-period"]:checked').value,
      pfBasis: $('wc-bulk-basis').value, method: $('wc-bulk-method').value,
      mode: bulk.mode === 'grossless' ? 'grossless' : 'sum', incl: bulk.incl, excl: bulk.excl,
      overheads: $('wc-bulk-overheads').checked, warn50: $('wc-bulk-warn50').checked
    };
    var data = readBulkRecords();
    var res = bulkCompute(data.recs, cfg);
    var cmp = null;
    if (cfg.period === 'split') cmp = ['split', 'whole25', 'whole15'].map(function (m) { return { method: m, res: bulkCompute(data.recs, Object.assign({}, cfg, { method: m })) }; });
    bulkResult = { res: res, cfg: cfg, html: renderBulk(res, cfg, data.warnCols, cmp) };
    track('epf-wage-ceiling-bulk');
    if (hasLead()) showBulkResult(); else showLeadGate();
  }

  /* Column layout shared by the on-screen table and the CSV, so both always agree.
     Split month: each half is shown first, then the combined wage the contribution is worked on. */
  function bulkLayout(cfg) {
    var split = cfg.period === 'split' && (cfg.method || 'split') === 'split', oh = cfg.overheads;
    var accts = [
      { key: 'employee', label: 'Employee A/c 1 (12%)' },
      { key: 'epf', label: 'Employer A/c 1 (3.67%)' }
    ];
    if (oh) accts.push({ key: 'admin', label: 'Employer A/c 2, admin (0.5%)' });
    accts.push({ key: 'eps', label: 'Employer A/c 10, EPS (8.33%)' });
    if (oh) accts.push({ key: 'edli', label: 'Employer A/c 21, EDLI (0.5%)' });
    accts.push({ key: 'total', label: 'Total' });
    return { split: split, accts: accts };
  }

  function segSums(rows) {
    var sums = [{ pf: 0 }, { pf: 0 }];
    rows.forEach(function (r) { if (!r.skipped) r.segs.forEach(function (sg, i) { sums[i].pf += sg.pf; }); });
    return sums;
  }

  function renderBulk(res, cfg, warnCols, cmp) {
    var t = res.totals, c = res.counts, L = bulkLayout(cfg);
    var per = { old: 'Before 17 September 2026 (\u20B915,000 ceiling)', split: 'September 2026 (' + METHOD_SHORT[cfg.method || 'split'] + ')', 'new': 'October 2026 onwards (\u20B925,000 ceiling)' }[cfg.period];
    var dash = function (r, v) { return r.skipped ? '-' : fmt(v); };
    var wageCells = function (r) {
      if (L.split) {
        var s0 = r.segs[0], s1 = r.segs[1];
        return '<td>' + (s0 ? s0.days : '-') + '</td><td>' + (s0 ? fmt(s0.pf) : '-') + '</td><td>' + (s1 ? s1.days : '-') + '</td><td>' + (s1 ? fmt(s1.pf) : '-') + '</td>' +
          '<td>' + dash(r, r.contribWage) + '</td><td>' + dash(r, r.epsWage) + '</td>';
      }
      return '<td>' + dash(r, r.contribWage) + '</td><td>' + dash(r, r.epsWage) + '</td>';
    };
    var body = res.rows.slice(0, BULK_SHOW_ROWS).map(function (r) {
      return '<tr class="' + (r.skipped ? 'is-skipped' : '') + '"><td>' + esc(r.code) + '</td><td>' + esc(r.name) + '</td><td>' + fmt(r.gross) + '</td>' +
        wageCells(r) +
        L.accts.map(function (a) { return '<td>' + dash(r, r[a.key]) + '</td>'; }).join('') +
        '<td class="wc-flagcell">' + r.flags.map(esc).join('<br>') + '</td></tr>';
    }).join('');

    var sums = segSums(res.rows);
    var head1 = '<tr><th colspan="3"></th>' +
      (L.split
        ? '<th class="grp" colspan="2">1 to 16 Sep (' + fmt(OLD_CEILING) + ' ceiling)</th><th class="grp" colspan="2">17 to 30 Sep (' + fmt(NEW_CEILING) + ' ceiling)</th><th class="grp" colspan="2">Combined</th>'
        : '<th class="grp" colspan="2">After the ceiling</th>') +
      '<th class="grp" colspan="' + L.accts.length + '">Contribution by account</th><th></th></tr>';
    var head2 = '<tr><th>Code</th><th>Name</th><th>Gross</th>' +
      (L.split ? '<th>Days</th><th>PF wage</th><th>Days</th><th>PF wage</th><th>PF wage</th><th>Pension wage</th>' : '<th>PF wage</th><th>Pension wage</th>') +
      L.accts.map(function (a) { return '<th>' + a.label + '</th>'; }).join('') + '<th>Notes</th></tr>';
    var foot = '<tr><td colspan="3">Total, ' + c.processed.toLocaleString('en-IN') + ' employee' + (c.processed === 1 ? '' : 's') + '</td>' +
      (L.split ? '<td></td><td>' + fmt(sums[0].pf) + '</td><td></td><td>' + fmt(sums[1].pf) + '</td>' : '') +
      '<td>' + fmt(t.contribWage) + '</td><td>' + fmt(t.epsWage) + '</td>' +
      L.accts.map(function (a) { return '<td>' + fmt(t[a.key]) + '</td>'; }).join('') + '<td></td></tr>';

    var warn = '';
    if (warnCols.length) warn += '<li>Some cells in ' + warnCols.map(esc).join(', ') + ' were not numbers and were counted as zero.</li>';
    var flagged = res.rows.filter(function (r) { return r.flags.length; }).length;
    return '' +
      '<div class="wc-hero-num"><span>Total for ' + c.processed.toLocaleString('en-IN') + ' employee' + (c.processed === 1 ? '' : 's') + ', employee plus employer' + (cfg.overheads ? ' plus overheads' : '') + '</span><strong>' + fmt(t.total) + '</strong><em>' + esc(per) + '</em></div>' +
      '<div class="epf-sumgrid">' +
      '<div class="epf-sumcard"><span>Employee PF</span><strong>' + fmt(t.employee) + '</strong></div>' +
      '<div class="epf-sumcard"><span>Employer 12%</span><strong>' + fmt(t.employer12) + '</strong></div>' +
      '<div class="epf-sumcard"><span>of which pension (EPS)</span><strong>' + fmt(t.eps) + '</strong></div>' +
      '<div class="epf-sumcard"><span>of which provident fund (EPF)</span><strong>' + fmt(t.epf) + '</strong></div>' +
      (cfg.overheads ? '<div class="epf-sumcard"><span>EDLI</span><strong>' + fmt(t.edli) + '</strong></div><div class="epf-sumcard"><span>Admin charges</span><strong>' + fmt(t.admin) + '</strong></div>' : '') +
      '</div>' +
      '<div class="epf-line"><span>Employees processed / skipped</span><strong>' + c.processed.toLocaleString('en-IN') + ' / ' + c.skipped.toLocaleString('en-IN') + '</strong></div>' +
      '<div class="epf-line"><span>Rows with a note or warning</span><strong>' + flagged.toLocaleString('en-IN') + '</strong></div>' +
      '<div class="epf-line"><span>Total PF wage, before the ceiling</span><strong>' + fmt(t.pfWage) + '</strong></div>' +
      '<div class="epf-line"><span>Total contribution wage, after the ceiling</span><strong>' + fmt(t.contribWage) + '</strong></div>' +
      (cmp ? bulkCmpHtml(cmp, cfg) : '') +
      '<div class="epf-group-head">Employee by employee' + (res.rows.length > BULK_SHOW_ROWS ? ' (first ' + BULK_SHOW_ROWS + ' of ' + res.rows.length.toLocaleString('en-IN') + ', download for all)' : '') + '</div>' +
      '<div class="wc-scroll"><table class="wc-table wc-bulk-table"><thead>' + head1 + head2 + '</thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div>' +
      '<ul class="wc-notes">' + warn +
      '<li>Each employee is rounded on their own and the totals are the sum of those rows, as in a contribution return.</li>' +
      (cfg.period === 'split' && !L.split ? '<li>' + esc(methodNote(cfg.method)) + '</li>' : '') +
      (L.split ? '<li>The changeover month is worked out in two halves. Each ceiling is spread over a ' + MONTH_DAYS + '-day month and multiplied by the days in that half, then the two halves are added into the combined PF wage that the contribution is worked on. The days columns in your file set each employee\u2019s days in 1 to 16 and 17 to 30 September, and blank means the full period. EPFO may prescribe its own method for this month, so confirm it against EPFO guidance.</li>' : '') +
      '<li>Pension wage is the wage EPS is worked on. It equals the PF wage unless PF is on actual wages above the ceiling, or the employee is marked pension not applicable.</li>' +
      '<li>The tool calculates for every row in your file. It does not decide who must be enrolled or who is an excluded employee. Use the PF Member column to leave people out.</li></ul>';
  }

  function bulkCmpHtml(cmp, cfg) {
    var oh = cfg.overheads, selKey = cfg.method || 'split';
    var tot = function (r) { return oh ? r.totals.total : r.totals.employee + r.totals.employer12; };
    var sel = cmp.filter(function (x) { return x.method === selKey; })[0];
    var body = cmp.map(function (x) {
      var t = x.res.totals, isSel = x.method === selKey;
      return '<tr class="' + (isSel ? 'is-sel' : '') + '"><td>' + esc(METHOD_ROW[x.method]) + (isSel ? ' (selected)' : '') + '</td><td>' + fmt(t.employee) + '</td><td>' + fmt(t.employer12) + '</td>' +
        (oh ? '<td>' + fmt(t.edli + t.admin) + '</td>' : '') + '<td>' + fmt(tot(x.res)) + '</td><td>' + (isSel ? '-' : signed(tot(x.res) - tot(sel.res))) + '</td></tr>';
    }).join('');
    return '<div class="epf-group-head">September method comparison, whole file</div>' +
      '<p class="wc-lead">The same ' + sel.res.counts.processed.toLocaleString('en-IN') + ' employees under each of the three methods. None is confirmed by the Gazette, the EPFO press release or the PIB release, so confirm with EPFO before you file.</p>' +
      '<div class="wc-scroll"><table class="wc-table wc-mtable"><thead><tr><th>Method</th><th>Employee A/c 1</th><th>Employer 12%</th>' + (oh ? '<th>EDLI + admin</th>' : '') + '<th>Total</th><th>Against selected</th></tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  function csvCell(v) {
    var s = String(v === null || v === undefined ? '' : v);
    if (/^[=+\-@\t\r]/.test(s) && isNaN(Number(s))) s = "'" + s;   /* stops spreadsheet formula injection */
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function downloadCsv(name, rows) {
    var text = '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function downloadTemplate() {
    downloadCsv('leap-epf-salary-template.csv', [TEMPLATE_HEADERS].concat(TEMPLATE_ROWS));
    track('epf-wage-ceiling-bulk', 'template_download');
  }
  function downloadBulk() {
    if (!bulkResult) return;
    var cfg = bulkResult.cfg, t = bulkResult.res.totals, L = bulkLayout(cfg);
    var sums = segSums(bulkResult.res.rows);
    var head = ['Emp Code', 'Name', 'Gross'];
    if (L.split) head.push('Days 1-16 Sep', 'PF wage 1-16 Sep (' + OLD_CEILING + ' ceiling)', 'Days 17-30 Sep', 'PF wage 17-30 Sep (' + NEW_CEILING + ' ceiling)', 'Combined PF wage', 'Pension wage');
    else head.push('PF wage after ceiling', 'Pension wage');
    L.accts.forEach(function (a) { head.push(a.label); });
    head.push('Notes');
    var rows = bulkResult.res.rows.map(function (r) {
      var v = function (x) { return r.skipped ? '' : x; };
      var a = [r.code, r.name, r.gross];
      if (L.split) {
        var s0 = r.segs[0], s1 = r.segs[1];
        a.push(s0 ? s0.days : '', s0 ? s0.pf : '', s1 ? s1.days : '', s1 ? s1.pf : '');
      }
      a.push(v(r.contribWage), v(r.epsWage));
      L.accts.forEach(function (x) { a.push(v(r[x.key])); });
      a.push(r.flags.join(' | '));
      return a;
    });
    var tot = ['TOTAL', '', ''];
    if (L.split) tot.push('', sums[0].pf, '', sums[1].pf);
    tot.push(t.contribWage, t.epsWage);
    L.accts.forEach(function (x) { tot.push(t[x.key]); });
    tot.push('');
    downloadCsv('leap-epf-contribution-' + cfg.period + (cfg.period === 'split' && cfg.method && cfg.method !== 'split' ? '-' + cfg.method : '') + '.csv', [head].concat(rows, [tot]));
    track('epf-wage-ceiling-bulk', 'download_results');
  }

  function handleFile(file) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { bulkMessage('<p style="margin:0">That file is over 15 MB. Remove unused columns or split it, then try again.</p>', true); return; }
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    var reader = new FileReader();
    if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') {
      bulkMessage('<p style="margin:0">Reading ' + esc(file.name) + '...</p>', false);
      reader.onload = function () {
        ensureXlsx().then(function (X) {
          var wb = X.read(reader.result, { type: 'array' });
          var ws = wb.Sheets[wb.SheetNames[0]];
          loadBulkMatrix(X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }), file.name);
        }).catch(function () {
          bulkMessage('<p style="margin:0">Could not read that Excel file here. Save it as CSV and upload the CSV instead.</p>', true);
        });
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
      reader.onload = function () { loadBulkMatrix(parseDelimited(String(reader.result)), file.name); };
      reader.readAsText(file);
    } else {
      bulkMessage('<p style="margin:0">Please upload an Excel (.xlsx, .xls) or CSV file.</p>', true);
    }
  }

  function loadPasted() {
    var text = $('wc-bulk-paste').value;
    if (!text.trim()) { bulkMessage('<p style="margin:0">Paste your rows first, including the header row.</p>', true); return; }
    loadBulkMatrix(parseDelimited(text), 'Pasted data');
  }

  function resetBulk() {
    bulk = null; bulkResult = null;
    $('wc-bulk-file').value = ''; $('wc-bulk-paste').value = '';
    $('wc-bulk-setup').innerHTML = ''; $('wc-bulk-setup').hidden = true;
    $('wc-bulk-settings').hidden = true; $('wc-bulk-tools').hidden = true;
    $('wc-bulk-msg').innerHTML = '';
    $('wc-bulk-result').innerHTML = PLACEHOLDER;
    $('wc-lead').hidden = true;
  }

  function clearBulkResult() { $('wc-bulk-result').innerHTML = PLACEHOLDER; $('wc-bulk-tools').hidden = true; $('wc-lead').hidden = true; }

  function initBulk() {
    if (!$('wc-bulk-file')) return;
    $('wc-lead-form').addEventListener('submit', submitLead);
    $('wc-bulk-file').addEventListener('change', function (e) { handleFile(e.target.files[0]); });
    var zone = $('wc-drop');
    ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('over'); }); });
    zone.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });

    var setup = $('wc-bulk-setup');
    setup.addEventListener('change', function (e) {
      var t = e.target;
      if (t.matches('#wc-rule input')) {
        var prev = bulk.mode; bulk.mode = t.value;
        if (bulk.mode === 'basic' && prev !== 'basic') {
          bulk.incl = bulk.heads.filter(function (h) { return isBasicHead(h.name); }).map(function (h) { return h.name; });
        }
        paintRule();
      } else if (t.matches('select[data-key]')) {
        bulk.map[t.getAttribute('data-key')] = parseInt(t.value, 10);
        paintRule();
      }
      clearBulkResult();
    });
    setup.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.wc-headchip') : null;
      if (!b) return;
      var name = b.getAttribute('data-head');
      var set = bulk.mode === 'grossless' ? bulk.excl : bulk.incl;
      var i = set.indexOf(name);
      if (i > -1) set.splice(i, 1); else set.push(name);
      if (bulk.mode === 'basic') bulk.mode = 'sum';
      document.querySelector('#wc-rule input[value="' + bulk.mode + '"]').checked = true;
      paintRule();
      clearBulkResult();
    });
    document.querySelectorAll('input[name="wc-bulk-period"]').forEach(function (r) {
      r.addEventListener('change', function () {
        document.querySelectorAll('#wc-bulk-periods .opt-card').forEach(function (c) { c.classList.toggle('on', c.querySelector('input').checked); });
        $('wc-bulk-method-wrap').hidden = r.value !== 'split';
        clearBulkResult();
      });
    });
    $('wc-bulk-method').addEventListener('change', clearBulkResult);
  }

  /* ---------- Lead capture before bulk results ---------- */
  var LEAD_KEY = 'leap-bulk-pf-lead-v1';
  var EXCEL_KEY = 'leap-excel-lead-v1';
  var LEAD_ENDPOINT = 'https://api.web3forms.com/submit';

  function hasLead() {
    try { return !!(localStorage.getItem(LEAD_KEY) || localStorage.getItem(EXCEL_KEY)); } catch (e) { return false; }
  }
  function saveLead() {
    try { localStorage.setItem(LEAD_KEY, String(Date.now())); } catch (e) { /* storage blocked, ask again next time */ }
  }

  function showBulkResult() {
    $('wc-lead').hidden = true;
    $('wc-bulk-result').innerHTML = bulkResult.html;
    $('wc-bulk-tools').hidden = false;
  }

  function showLeadGate() {
    $('wc-bulk-tools').hidden = true;
    $('wc-bulk-result').innerHTML = '<p class="wc-lead" style="margin:0">Your calculation for ' + bulkResult.res.rows.length.toLocaleString('en-IN') + ' employee' + (bulkResult.res.rows.length === 1 ? '' : 's') + ' is ready.</p>';
    $('wc-lead-count').textContent = bulkResult.res.rows.length.toLocaleString('en-IN') + ' employee' + (bulkResult.res.rows.length === 1 ? '' : 's');
    $('wc-lead-error').textContent = '';
    $('wc-lead').hidden = false;
    var first = $('wc-lead-name');
    if (first && first.scrollIntoView) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); first.focus({ preventScroll: true }); }
  }

  /* Free and disposable mailbox providers. Matched on the domain name with any country ending
     removed, so yahoo.co.in, outlook.in and hotmail.co.uk are all caught. */
  var PERSONAL_MAIL = /^(gmail|googlemail|yahoo|ymail|rocketmail|hotmail|outlook|live|msn|aol|icloud|rediffmail|rediff|protonmail|proton|gmx|yandex|zoho|tutanota|fastmail|hushmail|mailinator|guerrillamail|yopmail|tempmail|temp-mail|10minutemail|sharklasers|trashmail|maildrop|getnada)$/;
  var PERSONAL_EXACT = ['me.com', 'mac.com', 'pm.me', 'proton.me', 'mail.com', 'mail.ru', 'inbox.com', 'tuta.io'];
  function isPersonalEmail(email) {
    var domain = email.split('@').pop().toLowerCase();
    if (PERSONAL_EXACT.indexOf(domain) > -1) return true;
    var labels = domain.split('.');
    /* strip country and generic endings: .com, .in, .co.in, .co.uk, .net */
    while (labels.length > 1 && /^(com|net|org|in|co|uk|ac|us|au|ca|de|fr|nl|sg|ae)$/.test(labels[labels.length - 1])) labels.pop();
    return labels.length === 1 && PERSONAL_MAIL.test(labels[0]);
  }

  function submitLead(e) {
    e.preventDefault();
    var form = e.target, err = $('wc-lead-error'), btn = $('wc-lead-submit');
    if (form.elements.botcheck && form.elements.botcheck.checked) return;   /* bots only */
    var name = form.elements.name.value.trim(), company = form.elements.company.value.trim();
    var phone = form.elements.phone.value.trim(), email = form.elements.email.value.trim();
    var digits = phone.replace(/\D/g, '');
    if (!name || !company) { err.textContent = 'Please enter your name and company.'; return; }
    if (digits.length < 10 || digits.length > 13) { err.textContent = 'Please enter a valid phone or WhatsApp number.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Please enter your company email address.'; return; }
    if (isPersonalEmail(email)) { err.textContent = 'Please use your company email address. Gmail, Yahoo, Outlook and other personal addresses are not accepted.'; return; }
    if (!form.elements.consent.checked) { err.textContent = 'Please tick the consent box so we can contact you.'; return; }
    err.textContent = '';

    var n = bulkResult ? bulkResult.res.rows.length : 0;
    var fd = new FormData(form);
    fd.delete('consent');
    fd.set('employees', String(n));
    fd.set('message', 'Bulk PF calculator run. Employees in file: ' + n + '. Period: ' + (bulkResult ? bulkResult.cfg.period : '') +
      '. Contact details only; the salary file itself is never sent.');
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Please wait...';

    var finish = function (ok) {
      btn.disabled = false; btn.textContent = label;
      if (ok) {
        saveLead();
        if (typeof root.gtag === 'function') root.gtag('event', 'generate_lead', { form_name: 'bulk_pf_calculator', tool_name: 'epf-wage-ceiling-bulk' });
        if (typeof root.showToast === 'function') root.showToast('Thank you. We will be in touch shortly.');
      }
      /* If the request failed, show the results anyway: our fault, not theirs. */
      if (bulkResult) showBulkResult();
    };
    fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Accept': 'application/json' }, body: fd })
      .then(function (r) { return r.json(); })
      .then(function (j) { finish(!!(j && j.success)); })
      .catch(function () { finish(false); });
  }

  /* ---------- Excel download, in exchange for contact details ---------- */
  var EXCEL_FILE = '/assets/downloads/leap-epf-wage-ceiling-calculator-v20260921-7c3f9a.xlsx';
  var EXCEL_NAME = 'LEAP-EPF-Wage-Ceiling-Calculator.xlsx';

  function hasExcelLead() {
    try { return !!localStorage.getItem(EXCEL_KEY); } catch (e) { return false; }
  }
  function startExcelDownload() {
    var a = document.createElement('a');
    a.href = EXCEL_FILE; a.download = EXCEL_NAME;
    document.body.appendChild(a); a.click(); a.remove();
    track('epf-wage-ceiling-excel', 'file_download');
  }
  function paintExcelCard() {
    var done = hasExcelLead();
    $('wc-excel-form-wrap').hidden = done;
    $('wc-excel-done').hidden = !done;
  }
  function showExcelDone(started) {
    $('wc-excel-form-wrap').hidden = true;
    $('wc-excel-done').hidden = false;
    $('wc-excel-done-msg').textContent = started
      ? 'Your download has started. If nothing happened, use the button below.'
      : 'Thank you. Use the button below to download the workbook.';
  }

  function submitExcel(e) {
    e.preventDefault();
    var form = e.target, err = $('wc-x-error'), btn = $('wc-x-submit');
    if (form.elements.botcheck && form.elements.botcheck.checked) return;
    var v = function (n) { return form.elements[n].value.trim(); };
    var digits = v('phone').replace(/\D/g, '');
    if (!v('name') || !v('company')) { err.textContent = 'Please enter your name and company.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) { err.textContent = 'Please enter your company email address.'; return; }
    if (isPersonalEmail(v('email'))) { err.textContent = 'Please use your company email address. Gmail, Yahoo, Outlook and other personal addresses are not accepted.'; return; }
    if (digits.length < 10 || digits.length > 13) { err.textContent = 'Please enter a valid phone or WhatsApp number.'; return; }
    if (!v('employees')) { err.textContent = 'Please choose the size of your workforce.'; return; }
    if (!v('role')) { err.textContent = 'Please choose the option that describes you best.'; return; }
    if (!form.elements.consent.checked) { err.textContent = 'Please tick the consent box so we can contact you.'; return; }
    err.textContent = '';

    var fd = new FormData(form);
    fd.delete('consent');
    fd.set('message', 'Excel calculator download. Role: ' + v('role') + '. Employees: ' + v('employees') + '. Interested in: ' + (v('interest') || 'not stated') + '.');
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Please wait...';

    var finish = function (ok) {
      btn.disabled = false; btn.textContent = label;
      if (ok) {
        try { localStorage.setItem(EXCEL_KEY, String(Date.now())); } catch (x) { /* storage blocked */ }
        if (typeof root.gtag === 'function') root.gtag('event', 'generate_lead', { form_name: 'excel_download', tool_name: 'epf-wage-ceiling-excel' });
        if (typeof root.showToast === 'function') root.showToast('Thank you. Your download is starting.');
      }
      /* If sending failed, the download still starts: our fault, not theirs. */
      startExcelDownload();
      showExcelDone(true);
    };
    fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Accept': 'application/json' }, body: fd })
      .then(function (r) { return r.json(); })
      .then(function (j) { finish(!!(j && j.success)); })
      .catch(function () { finish(false); });
  }

  function initExcel() {
    if (!$('wc-excel-form')) return;
    $('wc-excel-form').addEventListener('submit', submitExcel);
    paintExcelCard();
  }

  /* ---------- Share ---------- */
  function shareUrl() {
    var c = document.querySelector('link[rel="canonical"]');
    return c && c.href ? c.href : location.href.split('#')[0];
  }
  function flashShare(msg) {
    var l = $('wc-share-label');
    if (!l) return;
    var orig = l.getAttribute('data-orig') || l.textContent;
    l.setAttribute('data-orig', orig);
    l.textContent = msg;
    setTimeout(function () { l.textContent = orig; }, 2200);
  }
  function share() {
    var url = shareUrl();
    var title = 'EPF Wage Ceiling 2026 - Impact Calculator | LEAP';
    var text = 'EPF wage ceiling is now ₹25,000 from 17 September 2026. Free calculator with bulk salary file upload, by LEAP:';
    track('epf-wage-ceiling', 'share');
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function () { /* cancelled */ });
      return;
    }
    var done = function () { flashShare('Link copied'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link:', url); });
    } else {
      window.prompt('Copy this link:', url);
    }
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
    $('wc-method').addEventListener('change', function () {
      currentMethod = this.value; renderSegments();
      $('wc-result').innerHTML = PLACEHOLDER; $('wc-print-bar-1').hidden = true;
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
    initChecklist();
    initBulk();
    initExcel();
  }

  root.WageCeilingUI = {
    calcContribution: calcContribution, resetContribution: resetContribution,
    printTool: printTool, resetChecklist: resetChecklist, share: share,
    calcBulk: calcBulk, resetBulk: resetBulk, loadPasted: loadPasted,
    downloadTemplate: downloadTemplate, downloadBulk: downloadBulk,
    downloadExcel: startExcelDownload
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})(typeof window !== 'undefined' ? window : this);
