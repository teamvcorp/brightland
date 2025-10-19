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

  const { routingNumber, accountNumber, accountHolderName, accountType, email, applicationId } = await req.json();

  if (!routingNumber || !accountNumber || !accountHolderName || !email || !applicationId) {
    return NextResponse.json({ message: 'All bank account details are required' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const user = await UserModel.findOne({ email }).exec();
    if (!user || !user.stripeCustomerId) {
      return NextResponse.json({ message: 'Stripe Customer not found' }, { status: 404 });
    }

    // Create a bank account token
    const token = await stripe.tokens.create({
      bank_account: {
        country: 'US',
        currency: 'usd',
        account_holder_name: accountHolderName,
        account_holder_type: accountType || 'individual',
        routing_number: routingNumber,
        account_number: accountNumber,
      },
    });

    // Add the bank account as a source to the customer (this works in test mode)
    const bankAccount = await stripe.customers.createSource(
      user.stripeCustomerId,
      { source: token.id }
    );

    // In test mode with routing 110000000 and account 000123456789, 
    // the bank account is instantly verified
    // Verify the bank account (in test mode, this succeeds immediately with the test account)
    if (routingNumber === '110000000' && accountNumber === '000123456789') {
      // Test mode - mark as verified
      await stripe.customers.verifySource(
        user.stripeCustomerId,
        bankAccount.id,
        { amounts: [32, 45] } // Test verification amounts
      );
    }

    // Store the bank account ID as the payment method ID
    const paymentMethodId = bankAccount.id;

    // Update user record
    await UserModel.updateOne(
      { email },
      {
        hasCheckingAccount: true,
        checkingAccountAdded: new Date(),
        achPaymentMethodId: paymentMethodId,
      }
    );

    // Update rental application
    await RentalApplicationModel.updateOne(
      { _id: applicationId },
      { hasCheckingAccount: true, achPaymentMethodId: paymentMethodId }
    );

    return NextResponse.json({ 
      message: 'Checking account added successfully',
      achPaymentMethodId: paymentMethodId,
      bankAccount: bankAccount
    }, { status: 200 });
  } catch (err: any) {
    console.error(`Add checking account failed: ${err.message}`);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
