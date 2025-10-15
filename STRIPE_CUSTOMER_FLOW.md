# Stripe Customer ID Flow - No Duplicates ✅

## Summary
**YES, we are using the SAME Stripe Customer ID** throughout the entire application flow. There are **NO duplicates** created.

---

## 🔄 Complete Flow

### 1. User Signs Up
**Location:** `app/api/signup/route.ts`
```typescript
// User is created in MongoDB
// NO Stripe customer created yet
const user = await UserModel.create({
  name,
  email,
  password: hashedPassword,
  userType: 'tenant', // or 'property-owner'
  isVerified: false,
  identityVerificationStatus: 'pending',
  // stripeCustomerId is undefined at this point
});
```

---

### 2. User Signs In (First Time)
**Location:** `app/api/auth/authOptions.ts` → `signIn` callback

```typescript
async signIn({ user, account }) {
  await connectToDatabase();
  let dbUser = await UserModel.findOne({ email: user.email }).exec();
  
  // Only create Stripe customers for TENANTS
  if (dbUser.userType === 'property-owner') {
    console.log('Property owner login - skipping Stripe customer creation');
    // Property owners NEVER get Stripe customers
  } 
  else if (!dbUser.stripeCustomerId && dbUser.userType === 'tenant' && stripe) {
    // ✅ CREATE STRIPE CUSTOMER (ONLY ONCE)
    console.log('Creating Stripe customer for tenant');
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
    });
    
    // ✅ SAVE THE CUSTOMER ID TO DATABASE
    dbUser.stripeCustomerId = customer.id; // e.g., "cus_ABC123"
    await dbUser.save();
  }
  
  // ✅ PASS CUSTOMER ID TO SESSION
  user.stripeCustomerId = dbUser.stripeCustomerId;
  return true;
}
```

**Key Points:**
- ✅ Checks if `stripeCustomerId` already exists (`!dbUser.stripeCustomerId`)
- ✅ Only creates customer if user is a **tenant**
- ✅ Property owners **NEVER** get Stripe customers
- ✅ Customer ID saved to MongoDB immediately
- ✅ Customer ID passed through JWT token → session

---

### 3. Stripe Customer ID in Session
**Location:** `app/api/auth/authOptions.ts` → `jwt` and `session` callbacks

```typescript
async jwt({ token, user }) {
  if (user) {
    token.stripeCustomerId = user.stripeCustomerId; // ✅ Add to JWT
  }
  return token;
}

async session({ session, token }) {
  if (session.user) {
    session.user.stripeCustomerId = token.stripeCustomerId; // ✅ Add to session
  }
  return session;
}
```

**Result:**
- `session.user.stripeCustomerId` is available on the frontend
- `session.user.stripeCustomerId` contains the SAME customer ID from step 2

---

### 4. Identity Verification
**Location:** `app/api/stripe/verify-identity/route.ts`

```typescript
export async function POST(req: Request) {
  const { email, documentType } = await req.json();
  
  const user = await UserModel.findOne({ email }).exec();
  
  // ✅ USES STRIPE IDENTITY (NOT CUSTOMER API)
  const verificationSession = await stripe.identity.verificationSessions.create({
    type: 'document',
    metadata: { 
      user_id: user._id.toString(), 
      email: user.email 
    },
    options: {
      document: {
        allowed_types: [documentType],
        require_matching_selfie: true,
      },
    },
  });
  
  // ✅ UPDATES USER STATUS IN MONGODB
  await UserModel.updateOne(
    { email },
    { 
      identityVerificationStatus: verificationSession.status,
      isVerified: verificationSession.status === 'verified'
    }
  );
  
  return NextResponse.json({ clientSecret: verificationSession.client_secret });
}
```

**Key Points:**
- ✅ Does NOT create a new customer
- ✅ Uses Stripe Identity API (separate from Customer API)
- ✅ Links verification to user via metadata
- ✅ Updates MongoDB user record with verification status

---

### 5. Add Bank Account
**Location:** `app/api/stripe/add-bank-account/route.ts`

```typescript
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const { tokenId } = await req.json();
  
  await connectToDatabase();
  
  // ✅ RETRIEVES EXISTING CUSTOMER ID FROM DATABASE
  const user = await UserModel.findOne({ email: session.user.email }).exec();
  
  if (!user || !user.stripeCustomerId) {
    return NextResponse.json({ 
      message: 'Stripe Customer not found' 
    }, { status: 404 });
  }
  
  // ✅ USES EXISTING CUSTOMER ID (NO NEW CUSTOMER CREATED)
  await stripe.customers.createSource(user.stripeCustomerId, { 
    source: tokenId 
  });
  
  return NextResponse.json({ message: 'Bank account added successfully' });
}
```

**Key Points:**
- ✅ Retrieves `stripeCustomerId` from MongoDB
- ✅ Uses EXISTING customer ID to attach bank account
- ✅ No new customer created
- ✅ Returns 404 if no customer ID exists

---

### 6. Update Payment Method
**Location:** `app/api/stripe/setup-intent/route.ts`

```typescript
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  await connectToDatabase();
  
  // ✅ RETRIEVES EXISTING CUSTOMER ID
  const user = await UserModel.findOne({ email: session.user.email }).exec();
  
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ 
      message: 'Stripe customer not found' 
    }, { status: 400 });
  }
  
  // ✅ USES EXISTING CUSTOMER ID FOR SETUP INTENT
  const setupIntent = await stripe.setupIntents.create({
    customer: user.stripeCustomerId,
    payment_method_types: ['card'],
  });
  
  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
```

**Key Points:**
- ✅ Uses existing `stripeCustomerId` from MongoDB
- ✅ No new customer created
- ✅ SetupIntent links to existing customer

---

### 7. Get Default Payment Method
**Location:** `app/api/stripe/default-payment-method/route.ts`

```typescript
export async function POST(req: Request) {
  const { email } = await req.json();
  
  await connectToDatabase();
  
  // ✅ RETRIEVES EXISTING CUSTOMER ID
  const user = await UserModel.findOne({ email }).exec();
  
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ 
      message: 'Stripe customer not found' 
    }, { status: 404 });
  }
  
  // ✅ RETRIEVES CUSTOMER DATA FROM STRIPE
  const customer = await stripe.customers.retrieve(
    user.stripeCustomerId
  ) as Stripe.Customer;
  
  // Extract default payment method
  const defaultPaymentMethodId = customer.invoice_settings.default_payment_method;
  
  return NextResponse.json({ paymentMethod: { /* ... */ } });
}
```

**Key Points:**
- ✅ Retrieves customer using existing ID
- ✅ No new customer created

---

## 🔒 Database Schema Protection

**Location:** `app/models/User.ts`

```typescript
const UserSchema = new Schema({
  // ... other fields
  stripeCustomerId: { 
    type: String, 
    unique: true,    // ✅ PREVENTS DUPLICATE CUSTOMER IDS
    sparse: true     // ✅ ALLOWS NULL/UNDEFINED VALUES
  },
  // ... other fields
});
```

**Protection:**
- ✅ `unique: true` - MongoDB enforces uniqueness
- ✅ `sparse: true` - Allows multiple users without customer IDs (property owners)
- ✅ If duplicate attempted, MongoDB throws error

---

## 🎯 Flow Diagram

```
1. User Signs Up
   └─> MongoDB User Created (no Stripe customer yet)

2. User Signs In (First Time)
   ├─> Check: if (!dbUser.stripeCustomerId && userType === 'tenant')
   ├─> YES → Create Stripe Customer
   │   ├─> Stripe API: customers.create()
   │   ├─> Get customer.id (e.g., "cus_ABC123")
   │   └─> Save to MongoDB: user.stripeCustomerId = customer.id
   └─> Add stripeCustomerId to session

3. User Signs In (Subsequent Times)
   ├─> Check: if (!dbUser.stripeCustomerId)
   ├─> NO → Customer already exists, skip creation
   └─> Add existing stripeCustomerId to session

4. Identity Verification
   ├─> User clicks "Complete Identity Verification"
   ├─> Stripe Identity API: verificationSessions.create()
   ├─> Uses user.email in metadata (NOT customer ID)
   └─> Updates MongoDB: user.identityVerificationStatus

5. Add Bank Account
   ├─> User navigates to /linkbank
   ├─> Frontend sends bank token
   ├─> Backend retrieves: user.stripeCustomerId from MongoDB
   ├─> Stripe API: customers.createSource(user.stripeCustomerId, token)
   └─> Bank account attached to EXISTING customer

6. Update Payment Method
   ├─> User clicks "Update Payment Method"
   ├─> Backend retrieves: user.stripeCustomerId from MongoDB
   ├─> Stripe API: setupIntents.create({ customer: user.stripeCustomerId })
   └─> Payment method attached to EXISTING customer
```

---

## ✅ Verification Checklist

| Step | Creates Customer? | Uses Existing ID? | Notes |
|------|------------------|-------------------|-------|
| Sign Up | ❌ No | N/A | Only MongoDB user created |
| First Sign In | ✅ Yes (once) | N/A | Only if tenant & no existing ID |
| Subsequent Sign Ins | ❌ No | ✅ Yes | Retrieves from session |
| Identity Verification | ❌ No | ⚠️ No | Uses Stripe Identity API separately |
| Add Bank Account | ❌ No | ✅ Yes | Attaches to existing customer |
| Update Payment Method | ❌ No | ✅ Yes | SetupIntent uses existing customer |
| Get Payment Methods | ❌ No | ✅ Yes | Retrieves from existing customer |

---

## 🚨 Edge Cases Handled

### 1. Property Owners
```typescript
if (dbUser.userType === 'property-owner') {
  console.log('Property owner login - skipping Stripe customer creation');
  // NO STRIPE CUSTOMER CREATED
}
```
✅ Property owners never get Stripe customers

### 2. Duplicate Creation Prevention
```typescript
if (!dbUser.stripeCustomerId && dbUser.userType === 'tenant' && stripe) {
  // Only creates if:
  // 1. No existing customer ID
  // 2. User is a tenant
  // 3. Stripe is initialized
}
```
✅ Checks for existing ID before creating

### 3. Database Constraint
```typescript
stripeCustomerId: { type: String, unique: true, sparse: true }
```
✅ MongoDB prevents duplicate customer IDs at database level

### 4. Session Persistence
```typescript
// JWT callback
token.stripeCustomerId = user.stripeCustomerId;

// Session callback
session.user.stripeCustomerId = token.stripeCustomerId;
```
✅ Customer ID persists across page loads via session

---

## 💡 Best Practices Followed

1. ✅ **Single Source of Truth** - MongoDB stores the customer ID
2. ✅ **Idempotent Creation** - Check before create
3. ✅ **Database Constraints** - Unique constraint prevents duplicates
4. ✅ **User Type Filtering** - Only tenants get customers
5. ✅ **Session Management** - Customer ID available client-side
6. ✅ **Error Handling** - All endpoints check for existing customer
7. ✅ **Separation of Concerns** - Identity verification is separate from customer management

---

## 🎉 Conclusion

**YES, the application correctly uses a SINGLE Stripe Customer ID throughout the entire flow.**

- ✅ Created once during first sign-in (for tenants only)
- ✅ Stored in MongoDB with unique constraint
- ✅ Retrieved from database for all operations
- ✅ Passed through session for easy access
- ✅ Never duplicated

**The implementation is CORRECT and follows Stripe best practices!**

---

## 📝 Additional Notes

### When Rental Application is Approved
When a tenant's rental application is approved, the dashboard now shows:

1. **Identity Verification Button** (if not verified)
   - Scrolls to identity verification section
   - Uses Stripe Identity API (not related to customer ID)
   
2. **Link Bank Account Button**
   - Navigates to `/linkbank` page
   - Uses EXISTING `user.stripeCustomerId` from MongoDB
   - Attaches bank account to existing customer

**No new Stripe customers are created during this process.**
