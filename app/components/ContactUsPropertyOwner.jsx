"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";

export default function ContactUsPropertyOwner() {
  const router = useRouter();
  const { data: session } = useSession();
  
  // Get all property names from the database
  const [propertyNames, setPropertyNames] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  useEffect(() => {
    // Load properties from the database
    const loadProperties = async () => {
      try {
        const response = await fetch('/api/properties');
        if (response.ok) {
          const properties = await response.json();
          const names = properties.map(property => property.name).sort();
          setPropertyNames(names);
        } else {
          console.error('Failed to load properties');
        }
      } catch (error) {
        console.error('Error loading properties:', error);
      } finally {
        setLoadingProperties(false);
      }
    };

    loadProperties();
  }, []);

  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    phone: "",
    address: "",
    projectDescription: "",
    message: "",
  });

  // Pre-fill user information when session is available
  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        fullname: session.user.name || "",
        email: session.user.email || "",
        phone: session.user.phone || "",
      }));
    }
  }, [session]);

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
    if (!formData.address.trim()) newErrors.address = "Property address is required";
    if (!formData.projectDescription.trim())
      newErrors.projectDescription = "Project description is required";
    if (!formData.message.trim()) newErrors.message = "Message is required";
    return newErrors;
  }, [formData]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
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
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
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

        // Submit the form with image URL
        const requestData = {
          ...formData,
          problemImageUrl,
          userType: 'property-owner', // Indicate this is from a property owner
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
          setProblemImage(null);
          setProblemImagePreview(null);
          setTimeout(() => router.push("/property-owner-dashboard"), 3000);
        } else {
          const errorData = await res.json();
          setSubmitStatus(errorData.error || "Failed to send message");
        }
      } catch (error) {
        setSubmitStatus("Network error. Please try again later.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, problemImage, router, validateForm, uploadImage]
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md lg:max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Property Owner Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Submit a maintenance request for your properties
          </p>
        </div>
        
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-sm rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-6"
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
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Property Address <span className="text-red-500">*</span>
              </label>
              {loadingProperties ? (
                <div className="w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                  Loading properties...
                </div>
              ) : (
                <select
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base ${
                    errors.address ? "border-red-500" : "border-gray-300"
                  }`}
                  required
                  aria-describedby={errors.address ? "address-error" : undefined}
                >
                  <option value="">Select your property...</option>
                  {propertyNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
              {errors.address && (
                <p id="address-error" className="text-red-500 text-xs sm:text-sm mt-1">
                  {errors.address}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="projectDescription"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                What needs to be fixed? <span className="text-red-500">*</span>
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
                placeholder="Brief description of the issue..."
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
                placeholder="Please provide more details about the issue, when it occurs, etc."
                required
                aria-describedby={errors.message ? "message-error" : undefined}
              />
              {errors.message && (
                <p id="message-error" className="text-red-500 text-xs sm:text-sm mt-1">
                  {errors.message}
                </p>
              )}
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
                Max file size: 5MB. Supported formats: JPG, PNG, GIF
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
                ? "Request submitted successfully! We'll update you as we work on your project. Redirecting..."
                : submitStatus}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || uploadingImage || loadingProperties}
            className={`w-full py-3 sm:py-4 px-6 rounded-lg font-semibold text-white text-sm sm:text-base transition-colors ${
              isSubmitting || uploadingImage || loadingProperties
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {uploadingImage 
              ? "Uploading image..." 
              : isSubmitting 
                ? "Submitting..." 
                : loadingProperties
                  ? "Loading..."
                  : "Submit Request"
            }
          </button>
        </form>
      </div>
    </div>
  );
}