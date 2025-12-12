import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    await connectToDatabase();
    const adminUser = await UserModel.findOne({ email: session.user.email });
    
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { tenantId, amount } = body;

    if (!tenantId) {
      return NextResponse.json({ 
        error: 'Tenant ID is required' 
      }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ 
        error: 'Valid deposit amount is required' 
      }, { status: 400 });
    }

    // Find the tenant
    const tenant = await UserModel.findById(tenantId);
    
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (tenant.userType !== 'tenant') {
      return NextResponse.json({ error: 'User is not a tenant' }, { status: 400 });
    }

    // Update security deposit fields
    tenant.securityDepositPaid = true;
    tenant.securityDepositAmount = amount;
    tenant.securityDepositDate = new Date();
    tenant.securityDepositIntentId = 'CASH_PAYMENT'; // Mark as cash payment
    await tenant.save();

    console.log(`Cash deposit marked for tenant: ${tenant.email}, amount: $${amount}`);

    return NextResponse.json(
      {
        message: 'Security deposit marked as collected',
        tenant: {
          _id: tenant._id,
          name: tenant.name,
          email: tenant.email,
          securityDepositPaid: tenant.securityDepositPaid,
          securityDepositAmount: tenant.securityDepositAmount,
          securityDepositDate: tenant.securityDepositDate
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error marking deposit collected:', error);
    return NextResponse.json(
      { error: 'Failed to mark deposit collected', details: error.message },
      { status: 500 }
    );
  }
}
