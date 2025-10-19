"use client";
import React, { useState, useEffect } from 'react';

interface ConversationMessage {
  sender: 'admin' | 'user';
  senderName: string;
  senderEmail: string;
  message: string;
  timestamp: string;
  isInternal?: boolean;
}

interface ConversationLogProps {
  requestId: string;
  userEmail: string;
  onClose: () => void;
}

export default function ConversationLog({ requestId, userEmail, onClose }: ConversationLogProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchConversation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/manager-requests/${requestId}/conversation`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.conversationLog || []);
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      console.log('Sending message to:', `/api/admin/manager-requests/${requestId}/conversation`);
      const response = await fetch(`/api/admin/manager-requests/${requestId}/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          isInternal
        })
      });

      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Conversation updated:', data);
        console.log('New message count:', data.conversationLog?.length);
        setMessages(data.conversationLog || []);
        setNewMessage('');
        setIsInternal(false);
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert(`Failed to send message: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Conversation Log</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500">No messages yet</div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.sender === 'admin'
                      ? msg.isInternal
                        ? 'bg-purple-100 border border-purple-300'
                        : 'bg-blue-100'
                      : 'bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {msg.senderName}
                    </span>
                    {msg.isInternal && (
                      <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                        Internal Note
                      </span>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(msg.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-start gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={sending}
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
          <div className="mt-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                Internal note (admin-only, not sent to {userEmail})
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
