"use client"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"

const testimonials = [
  {
    id: 1,
    quote:
      "Seeing my grandmother's wedding photo, perfectly restored, brought tears to my eyes. It was like reliving that precious moment. RestoreClick truly gave me back a piece of my family's soul.",
    name: "Elena Rodriguez",
    location: "Austin, Texas",
    imageSrc: "/images/midlady.png",
    supportingImageSrc: "/images/midwoman.jpg", // Updated image
  },
  {
    id: 2,
    quote:
      "My father's military portrait from 1943 was severely damaged by water and time. The restoration brought back not just the image, but the dignity and pride in his eyes. It's now the centerpiece of our family room.",
    name: "George Wilson",
    location: "Nottingham, England",
    imageSrc: "/images/armyson.png",
    supportingImageSrc: "/images/armyfather.jpg",
  },
  {
    id: 3,
    quote:
      "Three generations of women in one photograph, nearly lost forever. RestoreClick's artisans didn't just restore the colors—they restored our connection to our heritage. Absolutely priceless work.",
    name: "Jarrah Williams",
    location: "Melbourne, Australia",
    imageSrc: "/images/lady.png",
    supportingImageSrc: "/images/3gen.jpg",
  },
]

export default function FeaturedTestimonialSection() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const currentTestimonial = testimonials[currentIndex]

  return (
    <section className="py-32 bg-brand-secondary/5">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto relative">
          <div className="grid lg:grid-cols-12 gap-16 items-center transition-all duration-700 ease-in-out">
            {/* Quote */}
            <div className="lg:col-span-8 space-y-8 transition-opacity duration-500">
              <blockquote className="font-serif text-3xl lg:text-4xl font-normal text-brand-text leading-tight transition-all duration-500">
                {currentTestimonial.quote}
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  <Image
                    src={currentTestimonial.imageSrc || "/placeholder.svg"}
                    alt={currentTestimonial.name}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-brand-text">{currentTestimonial.name}</p>
                  <p className="text-brand-text/60">{currentTestimonial.location}</p>
                </div>
              </div>
            </div>

            {/* Supporting Image */}
            <div className="lg:col-span-4">
              <div className="relative aspect-[3/4] w-full transition-all duration-500">
                <Image
                  src={currentTestimonial.supportingImageSrc || "/placeholder.svg"}
                  alt={`Restored photograph for ${currentTestimonial.name}`}
                  fill
                  className="object-cover rounded-lg shadow-soft transition-opacity duration-500"
                />
              </div>
            </div>
          </div>

          {/* Carousel Controls */}
          <div className="flex justify-center items-center gap-4 mt-12">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevTestimonial}
              className="rounded-full border border-brand-text/20 hover:border-brand-text/40"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Dots indicator */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? "bg-brand-cta" : "bg-brand-text/20"}`}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={nextTestimonial}
              className="rounded-full border border-brand-text/20 hover:border-brand-text/40"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
