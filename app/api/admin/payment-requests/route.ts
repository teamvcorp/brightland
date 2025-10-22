import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';
import { connectToDatabase } from '../../../lib/mongodb';
import { PaymentRequestModel } from '../../../models/PaymentRequest';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminCheckResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/check-admin`,
      {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }
    );
    
    const adminCheck = await adminCheckResponse.json();
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const propertyOwnerEmail = searchParams.get('email');

    let query: any = {};
    if (status) query.status = status;
    if (propertyOwnerEmail) query.propertyOwnerEmail = propertyOwnerEmail;

    const paymentRequests = await PaymentRequestModel.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ 
      success: true, 
      paymentRequests 
    });

  } catch (error) {
    console.error('Error fetching payment requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment requests' },
      { status: 500 }
    );
  }
}
