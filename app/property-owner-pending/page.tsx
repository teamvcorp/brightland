'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import Image from 'next/image';

export default function PropertyOwnerPending() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);

  const fetchUserDetails = useCallback(async () => {
    try {
      const response = await fetch('/api/user/verification-status');
      if (response.ok) {
        const data = await response.json();
        setUserDetails(data);
        setMessages(data.verificationMessages || []);
        setUploadedDocuments(data.verificationDocuments || []);

        // Redirect if approved
        if (data.propertyOwnerVerificationStatus === 'approved') {
          router.push('/property-owner-dashboard');
        }
        
        // Redirect if rejected
        if (data.propertyOwnerVerificationStatus === 'rejected') {
          // Could create a rejection page or show message
          toast.error('Your property owner request was rejected. Please contact support.');
        }
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  }, [router]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Redirect if not a property owner or already approved
    if (session.user?.userType !== 'property-owner') {
      router.push('/dashboard');
      return;
    }

    // Fetch user details to check verification status
    fetchUserDetails();
  }, [session, status, router, fetchUserDetails]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading('Uploading document...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'verification-document');

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        
        // Save document URL to user record
        await fetch('/api/user/verification-documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentUrl: data.url }),
        });

        setUploadedDocuments([...uploadedDocuments, data.url]);
        toast.success('Document uploaded successfully!', { id: loadingToast });
      } else {
        toast.error('Failed to upload document', { id: loadingToast });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error uploading document', { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    const loadingToast = toast.loading('Sending message...');

    try {
      const response = await fetch('/api/user/verification-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          sender: 'user',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        setNewMessage('');
        toast.success('Message sent!', { id: loadingToast });
      } else {
        toast.error('Failed to send message', { id: loadingToast });
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Error sending message', { id: loadingToast });
    } finally {
      setSending(false);
    }
  };

  if (status === 'loading' || !userDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Property Owner Verification Pending
          </h1>
          <p className="text-gray-600">
            Your account is pending admin verification. You can communicate with our team below.
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium text-gray-900">{session?.user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">{session?.user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Business Name:</span>
              <span className="font-medium text-gray-900">{userDetails?.propertyOwnerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                ⏳ Pending Verification
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Submitted:</span>
              <span className="font-medium text-gray-900">
                {new Date(userDetails?.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Document Upload */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Verification Documents</h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload documents to verify your property ownership (e.g., deed, tax records, business license)
          </p>
          
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {uploadedDocuments.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-900">Uploaded Documents:</h3>
              {uploadedDocuments.map((doc, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <a href={doc} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Document {index + 1}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat/Messages */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Communication with Admin</h2>
          
          <div className="border rounded-lg p-4 h-64 overflow-y-auto mb-4 bg-gray-50">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center text-sm">No messages yet. Start a conversation below.</p>
            ) : (
              <div className="space-y-4">
                {messages.map((msg: any, index: number) => (
                  <div
                    key={index}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {new Date(msg.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed font-medium"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
