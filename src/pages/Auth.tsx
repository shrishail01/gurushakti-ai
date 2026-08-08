import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { GuruShaktiLogo } from "@/components/GuruShaktiLogo";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

export default function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn, register } =
    useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (mode === "signup" && name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "signup") {
        await register(name.trim(), email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-teal-400/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full bg-orange-300/15 blur-3xl"
      />

      <Link
        to="/"
        className="absolute top-5 left-5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t("common.backToLanding")}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass soft-shadow w-full max-w-md rounded-3xl p-8"
      >
        <div className="mb-6 flex justify-center">
          <GuruShaktiLogo iconSize={52} wordmarkClassName="h-7" />
        </div>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-muted/60 p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={cn(
                "rounded-lg py-2 text-sm font-semibold transition-all cursor-pointer",
                mode === m
                  ? "bg-card shadow-sm text-teal-800"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "signin" ? t("common.signIn") : t("common.signUp")}
            </button>
          ))}
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {mode === "signin"
              ? t("auth.signInTitle")
              : t("auth.createTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? t("auth.signInSubtitle")
              : t("auth.createSubtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("auth.name")}</Label>
              <div className="relative">
                <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  className="pl-9"
                  placeholder={t("auth.namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                className="pl-9"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                className="pl-9"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full cursor-pointer bg-brand-gradient text-white hover:opacity-90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {mode === "signup" ? t("auth.createTitle") : t("common.signIn")}…
              </>
            ) : (
              <>
                {mode === "signup" ? t("common.signUp") : t("common.signIn")}
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        <button
          type="button"
          className="mt-5 w-full cursor-pointer text-center text-sm font-medium text-teal-800 hover:underline"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
        >
          {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}
        </button>
      </motion.div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Passwords are hashed and stored securely · Sessions use HTTP-only
        cookies
      </p>
    </div>
  );
}
