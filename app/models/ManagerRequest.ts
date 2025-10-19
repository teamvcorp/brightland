import mongoose, { Schema, model, models } from 'mongoose';

export interface ConversationMessage {
  sender: 'admin' | 'user';
  senderName: string;
  senderEmail: string;
  message: string;
  timestamp: Date;
  isInternal?: boolean; // Admin-only notes
}

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
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string; // Admin email who deleted
  // Conversation log
  conversationLog?: ConversationMessage[];
}

const conversationMessageSchema = new Schema<ConversationMessage>({
  sender: { type: String, enum: ['admin', 'user'], required: true },
  senderName: { type: String, required: true },
  senderEmail: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isInternal: { type: Boolean, default: false },
}, { _id: true });

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
  // Soft delete fields
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
  // Conversation log
  conversationLog: { type: [conversationMessageSchema], default: [] },
}, { timestamps: true });

export const ManagerRequestModel = models.ManagerRequest || model<ManagerRequest>('ManagerRequest', managerRequestSchema);