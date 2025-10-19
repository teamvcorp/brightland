import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ManagerRequestModel, ConversationMessage } from '@/models/ManagerRequest';
import { getServerSession } from 'next-auth';
import authOptions from '../../../../auth/authOptions';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// POST - Add a message to the conversation log
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    
    const { message, isInternal } = await req.json();
    const { id } = await params;
    
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
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

    // Add message to conversation log
    const conversationMessage = {
      sender: 'admin' as const,
      senderName: session.user.name || 'Admin',
      senderEmail: session.user.email || '',
      message: message.trim(),
      timestamp: new Date(),
      isInternal: isInternal || false,
    };

    request.conversationLog = request.conversationLog || [];
    request.conversationLog.push(conversationMessage);
    await request.save();

    // If not internal, send email to the requester
    if (!isInternal) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@fyht4.com',
          to: request.email,
          subject: `Message about your maintenance request - ${request.address}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Message from Brightland Admin</h2>
              <p>Hi ${request.fullname},</p>
              <p>An admin has sent you a message regarding your maintenance request for <strong>${request.address}</strong>:</p>
              <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0; white-space: pre-wrap;">${message.trim()}</p>
              </div>
              <p><strong>Project Description:</strong> ${request.projectDescription}</p>
              <p><strong>Current Status:</strong> ${request.status}</p>
              <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                This is an automated message from Brightland Rentals. Please do not reply to this email.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send conversation email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      conversationLog: request.conversationLog 
    }, { status: 200 });
  } catch (error) {
    console.error('Error adding conversation message:', error);
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}

// GET - Get conversation log for a request
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    
    const { id } = await params;
    const request = await ManagerRequestModel.findById(id);
    
    if (!request) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Non-admins can only view their own requests
    if (session.user.role !== 'admin' && request.email !== session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Filter out internal notes for non-admins
    let conversationLog = request.conversationLog || [];
    if (session.user.role !== 'admin') {
      conversationLog = conversationLog.filter((msg: ConversationMessage) => !msg.isInternal);
    }
    
    return NextResponse.json({ 
      conversationLog 
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching conversation log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}
