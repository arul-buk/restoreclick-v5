import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link" // Import Link from next/link

export default function EditorialHeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Full bleed background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/story-intro-photo.jpg" // Updated image
          alt="Lily and her grandmother looking at a photo album"
          fill
          className="object-cover"
          priority
        />
        {/* Enhanced overlay with gradient for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60"></div>
      </div>

      {/* Content overlay */}
      <div className="container mx-auto px-6 py-20 relative z-10">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          {/* Left side - Text */}
          <div className="lg:col-span-6 space-y-8 text-white">
            <div className="space-y-6">
              <h1 className="font-serif text-6xl lg:text-7xl font-normal leading-[0.9]">
                <em className="text-white/90">Your Legacy, Perfectly Preserved</em>
              </h1>
              <div className="w-24 h-px bg-white/60"></div>
              <p className="text-xl leading-relaxed text-white/90 max-w-md">
                Your photographs Preserved. Memories restored.
              </p>
            </div>
            <div className="relative group">
              <Button 
                size="lg" 
                className="relative z-10 w-full sm:w-auto px-10 py-6 text-lg font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 transform-gpu overflow-hidden"
                asChild
              >
                <Link href="/restore-old-photos">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Begin Your Restoration
                    <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </Link>
              </Button>
              {/* Subtle glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/30 to-teal-500/30 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
            </div>
          </div>

          {/* Right side - Before/After Comparison */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="relative max-w-lg w-full transform rotate-2 hover:rotate-0 transition-transform duration-500">
              {/* Before/After Container */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/5 backdrop-blur-md rounded-3xl p-8 shadow-2xl">
                {/* Before Image */}
                <div className="space-y-4 transform -rotate-1">
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                    <Image
                      src="/images/showcase-scratches-before.jpg"
                      alt="Damaged photograph with scratches and fading"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
                      BEFORE
                    </div>
                    {/* Damage indicators */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                  <p className="text-white/90 text-base text-center font-semibold tracking-wide">Damaged & Faded</p>
                </div>

                {/* After Image */}
                <div className="space-y-4 transform rotate-1">
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                    <Image
                      src="/images/showcase-scratches-after.png"
                      alt="Beautifully restored photograph"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
                      AFTER
                    </div>
                    {/* Glow effect for restored image */}
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent"></div>
                  </div>
                  <p className="text-white/90 text-base text-center font-semibold tracking-wide">Perfectly Restored</p>
                </div>
              </div>

              {/* Enhanced Transformation Arrow */}
              <div className="hidden sm:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full p-3 shadow-2xl ring-2 ring-white/20 animate-pulse">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-emerald-400/30 rounded-full blur-sm"></div>
              <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-white/10 rounded-full blur-md"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
