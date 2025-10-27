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
  propertyName?: string; // Full property name for sorting/filtering
  projectDescription: string;
  message: string;
  status: 'pending' | 'working' | 'finished' | 'rejected';
  userType?: 'tenant' | 'property-owner' | 'home-owner'; // Type of user submitting request
  proposedBudget?: number; // Budget proposed by submitter
  actualCost?: number; // Actual cost entered by admin
  amountToBill?: number; // Final amount to bill entered by admin
  createdAt?: Date;
  updatedAt?: Date;
  adminNotes?: string;
  problemImageUrl?: string;
  finishedImageUrl?: string;
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string; // Admin email who deleted
  // Admin-initiated request fields
  submittedBy?: 'user' | 'admin'; // Who initiated the request
  requiresApproval?: boolean; // If true, property owner must approve before work begins
  approvalStatus?: 'pending-approval' | 'approved' | 'declined'; // Approval status from property owner
  approvedBy?: string; // Email of property owner who approved/declined
  approvalDate?: Date; // When approval/decline was made
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
  propertyName: { type: String, default: null },
  projectDescription: { type: String, required: true },
  message: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'working', 'finished', 'rejected'], 
    default: 'pending' 
  },
  userType: { 
    type: String, 
    enum: ['tenant', 'property-owner', 'home-owner'], 
    default: 'tenant' 
  },
  proposedBudget: { type: Number, default: null },
  actualCost: { type: Number, default: null },
  amountToBill: { type: Number, default: null },
  adminNotes: { type: String, default: '' },
  problemImageUrl: { type: String, default: null },
  finishedImageUrl: { type: String, default: null },
  // Soft delete fields
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
  // Admin-initiated request fields
  submittedBy: { type: String, enum: ['user', 'admin'], default: 'user' },
  requiresApproval: { type: Boolean, default: false },
  approvalStatus: { type: String, enum: ['pending-approval', 'approved', 'declined'], default: null },
  approvedBy: { type: String, default: null },
  approvalDate: { type: Date, default: null },
  // Conversation log
  conversationLog: { type: [conversationMessageSchema], default: [] },
}, { timestamps: true });

export const ManagerRequestModel = models.ManagerRequest || model<ManagerRequest>('ManagerRequest', managerRequestSchema);