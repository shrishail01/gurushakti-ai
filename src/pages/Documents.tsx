import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language";
import { api } from "@/lib/api";
import { TOOL_BY_ID } from "@/lib/tools";
import { toolIcon } from "@/lib/toolIcons";
import type { DocumentItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 9;

function formatDate(ts: number, lang: "en" | "kn"): string {
  return new Date(ts).toLocaleDateString(lang === "kn" ? "kn-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Documents() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [items, setItems] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Debounce search input.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listDocuments({
        page,
        limit: PAGE_SIZE,
        q: search,
        favorites: favoritesOnly,
      });
      setItems(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("documents.empty"));
    } finally {
      setLoading(false);
    }
  }, [page, search, favoritesOnly, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFavorite = async (doc: DocumentItem) => {
    const next = !doc.favorited;
    // optimistic update
    setItems((prev) =>
      prev.map((d) => (d._id === doc._id ? { ...d, favorited: next } : d)),
    );
    try {
      const res = await api.favoriteDocument(doc._id, next);
      setItems((prev) =>
        prev.map((d) => (d._id === doc._id ? res.document : d)),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update.");
      setItems((prev) =>
        prev.map((d) => (d._id === doc._id ? { ...d, favorited: !next } : d)),
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteDocument(deleteId);
      toast.success(t("common.delete"));
      setDeleteId(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <p className="text-sm font-medium text-muted-foreground">
          {total} {lang === "kn" ? "ದಾಖಲೆಗಳು" : "documents"}
        </p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-extrabold tracking-tight md:text-4xl">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <FolderOpen className="size-5" />
          </span>
          {t("documents.title")}
        </h1>
      </motion.div>

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("common.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          variant={favoritesOnly ? "default" : "outline"}
          className={cn(
            "cursor-pointer",
            favoritesOnly && "bg-gradient-to-br from-orange-500 to-amber-500 text-white",
          )}
          onClick={() => {
            setFavoritesOnly((f) => !f);
            setPage(1);
          }}
        >
          <Star className={cn("size-4", favoritesOnly && "fill-white")} />
          {t("documents.onlyFavorites")}
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border border-border/70 bg-card p-12 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
          <FileText className="mx-auto mb-3 size-8 text-teal-300" />
          <p className="text-sm font-medium">{t("documents.empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("documents.emptyHint")}
          </p>
          <Button
            size="sm"
            className="mt-4 cursor-pointer bg-brand-gradient text-white hover:opacity-90"
            onClick={() => navigate("/toolkit")}
          >
            {t("nav.toolkit")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((doc, i) => {
            const tool = TOOL_BY_ID[doc.type];
            const Icon = tool ? toolIcon(tool.icon) : FileText;
            return (
              <motion.div
                key={doc._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="group flex flex-col rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-teal-300"
              >
                <button
                  type="button"
                  className="flex flex-1 cursor-pointer flex-col items-start text-left"
                  onClick={() => navigate(`/documents/${doc._id}`)}
                >
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/15 to-emerald-500/15 text-teal-700">
                    <Icon className="size-5" />
                  </div>
                  <p className="line-clamp-1 font-semibold">{doc.title}</p>
                  <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {doc.preview || ""}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge className="bg-secondary text-secondary-foreground">
                      {tool ? (lang === "kn" ? tool.titleKn : tool.title) : doc.type}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground/80">
                      {formatDate(doc.createdAt, lang)}
                    </span>
                  </div>
                </button>
                <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                  <button
                    type="button"
                    aria-label={t("common.favorites")}
                    className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-amber-500"
                    onClick={() => void toggleFavorite(doc)}
                  >
                    <Star
                      className={cn(
                        "size-4",
                        doc.favorited && "fill-amber-400 text-amber-400",
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label={t("common.delete")}
                    className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                    onClick={() => setDeleteId(doc._id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold">
            {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(p + 1, pages))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("documents.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("documents.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {t("documents.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
