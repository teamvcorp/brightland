import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Stripe from 'stripe';
import { connectToDatabase } from '../../../lib/mongodb';
import { RentalApplicationModel } from '../../../models/RentalApplication';
import authOptions from '../../auth/authOptions';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    // Get session to verify user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { amount, userEmail, listingName, applicationId } = await request.json();

    // Validate the amount (should be $25.00 = 2500 cents)
    if (!amount || amount !== 2500) {
      return NextResponse.json(
        { error: 'Invalid amount. Application fee must be $25.00' },
        { status: 400 }
      );
    }

    if (!userEmail || !listingName || !applicationId) {
      return NextResponse.json(
        { error: 'Missing required fields: userEmail, listingName, and applicationId' },
        { status: 400 }
      );
    }

    // Verify the session user matches the application user
    if (session.user.email !== userEmail) {
      return NextResponse.json(
        { error: 'Unauthorized. User mismatch.' },
        { status: 403 }
      );
    }

    // Connect to database and verify application exists
    await connectToDatabase();
    const application = await RentalApplicationModel.findById(applicationId);
    
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    if (application.userEmail !== userEmail) {
      return NextResponse.json(
        { error: 'Application does not belong to this user' },
        { status: 403 }
      );
    }

    if (application.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'Application fee has already been paid' },
        { status: 400 }
      );
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // $25.00 in cents
      currency: 'usd',
      metadata: {
        type: 'rental_application_fee',
        userEmail: userEmail,
        listingName: listingName,
        applicationId: applicationId,
        userName: session.user.name || 'Unknown',
      },
      description: `Rental Application Fee - ${listingName}`,
      receipt_email: userEmail,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

// Handle payment confirmation
export async function PATCH(request: NextRequest) {
  try {
    const { paymentIntentId, applicationId } = await request.json();

    if (!paymentIntentId || !applicationId) {
      return NextResponse.json(
        { error: 'Payment intent ID and application ID are required' },
        { status: 400 }
      );
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not successful' },
        { status: 400 }
      );
    }

    // Update application payment status
    await connectToDatabase();
    const updatedApplication = await RentalApplicationModel.findByIdAndUpdate(
      applicationId,
      { 
        paymentStatus: 'paid',
        paymentIntentId: paymentIntentId,
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!updatedApplication) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed and application updated',
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}