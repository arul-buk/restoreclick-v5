import type { Metadata } from "next"
import RestorePhotosClient from "./restore-photos-client"

export const metadata: Metadata = {
  title: "Restore Your Photos | RestoreClick",
  description: "Upload your precious photographs and let our digital artisans restore them to their former glory.",
}

export default function RestorePhotosPage() {
  return (
    <div className="bg-brand-background min-h-screen pt-20">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl lg:text-5xl font-normal text-brand-text mb-4">
              Restore Your Precious Memories
            </h1>
            <div className="w-32 h-px bg-brand-secondary mx-auto mb-6"></div>
            <p className="text-xl text-brand-text/80 max-w-2xl mx-auto leading-relaxed">
              Upload your photographs and let our digital artisans bring them back to life. Each image will be carefully
              restored with museum-quality precision.
            </p>
          </div>

          <RestorePhotosClient />
        </div>
      </div>
    </div>
  )
}
