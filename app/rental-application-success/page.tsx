"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const RentalApplicationSuccessContent = () => {
  const searchParams = useSearchParams();
  const [listingName, setListingName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('checking');
  const [applicationId, setApplicationId] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');

  useEffect(() => {
    const name = searchParams.get('listingName') || '';
    const paymentIntent = searchParams.get('paymentIntent') || '';
    const appId = searchParams.get('applicationId') || '';
    const sessionId = searchParams.get('session_id') || '';
    
    setListingName(name);
    setApplicationId(appId);

    // Handle different payment confirmation methods
    if (sessionId) {
      // Stripe Checkout success
      confirmCheckoutSession(sessionId, appId);
    } else if (paymentIntent && appId) {
      // Payment Intent confirmation
      setPaymentIntentId(paymentIntent);
      confirmPayment(paymentIntent, appId);
    } else {
      setPaymentStatus('completed');
    }
  }, [searchParams]);

  const confirmCheckoutSession = async (sessionId: string, applicationId: string) => {
    try {
      console.log('Confirming checkout session:', { sessionId, applicationId });
      
      const response = await fetch('/api/stripe/confirm-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          applicationId,
        }),
      });

      if (response.ok) {
        console.log('Checkout session confirmed successfully');
        setPaymentStatus('completed');
      } else {
        const error = await response.json();
        console.error('Checkout session confirmation failed:', error);
        setPaymentStatus('failed');
      }
    } catch (error) {
      console.error('Error confirming checkout session:', error);
      setPaymentStatus('failed');
    }
  };

  const confirmPayment = async (paymentIntentId: string, applicationId: string) => {
    try {
      console.log('Confirming payment:', { paymentIntentId, applicationId });
      
      const response = await fetch('/api/stripe/rental-application-payment', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          applicationId,
        }),
      });

      if (response.ok) {
        console.log('Payment confirmed successfully');
        setPaymentStatus('completed');
      } else {
        const error = await response.json();
        console.error('Payment confirmation failed:', error);
        setPaymentStatus('failed');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      setPaymentStatus('failed');
    }
  };

  if (paymentStatus === 'checking') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Confirming Your Payment...
          </h1>
          <p className="text-gray-600">
            Please wait while we verify your payment and finalize your application.
          </p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Payment Verification Failed
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            There was an issue confirming your payment. Please contact support.
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Payment Intent:</strong> {paymentIntentId}</p>
            <p><strong>Application ID:</strong> {applicationId}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Application Submitted Successfully!
          </h1>
          {listingName && (
            <p className="text-xl text-gray-600 mb-6">
              Your application for <strong>{listingName}</strong> has been received and your $25 application fee has been processed.
            </p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-800 mb-3">What happens next?</h2>
          <ul className="text-left text-blue-700 space-y-2">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Your application will be reviewed by the property management team
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              We will contact your references for verification
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              You will receive an email notification with the decision within 3-5 business days
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              If approved, we will provide lease documents and move-in instructions
            </li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Important Notes:</h3>
          <ul className="text-left text-yellow-700 space-y-1">
            <li>• Please ensure your phone is available for reference verification calls</li>
            <li>• The $25 application fee is non-refundable</li>
            <li>• You can track your application status by logging into your account</li>
            <li>• If you have questions, please contact our office</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/rentals"
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
          >
            View More Properties
          </Link>
          <Link
            href="/dashboard"
            className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors font-semibold"
          >
            Go to Dashboard
          </Link>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">Need Help?</h4>
          <p className="text-gray-600 text-sm">
            Contact our office at{' '}
            <a href="mailto:info@brightlandpm.com" className="text-blue-600 hover:underline">
              info@brightlandpm.com
            </a>{' '}
            or call us during business hours if you have any questions about your application.
          </p>
        </div>
      </div>
    </div>
  );
};

const RentalApplicationSuccessPage = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <RentalApplicationSuccessContent />
    </Suspense>
  );
};

export default RentalApplicationSuccessPage;