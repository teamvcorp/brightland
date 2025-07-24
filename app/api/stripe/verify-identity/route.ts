import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(req: Request) {
  console.log('Processing identity verification request');
  const { email, documentType } = await req.json();

  if (!email || !documentType) {
    return NextResponse.json({ message: 'Email and document type are required' }, { status: 400 });
  }

  if (!['passport', 'id_card', 'driving_license'].includes(documentType)) {
    return NextResponse.json({ message: 'Invalid document type' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const user = await UserModel.findOne({ email }).exec();
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { user_id: user._id.toString(), email: user.email },
      options: {
        document: {
          allowed_types: [documentType],
          require_matching_selfie: true,
        },
      },
    });

    await UserModel.updateOne(
      { email },
      { identityVerificationStatus: verificationSession.status, isVerified: verificationSession.status === 'true' }
    );

    return NextResponse.json({ clientSecret: verificationSession.client_secret }, { status: 200 });
  } catch (err: any) {
    console.error(`Failed to create verification session: ${err.message}`);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}