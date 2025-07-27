import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '../../auth/authOptions';
import Stripe from 'stripe';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil',
});

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await req.json();

    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ message: 'Valid amount is required' }, { status: 400 });
    }

    try {
        await connectToDatabase();

        const user = await UserModel.findOne({ email: session.user.email }).exec();
        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        if (!user.stripeCustomerId) {
            return NextResponse.json({ message: 'Stripe customer not found for user' }, { status: 400 });
        }

        // ✅ Strongly-typed Stripe subscription params
        const params: Stripe.SubscriptionCreateParams = {
            customer: user.stripeCustomerId,
            items: [
                {
                    price_data: {
                        currency: 'usd',
                        recurring: { interval: 'month' },
                        unit_amount: amount,
                        product: 'prod_SkvOrl4fZ7YheL',
                    },
                },
            ],
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent'],
        };

        const subscription = await stripe.subscriptions.create(params);

        // ✅ Type guard for latest_invoice and payment_intent
        let clientSecret: string | null = null;

        if (
            subscription.latest_invoice &&
            typeof subscription.latest_invoice !== 'string' &&
            (subscription.latest_invoice as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent }).payment_intent &&
            typeof (subscription.latest_invoice as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent }).payment_intent !== 'string'
        ) {
            clientSecret = (subscription.latest_invoice as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent }).payment_intent?.client_secret || null;
        }

        return NextResponse.json({
            subscriptionId: subscription.id,
            clientSecret,
        });
    } catch (err: any) {
        console.error('Stripe subscription error:', err.message);
        return NextResponse.json({ message: `Internal Server Error: ${err.message}` }, { status: 500 });
    }
}
