"use client";

import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";
import { analyticsEnabled, gaMeasurementId } from "@/lib/analytics";

export function GoogleAnalytics() {
  if (!analyticsEnabled) return null;
  return <NextGoogleAnalytics gaId={gaMeasurementId} />;
}
