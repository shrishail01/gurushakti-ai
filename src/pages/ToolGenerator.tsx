import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Square,
  Wand2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Markdown } from "@/components/Markdown";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api, generateStream, type GenerateDone } from "@/lib/api";
import { useLanguage } from "@/lib/language";
import { CATEGORIES, getTool, type ToolField } from "@/lib/tools";
import { toolIcon } from "@/lib/toolIcons";
import type { OutputLanguage } from "@/lib/types";
import { cn } from "@/lib/utils";

type Status = "idle" | "generating" | "done" | "error";

export default function ToolGenerator() {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = toolId ? getTool(toolId) : undefined;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>(() =>
    user?.preferredLanguage === "kn" ? "kn" : "en",
  );
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [doneInfo, setDoneInfo] = useState<GenerateDone | null>(null);
  const [downloadingPpt, setDownloadingPpt] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);

  // The PPT tool streams invisible "<!-- IMG: query -->" marker lines (used
  // to source real images for the .pptx). Hide them from the on-screen
  // output and from copy so the panel shows only the actual content.
  const displayOutput = output.replace(/<!--\s*IMG:[\s\S]*?-->\s*/g, "");

  // Reset state whenever the tool changes.
  useEffect(() => {
    setOutput("");
    setStatus("idle");
    setErrorMsg("");
    setDoneInfo(null);
    if (!tool) return;

    const initial: Record<string, string> = {};
    for (const field of tool.fields) {
      if (field.type === "select" && field.options?.length) {
        let def = field.options[0].value;
        if (field.fromProfile === "teachingLevel" && user?.teachingLevel) {
          const match = field.options.find((o) => o.value === user.teachingLevel);
          if (match) def = match.value;
        }
        initial[field.name] = def;
      } else if (field.fromProfile) {
        const profileValue = user?.[field.fromProfile];
        if (Array.isArray(profileValue) && profileValue.length) {
          initial[field.name] = profileValue.join(", ");
        } else if (typeof profileValue === "string" && profileValue) {
          initial[field.name] = profileValue;
        } else {
          initial[field.name] = "";
        }
      } else {
        initial[field.name] = "";
      }
    }
    setParameters(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId]);

  // Auto-scroll the output as it streams.
  useEffect(() => {
    if (status === "generating") {
      outputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [output, status]);

  if (!tool) {
    return <Navigate to="/toolkit" replace />;
  }

  const cat = CATEGORIES.find((c) => c.id === tool.category);
  const Icon = toolIcon(tool.icon);

  const setParam = (name: string, value: string) => {
    setParameters((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerate = () => {
    if (!tool) return;
    const missing = tool.fields.filter(
      (field) => field.required && !parameters[field.name]?.trim(),
    );
    if (missing.length) {
      const first = missing[0];
      setErrorMsg(
        `${lang === "kn" ? first.labelKn : first.label}: ${t("onboarding.required")}`,
      );
      setStatus("error");
      return;
    }
    void startGeneration();
  };

  const startGeneration = async () => {
    if (!tool) return;
    setOutput("");
    setDoneInfo(null);
    setErrorMsg("");
    setStatus("generating");
    const controller = new AbortController();
    abortRef.current = controller;

    await generateStream({
      toolId: tool.id,
      parameters,
      outputLanguage,
      signal: controller.signal,
      onDelta: (text) => setOutput((prev) => prev + text),
      onDone: (data) => {
        setDoneInfo(data);
        setStatus("done");
        toast.success(`${t("common.saved")} · ${t("common.saveTime")}`);
      },
      onError: (message) => {
        setErrorMsg(message);
        setStatus("error");
      },
    });
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(displayOutput);
      toast.success(t("common.copied"));
    } catch {
      toast.error("Clipboard unavailable — select the text and copy manually.");
    }
  };

  /** PPT Presentation tool only: rebuild the generated slides as a .pptx. */
  const isPptTool = tool?.id === "ppt-outline";
  const handleDownloadPpt = async () => {
    if (!output || downloadingPpt || !doneInfo?.documentId) return;
    setDownloadingPpt(true);
    try {
      const { downloadPptxFromMarkdown } = await import("@/lib/pptx");
      const baseName =
        doneInfo?.title || `${tool?.title ?? "Presentation"} — ${parameters.topic ?? ""}`.trim();

      // Fetch the saved document from MongoDB — the backend has already resolved
      // all ![IMAGE_SEARCH:] placeholders to real Wikimedia URLs before saving.
      // The raw streamed `output` still contains unresolved placeholders.
      let pptContent = output;
      try {
        const savedDoc = await api.getDocument(doneInfo.documentId);
        if (savedDoc.document.content) {
          pptContent = savedDoc.document.content;
        }
      } catch {
        // Fall back to raw output if fetch fails
      }

      const { imageCount } = await downloadPptxFromMarkdown(
        pptContent,
        baseName || tool?.title || "Presentation",
      );
      toast.success(
        imageCount > 0
          ? t("tool.pptReadyWithImages").replace("{count}", String(imageCount))
          : t("tool.pptReady"),
      );
    } catch {
      toast.error(t("tool.pptFailed"));
    } finally {
      setDownloadingPpt(false);
    }
  };

  const renderField = (field: ToolField) => {
    const value = parameters[field.name] ?? "";
    const label = lang === "kn" ? field.labelKn : field.label;
    const placeholder =
      lang === "kn" ? field.placeholderKn ?? field.placeholder : field.placeholder;

    if (field.type === "select" && field.options) {
      return (
        <div key={field.name} className="space-y-1.5">
          <label className="flex items-center gap-1 text-sm font-medium">
            {label}
            {field.required && <span className="text-destructive">*</span>}
          </label>
          <Select value={value} onValueChange={(v) => setParam(field.name, v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={label} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {lang === "kn" ? option.labelKn : option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.name} className="space-y-1.5">
          <label className="flex items-center gap-1 text-sm font-medium">
            {label}
            {field.required && <span className="text-destructive">*</span>}
          </label>
          <Textarea
            rows={4}
            value={value}
            onChange={(e) => setParam(field.name, e.target.value)}
            placeholder={placeholder}
          />
        </div>
      );
    }

    return (
      <div key={field.name} className="space-y-1.5">
        <label className="flex items-center gap-1 text-sm font-medium">
          {label}
          {field.required && <span className="text-destructive">*</span>}
        </label>
        <Input
          type={field.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => setParam(field.name, e.target.value)}
          placeholder={placeholder}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate("/toolkit")}
          className="mb-4 flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("nav.toolkit")}
        </button>
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white">
            <Icon className="size-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {lang === "kn" ? tool.titleKn : tool.title}
              </h1>
              {cat && (
                <Badge className="bg-secondary text-secondary-foreground">
                  {lang === "kn" ? cat.labelKn : cat.label}
                </Badge>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {lang === "kn" ? tool.descriptionKn : tool.description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="h-fit rounded-2xl border border-border/70 bg-card p-5 md:p-6"
        >
          <h2 className="mb-4 flex items-center gap-2 font-bold tracking-tight">
            <Wand2 className="size-4 text-teal-700" />
            Details
          </h2>
          <div className="space-y-4">
            {tool.fields.map(renderField)}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {t("tool.outputLanguage")}
              </label>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border/70 bg-muted/50 p-1">
                {(["en", "kn", "both"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setOutputLanguage(l)}
                    className={cn(
                      "cursor-pointer rounded-lg py-1.5 text-xs font-semibold transition-all",
                      outputLanguage === l
                        ? "bg-card text-teal-800 shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {l === "en" ? t("tool.en") : l === "kn" ? t("tool.kn") : t("tool.both")}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full cursor-pointer bg-brand-gradient text-white hover:opacity-90"
              onClick={handleGenerate}
              disabled={status === "generating"}
            >
              {status === "generating" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("common.generating")}
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {t("common.generate")}
                </>
              )}
            </Button>
            {status === "generating" && (
              <Button
                variant="outline"
                className="w-full cursor-pointer text-destructive"
                onClick={handleStop}
              >
                <Square className="size-3.5" />
                {t("tool.stop")}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Output */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          ref={outputRef}
          className="h-fit min-h-[320px] rounded-2xl border border-border/70 bg-card p-5 md:p-6"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-bold tracking-tight">
              <FileText className="size-4 text-teal-700" />
              Output
            </h2>
            {status === "done" && (
              <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="size-3" />
                {t("common.saved")}
              </Badge>
            )}
          </div>

          <AnimatePresence mode="wait">
            {status === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 text-center"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/15 to-emerald-500/15 text-teal-700">
                  <Sparkles className="size-6" />
                </div>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Fill in the details and press{" "}
                  <span className="font-semibold text-foreground">
                    {t("common.generate")}
                  </span>{" "}
                  — your {lang === "kn" ? tool.titleKn : tool.title} will appear
                  here.
                </p>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center"
              >
                <p className="text-sm font-semibold text-destructive">
                  {errorMsg || t("tool.retry")}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    onClick={handleGenerate}
                  >
                    <RefreshCw className="size-4" />
                    {t("common.regenerate")}
                  </Button>
                  <Button
                    className="cursor-pointer bg-brand-gradient text-white hover:opacity-90"
                    onClick={handleGenerate}
                  >
                    <Sparkles className="size-4" />
                    {t("common.generate")}
                  </Button>
                </div>
              </motion.div>
            )}

            {(status === "generating" || status === "done") && output && (
              <motion.div
                key="output"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {status === "generating" && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-teal-200/70 bg-teal-50/60 px-3 py-2 text-xs font-semibold text-teal-800">
                    <Loader2 className="size-3.5 animate-spin" />
                    {t("common.generating")}
                    <span className="inline-flex gap-0.5">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce [animation-delay:120ms]">.</span>
                      <span className="animate-bounce [animation-delay:240ms]">.</span>
                    </span>
                  </div>
                )}
                <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-border/70 bg-background/60 p-4 md:p-5">
                  <Markdown content={displayOutput} />
                  {status === "generating" && (
                    <span className="mt-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-teal-500" />
                  )}
                </div>
              </motion.div>
            )}

            {status === "done" && !output && (
              <motion.div
                key="done-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-dashed border-border/80 p-8 text-center text-sm text-muted-foreground"
              >
                {t("documents.empty")}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          {status === "done" && output && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={handleCopy}
              >
                <Copy className="size-4" />
                {t("common.copy")}
              </Button>
              {isPptTool && (
                <Button
                  variant="outline"
                  className="cursor-pointer border-teal-300 bg-teal-50/70 text-teal-800 hover:bg-teal-100"
                  onClick={handleDownloadPpt}
                  disabled={downloadingPpt}
                >
                  {downloadingPpt ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  {downloadingPpt ? t("tool.downloadingPpt") : t("tool.downloadPpt")}
                </Button>
              )}
              <Button
                variant="outline"
                className="cursor-pointer text-teal-800"
                onClick={() =>
                  doneInfo?.documentId &&
                  navigate(`/documents/${doneInfo.documentId}`)
                }
              >
                <ArrowUpRight className="size-4" />
                {t("tool.openInDocuments")}
              </Button>
              <Button
                className="cursor-pointer bg-brand-gradient text-white hover:opacity-90"
                onClick={handleGenerate}
              >
                <RefreshCw className="size-4" />
                {t("common.regenerate")}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
