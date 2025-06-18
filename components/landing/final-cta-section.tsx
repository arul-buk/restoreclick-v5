import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function FinalCtaSection() {
  return (
    <section className="py-16 md:py-32 bg-white">
      <div className="container mx-auto px-6">
        <div className="bg-brand-text text-brand-background rounded-xl shadow-2xl p-8 md:p-16 flex flex-col lg:flex-row items-center">
          <div className="lg:w-1/2 mb-8 lg:mb-0 lg:pr-12 text-center lg:text-left">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">Preserve What Matters Most.</h2>
            <p className="text-lg md:text-xl mb-10 opacity-80">
              Don't let your precious memories fade away. Our expert digital artisans are ready to restore your
              photographs to their former glory, ensuring they last for generations to come.
            </p>
            <Button
              size="lg"
              className="bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold px-10 py-6 text-lg"
              asChild
            >
              <a href="/restore-old-photos">Entrust Us With Your Memories</a>
            </Button>
          </div>
          <div className="lg:w-1/2">
            <Image
              src="/placeholder.jpg" // Updated image
              alt="Restored photo displayed as art"
              width={600}
              height={400}
              className="rounded-lg shadow-lg mx-auto"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
