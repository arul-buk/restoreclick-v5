"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Mail, Loader2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (formData: {
    recipientName: string;
    recipientEmail: string;
    message: string;
    sharerName: string; // Add this line
  }) => void;
  recipientName: string;
  recipientEmail: string;
  message: string;
  isLoading: boolean;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  onSend,
  recipientName,
  recipientEmail,
  message,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    recipientName: recipientName || '',
    recipientEmail: recipientEmail || '',
    message: message || ''
  });
  const [sharerName, setSharerName] = useState('');

  // Use useEffect to update formData when props change (e.g., when opening the modal with initial values)
  useEffect(() => {
    setFormData({
      recipientName: recipientName || '',
      recipientEmail: recipientEmail || '',
      message: message || ''
    });
  }, [recipientName, recipientEmail, message]);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isFormValid = formData.recipientEmail.trim() !== '' && isValidEmail(formData.recipientEmail);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid && !isLoading) {
      onSend({ ...formData, sharerName });
    }
  };

  const handleClear = () => {
    if (!isLoading) {
      setFormData({ recipientName: '', recipientEmail: '', message: '' });
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ recipientName: '', recipientEmail: '', message: '' });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Share with Family</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-gray-600 text-sm mb-4">
            Share your beautifully restored photos with family and friends via email.
          </p>

          {/* Sharer Name */}
          <div>
            <label htmlFor="sharerName" className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <Input
              id="sharerName"
              type="text"
              placeholder="Enter your name"
              value={sharerName}
              onChange={(e) => setSharerName(e.target.value)}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {/* Recipient Name */}
          <div>
            <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient's Name
            </label>
            <Input
              id="recipientName"
              type="text"
              placeholder="Enter their name"
              value={formData.recipientName}
              onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {/* Recipient Email */}
          <div>
            <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient's Email <span className="text-red-500">*</span>
            </label>
            <Input
              id="recipientEmail"
              type="email"
              placeholder="their@example.com"
              value={formData.recipientEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, recipientEmail: e.target.value }))}
              disabled={isLoading}
              className={`w-full ${
                formData.recipientEmail && !isValidEmail(formData.recipientEmail)
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : ''
              }`}
              required
            />
            {formData.recipientEmail && !isValidEmail(formData.recipientEmail) && (
              <p className="text-red-500 text-sm mt-1">Please enter a valid email address</p>
            )}
          </div>

          {/* Personal Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Personal Message
            </label>
            <Textarea
              id="message"
              placeholder="Add a personal note... (optional)"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              disabled={isLoading}
              className="w-full resize-none"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={isLoading}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send This Memory
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareModal;
