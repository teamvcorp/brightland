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

  // ✅ New address field
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}
