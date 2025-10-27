"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ConversationLog from "../components/ConversationLog";
import toast, { Toaster } from 'react-hot-toast';

interface ManagerRequest {
  _id: string;
  fullname: string;
  email: string;
  phone: string;
  address: string;
  projectDescription: string;
  message: string;
  status: 'pending' | 'working' | 'finished' | 'rejected';
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
  problemImageUrl?: string;
  finishedImageUrl?: string;
  // Admin-initiated request fields
  submittedBy?: 'user' | 'admin';
  requiresApproval?: boolean;
  approvalStatus?: 'pending-approval' | 'approved' | 'declined';
  approvedBy?: string;
  approvalDate?: string;
  proposedBudget?: number;
  // Conversation log
  conversationLog?: Array<{
    sender: 'admin' | 'user';
    senderName: string;
    senderEmail: string;
    message: string;
    timestamp: string;
    isInternal?: boolean;
  }>;
}

export default function PropertyOwnerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<ManagerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Conversation states
  const [showConversation, setShowConversation] = useState(false);
  const [conversationRequestId, setConversationRequestId] = useState<string>('');
  const [conversationUserEmail, setConversationUserEmail] = useState<string>('');

  // Open conversation handler
  const handleOpenConversation = (requestId: string, userEmail: string) => {
    setConversationRequestId(requestId);
    setConversationUserEmail(userEmail);
    setShowConversation(true);
  };

  // Handle approval/decline
  const handleApproval = async (requestId: string, approve: boolean) => {
    if (!session?.user?.email) return;

    const action = approve ? 'approve' : 'decline';
    
    // Show loading toast
    const loadingToast = toast.loading(`${approve ? 'Approving' : 'Declining'} request...`);

    try {
      const response = await fetch(`/api/admin/manager-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvalStatus: approve ? 'approved' : 'declined',
          approvedBy: session.user.email,
          approvalDate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast.success(`✅ Request ${approve ? 'approved' : 'declined'} successfully!`, {
          id: loadingToast,
          duration: 4000,
        });
        
        // Refresh requests
        const refreshResponse = await fetch('/api/manager-requests');
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setRequests(data);
        }
      } else {
        const error = await response.json();
        toast.error(`❌ Failed to ${action} request: ${error.error || 'Unknown error'}`, {
          id: loadingToast,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      toast.error(`❌ Error ${action}ing request. Please try again.`, {
        id: loadingToast,
        duration: 5000,
      });
    }
  };

  // Redirect if not property owner
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    if (session.user?.userType !== 'property-owner') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Fetch user's manager requests
  useEffect(() => {
    const fetchRequests = async () => {
      if (!session?.user?.email) return;
      
      try {
        const response = await fetch('/api/manager-requests');
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched requests for property owner:', {
            email: session.user.email,
            userType: session.user.userType,
            requestCount: data.length,
            requests: data.map((r: any) => ({
              id: r._id,
              email: r.email,
              address: r.address,
              description: r.projectDescription,
              status: r.status
            }))
          });
          setRequests(data);
        } else {
          setError('Failed to load requests');
        }
      } catch (err) {
        setError('Error loading requests');
        console.error('Error fetching requests:', err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.email) {
      fetchRequests();
    }
  }, [session]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'working': return 'bg-blue-100 text-blue-800';
      case 'finished': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'working': return '🔧';
      case 'finished': return '✅';
      case 'rejected': return '❌';
      default: return '📋';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user?.userType !== 'property-owner') {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Property Owner Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {session.user.name}! Manage your maintenance requests below.
          </p>
        </div>

        {/* Submit New Request Button */}
        <div className="mb-8 text-center">
          <button
            onClick={() => router.push('/submit-request')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Submit New Maintenance Request
          </button>
        </div>

        {/* Requests Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Your Maintenance Requests</h2>
            <p className="text-sm text-gray-600 mt-1">
              Requests submitted by {session.user.email} • {requests.length} total requests
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {requests.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
              <p className="text-gray-600 mb-4">
                You haven&apos;t submitted any maintenance requests yet.
              </p>
              <button
                onClick={() => router.push('/submit-request')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Submit Your First Request
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {requests.map((request) => (
                <div key={request._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getStatusIcon(request.status)}</span>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.projectDescription}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                        {request.submittedBy === 'admin' && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            👤 Admin Request
                          </span>
                        )}
                        {request.requiresApproval && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            request.approvalStatus === 'approved' 
                              ? 'bg-green-100 text-green-800'
                              : request.approvalStatus === 'declined'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {request.approvalStatus === 'approved' && '✓ Approved'}
                            {request.approvalStatus === 'declined' && '✗ Declined'}
                            {request.approvalStatus === 'pending-approval' && '⏳ Pending Your Approval'}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <p><strong>Property:</strong> {request.address}</p>
                        <p><strong>Description:</strong> {request.message}</p>
                        {request.proposedBudget && (
                          <p><strong>Estimated Budget:</strong> ${request.proposedBudget.toFixed(2)}</p>
                        )}
                        <p><strong>Submitted:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
                        {request.adminNotes && (
                          <p><strong>Admin Notes:</strong> {request.adminNotes}</p>
                        )}
                        {request.approvedBy && (
                          <p><strong>Decision by:</strong> {request.approvedBy} on {new Date(request.approvalDate!).toLocaleDateString()}</p>
                        )}
                      </div>

                      {/* Approval Buttons */}
                      {request.requiresApproval && request.approvalStatus === 'pending-approval' && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm font-semibold text-yellow-800 mb-3">
                            ⚠️ This repair request requires your approval before work can begin
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to approve this $${request.proposedBudget?.toFixed(2) || '0.00'} repair request?`)) {
                                  handleApproval(request._id, true);
                                }
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to decline this repair request?')) {
                                  handleApproval(request._id, false);
                                }
                              }}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              ✗ Decline
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Images */}
                      <div className="flex gap-4 mt-4">
                        {request.problemImageUrl && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Problem Image</p>
                            <Image
                              src={request.problemImageUrl}
                              alt="Problem image"
                              width={120}
                              height={80}
                              className="w-30 h-20 object-cover rounded border"
                            />
                          </div>
                        )}
                        {request.finishedImageUrl && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-1">Completed Work</p>
                            <Image
                              src={request.finishedImageUrl}
                              alt="Finished work"
                              width={120}
                              height={80}
                              className="w-30 h-20 object-cover rounded border"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex flex-col gap-2">
                      <p className="text-xs text-gray-500 mb-2">
                        Last updated: {new Date(request.updatedAt).toLocaleDateString()}
                      </p>
                      <button
                        onClick={() => handleOpenConversation(request._id, request.email)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1"
                      >
                        💬 Chat ({request.conversationLog?.length || 0})
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {requests.length > 0 && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['pending', 'working', 'finished', 'rejected'].map((status) => {
              const count = requests.filter(r => r.status === status).length;
              return (
                <div key={status} className="bg-white rounded-lg p-4 shadow text-center">
                  <div className="text-2xl mb-1">{getStatusIcon(status)}</div>
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600 capitalize">{status}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Conversation Log Modal */}
        {showConversation && (
          <ConversationLog
            requestId={conversationRequestId}
            userEmail={conversationUserEmail}
            onClose={() => {
              setShowConversation(false);
              // Optionally refresh requests to show updated conversation count
            }}
          />
        )}
      </div>
    </div>
  );
}