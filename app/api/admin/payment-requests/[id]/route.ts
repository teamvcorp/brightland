import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/authOptions';
import { connectToDatabase } from '../../../../lib/mongodb';
import { PaymentRequestModel } from '../../../../models/PaymentRequest';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { status, paidAmount, paymentMethod, paymentNotes } = await request.json();
    const { id } = await params;

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'paid') {
        updateData.paidDate = new Date();
      }
    }
    if (paidAmount !== undefined) updateData.paidAmount = paidAmount;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    if (paymentNotes !== undefined) updateData.paymentNotes = paymentNotes;

    const updatedPaymentRequest = await PaymentRequestModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedPaymentRequest) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      paymentRequest: updatedPaymentRequest 
    });

  } catch (error) {
    console.error('Error updating payment request:', error);
    return NextResponse.json(
      { error: 'Failed to update payment request' },
      { status: 500 }
    );
  }
}
