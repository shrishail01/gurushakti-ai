import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Clock3,
  FileText,
  Flame,
  IndianRupee,
  ListChecks,
  Rocket,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/language";
import { cn } from "@/lib/utils";

const TASKS = [
  { id: "lesson-plan", key: "mission.taskLessonPlan", to: "/toolkit/lesson-plan" },
  { id: "worksheet", key: "mission.taskWorksheet", to: "/toolkit/worksheet" },
  { id: "quiz-generator", key: "mission.taskQuiz", to: "/toolkit/quiz-generator" },
  { id: "parent-message", key: "mission.taskParent", to: "/toolkit/parent-message" },
] as const;

const STORAGE_KEY = "gs_tasks";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMinutes(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${min}m`;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative size-32">
      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="10"
        />
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tracking-tight">{score}</span>
        <span className="text-[10px] font-medium text-muted-foreground">
          / 100
        </span>
      </div>
    </div>
  );
}

export default function Mission() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { date: string; items: string[] };
        if (parsed.date === todayKey()) setDone(parsed.items);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleTask = (id: string) => {
    setDone((prev) => {
      const next = prev.includes(id)
        ? prev.filter((d) => d !== id)
        : [...prev, id];
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ date: todayKey(), items: next }),
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  const progress = Math.round((done.length / TASKS.length) * 100);

  const score = useMemo(() => {
    const docs = Math.min(user?.documentsGenerated ?? 0, 40);
    const minutes = Math.min((user?.timeSavedMinutes ?? 0) / 15, 40);
    const streak = Math.min(user?.streakDays ?? 0, 20);
    return Math.min(
      100,
      Math.round(docs * 1.6 + minutes * 1.2 + streak * 1.5 + (done.length / TASKS.length) * 10),
    );
  }, [user, done]);

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

  const allDone = TASKS.length > 0 && done.length === TASKS.length;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <p className="text-sm font-medium text-muted-foreground">
          {t("mission.subtitle")}
        </p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-extrabold tracking-tight md:text-4xl">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <Rocket className="size-5" />
          </span>
          {t("mission.title")}
        </h1>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Score + stats */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="space-y-4"
        >
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/70 bg-card p-6 sm:flex-row">
            <ScoreRing score={score} />
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold text-muted-foreground">
                {t("mission.productivityScore")}
              </p>
              <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                {lang === "kn"
                  ? "ದಾಖಲೆಗಳು, ಉಳಿಸಿದ ಸಮಯ ಮತ್ತು ಸರಣಿಯಿಂದ ಲೆಕ್ಕಹಾಕಲಾಗಿದೆ."
                  : "Calculated from your documents, saved time and streak."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border/70 bg-card p-4 text-center"
              >
                <div
                  className={cn(
                    "mx-auto mb-2 flex size-9 items-center justify-center rounded-lg bg-gradient-to-br",
                    stat.tint,
                  )}
                >
                  <stat.icon className="size-4" />
                </div>
                <p className="truncate text-lg font-extrabold tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Income action */}
          <div className="flex flex-col gap-3 rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50 to-amber-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white">
                <IndianRupee className="size-5" />
              </div>
              <div>
                <p className="font-bold tracking-tight">
                  {t("mission.incomeAction")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("mission.incomeActionCta")}
                </p>
              </div>
            </div>
            <Button
              className="w-fit cursor-pointer bg-gradient-to-br from-orange-500 to-amber-500 text-white hover:opacity-90"
              onClick={() => navigate("/income")}
            >
              {t("nav.income")}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </motion.div>

        {/* Today's tasks */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="rounded-2xl border border-border/70 bg-card p-6"
        >
          <div className="mb-1 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <ListChecks className="size-5 text-teal-700" />
              {t("mission.todayTasks")}
            </h2>
            <span className="text-sm font-bold text-teal-700">
              {done.length}/{TASKS.length}
            </span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            {t("mission.tasksHint")}
          </p>

          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-brand-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="space-y-2">
            {TASKS.map((task) => {
              const active = done.includes(task.id);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
                    active
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 line-through decoration-emerald-400/60"
                      : "border-border bg-background/50 text-foreground hover:border-teal-300",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                      active
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border bg-white",
                    )}
                  >
                    {active && <Check className="size-3.5" />}
                  </span>
                  <span className="flex-1">{t(task.key)}</span>
                  <ArrowRight
                    className={cn(
                      "size-4 text-muted-foreground",
                      active && "text-emerald-600",
                    )}
                  />
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {TASKS.map((task) => (
              <Button
                key={task.id}
                variant="outline"
                size="sm"
                className="cursor-pointer text-teal-800"
                onClick={() => navigate(task.to)}
              >
                <ArrowRight className="size-3.5" />
                {t(task.key).replace(/^[^—]*—?\s*/, "").split(" ").slice(0, 2).join(" ")}
              </Button>
            ))}
          </div>

          {allDone && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800"
            >
              {t("mission.greatJob")}
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
