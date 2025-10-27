import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ManagerRequestModel } from '@/models/ManagerRequest';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { StatusUpdateEmail } from '@/email/StatusUpdateEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { id } = await params;
    
    // Handle approval status updates (for property owners)
    if (body.approvalStatus) {
      const { approvalStatus, approvedBy, approvalDate } = body;
      
      if (!['approved', 'declined'].includes(approvalStatus)) {
        return NextResponse.json(
          { error: 'Invalid approval status' },
          { status: 400 }
        );
      }
      
      const request = await ManagerRequestModel.findById(id);
      if (!request) {
        return NextResponse.json(
          { error: 'Request not found' },
          { status: 404 }
        );
      }
      
      // Update approval fields
      const updatedRequest = await ManagerRequestModel.findByIdAndUpdate(
        id,
        { 
          approvalStatus,
          approvedBy,
          approvalDate: new Date(approvalDate)
        },
        { new: true }
      );
      
      return NextResponse.json({ request: updatedRequest }, { status: 200 });
    }
    
    // Handle status updates (for admins)
    const { status, adminNotes, finishedImageUrl } = body;
    
    if (!status || !['pending', 'working', 'finished', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status provided' },
        { status: 400 }
      );
    }
    
    const request = await ManagerRequestModel.findById(id);
    if (!request) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    const oldStatus = request.status;
    
    // Update the request
    const updatedRequest = await ManagerRequestModel.findByIdAndUpdate(
      id,
      { 
        status, 
        adminNotes: adminNotes || request.adminNotes,
        finishedImageUrl: finishedImageUrl !== undefined ? finishedImageUrl : request.finishedImageUrl
      },
      { new: true }
    );
    
    // Send notification email if status changed
    if (oldStatus !== status) {
      try {
        const emailHtml = await render(
          StatusUpdateEmail({
            fullname: request.fullname,
            address: request.address,
            projectDescription: request.projectDescription,
            oldStatus,
            newStatus: status,
            adminNotes: adminNotes || '',
            finishedImageUrl: finishedImageUrl || request.finishedImageUrl
          }),
          { pretty: true }
        );
        
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "admin@brightlandproperties.com",
          to: request.email,
          subject: `Update on your maintenance request for ${request.address}`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the request update if email fails
      }
    }
    
    return NextResponse.json({ request: updatedRequest }, { status: 200 });
  } catch (error) {
    console.error('Error updating manager request:', error);
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    );
  }
}