import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '../../auth/authOptions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function GET() {
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

    // Calculate date ranges
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfMonthTimestamp = Math.floor(firstDayOfMonth.getTime() / 1000);

    // Fetch all successful payments
    const allPayments = await stripe.charges.list({
      limit: 100,
    });

    // Calculate total revenue (all time)
    const totalRevenue = allPayments.data
      .filter(charge => charge.status === 'succeeded')
      .reduce((sum, charge) => sum + charge.amount, 0) / 100;

    // Calculate monthly revenue (current month)
    const monthlyRevenue = allPayments.data
      .filter(charge => 
        charge.status === 'succeeded' && 
        charge.created >= firstDayOfMonthTimestamp
      )
      .reduce((sum, charge) => sum + charge.amount, 0) / 100;

    return NextResponse.json({
      totalRevenue,
      monthlyRevenue,
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment stats' },
      { status: 500 }
    );
  }
}
