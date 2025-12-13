import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/authOptions';
import { connectToDatabase } from '../../../lib/mongodb';
import { RentalApplicationModel } from '../../../models/RentalApplication';

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      applicationId,
      status,
      monthlyRent,
      leaseStartDate,
      leaseEndDate,
      adminNotes,
    } = body;

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    if (!status || !['pending', 'approved', 'denied'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (pending, approved, or denied)' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Build update object
    const updateObj: any = {
      status,
    };

    if (adminNotes !== undefined) {
      updateObj.adminNotes = adminNotes;
    }

    // If approving, add lease information if provided
    if (status === 'approved') {
      if (monthlyRent) updateObj.monthlyRent = monthlyRent;
      if (leaseStartDate) updateObj.leaseStartDate = new Date(leaseStartDate);
      if (leaseEndDate) updateObj.leaseEndDate = new Date(leaseEndDate);
      
      // Calculate first payment if we have rent and start date
      if (monthlyRent && leaseStartDate) {
        const startDate = new Date(leaseStartDate);
        const dayOfMonth = startDate.getDate();
        
        // If starting mid-month (after day 5), prorate
        if (dayOfMonth > 5) {
          const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
          const daysRemaining = daysInMonth - dayOfMonth + 1;
          const proratedAmount = (monthlyRent / daysInMonth) * daysRemaining;
          
          updateObj.firstPaymentAmount = Math.round(proratedAmount * 100) / 100;
          updateObj.isProrated = true;
          updateObj.firstPaymentDue = startDate;
        } else {
          updateObj.firstPaymentAmount = monthlyRent;
          updateObj.isProrated = false;
          updateObj.firstPaymentDue = startDate;
        }
      }
    }

    const application = await RentalApplicationModel.findByIdAndUpdate(
      applicationId,
      updateObj,
      { new: true }
    );

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Application status updated successfully',
      application,
    });

  } catch (error) {
    console.error('Error updating application status:', error);
    return NextResponse.json(
      { error: 'Failed to update application status' },
      { status: 500 }
    );
  }
}
