# Bank Account & Rent Payment Setup - Analysis

## Current State

### Tenant Side (`/dashboard`)
**For Approved Applications:**
- ✅ Button: "Link Bank Account for Auto-Pay" → links to `/linkbank`
- ✅ `/linkbank` page allows adding:
  - Bank account (routing + account number)
  - Debit card (via Stripe CardElement)
- ✅ Uses existing Stripe Customer ID
- ✅ Attaches payment method to customer via `/api/stripe/add-bank-account`

### Admin Side (`/admin`)
**Rental Application Modal Shows:**
- ✅ Application fee payment status
- ✅ Payment intent ID
- ✅ Applicant information
- ❌ **MISSING:** Bank account link status
- ❌ **MISSING:** Ability to set up recurring rent payments
- ❌ **MISSING:** Rent amount field

## What's Missing

### 1. Track Bank Account Status
Need to know if tenant has linked a payment method:
- Add field to User or RentalApplication model: `hasLinkedPayment: boolean`
- Update when bank account is added
- Display in admin modal

### 2. Rent Payment Information
Rental applications don't store:
- Monthly rent amount
- Rent due date (e.g., 1st of month)
- Lease start/end dates

### 3. Admin Rent Payment Setup
Admin needs ability to:
- View if tenant has linked payment method
- Set monthly rent amount
- Set rent due date
- Enable/disable automatic payments
- View payment history

## Proposed Solution

### Option A: Add to Rental Application Flow
1. **Update RentalApplication Model:**
```typescript
interface RentalApplication {
  // ... existing fields
  
  // Rent details (filled by admin after approval)
  monthlyRent?: number;
  rentDueDay?: number; // Day of month (1-31)
  leaseStartDate?: Date;
  leaseEndDate?: Date;
  autoPayEnabled?: boolean;
  
  // Payment method status (updated when tenant links account)
  hasLinkedPayment?: boolean;
  linkedPaymentDate?: Date;
}
```

2. **Admin Modal Enhancement:**
   - Show "Payment Method Status" section
   - If approved, show form to set:
     - Monthly rent amount
     - Rent due day
     - Lease start/end dates
   - Show "Enable Auto-Pay" toggle (only if hasLinkedPayment)

3. **Create Recurring Payment:**
   - When admin enables auto-pay
   - Create Stripe subscription for monthly rent
   - Charge on specified day each month

### Option B: Separate Lease Management System
Create new lease management features:
- `/admin` → New "Leases" tab
- Separate Lease model linked to approved applications
- More robust lease management

### Option C: Simplify - Just Show Status
For now, just add visibility:
- Show in admin modal if payment method is linked
- Show link to view tenant's payment methods in Stripe dashboard
- Manual rent collection (admin creates payment intents manually)

## Recommendation

**Start with Option C** (visibility), then move to **Option A** (integrated) later.

### Immediate Changes Needed:

1. **Update User Model:**
```typescript
// Add to User schema
hasPaymentMethod: { type: Boolean, default: false }
paymentMethodDate: { type: Date }
```

2. **Update `/api/stripe/add-bank-account`:**
```typescript
// After successfully adding payment method
await UserModel.updateOne(
  { email: session.user.email },
  { 
    hasPaymentMethod: true,
    paymentMethodDate: new Date()
  }
);
```

3. **Update Admin Modal:**
Show payment method status in the rental application modal

4. **Future Enhancement:**
Add "Set Up Rent Payments" button in admin that:
- Opens form to set rent amount and due date
- Creates Stripe subscription
- Links to approved rental application

Would you like me to implement the immediate changes (visibility) first?
