import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import { RentalApplicationModel } from '@/models/RentalApplication';
import { PaymentModel } from '@/models/Payment';
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

  const { email, applicationId, amount, paymentMethodId } = await req.json();

  if (!email || !applicationId || !amount || !paymentMethodId) {
    return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const user = await UserModel.findOne({ email }).exec();
    if (!user || !user.stripeCustomerId) {
      return NextResponse.json({ message: 'User or Stripe customer not found' }, { status: 404 });
    }

    const application = await RentalApplicationModel.findById(applicationId).exec();
    if (!application) {
      return NextResponse.json({ message: 'Rental application not found' }, { status: 404 });
    }

    // Create a charge using the bank account source
    const charge = await stripe.charges.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: user.stripeCustomerId,
      source: paymentMethodId, // This is the bank account source ID
      description: `Security deposit for ${application.listingName}`,
      metadata: {
        type: 'security_deposit',
        rentalApplicationId: application._id.toString(),
        propertyName: application.listingName,
        userId: user._id.toString(),
      },
    });

    // Update user record
    await UserModel.updateOne(
      { email },
      {
        securityDepositPaid: true,
        securityDepositAmount: amount,
        securityDepositDate: new Date(),
        securityDepositIntentId: charge.id,
      }
    );

    // Update rental application
    await RentalApplicationModel.updateOne(
      { _id: applicationId },
      { 
        securityDepositPaid: true,
        securityDepositIntentId: charge.id,
        securityDepositAmount: amount,
        monthlyRent: amount // Security deposit = 1 month rent
      }
    );

    // Create payment record
    console.log('Creating payment record with data:', {
      userId: user._id.toString(),
      userEmail: email,
      rentalApplicationId: application._id.toString(),
      propertyId: application.propertyId || '',
      propertyName: application.listingName,
      type: 'security_deposit',
      amount: amount,
    });

    const paymentRecord = await PaymentModel.create({
      userId: user._id.toString(),
      userEmail: email,
      rentalApplicationId: application._id.toString(),
      propertyId: application.propertyId || '',
      propertyName: application.listingName,
      type: 'security_deposit',
      amount: amount,
      status: charge.status === 'succeeded' ? 'paid' : 'pending',
      paymentMethod: 'ach',
      stripePaymentIntentId: charge.id,
      dueDate: new Date(),
      paidDate: charge.status === 'succeeded' ? new Date() : undefined,
      description: `Security deposit for ${application.listingName}`,
    });

    console.log('Payment record created:', paymentRecord._id);

    return NextResponse.json({
      message: 'Security deposit processed successfully',
      chargeId: charge.id,
      status: charge.status,
      paymentRecordId: paymentRecord._id,
    }, { status: 200 });
  } catch (err: any) {
    console.error(`Security deposit failed:`, err);
    console.error(`Error message: ${err.message}`);
    console.error(`Error stack:`, err.stack);
    return NextResponse.json({ 
      message: err.message,
      error: err.toString(),
      stack: err.stack 
    }, { status: 500 });
  }
}
