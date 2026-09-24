'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { SearchX, Home, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-50 via-slate-50 to-slate-50 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden p-10 text-center"
      >
        {/* Animated Icon Container */}
        <motion.div 
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.2 }}
          className="mx-auto w-24 h-24 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mb-8"
        >
          <SearchX className="w-12 h-12" />
        </motion.div>

        {/* Text Content */}
        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
          404
        </h1>
        <h2 className="text-xl font-bold text-slate-800 mb-3">
          Page Not Found
        </h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          We crawled the web, checked the job description, and reviewed the study schedule, but we couldn't find the page you're looking for. It looks like this route didn't make the cut for the interview.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          
          <Link 
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-500/25 transition-all active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            Return Home
          </Link>
        </div>
      </motion.div>
    </main>
  );
}