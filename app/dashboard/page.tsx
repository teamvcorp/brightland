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
import { useUserData } from '../hooks';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface RentalApplication {
  _id: string;
  listingName: string;
  listingType: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  employment: string;
  employer: string;
  monthlyIncome: string;
  moveInDate: string;
  status: 'pending' | 'approved' | 'denied';
  paymentStatus: 'pending' | 'paid' | 'failed';
  applicationFee: number;
  createdAt: string;
  adminNotes?: string;
  // Payment setup status
  hasCheckingAccount?: boolean;
  hasCreditCard?: boolean;
  securityDepositPaid?: boolean;
}

export default function DashboardPage() {
  const { data: session, status, update } = useSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const router = useRouter();
  
  // Use custom hook for user data
  const {
    address,
    paymentMethod: defaultPayment,
    backupPaymentMethod: backupPayment,
    paymentWarning,
    payments,
    rentalApplications,
    refetchAddress,
    refetchPaymentMethod,
  } = useUserData(session?.user?.email || undefined);

  // Redirect managers and property owners to their respective dashboards
  useEffect(() => {
    if (session?.user?.userType === 'manager') {
      router.push('/manager-dashboard');
      return;
    }
    if (session?.user?.userType === 'property-owner') {
      // Check verification status before redirecting
      const checkVerificationStatus = async () => {
        try {
          const response = await fetch('/api/user/verification-status');
          if (response.ok) {
            const data = await response.json();
            
            if (data.propertyOwnerVerificationStatus === 'pending') {
              router.push('/property-owner-pending');
            } else if (data.propertyOwnerVerificationStatus === 'approved') {
              router.push('/property-owner-dashboard');
            } else {
              // Rejected or other status - stay on regular dashboard
              return;
            }
          } else {
            // If can't fetch status, redirect to dashboard anyway
            router.push('/property-owner-dashboard');
          }
        } catch (error) {
          console.error('Error checking verification status:', error);
          router.push('/property-owner-dashboard');
        }
      };
      
      checkVerificationStatus();
      return;
    }
  }, [session, router]);

  const [editingAddress, setEditingAddress] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [showCardForm, setShowCardForm] = useState(false);
  
  // Local state for editing address (syncs with address from hook)
  const [localAddress, setLocalAddress] = useState(address);
  
  // Sync local address when hook address changes
  useEffect(() => {
    setLocalAddress(address);
  }, [address]);

  const handleAddressChange = (field: string, value: string) => {
    setLocalAddress(prev => ({ ...prev, [field]: value as string }));
  };
  
  const handleSaveAddress = async () => {
    try {
      const res = await fetch('/api/user/update-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email, address: localAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setEditingAddress(false);
      // Refetch to get updated address
      await refetchAddress();
    } catch (err) {
      setError('Failed to save address');
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

        {/* Quick Action Buttons */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/tenant-request"
            className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Submit Maintenance Request
          </Link>
          <Link
            href="/rental-application"
            className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Apply for Rental
          </Link>
        </div>

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
                        value={localAddress.street}
                        onChange={(e) => handleAddressChange('street', e.target.value)}
                        className="w-full rounded-md border px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="City"
                        value={localAddress.city}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                        className="w-full rounded-md border px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={localAddress.state}
                        onChange={(e) => handleAddressChange('state', e.target.value)}
                        className="w-full rounded-md border px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="ZIP"
                        value={localAddress.zip}
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

          {/* Rental Applications Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">My Rental Applications</h3>
            {rentalApplications.length === 0 ? (
              <p className="text-sm text-gray-500">No rental applications submitted yet.</p>
            ) : (
              <div className="space-y-4">
                {rentalApplications.map((app: RentalApplication) => (
                  <div key={app._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{app.listingName}</h4>
                        <p className="text-sm text-gray-600">Type: {app.listingType}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                          app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          app.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {app.status ? app.status.charAt(0).toUpperCase() + app.status.slice(1) : 'Unknown'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-700 space-y-1">
                      <p><span className="font-medium">Submitted:</span> {new Date(app.createdAt).toLocaleDateString()}</p>
                      <p><span className="font-medium">Move-in Date:</span> {new Date(app.moveInDate).toLocaleDateString()}</p>
                      <p><span className="font-medium">Payment Status:</span> 
                        <span className={`ml-2 ${
                          app.paymentStatus === 'paid' ? 'text-green-600' : 
                          app.paymentStatus === 'pending' ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {app.paymentStatus ? app.paymentStatus.charAt(0).toUpperCase() + app.paymentStatus.slice(1) : 'Unknown'}
                        </span>
                      </p>
                      <p><span className="font-medium">Application Fee:</span> ${app.applicationFee.toFixed(2)}</p>
                    </div>

                    {app.status === 'pending' && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800">🔄 Application under review</p>
                      </div>
                    )}

                    {app.status === 'approved' && (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm text-green-800 font-semibold">🎉 Congratulations! Your application has been approved!</p>
                        {app.adminNotes && <p className="text-sm text-green-700 mt-1">{app.adminNotes}</p>}
                        
                        {/* Check if payment setup is complete */}
                        {!app.hasCheckingAccount || !app.hasCreditCard || !app.securityDepositPaid ? (
                          <div className="mt-3">
                            <p className="text-sm text-gray-700 mb-3">Complete these steps to move in:</p>
                            <div className="space-y-1 mb-3 text-sm">
                              <p className={app.hasCheckingAccount ? 'text-green-600' : 'text-gray-600'}>
                                {app.hasCheckingAccount ? '✓' : '☐'} Add Checking Account
                              </p>
                              <p className={app.securityDepositPaid ? 'text-green-600' : 'text-gray-600'}>
                                {app.securityDepositPaid ? '✓' : '☐'} Pay Security Deposit
                              </p>
                              <p className={app.hasCreditCard ? 'text-green-600' : 'text-gray-600'}>
                                {app.hasCreditCard ? '✓' : '☐'} Add Credit Card
                              </p>
                            </div>
                            <Link href={`/setup-payments?applicationId=${app._id}`}>
                              <button className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white text-sm font-semibold hover:bg-indigo-700">
                                {app.hasCheckingAccount || app.hasCreditCard || app.securityDepositPaid ? 
                                  'Continue Payment Setup' : 'Start Payment Setup'}
                              </button>
                            </Link>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <p className="text-sm text-green-700 font-semibold mb-2">✓ Payment setup complete!</p>
                            <p className="text-sm text-gray-700">Your property manager will activate automatic rent payments shortly.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {app.status === 'denied' && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800 font-semibold">❌ Application denied</p>
                        {app.adminNotes && <p className="text-sm text-red-700 mt-1">Reason: {app.adminNotes}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Payment History Section - Always show for tenants */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
                <button
                  onClick={() => {
                    setShowPaymentHistory(!showPaymentHistory);
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  {showPaymentHistory ? 'Hide History' : 'View History'}
                </button>
              </div>

              {showPaymentHistory && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {payments.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <p>No payment history found.</p>
                      <p className="text-xs mt-2">Payments will appear here once they are processed.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {payments.map((payment: any) => (
                            <tr key={payment._id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(payment.dueDate).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {payment.type === 'rent' ? 'Monthly Rent' :
                                 payment.type === 'security_deposit' ? 'Security Deposit' :
                                 payment.type === 'fee' ? 'Fee' :
                                 payment.type === 'late_fee' ? 'Late Fee' :
                                 payment.type === 'maintenance' ? 'Maintenance' :
                                 payment.type}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                ${payment.amount.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  payment.status === 'refunded' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {payment.paymentMethod === 'ach' ? 'Bank Account' : 'Credit Card'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {!session?.user?.isVerified && (
            <div id="identity-verification-section">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Identity Verification</h3>
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
                <h3 className="text-lg font-medium text-gray-900">Payment Methods</h3>
                
                {/* Primary Payment Method (Required: Bank Account) */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Primary (Default)</p>
                  {defaultPayment && defaultPayment.brand ? (
                    <div className={`text-sm p-3 rounded-md ${
                      defaultPayment.type === 'bank_account' 
                        ? 'bg-green-50 border border-green-200 text-green-900' 
                        : 'bg-yellow-50 border border-yellow-200 text-yellow-900'
                    }`}>
                      {defaultPayment.type === 'bank_account' ? (
                        <p>
                          🏦 <span className="font-semibold">{defaultPayment.brand}</span> **** {defaultPayment.last4}
                        </p>
                      ) : (
                        <div>
                          <p>
                            💳 <span className="font-semibold">{defaultPayment.brand.toUpperCase()}</span> **** {defaultPayment.last4}
                            {defaultPayment.exp_month && defaultPayment.exp_year && 
                              ` (exp ${defaultPayment.exp_month}/${defaultPayment.exp_year})`
                            }
                          </p>
                          {paymentWarning && (
                            <p className="text-xs mt-1 text-yellow-700">⚠️ {paymentWarning}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                      ⚠️ No bank account found. Please add a bank account for rent payments.
                    </p>
                  )}
                </div>

                {/* Backup Payment Method (Optional: Credit Card) */}
                {backupPayment && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Backup (If Bank Payment Fails)</p>
                    <div className="text-sm p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-900">
                      <p>
                        💳 <span className="font-semibold">{backupPayment.brand.toUpperCase()}</span> **** {backupPayment.last4}
                        {backupPayment.exp_month && backupPayment.exp_year && 
                          ` (exp ${backupPayment.exp_month}/${backupPayment.exp_year})`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {!backupPayment && defaultPayment?.type === 'bank_account' && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Backup (Optional)</p>
                    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md border border-gray-200">
                      No backup card on file. Consider adding one for failed ACH payments.
                    </p>
                  </div>
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
                        refetchPaymentMethod();
                      }}
                    />
                  </Elements>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}
