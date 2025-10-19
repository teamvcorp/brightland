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

  try {
    await connectToDatabase();

    // Get all payments (for debugging)
    const allPayments = await PaymentModel.find({}).lean();
    
    // Get payments for this user
    const userPayments = await PaymentModel.find({ userEmail: session.user.email }).lean();

    return NextResponse.json({ 
      success: true,
      userEmail: session.user.email,
      totalPayments: allPayments.length,
      userPayments: userPayments.length,
      allPayments: allPayments,
      userPaymentsList: userPayments
    }, { status: 200 });
  } catch (err: any) {
    console.error(`Debug payments failed: ${err.message}`);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
