import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/authOptions';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { message, sender } = await req.json();

    await connectToDatabase();
    
    const user = await UserModel.findOneAndUpdate(
      { email: session.user.email },
      {
        $push: {
          verificationMessages: {
            message,
            sender,
            senderName: session.user.name,
            senderEmail: session.user.email,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    ).exec();

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Message sent successfully',
      messages: user.verificationMessages
    });
  } catch (error: any) {
    console.error('Error sending verification message:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
