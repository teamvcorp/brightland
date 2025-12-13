import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/authOptions';
import { connectToDatabase } from '../../../lib/mongodb';
import { RentalApplicationModel } from '../../../models/RentalApplication';
import { UserModel } from '../../../models/User';

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
      hasCheckingAccount: tenant.hasCheckingAccount || false,
      hasCreditCard: tenant.hasCreditCard || false,
      securityDepositPaid: tenant.securityDepositPaid || false,
    };

    const application = new RentalApplicationModel(applicationData);
    await application.save();

    return NextResponse.json({
      success: true,
      message: 'Rental application created successfully',
      applicationId: application._id.toString(),
    });

  } catch (error) {
    console.error('Error creating rental application:', error);
    return NextResponse.json(
      { error: 'Failed to create rental application' },
      { status: 500 }
    );
  }
}
