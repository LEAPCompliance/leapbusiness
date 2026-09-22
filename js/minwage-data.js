/* ============================================
   LEAP Business Solutions — Minimum Wages (PAN-India)

   Minimum Wages, unlike Professional Tax or LWF, apply in every state and UT
   (there is no "not applicable" state), so every entry below starts with the
   same placeholder shape and a `rates` object of nulls. A null rate means
   "not yet added to this Hub" — it is never shown or used as if it were zero
   or confirmed. This file is the single source both the Knowledge Hub page
   (knowledge.html) and the CTC calculator read from.

   To add a state's rates: fill in `updated` (the date the figures were last
   verified against the notification), `source` (the notification reference),
   and the four `rates` values in rupees per month. If a state's rates differ
   by zone/area, set `hasZones: true`, list the zone names in `zones`, and
   change `rates` for that state to an object keyed by zone name, each holding
   the same four-category shape — the Hub page and the CTC lookup both check
   for this shape before falling back to the flat one.
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

  function blankRates() {
    return { unskilled: null, semiskilled: null, skilled: null, highlyskilled: null };
  }
  function blankEntry() {
    return { updated: null, source: null, hasZones: false, zones: null, rates: blankRates() };
  }

  var MIN_WAGE_DATA = {};
  STATES.concat([CENTRAL_SPHERE]).forEach(function (name) { MIN_WAGE_DATA[name] = blankEntry(); });

  /* Maharashtra — Shops & Establishments schedule only (the schedule relevant to
     LEAP's typical office/corporate clients). VDA revision effective 1 July 2026.
     Source: Maharashtra Government minimum wage notification for Shops &
     Establishments, as tabulated by the wage-tracking service the figures were
     supplied from, cross-checked against the client's copy of the Gazette PDF.
     The Gazette copy itself is a phone scan with no digital text layer and
     covers dozens of scheduled employments per page, so the individual cells
     were not re-read digit-by-digit off the scan — only the already-tabulated
     Shops & Establishments figures were used. No Highly Skilled rate is
     notified separately for this schedule, so that category stays null rather
     than being estimated. */
  MIN_WAGE_DATA['Maharashtra'] = {
    updated: '10 Aug 2026',
    source: 'Maharashtra Minimum Wages Notification, Shops & Establishments schedule, VDA effective 1 July 2026',
    hasZones: true,
    zones: ['Zone I', 'Zone II', 'Zone III'],
    rates: {
      'Zone I':   { unskilled: 14155, semiskilled: 14990, skilled: 15766, highlyskilled: null },
      'Zone II':  { unskilled: 13559, semiskilled: 14394, skilled: 15170, highlyskilled: null },
      'Zone III': { unskilled: 12962, semiskilled: 13798, skilled: 14574, highlyskilled: null }
    }
  };

  /* True once at least one rate has been filled in for the state, so the Hub
     and the CTC lookup can tell "not yet added" apart from "genuinely zero". */
  function hasAnyRate(entry) {
    if (!entry) return false;
    if (entry.hasZones && entry.zones) {
      return entry.zones.some(function (z) {
        var r = entry.rates[z];
        return r && CATEGORIES.some(function (c) { return r[c.key] != null; });
      });
    }
    return CATEGORIES.some(function (c) { return entry.rates[c.key] != null; });
  }

  /* rate(state, categoryKey, zone?) -> number | null. Looks in the zoned
     shape when the state has zones and a zone is given, else the flat shape. */
  function rate(state, categoryKey, zone) {
    var entry = MIN_WAGE_DATA[state];
    if (!entry) return null;
    if (entry.hasZones && zone && entry.rates[zone]) return entry.rates[zone][categoryKey] != null ? entry.rates[zone][categoryKey] : null;
    if (entry.hasZones) return null; // zoned state, no zone given: caller must ask
    return entry.rates[categoryKey] != null ? entry.rates[categoryKey] : null;
  }

  root.MIN_WAGE_DATA = MIN_WAGE_DATA;
  root.MIN_WAGE_STATES = STATES;
  root.MIN_WAGE_CENTRAL_SPHERE = CENTRAL_SPHERE;
  root.MIN_WAGE_CATEGORIES = CATEGORIES;
  root.minWageHasAnyRate = hasAnyRate;
  root.minWageRate = rate;
})(typeof window !== 'undefined' ? window : this);
