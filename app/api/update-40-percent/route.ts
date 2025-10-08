import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '../auth/authOptions';
import { connectToDatabase } from '../../lib/mongodb';
import { UserModel } from '../../models/User';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

let PRESET_MIN = 10; // This is runtime memory only — won't persist in DB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Only allow tenants to access this endpoint
  if (session.user?.userType !== 'tenant') {
    return NextResponse.json({ message: 'This endpoint is only for tenants' }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const user = await UserModel.findOne({ email: session.user.email }).exec();
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const paymentIntents = await stripe.paymentIntents.list({
      customer: user.stripeCustomerId,
      limit: 1,
    });

    if (paymentIntents.data.length === 0) {
      return NextResponse.json({ message: 'No recent deposits found' }, { status: 404 });
    }

    const recentAmount = paymentIntents.data[0].amount / 100;
    const new40Percent = recentAmount * 0.4;

    // ✅ Update PRESET_MIN if new40Percent is greater
    if (new40Percent > PRESET_MIN) {
      PRESET_MIN = new40Percent;
    }

    if (new40Percent < PRESET_MIN) {
      return NextResponse.json({ message: 'Update below minimum threshold' }, { status: 400 });
    }

    await UserModel.updateOne(
      { email: session.user.email },
      { current40Percent: new40Percent }
    );

    return NextResponse.json({ new40Percent, updatedPresetMin: PRESET_MIN }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
