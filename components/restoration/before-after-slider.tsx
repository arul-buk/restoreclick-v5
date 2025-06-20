"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { GripVertical } from "lucide-react"

interface BeforeAfterSliderProps {
  beforeSrc: string
  afterSrc: string
  alt: string
}

export default function BeforeAfterSlider({ beforeSrc, afterSrc, alt }: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50) // 0-100 percentage
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const { left, width } = containerRef.current.getBoundingClientRect()
      const clientX = e.clientX

      let newPosition = ((clientX - left) / width) * 100
      newPosition = Math.max(0, Math.min(100, newPosition)) // Clamp between 0 and 100
      setSliderPosition(newPosition)
    },
    [isDragging],
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !containerRef.current) return

      const { left, width } = containerRef.current.getBoundingClientRect()
      const clientX = e.touches[0].clientX

      let newPosition = ((clientX - left) / width) * 100
      newPosition = Math.max(0, Math.min(100, newPosition)) // Clamp between 0 and 100
      setSliderPosition(newPosition)
      
      // Prevent scrolling while dragging
      e.preventDefault()
    },
    [isDragging],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    // Prevent default to avoid image dragging or text selection
    e.preventDefault()
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      window.addEventListener("touchmove", handleTouchMove, { passive: false }) // passive: false for preventDefault
      window.addEventListener("touchend", handleMouseUp)
    } else {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove])

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] overflow-hidden rounded-lg shadow-soft cursor-ew-resize group"
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* Before Image */}
      <Image src={beforeSrc || "/placeholder.svg"} alt={`Before: ${alt}`} fill className="object-cover select-none" />

      {/* After Image (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
        <Image src={afterSrc || "/placeholder.svg"} alt={`After: ${alt}`} fill className="object-cover select-none" />
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white flex items-center justify-center cursor-ew-resize z-10 transition-colors group-hover:bg-brand-cta"
        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
      >
        <div className="w-10 h-10 rounded-full bg-white border-2 border-brand-text/20 flex items-center justify-center shadow-md group-hover:border-brand-cta transition-colors">
          <GripVertical className="h-5 w-5 text-brand-text/70 group-hover:text-brand-cta transition-colors" />
        </div>
      </div>
    </div>
  )
}
