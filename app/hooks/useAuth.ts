'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface UseAuthOptions {
  requireAuth?: boolean;
  redirectTo?: string;
  allowedUserTypes?: string[];
}

interface UseAuthReturn {
  session: any;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  update: any;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  isLoading: boolean;
  user: any;
}

/**
 * Custom hook for authentication and authorization
 * Handles session management, loading states, and redirects
 * Replaces duplicated useSession + useRouter + useEffect pattern across all pages
 * 
 * @param options Configuration options
 * @param options.requireAuth If true, redirects unauthenticated users
 * @param options.redirectTo Where to redirect if not authenticated (default: '/auth/signin')
 * @param options.allowedUserTypes Array of allowed user types/roles (e.g., ['admin', 'manager'])
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    // Not authenticated
    if (!session?.user) {
      if (options.requireAuth) {
        router.push(options.redirectTo || '/auth/signin');
      }
      setIsAuthorized(false);
      return;
    }

    // Check user type authorization
    if (options.allowedUserTypes && options.allowedUserTypes.length > 0) {
      const userType = session.user.userType || session.user.role || 'user';
      if (!options.allowedUserTypes.includes(userType)) {
        router.push('/'); // Redirect to home if not authorized
        setIsAuthorized(false);
        return;
      }
    }

    setIsAuthorized(true);
  }, [session, status, router, options.requireAuth, options.redirectTo, options.allowedUserTypes]);

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
