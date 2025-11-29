import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/src/db";
import { users } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error("Missing credentials");
            return null;
          }

          // Normalize email to lowercase for comparison
          const email = (credentials.email as string).toLowerCase().trim();

          // Retry logic for database connection
          let user;
          let retries = 3;
          while (retries > 0) {
            try {
              user = await db
                .select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1);
              break; // Success, exit retry loop
            } catch (dbError: any) {
              retries--;
              if (retries === 0) {
                console.error("Database connection failed after retries:", dbError);
                throw dbError;
              }
              console.warn(`Database connection failed, retrying... (${retries} attempts left)`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
          }

          if (!user || user.length === 0) {
            console.error(`User not found: ${email}`);
            return null;
          }

          if (!user[0].passwordHash) {
            console.error(`User ${email} has no password hash`);
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password as string, user[0].passwordHash);

          if (!isValid) {
            console.error(`Invalid password for user: ${email}`);
            return null;
          }

          console.log(`Successfully authenticated user: ${email}`);

          return {
            id: user[0].id,
            email: user[0].email,
            role: user[0].role,
            householdId: user[0].householdId,
          };
        } catch (error: any) {
          console.error("Authorization error:", error);
          // Return more specific error information
          if (error.message?.includes("Connection terminated") || error.message?.includes("Connection")) {
            console.error("Database connection issue. Please check your DATABASE_URL and network connection.");
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      try {
        if (user) {
          token.id = user.id;
          token.role = user.role;
          token.householdId = user.householdId;
        }
        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (session.user && token) {
          session.user.id = token.id as string;
          session.user.role = token.role as "admin" | "member";
          session.user.householdId = token.householdId as string;
        }
        return session;
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: "admin" | "member";
      householdId: string;
    };
  }

  interface User {
    id: string;
    email: string;
    role: "admin" | "member";
    householdId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "member";
    householdId: string;
  }
}

