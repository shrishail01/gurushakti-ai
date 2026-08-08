import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  IndianRupee,
  Loader2,
  RefreshCw,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { api } from "@/lib/api";
import type { IncomeOpportunity, IncomeResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "done" | "error";

function LevelBadge({ label, value }: { label: string; value: string }) {
  const tone =
    value === "Low"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "Medium"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-rose-200 bg-rose-50 text-rose-700";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tone,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}: {value}
    </span>
  );
}

function OpportunityCard({
  opportunity,
  index,
}: {
  opportunity: IncomeOpportunity;
  index: number;
}) {
  const { t, lang } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="rounded-2xl border border-border/70 bg-card p-5 md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/15 to-emerald-500/15 text-teal-700">
            <span className="text-lg font-extrabold">{index + 1}</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight">
            {opportunity.opportunity}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <LevelBadge label={t("income.difficulty")} value={opportunity.difficulty} />
          <LevelBadge label={t("income.risk")} value={opportunity.risk} />
        </div>
      </div>

      {/* Money metrics */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: t("income.startupCost"), value: opportunity.startupCost, icon: Wrench },
          { label: t("income.pricing"), value: opportunity.pricing, icon: IndianRupee },
          { label: t("income.month1"), value: opportunity.month1, icon: TrendingUp },
          { label: t("income.month3"), value: opportunity.month3, icon: TrendingUp },
          { label: t("income.month6"), value: opportunity.month6, icon: Rocket },
          { label: t("income.timeToFirstEarning"), value: opportunity.timeToFirstEarning, icon: CalendarDays },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-border/60 bg-background/60 p-3"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <m.icon className="size-3" />
              {m.label}
            </div>
            <p className="mt-1 text-sm font-bold leading-snug text-foreground">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
              {t("income.requiredSkills")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {opportunity.requiredSkills.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
              {t("income.tools")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {opportunity.tools.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
              {t("income.actionPlan")}
            </p>
            <ol className="space-y-1">
              {opportunity.actionPlan7Day.map((step, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-xs leading-relaxed text-foreground/85"
                >
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-800">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-orange-800">
              <AlertTriangle className="size-3.5" />
              {t("income.realityCheck")}
            </p>
            <p className="text-xs leading-relaxed text-orange-800/90">
              {opportunity.realityCheck}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Income() {
  const { t, lang } = useLanguage();
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<IncomeResponse | null>(null);
  const [error, setError] = useState("");

  const generate = async () => {
    setStatus("loading");
    setError("");
    try {
      const res = await api.income();
      setData(res);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate.");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50 via-amber-50 to-teal-50 p-6 md:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
              <IndianRupee className="size-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {t("income.title")}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                {t("income.subtitle")}
              </p>
            </div>
          </div>
          {status !== "loading" && (
            <Button
              className="cursor-pointer bg-gradient-to-br from-orange-500 to-amber-500 text-white hover:opacity-90"
              onClick={() => void generate()}
            >
              {data ? (
                <>
                  <RefreshCw className="size-4" />
                  {t("income.regenerate")}
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {t("income.generate")}
                </>
              )}
            </Button>
          )}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-orange-200 bg-white/70 px-3 py-2.5 text-xs leading-relaxed text-orange-800">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {t("income.estimatesNote")}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center"
          >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400/15 to-amber-400/15 text-orange-500">
              <Target className="size-7" />
            </div>
            <div>
              <p className="font-semibold">{t("income.generate")}</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                We&apos;ll use your subjects, level, district, devices and free
                hours to build ideas that fit your real life.
              </p>
            </div>
            <Button
              className="cursor-pointer bg-gradient-to-br from-orange-500 to-amber-500 text-white hover:opacity-90"
              onClick={() => void generate()}
            >
              <Sparkles className="size-4" />
              {t("income.generate")}
            </Button>
          </motion.div>
        )}

        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-border/70 bg-card"
          >
            <Loader2 className="size-8 animate-spin text-teal-600" />
            <p className="text-sm font-medium text-muted-foreground">
              {t("common.generating")}
            </p>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"
          >
            <p className="text-sm font-semibold text-destructive">{error}</p>
            <Button
              variant="outline"
              className="mt-4 cursor-pointer"
              onClick={() => void generate()}
            >
              {t("tool.retry")}
            </Button>
          </motion.div>
        )}

        {status === "done" && data && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "gap-1 border px-3 py-1",
                  data.source === "ai"
                    ? "border-teal-200 bg-teal-50 text-teal-800"
                    : "border-amber-200 bg-amber-50 text-amber-800",
                )}
              >
                {data.source === "ai" ? (
                  <>
                    <Sparkles className="size-3" />
                    {t("income.aiBadge")}
                  </>
                ) : (
                  <>
                    <Target className="size-3" />
                    {t("income.templateBadge")}
                  </>
                )}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {lang === "kn"
                  ? "ಎಲ್ಲಾ ಅಂಕಿಅಂಶಗಳು ಅಂದಾಜುಗಳು."
                  : "All figures are estimates."}
              </span>
            </div>
            {data.opportunities.map((op, i) => (
              <OpportunityCard key={op.opportunity} opportunity={op} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
