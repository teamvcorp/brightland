import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ManagerRequestModel } from '@/models/ManagerRequest';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    
    let filter = {};
    if (status && ['pending', 'working', 'finished', 'rejected'].includes(status)) {
      filter = { status };
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