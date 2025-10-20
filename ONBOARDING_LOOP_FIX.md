# Google OAuth Complete Application Flow

## Problem Solved
1. **Looping Issue:** After completing the onboarding form, users were stuck in an infinite loop being redirected back to `/onboarding` instead of their dashboard.
2. **Incomplete OAuth Flow:** Google OAuth users were getting a minimal onboarding page instead of the complete application form that credentials users get.

## Root Causes

### 1. Session Loop Issue
The `needsOnboarding` flag in the session was not being properly cleared after onboarding completion. The previous implementation tried to just set `token.needsOnboarding = false` when `update()` was called, but this didn't account for the actual database state.

### 2. Incomplete Application Form
The onboarding page was a minimal version that didn't match the comprehensive signup form. Google OAuth users need the **exact same application experience** as credentials users, including:
- User type selection (Tenant vs Property Owner)
- Property selection for tenants
- Property owner registration (new or existing) for property owners
- All the same styling and layout

## Solution

### 1. **Enhanced JWT Callback (authOptions.ts)**
Changed the `jwt` callback to re-fetch user data from the database when `update()` is triggered:

```typescript
async jwt({ token, user, trigger, session }) {
  // ... initial user setup ...
  
  // Handle session update trigger (when update() is called)
  if (trigger === 'update') {
    // Re-fetch user from database to get latest data
    await connectToDatabase();
    const dbUser = await UserModel.findOne({ email: token.email }).exec();
    
    if (dbUser) {
      // Update all user fields from database
      token.userType = dbUser.userType;
      token.selectedProperty = dbUser.selectedProperty;
      token.company = dbUser.company;
      token.phone = dbUser.phone;
      
      // Check if user still needs onboarding based on current database state
      const needsOnboarding = 
        (dbUser.userType === 'tenant' && !dbUser.selectedProperty) ||
        (dbUser.userType === 'property-owner' && !dbUser.propertyOwnerName);
      
      token.needsOnboarding = needsOnboarding;
    }
  }
  
  return token;
}
```

**Key Changes:**
- On `trigger === 'update'`, we now fetch fresh data from MongoDB
- We recalculate `needsOnboarding` based on actual database state
- This ensures the flag accurately reflects whether onboarding is complete

### 2. **Complete Application Form (page.tsx)**
Made the onboarding page **identical to the signup form** so Google OAuth users get the full experience:

**Features:**
- ✅ User type selection (Tenant / Property Owner)
- ✅ Property selection dropdown for tenants
- ✅ Property owner registration options:
  - Select existing property owner
  - Register as new property owner
- ✅ Same styling, layout, and validation as signup page
- ✅ Professional welcome message with user's name
- ✅ Loading states for both data fetching and form submission

**Key Improvements:**
- Added `loadingData` state to show spinner while properties/owners load
- Exact same form fields and conditional rendering as signup page
- Proper error handling and validation messages
- Consistent user experience regardless of auth method

### 3. **Added Debug Logging**
Added console logs in key places to help diagnose issues:

**OnboardingRedirect.tsx:**
```typescript
console.log('OnboardingRedirect: User needs onboarding, redirecting...', {
  userType: session.user.userType,
  selectedProperty: session.user.selectedProperty,
  company: session.user.company,
  needsOnboarding: session.user.needsOnboarding
});
```

**Onboarding page.tsx:**
```typescript
console.log('Onboarding complete, updating session...');
await update();
// ...
console.log('Session updated, redirecting to dashboard...');
```

## How It Works Now

### Flow for Google OAuth User:

1. **Initial Sign In:**
   - User signs in with Google
   - `signIn` callback checks database
   - If tenant has no `selectedProperty`, sets `needsOnboarding = true`
   - If property owner has no `propertyOwnerName`, sets `needsOnboarding = true`
   - Session is created with `needsOnboarding` flag

2. **Redirect to Onboarding:**
   - `OnboardingRedirect` component (in layout) detects `needsOnboarding = true`
   - User is redirected to `/onboarding` page

3. **Complete Onboarding:**
   - User fills out the form (selects property or enters owner name)
   - Form submission calls `/api/user/onboarding`
   - API updates the database with the new information
   - Page calls `await update()` to refresh the session

4. **Session Update:**
   - `jwt` callback is triggered with `trigger === 'update'`
   - Callback fetches fresh user data from database
   - Recalculates `needsOnboarding` based on database state
   - Since user now has `selectedProperty` or `propertyOwnerName`, flag is `false`
   - Session is updated with new data

5. **Redirect to Dashboard:**
   - After 1-second delay for session propagation
   - User is redirected to appropriate dashboard
   - `OnboardingRedirect` component now sees `needsOnboarding = false`
   - No redirect loop occurs

## Testing Checklist

- [ ] Sign in with Google as new user
- [ ] Verify redirect to `/onboarding`
- [ ] Select "Tenant" and choose a property
- [ ] Submit form
- [ ] Check console logs for "Onboarding complete" and "Session updated" messages
- [ ] Verify redirect to `/dashboard` (not back to onboarding)
- [ ] Sign out and sign in again
- [ ] Verify direct access to dashboard (no onboarding redirect)

## Stripe Error

The user also mentioned a Stripe error: `api/stripe/default-payment-method`

This is a separate issue and needs investigation:
- Determine which component is calling this API
- Check if it's related to the onboarding flow or a different feature
- May need to add error handling or conditional logic

## Files Modified

1. `app/api/auth/authOptions.ts` - Enhanced jwt callback with database refresh
2. `app/onboarding/page.tsx` - Improved redirect check + added debug logs
3. `app/components/OnboardingRedirect.tsx` - Enhanced debug logging

## Next Steps

1. Test the complete flow with a Google OAuth user
2. Monitor console logs to ensure session updates correctly
3. Investigate the Stripe API error mentioned by the user
4. Test credentials provider to ensure it still works without onboarding redirect
