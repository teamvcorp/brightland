import mongoose, { Schema, model, models } from 'mongoose';

// Individual property interface
export interface Property {
  _id?: string;
  name: string;
  type: 'residential' | 'commercial' | 'house';
  sqft: number;
  description: string;
  rent: number;
  extraAdult?: number;
  amenities: string;
  status: 'available' | 'rented' | 'under-remodel' | 'maintenance';
  picture?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// User under property owner
export interface PropertyOwnerUser {
  _id?: string;
  name: string;
  email: string;
  password: string;
  userType: 'tenant' | 'property-owner';
  selectedProperty?: string;
  isVerified: boolean;
  identityVerificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
}

// Property Owner with embedded properties and users
export interface PropertyOwner {
  _id: string;
  name: string;
  email: string;
  phone: string;
  properties: Property[]; // Embedded properties array
  users: PropertyOwnerUser[]; // Embedded users array
  createdAt: Date;
  updatedAt: Date;
}

// Property schema for embedding
const propertySchema = new Schema<Property>({
  name: { type: String, required: true },
  type: { type: String, enum: ['residential', 'commercial', 'house'], required: true },
  sqft: { type: Number, required: true },
  description: { type: String, required: true },
  rent: { type: Number, required: true },
  extraAdult: { type: Number, default: 0 },
  amenities: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['available', 'rented', 'under-remodel', 'maintenance', 'being-remodeled'], 
    default: 'available' 
  },
  picture: { type: String },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    zip: { type: String },
  },
}, { timestamps: true });

// User schema for embedding under property owner
const propertyOwnerUserSchema = new Schema<PropertyOwnerUser>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String }, // Changed from required to optional - users might use OAuth
  userType: { 
    type: String, 
    enum: ['tenant', 'property-owner'], 
    required: true 
  },
  selectedProperty: { type: String },
  isVerified: { type: Boolean, default: false },
  identityVerificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending' 
  },
}, { timestamps: true });

const propertyOwnerSchema = new Schema<PropertyOwner>({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  properties: [propertySchema], // Embedded properties
  users: [propertyOwnerUserSchema], // Embedded users
}, { timestamps: true });

// Indexes for better performance
propertyOwnerSchema.index({ 'properties.status': 1 });
propertyOwnerSchema.index({ 'properties.type': 1 });
propertyOwnerSchema.index({ 'users.email': 1 });
propertyOwnerSchema.index({ 'users.userType': 1 });

export const PropertyOwnerModel = models.PropertyOwner || model<PropertyOwner>('PropertyOwner', propertyOwnerSchema);