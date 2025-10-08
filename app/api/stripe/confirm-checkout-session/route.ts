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
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { sessionId, applicationId } = await request.json();

    if (!sessionId || !applicationId) {
      return NextResponse.json(
        { error: 'Session ID and application ID are required' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (checkoutSession.payment_status !== 'paid') {
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
        paymentIntentId: checkoutSession.payment_intent as string,
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
      checkoutSession: {
        id: checkoutSession.id,
        payment_status: checkoutSession.payment_status,
        amount_total: checkoutSession.amount_total,
      },
    });

  } catch (error) {
    console.error('Error confirming checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to confirm checkout session' },
      { status: 500 }
    );
  }
}