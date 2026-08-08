import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  FileText,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
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
import { Markdown } from "@/components/Markdown";
import { useLanguage } from "@/lib/language";
import { api } from "@/lib/api";
import { CATEGORIES, TOOL_BY_ID } from "@/lib/tools";
import { toolIcon } from "@/lib/toolIcons";
import type { DocumentItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatDate(ts: number, lang: "en" | "kn"): string {
  return new Date(ts).toLocaleDateString(lang === "kn" ? "kn-IN" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DocumentDetail() {
  const { docId } = useParams<{ docId: string }>();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const res = await api.getDocument(docId);
      setDoc(res.document);
      setNotFound(false);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCopy = async () => {
    if (!doc) return;
    try {
      await navigator.clipboard.writeText(doc.content);
      toast.success(t("common.copied"));
    } catch {
      toast.error("Clipboard unavailable — select the text and copy manually.");
    }
  };

  const toggleFavorite = async () => {
    if (!doc) return;
    try {
      const res = await api.favoriteDocument(doc._id, !doc.favorited);
      setDoc(res.document);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update.");
    }
  };

  const handleDelete = async () => {
    if (!doc) return;
    try {
      await api.deleteDocument(doc._id);
      toast.success(t("common.delete"));
      navigate("/documents");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !doc) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
        <FileText className="mx-auto mb-3 size-8 text-teal-300" />
        <p className="text-sm font-medium">{t("documents.notFound")}</p>
        <Button
          variant="outline"
          className="mt-4 cursor-pointer"
          onClick={() => navigate("/documents")}
        >
          <ArrowLeft className="size-4" />
          {t("nav.documents")}
        </Button>
      </div>
    );
  }

  const tool = TOOL_BY_ID[doc.type];
  const cat = tool ? CATEGORIES.find((c) => c.id === tool.category) : undefined;
  const Icon = tool ? toolIcon(tool.icon) : FileText;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate("/documents")}
        className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("nav.documents")}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-border/70 bg-card p-5 md:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
              <Icon className="size-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">
                  {doc.title}
                </h1>
                {doc.favorited && (
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {tool && (
                  <Badge className="bg-secondary text-secondary-foreground">
                    {lang === "kn" ? tool.titleKn : tool.title}
                  </Badge>
                )}
                {cat && (
                  <Badge variant="outline">
                    {lang === "kn" ? cat.labelKn : cat.label}
                  </Badge>
                )}
                <span>{formatDate(doc.createdAt, lang)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => void toggleFavorite()}
            >
              <Star
                className={cn(
                  "size-4",
                  doc.favorited && "fill-amber-400 text-amber-400",
                )}
              />
              {t("common.favorites")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => void handleCopy()}
            >
              <Copy className="size-4" />
              {t("common.copy")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
              {t("common.delete")}
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="rounded-2xl border border-border/70 bg-card p-5 md:p-7"
      >
        <Markdown content={doc.content} />
      </motion.div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
