'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import Image from 'next/image';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function LinkBankPage() {
  const { data: session, status } = useSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [methodType, setMethodType] = useState('bank');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountType, setAccountType] = useState('individual');
  const router = useRouter();

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center bg-white text-black">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <Elements stripe={stripePromise}>
      <AddBankForm session={session} router={router} />
    </Elements>
  );
}

function AddBankForm({ session, router }: { session: any; router: any }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [methodType, setMethodType] = useState('bank');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountType, setAccountType] = useState('individual');

  const handleAddMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!stripe || !elements) {
        throw new Error('Stripe.js failed to load');
      }

      let token, tokenError;

      if (methodType === 'bank') {
        ({ token, error: tokenError } = await stripe.createToken('bank_account', {
          country: 'US',
          currency: 'usd',
          routing_number: routingNumber,
          account_number: accountNumber,
          account_holder_name: accountHolderName,
          account_holder_type: accountType,
        }));
      } else {
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('CardElement not found');
        }

        ({ token, error: tokenError } = await stripe.createToken(cardElement));
      }

      if (tokenError) {
        throw new Error(tokenError.message);
      }

      const response = await fetch('/api/stripe/add-bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId: token?.id, email: session.user.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add payment method');
      }

      alert('Payment method added successfully');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white text-black">
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96 bg-white p-8 rounded-lg shadow-md">
          <div>
            <Image
              alt="Your Company"
              src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
            <h2 className="mt-8 text-2xl font-bold tracking-tight text-gray-900">Add Payment Method</h2>
          </div>

          <div className="mt-10">
            <form onSubmit={handleAddMethod} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Method Type</label>
                <div className="mt-2 flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="bank"
                      checked={methodType === 'bank'}
                      onChange={(e) => setMethodType(e.target.value)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Bank Account</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="card"
                      checked={methodType === 'card'}
                      onChange={(e) => setMethodType(e.target.value)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Debit Card</span>
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700">
                  Account Holder Name
                </label>
                <input
                  id="accountHolderName"
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  required
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black bg-white"
                />
              </div>

              {methodType === 'bank' ? (
                <>
                  <div>
                    <label htmlFor="routingNumber" className="block text-sm font-medium text-gray-700">
                      Routing Number
                    </label>
                    <input
                      id="routingNumber"
                      type="text"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      required
                      className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
                      Account Number
                    </label>
                    <input
                      id="accountNumber"
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                      className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="accountType" className="block text-sm font-medium text-gray-700">
                      Account Type
                    </label>
                    <select
                      id="accountType"
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black bg-white"
                    >
                      <option value="individual">Individual</option>
                      <option value="company">Company</option>
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Debit Card Details</label>
                  <CardElement className="mt-2 p-4 border border-gray-300 rounded-md bg-white text-black" />
                </div>
              )}

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-300"
              >
                {loading ? 'Processing...' : 'Add Payment Method'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="relative hidden w-0 flex-1 lg:block">
        <Image
          alt=""
          src="https://images.unsplash.com/photo-1496917756835-20cb06e75b4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1908&q=80"
          fill
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
