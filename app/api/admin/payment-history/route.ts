import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '../../auth/authOptions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/check-admin`, {
      headers: {
        cookie: `next-auth.session-token=${session}`,
      },
    });

    if (!adminResponse.ok) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get email from query params
    const url = new URL(req.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    // Find customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({ payments: [] });
    }

    const customerId = customers.data[0].id;

    // Fetch payment history for this customer
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 50,
    });

    const payments = charges.data.map(charge => ({
      id: charge.id,
      amount: charge.amount,
      status: charge.status,
      created: charge.created,
      description: charge.description || 'Payment',
      customerEmail: charge.billing_details?.email || email,
      customerName: charge.billing_details?.name || 'Unknown',
    }));

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment history' },
      { status: 500 }
    );
  }
}
