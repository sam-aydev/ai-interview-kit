import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Target,
  Clock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";


export const metadata: Metadata = {
  title: "TraoPrep.ai | Master the Interview",
  description: "Paste a job description. We autonomously crawl the company's engineering blogs, extract the hidden requirements, and generate a day-by-day study itinerary.",
  openGraph: {
    title: "TraoPrep.ai | Next-Generation Interview Intelligence",
    description: "Generate a custom, day-by-day interview study itinerary tailored to your schedule.",
    url: "https://traoprep.ai",
    siteName: "TraoPrep.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TraoPrep.ai | Master the Interview",
    description: "Autonomously generate tailored interview study kits.",
  },
};

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden selection:bg-primary-100 selection:text-primary-900">
      
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary-600 flex items-center justify-center shadow-md shadow-primary-600/20 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 shrink-0">
              TraoPrep<span className="text-primary-600">.ai</span>
            </span>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/auth"
              className="cursor-pointer text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            {/* Swapped button for Link to allow web crawlers to follow it */}
            <Link
              href="/auth"
              className="cursor-pointer px-4 py-2 sm:px-6 sm:py-2.5 rounded-lg sm:rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 whitespace-nowrap"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-[10px] sm:text-xs font-bold tracking-wide uppercase mb-6 sm:mb-8 text-left sm:text-center leading-tight sm:leading-normal">
              <BrainCircuit className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" /> 
              <span>Next-Generation Interview Intelligence</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-6 sm:mb-8 leading-[1.1]">
              Stop guessing. <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-orange-500">
                Master the interview.
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8 sm:mb-10 font-medium leading-relaxed px-2 sm:px-0">
              Paste a job description. We autonomously crawl the company's
              engineering blogs, extract the hidden requirements, and generate a
              day-by-day study itinerary tailored to your schedule.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto px-2 sm:px-0">
              {/* Swapped button for Link */}
              <Link
                href="/auth"
                className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 sm:py-4 px-8 rounded-xl sm:rounded-2xl shadow-xl shadow-primary-600/20 transition-all active:scale-[0.98]"
              >
                Start Generating <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              {/* Swapped button for Link */}
              <Link
                href="/auth"
                className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-3.5 sm:py-4 px-8 rounded-xl sm:rounded-2xl shadow-sm transition-all"
              >
                View Sample Kit
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="max-w-6xl mx-auto mt-16 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {[
            {
              icon: Target,
              title: "Autonomous Research",
              desc: "We automatically crawl the target company's careers page and engineering handbook to map their exact hiring mechanics.",
            },
            {
              icon: Clock,
              title: "Deterministic Scheduling",
              desc: "Tell us how many days you have. Our mathematical engine front-loads hard concepts and allocates your study time down to the minute.",
            },
            {
              icon: ShieldCheck,
              title: "Smart Regeneration",
              desc: "Edit flashcards or pin specific questions. Our soft-merge backend ensures your manual overrides survive AI regenerations.",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-primary-600 mb-4 sm:mb-6">
                <feature.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}