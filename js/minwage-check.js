/* =============================================
   Minimum Wages hub: Wage Check
   Reads MIN_WAGE_DATA (js/minwage-data.js). Shows nothing for a state
   until its rates have been verified and added there. The result appears
   only when Check is clicked, never as the person types.
   ============================================= */
(function () {
  'use strict';
  if (!window.MIN_WAGE_DATA) return;

  var D = window.MIN_WAGE_DATA;
  var CATS = window.MIN_WAGE_CATEGORIES || [];
  var elState = document.getElementById('mwcState');
  var elZoneWrap = document.getElementById('mwcZoneWrap');
  var elZone = document.getElementById('mwcZone');
  var elCats = document.getElementById('mwcCats');
  var elWage = document.getElementById('mwcWage');
  var elGo = document.getElementById('mwcGo');
  var elNote = document.getElementById('mwcNote');
  var elRes = document.getElementById('mwcResult');
  if (!elState) return;

  var cat = null;

  function money(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function populated(name) { return window.minWageHasAnyRate && window.minWageHasAnyRate(D[name]); }
  function track() { try { if (typeof gtag === 'function') gtag('event', 'calculate_click', { tool_name: 'minimum-wages' }); } catch (e) {} }

  /* ---- state list: verified first, then the rest */
  function buildStates() {
    var names = (window.MIN_WAGE_STATES || []).slice().sort();
    if (window.MIN_WAGE_CENTRAL_SPHERE) names.push(window.MIN_WAGE_CENTRAL_SPHERE);
    var ver = names.filter(populated), rest = names.filter(function (n) { return !populated(n); });
    var html = '<option value="">Choose a state</option>';
    if (ver.length) html += '<optgroup label="Verified by LEAP">' + ver.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; }).join('') + '</optgroup>';
    if (rest.length) html += '<optgroup label="Being verified">' + rest.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; }).join('') + '</optgroup>';
    elState.innerHTML = html;
  }

  function currentZone() { return elZoneWrap.hidden ? null : elZone.value; }

  function buildCats() {
    var st = elState.value, entry = D[st], zone = currentZone();
    elCats.innerHTML = '';
    cat = null;
    if (!st || !populated(st)) return;
    CATS.forEach(function (c) {
      var has = !!(window.minWageCell && window.minWageCell(st, c.key, zone));
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'mwc-chip'; b.textContent = c.label;
      b.setAttribute('aria-pressed', 'false'); b.dataset.key = c.key;
      if (!has) { b.disabled = true; b.title = 'Not notified separately for this state'; }
      b.addEventListener('click', function () {
        cat = c.key;
        [].forEach.call(elCats.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        hideResult(); sync();
      });
      elCats.appendChild(b);
    });
  }

  function sync() {
    var st = elState.value;
    var ok = st && populated(st) && cat && (!elZoneWrap.hidden ? !!elZone.value : true) && parseFloat(elWage.value) >= 0 && elWage.value !== '';
    elGo.disabled = !ok;
  }

  function hideResult() { elRes.hidden = true; elRes.innerHTML = ''; }

  function onState() {
    hideResult();
    var st = elState.value, entry = D[st];
    elNote.hidden = true;
    elZoneWrap.hidden = true;
    if (st && !populated(st)) {
      elNote.hidden = false;
      elNote.innerHTML = '<strong>' + esc(st) + ' is in our verification queue.</strong> We publish a state only after checking it against the government notification, so we are not showing figures for it yet. Need it today? <a href="https://wa.me/917977213501?text=' + encodeURIComponent('Hi LEAP, I need the current minimum wage for ' + st + '.') + '" target="_blank" rel="noopener">Ask us on WhatsApp</a> and we will confirm it from the notification.';
    }
    if (st && populated(st) && entry.hasZones && entry.zones) {
      elZoneWrap.hidden = false;
      elZone.innerHTML = '<option value="">Choose a zone</option>' + entry.zones.map(function (z) { return '<option>' + esc(z) + '</option>'; }).join('');
    }
    buildCats(); sync();
  }

  function run() {
    var st = elState.value, entry = D[st], zone = currentZone();
    var wage = parseFloat(elWage.value);
    var c = window.minWageCell(st, cat, zone);
    if (!c) return;
    track();
    var total = window.minWageRate(st, cat, zone);
    var hra = window.minWageHRA(st, cat, zone);
    var perDay = window.minWagePerDay(st, cat, zone);
    var diff = wage - total, ok = diff >= 0;
    var label = CATS.filter(function (x) { return x.key === cat; })[0].label;
    var scope = esc(st) + (zone ? ', ' + esc(zone) : '') + ', ' + label;
    var max = Math.max(wage, total) * 1.12 || 1;
    var fillPct = Math.max(2, Math.min(100, wage / max * 100)), markPct = Math.min(100, total / max * 100);

    var tiles = '<div class="mwc-tile"><span>Basic</span><b>' + money(c.basic) + '</b></div>' +
      '<div class="mwc-tile"><span>VDA</span><b>' + money(c.vda) + '</b></div>' +
      (hra > 0 ? '<div class="mwc-tile"><span>HRA</span><b>' + money(hra) + '</b></div>' : '') +
      '<div class="mwc-tile total"><span>Minimum / month</span><b>' + money(total) + '</b></div>' +
      '<div class="mwc-tile"><span>Per day</span><b>₹' + perDay.toFixed(2) + '</b></div>';

    var src = [];
    if (entry.wef) src.push('Effective ' + esc(entry.wef));
    if (entry.updated) src.push('verified by LEAP on ' + esc(entry.updated));
    var srcHtml = '<div class="mwc-src">' + src.join(', ') + '. ' + (entry.source ? esc(entry.source) + '. ' : '') +
      (entry.notificationFile ? '<a href="' + entry.notificationFile + '" target="_blank" rel="noopener">Open the official notification</a>. ' : '') +
      'Compared on monthly Basic + DA' + (hra > 0 ? ' with the mandatory HRA included' : '') + '. Per day assumes ' + (window.MIN_WAGE_PER_DAY_DIVISOR || 26) + ' working days.</div>';

    var headline = ok
      ? (diff === 0 ? 'Exactly at the minimum' : money(diff) + ' above the minimum')
      : money(-diff) + ' below the minimum';
    var sub = ok ? 'You are compliant for ' + scope + '.' : 'Raise it by at least ' + money(-diff) + ' a month for ' + scope + '.';
    var icon = ok ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.500l4.500 4.500L19 7.500"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

    elRes.className = 'mwc-result ' + (ok ? 'ok' : 'bad');
    elRes.hidden = false;
    elRes.innerHTML =
      '<div class="mwc-verdict"><div class="mwc-badge">' + icon + '</div><div><div class="mwc-big">' + headline + '</div><div class="mwc-small">' + sub + '</div></div></div>' +
      '<div class="mwc-meter" aria-hidden="true"><div class="fill" style="width:0"></div><div class="mark" style="left:calc(' + markPct.toFixed(1) + '% - 1px)"></div></div>' +
      '<div class="mwc-scale"><span>₹0</span><span>You pay ' + money(wage) + '</span><span>Minimum ' + money(total) + '</span></div>' +
      '<div class="mwc-break">' + tiles + '</div>' + srcHtml +
      '<div class="mwc-actions"><button type="button" id="mwcCopy">Copy result</button><button type="button" id="mwcTable">See the full table</button><a href="/calculators/ctc/">Test this in the CTC calculator</a></div>';

    requestAnimationFrame(function () { var f = elRes.querySelector('.fill'); if (f) f.style.width = fillPct.toFixed(1) + '%'; });

    var text = 'Minimum wage check, ' + st + (zone ? ', ' + zone : '') + ', ' + label + ': minimum ' + money(total) + ' a month (Basic + VDA' + (hra > 0 ? ' + HRA' : '') + '). Paying ' + money(wage) + ': ' + (ok ? (diff === 0 ? 'at the minimum' : money(diff) + ' above') : money(-diff) + ' below') + '. Source: ' + (entry.source || 'state notification') + (entry.wef ? ', effective ' + entry.wef : '') + '. Checked with LEAP, www.leapbusiness.in/knowledge/minimum-wages/';
    document.getElementById('mwcCopy').addEventListener('click', function () {
      var b = this;
      function done() { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy result'; }, 2000); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { window.prompt('Copy this', text); });
      else window.prompt('Copy this', text);
    });
    document.getElementById('mwcTable').addEventListener('click', function () { if (typeof mwSelectState === 'function') mwSelectState(st); });
  }

  buildStates();
  elState.addEventListener('change', onState);
  elZone.addEventListener('change', function () { hideResult(); buildCats(); sync(); });
  elWage.addEventListener('input', function () { hideResult(); sync(); });
  elWage.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !elGo.disabled) run(); });
  elGo.addEventListener('click', run);
  sync();
})();
