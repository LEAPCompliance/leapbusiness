/* =============================================
   Minimum Wages hub (/knowledge/minimum-wages/)
   State and industry rates are loaded from /data/minwages/ one state at a
   time. Only groups that passed LEAP's arithmetic tie-out are published
   there; anything else stays "being verified". The Wage Check shows its
   result only when Check is clicked, never as the person types.
   ============================================= */
(function () {
  'use strict';

  var BASE = '/data/minwages/';
  var DAYS = 26;
  var ALL = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
    'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman & Nicobar',
    'Chandigarh', 'Dadra, Nagar Haveli, Daman & Diu', 'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
    'Central Sphere (Scheduled Employments)'];
  var IDX = null;
  var cache = {};

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function money(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
  function money2(n) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? parseInt(m[3], 10) + ' ' + MONTHS[parseInt(m[2], 10) - 1] + ' ' + m[1] : (iso || '');
  }
  function ga(name, params) { try { if (typeof gtag === 'function') gtag('event', name, params || {}); } catch (e) {} }

  function loadIndex() {
    return fetch(BASE + 'index.json').then(function (r) { return r.json(); }).then(function (j) { IDX = j; return j; });
  }
  function loadState(name) {
    if (!IDX.states[name]) return Promise.resolve(null);
    if (!cache[name]) cache[name] = fetch(BASE + IDX.states[name].slug + '.json').then(function (r) { return r.json(); });
    return cache[name];
  }
  function isLive(name) { return !!(IDX && IDX.states[name]); }

  /* ---------------------------------------------------------- grid + board */
  function buildGrid() {
    var grid = $('mwStateGrid');
    var names = ALL.slice(0, -1).sort().concat(ALL.slice(-1));
    var live = 0;
    grid.innerHTML = '';
    names.forEach(function (name) {
      var on = isLive(name);
      if (on) live++;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'state-btn mw-state-btn' + (on ? ' is-verified' : ' na');
      b.dataset.name = name;
      var s = IDX.states[name];
      b.textContent = name + (on ? '' : '  ·  verifying');
      if (on && s.live < s.all) b.title = s.live + ' of ' + s.all + ' industries live';
      b.addEventListener('click', function () { selectState(name); });
      grid.appendChild(b);
    });
    var chip = $('mwCoverageChip');
    if (chip) chip.textContent = live + ' of ' + names.length + ' live';
    var bt = $('mwBoardTitle'), bb = $('mwBoardBar'), bn = $('mwBoardNote');
    if (bt) bt.textContent = live + ' of ' + names.length + ' states and UTs live';
    if (bb) setTimeout(function () { bb.style.width = Math.max(3, Math.round(live / names.length * 100)) + '%'; }, 60);
    var partial = Object.keys(IDX.states).filter(function (k) { return IDX.states[k].live < IDX.states[k].all; }).length;
    if (bn) bn.textContent = (partial ? partial + ' of them are live for some industries only, and the rest of those industries are still being checked. ' : '') + 'Rates are shown with their effective-from date and stay valid until the state revises them.';
  }

  window.mwFilterStates = function (q) {
    q = (q || '').toLowerCase();
    [].forEach.call(document.querySelectorAll('.mw-state-btn'), function (btn) {
      btn.style.display = btn.dataset.name.toLowerCase().indexOf(q) > -1 ? '' : 'none';
    });
  };

  /* ---------------------------------------------------------- detail panel */
  function rowHtml(r, showHra) {
    return '<tr><td>' + esc(r.l) + '</td><td>' + (r.b != null ? money(r.b) : '–') + '</td><td>' + (r.v != null ? money(r.v) : '–') + '</td>' +
      (showHra ? '<td>' + (r.h ? money(r.h) : '–') + '</td>' : '') +
      '<td>' + money2(r.d) + (r.xd ? '*' : '') + '</td><td class="mw-total">' + money(r.t) + '</td></tr>';
  }

  function renderIndustry(state, data, idx) {
    var ind = data.industries[idx];
    var showHra = ind.rows.some(function (r) { return r.h; });
    var meta = '<div class="meta-grid" style="margin-bottom:16px">' +
      '<div class="meta-tile"><div class="meta-lbl">Effective from</div><div class="meta-val" style="font-weight:600">' + esc(fmtDate(ind.wef) || 'See notification') + '</div></div>' +
      '<div class="meta-tile"><div class="meta-lbl">Valid as on</div><div class="meta-val" style="font-weight:600">' + esc(fmtDate(data.asOf)) + '</div></div>' +
      '<div class="meta-tile" style="grid-column:1/-1"><div class="meta-lbl">' + (ind.official ? 'Source' : 'Basis') + '</div><div class="meta-val" style="font-weight:400">' +
      (ind.official ? esc(ind.source) : 'Latest revision on file. A minimum wage stays in force until the state revises it, however long ago it took effect.') + '</div></div></div>';
    var head = '<tr><th>Category, zone or designation</th><th>Basic /month</th><th>VDA /month</th>' + (showHra ? '<th>HRA /month</th>' : '') + '<th>Total /day</th><th>Total /month' + (showHra ? ' (incl. HRA)' : '') + '</th></tr>';
    var filter = ind.rows.length > 15 ? '<input type="search" class="mw-tfilter" id="mwTFilter" placeholder="Filter these ' + ind.rows.length + ' rows">' : '';
    var derived = ind.rows.some(function (r) { return r.xd; });
    var html = meta +
      (ind.note ? '<div class="slab-note">📌 ' + esc(ind.note) + '</div>' : '') +
      filter +
      '<div style="overflow-x:auto"><table class="slab-table mw-table"><thead>' + head + '</thead><tbody id="mwTBody">' + ind.rows.map(function (r) { return rowHtml(r, showHra); }).join('') + '</tbody></table></div>' +
      (showHra && ind.hraNote ? '<p class="mw-fn">🏠 ' + esc(ind.hraNote) + '</p>' : '') +
      (derived ? '<p class="mw-fn">* Per-day figures marked with an asterisk are worked out as the monthly total ÷ ' + DAYS + ' working days, where the notification does not state one.</p>' : '') +
      (ind.file ? '<div style="margin-top:14px;text-align:center"><a href="' + esc(ind.file) + '" class="btn btn-outline-dark" download>📄 ' + esc(ind.fileLabel || 'Download the official notification') + '</a></div>' : '');
    $('mwIndBody').innerHTML = html;
    var f = $('mwTFilter');
    if (f) f.addEventListener('input', function () {
      var q = f.value.toLowerCase();
      [].forEach.call($('mwTBody').rows, function (tr) { tr.style.display = tr.cells[0].textContent.toLowerCase().indexOf(q) > -1 ? '' : 'none'; });
    });
  }

  function selectState(name, noScroll) {
    [].forEach.call(document.querySelectorAll('.mw-state-btn'), function (b) { b.classList.toggle('active', b.dataset.name === name); });
    var panel = $('mwDetailPanel');
    if (!isLive(name)) {
      panel.innerHTML = '<div class="detail-panel"><div class="dp-header"><div class="dp-title">' + esc(name) + '</div><span class="badge-mode" style="background:#fffbeb;color:#92400e">🔧 Being verified</span></div>' +
        '<p style="font-size:14px;color:var(--text-mid);line-height:1.6">We publish a state only after its figures have passed our checks, and <strong>' + esc(name) + '</strong> is still in that queue. Nothing is shown until then.</p>' +
        '<div class="mw-ask">💼 <strong>Need this state’s minimum wage now?</strong> <a href="https://wa.me/917977213501?text=' + encodeURIComponent('Hi LEAP, I need the current minimum wage for ' + name + '.') + '" target="_blank" rel="noopener">Ask us on WhatsApp</a> and we will confirm it from the notification.</div></div>';
      if (!noScroll) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    panel.innerHTML = '<div class="detail-panel"><p style="color:var(--text-mid)">Loading ' + esc(name) + '...</p></div>';
    loadState(name).then(function (data) {
      var s = IDX.states[name];
      var partial = s.live < s.all;
      var opts = data.industries.map(function (i, k) { return '<option value="' + k + '">' + esc(i.name) + '</option>'; }).join('');
      panel.innerHTML = '<div class="detail-panel">' +
        '<div class="dp-header"><div class="dp-title">' + esc(name) + '</div><div class="dp-badges"><span class="badge-applicable">✓ Verified by LEAP</span>' +
        (partial ? ' <span class="badge-mode" style="background:#fffbeb;color:#92400e">' + s.live + ' of ' + s.all + ' industries live</span>' : '') + '</div></div>' +
        '<div class="mw-indsel"><label for="mwInd">Industry or scheduled employment</label><select id="mwInd">' + opts + '</select></div>' +
        '<div id="mwIndBody"></div>' +
        (partial ? '<p class="mw-fn">The other industries for this state are still being checked and are not shown.</p>' : '') +
        '<p class="mw-fn">Minimum wages vary by scheduled employment and area. Use the industry that matches the establishment, and confirm against the notification before relying on a figure.</p>' +
        '<div class="mw-ask">💼 <strong>Need help checking your salary structure against this?</strong> <a href="https://wa.me/917977213501?text=' + encodeURIComponent('Hi LEAP, please check our salary structure against the minimum wage for ' + name + '.') + '" target="_blank" rel="noopener">Talk to us on WhatsApp</a></div></div>';
      $('mwInd').addEventListener('change', function () { renderIndustry(name, data, parseInt(this.value, 10)); });
      renderIndustry(name, data, 0);
      if (!noScroll) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      ga('state_select', { tool_name: 'minimum-wages', state_name: name });
    });
  }
  window.mwSelectState = selectState;

  /* ---------------------------------------------------------- wage check */
  var elState, elIndWrap, elInd, elClsWrap, elCls, elClsFilter, elWage, elGo, elNote, elRes;
  var cur = null; /* loaded state data */

  function buildCheckStates() {
    var names = ALL.slice(0, -1).sort().concat(ALL.slice(-1));
    var ver = names.filter(isLive), rest = names.filter(function (n) { return !isLive(n); });
    var h = '<option value="">Choose a state</option>';
    h += '<optgroup label="Verified by LEAP">' + ver.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</optgroup>';
    if (rest.length) h += '<optgroup label="Being verified">' + rest.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</optgroup>';
    elState.innerHTML = h;
  }
  function hideResult() { elRes.hidden = true; elRes.innerHTML = ''; }
  function syncGo() {
    var ok = cur && elInd.value !== '' && elCls.value !== '' && elWage.value !== '' && parseFloat(elWage.value) >= 0;
    elGo.disabled = !ok;
  }
  function fillClasses() {
    var ind = cur.industries[parseInt(elInd.value, 10)];
    var q = (elClsFilter.value || '').toLowerCase();
    var opts = ['<option value="">Choose a category</option>'];
    ind.rows.forEach(function (r, k) { if (!q || r.l.toLowerCase().indexOf(q) > -1) opts.push('<option value="' + k + '">' + esc(r.l) + '</option>'); });
    elCls.innerHTML = opts.join('');
    elClsFilter.hidden = ind.rows.length <= 12;
    if (ind.rows.length === 1 || (opts.length === 2)) { elCls.value = opts.length === 2 ? elCls.options[1].value : elCls.value; }
    syncGo();
  }
  function onState() {
    hideResult();
    var st = elState.value;
    elNote.hidden = true; elIndWrap.hidden = true; elClsWrap.hidden = true; cur = null; elClsFilter.value = '';
    if (!st) { syncGo(); return; }
    if (!isLive(st)) {
      elNote.hidden = false;
      elNote.innerHTML = '<strong>' + esc(st) + ' is in our verification queue.</strong> We publish a state only after its figures pass our checks, so nothing is shown for it yet. Need it today? <a href="https://wa.me/917977213501?text=' + encodeURIComponent('Hi LEAP, I need the current minimum wage for ' + st + '.') + '" target="_blank" rel="noopener">Ask us on WhatsApp</a>.';
      syncGo(); return;
    }
    loadState(st).then(function (d) {
      cur = d;
      elInd.innerHTML = d.industries.map(function (i, k) { return '<option value="' + k + '">' + esc(i.name) + '</option>'; }).join('');
      elIndWrap.hidden = false; elClsWrap.hidden = false;
      fillClasses();
    });
  }

  function runCheck() {
    var ind = cur.industries[parseInt(elInd.value, 10)];
    var row = ind.rows[parseInt(elCls.value, 10)];
    var wage = parseFloat(elWage.value);
    if (!row) return;
    ga('calculate_click', { tool_name: 'minimum-wages' });
    var total = row.t, diff = wage - total, ok = diff >= 0;
    var scope = esc(cur.state) + ', ' + esc(ind.name) + ', ' + esc(row.l);
    var max = Math.max(wage, total) * 1.12 || 1;
    var fillPct = Math.max(2, Math.min(100, wage / max * 100)), markPct = Math.min(100, total / max * 100);
    var tiles = (row.b != null ? '<div class="mwc-tile"><span>Basic</span><b>' + money(row.b) + '</b></div>' : '') +
      (row.v != null ? '<div class="mwc-tile"><span>VDA</span><b>' + money(row.v) + '</b></div>' : '') +
      (row.h ? '<div class="mwc-tile"><span>HRA</span><b>' + money(row.h) + '</b></div>' : '') +
      '<div class="mwc-tile total"><span>Minimum / month</span><b>' + money(total) + '</b></div>' +
      '<div class="mwc-tile"><span>Per day</span><b>' + money2(row.d) + (row.xd ? '*' : '') + '</b></div>';
    var src = '<div class="mwc-src">Effective from ' + esc(fmtDate(ind.wef) || 'the date in the notification') + ', valid as on ' + esc(fmtDate(cur.asOf)) + '. ' +
      (ind.official ? esc(ind.source) + '. ' : 'Latest revision on file; it stays in force until the state revises it. ') +
      (ind.file ? '<a href="' + esc(ind.file) + '" target="_blank" rel="noopener">Open the official notification</a>. ' : '') +
      'Compared on monthly Basic + DA' + (row.h ? ' with the mandatory HRA included' : '') + (row.xd ? '. * Per day is the monthly total ÷ ' + DAYS + ' working days' : '') + '. Check the notification for your exact scheduled employment and area.</div>';
    var headline = ok ? (diff === 0 ? 'Exactly at the minimum' : money(diff) + ' above the minimum') : money(-diff) + ' below the minimum';
    var sub = ok ? 'You are compliant for ' + scope + '.' : 'Raise it by at least ' + money(-diff) + ' a month for ' + scope + '.';
    var icon = ok ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.500l4.500 4.500L19 7.500"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    elRes.className = 'mwc-result ' + (ok ? 'ok' : 'bad');
    elRes.hidden = false;
    elRes.innerHTML =
      '<div class="mwc-verdict"><div class="mwc-badge">' + icon + '</div><div><div class="mwc-big">' + headline + '</div><div class="mwc-small">' + sub + '</div></div></div>' +
      '<div class="mwc-meter" aria-hidden="true"><div class="fill" style="width:0"></div><div class="mark" style="left:calc(' + markPct.toFixed(1) + '% - 1px)"></div></div>' +
      '<div class="mwc-scale"><span>₹0</span><span>You pay ' + money(wage) + '</span><span>Minimum ' + money(total) + '</span></div>' +
      '<div class="mwc-break">' + tiles + '</div>' + src +
      '<div class="mwc-actions"><button type="button" id="mwcCopy">Copy result</button><button type="button" id="mwcTable">See the full table</button></div>';
    requestAnimationFrame(function () { var f = elRes.querySelector('.fill'); if (f) f.style.width = fillPct.toFixed(1) + '%'; });
    var text = 'Minimum wage check, ' + cur.state + ', ' + ind.name + ', ' + row.l + ': minimum ' + money(total) + ' a month' + (row.h ? ' (incl. mandatory HRA)' : '') + '. Paying ' + money(wage) + ': ' + (ok ? (diff === 0 ? 'at the minimum' : money(diff) + ' above') : money(-diff) + ' below') + '. Effective from ' + (fmtDate(ind.wef) || 'the notification date') + '. Checked with LEAP, www.leapbusiness.in/knowledge/minimum-wages/';
    $('mwcCopy').addEventListener('click', function () {
      var b = this;
      function done() { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy result'; }, 2000); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { window.prompt('Copy this', text); });
      else window.prompt('Copy this', text);
    });
    $('mwcTable').addEventListener('click', function () { selectState(cur.state); });
  }

  function initCheck() {
    elState = $('mwcState'); elIndWrap = $('mwcIndWrap'); elInd = $('mwcInd'); elClsWrap = $('mwcClsWrap'); elCls = $('mwcCls');
    elClsFilter = $('mwcClsFilter'); elWage = $('mwcWage'); elGo = $('mwcGo'); elNote = $('mwcNote'); elRes = $('mwcResult');
    if (!elState) return;
    buildCheckStates();
    elState.addEventListener('change', onState);
    elInd.addEventListener('change', function () { hideResult(); elClsFilter.value = ''; fillClasses(); });
    elClsFilter.addEventListener('input', function () { hideResult(); fillClasses(); });
    elCls.addEventListener('change', function () { hideResult(); syncGo(); });
    elWage.addEventListener('input', function () { hideResult(); syncGo(); });
    elWage.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !elGo.disabled) runCheck(); });
    elGo.addEventListener('click', runCheck);
    syncGo();
  }

  loadIndex().then(function () {
    buildGrid();
    initCheck();
    selectState('Maharashtra', true);
  }).catch(function () {
    var g = $('mwStateGrid');
    if (g) g.innerHTML = '<p style="color:var(--text-mid)">The rates could not be loaded. Please refresh the page, or contact us.</p>';
  });
})();
