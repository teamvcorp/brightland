"use client";
import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function LicenseAgreementForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    day: "",
    month: "",
    year: "",
    licensee_name: "",
    premises_address: "",
    start_date: "",
    monthly_payment: "",
    adults: "",
    child: "",
    bank_name: "",
    routing_number: "",
    account_number: "",
    account_holder: "",
    payment_frequency: "",
    security_deposit: "",
    licensor_signature: "Brightland Properties", // Pre-filled for Licensor
    licensor_date: new Date().toLocaleDateString(), // Pre-filled with current date
    licensee_signature: "",
    licensee_date: "",
  });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.day || !formData.month || !formData.year) newErrors.date = "Complete date is required";
    if (!formData.licensee_name.trim()) newErrors.licensee_name = "Licensee name is required";
    if (!formData.premises_address.trim()) newErrors.premises_address = "Premises address is required";
    if (!formData.start_date.trim()) newErrors.start_date = "Start date is required";
    if (!formData.monthly_payment.trim()) newErrors.monthly_payment = "Monthly payment is required";
    if (!formData.adults.trim()) newErrors.adults = "Number of adults is required";
    if (!formData.child.trim()) newErrors.child = "Number of children is required";
    if (!formData.security_deposit.trim()) newErrors.security_deposit = "Security deposit is required";
    if (!formData.licensee_signature.trim()) newErrors.licensee_signature = "Licensee signature is required";
    if (!formData.licensee_date.trim()) newErrors.licensee_date = "Licensee date is required";
    return newErrors;
  }, [formData]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
    setSubmitStatus(null);
  }, []);

  const handleFileChange = useCallback((e) => {
    setFile(e.target.files[0]);
    setSubmitStatus(null);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0 && !file) {
        setErrors(validationErrors);
        return;
      }

      setIsSubmitting(true);
      setSubmitStatus(null);

      try {
        const data = new FormData();
        if (file) {
          data.append("file", file);
        } else {
          Object.entries(formData).forEach(([key, value]) => {
            data.append(key, value);
          });
        }

        const res = await fetch("/api/resend/license", {
          method: "POST",
          body: data,
        });

        if (res.ok) {
          setSubmitStatus("success");
          setFormData({
            day: "",
            month: "",
            year: "",
            licensee_name: "",
            premises_address: "",
            start_date: "",
            monthly_payment: "",
            adults: "",
            child: "",
            bank_name: "",
            routing_number: "",
            account_number: "",
            account_holder: "",
            payment_frequency: "",
            security_deposit: "",
            licensor_signature: "Brightland Properties",
            licensor_date: new Date().toLocaleDateString(),
            licensee_signature: "",
            licensee_date: "",
          });
          setFile(null);
          setTimeout(() => router.push("/"), 2000);
        } else {
          const errorData = await res.json();
          setSubmitStatus(errorData.error || "Failed to send agreement");
        }
      } catch (error) {
        setSubmitStatus("Network error. Please try again later.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, file, router, validateForm]
  );

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-8">
      <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
        License to Occupy Agreement
      </h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-xl p-6 sm:p-8"
        noValidate
      >
        <fieldset className="mb-6">
          <legend className="text-lg font-semibold text-gray-800 mb-4">
            Agreement Details
          </legend>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agreement Date <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="day"
                value={formData.day}
                onChange={handleInputChange}
                placeholder="Day"
                className={`w-20 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.date ? "border-red-500" : "border-gray-300"
                }`}
                required
              />
              <input
                type="text"
                name="month"
                value={formData.month}
                onChange={handleInputChange}
                placeholder="Month"
                className={`w-24 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.date ? "border-red-500" : "border-gray-300"
                }`}
                required
              />
              <input
                type="text"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                placeholder="Year"
                className={`w-20 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.date ? "border-red-500" : "border-gray-300"
                }`}
                required
              />
            </div>
            {errors.date && (
              <p className="text-red-500 text-sm mt-1">{errors.date}</p>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Licensee Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="licensee_name"
              value={formData.licensee_name}
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.licensee_name ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
            {errors.licensee_name && (
              <p className="text-red-500 text-sm mt-1">{errors.licensee_name}</p>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Premises Address <span className="text-red-500">*</span>
            </label>
            <textarea
              name="premises_address"
              value={formData.premises_address}
              onChange={handleInputChange}
              rows="2"
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.premises_address ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
            {errors.premises_address && (
              <p className="text-red-500 text-sm mt-1">{errors.premises_address}</p>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.start_date ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
            {errors.start_date && (
              <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Payment <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="monthly_payment"
              value={formData.monthly_payment}
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.monthly_payment ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
            {errors.monthly_payment && (
              <p className="text-red-500 text-sm mt-1">{errors.monthly_payment}</p>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Occupancy <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="adults"
                value={formData.adults}
                onChange={handleInputChange}
                placeholder="Adults"
                className={`w-24 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.adults ? "border-red-500" : "border-gray-300"
                }`}
                required
              />
              <input
                type="text"
                name="child"
                value={formData.child}
                onChange={handleInputChange}
                placeholder="Children"
                className={`w-24 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.child ? "border-red-500" : "border-gray-300"
                }`}
                required
              />
            </div>
            {(errors.adults || errors.child) && (
              <p className="text-red-500 text-sm mt-1">{errors.adults || errors.child}</p>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Frequency <span className="text-red-500">*</span>
            </label>
            <select
              name="payment_frequency"
              value={formData.payment_frequency}
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.payment_frequency ? "border-red-500" : "border-gray-300"
              }`}
              required
            >
              <option value="">Select Frequency</option>
              <option value="Weekly">Weekly</option>
              <option value="Bi-weekly">Bi-weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
            {errors.payment_frequency && (
              <p className="text-red-500 text-sm mt-1">{errors.payment_frequency}</p>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank Information
            </label>
            <input
              type="text"
              name="bank_name"
              value={formData.bank_name}
              onChange={handleInputChange}
              placeholder="Bank Name"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
            />
            <input
              type="text"
              name="routing_number"
              value={formData.routing_number}
              onChange={handleInputChange}
              placeholder="Routing Number"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 mt-2"
            />
            <input
              type="text"
              name="account_number"
              value={formData.account_number}
              onChange={handleInputChange}
              placeholder="Account Number (Last 4 Digits)"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 mt-2"
            />
            <input
              type="text"
              name="account_holder"
              value={formData.account_holder}
              onChange={handleInputChange}
              placeholder="Account Holder"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 mt-2"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Security Deposit <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="security_deposit"
              value={formData.security_deposit}
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.security_deposit ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
            {errors.security_deposit && (
              <p className="text-red-500 text-sm mt-1">{errors.security_deposit}</p>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Licensee Signature <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="licensee_signature"
              value={formData.licensee_signature}
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.licensee_signature ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
            {errors.licensee_signature && (
              <p className="text-red-500 text-sm mt-1">{errors.licensee_signature}</p>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Licensee Date <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="licensee_date"
              value={formData.licensee_date}
              onChange={handleInputChange}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.licensee_date ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
            {errors.licensee_date && (
              <p className="text-red-500 text-sm mt-1">{errors.licensee_date}</p>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload Filled PDF (Optional)
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="w-full p-3 border rounded-lg border-gray-300"
            />
          </div>
        </fieldset>

        {submitStatus && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm text-center ${
              submitStatus === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {submitStatus === "success"
              ? "Agreement sent successfully! Redirecting..."
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
            {isSubmitting ? "Submitting..." : "Submit Agreement"}
          </button>
        </div>
      </form>
      <div className="text-center mt-4">
        <a
          href="/license-agreement.pdf"
          download
          className="text-blue-500 hover:underline"
        >
          Download License Agreement PDF
        </a>
      </div>
    </div>
  );
}