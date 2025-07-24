import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import {UserModel} from '@/models/User';
import { authOptions } from '../../auth/[...nextauth]/route';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { tokenId } = await req.json();

  if (!tokenId) {
    return NextResponse.json({ message: 'Token ID is required' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const user = await UserModel.findOne({ email: session.user.email }).exec();
    if (!user || !user.stripeCustomerId) {
      return NextResponse.json({ message: 'Stripe Customer not found' }, { status: 404 });
    }

    await stripe.customers.createSource(user.stripeCustomerId, { source: tokenId });

    return NextResponse.json({ message: 'Bank account added successfully' }, { status: 200 });
  } catch (err: any) {
    console.error(`Add bank account failed: ${err.message}`);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}