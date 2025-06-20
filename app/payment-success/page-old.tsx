"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import EmailConfirmationModal from "@/components/restoration/email-confirmation-modal"
import BeforeAfterSlider from "@/components/restoration/before-after-slider"
import { Download, Send, Share2, Info, CheckCircle, Loader2 } from "lucide-react"

// Mock data for restored photos - assuming this structure
const mockRestoredPhotosData = [
  {
    id: "1",
    beforeSrc: "/placeholder.svg?width=800&height=600",
    afterSrc: "/placeholder.svg?width=800&height=600",
    title: "Family by the Monument",
    description: "A cherished family moment from the 1960s, beautifully restored.",
  },
  {
    id: "2",
    beforeSrc: "/placeholder.svg?width=800&height=600",
    afterSrc: "/placeholder.svg?width=800&height=600",
    title: "Grandparents' Wedding Day",
    description: "Their special day, with clarity and vibrancy returned.",
  },
  {
    id: "3",
    beforeSrc: "/placeholder.svg?width=800&height=600",
    afterSrc: "/placeholder.svg?width=800&height=600",
    title: "Playground Adventures",
    description: "Childhood joy, free from fades and scratches.",
  },
]

// Interface for a single photo
interface RestoredPhoto {
  id: string
  beforeSrc: string
  afterSrc: string
  title: string
  description: string
}

export default function PaymentSuccessPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState("Verifying your payment...")
  const [allPhotos, setAllPhotos] = useState<RestoredPhoto[]>(mockRestoredPhotosData) // All photos from the order
  const [currentPhoto, setCurrentPhoto] = useState<RestoredPhoto | null>(null) // The photo currently in the main slider

  // State for the email confirmation modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  // downloadTargetSrc will be for single photo, allPhotoSrcs for 'download all'
  const [emailModalTargetSrc, setEmailModalTargetSrc] = useState<string | null>(null)
  const [isEmailModalForMultiple, setIsEmailModalForMultiple] = useState(false)

  useEffect(() => {
    const simulateProcessing = async () => {
      setStatusMessage("Payment verified. Preparing your restorations...")
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Simulate fetching/processing restored photos
      // For now, we just use the mock data
      if (mockRestoredPhotosData.length > 0) {
        setCurrentPhoto(mockRestoredPhotosData[0]) // Set the first photo as current
      }
      setAllPhotos(mockRestoredPhotosData)

      setStatusMessage("Your restorations are ready!")
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsLoading(false)
    }

    simulateProcessing()
  }, [])

  const handleOpenEmailModal = (photoSrc: string | null, isForAll: boolean) => {
    setEmailModalTargetSrc(photoSrc) // If single, this is its src. If all, can be null.
    setIsEmailModalForMultiple(isForAll)
    setIsEmailModalOpen(true)
  }

  const handleEmailModalClose = () => {
    setIsEmailModalOpen(false)
    setEmailModalTargetSrc(null)
    setIsEmailModalForMultiple(false)
  }

  const handleConfirmDownload = (email: string, targetSrcOrSrcs: string | string[]) => {
    // In a real app, you'd call an API to send the email with download links
    console.log(`Email confirmation for: ${email}, Photo(s): ${targetSrcOrSrcs}`)
    // Optionally, trigger client-side download if not handled by email link
    if (typeof targetSrcOrSrcs === "string") {
      window.open(targetSrcOrSrcs, "_blank")
    } else {
      targetSrcOrSrcs.forEach((src) => window.open(src, "_blank"))
    }
    handleEmailModalClose() // Close modal after confirmation
  }

  const handleShareMemory = () => {
    // Basic share functionality (e.g., copy link or open native share)
    if (currentPhoto && navigator.share) {
      navigator
        .share({
          title: `Restored: ${currentPhoto.title}`,
          text: `Check out this beautifully restored photo: ${currentPhoto.title}`,
          url: window.location.href, // Or a direct link to the image if available
        })
        .catch(console.error)
    } else if (currentPhoto) {
      // Fallback for browsers that don't support navigator.share
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => alert("Link copied to clipboard!"))
        .catch(() => alert("Could not copy link."))
    }
  }

  const handleThumbnailClick = (photo: RestoredPhoto) => {
    setCurrentPhoto(photo)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9F9F7] text-[#333333] p-6 text-center">
        <Loader2 className="h-16 w-16 text-[#0D5C46] animate-spin mb-6" />
        <h1 className="font-serif text-4xl md:text-5xl font-semibold mb-4">Finalizing Your Restorations</h1>
        <p className="text-xl text-[#333333]/80 max-w-md">{statusMessage}</p>
      </div>
    )
  }

  if (!currentPhoto) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9F9F7] text-[#333333] p-6 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mb-6" />
        <h1 className="font-serif text-4xl md:text-5xl font-semibold mb-4">Restorations Complete!</h1>
        <p className="text-xl text-[#333333]/80 max-w-md mb-8">
          No photos to display at the moment, but your order is processed.
        </p>
        <Button variant="default" size="lg" className="bg-[#0D5C46] hover:bg-[#0D5C46]/90 text-white" asChild>
          <Link href="/">Return to Homepage</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-[#F9F9F7] text-[#333333] min-h-screen py-12 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Title Section */}
        <div className="text-center mb-10 md:mb-16">
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#333333] mb-3">
            Your Memory, Reimagined
          </h1>
          <p className="text-lg sm:text-xl text-[#333333]/80 max-w-2xl mx-auto">
            We've meticulously restored your photograph. Drag the slider below to witness the transformation.
          </p>
        </div>

        {/* Main Content: Slider and Action Panel */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          {/* Left Column: Before/After Slider */}
          <div className="lg:w-2/3 w-full">
            <BeforeAfterSlider
              beforeSrc={currentPhoto.beforeSrc}
              afterSrc={currentPhoto.afterSrc}
              alt={`Restored: ${currentPhoto.title}`}
            />
          </div>

          {/* Right Column: Action Panel */}
          <div className="lg:w-1/3 w-full bg-white p-6 sm:p-8 rounded-lg shadow-xl">
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#333333] mb-1">
              Restored: {currentPhoto.title}
            </h2>
            <p className="text-[#333333]/70 text-sm mb-6">{currentPhoto.description}</p>

            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full bg-[#0D5C46] hover:bg-[#0D5C46]/90 text-white text-base"
                onClick={() => window.open(currentPhoto.afterSrc, "_blank")}
              >
                <Download className="mr-2 h-5 w-5" />
                Download Photo
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full text-[#0D5C46] border-[#0D5C46] hover:bg-[#0D5C46]/10 text-base"
                onClick={() => handleOpenEmailModal(currentPhoto.afterSrc, false)}
              >
                <Send className="mr-2 h-5 w-5" />
                Send to My Email
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full text-[#0D5C46] border-[#0D5C46] hover:bg-[#0D5C46]/10 text-base"
                onClick={handleShareMemory}
              >
                <Share2 className="mr-2 h-5 w-5" />
                Share Memory
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-[#333333]/10">
              <h3 className="text-sm font-semibold text-[#333333] mb-2 flex items-center">
                <Info className="h-4 w-4 mr-2 text-[#0D5C46]" />
                Tips for Viewing
              </h3>
              <ul className="list-disc list-inside text-sm text-[#333333]/70 space-y-1 pl-2">
                <li>Drag the slider on the image to compare before and after.</li>
                {allPhotos.length > 1 && <li>Select a thumbnail below to view other photos.</li>}
                <li>Use the download button for a high-resolution copy.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Thumbnail Gallery (if multiple photos) */}
        {allPhotos.length > 1 && (
          <div className="mt-12 md:mt-16">
            <h3 className="font-serif text-2xl font-semibold text-center mb-6">Your Restored Collection</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {allPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className={`cursor-pointer rounded-md overflow-hidden border-2 transition-all duration-200 ease-in-out ${
                    currentPhoto.id === photo.id ? "border-[#0D5C46] shadow-2xl" : "border-transparent hover:shadow-lg"
                  }`}
                  onClick={() => handleThumbnailClick(photo)}
                >
                  <Image
                    src={photo.afterSrc || "/placeholder.svg"}
                    alt={photo.title}
                    width={200}
                    height={150}
                    className="object-cover w-full h-full aspect-[4/3]"
                  />
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button
                size="lg"
                className="bg-[#0D5C46] hover:bg-[#0D5C46]/90 text-white text-base"
                onClick={() => handleOpenEmailModal(null, true)}
              >
                <Download className="mr-2 h-5 w-5" />
                Download All Restorations
              </Button>
            </div>
          </div>
        )}

        {/* "Love the results?" Section */}
        <div className="mt-16 md:mt-24 py-12 md:py-16 bg-white rounded-lg shadow-xl text-center px-6">
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#333333] mb-4">
            Preserve More Cherished Moments
          </h2>
          <p className="text-lg text-[#333333]/80 max-w-xl mx-auto mb-8">
            Our digital artisans are ready to bring more of your family's history to life. Effortless service,
            museum-quality results.
          </p>
          <Button size="lg" className="text-lg px-10 py-3 bg-[#0D5C46] hover:bg-[#0D5C46]/90 text-white" asChild>
            <Link href="/restore-old-photos">Restore More Photos</Link>
          </Button>
        </div>
      </div>

      <EmailConfirmationModal
        isOpen={isEmailModalOpen}
        onClose={handleEmailModalClose}
        onConfirmDownload={handleConfirmDownload}
        downloadTargetSrc={isEmailModalForMultiple ? null : emailModalTargetSrc} // Pass null if for all, or single src
        isDownloadingAll={isEmailModalForMultiple}
        allPhotoSrcs={allPhotos.map((p) => p.afterSrc)}
      />
    </div>
  )
}