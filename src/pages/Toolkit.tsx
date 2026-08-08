import { motion } from "framer-motion";
import { ArrowUpRight, Search, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useLanguage } from "@/lib/language";
import { CATEGORIES, TOOLS, type ToolCategory } from "@/lib/tools";
import { CATEGORY_ICONS, toolIcon } from "@/lib/toolIcons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function Toolkit() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      if (category !== "all" && tool.category !== category) return false;
      if (!q) return true;
      return (
        tool.title.toLowerCase().includes(q) ||
        tool.titleKn.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <p className="text-sm font-medium text-muted-foreground">
          {t("toolkit.subtitle")}
        </p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-extrabold tracking-tight md:text-4xl">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <Wand2 className="size-5" />
          </span>
          {t("toolkit.title")}
          <Badge className="bg-teal-50 text-teal-800 border border-teal-200">
            {TOOLS.length} {t("toolkit.tools")}
          </Badge>
        </h1>
      </motion.div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("toolkit.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              category === "all"
                ? "border-teal-400 bg-teal-50 text-teal-900"
                : "border-border bg-card text-muted-foreground hover:border-teal-200",
            )}
          >
            {t("common.all")}
          </button>
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id];
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  category === cat.id
                    ? "border-teal-400 bg-teal-50 text-teal-900"
                    : "border-border bg-card text-muted-foreground hover:border-teal-200",
                )}
              >
                {Icon && <Icon className="size-3.5" />}
                {lang === "kn" ? cat.labelKn : cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tool grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center text-sm text-muted-foreground">
          {t("documents.empty")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tool, i) => {
            const Icon = toolIcon(tool.icon);
            const cat = CATEGORIES.find((c) => c.id === tool.category);
            return (
              <motion.button
                key={tool.id}
                type="button"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.03 }}
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/toolkit/${tool.id}`)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-card p-5 text-left transition-colors hover:border-teal-300"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/15 to-emerald-500/15 text-teal-700 transition-transform group-hover:scale-110">
                    <Icon className="size-5" />
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <h3 className="font-bold tracking-tight">
                  {lang === "kn" ? tool.titleKn : tool.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {lang === "kn" ? tool.descriptionKn : tool.description}
                </p>
                {cat && (
                  <span className="mt-3 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                    {lang === "kn" ? cat.labelKn : cat.label}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="flex justify-center pt-2">
        <Button
          variant="outline"
          className="cursor-pointer border-teal-200 bg-white/60 text-teal-800 hover:bg-teal-50"
          onClick={() => navigate("/documents")}
        >
          {t("nav.documents")}
        </Button>
      </div>
    </div>
  );
}
