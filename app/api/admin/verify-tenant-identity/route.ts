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
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ 
        error: 'Tenant ID is required' 
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

    // Update identity verification status
    tenant.identityVerificationStatus = 'verified';
    tenant.isVerified = true;
    await tenant.save();

    console.log(`Tenant identity verified by admin: ${tenant.email}`);

    return NextResponse.json(
      {
        message: 'Tenant identity verified successfully',
        tenant: {
          _id: tenant._id,
          name: tenant.name,
          email: tenant.email,
          identityVerificationStatus: tenant.identityVerificationStatus,
          isVerified: tenant.isVerified
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error verifying tenant identity:', error);
    return NextResponse.json(
      { error: 'Failed to verify tenant identity', details: error.message },
      { status: 500 }
    );
  }
}
