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
}, { timestamps: true });

export const RentalApplicationModel = models.RentalApplication || model<RentalApplication>('RentalApplication', rentalApplicationSchema);