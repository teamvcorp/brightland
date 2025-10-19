import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { PaymentModel } from '@/models/Payment';
import authOptions from '../../auth/authOptions';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email || email !== session.user.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    // Fetch all payments for this user, sorted by due date (most recent first)
    const payments = await PaymentModel
      .find({ userEmail: email })
      .sort({ dueDate: -1 })
      .lean();

    return NextResponse.json({ 
      success: true,
      payments 
    }, { status: 200 });
  } catch (err: any) {
    console.error(`Fetch payments failed: ${err.message}`);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
