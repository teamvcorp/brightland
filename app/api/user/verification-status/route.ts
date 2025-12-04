import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';
import { User } from '@/types/user';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const user = await UserModel.findOne({ email: session.user.email }).lean().exec() as User | null;
    
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      propertyOwnerVerificationStatus: user.propertyOwnerVerificationStatus,
      propertyOwnerName: user.propertyOwnerName,
      propertyOwnerVerifiedBy: user.propertyOwnerVerifiedBy,
      propertyOwnerVerifiedAt: user.propertyOwnerVerifiedAt,
      propertyOwnerRejectedReason: user.propertyOwnerRejectedReason,
      verificationMessages: user.verificationMessages || [],
      verificationDocuments: user.verificationDocuments || [],
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    console.error('Error fetching verification status:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
