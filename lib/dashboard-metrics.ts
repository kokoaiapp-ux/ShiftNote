export const DASHBOARD_METRICS_CHANGED = "shiftnote:dashboard-metrics-changed";

export function notifyDashboardMetricsChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DASHBOARD_METRICS_CHANGED));
}
