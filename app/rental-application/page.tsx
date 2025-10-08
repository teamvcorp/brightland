"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

const RentalApplicationContent = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [formData, setFormData] = useState({
    listingName: "",
    listingType: "",
    userPhone: "",
    employment: "",
    employer: "",
    monthlyIncome: "",
    socialSecurityLastFour: "",
    referenceName: "",
    referencePhone: "",
    referenceRelation: "",
    moveInDate: "",
    additionalInfo: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    // Get listing info from URL params
    const listingName = searchParams.get('listingName') || '';
    const listingType = searchParams.get('listingType') || '';
    
    setFormData(prev => ({
      ...prev,
      listingName,
      listingType,
      userPhone: session?.user?.phone || ''
    }));
  }, [searchParams, session]);

  // Redirect if not authenticated or not a tenant
  useEffect(() => {
    if (status === "loading") return; // Still loading
    
    if (!session?.user) {
      router.push('/signup');
      return;
    }
    
    if (session.user.userType === 'property-owner') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = ['userPhone', 'employment', 'employer', 'monthlyIncome', 'socialSecurityLastFour', 'referenceName', 'referencePhone', 'referenceRelation', 'moveInDate'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Validate SSN last 4 digits
    if (!/^\d{4}$/.test(formData.socialSecurityLastFour)) {
      alert('Please enter exactly 4 digits for the last four of your Social Security number');
      return;
    }

    // Validate monthly income is a number
    if (isNaN(Number(formData.monthlyIncome)) || Number(formData.monthlyIncome) <= 0) {
      alert('Please enter a valid monthly income amount');
      return;
    }

    setShowPayment(true);
  };

  const handlePayment = async () => {
    setIsSubmitting(true);
    
    try {
      // First submit the application
      const applicationResponse = await fetch('/api/rental-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userEmail: session?.user?.email,
          userName: session?.user?.name,
          userPhone: formData.userPhone,
        }),
      });

      if (!applicationResponse.ok) {
        const errorData = await applicationResponse.json();
        throw new Error(errorData.error || 'Failed to submit application');
      }

      const applicationData = await applicationResponse.json();
      
      // Then create payment intent
      const paymentResponse = await fetch('/api/stripe/rental-application-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 2500, // $25.00 in cents
          userEmail: session?.user?.email,
          listingName: formData.listingName,
          applicationId: applicationData.applicationId
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error || 'Payment processing failed');
      }

      const { clientSecret } = await paymentResponse.json();
      
      // For simplicity, we'll redirect to success page
      // In a real implementation, you'd integrate Stripe Elements here
      alert('Application submitted successfully! In a production environment, this would redirect to Stripe payment processing.');
      
      // Redirect to payment confirmation or success page
      router.push(`/rental-application-success?listingName=${encodeURIComponent(formData.listingName)}`);
      
    } catch (error) {
      console.error('Error processing application:', error);
      alert(`There was an error processing your application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session?.user || session.user.userType === 'property-owner') {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
          Rental Application
        </h1>
        
        {formData.listingName && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-800">
              Property: {formData.listingName}
            </h2>
            <p className="text-blue-600">Type: {formData.listingType}</p>
          </div>
        )}

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Applicant Information</h3>
          <p><strong>Name:</strong> {session.user.name}</p>
          <p><strong>Email:</strong> {session.user.email}</p>
          
          <div className="mt-4">
            <label htmlFor="userPhone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              id="userPhone"
              name="userPhone"
              value={formData.userPhone}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        {!showPayment ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="employment" className="block text-sm font-medium text-gray-700 mb-2">
                  Employment Status *
                </label>
                <select
                  id="employment"
                  name="employment"
                  value={formData.employment}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select employment status</option>
                  <option value="full-time">Full-time employed</option>
                  <option value="part-time">Part-time employed</option>
                  <option value="self-employed">Self-employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="retired">Retired</option>
                  <option value="student">Student</option>
                </select>
              </div>

              <div>
                <label htmlFor="employer" className="block text-sm font-medium text-gray-700 mb-2">
                  Employer/Company Name *
                </label>
                <input
                  type="text"
                  id="employer"
                  name="employer"
                  value={formData.employer}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter employer name"
                />
              </div>

              <div>
                <label htmlFor="monthlyIncome" className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Gross Income *
                </label>
                <input
                  type="number"
                  id="monthlyIncome"
                  name="monthlyIncome"
                  value={formData.monthlyIncome}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter monthly income"
                />
              </div>

              <div>
                <label htmlFor="socialSecurityLastFour" className="block text-sm font-medium text-gray-700 mb-2">
                  Last 4 Digits of Social Security Number *
                </label>
                <input
                  type="text"
                  id="socialSecurityLastFour"
                  name="socialSecurityLastFour"
                  value={formData.socialSecurityLastFour}
                  onChange={handleInputChange}
                  required
                  maxLength={4}
                  pattern="\d{4}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1234"
                />
              </div>

              <div>
                <label htmlFor="moveInDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Desired Move-in Date *
                </label>
                <input
                  type="date"
                  id="moveInDate"
                  name="moveInDate"
                  value={formData.moveInDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Reference Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="referenceName" className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Name *
                  </label>
                  <input
                    type="text"
                    id="referenceName"
                    name="referenceName"
                    value={formData.referenceName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label htmlFor="referencePhone" className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Phone *
                  </label>
                  <input
                    type="tel"
                    id="referencePhone"
                    name="referencePhone"
                    value={formData.referencePhone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label htmlFor="referenceRelation" className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship *
                  </label>
                  <select
                    id="referenceRelation"
                    name="referenceRelation"
                    value={formData.referenceRelation}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select relationship</option>
                    <option value="employer">Employer/Supervisor</option>
                    <option value="previous-landlord">Previous Landlord</option>
                    <option value="personal">Personal Reference</option>
                    <option value="family">Family Member</option>
                    <option value="friend">Friend</option>
                    <option value="coworker">Coworker</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Information (Optional)
              </label>
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                value={formData.additionalInfo}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any additional information you'd like to include..."
              />
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors text-lg font-semibold"
              >
                Review Application & Pay $25 Fee
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center">
            <div className="mb-6 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="text-xl font-semibold text-yellow-800 mb-4">
                Application Review & Payment
              </h3>
              <p className="text-yellow-700 mb-4">
                Please review your application information above. By proceeding with payment, you confirm that all information provided is accurate.
              </p>
              <div className="text-lg font-semibold text-yellow-800">
                Application Fee: $25.00
              </div>
              <p className="text-sm text-yellow-600 mt-2">
                This fee covers application processing and verification services.
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowPayment(false)}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to Edit
              </button>
              <button
                onClick={handlePayment}
                disabled={isSubmitting}
                className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processing...' : 'Pay $25 & Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const RentalApplicationPage = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <RentalApplicationContent />
    </Suspense>
  );
};

export default RentalApplicationPage;