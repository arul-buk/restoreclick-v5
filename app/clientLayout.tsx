"use client"

import type React from "react"
import { useState } from "react"
import { Nunito_Sans, Lora } from "next/font/google"
import "./globals.css"
import Footer from "@/components/shared/footer"
import SmoothScrollNav from "@/components/shared/smooth-scroll-nav"
import FloatingHeader from "@/components/shared/floating-header"
import MobileMenu from "@/components/shared/mobile-menu"
import { usePathname } from "next/navigation"
import GoogleTagManager from "@/components/analytics/GoogleTagManager"; // Import GTM
import PWAServiceWorkerRegister from "@/components/PWAServiceWorkerRegister"; // Import PWA

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  weight: ["400", "600", "700"],
})

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  weight: ["400", "500", "600", "700"],
})

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <html lang="en" className={`${nunitoSans.variable} ${lora.variable}`}>
      <body> {/* Removed font-sans here, it's applied in globals.css to body */}
        <GoogleTagManager />
        <PWAServiceWorkerRegister />
        <FloatingHeader setIsMobileMenuOpen={setIsMobileMenuOpen} />
        {children}
        {pathname === "/" && <SmoothScrollNav />}
        <MobileMenu isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
        <Footer />
      </body>
    </html>
  )
}
