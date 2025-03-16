import { handlers } from "@/app/auth";
import { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const { GET, POST } = handlers; 