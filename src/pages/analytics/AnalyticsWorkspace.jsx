import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Tag, Skeleton, Alert, Card, Divider, ConfigProvider, Segmented } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { Refresh, Trash, DocumentText, DocumentDownload, Menu, ArrowLeft2, InfoCircle } from "iconsax-reactjs";
import Widget from "./components/Widget";
import QueryBuilderDrawer from "./components/QueryBuilderDrawer";
import ReportModal from "./components/ReportModal";
import DateRangeControl, { periodLabel } from "./components/DateRangeControl";
import FilterMultiSelect from "./components/FilterMultiSelect";
import PageInfoDrawer from "./components/PageInfoDrawer";
import SectionHeader from "./components/SectionHeader";
import AnalyticsSidebar from "./shell/AnalyticsSidebar";
import PlaceholderPage from "./shell/PlaceholderPage";
import { SECTION_ORDER } from "./service";
import { ANALYTICS_NAV, PAGE_MAP, DASHBOARD_ENDPOINTS, PLACEHOLDER_SPEC, LEAF_INDEX } from "./shell/analyticsNav";
import { IPD_NAV, IPD_LEAF_INDEX } from "./shell/ipdNav";
import { useAnalyticsPage } from "./useAnalyticsData";
import { REPORT_CARDS, REPORT_SECTIONS, IPD_REPORT_CARDS, IPD_REPORT_SECTIONS } from "./analyticsPages";
import { MoneyRecive, ReceiptText, Gift, ReceiptSearch, Chart, Calendar1, Drop, Profile2User as ProfileUsers, ProfileAdd as ProfileAddIcon, Personalcard, CalendarTick as CalTick, MedalStar as Medal, MoneyTime, Box as BoxIcon, Hospital as HospitalIcon, LogoutCurve, Clock as ClockIcon, Timer1, ArrowSwapHorizontal, Scissor as ScissorIcon } from "iconsax-reactjs";
import { CapsuleGlyph } from "./components/MetricIcons";

import { isApiOn } from "./analyticsConfig";
import { DEMO, DEMO_DOCTORS } from "./demo/demoApi";
import { listDoctor } from "../../redux/bulkMessagesSlice";
import { getDecodedToken } from "../../utils/localStorage";
import "./shell/tpTokens.scss";
import "./ui/theme.css";
import "./AnalyticsWorkspace.scss";

const FMT = "YYYY-MM-DD";

// Per-report heading icon (bulk variant, violet) so each card reads at a glance.
const REPORT_ICON = {
  daily_collection: MoneyRecive,
  collection: ReceiptText,
  incentives: Gift,
  report_3c: ReceiptSearch,
  billing_overall: Chart,
  appointment_analytics: Calendar1,
  prescription_analytics: CapsuleGlyph,
  medicine_analytics: Drop,
  referred_by_patients: ProfileUsers,
  referred_by_others: ProfileAddIcon,
  patient_register: Personalcard,
  followup_recall: CalTick,
  certificates_register: Medal,
  custom_meds_register: CapsuleGlyph,
  dues_register: MoneyTime,
  stock_expiry_register: BoxIcon,
  // IPD report cards
  admission_register: HospitalIcon,
  discharge_register: LogoutCurve,
  discharge_queue: ClockIcon,
  los_report: Timer1,
  transfers_register: ArrowSwapHorizontal,
  ot_register: ScissorIcon,
  ipd_bills: ReceiptText,
  ipd_dues: MoneyTime,
};

// TatvaCare design-system theme for every antd control inside analytics
// (dropdowns, buttons, range picker, drawer, modal). Maps antd v5 tokens to the
// TP palette so the chrome stops looking like default antd. fontFamily = Inter.
const TP_FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const TP_THEME = {
  token: {
    colorPrimary: "#4b4ad5",
    colorInfo: "#4b4ad5",
    colorLink: "#3c3bb5",
    colorBorder: "#e2e2ea",
    colorBorderSecondary: "#f1f1f5",
    colorText: "#171725",
    colorTextSecondary: "#545460",
    colorTextPlaceholder: "#a2a2a8",
    colorBgContainer: "#ffffff",
    colorBgElevated: "#ffffff",
    borderRadius: 8,
    borderRadiusLG: 10,
    controlHeight: 38,
    fontFamily: TP_FONT,
    fontSize: 13,
    boxShadowSecondary: "0 12px 32px rgba(23,23,37,0.14)",
  },
  components: {
    Select: { optionSelectedBg: "#eeeeff", optionSelectedColor: "#2e2d96", optionSelectedFontWeight: 600 },
    Button: { primaryShadow: "none", defaultShadow: "none", fontWeight: 600, controlHeight: 38 },
    DatePicker: { activeBorderColor: "#4b4ad5", cellActiveWithRangeBg: "#eeeeff" },
    Tag: { borderRadiusSM: 6 },
  },
};

// One-line subtitle shown under each page's heading in the sub-header bar.
const LEAF_DESC = {
  overview: "Your OPD practice at a glance.",
  footfall: "Appointments, demand and where bookings come from.",
  opd_billing: "Collections, payment mix and receivables.",
  opd_patients: "Who your patients are, and how they come back.",
  diagnosis: "What you diagnose the most.",
  rx: "What you prescribe the most.",
  lab_tests: "Investigations you order.",
  procedures: "Procedures and surgeries performed.",
  vitals: "Recorded vitals across patients.",
  symptoms: "Reported symptoms.",
  medical_history: "Conditions, allergies and history.",
  gynec: "Menstrual gynaecology history.",
  growth_chart: "Paediatric growth.",
  vaccination: "Vaccination coverage.",
  clinical_quality: "Prescribing quality.",
  abha: "ABHA / ABDM linkage and KYC.",
  followups: "Follow-up advice and adherence.",
  pharmacy: "Pharmacy sales.",
  obstetric: "Obstetric history and outcomes.",
  certificates: "Medical certificates issued.",
  custom_modules: "Reusable RxPad modules and their reuse.",
  bulk_comm: "Bulk-message campaigns.",
  pathology: "Pathology revenue.",
  reports_hub: "Download formatted reports.",
  // IPD module
  ipd_overview: "Your inpatient unit at a glance.",
  ipd_admissions: "Admissions, discharges and length of stay.",
  ipd_wards: "Beds, occupancy and patient movement.",
  ipd_clinical: "Documentation, diagnoses and OT activity.",
  ipd_billing: "IPD collections, payment mix and receivables.",
  ipd_reports: "Download formatted IPD reports.",
};

// --- Per-page customization (show/hide + reorder), persisted on this device ---
const CUSTOMIZE_KEY = "tp_analytics_customize_v1";
function loadAllPrefs() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMIZE_KEY)) || {};
  } catch {
    return {};
  }
}
function applyPrefs(widgets, pref) {
  if (!pref) return widgets;
  const hidden = new Set(pref.hidden || []);
  const order = pref.order || [];
  const oidx = (id) => {
    const i = order.indexOf(id);
    return i < 0 ? 999 : i;
  };
  let ws = widgets
    .map((w) => {
      // KPI cards can be hidden per-metric, but NEVER reordered: the band keeps
      // the canonical funnel order from the backend so a card's position is
      // identical for every period/filter selection. (Saved orders from older
      // sessions used title-based ids and scrambled positions between periods.)
      if (w.kind !== "kpis") return w;
      let kpis = (w.kpis || []).filter((k) => !hidden.has(k.id));
      kpis = kpis.map((k, i) => ({ ...k, hero: i === 0 }));
      return { ...w, kpis };
    })
    .filter((w) => !hidden.has(w.id))
    .filter((w) => w.kind !== "kpis" || (w.kpis && w.kpis.length));
  // The KPI band carries no entry in `order`, so a naive sort would drop it to
  // the bottom. Pin it to the front (weight -1); everything else keeps its rank.
  const weight = (w) => (w.kind === "kpis" ? -1 : oidx(w.id));
  if (order.length) ws = [...ws].sort((a, b) => weight(a) - weight(b));
  return ws;
}

// Group the page's widgets into labelled sections, ordered by SECTION_ORDER.
// Unknown sections sort to the end. `count` powers the chip on each header.
function groupWidgets(widgets) {
  const map = new Map();
  widgets.forEach((w) => {
    // All data tables drop to the bottom "Patient data" zone; charts/KPIs keep
    // their section. Never mix charts and tables within a band.
    const g =
      w.kind === "table" || w.kind === "empty"
        ? w.group === "Doctor performance"
          ? "Doctor performance"
          : "Patient data"
        : w.group || (w.kind === "kpis" ? "Key metrics" : "More insights");
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(w);
  });
  return [...map.entries()]
    .sort((a, b) => {
      const ia = SECTION_ORDER.indexOf(a[0]);
      const ib = SECTION_ORDER.indexOf(b[0]);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    })
    .map(([title, ws]) => ({
      title,
      widgets: ws,
      count: ws.reduce((n, w) => n + (w.kind === "kpis" ? w.kpis?.length || 0 : 1), 0),
    }));
}

export default function AnalyticsWorkspace() {
  // One shell, two modules: /analytics renders the OPD workspace, /analytics/ipd
  // the IPD one. Everything below (nav, leaf index, default leaf, brand) keys
  // off this flag; the page loaders are shared.
  const isIpd = useLocation().pathname.endsWith("/ipd");
  const nav = isIpd ? IPD_NAV : ANALYTICS_NAV;
  const leafIndex = isIpd ? IPD_LEAF_INDEX : LEAF_INDEX;
  const defaultLeaf = isIpd ? "ipd_overview" : "overview";
  const brand = isIpd ? "IPD Analytics" : "OPD Analytics";

  // Boardroom #7: dashboards are addressable + survive refresh via ?view=
  const [searchParams, setSearchParams] = useSearchParams();
  const [leaf, setLeafState] = useState(() => {
    const v = searchParams.get("view");
    return v && leafIndex[v] ? v : defaultLeaf;
  });
  const setLeaf = (id) => {
    setLeafState(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("view", id);
      return next;
    }, { replace: true });
  };
  // Crossing between /analytics and /analytics/ipd reuses this component
  // instance, so a leaf from the other module must snap back to the default.
  useEffect(() => {
    if (!leafIndex[leaf]) setLeaf(defaultLeaf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIpd]);
  // DEMO build: default to the "Till date" preset (15y window) so the bundled
  // multi-year fixtures render full charts on first load. Production keeps the
  // operational "Last 7 days" default.
  const DEFAULT_RANGE = DEMO
    ? () => [dayjs().subtract(15, "year"), dayjs()] // matches the "Till date" preset label
    : () => [dayjs().subtract(6, "day"), dayjs()]; // Last 7 days
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [hospitalSel, setHospitalSel] = useState([]); // [] = all clinics, else specific hm_ids
  const [doctorSel, setDoctorSel] = useState([]); // [] = all doctors, else specific um_ids
  const [gender, setGender] = useState("all"); // in-page Patients drill-down (segments cards + export)
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [customWidgets, setCustomWidgets] = useState({});
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [projectInfoOpen, setProjectInfoOpen] = useState(false);
  const [allPrefs, setAllPrefs] = useState(loadAllPrefs);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const profile = useSelector((s) => s.doctors?.profile);
  const doctorListLive = useSelector((s) => s.bulkMessages?.doctorList) || [];
  // DEMO build: a static doctor list keeps the Doctor filter populated without
  // the user-management API (names match the anonymized fixture doctors).
  const doctorList = DEMO && !doctorListLive.length ? DEMO_DOCTORS : doctorListLive;
  const userId = useSelector((s) => s.doctors?.userId);

  useEffect(() => {
    if (!DEMO && !doctorList.length) dispatch(listDoctor());
  }, [dispatch, doctorList.length]);

  const doctorIds = useMemo(() => {
    const ids = doctorList.map((d) => d.um_id).filter(Boolean);
    if (ids.length) return ids;
    if (userId) return [userId];
    const uid = getDecodedToken()?.result?.user_id;
    return uid ? [uid] : [];
  }, [doctorList, userId]);

  // Role-aware default scope: a DOCTOR login (their um_id is one of the
  // clinic's consulting doctors) lands on THEIR OWN practice — the Doctor
  // filter pre-set to themselves — while owner / admin logins land clinic-wide.
  // "Reset all" returns to this role default, not to blank; the doctor can
  // still widen to "All doctors" manually whenever they want. (There is no
  // specialty-admin role in the portal — the multi-doctor filter covers that
  // need by hand.)
  const roleDefaultSel = useMemo(() => {
    if (userId && doctorList.some((d) => String(d.um_id) === String(userId))) return [String(userId)];
    return [];
  }, [doctorList, userId]);
  const roleDefaultApplied = useRef(false);
  useEffect(() => {
    if (roleDefaultApplied.current || !doctorList.length) return;
    roleDefaultApplied.current = true;
    if (roleDefaultSel.length) setDoctorSel(roleDefaultSel);
  }, [doctorList.length, roleDefaultSel]);

  const apiOn = isApiOn();
  const pageKey = PAGE_MAP[leaf];
  const apiEndpoint = DASHBOARD_ENDPOINTS[leaf];
  const isBuilt = !!pageKey || (apiOn && !!apiEndpoint);
  const meta = leafIndex[leaf] || { label: "Analytics" };
  const builtIds = useMemo(() => {
    const s = new Set(Object.keys(PAGE_MAP));
    if (apiOn) Object.keys(DASHBOARD_ENDPOINTS).forEach((k) => s.add(k));
    return s;
  }, [apiOn]);

  const startDate = range[0].format(FMT);
  const endDate = range[1].format(FMT);
  // Bucket trends/sparklines by day for short windows, by month past a quarter
  // (keeps a 1-year view readable and the wave bars meaningful).
  // Adaptive bucketing: short windows by day, ~2 weeks–3 months by week, longer by month.
  const spanDays = range[1].diff(range[0], "day") + 1;
  const grain = spanDays > 92 ? "month" : spanDays > 10 ? "week" : "day";
  // Reset-all shows only when something is off the defaults (default period, all docs/clinics).
  const defaultRange = DEFAULT_RANGE();
  const isDefault7 = range[0].isSame(defaultRange[0], "day") && range[1].isSame(defaultRange[1], "day");
  // Dirty = off the ROLE defaults (a doctor's own-practice default is clean).
  const docDirty = doctorSel.join(",") !== roleDefaultSel.join(",");
  const filtersDirty = docDirty || hospitalSel.length > 0 || gender !== "all" || !isDefault7;

  // The Doctor filter must actually scope the data. With one or more doctors
  // picked, query exactly those um_ids; with none picked, all hospital doctors.
  const effectiveDoctorIds = useMemo(
    () => (doctorSel.length ? doctorSel : doctorIds),
    [doctorSel, doctorIds],
  );

  // Top filters are universal: Doctor · Clinic · Period. Demographic breakdowns
  // (gender / age / ABHA / blood group / new-returning) are shown as charts on
  // the page, not as filters. grain travels so trends bucket correctly.
  // Patients is the one page with an in-page drill-down (gender). It segments
  // the cards AND the downloadable register server-side. Only sent on that leaf.
  const showGender = leaf === "opd_patients";
  const pageFilters = useMemo(
    () => ({
      grain,
      ...(hospitalSel.length ? { hospitalId: hospitalSel } : {}),
      ...(showGender && gender !== "all" ? { gender } : {}),
    }),
    [grain, hospitalSel, showGender, gender],
  );

  const { loading, error, widgets } = useAnalyticsPage(
    leaf,
    startDate,
    endDate,
    effectiveDoctorIds,
    refreshNonce,
    pageFilters,
  );

  // Apply the user's per-page customization (show/hide + reorder) before render.
  const leafPref = allPrefs[leaf];
  const setLeafPref = (pref) =>
    setAllPrefs((prev) => {
      const next = { ...prev, [leaf]: pref };
      try { localStorage.setItem(CUSTOMIZE_KEY, JSON.stringify(next)); } catch (_) {}
      return next;
    });
  const shownWidgets = useMemo(() => applyPrefs(widgets, leafPref), [widgets, leafPref]);

  const hospitalOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All hospitals" }];
    (profile?.hospital_data || []).forEach((h) => opts.push({ value: String(h.hm_id), label: h.hm_name }));
    return opts;
  }, [profile]);

  const doctorOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All doctors" }];
    doctorList.forEach((d) => opts.push({ value: String(d.um_id), label: d.um_name || `Doctor ${d.um_id}` }));
    return opts;
  }, [doctorList]);

  // Human label for the live filter scope, appended to every heading tooltip so a
  // number is never ambiguous about which doctor / clinic / period it's for.
  const scopeNote = useMemo(() => {
    const names = (arr, opts, allLabel, oneLabel) => {
      if (!arr.length) return allLabel;
      const labels = arr.map((v) => opts.find((o) => o.value === String(v))?.label || oneLabel);
      return labels.length <= 2 ? labels.join(", ") : `${labels.length} ${oneLabel}s`;
    };
    const dl = names(doctorSel, doctorOptions, "All doctors", "doctor");
    const cl = names(hospitalSel, hospitalOptions, "All clinics", "clinic");
    // Period label mirrors the date control exactly: the active preset name
    // ("Till date", "Last 30 days", "Today") or the explicit dates for a custom
    // range — so the tooltip always states the real basis for the numbers.
    const pl = periodLabel(range);
    const seg = gender !== "all" && leaf === "opd_patients" ? ` · ${gender === "M" ? "Male" : gender === "F" ? "Female" : gender}` : "";
    return `${dl} · ${cl} · ${pl}${seg}`;
  }, [doctorSel, hospitalSel, range, gender, leaf, doctorOptions, hospitalOptions]);

  const handleAddWidget = (w) => setCustomWidgets((p) => ({ ...p, [leaf]: [...(p[leaf] || []), w] }));
  const handleRemoveCustom = (id) => setCustomWidgets((p) => ({ ...p, [leaf]: (p[leaf] || []).filter((w) => w.id !== id) }));
  const pageCustom = customWidgets[leaf] || [];

  const isReports = pageKey === "reports_hub";
  const ph = PLACEHOLDER_SPEC[leaf] || {};

  return (
    <ConfigProvider theme={TP_THEME}>
    <div className="tp-analytics analytics-shell">
      {/* Full-width app header across the very top — sidebar starts below it */}
      <header className="analytics-topbar">
        <div className="analytics-topbar__title">
          <button
            type="button"
            className="analytics-hamburger"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} color="var(--tp-slate-600)" />
          </button>
          <button
            type="button"
            className="analytics-back"
            onClick={() => navigate("/")}
            aria-label="Back to home"
            title="Back to home"
          >
            <ArrowLeft2 size={18} color="var(--tp-slate-600)" />
          </button>
          <span className="analytics-brand">{brand}</span>
        </div>
        <div className="analytics-topbar__actions">
          <button type="button" className="analytics-iconbtn" title="Tutorials" aria-label="Tutorials">
            <img
              src="https://pmdoctorportal.blob.core.windows.net/tp-assets/assets/images/tutorial2.webp"
              alt=""
              width="20"
              height="20"
            />
          </button>
          <button
            type="button"
            className={`analytics-iconbtn ${loading && isBuilt ? "is-spinning" : ""}`}
            onClick={() => setRefreshNonce((n) => n + 1)}
            title="Refresh"
            aria-label="Refresh"
          >
            <Refresh size={18} color="var(--tp-slate-600)" />
          </button>
          <button
            type="button"
            className="analytics-iconbtn"
            onClick={() => setProjectInfoOpen(true)}
            title={`About ${brand}: the complete project, scope and master APIs`}
            aria-label={`About ${brand}`}
          >
            <InfoCircle size={18} variant="Bulk" color="#8a4dbb" />
          </button>
        </div>
      </header>

      <div className="analytics-lower">
        <AnalyticsSidebar
          nav={nav}
          activeLeafId={leaf}
          onSelect={setLeaf}
          builtIds={builtIds}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />
        {/* Mobile backdrop */}
        <div
          className={`analytics-backdrop ${mobileNavOpen ? "is-open" : ""}`}
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />

        <div className="analytics-main">
        {/* Tier 2 — the selected page's own heading + one-line subtitle + info */}
        <div className="analytics-subhead">
          <div className="analytics-subhead__main">
            <div>
              {meta.sectionLabel && <span className="analytics-subhead__crumb">{meta.sectionLabel}</span>}
              <h1 className="analytics-subhead__title">{meta.label}</h1>
              {LEAF_DESC[leaf] && <p className="analytics-subhead__sub">{LEAF_DESC[leaf]}</p>}
            </div>
            {!isBuilt && <Tag className="analytics-soon-tag">Designed</Tag>}
          </div>
          <button
            type="button"
            className="analytics-subhead__info"
            aria-label={`About ${meta.label}`}
            title={`About ${meta.label}: what this page shows, plus downloadable docs`}
            onClick={() => setInfoOpen(true)}
          >
            <InfoCircle size={18} variant="Bulk" color="#8a4dbb" />
          </button>
        </div>
        <PageInfoDrawer leaf={leaf} title={meta.label} open={infoOpen} onClose={() => setInfoOpen(false)} />
        <PageInfoDrawer leaf={isIpd ? "project_scope_ipd" : "project_scope"} title={brand} open={projectInfoOpen} onClose={() => setProjectInfoOpen(false)} project />

        {/* Filter bar — below the header (appointment-home pattern) */}
        {!isReports && (
          <div className="analytics-filterbar">
            <div className="analytics-filterbar__field">
              <label>Doctor</label>
              <FilterMultiSelect
                label="Doctor"
                allLabel="All doctors"
                groupLabel="Individual doctors"
                placeholder="All doctors"
                options={doctorOptions.slice(1)}
                value={doctorSel}
                onChange={setDoctorSel}
              />
            </div>
            <div className="analytics-filterbar__field">
              <label>Clinic / Hospital</label>
              <FilterMultiSelect
                label="Clinic / Hospital"
                allLabel="All clinics"
                groupLabel="Individual clinics"
                placeholder="All clinics"
                options={hospitalOptions.slice(1)}
                value={hospitalSel}
                onChange={setHospitalSel}
              />
            </div>
            <div className="analytics-filterbar__field">
              <label>Period</label>
              <DateRangeControl value={range} onChange={setRange} />
            </div>
            {/* Page-specific drill-down: Patients gets a gender segment that
                narrows the cards and the exported register. Other breakdowns
                (age, ABHA, blood group) stay as on-page charts. */}
            {showGender && (
              <div className="analytics-filterbar__field">
                <label>Gender</label>
                <Segmented
                  value={gender}
                  onChange={setGender}
                  options={[
                    { label: "All", value: "all" },
                    { label: "Male", value: "Male" },
                    { label: "Female", value: "Female" },
                  ]}
                />
              </div>
            )}
            <div className="analytics-filterbar__spacer" />
            {filtersDirty && (
              <button
                type="button"
                className="analytics-reset"
                onClick={() => { setDoctorSel(roleDefaultSel); setHospitalSel([]); setGender("all"); setRange(DEFAULT_RANGE()); setRefreshNonce((n) => n + 1); }}
              >
                Reset all
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="analytics-body">
          {error && isBuilt && (
            <Alert type="error" showIcon message="Couldn't load analytics" description={error} style={{ marginBottom: 16 }} />
          )}

          {!isBuilt ? (
            <PlaceholderPage title={meta.label} sectionLabel={meta.sectionLabel} planned={ph.planned} needs={ph.needs} />
          ) : isReports ? (
            <ReportsHub ipd={leaf === "ipd_reports"} />
          ) : loading ? (
            <div className="analytics-grid">
              <Skeleton active paragraph={{ rows: 6 }} />
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
          ) : (
            <>
              {!shownWidgets.some(
                (w) =>
                  // A KPI counts as "has data" if its value is a positive number
                  // OR a non-empty, non-"—" string (e.g. "Top diagnosis"). Strip
                  // formatting (₹ , %) before the numeric test so "₹1,25,000" counts.
                  (w.kind === "kpis" &&
                    (w.kpis || []).some((k) => {
                      const n = Number(String(k.value ?? "").replace(/[^0-9.-]/g, ""));
                      if (Number.isFinite(n) && n > 0) return true;
                      const s = String(k.value ?? "").trim();
                      return s !== "" && s !== "—" && s !== "0";
                    })) ||
                  (w.kind === "chart" && (w.data?.rows?.length || 0) > 0) ||
                  (w.kind === "table" && (w.rows?.length || 0) > 0),
              ) && (
                <Alert
                  type="info"
                  showIcon
                  message="No data in this period"
                  description={
                    <span>
                      Nothing was recorded in the selected window. Widen the range or{" "}
                      <a
                        onClick={() => setRange([dayjs().subtract(15, "year"), dayjs()])}
                        style={{ fontWeight: 600, cursor: "pointer" }}
                      >
                        view all-time
                      </a>
                      .
                    </span>
                  }
                  style={{ marginBottom: 16 }}
                />
              )}
              {shownWidgets.filter((w) => w.kind === "banner").map((b) => (
                <Alert key={b.id} type={b.sample ? "warning" : "info"} showIcon
                  message={b.sample ? "Sample data" : "Note"} description={b.text}
                  style={{ marginBottom: 16 }} />
              ))}
              <div className="analytics-grid analytics-canvas">
                {(() => {
                  const sections = groupWidgets(shownWidgets.filter((w) => w.kind !== "banner"));
                  const showHeaders = sections.length > 1;
                  return sections.map((s) => {
                    // A section with a single chart spans the full row instead of
                    // leaving the other column empty on wide screens.
                    const chartCount = s.widgets.filter((w) => w.kind === "chart").length;
                    return (
                      <React.Fragment key={s.title}>
                        {showHeaders && <SectionHeader title={s.title} count={s.count} />}
                        {s.widgets.map((w) => {
                          const lone = w.kind === "chart" && chartCount === 1 && w.span !== "full";
                          return <Widget key={w.id} widget={lone ? { ...w, span: "full" } : w} scopeNote={scopeNote} />;
                        })}
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
              {pageCustom.length > 0 && (
                <>
                  <Divider style={{ margin: "20px 0 12px" }}>
                    <span style={{ fontSize: 12, color: "var(--tp-slate-400)" }}>Your widgets</span>
                  </Divider>
                  <div className="analytics-grid analytics-canvas">
                    {pageCustom.map((w) => (
                      <div key={w.id} style={{ position: "relative" }}>
                        <Widget widget={w} />
                        <Button type="text" danger className="analytics-widget-remove"
                          icon={<Trash size={13} />} onClick={() => handleRemoveCustom(w.id)} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
        </div>
      </div>

      <QueryBuilderDrawer
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onAdd={handleAddWidget}
        pageKey={leaf}
        doctorIds={effectiveDoctorIds}
      />
    </div>
    </ConfigProvider>
  );
}

function ReportsHub({ ipd = false }) {
  const [active, setActive] = useState(null);
  const sections = ipd ? IPD_REPORT_SECTIONS : REPORT_SECTIONS;
  const allCards = ipd ? IPD_REPORT_CARDS : REPORT_CARDS;
  return (
    <div className="analytics-reports-hub">
      {sections.map((s) => {
        const cards = allCards.filter((c) => c.section === s.id);
        if (!cards.length) return null;
        return (
          <section key={s.id} className="analytics-report-section">
            <h3 className="analytics-report-section-title">{s.label}</h3>
            <div className="analytics-reports-grid">
              {cards.map((r) => (
                <Card key={r.key} bordered={false} className="analytics-report-card">
                  <div className="analytics-report-head">
                    <span className="analytics-report-glyph">
                      {(() => { const RIcon = REPORT_ICON[r.key] || DocumentText; return <RIcon size={17} variant="Bulk" color="#8a4dbb" />; })()}
                    </span>
                    <span className="analytics-report-title">{r.title}</span>
                  </div>
                  <p className="analytics-report-desc">{r.desc}</p>
                  <Button className="analytics-report-dl" icon={<DocumentDownload size={14} />} onClick={() => setActive(r)}>
                    Download
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
      <ReportModal card={active} open={!!active} onClose={() => setActive(null)} />
    </div>
  );
}
