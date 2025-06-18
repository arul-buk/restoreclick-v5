"use client"

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle } from "lucide-react";

interface EmailConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDownload: (email: string, targetSrc: string | string[]) => void;
  downloadTargetSrc: string | null;
  isDownloadingAll: boolean;
  allPhotoSrcs: string[];
  defaultEmail?: string;
  isSignedIn?: boolean;
}

const EmailConfirmationModal: React.FC<EmailConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmDownload,
  downloadTargetSrc,
  isDownloadingAll,
  allPhotoSrcs,
  defaultEmail,
  isSignedIn,
}) => {
  const [email, setEmail] = useState<string>(defaultEmail || "");
  const [isValidEmail, setIsValidEmail] = useState<boolean>(!!defaultEmail);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (defaultEmail) {
      setEmail(defaultEmail);
      setIsValidEmail(true);
    }
  }, [defaultEmail]);

  // Function to reset all internal state
  const resetModalState = () => {
    setEmail("");
    setIsValidEmail(false);
    setIsSubmitting(false);
    setConfirmationMessage(null);
    setErrorMessage(null);
  };

  // Use onOpenChange to trigger reset when the dialog state changes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetModalState(); // Reset when closing
      onClose(); // Call parent's onClose
    }
  };

  const validateEmail = (input: string) => {
    // Basic email regex for demonstration
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(input);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setIsValidEmail(validateEmail(newEmail));
    setErrorMessage(null); // Clear error on input change
  };

  const handleDownload = async () => {
    if (!isValidEmail) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Simulate API call to send email and track download
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (isDownloadingAll) {
        // Trigger download for all photos
        for (const src of allPhotoSrcs) {
          window.open(src, "_blank"); // Opens each in a new tab
        }
        setConfirmationMessage(`Your images have been emailed to ${email}. Please check your inbox.`);
        onConfirmDownload(email, allPhotoSrcs); // Notify parent of successful confirmation
      } else if (downloadTargetSrc) {
        // Trigger download for single photo
        window.open(downloadTargetSrc, "_blank");
        setConfirmationMessage(`Your image has been emailed to ${email}. Please check your inbox.`);
        onConfirmDownload(email, downloadTargetSrc); // Notify parent of successful confirmation
      } else {
        setErrorMessage("No image selected for download.");
        setIsSubmitting(false); // Ensure submitting state is reset on error
        return;
      }
    } catch (error) {
      console.error("Download confirmation failed:", error);
      setErrorMessage("Failed to process download. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-brand-background text-brand-text p-6 rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-brand-text">Confirm Your Email for Download</DialogTitle>
          <DialogDescription>
            {isSignedIn ? (
              <p className="text-sm text-gray-500 mb-4">
                Your email address is pre-filled. Click &quot;Confirm Download&quot; to receive your restored photo(s).
              </p>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                Enter your email to receive a download link for your restored photo(s).
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {confirmationMessage ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <p className="text-lg font-medium text-brand-text">{confirmationMessage}</p>
              <p className="text-sm text-brand-text/60">You can close this window now.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-brand-text">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  className="col-span-3"
                  readOnly={isSignedIn}
                />
                {!isValidEmail && email.length > 0 && (
                  <p className="text-sm text-red-500 flex items-center">
                    <XCircle className="h-4 w-4 mr-1" /> Please enter a valid email.
                  </p>
                )}
                {errorMessage && (
                  <p className="text-sm text-red-500 flex items-center">
                    <XCircle className="h-4 w-4 mr-1" /> {errorMessage}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={!isValidEmail || isSubmitting}>
                {isSubmitting ? "Processing..." : "Confirm Download"}
              </Button>
              {!isSignedIn && (
                <p className="mt-4 text-center text-sm text-gray-500">
                  You can sign in/sign up via the header to save your order history.
                </p>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          {!confirmationMessage && (
            <Button
              type="submit"
              onClick={handleDownload}
              disabled={!isValidEmail || isSubmitting}
              className="bg-brand-cta hover:bg-brand-cta/90"
            >
              {isSubmitting ? "Processing..." : "Download"}
            </Button>
          )}
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default EmailConfirmationModal;
