"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ContactUsTenant from "@/components/ContactUsTenant";

export default function TenantRequestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect if not tenant
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    // Only allow tenants
    if (session.user?.userType === 'property-owner') {
      router.push('/property-owner-dashboard');
      return;
    }
    
    if (session.user?.userType === 'manager') {
      router.push('/manager-dashboard');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user?.userType !== 'tenant') {
    return null; // Will redirect
  }

  return <ContactUsTenant />;
}
