import mongoose, { Schema, model, models } from 'mongoose';

export interface RentalApplication {
  _id?: string;
  listingName: string;
  listingType: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  employment: string;
  employer: string;
  monthlyIncome: string;
  socialSecurityLastFour: string;
  referenceName: string;
  referencePhone: string;
  referenceRelation: string;
  moveInDate: string;
  additionalInfo?: string;
  status: 'pending' | 'approved' | 'denied';
  paymentStatus: 'pending' | 'paid' | 'failed';
  applicationFee: number;
  paymentIntentId?: string;
  paidAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  adminNotes?: string;
  
  // Lease Information (set by admin after approval)
  monthlyRent?: number; // Pulled from property
  leaseStartDate?: Date;
  leaseEndDate?: Date;
  propertyId?: string; // Reference to property
  
  // First Payment Calculation
  firstPaymentAmount?: number; // Prorated if mid-month
  firstPaymentDue?: Date;
  isProrated?: boolean;
  
  // Payment Setup Status
  hasCheckingAccount?: boolean;
  hasCreditCard?: boolean;
  securityDepositPaid?: boolean;
  autoPayEnabled?: boolean;
  stripeSubscriptionId?: string; // For recurring rent
  
  // Payment Tracking
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  rentPaymentStatus?: 'current' | 'late' | 'paid_ahead';
  
  // Archive fields
  isArchived?: boolean;
  archivedAt?: Date;
  archivedBy?: string;
}

const rentalApplicationSchema = new Schema<RentalApplication>({
  listingName: { type: String, required: true },
  listingType: { type: String, required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  userPhone: { type: String, required: true },
  employment: { type: String, required: true },
  employer: { type: String, required: true },
  monthlyIncome: { type: String, required: true },
  socialSecurityLastFour: { type: String, required: true },
  referenceName: { type: String, required: true },
  referencePhone: { type: String, required: true },
  referenceRelation: { type: String, required: true },
  moveInDate: { type: String, required: true },
  additionalInfo: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'denied'], 
    default: 'pending' 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed'], 
    default: 'pending' 
  },
  applicationFee: { type: Number, default: 25.00 },
  paymentIntentId: { type: String, default: null },
  paidAt: { type: Date, default: null },
  adminNotes: { type: String, default: '' },
  
  // Lease Information
  monthlyRent: { type: Number },
  leaseStartDate: { type: Date },
  leaseEndDate: { type: Date },
  propertyId: { type: String },
  
  // First Payment
  firstPaymentAmount: { type: Number },
  firstPaymentDue: { type: Date },
  isProrated: { type: Boolean, default: false },
  
  // Payment Setup Status
  hasCheckingAccount: { type: Boolean, default: false },
  hasCreditCard: { type: Boolean, default: false },
  securityDepositPaid: { type: Boolean, default: false },
  autoPayEnabled: { type: Boolean, default: false },
  stripeSubscriptionId: { type: String },
  
  // Payment Tracking
  lastPaymentDate: { type: Date },
  nextPaymentDate: { type: Date },
  rentPaymentStatus: { 
    type: String, 
    enum: ['current', 'late', 'paid_ahead'],
    default: 'current'
  },
  
  // Archive fields
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  archivedBy: { type: String },
}, { timestamps: true });

export const RentalApplicationModel = models.RentalApplication || model<RentalApplication>('RentalApplication', rentalApplicationSchema);