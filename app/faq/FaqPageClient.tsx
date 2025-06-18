"use client"
import { useState, useMemo } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input" // Import Input component
import { Search } from "lucide-react" // Import Search icon

const faqItems = [
  {
    value: "item-1",
    question: "What types of damage can RestoreClick repair?",
    answer:
      "We can repair a wide range of damage including scratches, tears, creases, water damage, mold, fading, discoloration, and even missing sections. Our digital artisans use advanced techniques to bring your photos back to life.",
  },
  {
    value: "item-2",
    question: "How do I submit my photos for restoration?",
    answer:
      "You can easily upload your photos through our secure online portal on the 'Restore Your Photos' page. We accept various digital formats like JPG, PNG, TIFF, and BMP.",
  },
  {
    value: "item-3",
    question: "What is the turnaround time for restoration?",
    answer:
      "The turnaround time depends on the complexity of the restoration and the number of photos. We strive for efficiency without compromising quality. You will receive an estimated completion time after your initial assessment.",
  },
  {
    value: "item-4",
    question: "How will I receive my restored photos?",
    answer:
      "Once restored, your photos will be delivered as high-resolution digital files via a secure download link. We also offer options for physical prints or albums upon request.",
  },
  {
    value: "item-5",
    question: "What is your satisfaction guarantee?",
    answer:
      "We are committed to your complete satisfaction. If you're not happy with the restoration results, we will work with you to make revisions until you are delighted, or offer a full refund.",
  },
  {
    value: "item-6",
    question: "Is my original photo safe during the process?",
    answer:
      "Yes, absolutely. We only work with high-resolution digital scans of your original photos. Your physical originals are never altered and are treated with the utmost care and security if you send them to us.",
  },
  {
    value: "item-7",
    question: "Can you restore black and white photos?",
    answer:
      "Yes, we specialize in restoring black and white photos, including enhancing contrast, repairing damage, and even colorizing them if you wish to bring them to life with accurate hues.",
  },
  {
    value: "item-8",
    question: "What is the cost of photo restoration?",
    answer:
      "Our pricing is transparent and typically based on the extent of damage and the number of photos. Please visit our 'Restore Your Photos' page for detailed pricing information or to get a custom quote.",
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
        item.answer.toLowerCase().includes(lowercasedSearchTerm),
    )
  }, [searchTerm])

  return (
    <div className="bg-brand-background text-brand-text min-h-screen py-16 pt-28">
      <div className="container mx-auto px-6 max-w-3xl">
        <header className="text-center mb-12">
          <h1 className="font-serif text-4xl lg:text-5xl font-normal text-brand-text mb-4">
            Answers to your Questions
          </h1>
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
                <AccordionTrigger>{item.question}</AccordionTrigger>
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
