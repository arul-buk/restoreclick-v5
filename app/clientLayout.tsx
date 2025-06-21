"use client"

import type React from "react"
import { useState, Suspense } from "react"
import Footer from "@/components/shared/footer"
import SmoothScrollNav from "@/components/shared/smooth-scroll-nav"
import FloatingHeader from "@/components/shared/floating-header"
import MobileMenu from "@/components/shared/mobile-menu"
import { usePathname } from "next/navigation"
import GoogleTagManager from "@/components/analytics/GoogleTagManager"; // Import GTM
import PWAServiceWorkerRegister from "@/components/PWAServiceWorkerRegister"; // Import PWA
import { ConnectionStatusProvider } from "@/lib/context/ConnectionStatusContext";
import OfflineOverlay from "@/components/OfflineOverlay";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Determine if auto-hide should be enabled for specific pages
  const shouldAutoHide = pathname === '/payment-success' || pathname.startsWith('/blog')

  return (
    <ConnectionStatusProvider>
      {/* The OfflineOverlay sits here, on top of everything but inside the provider */}
      <OfflineOverlay />
      
      <Suspense fallback={null}>
        <GoogleTagManager />
      </Suspense>
      <PWAServiceWorkerRegister />
      <FloatingHeader setIsMobileMenuOpen={setIsMobileMenuOpen} autoHide={shouldAutoHide} />
      {children}
      {pathname === "/" && <SmoothScrollNav />}
      <MobileMenu isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      <Footer />
    </ConnectionStatusProvider>
  )
}
