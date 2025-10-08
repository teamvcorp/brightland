'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function AuthRedirectHandler() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Only run once per session change and when session is loaded
    if (status === 'loading' || !session || hasRedirected.current) return;

    // Don't redirect if user is already on their correct dashboard
    if (session.user?.userType === 'property-owner' && pathname === '/property-owner-dashboard') return;
    if (session.user?.userType === 'manager' && pathname === '/manager-dashboard') return;
    if (session.user?.userType === 'tenant' && pathname === '/dashboard') return;

    // Only redirect if user just signed in (is on home page, auth pages, or general pages)
    const shouldRedirectPages = ['/', '/auth/signin', '/signup'];
    if (!shouldRedirectPages.includes(pathname)) return;

    // Redirect based on user type
    hasRedirected.current = true;
    
    if (session.user?.userType === 'property-owner') {
      console.log('Redirecting property owner to dashboard');
      router.push('/property-owner-dashboard');
    } else if (session.user?.userType === 'manager') {
      console.log('Redirecting manager to dashboard');
      router.push('/manager-dashboard');
    } else if (session.user?.userType === 'tenant') {
      console.log('Redirecting tenant to dashboard');
      router.push('/dashboard');
    }
  }, [session, status, pathname, router]);

  // Reset redirect flag when session changes (new login)
  useEffect(() => {
    hasRedirected.current = false;
  }, [session?.user?.email]);

  return null; // This component doesn't render anything
}