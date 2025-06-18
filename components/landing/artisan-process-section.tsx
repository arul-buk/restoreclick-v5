import Image from "next/image"
import { Palette, Eye, Heart } from "lucide-react"

const craftElements = [
  {
    icon: <Eye className="h-8 w-8 text-brand-cta" />,
    title: "Assessment",
    description:
      "Our helpful system carefully looks over your entire photograph, understanding its unique story and identifying exactly what it needs to look its best again.",
  },
  {
    icon: <Palette className="h-8 w-8 text-brand-cta" />,
    title: "Artistry",
    description:
      "Like countless tiny brushstrokes, our technology gently repairs tears, brings back faded colors, and clarifies smiling faces to breathe life back into your memory.",
  },
  {
    icon: <Heart className="h-8 w-8 text-brand-cta" />,
    title: "Preservation",
    description:
      "Your restored photograph becomes a beautiful digital heirloom, ready for your family to cherish for generations.",
  },
]

export default function ArtisanProcessSection() {
  return (
    <section className="py-32">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-6">
            <div className="relative aspect-[3/4] w-full max-w-md mx-auto">
              <Image
                src="/images/artisan-team.jpg" // Updated image
                alt="Digital artisan at work"
                fill
                className="object-cover rounded-lg shadow-soft"
              />
            </div>
          </div>

          <div className="lg:col-span-6 space-y-12">
            <div className="space-y-6">
              <h2 className="font-serif text-4xl lg:text-5xl font-normal text-brand-text leading-tight">
                The Art of Digital Restoration
              </h2>
              <div className="w-24 h-px bg-brand-secondary"></div>
              <p className="text-xl leading-relaxed text-brand-text/80">
                Our technology isn't just a program; it's a digital artist we've carefully taught. It looks at your
                photos with an understanding of what makes them special, applying careful fixes to preserve your
                memories.
              </p>
            </div>

            <div className="space-y-10">
              {craftElements.map((element) => (
                <div key={element.title} className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-background border border-brand-text/10 flex items-center justify-center">
                    {element.icon}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-xl font-medium text-brand-text">{element.title}</h3>
                    <p className="text-brand-text/80 leading-relaxed">{element.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
