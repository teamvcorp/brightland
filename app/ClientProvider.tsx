'use client';

import { SessionProvider } from 'next-auth/react';
import AuthRedirectHandler from './components/AuthRedirectHandler';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthRedirectHandler />
      {children}
    </SessionProvider>
  );
}