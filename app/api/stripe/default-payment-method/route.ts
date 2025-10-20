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

  try {
    const customer = await stripe.customers.retrieve(user.stripeCustomerId) as Stripe.Customer;
    
    let paymentMethod;
    let backupPaymentMethod;

    // Priority 1: Check for bank accounts (ACH) - this is the required default
    const bankAccounts = await stripe.customers.listSources(user.stripeCustomerId, {
      object: 'bank_account',
      limit: 1,
    });

    if (bankAccounts.data.length > 0) {
      const bankAccount = bankAccounts.data[0] as Stripe.BankAccount;
      // Bank account is the primary payment method
      paymentMethod = {
        id: bankAccount.id,
        type: 'bank_account',
        brand: bankAccount.bank_name || 'Bank Account',
        last4: bankAccount.last4,
        exp_month: null,
        exp_year: null,
      };
    }

    // Priority 2: Check for credit/debit cards (backup payment method)
    const cards = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
      limit: 1,
    });

    if (cards.data.length > 0) {
      const card = cards.data[0];
      backupPaymentMethod = {
        id: card.id,
        type: 'card',
        brand: card.card?.brand || 'Card',
        last4: card.card?.last4 || '****',
        exp_month: card.card?.exp_month || null,
        exp_year: card.card?.exp_year || null,
      };
    }

    // Return primary (bank) and backup (card) payment methods
    if (paymentMethod) {
      return NextResponse.json({ 
        paymentMethod,
        backupPaymentMethod: backupPaymentMethod || null
      });
    } else if (backupPaymentMethod) {
      // If only card exists (no bank account), return it as primary but indicate it's incomplete
      return NextResponse.json({ 
        paymentMethod: backupPaymentMethod,
        backupPaymentMethod: null,
        warning: 'Bank account required. Card will only be used as backup.'
      });
    } else {
      return NextResponse.json({ message: 'No payment method found' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Error fetching payment method:', error);
    return NextResponse.json({ message: error.message || 'Failed to fetch payment method' }, { status: 500 });
  }
}
