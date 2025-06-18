import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function HeroSection() {
  return (
    <section className="relative w-full h-[calc(100vh-80px)] min-h-[600px] flex items-center justify-center text-center text-white overflow-hidden">
      {/* Video Background Placeholder */}
      <Image
        src="/placeholder.svg"
          width={1920}
          height={1080}
        alt="Restored photo album"
        layout="fill"
        objectFit="cover"
        className="absolute inset-0 z-0 opacity-50" // Darken the image a bit for text contrast
      />
      <div className="absolute inset-0 bg-black/60 z-10" /> {/* Overlay for text readability */}
      <div className="relative z-20 p-6 container mx-auto">
        <h1 className="font-serif text-5xl md:text-7xl font-bold mb-6">Your Legacy, Perfectly Preserved.</h1>
        <p className="font-sans text-lg md:text-xl max-w-3xl mx-auto mb-10">
          A white-glove digital restoration service for your most cherished family photographs. Effortless process,
          museum-quality results.
        </p>
        <Button
          size="lg"
          className="bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold px-10 py-6 text-lg"
          asChild
        >
          <a href="/restore-old-photos">Begin Your Restoration</a>
        </Button>
      </div>
    </section>
  )
}
