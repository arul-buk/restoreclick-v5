import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function GentleInvitationSection() {
  return (
    <section className="py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="space-y-8">
            <h2 className="font-serif text-4xl lg:text-5xl font-normal text-brand-text leading-tight">
              Your memories deserve
              <br />
              this level of care.
            </h2>
            <div className="w-32 h-px bg-brand-secondary mx-auto"></div>
            <p className="text-xl leading-relaxed text-brand-text/80 max-w-2xl mx-auto">
              Every photograph holds irreplaceable moments. Let us help you preserve them with the attention and
              artistry they deserve.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <a href="/restore-old-photos">Begin Your Restoration</a>
            </Button>
            <Button variant="link" className="text-lg" asChild>
              <a href="/our-story">Learn About Our Process</a>
            </Button>
          </div>

          {/* Subtle decorative element */}
          <div className="pt-16">
            <div className="relative w-32 h-32 mx-auto opacity-20">
              <Image
                src="/placeholder.svg"
                alt="Vintage camera illustration"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
