"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface Tenant {
  _id: string;
  userName: string;
  userEmail: string;
  listingName: string;
  monthlyRent?: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  autoPayEnabled?: boolean;
  stripeSubscriptionId?: string;
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  rentPaymentStatus?: 'current' | 'late' | 'paid_ahead';
  hasCheckingAccount?: boolean;
  hasCreditCard?: boolean;
  achPaymentMethodId?: string;
  cardPaymentMethodId?: string;
}

interface PaymentHistory {
  id: string;
  amount: number;
  status: string;
  created: number;
  description: string;
  customerEmail: string;
  customerName: string;
}

interface MaintenanceRequest {
  _id: string;
  fullname: string;
  email: string;
  phone: string;
  address: string;
  propertyName?: string;
  projectDescription: string;
  message: string;
  status: 'pending' | 'working' | 'finished' | 'rejected';
  userType?: 'tenant' | 'property-owner' | 'home-owner';
  proposedBudget?: number;
  actualCost?: number;
  amountToBill?: number;
  createdAt: string;
  updatedAt: string;
  problemImageUrl?: string;
  finishedImageUrl?: string;
  adminNotes?: string;
}

interface Property {
  _id: string;
  name: string;
  address: string;
  ownerName: string;
}

interface PaymentRequest {
  _id: string;
  managerRequestId: string;
  propertyName: string;
  propertyOwnerEmail: string;
  propertyOwnerName?: string;
  amount: number;
  actualCost?: number;
  proposedBudget?: number;
  description: string;
  status: 'pending' | 'paid' | 'cancelled' | 'disputed';
  dueDate?: string;
  paidDate?: string;
  paidAmount?: number;
  paymentMethod?: string;
  paymentNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export default function AdminBillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  
  // Property maintenance states
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  // Cost editing states
  const [editingCosts, setEditingCosts] = useState<{[key: string]: {actualCost: string, amountToBill: string}}>({});
  const [savingCosts, setSavingCosts] = useState<{[key: string]: boolean}>({});
  
  // Payment requests states
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('pending');

  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/check-admin');
      const data = await response.json();
      
      if (!data.isAdmin) {
        router.push('/dashboard');
        return;
      }
      
      fetchTenants();
      fetchPaymentStats();
      fetchProperties();
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.push('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    checkAdminStatus();
  }, [status, session, router, checkAdminStatus]);

  useEffect(() => {
    if (session) {
      fetchPaymentRequests(selectedPaymentFilter);
    }
  }, [selectedPaymentFilter, session]);

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/rental-application?status=approved');
      if (response.ok) {
        const data = await response.json();
        setTenants(data || []);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentStats = async () => {
    try {
      const response = await fetch('/api/admin/payment-stats');
      if (response.ok) {
        const data = await response.json();
        setTotalRevenue(data.totalRevenue || 0);
        setMonthlyRevenue(data.monthlyRevenue || 0);
      }
    } catch (error) {
      console.error('Error fetching payment stats:', error);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/property-owners');
      if (response.ok) {
        const data = await response.json();
        // Convert property owners to match the Property interface
        const propertyOwnerList = (data || []).map((owner: any) => ({
          _id: owner._id,
          name: owner.name,
          address: owner.name, // Use name as address for backward compatibility
          ownerName: owner.name,
        }));
        setProperties(propertyOwnerList);
      }
    } catch (error) {
      console.error('Error fetching property owners:', error);
    }
  };

  const fetchPaymentRequests = async (statusFilter?: string) => {
    setLoadingPaymentRequests(true);
    try {
      const url = statusFilter 
        ? `/api/admin/payment-requests?status=${statusFilter}`
        : '/api/admin/payment-requests';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPaymentRequests(data.paymentRequests || []);
      }
    } catch (error) {
      console.error('Error fetching payment requests:', error);
    } finally {
      setLoadingPaymentRequests(false);
    }
  };

  const updatePaymentStatus = async (paymentId: string, status: string, paidAmount?: number, paymentMethod?: string, paymentNotes?: string) => {
    try {
      const response = await fetch(`/api/admin/payment-requests/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, paidAmount, paymentMethod, paymentNotes }),
      });

      if (response.ok) {
        // Refresh payment requests
        fetchPaymentRequests(selectedPaymentFilter);
      } else {
        alert('Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Error updating payment status');
    }
  };

  const fetchMaintenanceRequests = async (propertyNameToFilter: string) => {
    if (!propertyNameToFilter) {
      setMaintenanceRequests([]);
      return;
    }

    setLoadingRequests(true);
    try {
      const response = await fetch('/api/admin/manager-requests');
      if (response.ok) {
        const data = await response.json();
        // Filter requests by propertyName and only show finished ones
        const filtered = data.requests.filter((req: MaintenanceRequest) => 
          req.propertyName === propertyNameToFilter && req.status === 'finished'
        );
        setMaintenanceRequests(filtered);
      }
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchPaymentHistory = async (tenantEmail: string) => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/admin/payment-history?email=${encodeURIComponent(tenantEmail)}`);
      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewPayments = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    fetchPaymentHistory(tenant.userEmail);
  };

  const handleCloseModal = () => {
    setSelectedTenant(null);
    setPaymentHistory([]);
  };

  const updateRequestCosts = async (requestId: string) => {
    const costs = editingCosts[requestId];
    if (!costs) return;

    setSavingCosts(prev => ({ ...prev, [requestId]: true }));
    try {
      const response = await fetch(`/api/admin/manager-requests/${requestId}/costs`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualCost: costs.actualCost ? parseFloat(costs.actualCost) : null,
          amountToBill: costs.amountToBill ? parseFloat(costs.amountToBill) : null,
        }),
      });

      if (response.ok) {
        // Update local state
        setMaintenanceRequests(prev => prev.map(req => 
          req._id === requestId 
            ? { 
                ...req, 
                actualCost: costs.actualCost ? parseFloat(costs.actualCost) : undefined,
                amountToBill: costs.amountToBill ? parseFloat(costs.amountToBill) : undefined,
              }
            : req
        ));
        // Clear editing state
        setEditingCosts(prev => {
          const newState = { ...prev };
          delete newState[requestId];
          return newState;
        });
      } else {
        alert('Failed to update costs');
      }
    } catch (error) {
      console.error('Error updating costs:', error);
      alert('Error updating costs');
    } finally {
      setSavingCosts(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const formatAddress = (address: any): string => {
    if (typeof address === 'string') {
      return address;
    }
    if (typeof address === 'object' && address !== null) {
      const { street, city, state, zip } = address;
      return [street, city, state, zip].filter(Boolean).join(', ');
    }
    return '';
  };

  const handlePropertyChange = (propertyId: string) => {
    setSelectedProperty(propertyId);
    const property = properties.find(p => p._id === propertyId);
    if (property) {
      // Use property name for filtering instead of address
      fetchMaintenanceRequests(property.name);
    } else {
      setMaintenanceRequests([]);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeTenants = tenants.filter(t => t.autoPayEnabled);
  const upcomingPayments = tenants.filter(t => {
    if (!t.nextPaymentDate) return false;
    const nextDate = new Date(t.nextPaymentDate);
    const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 7 && daysUntil >= 0;
  });

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header with Navigation */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Admin Dashboard
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Billing & Payments
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage tenant payments and view revenue statistics
          </p>
        </div>

        {/* Revenue Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Tenants</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {activeTenants.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">with auto-pay enabled</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Payments Alert */}
        {upcomingPayments.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Upcoming Payments
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>{upcomingPayments.length} payment{upcomingPayments.length !== 1 ? 's' : ''} due within the next 7 days</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tenants Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Tenant Payment Status</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="py-3 px-6">Tenant</th>
                  <th scope="col" className="py-3 px-6">Property</th>
                  <th scope="col" className="py-3 px-6">Monthly Rent</th>
                  <th scope="col" className="py-3 px-6">Auto-Pay</th>
                  <th scope="col" className="py-3 px-6">Next Payment</th>
                  <th scope="col" className="py-3 px-6">Status</th>
                  <th scope="col" className="py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No approved tenants found
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => (
                    <tr key={tenant._id} className="bg-white border-b hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-medium text-gray-900">{tenant.userName}</div>
                          <div className="text-xs text-gray-500">{tenant.userEmail}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6">{tenant.listingName}</td>
                      <td className="py-4 px-6">
                        {tenant.monthlyRent ? (
                          <span className="font-medium">${tenant.monthlyRent.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {tenant.autoPayEnabled ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            ✓ Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {tenant.nextPaymentDate ? (
                          <div>
                            <div>{new Date(tenant.nextPaymentDate).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">
                              {Math.ceil((new Date(tenant.nextPaymentDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {tenant.rentPaymentStatus === 'current' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            Current
                          </span>
                        )}
                        {tenant.rentPaymentStatus === 'late' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            Late
                          </span>
                        )}
                        {tenant.rentPaymentStatus === 'paid_ahead' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            Paid Ahead
                          </span>
                        )}
                        {!tenant.rentPaymentStatus && (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleViewPayments(tenant)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          View Payments
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Property Maintenance History Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mt-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Property Maintenance History</h2>
            <p className="text-sm text-gray-600 mt-1">View completed maintenance requests by property</p>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Property Name
              </label>
              <select
                value={selectedProperty}
                onChange={(e) => handlePropertyChange(e.target.value)}
                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a property --</option>
                {properties.map((property) => (
                  <option key={property._id} value={property._id}>
                    {property.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">
                Shows all completed maintenance requests for this property, regardless of specific address
              </p>
            </div>

            {selectedProperty && (
              <div>
                {loadingRequests ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : maintenanceRequests.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No finished maintenance requests for this property</p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-blue-900">
                          {maintenanceRequests.length} completed maintenance {maintenanceRequests.length === 1 ? 'request' : 'requests'}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-blue-900">
                        Total Amount to Bill: ${maintenanceRequests.reduce((sum, req) => sum + (req.amountToBill || 0), 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {maintenanceRequests.map((request) => (
                        <div key={request._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-gray-900">{request.projectDescription}</h3>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  ✓ Finished
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  request.userType === 'home-owner' 
                                    ? 'bg-green-100 text-green-800'
                                    : request.userType === 'property-owner'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {request.userType === 'home-owner' && '🏡 Home Owner'}
                                  {request.userType === 'property-owner' && '🏢 Property Owner'}
                                  {(!request.userType || request.userType === 'tenant') && '🏠 Tenant'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                                <div>
                                  <strong>Submitted by:</strong> {request.fullname}
                                </div>
                                <div>
                                  <strong>Email:</strong> {request.email}
                                </div>
                                <div>
                                  <strong>Phone:</strong> {request.phone}
                                </div>
                                <div>
                                  <strong>Completed:</strong> {new Date(request.updatedAt).toLocaleDateString()}
                                </div>
                              </div>

                              <div className="text-sm text-gray-700 mb-2">
                                <strong>Description:</strong> {request.message}
                              </div>

                              {/* Cost Tracking Section */}
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <strong className="text-gray-700">Cost Information</strong>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {/* Proposed Budget (read-only) */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Proposed Budget (User)
                                    </label>
                                    <div className="text-sm font-semibold text-gray-800 bg-white rounded px-3 py-2 border">
                                      ${request.proposedBudget ? request.proposedBudget.toFixed(2) : '0.00'}
                                    </div>
                                  </div>

                                  {/* Actual Cost (editable) */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Actual Cost (Admin)
                                    </label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full pl-7 pr-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={editingCosts[request._id]?.actualCost ?? (request.actualCost !== null && request.actualCost !== undefined ? request.actualCost.toString() : '')}
                                        onChange={(e) => setEditingCosts(prev => ({
                                          ...prev,
                                          [request._id]: {
                                            actualCost: e.target.value,
                                            amountToBill: prev[request._id]?.amountToBill ?? (request.amountToBill !== null && request.amountToBill !== undefined ? request.amountToBill.toString() : '')
                                          }
                                        }))}
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </div>

                                  {/* Amount to Bill (editable) */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Amount to Bill
                                    </label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full pl-7 pr-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={editingCosts[request._id]?.amountToBill ?? (request.amountToBill !== null && request.amountToBill !== undefined ? request.amountToBill.toString() : '')}
                                        onChange={(e) => setEditingCosts(prev => ({
                                          ...prev,
                                          [request._id]: {
                                            actualCost: prev[request._id]?.actualCost ?? (request.actualCost !== null && request.actualCost !== undefined ? request.actualCost.toString() : ''),
                                            amountToBill: e.target.value
                                          }
                                        }))}
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Save Button */}
                                {editingCosts[request._id] && (
                                  <div className="mt-3 flex justify-end">
                                    <button
                                      onClick={() => updateRequestCosts(request._id)}
                                      disabled={savingCosts[request._id]}
                                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                      {savingCosts[request._id] ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                          Saving...
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                          </svg>
                                          Save Costs
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>

                              {request.adminNotes && (
                                <div className="text-sm bg-gray-50 rounded p-2 border border-gray-200 mt-2">
                                  <strong className="text-gray-700">Admin Notes:</strong>
                                  <p className="text-gray-600 mt-1">{request.adminNotes}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Images */}
                          <div className="flex gap-4 mt-3">
                            {request.problemImageUrl && (
                              <div className="flex-1">
                                <p className="text-xs font-medium text-gray-700 mb-1">Before</p>
                                <div className="relative w-full h-32">
                                  <Image
                                    src={request.problemImageUrl}
                                    alt="Problem"
                                    fill
                                    className="object-cover rounded-lg border border-gray-200"
                                  />
                                </div>
                              </div>
                            )}
                            {request.finishedImageUrl && (
                              <div className="flex-1">
                                <p className="text-xs font-medium text-gray-700 mb-1">After</p>
                                <div className="relative w-full h-32">
                                  <Image
                                    src={request.finishedImageUrl}
                                    alt="Finished"
                                    fill
                                    className="object-cover rounded-lg border border-gray-200"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payment Requests Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Payment Requests</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPaymentFilter('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPaymentFilter === 'pending'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setSelectedPaymentFilter('paid')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPaymentFilter === 'paid'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Paid
              </button>
              <button
                onClick={() => setSelectedPaymentFilter('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPaymentFilter === ''
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
            </div>
          </div>

          {loadingPaymentRequests ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : paymentRequests.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No payment requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentRequests.map((payment) => (
                    <tr key={payment._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.propertyName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{payment.propertyOwnerName}</div>
                        <div className="text-xs text-gray-400">{payment.propertyOwnerEmail}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {payment.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-semibold">${payment.amount.toFixed(2)}</div>
                        {payment.proposedBudget !== null && payment.proposedBudget !== undefined && (
                          <div className="text-xs text-gray-400">Est: ${payment.proposedBudget.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payment.status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : payment.status === 'disputed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {payment.status === 'pending' && (
                          <button
                            onClick={() => updatePaymentStatus(payment._id, 'paid', payment.amount)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Mark Paid
                          </button>
                        )}
                        <Link
                          href={`/admin/manager-requests/${payment.managerRequestId}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Request
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment History Modal */}
        {selectedTenant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Payment History</h2>
                  <p className="text-sm text-gray-600">{selectedTenant.userName} - {selectedTenant.listingName}</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No payment history found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-gray-900">
                                ${(payment.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </h3>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                payment.status === 'succeeded' 
                                  ? 'bg-green-100 text-green-800'
                                  : payment.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{payment.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(payment.created * 1000).toLocaleDateString()} at {new Date(payment.created * 1000).toLocaleTimeString()}
                            </p>
                          </div>
                          <a
                            href={`https://dashboard.stripe.com/payments/${payment.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 underline ml-4"
                          >
                            View in Stripe
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
