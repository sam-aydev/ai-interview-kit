"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Link as LinkIcon,
  Calendar,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Plus,
  ChevronRight,
  Clock,
  Building2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

interface JobInput {
  jd: string;
  company_url: string;
  days: number;
}
interface KitRecord {
  _id: string;
  status: "generating" | "ready" | "failed";
  source: { company_url: string; role?: string; company?: string };
  created_at: string;
  role?: { title?: string };
}

const getSafeHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url || "Unknown Company";
  }
};

export default function DashboardClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoadingKits, setIsLoadingKits] = useState(true);

  // Pagination & Data State
  const [kits, setKits] = useState<KitRecord[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [singleData, setSingleData] = useState<JobInput>({
    jd: "",
    company_url: "",
    days: 5,
  });
  const [batchData, setBatchData] = useState<JobInput[]>([]);
  const [fileName, setFileName] = useState("");

  // Initial Load
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        await apiFetch("/auth/verify");
        setIsAuthenticated(true);
        const data = await apiFetch("/kits?page=1&limit=9");
        setKits(data.kits);
        setHasMore(data.pagination.hasMore);
        console.log(data.pagination);
        console.log(data.kits);
      } catch {
        setIsAuthenticated(false);
        router.push("/auth");
      } finally {
        setIsLoadingKits(false);
      }
    };
    initializeDashboard();
  }, [router]);

  // Safe Polling (Fetches the exact number of items currently loaded so the grid doesn't shrink)
  useEffect(() => {
    const generatingKits = kits.filter((k) => k.status === "generating");
    if (generatingKits.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const currentLimit = Math.max(kits.length, 9);
        const data = await apiFetch(`/kits?limit=${currentLimit}`);
        startTransition(() => {
          setKits(data.kits);
        });
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [kits]);

  // Load More Handler
  const loadMoreKits = async () => {
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await apiFetch(`/kits?page=${nextPage}&limit=9`);
      setKits((prev) => [...prev, ...data.kits]);
      setPage(nextPage);
      setHasMore(data.pagination.hasMore);
    } catch (err) {
      toast.error("Failed to load more kits");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          setBatchData(parsed);
        } else throw new Error();
      } catch {
        toast.error(
          "Invalid JSON format. Upload an array of { jd, company_url, days } objects.",
        );
        setBatchData([]);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = mode === "single" ? [singleData] : batchData;
    if (payload.length === 0) return toast.error("No data to process");

    setIsSubmitting(true);

    try {
      const newlyGenerating: KitRecord[] = [];

      for (const job of payload) {
        try {
          const data = await apiFetch("/kits", {
            method: "POST",
            body: JSON.stringify(job),
          });

          newlyGenerating.push({
            _id: data.id,
            status: "generating",
            source: { company_url: job.company_url },
            created_at: new Date().toISOString(),
          });

          if (payload.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (jobErr: any) {
          if (jobErr.message?.includes("Unauthorized")) throw jobErr;
          console.error(`Failed to start job for ${job.company_url}`, jobErr);
          const siteName = getSafeHostname(job.company_url);
          toast.error(
            `Skipped ${siteName}: ${jobErr.message || "Generation failed"}`,
          );
        }
      }

      startTransition(() => {
        setKits((prev) => [...newlyGenerating, ...prev]);
        setShowForm(false);
        setSingleData({ jd: "", company_url: "", days: 5 });
        setBatchData([]);
      });

      if (newlyGenerating.length > 0) {
        toast.success(`Initialized ${newlyGenerating.length} kits!`);
      }
    } catch (err: any) {
      if (err.message?.includes("Unauthorized")) {
        toast.error("Session expired. Please sign in again.");
        router.push("/auth");
      } else {
        toast.error(err.message || "Failed to start generation.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated === null || isLoadingKits) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-1 sm:mb-2">
            Your Workspace
          </h1>
          <p className="text-sm sm:text-base text-slate-500 font-medium">
            Manage your interview prep kits and study schedules.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3.5 sm:py-3 rounded-xl font-bold shadow-md transition-all active:scale-95 shrink-0"
        >
          {showForm ? (
            "Cancel Creation"
          ) : (
            <>
              <Plus className="w-5 h-5" /> Create New Kit
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex bg-slate-100 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl w-full sm:max-w-sm">
                  <button
                    type="button"
                    onClick={() => setMode("single")}
                    className={`cursor-pointer flex-1 py-2.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all ${mode === "single" ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Single Role
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("batch")}
                    className={`cursor-pointer flex-1 py-2.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2 ${mode === "batch" ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Batch JSON
                  </button>
                </div>
                {mode === "single" ? (
                  <div className="space-y-5 sm:space-y-6 animate-in fade-in">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700">
                        <Briefcase className="w-4 h-4 text-primary-500" /> Job
                        Description
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={singleData.jd}
                        onChange={(e) =>
                          setSingleData({ ...singleData, jd: e.target.value })
                        }
                        placeholder="Paste the full job description here..."
                        className="w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4 text-slate-900 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 resize-none outline-none font-medium text-sm transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700">
                          <LinkIcon className="w-4 h-4 text-primary-500" />{" "}
                          Company URL
                        </label>
                        <input
                          type="url"
                          required
                          value={singleData.company_url}
                          onChange={(e) =>
                            setSingleData({
                              ...singleData,
                              company_url: e.target.value,
                            })
                          }
                          placeholder="https://company.com"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-3.5 text-slate-900 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-sm font-medium transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700">
                          <Calendar className="w-4 h-4 text-primary-500" /> Days
                          to Prepare
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          required
                          value={singleData.days || ""}
                          onChange={(e) =>
                            setSingleData({
                              ...singleData,
                              days: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-3.5 text-slate-900 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-sm font-medium transition-all"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl sm:rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center bg-slate-50 relative hover:bg-slate-100 transition-colors animate-in fade-in text-center">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 text-primary-500 mb-2 sm:mb-3" />
                    <p className="text-slate-800 font-bold text-sm sm:text-base">
                      Tap or drag a batch JSON file
                    </p>
                    <p className="text-slate-500 text-[10px] sm:text-xs mt-1">
                      Expected format: [{`{ jd, company_url, days }`}]
                    </p>
                    {fileName && (
                      <p className="mt-4 text-primary-600 font-bold text-xs sm:text-sm bg-primary-50 px-3 py-1 rounded-lg">
                        {fileName} loaded.
                      </p>
                    )}
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      (mode === "batch" && batchData.length === 0)
                    }
                    className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 sm:py-3 px-8 rounded-xl shadow-md transition-all disabled:opacity-50 active:scale-95"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Initialize Generation"
                    )}{" "}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" /> Recent Kits
          {isPending && (
            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-primary-500 ml-1 sm:ml-2" />
          )}
        </h2>

        {kits.length === 0 ? (
          <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-300 mb-3 sm:mb-4 shadow-sm border border-slate-100">
              <Briefcase className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-1 sm:mb-2">
              No kits generated yet
            </h3>
            <p className="text-sm sm:text-base text-slate-500 max-w-sm font-medium">
              Click "Create New Kit" to start analyzing a job description.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {kits.map((kit) => (
              <div
                key={kit._id}
                className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col p-5 sm:p-6 relative overflow-hidden group"
              >
                <div className="absolute top-4 sm:top-5 right-4 sm:right-5">
                  {kit.status === "generating" && (
                    <span className="flex items-center gap-1.5 text-primary-600 bg-primary-50 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold">
                      <Loader2 className="w-3 h-3 animate-spin" /> Generating
                    </span>
                  )}
                  {kit.status === "ready" && (
                    <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  )}
                  {kit.status === "failed" && (
                    <span className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold">
                      <AlertCircle className="w-3 h-3" /> Failed
                    </span>
                  )}
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 border border-slate-100 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 text-slate-400">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate pr-20 sm:pr-24 mb-1">
                  {kit.role?.title ||
                    (kit.status === "generating"
                      ? "Analyzing Role..."
                      : "Untitled Role")}
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm font-medium truncate mb-5 sm:mb-6">
                  {kit.source.company ||
                    getSafeHostname(kit.source.company_url)}
                </p>
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-400">
                    {new Date(kit.created_at).toLocaleDateString()}
                  </span>
                  {kit.status === "ready" && (
                    <button
                      onClick={() => router.push(`/app/kit/${kit._id}`)}
                      className="cursor-pointer text-xs sm:text-sm font-bold text-primary-600 flex items-center gap-1 hover:text-primary-700 transition-colors group-hover:translate-x-1"
                    >
                      Open Kit{" "}
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={loadMoreKits}
              disabled={isLoadingMore}
              className="cursor-pointer bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isLoadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Load More Kits"
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
