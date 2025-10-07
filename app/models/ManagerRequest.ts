import mongoose, { Schema, model, models } from 'mongoose';

export interface ManagerRequest {
  _id?: string;
  fullname: string;
  email: string;
  phone: string;
  address: string;
  projectDescription: string;
  message: string;
  status: 'pending' | 'working' | 'finished' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
  adminNotes?: string;
  problemImageUrl?: string;
  finishedImageUrl?: string;
}

const managerRequestSchema = new Schema<ManagerRequest>({
  fullname: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  projectDescription: { type: String, required: true },
  message: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'working', 'finished', 'rejected'], 
    default: 'pending' 
  },
  adminNotes: { type: String, default: '' },
  problemImageUrl: { type: String, default: null },
  finishedImageUrl: { type: String, default: null },
}, { timestamps: true });

export const ManagerRequestModel = models.ManagerRequest || model<ManagerRequest>('ManagerRequest', managerRequestSchema);