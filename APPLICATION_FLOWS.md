# Brightland Property Management - Application Flows & System Documentation

**Last Updated:** December 13, 2025  
**Next.js Version:** 15.5.9  
**Stack:** Next.js, TypeScript, MongoDB, Stripe, NextAuth, Resend

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [User Types & Roles](#user-types--roles)
3. [Authentication & Onboarding Flow](#authentication--onboarding-flow)
4. [Tenant Application Flow](#tenant-application-flow)
5. [Payment Setup Flow](#payment-setup-flow)
6. [Auto-Pay Enrollment Flow](#auto-pay-enrollment-flow)
7. [Admin Tenant Management Flow](#admin-tenant-management-flow)
8. [Admin Rental Application Management](#admin-rental-application-management)
9. [Manager Request Flow](#manager-request-flow)
10. [Database Collections](#database-collections)
11. [API Routes Reference](#api-routes-reference)
12. [Stripe Integration](#stripe-integration)

---

## System Architecture

### Core Technologies
- **Framework:** Next.js 15.5.9 (App Router)
- **Language:** TypeScript
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** NextAuth v4.24.11
- **Payments:** Stripe API
- **Email:** Resend
- **Styling:** Tailwind CSS

### Key Features
✅ Multi-provider authentication (Google OAuth + Credentials)  
✅ Stripe payment processing (ACH + Credit Card)  
✅ Automated recurring rent payments  
✅ Security deposit collection  
✅ Identity verification via Stripe  
✅ Manager request ticketing system  
✅ Admin dashboard with full CRUD operations  
✅ Manual tenant/application creation  
✅ Auto-pay enrollment for tenants  

---

## User Types & Roles

### 1. Tenant (userType: 'tenant')
**Capabilities:**
- Apply for rental properties online
- Set up payment methods (checking account + credit card)
- Pay security deposits
- Enroll in auto-pay for rent
- View payment history
- Submit maintenance requests
- Update profile and address

**Required Fields:**
- name, email, password (or OAuth)
- selectedProperty (property they're applying for)
- address (street, city, state, zip)
- phone (optional)

**Stripe Integration:**
- Each tenant gets a Stripe Customer ID
- Can attach bank accounts (ACH) and credit cards
- Auto-pay uses Stripe Subscriptions

---

### 2. Property Owner (userType: 'property-owner')
**Capabilities:**
- Manage multiple properties
- View tenant applications
- Approve/reject manager requests
- Track payment requests
- No direct payment processing (uses business accounts)

**Required Fields:**
- name, email, password
- propertyOwnerName (links to PropertyOwner collection)

**Verification:**
- Status: pending → approved → active
- Admin must approve before full access

---

### 3. Manager (role: 'manager')
**Capabilities:**
- Respond to tenant maintenance requests
- View conversation history
- Upload before/after photos
- Track request status (pending → working → finished)

**Assignment:**
- Promoted by admin via `/api/admin/promote-user`
- Inherits base user type (can be tenant or property owner)

---

### 4. Admin (role: 'admin')
**Capabilities:**
- Full system access
- Promote users to manager role
- Manually create tenants and applications
- Verify tenant identity manually
- Mark cash deposits as collected
- Create rental applications for in-person applicants
- Update application status (pending/approved/denied)
- Enable auto-pay for approved tenants
- Manage soft-deleted items

**Access:**
- Role set directly in database
- Protected routes check `session.user.role === 'admin'`

---

## Authentication & Onboarding Flow

### Sign-Up Flow (Credentials)
```
User visits /signup
  ↓
Fills form:
  - Name, Email, Password
  - User Type: Tenant or Property Owner
  - Tenant → Select Property
  - Property Owner → Select/Create Owner
  ↓
POST /api/signup
  ↓
Create User in MongoDB
  ↓
Tenant → Create Stripe Customer
  ↓
Auto sign-in (NextAuth)
  ↓
Redirect to appropriate dashboard:
  - Tenant → /dashboard
  - Property Owner → /property-owner-dashboard
```

---

### OAuth Sign-Up Flow (Google)
```
User clicks "Continue with Google"
  ↓
NextAuth handles OAuth flow
  ↓
Create basic User record:
  - email, name from Google
  - userType: 'tenant' (default)
  - selectedProperty: null
  ↓
Sign in successful
  ↓
Check onboarding requirements:
  - Tenant: No selectedProperty?
  - Property Owner: No propertyOwnerName?
  ↓
Redirect to /onboarding
  ↓
User fills application form
  ↓
POST /api/user/onboarding
  ↓
Update User + Create Stripe Customer
  ↓
Session refreshed
  ↓
Redirect to dashboard
```

**Onboarding Trigger Logic:**
- Tenant needs onboarding if: `!session.user.selectedProperty`
- Property Owner needs onboarding if: `!session.user.propertyOwnerName`

---

## Tenant Application Flow

### Online Rental Application
```
Tenant visits /rental-application
  ↓
Fills application form:
  - Property selection
  - Employment info (status, employer, income)
  - SSN last 4 digits
  - Reference (name, phone, relationship)
  - Move-in date
  - Additional info (optional)
  ↓
POST /api/rental-application
  ↓
Create RentalApplication document:
  - status: 'pending'
  - paymentStatus: 'pending'
  - applicationFee: $25.00
  ↓
Redirect to /rental-application-checkout
  ↓
Stripe Checkout Session created
  ↓
User pays application fee
  ↓
Webhook updates:
  - paymentStatus: 'paid'
  - paidAt: Date
  - paymentIntentId: string
  ↓
Redirect to /rental-application-success
  ↓
Admin reviews in /admin dashboard
```

---

### Admin Reviews Application
```
Admin logs into /admin
  ↓
Views "Rental Applications" section
  ↓
Clicks "Manage" on application
  ↓
Modal opens showing:
  - Applicant details
  - Employment info
  - Reference info
  - Payment status
  ↓
Admin actions:
  1. Update status: pending → approved/denied
  2. Add admin notes
  3. If approved:
     - Set monthly rent
     - Set lease start/end dates
     - Auto-calculate prorated first payment
  ↓
Click "Update Application"
  ↓
POST /api/admin/update-application-status
  ↓
Status updated in database
  ↓
Tenant sees updated status in /dashboard
```

---

## Payment Setup Flow

### New Tenant Payment Setup (After Approval)
```
Tenant application approved
  ↓
Tenant logs into /dashboard
  ↓
Sees "Approved Application" card with checklist:
  ☐ Add Checking Account
  ☐ Pay Security Deposit
  ☐ Add Credit Card (optional)
  ↓
Clicks "Start Payment Setup"
  ↓
Redirected to /setup-payments?applicationId=XXX
  ↓
Step 1: Add Checking Account
  ↓
  Enter bank details:
    - Account holder name
    - Routing number
    - Account number
    - Account type (checking/savings)
  ↓
  Stripe creates bank_account token
  ↓
  POST /api/stripe/add-bank-account
  ↓
  Attach to Stripe Customer
  ↓
  Update RentalApplication:
    - hasCheckingAccount: true
    - achPaymentMethodId: pm_xxx
  ↓
Step 2: Pay Security Deposit
  ↓
  See deposit amount from application
  ↓
  Click "Pay Security Deposit"
  ↓
  POST /api/tenant/security-deposit
  ↓
  Stripe creates PaymentIntent
  ↓
  Confirms payment with bank account
  ↓
  Update RentalApplication:
    - securityDepositPaid: true
    - securityDepositIntentId: pi_xxx
  ↓
Step 3: Add Credit Card (Backup)
  ↓
  Enter card details via Stripe Elements
  ↓
  POST /api/tenant/add-credit-card
  ↓
  Attach to Stripe Customer
  ↓
  Update RentalApplication:
    - hasCreditCard: true
    - cardPaymentMethodId: pm_xxx
  ↓
All steps complete!
  ↓
Admin can now enable auto-pay
```

---

## Auto-Pay Enrollment Flow

### Tenant Enrolls in Auto-Pay (New Feature)
```
Tenant logs into /dashboard
  ↓
Sees "Set Up Automatic Rent Payments" section
  ↓
Check if has checking account:
  
  NO → Shows warning:
    "A checking account is required for auto-pay enrollment"
    ↓
    Button: "Add Checking Account"
    ↓
    Redirects to /linkbank
    ↓
    Add bank account flow (same as payment setup)
    ↓
    Returns to /dashboard
  
  YES → Shows success:
    "Checking account connected: BANK ****1234"
    ↓
    Message: "Your property manager will enable auto-pay once 
             all payment setup requirements are complete"
    ↓
    (Admin enables from admin dashboard)
```

---

### Admin Enables Auto-Pay
```
Admin opens approved application modal
  ↓
Checks requirements:
  ✓ hasCheckingAccount: true
  ✓ hasCreditCard: true
  ✓ securityDepositPaid: true
  ✓ leaseStartDate set
  ✓ leaseEndDate set
  ✓ monthlyRent > 0
  ↓
Clicks "Enable Auto-Pay"
  ↓
POST /api/admin/enable-auto-pay
  ↓
Creates Stripe Subscription:
  - customer: stripeCustomerId
  - default_payment_method: achPaymentMethodId
  - items: [{ price: monthly_rent_price }]
  - billing_cycle_anchor: lease start date
  - collection_method: 'charge_automatically'
  ↓
  If card exists:
    - Set as backup payment method
  ↓
Update RentalApplication:
  - autoPayEnabled: true
  - stripeSubscriptionId: sub_xxx
  - nextPaymentDate: calculated
  ↓
Tenant now has automated monthly rent payments!
```

---

## Admin Tenant Management Flow

### Manually Add Tenant (In-Person Application)
```
Admin in /admin dashboard
  ↓
"Tenant Management" section
  ↓
Clicks "Add Tenant"
  ↓
Fills form:
  - Name, Email, Phone
  - Selected Property
  - Address (optional)
  ↓
POST /api/admin/add-tenant
  ↓
Creates User:
  - userType: 'tenant'
  - password: auto-generated
  - Creates Stripe Customer
  - hasCheckingAccount: false
  - hasCreditCard: false
  - securityDepositPaid: false
  ↓
Tenant appears in "Tenant Management" table
  ↓
Admin can now:
  - Manually verify identity
  - Mark cash deposit collected
  - Create rental application
```

---

### Manually Verify Tenant Identity
```
Admin clicks "Manage" on tenant
  ↓
Modal opens showing tenant details
  ↓
"Identity Verification" section shows:
  Status: Pending/Verified/Failed
  ↓
If not verified:
  Click "Manually Verify Identity"
  ↓
  POST /api/admin/verify-tenant-identity
  ↓
  Update User:
    - identityVerificationStatus: 'verified'
    - isVerified: true
  ↓
  Badge changes to "✓ Verified"
```

---

### Mark Cash Deposit Collected
```
In tenant management modal
  ↓
"Security Deposit" section shows:
  Status: Not Paid
  ↓
Enter deposit amount: $1000.00
  ↓
Click "Mark Cash Deposit as Collected"
  ↓
POST /api/admin/mark-deposit-collected
  ↓
Update User:
  - securityDepositPaid: true
  - securityDepositAmount: 1000
  - securityDepositDate: Date
  - securityDepositIntentId: 'CASH_PAYMENT'
  ↓
Status badge changes to "✓ Paid"
```

---

## Admin Rental Application Management

### Create Application for In-Person Tenant
```
Admin in tenant management modal
  ↓
"Rental Application" section shows:
  "No rental application on file"
  ↓
Click "Create Rental Application"
  ↓
Prompts appear:
  1. Enter property name: "123 Main St"
  2. Enter property type: "house"
  3. Enter monthly rent (optional): "1500"
  4. Enter lease start date (optional): "2025-01-01"
  5. Add notes (optional): "Applied in person"
  ↓
POST /api/admin/create-rental-application
  ↓
Creates RentalApplication:
  - listingName, listingType: from prompts
  - userEmail, userName, userPhone: from User
  - employment/employer: "Manual entry - see admin notes"
  - monthlyIncome: "0"
  - socialSecurityLastFour: "N/A"
  - reference fields: "Manual entry" / "N/A"
  - moveInDate: leaseStartDate or today
  - status: 'pending'
  - paymentStatus: 'pending'
  - applicationFee: 0 (manual applications free)
  - adminNotes: notes from prompt
  - Syncs payment flags from User
  ↓
Application created!
  ↓
Modal now shows:
  "Application Status: Pending"
  Button: "View Full Application"
```

---

### Update Application Status (Manual Entry)
```
Admin clicks "View Full Application"
  ↓
Rental application modal opens
  ↓
Admin can modify:
  - Status: pending → approved/denied
  - Admin notes
  - Monthly rent
  - Lease start date
  - Lease end date
  ↓
If status = approved:
  Auto-calculates prorated first payment:
    - If lease starts on day 1-5: Full month
    - If lease starts day 6+: Prorated
    - Formula: (rent / days_in_month) * days_remaining
  ↓
Click "Update Application"
  ↓
POST /api/admin/update-application-status
  ↓
Updates RentalApplication:
  - status
  - monthlyRent
  - leaseStartDate/leaseEndDate
  - firstPaymentAmount (calculated)
  - isProrated (boolean)
  - adminNotes
  ↓
Application updated!
  ↓
Tenant sees approved status in their dashboard
```

**Key Difference from Online Flow:**
- Manual applications have $0 application fee
- Employment/income fields default to "Manual entry"
- Admin adds all info instead of tenant filling form
- Otherwise, data structure is identical

---

## Manager Request Flow

### Tenant Submits Maintenance Request
```
Tenant in /dashboard
  ↓
Clicks "Submit Maintenance Request"
  ↓
Redirected to /tenant-request
  ↓
Fills form:
  - Full name, email, phone, address
  - Project description
  - Message/details
  - Upload problem image (optional)
  ↓
POST /api/manager-requests
  ↓
Create ManagerRequest:
  - status: 'pending'
  - userType: from session
  - problemImageUrl: if uploaded
  ↓
Email sent to admin
  ↓
Request appears in admin dashboard
```

---

### Admin/Manager Processes Request
```
Admin/Manager logs in
  ↓
Views "Manager Requests" section
  ↓
Clicks "Manage" on request
  ↓
Modal shows:
  - Request details
  - Problem image
  - Status selector
  - Conversation log
  - Internal notes
  ↓
Actions available:
  1. Update status: pending → working → finished
  2. Add conversation messages
  3. Upload finished image
  4. Add internal notes (admin only)
  5. Soft delete request
  ↓
Updates saved:
  PATCH /api/admin/manager-requests/[id]
  ↓
  If status changed to finished:
    - Email sent to requester
```

**Conversation Log:**
- Each message has: sender, senderName, senderEmail, message, timestamp
- isInternal flag for admin-only notes
- Displayed chronologically in modal

---

## Database Collections

### users
**Purpose:** All user accounts (tenants, property owners, managers, admins)

**Key Fields:**
```typescript
{
  name: string,
  email: string, // unique
  password: string, // hashed with bcrypt
  userType: 'tenant' | 'property-owner',
  role?: 'admin' | 'manager',
  
  // Tenant-specific
  selectedProperty?: string,
  address?: {
    street: string,
    city: string,
    state: string,
    zip: string
  },
  
  // Property Owner specific
  propertyOwnerName?: string,
  propertyOwnerVerificationStatus?: 'pending' | 'approved' | 'rejected',
  
  // Payment & verification
  stripeCustomerId?: string,
  identityVerificationStatus: 'pending' | 'verified' | 'failed',
  isVerified: boolean,
  
  // Payment setup flags
  hasCheckingAccount: boolean,
  hasCreditCard: boolean,
  securityDepositPaid: boolean,
  securityDepositAmount?: number,
  securityDepositDate?: Date,
  securityDepositIntentId?: string,
  
  phone?: string,
  createdAt: Date,
  updatedAt: Date
}
```

---

### rentalapplications
**Purpose:** Rental applications (online + manual)

**Key Fields:**
```typescript
{
  // Application details
  listingName: string,
  listingType: string,
  userEmail: string,
  userName: string,
  userPhone: string,
  
  // Employment & financial
  employment: string,
  employer: string,
  monthlyIncome: string,
  socialSecurityLastFour: string,
  
  // Reference
  referenceName: string,
  referencePhone: string,
  referenceRelation: string,
  
  // Dates & status
  moveInDate: string,
  status: 'pending' | 'approved' | 'denied',
  paymentStatus: 'pending' | 'paid' | 'failed',
  
  // Application fee
  applicationFee: number, // $25 or $0 for manual
  paymentIntentId?: string,
  paidAt?: Date,
  
  // Lease information (set on approval)
  monthlyRent?: number,
  leaseStartDate?: Date,
  leaseEndDate?: Date,
  propertyId?: string,
  
  // First payment calculation
  firstPaymentAmount?: number,
  firstPaymentDue?: Date,
  isProrated?: boolean,
  
  // Payment setup status
  hasCheckingAccount?: boolean,
  hasCreditCard?: boolean,
  securityDepositPaid?: boolean,
  achPaymentMethodId?: string,
  cardPaymentMethodId?: string,
  
  // Auto-pay
  autoPayEnabled?: boolean,
  stripeSubscriptionId?: string,
  nextPaymentDate?: Date,
  rentPaymentStatus?: 'current' | 'late' | 'paid_ahead',
  
  // Admin fields
  adminNotes?: string,
  
  // Archive
  isArchived?: boolean,
  archivedAt?: Date,
  archivedBy?: string,
  
  createdAt: Date,
  updatedAt: Date
}
```

---

### managerrequests
**Purpose:** Maintenance/service requests from tenants

**Key Fields:**
```typescript
{
  fullname: string,
  email: string,
  phone: string,
  address: string,
  projectDescription: string,
  message: string,
  status: 'pending' | 'working' | 'finished' | 'rejected',
  userType?: 'tenant' | 'property-owner' | 'home-owner',
  
  // Images
  problemImageUrl?: string,
  finishedImageUrl?: string,
  
  // Admin fields
  adminNotes?: string,
  
  // Admin-initiated requests
  submittedBy?: 'user' | 'admin',
  requiresApproval?: boolean,
  approvalStatus?: 'pending-approval' | 'approved' | 'declined',
  approvedBy?: string,
  approvalDate?: string,
  
  // Conversation log
  conversationLog?: Array<{
    sender: 'admin' | 'user',
    senderName: string,
    senderEmail: string,
    message: string,
    timestamp: string,
    isInternal?: boolean
  }>,
  
  // Soft delete
  isDeleted?: boolean,
  deletedAt?: string,
  deletedBy?: string,
  
  createdAt: string,
  updatedAt: string
}
```

---

### payments
**Purpose:** Payment transaction records

**Key Fields:**
```typescript
{
  userId: string,
  userEmail: string,
  amount: number,
  type: 'rent' | 'security_deposit' | 'application_fee' | 'late_fee',
  status: 'pending' | 'paid' | 'failed' | 'refunded',
  paymentMethod: 'ach' | 'card',
  stripePaymentIntentId: string,
  rentalApplicationId?: string,
  description?: string,
  failureReason?: string,
  createdAt: Date,
  paidAt?: Date
}
```

---

### propertyowners
**Purpose:** Property owner business entities

**Key Fields:**
```typescript
{
  name: string, // unique
  description?: string,
  contactEmail?: string,
  contactPhone?: string,
  properties?: string[], // Array of property names
  associatedUsers?: string[], // Array of User IDs
  stripeAccountId?: string,
  identityVerificationStatus: 'pending' | 'verified' | 'rejected',
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Routes Reference

### Authentication
- `POST /api/signup` - Create new user account
- `POST /api/auth/[...nextauth]` - NextAuth handler
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

---

### User Management
- `GET /api/user/address` - Get user address
- `PATCH /api/user/update-address` - Update user address
- `POST /api/user/onboarding` - Complete OAuth onboarding
- `GET /api/user/verification-status` - Get Stripe verification status

---

### Rental Applications
- `GET /api/rental-application` - Get applications (by user or all)
- `POST /api/rental-application` - Submit new application
- `PATCH /api/rental-application` - Update application (generic)

---

### Admin - Tenant Management
- `POST /api/admin/add-tenant` - Manually create tenant
- `GET /api/admin/tenants` - Get all tenants
- `POST /api/admin/verify-tenant-identity` - Manually verify identity
- `POST /api/admin/mark-deposit-collected` - Record cash deposit

---

### Admin - Rental Application Management
- `POST /api/admin/create-rental-application` - Create application for in-person tenant
- `POST /api/admin/update-application-status` - Update status, lease info, prorated rent

---

### Admin - Auto-Pay & Payments
- `POST /api/admin/enable-auto-pay` - Enable auto-pay, create Stripe subscription
- `GET /api/admin/payment-history` - Get all payments
- `GET /api/admin/payment-stats` - Get payment statistics

---

### Admin - Property Owners
- `GET /api/admin/pending-property-owners` - Get pending approvals
- `POST /api/admin/approve-property-owner/[id]` - Approve property owner
- `POST /api/admin/reject-property-owner/[id]` - Reject and delete account

---

### Admin - Manager Requests
- `GET /api/admin/manager-requests` - Get all manager requests
- `PATCH /api/admin/manager-requests/[id]` - Update request status
- `POST /api/admin/manager-requests/[id]/conversation` - Add conversation message
- `POST /api/admin/manager-requests/[id]/delete` - Soft delete request
- `POST /api/admin/manager-requests/[id]/recover` - Recover deleted request

---

### Admin - System
- `POST /api/admin/promote-user` - Promote user to manager/admin
- `GET /api/admin/check-admin` - Check if user is admin
- `GET /api/admin/debug-users` - Debug user data

---

### Tenant - Payment Setup
- `POST /api/tenant/add-checking-account` - Add bank account
- `POST /api/tenant/add-credit-card` - Add credit card
- `POST /api/tenant/security-deposit` - Pay security deposit
- `GET /api/tenant/payments` - Get tenant's payment history

---

### Stripe Integration
- `POST /api/stripe/setup-intent` - Create SetupIntent for payment methods
- `POST /api/stripe/add-bank-account` - Attach bank account token to customer
- `GET /api/stripe/default-payment-method` - Get default payment method
- `POST /api/stripe/verify-identity` - Start Stripe identity verification
- `POST /api/stripe/create-checkout-session` - Create Stripe Checkout session
- `POST /api/stripe/confirm-checkout-session` - Confirm session completion
- `POST /api/stripe/webhook` - Handle Stripe webhook events
- `POST /api/stripe/process-payment` - Process one-time payment
- `POST /api/stripe/subscribe` - Create subscription for recurring payments

---

### Manager Requests
- `GET /api/manager-requests` - Get manager requests (filtered by user)
- `POST /api/manager-requests` - Submit new request
- `PATCH /api/manager-requests/[id]` - Update request

---

### Properties
- `GET /api/properties` - Get all properties
- `POST /api/properties` - Create new property

---

### Resend Email
- `POST /api/resend/contact` - Send contact form email
- `POST /api/resend/house` - Send house inquiry email
- `POST /api/resend/license` - Send license agreement email
- `POST /api/resend/manager` - Send manager request email

---

## Stripe Integration

### Customer Creation
**When:** User signs up as tenant (or admin creates tenant)
**How:**
```typescript
const customer = await stripe.customers.create({
  email: user.email,
  name: user.name,
  phone: user.phone || undefined,
  metadata: {
    userId: user._id.toString(),
    userType: 'tenant'
  }
});
```

**Stored:** `stripeCustomerId` in User document

---

### Payment Methods

#### Bank Account (ACH)
**Process:**
1. Frontend: Stripe.js creates token
   ```javascript
   const token = await stripe.createToken('bank_account', {
     country: 'US',
     currency: 'usd',
     routing_number: '110000000',
     account_number: '000123456789',
     account_holder_name: 'Jane Doe',
     account_holder_type: 'individual'
   });
   ```

2. Backend: Attach to customer
   ```typescript
   const paymentMethod = await stripe.paymentMethods.create({
     type: 'us_bank_account',
     us_bank_account: { token: token.id }
   });
   
   await stripe.paymentMethods.attach(paymentMethod.id, {
     customer: stripeCustomerId
   });
   ```

---

#### Credit Card
**Process:**
1. Frontend: Stripe Elements CardElement
2. Backend: Token → PaymentMethod → Attach to customer

---

### Subscriptions (Auto-Pay)
**Created by:** Admin via `/api/admin/enable-auto-pay`

**Process:**
```typescript
// Create price for monthly rent
const price = await stripe.prices.create({
  unit_amount: monthlyRent * 100, // in cents
  currency: 'usd',
  recurring: { interval: 'month' },
  product_data: {
    name: `Monthly Rent - ${propertyName}`
  }
});

// Create subscription
const subscription = await stripe.subscriptions.create({
  customer: stripeCustomerId,
  items: [{ price: price.id }],
  default_payment_method: achPaymentMethodId,
  billing_cycle_anchor: leaseStartTimestamp,
  collection_method: 'charge_automatically',
  metadata: {
    applicationId: rentalApplicationId,
    propertyName: propertyName
  }
});
```

**Backup Payment Method:**
- If card exists, attached to subscription
- Stripe automatically charges card if ACH fails

---

### Payment Intents (One-Time Payments)

**Used For:**
- Security deposits
- Application fees
- One-time charges

**Process:**
```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: amount * 100,
  currency: 'usd',
  customer: stripeCustomerId,
  payment_method: paymentMethodId,
  confirm: true,
  metadata: {
    type: 'security_deposit',
    applicationId: applicationId
  }
});
```

---

### Identity Verification
**When:** Tenant needs to verify identity for large payments

**Process:**
```typescript
const verificationSession = await stripe.identity.verificationSessions.create({
  type: 'document',
  metadata: {
    userId: user._id.toString()
  }
});

// User visits verificationSession.url
// Stripe verifies ID document
// Webhook updates user.identityVerificationStatus
```

---

## Key Differences: Online vs Manual Flows

| Feature | Online Application | Manual (Admin-Created) |
|---------|-------------------|------------------------|
| **Application Fee** | $25.00 | $0.00 |
| **Form Filled By** | Tenant | Admin (minimal info) |
| **Employment Data** | Required from tenant | "Manual entry - see notes" |
| **Stripe Customer** | Created on signup | Created by admin |
| **Identity Verification** | Tenant uses Stripe | Admin manually verifies |
| **Security Deposit** | Paid via Stripe | Can mark cash payment |
| **Payment Setup** | Tenant adds accounts | Tenant adds later (optional) |
| **Auto-Pay Enrollment** | After approval | Tenant can enroll anytime |

**Result:** Both flows end up with identical RentalApplication structure, enabling same auto-pay and payment tracking features.

---

## Security & Best Practices

### Authentication
- Passwords hashed with bcrypt (10 rounds)
- NextAuth session tokens (JWT)
- Protected routes check session server-side
- Admin routes verify `session.user.role === 'admin'`

### Stripe
- API keys stored in environment variables
- Webhook signatures verified
- Payment intents confirmed server-side
- Customer IDs stored in database

### Database
- MongoDB connection pooled and reused
- Soft delete for data recovery
- Timestamps on all documents
- Indexes on frequently queried fields

### Error Handling
- Try-catch blocks on all async operations
- User-friendly error messages
- Server errors logged to console
- Toast notifications for user feedback

---

## Environment Variables Required

```bash
# Database
MONGODB_URI=mongodb+srv://...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...

# Admin
ADMIN_EMAIL=admin@example.com
```

---

## Recent Updates (December 2025)

### Auto-Pay Enrollment Feature
- Tenants can now enroll in auto-pay directly from dashboard
- Shows checking account requirement and setup flow
- Links to `/linkbank` for adding bank accounts
- Displays current auto-pay status

### Admin Tenant Management
- Manually create tenant accounts
- Verify identity without Stripe verification
- Mark cash security deposits as collected
- Full tenant CRUD operations

### Admin Rental Application Management
- Create applications for in-person tenants
- Update application status with lease details
- Auto-calculate prorated rent for mid-month starts
- Identical data structure to online applications

### Flexible Address Validation
- State field accepts 2-50 characters (not just 2)
- ZIP code accepts 5-10 characters (not just regex)
- Supports international formats

### Payment History Always Visible
- All tenants see payment history section
- Previously only shown for approved applications
- Collapsible section with transaction details

---

**End of Documentation**  
For questions or updates, contact the development team.
