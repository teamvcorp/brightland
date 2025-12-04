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

    // Check if user is admin
    await connectToDatabase();
    const adminUser = await UserModel.findOne({ email: session.user.email });
    
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Debug: Check all property owner users
    const allPropertyOwners = await UserModel.find({ userType: 'property-owner' })
      .select('_id name email propertyOwnerName propertyOwnerVerificationStatus')
      .lean();
    
    console.log('All property owner users:', allPropertyOwners.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      propertyOwnerName: u.propertyOwnerName,
      status: u.propertyOwnerVerificationStatus || 'MISSING STATUS FIELD'
    })));

    // Fetch pending users - also match users where status is undefined/null
    const pendingUsers = await UserModel.find({
      userType: 'property-owner',
      $or: [
        { propertyOwnerVerificationStatus: 'pending' },
        { propertyOwnerVerificationStatus: { $exists: false } },
        { propertyOwnerVerificationStatus: null }
      ]
    })
      .select('_id name email propertyOwnerName propertyOwnerVerificationStatus verificationMessages verificationDocuments createdAt')
      .sort({ createdAt: -1 })
      .lean();

    console.log('Pending property owners query result:', {
      count: pendingUsers.length,
      users: pendingUsers.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        propertyOwnerName: u.propertyOwnerName,
        status: u.propertyOwnerVerificationStatus,
        documentsCount: u.verificationDocuments?.length || 0,
        documents: u.verificationDocuments,
        messagesCount: u.verificationMessages?.length || 0
      }))
    });

    return NextResponse.json({ pendingUsers }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching pending property owners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending property owners', details: error.message },
      { status: 500 }
    );
  }
}
