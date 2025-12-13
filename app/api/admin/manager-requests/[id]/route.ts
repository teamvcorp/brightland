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
      
      // Send notification email to admin about property owner's decision
      try {
        const React = await import('react');
        const { Html, Head, Body, Container, Section, Heading, Text } = await import('@react-email/components');
        
        const ApprovalNotificationEmail = () => React.createElement(Html, {},
          React.createElement(Head, {}),
          React.createElement(Body, { style: { fontFamily: 'Arial, sans-serif', color: '#333' } },
            React.createElement(Container, { style: { maxWidth: '600px', padding: '20px' } },
              React.createElement(Section, { 
                style: { 
                  background: approvalStatus === 'approved' ? '#d4edda' : '#f8d7da', 
                  padding: '15px', 
                  borderRadius: '5px',
                  border: `2px solid ${approvalStatus === 'approved' ? '#28a745' : '#dc3545'}`,
                  marginBottom: '15px'
                }
              },
                React.createElement(Heading, { style: { color: approvalStatus === 'approved' ? '#155724' : '#721c24', margin: 0 } },
                  approvalStatus === 'approved' ? '✅ Repair Request Approved' : '❌ Repair Request Declined'
                ),
                React.createElement(Text, { style: { margin: '10px 0 0 0' } },
                  `Property owner ${approvedBy} has ${approvalStatus === 'approved' ? 'approved' : 'declined'} the repair request.`
                )
              ),
              React.createElement(Section, { style: { padding: '20px', border: '1px solid #ddd', borderRadius: '5px' } },
                React.createElement(Text, { style: { margin: '5px 0' } }, `Property: ${request.address}`),
                React.createElement(Text, { style: { margin: '5px 0' } }, `Issue: ${request.projectDescription}`),
                React.createElement(Text, { style: { margin: '5px 0' } }, `Details: ${request.message}`),
                request.proposedBudget && React.createElement(Text, { style: { margin: '5px 0' } }, `Budget: $${request.proposedBudget.toFixed(2)}`),
                React.createElement(Text, { style: { margin: '5px 0' } }, `Decision by: ${approvedBy}`),
                React.createElement(Text, { style: { margin: '5px 0' } }, `Decision date: ${new Date(approvalDate).toLocaleDateString()}`)
              ),
              React.createElement(Text, { style: { textAlign: 'center', fontSize: '12px', color: '#777', marginTop: '20px' } },
                'Brightland Properties Maintenance System'
              )
            )
          )
        );
        
        const emailHtml = await render(React.createElement(ApprovalNotificationEmail), { pretty: true });
        
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "admin@brightlandproperties.com",
          to: process.env.RESEND_TO_EMAIL || "admin@brightlandproperties.com",
          subject: `${approvalStatus === 'approved' ? '✅' : '❌'} Repair Request ${approvalStatus === 'approved' ? 'Approved' : 'Declined'} - ${request.address}`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error('Failed to send admin notification email:', emailError);
        // Don't fail the approval update if email fails
      }
      
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