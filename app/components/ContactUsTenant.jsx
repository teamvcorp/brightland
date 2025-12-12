"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";

export default function ContactUsTenant() {
  const router = useRouter();
  const { data: session } = useSession();

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
        address: session.user.address ? 
          `${session.user.address.street}, ${session.user.address.city}, ${session.user.address.state} ${session.user.address.zip}` : "",
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
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.projectDescription.trim())
      newErrors.projectDescription = "Project description is required";
    if (!formData.message.trim()) newErrors.message = "Message is required";
    if (!problemImage) newErrors.problemImage = "Photo of the issue is required";
    return newErrors;
  }, [formData, problemImage]);

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
      setErrors((prev) => ({ ...prev, problemImage: null }));
    }
  }, []);

  const removeImage = useCallback(() => {
    setProblemImage(null);
    setProblemImagePreview(null);
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
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
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
        // Upload problem image if exists
        let problemImageUrl = null;
        if (problemImage) {
          setUploadingImage(true);
          problemImageUrl = await uploadImage(problemImage, 'problem');
          setUploadingImage(false);
        }

        const requestData = {
          fullname: formData.fullname,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          projectDescription: formData.projectDescription,
          message: formData.message,
          problemImageUrl,
          userType: 'tenant',
        };

        const response = await fetch('/api/resend/manager', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        if (response.ok) {
          setSubmitStatus("✅ Request submitted successfully! Your property owner and our admin team have been notified. We'll get back to you soon!");
          setFormData({
            fullname: session?.user?.name || "",
            email: session?.user?.email || "",
            phone: session?.user?.phone || "",
            address: session?.user?.address ? 
              `${session.user.address.street}, ${session.user.address.city}, ${session.user.address.state} ${session.user.address.zip}` : "",
            projectDescription: "",
            message: "",
          });
          setProblemImage(null);
          setProblemImagePreview(null);
          setErrors({});

          // Redirect after 3 seconds
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
        } else {
          const error = await response.json();
          setSubmitStatus(`❌ ${error.error || "Failed to submit request. Please try again."}`);
        }
      } catch (error) {
        console.error("Submission error:", error);
        setSubmitStatus("❌ Network error. Please check your connection and try again.");
      } finally {
        setIsSubmitting(false);
        setUploadingImage(false);
      }
    },
    [formData, problemImage, validateForm, uploadImage, router, session]
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md lg:max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Submit Maintenance Request
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Report an issue with your rental property
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
                placeholder="Your full name"
                required
                aria-describedby={errors.fullname ? "fullname-error" : undefined}
              />
              {errors.fullname && (
                <p id="fullname-error" className="text-red-500 text-xs sm:text-sm mt-1">
                  {errors.fullname}
                </p>
              )}
            </div>

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
                placeholder="your.email@example.com"
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
                placeholder="(555) 123-4567"
                required
                aria-describedby={errors.phone ? "phone-error" : undefined}
              />
              {errors.phone && (
                <p id="phone-error" className="text-red-500 text-xs sm:text-sm mt-1">
                  {errors.phone}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Property Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base ${
                  errors.address ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Your rental property address"
                required
                aria-describedby={errors.address ? "address-error" : undefined}
              />
              {errors.address && (
                <p id="address-error" className="text-red-500 text-xs sm:text-sm mt-1">
                  {errors.address}
                </p>
              )}
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              Request Details
            </h2>

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
                placeholder="Brief description of the issue (e.g., Leaking faucet in kitchen)"
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
                placeholder="Please provide more details about the issue, when it started, how urgent it is, etc."
                required
                aria-describedby={errors.message ? "message-error" : undefined}
              />
              {errors.message && (
                <p id="message-error" className="text-red-500 text-xs sm:text-sm mt-1">
                  {errors.message}
                </p>
              )}
            </div>

            {/* Image Upload Section - REQUIRED */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photo of the Issue <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="problem-image-upload"
                />
                <label
                  htmlFor="problem-image-upload"
                  className={`flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    errors.problemImage 
                      ? "border-red-500 bg-red-50 hover:bg-red-100" 
                      : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="mt-1 text-sm text-gray-600">
                      Click to upload a photo
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </label>

                {problemImagePreview && (
                  <div className="relative">
                    <Image
                      src={problemImagePreview}
                      alt="Problem preview"
                      width={400}
                      height={300}
                      className="rounded-lg w-full h-auto"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                      aria-label="Remove image"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                {errors.problemImage && (
                  <p className="text-red-500 text-xs sm:text-sm">
                    {errors.problemImage}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {submitStatus && (
            <div
              className={`p-3 sm:p-4 rounded-lg text-sm sm:text-base ${
                submitStatus.startsWith("✅")
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {submitStatus}
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
              : "Submit Repair Request"
            }
          </button>
        </form>
      </div>
    </div>
  );
}
