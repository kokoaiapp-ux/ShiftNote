"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { analyticsEnabled, gaMeasurementId, trackOnce, trackPageView } from "@/lib/analytics";

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  useEffect(() => {
    if (!analyticsEnabled) return;
    trackPageView(query ? `${pathname}?${query}` : pathname);
    if (pathname === "/onboarding") trackOnce("onboarding-started", "onboarding_started");
  }, [pathname, query]);
  if (!analyticsEnabled) return null;
  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`} strategy="afterInteractive" />
    <Script id="shiftnote-ga4" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', '${gaMeasurementId}', { send_page_view: false });
    `}</Script>
  </>;
}
