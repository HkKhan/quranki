import { handlers } from "@/app/auth";
import { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

// Add logging
db.$connect()
  .then(() => console.log('Successfully connected to the database'))
  .catch((e) => console.error('Failed to connect to database:', e));

export const { GET, POST } = handlers; 