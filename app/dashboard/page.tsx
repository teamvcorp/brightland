'use client';
import {
  CardElement,
  Elements,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
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
  const [presetMin, setPresetMin] = useState(10);
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
  });
  const router = useRouter();

  // Redirect managers to their dashboard
  useEffect(() => {
    if (session?.user?.userType === 'manager') {
      router.push('/manager-dashboard');
      return;
    }
  }, [session, router]);

  const [editingAddress, setEditingAddress] = useState(false);
  const [defaultPayment, setDefaultPayment] = useState<{
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null>(null);

  const [clientSecret, setClientSecret] = useState('');
  const [showCardForm, setShowCardForm] = useState(false);

  const fetchCurrent40Percent = async () => {
    try {
      const response = await fetch('/api/get-current-40-percent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email }),
      });
      const data = await response.json();
      if (response.ok) setCurrent40Percent(data.current40Percent);
      else setError(data.message);
    } catch {
      setError('Failed to fetch current 40%');
    }
  };

  const fetchAddress = async () => {
    try {
      const res = await fetch('/api/user/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email }),
      });
      const data = await res.json();
      if (res.ok && data.address) {
        setAddress(data.address);
      }
    } catch {
      console.error('Failed to fetch address');
    }
  };

  const fetchDefaultPaymentMethod = async () => {
    try {
      const response = await fetch('/api/stripe/default-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email }),
      });
      const data = await response.json();
      if (response.ok && data.paymentMethod) {
        setDefaultPayment(data.paymentMethod);
      }
    } catch {
      console.error('Failed to fetch default payment method');
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      fetchCurrent40Percent();
      fetchAddress();
      fetchDefaultPaymentMethod();
    }
  }, [session?.user?.email]);
  const handleAddressChange = (field: string, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };
  const handleSaveAddress = async () => {
    try {
      const res = await fetch('/api/user/update-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setEditingAddress(false);
    } catch (err) {
      setError('Failed to save address');
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
      } else setError(data.message);
    } catch {
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
      if (!response.ok) throw new Error(data.message || 'Failed to initiate verification');

      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe.js failed to load');

      const { error: verificationError } = await stripe.verifyIdentity(data.clientSecret);
      if (verificationError) throw new Error(verificationError.message);

      await update();
      router.refresh();
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
        body: JSON.stringify({ amount: current40Percent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Payment processing failed');

      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe.js failed to load');

      const { error: stripeError } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: { token: 'tok_visa' } },
      });

      if (stripeError) throw new Error(stripeError.message);

      alert(`Payment processed: ${data.paymentIntentId}`);
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };
  const handleRecurringPayment = async () => {
    try {
      const response = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: current40Percent }),
      });

      const data = await response.json();

      if (!response.ok || !data.clientSecret) {
        throw new Error(data.message || 'Failed to create subscription');
      }
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe.js failed to load');

      const result = await stripe.confirmCardPayment(data.clientSecret);

      if (result.error) {
        throw new Error(result.error.message);
      }

      alert('Recurring payment setup successful!');
      return result.paymentIntent;
    } catch (err: any) {
      alert(`Payment failed: ${err.message}`);
      console.error(err);
      return null;
    }
  }

  const handleStartUpdatePaymentMethod = async () => {
    const res = await fetch('/api/stripe/setup-intent', {
      method: 'POST',
    });
    const data = await res.json();
    if (res.ok) {
      setClientSecret(data.clientSecret);
      setShowCardForm(true);
    } else {
      setError(data.message);
    }
  };
  function CardUpdateForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
    const stripe = useStripe();
    const elements = useElements();

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements) return;

      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (result.error) {
        alert(result.error.message);
      } else {
        alert('Payment method updated!');
        onSuccess();
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <CardElement className="border p-2 rounded-md" />
        <button
          type="submit"
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-500"
        >
          Save New Card
        </button>
      </form>
    );
  }

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
    <div className="min-h-screen bg-gray-100 py-12 px-6 flex justify-center">
      <div className="w-full max-w-3xl bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900">Your Dashboard</h2>

        <div className="mt-8 space-y-6">
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
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {editingAddress ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Street"
                        value={address.street}
                        onChange={(e) => handleAddressChange('street', e.target.value)}
                        className="w-full rounded-md border px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="City"
                        value={address.city}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                        className="w-full rounded-md border px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={address.state}
                        onChange={(e) => handleAddressChange('state', e.target.value)}
                        className="w-full rounded-md border px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="ZIP"
                        value={address.zip}
                        onChange={(e) => handleAddressChange('zip', e.target.value)}
                        className="w-full rounded-md border px-2 py-1 text-sm"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveAddress}
                          className="mt-2 rounded-md bg-indigo-600 px-3 py-1 text-sm text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingAddress(false)}
                          className="mt-2 rounded-md border border-gray-300 px-3 py-1 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p>{address.street}, {address.city}, {address.state} {address.zip}</p>
                      <button
                        onClick={() => setEditingAddress(true)}
                        className="mt-2 rounded-md bg-indigo-600 px-3 py-1 text-sm text-white font-semibold hover:bg-indigo-500"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </dd>
              </div>

            </dl>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900">Current 40% Payment</h3>
            <p className="mt-2 text-sm text-gray-900">${(Math.floor(current40Percent / 100)).toFixed(2)}</p>
            {session?.user?.role === 'admin' && (
              <p className="mt-2 text-sm text-gray-500">Preset Min: ${presetMin.toFixed(2)}</p>
            )}
            <button
              onClick={handleUpdate40Percent}
              disabled={loading}
              className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-500 disabled:bg-indigo-300"
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
                className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-500 disabled:bg-indigo-300"
              >
                {loading ? 'Processing...' : 'Verify Your Identity'}
              </button>
            </div>
          )}

          {session?.user?.isVerified && (
            <div>
              <h3 className="text-lg font-medium text-gray-900">Additional Options</h3>
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Payment Method</h3>
                {defaultPayment ? (
                  <p className="text-sm text-gray-700">
                    {defaultPayment.brand.toUpperCase()} **** {defaultPayment.last4} (exp {defaultPayment.exp_month}/{defaultPayment.exp_year})
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">No default payment method found.</p>
                )}

                <button
                  onClick={handleStartUpdatePaymentMethod}
                  className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-500"
                >
                  Update Payment Method
                </button>

                {showCardForm && clientSecret && (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CardUpdateForm
                      clientSecret={clientSecret}
                      onSuccess={() => {
                        setShowCardForm(false);
                        fetchDefaultPaymentMethod();
                      }}
                    />
                  </Elements>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <Link href="/linkbank">
                  <button className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-500">
                    Add Bank Account
                  </button>
                </Link>
                <button
                  onClick={handleProcessPayment}
                  disabled={loading}
                  className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-500 disabled:bg-indigo-300"
                >
                  {loading ? 'Processing...' : 'Process Payment'}
                </button>
                <button
                  onClick={handleRecurringPayment}
                  disabled={loading}
                  className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-500 disabled:bg-indigo-300"
                >
                  {loading ? 'Processing...' : 'Recurring Payment'}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}
