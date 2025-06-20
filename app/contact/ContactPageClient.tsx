"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { trackFormSubmission, trackPageView, trackError } from '@/lib/analytics';

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle } from "lucide-react"
import Image from "next/image" // Import Image component

export default function ContactPageClient() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  })
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    trackPageView('Contact Page')
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus("submitting")
    setErrorMessage(null)

    // Basic validation
    if (!formData.name || !formData.email || !formData.message) {
      setErrorMessage("Please fill in all fields.")
      setStatus("error")
      return
    }

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate network delay
      console.log("Form submitted:", formData)
      trackFormSubmission('Contact Form', true)
      setStatus("success")
      setFormData({ name: "", email: "", message: "" }) // Clear form
    } catch (error) {
      console.error("Contact form submission failed:", error)
      trackError('Contact Form Submission Failed', error instanceof Error ? error.message : 'Unknown error')
      trackFormSubmission('Contact Form', false)
      setErrorMessage("Failed to send message. Please try again later.")
      setStatus("error")
    }
  }

  return (
    <div className="bg-brand-background text-brand-text min-h-screen py-16 pt-28">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Column: Image */}
          <div className="lg:sticky lg:top-28">
            <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden shadow-soft">
              <Image
                src="/placeholder.jpg"
                alt="Lily at work, smiling warmly"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Right Column: Content and Form */}
          <div>
            <header className="mb-8">
              <h1 className="font-serif text-4xl lg:text-5xl font-normal text-brand-text mb-4">We&apos;re Here to Help</h1>
              <p className="text-xl text-brand-text/80 leading-relaxed">
                Whether you have a question about your photo, need help with an order, or just want to share a memory,
                we read every message and would love to hear from you. Our small team will get back to you within one
                business day.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-soft">
              <div>
                <Label htmlFor="name" className="text-brand-text">
                  Your Name
                </Label>
                <Input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 bg-brand-background border-brand-text/20 focus:border-brand-cta focus:ring-brand-cta"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-brand-text">
                  Your Email
                </Label>
                <Input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 bg-brand-background border-brand-text/20 focus:border-brand-cta focus:ring-brand-cta"
                  required
                />
              </div>
              <div>
                <Label htmlFor="message" className="text-brand-text">
                  Your Message
                </Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  className="mt-1 bg-brand-background border-brand-text/20 focus:border-brand-cta focus:ring-brand-cta"
                  required
                />
              </div>

              {status === "success" && (
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Success!</AlertTitle>
                  <AlertDescription>Your message has been sent. We&apos;ll get back to you soon.</AlertDescription>
                </Alert>
              )}

              {status === "error" && errorMessage && (
                <Alert className="bg-red-50 border-red-200 text-red-800">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Error!</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-brand-cta hover:bg-brand-cta/90 py-3 text-lg"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? "Sending..." : "Send Your Message"}
              </Button>
            </form>

            <div className="mt-8 text-center lg:text-left">
              <h3 className="font-serif text-xl font-semibold text-brand-text mb-2">Other Ways to Reach Us</h3>
              <p className="text-lg text-brand-text/80">
                If you prefer, you can also send us an email directly at{" "}
                <a href="mailto:lily@restore.click" className="text-brand-cta hover:underline">
                  lily@restore.click
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
