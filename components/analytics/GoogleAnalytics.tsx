"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { analyticsEnabled, gaMeasurementId, trackPageView } from "@/lib/analytics";

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPageView = useRef<string | null>(null);

  useEffect(() => {
    if (!analyticsEnabled) return;
    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    if (lastPageView.current === path) return;
    lastPageView.current = path;
    trackPageView(path);
  }, [pathname, searchParams]);

  if (!analyticsEnabled) return null;

  return (
    <>
      <Script id="shiftnote-ga-loader" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`} strategy="afterInteractive" />
      <Script id="shiftnote-ga-config" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};window.gtag('js',new Date());window.gtag('config','${gaMeasurementId}',{send_page_view:false});`}
      </Script>
    </>
  );
}
