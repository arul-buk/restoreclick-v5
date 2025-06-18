"use client"
import { X } from "lucide-react" // Only X is needed here, Menu is in FloatingHeader
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface MobileMenuProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

export default function MobileMenu({ isOpen, setIsOpen }: MobileMenuProps) {
  const closeMenu = () => setIsOpen(false)

  return (
    <>
      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[998] md:hidden">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={closeMenu} />
          <div className="fixed top-0 right-0 h-full w-64 bg-white border-l border-brand-text/10 shadow-xl z-[999]">
            <div className="flex flex-col p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="font-serif text-xl font-bold text-brand-text">Menu</div>
                <Button variant="ghost" size="icon" onClick={closeMenu}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="flex flex-col space-y-4">
                <Link
                  href="/our-story"
                  onClick={closeMenu}
                  className="text-brand-text hover:text-brand-cta transition-colors font-medium py-2"
                >
                  Our Story
                </Link>
                <Link
                  href="/restore-old-photos"
                  onClick={closeMenu}
                  className="text-brand-text hover:text-brand-cta transition-colors font-medium py-2"
                >
                  How It Works
                </Link>
                <Link
                  href="/faq"
                  onClick={closeMenu}
                  className="text-brand-text hover:text-brand-cta transition-colors font-medium py-2"
                >
                  FAQ
                </Link>
                <Link
                  href="/contact"
                  onClick={closeMenu}
                  className="text-brand-text hover:text-brand-cta transition-colors font-medium py-2"
                >
                  Contact
                </Link>
                <Link
                  href="/blog"
                  onClick={closeMenu}
                  className="text-brand-text hover:text-brand-cta transition-colors font-medium py-2"
                >
                  Blog
                </Link>
                <Link
                  href="/privacy"
                  onClick={closeMenu}
                  className="text-brand-text hover:text-brand-cta transition-colors font-medium py-2"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  onClick={closeMenu}
                  className="text-brand-text hover:text-brand-cta transition-colors font-medium py-2"
                >
                  Terms
                </Link>
              </nav>

              <div className="pt-4 border-t border-brand-text/10">
                <Button asChild className="w-full" onClick={closeMenu}>
                  <Link href="/restore-old-photos">Begin Your Restoration</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
