import Image from "next/image"
import Link from "next/link"
import { Facebook, Instagram } from "lucide-react" // Import social icons

export default function Footer() {
  return (
    <footer className="bg-white border-t border-black/5">
      <div className="container mx-auto px-6 py-8">
        <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="font-serif text-lg font-semibold text-brand-text">RestoreClick</h3>
            <p className="text-sm text-brand-text/70 mt-2">Your Legacy, Perfectly Preserved.</p>
            {/* Social Media Icons for Footer */}
            <div className="flex justify-center md:justify-start space-x-4 mt-4">
              <a
                href="https://www.facebook.com/profile.php?id=61577050337101"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit our Facebook page"
                className="text-brand-text/70 hover:text-brand-cta transition-colors"
              >
                <Facebook className="h-6 w-6" />
              </a>
              <a
                href="https://www.instagram.com/restoreclick"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit our Instagram profile"
                className="text-brand-text/70 hover:text-brand-cta transition-colors"
              >
                <Instagram className="h-6 w-6" />
              </a>
            </div>
          </div>
          <div className="flex justify-center md:justify-start md:col-span-2 space-x-8 text-sm">
            <div className="flex flex-col space-y-2">
              <Link href="/our-story" className="text-brand-text/80 hover:text-brand-accent">
                Our Story
              </Link>
              <Link href="/restore-old-photos" className="text-brand-text/80 hover:text-brand-accent">
                Restore Photos
              </Link>
              <Link href="/faq" className="text-brand-text/80 hover:text-brand-accent">
                FAQ
              </Link>
            </div>
            <div className="flex flex-col space-y-2">
              <Link href="/contact" className="text-brand-text/80 hover:text-brand-accent">
                Contact
              </Link>
              <Link href="/privacy" className="text-brand-text/80 hover:text-brand-accent">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-brand-text/80 hover:text-brand-accent">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-black/5 flex flex-col sm:flex-row justify-between items-center text-xs text-brand-text/60">
          <p>
            &copy; {new Date().getFullYear()} RestoreClick. All Rights Reserved. The story of Lily and her grandmother
            is used to represent the heartfelt inspiration behind our service.
          </p>
          <div className="mt-4 sm:mt-0">
            <Image
              src="/placeholder.jpg"
              alt="Lily's signature"
              width={80}
              height={40}
              className="opacity-60"
            />
          </div>
        </div>
      </div>
    </footer>
  )
}
