import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  FolderOpen,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  Rocket,
  TrendingUp,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Navigate, NavLink, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/language";
import { GuruShaktiLogo } from "./GuruShaktiLogo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const NAV_ITEMS: {
  to: string;
  icon: LucideIcon;
  key: "nav.dashboard" | "nav.toolkit" | "nav.income" | "nav.documents" | "nav.mission";
}[] = [
  { to: "/dashboard", icon: LayoutDashboard, key: "nav.dashboard" },
  { to: "/toolkit", icon: Wand2, key: "nav.toolkit" },
  { to: "/income", icon: TrendingUp, key: "nav.income" },
  { to: "/documents", icon: FolderOpen, key: "nav.documents" },
  { to: "/mission", icon: Rocket, key: "nav.mission" },
];

function initials(name?: string): string {
  const parts = (name ?? "T").trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "T";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 cursor-pointer">
          <Languages className="size-4" />
          <span className="hidden sm:inline text-xs font-medium">
            {lang === "kn" ? "ಕನ್ನಡ" : "EN"}
          </span>
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>{t("tool.outputLanguage")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => setLang("en")}
        >
          <span className={cn(lang === "en" && "font-semibold text-primary")}>
            {t("common.english")}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => setLang("kn")}
        >
          <span className={cn(lang === "kn" && "font-semibold text-primary")}>
            {t("common.kannada")}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
          <Avatar className="size-7 bg-primary text-primary-foreground">
            <AvatarFallback className="bg-gradient-to-br from-teal-600 to-emerald-600 text-[11px] font-bold text-white">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[120px] truncate text-xs font-medium md:inline">
            {user?.name}
          </span>
          <ChevronDown className="hidden size-3 opacity-60 md:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate">
          {user?.name}
          <span className="block text-xs font-normal text-muted-foreground truncate">
            {user?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/dashboard")}>
          <LayoutDashboard className="size-4" />
          {t("nav.dashboard")}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/mission")}>
          <Rocket className="size-4" />
          {t("nav.mission")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer"
          onClick={handleSignOut}
        >
          <LogOut className="size-4" />
          {t("common.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      <NavLink
        to="/dashboard"
        onClick={onNavigate}
        className="mb-2 flex items-center justify-center"
        aria-label="GuruShakti AI"
      >
        <GuruShaktiLogo iconOnly iconSize={32} iconClassName="rounded-lg" />
      </NavLink>
      <nav className="flex flex-1 flex-col items-center gap-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const link = (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "group relative flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-muted-foreground transition-all hover:bg-secondary hover:text-foreground",
                  isActive &&
                    "border-teal-200/70 bg-gradient-to-br from-teal-500/15 to-emerald-500/15 text-teal-700",
                )
              }
            >
              <Icon className="size-[18px]" />
            </NavLink>
          );
          return onNavigate ? (
            <div key={item.to} className="w-full">
              {link}
              <span className="pl-1 text-[11px] text-muted-foreground">
                {t(item.key)}
              </span>
            </div>
          ) : (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{t(item.key)}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-1.5">
        <LanguageSwitcher />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 cursor-pointer text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
              aria-label={t("common.signOut")}
            >
              <LogOut className="size-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("common.signOut")}</TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}

function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col gap-2 border-r bg-card/95 p-4 backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <GuruShaktiLogo iconSize={36} wordmarkClassName="h-9" />
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer"
                onClick={onClose}
                aria-label={t("common.cancel")}
              >
                <X className="size-5" />
              </Button>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                        isActive &&
                          "bg-gradient-to-r from-teal-500/15 to-emerald-500/15 font-semibold text-teal-700",
                      )
                    }
                  >
                    <Icon className="size-5" />
                    {t(item.key)}
                  </NavLink>
                );
              })}
            </div>
            <div className="mt-auto border-t pt-3">
              <UserMenu />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Users must finish onboarding before entering the app.
  if (user && !user.onboardingComplete && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop narrow sidebar (w-14) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-14 flex-col items-center gap-2 border-r border-border/70 bg-white/70 py-3 backdrop-blur md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile slide-in drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Header (h-14) */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/70 bg-white/70 px-3 backdrop-blur md:pl-[68px]">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer md:hidden"
          onClick={() => setDrawerOpen(true)}
          aria-label="Menu"
        >
          <Menu className="size-5" />
        </Button>
        <button
          type="button"
          className="flex cursor-pointer items-center rounded-lg px-1 py-1 transition-opacity hover:opacity-80"
          onClick={() => navigate("/dashboard")}
          aria-label="Go to dashboard"
        >
          <GuruShaktiLogo iconSize={36} wordmarkClassName="h-8 sm:h-9" />
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </header>

      {/* Content */}
      <main className="md:pl-14">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
