import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';

// GET all tenants
export async function GET(request: NextRequest) {
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

    // Fetch all tenants with relevant fields
    const tenants = await UserModel.find({ userType: 'tenant' })
      .select('_id name email phone selectedProperty address identityVerificationStatus securityDepositPaid securityDepositAmount securityDepositDate createdAt isVerified')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ 
      tenants: tenants.map(t => ({
        _id: t._id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        selectedProperty: t.selectedProperty,
        address: t.address,
        identityVerificationStatus: t.identityVerificationStatus,
        isVerified: t.isVerified,
        securityDepositPaid: t.securityDepositPaid,
        securityDepositAmount: t.securityDepositAmount,
        securityDepositDate: t.securityDepositDate,
        createdAt: t.createdAt
      }))
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenants', details: error.message },
      { status: 500 }
    );
  }
}
