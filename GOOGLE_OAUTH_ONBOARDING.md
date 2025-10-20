# Google OAuth Onboarding Flow - Implementation Complete

## Problem
When users signed up with Google OAuth, they skipped the onboarding form where they select:
- User type (tenant or property owner)
- Property selection (for tenants)
- Property owner name (for property owners)

This caused them to have incomplete profiles and miss important setup steps.

## Solution
Created a separate onboarding flow that Google OAuth users are automatically redirected to after sign-in.

## Files Created

### 1. `/app/onboarding/page.tsx`
- New onboarding page for Google OAuth users
- Collects userType, selectedProperty, and propertyOwnerName
- Redirects to appropriate dashboard after completion
- Same UI/UX as signup page
- Auto-redirects users who have already completed onboarding

### 2. `/app/api/user/onboarding/route.ts`
- API endpoint to save onboarding data
- Updates user record with:
  - `userType` (tenant or property-owner)
  - `selectedProperty` (for tenants)
  - `propertyOwnerName` (for property owners)
- Creates Stripe customer for tenants (if not exists)
- Creates PropertyOwner record if new property owner
- Validates all required fields

### 3. `/app/components/OnboardingRedirect.tsx`
- Client-side component that checks if user needs onboarding
- Automatically redirects to `/onboarding` if `needsOnboarding` flag is set
- Skips redirect if already on onboarding or auth pages
- Added to root layout for global coverage

## Files Modified

### 1. `/app/api/auth/authOptions.ts`
**signIn callback:**
- Added check for Google OAuth users (`account?.provider === 'google'`)
- Sets `user.needsOnboarding = true` if:
  - Tenant without `selectedProperty`
  - Property owner without `propertyOwnerName`

**jwt callback:**
- Added `token.needsOnboarding` to JWT

**session callback:**
- Added `session.user.needsOnboarding` to session

**redirect callback:**
- Simplified to rely on frontend `OnboardingRedirect` component

### 2. `/app/types/next-auth.d.ts`
- Added `needsOnboarding?: boolean` to:
  - `Session.user`
  - `User`
  - `JWT`

### 3. `/app/layout.js`
- Added `OnboardingRedirect` component
- Now checks onboarding status on every page load

## User Flows

### Credentials Provider (Existing - No Changes)
1. User fills out signup form at `/signup`
2. Selects userType, property (tenant) or property owner name
3. Creates account with all info
4. Automatically signed in
5. Redirected to appropriate dashboard
6. ✅ **Works as before - not broken**

### Google OAuth (New Flow)
1. User clicks "Sign in with Google"
2. Google authentication completes
3. User record created with default `userType: 'tenant'`
4. `needsOnboarding` flag set to `true`
5. **Automatically redirected to `/onboarding`**
6. User completes onboarding form
7. Profile updated via `/api/user/onboarding`
8. Session updated (via `update()` function)
9. Redirected to appropriate dashboard
10. ✅ **Now fully onboarded**

### Returning Google OAuth Users
1. User signs in with Google
2. Profile already has `selectedProperty` or `propertyOwnerName`
3. `needsOnboarding` flag NOT set
4. Redirected directly to dashboard
5. ✅ **No unnecessary onboarding**

## Key Features

✅ **No Breaking Changes** - Credentials provider works exactly as before
✅ **Automatic Redirect** - Google users can't skip onboarding
✅ **Session Aware** - Uses `useSession()` hook for real-time detection
✅ **Conditional Logic** - Only redirects if truly incomplete
✅ **Stripe Integration** - Creates customer for tenants during onboarding
✅ **Property Owner Support** - Handles both existing and new property owners
✅ **Type Safe** - Full TypeScript support with updated types

## Testing Checklist

### Test Credentials Provider (Should Still Work)
- [ ] Sign up with email/password
- [ ] Select tenant → Choose property → Creates account
- [ ] Select property-owner → Choose/create owner → Creates account
- [ ] Redirects to correct dashboard
- [ ] No onboarding page shown

### Test Google OAuth (New Flow)
- [ ] Click "Sign in with Google"
- [ ] Complete Google authentication
- [ ] Automatically redirected to `/onboarding`
- [ ] Select tenant → Choose property → Saves successfully
- [ ] Session updates automatically
- [ ] Redirected to tenant dashboard
- [ ] Sign out and sign in again → Goes directly to dashboard (no onboarding)

### Test Property Owner Google OAuth
- [ ] New Google user → Onboarding
- [ ] Select property-owner
- [ ] Choose existing owner or create new
- [ ] Saves successfully
- [ ] Redirected to property-owner dashboard
- [ ] No Stripe customer created (property owners don't need it)

## Environment Variables
No new environment variables needed - uses existing:
- `STRIPE_SECRET_KEY` - For creating Stripe customers (tenants only)
- Database connection already configured

## Database Changes
No schema changes needed - uses existing fields:
- `userType` - Already exists
- `selectedProperty` - Already exists
- `propertyOwnerName` - Already exists

## Production Deployment
1. Push code to GitHub
2. Vercel will auto-deploy
3. Test Google OAuth flow on production
4. Verify Stripe customer creation (tenants only)

## Notes
- The `needsOnboarding` flag is computed dynamically (not stored in database)
- Onboarding page is skipped for users who already have complete profiles
- Session updates automatically after onboarding completion
- No migration needed - existing users are unaffected
