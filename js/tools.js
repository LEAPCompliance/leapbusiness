/* ============================================
   LEAP Business Solutions – Compliance & Payroll Calculators
   Indicative estimates only. Not legal/financial advice.
   ============================================ */

function fmtINR(n) {
  if (isNaN(n)) return '₹0';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

/* ---------- 1. CTC Structure & Take-Home ---------- */
function calcTakeHome() {
  const gross = parseFloat(document.getElementById('ctc-gross').value) || 0;
  const gender = document.getElementById('ctc-gender').value;
  const female = gender === 'Female';
  const comm = parseFloat(document.getElementById('ctc-comm').value) || 0;
  const conv = parseFloat(document.getElementById('ctc-conv').value) || 0;

  // Part A - Earnings
  const basicDA = gross * 0.5;
  const hra = basicDA * 0.5;
  const special = gross - basicDA - hra - comm - conv;
  const grossTotal = basicDA + hra + comm + conv + special; // = gross

  // Part B - Employee Deductions
  const pfWage = grossTotal - hra; // Basic+DA + all allowances except HRA
  const pfEmp = pfWage > 15000 ? 1800 : pfWage * 0.12;
  const esicApplicable = basicDA < 21000;
  const esicEmp = esicApplicable ? basicDA * 0.0075 : 0;
  const pt = maharashtraPT(gross, female, 'other');
  const mlwfEmp = Math.round((25 / 6) * 100) / 100;
  const netSalary = grossTotal - pfEmp - esicEmp - pt - mlwfEmp;

  // Part C - Employer Cost
  const pfEmployer = pfWage > 15000 ? 1950 : pfWage * 0.13;
  const esicEmployer = esicApplicable ? basicDA * 0.0325 : 0;
  const mlwfEmployer = Math.round((75 / 6) * 100) / 100;
  const bonus = basicDA * 0.0833;
  const gratuity = basicDA * 0.0481;
  const employerCostTotal = pfEmployer + esicEmployer + mlwfEmployer + bonus + gratuity;

  const ctc = grossTotal + employerCostTotal;

  document.getElementById('th-result').innerHTML = `
    <div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--secondary);margin-bottom:4px">Part A — Earnings</div>
    <div class="calc-row"><span>Basic + DA (50% of gross)</span><strong>${fmtINR(basicDA)}</strong></div>
    <div class="calc-row"><span>HRA (50% of Basic + DA)</span><strong>${fmtINR(hra)}</strong></div>
    <div class="calc-row"><span>Communication Allowance</span><strong>${fmtINR(comm)}</strong></div>
    <div class="calc-row"><span>Conveyance / Fuel Allowance</span><strong>${fmtINR(conv)}</strong></div>
    <div class="calc-row"><span>Special Allowance (balancing)</span><strong>${fmtINR(special)}</strong></div>
    <div class="calc-row calc-total"><span>Gross Salary</span><strong>${fmtINR(grossTotal)}</strong></div>

    <div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--secondary);margin:16px 0 4px">Part B — Employee Deductions</div>
    <div class="calc-row"><span>PF — Employee (12%${pfWage > 15000 ? ', capped ₹1,800' : ''})</span><strong>- ${fmtINR(pfEmp)}</strong></div>
    <div class="calc-row"><span>ESIC — Employee ${esicApplicable ? '(0.75%)' : '(n/a, Basic+DA ≥ ₹21,000)'}</span><strong>- ${fmtINR(esicEmp)}</strong></div>
    <div class="calc-row"><span>Professional Tax (Maharashtra)</span><strong>- ${fmtINR(pt)}</strong></div>
    <div class="calc-row"><span>MLWF — Employee (monthly provision)</span><strong>- ${fmtINR(mlwfEmp)}</strong></div>
    <div class="calc-row calc-total"><span>Net Take-Home Salary</span><strong>${fmtINR(netSalary)}</strong></div>

    <div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--secondary);margin:16px 0 4px">Part C — Employer Cost (Over &amp; Above Gross)</div>
    <div class="calc-row"><span>PF — Employer (13%${pfWage > 15000 ? ', capped ₹1,950' : ''})</span><strong>${fmtINR(pfEmployer)}</strong></div>
    <div class="calc-row"><span>ESIC — Employer ${esicApplicable ? '(3.25%)' : '(n/a, Basic+DA ≥ ₹21,000)'}</span><strong>${fmtINR(esicEmployer)}</strong></div>
    <div class="calc-row"><span>MLWF — Employer (monthly provision)</span><strong>${fmtINR(mlwfEmployer)}</strong></div>
    <div class="calc-row"><span>Statutory Bonus (8.33%)</span><strong>${fmtINR(bonus)}</strong></div>
    <div class="calc-row"><span>Gratuity provision (4.81%)</span><strong>${fmtINR(gratuity)}</strong></div>
    <div class="calc-row calc-total"><span>Employer Cost (Part C Total)</span><strong>${fmtINR(employerCostTotal)}</strong></div>

    <div class="calc-row calc-total" style="margin-top:16px;padding-top:16px;border-top:2px solid var(--primary);font-size:17px"><span>💼 Total CTC (Monthly)</span><strong>${fmtINR(ctc)}</strong></div>
    <div class="calc-row"><span>Total CTC (Annual)</span><strong>${fmtINR(ctc * 12)}</strong></div>

    <div style="margin-top:16px;padding-top:16px;border-top:1px dashed var(--border);font-size:13px;color:var(--text-secondary);line-height:1.7">
      <strong style="color:var(--text-primary)">Notes:</strong><br>
      • Basic + DA must also meet the applicable Minimum Wages floor for the employee's skill category — this calculator does not check that separately.<br>
      • PF wages = Gross − HRA (i.e. Basic+DA + all allowances except HRA), capped at the statutory wage ceiling of ₹15,000/month.<br>
      • ESIC applies only where Basic+DA is below ₹21,000/month; both employee and employer contributions stop above that.<br>
      • Professional Tax shown is for a standard month; Maharashtra charges an extra ₹100 in February for slabs above the exemption limit — use the <a href="#pt" style="color:var(--primary);font-weight:600">Professional Tax calculator</a> below for exact February figures.<br>
      • MLWF is a half-yearly contribution (₹25 EE / ₹75 ER in Dec &amp; Jun for this wage band), shown here as an averaged monthly provision; applicable only to employees below managerial level.<br>
      • Gratuity is a books provision — actually payable only after 5 years' continuous service (1 year for fixed-term employees under the new Labour Codes).<br>
      • These are indicative estimates for general awareness — <a href="contact.html" style="color:var(--primary);font-weight:600">contact LEAP</a> to get your exact CTC structure finalised.
    </div>
  `;
}

/* ---------- 2. EPF Split ---------- */
function calcEpfSplit() {
  const basicDA = parseFloat(document.getElementById('epf-basic').value) || 0;
  const employee = basicDA * 0.12;
  const epsWageCeiling = 15000;
  const epsBase = Math.min(basicDA, epsWageCeiling);
  const eps = epsBase * 0.0833;
  const employerEPF = (basicDA * 0.12) - eps;
  const edli = epsBase * 0.005;

  document.getElementById('epf-result').innerHTML = `
    <div class="calc-row"><span>Employee Contribution (12% of Basic+DA)</span><strong>${fmtINR(employee)}</strong></div>
    <div class="calc-row"><span>Employer → EPF (Provident Fund)</span><strong>${fmtINR(employerEPF)}</strong></div>
    <div class="calc-row"><span>Employer → EPS (Pension, capped at ₹15,000 wage)</span><strong>${fmtINR(eps)}</strong></div>
    <div class="calc-row"><span>Employer → EDLI (0.5%, capped at ₹15,000 wage)</span><strong>${fmtINR(edli)}</strong></div>
    <div class="calc-row calc-total"><span>Total PF Contribution (Employee + Employer)</span><strong>${fmtINR(employee + employerEPF + eps)}</strong></div>
    <p style="font-size:13px;color:var(--text-secondary);margin-top:10px">Note: Employer also pays PF admin charges of 0.5% of PF wages, subject to a ₹500/month minimum per establishment (not per employee).</p>
  `;
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

/* ---------- 4. Professional Tax (Maharashtra) ---------- */
function maharashtraPT(gross, female, month) {
  if (female) {
    if (gross <= 25000) return 0;
    return month === 'feb' ? 300 : 200;
  }
  if (gross <= 7500) return 0;
  if (gross <= 10000) return 175;
  return month === 'feb' ? 300 : 200;
}

function calcPT() {
  const gross = parseFloat(document.getElementById('pt-gross').value) || 0;
  const female = document.getElementById('pt-female').checked;
  const month = document.getElementById('pt-month').value;
  const pt = maharashtraPT(gross, female, month);

  document.getElementById('pt-result').innerHTML = `
    <div class="calc-row"><span>Monthly Professional Tax (Maharashtra)</span><strong>${fmtINR(pt)}</strong></div>
    <p style="font-size:13px;color:var(--text-secondary);margin-top:10px">Maharashtra slabs: Male — ₹0–7,500 Nil, ₹7,501–10,000 ₹175/month, above ₹10,000 ₹200/month (₹300 in February). Female — up to ₹25,000 Nil, above ₹25,000 ₹200/month (₹300 in February). For other states, see our full <a href="knowledge.html">Knowledge Hub PT reference tool</a>.</p>
  `;
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
  calcTakeHome(); calcEpfSplit(); calcEsicSplit(); calcPT();
  calcGratuity(); calcBonus(); calcMaternity(); calcHeatmap();
});
