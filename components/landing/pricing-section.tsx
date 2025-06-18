import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"

export default function PricingSection() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-center text-brand-text mb-6">
          Simple, Transparent Pricing
        </h2>
        <p className="text-center text-lg text-brand-text/80 max-w-2xl mx-auto mb-12">
          Invest in preserving your legacy. No hidden fees, just beautiful restorations.
        </p>
        <div className="flex justify-center">
          <Card className="w-full max-w-md shadow-xl bg-brand-background">
            <CardHeader className="text-center">
              <CardTitle className="font-serif text-3xl text-brand-text">Per Photo Restoration</CardTitle>
              <CardDescription className="text-brand-text/70">Museum-quality digital restoration</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-5xl font-bold font-serif text-brand-accent my-4">$X.XX</p>
              <p className="text-brand-text/70 mb-6">Replace with your actual price</p>
              <ul className="space-y-2 text-left text-brand-text/90">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" /> High-resolution digital file
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" /> Scratch & blemish removal
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" /> Color & contrast correction
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" /> Secure online delivery
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                size="lg"
                className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-6 text-lg"
                asChild
              >
                <a href="/restore-old-photos">Restore Your Photos Now</a>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  )
}
