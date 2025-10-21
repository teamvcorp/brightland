"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ConversationLog from "../components/ConversationLog";

interface ManagerRequest {
  _id: string;
  fullname: string;
  email: string;
  phone: string;
  address: string;
  projectDescription: string;
  message: string;
  status: 'pending' | 'working' | 'finished' | 'rejected';
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
  problemImageUrl?: string;
  finishedImageUrl?: string;
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  // Conversation log
  conversationLog?: Array<{
    sender: 'admin' | 'user';
    senderName: string;
    senderEmail: string;
    message: string;
    timestamp: string;
    isInternal?: boolean;
  }>;
}

interface RentalApplication {
  _id: string;
  listingName: string;
  listingType: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  employment: string;
  employer: string;
  monthlyIncome: string;
  socialSecurityLastFour: string;
  referenceName: string;
  referencePhone: string;
  referenceRelation: string;
  moveInDate: string;
  additionalInfo?: string;
  status: 'pending' | 'approved' | 'denied';
  paymentStatus: 'pending' | 'paid' | 'failed';
  applicationFee: number;
  paymentIntentId?: string;
  paidAt?: Date;
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
  // Lease information
  monthlyRent?: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  propertyId?: string;
  firstPaymentAmount?: number;
  firstPaymentDue?: string;
  isProrated?: boolean;
  // Payment setup status
  hasCheckingAccount?: boolean;
  hasCreditCard?: boolean;
  securityDepositPaid?: boolean;
  securityDepositAmount?: number;
  securityDepositIntentId?: string;
  achPaymentMethodId?: string;
  cardPaymentMethodId?: string;
  // Auto-pay and subscription
  autoPayEnabled?: boolean;
  stripeSubscriptionId?: string;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  rentPaymentStatus?: 'current' | 'late' | 'paid_ahead';
  // Archive fields
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'working':
        return 'bg-blue-100 text-blue-800';
      case 'finished':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span
      className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Utility function to compress images before upload
const compressImage = async (file: File, maxSizeMB: number = 4, maxWidthOrHeight: number = 1920): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if needed (maintain aspect ratio)
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = (height * maxWidthOrHeight) / width;
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = (width * maxWidthOrHeight) / height;
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Start with high quality and reduce if needed
        let quality = 0.9;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              // If still too large and quality can be reduced, try again
              if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.1) {
                quality -= 0.1;
                tryCompress();
                return;
              }

              // Create new file from blob
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };

        tryCompress();
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

const RequestModal = ({ 
  request, 
  isOpen, 
  onClose, 
  onUpdate 
}: { 
  request: ManagerRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (request: ManagerRequest) => void;
}) => {
  const [status, setStatus] = useState<'pending' | 'working' | 'finished' | 'rejected'>('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [finishedImage, setFinishedImage] = useState<File | null>(null);
  const [finishedImagePreview, setFinishedImagePreview] = useState<string | null>(null);
  const [uploadingFinishedImage, setUploadingFinishedImage] = useState(false);

  useEffect(() => {
    if (request) {
      setStatus(request.status);
      setAdminNotes(request.adminNotes || '');
      setFinishedImagePreview(request.finishedImageUrl || null);
    }
  }, [request]);

  const handleFinishedImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Compress image if it's too large
        let processedFile = file;
        if (file.size > 1 * 1024 * 1024) { // Compress if larger than 1MB
          console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
          processedFile = await compressImage(file, 4); // Compress to max 4MB
          console.log(`Compressed size: ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
        }
        
        setFinishedImage(processedFile);
        const reader = new FileReader();
        reader.onload = (e) => setFinishedImagePreview(e.target?.result as string);
        reader.readAsDataURL(processedFile);
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Failed to process image. Please try a different file.');
      }
    }
  };

  const uploadImage = async (file: File, type: string) => {
    // Compress image if needed before upload
    let fileToUpload = file;
    if (file.size > 1 * 1024 * 1024) { // Compress if larger than 1MB
      try {
        console.log(`Compressing image before upload. Original: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        fileToUpload = await compressImage(file, 4); // Compress to max 4MB
        console.log(`Compressed: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
      } catch (error) {
        console.error('Compression failed:', error);
        // Continue with original file if compression fails
      }
    }

    // Check file size before upload (Vercel has 4.5MB limit)
    const maxSize = 4.5 * 1024 * 1024; // 4.5MB in bytes
    if (fileToUpload.size > maxSize) {
      throw new Error(`Image size (${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB) exceeds the 4.5MB limit. Please compress the image or choose a smaller file.`);
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('type', type);

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // Check if response is JSON or HTML error
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      } else {
        // Likely HTML error page (e.g., "Request Entity Too Large")
        const errorText = await response.text();
        if (errorText.includes('Request Entity Too Large') || errorText.includes('413')) {
          throw new Error('Image file is too large. Please use an image smaller than 4.5MB.');
        }
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    return data.url;
  };

  const handleUpdate = async () => {
    if (!request) return;
    
    setIsUpdating(true);
    try {
      let finishedImageUrl = request.finishedImageUrl;

      // Upload finished image if one was selected
      if (finishedImage) {
        setUploadingFinishedImage(true);
        try {
          finishedImageUrl = await uploadImage(finishedImage, 'finished');
        } catch (imageError: any) {
          alert(`Image upload failed: ${imageError.message || 'Unknown error'}`);
          setIsUpdating(false);
          setUploadingFinishedImage(false);
          return;
        }
        setUploadingFinishedImage(false);
      }

      const response = await fetch(`/api/admin/manager-requests/${request._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, adminNotes, finishedImageUrl }),
      });

      if (response.ok) {
        const data = await response.json();
        onUpdate(data.request);
        onClose();
      } else {
        alert('Failed to update request');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Error updating request');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold">Manage Request</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-6">
          {/* Request Details */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Request Details</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <p><strong>Name:</strong> {request.fullname}</p>
                <p><strong>Phone:</strong> {request.phone}</p>
              </div>
              <p><strong>Email:</strong> {request.email}</p>
              <p><strong>Property:</strong> {request.address}</p>
              <p><strong>Issue:</strong> {request.projectDescription}</p>
              <p><strong>Details:</strong> {request.message}</p>
              <p><strong>Submitted:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Problem Image */}
          {request.problemImageUrl && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Problem Image</h3>
              <Image
                src={request.problemImageUrl}
                alt="Problem reported"
                width={384}
                height={192}
                className="w-full max-w-sm h-48 object-cover rounded-lg border"
              />
            </div>
          )}

          {/* Status Update */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'pending' | 'working' | 'finished' | 'rejected')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="working">Working</option>
              <option value="finished">Finished</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes for Customer
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Add notes that will be sent to the customer..."
            />
          </div>

          {/* Finished Image Upload */}
          {(status === 'finished' || status === 'working') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {status === 'finished' ? 'Completed Work Photo' : 'Progress Photo'}
              </label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFinishedImageChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                {finishedImagePreview && (
                  <div className="relative">
                    <Image
                      src={finishedImagePreview}
                      alt="Finished work preview"
                      width={384}
                      height={192}
                      className="w-full max-w-sm h-48 object-cover rounded-lg border"
                    />
                    {finishedImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setFinishedImage(null);
                          setFinishedImagePreview(request.finishedImageUrl || null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Upload a photo showing the completed work or current progress
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating || uploadingFinishedImage}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            {uploadingFinishedImage 
              ? "Uploading..." 
              : isUpdating 
                ? "Updating..." 
                : "Update Request"
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// Rental Application Modal Component
const RentalApplicationModal = ({ 
  application, 
  isOpen, 
  onClose, 
  onUpdate,
  properties = []
}: { 
  application: RentalApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (application: RentalApplication) => void;
  properties?: any[];
}) => {
  const [status, setStatus] = useState<'pending' | 'approved' | 'denied'>('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Lease management state
  const [monthlyRent, setMonthlyRent] = useState<number>(0);
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [firstPaymentAmount, setFirstPaymentAmount] = useState<number>(0);
  const [isProrated, setIsProrated] = useState(false);
  const [enablingAutoPay, setEnablingAutoPay] = useState(false);

  useEffect(() => {
    if (application) {
      setStatus(application.status);
      setAdminNotes(application.adminNotes || '');
      
      // Initialize lease data
      setMonthlyRent(application.monthlyRent || 0);
      setLeaseStartDate(application.leaseStartDate ? new Date(application.leaseStartDate).toISOString().split('T')[0] : '');
      setLeaseEndDate(application.leaseEndDate ? new Date(application.leaseEndDate).toISOString().split('T')[0] : '');
      setFirstPaymentAmount(application.firstPaymentAmount || 0);
      setIsProrated(application.isProrated || false);
      
      // Auto-fill rent from property if not set
      if (!application.monthlyRent && properties.length > 0) {
        const property = properties.find(p => p._id === application.propertyId);
        if (property && property.rent) {
          setMonthlyRent(property.rent);
        }
      }
    }
  }, [application, properties]);

  // Calculate prorated rent when lease start date changes
  useEffect(() => {
    if (leaseStartDate && monthlyRent > 0) {
      const startDate = new Date(leaseStartDate);
      const dayOfMonth = startDate.getDate();
      
      // If starting on the 1st, no proration
      if (dayOfMonth === 1) {
        setIsProrated(false);
        setFirstPaymentAmount(monthlyRent);
      } else {
        // Calculate prorated amount
        setIsProrated(true);
        const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
        const daysRemaining = daysInMonth - dayOfMonth + 1;
        const proratedAmount = (monthlyRent / daysInMonth) * daysRemaining;
        setFirstPaymentAmount(Math.round(proratedAmount * 100) / 100);
      }
    }
  }, [leaseStartDate, monthlyRent]);

  const handleUpdate = async () => {
    if (!application) return;
    
    setIsUpdating(true);
    try {
      const updateData: any = { 
        applicationId: application._id,
        status, 
        adminNotes 
      };

      // Include lease data if approved
      if (status === 'approved' && monthlyRent > 0) {
        updateData.monthlyRent = monthlyRent;
        updateData.leaseStartDate = leaseStartDate ? new Date(leaseStartDate).toISOString() : null;
        updateData.leaseEndDate = leaseEndDate ? new Date(leaseEndDate).toISOString() : null;
        updateData.firstPaymentAmount = firstPaymentAmount;
        updateData.isProrated = isProrated;
      }

      const response = await fetch('/api/rental-application', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const updatedApplication = { 
          ...application, 
          status, 
          adminNotes, 
          monthlyRent,
          leaseStartDate,
          leaseEndDate,
          firstPaymentAmount,
          isProrated,
          updatedAt: new Date().toISOString() 
        };
        onUpdate(updatedApplication);
        onClose();
      } else {
        alert('Failed to update application');
      }
    } catch (error) {
      console.error('Error updating application:', error);
      alert('Error updating application');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEnableAutoPay = async () => {
    if (!application) return;

    // Validate requirements
    if (!application.hasCheckingAccount) {
      alert('Tenant must add a checking account before enabling auto-pay.');
      return;
    }
    if (!application.hasCreditCard) {
      alert('Tenant must add a credit card before enabling auto-pay.');
      return;
    }
    if (!application.securityDepositPaid) {
      alert('Security deposit must be paid before enabling auto-pay.');
      return;
    }
    if (!leaseStartDate || !leaseEndDate) {
      alert('Please set lease start and end dates.');
      return;
    }
    if (monthlyRent <= 0) {
      alert('Please set the monthly rent amount.');
      return;
    }

    setEnablingAutoPay(true);
    try {
      const response = await fetch('/api/admin/enable-auto-pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          applicationId: application._id,
          monthlyRent,
          leaseStartDate,
          leaseEndDate,
          firstPaymentAmount,
          isProrated
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Auto-pay enabled successfully! Subscription created.');
        const updatedApplication = { 
          ...application, 
          autoPayEnabled: true,
          stripeSubscriptionId: data.subscriptionId,
          updatedAt: new Date().toISOString() 
        };
        onUpdate(updatedApplication);
      } else {
        const error = await response.json();
        alert(`Failed to enable auto-pay: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error enabling auto-pay:', error);
      alert('Error enabling auto-pay');
    } finally {
      setEnablingAutoPay(false);
    }
  };

  if (!isOpen || !application) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold">Rental Application Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-6">
          {/* Application Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Property Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <p><strong>Property:</strong> {application.listingName}</p>
                <p><strong>Type:</strong> {application.listingType}</p>
                <p><strong>Desired Move-in:</strong> {new Date(application.moveInDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Applicant Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <p><strong>Name:</strong> {application.userName}</p>
                <p><strong>Email:</strong> {application.userEmail}</p>
                <p><strong>Phone:</strong> {application.userPhone}</p>
                <p><strong>Submitted:</strong> {new Date(application.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Employment & Financial Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p><strong>Employment Status:</strong> {application.employment}</p>
                <p><strong>Employer:</strong> {application.employer}</p>
                <p><strong>Monthly Income:</strong> ${Number(application.monthlyIncome).toLocaleString()}</p>
                <p><strong>SSN Last 4:</strong> ****{application.socialSecurityLastFour}</p>
              </div>
            </div>
          </div>

          {/* Reference Information */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Reference Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <p><strong>Name:</strong> {application.referenceName}</p>
                <p><strong>Phone:</strong> {application.referencePhone}</p>
                <p><strong>Relationship:</strong> {application.referenceRelation}</p>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Payment Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <p><strong>Application Fee:</strong> ${application.applicationFee}</p>
                <p><strong>Payment Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                    application.paymentStatus === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : application.paymentStatus === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {application.paymentStatus.charAt(0).toUpperCase() + application.paymentStatus.slice(1)}
                  </span>
                </p>
                {application.paidAt && (
                  <p><strong>Paid Date:</strong> {new Date(application.paidAt).toLocaleDateString()}</p>
                )}
              </div>
              {application.paymentIntentId && (
                <p><strong>Payment ID:</strong> {application.paymentIntentId}</p>
              )}
            </div>
          </div>

          {/* Additional Information */}
          {application.additionalInfo && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Additional Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p>{application.additionalInfo}</p>
              </div>
            </div>
          )}

          {/* Admin Controls */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-700 mb-3">Admin Actions</h3>
            
            {/* Status Update */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'pending' | 'approved' | 'denied')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
              </select>
            </div>

            {/* Admin Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes (Internal)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Add internal notes about this application..."
              />
            </div>
          </div>

          {/* Lease Management (Approved Applications Only) */}
          {status === 'approved' && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-700 mb-3">Lease Management</h3>
              
              <div className="space-y-4">
                {/* Monthly Rent */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Rent
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Lease Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lease Start Date
                    </label>
                    <input
                      type="date"
                      value={leaseStartDate}
                      onChange={(e) => setLeaseStartDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lease End Date
                    </label>
                    <input
                      type="date"
                      value={leaseEndDate}
                      onChange={(e) => setLeaseEndDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* First Payment Calculation */}
                {isProrated && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-yellow-800 mb-1">Prorated First Payment</p>
                        <p className="text-sm text-yellow-700">
                          Since the lease starts mid-month, the first payment will be ${firstPaymentAmount.toFixed(2)} (prorated).
                          Regular monthly rent of ${monthlyRent.toFixed(2)} begins on the 1st of the following month.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Setup Status (Approved Applications Only) */}
          {status === 'approved' && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-700 mb-3">Payment Setup Status</h3>
              
              <div className="space-y-3">
                {/* Checking Account Status */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center">
                    {application.hasCheckingAccount ? (
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="text-sm font-medium">Checking Account (ACH)</span>
                  </div>
                  {application.hasCheckingAccount && application.achPaymentMethodId && (
                    <a
                      href={`https://dashboard.stripe.com/payment_methods/${application.achPaymentMethodId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      View in Stripe
                    </a>
                  )}
                </div>

                {/* Credit Card Status */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center">
                    {application.hasCreditCard ? (
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="text-sm font-medium">Credit Card</span>
                  </div>
                  {application.hasCreditCard && application.cardPaymentMethodId && (
                    <a
                      href={`https://dashboard.stripe.com/payment_methods/${application.cardPaymentMethodId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      View in Stripe
                    </a>
                  )}
                </div>

                {/* Security Deposit Status */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center">
                    {application.securityDepositPaid ? (
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="text-sm font-medium">
                      Security Deposit
                      {application.securityDepositPaid && application.securityDepositAmount && (
                        <span className="text-gray-600 ml-2">(${application.securityDepositAmount.toFixed(2)})</span>
                      )}
                    </span>
                  </div>
                  {application.securityDepositPaid && application.securityDepositIntentId && (
                    <a
                      href={`https://dashboard.stripe.com/payments/${application.securityDepositIntentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      View Receipt
                    </a>
                  )}
                </div>

                {/* Auto-Pay Status & Enable Button */}
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  {application.autoPayEnabled ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-semibold text-blue-800">Auto-Pay Enabled</span>
                      </div>
                      {application.stripeSubscriptionId && (
                        <a
                          href={`https://dashboard.stripe.com/subscriptions/${application.stripeSubscriptionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          View Subscription
                        </a>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-blue-700 mb-3">
                        Once the tenant completes payment setup and you&apos;ve set the lease details, enable auto-pay to start monthly rent collection.
                      </p>
                      <button
                        onClick={handleEnableAutoPay}
                        disabled={enablingAutoPay || !application.hasCheckingAccount || !application.hasCreditCard || !application.securityDepositPaid || !leaseStartDate || !leaseEndDate || monthlyRent <= 0}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-semibold"
                      >
                        {enablingAutoPay ? "Enabling..." : "Enable Auto-Pay"}
                      </button>
                      {(!application.hasCheckingAccount || !application.hasCreditCard || !application.securityDepositPaid || !leaseStartDate || !leaseEndDate || monthlyRent <= 0) && (
                        <p className="text-xs text-gray-600 mt-2">
                          Requirements: All payment methods added, security deposit paid, and lease dates set.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isUpdating ? "Updating..." : "Update Application"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Property Form Component for Add/Edit
const PropertyForm = ({ 
  isOpen, 
  onClose, 
  propertyOwners,
  editingProperty,
  onPropertySaved
}: { 
  isOpen: boolean;
  onClose: () => void;
  propertyOwners: Array<{_id: string, name: string}>;
  editingProperty?: any;
  onPropertySaved: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    sqft: '',
    description: '',
    rent: '',
    extraAdult: '',
    amenities: '',
    status: 'available',
    picture: '',
    propertyOwnerName: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Load form data when editing
  useEffect(() => {
    if (editingProperty) {
      // Convert address object to string if needed
      let addressString = '';
      if (typeof editingProperty.address === 'object' && editingProperty.address) {
        const addr = editingProperty.address;
        addressString = `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}`.trim();
        // Clean up extra commas and spaces
        addressString = addressString.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '');
      } else {
        addressString = editingProperty.address || '';
      }

      setFormData({
        name: editingProperty.name || '',
        type: editingProperty.type || '',
        sqft: editingProperty.sqft?.toString() || '',
        description: editingProperty.description || '',
        rent: editingProperty.rent?.toString() || '',
        extraAdult: editingProperty.extraAdult?.toString() || '',
        amenities: Array.isArray(editingProperty.amenities) 
          ? editingProperty.amenities.join(', ') 
          : editingProperty.amenities || '',
        status: editingProperty.status || 'available',
        picture: editingProperty.picture || '',
        propertyOwnerName: editingProperty.ownerName || '',
        address: addressString
      });
      setImagePreview(editingProperty.picture || '');
    } else {
      // Reset form for new property
      setFormData({
        name: '',
        type: '',
        sqft: '',
        description: '',
        rent: '',
        extraAdult: '',
        amenities: '',
        status: 'available',
        picture: '',
        propertyOwnerName: '',
        address: ''
      });
      setImagePreview('');
    }
    setImageFile(null);
    setSubmitStatus('');
  }, [editingProperty, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Compress image if it's too large
        let processedFile = file;
        if (file.size > 1 * 1024 * 1024) { // Compress if larger than 1MB
          console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
          processedFile = await compressImage(file, 4); // Compress to max 4MB
          console.log(`Compressed size: ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
        }
        
        setImageFile(processedFile);
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target?.result as string);
        reader.readAsDataURL(processedFile);
      } catch (error) {
        console.error('Error processing image:', error);
        setSubmitStatus('❌ Failed to process image. Please try a different file.');
      }
    }
  };

  const uploadImage = async (file: File) => {
    // Compress image if needed before upload
    let fileToUpload = file;
    if (file.size > 1 * 1024 * 1024) { // Compress if larger than 1MB
      try {
        console.log(`Compressing property image before upload. Original: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        fileToUpload = await compressImage(file, 4); // Compress to max 4MB
        console.log(`Compressed: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
      } catch (error) {
        console.error('Compression failed:', error);
        // Continue with original file if compression fails
      }
    }

    // Check file size before upload (Vercel has 4.5MB limit)
    const maxSize = 4.5 * 1024 * 1024; // 4.5MB in bytes
    if (fileToUpload.size > maxSize) {
      throw new Error(`Image size (${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB) exceeds the 4.5MB limit. Please compress the image or choose a smaller file.`);
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);

    const response = await fetch('/api/upload-property-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // Check if response is JSON or HTML error
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      } else {
        // Likely HTML error page (e.g., "Request Entity Too Large")
        const errorText = await response.text();
        if (errorText.includes('Request Entity Too Large') || errorText.includes('413')) {
          throw new Error('Image file is too large. Please use an image smaller than 4.5MB.');
        }
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('');

    try {
      let pictureUrl = formData.picture;

      // Upload new image if selected
      if (imageFile) {
        setUploadingImage(true);
        try {
          pictureUrl = await uploadImage(imageFile);
        } catch (imageError: any) {
          setSubmitStatus(`❌ Image upload failed: ${imageError.message}`);
          setIsSubmitting(false);
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      const propertyPayload = {
        ...formData,
        sqft: parseInt(formData.sqft),
        rent: parseFloat(formData.rent),
        extraAdult: formData.extraAdult ? parseInt(formData.extraAdult) : 0,
        amenities: formData.amenities.split(',').map(a => a.trim()).filter(Boolean),
        picture: pictureUrl
      };

      let response;
      if (editingProperty) {
        // Update existing property
        response = await fetch('/api/properties', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            propertyId: editingProperty._id,
            ...propertyPayload
          }),
        });
      } else {
        // Create new property
        response = await fetch('/api/properties', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(propertyPayload),
        });
      }

      if (response.ok) {
        setSubmitStatus(`✅ Property ${editingProperty ? 'updated' : 'added'} successfully!`);
        onPropertySaved();
        setTimeout(() => {
          setSubmitStatus('');
          onClose();
        }, 2000);
      } else {
        const errorData = await response.json();
        setSubmitStatus(`❌ Error: ${errorData.message}`);
      }
    } catch (error) {
      setSubmitStatus(`❌ Error: Failed to ${editingProperty ? 'update' : 'add'} property`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold">
            {editingProperty ? 'Edit Property' : 'Add New Property'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 space-y-4">
          {/* Property Owner Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Owner *
            </label>
            <select
              name="propertyOwnerName"
              value={formData.propertyOwnerName}
              onChange={handleInputChange}
              required
              disabled={!!editingProperty}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select Property Owner</option>
              {propertyOwners.map(owner => (
                <option key={owner._id} value={owner.name}>
                  {owner.name}
                </option>
              ))}
            </select>
            {editingProperty && (
              <p className="text-xs text-gray-500 mt-1">Property owner cannot be changed when editing</p>
            )}
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Sunset Apartments Unit 1A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Type</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="house">House</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Full property address"
            />
          </div>

          {/* Size and Rent */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Square Feet *
              </label>
              <input
                type="number"
                name="sqft"
                value={formData.sqft}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Rent *
              </label>
              <input
                type="number"
                step="0.01"
                name="rent"
                value={formData.rent}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1500.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Extra Adult Fee
              </label>
              <input
                type="number"
                name="extraAdult"
                value={formData.extraAdult}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="50"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="under-remodel">Under Remodel</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Detailed description of the property..."
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amenities *
            </label>
            <input
              type="text"
              name="amenities"
              value={formData.amenities}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="AC, Parking, Pool, Gym (comma separated)"
            />
            <p className="text-xs text-gray-500 mt-1">Separate amenities with commas</p>
          </div>

          {/* Property Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Image
            </label>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {imagePreview && (
                <div className="relative">
                  <Image
                    src={imagePreview}
                    alt="Property preview"
                    width={384}
                    height={192}
                    className="w-full max-w-sm h-48 object-cover rounded-lg border"
                  />
                  {imageFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(editingProperty?.picture || '');
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Upload a high-quality image of the property (max 5MB)
            </p>
          </div>

          {/* Submit Status */}
          {submitStatus && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-800">{submitStatus}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || uploadingImage}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
            >
              {uploadingImage 
                ? "Uploading Image..." 
                : isSubmitting 
                  ? `${editingProperty ? 'Updating' : 'Adding'} Property...` 
                  : `${editingProperty ? 'Update' : 'Add'} Property`
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<ManagerRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ManagerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ManagerRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPropertySection, setShowPropertySection] = useState(false);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [propertyOwners, setPropertyOwners] = useState<Array<{_id: string, name: string}>>([]);
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<string>('all');
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  
  // Rental Application states
  const [rentalApplications, setRentalApplications] = useState<RentalApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<RentalApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<RentalApplication | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [applicationStatusFilter, setApplicationStatusFilter] = useState('all');
  const [showArchivedApplications, setShowArchivedApplications] = useState(false);
  
  // Collapsible section states
  const [isPropertySectionCollapsed, setIsPropertySectionCollapsed] = useState(false);
  const [isApplicationsSectionCollapsed, setIsApplicationsSectionCollapsed] = useState(false);

  // New: Deletion and conversation states
  const [viewFilter, setViewFilter] = useState<'active' | 'deleted'>('active');
  const [showConversation, setShowConversation] = useState(false);
  const [conversationRequestId, setConversationRequestId] = useState<string>('');
  const [conversationUserEmail, setConversationUserEmail] = useState<string>('');

  const fetchRequests = useCallback(async () => {
    try {
      const url = viewFilter === 'deleted' 
        ? '/api/admin/manager-requests?deleted=true'
        : '/api/admin/manager-requests';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched requests:', data.requests.length);
        if (data.requests.length > 0) {
          console.log('First request conversationLog:', data.requests[0].conversationLog);
        }
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  }, [viewFilter]);

  const fetchPropertyOwners = useCallback(async () => {
    try {
      const response = await fetch('/api/property-owners');
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array before setting it
        if (Array.isArray(data)) {
          setPropertyOwners(data);
        } else {
          console.error('Property owners data is not an array:', data);
          setPropertyOwners([]);
        }
      }
    } catch (error) {
      console.error('Error fetching property owners:', error);
    }
  }, []);

  const fetchProperties = useCallback(async () => {
    try {
      const response = await fetch('/api/properties');
      if (response.ok) {
        const data = await response.json();
        setAllProperties(data || []);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  }, []);

  const fetchRentalApplications = useCallback(async () => {
    try {
      const response = await fetch('/api/rental-application');
      if (response.ok) {
        const data = await response.json();
        setRentalApplications(data || []);
      }
    } catch (error) {
      console.error('Error fetching rental applications:', error);
    }
  }, []);

  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/check-admin');
      const data = await response.json();
      
      if (!data.isAdmin) {
        router.push('/dashboard');
        return;
      }
      
      fetchRequests();
      fetchPropertyOwners();
      fetchProperties();
      fetchRentalApplications();
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.push('/dashboard');
    }
  }, [router, fetchRequests, fetchPropertyOwners, fetchProperties, fetchRentalApplications]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    checkAdminStatus();
  }, [session, status, router, checkAdminStatus]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(req => req.status === statusFilter));
    }
  }, [requests, statusFilter]);

  // Filter properties by selected owner
  useEffect(() => {
    if (selectedOwnerFilter === 'all') {
      setFilteredProperties(allProperties);
    } else {
      setFilteredProperties(allProperties.filter(property => property.ownerName === selectedOwnerFilter));
    }
  }, [allProperties, selectedOwnerFilter]);

  // Filter rental applications by status and archive state
  useEffect(() => {
    let filtered = rentalApplications.filter(app => {
      // Filter by archive state
      if (showArchivedApplications) {
        return app.isArchived === true;
      } else {
        return !app.isArchived;
      }
    });
    
    // Then filter by status
    if (applicationStatusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === applicationStatusFilter);
    }
    
    setFilteredApplications(filtered);
  }, [rentalApplications, applicationStatusFilter, showArchivedApplications]);

  const handleRequestUpdate = (updatedRequest: ManagerRequest) => {
    setRequests(prev => 
      prev.map(req => 
        req._id === updatedRequest._id ? updatedRequest : req
      )
    );
  };

  const handleApplicationUpdate = (updatedApplication: RentalApplication) => {
    setRentalApplications(prev => 
      prev.map(app => 
        app._id === updatedApplication._id ? updatedApplication : app
      )
    );
  };

  // Archive/Unarchive application handler
  const handleArchiveApplication = async (applicationId: string, applicationName: string, isCurrentlyArchived: boolean) => {
    const action = isCurrentlyArchived ? 'unarchive' : 'archive';
    if (!confirm(`Are you sure you want to ${action} the application for "${applicationName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/rental-application`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: applicationId, 
          isArchived: !isCurrentlyArchived,
          archivedAt: !isCurrentlyArchived ? new Date().toISOString() : null,
          archivedBy: session?.user?.email || 'admin'
        }),
      });

      if (response.ok) {
        alert(`Application ${action}d successfully`);
        fetchRentalApplications(); // Refresh list
      } else {
        alert(`Failed to ${action} application`);
      }
    } catch (error) {
      console.error(`Error ${action}ing application:`, error);
      alert(`Failed to ${action} application`);
    }
  };

  // New: Soft delete handler
  const handleSoftDelete = async (requestId: string, requestAddress: string) => {
    if (!confirm(`Mark "${requestAddress}" for deletion?\n\nThis request will be hidden but can be recovered within 14 days.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/manager-requests/${requestId}/delete`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('Request marked for deletion. It will be permanently removed in 14 days.');
        fetchRequests(); // Refresh list
      } else {
        const error = await response.json();
        alert(`Failed to delete: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Failed to delete request');
    }
  };

  // New: Recover handler
  const handleRecover = async (requestId: string, requestAddress: string) => {
    if (!confirm(`Recover the request for "${requestAddress}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/manager-requests/${requestId}/recover`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('Request recovered successfully!');
        fetchRequests(); // Refresh list
      } else {
        const error = await response.json();
        alert(`Failed to recover: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error recovering request:', error);
      alert('Failed to recover request');
    }
  };

  // New: Open conversation handler
  const handleOpenConversation = (requestId: string, userEmail: string) => {
    setConversationRequestId(requestId);
    setConversationUserEmail(userEmail);
    setShowConversation(true);
  };

  const handleDeleteProperty = async (property: any) => {
    if (!confirm(`Are you sure you want to delete "${property.name}"?`)) {
      return;
    }

    try {
      const response = await fetch('/api/properties', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: property._id,
          propertyOwnerName: property.ownerName
        }),
      });

      if (response.ok) {
        // Refresh properties list
        fetchProperties();
        alert('Property deleted successfully');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (error) {
      alert('Failed to delete property');
    }
  };

  const handlePropertySaved = () => {
    // Refresh properties list after add/edit
    fetchProperties();
    setEditingProperty(null);
  };

  const handleClosePropertyForm = () => {
    setShowPropertyForm(false);
    setEditingProperty(null);
  };

  const openModal = (request: ManagerRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setIsModalOpen(false);
  };

  const openApplicationModal = (application: RentalApplication) => {
    setSelectedApplication(application);
    setIsApplicationModalOpen(true);
  };

  const closeApplicationModal = () => {
    setSelectedApplication(null);
    setIsApplicationModalOpen(false);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusCounts = () => {
    return {
      all: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      working: requests.filter(r => r.status === 'working').length,
      finished: requests.filter(r => r.status === 'finished').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
    };
  };

  const getApplicationStatusCounts = () => {
    return {
      all: rentalApplications.length,
      pending: rentalApplications.filter(a => a.status === 'pending').length,
      approved: rentalApplications.filter(a => a.status === 'approved').length,
      denied: rentalApplications.filter(a => a.status === 'denied').length,
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage property maintenance requests and system settings
          </p>
        </div>

        {/* Property Management Section */}
        <div className="mb-6 bg-white rounded-lg shadow-sm">
          {/* Collapsible Header */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsPropertySectionCollapsed(!isPropertySectionCollapsed)}
          >
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg 
                className={`w-5 h-5 transition-transform ${isPropertySectionCollapsed ? '-rotate-90' : 'rotate-0'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
              Property Management ({filteredProperties.length} properties)
            </h2>
            <span className="text-sm text-gray-500">
              {isPropertySectionCollapsed ? 'Click to expand' : 'Click to collapse'}
            </span>
          </div>

          {/* Collapsible Content */}
          {!isPropertySectionCollapsed && (
            <div className="p-4 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="mb-2 sm:mb-0"></div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedOwnerFilter}
                onChange={(e) => setSelectedOwnerFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Property Owners</option>
                {propertyOwners.map(owner => (
                  <option key={owner._id} value={owner.name}>
                    {owner.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowPropertyForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Add Property
              </button>
            </div>
          </div>
          
          {/* Properties Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="py-3 px-4">Image</th>
                  <th scope="col" className="py-3 px-4">Name</th>
                  <th scope="col" className="py-3 px-4">Owner</th>
                  <th scope="col" className="py-3 px-4">Type</th>
                  <th scope="col" className="py-3 px-4">Rent</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No properties found{selectedOwnerFilter !== 'all' ? ` for ${selectedOwnerFilter}` : ''}
                    </td>
                  </tr>
                ) : (
                  filteredProperties.map((property) => (
                    <tr key={property._id} className="bg-white border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        {property.picture ? (
                          <Image
                            src={property.picture}
                            alt={property.name}
                            width={60}
                            height={40}
                            className="w-15 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-15 h-10 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-500">No image</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-900">{property.name}</td>
                      <td className="py-4 px-4">{property.ownerName}</td>
                      <td className="py-4 px-4 capitalize">{property.type}</td>
                      <td className="py-4 px-4">${property.rent?.toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                            property.status === "available"
                              ? "bg-green-100 text-green-800"
                              : property.status === "rented"
                              ? "bg-blue-100 text-blue-800"
                              : property.status === "under-remodel"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {property.status === "under-remodel" ? "Under Remodel" : property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingProperty(property);
                              setShowPropertyForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProperty(property)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
            </div>
          )}
        </div>

        {/* Rental Applications Management Section */}
        <div className="mb-6 bg-white rounded-lg shadow-sm">
          {/* Collapsible Header */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsApplicationsSectionCollapsed(!isApplicationsSectionCollapsed)}
          >
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg 
                className={`w-5 h-5 transition-transform ${isApplicationsSectionCollapsed ? '-rotate-90' : 'rotate-0'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
              Rental Applications ({filteredApplications.length} applications)
            </h2>
            <span className="text-sm text-gray-500">
              {isApplicationsSectionCollapsed ? 'Click to expand' : 'Click to collapse'}
            </span>
          </div>

          {/* Collapsible Content */}
          {!isApplicationsSectionCollapsed && (
            <div className="p-4 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowArchivedApplications(!showArchivedApplications)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showArchivedApplications
                    ? 'bg-gray-700 text-white hover:bg-gray-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showArchivedApplications ? (
                  <>
                    <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Archived ({rentalApplications.filter(app => app.isArchived).length})
                  </>
                ) : (
                  <>
                    <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Active ({rentalApplications.filter(app => !app.isArchived).length})
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={applicationStatusFilter}
                onChange={(e) => setApplicationStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Applications</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
              </select>
            </div>
          </div>
          
          {/* Application Status Summary */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 bg-gray-50 p-3 rounded-lg">
              {[
                { key: 'all', label: 'Total', count: getApplicationStatusCounts().all },
                { key: 'pending', label: 'Pending', count: getApplicationStatusCounts().pending },
                { key: 'approved', label: 'Approved', count: getApplicationStatusCounts().approved },
                { key: 'denied', label: 'Denied', count: getApplicationStatusCounts().denied },
              ].map((stat) => (
                <div key={stat.key} className="bg-white px-3 py-2 rounded-md border text-center">
                  <div className="text-sm font-medium text-gray-900">{stat.count}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Applications Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="py-3 px-4">Date</th>
                  <th scope="col" className="py-3 px-4">Applicant</th>
                  <th scope="col" className="py-3 px-4">Property</th>
                  <th scope="col" className="py-3 px-4">Income</th>
                  <th scope="col" className="py-3 px-4">Payment</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No rental applications found
                      {applicationStatusFilter !== 'all' ? ` for ${applicationStatusFilter} status` : ''}
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((application) => (
                    <tr key={application._id} className="bg-white border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        {new Date(application.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{application.userName}</div>
                          <div className="text-xs text-gray-500">{application.userEmail}</div>
                          <div className="text-xs text-gray-500">{application.userPhone}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium">{application.listingName}</div>
                          <div className="text-xs text-gray-500 capitalize">{application.listingType}</div>
                          <div className="text-xs text-gray-500">Move-in: {new Date(application.moveInDate).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium">${Number(application.monthlyIncome).toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{application.employment}</div>
                          <div className="text-xs text-gray-500">{application.employer}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium">${application.applicationFee}</div>
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                              application.paymentStatus === "paid"
                                ? "bg-green-100 text-green-800"
                                : application.paymentStatus === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {application.paymentStatus.charAt(0).toUpperCase() + application.paymentStatus.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                            application.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : application.status === "denied"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => openApplicationModal(application)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Review
                          </button>
                          <button
                            onClick={() => handleArchiveApplication(
                              application._id, 
                              application.userName, 
                              application.isArchived || false
                            )}
                            className={`font-medium text-sm ${
                              application.isArchived 
                                ? 'text-green-600 hover:text-green-800' 
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                          >
                            {application.isArchived ? 'Unarchive' : 'Archive'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
            </div>
          )}
        </div>

        {/* Approved Renters Section */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">
              Approved Renters ({rentalApplications.filter(app => app.status === 'approved').length} approved)
            </h2>
          </div>
          
          {/* Approved Renters List */}
          <div className="overflow-x-auto">
            {rentalApplications.filter(app => app.status === 'approved').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No approved rental applications yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rentalApplications
                  .filter(app => app.status === 'approved')
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .map((application) => (
                    <div key={application._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{application.userName}</h3>
                          <p className="text-sm text-gray-600">{application.userEmail}</p>
                          <p className="text-sm text-gray-600">{application.userPhone}</p>
                        </div>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                          Approved
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Property:</strong> {application.listingName}
                          <span className="text-gray-500 ml-2 capitalize">({application.listingType})</span>
                        </div>
                        
                        <div>
                          <strong>Move-in Date:</strong> {new Date(application.moveInDate).toLocaleDateString()}
                        </div>
                        
                        <div>
                          <strong>Monthly Income:</strong> ${Number(application.monthlyIncome).toLocaleString()}
                        </div>
                        
                        <div>
                          <strong>Employer:</strong> {application.employer}
                          <span className="text-gray-500 ml-2">({application.employment})</span>
                        </div>
                        
                        <div>
                          <strong>Reference:</strong> {application.referenceName}
                          <div className="text-gray-600 text-xs">
                            {application.referencePhone} • {application.referenceRelation}
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Applied: {new Date(application.createdAt).toLocaleDateString()}</span>
                            <span>Approved: {new Date(application.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t">
                        <button
                          onClick={() => openApplicationModal(application)}
                          className="w-full text-center text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          View Full Application
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* View Toggle and Status Filter Tabs */}
        <div className="mb-6">
          {/* View Toggle: Active/Deleted */}
          <div className="flex gap-2 mb-3 bg-white p-3 rounded-lg shadow-sm">
            <button
              onClick={() => setViewFilter('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewFilter === 'active'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              📋 Active Requests
            </button>
            <button
              onClick={() => setViewFilter('deleted')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewFilter === 'deleted'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              🗑️ Deleted Requests
            </button>
          </div>

          {/* Status Filter (only for active view) */}
          {viewFilter === 'active' && (
            <div className="flex flex-wrap gap-2 bg-white p-3 rounded-lg shadow-sm">
              {[
                { key: 'all', label: 'All', count: statusCounts.all },
                { key: 'pending', label: 'Pending', count: statusCounts.pending },
                { key: 'working', label: 'Working', count: statusCounts.working },
                { key: 'finished', label: 'Finished', count: statusCounts.finished },
                { key: 'rejected', label: 'Rejected', count: statusCounts.rejected },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-none ${
                    statusFilter === tab.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="block sm:inline">{tab.label}</span>
                  <span className="block sm:inline sm:ml-1">({tab.count})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Requests Table - Mobile Card View / Desktop Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="py-3 px-6">Date</th>
                  <th scope="col" className="py-3 px-6">Name</th>
                  <th scope="col" className="py-3 px-6">Property</th>
                  <th scope="col" className="py-3 px-6">Issue</th>
                  <th scope="col" className="py-3 px-6">Status</th>
                  {viewFilter === 'deleted' && <th scope="col" className="py-3 px-6">Deleted Info</th>}
                  <th scope="col" className="py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request._id} className="bg-white border-b hover:bg-gray-50">
                    <td className="py-4 px-6">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 font-medium text-gray-900">
                      {request.fullname}
                    </td>
                    <td className="py-4 px-6">{request.address}</td>
                    <td className="py-4 px-6">
                      <div className="max-w-xs truncate" title={request.projectDescription}>
                        {request.projectDescription}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={request.status} />
                    </td>
                    {viewFilter === 'deleted' && (
                      <td className="py-4 px-6 text-xs">
                        {request.deletedAt && (
                          <div>
                            <div className="text-gray-500">
                              {Math.floor((Date.now() - new Date(request.deletedAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                            </div>
                            <div className="text-gray-400 text-xs">
                              by {request.deletedBy}
                            </div>
                            <div className="text-red-600 font-semibold mt-1">
                              {14 - Math.floor((Date.now() - new Date(request.deletedAt).getTime()) / (1000 * 60 * 60 * 24))} days left
                            </div>
                          </div>
                        )}
                      </td>
                    )}
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => openModal(request)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          📝 Manage
                        </button>
                        <button
                          onClick={() => handleOpenConversation(request._id, request.email)}
                          className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                        >
                          💬 Chat ({request.conversationLog?.length || 0})
                        </button>
                        {viewFilter === 'active' && (
                          <button
                            onClick={() => handleSoftDelete(request._id, request.address)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            🗑️ Delete
                          </button>
                        )}
                        {viewFilter === 'deleted' && (
                          <button
                            onClick={() => handleRecover(request._id, request.address)}
                            className="text-green-600 hover:text-green-800 font-medium text-sm"
                          >
                            ♻️ Recover
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block lg:hidden">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {viewFilter === 'deleted' 
                  ? 'No deleted requests found.'
                  : 'No requests found for the selected status.'}
              </div>
            ) : (
              <div className="divide-y">
                {filteredRequests.map((request) => (
                  <div key={request._id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{request.fullname}</h3>
                        <p className="text-sm text-gray-500">{request.address}</p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                    
                    {viewFilter === 'deleted' && request.deletedAt && (
                      <div className="mb-3 p-2 bg-red-50 rounded border border-red-200">
                        <div className="text-xs text-gray-600">
                          Deleted {Math.floor((Date.now() - new Date(request.deletedAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                          by {request.deletedBy}
                        </div>
                        <div className="text-xs text-red-600 font-semibold mt-1">
                          {14 - Math.floor((Date.now() - new Date(request.deletedAt).getTime()) / (1000 * 60 * 60 * 24))} days until permanent deletion
                        </div>
                      </div>
                    )}
                    
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 line-clamp-2">{request.projectDescription}</p>
                      {request.problemImageUrl && (
                        <div className="mt-2">
                          <span className="inline-flex items-center text-xs text-blue-600">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Photo attached
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => openModal(request)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 flex items-center"
                      >
                        📝 Manage
                      </button>
                      <button
                        onClick={() => handleOpenConversation(request._id, request.email)}
                        className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-purple-700 flex items-center"
                      >
                        💬 Chat ({request.conversationLog?.length || 0})
                      </button>
                      {viewFilter === 'active' && (
                        <button
                          onClick={() => handleSoftDelete(request._id, request.address)}
                          className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 flex items-center"
                        >
                          🗑️ Delete
                        </button>
                      )}
                      {viewFilter === 'deleted' && (
                        <button
                          onClick={() => handleRecover(request._id, request.address)}
                          className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-green-700 flex items-center"
                        >
                          ♻️ Recover
                        </button>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-3">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Desktop Empty State */}
          {filteredRequests.length === 0 && (
            <div className="hidden lg:block text-center py-8 text-gray-500">
              {viewFilter === 'deleted' 
                ? 'No deleted requests found.'
                : 'No requests found for the selected status.'}
            </div>
          )}
        </div>

        <RequestModal
          request={selectedRequest}
          isOpen={isModalOpen}
          onClose={closeModal}
          onUpdate={handleRequestUpdate}
        />

        <RentalApplicationModal
          application={selectedApplication}
          isOpen={isApplicationModalOpen}
          onClose={closeApplicationModal}
          onUpdate={handleApplicationUpdate}
          properties={allProperties}
        />

        <PropertyForm
          isOpen={showPropertyForm}
          onClose={handleClosePropertyForm}
          propertyOwners={propertyOwners}
          editingProperty={editingProperty}
          onPropertySaved={handlePropertySaved}
        />

        {/* Conversation Log Modal */}
        {showConversation && (
          <ConversationLog
            requestId={conversationRequestId}
            userEmail={conversationUserEmail}
            onClose={() => {
              setShowConversation(false);
              fetchRequests(); // Refresh to show updated conversation count
            }}
          />
        )}
      </div>
    </div>
  );
}