"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ContactUsHome() {
  const router = useRouter();
  
  // Get all property owners from the database
  const [propertyOwners, setPropertyOwners] = useState([]);
  const [selectedPropertyOwner, setSelectedPropertyOwner] = useState('');
  const [availableAddresses, setAvailableAddresses] = useState([]);

  useEffect(() => {
    const fetchPropertyOwners = async () => {
      try {
        const response = await fetch('/api/property-owners');
        if (response.ok) {
          const data = await response.json();
          setPropertyOwners(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error fetching property owners:', error);
      }
    };

    fetchPropertyOwners();
  }, []);

  // Update available addresses when property owner is selected
  useEffect(() => {
    if (selectedPropertyOwner) {
      const owner = propertyOwners.find(po => po.name === selectedPropertyOwner);
      if (owner && owner.properties) {
        const addresses = owner.properties.map(prop => {
          const addr = prop.address;
          return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`;
        });
        setAvailableAddresses(addresses);
      } else {
        setAvailableAddresses([]);
      }
    } else {
      setAvailableAddresses([]);
    }
  }, [selectedPropertyOwner, propertyOwners]);

  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    phone: "",
    address: "",
    projectDescription: "",
    message: "",
    proposedBudget: "",
  });
  
  const [isAddressNotListed, setIsAddressNotListed] = useState(false);
  const [customAddress, setCustomAddress] = useState("");
  const [problemImage, setProblemImage] = useState(null);
  const [problemImagePreview, setProblemImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.fullname.trim()) newErrors.fullname = "Full name is required";
    if (!formData.email.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/))
      newErrors.email = "Valid email is required";
    if (!formData.phone.match(/^\+?[\d\s-]{10,}$/))
      newErrors.phone = "Valid phone number is required";
    
    // Validate address - either from dropdown or custom input
    if (isAddressNotListed) {
      if (!customAddress.trim()) newErrors.customAddress = "Please enter the property address";
    } else {
      if (!formData.address.trim()) newErrors.address = "Please select a property address";
    }
    
    if (!formData.projectDescription.trim())
      newErrors.projectDescription = "Project description is required";
    if (!formData.message.trim()) newErrors.message = "Message is required";
    return newErrors;
  }, [formData, isAddressNotListed, customAddress]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // Handle address dropdown change
    if (name === 'address') {
      if (value === 'NOT_LISTED') {
        setIsAddressNotListed(true);
        setFormData((prev) => ({ ...prev, address: '' }));
      } else {
        setIsAddressNotListed(false);
        setCustomAddress('');
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
    setErrors((prev) => ({ ...prev, [name]: null }));
    setSubmitStatus(null);
  }, []);

  const handleCustomAddressChange = useCallback((e) => {
    setCustomAddress(e.target.value);
    setErrors((prev) => ({ ...prev, customAddress: null }));
    setSubmitStatus(null);
  }, []);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setProblemImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setProblemImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  }, []);

  const uploadImage = useCallback(async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Try to get the response as text first to avoid JSON parse errors
        const responseText = await response.text();
        
        // Check if it's JSON
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || 'Failed to upload image');
        } catch (parseError) {
          // Not JSON, likely HTML error page
          if (responseText.includes('Request Entity Too Large') || responseText.includes('413')) {
            throw new Error('Image file is too large. Please use an image smaller than 4.5MB.');
          }
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setSubmitStatus("Please correct the errors below before submitting");
        // Scroll to top to show error message
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setIsSubmitting(true);
      setSubmitStatus(null);

      try {
        let problemImageUrl = null;

        // Upload image if one was selected
        if (problemImage) {
          setUploadingImage(true);
          try {
            problemImageUrl = await uploadImage(problemImage, 'problem');
          } catch (imageError) {
            setSubmitStatus(`Image upload failed: ${imageError.message}`);
            setIsSubmitting(false);
            setUploadingImage(false);
            return;
          }
          setUploadingImage(false);
        }

        // Submit the form with image URL - using manager API with home-owner flag
        // Use custom address if "Not Listed" was selected
        const finalAddress = isAddressNotListed ? customAddress : formData.address;
        
        const requestData = {
          ...formData,
          address: finalAddress,
          propertyName: selectedPropertyOwner || 'Unknown Property',
          proposedBudget: formData.proposedBudget ? parseFloat(formData.proposedBudget) : null,
          problemImageUrl,
          userType: 'home-owner', // Flag to identify home owner requests
        };

        const res = await fetch("/api/resend/manager", {
          method: "POST",
          body: JSON.stringify(requestData),
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (res.ok) {
          setSubmitStatus("success");
          setFormData({
            fullname: "",
            email: "",
            phone: "",
            address: "",
            projectDescription: "",
            message: "",
          });
          setIsAddressNotListed(false);
          setCustomAddress("");
          setProblemImage(null);
          setProblemImagePreview(null);
          setTimeout(() => router.push("/"), 3000);
        } else {
          // Better error handling
          let errorMessage = "Failed to submit request";
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
            
            // Make errors more user-friendly
            if (errorMessage.includes("Missing required fields")) {
              errorMessage = "Please fill in all required fields (marked with *)";
            } else if (errorMessage.includes("Invalid email")) {
              errorMessage = "Please enter a valid email address";
            } else if (errorMessage.includes("Invalid phone")) {
              errorMessage = "Please enter a valid phone number (at least 10 digits)";
            }
          } catch (parseError) {
            // If response isn't JSON, use generic message
            console.error('Error parsing response:', parseError);
          }
          setSubmitStatus(errorMessage);
        }
      } catch (error) {
        setSubmitStatus("Network error. Please try again later.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, problemImage, router, validateForm, uploadImage, isAddressNotListed, customAddress, selectedPropertyOwner]
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md lg:max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Home Repair Request
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Submit a repair or maintenance request for your home
          </p>
        </div>
        
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-sm rounded-lg p-4 mb-10 sm:p-6 space-y-4 sm:space-y-6"
          noValidate
        >
          {/* Personal Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              Your Information
            </h2>

            <div>
              <label
                htmlFor="fullname"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="fullname"
                name="fullname"
                value={formData.fullname}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base ${
                  errors.fullname ? "border-red-500" : "border-gray-300"
                }`}
                required
                aria-describedby={errors.fullname ? "fullname-error" : undefined}
              />
              {errors.fullname && (
                <p id="fullname-error" className="text-red-500 text-xs sm:text-sm mt-1">
                  {errors.fullname}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                  required
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-red-500 text-xs sm:text-sm mt-1">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base ${
                    errors.phone ? "border-red-500" : "border-gray-300"
                  }`}
                  required
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                />
                {errors.phone && (
                  <p id="phone-error" className="text-red-500 text-xs sm:text-sm mt-1">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Property & Issue Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              Issue Details
            </h2>

            <div>
              <label
                htmlFor="propertyOwner"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Property Name <span className="text-red-500">*</span>
              </label>
              <select
                id="propertyOwner"
                name="propertyOwner"
                value={selectedPropertyOwner}
                onChange={(e) => {
                  setSelectedPropertyOwner(e.target.value);
                  setFormData(prev => ({ ...prev, address: '' }));
                  setIsAddressNotListed(false);
                }}
                className="w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base border-gray-300"
                required
              >
                <option value="">Select property name...</option>
                {propertyOwners.map((owner) => (
                  <option key={owner._id} value={owner.name}>
                    {owner.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPropertyOwner && (
              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Specific Address <span className="text-red-500">*</span>
                </label>
                <select
                  id="address"
                  name="address"
                  value={isAddressNotListed ? 'NOT_LISTED' : formData.address}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base ${
                    errors.address ? "border-red-500" : "border-gray-300"
                  }`}
                  required
                  aria-describedby={errors.address ? "address-error" : undefined}
                >
                  <option value="">Select specific address...</option>
                  {availableAddresses.map((addr, idx) => (
                    <option key={idx} value={addr}>
                      {addr}
                    </option>
                  ))}
                  <option value="NOT_LISTED">Address not listed - Enter manually</option>
                </select>
                {errors.address && (
                  <p id="address-error" className="text-red-500 text-xs sm:text-sm mt-1">
                    {errors.address}
                  </p>
                )}
              </div>
            )}

            {/* Custom Address Input - Only show when "Not Listed" is selected */}
            {isAddressNotListed && (
              <div className="mt-4">
                <label
                  htmlFor="customAddress"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Enter Property Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="customAddress"
                  name="customAddress"
                  value={customAddress}
                  onChange={handleCustomAddressChange}
                  placeholder="Enter full property address..."
                  className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base ${
                    errors.customAddress ? "border-red-500" : "border-gray-300"
                  }`}
                  required
                  aria-describedby={errors.customAddress ? "customAddress-error" : undefined}
                />
                {errors.customAddress && (
                  <p id="customAddress-error" className="text-red-500 text-xs sm:text-sm mt-1">
                    {errors.customAddress}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  This address will be associated with your account for future requests
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="projectDescription"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                What needs to be repaired? <span className="text-red-500">*</span>
              </label>
              <textarea
                id="projectDescription"
                name="projectDescription"
                value={formData.projectDescription}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base ${
                  errors.projectDescription ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Brief description of the repair needed..."
                required
                aria-describedby={errors.projectDescription ? "projectDescription-error" : undefined}
              />
              {errors.projectDescription && (
                <p id="projectDescription-error" className="text-red-500 text-xs sm:text-sm mt-1">
                  {errors.projectDescription}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Additional Details <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                rows={4}
                className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base ${
                  errors.message ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Please provide more details about the repair, when it's needed, etc."
                required
                aria-describedby={errors.message ? "message-error" : undefined}
              />
              {errors.message && (
                <p id="message-error" className="text-red-500 text-xs sm:text-sm mt-1">
                  {errors.message}
                </p>
              )}
            </div>

            {/* Proposed Budget Field */}
            <div>
              <label
                htmlFor="proposedBudget"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Proposed Budget (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 sm:top-3.5 text-gray-500">$</span>
                <input
                  type="number"
                  id="proposedBudget"
                  name="proposedBudget"
                  value={formData.proposedBudget}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter an estimated budget for this repair if you have one
              </p>
            </div>

            {/* Image Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo of the Issue (Optional)
              </label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {problemImagePreview && (
                  <div className="relative">
                    <Image
                      src={problemImagePreview}
                      alt="Problem preview"
                      width={384}
                      height={192}
                      className="w-full max-w-xs h-48 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProblemImage(null);
                        setProblemImagePreview(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Max file size: 4.5MB. Supported formats: JPG, PNG, GIF
              </p>
            </div>
          </div>

          {/* Status Message */}
          {submitStatus && (
            <div
              className={`p-3 sm:p-4 rounded-lg text-sm sm:text-base text-center ${
                submitStatus === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {submitStatus === "success"
                ? "Request submitted successfully! We'll update you as we work on your repair. Redirecting..."
                : submitStatus}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || uploadingImage}
            className={`w-full py-3 sm:py-4 px-6 rounded-lg font-semibold text-white text-sm sm:text-base transition-colors ${
              isSubmitting || uploadingImage
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {uploadingImage 
              ? "Uploading image..." 
              : isSubmitting 
                ? "Submitting..." 
                : "Submit Request"
            }
          </button>
        </form>
      </div>
    </div>
  );
}