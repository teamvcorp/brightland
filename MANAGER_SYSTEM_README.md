# Manager Request System

This system allows tenants to submit maintenance requests through the `/managers` page and provides an admin interface to manage these requests with automatic email notifications.

## Features

### For Tenants (/managers page)
- Property address dropdown populated from `public/data/data.js`
- Form validation and submission
- Automatic email confirmation
- Request tracking with status updates

### For Admins (/admin page)
- View all maintenance requests
- Filter by status (pending, working, finished, rejected)
- Update request status with admin notes
- Automatic email notifications to tenants when status changes

## Setup Instructions

### 1. Environment Variables
Add these to your `.env.local` file:
```
ADMIN_SETUP_KEY=your-secret-admin-key
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=admin@brightlandproperties.com
RESEND_TO_EMAIL=management@brightlandproperties.com
```

### 2. Create an Admin User
First, create a regular user account through the signup process, then promote them to admin:

```bash
curl -X POST http://localhost:3001/api/admin/promote-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-admin-email@example.com",
    "adminKey": "your-secret-admin-key"
  }'
```

### 3. Access the Admin Panel
Once you have an admin account:
1. Sign in with your admin credentials
2. The "Admin" button will appear in the header
3. Navigate to `/admin` to manage requests

## Database Schema

### ManagerRequest Model
```javascript
{
  fullname: String,
  email: String,
  phone: String,
  address: String, // Property address from dropdown
  projectDescription: String,
  message: String,
  status: 'pending' | 'working' | 'finished' | 'rejected',
  adminNotes: String,
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Public Endpoints
- `POST /api/resend/manager` - Submit new maintenance request

### Admin Endpoints
- `GET /api/admin/check-admin` - Check if current user is admin
- `GET /api/admin/manager-requests` - Get all requests (with optional status filter)
- `PATCH /api/admin/manager-requests/[id]` - Update request status and notes
- `POST /api/admin/promote-user` - Promote user to admin (requires admin key)

### Development Tools
- `GET /api/test/email-preview` - Preview email template

## Email Notifications

The system sends automatic email notifications when:
1. A tenant submits a new request (to management)
2. An admin changes the status of a request (to the tenant)

## Adding New Properties

To add new properties to the dropdown:
1. Edit `public/data/data.js`
2. Add new entries to `resRentalList`, `commRentalList`, or `houseRentalList`
3. The dropdown will automatically update

## Troubleshooting

### Admin Access Issues
- Ensure user has `role: 'admin'` in the database
- Check that `ADMIN_SETUP_KEY` environment variable is set
- Verify the user is signed in

### Email Issues
- Check `RESEND_API_KEY` is valid
- Verify sender email is authorized in Resend
- Check server logs for email errors

### Database Issues
- Ensure MongoDB connection is working
- Check that all models are properly imported
- Verify database indexes are created