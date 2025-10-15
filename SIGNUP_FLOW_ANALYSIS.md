# Sign-Up Flow Analysis & Redesign Plan

## Current Flow (As-Is)

### Entry Points
1. **Header "Sign In" Button** → `/auth/signin`
2. **Home Page Links** → Various pages (Rentals, Property Managers, etc.)
3. **Sign Up Link** → `/signup`

### Current Sign-In Flow
```
User clicks "Sign In" in Header
    ↓
/auth/signin page
    ↓
After successful login:
    - Property Owner → /property-owner-dashboard
    - Tenant → /dashboard (requires identity verification immediately)
    - If callbackUrl exists → Redirect to callbackUrl
```

### Current Sign-Up Flow
```
User visits /signup
    ↓
Fills out form:
    - Name, Email, Password
    - User Type: tenant | property-owner
    - IF tenant: Select property from dropdown
    - IF property-owner: Select/create property owner entity
    ↓
Account Created
    ↓
Auto sign-in
    ↓
Redirects based on userType:
    - Property Owner → /property-owner-dashboard
    - Tenant → /dashboard (identity verification required)
```

### Current Dashboard Behavior
**Tenant Dashboard (`/dashboard`):**
- ❌ **Problem:** Immediately requires identity verification
- Shows: User info, address, payment methods
- Requires: Stripe identity verification to access most features
- No rental application status shown

**Property Owner Dashboard (`/property-owner-dashboard`):**
- Shows: Submitted maintenance requests
- Button: Submit new maintenance request
- Status tracking for requests

## Problems Identified

1. ❌ **Identity Verification Too Early**: Dashboard requires verification before tenants can even see rental application status
2. ❌ **No Rental Application Flow**: No clear "Inquire" button flow from viewing properties
3. ❌ **Confusing Entry Point**: "Sign In" button leads to dashboard that demands verification
4. ❌ **No Application Status Display**: Tenants can't see if they were approved for a property
5. ❌ **Verification Before Application**: Users need to verify identity before even applying

## Desired Flow (To-Be)

### New Tenant Journey

```
User browses properties
    ↓
Clicks "Inquire" button on a property
    ↓
Not logged in? → Simple sign-up form:
    - Name
    - Email
    - Password
    - Property Address (pre-filled from inquiry)
    ↓
Account created → Rental Application Form
    ↓
Fill out basic info:
    - Personal details
    - Contact information
    - Employment/income info (optional at this stage)
    - No payment required yet
    ↓
Submit Application
    ↓
Redirect to NEW Tenant Dashboard showing:
    ✅ Application Status (Pending/Approved/Rejected)
    ✅ Property details they applied for
    ✅ Next steps (with link to verify identity when approved)
    ✅ Messages/updates from property owner
    ❌ Identity verification NOT required yet
    
When application APPROVED:
    ↓
    Dashboard shows:
    ✅ "Congratulations! Approved for [Property]"
    ✅ Button: "Complete Identity Verification" (separate process)
    ✅ Button: "Set up Payment Method" (for rent)
```

### Revised Property Owner Journey
```
User wants to be property owner
    ↓
/signup → Select "Property Owner"
    ↓
Fills property owner details
    ↓
Auto sign-in
    ↓
Property Owner Dashboard (unchanged)
```

## Key Changes Required

### 1. Add "Inquire" Buttons
**Location:** `/rentals` page (property listing)
**Action:** Links to `/rental-application?property=[propertyName]`

### 2. Simplify Initial Sign-Up
**For Tenants Inquiring:**
- Minimal info: Name, Email, Password
- Property auto-selected from inquiry
- Skip identity verification initially

### 3. Create New Rental Application Form
**Path:** `/rental-application`
**Fields:**
- Pre-filled: Name, Email, Property
- Additional: Phone, Current Address, Employment Info (optional)
- NO payment at this stage
- NO identity verification required

### 4. Redesign Tenant Dashboard
**New Features:**
```tsx
- Application Status Section:
  ✅ Property applied for
  ✅ Application status badge (Pending/Approved/Rejected)
  ✅ Date submitted
  ✅ Admin notes/messages
  
- Conditional Sections:
  IF Approved:
    ✅ "Complete Identity Verification" button
    ✅ "Set Up Payment Method" button
    ✅ "View Lease Agreement" button
  
  IF Pending:
    ⏳ "Application under review"
    📧 "We'll notify you via email"
  
  IF Rejected:
    ❌ Reason for rejection
    🔄 "Browse other properties" link
```

### 5. Separate Identity Verification
**When:** AFTER application approval
**Where:** New page `/verify-identity` (already exists but needs context)
**Flow:**
```
Dashboard → "Complete Verification" button
    ↓
/verify-identity page
    ↓
Stripe identity verification
    ↓
Back to dashboard with verified status
```

## Files That Need Changes

### 1. Header Component
- **File:** `app/components/Header.tsx`
- **Change:** "Sign In" should go to a landing page, not force immediate verification

### 2. Rentals Page (Add Inquire Buttons)
- **File:** `app/rentals/page.js`
- **Add:** "Inquire" button for each property
- **Links to:** `/rental-application?property=[name]`

### 3. Rental Application Page
- **File:** `app/rental-application/page.tsx`
- **Simplify:** Remove $25 payment requirement initially
- **Update:** Focus on collecting tenant info

### 4. Tenant Dashboard
- **File:** `app/dashboard/page.tsx`
- **Major Update:** 
  - Add application status section
  - Make identity verification optional (not required on page load)
  - Show "Next Steps" based on application status
  - Remove immediate verification requirement

### 5. Sign-Up Page
- **File:** `app/signup/page.tsx`
- **Update:** When coming from rental-application, pre-fill property

### 6. Auth Options
- **File:** `app/api/auth/authOptions.ts`
- **Consider:** Redirect logic based on application status

## Database Considerations

### Need to Track:
- Rental applications (separate from user account)
- Application status (pending/approved/rejected)
- Which property was applied for
- Admin notes/messages for each application

### Potential New Model:
```typescript
interface RentalApplication {
  userId: string;
  propertyName: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: Date;
  reviewedDate?: Date;
  adminNotes?: string;
  tenantInfo: {
    phone: string;
    currentAddress: string;
    employment?: string;
    income?: string;
  };
}
```

## Implementation Phases

### Phase 1: Analysis (Current)
- ✅ Document current flow
- ✅ Identify problems
- ✅ Design new flow

### Phase 2: Add Inquire Flow
1. Add "Inquire" buttons to rentals page
2. Update rental-application to be entry point
3. Simplify sign-up when coming from inquiry

### Phase 3: Redesign Dashboard
1. Remove immediate verification requirement
2. Add application status display
3. Make verification a separate optional step

### Phase 4: Update Sign-In Flow
1. Change header behavior
2. Update redirect logic
3. Show appropriate dashboard based on status

## Questions to Confirm

1. ✅ Should rental applications be FREE initially? (No $25 fee until approved?)
2. ✅ Should identity verification be AFTER approval only?
3. ✅ Do we need admin approval workflow for applications?
4. ✅ Should we track multiple applications per user?
5. ✅ What info is required vs optional in application?

## Success Metrics

After implementation:
- ✅ Tenants can inquire without immediate verification
- ✅ Tenants see their application status
- ✅ Identity verification happens after approval
- ✅ Clear "next steps" displayed on dashboard
- ✅ Smoother, less intimidating onboarding process
