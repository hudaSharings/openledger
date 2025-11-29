import { authOptions } from "./auth";
import NextAuth from "next-auth";

// Create NextAuth instance and extract auth function
const { auth } = NextAuth(authOptions);

export async function getServerSession() {
  const session = await auth();
  return session;
}

