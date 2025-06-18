import type { Metadata } from "next"
import FaqPageClient from "./FaqPageClient"

export const metadata: Metadata = {
  title: "FAQ | RestoreClick",
  description: "Find answers to frequently asked questions about RestoreClick's photo restoration service.",
}

export default function FAQPage() {
  return <FaqPageClient />
}
