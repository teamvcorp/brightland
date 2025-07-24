import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '../auth/authOptions';
import { connectToDatabase } from '../../lib/mongodb';
import { UserModel } from '../../models/User';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const PRESET_MIN = 10; // Example preset min value

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const user = await UserModel.findOne({ email: session.user.email }).exec();
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Fetch recent PaymentIntents for the customer
    const paymentIntents = await stripe.paymentIntents.list({
      customer: user.stripeCustomerId,
      limit: 1, // Get the most recent
    });

    if (paymentIntents.data.length === 0) {
      return NextResponse.json({ message: 'No recent deposits found' }, { status: 404 });
    }

    const recentAmount = paymentIntents.data[0].amount / 100; // Convert cents to dollars
    const new40Percent = recentAmount * 0.4;

    if (new40Percent < PRESET_MIN) {
      return NextResponse.json({ message: 'Update below minimum threshold' }, { status: 400 });
    }

    await UserModel.updateOne(
      { email: session.user.email },
      { current40Percent: new40Percent }
    );

    return NextResponse.json({ new40Percent }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}