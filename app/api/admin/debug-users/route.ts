import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const adminUser = await UserModel.findOne({ email: session.user.email });
    
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get ALL users to debug
    const allUsers = await UserModel.find({})
      .select('_id name email role userType propertyOwnerName propertyOwnerVerificationStatus')
      .lean();

    return NextResponse.json({ 
      totalUsers: allUsers.length,
      users: allUsers.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        userType: u.userType,
        propertyOwnerName: u.propertyOwnerName,
        verificationStatus: u.propertyOwnerVerificationStatus
      }))
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}
