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
  const adminRaw    = base * 0.005;
  const adminMinApplied = adminRaw < 500;
  const admin       = Math.max(Math.round(adminRaw), 500);

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
    <div class="epf-line"><span>A/c 2: EPF admin (0.5%, min ₹500)</span><strong>${fmtINR(admin)}</strong></div>

    <div class="epf-group-head">Credited in the employee&rsquo;s name</div>
    <div class="epf-line"><span>A/c 1 EPF (employee ${fmtINR(employee)} + employer ${fmtINR(employerEPF)})</span><strong>${fmtINR(employee + employerEPF)}</strong></div>
    <div class="epf-line"><span>A/c 10 EPS / Pension</span><strong>${fmtINR(eps)}</strong></div>
    <div class="epf-line credit"><span>Total credited to the employee</span><strong>${fmtINR(credited)}</strong></div>

    <p style="font-family:'Inter',sans-serif;font-size:13px;color:var(--text-secondary);line-height:1.7;margin-top:12px">
      EDLI (A/c 21) and admin charges (A/c 2) are employer overheads paid to EPFO. They are <strong>not</strong> credited to the employee&rsquo;s PF account.
    </p>
    ${adminMinApplied ? '<p style="font-family:\'Inter\',sans-serif;font-size:13px;color:var(--text-secondary);line-height:1.7;margin-top:6px">Admin charges shown as the ₹500 monthly minimum. This minimum applies per establishment on total EPF wages, not per employee, so the per-employee figure will be lower once you have more members.</p>' : ''}
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

/* ---------- 3. ESIC Split ---------- */
function calcEsicSplit() {
  const gross = parseFloat(document.getElementById('esic-gross').value) || 0;
  const pwd = document.getElementById('esic-pwd').checked;
  const threshold = pwd ? 25000 : 21000;

  if (gross > threshold) {
    document.getElementById('esic-result').innerHTML = `
      <div class="calc-row"><span>Status</span><strong>Not Covered</strong></div>
      <p style="font-size:14px;color:var(--text-secondary);margin-top:8px">Gross wage exceeds the ₹${threshold.toLocaleString('en-IN')} ESIC threshold, so ESIC is not applicable for this employee (unless already covered and contribution period is ongoing).</p>
    `;
    return;
  }
  const employee = gross * 0.0075;
  const employer = gross * 0.0325;
  document.getElementById('esic-result').innerHTML = `
    <div class="calc-row"><span>Employee Contribution (0.75%)</span><strong>${fmtINR(employee)}</strong></div>
    <div class="calc-row"><span>Employer Contribution (3.25%)</span><strong>${fmtINR(employer)}</strong></div>
    <div class="calc-row calc-total"><span>Total Monthly ESIC Contribution</span><strong>${fmtINR(employee + employer)}</strong></div>
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
  const stateName = document.getElementById('pt-state').value;
  const st = PT_DATA[stateName];
  const femaleRow = document.getElementById('pt-female-row');
  femaleRow.style.display = (st && st.applicable && st.calc.gender) ? 'flex' : 'none';
  calcPT();
}

function calcPT() {
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
function calcGratuity() {
  const basicDA = parseFloat(document.getElementById('grat-basic').value) || 0;
  const years = parseFloat(document.getElementById('grat-years').value) || 0;
  const cap = 2000000;

  if (years < 5) {
    document.getElementById('grat-result').innerHTML = `
      <div class="calc-row"><span>Status</span><strong>Not Eligible</strong></div>
      <p style="font-size:14px;color:var(--text-secondary);margin-top:8px">Gratuity under the Payment of Gratuity Act generally requires 5+ years of continuous service (with specific exceptions such as death or disablement).</p>
    `;
    return;
  }
  const raw = (15 * basicDA * years) / 26;
  const gratuity = Math.min(raw, cap);
  document.getElementById('grat-result').innerHTML = `
    <div class="calc-row"><span>Formula: (15 × Last Drawn Basic+DA × Years) ÷ 26</span><strong>${fmtINR(raw)}</strong></div>
    <div class="calc-row calc-total"><span>Payable Gratuity (capped at ₹20,00,000)</span><strong>${fmtINR(gratuity)}</strong></div>
    ${raw > cap ? '<p style="font-size:13px;color:var(--text-secondary);margin-top:10px">Calculated amount exceeds the statutory tax-exempt ceiling of ₹20,00,000; amount shown is capped accordingly.</p>' : ''}
  `;
}

/* ---------- 6. Statutory Bonus ---------- */
function calcBonus() {
  const basicDA = parseFloat(document.getElementById('bonus-basic').value) || 0;
  const gross = parseFloat(document.getElementById('bonus-gross').value) || 0;
  const pct = parseFloat(document.getElementById('bonus-pct').value) || 8.33;
  document.getElementById('bonus-pct-label').textContent = pct + '%';

  if (gross > 21000) {
    document.getElementById('bonus-result').innerHTML = `
      <div class="calc-row"><span>Status</span><strong>Not Covered Under Bonus Act</strong></div>
      <p style="font-size:14px;color:var(--text-secondary);margin-top:8px">Gross wage exceeds the ₹21,000/month eligibility threshold under the Payment of Bonus Act.</p>
    `;
    return;
  }
  const bonusWage = Math.min(basicDA, 7000);
  const annualBonus = bonusWage * 12 * (pct / 100);
  document.getElementById('bonus-result').innerHTML = `
    <div class="calc-row"><span>Bonus-eligible wage (capped at ₹7,000)</span><strong>${fmtINR(bonusWage)}</strong></div>
    <div class="calc-row calc-total"><span>Estimated Annual Bonus (${pct}%)</span><strong>${fmtINR(annualBonus)}</strong></div>
    <p style="font-size:13px;color:var(--text-secondary);margin-top:10px">Applicable to establishments with 20+ employees; bonus ranges from 8.33% (minimum) to 20% (maximum) of eligible wage.</p>
  `;
}

/* ---------- 7. Maternity Benefit ---------- */
function calcMaternity() {
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

document.addEventListener('DOMContentLoaded', () => {
  calcTakeHome(); calcEpfSplit(); calcEsicSplit(); onPtStateChange();
  calcGratuity(); calcBonus(); calcMaternity(); calcHeatmap();
});
