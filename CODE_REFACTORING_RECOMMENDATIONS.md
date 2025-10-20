# Code Refactoring Recommendations - Brightland Property Management

**Review Date:** October 19, 2025  
**Objective:** Identify code duplication and opportunities for component/utility extraction

---

## 📊 Executive Summary

### Findings:
- **High duplication:** Data fetching patterns (properties, property owners, payments, applications)
- **Medium duplication:** Form components (tenant/owner selection, property selection)
- **Medium duplication:** Authentication patterns and loading states
- **Low duplication:** API route authentication/authorization patterns

### Recommended Actions:
1. **Create custom hooks** for data fetching (HIGH PRIORITY)
2. **Extract form components** for reusable UI patterns (MEDIUM PRIORITY)
3. **Create API middleware** for auth/database (MEDIUM PRIORITY)
4. **Build utility actions** for common operations (LOW PRIORITY)

---

## 🔴 HIGH PRIORITY - Custom Hooks

### 1. **useProperties Hook**
**Current Duplication:** Appears in `signup/page.tsx` and `onboarding/page.tsx` (100% identical)

```typescript
// Recommended: app/hooks/useProperties.ts
export function useProperties() {
  const [properties, setProperties] = useState<Array<{name: string, description: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const response = await fetch('/api/properties');
        if (response.ok) {
          const dbProperties = await response.json();
          if (Array.isArray(dbProperties)) {
            setProperties(dbProperties.map((p: any) => ({ 
              name: p.name, 
              description: p.description 
            })));
          } else {
            console.error('Properties data is not an array:', dbProperties);
            setProperties([]);
          }
        } else {
          setError('Failed to load properties');
          setProperties([]);
        }
      } catch (error) {
        console.error('Error loading properties:', error);
        setError('Error loading properties');
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    loadProperties();
  }, []);

  return { properties, loading, error };
}
```

**Files to Update:**
- `app/signup/page.tsx` (lines 48-73)
- `app/onboarding/page.tsx` (lines 51-74)
- `app/admin/page.tsx` (if properties loading exists)

**Estimated LOC Reduction:** ~50 lines

---

### 2. **usePropertyOwners Hook**
**Current Duplication:** Appears in `signup/page.tsx` and `onboarding/page.tsx` (100% identical with 8-second timeout)

```typescript
// Recommended: app/hooks/usePropertyOwners.ts
export function usePropertyOwners() {
  const [propertyOwners, setPropertyOwners] = useState<Array<{name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPropertyOwners = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch('/api/property-owners', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setPropertyOwners(data);
          } else {
            console.error('Property owners data is not an array:', data);
            setPropertyOwners([]);
          }
        } else {
          setError('Failed to load property owners');
          setPropertyOwners([]);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('Property owners request timed out');
          setError('Request timed out');
        } else {
          console.error('Error loading property owners:', error);
          setError('Error loading property owners');
        }
        setPropertyOwners([]);
      } finally {
        setLoading(false);
      }
    };

    loadPropertyOwners();
  }, []);

  return { propertyOwners, loading, error };
}
```

**Files to Update:**
- `app/signup/page.tsx` (lines 74-120)
- `app/onboarding/page.tsx` (lines 75-117)

**Estimated LOC Reduction:** ~90 lines

---

### 3. **useUserData Hook (Dashboard)**
**Current Duplication:** Multiple fetch functions in `dashboard/page.tsx`

```typescript
// Recommended: app/hooks/useUserData.ts
interface UserData {
  address: Address;
  paymentMethod: PaymentMethod | null;
  backupPaymentMethod: PaymentMethod | null;
  payments: Payment[];
  rentalApplications: RentalApplication[];
}

export function useUserData(email?: string) {
  const [data, setData] = useState<Partial<UserData>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchAddress = useCallback(async () => {
    if (!email) return;
    try {
      const res = await fetch('/api/user/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();
      if (res.ok && result.address) {
        setData(prev => ({ ...prev, address: result.address }));
      }
    } catch (error) {
      console.error('Failed to fetch address');
      setErrors(prev => ({ ...prev, address: 'Failed to load address' }));
    }
  }, [email]);

  const fetchPaymentMethod = useCallback(async () => {
    if (!email) return;
    try {
      const response = await fetch('/api/stripe/default-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (response.ok && result.paymentMethod) {
        setData(prev => ({
          ...prev,
          paymentMethod: result.paymentMethod,
          backupPaymentMethod: result.backupPaymentMethod || null
        }));
      }
    } catch (error) {
      console.error('Failed to fetch payment method');
    }
  }, [email]);

  // ... similar for payments and rentalApplications

  const refetch = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchAddress(),
      fetchPaymentMethod(),
      // ... other fetches
    ]).finally(() => setLoading(false));
  }, [fetchAddress, fetchPaymentMethod]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { 
    ...data, 
    loading, 
    errors, 
    refetch,
    refetchAddress: fetchAddress,
    refetchPaymentMethod: fetchPaymentMethod
  };
}
```

**Files to Update:**
- `app/dashboard/page.tsx` (lines 88-156)

**Estimated LOC Reduction:** ~70 lines

---

### 4. **useAuth Hook (Session Management)**
**Current Duplication:** Appears in almost every page component

```typescript
// Recommended: app/hooks/useAuth.ts
export function useAuth(options?: {
  requireAuth?: boolean;
  allowedRoles?: string[];
  redirectTo?: string;
}) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    // Not authenticated
    if (!session?.user) {
      if (options?.requireAuth) {
        router.push(options.redirectTo || '/auth/signin');
      }
      return;
    }

    // Check role authorization
    if (options?.allowedRoles && options.allowedRoles.length > 0) {
      const userRole = session.user.role || 'user';
      if (!options.allowedRoles.includes(userRole)) {
        router.push('/'); // Unauthorized
        return;
      }
    }

    setIsAuthorized(true);
  }, [session, status, router, options]);

  return {
    session,
    status,
    update,
    isAuthenticated: !!session?.user,
    isAuthorized,
    isLoading: status === 'loading',
    user: session?.user
  };
}
```

**Usage Example:**
```typescript
// Before
const { data: session, status } = useSession();
const router = useRouter();
useEffect(() => {
  if (status === 'loading') return;
  if (!session?.user) router.push('/auth/signin');
}, [session, status, router]);

// After
const { isLoading, isAuthenticated } = useAuth({ 
  requireAuth: true,
  redirectTo: '/auth/signin'
});
if (isLoading) return <LoadingSpinner />;
```

**Files to Update:**
- `app/dashboard/page.tsx`
- `app/admin/page.tsx`
- `app/manager-dashboard/page.tsx`
- `app/property-owner-dashboard/page.tsx`
- `app/setup-payments/page.tsx`
- `app/rental-application/page.tsx`
- And ~10 more files

**Estimated LOC Reduction:** ~150 lines

---

## 🟡 MEDIUM PRIORITY - Reusable Components

### 5. **PropertySelector Component**
**Current Duplication:** Property selection form appears in `signup` and `onboarding`

```typescript
// Recommended: app/components/forms/PropertySelector.tsx
interface PropertySelectorProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  properties: Array<{name: string, description: string}>;
  loading?: boolean;
}

export function PropertySelector({ 
  value, 
  onChange, 
  required = true, 
  properties,
  loading = false 
}: PropertySelectorProps) {
  return (
    <div>
      <label htmlFor="selectedProperty" className="block text-sm/6 font-medium text-gray-900">
        Select Your Property
      </label>
      <div className="mt-2">
        <select
          id="selectedProperty"
          name="selectedProperty"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={loading}
          className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
        >
          <option value="">
            {loading ? 'Loading properties...' : 'Select a property...'}
          </option>
          {properties.map((property, index) => (
            <option key={index} value={property.name}>
              {property.name} - {property.description}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

**Files to Update:**
- `app/signup/page.tsx` (lines 310-327)
- `app/onboarding/page.tsx` (lines 235-252)

**Estimated LOC Reduction:** ~30 lines

---

### 6. **PropertyOwnerSelector Component**
**Current Duplication:** Property owner selection/creation appears in both signup and onboarding

```typescript
// Recommended: app/components/forms/PropertyOwnerSelector.tsx
interface PropertyOwnerSelectorProps {
  isNewOwner: boolean;
  ownerName: string;
  onToggleNew: (isNew: boolean) => void;
  onNameChange: (name: string) => void;
  propertyOwners: Array<{name: string}>;
  loading?: boolean;
}

export function PropertyOwnerSelector({ 
  isNewOwner, 
  ownerName, 
  onToggleNew, 
  onNameChange, 
  propertyOwners,
  loading = false 
}: PropertyOwnerSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm/6 font-medium text-gray-900 mb-2">
          Property Owner Registration
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              checked={!isNewOwner}
              onChange={() => onToggleNew(false)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Select existing property owner</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={isNewOwner}
              onChange={() => onToggleNew(true)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Register as new property owner</span>
          </label>
        </div>
      </div>

      {!isNewOwner ? (
        <div>
          <label htmlFor="propertyOwnerName" className="block text-sm/6 font-medium text-gray-900">
            Select Property Owner
          </label>
          <div className="mt-2">
            <select
              id="propertyOwnerName"
              value={ownerName}
              onChange={(e) => onNameChange(e.target.value)}
              required
              disabled={loading}
              className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
            >
              <option value="">
                {loading ? 'Loading owners...' : 'Select an existing property owner...'}
              </option>
              {propertyOwners.map((owner, index) => (
                <option key={index} value={owner.name}>
                  {owner.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="propertyOwnerName" className="block text-sm/6 font-medium text-gray-900">
            New Property Owner Name
          </label>
          <div className="mt-2">
            <input
              id="propertyOwnerName"
              type="text"
              value={ownerName}
              onChange={(e) => onNameChange(e.target.value)}
              required
              placeholder="Enter property owner business name"
              className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            This will create a new property owner record in the system.
          </p>
        </div>
      )}
    </div>
  );
}
```

**Files to Update:**
- `app/signup/page.tsx` (lines 330-390)
- `app/onboarding/page.tsx` (lines 255-315)

**Estimated LOC Reduction:** ~120 lines

---

### 7. **LoadingSpinner Component**
**Current Duplication:** Loading states scattered throughout the app

```typescript
// Recommended: app/components/ui/LoadingSpinner.tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}

export function LoadingSpinner({ 
  size = 'lg', 
  fullScreen = false,
  message 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-16 w-16',
    lg: 'h-32 w-32'
  };

  const spinner = (
    <div className={`animate-spin rounded-full border-b-2 border-indigo-600 ${sizeClasses[size]}`} />
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
        {spinner}
        {message && <p className="mt-4 text-lg text-gray-600">{message}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      {spinner}
      {message && <p className="ml-3 text-sm text-gray-600">{message}</p>}
    </div>
  );
}
```

**Files to Update:**
- All pages with loading states (10+ files)

**Estimated LOC Reduction:** ~80 lines

---

### 8. **PaymentMethodDisplay Component**
**Current Duplication:** Payment method display logic in dashboard

```typescript
// Recommended: app/components/payment/PaymentMethodDisplay.tsx
interface PaymentMethod {
  type?: string;
  brand: string;
  last4: string;
  exp_month: number | null;
  exp_year: number | null;
}

interface PaymentMethodDisplayProps {
  primary: PaymentMethod | null;
  backup: PaymentMethod | null;
  warning: string | null;
}

export function PaymentMethodDisplay({ primary, backup, warning }: PaymentMethodDisplayProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Payment Methods</h3>
      
      {/* Primary Payment Method */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Primary (Default)</p>
        {primary ? (
          <div className={`text-sm p-3 rounded-md ${
            primary.type === 'bank_account' 
              ? 'bg-green-50 border border-green-200 text-green-900' 
              : 'bg-yellow-50 border border-yellow-200 text-yellow-900'
          }`}>
            {primary.type === 'bank_account' ? (
              <p>🏦 <span className="font-semibold">{primary.brand}</span> **** {primary.last4}</p>
            ) : (
              <div>
                <p>
                  💳 <span className="font-semibold">{primary.brand.toUpperCase()}</span> **** {primary.last4}
                  {primary.exp_month && primary.exp_year && ` (exp ${primary.exp_month}/${primary.exp_year})`}
                </p>
                {warning && <p className="text-xs mt-1 text-yellow-700">⚠️ {warning}</p>}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
            ⚠️ No bank account found. Please add a bank account for rent payments.
          </p>
        )}
      </div>

      {/* Backup Payment Method */}
      {backup && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Backup (If Bank Payment Fails)</p>
          <div className="text-sm p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-900">
            <p>
              💳 <span className="font-semibold">{backup.brand.toUpperCase()}</span> **** {backup.last4}
              {backup.exp_month && backup.exp_year && ` (exp ${backup.exp_month}/${backup.exp_year})`}
            </p>
          </div>
        </div>
      )}

      {!backup && primary?.type === 'bank_account' && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Backup (Optional)</p>
          <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md border border-gray-200">
            No backup card on file. Consider adding one for failed ACH payments.
          </p>
        </div>
      )}
    </div>
  );
}
```

**Files to Update:**
- `app/dashboard/page.tsx` (lines 520-585)

**Estimated LOC Reduction:** ~65 lines

---

## 🟡 MEDIUM PRIORITY - API Middleware/Utils

### 9. **API Authentication Middleware**
**Current Duplication:** Every protected API route has the same auth pattern

```typescript
// Recommended: app/lib/api/withAuth.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/api/auth/authOptions';

export async function withAuth(
  handler: (req: Request, session: any) => Promise<NextResponse>,
  options?: {
    requireAdmin?: boolean;
    requireManager?: boolean;
  }
) {
  return async (req: Request) => {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check admin requirement
    if (options?.requireAdmin) {
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
      if (!adminEmails.includes(session.user.email)) {
        return NextResponse.json({ message: 'Forbidden - Admin access required' }, { status: 403 });
      }
    }

    // Check manager requirement
    if (options?.requireManager) {
      if (session.user.role !== 'manager' && session.user.role !== 'admin') {
        return NextResponse.json({ message: 'Forbidden - Manager access required' }, { status: 403 });
      }
    }

    return handler(req, session);
  };
}
```

**Usage Example:**
```typescript
// Before
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  // ... rest of handler
}

// After
export const POST = withAuth(async (req, session) => {
  // ... handler logic with session available
}, { requireAdmin: true });
```

**Files to Update:**
- 20+ API route files

**Estimated LOC Reduction:** ~60 lines

---

### 10. **Database Connection Utility**
**Current Duplication:** `connectToDatabase()` called in every API route

```typescript
// Recommended: app/lib/api/withDatabase.ts
import { connectToDatabase } from '@/lib/mongodb';

export async function withDatabase<T>(
  handler: () => Promise<T>
): Promise<T> {
  await connectToDatabase();
  return handler();
}

// Can be combined with withAuth
export async function withAuthAndDb(
  handler: (req: Request, session: any) => Promise<NextResponse>,
  options?: { requireAdmin?: boolean; requireManager?: boolean }
) {
  return withAuth(async (req, session) => {
    return withDatabase(() => handler(req, session));
  }, options);
}
```

**Usage Example:**
```typescript
// Before
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  await connectToDatabase();
  // ... handler logic
}

// After
export const POST = withAuthAndDb(async (req, session) => {
  // ... handler logic (auth + db already handled)
});
```

**Estimated LOC Reduction:** ~40 lines

---

## 🟢 LOW PRIORITY - Utility Functions

### 11. **Form Validation Utilities**
**Current Pattern:** Inline validation in form handlers

```typescript
// Recommended: app/lib/utils/validation.ts
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePhone = (phone: string): boolean => {
  return /^\d{10}$/.test(phone.replace(/\D/g, ''));
};

export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateTenantForm = (data: {
  userType: string;
  selectedProperty?: string;
}) => {
  const errors: Record<string, string> = {};
  
  if (data.userType === 'tenant' && !data.selectedProperty) {
    errors.selectedProperty = 'Please select a property';
  }
  
  return { isValid: Object.keys(errors).length === 0, errors };
};

export const validatePropertyOwnerForm = (data: {
  userType: string;
  propertyOwnerName?: string;
}) => {
  const errors: Record<string, string> = {};
  
  if (data.userType === 'property-owner' && !data.propertyOwnerName) {
    errors.propertyOwnerName = 'Please enter or select a property owner name';
  }
  
  return { isValid: Object.keys(errors).length === 0, errors };
};
```

**Estimated LOC Reduction:** ~30 lines

---

### 12. **Date Formatting Utilities**
**Current Pattern:** `new Date().toLocaleDateString()` scattered throughout

```typescript
// Recommended: app/lib/utils/date.ts
export const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString();
};

export const formatDateTime = (date: Date | string): string => {
  return new Date(date).toLocaleString();
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const getRelativeTime = (date: Date | string): string => {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diff = new Date(date).getTime() - Date.now();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (Math.abs(days) < 1) return 'Today';
  if (Math.abs(days) < 7) return rtf.format(days, 'day');
  if (Math.abs(days) < 30) return rtf.format(Math.floor(days / 7), 'week');
  return rtf.format(Math.floor(days / 30), 'month');
};
```

**Estimated LOC Reduction:** ~20 lines

---

## 📈 Impact Summary

| Category | Items | Est. LOC Reduced | Priority |
|----------|-------|------------------|----------|
| Custom Hooks | 4 | ~360 lines | HIGH |
| UI Components | 4 | ~295 lines | MEDIUM |
| API Utils | 2 | ~100 lines | MEDIUM |
| Utility Functions | 2 | ~50 lines | LOW |
| **TOTAL** | **12** | **~805 lines** | - |

---

## 📋 Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. Create `app/hooks/` directory
2. Implement `useProperties` and `usePropertyOwners` hooks
3. Update `signup` and `onboarding` pages to use new hooks
4. Test thoroughly

### Phase 2: User Data (Week 1-2)
1. Implement `useAuth` hook
2. Implement `useUserData` hook
3. Update dashboard pages
4. Test authentication flows

### Phase 3: UI Components (Week 2)
1. Create `app/components/forms/` directory
2. Implement `PropertySelector` and `PropertyOwnerSelector`
3. Implement `LoadingSpinner`
4. Implement `PaymentMethodDisplay`
5. Update all consuming pages

### Phase 4: API Utilities (Week 3)
1. Create `app/lib/api/` directory
2. Implement `withAuth` and `withDatabase` wrappers
3. Gradually migrate API routes
4. Test all endpoints

### Phase 5: Utilities (Week 3)
1. Create `app/lib/utils/` directory
2. Implement validation and formatting utilities
3. Update consuming code
4. Add unit tests

---

## ⚠️ Important Considerations

### Testing Requirements
- **Unit tests** for all new hooks and utilities
- **Integration tests** for auth flows
- **E2E tests** for critical user journeys (signup, payment setup)

### Breaking Changes
- None if implemented carefully
- All changes are internal refactoring
- External API contracts remain unchanged

### Performance Impact
- **Positive:** Reduced bundle size (~10-15% reduction estimated)
- **Positive:** Better code splitting with hooks
- **Neutral:** No runtime performance changes expected

### Maintenance Benefits
- **Single source of truth** for common operations
- **Easier bug fixes** (fix once, apply everywhere)
- **Better testing** (test hooks/utilities in isolation)
- **Improved developer experience** (less copy-paste)

---

## 🎯 Recommended Starting Point

**Start with `useProperties` and `usePropertyOwners` hooks** because:
1. ✅ Smallest scope (2 files affected)
2. ✅ 100% code duplication (easiest to verify)
3. ✅ No breaking changes possible
4. ✅ Immediate LOC reduction (~140 lines)
5. ✅ Sets pattern for other hooks

**Implementation Steps:**
1. Create `app/hooks/useProperties.ts`
2. Create `app/hooks/usePropertyOwners.ts`
3. Update `app/signup/page.tsx`
4. Update `app/onboarding/page.tsx`
5. Test both pages thoroughly
6. Commit and deploy

---

## 📝 Notes

- All estimates are conservative
- LOC = Lines of Code
- Priority based on impact vs effort ratio
- Recommended to tackle one category at a time
- Always maintain backward compatibility
- Consider creating a `refactoring` branch for this work

