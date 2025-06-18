"use client"
import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

const sections = [
  { id: "hero", label: "Home" },
  { id: "story", label: "Story" },
  { id: "showcase", label: "Showcase" },
  { id: "process", label: "Process" },
  { id: "testimonials", label: "Testimonials" },
  { id: "invitation", label: "Get Started" },
]

export default function SmoothScrollNav() {
  const [activeSection, setActiveSection] = useState("hero")

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section.id)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  const scrollToNext = () => {
    const currentIndex = sections.findIndex((section) => section.id === activeSection)
    const nextIndex = (currentIndex + 1) % sections.length
    scrollToSection(sections[nextIndex].id)
  }

  return (
    <>
      {/* Floating navigation dots */}
      <nav className="fixed right-6 top-1/2 transform -translate-y-1/2 z-50 hidden lg:block">
        <div className="flex flex-col space-y-3">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                activeSection === section.id ? "bg-brand-cta scale-125" : "bg-brand-text/30 hover:bg-brand-text/50"
              }`}
              aria-label={`Go to ${section.label} section`}
            />
          ))}
        </div>
      </nav>

      {/* Scroll down indicator (only show on hero section) */}
      {activeSection === "hero" && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 animate-bounce">
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollToNext}
            className="rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white"
          >
            <ChevronDown className="h-5 w-5 bg-transparent text-black" />
          </Button>
        </div>
      )}
    </>
  )
}
