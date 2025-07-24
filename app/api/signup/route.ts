import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ message: 'Name, email, and password are required' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const existingUser = await UserModel.findOne({ email }).exec();
    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      isVerified: false,
      identityVerificationStatus: 'pending',
    });

    return NextResponse.json({ message: 'User created successfully', userId: user._id.toString() }, { status: 201 });
  } catch (err: any) {
    console.error(`Signup failed: ${err.message}`);
    return NextResponse.json({ message: `Internal Server Error: ${err.message}` }, { status: 500 });
  }
}