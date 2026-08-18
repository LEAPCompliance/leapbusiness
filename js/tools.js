/* ============================================
   LEAP Business Solutions – Compliance & Payroll Calculators
   Indicative estimates only. Not legal/financial advice.
   ============================================ */

function fmtINR(n) {
  if (isNaN(n)) return '₹0';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

/* ---------- 1. CTC <-> Take-Home ---------- */
let ctcDirection = 'ctc'; // 'ctc' = CTC -> Take-Home, 'th' = Take-Home -> CTC

const CTC_STATES = {
  MH: { name: 'Maharashtra', pt: maharashtraPTState, lwfEE: 25 / 6, lwfER: 75 / 6, lwfFreq: 'half-yearly (Jun & Dec)', febNote: 'Maharashtra charges ₹300 in February (vs ₹200 other months) to reach the ₹2,500 annual cap.' },
  KA: { name: 'Karnataka', pt: (g) => (g < 25000 ? 0 : 200), lwfEE: 50 / 12, lwfER: 100 / 12, lwfFreq: 'annual', febNote: 'Karnataka charges ₹300 in February (vs ₹200 other months) to reach the ₹2,500 annual cap.' },
  GJ: { name: 'Gujarat', pt: (g) => (g <= 12000 ? 0 : 200), lwfEE: 6 / 6, lwfER: 12 / 6, lwfFreq: 'half-yearly (Jun & Dec)', febNote: null },
  WB: { name: 'West Bengal', pt: ptWestBengal, lwfEE: 3 / 6, lwfER: 30 / 6, lwfFreq: 'half-yearly (Jun & Dec)', febNote: null },
  TN: { name: 'Tamil Nadu', pt: ptTamilNaduMonthly, lwfEE: 20 / 12, lwfER: 40 / 12, lwfFreq: 'annual', febNote: null, halfYearly: true },
  TS: { name: 'Telangana', pt: ptTelanganaAP, lwfEE: 2 / 12, lwfER: 5 / 12, lwfFreq: 'annual', febNote: null },
  AP: { name: 'Andhra Pradesh', pt: ptTelanganaAP, lwfEE: 30 / 12, lwfER: 70 / 12, lwfFreq: 'annual', febNote: null },
  MP: { name: 'Madhya Pradesh', pt: (g) => (g <= 18750 ? 0 : 208), lwfEE: 10 / 6, lwfER: 20 / 6, lwfFreq: 'half-yearly (Jun & Dec)', febNote: 'Madhya Pradesh charges ₹212 in February (vs ₹208 other months) to reach the ₹2,500 annual cap.' },
};

function maharashtraPTState(gross, female) {
  if (female) return gross <= 25000 ? 0 : 200;
  if (gross <= 7500) return 0;
  if (gross <= 10000) return 175;
  return 200;
}
function ptWestBengal(gross) {
  if (gross <= 10000) return 0;
  if (gross <= 15000) return 110;
  if (gross <= 25000) return 130;
  if (gross <= 40000) return 150;
  return 200;
}
function ptTamilNaduMonthly(gross) {
  const hy = gross * 6;
  let half;
  if (hy <= 21000) half = 0;
  else if (hy <= 30000) half = 180;
  else if (hy <= 45000) half = 425;
  else if (hy <= 60000) half = 930;
  else if (hy <= 75000) half = 1025;
  else half = 1250;
  return half / 6;
}
function ptTelanganaAP(gross) {
  if (gross <= 15000) return 0;
  if (gross <= 20000) return 150;
  return 200;
}

function setCtcDirection(dir) {
  ctcDirection = dir;
  document.getElementById('ctc-dir-ctc').classList.toggle('active', dir === 'ctc');
  document.getElementById('ctc-dir-th').classList.toggle('active', dir === 'th');
  document.getElementById('ctc-amount-label').textContent = dir === 'ctc' ? 'Monthly CTC (₹)' : 'Monthly Take-Home (₹)';
  calcTakeHome();
}

function ctcForward(gross, p) {
  const basicDA = gross * (p.basicPct / 100);
  const hra = basicDA * (p.hraPct / 100);
  const special = gross - basicDA - hra - p.comm - p.conv;
  const grossTotal = basicDA + hra + p.comm + p.conv + special; // = gross

  const pfWage = grossTotal - hra;
  const pfEmp = pfWage > 15000 ? 1800 : pfWage * 0.12;
  const esicApplicable = basicDA < 21000;
  const esicEmp = esicApplicable ? basicDA * 0.0075 : 0;
  const st = CTC_STATES[p.state];
  const pt = st.pt(gross, p.female);
  const lwfEmp = st.lwfEE;
  const netSalary = grossTotal - pfEmp - esicEmp - pt - lwfEmp;

  const pfEmployer = pfWage > 15000 ? 1950 : pfWage * 0.13;
  const esicEmployer = esicApplicable ? basicDA * 0.0325 : 0;
  const lwfEmployer = st.lwfER;
  const bonus = basicDA * 0.0833;
  const gratuity = basicDA * 0.0481;
  const employerCostTotal = pfEmployer + esicEmployer + lwfEmployer + bonus + gratuity;

  const ctc = grossTotal + employerCostTotal;
  return { basicDA, hra, comm: p.comm, conv: p.conv, special, grossTotal, pfEmp, esicApplicable, esicEmp, pt, lwfEmp, netSalary, pfWage, pfEmployer, esicEmployer, lwfEmployer, bonus, gratuity, employerCostTotal, ctc };
}

function ctcSolveGross(targetVal, getter, p) {
  let lo = 0, hi = Math.max(targetVal * 3, 200000);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const val = getter(ctcForward(mid, p));
    if (val < targetVal) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function calcTakeHome() {
  if (!document.getElementById('ctc-amount')) return;
  const amount = parseFloat(document.getElementById('ctc-amount').value) || 0;
  const stateCode = document.getElementById('ctc-state').value;
  const gender = document.getElementById('ctc-gender').value;
  const female = gender === 'Female';
  const basicPct = parseFloat(document.getElementById('ctc-basicpct').value) || 50;
  const hraPct = parseFloat(document.getElementById('ctc-hrapct').value) || 0;
  const comm = parseFloat(document.getElementById('ctc-comm').value) || 0;
  const conv = parseFloat(document.getElementById('ctc-conv').value) || 0;

  const p = { basicPct, hraPct, comm, conv, state: stateCode, female };
  const st = CTC_STATES[stateCode];

  let gross;
  if (ctcDirection === 'ctc') {
    gross = ctcSolveGross(amount, (r) => r.ctc, p);
  } else {
    gross = ctcSolveGross(amount, (r) => r.netSalary, p);
  }
  const r = ctcForward(gross, p);

  document.getElementById('ctc-summary').innerHTML = ctcDirection === 'ctc'
    ? `Monthly CTC of ${fmtINR(amount)} → estimated take-home of <strong>${fmtINR(r.netSalary)}</strong>/month`
    : `Target take-home of ${fmtINR(amount)} → estimated CTC of <strong>${fmtINR(r.ctc)}</strong>/month`;

  document.getElementById('th-result').innerHTML = `
    <div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--secondary);margin-bottom:4px">Part A — Earnings</div>
    <div class="calc-row"><span>Basic + DA (${basicPct}% of gross)</span><strong>${fmtINR(r.basicDA)}</strong></div>
    <div class="calc-row"><span>HRA (${hraPct}% of Basic + DA)</span><strong>${fmtINR(r.hra)}</strong></div>
    <div class="calc-row"><span>Communication Allowance</span><strong>${fmtINR(r.comm)}</strong></div>
    <div class="calc-row"><span>Conveyance / Fuel Allowance</span><strong>${fmtINR(r.conv)}</strong></div>
    <div class="calc-row"><span>Special Allowance (balancing)</span><strong>${fmtINR(r.special)}</strong></div>
    <div class="calc-row calc-total"><span>Gross Salary</span><strong>${fmtINR(r.grossTotal)}</strong></div>

    <div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--secondary);margin:16px 0 4px">Part B — Employee Deductions</div>
    <div class="calc-row"><span>PF — Employee (12%${r.pfWage > 15000 ? ', capped ₹1,800' : ''})</span><strong>- ${fmtINR(r.pfEmp)}</strong></div>
    <div class="calc-row"><span>ESIC — Employee ${r.esicApplicable ? '(0.75%)' : '(n/a, Basic+DA ≥ ₹21,000)'}</span><strong>- ${fmtINR(r.esicEmp)}</strong></div>
    <div class="calc-row"><span>Professional Tax (${st.name})</span><strong>- ${fmtINR(r.pt)}</strong></div>
    <div class="calc-row"><span>LWF — Employee (monthly provision)</span><strong>- ${fmtINR(r.lwfEmp)}</strong></div>
    <div class="calc-row calc-total"><span>Net Take-Home Salary</span><strong>${fmtINR(r.netSalary)}</strong></div>

    <div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--secondary);margin:16px 0 4px">Part C — Employer Cost (Over &amp; Above Gross)</div>
    <div class="calc-row"><span>PF — Employer (13%${r.pfWage > 15000 ? ', capped ₹1,950' : ''})</span><strong>${fmtINR(r.pfEmployer)}</strong></div>
    <div class="calc-row"><span>ESIC — Employer ${r.esicApplicable ? '(3.25%)' : '(n/a, Basic+DA ≥ ₹21,000)'}</span><strong>${fmtINR(r.esicEmployer)}</strong></div>
    <div class="calc-row"><span>LWF — Employer (monthly provision)</span><strong>${fmtINR(r.lwfEmployer)}</strong></div>
    <div class="calc-row"><span>Statutory Bonus (8.33%)</span><strong>${fmtINR(r.bonus)}</strong></div>
    <div class="calc-row"><span>Gratuity provision (4.81%)</span><strong>${fmtINR(r.gratuity)}</strong></div>
    <div class="calc-row calc-total"><span>Employer Cost (Part C Total)</span><strong>${fmtINR(r.employerCostTotal)}</strong></div>

    <div class="calc-row calc-total" style="margin-top:16px;padding-top:16px;border-top:2px solid var(--primary);font-size:17px"><span>💼 Total CTC (Monthly)</span><strong>${fmtINR(r.ctc)}</strong></div>
    <div class="calc-row"><span>Total CTC (Annual)</span><strong>${fmtINR(r.ctc * 12)}</strong></div>

    <div style="margin-top:16px;padding-top:16px;border-top:1px dashed var(--border);font-size:13px;color:var(--text-secondary);line-height:1.7">
      <strong style="color:var(--text-primary)">Notes:</strong><br>
      • Basic + DA must also meet the applicable Minimum Wages floor for the employee's skill category — this calculator does not check that separately.<br>
      • PF wages = Gross − HRA (i.e. Basic+DA + all allowances except HRA), capped at the statutory wage ceiling of ₹15,000/month.<br>
      • ESIC applies only where Basic+DA is below ₹21,000/month; both employee and employer contributions stop above that.<br>
      ${st.febNote ? `• ${st.febNote}<br>` : ''}
      ${st.halfYearly ? `• ${st.name} levies Professional Tax half-yearly (April &amp; October); the figure shown is a monthly-equivalent average — the actual deduction happens as one lump sum twice a year.<br>` : ''}
      • LWF for ${st.name} is a ${st.lwfFreq} contribution, shown here as an averaged monthly provision; applicable only to employees below managerial/supervisory level, subject to each state's own threshold.<br>
      • Gratuity is a books provision — actually payable only after 5 years' continuous service (1 year for fixed-term employees under the new Labour Codes).<br>
      • Income-tax (TDS) is not modelled here — consult a tax professional for a personalised computation.<br>
      • These are indicative estimates for general awareness — <a href="contact.html" style="color:var(--primary);font-weight:600">contact LEAP</a> to get your exact CTC structure finalised.
    </div>
  `;
}

/* ---------- 2. EPF Split ---------- */
function calcEpfSplit() {
  if (!document.getElementById('epf-wages')) return;
  const wages   = parseFloat(document.getElementById('epf-wages').value) || 0;
  const ceiling = parseFloat(document.getElementById('epf-ceiling').value) || 0;
  const iw      = document.getElementById('epf-iw').checked;
  const restrictBox = document.getElementById('epf-restrict');

  /* International workers have no wage ceiling, so the restrict option does not
     apply and is disabled to prevent EPS exceeding the employer's 12%. */
  restrictBox.disabled = iw;
  const restrict = iw ? false : restrictBox.checked;

  const el = document.getElementById('epf-result');
  if (wages <= 0) {
    el.innerHTML = '<p style="font-size:14px;color:var(--text-secondary);margin:0">Enter PF wages above to see the contribution split.</p>';
    return;
  }

  const cappedWage = ceiling > 0 ? Math.min(wages, ceiling) : wages;
  const base       = restrict ? cappedWage : wages;   // base for BOTH employee and employer 12%
  const epsBase    = iw ? wages : cappedWage;

  const employee    = Math.round(base * 0.12);
  const employer12  = Math.round(base * 0.12);
  const eps         = Math.round(epsBase * 0.0833);
  const employerEPF = Math.max(employer12 - eps, 0);
  const edli        = Math.round(cappedWage * 0.005);
  /* Plain 0.5% of EPF wages. The ₹500 monthly minimum is an establishment-level
     floor on total EPF wages, taken as already met, so it is not applied here. */
  const admin = Math.round(base * 0.005);

  const employerTotal = employerEPF + eps + edli + admin;
  const outflow       = employee + employerTotal;
  const credited      = employee + employerEPF + eps;   // A/c 1 + A/c 10, in the employee's name

  el.innerHTML = `
    <div class="epf-sumgrid">
      <div class="epf-sumcard"><span>Employee share</span><strong>${fmtINR(employee)}</strong></div>
      <div class="epf-sumcard"><span>Employer share (total)</span><strong>${fmtINR(employerTotal)}</strong></div>
      <div class="epf-sumcard wide"><span>Total monthly outflow</span><strong>${fmtINR(outflow)}</strong></div>
    </div>

    <div class="epf-group-head">Employee account A/c 1</div>
    <div class="epf-line"><span>EPF 12% on ${restrict ? 'ceiling wage' : 'PF wages'} (${fmtINR(base)})</span><strong>${fmtINR(employee)}</strong></div>

    <div class="epf-group-head">Employer breakdown</div>
    <div class="epf-line"><span>A/c 1: EPF (3.67% balance)</span><strong>${fmtINR(employerEPF)}</strong></div>
    <div class="epf-line"><span>A/c 10: EPS (8.33% of ${fmtINR(epsBase)})</span><strong>${fmtINR(eps)}</strong></div>
    <div class="epf-line"><span>A/c 21: EDLI (0.5%, capped at ${fmtINR(cappedWage)})</span><strong>${fmtINR(edli)}</strong></div>
    <div class="epf-line"><span>A/c 2: EPF admin (0.5%)</span><strong>${fmtINR(admin)}</strong></div>

    <div class="epf-group-head">Credited in the employee&rsquo;s name</div>
    <div class="epf-line"><span>A/c 1 EPF (employee ${fmtINR(employee)} + employer ${fmtINR(employerEPF)})</span><strong>${fmtINR(employee + employerEPF)}</strong></div>
    <div class="epf-line"><span>A/c 10 EPS / Pension</span><strong>${fmtINR(eps)}</strong></div>
    <div class="epf-line credit"><span>Total credited to the employee</span><strong>${fmtINR(credited)}</strong></div>

    <p style="font-family:'Inter',sans-serif;font-size:13px;color:var(--text-secondary);line-height:1.7;margin-top:12px">
      EDLI (A/c 21) and admin charges (A/c 2) are employer overheads paid to EPFO. They are <strong>not</strong> credited to the employee&rsquo;s PF account.
    </p>
    <p style="font-family:'Inter',sans-serif;font-size:13px;color:var(--text-secondary);line-height:1.7;margin-top:6px">Admin charges are shown as a straight 0.5% of this employee&rsquo;s EPF wages. The ₹500 monthly minimum (₹75 for non-functional establishments) applies to the establishment&rsquo;s total EPF wages rather than per employee, and is taken as already met.</p>
    ${iw ? '<p style="font-family:\'Inter\',sans-serif;font-size:13px;color:var(--text-secondary);line-height:1.7;margin-top:6px"><strong>International worker:</strong> EPS is computed on full PF wages with no ceiling, so the employer share is also computed on full wages.</p>' : ''}

    <div class="epf-src">
      <h5>Source provisions</h5>
      <p>
        EPF rate: Section 6, EPF &amp; MP Act, 1952.<br>
        EPS 8.33%: Para 3, Employees&rsquo; Pension Scheme, 1995.<br>
        EDLI 0.5%: Para 8A, EDLI Scheme, 1976.<br>
        Wage ceiling ₹15,000: Notification GSR 609(E) dated 22.08.2014.
      </p>
    </div>
  `;
}

function resetEpfSplit() {
  document.getElementById('epf-wages').value   = 25000;
  document.getElementById('epf-ceiling').value = 15000;
  document.getElementById('epf-restrict').checked = true;
  document.getElementById('epf-iw').checked       = false;
  calcEpfSplit();
}

/* ---------- 3. ESIC wage base under the Code on Wages 50% rule ---------- */
/* Mirrors the LEAP ESIC wage-code template:
     TR     = total remuneration (every component)
     E50    = exclusions that count toward the 50% test
     ENOT   = exclusions kept out of the 50% test
     cap    = 50% of TR
     excess = max(0, E50 - cap)                       -> added back to wages
     wages  = TR - ENOT - min(E50, cap)               == included + excess       */

const ESIC_CATS = {
  inc:  'Included in Wages',
  e50:  'Excluded (counts toward 50%)',
  enot: 'Excluded (NOT in 50% test)'
};

const ESIC_DEFAULT_ROWS = [
  ['Basic Pay',                     0, 'inc'],
  ['Dearness Allowance (DA)',       0, 'inc'],
  ['Retaining Allowance (RA)',      0, 'inc'],
  ['House Rent Allowance (HRA)',    0, 'e50'],
  ['Conveyance Allowance',          0, 'e50'],
  ['Special / Other Allowance',     0, 'e50'],
  ['Overtime',                      0, 'e50'],
  ['Bonus / Incentive',             0, 'e50'],
  ['Commission',                    0, 'e50'],
  ['Employer PF / Pension',         0, 'e50'],
  ['Gratuity',                      0, 'enot'],
  ['Retrenchment Compensation',     0, 'enot']
];

function esicRowHtml(name, amount, cat) {
  const opts = Object.keys(ESIC_CATS)
    .map(k => `<option value="${k}"${k === cat ? ' selected' : ''}>${ESIC_CATS[k]}</option>`).join('');
  return `<tr>
    <td><input type="text" value="${name.replace(/"/g,'&quot;')}" oninput="calcEsicSplit()" /></td>
    <td><input type="number" class="esic-amt" value="${amount}" min="0" oninput="calcEsicSplit()" /></td>
    <td><select class="esic-cat cat-${cat}" onchange="this.className='esic-cat cat-'+this.value;calcEsicSplit()">${opts}</select></td>
    <td><button type="button" class="row-del" title="Remove" onclick="this.closest('tr').remove();calcEsicSplit()">×</button></td>
  </tr>`;
}

function addEsicRow(name, amount, cat) {
  document.getElementById('esic-rows').insertAdjacentHTML('beforeend', esicRowHtml(name, amount, cat));
  calcEsicSplit();
}

function buildEsicRows() {
  document.getElementById('esic-rows').innerHTML =
    ESIC_DEFAULT_ROWS.map(r => esicRowHtml(r[0], r[1], r[2])).join('');
}

function onEsicPwd() {
  document.getElementById('esic-ceiling').value =
    document.getElementById('esic-pwd').checked ? 25000 : 21000;
  calcEsicSplit();
}

function resetEsic() {
  buildEsicRows();
  document.getElementById('esic-ceiling').value = 21000;
  document.getElementById('esic-ee').value = 0.75;
  document.getElementById('esic-er').value = 3.25;
  document.getElementById('esic-pwd').checked = false;
  calcEsicSplit();
}

function calcEsicSplit() {
  const tbody = document.getElementById('esic-rows');
  if (!tbody) return;

  let TR = 0, E50 = 0, ENOT = 0, INC = 0, basic = 0;
  const rows = [...tbody.querySelectorAll('tr')];
  rows.forEach((tr, i) => {
    const amt = parseFloat(tr.querySelector('.esic-amt').value) || 0;
    const cat = tr.querySelector('.esic-cat').value;
    TR += amt;
    if (cat === 'e50') E50 += amt;
    else if (cat === 'enot') ENOT += amt;
    else { INC += amt; if (i === 0) basic = amt; }
  });

  const ceiling = parseFloat(document.getElementById('esic-ceiling').value) || 0;
  const eeRate  = (parseFloat(document.getElementById('esic-ee').value) || 0) / 100;
  const erRate  = (parseFloat(document.getElementById('esic-er').value) || 0) / 100;

  const cap    = 0.5 * TR;
  const excess = Math.max(0, E50 - cap);
  const wages  = TR - ENOT - Math.min(E50, cap);
  const adjBasic = basic + excess;

  const el = document.getElementById('esic-result');
  if (TR <= 0) {
    el.innerHTML = '<p style="font-size:14px;color:var(--text-secondary);margin:0">Enter at least one component amount to see the wage base.</p>';
    return;
  }

  const eligible = wages <= ceiling;
  const ee = eligible ? Math.round(wages * eeRate) : 0;
  const er = eligible ? Math.round(wages * erRate) : 0;
  const e50Pct = TR > 0 ? (E50 / TR) * 100 : 0;
  const breached = excess > 0;

  el.innerHTML = `
    <div class="epf-sumgrid">
      <div class="epf-sumcard"><span>ESIC wage base</span><strong>${fmtINR(wages)}</strong></div>
      <div class="epf-sumcard"><span>ESIC applicable?</span><strong style="color:${eligible ? '#1a7d3c' : '#c0392b'}">${eligible ? 'Yes' : 'No'}</strong></div>
      <div class="epf-sumcard wide"><span>Total monthly ESIC contribution</span><strong>${fmtINR(ee + er)}</strong></div>
    </div>

    <div class="epf-group-head">The 50% test</div>
    <div class="epf-line"><span>Total remuneration (TR)</span><strong>${fmtINR(TR)}</strong></div>
    <div class="epf-line"><span>Exclusions counting toward the 50% test</span><strong>${fmtINR(E50)} <span style="font-weight:400;color:var(--text-secondary)">(${e50Pct.toFixed(1)}%)</span></strong></div>
    <div class="epf-line"><span>50% of TR (the cap)</span><strong>${fmtINR(cap)}</strong></div>
    <div class="epf-line"><span>Excess to add back to wages</span><strong style="color:${breached ? '#c0392b' : 'inherit'}">${fmtINR(excess)}</strong></div>

    <div class="epf-group-head">Wage base build-up</div>
    <div class="epf-line"><span>Components included in wages</span><strong>${fmtINR(INC)}</strong></div>
    <div class="epf-line"><span>Add back: excess over the 50% cap</span><strong>${fmtINR(excess)}</strong></div>
    <div class="epf-line"><span>Excluded, kept out of the 50% test</span><strong>${fmtINR(ENOT)}</strong></div>
    <div class="epf-line credit"><span>Wages for ESIC</span><strong>${fmtINR(wages)}</strong></div>
    <div class="epf-line"><span>Adjusted Basic for ESIC (Basic + excess)</span><strong>${fmtINR(adjBasic)}</strong></div>

    <div class="epf-group-head">Contribution</div>
    ${eligible ? `
      <div class="epf-line"><span>Employee (${(eeRate*100).toFixed(2)}% of ${fmtINR(wages)})</span><strong>${fmtINR(ee)}</strong></div>
      <div class="epf-line"><span>Employer (${(erRate*100).toFixed(2)}% of ${fmtINR(wages)})</span><strong>${fmtINR(er)}</strong></div>
      <div class="epf-line credit"><span>Total monthly ESIC</span><strong>${fmtINR(ee + er)}</strong></div>`
    : `<p style="font-family:'Inter',sans-serif;font-size:13px;color:var(--text-secondary);line-height:1.7;margin:8px 0 0">
         The ESIC wage base of ${fmtINR(wages)} exceeds the ${fmtINR(ceiling)} ceiling, so ESIC is not applicable for this employee. If the employee was already covered, contributions continue until the end of the running contribution period.
       </p>`}

    ${breached ? `
      <div class="epf-src" style="border-left:3px solid #c0392b">
        <h5>50% cap breached</h5>
        <p>Exclusions are ${e50Pct.toFixed(1)}% of total remuneration, above the 50% limit. ${fmtINR(excess)} has been added back into the wage base, which raises PF, gratuity and bonus liability as well, not just ESIC. Restructuring Basic upward would remove this add-back.</p>
      </div>`
    : `
      <div class="epf-src" style="border-left:3px solid #1a7d3c">
        <h5>Structure meets the 50% floor</h5>
        <p>Exclusions are ${e50Pct.toFixed(1)}% of total remuneration, within the 50% limit, so nothing is added back to wages.</p>
      </div>`}

    <div class="epf-src">
      <h5>Source provisions</h5>
      <p>
        Definition of wages and the 50% proviso: Section 2(y), Code on Wages, 2019, adopted by Section 2(88), Code on Social Security, 2020.<br>
        ESIC contribution rates 0.75% employee / 3.25% employer: Rule 51, ESI (Central) Rules, 1950, w.e.f. 01.07.2019.<br>
        Wage ceiling ₹21,000 per month (₹25,000 for persons with disability): Rule 50, ESI (Central) Rules, 1950.
      </p>
    </div>
  `;
}

/* ---------- 4. Professional Tax (PAN-India) ---------- */
/* Slab data comes from js/pt-data.js, shared with the Knowledge Hub reference table. */

function ptSlabMatch(slabs, income) {
  for (const row of slabs) {
    const upto = row[0];
    if (upto === null || income <= upto) return { amt: row[1], feb: row[2] || null };
  }
  return { amt: 0, feb: null };
}

/* Returns the PT amount in the state's own basis unit, plus how many
   times a year that amount is levied. */
function ptCompute(stateName, monthlyWage, female) {
  const st = PT_DATA[stateName];
  if (!st || !st.applicable) return null;
  const k = st.calc;

  const periodsPerYear = k.basis === 'monthly' ? 12 : (k.basis === 'halfyearly' ? 2 : 1);
  const income = k.basis === 'monthly' ? monthlyWage
               : k.basis === 'halfyearly' ? monthlyWage * 6
               : monthlyWage * 12;

  const slabs = k.gender ? (female ? k.slabsFemale : k.slabsMale) : k.slabs;
  const hit = ptSlabMatch(slabs, income);
  const perPeriod = hit.amt;

  let annual = perPeriod * periodsPerYear;
  let febAmount = null;

  /* Only the slabs that would otherwise fall short carry a higher February
     figure, used to reach (without exceeding) the ₹2,500 annual cap. */
  if (hit.feb && k.basis === 'monthly' && perPeriod > 0) {
    febAmount = hit.feb;
    annual = perPeriod * 11 + hit.feb;
  }

  return {
    basis: k.basis, periodsPerYear, income, perPeriod, febAmount,
    annual, monthlyEquivalent: annual / 12, act: k.act, genderBased: !!k.gender
  };
}

function onPtStateChange() {
  if (!document.getElementById('pt-state')) return;
  const stateName = document.getElementById('pt-state').value;
  const st = PT_DATA[stateName];
  const femaleRow = document.getElementById('pt-female-row');
  femaleRow.style.display = (st && st.applicable && st.calc.gender) ? 'flex' : 'none';
  calcPT();
}

function calcPT() {
  if (!document.getElementById('pt-state')) return;
  const stateName = document.getElementById('pt-state').value;
  const wage   = parseFloat(document.getElementById('pt-gross').value) || 0;
  const female = document.getElementById('pt-female').checked;
  const el = document.getElementById('pt-result');
  const st = PT_DATA[stateName];

  if (!st) { el.innerHTML = ''; return; }

  if (!st.applicable) {
    el.innerHTML = `
      <div class="epf-sumgrid">
        <div class="epf-sumcard wide"><span>Monthly liability</span><strong>Not applicable</strong></div>
      </div>
      <div class="epf-src" style="margin-top:12px">
        <h5>Professional Tax is not levied in ${stateName}</h5>
        <p>${st.note ? st.note : 'No PT registration, deduction, remittance or return obligations apply to establishments in this state.'}</p>
      </div>`;
    return;
  }

  if (wage <= 0) {
    el.innerHTML = '<p style="font-size:14px;color:var(--text-secondary);margin:0">Enter a gross monthly wage to see the liability.</p>';
    return;
  }

  const r = ptCompute(stateName, wage, female);
  const basisLabel = r.basis === 'monthly' ? 'month' : (r.basis === 'halfyearly' ? 'half-year' : 'year');
  const monthlyDisplay = r.basis === 'monthly' ? r.perPeriod : r.monthlyEquivalent;

  let periodRow = '';
  if (r.basis !== 'monthly') {
    periodRow = `<div class="epf-line"><span>${r.basis === 'halfyearly' ? 'Half-yearly' : 'Annual'} income assessed</span><strong>${fmtINR(r.income)}</strong></div>
                 <div class="epf-line"><span>PT per ${basisLabel} (as notified)</span><strong>${fmtINR(r.perPeriod)}</strong></div>`;
  }

  el.innerHTML = `
    <div class="epf-sumgrid">
      <div class="epf-sumcard"><span>${r.basis === 'monthly' ? 'Monthly liability' : 'Monthly equivalent'}</span><strong>${fmtINR(monthlyDisplay)}</strong></div>
      <div class="epf-sumcard"><span>Annual</span><strong>${fmtINR(r.annual)}</strong></div>
    </div>

    <div class="epf-src" style="margin-top:4px">
      <h5>Article 276 ceiling</h5>
      <p>Annual professional tax cannot exceed ₹2,500 per person under Article 276(2) of the Constitution.</p>
    </div>

    <div class="epf-group-head">How this is computed</div>
    <div class="epf-line"><span>State</span><strong>${stateName}</strong></div>
    <div class="epf-line"><span>Gross monthly wage</span><strong>${fmtINR(wage)}</strong></div>
    ${r.genderBased ? `<div class="epf-line"><span>Slab applied</span><strong>${female ? 'Female' : 'Male'}</strong></div>` : ''}
    ${periodRow}
    ${r.febAmount ? `<div class="epf-line"><span>Regular months (Mar to Jan)</span><strong>${fmtINR(r.perPeriod)} × 11</strong></div>
                     <div class="epf-line"><span>February (catch-up to the annual cap)</span><strong>${fmtINR(r.febAmount)}</strong></div>` : ''}
    <div class="epf-line credit"><span>Annual liability</span><strong>${fmtINR(r.annual)}</strong></div>

    ${r.basis !== 'monthly' ? `<p style="font-family:'Inter',sans-serif;font-size:13px;color:var(--text-secondary);line-height:1.7;margin-top:12px">${stateName} levies PT ${r.basis === 'halfyearly' ? 'half-yearly' : 'annually'}, so the monthly figure shown is an averaged equivalent. The actual deduction is made ${r.periodsPerYear === 1 ? 'once a year' : 'twice a year'} as a lump sum.</p>` : ''}
    ${r.febAmount ? `<p style="font-family:'Inter',sans-serif;font-size:13px;color:var(--text-secondary);line-height:1.7;margin-top:12px">${fmtINR(r.febAmount)} is payable in February (${fmtINR(r.perPeriod)} regular + ${fmtINR(r.febAmount - r.perPeriod)} catch-up) so the annual liability reaches, but does not exceed, ₹2,500.</p>` : ''}

    <div class="epf-src">
      <h5>Source provision</h5>
      <p>${r.act}</p>
    </div>

    <div class="epf-src" style="border-left:3px solid var(--secondary)">
      <h5>Employer obligations in ${stateName}</h5>
      <p>
        Employee PT periodicity: ${st.empPeriodicity} &nbsp;|&nbsp; Due: ${st.empDue}<br>
        Employer PT (EC): ${st.employerAmt} &nbsp;|&nbsp; Due: ${st.employerDue}<br>
        Remittance: ${st.remittance} &nbsp;|&nbsp; Returns: ${st.returnMode}<br>
        Full state-wise reference: <a href="knowledge.html#pt" style="color:var(--primary);font-weight:600">Knowledge Hub PT tool →</a>
      </p>
    </div>
  `;
}

function resetPT() {
  document.getElementById('pt-state').value = 'Maharashtra';
  document.getElementById('pt-gross').value = 25000;
  document.getElementById('pt-female').checked = false;
  onPtStateChange();
}

/* ---------- 5. Gratuity ---------- */
const GRAT_CEILING = 2000000;

function gratSel(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

function gratPaint(name, map) {
  Object.keys(map).forEach(v => {
    const card = document.getElementById(map[v]);
    if (card) card.classList.toggle('on', gratSel(name) === v);
  });
}

function onGratRegime() {
  if (!document.getElementById('gr-ft-desc')) return;
  gratPaint('gr-regime', { act: 'gr-reg-act-card', code: 'gr-reg-code-card' });
  gratPaint('gr-type',   { perm: 'gr-type-perm-card', ft: 'gr-type-ft-card' });
  /* The fixed-term rule only changes once the Code is in force. */
  document.getElementById('gr-ft-desc').textContent =
    gratSel('gr-regime') === 'code' ? 'Pro-rata after 1 year' : '5-year threshold under 1972 Act';
  calcGratuity();
}

function onGratCause() {
  gratPaint('gr-cause', {
    resign: 'gr-c-resign-card', retire: 'gr-c-retire-card',
    death: 'gr-c-death-card',  disable: 'gr-c-disable-card'
  });
  calcGratuity();
}

function resetGratuity() {
  document.querySelector('input[name="gr-regime"][value="act"]').checked = true;
  document.querySelector('input[name="gr-type"][value="perm"]').checked = true;
  document.querySelector('input[name="gr-cause"][value="resign"]').checked = true;
  document.getElementById('grat-wages').value = 50000;
  document.getElementById('grat-years').value = 7;
  document.getElementById('grat-months').value = 3;
  onGratRegime(); onGratCause();
}

function gratSource(regime, type, proRata) {
  if (regime === 'code') {
    return proRata ? 'Proviso to Section 53(2), Code on Social Security, 2020'
                   : 'Section 53(1), Code on Social Security, 2020';
  }
  return 'Section 4(1), Payment of Gratuity Act, 1972';
}

function calcGratuity() {
  const wages  = parseFloat(document.getElementById('grat-wages').value) || 0;
  const years  = parseFloat(document.getElementById('grat-years').value) || 0;
  const months = parseFloat(document.getElementById('grat-months').value) || 0;
  const regime = gratSel('gr-regime');
  const type   = gratSel('gr-type');
  const cause  = gratSel('gr-cause');
  const el = document.getElementById('grat-result');
  if (!el) return;

  const actualService = years + months / 12;
  /* Fixed-term employees get pro-rata treatment only under the Code. */
  const proRata   = (regime === 'code' && type === 'ft');
  const threshold = proRata ? 1 : 5;
  const waived    = (cause === 'death' || cause === 'disable');
  const eligible  = waived || actualService >= threshold;

  let basis;
  if (waived) basis = 'Five-year threshold waived: cessation due to ' + (cause === 'death' ? 'death.' : 'disablement.');
  else if (eligible) basis = 'Qualifying-service threshold met.';
  else basis = `Qualifying service of ${actualService.toFixed(2)} years is below the ${threshold}-year threshold.`;

  if (!eligible) {
    el.innerHTML = `
      <div class="epf-sumgrid">
        <div class="epf-sumcard wide"><span>Gratuity payable</span><strong>Not eligible</strong></div>
      </div>
      <div class="epf-group-head">Why</div>
      <div class="epf-line"><span>Service completed</span><strong>${years} year(s) ${months} month(s)</strong></div>
      <div class="epf-line"><span>Threshold required</span><strong>${threshold} year(s)</strong></div>
      <div class="epf-line"><span>Eligibility basis</span><strong>${basis}</strong></div>
      <div class="epf-src">
        <h5>Note</h5>
        <p>The threshold does not apply where service ends due to death or disablement. Several High Courts have also held that 4 years and 240 days of service in the fifth year satisfies the five-year requirement; that interpretation is not applied automatically here.</p>
      </div>`;
    return;
  }

  /* Pro-rata keeps the fraction; otherwise a part-year over six months rounds up. */
  const qualifying = proRata ? actualService : (months > 6 ? years + 1 : years);
  const qualLabel  = proRata ? qualifying.toFixed(4) : qualifying;

  const raw    = (wages * 15 * qualifying) / 26;
  const capped = Math.min(raw, GRAT_CEILING);

  el.innerHTML = `
    <div class="epf-sumgrid">
      <div class="epf-sumcard wide"><span>Gratuity payable</span><strong>${fmtINR(capped)}</strong></div>
    </div>

    <div class="epf-line"><span>Formula</span><strong>(${fmtINR(wages)} × 15 × ${qualLabel}) / 26</strong></div>
    <div class="epf-line"><span>Qualifying service used</span><strong>${qualLabel} year(s)</strong></div>
    <div class="epf-line"><span>Days multiplier</span><strong>15</strong></div>
    <div class="epf-line"><span>Divisor</span><strong>26</strong></div>
    <div class="epf-line"><span>Eligibility basis</span><strong>${basis}</strong></div>
    ${raw > GRAT_CEILING ? `<div class="epf-line"><span>Computed before ceiling</span><strong>${fmtINR(raw)}</strong></div>
      <div class="epf-line credit"><span>Capped at the statutory ceiling</span><strong>${fmtINR(GRAT_CEILING)}</strong></div>` : ''}

    ${!proRata && months > 6 ? `<p style="font-family:'Inter',sans-serif;font-size:13px;color:var(--text-secondary);line-height:1.7;margin-top:12px">${months} months in the final year exceeds six, so service has been rounded up to ${qualifying} years.</p>` : ''}
    ${!proRata && months > 0 && months <= 6 ? `<p style="font-family:'Inter',sans-serif;font-size:13px;color:var(--text-secondary);line-height:1.7;margin-top:12px">${months} months in the final year is six or fewer, so the part-year is disregarded.</p>` : ''}
    ${proRata ? `<p style="font-family:'Inter',sans-serif;font-size:13px;color:var(--text-secondary);line-height:1.7;margin-top:12px">Fixed-term employee under the Code: gratuity is computed pro-rata on ${qualLabel} years of actual service rather than on rounded completed years.</p>` : ''}
    ${qualifying === 0 ? `<p style="font-family:'Inter',sans-serif;font-size:13px;color:var(--text-secondary);line-height:1.7;margin-top:12px">The threshold is waived, but service rounds to zero completed years, so the formula yields nil. Where death or disablement occurs very early in service, check whether any group gratuity or insurance scheme provides a minimum benefit.</p>` : ''}

    <div class="epf-src">
      <h5>Source provision</h5>
      <p>${gratSource(regime, type, proRata)}</p>
    </div>
  `;
}

/* ---------- 6. Statutory Bonus ---------- */
const BONUS_ELIG_CEILING = 21000;   /* Section 2(13) */
const BONUS_CALC_FLOOR   = 7000;    /* proviso to Section 12 */
const BONUS_MIN_DAYS     = 30;      /* Section 8 */

function resetBonus() {
  document.getElementById('bonus-salary').value  = 21000;
  document.getElementById('bonus-minwage').value = 11000;
  document.getElementById('bonus-days').value    = 365;
  document.getElementById('bonus-pct').value     = 8.33;
  calcBonus();
}

function bonusAlert(title, msg) {
  return `<div class="calc-alert"><span class="calc-alert-icon">⚠</span><div><h5>${title}</h5><p>${msg}</p></div></div>`;
}

function calcBonus() {
  if (!document.getElementById('bonus-salary')) return;   /* section not on this page */
  const salary  = parseFloat(document.getElementById('bonus-salary').value) || 0;
  const minWage = parseFloat(document.getElementById('bonus-minwage').value) || 0;
  const days    = parseFloat(document.getElementById('bonus-days').value) || 0;
  const rate    = parseFloat(document.getElementById('bonus-pct').value) || 8.33;
  const el = document.getElementById('bonus-result');
  if (!el) return;

  document.getElementById('bonus-pct-label').textContent = rate.toFixed(2).replace(/\.?0+$/,'') + '%';

  if (salary <= 0) {
    el.innerHTML = '<p style="font-size:14px;color:var(--text-secondary);margin:0">Enter a monthly salary to compute the bonus.</p>';
    return;
  }

  /* Section 2(13): employees drawing above the ceiling are outside the Act. */
  if (salary > BONUS_ELIG_CEILING) {
    el.innerHTML = bonusAlert('Not eligible for statutory bonus',
      `Salary ${fmtINR(salary)} exceeds the eligibility ceiling of ${fmtINR(BONUS_ELIG_CEILING)} under Section 2(13).`);
    return;
  }

  /* Section 8: at least 30 working days in the accounting year. */
  if (days < BONUS_MIN_DAYS) {
    el.innerHTML = bonusAlert('Not eligible for statutory bonus',
      `${days} day(s) worked is below the minimum of ${BONUS_MIN_DAYS} working days in the accounting year required by Section 8.`);
    return;
  }

  /* Proviso to Section 12: cap the basis at the higher of ₹7,000 and the
     scheduled minimum wage, but never above what the employee actually earns. */
  const ceilingBasis = Math.max(BONUS_CALC_FLOOR, minWage);
  const basis        = Math.min(salary, ceilingBasis);

  let basisSource;
  if (salary <= ceilingBasis)          basisSource = 'Actual salary (at or below the calculation ceiling)';
  else if (minWage > BONUS_CALC_FLOOR) basisSource = 'Higher of ₹7,000 and scheduled minimum wage';
  else                                 basisSource = '₹7,000 calculation ceiling';

  const daysCapped = Math.min(days, 365);
  const proRata    = daysCapped / 365;
  const annualBasis = basis * 12 * proRata;
  const bonus       = Math.round(annualBasis * (rate / 100));

  el.innerHTML = `
    <div class="epf-sumgrid">
      <div class="epf-sumcard wide">
        <span>Annual bonus payable</span>
        <strong>${fmtINR(bonus)}</strong>
        <div style="font-family:'Inter',sans-serif;font-size:12.5px;color:var(--text-secondary);margin-top:6px">At ${rate}% on an annual basis of ${fmtINR(annualBasis)}.</div>
      </div>
    </div>

    <div class="epf-line"><span>Basis wage (monthly)</span><strong>${fmtINR(basis)}</strong></div>
    <div class="epf-line"><span>Basis source</span><strong>${basisSource}</strong></div>
    <div class="epf-line"><span>Annual basis${daysCapped < 365 ? ' (pro-rated)' : ''}</span><strong>${fmtINR(annualBasis)}</strong></div>
    <div class="epf-line"><span>Bonus rate</span><strong>${rate}%</strong></div>
    ${daysCapped < 365 ? `<div class="epf-line"><span>Pro-rating applied</span><strong>${daysCapped} / 365 days</strong></div>` : ''}

    <div class="epf-src">
      <h5>Source provisions</h5>
      <p>
        Eligibility: Section 2(13) and Section 8, Payment of Bonus Act, 1965.<br>
        Calculation ceiling: proviso to Section 12.<br>
        Rate band: Section 10 (min 8.33%) and Section 11 (max 20%).<br>
        Pro-rating: Section 13.
      </p>
    </div>
  `;
}

/* ---------- 7. Maternity Benefit ---------- */
function calcMaternity() {
  if (!document.getElementById('mat-salary')) return;
  const salary = parseFloat(document.getElementById('mat-salary').value) || 0;
  const childCount = document.getElementById('mat-children').value;
  const days = childCount === '3plus' ? 84 : 182;
  const avgDailyWage = (salary * 12) / 365;
  const total = avgDailyWage * days;

  document.getElementById('mat-result').innerHTML = `
    <div class="calc-row"><span>Average Daily Wage</span><strong>${fmtINR(avgDailyWage)}</strong></div>
    <div class="calc-row"><span>Paid Leave Duration</span><strong>${days} days (${days === 182 ? '26 weeks' : '12 weeks'})</strong></div>
    <div class="calc-row calc-total"><span>Estimated Total Maternity Benefit</span><strong>${fmtINR(total)}</strong></div>
    <p style="font-size:13px;color:var(--text-secondary);margin-top:10px">26 weeks applies for the first two children; 12 weeks for the third child onward, as per the Maternity Benefit (Amendment) Act, 2017.</p>
  `;
}

/* ---------- 8. Allowance Heatmap (Code on Wages 50% rule) ---------- */
function calcHeatmap() {
  if (!document.getElementById('hm-basic')) return;
  const basic = parseFloat(document.getElementById('hm-basic').value) || 0;
  const da = parseFloat(document.getElementById('hm-da').value) || 0;
  const hra = parseFloat(document.getElementById('hm-hra').value) || 0;
  const conveyance = parseFloat(document.getElementById('hm-conv').value) || 0;
  const other = parseFloat(document.getElementById('hm-other').value) || 0;

  const wages = basic + da;
  const totalRem = basic + da + hra + conveyance + other;
  if (totalRem === 0) return;
  const wagePct = (wages / totalRem) * 100;
  const compliant = wagePct >= 50;
  const shortfall = compliant ? 0 : (totalRem * 0.5) - wages;

  document.getElementById('hm-result').innerHTML = `
    <div class="calc-row"><span>Basic + DA as % of total remuneration</span><strong style="color:${compliant ? '#1a7d3c' : '#c0392b'}">${wagePct.toFixed(1)}%</strong></div>
    <div class="heatmap-bar"><div class="heatmap-fill" style="width:${Math.min(wagePct,100)}%;background:${compliant ? '#1a7d3c' : '#c0392b'}"></div></div>
    <div class="calc-row calc-total"><span>Status</span><strong style="color:${compliant ? '#1a7d3c' : '#c0392b'}">${compliant ? '✓ Meets the 50% wage floor' : '⚠ Below the 50% wage floor'}</strong></div>
    ${!compliant ? `<p style="font-size:13px;color:var(--text-secondary);margin-top:10px">Under the Code on Wages, if allowances (HRA, conveyance, other) exceed 50% of total remuneration, the excess — approximately ${fmtINR(shortfall)} here — must be added back to "wages" for PF, gratuity and bonus calculation purposes.</p>` : '<p style="font-size:13px;color:var(--text-secondary);margin-top:10px">This structure meets the statutory wage floor, so no allowance amount needs to be added back for PF/gratuity/bonus calculation.</p>'}
  `;
}

/* Each calculator is independent: run them in isolation so a failure in one
   (for example a stale cached script meeting freshly deployed markup) cannot
   stop the others from initialising. */
document.addEventListener('DOMContentLoaded', () => {
  [calcTakeHome, calcEpfSplit, buildEsicRows, calcEsicSplit, onPtStateChange,
   onGratRegime, onGratCause, calcBonus, calcMaternity, calcHeatmap]
    .forEach(fn => {
      try { fn(); }
      catch (err) { console.warn('Calculator init skipped:', fn.name, err); }
    });
});
