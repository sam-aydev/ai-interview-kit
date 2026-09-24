"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SignOutButton() {
  const router = useRouter();

  const handleLogout = () => {
    const isSecure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `trao_token=; Max-Age=0; path=/; SameSite=Lax${isSecure}`;
    toast.success("Signed out successfully");
    router.push("/");
  };

  return (
    <button
      onClick={handleLogout}
      className="cursor-pointer flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-slate-500 hover:text-red-600 transition-colors active:scale-95"
    >
      <LogOut className="w-4 h-4" /> Sign Out
    </button>
  );
}