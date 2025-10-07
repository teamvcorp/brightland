import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { StatusUpdateEmail } from '@/email/StatusUpdateEmail';

export async function GET() {
  try {
    const emailHtml = await render(
      StatusUpdateEmail({
        fullname: "John Doe",
        address: "Apt 1",
        projectDescription: "Fix leaky faucet in kitchen",
        oldStatus: "pending",
        newStatus: "working",
        adminNotes: "We've scheduled a plumber to visit tomorrow at 2 PM. Please ensure someone is available to let them in.",
        finishedImageUrl: "https://picsum.photos/400/300"
      }),
      { pretty: true }
    );
    
    return new Response(emailHtml, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Error rendering email:', error);
    return NextResponse.json(
      { error: 'Failed to render email' },
      { status: 500 }
    );
  }
}