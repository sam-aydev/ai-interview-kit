import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import SignOutButton from "@/components/dashboard/SignOutButton";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const experimental_ppr = true;

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 sm:pb-24 selection:bg-primary-100 selection:text-primary-900">
      {/* STATIC SHELL: App Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="text-lg sm:text-xl font-black tracking-tight shrink-0">
            TraoPrep<span className="text-primary-600">.ai</span>
          </span>
          <SignOutButton />
        </div>
      </header>

      {/* STATIC SHELL: Main Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        {/* DYNAMIC HOLE: Dashboard logic and kits stream in here */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          }
        >
          <DashboardClient />
        </Suspense>
      </main>
    </div>
  );
}
