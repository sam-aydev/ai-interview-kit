"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

export default function AuthClient() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const validateForm = () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return false;
    }
    if (!isLogin && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const endpoint = isLogin ? "/auth/login" : "/auth/register";

    try {
      const data = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });

      const isSecure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `trao_token=${data.token}; path=/; max-age=604800; SameSite=Lax${isSecure}`;

      startTransition(() => {
        router.push("/app");
        toast.success(
          isLogin ? "Welcome back!" : "Account created successfully!",
        );
      });
    } catch (err: any) {
      toast.error(err.message || "Authentication failed. Please try again.");
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setConfirmPassword("");
  };

  return (
    <main className="relative h-dvh w-full flex items-center justify-center bg-slate-50 p-4 font-sans overflow-hidden selection:bg-primary-100 selection:text-primary-900">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white p-6 sm:p-8 md:p-10 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative z-10 w-full"
      >
        <div className="text-center mb-6 sm:mb-8 mt-1">
          <div className="mx-auto w-12 h-12 rounded-xl sm:rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 mb-3 sm:mb-4 shadow-sm border border-primary-100">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-1">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-slate-500 font-medium text-[11px] sm:text-sm px-2 leading-tight">
            {isLogin
              ? "Enter your credentials to access your workspace."
              : "Sign up to start generating AI prep kits."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="space-y-1 sm:space-y-1.5">
            <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-11 sm:pl-12 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1 sm:space-y-1.5">
            <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 sm:pl-12 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              />
            </div>
          </div>

          <AnimatePresence>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required={!isLogin}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 sm:pl-12 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading || isPending}
            className="cursor-pointer w-full py-3 sm:py-3.5 mt-2 sm:mt-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm sm:text-base font-bold flex justify-center items-center gap-2 transition-all shadow-md active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
          >
            {loading || isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? "Sign In to Dashboard" : "Create Account"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 sm:mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] sm:text-sm text-slate-500 font-medium">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={toggleAuthMode}
              className="cursor-pointer text-primary-600 font-bold hover:text-primary-700 transition-colors ml-1"
            >
              {isLogin ? "Sign up free" : "Sign in"}
            </button>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
