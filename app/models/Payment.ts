import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface Payment extends Document {
  _id: string;
  userId: string;
  userEmail: string;
  rentalApplicationId: string;
  propertyId?: string;
  propertyName: string;
  
  type: 'rent' | 'security_deposit' | 'fee' | 'late_fee' | 'maintenance';
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  
  paymentMethod: 'ach' | 'card';
  stripePaymentIntentId: string;
  stripeSubscriptionId?: string;
  
  dueDate: Date;
  paidDate?: Date;
  
  description: string;
  adminNotes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<Payment>({
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  rentalApplicationId: { type: String, required: true },
  propertyId: { type: String, required: false },
  propertyName: { type: String, required: true },
  
  type: { 
    type: String, 
    enum: ['rent', 'security_deposit', 'fee', 'late_fee', 'maintenance'],
    required: true 
  },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  
  paymentMethod: { 
    type: String, 
    enum: ['ach', 'card'],
    required: true 
  },
  stripePaymentIntentId: { type: String, required: true },
  stripeSubscriptionId: { type: String },
  
  dueDate: { type: Date, required: true },
  paidDate: { type: Date },
  
  description: { type: String, required: true },
  adminNotes: { type: String, default: '' },
}, { timestamps: true });

// Indexes for better query performance
paymentSchema.index({ userEmail: 1, status: 1 });
paymentSchema.index({ rentalApplicationId: 1 });
paymentSchema.index({ dueDate: 1 });

export const PaymentModel = models.Payment || model<Payment>('Payment', paymentSchema);
