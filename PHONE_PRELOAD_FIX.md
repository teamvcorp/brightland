# Phone Number Preload Fix

## Problem
When property owners and tenants submit maintenance requests, the phone number field was not being pre-filled from their user profile, even though name and email were preloading correctly.

## Root Cause
The `useEffect` hook that preloads user data from the session was only setting `fullname` and `email`, but not `phone`, even though the phone number is:
- ✅ Stored in the User model
- ✅ Available in the NextAuth session
- ✅ Passed through the authentication callbacks

## Solution
Updated both maintenance request forms to include phone number in the preload logic.

### Changes Made

#### 1. ContactUsPropertyOwner.jsx (Property Owner Form)
**Before:**
```jsx
useEffect(() => {
  if (session?.user) {
    setFormData(prev => ({
      ...prev,
      fullname: session.user.name || "",
      email: session.user.email || "",
      // ❌ phone was missing
    }));
  }
}, [session]);
```

**After:**
```jsx
useEffect(() => {
  if (session?.user) {
    setFormData(prev => ({
      ...prev,
      fullname: session.user.name || "",
      email: session.user.email || "",
      phone: session.user.phone || "", // ✅ Added
    }));
  }
}, [session]);
```

#### 2. ContactUsManager.jsx (Tenant Form)
Applied the same fix to ensure consistency across both forms.

## Verification
The phone field is properly configured in the authentication flow:
- ✅ User model has `phone` field
- ✅ Session type definition includes `phone?: string`
- ✅ `authOptions.ts` passes phone through signIn, jwt, and session callbacks
- ✅ Phone is stored in the database when users sign up

## Testing
1. Sign in as a property owner with a phone number in their profile
2. Navigate to submit request page (`/submit-request`)
3. Verify that name, email, AND phone number are all pre-filled
4. Test same flow for tenants on `/managers` page

## Impact
- Property owners will no longer need to manually enter their phone number
- Tenants will no longer need to manually enter their phone number
- Reduces friction and improves user experience
- Ensures phone numbers are consistently captured for communication

## Files Modified
1. `/app/components/ContactUsPropertyOwner.jsx` - Added phone preload
2. `/app/components/ContactUsManager.jsx` - Added phone preload
