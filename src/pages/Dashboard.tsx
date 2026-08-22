import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock3,
  FileText,
  Flame,
  FolderOpen,
  IndianRupee,
  Star,
  Wand2,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language";
import { api } from "@/lib/api";
import { TOOL_BY_ID } from "@/lib/tools";
import { toolIcon } from "@/lib/toolIcons";
import type { DocumentItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const QUICK_TOOL_IDS = [
  "lesson-plan",
  "question-paper",
  "worksheet",
  "quiz-generator",
  "daily-teaching-plan",
  "school-notice",
];

function formatMinutes(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${min}m`;
}

function formatDate(ts: number, lang: "en" | "kn"): string {
  return new Date(ts).toLocaleDateString(lang === "kn" ? "kn-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load Razorpay payment gateway script.");
        setUpgrading(false);
        return;
      }
      const res = await api.createSubscription();
      const options = {
        key: res.keyId,
        subscription_id: res.subscriptionId,
        name: "GuruShakti AI",
        description: "GuruShakti Plus Subscription",
        handler: async function () {
          toast.success(
            lang === "kn"
              ? "ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ! ನಿಮ್ಮ ಖಾತೆಯನ್ನು ನವೀಕರಿಸಲಾಗುತ್ತಿದೆ..."
              : "Payment successful! Activating your plan..."
          );
          setTimeout(async () => {
            await refresh();
          }, 3500);
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#0F766E",
        },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to upgrade.");
    } finally {
      setUpgrading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    api
      .listDocuments({ limit: 6 })
      .then((res) => {
        if (!cancelled) setDocs(res.items);
      })
      .catch(() => {
        // non-critical
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = user?.name?.split(/\s+/)[0] ?? "";

  const stats = [
    {
      icon: Clock3,
      label: t("dashboard.timeSaved"),
      value: formatMinutes(user?.timeSavedMinutes ?? 0),
      tint: "from-teal-500/15 to-emerald-500/15 text-teal-700",
    },
    {
      icon: FileText,
      label: t("dashboard.docsGenerated"),
      value: String(user?.documentsGenerated ?? 0),
      tint: "from-orange-400/15 to-amber-500/15 text-orange-600",
    },
    {
      icon: Flame,
      label: t("dashboard.dayStreak"),
      value: `${user?.streakDays ?? 0} ${lang === "kn" ? "ದಿನ" : "days"}`,
      tint: "from-rose-400/15 to-orange-400/15 text-rose-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <p className="text-sm font-medium text-muted-foreground">
          {t("dashboard.subtitle")}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">
          {t("dashboard.welcome")}
          {firstName && (
            <>
              , <span className="text-brand-gradient">{firstName}</span>
            </>
          )}{" "}
          👋
        </h1>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="rounded-2xl border border-border/70 bg-card p-5"
          >
            <div
              className={cn(
                "mb-3 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br",
                stat.tint,
              )}
            >
              <stat.icon className="size-5" />
            </div>
            <p className="text-2xl font-extrabold tracking-tight">
              {stat.value}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Subscription/Upgrade Section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-border/70 bg-card p-6"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight">
              {lang === "kn" ? "ಚಂದಾದಾರಿಕೆ ವಿವರಗಳು" : "Subscription Details"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {user?.plan === "plus" && user?.subscriptionStatus === "active" ? (
                <>
                  <span className="font-semibold text-teal-700">{lang === "kn" ? "ಗುರುಶಕ್ತಿ ಪ್ಲಸ್" : "GuruShakti Plus"}</span>
                  {" • "}
                  <span className="font-medium text-emerald-600">{lang === "kn" ? "ಸಕ್ರಿಯವಾಗಿದೆ" : "Active"}</span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-muted-foreground">{lang === "kn" ? "ಉಚಿತ ಯೋಜನೆ" : "Free Plan"}</span>
                </>
              )}
            </p>
            <div className="mt-2 text-sm">
              {user?.plan === "plus" && user?.subscriptionStatus === "active" ? (
                <span className="text-teal-700 font-semibold">{lang === "kn" ? "ಅನ್ಲಿಮಿಟೆಡ್ ಜನರೇಷನ್ಗಳು" : "Unlimited generations"}</span>
              ) : (
                <span className="text-muted-foreground">
                  <span className="font-bold text-foreground">
                    {user?.monthlyGenerationsUsed ?? 0}
                  </span>{" "}
                  {lang === "kn" ? "ರ 3 ಜನರೇಷನ್ಗಳನ್ನು ಈ ತಿಂಗಳು ಬಳಸಲಾಗಿದೆ" : "of 3 generations used this month"}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row md:items-center">
            {/* Subscription plans comparison */}
            <div className="flex gap-4 border border-border/70 bg-muted/30 p-4 rounded-xl text-xs">
              <div className="space-y-1">
                <p className="font-bold text-muted-foreground">{lang === "kn" ? "ಉಚಿತ" : "FREE"}</p>
                <p className="font-semibold text-foreground">₹0/month</p>
                <p className="text-muted-foreground">{lang === "kn" ? "೩ ಜನರೇಷನ್ಗಳು / ತಿಂಗಳು" : "3 AI generations/month"}</p>
              </div>
              <div className="border-r border-border" />
              <div className="space-y-1">
                <p className="font-bold text-teal-700">{lang === "kn" ? "ಗುರುಶಕ್ತಿ ಪ್ಲಸ್" : "GURUSHAKTI PLUS"}</p>
                <p className="font-semibold text-foreground">₹149/month</p>
                <p className="text-muted-foreground">{lang === "kn" ? "ಅನ್ಲಿಮಿಟೆಡ್ ಜನರೇಷನ್ಗಳು" : "Unlimited AI generations"}</p>
              </div>
            </div>

            {!(user?.plan === "plus" && user?.subscriptionStatus === "active") && (
              <Button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="cursor-pointer bg-brand-gradient text-white hover:opacity-90 font-semibold h-11 px-5 rounded-xl self-stretch sm:self-center"
              >
                {upgrading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {lang === "kn" ? "ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ..." : "Upgrading..."}
                  </>
                ) : (
                  lang === "kn" ? "ಗುರುಶಕ್ತಿ ಪ್ಲಸ್‌ಗೆ ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ" : "Upgrade to GuruShakti Plus"
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick tools */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Wand2 className="size-5 text-teal-700" />
            {t("dashboard.quickTools")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer text-teal-700"
            onClick={() => navigate("/toolkit")}
          >
            {t("common.viewAll")}
            <ArrowRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_TOOL_IDS.map((id, i) => {
            const tool = TOOL_BY_ID[id];
            if (!tool) return null;
            const Icon = toolIcon(tool.icon);
            return (
              <motion.button
                key={id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 + i * 0.05 }}
                whileHover={{ y: -3 }}
                onClick={() => navigate(`/toolkit/${tool.id}`)}
                className="group flex cursor-pointer flex-col items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 text-left transition-colors hover:border-teal-300"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500/15 to-emerald-500/15 text-teal-700 transition-transform group-hover:scale-110">
                  <Icon className="size-4" />
                </div>
                <span className="text-sm font-semibold leading-tight">
                  {lang === "kn" ? tool.titleKn : tool.title}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Recent documents */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <FolderOpen className="size-5 text-teal-700" />
            {t("dashboard.recentDocuments")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer text-teal-700"
            onClick={() => navigate("/documents")}
          >
            {t("common.viewAll")}
            <ArrowRight className="size-4" />
          </Button>
        </div>
        {docsLoading ? (
          <div className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
            <FileText className="mx-auto mb-3 size-8 text-teal-300" />
            <p className="text-sm font-medium">{t("dashboard.noDocs")}</p>
            <Button
              size="sm"
              className="mt-4 cursor-pointer bg-brand-gradient text-white hover:opacity-90"
              onClick={() => navigate("/toolkit")}
            >
              <Wand2 className="size-4" />
              {t("nav.toolkit")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc) => {
              const tool = TOOL_BY_ID[doc.type];
              const Icon = tool ? toolIcon(tool.icon) : FileText;
              return (
                <motion.button
                  key={doc._id}
                  type="button"
                  whileHover={{ y: -3 }}
                  onClick={() => navigate(`/documents/${doc._id}`)}
                  className="group cursor-pointer rounded-2xl border border-border/70 bg-card p-4 text-left transition-colors hover:border-teal-300"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500/15 to-emerald-500/15 text-teal-700">
                      <Icon className="size-4" />
                    </div>
                    {doc.favorited && (
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                    )}
                  </div>
                  <p className="truncate text-sm font-semibold">{doc.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {doc.preview || ""}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground/80">
                    {formatDate(doc.createdAt, lang)}
                  </p>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Income Engine */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex flex-col gap-4 rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50 to-amber-50 p-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
            <IndianRupee className="size-5" />
          </div>
          <div>
            <h3 className="font-bold tracking-tight">
              {t("dashboard.incomeEngine")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.incomeCta")}
            </p>
          </div>
        </div>
        <Button
          className="mt-auto w-fit cursor-pointer bg-gradient-to-br from-orange-500 to-amber-500 text-white hover:opacity-90"
          onClick={() => navigate("/income")}
        >
          {t("nav.income")}
          <ArrowRight className="size-4" />
        </Button>
      </motion.div>
    </div>
  );
}
