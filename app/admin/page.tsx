"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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

  const handleFinishedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFinishedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setFinishedImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image');
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
        address: editingProperty.address || ''
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload-property-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image');
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
              <option value="occupied">Occupied</option>
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

  const fetchRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/manager-requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPropertyOwners = useCallback(async () => {
    try {
      const response = await fetch('/api/property-owners');
      if (response.ok) {
        const data = await response.json();
        setPropertyOwners(data.propertyOwners || []);
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
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.push('/dashboard');
    }
  }, [router, fetchRequests, fetchPropertyOwners, fetchProperties]);

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

  const handleRequestUpdate = (updatedRequest: ManagerRequest) => {
    setRequests(prev => 
      prev.map(req => 
        req._id === updatedRequest._id ? updatedRequest : req
      )
    );
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
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">
              Property Management ({filteredProperties.length} properties)
            </h2>
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
                              : property.status === "occupied"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {property.status}
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

        {/* Status Filter Tabs */}
        <div className="mb-6">
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
                    <td className="py-4 px-6">
                      <button
                        onClick={() => openModal(request)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Manage
                      </button>
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
                No requests found for the selected status.
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
                    
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                      <button
                        onClick={() => openModal(request)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Desktop Empty State */}
          {filteredRequests.length === 0 && (
            <div className="hidden lg:block text-center py-8 text-gray-500">
              No requests found for the selected status.
            </div>
          )}
        </div>

        <RequestModal
          request={selectedRequest}
          isOpen={isModalOpen}
          onClose={closeModal}
          onUpdate={handleRequestUpdate}
        />

        <PropertyForm
          isOpen={showPropertyForm}
          onClose={handleClosePropertyForm}
          propertyOwners={propertyOwners}
          editingProperty={editingProperty}
          onPropertySaved={handlePropertySaved}
        />
      </div>
    </div>
  );
}