import AuthClient from "@/components/auth/AuthClient";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// --- SEO METADATA ---
export const metadata: Metadata = {
  title: "Sign In | TraoPrep.ai",
  description:
    "Sign in to your TraoPrep.ai account to access your AI-generated interview prep kits.",
  openGraph: {
    title: "Sign In | TraoPrep.ai",
    description: "Access your custom interview study itineraries.",
    url: "https://traoprep.ai/auth",
    siteName: "TraoPrep.ai",
    type: "website",
  },
};

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("trao_token")?.value;

  if (token) {
    redirect("/app");
  }
  return <AuthClient />;
}
