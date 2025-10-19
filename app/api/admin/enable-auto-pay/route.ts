import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../api/auth/authOptions';
import Stripe from 'stripe';
import { connectToDatabase } from '../../../lib/mongodb';
import { RentalApplicationModel } from '../../../models/RentalApplication';
import { UserModel } from '../../../models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-06-30.basil' as any,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is admin
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      applicationId, 
      monthlyRent, 
      leaseStartDate, 
      leaseEndDate,
      firstPaymentAmount,
      isProrated
    } = body;

    // Validate required fields
    if (!applicationId || !monthlyRent || !leaseStartDate || !leaseEndDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get rental application
    const application = await RentalApplicationModel.findById(applicationId);
    if (!application) {
      return NextResponse.json(
        { error: 'Rental application not found' },
        { status: 404 }
      );
    }

    // Validate payment setup status
    if (!application.hasCheckingAccount) {
      return NextResponse.json(
        { error: 'Tenant has not added a checking account' },
        { status: 400 }
      );
    }

    if (!application.hasCreditCard) {
      return NextResponse.json(
        { error: 'Tenant has not added a credit card' },
        { status: 400 }
      );
    }

    if (!application.securityDepositPaid) {
      return NextResponse.json(
        { error: 'Security deposit has not been paid' },
        { status: 400 }
      );
    }

    if (application.autoPayEnabled) {
      return NextResponse.json(
        { error: 'Auto-pay is already enabled for this application' },
        { status: 400 }
      );
    }

    // Get user for Stripe customer ID and payment method
    const user = await UserModel.findOne({ email: application.userEmail });
    if (!user || !user.stripeCustomerId || !user.achPaymentMethodId) {
      return NextResponse.json(
        { error: 'User not found or missing payment information' },
        { status: 404 }
      );
    }

    // Calculate first billing date
    const startDate = new Date(leaseStartDate);
    const now = new Date();
    let firstBillingDate: Date;
    let subscriptionStartDate: Date;
    
    // Determine when the first full rent payment should occur
    if (isProrated && startDate.getDate() !== 1) {
      // If prorated, first full rent payment is on the 1st of next month
      firstBillingDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
    } else {
      // If starting on the 1st, first payment is on that date
      firstBillingDate = startDate;
    }

    // If the first billing date is in the past or today, start immediately
    // Otherwise, we need to schedule it for the future
    if (firstBillingDate <= now) {
      subscriptionStartDate = now;
    } else {
      subscriptionStartDate = firstBillingDate;
    }

    // First, create a product for the rent
    const product = await stripe.products.create({
      name: `Monthly Rent - ${application.listingName}`,
      description: `Recurring monthly rent payment for ${application.listingName}`,
    });

    // Create a price for the product
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: Math.round(monthlyRent * 100), // Convert to cents
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
    });

    // Prepare subscription parameters
    const subscriptionParams: any = {
      customer: user.stripeCustomerId,
      default_payment_method: user.achPaymentMethodId,
      items: [
        {
          price: price.id,
        },
      ],
      proration_behavior: 'none',
      collection_method: 'charge_automatically',
      metadata: {
        rentalApplicationId: applicationId,
        propertyName: application.listingName,
        propertyId: application.propertyId || '',
        leaseStartDate: leaseStartDate,
        leaseEndDate: leaseEndDate,
      },
    };

    // Only set billing_cycle_anchor if it's in the past or immediate
    // For future dates, use backdate_start_date instead
    if (subscriptionStartDate <= now) {
      // Start immediately, anchor to the 1st of each month
      subscriptionParams.billing_cycle_anchor = Math.floor(firstBillingDate.getTime() / 1000);
    } else {
      // For future start dates, use trial until start date
      // Stripe doesn't allow billing_cycle_anchor in the future beyond 1 renewal period
      // So we start the subscription now but with a trial until the first billing date
      const trialEnd = Math.floor(firstBillingDate.getTime() / 1000);
      subscriptionParams.trial_end = trialEnd;
    }

    // Create Stripe subscription for monthly rent
    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Calculate next payment date
    // If subscription has trial, next payment is when trial ends
    // Otherwise, it's 1 month from the billing cycle anchor
    let nextPaymentDate: Date;
    if (subscription.trial_end) {
      nextPaymentDate = new Date(subscription.trial_end * 1000);
    } else {
      nextPaymentDate = new Date(firstBillingDate);
      if (firstBillingDate <= now) {
        // If first billing was immediate, next payment is 1 month from now
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      }
    }

    // Update rental application with subscription info
    await RentalApplicationModel.findByIdAndUpdate(
      applicationId,
      {
        autoPayEnabled: true,
        stripeSubscriptionId: subscription.id,
        nextPaymentDate: nextPaymentDate.toISOString(),
        rentPaymentStatus: 'current',
        monthlyRent,
        leaseStartDate,
        leaseEndDate,
        firstPaymentAmount,
        isProrated,
      }
    );

    // TODO: Update property status to "rented" if needed
    // This would require access to PropertyOwner model

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      message: 'Auto-pay enabled successfully',
      nextPaymentDate: nextPaymentDate.toISOString(),
    });

  } catch (error: any) {
    console.error('Error enabling auto-pay:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enable auto-pay' },
      { status: 500 }
    );
  }
}
