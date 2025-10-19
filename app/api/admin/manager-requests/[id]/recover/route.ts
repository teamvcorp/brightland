import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ManagerRequestModel } from '@/models/ManagerRequest';
import { getServerSession } from 'next-auth';
import authOptions from '../../../../auth/authOptions';

// POST - Recover a soft-deleted request
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
    
    const { id } = await params;
    
    const request = await ManagerRequestModel.findById(id);
    if (!request) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    if (!request.isDeleted) {
      return NextResponse.json(
        { error: 'Request is not marked for deletion' },
        { status: 400 }
      );
    }

    // Recover the request
    request.isDeleted = false;
    request.deletedAt = null;
    request.deletedBy = null;
    
    // Add to conversation log
    request.conversationLog = request.conversationLog || [];
    request.conversationLog.push({
      sender: 'admin' as const,
      senderName: session.user.name || 'Admin',
      senderEmail: session.user.email || '',
      message: 'Request recovered from deletion.',
      timestamp: new Date(),
      isInternal: true,
    });
    
    await request.save();
    
    return NextResponse.json({ 
      success: true,
      message: 'Request recovered successfully',
      request
    }, { status: 200 });
  } catch (error) {
    console.error('Error recovering request:', error);
    return NextResponse.json(
      { error: 'Failed to recover request' },
      { status: 500 }
    );
  }
}
