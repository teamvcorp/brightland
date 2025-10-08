# Email Notification Workflow with Finished Images

## Overview
When an admin updates a maintenance request status and optionally uploads a finished/progress image, the customer who submitted the request receives an automated email notification with the status update and any attached images.

## Complete Workflow

### 1. Customer Submits Request (/managers page)
- **Mobile-first form** with property dropdown populated from **database** via `/api/properties`
- **Optional problem image upload** - stored in Vercel blob storage
- Request saved to MongoDB with `problemImageUrl`
- Email sent to management with problem details and image

### 2. Admin Reviews Request (/admin page)
- **Mobile-first admin dashboard** shows all requests
- Filter by status: pending, working, finished, rejected
- Click "Manage" to open request modal
- Modal shows:
  - Customer details
  - Problem description
  - Problem image (if uploaded)
  - Status update dropdown
  - Admin notes field
  - **Finished/Progress image upload** (when status is "working" or "finished")

### 3. Admin Updates Status with Image
When admin:
1. Changes status to "working" or "finished"
2. Adds admin notes
3. **Uploads a finished/progress image**
4. Clicks "Update Request"

The system:
1. **Uploads image to Vercel blob** (`/api/upload-image`)
2. **Updates database** with new status, notes, and `finishedImageUrl`
3. **Triggers email notification** to customer

### 4. Customer Receives Email Notification
The email includes:
- **Status change notification** (e.g., "pending → finished")
- **Admin notes** (if provided)
- **Finished work photo** (if uploaded and status is "finished")
- **Progress photo** (if uploaded and status is "working")

## Technical Implementation

### Email Template Logic
```jsx
// StatusUpdateEmail.jsx
{finishedImageUrl && newStatus === 'finished' && (
  <>
    <Text><strong>Completed Work Photo:</strong></Text>
    <img src={finishedImageUrl} alt="Completed maintenance work" />
  </>
)}

{finishedImageUrl && newStatus === 'working' && (
  <>
    <Text><strong>Work Progress Photo:</strong></Text>
    <img src={finishedImageUrl} alt="Maintenance work in progress" />
  </>
)}
```

### API Flow
```typescript
// admin/manager-requests/[id]/route.ts
1. Extract status, adminNotes, finishedImageUrl from request
2. Update database with new values
3. If status changed:
   - Render email template with all data including finishedImageUrl
   - Send email via Resend
```

### Image Storage
- **Vercel Blob Storage** for both problem and finished images
- **Public URLs** generated for email display
- **5MB max file size** with image type validation

## Email Scenarios

### Scenario 1: Status "Pending" → "Working" + Progress Photo
**Email content:**
- "Status has been updated from: pending → working"
- Admin notes (if any)
- "Work Progress Photo:" with uploaded image

### Scenario 2: Status "Working" → "Finished" + Completed Photo
**Email content:**
- "Status has been updated from: working → finished"
- Admin notes (if any)  
- "Completed Work Photo:" with uploaded image

### Scenario 3: Status Update Without Image
**Email content:**
- Status change notification
- Admin notes (if any)
- No image section

## Key Features
✅ **Mobile-first design** for both customer and admin interfaces
✅ **Automatic email notifications** on status changes
✅ **Image upload and display** in emails
✅ **Vercel blob storage** integration
✅ **Real-time status tracking** with filtering
✅ **Professional email templates** with proper formatting

The customer will receive a comprehensive email update whenever their maintenance request status changes, including any photos of completed or in-progress work!