import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/authOptions';
import { connectToDatabase } from '../../../../../lib/mongodb';
import { ManagerRequestModel } from '../../../../../models/ManagerRequest';
import { PaymentRequestModel } from '../../../../../models/PaymentRequest';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { PaymentRequestEmail } from '../../../../../email/PaymentRequestEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin status
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

    const { actualCost, amountToBill } = await request.json();
    const { id } = await params;

    // Validate inputs
    if (actualCost !== null && actualCost !== undefined && (isNaN(actualCost) || actualCost < 0)) {
      return NextResponse.json({ error: 'Invalid actual cost' }, { status: 400 });
    }

    if (amountToBill !== null && amountToBill !== undefined && (isNaN(amountToBill) || amountToBill < 0)) {
      return NextResponse.json({ error: 'Invalid amount to bill' }, { status: 400 });
    }

    // Update the request
    const updateData: any = {};
    if (actualCost !== undefined) updateData.actualCost = actualCost;
    if (amountToBill !== undefined) updateData.amountToBill = amountToBill;

    const updatedRequest = await ManagerRequestModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // If amountToBill is set and this is a property owner request, create payment request and send email
    if (amountToBill !== null && amountToBill !== undefined && amountToBill > 0) {
      const isPropertyOwnerRequest = updatedRequest.userType === 'property-owner' || updatedRequest.userType === 'home-owner';
      
      if (isPropertyOwnerRequest && updatedRequest.propertyName) {
        try {
          // Check if payment request already exists for this maintenance request
          const existingPaymentRequest = await PaymentRequestModel.findOne({ 
            managerRequestId: id 
          });

          let paymentRequest;
          if (existingPaymentRequest) {
            // Update existing payment request
            paymentRequest = await PaymentRequestModel.findByIdAndUpdate(
              existingPaymentRequest._id,
              {
                amount: amountToBill,
                actualCost: actualCost,
                proposedBudget: updatedRequest.proposedBudget,
                status: 'pending',
              },
              { new: true }
            );
            console.log('Updated existing payment request:', paymentRequest._id);
          } else {
            // Create new payment request
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30); // 30 days from now

            paymentRequest = await PaymentRequestModel.create({
              managerRequestId: id,
              propertyName: updatedRequest.propertyName,
              propertyOwnerEmail: updatedRequest.email,
              propertyOwnerName: updatedRequest.fullname,
              amount: amountToBill,
              actualCost: actualCost,
              proposedBudget: updatedRequest.proposedBudget,
              description: updatedRequest.projectDescription,
              status: 'pending',
              dueDate: dueDate,
              createdBy: session.user.email,
            });
            console.log('Created new payment request:', paymentRequest._id);
          }

          // Send email notification to property owner
          try {
            const emailHtml = await render(
              PaymentRequestEmail({
                propertyOwnerName: updatedRequest.fullname,
                propertyName: updatedRequest.propertyName,
                projectDescription: updatedRequest.projectDescription,
                proposedBudget: updatedRequest.proposedBudget,
                actualCost: actualCost,
                amountToBill: amountToBill,
                dueDate: paymentRequest.dueDate,
              }),
              { pretty: true }
            );

            const { data: emailData, error: emailError } = await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || 'billing@brightland.com',
              to: [updatedRequest.email, session.user.email], // Send to property owner and admin
              subject: `Payment Request: ${updatedRequest.propertyName} - $${amountToBill.toFixed(2)}`,
              html: emailHtml,
            });

            if (emailError) {
              console.error('Failed to send payment request email:', emailError);
              // Don't fail the request if email fails
            } else {
              console.log('Payment request email sent successfully to:', updatedRequest.email);
            }
          } catch (emailError) {
            console.error('Error sending payment request email:', emailError);
            // Don't fail the request if email fails
          }

        } catch (paymentError) {
          console.error('Error creating payment request:', paymentError);
          // Don't fail the cost update if payment request fails
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      request: updatedRequest 
    });

  } catch (error) {
    console.error('Error updating request costs:', error);
    return NextResponse.json(
      { error: 'Failed to update request costs' },
      { status: 500 }
    );
  }
}
