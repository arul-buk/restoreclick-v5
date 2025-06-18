import type { Metadata } from "next"
import PaymentPageClient from "./PaymentPageClient"

export const metadata: Metadata = {
  title: "Secure Payment | RestoreClick",
  description: "Complete your secure payment for photo restoration services.",
}

export default function PaymentPage() {
  return <PaymentPageClient />
}
