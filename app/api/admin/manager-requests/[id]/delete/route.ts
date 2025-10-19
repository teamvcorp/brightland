import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ManagerRequestModel } from '@/models/ManagerRequest';
import { getServerSession } from 'next-auth';
import authOptions from '../../../../auth/authOptions';

// POST - Soft delete a request (mark for deletion)
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

    if (request.isDeleted) {
      return NextResponse.json(
        { error: 'Request is already marked for deletion' },
        { status: 400 }
      );
    }

    // Soft delete - mark for deletion
    request.isDeleted = true;
    request.deletedAt = new Date();
    request.deletedBy = session.user.email || '';
    
    // Add to conversation log
    request.conversationLog = request.conversationLog || [];
    request.conversationLog.push({
      sender: 'admin' as const,
      senderName: session.user.name || 'Admin',
      senderEmail: session.user.email || '',
      message: `Request marked for deletion. Will be permanently removed on ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}.`,
      timestamp: new Date(),
      isInternal: true,
    });
    
    await request.save();
    
    return NextResponse.json({ 
      success: true,
      message: 'Request marked for deletion. It will be permanently removed in 14 days.',
      deletedAt: request.deletedAt
    }, { status: 200 });
  } catch (error) {
    console.error('Error soft deleting request:', error);
    return NextResponse.json(
      { error: 'Failed to delete request' },
      { status: 500 }
    );
  }
}

// DELETE - Permanently delete a request (immediate, bypasses 14-day wait)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    
    const request = await ManagerRequestModel.findByIdAndDelete(id);
    if (!request) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Request permanently deleted'
    }, { status: 200 });
  } catch (error) {
    console.error('Error permanently deleting request:', error);
    return NextResponse.json(
      { error: 'Failed to delete request' },
      { status: 500 }
    );
  }
}
