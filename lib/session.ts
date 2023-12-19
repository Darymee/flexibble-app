import { getServerSession } from "next-auth/next";
import { NextAuthOptions, User } from "next-auth";
import { AdapterUser } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import jsonwebtoken from "jsonwebtoken";
import { JWT } from "next-auth/jwt";

import { createUser, getUser } from "./actions";
import { SessionInterface, UserProfile } from "@/common.types";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  jwt: {
    encode: ({ secret, token }) => {
      try {
        const encodedToken = jsonwebtoken.sign(
          {
            ...token,
            iss: "grafbase",
            exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 час
          },
          secret
        );
        return encodedToken;
      } catch (error) {
        console.error("Error encoding token", error);
        throw error;
      }
    },
    decode: async ({ secret, token }) => {
      try {
        const decodedToken = jsonwebtoken.verify(token!, secret) as JWT;
        return decodedToken;
      } catch (error) {
        console.error("Error decoding token", error);
        throw error;
      }
    },
  },
  theme: {
    colorScheme: "light",
    logo: "/logo.svg",
  },
  callbacks: {
    async session({ session }) {
      const email = session?.user?.email as string;

      try {
        const data = (await getUser(email)) as { user?: UserProfile };

        const newSession = {
          ...session,
          user: {
            ...session.user,
            ...data?.user,
          },
        };

        return newSession;
      } catch (error) {
        console.error("Error retrieving user data", error);
        return session;
      }
    },
    async signIn({ user }: { user: AdapterUser | User }) {
      try {
        const userExists = (await getUser(user?.email as string)) as {
          user?: UserProfile;
        };

        if (!userExists.user) {
          await createUser(
            user.name as string,
            user.email as string,
            user.image as string
          );
        }

        return true;
      } catch (error) {
        console.error("Error during sign-in", error);
        return false;
      }
    },
  },
};

export async function getCurrentUser() {
  try {
    const session = (await getServerSession(authOptions)) as SessionInterface;
    return session;
  } catch (error) {
    console.error("Error getting current user", error);
    throw error;
  }
}
