import NextAuth, { DefaultSession, User as NextAuthUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      phone?: string;
      isVerified?: boolean;
      identityVerificationStatus?: string;
      stripeCustomerId?: string;
      role?: string;  // Optional role field
      userType?: string;
      selectedProperty?: string;
      company?: string;
      propertyOwnerName?: string;
      needsOnboarding?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends NextAuthUser {
    id: string;
    phone?: string;
    isVerified?: boolean;
    identityVerificationStatus?: string;
    defaultPaymentMethod?: string; // Optional field for default payment method
    stripeCustomerId?: string;
    role?: string;  // Optional role field
    userType?: string;
    selectedProperty?: string;
    company?: string;
    propertyOwnerName?: string;
    needsOnboarding?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    phone?: string;
    isVerified?: boolean;
    identityVerificationStatus?: string;
    stripeCustomerId?: string;
    role?: string;  // Optional role field
    userType?: string;
    selectedProperty?: string;
    company?: string;
    propertyOwnerName?: string;
    needsOnboarding?: boolean;
  }
}
