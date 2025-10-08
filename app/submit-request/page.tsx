"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ContactUsPropertyOwner from "@/components/ContactUsPropertyOwner";

export default function SubmitRequestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect if not property owner
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    if (session.user?.userType !== 'property-owner') {
      router.push('/dashboard');
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

  if (!session || session.user?.userType !== 'property-owner') {
    return null; // Will redirect
  }

  return <ContactUsPropertyOwner />;
}