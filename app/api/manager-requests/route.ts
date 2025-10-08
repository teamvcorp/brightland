import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ManagerRequestModel } from '@/models/ManagerRequest';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/authOptions';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Fetch requests based on user type and role
    let query = {};
    
    // Admins see all requests
    if (session.user.role === 'admin') {
      query = {};
    } 
    // Property owners and tenants see only their own requests
    else {
      query = { email: session.user.email };
    }
    
    const requests = await ManagerRequestModel.find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error('Error fetching manager requests:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}