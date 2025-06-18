import Image from "next/image"
import Link from "next/link"

export default function StoryIntroSection() {
  return (
    <section className="py-32">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          {/* Left side - Story text */}
          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-8">
              <h2 className="font-serif text-4xl lg:text-5xl font-normal text-brand-text leading-tight">
                It began with a single photograph—
                <br />
                my grandfather's portrait, fading away.
              </h2>
              <div className="w-32 h-px bg-brand-secondary"></div>
              <p className="text-xl leading-relaxed text-brand-text/80 max-w-3xl">
                What started as a personal mission to save one precious memory became RestoreClick. Every photograph
                tells a story, holds a moment, preserves a legacy. Our role is simply to ensure these stories continue
                to be told, in all their original beauty.
              </p>
            </div>
            <Link
              href="/our-story"
              className="inline-block text-brand-accent hover:text-brand-accent/80 text-lg font-medium border-b border-brand-accent/30 hover:border-brand-accent/60 transition-colors pb-1"
            >
              Read the full story
            </Link>
          </div>

          {/* Right side - Story image */}
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src="/images/hero-background.jpg"
                alt="Hands exchanging an old, damaged photograph"
                fill
                className="object-cover rounded-lg shadow-soft"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
