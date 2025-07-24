import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
   apiVersion: '2025-06-30.basil',
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { amount } = await req.json();

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ message: 'Valid amount is required' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const user = await UserModel.findOne({ email: session.user.email }).exec();
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (!user.isVerified || user.identityVerificationStatus !== 'verified') {
      return NextResponse.json({ message: 'User identity not verified' }, { status: 403 });
    }

    const platformFee = Math.round(amount * 0.4);
    const userPortion = Math.round(amount * 0.6);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      description: `Payment for ${user.email}`,
      metadata: {
        user_id: user._id.toString(),
        email: user.email,
        platform_fee: platformFee,
        user_portion: userPortion,
      },
    });

    await UserModel.updateOne(
      { email: session.user.email },
      {
        $push: {
          payments: {
            paymentIntentId: paymentIntent.id,
            amount,
            platformFee,
            userPortion,
            status: paymentIntent.status,
          },
        },
      }
    );

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      platformFee,
      userPortion,
    }, { status: 200 });
  } catch (err: any) {
    console.error(`Payment processing failed: ${err.message}`);
    return NextResponse.json({ message: `Internal Server Error: ${err.message}` }, { status: 500 });
  }
}