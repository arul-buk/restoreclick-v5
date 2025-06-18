"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CreditCard, CheckCircle, AlertCircle } from "lucide-react"

export default function PaymentPageClient() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setPaymentStatus("idle")
    setErrorMessage(null)

    // Simulate a payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Simulate success or failure
    const success = Math.random() > 0.1 // 90% chance of success

    if (success) {
      setPaymentStatus("success")
      // Redirect to success page after a short delay
      setTimeout(() => {
        router.push("/payment-success")
      }, 1500)
    } else {
      setPaymentStatus("error")
      setErrorMessage("Payment failed. Please check your details or try again.")
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-brand-background min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl font-normal text-brand-text mb-2">Secure Checkout</h1>
          <p className="text-lg text-brand-text/70">Complete your order for museum-quality restorations.</p>
        </div>

        {/* Mock-up Disclaimer */}
        <Alert className="mb-8 border-brand-secondary bg-brand-secondary/10 text-brand-text">
          <AlertCircle className="h-5 w-5 text-brand-secondary" />
          <AlertTitle className="font-serif text-lg">This is a Mock Payment Page</AlertTitle>
          <AlertDescription className="text-brand-text/80">
            This page simulates a payment gateway for demonstration purposes only. No real transactions will occur.
            Clicking "Pay Now" will simulate a successful payment and redirect you.
          </AlertDescription>
        </Alert>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-text">
              <CreditCard className="h-6 w-6" /> Payment Details
            </CardTitle>
            <CardDescription className="text-brand-text/70">
              Enter your card information to complete your purchase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              {/* Card Details */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input id="cardNumber" type="text" placeholder="•••• •••• •••• ••••" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input id="expiryDate" type="text" placeholder="MM/YY" required />
                  </div>
                  <div>
                    <Label htmlFor="cvc">CVC</Label>
                    <Input id="cvc" type="text" placeholder="•••" required />
                  </div>
                </div>
              </div>

              {/* Billing Information */}
              <div className="space-y-4">
                <h3 className="font-serif text-xl font-medium text-brand-text">Billing Information</h3>
                <div>
                  <Label htmlFor="cardholderName">Cardholder Name</Label>
                  <Input id="cardholderName" type="text" placeholder="John Doe" required />
                </div>
                <div>
                  <Label htmlFor="billingAddress">Billing Address</Label>
                  <Input id="billingAddress" type="text" placeholder="123 Main St" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" type="text" placeholder="Anytown" required />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">Zip Code</Label>
                    <Input id="zipCode" type="text" placeholder="12345" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" type="text" placeholder="United States" required />
                </div>
              </div>

              {/* Payment Status */}
              {paymentStatus === "success" && (
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Payment Successful!</AlertTitle>
                  <AlertDescription>Redirecting to your restored photos...</AlertDescription>
                </Alert>
              )}
              {paymentStatus === "error" && errorMessage && (
                <Alert className="bg-red-50 border-red-200 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Payment Failed</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full py-3 text-lg" disabled={isProcessing}>
                {isProcessing ? "Processing Payment..." : "Pay Now"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
