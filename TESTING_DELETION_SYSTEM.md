# Manager Request Deletion System - Testing Guide

## Quick Start Testing

### 1. Test the Conversation Feature

1. **Login as Admin:**
   - Go to `http://localhost:3000/admin`
   - Find any maintenance request
   - Click the **💬 Chat** button

2. **Send a message:**
   - Type a message in the text area
   - Uncheck "Internal note" to send an email to the user
   - Click "Send"
   - User should receive an email

3. **Send an internal note:**
   - Type another message
   - Check "Internal note" checkbox
   - Click "Send"
   - This will NOT send an email (admin-only note)

### 2. Test Soft Delete

1. **Delete a rejected request:**
   - Go to admin page
   - Filter by "Rejected" status
   - Click **🗑️ Delete** button
   - Confirm the deletion

2. **View deleted requests:**
   - Click the **🗑️ Deleted Requests** tab
   - See all deleted requests
   - Notice the countdown showing days until permanent deletion

### 3. Test Recovery

1. **In the Deleted tab:**
   - Click **♻️ Recover** on any deleted request
   - Confirm recovery

2. **Verify recovery:**
   - Switch back to **📋 Active Requests** tab
   - The recovered request should appear again

### 4. Test Auto-Cleanup (Advanced)

**Method 1: Manual Database Update (for testing)**

```javascript
// In MongoDB Compass or Mongo Shell:
// Set a request's deletedAt to 15+ days ago

db.managerrequests.updateOne(
  { _id: ObjectId("YOUR_REQUEST_ID_HERE") },
  { 
    $set: { 
      isDeleted: true,
      deletedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
      deletedBy: "test@admin.com"
    }
  }
)
```

**Method 2: Call Cleanup Endpoint**

```bash
# Preview what would be deleted (GET request)
curl http://localhost:3000/api/admin/manager-requests/cleanup

# Actually run cleanup (POST request with auth)
curl -X POST http://localhost:3000/api/admin/manager-requests/cleanup \
  -H "Authorization: Bearer Br!ghtL@nd_Cr0n_2025_K9#xM2pQ5&vL8wN3"
```

**Expected Result:**
- Requests deleted 14+ days ago are permanently removed
- You'll see the count of deleted items in the response

---

## Production Setup

### Vercel Deployment (Recommended)

1. **Add `vercel.json` to project root:**

```json
{
  "crons": [{
    "path": "/api/admin/manager-requests/cleanup",
    "schedule": "0 2 * * *"
  }]
}
```

2. **Add to Vercel environment variables:**
   - `CRON_SECRET` = `Br!ghtL@nd_Cr0n_2025_K9#xM2pQ5&vL8wN3` (change in production!)
   - `NEXTAUTH_SECRET` = Your secret key

3. **Deploy:**
   ```bash
   git add .
   git commit -m "Add manager request deletion system"
   git push
   ```

4. **Verify cron job:**
   - Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
   - You should see the cleanup job scheduled for 2 AM daily

### Alternative: External Cron Service

If not using Vercel, use **cron-job.org** or similar:

1. **Create account at cron-job.org**
2. **Add new cron job:**
   - URL: `https://your-domain.com/api/admin/manager-requests/cleanup`
   - Schedule: Daily at 2:00 AM
   - Method: POST
   - Headers: 
     ```
     Authorization: Bearer Br!ghtL@nd_Cr0n_2025_K9#xM2pQ5&vL8wN3
     ```

---

## Feature Checklist

### Admin Features ✅
- [x] View active maintenance requests
- [x] View deleted maintenance requests (separate tab)
- [x] Soft delete requests (14-day recovery period)
- [x] Recover deleted requests
- [x] Open conversation with request submitters
- [x] Send messages to users (with email notification)
- [x] Add internal admin-only notes
- [x] See conversation history
- [x] See deletion countdown and who deleted

### Property Owner Features ✅
- [x] View their submitted requests
- [x] Open conversation with admin
- [x] See conversation history (excluding internal notes)
- [x] Receive email notifications for admin messages

### API Features ✅
- [x] Conversation log endpoints
- [x] Soft delete endpoint
- [x] Recovery endpoint
- [x] Cleanup endpoint (cron-ready)
- [x] Filter by deleted/active status

### Database Features ✅
- [x] Soft delete fields (isDeleted, deletedAt, deletedBy)
- [x] Conversation log array
- [x] Automatic exclusion of soft-deleted from queries
- [x] Permanent deletion after 14 days

---

## Troubleshooting

### Issue: Emails not sending
**Solution:**
- Check `RESEND_API_KEY` in `.env.local`
- Verify `RESEND_FROM_EMAIL` is set
- Check spam folder
- Look for errors in terminal logs

### Issue: Cleanup not running
**Solution:**
- Verify cron job is configured correctly
- Check `CRON_SECRET` matches in .env.local
- Test manually with curl command
- Check Vercel cron job logs

### Issue: Deleted requests still showing in active view
**Solution:**
- Clear browser cache
- Check API endpoint: `GET /api/admin/manager-requests?deleted=false`
- Verify `isDeleted` field is being set correctly

### Issue: Can't recover deleted request
**Solution:**
- Check request hasn't been permanently deleted (14+ days)
- Verify you're logged in as admin
- Check terminal for error messages

---

## Security Notes

🔒 **Important Security Practices:**

1. **Change CRON_SECRET in production:**
   ```bash
   # Generate a strong secret:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Never commit secrets to Git:**
   - `.env.local` is in `.gitignore`
   - Use environment variables in production

3. **Admin-only operations:**
   - All delete/recover/cleanup endpoints verify admin role
   - Non-admins cannot see internal notes
   - Conversation endpoint filters by permission level

4. **Rate limiting (recommended):**
   - Consider adding rate limiting to cleanup endpoint
   - Prevent abuse of conversation endpoint

---

## API Reference Quick Guide

### Conversation
```bash
# Get conversation
GET /api/admin/manager-requests/[id]/conversation

# Add message
POST /api/admin/manager-requests/[id]/conversation
Body: { "message": "...", "isInternal": false }
```

### Deletion
```bash
# Soft delete
POST /api/admin/manager-requests/[id]/delete

# Hard delete (immediate)
DELETE /api/admin/manager-requests/[id]/delete

# Recover
POST /api/admin/manager-requests/[id]/recover
```

### Cleanup
```bash
# Preview
GET /api/admin/manager-requests/cleanup

# Execute
POST /api/admin/manager-requests/cleanup
Header: Authorization: Bearer <CRON_SECRET>
```

### List
```bash
# Active requests
GET /api/admin/manager-requests

# Deleted requests
GET /api/admin/manager-requests?deleted=true

# Filter by status
GET /api/admin/manager-requests?status=rejected
```

---

## Next Steps

1. ✅ Test all features locally
2. ✅ Update `.env.local` with secrets
3. ✅ Test conversation with real email
4. ✅ Test soft delete and recovery
5. ⏳ Set up automated cleanup (production only)
6. ⏳ Deploy to production
7. ⏳ Monitor cleanup job logs

---

## Support

For issues or questions:
1. Check terminal logs for errors
2. Use browser DevTools Network tab
3. Check MongoDB for data verification
4. Review this guide's troubleshooting section
