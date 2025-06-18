import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image" // Import Image

export default function FounderStorySection() {
  return (
    <section className="py-16 md:py-24 bg-brand-background">
      <div className="container mx-auto px-6 text-center max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-brand-text mb-6">The Story Behind the Craft</h2>
        <p className="text-lg text-brand-text/80 leading-relaxed mb-8">
          RestoreClick began not as a business, but as a mission to save a single, fading photograph. This personal
          pursuit of perfection became the foundation of our white-glove service.
        </p>
        {/* New: Lily's portrait */}
        <div className="relative w-32 h-32 mx-auto mb-8 rounded-full overflow-hidden shadow-soft">
          <Image src="/images/lily-founder.jpg" alt="Lily, RestoreClick Founder" fill className="object-cover" />
        </div>
        <Button variant="link" asChild className="text-brand-accent text-lg hover:text-brand-accent/80">
          <Link href="/our-story">Read Our Founder's Story →</Link>
        </Button>
      </div>
    </section>
  )
}
