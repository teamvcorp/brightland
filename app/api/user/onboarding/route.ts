import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import { PropertyOwnerModel } from '@/models/PropertyOwner';
import authOptions from '../../auth/authOptions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-06-30.basil' as any,
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { email, userType, selectedProperty, propertyOwnerName, isNewPropertyOwner } = await req.json();

    // Verify the email matches the session
    if (email !== session.user.email) {
      return NextResponse.json(
        { error: 'Email mismatch' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!userType) {
      return NextResponse.json(
        { error: 'User type is required' },
        { status: 400 }
      );
    }

    if (userType === 'tenant' && !selectedProperty) {
      return NextResponse.json(
        { error: 'Please select a property' },
        { status: 400 }
      );
    }

    if (userType === 'property-owner' && !propertyOwnerName) {
      return NextResponse.json(
        { error: 'Property owner name is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the user
    const user = await UserModel.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user fields
    user.userType = userType;

    if (userType === 'tenant') {
      user.selectedProperty = selectedProperty;
      user.propertyOwnerName = undefined;
      
      // Create Stripe customer for tenant if not exists
      if (!user.stripeCustomerId) {
        try {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
          });
          user.stripeCustomerId = customer.id;
        } catch (stripeError) {
          console.error('Failed to create Stripe customer:', stripeError);
          // Continue without Stripe customer
        }
      }
    } else if (userType === 'property-owner') {
      user.selectedProperty = undefined;
      user.propertyOwnerName = propertyOwnerName;
      
      // Remove Stripe customer ID if they switch to property owner
      if (user.stripeCustomerId) {
        user.stripeCustomerId = undefined;
      }

      // If new property owner, create the PropertyOwner record
      if (isNewPropertyOwner) {
        const existingPropertyOwner = await PropertyOwnerModel.findOne({ name: propertyOwnerName });
        if (!existingPropertyOwner) {
          await PropertyOwnerModel.create({
            name: propertyOwnerName,
            email: user.email,
            properties: [],
          });
        }
      }
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: {
        email: user.email,
        name: user.name,
        userType: user.userType,
        selectedProperty: user.selectedProperty,
        propertyOwnerName: user.propertyOwnerName,
      },
    });
  } catch (error: any) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
