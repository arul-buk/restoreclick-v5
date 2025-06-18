import type { Metadata } from "next"
import ContactPageClient from "./ContactPageClient"

// Metadata for the page (can be exported from a server component or layout)
export const metadata: Metadata = {
  title: "Contact Us | RestoreClick",
  description: "Get in touch with RestoreClick for inquiries about photo restoration services.",
}

export default function ContactPage() {
  return <ContactPageClient />
}
