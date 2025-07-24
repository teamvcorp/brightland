import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ message: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    await connectToDatabase();

    switch (event.type) {
      case 'identity.verification_session.created':
        const createdSession = event.data.object as Stripe.Identity.VerificationSession;
        console.log(`Verification session created for: ${createdSession.metadata?.email}`);
        break;
      case 'identity.verification_session.verified':
        const verifiedSession = event.data.object as Stripe.Identity.VerificationSession;
        await UserModel.updateOne(
          { email: verifiedSession.metadata?.email },
          { isVerified: true, identityVerificationStatus: 'verified' }
        );
        console.log(`User verified: ${verifiedSession.metadata?.email}`);
        break;
      case 'identity.verification_session.requires_input':
        const failedSession = event.data.object as Stripe.Identity.VerificationSession;
        await UserModel.updateOne(
          { email: failedSession.metadata?.email },
          { identityVerificationStatus: 'failed' }
        );
        console.log(`Verification failed for: ${failedSession.metadata?.email}`);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error(`Webhook handler failed: ${err.message}`);
    return NextResponse.json({ message: `Internal Server Error: ${err.message}` }, { status: 500 });
  }
}