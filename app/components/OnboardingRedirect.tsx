'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function OnboardingRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip if still loading or not authenticated
    if (status === 'loading' || !session?.user) return;

    // Skip if already on onboarding page
    if (pathname === '/onboarding') return;

    // Skip if on auth pages
    if (pathname?.startsWith('/auth/') || pathname === '/signup') return;

    // Check if user needs onboarding
    if (session.user.needsOnboarding) {
      console.log('OnboardingRedirect: User needs onboarding, redirecting...', {
        userType: session.user.userType,
        selectedProperty: session.user.selectedProperty,
        company: session.user.company,
        needsOnboarding: session.user.needsOnboarding
      });
      router.push('/onboarding');
    }
  }, [session, status, pathname, router]);

  return null;
}
