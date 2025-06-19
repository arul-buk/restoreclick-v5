"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Image from "next/image";
import { Facebook, Instagram, Menu } from "lucide-react" // Import Menu icon

interface FloatingHeaderProps {
  setIsMobileMenuOpen: (isOpen: boolean) => void // Prop to control mobile menu state
}

export default function FloatingHeader({ setIsMobileMenuOpen }: FloatingHeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out translate-y-0 opacity-100"
    >
      <div className="bg-background border-b border-brand-text/10 shadow-soft">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <Image src="/images/logo-no-slogan.png" alt="RestoreClick Logo" width={150} height={40} priority />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/our-story" className="text-brand-text hover:text-brand-cta transition-colors font-medium">
                Our Story
              </Link>
              <Link
                href="/#how-it-works"
                className="text-brand-text hover:text-brand-cta transition-colors font-medium"
              >
                How It Works
              </Link>
              <Link href="/faq" className="text-brand-text hover:text-brand-cta transition-colors font-medium">
                FAQ
              </Link>
              <Link href="/blog" className="text-brand-text hover:text-brand-cta transition-colors font-medium">
                Blog
              </Link>
            </nav>
          </div>

          {/* CTA & Mobile Menu Trigger */}
          <div className="flex items-center space-x-4">
            {/* Social Media Icons for Desktop */}
            <div className="hidden sm:flex items-center space-x-3">
              <a
                href="https://www.facebook.com/profile.php?id=61577050337101"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit our Facebook page"
                className="text-brand-text/70 hover:text-brand-cta transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/restoreclick"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit our Instagram profile"
                className="text-brand-text/70 hover:text-brand-cta transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
            <Button asChild className="hidden sm:flex shadow-soft hover:shadow-soft-md">
              <Link href="/restore-old-photos">Preserve your Memories</Link>
            </Button>
            {/* Mobile menu button - re-added here */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)} // Open menu on click
              className="md:hidden"
              aria-label="Open mobile menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
