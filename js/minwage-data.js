/* ============================================
   LEAP Business Solutions — Minimum Wages (PAN-India)

   Minimum Wages, unlike Professional Tax or LWF, apply in every state and UT
   (there is no "not applicable" state), so every entry below starts with the
   same placeholder shape and a `rates` object of nulls. A null rate means
   "not yet added to this Hub" — it is never shown or used as if it were zero
   or confirmed. This file is the single source both the Knowledge Hub page
   (knowledge.html) and the CTC calculator read from.

   Each rate is stored as { basic, vda } in rupees per month, matching how
   the notifications themselves state it (Basic + VDA = Total). Total per
   month and total per day (Total ÷ 26 working days, the usual convention)
   are derived, not stored, so there is only one number to keep correct.

   To add a state: fill in `updated` (date these figures were last verified),
   `wef` (the date the rates take effect), `source` (the notification
   reference), `notificationFile` + `notificationLabel` (a PDF under
   /assets/notifications/ and its button label, or leave both null if none is
   hosted yet), and the `rates`. If a state's rates differ by zone/area, set
   `hasZones: true`, list the zone names in `zones`, and make `rates` an
   object keyed by zone name, each holding the same four-category shape.
   ============================================ */
(function (root) {
  'use strict';

  var STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
    'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman & Nicobar', 'Chandigarh', 'Dadra, Nagar Haveli, Daman & Diu', 'Delhi',
    'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  /* Central sphere: the rates the central government notifies for scheduled
     employments it directly regulates (mines, railways, oilfields and the
     like), kept separate from the state list since it is not itself a state. */
  var CENTRAL_SPHERE = 'Central Sphere (Scheduled Employments)';

  var CATEGORIES = [
    { key: 'unskilled', label: 'Unskilled' },
    { key: 'semiskilled', label: 'Semi-Skilled' },
    { key: 'skilled', label: 'Skilled' },
    { key: 'highlyskilled', label: 'Highly Skilled' }
  ];

  var PER_DAY_DIVISOR = 26; /* standard working-days-per-month convention used in these notifications */

  function blankRates() {
    return { unskilled: null, semiskilled: null, skilled: null, highlyskilled: null };
  }
  function blankEntry() {
    return {
      updated: null, wef: null, source: null, notificationFile: null, notificationLabel: null,
      scheduleNote: null, hasZones: false, zones: null, rates: blankRates()
    };
  }

  var MIN_WAGE_DATA = {};
  STATES.concat([CENTRAL_SPHERE]).forEach(function (name) { MIN_WAGE_DATA[name] = blankEntry(); });

  /* Maharashtra — Shops & Establishments schedule only (the schedule relevant to
     LEAP's typical office/corporate clients; the notification below covers many
     other scheduled employments too, each with its own rate). VDA revision
     effective 1 July 2026. Basic and VDA were taken from a tabulated summary of
     this notification, not re-read cell-by-cell off the scan: the hosted PDF is
     a phone scan with no digital text layer, spans 17 pages and dozens of
     scheduled employments in Marathi, and misreading a hand-filled numeral on a
     figure used for compliance was too great a risk to take by eye. The
     official scan is linked below so this can be checked directly against the
     primary source. No Highly Skilled rate is notified separately for this
     schedule, so that category stays null rather than being estimated. */
  MIN_WAGE_DATA['Maharashtra'] = {
    updated: '10 Aug 2026',
    wef: '1 Jul 2026',
    source: 'Government of Maharashtra, Minimum Wages notification (VDA revision), Shops & Establishments schedule',
    notificationFile: '/assets/notifications/maharashtra-minimum-wages-shops-establishments-jul2026.pdf',
    notificationLabel: 'Download official notification (PDF)',
    scheduleNote: 'This notification covers multiple scheduled employments; the figures here are for the Shops & Establishments schedule only. Check the PDF directly for any other schedule.',
    hasZones: true,
    zones: ['Zone I', 'Zone II', 'Zone III'],
    rates: {
      'Zone I':   { unskilled: { basic: 10021, vda: 4134 }, semiskilled: { basic: 10856, vda: 4134 }, skilled: { basic: 11632, vda: 4134 }, highlyskilled: null },
      'Zone II':  { unskilled: { basic: 9425,  vda: 4134 }, semiskilled: { basic: 10260, vda: 4134 }, skilled: { basic: 11036, vda: 4134 }, highlyskilled: null },
      'Zone III': { unskilled: { basic: 8828,  vda: 4134 }, semiskilled: { basic: 9664,  vda: 4134 }, skilled: { basic: 10440, vda: 4134 }, highlyskilled: null }
    }
  };

  /* True once at least one rate has been filled in for the state, so the Hub
     and the CTC lookup can tell "not yet added" apart from "genuinely zero". */
  function hasAnyRate(entry) {
    if (!entry) return false;
    var pool = entry.hasZones && entry.zones ? entry.zones.map(function (z) { return entry.rates[z]; }) : [entry.rates];
    return pool.some(function (r) {
      return r && CATEGORIES.some(function (c) { return r[c.key] != null; });
    });
  }

  function cell(state, categoryKey, zone) {
    var entry = MIN_WAGE_DATA[state];
    if (!entry) return null;
    var bucket = entry.hasZones ? (zone ? entry.rates[zone] : null) : entry.rates;
    return bucket ? (bucket[categoryKey] || null) : null;
  }

  /* Total for a category (+ zone, for a zoned state) in rupees per month, or
     null if not on file / if a zoned state was asked for without a zone. */
  function rate(state, categoryKey, zone) {
    var c = cell(state, categoryKey, zone);
    return c ? c.basic + c.vda : null;
  }
  function perDay(state, categoryKey, zone) {
    var t = rate(state, categoryKey, zone);
    return t != null ? Math.round((t / PER_DAY_DIVISOR) * 100) / 100 : null;
  }

  root.MIN_WAGE_DATA = MIN_WAGE_DATA;
  root.MIN_WAGE_STATES = STATES;
  root.MIN_WAGE_CENTRAL_SPHERE = CENTRAL_SPHERE;
  root.MIN_WAGE_CATEGORIES = CATEGORIES;
  root.MIN_WAGE_PER_DAY_DIVISOR = PER_DAY_DIVISOR;
  root.minWageHasAnyRate = hasAnyRate;
  root.minWageCell = cell;
  root.minWageRate = rate;
  root.minWagePerDay = perDay;
})(typeof window !== 'undefined' ? window : this);
