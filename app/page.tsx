import type { Metadata } from "next"
import EditorialHeroSection from "@/components/landing/editorial-hero-section"
import StoryIntroSection from "@/components/landing/story-intro-section"
import CraftShowcaseSection from "@/components/landing/craft-showcase-section"
import ArtisanProcessSection from "@/components/landing/artisan-process-section"
import FeaturedTestimonialSection from "@/components/landing/featured-testimonial-section"
import GentleInvitationSection from "@/components/landing/gentle-invitation-section"
import HowItWorksSection from "@/components/landing/how-it-works-section"
import HomePricingSection from "@/components/landing/home-pricing-section"

export const metadata: Metadata = {
  title: "RestoreClick | Your Legacy, Perfectly Preserved",
  description:
    "A white-glove digital restoration service for your most cherished family photographs. Effortless process, museum-quality results.",
}

export default function HomePage() {
  return (
    <div className="bg-brand-background text-brand-text font-sans">
      <main>
        <section id="hero">
          <EditorialHeroSection />
        </section>
        <section id="story">
          <StoryIntroSection />
        </section>
        <section id="showcase">
          <CraftShowcaseSection />
        </section>
        <section id="process">
          <ArtisanProcessSection />
        </section>
        <section id="how-it-works">
          <HowItWorksSection />
        </section>
        <section id="testimonials">
          <FeaturedTestimonialSection />
        </section>
        <section id="pricing">
          <HomePricingSection />
        </section>
        <section id="invitation">
          <GentleInvitationSection />
        </section>
      </main>
    </div>
  )
}
