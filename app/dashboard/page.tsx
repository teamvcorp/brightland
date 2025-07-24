'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import Link from 'next/link';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function DashboardPage() {
  const { data: session, status, update } = useSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [current40Percent, setCurrent40Percent] = useState(0);
  const [presetMin, setPresetMin] = useState(10); // Example preset, fetch from env or admin-only API
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.email) {
      fetchCurrent40Percent();
    }
  }, [session]);

  const fetchCurrent40Percent = async () => {
    try {
      const response = await fetch('/api/get-current-40-percent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email }),
      });
      const data = await response.json();
      if (response.ok) {
        setCurrent40Percent(data.current40Percent);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch current 40%');
    }
  };

  const handleUpdate40Percent = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/update-40-percent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email }),
      });
      const data = await response.json();
      if (response.ok) {
        setCurrent40Percent(data.new40Percent);
        alert(`Updated 40% to $${data.new40Percent}`);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to update 40%');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIdentity = async () => {
   if (!documentType) {
      setError('Please select a document type');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/stripe/verify-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email, documentType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to initiate verification');
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe.js failed to load');
      }

      const { error: verificationError } = await stripe.verifyIdentity(data.clientSecret);

      if (verificationError) {
        throw new Error(verificationError.message);
      }

      await update(); // Refresh session
      router.refresh(); // Refresh page
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
   setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/stripe/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 10000 }), // Example: $100.00
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment processing failed');
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe.js failed to load');
      }

      const { error: stripeError } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: { token: 'tok_visa' }, // Use test token for testing
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      alert(`Payment processed: ${data.paymentIntentId}`);
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96 bg-white p-8 rounded-lg shadow-md">
          <div>
            <img
              alt="Your Company"
              src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
              className="h-10 w-auto"
            />
            <h2 className="mt-8 text-2xl font-bold tracking-tight text-gray-900">Your Dashboard</h2>
          </div>

          <div className="mt-10 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">User Information</h3>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{session?.user?.name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{session?.user?.email || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Verification Status</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {session?.user?.identityVerificationStatus === 'verified' ? 'Verified' : 'Not Verified'}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900">Current 40% Payment</h3>
              <p className="mt-2 text-sm text-gray-900">${current40Percent.toFixed(2)}</p>
              {session?.user?.role === 'admin' && (
                <p className="mt-2 text-sm text-gray-500">Preset Min: ${presetMin.toFixed(2)}</p>
              )}
              <button
                onClick={handleUpdate40Percent}
                disabled={loading}
                className="mt-4 flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-300"
              >
                {loading ? 'Processing...' : 'Update 40% from Recent Deposit'}
              </button>
            </div>

            {!session?.user?.isVerified && (
              <div>
                <label htmlFor="documentType" className="block text-sm font-medium text-gray-700">
                  Document Type
                </label>
                <select
                  id="documentType"
                  name="documentType"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  required
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select an ID type</option>
                  <option value="passport">Passport</option>
                  <option value="id_card">ID Card</option>
                  <option value="driving_license">Driver’s License</option>
                </select>
                <button
                  onClick={handleVerifyIdentity}
                  disabled={loading || !documentType}
                  className="mt-4 flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-300"
                >
                  {loading ? 'Processing...' : 'Verify Your Identity'}
                </button>
              </div>
            )}

            {session?.user?.isVerified && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Additional Options</h3>
                <p className="text-sm text-gray-500">Your identity is verified! You can now:</p>
                <div className="space-y-2">
                  <Link href="/linkbank">
                    <button
                      className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                      Add Bank Account
                    </button>
                  </Link>
                  <button
                    onClick={handleProcessPayment}
                    disabled={loading}
                    className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-300"
                  >
                    {loading ? 'Processing...' : 'Process Payment'}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        </div>
      </div>
      <div className="relative hidden w-0 flex-1 lg:block">
        <img
          alt=""
          src="https://images.unsplash.com/photo-1496917756835-20cb06e75b4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1908&q=80"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
}