import { useEffect, useState } from "react";
import { loadSection, loadLeaf } from "./service";

/**
 * Loads the widgets for a sidebar leaf. Routing (PAGE_MAP rich builders vs
 * Analytics-API dashboards vs placeholder) lives in service.loadLeaf.
 * Refetches on leaf / date-range / scope / refresh changes.
 */
export function useAnalyticsPage(leaf, startDate, endDate, doctorIds = [], refreshNonce = 0, extra = {}) {
  const [state, setState] = useState({ loading: true, error: null, widgets: [] });
  const doctorKey = (doctorIds || []).join(",");
  // Extra per-leaf filters (e.g. { gender }) — serialize for the dependency check.
  const extraKey = JSON.stringify(extra || {});

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    loadLeaf(leaf, { startDate, endDate, doctorIds, ...extra })
      .then((widgets) => {
        if (!cancelled) setState({ loading: false, error: null, widgets });
      })
      .catch((err) => {
        if (!cancelled)
          setState({ loading: false, error: err?.message || "Failed to load analytics", widgets: [] });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaf, startDate, endDate, doctorKey, refreshNonce, extraKey]);

  return state;
}

/**
 * Loads widget descriptors for the active (careSetting × section × dateRange).
 * Refetches whenever any of those change. Cancels stale responses.
 */
export function useAnalyticsData(
  careSetting,
  section,
  startDate,
  endDate,
  doctorIds = [],
  refreshNonce = 0,
  useApi = false
) {
  const [state, setState] = useState({ loading: true, error: null, widgets: [] });
  const doctorKey = (doctorIds || []).join(",");

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    loadSection(careSetting, section, { startDate, endDate, doctorIds }, useApi)
      .then((widgets) => {
        if (!cancelled) setState({ loading: false, error: null, widgets });
      })
      .catch((err) => {
        if (!cancelled)
          setState({ loading: false, error: err?.message || "Failed to load analytics", widgets: [] });
      });
    return () => {
      cancelled = true;
    };
    // doctorKey captures doctorIds content for the dependency check
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [careSetting, section, startDate, endDate, doctorKey, refreshNonce, useApi]);

  return state;
}
