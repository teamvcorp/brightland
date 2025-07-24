import NextAuth, { DefaultSession, User as NextAuthUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isVerified?: boolean;
      identityVerificationStatus?: string;
      stripeCustomerId?: string;
    } & DefaultSession["user"];
  }

  interface User extends NextAuthUser {
    id: string;
    isVerified?: boolean;
    identityVerificationStatus?: string;
    stripeCustomerId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    isVerified?: boolean;
    identityVerificationStatus?: string;
    stripeCustomerId?: string;
  }
}
