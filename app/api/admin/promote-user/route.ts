import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';

export async function POST(req: Request) {
  try {
    const { email, adminKey } = await req.json();
    
    // Simple security check - in production, use a proper authentication method
    if (adminKey !== process.env.ADMIN_SETUP_KEY) {
      return NextResponse.json({ error: 'Invalid admin key' }, { status: 403 });
    }
    
    await connectToDatabase();
    
    const user = await UserModel.findOneAndUpdate(
      { email },
      { role: 'admin' },
      { new: true }
    );
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: 'User promoted to admin successfully',
      user: { email: user.email, role: user.role }
    }, { status: 200 });
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    return NextResponse.json(
      { error: 'Failed to promote user to admin' },
      { status: 500 }
    );
  }
}