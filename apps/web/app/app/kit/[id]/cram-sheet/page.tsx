"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, Loader2, AlertCircle, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function CramSheet() {
  const { id } = useParams();
  const router = useRouter();
  const [kit, setKit] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    // Decoupled API call handles cookies automatically
    apiFetch(`/kits/${id}`)
      .then((data) => setKit(data))
      .catch((err) => {
        
        router.push("/app");
      });
  }, [id, router]);

  if (!kit)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );

  // Added fallback arrays to prevent crashes if AI generation missed a field
  const mustHaves = (kit.role?.requirements || [])
    .filter((r: any) => r.priority === "must")
    .slice(0, 3);

  const weakSpots = [...(kit.flashcards || [])]
    .sort((a, b) => (a.confidence || 0) - (b.confidence || 0))
    .slice(0, 3);

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 print:p-0 print:bg-white font-sans">
      {/* Top Controls */}
      <div className="max-w-3xl mx-auto mb-4 sm:mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.push(`/app/kit/${id}`)}
          className="cursor-pointer text-slate-500 hover:text-slate-900 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Kit
        </button>
        <button
          onClick={handlePrint}
          className="cursor-pointer flex items-center gap-1.5 sm:gap-2 bg-slate-900 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base shadow-sm hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Printer className="w-4 h-4" /> Print Sheet
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <header className="border-b-4 border-primary-500 pb-5 sm:pb-6 mb-6 sm:mb-8 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-primary-600 font-bold tracking-wider uppercase text-xs sm:text-sm mb-2">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />{" "}
              5-Minute Cram Sheet
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-1">
              {kit.role?.title || "Untitled Role"}
            </h1>
            <p className="text-lg sm:text-xl text-slate-500 font-medium">
              {kit.source?.company || "Unknown Company"}
            </p>
          </div>
        </header>

        <div className="space-y-8 sm:space-y-10">
          {/* Section: Company Brief */}
          <section>
            <h2 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">
              The Company in 30 Seconds
            </h2>
            <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-medium">
              {kit.company_brief?.summary || "No summary generated."}
            </p>
          </section>

          {/* Section: Top Requirements */}
          <section>
            <h2 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">
              Core Must-Haves
            </h2>
            <ul className="grid gap-2.5 sm:gap-3">
              {mustHaves.length > 0 ? (
                mustHaves.map((req: any) => (
                  <li
                    key={req.id}
                    className="bg-slate-50 border border-slate-100 p-3 sm:p-4 rounded-lg sm:rounded-xl flex items-start gap-2.5 sm:gap-3"
                  >
                    <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-slate-700 font-medium leading-snug">
                      {req.text}
                    </span>
                  </li>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No must-haves identified.
                </p>
              )}
            </ul>
          </section>

          {/* Section: Weak Spots */}
          <section>
            <h2 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Keep Top of
              Mind (Weak Spots)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-4 print:hidden">
              These are the flashcards you scored lowest on during Practice
              Mode.
            </p>

            <div className="grid gap-3 sm:gap-4">
              {weakSpots.length > 0 ? (
                weakSpots.map((card: any) => (
                  <div
                    key={card.id}
                    className="border-l-4 border-orange-400 pl-3 sm:pl-4 py-1"
                  >
                    <p className="text-xs sm:text-sm font-bold text-slate-500 mb-1">
                      Q: {card.front}
                    </p>
                    <p className="text-sm sm:text-base text-slate-800 font-semibold leading-snug">
                      {card.back}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Practice your flashcards to populate this section!
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function CheckCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
