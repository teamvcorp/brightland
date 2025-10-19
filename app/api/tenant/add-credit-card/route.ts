import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import { RentalApplicationModel } from '@/models/RentalApplication';
import authOptions from '../../auth/authOptions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { tokenId, email, applicationId } = await req.json();

  if (!tokenId || !email || !applicationId) {
    return NextResponse.json({ message: 'Token ID, email, and application ID are required' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const user = await UserModel.findOne({ email }).exec();
    if (!user || !user.stripeCustomerId) {
      return NextResponse.json({ message: 'Stripe Customer not found' }, { status: 404 });
    }

    // Create payment method from token
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: tokenId },
    });

    // Attach to customer
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: user.stripeCustomerId,
    });

    // Set as default payment method for card payments
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });

    // Update user record
    await UserModel.updateOne(
      { email },
      {
        hasCreditCard: true,
        creditCardAdded: new Date(),
        cardPaymentMethodId: paymentMethod.id,
      }
    );

    // Update rental application
    await RentalApplicationModel.updateOne(
      { _id: applicationId },
      { hasCreditCard: true }
    );

    return NextResponse.json({
      message: 'Credit card added successfully',
      cardPaymentMethodId: paymentMethod.id,
    }, { status: 200 });
  } catch (err: any) {
    console.error(`Add credit card failed: ${err.message}`);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
