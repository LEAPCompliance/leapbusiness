/* ============================================
   LEAP Business Solutions – Gazette Notifications data
   Add a new object to the top of this array for each new
   notification. Newest first. Dates in YYYY-MM-DD.
   ============================================ */
const NOTIFICATIONS = [
  {
    title: "EPFO Wage Ceiling Officially Notified at ₹25,000",
    tag: "PF / EPFO",
    region: "Central",
    releasedDate: "2026-09-17",
    effectiveDate: "2026-09-17",
    excerpt: "Gazette Notification S.O. 5109(E) dated 17 September 2026 makes it official: the EPF statutory wage ceiling rises from ₹15,000 to ₹25,000 per month, effective the same day, superseding S.O. 2702(E) dated 29 May 2026.",
    link: "/blog/epfo-2026/",
    linkLabel: "Read Full Update",
    downloads: [
      { url: "/assets/notifications/epfo-gazette-so-5109-2026.pdf", label: "Gazette Notification" },
      { url: "/assets/notifications/epfo-press-release-17sep2026.pdf", label: "EPFO Press Release" }
    ],
    source: "Gazette of India S.O. 5109(E); EPFO Regional Office Thane South (Ghatkopar)"
  },
  {
    title: "Cabinet Approves EPFO Wage Ceiling Hike to ₹25,000",
    tag: "PF / EPFO",
    region: "Central",
    releasedDate: "2026-09-16",
    effectiveDate: null,
    excerpt: "Union Cabinet approved raising the EPFO wage ceiling for mandatory coverage from ₹15,000 to ₹25,000 per month. Over 51 lakh additional employees are expected to come under mandatory PF, Pension, and EDLI coverage once formally notified.",
    link: "/blog/epfo-2026/",
    linkLabel: "Read Full Update",
    downloadUrl: "/assets/notifications/epfo-wage-ceiling-25000-2026.pdf",
    source: "PIB Delhi, Ministry of Labour & Employment"
  }
];
