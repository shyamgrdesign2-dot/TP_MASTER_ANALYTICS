/* ============================================================================
 * IPD analytics navigation tree, the config that drives the TP sidebar when
 * the workspace is opened at /analytics/ipd.
 *
 * Same shape as ANALYTICS_NAV (analyticsNav.jsx):
 *   Section (L1)  — { id, label, icon, items? }   (no items = leaf section)
 * Every IPD section is a leaf: the inpatient module is small enough that one
 * destination per topic says everything for that topic on a single page.
 * ========================================================================== */

import {
  Element3,
  Hospital,
  Building,
  Health,
  Wallet3,
  DocumentDownload,
} from "iconsax-reactjs";

export const IPD_NAV = [
  { id: "ipd_overview", label: "Overview", icon: Element3 },
  { id: "ipd_admissions", label: "Admissions & Discharges", icon: Hospital },
  { id: "ipd_wards", label: "Wards & Beds", icon: Building },
  { id: "ipd_clinical", label: "Clinical Activity", icon: Health },
  { id: "ipd_billing", label: "Billing", icon: Wallet3 },
  { id: "ipd_reports", label: "Reports", icon: DocumentDownload },
];

// Flat lookup: leafId -> { label, sectionLabel, icon } (mirrors LEAF_INDEX).
export const IPD_LEAF_INDEX = (() => {
  const idx = {};
  IPD_NAV.forEach((s) => {
    if (s.items?.length) {
      s.items.forEach((it) => {
        idx[it.id] = { label: it.label, sectionLabel: s.label, icon: it.icon };
      });
    } else {
      idx[s.id] = { label: s.label, sectionLabel: null, icon: s.icon };
    }
  });
  return idx;
})();
