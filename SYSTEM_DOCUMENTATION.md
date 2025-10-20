# Brightland Property Management System - Documentation

**Last Updated:** October 19, 2025  
**Version:** 1.0  
**Stack:** Next.js 15.4.3, MongoDB, Stripe, NextAuth

---

## Table of Contents
1. [System Overview](#system-overview)
2. [User Types & Roles](#user-types--roles)
3. [Authentication & Onboarding](#authentication--onboarding)
4. [Payment System](#payment-system)
5. [Manager Request System](#manager-request-system)
6. [Rental Application Flow](#rental-application-flow)
7. [Database Structure](#database-structure)
8. [API Routes](#api-routes)
9. [Environment Variables](#environment-variables)

---

## System Overview

Brightland is a comprehensive property management platform that handles:
- Tenant applications and onboarding
- Property owner management
- Manager request system with conversation tracking
- Automated rent payments via Stripe (ACH + Card backup)
- Identity verification
- Email notifications via Resend

### Key Features
- ✅ Multi-provider authentication (Google OAuth + Credentials)
- ✅ Stripe payment processing (ACH primary, Card backup)
- ✅ Automated recurring rent payments
- ✅ Security deposit collection
- ✅ Manager request ticketing system
- ✅ Soft delete with recovery
- ✅ Admin dashboard with promotion system
- ✅ Email notifications for all major events

---

## User Types & Roles

### 1. **Tenant** (Default)
- Apply for rental properties
- Set up payment methods (bank account required, card optional)
- Pay security deposits
- View payment history
- Submit manager requests
- Verify identity via Stripe

### 2. **Property Owner**
- Manage multiple properties
- View tenant applications
- No Stripe customer account (business account)
- Can be associated with multiple users

### 3. **Manager**
- Respond to tenant requests
- View conversation history
- Manage tenant issues

### 4. **Admin**
- Full system access
- Promote users to manager role
- View all applications and requests
- Manage soft-deleted items
- Enable auto-pay for approved tenants

---

## Authentication & Onboarding

### Sign-Up Methods

#### **Credentials Provider (Email/Password)**
1. User fills complete signup form
2. Selects user type (Tenant/Property Owner)
3. Tenant: Selects property from dropdown
4. Property Owner: Selects existing or creates new property owner
5. Account created with full profile
6. Redirect to appropriate dashboard

#### **Google OAuth**
1. User clicks "Continue with Google"
2. Authenticates with Google
3. Basic account created (default: tenant, no property)
4. Redirected to `/onboarding` page
5. Complete application form (same as signup)
6. Session updated with profile data
7. Redirect to dashboard

### Onboarding Flow Logic

**When OAuth users need onboarding:**
- Tenant: No `selectedProperty` set
- Property Owner: No `propertyOwnerName` set

**JWT Callback Enhancement:**
```typescript
// On trigger === 'update', re-fetch from database
if (trigger === 'update') {
  const dbUser = await UserModel.findOne({ email: token.email });
  const needsOnboarding = 
    (dbUser.userType === 'tenant' && !dbUser.selectedProperty) ||
    (dbUser.userType === 'property-owner' && !dbUser.propertyOwnerName);
  token.needsOnboarding = needsOnboarding;
}
```

**OnboardingRedirect Component:**
- Runs on every page via `layout.js`
- Checks `session.user.needsOnboarding`
- Redirects to `/onboarding` if true
- Skips auth pages and onboarding page itself

---

## Payment System

### Payment Hierarchy

**Primary: Bank Account (ACH)**
- Required for all tenants
- Used for automatic rent payments
- Lower transaction fees
- 3-5 day processing

**Backup: Credit/Debit Card**
- Optional but recommended
- Only charged if ACH payment fails
- Instant processing
- Higher fees (passed to tenant)

### Payment Setup Flow

1. **Tenant applies for property** → Application Fee ($50 via Stripe Checkout)
2. **Application approved** → Redirected to `/setup-payments`
3. **Add Bank Account** (Required)
   - Plaid integration or manual ACH
   - Micro-deposit verification
4. **Pay Security Deposit** (Required)
   - Amount set by property
   - One-time payment
5. **Add Credit Card** (Optional)
   - Backup payment method
   - Stripe SetupIntent
6. **Setup Complete** → Admin enables auto-pay

### Automated Rent Payments

**Monthly Subscription:**
```typescript
// Created by admin after setup complete
const subscription = await stripe.subscriptions.create({
  customer: stripeCustomerId,
  items: [{ price: monthlyRentPriceId }],
  default_payment_method: bankAccountId, // ACH primary
  collection_method: 'charge_automatically',
  metadata: {
    propertyName: 'Academy Courts',
    userEmail: 'tenant@example.com'
  }
});
```

**Payment Attempts:**
1. Stripe attempts ACH payment on due date
2. If ACH fails → Automatically tries backup card
3. Webhook updates payment status in database
4. Email notifications sent on success/failure

### Payment Model

```typescript
{
  userId: string,
  userEmail: string,
  rentalApplicationId: string,
  propertyName: string,
  type: 'rent' | 'security_deposit' | 'fee' | 'late_fee' | 'maintenance',
  amount: number,
  status: 'pending' | 'paid' | 'failed' | 'refunded',
  paymentMethod: 'ach' | 'card',
  stripePaymentIntentId: string,
  stripeSubscriptionId?: string,
  dueDate: Date,
  paidDate?: Date,
  description: string
}
```

---

## Manager Request System

### Features
- Submit requests as tenant
- Assign to managers
- Conversation tracking (threaded messages)
- Soft delete with recovery
- Email notifications

### Request Lifecycle

1. **Tenant submits request** → POST `/api/manager-requests`
2. **Email sent to manager** → Resend API
3. **Manager responds** → Conversation log updated
4. **Status changes** → Pending → In Progress → Resolved
5. **Soft delete option** → `isDeleted: true`, keeps data
6. **Recovery option** → Admin can restore deleted requests

### Conversation System

```typescript
conversationLog: [{
  message: string,
  sender: string, // 'tenant' | 'manager' | 'admin'
  timestamp: Date
}]
```

**Prevents duplicate responses:**
- Tracks conversation history
- Shows message count in UI
- Real-time updates on new messages

### Soft Delete Implementation

```typescript
{
  isDeleted: boolean,
  deletedAt: Date | null,
  deletedBy: string | null, // email of user who deleted
  conversationLog: [] // Preserved even when deleted
}
```

**Benefits:**
- Data retention for auditing
- Easy recovery
- No data loss
- Maintains conversation history

---

## Rental Application Flow

### Complete Tenant Journey

#### 1. **Browse Properties** (`/rentals`)
- View available properties
- See property details
- Click "Apply Now"

#### 2. **Create Account** (`/signup` or `/auth/signin`)
- Sign up with email/password OR Google
- Complete onboarding form
- Select property

#### 3. **Submit Application** (`/rental-application`)
```typescript
{
  listingName: string,
  userEmail: string,
  userName: string,
  userPhone: string,
  employment: string,
  employer: string,
  monthlyIncome: string,
  moveInDate: Date,
  status: 'pending',
  paymentStatus: 'pending',
  applicationFee: 50.00
}
```

#### 4. **Pay Application Fee** (`/rental-application-checkout`)
- $50 via Stripe Checkout
- Redirects to success page
- Status updates to `paid`

#### 5. **Admin Review** (`/admin`)
- Admin approves/denies application
- Email notification sent
- Status: `approved` or `denied`

#### 6. **Payment Setup** (`/setup-payments`)
Only shown if approved:
- Add checking account (required)
- Pay security deposit (required)
- Add credit card (optional backup)

#### 7. **Move-In Ready**
- Admin enables auto-pay
- Monthly rent subscription created
- Tenant dashboard shows payment history

---

## Database Structure

### Collections

#### **users**
```typescript
{
  _id: ObjectId,
  name: string,
  email: string,
  password?: string, // Only for credentials auth
  phone?: string,
  role: 'user' | 'manager' | 'admin',
  userType: 'tenant' | 'property-owner' | 'manager',
  selectedProperty?: string, // For tenants
  company?: string, // For property owners
  propertyOwnerName?: string, // For property owners
  isVerified: boolean,
  identityVerificationStatus: 'pending' | 'verified' | 'failed',
  stripeCustomerId?: string, // Only for tenants
  createdAt: Date,
  updatedAt: Date
}
```

#### **rentalapplications**
```typescript
{
  _id: ObjectId,
  listingName: string,
  listingType: 'residential' | 'commercial',
  userEmail: string,
  userName: string,
  userPhone: string,
  employment: string,
  employer: string,
  monthlyIncome: string,
  moveInDate: Date,
  status: 'pending' | 'approved' | 'denied',
  paymentStatus: 'pending' | 'paid' | 'failed',
  applicationFee: number,
  hasCheckingAccount?: boolean,
  hasCreditCard?: boolean,
  securityDepositPaid?: boolean,
  adminNotes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

#### **managerrequests**
```typescript
{
  _id: ObjectId,
  firstName: string,
  lastName: string,
  email: string,
  requestType: string,
  message: string,
  status: 'pending' | 'in-progress' | 'resolved',
  conversationLog: [{
    message: string,
    sender: 'tenant' | 'manager' | 'admin',
    timestamp: Date
  }],
  isDeleted: boolean,
  deletedAt: Date | null,
  deletedBy: string | null,
  createdAt: Date,
  updatedAt: Date
}
```

#### **payments**
```typescript
{
  _id: ObjectId,
  userId: string,
  userEmail: string,
  rentalApplicationId: string,
  propertyId?: string,
  propertyName: string,
  type: 'rent' | 'security_deposit' | 'fee' | 'late_fee' | 'maintenance',
  amount: number,
  status: 'pending' | 'paid' | 'failed' | 'refunded',
  paymentMethod: 'ach' | 'card',
  stripePaymentIntentId: string,
  stripeSubscriptionId?: string,
  dueDate: Date,
  paidDate?: Date,
  description: string,
  adminNotes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

#### **propertyowners**
```typescript
{
  _id: ObjectId,
  name: string, // Business/company name
  properties: [{
    name: string,
    description: string,
    imageUrl?: string
  }],
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Routes

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth handlers
- `POST /api/signup` - Create new user account
- `POST /api/user/onboarding` - Complete OAuth onboarding

### User Management
- `POST /api/user/address` - Get user address
- `POST /api/user/update-address` - Update user address
- `POST /api/admin/promote-user` - Promote user to manager

### Rental Applications
- `GET /api/rental-application` - Get applications (by user or all)
- `POST /api/rental-application` - Submit new application

### Manager Requests
- `GET /api/manager-requests` - Get all requests
- `POST /api/manager-requests` - Submit new request
- `PUT /api/admin/manager-requests/[id]` - Update request status
- `POST /api/admin/manager-requests/[id]/conversation` - Add message
- `DELETE /api/admin/manager-requests/[id]/delete` - Soft delete
- `POST /api/admin/manager-requests/[id]/recover` - Restore deleted
- `DELETE /api/admin/manager-requests/cleanup` - Permanent delete

### Payments (Stripe)
- `POST /api/stripe/default-payment-method` - Get payment methods
- `POST /api/stripe/setup-intent` - Create card setup intent
- `POST /api/stripe/add-bank-account` - Add ACH bank account
- `POST /api/stripe/process-payment` - Process one-time payment
- `POST /api/stripe/subscribe` - Create recurring subscription
- `POST /api/stripe/verify-identity` - Start identity verification
- `POST /api/stripe/webhook` - Stripe webhook handler
- `GET /api/tenant/payments` - Get payment history

### Properties
- `GET /api/properties` - Get all properties
- `GET /api/property-owners` - Get all property owners
- `GET /api/property-owners/[ownerName]` - Get specific owner

### Email
- `POST /api/resend/contact` - Send contact form email
- `POST /api/resend/manager` - Send manager request email
- `POST /api/resend/license` - Send license agreement email
- `POST /api/resend/house` - Send property inquiry email

---

## Environment Variables

### Required Variables

```bash
# Database
MONGODB_URI=mongodb+srv://...mongodb.net/brightland-dev

# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (Email)
RESEND_API_KEY=re_...

# Admin Access
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

### Database Setup

**Development:** `brightland-dev`  
**Production:** `test` (rename to `brightland` when ready)

**Collections Created Automatically:**
- users
- rentalapplications
- managerrequests
- payments
- propertyowners

---

## Key Implementation Notes

### 1. **Stripe Customer Creation**
- Only created for tenants (NOT property owners)
- Created during signup or first OAuth login
- Used for all payment processing

### 2. **Payment Priority**
- Bank account is REQUIRED for tenants
- Credit card is OPTIONAL backup
- ACH always attempted first
- Card only charged if ACH fails

### 3. **Session Management**
- JWT-based sessions via NextAuth
- Custom fields: `userType`, `selectedProperty`, `needsOnboarding`
- Session updates trigger database re-fetch
- Ensures data consistency

### 4. **Email Notifications**
- Triggered by webhooks and API calls
- Resend API for delivery
- Manager requests, application updates, payment confirmations

### 5. **Soft Delete Benefits**
- Preserves conversation history
- Allows admin recovery
- Audit trail maintained
- No data loss

---

## Future Enhancements

- [ ] Tenant portal for maintenance requests
- [ ] Property owner analytics dashboard
- [ ] Automated late fee assessment
- [ ] Lease document management
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] SMS notifications
- [ ] Payment plan options

---

**For detailed implementation guides, see historical documentation in `/docs` folder (if needed).**
