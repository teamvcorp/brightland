import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ManagerRequestModel } from '@/models/ManagerRequest';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const showDeleted = url.searchParams.get('deleted') === 'true';
    
    let filter: any = {};
    
    // If showing deleted items
    if (showDeleted) {
      filter.isDeleted = true;
    } else {
      // By default, exclude soft-deleted items
      filter.isDeleted = { $ne: true };
    }
    
    // Add status filter if provided
    if (status && ['pending', 'working', 'finished', 'rejected'].includes(status)) {
      filter.status = status;
    }
    
    const requests = await ManagerRequestModel.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    
    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    console.error('Error fetching manager requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}