import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/authOptions';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';

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
    const { message } = body;

    if (!message || message.trim() === '') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Find the user
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create message object
    const messageObject = {
      message: message.trim(),
      sender: 'admin',
      senderName: adminUser.name || 'Admin',
      senderEmail: session.user.email,
      timestamp: new Date()
    };

    // Add message to user's verificationMessages array
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $push: { verificationMessages: messageObject } },
      { new: true }
    ).select('verificationMessages');

    return NextResponse.json(
      {
        message: 'Message sent successfully',
        messages: updatedUser?.verificationMessages || []
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error sending admin message:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    );
  }
}
