import { UploadCloud, ScanSearch, Send } from "lucide-react"

const steps = [
  {
    icon: <UploadCloud className="h-12 w-12 text-brand-accent mb-4" />,
    title: "1. Submit Your Collection",
    description: "Easily upload your photos through our secure portal. We accept various formats.",
  },
  {
    icon: <ScanSearch className="h-12 w-12 text-brand-accent mb-4" />,
    title: "2. Artisan Review",
    description: "Our digital artisans meticulously assess and restore each image with precision and care.",
  },
  {
    icon: <Send className="h-12 w-12 text-brand-accent mb-4" />,
    title: "3. Receive Your Digital Archive",
    description: "Get your beautifully restored photos delivered as high-resolution digital files.",
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
      </div>
    </section>
  )
}
