import mongoose, { Schema, model, models } from 'mongoose';
import { User, Payment } from '../types/user';

const paymentSchema = new Schema<Payment>({
  paymentIntentId: { type: String, required: true },
  amount: { type: Number, required: true },
  platformFee: { type: Number, required: true },
  userPortion: { type: Number, required: true },
  status: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const userSchema = new Schema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }, // Updated role with admin option
  userType: { type: String, enum: ['tenant', 'property-owner'], required: true }, // Removed manager
  isVerified: { type: Boolean, default: false },
  identityVerificationStatus: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
  payments: [paymentSchema],
  stripeCustomerId: { type: String, unique: true, sparse: true },
  current40Percent: { type: Number, default: 0 },
  defaultPaymentMethod: { type: String, default: null },

  // ✅ Address field - for tenants, selected property address
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
  },

  // ✅ Fields for tenants
  selectedProperty: { type: String, default: '' }, // Property name they selected

  // ✅ Fields for property owners
  propertyOwnerName: { type: String, default: '' }, // Property owner business name
}, { timestamps: true });


export const UserModel = models.User || model<User>('User', userSchema);