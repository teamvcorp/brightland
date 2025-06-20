"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ContactUs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingName = searchParams.get("listingName") || "";
  const listingType = searchParams.get("listingType") || "";

  // Wrap useSearchParams in a Suspense boundary as recommended by Next.js
  // See: https://nextjs.org/docs/messages/missing-suspense-with-use-search-params
  if (!searchParams) {
    // This will trigger Suspense fallback until searchParams is available
    throw Promise.resolve();
  }

  const initialMessage = listingName
    ? `I'm interested in ${listingName} (${listingType}).`
    : "";

  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    phone: "",
    message: initialMessage,
    listingName,
    listingType,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  useEffect(() => {
    if (listingName) {
      setFormData((prev) => ({
        ...prev,
        message: initialMessage,
        listingName,
        listingType,
      }));
    }
  }, [listingName, listingType, initialMessage]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.fullname.trim()) newErrors.fullname = "Full name is required";
    if (!formData.email.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/))
      newErrors.email = "Valid email is required";
    if (!formData.phone.match(/^\+?[\d\s-]{10,}$/))
      newErrors.phone = "Valid phone number is required";
    if (!formData.message.trim()) newErrors.message = "Message is required";
    return newErrors;
  }, [formData]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
    setSubmitStatus(null);
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
        const res = await fetch("/api/resend/contact", {
          method: "POST",
          body: JSON.stringify(formData),
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
            message: listingName ? initialMessage : "",
            listingName,
            listingType,
          });
          setTimeout(() => router.push("/"), 2000);
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
    [formData, router, validateForm, listingName, listingType, initialMessage]
  );

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-8">
      <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
        Contact Us
      </h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-xl p-6 sm:p-8"
        noValidate
      >
        <fieldset className="mb-6">
          <legend className="text-lg font-semibold text-gray-800 mb-4">
            Your Details
            <span className="text-sm text-gray-500 ml-2">
              (Detalles de los padres)
            </span>
          </legend>

          <div className="mb-5">
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
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.fullname ? "border-red-500" : "border-gray-300"
              }`}
              required
              aria-describedby={errors.fullname ? "fullname-error" : undefined}
            />
            {errors.fullname && (
              <p id="fullname-error" className="text-red-500 text-sm mt-1">
                {errors.fullname}
              </p>
            )}
          </div>

          <div className="mb-5">
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
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              required
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-red-500 text-sm mt-1">
                {errors.email}
              </p>
            )}
          </div>

          <div className="mb-5">
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
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.phone ? "border-red-500" : "border-gray-300"
              }`}
              required
              aria-describedby={errors.phone ? "phone-error" : undefined}
            />
            {errors.phone && (
              <p id="phone-error" className="text-red-500 text-sm mt-1">
                {errors.phone}
              </p>
            )}
          </div>
        </fieldset>

        <div className="mb-6">
          <label
            htmlFor="message"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            rows="5"
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.message ? "border-red-500" : "border-gray-300"
            }`}
            required
            aria-describedby={errors.message ? "message-error" : undefined}
          />
          {errors.message && (
            <p id="message-error" className="text-red-500 text-sm mt-1">
              {errors.message}
            </p>
          )}
        </div>

        <input
          type="hidden"
          name="listingName"
          value={formData.listingName}
        />
        <input
          type="hidden"
          name="listingType"
          value={formData.listingType}
        />

        {submitStatus && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm text-center ${
              submitStatus === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {submitStatus === "success"
              ? "Message sent successfully! Redirecting..."
              : submitStatus}
          </div>
        )}

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
              isSubmitting
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {isSubmitting ? "Sending..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}