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
  isVerified: { type: Boolean, default: false },
  identityVerificationStatus: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
  payments: [paymentSchema],
  stripeCustomerId: { type: String, unique: true, sparse: true },
  current40Percent: { type: Number, default: 0 },
  defaultPaymentMethod: { type: String, default: null },

  // ✅ New address field
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
  },
}, { timestamps: true });


export const UserModel = models.User || model<User>('User', userSchema);