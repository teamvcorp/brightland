# Rent Payment System - Complete Requirements & Implementation Plan

## Requirements Summary

### Payment Method Requirements
1. **Checking Account (ACH)** - Required for monthly rent payments (always due on 1st)
2. **Credit/Debit Card** - Required for fees and one-time charges
3. **Security Deposit** - Equal to one month's rent, collected when checking account is added

### Business Rules
- **Rent Due Date:** Always the 1st of each month
- **Prorated Rent:** If tenant moves in mid-month, first payment is prorated
- **Rent Amount:** Pulled from property's `rent` field
- **Security Deposit:** Automatically calculated as 1x monthly rent
- **Payment Methods:** Both ACH and card required before rent payments can begin

---

## Current Property Model

```typescript
// PropertyOwner.ts embedded property schema
interface Property {
  name: string;
  type: string;
  description: string;
  picture: string;
  rent: number; // ✅ Already exists!
  location: string;
  bedrooms: number;
  bathrooms: number;
  status: 'available' | 'rented' | 'under-remodel' | 'maintenance';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Data Model Updates Needed

### 1. User Model - Add Payment Method Tracking
```typescript
// app/models/User.ts
interface User {
  // ... existing fields
  
  // Payment Methods
  hasCheckingAccount: boolean;
  checkingAccountAdded: Date;
  hasCreditCard: boolean;
  creditCardAdded: Date;
  
  // Security Deposit
  securityDepositPaid: boolean;
  securityDepositAmount: number;
  securityDepositDate: Date;
  securityDepositIntentId: string;
}
```

### 2. Rental Application Model - Add Lease & Payment Info
```typescript
// app/models/RentalApplication.ts
interface RentalApplication {
  // ... existing fields
  
  // Lease Information (set by admin after approval)
  monthlyRent: number; // Pulled from property
  leaseStartDate: Date;
  leaseEndDate: Date;
  
  // Move-in Details
  moveInDate: Date; // Already exists
  firstPaymentAmount: number; // Prorated if mid-month
  firstPaymentDue: Date;
  
  // Payment Setup Status
  hasCheckingAccount: boolean;
  hasCreditCard: boolean;
  securityDepositPaid: boolean;
  autoPayEnabled: boolean;
  stripeSubscriptionId: string; // For recurring rent
  
  // Payment History Reference
  lastPaymentDate: Date;
  nextPaymentDate: Date;
  paymentStatus: 'current' | 'late' | 'paid_ahead';
}
```

### 3. New Payment Model - Track All Payments
```typescript
// app/models/Payment.ts (NEW)
interface Payment {
  _id: string;
  userId: string;
  userEmail: string;
  rentalApplicationId: string;
  propertyId: string;
  propertyName: string;
  
  type: 'rent' | 'security_deposit' | 'fee' | 'late_fee' | 'maintenance';
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  
  paymentMethod: 'ach' | 'card';
  stripePaymentIntentId: string;
  
  dueDate: Date;
  paidDate: Date;
  
  description: string;
  adminNotes: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## User Flow

### Tenant's Journey (After Application Approved)

1. **Dashboard shows approved application:**
   ```
   🎉 Congratulations! Your application has been approved!
   
   Next Steps to Complete:
   □ Add Checking Account (for monthly rent)
   □ Add Credit/Debit Card (for fees & charges)
   □ Pay Security Deposit ($X,XXX)
   
   [Complete Setup] button
   ```

2. **Click "Complete Setup" → Payment Setup Page:**
   - Step 1: Add Checking Account
     - Form: Account holder, routing #, account #
     - Info: "This will be used for monthly rent payments (due 1st of month)"
   
   - Step 2: Pay Security Deposit
     - Amount: $X,XXX (equal to monthly rent)
     - Uses checking account just added
     - Creates Stripe payment intent
   
   - Step 3: Add Credit/Debit Card
     - Stripe CardElement
     - Info: "This will be used for fees and one-time charges"
   
   - Step 4: Review & Confirm
     - Shows: Rent amount, due date (1st), lease start date
     - Confirms: Security deposit paid, payment methods on file
     - Button: "Activate Auto-Pay"

3. **Setup Complete:**
   - Dashboard shows: "✓ Payment setup complete"
   - Shows: Next rent payment date & amount
   - Shows: Payment method on file

---

## Admin Flow

### Admin Manages Approved Application

1. **Rental Application Modal (Enhanced):**
   ```
   [Existing application details...]
   
   === LEASE SETUP (After Approval) ===
   
   Property Rent: $X,XXX/month (from property)
   Lease Start Date: [date picker]
   Lease End Date: [date picker]
   
   First Payment Calculation:
   - Move-in Date: [from application]
   - Days in Month: 30
   - Days Tenant Occupying: 15
   - Prorated Rent: $XXX (50% of $X,XXX)
   - Due Date: [move-in date]
   
   === PAYMENT SETUP STATUS ===
   
   ☐ Checking Account Added [View in Stripe]
   ☐ Credit Card Added [View in Stripe]
   ☐ Security Deposit Paid ($X,XXX) [View Receipt]
   
   ☐ Auto-Pay Enabled [Enable Auto-Pay] button
   
   [Save Lease Details]
   ```

2. **Enable Auto-Pay (Admin Action):**
   - Validates all requirements met:
     - ✓ Checking account on file
     - ✓ Credit card on file  
     - ✓ Security deposit paid
     - ✓ Lease dates set
   
   - Creates Stripe Subscription:
     - Charge amount: monthlyRent
     - Charge date: 1st of each month
     - Payment method: ACH (checking account)
     - Start date: first day of first full month
   
   - Updates property status to "rented"
   - Updates rental application with subscription ID

3. **Admin Dashboard - Payments Tab (NEW):**
   - Table showing all rent payments
   - Filters: Property, Tenant, Status, Date Range
   - Columns: Tenant, Property, Amount, Due Date, Status, Actions
   - Actions: View Details, Process Manual Payment, Send Reminder

---

## API Endpoints Needed

### New Endpoints

1. **`POST /api/tenant/setup-payments`**
   - Add checking account
   - Process security deposit payment
   - Add credit card
   - Mark setup complete

2. **`POST /api/stripe/security-deposit`**
   - Create payment intent for security deposit
   - Use ACH (checking account)
   - Amount = property rent

3. **`POST /api/admin/enable-auto-pay`**
   - Validate payment setup complete
   - Create Stripe subscription
   - Save subscription ID to rental application
   - Update property status to "rented"

4. **`GET /api/admin/payments`**
   - Fetch all payments
   - Filter by property, tenant, date range
   - Return payment history

5. **`POST /api/admin/manual-payment`**
   - Process one-time rent payment
   - Use for late payments or adjustments

### Enhanced Endpoints

1. **`PATCH /api/rental-application`** (enhance)
   - Add lease dates
   - Add first payment amount
   - Add payment setup status

2. **`POST /api/stripe/add-bank-account`** (enhance)
   - Mark user.hasCheckingAccount = true
   - Save checkingAccountAdded date
   - Return success with next step (security deposit)

---

## Implementation Steps

### Phase 1: Data Model Updates
1. ✅ Update User model with payment method fields
2. ✅ Update RentalApplication model with lease fields
3. ✅ Create Payment model
4. ✅ Run migrations (if needed)

### Phase 2: Tenant Payment Setup Flow
1. ✅ Create `/setup-payments/[applicationId]` page
2. ✅ Build multi-step form:
   - Step 1: Add checking account
   - Step 2: Pay security deposit
   - Step 3: Add credit card
   - Step 4: Review & confirm
3. ✅ Implement security deposit payment API
4. ✅ Update dashboard to show setup status

### Phase 3: Admin Lease Management
1. ✅ Enhance rental application modal with lease fields
2. ✅ Add payment setup status display
3. ✅ Add "Enable Auto-Pay" functionality
4. ✅ Calculate prorated rent for mid-month move-ins

### Phase 4: Stripe Subscriptions
1. ✅ Create subscription when auto-pay enabled
2. ✅ Set billing date to 1st of month
3. ✅ Use ACH payment method
4. ✅ Handle failed payments

### Phase 5: Payment History & Management
1. ✅ Create payments table in admin
2. ✅ Show upcoming/past payments
3. ✅ Manual payment processing
4. ✅ Payment reminders

---

## Stripe Setup Details

### Security Deposit Payment
```typescript
// One-time ACH payment
const paymentIntent = await stripe.paymentIntents.create({
  amount: monthlyRent * 100, // cents
  currency: 'usd',
  payment_method_types: ['us_bank_account'],
  customer: user.stripeCustomerId,
  payment_method: user.achPaymentMethodId,
  confirm: true,
  description: `Security deposit for ${propertyName}`,
  metadata: {
    type: 'security_deposit',
    rentalApplicationId: application._id,
    propertyId: property._id,
  }
});
```

### Monthly Rent Subscription
```typescript
// Recurring monthly payment
const subscription = await stripe.subscriptions.create({
  customer: user.stripeCustomerId,
  items: [{
    price_data: {
      currency: 'usd',
      product_data: {
        name: `Monthly Rent - ${propertyName}`,
        description: 'Recurring monthly rent payment'
      },
      unit_amount: monthlyRent * 100,
      recurring: {
        interval: 'month',
        interval_count: 1,
      }
    }
  }],
  default_payment_method: user.achPaymentMethodId,
  billing_cycle_anchor: firstFullMonthTimestamp,
  metadata: {
    rentalApplicationId: application._id,
    propertyId: property._id,
    userId: user._id,
  }
});
```

### One-Time Fee Payment
```typescript
// Credit card charge for fees
const paymentIntent = await stripe.paymentIntents.create({
  amount: feeAmount * 100,
  currency: 'usd',
  payment_method_types: ['card'],
  customer: user.stripeCustomerId,
  payment_method: user.cardPaymentMethodId,
  confirm: true,
  description: `${feeType} for ${propertyName}`,
});
```

---

## UI Updates Summary

### Tenant Dashboard
- ✅ Show approved applications with "Complete Payment Setup" button
- ✅ Show payment setup progress (checking, card, deposit)
- ✅ Show next rent payment date & amount
- ✅ Link to payment history

### Admin Dashboard - Rental Application Modal
- ✅ Show lease start/end dates input
- ✅ Show monthly rent (from property)
- ✅ Calculate & show prorated first payment
- ✅ Show payment setup status checkboxes
- ✅ Show "Enable Auto-Pay" button (when ready)
- ✅ Link to tenant's Stripe customer page

### Admin Dashboard - New Payments Tab
- ✅ Table of all rent payments
- ✅ Filters and search
- ✅ Payment status indicators
- ✅ Manual payment processing

---

## Benefits of This Approach

1. **Complete Automation:** Rent charged automatically on 1st
2. **Security:** Deposit collected upfront before move-in
3. **Flexibility:** Card on file for fees/charges
4. **Prorated Rent:** Handles mid-month move-ins correctly
5. **Admin Control:** Full visibility and manual override capability
6. **Payment History:** Track all transactions
7. **Tenant Transparency:** Clear next payment dates and amounts

---

## Next Steps

Should I start implementing:
1. **Phase 1:** Update data models?
2. **Phase 2:** Build tenant payment setup flow?
3. **Phase 3:** Enhance admin lease management?

Or would you like me to implement all phases in sequence?
