import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ManagerRequestModel } from '@/models/ManagerRequest';

/**
 * Cleanup endpoint to permanently delete requests marked for deletion > 14 days ago
 * This should be called by a cron job or scheduled task
 * URL: /api/admin/manager-requests/cleanup
 */
export async function POST(req: Request) {
  try {
    // Optional: Add authentication or secret token for security
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-secret-change-in-production';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    
    // Calculate date 14 days ago
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    // Find all requests marked for deletion more than 14 days ago
    const expiredRequests = await ManagerRequestModel.find({
      isDeleted: true,
      deletedAt: { $lte: fourteenDaysAgo }
    });

    console.log(`Found ${expiredRequests.length} requests eligible for permanent deletion`);
    
    // Delete them permanently
    const result = await ManagerRequestModel.deleteMany({
      isDeleted: true,
      deletedAt: { $lte: fourteenDaysAgo }
    });

    return NextResponse.json({ 
      success: true,
      message: `Permanently deleted ${result.deletedCount} expired requests`,
      deletedCount: result.deletedCount,
      deletedRequests: expiredRequests.map(r => ({
        id: r._id,
        address: r.address,
        deletedAt: r.deletedAt,
        deletedBy: r.deletedBy
      }))
    }, { status: 200 });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup expired requests' },
      { status: 500 }
    );
  }
}

// GET endpoint to preview what would be deleted (for testing)
export async function GET() {
  try {
    await connectToDatabase();
    
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const expiredRequests = await ManagerRequestModel.find({
      isDeleted: true,
      deletedAt: { $lte: fourteenDaysAgo }
    }).lean();

    return NextResponse.json({ 
      count: expiredRequests.length,
      expiredRequests: expiredRequests.map(r => ({
        id: r._id,
        address: r.address,
        deletedAt: r.deletedAt,
        deletedBy: r.deletedBy,
        daysDeleted: Math.floor((Date.now() - new Date(r.deletedAt || 0).getTime()) / (1000 * 60 * 60 * 24))
      }))
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching expired requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expired requests' },
      { status: 500 }
    );
  }
}
