import { motion } from "framer-motion";
import {
  BookOpen,
  Download,
  GraduationCap,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/language";
import type { QuestionPapersResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Filters = {
  subject: string;
  semester: string;
  year: string;
  university: string;
};

const EMPTY_FILTERS: Filters = {
  subject: "all",
  semester: "all",
  year: "all",
  university: "all",
};

export default function QuestionPapers() {
  const { t, lang } = useLanguage();

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [data, setData] = useState<QuestionPapersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .listQuestionPapers({
        q: query.trim() || undefined,
        subject: filters.subject !== "all" ? filters.subject : undefined,
        semester: filters.semester !== "all" ? filters.semester : undefined,
        year: filters.year !== "all" ? filters.year : undefined,
        university:
          filters.university !== "all" ? filters.university : undefined,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load papers.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, filters]);

  const hasActiveFilters = useMemo(() => {
    return (
      query.trim() !== "" ||
      Object.values(filters).some((value) => value !== "all")
    );
  }, [query, filters]);

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAll = () => {
    setQuery("");
    setFilters(EMPTY_FILTERS);
  };

  const filterOptions = data?.filters;
  const items = data?.items ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <p className="text-sm font-medium text-muted-foreground">
          {t("papers.subtitle")}
        </p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-extrabold tracking-tight md:text-4xl">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <GraduationCap className="size-5" />
          </span>
          {t("papers.title")}
        </h1>
      </motion.div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("papers.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            value={filters.subject}
            onValueChange={(v) => setFilter("subject", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("papers.filterSubject")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("papers.allSubjects")}</SelectItem>
              {(filterOptions?.subjects ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.semester}
            onValueChange={(v) => setFilter("semester", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("papers.filterSemester")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("papers.allSemesters")}</SelectItem>
              {(filterOptions?.semesters ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.year}
            onValueChange={(v) => setFilter("year", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("papers.filterYear")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("papers.allYears")}</SelectItem>
              {(filterOptions?.years ?? []).map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.university}
            onValueChange={(v) => setFilter("university", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("papers.filterUniversity")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("papers.allUniversities")}</SelectItem>
              {(filterOptions?.universities ?? []).map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/70 bg-card p-5"
            >
              <Skeleton className="mb-3 h-10 w-10 rounded-xl" />
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="mb-4 h-3 w-1/2" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <Button
            variant="outline"
            className="mt-4 cursor-pointer"
            onClick={clearAll}
          >
            {t("papers.clearFilters")}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center"
        >
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/15 to-emerald-500/15 text-teal-700">
            <BookOpen className="size-7" />
          </div>
          <p className="text-base font-bold tracking-tight">
            {hasActiveFilters ? t("papers.notFound") : t("papers.emptyTitle")}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {hasActiveFilters ? t("papers.notFound") : t("papers.emptyHint")}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              className="mt-5 cursor-pointer text-teal-800"
              onClick={clearAll}
            >
              <X className="size-4" />
              {t("papers.clearFilters")}
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((paper, i) => (
            <motion.div
              key={paper._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04 }}
              className="group flex flex-col rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-teal-300"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/15 to-emerald-500/15 text-teal-700">
                  <BookOpen className="size-5" />
                </div>
                {paper.verified && (
                  <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="size-3" />
                    {t("papers.verified")}
                  </Badge>
                )}
              </div>
              <h3 className="font-bold tracking-tight">{paper.title}</h3>
              {paper.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {paper.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                  {paper.subject}
                </span>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {paper.semester}
                </span>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {paper.year}
                </span>
              </div>
              <p className="mt-2 truncate text-[11px] text-muted-foreground/80">
                {paper.university}
              </p>
              {paper.fileUrl ? (
                <a
                  href={paper.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "mt-4 inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg bg-brand-gradient px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90",
                  )}
                >
                  <Download className="size-3.5" />
                  {t("papers.view")}
                </a>
              ) : (
                <span className="mt-4 inline-block w-fit rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {lang === "kn" ? "ಪತ್ರಿಕೆ ಲಭ್ಯವಾಗಿದೆ" : "Paper available"}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
