import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Find user by email
    const user = await UserModel.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ 
        message: 'If an account exists with that email, a password reset link has been sent.' 
      }, { status: 200 });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save token to user
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = resetTokenExpiry;
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

    // Send email
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@fyht4.com',
        to: email,
        subject: 'Password Reset Request - Brightland Rentals',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Password Reset Request</h2>
            <p>Hello ${user.name},</p>
            <p>You requested to reset your password for your Brightland Rentals account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4f46e5;">${resetUrl}</p>
            <p style="color: #dc2626; font-weight: bold;">This link will expire in 1 hour.</p>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
            <p>Best regards,<br>Brightland Rentals Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Error sending reset email:', emailError);
      return NextResponse.json({ 
        error: 'Failed to send reset email. Please try again.' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'If an account exists with that email, a password reset link has been sent.' 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ 
      error: 'An error occurred. Please try again.' 
    }, { status: 500 });
  }
}
