import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/authOptions';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: userId } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim() === '') {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    // Find the user to reject
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.userType !== 'property-owner') {
      return NextResponse.json({ error: 'User is not a property owner' }, { status: 400 });
    }

    if (user.propertyOwnerVerificationStatus !== 'pending') {
      return NextResponse.json({ error: 'User is not pending verification' }, { status: 400 });
    }

    // Send rejection email
    try {
      await resend.emails.send({
        from: 'Brightland Properties <noreply@brightlandproperties.com>',
        to: [user.email],
        subject: 'Property Owner Application Status',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Property Owner Application Update</h2>
            <p>Dear ${user.name},</p>
            <p>Thank you for your interest in becoming a property owner with Brightland Properties.</p>
            <p>After reviewing your application, we are unable to approve your property owner account at this time.</p>
            <div style="background-color: #fee; border-left: 4px solid #dc2626; padding: 12px; margin: 20px 0;">
              <strong>Reason:</strong><br/>
              ${reason}
            </div>
            <p>If you have any questions or would like to discuss this decision, please contact us at support@brightlandproperties.com.</p>
            <p>Thank you for your understanding.</p>
            <p style="margin-top: 30px;">
              Best regards,<br/>
              <strong>Brightland Properties Team</strong>
            </p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError);
      // Continue with deletion even if email fails
    }

    // Delete the user account
    await UserModel.findByIdAndDelete(userId);

    return NextResponse.json(
      {
        message: 'Property owner application rejected and user account deleted',
        userName: user.name,
        userEmail: user.email
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error rejecting property owner:', error);
    return NextResponse.json(
      { error: 'Failed to reject property owner', details: error.message },
      { status: 500 }
    );
  }
}
