/**
 * @file This component is responsible for injecting the Google Tag Manager script into the application.
 * It reads its configuration from the centralized public config file.
 */

"use client";

import { publicConfig } from "@/lib/config.public";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Pushes a 'pageview' event to the GTM data layer.
 */
const pageview = (url: string) => {
  if (typeof window.dataLayer !== "undefined") {
    window.dataLayer.push({
      event: "pageview",
      page: url,
    });
  }
};

const GoogleTagManager = (): React.ReactNode => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const gtmId = publicConfig.gtm.id;

  useEffect(() => {
    if (gtmId) {
      const url = pathname + searchParams.toString();
      pageview(url);
    }
  }, [pathname, searchParams, gtmId]);
  
  // --- CRITICAL RETURN PATH 1 ---
  // If there is no GTM ID, we must explicitly return null.
  // This satisfies one possible code path.
  if (!gtmId) {
    return null;
  }

  // --- CRITICAL RETURN PATH 2 ---
  // If there IS a GTM ID, we must explicitly return the <Script> component.
  // This satisfies the other possible code path.
  return (
    <>
      <Script
        id="google-tag-manager"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');
`,
        }}
      />
    </>
  );
};

export default GoogleTagManager;