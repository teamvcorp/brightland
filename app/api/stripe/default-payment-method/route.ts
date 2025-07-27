// app/api/stripe/default-payment-method/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '../../auth/authOptions';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const user = await UserModel.findOne({ email: session.user.email }).exec();
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ message: 'Stripe customer not found' }, { status: 400 });
  }

  const customer = await stripe.customers.retrieve(user.stripeCustomerId) as Stripe.Customer;
  const defaultPmId = customer.invoice_settings?.default_payment_method;

  if (!defaultPmId || typeof defaultPmId !== 'string') {
    return NextResponse.json({ message: 'No default payment method found' }, { status: 404 });
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(defaultPmId);
  return NextResponse.json({ paymentMethod });
}
