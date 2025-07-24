import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import  authOptions  from '../../api/auth/authOptions';
import { connectToDatabase } from '../../lib/mongodb';
import { UserModel } from '../../models/User';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const user = await UserModel.findOne({ email: session.user.email }).exec();
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ current40Percent: user.current40Percent || 0 }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}