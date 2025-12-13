import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/authOptions';
import { connectToDatabase } from '../../../lib/mongodb';
import { RentalApplicationModel } from '../../../models/RentalApplication';
import { UserModel } from '../../../models/User';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      tenantId,
      listingName,
      listingType,
      status = 'pending',
      monthlyRent,
      leaseStartDate,
      leaseEndDate,
      adminNotes,
      enableAutoPay = false,
      paymentMethod = null,
    } = body;

    if (!tenantId || !listingName || !listingType) {
      return NextResponse.json(
        { error: 'Tenant ID, listing name, and listing type are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get tenant information
    const tenant = await UserModel.findById(tenantId);
    if (!tenant || tenant.userType !== 'tenant') {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if tenant already has an application
    const existingApp = await RentalApplicationModel.findOne({ 
      userEmail: tenant.email,
      isArchived: { $ne: true }
    });

    if (existingApp) {
      return NextResponse.json(
        { error: 'Tenant already has an active rental application' },
        { status: 400 }
      );
    }

    let achPaymentMethodId = null;
    let hasCheckingAccount = tenant.hasCheckingAccount || false;

    // Create bank account payment method if provided (for auto-pay)
    // Note: Cards cannot be created server-side due to PCI compliance - tenant must add via Stripe Elements
    if (paymentMethod && paymentMethod.type === 'bank_account' && tenant.stripeCustomerId) {
      try {
        // Create bank account token
        const token = await stripe.tokens.create({
          bank_account: {
            country: 'US',
            currency: 'usd',
            account_holder_name: paymentMethod.accountHolderName,
            account_holder_type: 'individual',
            routing_number: paymentMethod.routingNumber,
            account_number: paymentMethod.accountNumber,
          },
        });

        // Create payment method from token
        const pm = await stripe.paymentMethods.create({
          type: 'us_bank_account',
          us_bank_account: {
            account_holder_type: 'individual',
            routing_number: paymentMethod.routingNumber,
            account_number: paymentMethod.accountNumber,
          },
        });

        // Attach to customer
        await stripe.paymentMethods.attach(pm.id, {
          customer: tenant.stripeCustomerId,
        });

        // Set as default payment method
        await stripe.customers.update(tenant.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: pm.id,
          },
        });

        achPaymentMethodId = pm.id;
        hasCheckingAccount = true;

        // Update user record
        await UserModel.findByIdAndUpdate(tenantId, {
          hasCheckingAccount: true,
        });
      } catch (stripeError: any) {
        console.error('Stripe payment method creation error:', stripeError);
        return NextResponse.json(
          { error: `Failed to create payment method: ${stripeError.message}` },
          { status: 400 }
        );
      }
    }

    // Create rental application with tenant info
    const applicationData = {
      listingName,
      listingType,
      userEmail: tenant.email,
      userName: tenant.name,
      userPhone: tenant.phone || 'Not provided',
      employment: 'Manual entry - see admin notes',
      employer: 'Manual entry - see admin notes',
      monthlyIncome: '0',
      socialSecurityLastFour: 'N/A',
      referenceName: 'Manual entry',
      referencePhone: 'N/A',
      referenceRelation: 'N/A',
      moveInDate: leaseStartDate || new Date().toISOString(),
      additionalInfo: 'Application created manually by admin',
      status,
      paymentStatus: 'pending',
      applicationFee: 0, // Manual applications don't require application fee
      adminNotes: adminNotes || 'Application created manually by admin',
      monthlyRent,
      leaseStartDate,
      leaseEndDate,
      hasCheckingAccount,
      hasCreditCard: tenant.hasCreditCard || false,
      securityDepositPaid: tenant.securityDepositPaid || false,
      achPaymentMethodId,
    };

    const application = new RentalApplicationModel(applicationData);
    await application.save();

    return NextResponse.json({
      success: true,
      message: 'Rental application created successfully',
      applicationId: application._id.toString(),
      bankAccountAdded: achPaymentMethodId ? true : false,
    });

  } catch (error) {
    console.error('Error creating rental application:', error);
    return NextResponse.json(
      { error: 'Failed to create rental application' },
      { status: 500 }
    );
  }
}
