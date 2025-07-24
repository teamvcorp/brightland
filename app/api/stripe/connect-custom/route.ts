import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import bcrypt from 'bcrypt';
import { connectToDatabase } from '../../../lib/mongodb';
import { User } from '../../../models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2020-08-27',
});

export async function POST(req: Request) {
  const { name, email, dob, ssnLast4, bankAccountNumber, routingNumber, password } = await req.json();

  if (!name || !email || !dob || !ssnLast4 || !bankAccountNumber || !routingNumber) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.stripeAccountId) {
      return NextResponse.json({ message: 'User already has a Stripe account' }, { status: 400 });
    }

    // Create a Custom Connect account
    const account = await stripe.accounts.create({
      type: 'custom',
      country: 'US',
      email,
      individual: {
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || 'Unknown',
        dob: {
          day: parseInt(dob.split('-')[2]),
          month: parseInt(dob.split('-')[1]),
          year: parseInt(dob.split('-')[0]),
        },
        ssn_last_4: ssnLast4,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Create a bank account for payouts
    const bankAccount = await stripe.accounts.createExternalAccount(account.id, {
      external_account: {
        object: 'bank_account',
        country: 'US',
        currency: 'usd',
        account_number: bankAccountNumber,
        routing_number: routingNumber,
      },
    });

    // Hash password if provided (for Credentials users)
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    // Create or update user in MongoDB
    if (existingUser) {
      await User.updateOne(
        { email },
        {
          name,
          stripeAccountId: account.id,
          externalAccountId: bankAccount.id,
          last4: (bankAccount as Stripe.BankAccount).last4,
          ssnLast4, // Store securely (consider encryption)
          dob,
          password: hashedPassword,
          isVerified: true, // Verified after Stripe onboarding
        }
      );
    } else {
      await User.create({
        name,
        email,
        password: hashedPassword,
        stripeAccountId: account.id,
        externalAccountId: bankAccount.id,
        last4: (bankAccount as Stripe.BankAccount).last4,
        ssnLast4, // Store securely
        dob,
        isVerified: true, // Verified after Stripe onboarding
      });
    }

    return NextResponse.json({ accountId: account.id }, { status: 200 });
  } catch (err: any) {
    console.error(`Failed to create Custom Connect account: ${err.message}`);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}