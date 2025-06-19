"use client"
import { useState, useCallback, useEffect } from "react"
import useSWR from 'swr'
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"
import { Upload, X, ImageIcon, AlertCircle, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import { toast } from "sonner"
import { loadStripe } from '@stripe/stripe-js'

interface UploadedFile {
  id: string
  file: File
  preview: string
  name: string
  size: number
}

interface PriceData {
  id: string
  unitAmount: number
  currency: string
  type: string
}

// Fetcher function for useSWR
const fetcher = (url: string) => fetch(url).then(res => res.json())
const ACCEPTED_FORMATS = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/tiff": [".tiff", ".tif"],
  "image/bmp": [".bmp"],
}

export default function RestorePhotosClient() {
  const router = useRouter()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const canProceed = uploadedFiles.length > 0

  // Fetch price from our API
  const { data: priceData, error: priceError, isLoading: isPriceLoading } = 
    useSWR<PriceData>('/api/price', fetcher, {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
      refreshInterval: 0
    })
  
  // Calculate price per photo in dollars
  const pricePerPhoto = priceData?.unitAmount ? priceData.unitAmount / 100 : 0

  useEffect(() => {
    if (priceError) {
      console.error("Error fetching price:", priceError);
      toast.error("Could not load price. Please try refreshing.");
    }
    if (priceData) {
      console.log("Fetched price data:", priceData);
      if (priceData.unitAmount === null || typeof priceData.unitAmount === 'undefined') {
        console.warn("Price data fetched, but unitAmount is missing or null.");
      }
    }
  }, [priceData, priceError]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setUploadError(null)

    if (rejectedFiles.length > 0) {
      setUploadError("Some files were rejected. Please ensure all files are valid image formats (JPG, PNG, TIFF, BMP).")
      return
    }

    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }))

    setUploadedFiles((prev) => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxSize: 50 * 1024 * 1024, // 50MB max file size
    multiple: true,
  })

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const totalCost = uploadedFiles.length * pricePerPhoto

  const handleCheckout = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one photo to restore.");
      return;
    }
    if (!priceData?.id) {
      toast.error("Price information is not available. Please try again.");
      return;
    }

    setIsLoading(true);
    toast.info("Preparing your photos for checkout...");

    try {
      // Step 1: Upload images to temporary storage
      const formData = new FormData();
      uploadedFiles.forEach((uploadedFileItem) => { // uploadedFileItem is of type UploadedFile
        formData.append('files', uploadedFileItem.file); // Use the .file property which is the actual File object
      });

      const uploadResponse = await fetch('/api/upload-temporary-images', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const uploadErrorData = await uploadResponse.json().catch(() => ({ message: 'Failed to upload images.' }));
        const uploadErrorMessage = uploadErrorData?.error || uploadErrorData?.message || 'Image upload failed.';
        console.error('Image upload API error:', uploadResponse.status, uploadErrorData);
        toast.error(`Upload failed: ${uploadErrorMessage}`);
        setIsLoading(false);
        return;
      }

      const { batchId } = await uploadResponse.json();
      if (!batchId) {
        toast.error('Failed to get upload batch ID. Please try again.');
        setIsLoading(false);
        return;
      }

      toast.success("Photos successfully prepared! Proceeding to checkout...");

      // Step 2: Create Stripe Checkout session with batchId
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceData.id,
          quantity: uploadedFiles.length,
          imageBatchId: batchId, // Pass the batchId here
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Server returned an error without a JSON body' }));
        const errorMessage = errorData?.error || errorData?.message || `Request failed with status ${response.status}`;
        console.error('Checkout API error:', response.status, errorData);
        toast.error(`Checkout failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const { url } = await response.json(); // Expect 'url' from the backend

      if (url) {
        window.location.href = url; // Redirect to the Stripe Checkout URL
      } else {
        toast.error('Failed to get checkout session. Please try again.');
        throw new Error('Checkout session URL not found in response.');
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to start checkout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8"> 
      {/* Main Upload Area & Thumbnails */}
      <div className="space-y-8">
        {/* Upload Dropzone */}

        {/* Upload Dropzone (conditionally rendered) */}
        {uploadedFiles.length === 0 && (
          <Card className="border-2 border-dashed border-brand-text/20 hover:border-brand-cta/50 transition-colors">
            <CardContent className="p-8">
              <div
                {...getRootProps()}
                className={`text-center cursor-pointer transition-all duration-200 ${isDragActive ? "scale-105" : ""}`}
              >
                <input {...getInputProps()} />
                <div className="space-y-6">
                  <div className="mx-auto w-16 h-16 rounded-full bg-brand-cta/10 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-brand-cta" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-2xl font-medium text-brand-text">
                      {isDragActive ? "Drop your photos here" : "Upload Your Photos"}
                    </h3>
                    <p className="text-brand-text/70">
                      Drag and drop your images here, or{" "}
                      <span className="text-brand-cta font-medium">click to browse</span>
                    </p>
                  </div>
                  <div className="text-sm text-brand-text/60">
                    <p>Accepted formats: JPG, PNG, TIFF, BMP</p>
                    <p>Maximum file size: 50MB per image</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Error Message */}
        {uploadError && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {/* Uploaded Files Grid */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-serif text-xl font-medium text-brand-text">Your Memories</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mx-auto w-fit">
              {uploadedFiles.map((file) => (
                <Card key={file.id} className="relative group overflow-hidden">
                  <CardContent className="p-0">
                    <Image
                      src={file.preview}
                      alt={`Preview of ${file.name}`}
                      width={200}
                      height={200}
                      className="aspect-square w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onLoad={() => URL.revokeObjectURL(file.preview)} // Clean up object URL after image loads
                    />
                    <div className="absolute top-1 right-1 z-10">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7 bg-black/50 hover:bg-red-600/80 backdrop-blur-sm border-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="h-4 w-4 text-white" />
                        <span className="sr-only">Remove {file.name}</span>
                      </Button>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-brand-text truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-brand-text/60">{formatFileSize(file.size)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {/* Add more memories button/mini-dropzone */}
              <Card className="relative group overflow-hidden border-2 border-dashed border-brand-text/20 hover:border-brand-cta/50 transition-colors cursor-pointer">
                <CardContent className="p-0 h-full flex items-center justify-center" {...getRootProps()}>
                  <input {...getInputProps()} />
                  <div className="text-center text-brand-text/70">
                    <Plus className="h-8 w-8 mx-auto mb-2 text-brand-cta" />
                    <p className="text-sm font-medium">Add more memories</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        {/* CTA Button */}
        <div className="text-center">
          <Button
            size="lg"
            className="w-full sm:w-auto bg-brand-cta hover:bg-brand-cta/90 text-white"
            onClick={handleCheckout}
            disabled={!canProceed || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Restore ${uploadedFiles.length} Photo${uploadedFiles.length !== 1 ? "s" : ""} for $${totalCost.toFixed(2)}`
            )}
          </Button>
        </div>
      </div>
      {/* Order Summary Section (now below the upload area) */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-6">
          {/* Scrollable Order Summary */}
          <div className="max-h-96 overflow-y-auto">
            <Card className="bg-brand-secondary/5">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-base text-brand-text/80">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-brand-text/60">Photos to restore:</span>
                    <span className="text-brand-text">{uploadedFiles.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-brand-text/60">Price per photo:</span>
                    <span className="text-brand-text">
                      {isPriceLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin inline-block" />
                      ) : priceError ? (
                        <span className="text-red-500" title={priceError.message || 'Failed to load price'}>Error</span>
                      ) : priceData && typeof priceData.unitAmount === 'number' ? (
                        `$${(priceData.unitAmount / 100).toFixed(2)}`
                      ) : (
                        <span>$0.00</span> // Default or if price is genuinely zero
                      )}
                    </span>
                  </div>
                </div>

                <div className="border-t border-brand-text/10 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-brand-text">Total:</span>
                    <span className="font-bold text-brand-cta">${totalCost.toFixed(2)}</span>
                  </div>
                </div>

                {/* What's Included - Collapsed by default */}
                <details className="group">
                  <summary className="cursor-pointer text-brand-text/70 hover:text-brand-text transition-colors">
                    What&apos;s included ↓
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-brand-text/60 pl-4">
                    <li>• High-resolution digital restoration</li>
                    <li>• Color correction & enhancement</li>
                    <li>• Scratch & blemish removal</li>
                    <li>• Secure digital delivery</li>
                  </ul>
                </details>
              </CardContent>
            </Card>
          </div>

          {/* Guarantee - Smaller and less prominent */}
          <div className="bg-brand-secondary/5 rounded-lg p-3 text-center">
            <p className="text-xs text-brand-text/70">
              <ImageIcon className="h-3 w-3 inline mr-1" />
              100% Satisfaction. We won&apos;t let you go unhappy.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
