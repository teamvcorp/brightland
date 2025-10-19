import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PaymentModel } from '@/models/Payment';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    console.log('Testing Payment model...');
    
    // Try to create a test payment
    const testPayment = await PaymentModel.create({
      userId: 'test-user-id',
      userEmail: 'test@example.com',
      rentalApplicationId: 'test-app-id',
      propertyId: 'test-property-id',
      propertyName: 'Test Property',
      type: 'rent',
      amount: 1000,
      status: 'paid',
      paymentMethod: 'ach',
      stripePaymentIntentId: 'test-intent-id',
      dueDate: new Date(),
      paidDate: new Date(),
      description: 'Test payment',
    });

    console.log('Test payment created:', testPayment._id);

    // Fetch all payments
    const allPayments = await PaymentModel.find({}).lean();
    
    return NextResponse.json({ 
      success: true,
      message: 'Payment model works!',
      testPaymentId: testPayment._id,
      totalPayments: allPayments.length,
      allPayments: allPayments
    }, { status: 200 });
  } catch (err: any) {
    console.error(`Test payment failed:`, err);
    return NextResponse.json({ 
      success: false,
      message: err.message,
      error: err.toString(),
      stack: err.stack
    }, { status: 500 });
  }
}
