/* ============================================
   LEAP Business Solutions – Compliance & Payroll Calculators
   Indicative estimates only. Not legal/financial advice.
   ============================================ */

function fmtINR(n) {
  if (isNaN(n)) return '₹0';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

/* ---------- 1. CTC <-> Take-Home ---------- */
function calcTakeHome() {
  const gross = parseFloat(document.getElementById('th-gross').value) || 0;
  const basicPct = parseFloat(document.getElementById('th-basicpct').value) || 50;
  const female = document.getElementById('th-female').checked;
  const month = document.getElementById('th-month').value;

  const basic = gross * basicPct / 100;
  const pfEmp = basic * 0.12;
  const esicApplicable = gross <= 21000;
  const esicEmp = esicApplicable ? gross * 0.0075 : 0;
  const pt = maharashtraPT(gross, female, month);
  const netTakeHome = gross - pfEmp - esicEmp - pt;

  const pfEmployer = basic * 0.12;
  const esicEmployer = esicApplicable ? gross * 0.0325 : 0;
  const estCTC = gross + pfEmployer + esicEmployer;

  document.getElementById('th-result').innerHTML = `
    <div class="calc-row"><span>Basic + DA (${basicPct}% of gross)</span><strong>${fmtINR(basic)}</strong></div>
    <div class="calc-row"><span>Employee PF (12%)</span><strong>- ${fmtINR(pfEmp)}</strong></div>
    <div class="calc-row"><span>Employee ESIC ${esicApplicable ? '(0.75%)' : '(not applicable, gross > ₹21,000)'}</span><strong>- ${fmtINR(esicEmp)}</strong></div>
    <div class="calc-row"><span>Professional Tax (Maharashtra)</span><strong>- ${fmtINR(pt)}</strong></div>
    <div class="calc-row calc-total"><span>Estimated Net Take-Home</span><strong>${fmtINR(netTakeHome)}</strong></div>
    <div class="calc-row" style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--border)"><span>Employer PF + ESIC contribution</span><strong>${fmtINR(pfEmployer + esicEmployer)}</strong></div>
    <div class="calc-row"><span>Estimated Employer Cost (CTC)</span><strong>${fmtINR(estCTC)}</strong></div>
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
  if (female && gross < 15000) return 0;
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
    <p style="font-size:13px;color:var(--text-secondary);margin-top:10px">Maharashtra slabs: ₹0–7,500 = Nil (female employees below ₹15,000 = Nil), ₹7,501–10,000 = ₹175/month, above ₹10,000 = ₹200/month (₹300 in February). For other states, see our full <a href="knowledge.html">Knowledge Hub PT reference tool</a>.</p>
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
