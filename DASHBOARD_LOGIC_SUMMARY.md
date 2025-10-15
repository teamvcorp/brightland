# Tenant Dashboard - Complete Logic & Functions Summary

## Overview
The tenant dashboard (`app/dashboard/page.tsx`) is a comprehensive user portal for tenants to manage their profile, rental applications, payments, and identity verification.

---

## 🔐 Authentication & Routing

### User Type Redirects
```typescript
useEffect(() => {
  if (session?.user?.userType === 'manager') {
    router.push('/manager-dashboard');
  }
  if (session?.user?.userType === 'property-owner') {
    router.push('/property-owner-dashboard');
  }
}, [session, router]);
```
- **Purpose:** Redirects managers and property owners to their specific dashboards
- **Target Users:** Only tenants (or users without userType) see this dashboard

### Loading & Auth States
- **Loading State:** Shows "Loading..." spinner while session loads
- **Unauthenticated:** Redirects to `/auth/signin`

---

## 📊 State Management

### User Data States
```typescript
const [address, setAddress] = useState({ street: '', city: '', state: '', zip: '' });
const [editingAddress, setEditingAddress] = useState(false);
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);
```

### Payment-Related States
```typescript
const [current40Percent, setCurrent40Percent] = useState(0);
const [presetMin, setPresetMin] = useState(10);
const [defaultPayment, setDefaultPayment] = useState<PaymentMethod | null>(null);
const [clientSecret, setClientSecret] = useState('');
const [showCardForm, setShowCardForm] = useState(false);
```

### Identity Verification State
```typescript
const [documentType, setDocumentType] = useState('');
```

### Rental Applications State (NEW)
```typescript
const [rentalApplications, setRentalApplications] = useState<RentalApplication[]>([]);
```

---

## 🔄 Data Fetching Functions

### 1. `fetchCurrent40Percent()`
- **API:** `POST /api/get-current-40-percent`
- **Purpose:** Retrieves the user's current "40% payment" amount
- **Logic:** Special payment system (likely related to profit-sharing or deposit)
- **Updates:** `current40Percent` state
- **Note:** Amount is stored in cents (divided by 100 for display)

### 2. `fetchAddress()`
- **API:** `POST /api/user/address`
- **Purpose:** Loads user's saved address
- **Updates:** `address` state with street, city, state, zip

### 3. `fetchDefaultPaymentMethod()`
- **API:** `POST /api/stripe/default-payment-method`
- **Purpose:** Retrieves user's default payment method from Stripe
- **Updates:** `defaultPayment` state with card brand, last4, exp_month, exp_year
- **Returns 404:** If no payment method exists (not an error)

### 4. `fetchRentalApplications()` (NEW)
- **API:** `GET /api/rental-application?userEmail=${email}`
- **Purpose:** Fetches all rental applications submitted by the user
- **Updates:** `rentalApplications` state
- **Runs on:** Component mount when session exists

### Initial Data Load
All fetch functions run once on mount:
```typescript
useEffect(() => {
  if (session?.user?.email) {
    fetchCurrent40Percent();
    fetchAddress();
    fetchDefaultPaymentMethod();
    fetchRentalApplications();
  }
}, [session?.user?.email]);
```

---

## 🛠️ User Action Handlers

### Address Management

#### `handleAddressChange(field, value)`
- **Purpose:** Updates address state as user types
- **Fields:** street, city, state, zip
- **Local only:** No API call until save

#### `handleSaveAddress()`
- **API:** `POST /api/user/update-address`
- **Purpose:** Saves address to database
- **Success:** Exits edit mode
- **Error:** Sets error message

### Payment Management

#### `handleUpdate40Percent()`
- **API:** `POST /api/update-40-percent`
- **Purpose:** Updates the "40% payment" based on recent deposit
- **Loading State:** Shows "Processing..." during API call
- **Success:** Updates `current40Percent` and shows alert
- **Use Case:** Likely recalculates payment based on new income/deposits

#### `handleProcessPayment()`
- **API:** `POST /api/stripe/process-payment`
- **Purpose:** Processes one-time payment for current 40% amount
- **Stripe Flow:**
  1. Creates payment intent on backend
  2. Confirms payment with Stripe.js
  3. Uses token 'tok_visa' (test mode?)
- **Success:** Shows alert with payment intent ID
- **Note:** May need updating for production (token handling)

#### `handleRecurringPayment()`
- **API:** `POST /api/stripe/subscribe`
- **Purpose:** Sets up recurring subscription for 40% amount
- **Stripe Flow:**
  1. Creates subscription on backend
  2. Confirms payment intent
- **Success:** Shows "Recurring payment setup successful!"
- **Returns:** Payment intent or null

#### `handleStartUpdatePaymentMethod()`
- **API:** `POST /api/stripe/setup-intent`
- **Purpose:** Initiates payment method update flow
- **Updates:** `clientSecret` and shows card form
- **Stripe Flow:** Uses SetupIntent (doesn't charge)

### Identity Verification

#### `handleVerifyIdentity()`
- **API:** `POST /api/stripe/verify-identity`
- **Purpose:** Initiates Stripe Identity verification
- **Requirements:** User must select document type (passport, id_card, driving_license)
- **Stripe Flow:**
  1. Backend creates verification session
  2. Frontend calls `stripe.verifyIdentity(clientSecret)`
  3. User completes verification in Stripe modal
- **Success:** Updates session and refreshes router
- **Shown:** Only if `!session?.user?.isVerified`

---

## 🎨 UI Sections (In Display Order)

### 1. User Information Section
**Displays:**
- Name (from session)
- Email (from session)
- Verification Status (verified/not verified)
- Address (with inline edit capability)

**Features:**
- Toggle edit mode for address
- Save/Cancel buttons when editing
- Inline form fields for street, city, state, zip

---

### 2. My Rental Applications Section (NEW)
**Displays:**
- List of all rental applications submitted by user
- Empty state: "No rental applications submitted yet."

**Each Application Card Shows:**
- Property name and type
- Status badge (color-coded):
  - 🟡 **Pending** - Yellow badge
  - 🟢 **Approved** - Green badge
  - 🔴 **Denied** - Red badge
- Submission date
- Desired move-in date
- Payment status (paid/pending/failed)
- Application fee amount

**Conditional Content:**
- **Pending Status:**
  - Blue info box: "🔄 Application under review"
  
- **Approved Status:**
  - Green success box: "🎉 Congratulations! Your application has been approved!"
  - Shows admin notes if provided
  - Two scaffolded buttons (disabled):
    - "Complete Identity Verification" (Coming Soon)
    - "Link Bank Account for Auto-Pay" (Coming Soon)
  
- **Denied Status:**
  - Red error box: "❌ Application denied"
  - Shows reason from admin notes if provided

---

### 3. Current 40% Payment Section
**Displays:**
- Current 40% amount (in dollars, converted from cents)
- Preset Min (only visible to admins)
- "Update 40% from Recent Deposit" button

**Purpose:**
Appears to be a profit-sharing or deposit-related payment system unique to this platform

---

### 4. Identity Verification Section
**Shown When:** `!session?.user?.isVerified`

**Features:**
- Document type dropdown:
  - Passport
  - ID Card
  - Driver's License
- "Verify Your Identity" button
- Disabled until document type selected

**Purpose:**
Stripe Identity integration for KYC compliance

---

### 5. Additional Options Section
**Shown When:** `session?.user?.isVerified`

**Payment Method Display:**
- Shows: "VISA **** 1234 (exp 12/2025)"
- Or: "No default payment method found."

**Actions:**
- "Update Payment Method" → Opens Stripe CardElement form
- "Add Bank Account" → Links to `/linkbank` page
- "Process Payment" → One-time payment
- "Recurring Payment" → Subscription setup

**Card Update Form:**
- Inline form with Stripe CardElement
- Appears when "Update Payment Method" clicked
- Success: Hides form and refreshes payment method

---

## 🔗 External Dependencies

### Stripe Integration
```typescript
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
```

**Used For:**
- Payment method updates (SetupIntent)
- One-time payments (PaymentIntent)
- Subscriptions (recurring payments)
- Identity verification (Stripe Identity)

### NextAuth Session
```typescript
const { data: session, status, update } = useSession();
```

**Session Data Used:**
- `session.user.email` - API authentication
- `session.user.name` - Display
- `session.user.userType` - Routing logic
- `session.user.role` - Admin checks
- `session.user.isVerified` - Conditional UI
- `session.user.identityVerificationStatus` - Display

---

## 🚨 Potential Issues & Observations

### 1. Payment Token Hardcoded
```typescript
payment_method: { card: { token: 'tok_visa' } }
```
⚠️ **Issue:** Uses test token, won't work in production
**Fix Needed:** Should use actual payment method from CardElement

### 2. Duplicate Heading
```html
<h3>Additional Options</h3>
<h3>Payment Method</h3>
```
🎨 **Minor:** Two h3 tags in sequence, could be cleaned up

### 3. 40% Payment System Unclear
🤔 **Question:** What is "40% payment"? 
- Related to profit sharing?
- Tenant deposit?
- Revenue split?
**Recommendation:** Add tooltip or help text explaining this concept

### 4. Address Display Issue
```html
<p>{address.street}, {address.city}, {address.state} {address.zip}</p>
```
⚠️ **Issue:** Will show commas even if fields are empty
**Fix:** Add conditional rendering for empty address

### 5. useEffect Dependencies Warning
```typescript
useEffect(() => { /* ... */ }, [session?.user?.email]);
```
⚠️ **ESLint Warning:** Missing dependencies for fetch functions
**Current:** Fetch functions defined outside, causing warning
**Fixed:** Moved fetch inside useEffect

---

## 💡 Suggested Improvements

### 1. Add Loading States to Rental Applications
```typescript
const [loadingApplications, setLoadingApplications] = useState(false);
```
Show spinner while fetching applications

### 2. Add Refresh Button for Applications
```typescript
<button onClick={fetchRentalApplications}>Refresh Applications</button>
```
Allow users to manually refresh without page reload

### 3. Add Application Details Modal
```typescript
const [selectedApp, setSelectedApp] = useState<RentalApplication | null>(null);
```
Show full application details in modal instead of inline

### 4. Add Empty State CTA
```html
{rentalApplications.length === 0 && (
  <Link href="/rentals">
    <button>Browse Available Properties</button>
  </Link>
)}
```

### 5. Add Payment History Section
Fetch and display past payments related to 40% system

### 6. Add Maintenance Request Access
Link to submit maintenance requests (currently on `/managers` page)

### 7. Consolidate Payment Methods
Currently split between:
- Default payment method display
- Update payment method
- Add bank account
- Process payment
- Recurring payment

Could be organized into tabs or separate sections

### 8. Add Dashboard Navigation
Quick links to:
- Submit maintenance request
- Browse rentals
- View lease agreement
- Contact property manager

---

## 📋 API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/get-current-40-percent` | POST | Get current 40% payment amount |
| `/api/user/address` | POST | Fetch user address |
| `/api/user/update-address` | POST | Save user address |
| `/api/stripe/default-payment-method` | POST | Get default payment method |
| `/api/update-40-percent` | POST | Update 40% from recent deposit |
| `/api/stripe/verify-identity` | POST | Initiate identity verification |
| `/api/stripe/process-payment` | POST | Process one-time payment |
| `/api/stripe/subscribe` | POST | Create recurring subscription |
| `/api/stripe/setup-intent` | POST | Start payment method update |
| `/api/rental-application` | GET | Fetch user's rental applications |

---

## 🎯 User Flow Summary

### New User Journey:
1. **Sign up** → Lands on dashboard
2. **Complete profile** → Add address
3. **Verify identity** → Stripe Identity check
4. **Add payment method** → Update payment method or add bank
5. **Browse rentals** → Navigate to `/rentals`
6. **Apply for rental** → Submit application with $25 fee
7. **Track application** → See status in "My Rental Applications"
8. **If approved** → Complete identity verification & link bank (coming soon)

### Existing Tenant Journey:
1. **View applications** → Check rental application status
2. **Manage payments** → Update 40% payment, process payments
3. **Update profile** → Edit address, update payment methods
4. **Submit maintenance** → Navigate to `/managers` page

---

## 🔮 Future Features (Scaffolded)

### For Approved Applications:
1. **Complete Identity Verification**
   - Currently disabled button
   - Should integrate with Stripe Identity
   - May duplicate existing identity verification section

2. **Link Bank Account for Auto-Pay**
   - Currently disabled button
   - Should integrate with Stripe ACH or Connect
   - Enables automatic rent payments

---

## ✅ Recommendations for Next Steps

### Immediate Actions:
1. ✅ **Rental applications display** - DONE
2. 🔧 **Fix payment token hardcoding** - Use real payment methods
3. 📝 **Add explanation for "40% Payment"** - Add tooltip or info icon
4. 🎨 **Clean up duplicate headings** - Consolidate "Additional Options" section

### Near-Term Enhancements:
1. 📊 **Add maintenance requests section** - Show user's submitted requests
2. 🔄 **Add refresh capability** - Manual refresh for applications
3. 📱 **Add quick action buttons** - Links to common tasks
4. 💬 **Add messaging system** - Contact property manager

### Long-Term Features:
1. 🏦 **Implement auto-pay** - Enable bank account linking
2. 📄 **Add document upload** - Lease agreements, receipts
3. 📧 **Add notification preferences** - Email/SMS settings
4. 📊 **Add analytics dashboard** - Payment history, application metrics

---

## 🎨 Visual Hierarchy

```
Dashboard
├── Header: "Your Dashboard"
├── Section 1: User Information
│   ├── Name
│   ├── Email
│   ├── Verification Status
│   └── Address (editable)
├── Section 2: My Rental Applications ⭐ NEW
│   ├── Application Card 1
│   │   ├── Property info
│   │   ├── Status badge
│   │   ├── Details
│   │   └── Conditional messages
│   └── Application Card 2...
├── Section 3: Current 40% Payment
│   ├── Amount display
│   └── Update button
├── Section 4: Identity Verification (if not verified)
│   ├── Document type selector
│   └── Verify button
└── Section 5: Additional Options (if verified)
    ├── Payment Method Display
    ├── Update Payment Method (with inline form)
    ├── Add Bank Account link
    ├── Process Payment button
    └── Recurring Payment button
```

---

## 📝 Summary

**Current State:**
- ✅ Comprehensive tenant dashboard with profile management
- ✅ Payment processing (one-time & recurring)
- ✅ Identity verification integration
- ✅ Payment method management
- ✅ Address management
- ✅ **NEW:** Rental applications display with status tracking

**What Works Well:**
- Clean separation of concerns
- Proper loading/error states
- Conditional rendering based on user status
- Stripe integration for payments and identity
- User-friendly status badges and messages

**What Could Be Improved:**
- Clarify "40% payment" concept
- Fix hardcoded payment tokens
- Add maintenance request visibility
- Consolidate payment method management
- Add dashboard navigation/quick actions
- Implement scaffolded features (auto-pay, identity verification for approved apps)

**Next Priority:**
Enable the scaffolded buttons for approved rental applications (identity verification & bank linking) OR add maintenance request tracking to give tenants full visibility into all their interactions with the property management system.
