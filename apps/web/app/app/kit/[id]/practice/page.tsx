"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  BrainCircuit,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function PracticeMode() {
  const { id } = useParams();
  const router = useRouter();

  const [kit, setKit] = useState<any>(null);
  const [deck, setDeck] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    apiFetch(`/kits/${id}`)
      .then((data) => {
        setKit(data);
        const sorted = [...data.flashcards].sort(
          (a, b) => (a.confidence || 0) - (b.confidence || 0),
        );
        setDeck(sorted);
      })
      .catch((err) => {
        console.error("Failed to load kit:", err);
        router.push("/app");
      });
  }, [id, router]);

  const handleScore = (score: number) => {
    const updatedDeck = [...deck];
    updatedDeck[currentIndex].confidence = score;
    setDeck(updatedDeck);

    if (currentIndex < deck.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 200);
    } else {
      finishSession(updatedDeck);
    }
  };

  const finishSession = async (finalDeck: any[]) => {
    setIsFinished(true);
    setSaving(true);

    const updatedKit = { ...kit, flashcards: finalDeck };
    try {
      await apiFetch(`/kits/${id}`, {
        method: "PUT",
        body: JSON.stringify(updatedKit),
      });
      setKit(updatedKit);
    } catch (err) {
      console.error("Failed to save progress", err);
    }
    setSaving(false);
  };

  const restartSession = () => {
    const sorted = [...deck].sort(
      (a, b) => (a.confidence || 0) - (b.confidence || 0),
    );
    setDeck(sorted);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
  };

  if (!kit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const currentCard = deck[currentIndex];
  const progress = (currentIndex / deck.length) * 100;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-primary-100 selection:text-primary-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push(`/app/kit/${id}`)}
            className="cursor-pointer text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 sm:gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Kit
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 text-primary-600 font-bold text-xs sm:text-sm bg-primary-50 px-2.5 sm:px-3 py-1.5 rounded-lg border border-primary-100">
            <BrainCircuit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Practice Mode
          </div>
        </div>
      </header>

      {/* Main Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-2xl mx-auto">
        {!isFinished ? (
          <div className="w-full space-y-6 sm:space-y-10">
            {/* Progress Bar */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider px-1">
                <span>
                  Card {currentIndex + 1} of {deck.length}
                </span>
                <span className="text-primary-600">
                  {Math.round(progress)}% Mastered
                </span>
              </div>
              <div className="h-2 sm:h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-primary-600 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* 3D Flashcard */}
            {/* Using aspect-square on mobile to ensure it has enough vertical height for text, and aspect-[4/3] on sm and up */}
            <div className="relative w-full aspect-square sm:aspect-[4/3] perspective-1000">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentCard?.id}
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    x: -20,
                    scale: 0.95,
                    transition: { duration: 0.15 },
                  }}
                  className="w-full h-full"
                >
                  <motion.div
                    className="w-full h-full relative preserve-3d cursor-pointer group"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 25 }}
                    onClick={() => !isFlipped && setIsFlipped(true)}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {/* Front of Card (Question) */}
                    <div
                      className="absolute inset-0 backface-hidden bg-white border border-slate-200 rounded-[2rem] p-6 sm:p-8 md:p-12 flex flex-col items-center justify-center text-center shadow-xl shadow-slate-200/50 group-hover:border-slate-300 transition-colors"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-800 leading-tight">
                        {currentCard?.front}
                      </h3>
                      <p className="absolute bottom-4 sm:bottom-6 text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-widest animate-pulse">
                        Tap to reveal answer
                      </p>
                    </div>

                    {/* Back of Card (Answer) */}
                    <div
                      className="absolute inset-0 backface-hidden bg-gradient-to-br from-primary-600 to-primary-500 border border-primary-500 rounded-[2rem] p-6 sm:p-8 md:p-12 flex flex-col items-center justify-center text-center shadow-xl shadow-primary-600/30"
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-relaxed overflow-y-auto w-full no-scrollbar">
                        {currentCard?.back}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Confidence Controls */}
            <div
              className={`transition-all duration-300 ${isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
            >
              <p className="text-center text-slate-500 mb-3 sm:mb-4 text-xs sm:text-sm font-bold uppercase tracking-wider">
                How confident were you?
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <button
                  onClick={() => handleScore(1)}
                  className="cursor-pointer py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-black text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors shadow-sm active:scale-95"
                >
                  Hard
                </button>
                <button
                  onClick={() => handleScore(2)}
                  className="cursor-pointer py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-black text-amber-600 bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors shadow-sm active:scale-95"
                >
                  Good
                </button>
                <button
                  onClick={() => handleScore(3)}
                  className="cursor-pointer py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-black text-green-600 bg-green-50 border border-green-100 hover:bg-green-100 transition-colors shadow-sm active:scale-95"
                >
                  Easy
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Completion State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="text-center bg-white p-8 sm:p-10 md:p-14 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-slate-100 max-w-lg w-full mx-4 sm:mx-0"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-50 border border-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-inner">
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 sm:mb-3">
              Session Complete!
            </h2>
            <p className="text-sm sm:text-base text-slate-500 font-medium mb-6 sm:mb-8 leading-relaxed">
              Your weak spots have been logged. The next session will
              automatically prioritize the cards you found the hardest.
            </p>

            <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
              <button
                onClick={restartSession}
                disabled={saving}
                className="cursor-pointer w-full py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-primary-600 text-white hover:bg-primary-500 transition-colors flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" /> Practice Again
              </button>
              <button
                onClick={() => router.push(`/app/kit/${id}`)}
                disabled={saving}
                className="cursor-pointer w-full py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors active:scale-95"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  "Return to Kit"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}