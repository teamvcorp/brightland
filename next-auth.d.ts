declare module 'next-auth' {
  interface User extends NextAuthUser {
    isVerified?: boolean;
    identityVerificationStatus?: string;
    stripeCustomerId?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isVerified?: boolean;
      identityVerificationStatus?: string;
      stripeCustomerId?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    isVerified?: boolean;
    identityVerificationStatus?: string;
    stripeCustomerId?: string;
  }
}