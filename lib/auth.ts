import { auth } from "@/app/auth";

export async function getServerAuthSession() {
  return await auth();
} 