'use client';

import { useState, useEffect, useCallback } from 'react';

// Types
interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface PaymentMethod {
  type?: string;
  brand: string;
  last4: string;
  exp_month: number | null;
  exp_year: number | null;
}

interface Payment {
  _id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
  description?: string;
}

interface RentalApplication {
  _id: string;
  listingName: string;
  listingType: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  employment: string;
  employer: string;
  monthlyIncome: string;
  moveInDate: string;
  status: 'pending' | 'approved' | 'denied';
  paymentStatus: 'pending' | 'paid' | 'failed';
  applicationFee: number;
  createdAt: string;
  adminNotes?: string;
  hasCheckingAccount?: boolean;
  hasCreditCard?: boolean;
  securityDepositPaid?: boolean;
}

interface UserData {
  address: Address;
  paymentMethod: PaymentMethod | null;
  backupPaymentMethod: PaymentMethod | null;
  paymentWarning: string | null;
  payments: Payment[];
  rentalApplications: RentalApplication[];
}

interface UseUserDataReturn extends UserData {
  loading: boolean;
  errors: Record<string, string>;
  refetch: () => void;
  refetchAddress: () => Promise<void>;
  refetchPaymentMethod: () => Promise<void>;
  refetchPayments: () => Promise<void>;
  refetchRentalApplications: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage user data for dashboard
 * Consolidates all user-related API calls and state management
 * Replaces duplicated fetch functions in dashboard page
 * 
 * @param email User email address
 */
export function useUserData(email?: string): UseUserDataReturn {
  const [address, setAddress] = useState<Address>({
    street: '',
    city: '',
    state: '',
    zip: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [backupPaymentMethod, setBackupPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentWarning, setPaymentWarning] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentalApplications, setRentalApplications] = useState<RentalApplication[]>([]);
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
      const data = await res.json();
      if (res.ok && data.address) {
        setAddress(data.address);
        setErrors(prev => {
          const { address, ...rest } = prev;
          return rest;
        });
      }
    } catch (error) {
      console.error('Failed to fetch address:', error);
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
      const data = await response.json();
      if (response.ok && data.paymentMethod) {
        setPaymentMethod(data.paymentMethod);
        setBackupPaymentMethod(data.backupPaymentMethod || null);
        setPaymentWarning(data.warning || null);
        setErrors(prev => {
          const { paymentMethod, ...rest } = prev;
          return rest;
        });
      }
    } catch (error) {
      console.error('Failed to fetch default payment method:', error);
      setErrors(prev => ({ ...prev, paymentMethod: 'Failed to load payment method' }));
    }
  }, [email]);

  const fetchPayments = useCallback(async () => {
    if (!email) return;
    try {
      console.log('Fetching payments for:', email);
      const response = await fetch(`/api/tenant/payments?email=${email}`);
      const data = await response.json();
      console.log('Payment response:', data);
      if (response.ok && data.payments) {
        setPayments(data.payments);
        console.log('Payments set:', data.payments.length);
        setErrors(prev => {
          const { payments, ...rest } = prev;
          return rest;
        });
      } else {
        console.error('Failed to fetch payments:', data);
        setErrors(prev => ({ ...prev, payments: 'Failed to load payment history' }));
      }
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
      setErrors(prev => ({ ...prev, payments: 'Failed to load payment history' }));
    }
  }, [email]);

  const fetchRentalApplications = useCallback(async () => {
    if (!email) return;
    try {
      const response = await fetch(`/api/rental-application?userEmail=${email}`);
      const data = await response.json();
      if (response.ok) {
        setRentalApplications(data || []);
        setErrors(prev => {
          const { rentalApplications, ...rest } = prev;
          return rest;
        });
      }
    } catch (error) {
      console.error('Failed to fetch rental applications:', error);
      setErrors(prev => ({ ...prev, rentalApplications: 'Failed to load applications' }));
    }
  }, [email]);

  const refetch = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchAddress(),
      fetchPaymentMethod(),
      fetchPayments(),
      fetchRentalApplications(),
    ]).finally(() => setLoading(false));
  }, [fetchAddress, fetchPaymentMethod, fetchPayments, fetchRentalApplications]);

  useEffect(() => {
    if (email) {
      refetch();
    }
  }, [email, refetch]);

  return {
    address,
    paymentMethod,
    backupPaymentMethod,
    paymentWarning,
    payments,
    rentalApplications,
    loading,
    errors,
    refetch,
    refetchAddress: fetchAddress,
    refetchPaymentMethod: fetchPaymentMethod,
    refetchPayments: fetchPayments,
    refetchRentalApplications: fetchRentalApplications,
  };
}
