import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import Stripe from 'stripe';
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

    const { amount, listingName, applicationId, userEmail } = await request.json();

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

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Rental Application Fee - ${listingName}`,
              description: 'Application processing and verification fee',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/rental-application-success?listingName=${encodeURIComponent(listingName)}&applicationId=${applicationId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/rental-application-checkout?listingName=${encodeURIComponent(listingName)}&applicationId=${applicationId}&cancelled=true`,
      customer_email: userEmail,
      metadata: {
        type: 'rental_application_fee',
        userEmail: userEmail,
        listingName: listingName,
        applicationId: applicationId,
        userName: session.user.name || 'Unknown',
      },
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}