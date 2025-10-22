import mongoose, { Schema, model, models } from 'mongoose';

export interface PaymentRequest {
  _id?: string;
  managerRequestId: string; // Reference to the ManagerRequest
  propertyName: string;
  propertyOwnerEmail: string;
  propertyOwnerName?: string;
  amount: number;
  actualCost?: number;
  proposedBudget?: number;
  description: string; // Project description from the request
  status: 'pending' | 'paid' | 'cancelled' | 'disputed';
  dueDate?: Date;
  paidDate?: Date;
  paidAmount?: number;
  paymentMethod?: string;
  paymentNotes?: string;
  invoiceUrl?: string; // Link to invoice PDF if generated
  createdAt?: Date;
  updatedAt?: Date;
  createdBy: string; // Admin email who created the payment request
}

const paymentRequestSchema = new Schema<PaymentRequest>({
  managerRequestId: { type: String, required: true },
  propertyName: { type: String, required: true },
  propertyOwnerEmail: { type: String, required: true },
  propertyOwnerName: { type: String, default: null },
  amount: { type: Number, required: true },
  actualCost: { type: Number, default: null },
  proposedBudget: { type: Number, default: null },
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'cancelled', 'disputed'], 
    default: 'pending' 
  },
  dueDate: { type: Date, default: null },
  paidDate: { type: Date, default: null },
  paidAmount: { type: Number, default: null },
  paymentMethod: { type: String, default: null },
  paymentNotes: { type: String, default: null },
  invoiceUrl: { type: String, default: null },
  createdBy: { type: String, required: true },
}, { timestamps: true });

// Index for faster queries
paymentRequestSchema.index({ managerRequestId: 1 });
paymentRequestSchema.index({ propertyOwnerEmail: 1 });
paymentRequestSchema.index({ status: 1 });

export const PaymentRequestModel = models.PaymentRequest || model<PaymentRequest>('PaymentRequest', paymentRequestSchema);
