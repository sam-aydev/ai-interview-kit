"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  PlayCircle,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

export default function KitBuilder() {
  const { id } = useParams();
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [kit, setKit] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/kits/${id}`)
      .then((data) => setKit(data))
      .catch(() => router.push("/app"));
  }, [id, router]);

  const saveChanges = async (updatedKit: any) => {
    setIsSaving(true);
    try {
      const saved = await apiFetch(`/kits/${id}`, {
        method: "PUT",
        body: JSON.stringify(updatedKit),
      });
      setKit(saved);
      toast.success("Changes saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const updateQuestion = (index: number, field: string, value: string) => {
    const updated = { ...kit };
    updated.questions[index][field] = value;
    updated.questions[index].is_edited = true;
    setKit(updated);
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= kit.questions.length)
      return;
    const updated = { ...kit };
    const temp = updated.questions[index];
    updated.questions[index] = updated.questions[index + direction];
    updated.questions[index + direction] = temp;
    setKit(updated);
  };

  const deleteQuestion = (index: number) => {
    const updated = { ...kit };
    updated.questions.splice(index, 1);
    setKit(updated);
  };

  const addQuestion = () => {
    const updated = { ...kit };
    updated.questions.unshift({
      id: `user_added_${Date.now()}`,
      category: "technical",
      prompt: "New Question...",
      answer_outline: "Answer goes here...",
      difficulty: 2,
      origin: "user_added",
      is_edited: true,
      is_pinned: true,
    });
    setKit(updated);
  };

  const regenerateCategory = async (category: string) => {
    setIsRegenerating(true);
    try {
      const regenerated = await apiFetch(`/kits/${id}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ category }),
      });

      startTransition(() => {
        setKit(regenerated);
      });
      toast.success(`${category} questions regenerated!`);
    } catch (err: any) {
      toast.error(err.message || "Regeneration failed");
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!kit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:h-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <button
            onClick={() => router.push("/app")}
            className="cursor-pointer flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => router.push(`/app/kit/${id}/practice`)}
              className="cursor-pointer flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 sm:px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs sm:text-sm font-bold transition-colors active:scale-95"
            >
              <PlayCircle className="w-4 h-4" /> Practice
            </button>
            <button
              onClick={() => router.push(`/app/kit/${id}/cram-sheet`)}
              className="cursor-pointer flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 sm:px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs sm:text-sm font-bold transition-colors active:scale-95"
            >
              <Printer className="w-4 h-4" /> Cram Sheet
            </button>
            <button
              onClick={() => saveChanges(kit)}
              disabled={isSaving}
              className="cursor-pointer flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 sm:px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-70"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}{" "}
              Save
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6 sm:space-y-8">
        {/* Company Brief & Role Breakdown */}
        <section className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-black mb-1 sm:mb-2 leading-tight">
            {kit.role?.title || "Role Overview"}
          </h1>
          <a
            href={kit.source?.company_url}
            target="_blank"
            rel="noreferrer"
            className="cursor-pointer text-sm sm:text-base text-primary-600 font-bold hover:underline break-all"
          >
            {kit.source?.company_url}
          </a>

          <div className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">
                Company Brief
              </h3>
              <textarea
                className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all resize-none"
                value={kit.company_brief?.summary || ""}
                onChange={(e) =>
                  setKit({
                    ...kit,
                    company_brief: {
                      ...kit.company_brief,
                      summary: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">
                Core Responsibilities
              </h3>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700">
                {kit.role?.responsibilities?.map((res: string, i: number) => (
                  <li key={i}>{res}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Study Schedule */}
        <section className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-lg sm:text-xl font-bold mb-4">
            Study Itinerary ({kit.schedule?.days_available} Days)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {kit.schedule?.days?.map((day: any) => (
              <div
                key={day.day}
                className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <span className="text-[10px] sm:text-xs font-bold text-primary-600 uppercase tracking-wider">
                  Day {day.day}
                </span>
                <p className="font-bold text-sm sm:text-base text-slate-900 mt-1 line-clamp-2">
                  {day.focus}
                </p>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  {day.minutes} mins • {day.question_ids.length} Qs
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Question Bank */}
        <section className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 sm:gap-0">
            <h2 className="text-lg sm:text-xl font-bold">
              Interview Question Bank
            </h2>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={addQuestion}
                className="cursor-pointer flex-1 sm:flex-none justify-center px-3 py-2 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Q
              </button>
              <button
                onClick={() => regenerateCategory("technical")}
                disabled={isRegenerating}
                className="cursor-pointer flex-1 sm:flex-none justify-center px-3 py-2 sm:py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-70"
              >
                {isRegenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Regenerate Tech
              </button>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {kit.questions?.map((q: any, i: number) => (
              <div
                key={q.id}
                className={`p-3 sm:p-4 border rounded-xl flex gap-3 sm:gap-4 transition-colors ${q.is_edited ? "border-primary-300 bg-primary-50" : "border-slate-200 bg-white"}`}
              >
                {/* Reorder Controls */}
                <div className="flex flex-col gap-1 pt-1 shrink-0">
                  <button
                    onClick={() => moveQuestion(i, -1)}
                    className="cursor-pointer p-1.5 sm:p-1 bg-slate-50 hover:bg-slate-100 border border-slate-100 sm:border-transparent sm:bg-transparent rounded text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={() => moveQuestion(i, 1)}
                    className="cursor-pointer p-1.5 sm:p-1 bg-slate-50 hover:bg-slate-100 border border-slate-100 sm:border-transparent sm:bg-transparent rounded text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>

                <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {q.category}
                    </span>
                    <button
                      onClick={() => deleteQuestion(i)}
                      className="cursor-pointer p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <input
                    className="w-full font-bold text-sm sm:text-base text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none transition-colors"
                    value={q.prompt}
                    onChange={(e) =>
                      updateQuestion(i, "prompt", e.target.value)
                    }
                  />
                  <textarea
                    className="w-full text-xs sm:text-sm text-slate-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-primary-500 rounded sm:p-1 focus:outline-none transition-colors resize-y"
                    rows={2}
                    value={q.answer_outline}
                    onChange={(e) =>
                      updateQuestion(i, "answer_outline", e.target.value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
