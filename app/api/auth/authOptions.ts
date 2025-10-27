import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';

// Set up Stripe only if we have a valid key
let stripe: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.length > 10) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil',
    });
  } else {
    console.warn('Stripe not initialized: Invalid or missing STRIPE_SECRET_KEY');
  }
} catch (error) {
  console.error('Stripe initialization failed:', error);
  stripe = null;
}

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
          phone: user.phone,
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
      // Only create Stripe customers for tenants, NEVER for property owners
      if (dbUser.userType === 'property-owner') {
        console.log('Property owner login - skipping Stripe customer creation');
        // Property owners should never have Stripe customers
      } else if (!dbUser.stripeCustomerId && dbUser.userType === 'tenant' && stripe) {
        console.log('Creating Stripe customer for tenant');
        try {
          const customer = await stripe.customers.create({
            email: user.email as string,
            name: user.name as string,
          });
          dbUser.stripeCustomerId = customer.id;
          await dbUser.save();
          console.log('Stripe customer created successfully for tenant');
        } catch (stripeError) {
          console.error('Failed to create Stripe customer for tenant:', stripeError);
          // Continue without Stripe customer - don't block auth
        }
      }
      user.id = dbUser._id.toString();
      user.phone = dbUser.phone;
      user.isVerified = dbUser.isVerified;
      user.identityVerificationStatus = dbUser.identityVerificationStatus;
      user.stripeCustomerId = dbUser.stripeCustomerId;
      user.role = dbUser.role; // Add role to user object
      user.userType = dbUser.userType;
      user.selectedProperty = dbUser.selectedProperty;
      user.company = dbUser.company;
      user.propertyOwnerName = dbUser.propertyOwnerName;
      
      // Check if Google OAuth user needs onboarding
      if (account?.provider === 'google') {
        // For tenants: check if they have selected a property
        if (dbUser.userType === 'tenant' && !dbUser.selectedProperty) {
          user.needsOnboarding = true;
        }
        // For property owners: check if they have property owner name
        else if (dbUser.userType === 'property-owner' && !dbUser.propertyOwnerName) {
          user.needsOnboarding = true;
        }
      }
      
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.phone = user.phone;
        token.isVerified = user.isVerified;
        token.identityVerificationStatus = user.identityVerificationStatus;
        token.stripeCustomerId = user.stripeCustomerId;
        token.role = user.role; // Add role to token
        token.userType = user.userType;
        token.selectedProperty = user.selectedProperty;
        token.company = user.company;
        token.propertyOwnerName = user.propertyOwnerName;
        token.needsOnboarding = (user as any).needsOnboarding;
      }
      
      // Handle session update trigger (when update() is called)
      if (trigger === 'update') {
        // Re-fetch user from database to get latest data
        await connectToDatabase();
        const dbUser = await UserModel.findOne({ email: token.email }).exec();
        
        if (dbUser) {
          // Update all user fields from database
          token.userType = dbUser.userType;
          token.selectedProperty = dbUser.selectedProperty;
          token.company = dbUser.company;
          token.propertyOwnerName = dbUser.propertyOwnerName;
          token.phone = dbUser.phone;
          
          // Check if user still needs onboarding based on current database state
          const needsOnboarding = 
            (dbUser.userType === 'tenant' && !dbUser.selectedProperty) ||
            (dbUser.userType === 'property-owner' && !dbUser.propertyOwnerName);
          
          token.needsOnboarding = needsOnboarding;
        }
      }
      
      if ((user as any)?.shouldRefreshSession) {
        token.updatedAt = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.phone = token.phone as string;
        session.user.isVerified = token.isVerified as boolean;
        session.user.identityVerificationStatus = token.identityVerificationStatus as string;
        session.user.stripeCustomerId = token.stripeCustomerId as string;
        session.user.role = token.role as string; // Add role to session
        session.user.userType = token.userType as string;
        session.user.selectedProperty = token.selectedProperty as string;
        session.user.company = token.company as string;
        session.user.propertyOwnerName = token.propertyOwnerName as string;
        session.user.needsOnboarding = token.needsOnboarding as boolean;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If url is a relative URL, prepend baseUrl
      if (url.startsWith("/")) {
        url = `${baseUrl}${url}`;
      }
      
      // Parse URL to get search params
      const urlObj = new URL(url);
      const callbackUrl = urlObj.searchParams.get('callbackUrl');
      
      // If there's a specific callback URL, use it
      if (callbackUrl && callbackUrl !== baseUrl && callbackUrl !== `${baseUrl}/`) {
        return callbackUrl;
      }
      
      // Default redirect to home (will be handled by frontend onboarding check)
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
  },
};

export default authOptions;
export { authOptions };
