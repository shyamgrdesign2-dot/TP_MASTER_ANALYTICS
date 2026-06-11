import api from "./axiosService";
import config from "../../config";
import { DEMO, getFixture } from "../../pages/analytics/demo/demoApi";

// Client for the dedicated Analytics microservice (Node/NestJS + read replica).
// Contract: docs/analytics-planning/Analytics_API_Spec.md. Hospital scope is
// injected server-side from the JWT; axiosService attaches the Bearer token.
// The interceptor returns response.data, so every method resolves to the
// universal { columns, rows, meta } envelope (or a dashboards/array payload).
// Base URL: a localStorage override (set to a local mock server for dev/
// integration) wins over the env-configured analytics_api_url.
const base = () => {
  let override = null;
  try { override = typeof localStorage !== "undefined" && localStorage.getItem("tp_analytics_api_url"); } catch (e) { override = null; }
  if (override) return { customBaseUrl: override };
  // Dev convenience: when the EMR is served from localhost, talk to the local
  // analytics service (npm run start:dev on :4000) automatically — no localStorage
  // needed. In every other environment use the env-configured analytics_api_url.
  try {
    if (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
      return { customBaseUrl: "http://localhost:4000" };
    }
  } catch (e) { /* ignore */ }
  return { customBaseUrl: config.analytics_api_url };
};
const baseUrl = base();

const toQuery = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v == null || v === "") return;
    if (Array.isArray(v)) v.forEach((item) => sp.append(k, item));
    else sp.append(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
};

const ApiAnalytics = {};

// Generic query engine (PRD §8 / spec §2.1)
ApiAnalytics.runQuery = (query) =>
  api.post(`/api/v1/analytics/query`, query, base());

// Named report / dashboard endpoints — e.g. report("clinical/diagnosis", {...})
// DEMO build: resolve from the bundled anonymized fixtures — no HTTP at all.
ApiAnalytics.report = (path, params) => {
  if (DEMO) {
    try {
      return Promise.resolve(getFixture(path, params));
    } catch (e) {
      return Promise.reject(e);
    }
  }
  return api.get(`/api/v1/analytics/${path}${toQuery(params)}`, base());
};

// Saved dashboards (Builder — spec §2.3)
ApiAnalytics.listDashboards = () =>
  api.get(`/api/v1/analytics/dashboards`, baseUrl);
ApiAnalytics.saveDashboard = (dashboard) =>
  api.post(`/api/v1/analytics/dashboards`, dashboard, baseUrl);

// Server-side export (spec §2.4)
ApiAnalytics.exportData = (query, fmt = "xlsx") =>
  api.post(`/api/v1/analytics/export?fmt=${fmt}`, query, baseUrl);

export default ApiAnalytics;
