# Manager Request Deletion & Conversation System

## Overview
This feature adds soft-delete functionality with 14-day recovery period and a conversation log system for manager maintenance requests.

## Features Implemented

### 1. Soft Delete System
- **Admins can mark requests for deletion** - Request is hidden but retained for 14 days
- **14-day recovery window** - Admins can restore accidentally deleted requests
- **Automatic permanent deletion** - After 14 days, requests are automatically purged
- **Audit trail** - Tracks who deleted and when

### 2. Conversation Log
- **Admin-to-user messaging** - Admins can send messages to request submitters
- **Internal notes** - Admins can add private notes (not visible to users)
- **Email notifications** - Users receive emails for non-internal messages
- **Full history** - Complete conversation thread stored with request

### 3. Recovery System
- **View deleted tab** - Admins can see all deleted requests
- **One-click restore** - Easy recovery within 14-day window
- **Deletion countdown** - Shows days remaining before permanent deletion

---

## Database Schema Updates

### ManagerRequest Model
```typescript
{
  // ... existing fields ...
  
  // Soft delete fields
  isDeleted: Boolean (default: false)
  deletedAt: Date (null if not deleted)
  deletedBy: String (admin email who deleted)
  
  // Conversation log
  conversationLog: [{
    sender: 'admin' | 'user'
    senderName: String
    senderEmail: String
    message: String
    timestamp: Date
    isInternal: Boolean (admin-only notes)
  }]
}
```

---

## API Endpoints

### Conversation Management
- **GET** `/api/admin/manager-requests/[id]/conversation`
  - Get conversation log for a request
  - Non-admins only see non-internal messages
  - Admins see everything

- **POST** `/api/admin/manager-requests/[id]/conversation`
  - Add a message to the conversation
  - Body: `{ message: string, isInternal?: boolean }`
  - Sends email to user if not internal

### Deletion Management
- **POST** `/api/admin/manager-requests/[id]/delete`
  - Soft delete a request (mark for deletion)
  - Only admin access
  - Sets `isDeleted: true`, `deletedAt: Date`, `deletedBy: adminEmail`

- **DELETE** `/api/admin/manager-requests/[id]/delete`
  - Permanently delete a request immediately
  - Bypasses 14-day wait (use with caution)
  - Only admin access

- **POST** `/api/admin/manager-requests/[id]/recover`
  - Recover a soft-deleted request
  - Sets `isDeleted: false`
  - Only admin access

### Cleanup (Automated)
- **POST** `/api/admin/manager-requests/cleanup`
  - Permanently deletes requests older than 14 days
  - Requires `Authorization: Bearer <CRON_SECRET>` header
  - Should be called by a cron job daily
  - Returns count of deleted requests

- **GET** `/api/admin/manager-requests/cleanup`
  - Preview what would be deleted (testing)
  - Shows all requests eligible for permanent deletion

### Updated List Endpoint
- **GET** `/api/admin/manager-requests?status=<status>&deleted=<true|false>`
  - `deleted=true` - Show only soft-deleted requests
  - `deleted=false` or omitted - Show only active requests
  - Works with status filter

---

## Frontend Components

### New Component: ConversationLog
**File:** `/app/components/ConversationLog.tsx`

**Usage in Admin Page:**
```tsx
import ConversationLog from '@/app/components/ConversationLog';

const [showConversation, setShowConversation] = useState(false);
const [selectedRequestId, setSelectedRequestId] = useState<string>('');

// In the UI:
<button onClick={() => {
  setSelectedRequestId(request._id);
  setShowConversation(true);
}}>
  💬 View Conversation
</button>

{showConversation && (
  <ConversationLog
    requestId={selectedRequestId}
    userEmail={request.email}
    onClose={() => setShowConversation(false)}
  />
)}
```

### Admin UI Updates Needed

#### 1. Add "Deleted" Tab Filter
```tsx
const [viewFilter, setViewFilter] = useState<'active' | 'deleted'>('active');

// When fetching:
const url = viewFilter === 'deleted' 
  ? '/api/admin/manager-requests?deleted=true'
  : '/api/admin/manager-requests';
```

#### 2. Delete Button (for active requests)
```tsx
const handleSoftDelete = async (requestId: string) => {
  if (!confirm('Mark this request for deletion? It can be recovered within 14 days.')) return;
  
  const response = await fetch(`/api/admin/manager-requests/${requestId}/delete`, {
    method: 'POST'
  });
  
  if (response.ok) {
    alert('Request marked for deletion');
    fetchRequests(); // Refresh list
  }
};

// In UI:
<button 
  onClick={() => handleSoftDelete(request._id)}
  className="text-red-600 hover:text-red-800"
>
  🗑️ Delete
</button>
```

#### 3. Recover Button (for deleted requests)
```tsx
const handleRecover = async (requestId: string) => {
  if (!confirm('Recover this request?')) return;
  
  const response = await fetch(`/api/admin/manager-requests/${requestId}/recover`, {
    method: 'POST'
  });
  
  if (response.ok) {
    alert('Request recovered successfully');
    fetchRequests();
  }
};

// In UI (deleted tab):
<button 
  onClick={() => handleRecover(request._id)}
  className="text-green-600 hover:text-green-800"
>
  ♻️ Recover
</button>

<span className="text-sm text-gray-500">
  Deleted {Math.floor((Date.now() - new Date(request.deletedAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
  by {request.deletedBy}
</span>
```

#### 4. Conversation Button
```tsx
<button 
  onClick={() => {
    setSelectedRequestId(request._id);
    setShowConversation(true);
  }}
  className="text-blue-600 hover:text-blue-800"
>
  💬 Conversation ({request.conversationLog?.length || 0})
</button>
```

---

## Automated Cleanup Setup

### Option 1: Vercel Cron (Production)
Create `vercel.json` in project root:
```json
{
  "crons": [{
    "path": "/api/admin/manager-requests/cleanup",
    "schedule": "0 2 * * *"
  }]
}
```

### Option 2: External Cron Service (Any Host)
Use services like:
- **cron-job.org**
- **EasyCron**
- **GitHub Actions**

Setup:
1. Create scheduled job to run daily at 2 AM
2. Configure to POST to: `https://your-domain.com/api/admin/manager-requests/cleanup`
3. Add header: `Authorization: Bearer Br!ghtL@nd_Cr0n_2025_K9#xM2pQ5&vL8wN3`

### Option 3: Manual Testing (Development)
```bash
# Preview what would be deleted
curl http://localhost:3000/api/admin/manager-requests/cleanup

# Actually run cleanup
curl -X POST http://localhost:3000/api/admin/manager-requests/cleanup \
  -H "Authorization: Bearer Br!ghtL@nd_Cr0n_2025_K9#xM2pQ5&vL8wN3"
```

---

## Environment Variables

Add to `.env.local`:
```bash
NEXTAUTH_SECRET="l8KuvV0psYGTKJj2d+CPGFBhbOC8pxHC9OP9FpO6Ido="
CRON_SECRET="Br!ghtL@nd_Cr0n_2025_K9#xM2pQ5&vL8wN3"
```

**Important:** Change `CRON_SECRET` in production!

---

## Testing Workflow

### Test Conversation Log
1. Go to admin page
2. Click "💬 Conversation" on any request
3. Type a message and click "Send"
4. Check if email was sent to requester
5. Try checking "Internal note" - should NOT send email
6. Verify conversation appears in chronological order

### Test Soft Delete
1. Click "🗑️ Delete" on a request
2. Confirm the deletion
3. Verify request disappears from active list
4. Switch to "Deleted" tab
5. Verify request appears with deletion info

### Test Recovery
1. In "Deleted" tab, click "♻️ Recover"
2. Confirm recovery
3. Switch back to "Active" tab
4. Verify request reappears

### Test Auto-Cleanup
1. Manually set `deletedAt` to 15+ days ago in MongoDB:
   ```javascript
   db.managerrequests.updateOne(
     { _id: ObjectId("...") },
     { 
       $set: { 
         isDeleted: true,
         deletedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000)
       }
     }
   )
   ```
2. Run cleanup endpoint
3. Verify request is permanently deleted

---

## Security Considerations

1. **Admin-only access** - All delete/recover endpoints check for admin role
2. **Cron secret** - Cleanup endpoint requires secret token
3. **Audit trail** - All deletions track who and when
4. **Email verification** - Conversation emails only sent for non-internal messages
5. **Permission checks** - Non-admins can't see internal notes

---

## Migration Guide

### For Existing Requests
All existing requests will automatically have:
- `isDeleted: false`
- `conversationLog: []`
- No migration script needed (Mongoose defaults handle this)

### Backwards Compatibility
- All existing code continues to work
- Soft-deleted requests are automatically hidden from normal queries
- No breaking changes to existing API endpoints

---

## Future Enhancements (Optional)

1. **User replies** - Allow request submitters to reply to admin messages
2. **File attachments** - Add images/documents to conversation
3. **Push notifications** - Real-time notifications for new messages
4. **Export conversation** - Download conversation as PDF
5. **Templates** - Pre-written message templates for common responses
6. **Bulk actions** - Delete/recover multiple requests at once
7. **Advanced filters** - Filter by deletion date, deleted by, etc.

---

## Troubleshooting

### Cleanup not running automatically
- Check cron job configuration
- Verify `CRON_SECRET` matches
- Check server logs for errors
- Test manually first

### Emails not sending
- Check `RESEND_API_KEY` is valid
- Verify `RESEND_FROM_EMAIL` is configured
- Check spam folder
- Look for errors in server logs

### Deleted requests still showing
- Ensure frontend filters by `isDeleted: false`
- Check API query parameters
- Clear browser cache

---

## Files Modified/Created

### New Files
- `/app/api/admin/manager-requests/[id]/conversation/route.ts`
- `/app/api/admin/manager-requests/[id]/delete/route.ts`
- `/app/api/admin/manager-requests/[id]/recover/route.ts`
- `/app/api/admin/manager-requests/cleanup/route.ts`
- `/app/components/ConversationLog.tsx`
- `/MANAGER_DELETION_SYSTEM.md` (this file)

### Modified Files
- `/app/models/ManagerRequest.ts` - Added soft delete and conversation fields
- `/app/api/admin/manager-requests/route.ts` - Added `deleted` query parameter
- `/app/admin/page.tsx` - Updated interface (UI updates still needed)
- `/.env.local` - Added `NEXTAUTH_SECRET` and `CRON_SECRET`

---

## Summary

This feature provides a complete soft-delete and communication system for manager requests:

✅ **Soft delete** with 14-day recovery  
✅ **Conversation log** with admin/user messaging  
✅ **Email notifications** for user messages  
✅ **Internal notes** for admin-only comments  
✅ **Automatic cleanup** after 14 days  
✅ **Audit trail** for all deletions  
✅ **Secure** admin-only access  

**Next Steps:**
1. Update admin page UI to add Delete/Recover/Conversation buttons
2. Add "Deleted" tab to admin page
3. Set up automated cron job for cleanup
4. Test all workflows end-to-end
