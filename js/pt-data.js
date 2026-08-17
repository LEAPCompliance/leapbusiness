/* LEAP Business Solutions - shared Professional Tax reference data.
   Single source of truth for the Knowledge Hub table and the Tools calculator.
   `calc` holds machine-computable slabs; amounts are in the unit given by `basis`. */

const PT_DATA = {
 "Kerala": {
  "applicable": true,
  "remittance": "Manual",
  "returnMode": "Manual",
  "rc": "Not Applicable",
  "ec": "Not Applicable",
  "empPeriodicity": "Half-Yearly",
  "empMode": "Branch wise",
  "empDue": "31st Aug & Last day of Feb",
  "returnDue": "—",
  "employerAmt": "₹1,250/- per branch",
  "employerDue": "30th Sep & 31st Mar",
  "slabNote": "Half-yearly income based slabs",
  "slabs": [
   [
    "1",
    "Up to ₹11,999",
    "Nil"
   ],
   [
    "2",
    "₹12,000 – ₹17,999",
    "₹120"
   ],
   [
    "3",
    "₹18,000 – ₹29,999",
    "₹180"
   ],
   [
    "4",
    "₹30,000 – ₹44,999",
    "₹300"
   ],
   [
    "5",
    "₹45,000 – ₹59,999",
    "₹450"
   ],
   [
    "6",
    "₹60,000 – ₹74,999",
    "₹600"
   ],
   [
    "7",
    "₹75,000 – ₹99,999",
    "₹750"
   ],
   [
    "8",
    "₹1,00,000 – ₹1,24,999",
    "₹1,000"
   ],
   [
    "9",
    "Above ₹1,25,000",
    "₹1,250"
   ]
  ],
  "slabCols": [
   "S.No",
   "Half-Yearly Income",
   "PT (₹)"
  ],
  "calc": {
   "basis": "halfyearly",
   "slabs": [
    [
     11999,
     0
    ],
    [
     17999,
     120
    ],
    [
     29999,
     180
    ],
    [
     44999,
     300
    ],
    [
     59999,
     450
    ],
    [
     74999,
     600
    ],
    [
     99999,
     750
    ],
    [
     124999,
     1000
    ],
    [
     null,
     1250
    ]
   ],
   "act": "Kerala Municipality Act, 1994 (Section 245) read with the Kerala Panchayat Raj Act, 1994."
  }
 },
 "Andhra Pradesh": {
  "applicable": true,
  "remittance": "Online",
  "returnMode": "Online",
  "rc": "Applicable (Location wise)",
  "ec": "Applicable (Location wise)",
  "empPeriodicity": "Monthly",
  "empMode": "Location wise",
  "empDue": "10th of every month",
  "returnDue": "Monthly – 10th",
  "employerAmt": "₹2,500/- per branch",
  "employerDue": "30th June",
  "slabNote": "Monthly income slabs",
  "slabs": [
   [
    "1",
    "Up to ₹15,000",
    "Nil"
   ],
   [
    "2",
    "₹15,001 – ₹20,000",
    "₹150"
   ],
   [
    "3",
    "Above ₹20,000",
    "₹200"
   ]
  ],
  "slabCols": [
   "S.No",
   "Monthly Income",
   "PT (₹)"
  ],
  "calc": {
   "basis": "monthly",
   "slabs": [
    [
     15000,
     0
    ],
    [
     20000,
     150
    ],
    [
     null,
     200
    ]
   ],
   "act": "Andhra Pradesh Tax on Professions, Trades, Callings and Employments Act, 1987."
  }
 },
 "Karnataka": {
  "applicable": true,
  "remittance": "Online",
  "returnMode": "Online",
  "rc": "Applicable (Centrally – Bangalore)",
  "ec": "Applicable (Centrally – Bangalore)",
  "empPeriodicity": "Monthly",
  "empMode": "Centrally",
  "empDue": "20th of every month",
  "returnDue": "Monthly – 20th | Annually – 30th April",
  "employerAmt": "₹2,500/- per branch",
  "employerDue": "30th April",
  "slabNote": "Monthly income slabs; February differs for salary ₹25,000 & above",
  "slabs": [
   [
    "1",
    "Up to ₹24,999",
    "Nil"
   ],
   [
    "2",
    "₹25,000 & above (except Feb)",
    "₹200"
   ],
   [
    "3",
    "₹25,000 & above — February",
    "₹300"
   ]
  ],
  "slabCols": [
   "S.No",
   "Monthly Income",
   "PT (₹)"
  ],
  "calc": {
   "basis": "monthly",
   "slabs": [
    [
     24999,
     0,
     null
    ],
    [
     null,
     200,
     300
    ]
   ],
   "act": "Karnataka Tax on Professions, Trades, Callings and Employments Act, 1976. Threshold raised to ₹25,000/month by the Karnataka Taxation Laws (Amendment) Act."
  }
 },
 "Telangana": {
  "applicable": true,
  "remittance": "Online",
  "returnMode": "Online",
  "rc": "Applicable (Location wise)",
  "ec": "Applicable (Location wise)",
  "empPeriodicity": "Monthly",
  "empMode": "Location wise",
  "empDue": "10th of every month",
  "returnDue": "Monthly – 10th",
  "employerAmt": "₹2,500/- per location + ₹2,500/- per director",
  "employerDue": "30th June",
  "slabNote": "Monthly income slabs",
  "slabs": [
   [
    "1",
    "Up to ₹15,000",
    "Nil"
   ],
   [
    "2",
    "₹15,001 – ₹20,000",
    "₹150"
   ],
   [
    "3",
    "Above ₹20,000",
    "₹200"
   ]
  ],
  "slabCols": [
   "S.No",
   "Monthly Income",
   "PT (₹)"
  ],
  "calc": {
   "basis": "monthly",
   "slabs": [
    [
     15000,
     0
    ],
    [
     20000,
     150
    ],
    [
     null,
     200
    ]
   ],
   "act": "Telangana Tax on Professions, Trades, Callings and Employments Act, 1987."
  }
 },
 "Maharashtra": {
  "applicable": true,
  "remittance": "Online",
  "returnMode": "Online",
  "rc": "Applicable (Circle wise)",
  "ec": "Applicable (Circle wise)",
  "empPeriodicity": "Monthly",
  "empMode": "Centrally",
  "empDue": "Last day of every month | Annually – 31st Mar",
  "returnDue": "Last day of every month | Annually – 31st Mar",
  "employerAmt": "₹2,500/- centrally for all branches",
  "employerDue": "31st March",
  "slabNote": "Revised: female exemption threshold is now ₹25,000/month (previously ₹15,000)",
  "slabs": [
   [
    "1",
    "Male: ₹0 – ₹7,500",
    "Nil"
   ],
   [
    "2",
    "Male: ₹7,501 – ₹10,000",
    "₹175"
   ],
   [
    "3",
    "Male: Above ₹10,000 (except Feb)",
    "₹200"
   ],
   [
    "4",
    "Male: Above ₹10,000 — February",
    "₹300"
   ],
   [
    "5",
    "Female: Up to ₹25,000",
    "Nil"
   ],
   [
    "6",
    "Female: Above ₹25,000 (except Feb)",
    "₹200"
   ],
   [
    "7",
    "Female: Above ₹25,000 — February",
    "₹300"
   ]
  ],
  "slabCols": [
   "S.No",
   "Monthly Income",
   "PT (₹)"
  ],
  "calc": {
   "basis": "monthly",
   "gender": true,
   "slabsMale": [
    [
     7500,
     0,
     null
    ],
    [
     10000,
     175,
     null
    ],
    [
     null,
     200,
     300
    ]
   ],
   "slabsFemale": [
    [
     25000,
     0,
     null
    ],
    [
     null,
     200,
     300
    ]
   ],
   "act": "Maharashtra State Tax on Professions, Trades, Callings and Employments Act, 1975. Female exemption threshold raised to ₹25,000/month w.e.f. 01.04.2023."
  }
 },
 "Gujarat": {
  "applicable": true,
  "remittance": "Manual",
  "returnMode": "Manual",
  "rc": "Applicable (Location wise)",
  "ec": "Applicable (Branch wise)",
  "empPeriodicity": "Monthly",
  "empMode": "Location wise",
  "empDue": "15th of every month",
  "returnDue": "Monthly – 15th",
  "employerAmt": "Corporation: ₹2,000 | Municipality: ₹1,000 | Panchayat: ₹500 (per branch)",
  "employerDue": "30th Sep",
  "slabNote": "Monthly income slabs (revised 2022 basis, still current)",
  "slabs": [
   [
    "1",
    "Up to ₹12,000",
    "Nil"
   ],
   [
    "2",
    "Above ₹12,000",
    "₹200"
   ]
  ],
  "slabCols": [
   "S.No",
   "Monthly Income",
   "PT (₹)"
  ],
  "calc": {
   "basis": "monthly",
   "slabs": [
    [
     12000,
     0
    ],
    [
     null,
     200
    ]
   ],
   "act": "Gujarat State Tax on Professions, Trades, Callings and Employments Act, 1976."
  }
 },
 "Madhya Pradesh": {
  "applicable": true,
  "remittance": "Online",
  "returnMode": "Online",
  "rc": "Applicable (Centrally)",
  "ec": "Applicable (Location wise)",
  "empPeriodicity": "Monthly",
  "empMode": "Centrally",
  "empDue": "10th of every month",
  "returnDue": "15th of each quarter (Apr, Jul, Oct, Jan)",
  "employerAmt": "≤10 emp: ₹1,000/branch | >10 emp: ₹2,500/branch",
  "employerDue": "30th Sep",
  "slabNote": "Annual income slabs",
  "slabs": [
   [
    "1",
    "Up to ₹2,25,000",
    "Nil"
   ],
   [
    "2",
    "₹2,25,001 – ₹3,00,000",
    "₹1,500/yr"
   ],
   [
    "3",
    "₹3,00,001 – ₹4,00,000",
    "₹2,000/yr"
   ],
   [
    "4",
    "Above ₹4,00,000",
    "₹2,500/yr"
   ]
  ],
  "slabCols": [
   "S.No",
   "Annual Income",
   "PT"
  ],
  "calc": {
   "basis": "annual",
   "slabs": [
    [
     225000,
     0
    ],
    [
     300000,
     1500
    ],
    [
     400000,
     2000
    ],
    [
     null,
     2500
    ]
   ],
   "act": "Madhya Pradesh Vritti Kar Adhiniyam, 1995."
  }
 },
 "Assam": {
  "applicable": true,
  "remittance": "Online",
  "returnMode": "Manual",
  "rc": "Applicable (Centrally)",
  "ec": "Applicable (Centrally)",
  "empPeriodicity": "Monthly",
  "empMode": "Centrally",
  "empDue": "Last day of every month",
  "returnDue": "Monthly",
  "employerAmt": "₹2,500/- centrally for all branches",
  "employerDue": "30th Sep",
  "slabNote": "Monthly income slabs",
  "slabs": [
   [
    "1",
    "Up to ₹15,000",
    "Nil"
   ],
   [
    "2",
    "₹15,001 – ₹25,000",
    "₹180"
   ],
   [
    "3",
    "Above ₹25,000",
    "₹208"
   ]
  ],
  "slabCols": [
   "S.No",
   "Monthly Income",
   "PT (₹)"
  ],
  "calc": {
   "basis": "monthly",
   "slabs": [
    [
     15000,
     0
    ],
    [
     25000,
     180
    ],
    [
     null,
     208
    ]
   ],
   "act": "Assam Professions, Trades, Callings and Employments Taxation Act, 1947."
  }
 },
 "Odisha": {
  "applicable": false,
  "note": "Professional Tax was repealed in Odisha effective 1 April 2026, under the Odisha State Tax on Professions, Trades, Callings and Employment (Repeal) Ordinance, 2026 (notified 21 April 2026). Note: this repeal is specific to PT — Labour Welfare Fund continues to apply in Odisha separately."
 },
 "West Bengal": {
  "applicable": true,
  "remittance": "Online",
  "returnMode": "Online",
  "rc": "Applicable (Centrally)",
  "ec": "Applicable (Location wise)",
  "empPeriodicity": "Monthly",
  "empMode": "Centrally",
  "empDue": "21st of every month",
  "returnDue": "30th April",
  "employerAmt": "₹2,500/- per branch",
  "employerDue": "31st July",
  "slabNote": "Monthly income slabs",
  "slabs": [
   [
    "1",
    "Up to ₹10,000",
    "Nil"
   ],
   [
    "2",
    "₹10,001 – ₹15,000",
    "₹110"
   ],
   [
    "3",
    "₹15,001 – ₹25,000",
    "₹130"
   ],
   [
    "4",
    "₹25,001 – ₹40,000",
    "₹150"
   ],
   [
    "5",
    "Above ₹40,000",
    "₹200"
   ]
  ],
  "slabCols": [
   "S.No",
   "Monthly Income",
   "PT (₹)"
  ],
  "calc": {
   "basis": "monthly",
   "slabs": [
    [
     10000,
     0
    ],
    [
     15000,
     110
    ],
    [
     25000,
     130
    ],
    [
     40000,
     150
    ],
    [
     null,
     200
    ]
   ],
   "act": "West Bengal State Tax on Professions, Trades, Callings and Employments Act, 1979."
  }
 },
 "Tripura": {
  "applicable": true,
  "remittance": "Online",
  "returnMode": "Online",
  "rc": "Not Applicable",
  "ec": "Not Applicable",
  "empPeriodicity": "Monthly",
  "empMode": "Centrally",
  "empDue": "Last day of every month",
  "returnDue": "Monthly",
  "employerAmt": "₹2,500/- per branch",
  "employerDue": "30th Sep",
  "slabNote": "Monthly income slabs",
  "slabs": [
   [
    "1",
    "Up to ₹7,500",
    "Nil"
   ],
   [
    "2",
    "₹7,501 – ₹15,000",
    "₹150"
   ],
   [
    "3",
    "Above ₹15,000",
    "₹208"
   ]
  ],
  "slabCols": [
   "S.No",
   "Monthly Income",
   "PT (₹)"
  ],
  "calc": {
   "basis": "monthly",
   "slabs": [
    [
     7500,
     0
    ],
    [
     15000,
     150
    ],
    [
     null,
     208
    ]
   ],
   "act": "Tripura Professions, Trades, Callings and Employments Taxation Act, 1997."
  }
 },
 "Nagaland": {
  "applicable": true,
  "remittance": "Manual",
  "returnMode": "Manual",
  "rc": "Not Applicable",
  "ec": "Not Applicable",
  "empPeriodicity": "Annually",
  "empMode": "Centrally",
  "empDue": "30th April",
  "returnDue": "—",
  "employerAmt": "₹2,500/- per branch",
  "employerDue": "30th Sep",
  "slabNote": "Monthly income slabs",
  "slabs": [
   [
    "1",
    "Less than ₹4,000",
    "Nil"
   ],
   [
    "2",
    "₹4,001 – ₹5,000",
    "₹35"
   ],
   [
    "3",
    "₹5,001 – ₹7,000",
    "₹75"
   ],
   [
    "4",
    "₹7,001 – ₹9,000",
    "₹110"
   ],
   [
    "5",
    "₹9,001 – ₹12,000",
    "₹180"
   ],
   [
    "6",
    "₹12,001 & above",
    "₹208"
   ]
  ],
  "slabCols": [
   "S.No",
   "Monthly Income",
   "PT (₹)"
  ],
  "calc": {
   "basis": "monthly",
   "slabs": [
    [
     4000,
     0
    ],
    [
     5000,
     35
    ],
    [
     7000,
     75
    ],
    [
     9000,
     110
    ],
    [
     12000,
     180
    ],
    [
     null,
     208
    ]
   ],
   "act": "Nagaland Professions, Trades, Callings and Employments Taxation Act, 1968."
  }
 },
 "Meghalaya": {
  "applicable": true,
  "remittance": "Manual",
  "returnMode": "Manual",
  "rc": "Not Applicable",
  "ec": "Not Applicable",
  "empPeriodicity": "Monthly",
  "empMode": "Centrally",
  "empDue": "Last day of every month",
  "returnDue": "—",
  "employerAmt": "₹2,500/- per branch",
  "employerDue": "30th April",
  "slabNote": "Annual income slabs, effective FY 2026–27",
  "slabs": [
   [
    "1",
    "Below ₹50,000",
    "Nil"
   ],
   [
    "2",
    "₹50,001 – ₹75,000",
    "₹200/yr"
   ],
   [
    "3",
    "₹75,001 – ₹1,00,000",
    "₹300/yr"
   ],
   [
    "4",
    "₹1,00,001 – ₹1,50,000",
    "₹450/yr"
   ],
   [
    "5",
    "₹1,50,001 – ₹2,00,000",
    "₹600/yr"
   ],
   [
    "6",
    "₹2,00,001 – ₹2,50,000",
    "₹1,000/yr"
   ],
   [
    "7",
    "₹2,50,001 – ₹3,00,000",
    "₹1,250/yr"
   ],
   [
    "8",
    "₹3,00,001 – ₹3,50,000",
    "₹1,500/yr"
   ],
   [
    "9",
    "₹3,50,001 – ₹4,00,000",
    "₹1,800/yr"
   ],
   [
    "10",
    "₹4,00,001 – ₹4,50,000",
    "₹2,100/yr"
   ],
   [
    "11",
    "₹4,50,001 – ₹5,00,000",
    "₹2,400/yr"
   ],
   [
    "12",
    "Above ₹5,00,000",
    "₹2,500/yr"
   ]
  ],
  "slabCols": [
   "S.No",
   "Annual Income",
   "PT"
  ],
  "calc": {
   "basis": "annual",
   "slabs": [
    [
     50000,
     0
    ],
    [
     75000,
     200
    ],
    [
     100000,
     300
    ],
    [
     150000,
     450
    ],
    [
     200000,
     600
    ],
    [
     250000,
     1000
    ],
    [
     300000,
     1250
    ],
    [
     350000,
     1500
    ],
    [
     400000,
     1800
    ],
    [
     450000,
     2100
    ],
    [
     500000,
     2400
    ],
    [
     null,
     2500
    ]
   ],
   "act": "Meghalaya Professions, Trades, Callings and Employments Taxation Act, 1947. Revised slabs effective FY 2026-27."
  }
 },
 "Mizoram": {
  "applicable": true,
  "remittance": "Manual",
  "returnMode": "Manual",
  "rc": "Not Applicable",
  "ec": "Not Applicable",
  "empPeriodicity": "Monthly",
  "empMode": "Centrally",
  "empDue": "Last day of every month",
  "returnDue": "—",
  "employerAmt": "₹2,500/- per branch",
  "employerDue": "30th Sep",
  "slabNote": "Monthly income slabs",
  "slabs": [
   [
    "1",
    "Up to ₹5,000",
    "Nil"
   ],
   [
    "2",
    "₹5,001 – ₹8,000",
    "₹75"
   ],
   [
    "3",
    "₹8,001 – ₹10,000",
    "₹120"
   ],
   [
    "4",
    "₹10,001 – ₹12,000",
    "₹150"
   ],
   [
    "5",
    "₹12,001 – ₹15,000",
    "₹180"
   ],
   [
    "6",
    "Above ₹15,000",
    "₹208"
   ]
  ],
  "slabCols": [
   "S.No",
   "Monthly Income",
   "PT"
  ],
  "calc": {
   "basis": "monthly",
   "slabs": [
    [
     5000,
     0
    ],
    [
     8000,
     75
    ],
    [
     10000,
     120
    ],
    [
     12000,
     150
    ],
    [
     15000,
     180
    ],
    [
     null,
     208
    ]
   ],
   "act": "Mizoram Professions, Trades, Callings and Employments Taxation Act, 1995."
  }
 },
 "Sikkim": {
  "applicable": true,
  "remittance": "Manual",
  "returnMode": "Manual",
  "rc": "Not Applicable",
  "ec": "Not Applicable",
  "empPeriodicity": "Quarterly",
  "empMode": "Centrally",
  "empDue": "Last day of each quarter (Apr, Jul, Oct, Jan)",
  "returnDue": "—",
  "employerAmt": "₹2,500/- per branch",
  "employerDue": "30th Sep",
  "slabNote": "Monthly income slabs (revised — previous figures were outdated)",
  "slabs": [
   [
    "1",
    "Up to ₹20,000",
    "Nil"
   ],
   [
    "2",
    "₹20,001 – ₹30,000",
    "₹125"
   ],
   [
    "3",
    "₹30,001 – ₹40,000",
    "₹150"
   ],
   [
    "4",
    "Above ₹40,000",
    "₹200"
   ]
  ],
  "slabCols": [
   "S.No",
   "Monthly Income",
   "PT (₹)"
  ],
  "calc": {
   "basis": "monthly",
   "slabs": [
    [
     20000,
     0
    ],
    [
     30000,
     125
    ],
    [
     40000,
     150
    ],
    [
     null,
     200
    ]
   ],
   "act": "Sikkim Tax on Professions, Trades, Callings and Employments Act, 2006."
  }
 },
 "Manipur": {
  "applicable": true,
  "remittance": "Manual",
  "returnMode": "Manual",
  "rc": "Not Applicable",
  "ec": "Not Applicable",
  "empPeriodicity": "Monthly",
  "empMode": "Centrally",
  "empDue": "Last day of every month",
  "returnDue": "—",
  "employerAmt": "₹2,500/- per branch",
  "employerDue": "30th Sep",
  "slabNote": "Annual income slabs",
  "slabs": [
   [
    "1",
    "Less than ₹50,000",
    "Nil"
   ],
   [
    "2",
    "₹50,001 – ₹75,000",
    "₹1,200/yr"
   ],
   [
    "3",
    "₹75,001 – ₹1,00,000",
    "₹2,000/yr"
   ],
   [
    "4",
    "₹1,00,001 – ₹1,25,000",
    "₹2,400/yr"
   ],
   [
    "5",
    "Above ₹1,25,000",
    "₹2,500/yr"
   ]
  ],
  "slabCols": [
   "S.No",
   "Annual Income",
   "PT"
  ],
  "calc": {
   "basis": "annual",
   "slabs": [
    [
     50000,
     0
    ],
    [
     75000,
     1200
    ],
    [
     100000,
     2000
    ],
    [
     125000,
     2400
    ],
    [
     null,
     2500
    ]
   ],
   "act": "Manipur Professions, Trades, Callings and Employments Taxation Act, 1981."
  }
 },
 "Jharkhand": {
  "applicable": true,
  "remittance": "Online",
  "returnMode": "Online",
  "rc": "Applicable (Centrally)",
  "ec": "Applicable (Centrally)",
  "empPeriodicity": "Quarterly",
  "empMode": "Centrally",
  "empDue": "15th of each quarter (Apr, Jul, Oct, Jan)",
  "returnDue": "15th of each quarter",
  "employerAmt": "≤5 emp: ₹500/yr | ≤10 emp: ₹1,000/yr | ≤20 emp: ₹2,000/yr | >20 emp: ₹2,500/yr",
  "employerDue": "30th April",
  "slabNote": "Annual gross income slabs; paid quarterly",
  "slabs": [
   [
    "1",
    "Up to ₹3,00,000",
    "Nil"
   ],
   [
    "2",
    "₹3,00,001 – ₹5,00,000",
    "₹1,200/yr (₹300/qtr)"
   ],
   [
    "3",
    "₹5,00,001 – ₹8,00,000",
    "₹1,800/yr (₹450/qtr)"
   ],
   [
    "4",
    "₹8,00,001 – ₹10,00,000",
    "₹2,100/yr (₹525/qtr)"
   ],
   [
    "5",
    "Above ₹10,00,000",
    "₹2,500/yr (₹625/qtr)"
   ]
  ],
  "slabCols": [
   "S.No",
   "Annual Income",
   "PT"
  ],
  "calc": {
   "basis": "annual",
   "slabs": [
    [
     300000,
     0
    ],
    [
     500000,
     1200
    ],
    [
     800000,
     1800
    ],
    [
     1000000,
     2100
    ],
    [
     null,
     2500
    ]
   ],
   "act": "Jharkhand Tax on Professions, Trades, Callings and Employments Act, 2011. Payable quarterly."
  }
 },
 "Tamil Nadu": {
  "applicable": true,
  "remittance": "Manual",
  "returnMode": "Manual",
  "rc": "RC number issued – Location wise",
  "ec": "Not Applicable",
  "empPeriodicity": "Half-Yearly",
  "empMode": "Location wise",
  "empDue": "30th Sep & 31st Mar",
  "returnDue": "—",
  "employerAmt": "Location wise — slab differs per location (Chennai rates shown)",
  "employerDue": "30th Sep & 31st Mar",
  "slabNote": "Half-yearly income slabs (Chennai Corporation)",
  "slabs": [
   [
    "1",
    "Up to ₹21,000",
    "Nil"
   ],
   [
    "2",
    "₹21,001 – ₹30,000",
    "₹180"
   ],
   [
    "3",
    "₹30,001 – ₹45,000",
    "₹425"
   ],
   [
    "4",
    "₹45,001 – ₹60,000",
    "₹930"
   ],
   [
    "5",
    "₹60,001 – ₹75,000",
    "₹1,025"
   ],
   [
    "6",
    "Above ₹75,000",
    "₹1,250"
   ]
  ],
  "slabCols": [
   "S.No",
   "Half-Yearly Income",
   "PT (₹)"
  ],
  "calc": {
   "basis": "halfyearly",
   "slabs": [
    [
     21000,
     0
    ],
    [
     30000,
     180
    ],
    [
     45000,
     425
    ],
    [
     60000,
     930
    ],
    [
     75000,
     1025
    ],
    [
     null,
     1250
    ]
   ],
   "act": "Tamil Nadu Municipal Laws (Second Amendment) Act, 1998. Rates shown are the Chennai Corporation slabs; other local bodies notify their own."
  }
 },
 "Puducherry": {
  "applicable": true,
  "remittance": "Manual",
  "returnMode": "Manual",
  "rc": "Not Applicable",
  "ec": "Not Applicable",
  "empPeriodicity": "Half-Yearly",
  "empMode": "Location wise",
  "empDue": "15th Jan & 15th July",
  "returnDue": "—",
  "employerAmt": "₹1,250/- per branch",
  "employerDue": "15th Jan & 15th July",
  "slabNote": "Half-yearly income slabs",
  "slabs": [
   [
    "1",
    "Below ₹99,999",
    "Nil"
   ],
   [
    "2",
    "₹1,00,000 – ₹2,00,000",
    "₹250"
   ],
   [
    "3",
    "₹2,00,001 – ₹3,00,000",
    "₹500"
   ],
   [
    "4",
    "₹3,00,001 – ₹4,00,000",
    "₹750"
   ],
   [
    "5",
    "₹4,00,001 – ₹5,00,000",
    "₹1,000"
   ],
   [
    "6",
    "₹5,00,001 & above",
    "₹1,250"
   ]
  ],
  "slabCols": [
   "S.No",
   "Half-Yearly Income",
   "PT (₹)"
  ],
  "calc": {
   "basis": "halfyearly",
   "slabs": [
    [
     99999,
     0
    ],
    [
     200000,
     250
    ],
    [
     300000,
     500
    ],
    [
     400000,
     750
    ],
    [
     500000,
     1000
    ],
    [
     null,
     1250
    ]
   ],
   "act": "Puducherry Municipalities Act, 1973 read with the Village and Commune Panchayats Act, 1973."
  }
 },
 "Bihar": {
  "applicable": true,
  "remittance": "Manual",
  "returnMode": "Manual",
  "rc": "Applicable (Centrally)",
  "ec": "Applicable (Centrally)",
  "empPeriodicity": "Annually",
  "empMode": "Centrally",
  "empDue": "30th Nov",
  "returnDue": "30th Nov",
  "employerAmt": "₹2,500/- centrally for all branches",
  "employerDue": "30th Nov",
  "slabNote": "Annual income slabs",
  "slabs": [
   [
    "1",
    "Up to ₹3,00,000",
    "Nil"
   ],
   [
    "2",
    "₹3,00,001 – ₹5,00,000",
    "₹1,000/yr"
   ],
   [
    "3",
    "₹5,00,001 – ₹10,00,000",
    "₹2,000/yr"
   ],
   [
    "4",
    "Above ₹10,00,000",
    "₹2,500/yr"
   ]
  ],
  "slabCols": [
   "S.No",
   "Annual Income",
   "PT"
  ],
  "calc": {
   "basis": "annual",
   "slabs": [
    [
     300000,
     0
    ],
    [
     500000,
     1000
    ],
    [
     1000000,
     2000
    ],
    [
     null,
     2500
    ]
   ],
   "act": "Bihar Tax on Professions, Trades, Callings and Employments Act, 2011."
  }
 },
 "Punjab": {
  "applicable": true,
  "remittance": "Online",
  "returnMode": "Online",
  "rc": "Applicable (Centrally)",
  "ec": "Applicable (Centrally)",
  "empPeriodicity": "Monthly",
  "empMode": "Centrally",
  "empDue": "Last day of every month",
  "returnDue": "30th April",
  "employerAmt": "₹200/- per month × number of employees",
  "employerDue": "30th April",
  "slabNote": "Annual income slabs; shown for both income-tax regimes",
  "slabs": [
   [
    "1",
    "Old Regime: Up to ₹2,50,000/yr",
    "Nil"
   ],
   [
    "2",
    "Old Regime: Above ₹2,50,000/yr",
    "₹200/month"
   ],
   [
    "3",
    "New Regime: Up to ₹3,00,000/yr",
    "Nil"
   ],
   [
    "4",
    "New Regime: Above ₹3,00,000/yr",
    "₹200/month"
   ]
  ],
  "slabCols": [
   "S.No",
   "Annual Income / Regime",
   "PT"
  ],
  "calc": {
   "basis": "annual",
   "slabs": [
    [
     300000,
     0
    ],
    [
     null,
     2400
    ]
   ],
   "act": "Punjab State Development Tax Act, 2018. ₹200/month where annual income exceeds the exemption limit (₹3,00,000 under the new regime; ₹2,50,000 under the old regime)."
  }
 },
 "Delhi": {
  "applicable": false
 },
 "Haryana": {
  "applicable": false
 },
 "Uttar Pradesh": {
  "applicable": false
 },
 "Chandigarh": {
  "applicable": false
 },
 "Rajasthan": {
  "applicable": false
 },
 "Uttarakhand": {
  "applicable": false
 },
 "Arunachal Pradesh": {
  "applicable": false
 }
};
