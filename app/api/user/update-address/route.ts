import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import { addressSchema } from '@/lib/validators/address';

export async function POST(req: Request) {
  const { email, address } = await req.json();

  if (!email) {
    return NextResponse.json({ message: 'Email is required' }, { status: 400 });
  }

  const validation = addressSchema.safeParse(address);
  if (!validation.success) {
    const errorMessages = validation.error.issues.map(e => e.message);
    return NextResponse.json({ message: 'Validation failed', errors: errorMessages }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const result = await UserModel.updateOne({ email }, { $set: { address: validation.data } });

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Address updated' });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
