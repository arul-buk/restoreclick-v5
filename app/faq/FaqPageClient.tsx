"use client"
import { useState, useMemo, useEffect } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input" // Import Input component
import { Search } from "lucide-react" // Import Search icon
import Link from "next/link"
import React from "react"
import { trackPageView, trackEngagement } from '@/lib/analytics';

interface FaqItem {
  value: string;
  question: string;
  answer: string | React.ReactNode;
}

const faqItems: FaqItem[] = [
  {
    value: "item-1",
    question: "What exactly does RestoreClick do?",
    answer:
      "We use advanced digital technology to bring your old, faded, or damaged photographs back to life! We restore vibrant colors, sharpen blurry details, and fix tears or creases, making your cherished memories look as clear and beautiful as the day they were taken.",
  },
  {
    value: "item-2",
    question: "How do I send you my photo for restoration?",
    answer: (
      <>
        It&apos;s very simple! On our homepage, click the {" "}
        <Link href="/restore-old-photos" className="text-brand-cta hover:underline">
          Add Your Photo
        </Link>{" "}
        button to select a picture directly from your computer or phone. If you have a physical printed photo, simply take a clear, steady picture of it with your phone or digital camera and send us that digital photo.
      </>
    ),
  },
  {
    value: "item-3",
    question: "How long does it take to get my restored photo back?",
    answer:
      "Our restorations are very quick! Once you submit your photo, our smart technology begins working instantly. You will typically receive an email with your beautifully restored photo, ready to view and download, within 24 hours.",
  },
  {
    value: "item-4",
    question: "What types of photos can you restore?",
    answer:
      "We can restore almost any type of old photo! This includes faded color prints, old black-and-white photographs, sepia-toned pictures, and even photos with creases, tears, or spots. If it's a cherished memory, we'd love to help bring it back to life.",
  },
  {
    value: "item-5",
    question: "How will I receive my restored photo?",
    answer:
      "We will send your beautifully restored photo (and the original too, for comparison!) directly to your email address. They will be included as attachments, making them easy for you to save and keep.",
  },
  {
    value: "item-6",
    question: "Can I get a physical print of my restored photo?",
    answer:
      "We specialize in creating high-quality digital versions of your restored photos. You'll receive a digital file that you can save, share with family, or print yourself at any local photo shop or online printing service. This gives you the freedom to print it as many times as you like, in any size!",
  },
  {
    value: "item-7",
    question: "What if I'm not happy with the restored photo?",
    answer:
      "Your happiness is our top priority! If for any reason you are not completely satisfied, simply reply to the email in which you received the photos and tell us what you'd like to adjust. Our team will manually work on the image to fine-tune it for you. We genuinely will not let you go unhappy!",
  },
  {
    value: "item-8",
    question: "What if I'm still not happy after you've tried to fix it?",
    answer:
      "We are committed to your complete satisfaction. In the rare event that you are still not happy after our team has manually adjusted the photo, we will provide you with a full refund, no questions asked. We believe your memories are priceless, and you should only pay if you are truly delighted.",
  },
  {
    value: "item-9",
    question: "How much does it cost, and are there any hidden fees?",
    answer: (
      <>
        Our pricing is simple and clear, as visible on the {" "}
        <Link href="/restore-old-photos" className="text-brand-cta hover:underline">
          Restore Your Photos
        </Link>{" "}
        page. There are absolutely no hidden fees, subscriptions, or extra charges. You pay once for each photo you want restored.
        <p className="text-lg text-brand-text/80">Can&apos;t find the answer you&apos;re looking for? Reach out to our <a href="/contact" className="text-brand-cta hover:underline">customer support</a> team.</p>
      </>
    ),
  },
  {
    value: "item-10",
    question: "How do I pay for my restoration?",
    answer:
      "Our payment process is secure and straightforward. After you&apos;ve uploaded your photo, you&apos;ll be guided to a simple payment screen where you can securely use your credit or debit card.",
  },
  {
    value: "item-11",
    question: "How do I contact you if I have a question or need help?",
    answer:
      "We&apos;re always here to help! You can send an email directly to Lily (our founder!) and her friendly team at Lily@restore.click. We aim to respond to all inquiries quickly and personally.",
  },
  {
    value: "item-12",
    question: "Are my old photos safe with RestoreClick?",
    answer:
      "Absolutely. We treat your precious memories with the utmost care and respect. Your photos are handled with secure technology and are always kept private. We focus solely on restoring your image and will never share your photos with anyone.",
  },
]


export default function FaqPageClient() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredFaqItems = useMemo(() => {
    if (!searchTerm) {
      return faqItems
    }
    const lowercasedSearchTerm = searchTerm.toLowerCase()
    return faqItems.filter(
      (item) =>
        item.question.toLowerCase().includes(lowercasedSearchTerm) ||
        (typeof item.answer === "string" &&
          item.answer.toLowerCase().includes(lowercasedSearchTerm)),
    )
  }, [searchTerm])

  useEffect(() => {
    trackPageView('/faq');
  }, []);

  return (
    <div className="bg-brand-background text-brand-text min-h-screen py-16 pt-28">
      <div className="container mx-auto px-6 max-w-3xl">
        <header className="text-center mb-12">
          <h1 className="font-serif text-4xl lg:text-5xl font-normal text-brand-text mb-4">Frequently Asked Questions</h1>
          <div className="w-32 h-px bg-brand-secondary mx-auto mb-6"></div>
          <p className="text-xl text-brand-text/80 max-w-2xl mx-auto leading-relaxed">
            You probably have a few questions, and that's perfectly normal! Here are some answers to things people often ask about our restoration process, pricing, and how we handle your precious photos.

          </p>
        </header>

        {/* Search Input */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-text/60" />
          <Input
            type="text"
            placeholder="Search FAQs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md border border-brand-text/20 bg-white focus:border-brand-cta focus:ring-brand-cta text-lg"
          />
        </div>

        {filteredFaqItems.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {filteredFaqItems.map((item) => (
              <AccordionItem key={item.value} value={item.value}>
                <AccordionTrigger 
                  onClick={() => trackEngagement('faq_expand', { question: item.question })}
                >
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center text-xl text-brand-text/70 mt-12">
            No matching questions found. Please try a different search term.
          </div>
        )}
      </div>
    </div>
  )
}
