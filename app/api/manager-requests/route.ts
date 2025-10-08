import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ManagerRequestModel } from '@/models/ManagerRequest';
import { PropertyOwnerModel, PropertyOwner } from '@/models/PropertyOwner';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/authOptions';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('Manager requests API - Session user:', {
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      userType: session.user.userType
    });

    await connectToDatabase();
    
    // Fetch requests based on user type and role
    let query = {};
    
    // Admins see all requests
    if (session.user.role === 'admin') {
      query = {};
      console.log('Admin user - showing all requests');
    } 
    // Property owners see only requests submitted by them (by email)
    else if (session.user.userType === 'property-owner') {
      // Simple email-based filtering - property owners see requests they submitted
      query = { email: session.user.email };
      console.log('Property owner filtering by email:', session.user.email);
    }
    // Regular tenants see only their own requests
    else {
      query = { email: session.user.email };
      console.log('Tenant user - filtering by email:', session.user.email);
    }
    
    const requests = await ManagerRequestModel.find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    console.log('Found requests:', requests.length, 'with query:', JSON.stringify(query));
    console.log('Request details:', requests.map(r => ({ 
      email: r.email, 
      address: r.address, 
      description: r.projectDescription 
    })));

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error('Error fetching manager requests:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}