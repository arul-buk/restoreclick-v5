"use client"

import type React from "react"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X } from "lucide-react"

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function ImageModal({ isOpen, onClose, children }: ImageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] md:max-w-[80vw] h-[90vh] md:h-[80vh] p-0 overflow-hidden flex items-center justify-center bg-transparent border-none shadow-none">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-white hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-8 w-8" />
        </button>
        {children}
      </DialogContent>
    </Dialog>
  )
}
