import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';

// Set up Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }
        await connectToDatabase();
        const user = await UserModel.findOne({ email: credentials.email }).exec();
        if (!user) {
          throw new Error('No user found with this email');
        }
        if (!user.password) {
          throw new Error('This account uses Google login. Please use Google to sign in.');
        }
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error('Invalid password');
        }
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          isVerified: user.isVerified,
          identityVerificationStatus: user.identityVerificationStatus,
          stripeCustomerId: user.stripeCustomerId,
          userType: user.userType,
          selectedProperty: user.selectedProperty,
          company: user.company,
          shouldRefreshSession: true,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      await connectToDatabase();
      let dbUser = await UserModel.findOne({ email: user.email }).exec();
      if (!dbUser) {
        dbUser = await UserModel.create({
          name: user.name,
          email: user.email,
          role: 'user', // Default role
          userType: 'tenant', // Default for OAuth users, they can change later
          isVerified: false,
          identityVerificationStatus: 'pending',
        });
      }
      // Only create Stripe customers for tenants, not property owners
      if (!dbUser.stripeCustomerId && dbUser.userType === 'tenant') {
        const customer = await stripe.customers.create({
          email: user.email as string,
          name: user.name as string,
        });
        dbUser.stripeCustomerId = customer.id;
        await dbUser.save();
      }
      user.id = dbUser._id.toString();
      user.isVerified = dbUser.isVerified;
      user.identityVerificationStatus = dbUser.identityVerificationStatus;
      user.stripeCustomerId = dbUser.stripeCustomerId;
      user.role = dbUser.role; // Add role to user object
      user.userType = dbUser.userType;
      user.selectedProperty = dbUser.selectedProperty;
      user.company = dbUser.company;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isVerified = user.isVerified;
        token.identityVerificationStatus = user.identityVerificationStatus;
        token.stripeCustomerId = user.stripeCustomerId;
        token.role = user.role; // Add role to token
        token.userType = user.userType;
        token.selectedProperty = user.selectedProperty;
        token.company = user.company;
      }
      if ((user as any)?.shouldRefreshSession) {
        token.updatedAt = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isVerified = token.isVerified as boolean;
        session.user.identityVerificationStatus = token.identityVerificationStatus as string;
        session.user.stripeCustomerId = token.stripeCustomerId as string;
        session.user.role = token.role as string; // Add role to session
        session.user.userType = token.userType as string;
        session.user.selectedProperty = token.selectedProperty as string;
        session.user.company = token.company as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
  },
};

export default authOptions;
export { authOptions };
