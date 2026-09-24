"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SignOutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    const isSecure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `trao_token=; Max-Age=0; path=/; SameSite=Lax${isSecure}`;
    toast.success("Signed out successfully");
    router.push("/");
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="cursor-pointer flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-slate-500 hover:text-red-600 transition-colors active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
    >
      {isLoggingOut ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
      {isLoggingOut ? "Signing out..." : "Sign Out"}
    </button>
  );
}
