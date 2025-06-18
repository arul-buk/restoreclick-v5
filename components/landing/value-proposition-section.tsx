import { Zap, Gem, ShieldCheck } from "lucide-react" // Example icons

const propositions = [
  {
    icon: <Zap className="h-10 w-10 text-brand-accent mb-4" />,
    title: "Effortless Service",
    description: "Simply provide your images. Our concierge team handles the rest, saving you invaluable time.",
  },
  {
    icon: <Gem className="h-10 w-10 text-brand-accent mb-4" />,
    title: "Archival Quality",
    description: "Each photo is meticulously restored by digital artisans to create a flawless digital heirloom.",
  },
  {
    icon: <ShieldCheck className="h-10 w-10 text-brand-accent mb-4" />,
    title: "Lasting Legacy",
    description: "Transform faded memories into timeless art, ready for display and cherished for generations.",
  },
]

export default function ValuePropositionSection() {
  return (
    <section className="py-16 md:py-24 bg-brand-background">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-center text-brand-text mb-16">
          The Art of Memory
        </h2>
        <div className="grid md:grid-cols-3 gap-10">
          {propositions.map((prop) => (
            <div
              key={prop.title}
              className="flex flex-col items-center text-center p-6 rounded-lg hover:shadow-xl transition-shadow duration-300"
            >
              {prop.icon}
              <h3 className="text-2xl font-serif font-semibold text-brand-text mb-3">{prop.title}</h3>
              <p className="text-brand-text/80 leading-relaxed">{prop.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
