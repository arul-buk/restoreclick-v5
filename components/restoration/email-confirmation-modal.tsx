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
  onConfirmDownload: (email: string, targetSrcOrSrcs: string | string[]) => void;
  defaultEmail?: string;
  downloadTargetSrc?: string | null;
  isDownloadingAll?: boolean;
  allPhotoSrcs?: string[];
  title?: string;
  description?: string;
  buttonText?: string;
}

const EmailConfirmationModal: React.FC<EmailConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmDownload,
  defaultEmail,
  downloadTargetSrc,
  isDownloadingAll,
  allPhotoSrcs,
  title = "Confirm Your Email for Download", // Default title
  description,
  buttonText = "Download", // Default button text
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

  const handleConfirm = () => {
    if (!isValidEmail) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    // The modal's job is just to validate and pass the email up.
    // The parent component will handle the API call and submission state.
    onConfirmDownload(email, isDownloadingAll ? (allPhotoSrcs || []) : (downloadTargetSrc || ''));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-brand-background text-brand-text p-6 rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-brand-text">{title}</DialogTitle>
          <DialogDescription>
            <p className="text-sm text-gray-500 mb-4">
              {description || "Enter your email to proceed."}
            </p>
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
                <Input
                  id="email"
                  type="email"
                  placeholder="your@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  className="col-span-3"
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
            </>
          )}
        </div>
        <DialogFooter>
          {!confirmationMessage && (
            <Button
              type="submit"
              onClick={handleConfirm}
              disabled={!isValidEmail || isSubmitting}
              className="bg-brand-cta hover:bg-brand-cta/90"
            >
              {isSubmitting ? "Processing..." : buttonText}
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
