import { Document } from 'mongoose';

export interface Payment {
  paymentIntentId: string;
  amount: number;
  platformFee: number;
  userPortion: number;
  status: string;
  createdAt: Date;
  current40Percent: number;
}

export interface User extends Document {
  name: string;
  email: string;
  password?: string;
  isVerified: boolean;
  identityVerificationStatus: 'pending' | 'verified' | 'failed';
  defaultPaymentMethod?: string; // Optional field for default payment method
  stripeCustomerId?: string;
  payments: Payment[];
  createdAt: Date;
  updatedAt: Date;
  current40Percent: number;
  role?: string;
  userType: 'tenant' | 'property-owner'; // Removed manager

  // ✅ Address field - for tenants, selected property address
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };

  // ✅ Fields for tenants
  selectedProperty?: string; // Property name they selected

  // ✅ Fields for property owners
  propertyOwnerName?: string; // Property owner business name
}
