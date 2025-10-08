import mongoose, { Schema, model, models } from 'mongoose';

export interface Property {
  _id: string;
  name: string;
  type: 'residential' | 'commercial' | 'house';
  sqft: number;
  description: string;
  rent: number;
  extraAdult?: number;
  amenities: string;
  status: 'available' | 'rented' | 'under-remodel' | 'maintenance';
  picture?: string;
  propertyOwner: string; // Reference to PropertyOwner
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

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
    enum: ['available', 'rented', 'under-remodel', 'maintenance'], 
    default: 'available' 
  },
  picture: { type: String },
  propertyOwner: { type: String, required: true }, // Store owner name
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
  },
}, { timestamps: true });

// Index for faster queries
propertySchema.index({ propertyOwner: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ type: 1 });

export const PropertyModel = models.Property || model<Property>('Property', propertySchema);