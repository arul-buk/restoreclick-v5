import { UploadCloud, ScanSearch, Send } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const steps = [
  {
    icon: <UploadCloud className="h-12 w-12 text-brand-accent mb-4" />,
    title: "1. Share Your Fading Memories",
    description: "Simply send us the photo that holds a special place in your heart. Our system makes it easy to add your picture, ready for its journey back to life.",
  },
  {
    icon: <ScanSearch className="h-12 w-12 text-brand-accent mb-4" />,
    title: "2. Our Clever AI Works Its Magic",
    description: "Our smart technology gently studies every detail, bringing back vibrant colors, sharpening loving smiles, and healing any tiny imperfections. It’s like watching time melt away.",
  },
  {
    icon: <Send className="h-12 w-12 text-brand-accent mb-4" />,
    title: "3.  Receive Your Memories, Reborn",
    description: "Your beautifully clear and revived photos will be sent straight to your email. They willl be ready to cherish, print for a frame, or share with family members.",
  },
]

export default function HowItWorksSection() {
  return (
    <section className="py-16 md:py-24 bg-white">
      {" "}
      {/* Alternating background for visual separation */}
      <div className="container mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-center text-brand-text mb-16">
          Your Seamless Restoration Journey
        </h2>
        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((step, index) => (
            <div key={step.title} className="flex flex-col items-center text-center p-6">
              <div className="relative mb-6">
                {step.icon}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 left-full w-16 h-px bg-brand-accent/30 ml-4" />
                )}
              </div>
              <h3 className="text-2xl font-serif font-semibold text-brand-text mb-3">{step.title}</h3>
              <p className="text-brand-text/80 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-16">
          <Link href="/restore">
            <Button size="lg" className="text-lg px-8 py-4">Start Your Restoration</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
