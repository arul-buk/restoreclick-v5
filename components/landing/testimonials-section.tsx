import { Star } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

const testimonials = [
  {
    name: "Sarah L.",
    avatarSrc: "/placeholder.svg",
    avatarFallback: "SL",
    quote:
      "RestoreClick brought tears to my eyes. They restored a photo of my grandparents I thought was lost forever. The quality is incredible!",
    rating: 5,
  },
  {
    name: "Michael B.",
    avatarSrc: "/placeholder.svg",
    avatarFallback: "MB",
    quote:
      "The process was so easy, and the results exceeded my expectations. My faded family photos look brand new. Highly recommend!",
    rating: 5,
  },
  {
    name: "Emily K.",
    avatarSrc: "/placeholder.svg",
    avatarFallback: "EK",
    quote:
      "I was hesitant at first, but the 'white-glove service' is real. They handled my precious memories with such care. Worth every penny.",
    rating: 5,
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-16 md:py-24 bg-brand-background">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-center text-brand-text mb-16">
          Loved by Families Like Yours
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Avatar className="h-12 w-12 mr-4">
                    <AvatarImage src={testimonial.avatarSrc || "/placeholder.svg"} alt={testimonial.name} />
                    <AvatarFallback>{testimonial.avatarFallback}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold font-serif text-brand-text">{testimonial.name}</p>
                    <div className="flex">
                      {Array(testimonial.rating)
                        .fill(0)
                        .map((_, i) => (
                          <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        ))}
                    </div>
                  </div>
                </div>
                <p className="text-brand-text/80 italic leading-relaxed">{testimonial.quote}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
