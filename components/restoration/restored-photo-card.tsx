"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download } from "lucide-react"

interface RestoredPhotoCardProps {
  photo: {
    id: string
    beforeSrc: string
    afterSrc: string
    title: string
    description: string
  }
  onDownloadClick: (src: string) => void
  onImageClick: (beforeSrc: string, afterSrc: string, alt: string) => void // New prop
}

export default function RestoredPhotoCard({ photo, onDownloadClick, onImageClick }: RestoredPhotoCardProps) {
  return (
    <Card className="overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-0">
        <div
          className="relative w-full aspect-[4/3] cursor-pointer"
          onClick={() => onImageClick(photo.beforeSrc, photo.afterSrc, photo.title)}
        >
          <Image
            src={photo.afterSrc || "/placeholder.svg"}
            alt={`Restored: ${photo.title}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
            <h3 className="text-white text-lg font-semibold">{photo.title}</h3>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-serif text-xl font-semibold text-brand-text mb-2">{photo.title}</h3>
          <p className="text-brand-text/80 text-sm mb-4">{photo.description}</p>
          <Button
            variant="outline"
            className="w-full text-brand-accent border-brand-accent hover:bg-brand-accent hover:text-white"
            onClick={() => onDownloadClick(photo.afterSrc)}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
