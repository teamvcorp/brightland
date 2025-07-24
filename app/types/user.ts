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
  stripeCustomerId?: string;  // Added here for Stripe Customer ID
  payments: Payment[];
  createdAt: Date;
  updatedAt: Date;
  current40Percent: number;
  role?: string;  // Optional role field
}