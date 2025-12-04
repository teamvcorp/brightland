'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import Link from 'next/link';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function SetupPaymentsPage() {
  return (
    <Elements stripe={stripePromise}>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }>
        <PaymentSetupFlow />
      </Suspense>
    </Elements>
  );
}

function PaymentSetupFlow() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId');
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [application, setApplication] = useState<any>(null);
  const [propertyRent, setPropertyRent] = useState(0);
  
  // Step 1: Checking Account
  const [accountHolderName, setAccountHolderName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('individual');
  
  // Step 2: Security Deposit (auto-processed)
  const [depositProcessing, setDepositProcessing] = useState(false);
  
  // Stripe hooks
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (applicationId && session?.user?.email) {
      fetchApplication();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, session]);

  const fetchApplication = async () => {
    try {
      const response = await fetch(`/api/rental-application?userEmail=${session?.user?.email}`);
      const data = await response.json();
      const app = data.find((a: any) => a._id === applicationId);
      
      if (app) {
        setApplication(app);
        
        // Determine which step to start at based on completion status
        if (app.hasCreditCard && app.securityDepositPaid && app.hasCheckingAccount) {
          // All steps complete
          setCurrentStep(4);
        } else if (app.securityDepositPaid && app.hasCheckingAccount) {
          // Checking and deposit done, need credit card
          setCurrentStep(3);
        } else if (app.hasCheckingAccount) {
          // Checking done, but need to check if deposit was processed
          // This might happen if deposit failed
          setCurrentStep(2);
        } else {
          // Start from beginning
          setCurrentStep(1);
        }
        
        // Fetch property rent from property details
        fetchPropertyRent(app.listingName);
      }
    } catch (error) {
      console.error('Error fetching application:', error);
      setError('Failed to load application details');
    }
  };

  const fetchPropertyRent = async (propertyName: string) => {
    try {
      const response = await fetch('/api/properties');
      const properties = await response.json();
      const property = properties.find((p: any) => p.name === propertyName);
      if (property) {
        setPropertyRent(property.rent);
      }
    } catch (error) {
      console.error('Error fetching property rent:', error);
    }
  };

  const handleAddCheckingAccount = async () => {
    if (!stripe) {
      setError('Stripe is not loaded');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Send bank account details directly to backend
      // Backend will create payment method with proper billing details
      const response = await fetch('/api/tenant/add-checking-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          routingNumber,
          accountNumber,
          accountHolderName,
          accountType,
          email: session?.user?.email,
          applicationId 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if account already exists
        if (data.message && data.message.includes('already exists')) {
          setError('Checking account already added. Moving to next step...');
          setTimeout(() => {
            setCurrentStep(2);
            // Try to process security deposit if not already done
            if (application && !application.securityDepositPaid && data.achPaymentMethodId) {
              processSecurityDeposit(data.achPaymentMethodId);
            } else if (application && application.securityDepositPaid) {
              setCurrentStep(3); // Skip to credit card
            }
          }, 2000);
          return;
        }
        throw new Error(data.message || 'Failed to add checking account');
      }

      // Move to step 2 (security deposit)
      setCurrentStep(2);
      
      // Auto-process security deposit
      processSecurityDeposit(data.achPaymentMethodId);
    } catch (err: any) {
      setError(err.message || 'Failed to add checking account');
    } finally {
      setLoading(false);
    }
  };

  const processSecurityDeposit = async (paymentMethodId: string) => {
    setDepositProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/tenant/security-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email,
          applicationId,
          amount: propertyRent,
          paymentMethodId
        }),
      });

      const data = await response.json();
      console.log('Security deposit response:', data);

      if (!response.ok) {
        console.error('Security deposit failed:', data);
        throw new Error(data.message || 'Failed to process security deposit');
      }

      console.log('Security deposit successful, payment record ID:', data.paymentRecordId);

      // Move to step 3 (credit card)
      setCurrentStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to process security deposit');
    } finally {
      setDepositProcessing(false);
    }
  };

  const handleAddCreditCard = async () => {
    if (!stripe || !elements) {
      setError('Stripe is not loaded');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create card token
      const { token, error: tokenError } = await stripe.createToken(cardElement);

      if (tokenError) {
        throw new Error(tokenError.message);
      }

      // Send to backend
      const response = await fetch('/api/tenant/add-credit-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tokenId: token?.id,
          email: session?.user?.email,
          applicationId 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add credit card');
      }

      // Move to step 4 (review)
      setCurrentStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to add credit card');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.push('/dashboard');
  };

  if (status === 'loading' || !application) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Setup</h1>
          <p className="text-gray-600">Property: {application.listingName}</p>
          <p className="text-gray-600">Monthly Rent: ${propertyRent.toLocaleString()}</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <Step number={1} title="Checking Account" active={currentStep === 1} completed={currentStep > 1} />
            <div className="flex-1 h-1 bg-gray-200 mx-2">
              <div className={`h-full ${currentStep > 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
            </div>
            <Step number={2} title="Security Deposit" active={currentStep === 2} completed={currentStep > 2} />
            <div className="flex-1 h-1 bg-gray-200 mx-2">
              <div className={`h-full ${currentStep > 2 ? 'bg-green-500' : 'bg-gray-200'}`} />
            </div>
            <Step number={3} title="Credit Card" active={currentStep === 3} completed={currentStep > 3} />
            <div className="flex-1 h-1 bg-gray-200 mx-2">
              <div className={`h-full ${currentStep > 3 ? 'bg-green-500' : 'bg-gray-200'}`} />
            </div>
            <Step number={4} title="Complete" active={currentStep === 4} completed={currentStep > 4} />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Checking Account */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Add Checking Account</h2>
                <p className="text-gray-600 text-sm mb-4">
                  This account will be used for monthly rent payments (due on the 1st of each month).
                </p>
                {application?.hasCheckingAccount && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-sm">
                      ✓ Checking account already added. You can skip to the next step or update your account below.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Routing Number
                </label>
                <input
                  type="text"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="110000000"
                  maxLength={9}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="000123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Type
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="individual">Individual</option>
                  <option value="company">Company</option>
                </select>
              </div>

              <div className="flex gap-3">
                {application?.hasCheckingAccount && (
                  <button
                    onClick={() => {
                      if (application.securityDepositPaid) {
                        setCurrentStep(3); // Skip to credit card
                      } else {
                        setCurrentStep(2); // Go to deposit step
                      }
                    }}
                    className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700"
                  >
                    Skip to Next Step
                  </button>
                )}
                <button
                  onClick={handleAddCheckingAccount}
                  disabled={loading || !accountHolderName || !routingNumber || !accountNumber}
                  className={`${application?.hasCheckingAccount ? 'flex-1' : 'w-full'} bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300`}
                >
                  {loading ? 'Processing...' : application?.hasCheckingAccount ? 'Update Account' : 'Add Checking Account & Pay Deposit'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Security Deposit */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Security Deposit</h2>
                <p className="text-gray-600 mb-6">
                  We&apos;re processing your security deposit of ${propertyRent.toLocaleString()}.
                </p>
                {depositProcessing && (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
                  </div>
                )}
                {!depositProcessing && !error && (
                  <div className="text-green-600 text-6xl mb-4">✓</div>
                )}
                {!depositProcessing && error && (
                  <div className="space-y-4">
                    <div className="text-red-600 text-6xl mb-4">✗</div>
                    <p className="text-red-700 font-semibold">Payment Failed</p>
                    <p className="text-gray-700 text-sm">The security deposit charge was declined. Please check your bank account details and try again.</p>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="mt-4 w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700"
                    >
                      Return to Checking Account
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Credit Card */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Add Credit/Debit Card</h2>
                <p className="text-gray-600 text-sm mb-4">
                  This card will be used for fees and one-time charges.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Details
                </label>
                <div className="p-4 border rounded-lg">
                  <CardElement options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                          color: '#aab7c4',
                        },
                      },
                      invalid: {
                        color: '#9e2146',
                      },
                    },
                  }} />
                </div>
              </div>

              <button
                onClick={handleAddCreditCard}
                disabled={loading}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300"
              >
                {loading ? 'Processing...' : 'Add Credit Card'}
              </button>
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="space-y-6 text-center">
              <div className="text-green-600 text-6xl mb-4">✓</div>
              <h2 className="text-2xl font-semibold text-gray-900">Payment Setup Complete!</h2>
              <div className="bg-gray-50 rounded-lg p-6 space-y-3 text-left">
                <p className="text-gray-700"><strong>Property:</strong> {application.listingName}</p>
                <p className="text-gray-700"><strong>Monthly Rent:</strong> ${propertyRent.toLocaleString()}</p>
                <p className="text-gray-700"><strong>Rent Due Date:</strong> 1st of each month</p>
                <p className="text-gray-700"><strong>Security Deposit:</strong> ${propertyRent.toLocaleString()} (Paid)</p>
                <div className="pt-3 border-t">
                  <p className="text-green-600 font-semibold">✓ Checking Account Added</p>
                  <p className="text-green-600 font-semibold">✓ Credit Card Added</p>
                  <p className="text-green-600 font-semibold">✓ Security Deposit Paid</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                Your property manager will activate automatic rent payments shortly.
              </p>
              <button
                onClick={handleComplete}
                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ number, title, active, completed }: { number: number; title: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
        completed ? 'bg-green-500 text-white' :
        active ? 'bg-indigo-600 text-white' :
        'bg-gray-200 text-gray-600'
      }`}>
        {completed ? '✓' : number}
      </div>
      <p className={`mt-2 text-xs ${active ? 'text-indigo-600 font-semibold' : 'text-gray-600'}`}>
        {title}
      </p>
    </div>
  );
}
