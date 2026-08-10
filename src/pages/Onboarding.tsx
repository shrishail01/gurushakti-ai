import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { GuruShaktiLogo } from "@/components/GuruShaktiLogo";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "Teacher", label: "Teacher", labelKn: "ಶಿಕ್ಷಕ" },
  { value: "Student Teacher", label: "Student Teacher", labelKn: "ತರಬೇತಿ ಶಿಕ್ಷಕ" },
  { value: "Lecturer", label: "Lecturer", labelKn: "ಉಪನ್ಯಾಸಕ" },
  { value: "Headmaster / Principal", label: "Headmaster / Principal", labelKn: "ಮುಖ್ಯೋಪಾಧ್ಯಾಯರು" },
  { value: "Other", label: "Other", labelKn: "ಇತರೆ" },
];

const LEVEL_OPTIONS = [
  { value: "Primary (1-5)", label: "Primary (1-5)", labelKn: "ಪ್ರಾಥಮಿಕ (೧-೫)" },
  { value: "Upper Primary (6-8)", label: "Upper Primary (6-8)", labelKn: "ಪ್ರೌಢ ಪ್ರಾಥಮಿಕ (೬-೮)" },
  { value: "High School (9-10)", label: "High School (9-10)", labelKn: "ಪ್ರೌಢಶಾಲೆ (೯-೧೦)" },
  { value: "PU College (11-12)", label: "PU College (11-12)", labelKn: "ಪಿಯುಸಿ (೧೧-೧೨)" },
  { value: "Degree College", label: "Degree College", labelKn: "ಪದವಿ ಕಾಲೇಜು" },
];

const DIGITAL_OPTIONS = [
  { value: "Beginner", label: "Beginner", labelKn: "ಆರಂಭಿಕ" },
  { value: "Intermediate", label: "Intermediate", labelKn: "ಮಧ್ಯಮ" },
  { value: "Advanced", label: "Advanced", labelKn: "ಮುಂದುವರಿದ" },
];

const DEVICE_OPTIONS = [
  { value: "Smartphone", label: "Smartphone", labelKn: "ಸ್ಮಾರ್ಟ್ಫೋನ್" },
  { value: "Laptop", label: "Laptop", labelKn: "ಲ್ಯಾಪ್ಟಾಪ್" },
  { value: "Tablet", label: "Tablet", labelKn: "ಟ್ಯಾಬ್ಲೆಟ್" },
  { value: "Desktop", label: "Desktop", labelKn: "ಡೆಸ್ಕ್ಟಾಪ್" },
  { value: "No device", label: "No device", labelKn: "ಸಾಧನ ಇಲ್ಲ" },
];

const KARNATAKA_DISTRICTS = [
  "Bagalkot",
  "Ballari",
  "Belagavi",
  "Bengaluru Rural",
  "Bengaluru Urban",
  "Bidar",
  "Chamarajanagar",
  "Chikkaballapur",
  "Chikkamagaluru",
  "Chitradurga",
  "Dakshina Kannada",
  "Davanagere",
  "Dharwad",
  "Gadag",
  "Hassan",
  "Haveri",
  "Kalaburagi",
  "Kodagu",
  "Kolar",
  "Koppal",
  "Mandya",
  "Mysuru",
  "Raichur",
  "Ramanagara",
  "Shivamogga",
  "Tumakuru",
  "Udupi",
  "Uttara Kannada",
  "Vijayapura",
  "Yadgir",
];

const YEARS_EXPERIENCE_OPTIONS = [
  "No experience",
  "Less than 1 year",
  "1–5 years",
  "6–10 years",
  "11–15 years",
  "16–20 years",
  "21–25 years",
  "26–30 years",
  "30+ years",
];

const FREE_HOURS_OPTIONS = [
  "Less than 5 hours",
  "5–10 hours",
  "11–15 hours",
  "16–20 hours",
  "21–30 hours",
  "30+ hours",
];

const SKILL_OPTIONS = [
  { value: "English fluency", label: "English fluency", labelKn: "ಇಂಗ್ಲಿಷ್ ಪ್ರಾವೀಣ್ಯ" },
  { value: "Kannada fluency", label: "Kannada fluency", labelKn: "ಕನ್ನಡ ಪ್ರಾವೀಣ್ಯ" },
  { value: "Subject expertise", label: "Subject expertise", labelKn: "ವಿಷಯ ಪರಿಣತಿ" },
  { value: "Classroom management", label: "Classroom management", labelKn: "ತರಗತಿ ನಿರ್ವಹಣೆ" },
  { value: "Exam design", label: "Exam design", labelKn: "ಪರೀಕ್ಷಾ ವಿನ್ಯಾಸ" },
  { value: "Content creation", label: "Content creation", labelKn: "ವಿಷಯ ಸೃಷ್ಟಿ" },
  { value: "Tech skills", label: "Tech skills", labelKn: "ತಂತ್ರಜ್ಞಾನ ಕೌಶಲ್ಯ" },
];

interface FormState {
  role: string;
  teachingLevel: string;
  subjects: string;
  district: string;
  teachingExperienceYears: string;
  freeHoursPerWeek: string;
  preferredLanguage: "en" | "kn";
  digitalSkillLevel: string;
  devices: string[];
  skills: string[];
  incomeGoal: string;
  careerGoal: string;
}

const STEPS = [
  { key: "role", labelKey: "onboarding.step1" },
  { key: "teaching", labelKey: "onboarding.step2" },
  { key: "skills", labelKey: "onboarding.step3" },
  { key: "goals", labelKey: "onboarding.step4" },
] as const;

export default function Onboarding() {
  const { user, updateProfile } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FormState>(() => ({
    role: user?.role ?? "",
    teachingLevel: user?.teachingLevel ?? "",
    subjects: user?.subjects?.join(", ") ?? "",
    district: user?.district ?? "",
    teachingExperienceYears:
      user?.teachingExperienceYears != null
        ? String(user.teachingExperienceYears)
        : "",
    freeHoursPerWeek:
      user?.freeHoursPerWeek != null ? String(user.freeHoursPerWeek) : "",
    preferredLanguage: user?.preferredLanguage ?? "en",
    digitalSkillLevel: user?.digitalSkillLevel ?? "",
    devices: user?.devicesAvailable ?? [],
    skills: user?.skills ?? [],
    incomeGoal: user?.incomeGoal ?? "",
    careerGoal: user?.careerGoal ?? "",
  }));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateStep = (stepIndex: number): boolean => {
    const next: Record<string, string> = {};
    if (stepIndex === 0) {
      if (!form.role) next.role = t("onboarding.required");
      if (!form.teachingLevel) next.teachingLevel = t("onboarding.required");
    }
    if (stepIndex === 1) {
      if (!form.district.trim()) next.district = t("onboarding.required");
    }
    if (stepIndex === 2) {
      if (!form.digitalSkillLevel) next.digitalSkillLevel = t("onboarding.required");
      if (form.devices.length === 0) next.devices = t("onboarding.required");
    }
    if (stepIndex === 3) {
      if (!form.incomeGoal.trim()) next.incomeGoal = t("onboarding.required");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleFinish = async () => {
    if (!validateStep(3)) return;
    setSaving(true);
    try {
      await updateProfile({
        role: form.role,
        teachingLevel: form.teachingLevel,
        subjects: form.subjects
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        district: form.district.trim(),
        teachingExperienceYears: form.teachingExperienceYears || undefined,
        freeHoursPerWeek: form.freeHoursPerWeek || undefined,
        preferredLanguage: form.preferredLanguage,
        digitalSkillLevel: form.digitalSkillLevel,
        devicesAvailable: form.devices,
        skills: form.skills,
        incomeGoal: form.incomeGoal.trim(),
        careerGoal: form.careerGoal.trim(),
        onboardingComplete: true,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setErrors({
        incomeGoal:
          err instanceof Error
            ? err.message
            : "Could not save your profile. Please try again.",
      });
      setSaving(false);
    }
  };

  const progress = useMemo(() => Math.round(((step + 1) / 4) * 100), [step]);

  const fieldError = (key: string) =>
    errors[key] ? (
      <p className="mt-1 text-xs font-medium text-destructive">{errors[key]}</p>
    ) : null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-teal-400/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-orange-300/15 blur-3xl"
      />

      <GuruShaktiLogo iconSize={44} wordmarkClassName="h-6 mb-6" />

      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">
              {t("onboarding.title")}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("onboarding.subtitle")}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800 border border-teal-200">
            {step + 1} / 4
          </span>
        </div>
        <Progress value={progress} className="h-2 bg-teal-100 [&>div]:bg-brand-gradient" />

        {/* Step content */}
        <div className="glass soft-shadow mt-6 rounded-3xl p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <Label className="mb-2 block">{t("onboarding.role")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => set("role", option.value)}
                          className={cn(
                            "rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all cursor-pointer",
                            form.role === option.value
                              ? "border-teal-400 bg-teal-50 text-teal-900"
                              : "border-border bg-white/60 text-muted-foreground hover:border-teal-200",
                          )}
                        >
                          {lang === "kn" ? option.labelKn : option.label}
                        </button>
                      ))}
                    </div>
                    {fieldError("role")}
                  </div>
                  <div>
                    <Label className="mb-2 block">
                      {t("onboarding.teachingLevel")}
                    </Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {LEVEL_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => set("teachingLevel", option.value)}
                          className={cn(
                            "rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all cursor-pointer",
                            form.teachingLevel === option.value
                              ? "border-teal-400 bg-teal-50 text-teal-900"
                              : "border-border bg-white/60 text-muted-foreground hover:border-teal-200",
                          )}
                        >
                          {lang === "kn" ? option.labelKn : option.label}
                        </button>
                      ))}
                    </div>
                    {fieldError("teachingLevel")}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="subjects" className="mb-2 block">
                      {t("onboarding.subjects")}
                    </Label>
                    <Input
                      id="subjects"
                      value={form.subjects}
                      onChange={(e) => set("subjects", e.target.value)}
                      placeholder={t("onboarding.subjectsPlaceholder")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="district" className="mb-2 block">
                      {t("onboarding.district")}
                    </Label>
                    <Select value={form.district} onValueChange={(v) => set("district", v)}>
                      <SelectTrigger id="district" className="w-full">
                        <SelectValue placeholder={t("onboarding.selectDistrict")} />
                      </SelectTrigger>
                      <SelectContent>
                        {KARNATAKA_DISTRICTS.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldError("district")}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="years" className="mb-2 block">
                        {t("onboarding.yearsExperience")}
                      </Label>
                      <Select
                        value={form.teachingExperienceYears}
                        onValueChange={(v) => set("teachingExperienceYears", v)}
                      >
                        <SelectTrigger id="years" className="w-full">
                          <SelectValue placeholder={t("onboarding.selectYears")} />
                        </SelectTrigger>
                        <SelectContent>
                          {YEARS_EXPERIENCE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldError("teachingExperienceYears")}
                    </div>
                    <div>
                      <Label htmlFor="hours" className="mb-2 block">
                        {t("onboarding.freeHours")}
                      </Label>
                      <Select
                        value={form.freeHoursPerWeek}
                        onValueChange={(v) => set("freeHoursPerWeek", v)}
                      >
                        <SelectTrigger id="hours" className="w-full">
                          <SelectValue placeholder={t("onboarding.selectFreeHours")} />
                        </SelectTrigger>
                        <SelectContent>
                          {FREE_HOURS_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldError("freeHoursPerWeek")}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">
                      {t("onboarding.preferredLanguage")}
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["en", "kn"] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => set("preferredLanguage", l)}
                          className={cn(
                            "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all cursor-pointer",
                            form.preferredLanguage === l
                              ? "border-teal-400 bg-teal-50 text-teal-900"
                              : "border-border bg-white/60 text-muted-foreground hover:border-teal-200",
                          )}
                        >
                          {l === "en" ? "English" : "ಕನ್ನಡ"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <Label className="mb-2 block">
                      {t("onboarding.digitalSkillLevel")}
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {DIGITAL_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => set("digitalSkillLevel", option.value)}
                          className={cn(
                            "rounded-xl border px-2 py-2.5 text-center text-sm font-medium transition-all cursor-pointer",
                            form.digitalSkillLevel === option.value
                              ? "border-teal-400 bg-teal-50 text-teal-900"
                              : "border-border bg-white/60 text-muted-foreground hover:border-teal-200",
                          )}
                        >
                          {lang === "kn" ? option.labelKn : option.label}
                        </button>
                      ))}
                    </div>
                    {fieldError("digitalSkillLevel")}
                  </div>
                  <div>
                    <Label className="mb-2 block">
                      {t("onboarding.devices")}
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DEVICE_OPTIONS.map((option) => {
                        const active = form.devices.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              set(
                                "devices",
                                active
                                  ? form.devices.filter((d) => d !== option.value)
                                  : [...form.devices, option.value],
                              )
                            }
                            className={cn(
                              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all cursor-pointer",
                              active
                                ? "border-teal-400 bg-teal-50 text-teal-900"
                                : "border-border bg-white/60 text-muted-foreground hover:border-teal-200",
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-4 shrink-0 items-center justify-center rounded border",
                                active
                                  ? "border-teal-500 bg-teal-500 text-white"
                                  : "border-border bg-white",
                              )}
                            >
                              {active && <Check className="size-3" />}
                            </span>
                            {lang === "kn" ? option.labelKn : option.label}
                          </button>
                        );
                      })}
                    </div>
                    {fieldError("devices")}
                  </div>
                  <div>
                    <Label className="mb-2 block">
                      {t("onboarding.skills")}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {SKILL_OPTIONS.map((option) => {
                        const active = form.skills.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              set(
                                "skills",
                                active
                                  ? form.skills.filter((s) => s !== option.value)
                                  : [...form.skills, option.value],
                              )
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                              active
                                ? "border-teal-400 bg-teal-50 text-teal-900"
                                : "border-border bg-white/60 text-muted-foreground hover:border-teal-200",
                            )}
                          >
                            {lang === "kn" ? option.labelKn : option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="incomeGoal" className="mb-2 block">
                      {t("onboarding.incomeGoal")}
                    </Label>
                    <Input
                      id="incomeGoal"
                      value={form.incomeGoal}
                      onChange={(e) => set("incomeGoal", e.target.value)}
                      placeholder={t("onboarding.incomeGoalPlaceholder")}
                    />
                    {fieldError("incomeGoal")}
                  </div>
                  <div>
                    <Label htmlFor="careerGoal" className="mb-2 block">
                      {t("onboarding.careerGoal")}
                    </Label>
                    <Textarea
                      id="careerGoal"
                      rows={3}
                      value={form.careerGoal}
                      onChange={(e) => set("careerGoal", e.target.value)}
                      placeholder={t("onboarding.careerGoalPlaceholder")}
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs text-orange-800">
                    <Sparkles className="size-4 shrink-0" />
                    {t("income.estimatesNote")}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Nav buttons */}
          <div className="mt-7 flex items-center justify-between">
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0 || saving}
            >
              <ArrowLeft className="size-4" />
              {t("common.back")}
            </Button>
            {step < 3 ? (
              <Button
                className="cursor-pointer bg-brand-gradient text-white hover:opacity-90"
                onClick={handleNext}
              >
                {t("common.next")}
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                className="cursor-pointer bg-brand-gradient text-white hover:opacity-90"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    {t("common.finish")}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
