import Image from "next/image"

const showcaseItems = [
  {
    id: 1,
    beforeSrc: "/images/restoration-examples/birthday-before.jpg",
    afterSrc: "/images/restoration-examples/birthday-after.png",
    title: "The Birthday Memory, 1970s",
    description:
      "A cherished childhood birthday photo, once severely folded and discolored, now perfectly seamless and vibrant.",
  },
  {
    id: 2,
    beforeSrc: "/images/restoration-examples/wedding-before.png",
    afterSrc: "/images/restoration-examples/wedding-after.png",
    title: "The Wedding Day, 1980",
    description:
      "A beautiful wedding portrait, rescued from significant staining and brought back to its pristine elegance.",
  },
  {
    id: 3,
    beforeSrc: "/images/restoration-examples/family-before.jpeg",
    afterSrc: "/images/restoration-examples/family-after.png",
    title: "The Family Portrait, 1965",
    description: "A beloved family portrait, once faded and stained, now seamlessly repaired and reunited.",
  },
]

export default function CraftShowcaseSection() {
  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="font-serif text-4xl lg:text-5xl font-normal text-brand-text mb-6">
            From Memory to Masterpiece
          </h2>
          <div className="w-32 h-px bg-brand-secondary mx-auto"></div>
        </div>

        <div className="space-y-32">
          {showcaseItems.map((item, index) => (
            <div
              key={item.id}
              className={`grid lg:grid-cols-12 gap-16 items-center ${index % 2 === 1 ? "lg:grid-flow-col-dense" : ""}`}
            >
              {/* Images */}
              <div className={`lg:col-span-8 ${index % 2 === 1 ? "lg:col-start-5" : ""}`}>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={item.beforeSrc || "/placeholder.svg"}
                        alt={`Before restoration: ${item.title}`}
                        fill
                        className="object-cover rounded-lg shadow-soft"
                      />
                    </div>
                    <p className="text-sm text-brand-text/60 text-center font-medium">BEFORE</p>
                  </div>
                  <div className="space-y-4">
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={item.afterSrc || "/placeholder.svg"}
                        alt={`After restoration: ${item.title}`}
                        fill
                        className="object-cover rounded-lg shadow-soft"
                      />
                    </div>
                    <p className="text-sm text-brand-cta text-center font-medium">AFTER</p>
                  </div>
                </div>
              </div>

              {/* Text */}
              <div className={`lg:col-span-4 space-y-6 ${index % 2 === 1 ? "lg:col-start-1" : ""}`}>
                <h3 className="font-serif text-3xl font-normal text-brand-text">{item.title}</h3>
                <div className="w-16 h-px bg-brand-secondary"></div>
                <p className="text-lg leading-relaxed text-brand-text/80">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
