"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CheckoutContent = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applicationData, setApplicationData] = useState<any>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }
    
    // Get application data from URL params
    const listingName = searchParams.get('listingName') || '';
    const applicationId = searchParams.get('applicationId') || '';
    const clientSecret = searchParams.get('clientSecret') || '';
    
    if (!listingName || !applicationId || !clientSecret) {
      setError('Missing required payment information');
      return;
    }
    
    setApplicationData({
      listingName,
      applicationId,
      clientSecret
    });
  }, [session, status, router, searchParams]);

  const handleStripeCheckout = async () => {
    if (!applicationData) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Since we have a payment intent client secret, we need to create a checkout session
      // or use Stripe Elements. For now, let's redirect to a working payment flow
      
      // Create a checkout session instead of using payment intent
      const checkoutResponse = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 2500,
          listingName: applicationData.listingName,
          applicationId: applicationData.applicationId,
          userEmail: session?.user?.email,
        }),
      });

      if (!checkoutResponse.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await checkoutResponse.json();

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Now redirect to Stripe Checkout with proper session ID
      const { error } = await stripe.redirectToCheckout({
        sessionId: sessionId,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (err: any) {
      console.error('Stripe checkout error:', err);
      setError(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleManualPayment = async () => {
    if (!applicationData) return;
    
    setLoading(true);
    
    try {
      // For testing: simulate successful payment
      const response = await fetch('/api/stripe/rental-application-payment', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: 'test_payment_' + Date.now(),
          applicationId: applicationData.applicationId,
        }),
      });

      if (response.ok) {
        router.push(`/rental-application-success?listingName=${encodeURIComponent(applicationData.listingName)}&paymentStatus=completed`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment confirmation failed');
      }
    } catch (err: any) {
      console.error('Manual payment error:', err);
      setError(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session?.user) {
    return null; // Will redirect
  }

  if (error && !applicationData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Payment Error</h1>
          <p className="text-xl text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/rental-application')}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Return to Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
          Complete Your Payment
        </h1>
        
        {applicationData && (
          <div className="mb-8 p-6 bg-blue-50 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-800 mb-2">
              Application Summary
            </h2>
            <div className="space-y-2 text-blue-700">
              <p><strong>Property:</strong> {applicationData.listingName}</p>
              <p><strong>Applicant:</strong> {session.user.name}</p>
              <p><strong>Email:</strong> {session.user.email}</p>
              <p><strong>Application Fee:</strong> $25.00</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Production Payment Section */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Secure Payment with Stripe
            </h3>
            <p className="text-gray-600 mb-4">
              Click below to securely complete your $25 application fee payment through Stripe.
            </p>
            
            <button
              onClick={handleStripeCheckout}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Pay $25 with Stripe'}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Application
          </button>
        </div>
      </div>
    </div>
  );
};

const RentalApplicationCheckoutPage = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
};

export default RentalApplicationCheckoutPage;