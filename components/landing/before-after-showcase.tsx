import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"

const examples = [
  {
    id: 1,
    beforeSrc: "/placeholder.jpg",
    afterSrc: "/placeholder.jpg", // Updated to use the provided restored image
    alt: "Vintage couple in car with scratches",
    description: "Scratches and wear removed from a cherished vintage car photo.",
  },
  {
    id: 2,
    beforeSrc: "/placeholder.jpg",
    afterSrc:
      "/placeholder.jpg" /* query="restored family portrait, color corrected from magenta tint, vibrant and clear" */,
    alt: "Family portrait with magenta tint",
    description: "Color corrected and enhanced from a faded magenta tint.",
  },
  {
    id: 3,
    beforeSrc: "/placeholder.jpg",
    afterSrc:
      "/placeholder.jpg" /* query="restored graduation photo, vibrant colors, clear faces, no fading" */,
    alt: "Graduation photo with fading",
    description: "Fading and discoloration reversed for a vibrant graduation memory.",
  },
  {
    id: 4,
    beforeSrc: "/placeholder.jpg",
    afterSrc:
      "/placeholder.jpg" /* query="restored birthday photo, creases and tears removed, vibrant colors" */,
    alt: "Birthday photo with severe fold",
    description: "Creases and tears seamlessly repaired from a folded birthday photo.",
  },
  {
    id: 5,
    beforeSrc: "/placeholder.jpg",
    afterSrc:
      "/placeholder.jpg" /* query="restored child portrait, scribbles removed, clear and natural" */,
    alt: "Child's portrait with scribbles",
    description: "Unwanted scribbles removed, revealing the original portrait.",
  },
  {
    id: 6,
    beforeSrc: "/placeholder.jpg",
    afterSrc:
      "/placeholder.jpg" /* query="restored wedding photo, stains removed, pristine condition" */,
    alt: "Wedding photo with large stain",
    description: "Large stains and damage meticulously removed from a wedding photo.",
  },
  {
    id: 7,
    beforeSrc: "/placeholder.jpg",
    afterSrc:
      "/placeholder.jpg" /* query="restored torn family portrait, seamlessly repaired, no visible tears" */,
    alt: "Torn family portrait",
    description: "Tears and tape marks expertly removed, restoring family unity.",
  },
  {
    id: 8,
    beforeSrc: "/placeholder.jpg",
    afterSrc:
      "/placeholder.jpg" /* query="restored family group photo, dust and spots removed, clear and sharp" */,
    alt: "Family group photo with dust spots",
    description: "Dust, spots, and noise eliminated for a clear family photo.",
  },
]

export default function BeforeAfterShowcase() {
  return (
    <section className="py-16 md:py-24 bg-brand-background">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-center text-brand-text mb-16">
          From Faded to Flawless
        </h2>
        <p className="text-center text-lg text-brand-text/80 max-w-2xl mx-auto mb-12">
          Witness the transformative power of our digital artisans. We breathe new life into your cherished memories. An
          interactive slider component would be ideal here.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {examples.map((example) => (
            <Card
              key={example.id}
              className="overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 bg-white"
            >
              <CardContent className="p-0">
                <div className="grid grid-cols-2">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={example.beforeSrc || "/placeholder.svg"}
                      alt={`Before: ${example.alt}`}
                      layout="fill"
                      objectFit="cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 text-xs rounded">
                      BEFORE
                    </div>
                  </div>
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={example.afterSrc || "/placeholder.svg"}
                      alt={`After: ${example.alt}`}
                      layout="fill"
                      objectFit="cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-brand-accent text-white px-2 py-1 text-xs rounded">
                      AFTER
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-brand-text/70">{example.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
