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
  isVerified: { type: Boolean, default: false },
  identityVerificationStatus: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
  payments: [paymentSchema],
  stripeCustomerId: { type: String, unique: true, sparse: true },
  current40Percent: { type: Number, default: 0 },
}, { timestamps: true });

export const UserModel = models.User || model<User>('User', userSchema);