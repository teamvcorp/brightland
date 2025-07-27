// app/api/user/address/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ message: 'Email required' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const user = await UserModel.findOne({ email }).exec();
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ address: user.address || {} });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
