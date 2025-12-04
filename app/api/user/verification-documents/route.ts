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

    const { documentUrl } = await req.json();

    console.log('Adding verification document:', {
      email: session.user.email,
      documentUrl
    });

    await connectToDatabase();
    
    const user = await UserModel.findOneAndUpdate(
      { email: session.user.email },
      {
        $push: {
          verificationDocuments: documentUrl
        }
      },
      { new: true }
    ).exec();

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    console.log('Document added successfully:', {
      email: user.email,
      totalDocuments: user.verificationDocuments?.length || 0,
      documents: user.verificationDocuments
    });

    return NextResponse.json({
      message: 'Document added successfully',
      documents: user.verificationDocuments
    });
  } catch (error: any) {
    console.error('Error adding verification document:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
