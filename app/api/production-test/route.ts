import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envCheck = {
      nodeEnv: process.env.NODE_ENV,
      hasMongoUri: !!process.env.MONGODB_URI,
      mongoUriLength: process.env.MONGODB_URI?.length || 0,
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      environment: envCheck,
      message: 'Environment check completed'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}