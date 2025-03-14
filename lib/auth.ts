import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSession as getNextAuthSession } from "next-auth/react";

export async function getSession() {
  return await getNextAuthSession();
}

export async function getServerAuthSession() {
  return await getServerSession(authOptions);
} 