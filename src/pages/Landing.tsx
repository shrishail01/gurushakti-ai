import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  IndianRupee,
  Languages,
  MessageCircle,
  MessagesSquare,
  Rocket,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { GuruShaktiLogo } from "@/components/GuruShaktiLogo";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const FEATURES = [
  {
    icon: BookOpen,
    title: "Lesson Planning",
    titleKn: "ಪಾಠ ಯೋಜನೆ",
    desc: "Complete lesson plans, daily plans and micro-teaching plans in minutes.",
  },
  {
    icon: ClipboardList,
    title: "Assessments & Exams",
    titleKn: "ಮೌಲ್ಯಮಾಪನ",
    desc: "Question papers, blueprints, rubrics, quizzes — with mark distributions.",
  },
  {
    icon: FileText,
    title: "Reports & Documents",
    titleKn: "ವರದಿಗಳು",
    desc: "Observation, internship, action research and annual reports.",
  },
  {
    icon: MessagesSquare,
    title: "Parent Communication",
    titleKn: "ಸಂವಹನ",
    desc: "Warm parent messages, school notices, leave letters and speeches.",
  },
  {
    icon: IndianRupee,
    title: "Income Opportunities",
    titleKn: "ಆದಾಯ",
    desc: "5 personalised side-income ideas built from your real profile.",
  },
  {
    icon: Rocket,
    title: "Career Growth",
    titleKn: "ವೃತ್ತಿ",
    desc: "Resumes, cover letters, interview prep and demo class plans.",
  },
];

const TOOL_SNIPPETS = [
  "Lesson Plan",
  "Worksheet",
  "Question Paper",
  "Quiz Generator",
  "Parent Message",
  "Resume Builder",
  "Blueprints",
  "Rubrics",
  "Speeches",
  "Translation",
];

const TESTIMONIALS = [
  {
    name: "Lakshmi R.",
    role: "Government High School, Mysuru",
    quote:
      "I used to spend my Sundays making worksheets. GuruShakti finishes them in two minutes — in Kannada, exactly how my students need them.",
  },
  {
    name: "Manjunath K.",
    role: "Primary School Teacher, Hubballi",
    quote:
      "The question papers come with proper blueprints and mark distribution. My headmaster asked who helped me prepare them!",
  },
  {
    name: "Priya S.",
    role: "B.Ed. Student, Bengaluru",
    quote:
      "Internship reports, micro-teaching plans, observation reports — everything I needed for college submission, ready instantly.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const primaryCta = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-8">
          <Link to="/" aria-label="GuruShakti AI home">
            <GuruShaktiLogo iconSize={38} wordmarkClassName="h-6 sm:h-7" />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#tools" className="transition-colors hover:text-foreground">
              27 Tools
            </a>
            <a href="#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer gap-1"
              onClick={() => (lang === "kn" ? null : navigate("/"))}
              disabled
            >
              <Languages className="size-4" />
              {t("common.kannada")}
            </Button>
            <Button
              size="sm"
              className="cursor-pointer bg-brand-gradient text-white hover:opacity-90"
              onClick={primaryCta}
            >
              {isAuthenticated ? t("nav.dashboard") : t("common.signIn")}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-40 -left-24 h-80 w-80 rounded-full bg-orange-300/20 blur-3xl"
        />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-14 pb-16 md:grid-cols-2 md:px-8 md:pt-20 md:pb-24">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0}
          >
            <Badge className="mb-5 gap-1.5 rounded-full border-teal-200 bg-teal-50 px-3 py-1 text-teal-800">
              <Sparkles className="size-3.5" />
              For Karnataka&apos;s teachers · English & ಕನ್ನಡ
            </Badge>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
              Teach less.
              <br />
              <span className="text-brand-gradient">Create more.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              GuruShakti AI generates lesson plans, worksheets, question
              papers, parent messages and more — in English or{" "}
              <span className="font-semibold text-foreground">ಕನ್ನಡ</span> —
              so you can spend your evenings with your family, not your
              notebook.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="cursor-pointer bg-brand-gradient text-white shadow-lg shadow-teal-600/20 hover:opacity-90"
                onClick={primaryCta}
              >
                Get started free
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="cursor-pointer border-teal-200 bg-white/60 text-teal-800 hover:bg-teal-50"
                onClick={() => navigate(isAuthenticated ? "/toolkit" : "/login")}
              >
                <Wand2 className="size-4" />
                Explore 27 tools
              </Button>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                { value: "27", label: "AI tools" },
                { value: "2", label: "languages" },
                { value: "15", label: "min saved per doc" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-extrabold text-teal-700">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="glass soft-shadow relative rounded-3xl p-5 md:p-6">
              <div className="flex items-center justify-between border-b border-border/70 pb-4">
                <div className="flex items-center gap-2">
                  <GuruShaktiLogo iconOnly iconSize={28} />
                  <div>
                    <p className="text-sm font-bold leading-none">Lesson Plan</p>
                    <p className="text-xs text-muted-foreground">
                      Class 6 · Science · Fractions
                    </p>
                  </div>
                </div>
                <Badge className="bg-teal-50 text-teal-700 border-teal-200">
                  Generating…
                </Badge>
              </div>
              <div className="mt-4 space-y-2.5">
                {[92, 78, 96, 60, 88].map((w, i) => (
                  <div
                    key={i}
                    className="h-2.5 rounded-full bg-gradient-to-r from-teal-100 via-teal-200/70 to-emerald-100"
                    style={{ width: `${w}%` }}
                  />
                ))}
                <div className="flex items-center gap-2 pt-2 text-teal-700">
                  <Zap className="size-4" />
                  <span className="text-xs font-semibold">
                    Done in 12 seconds · +15 min saved
                  </span>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { icon: Wand2, label: "Generate" },
                  { icon: CheckCircle2, label: "Saved" },
                  { icon: Languages, label: "ಕನ್ನಡ" },
                ].map((chip) => (
                  <div
                    key={chip.label}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-white/70 px-2 py-3"
                  >
                    <chip.icon className="size-4 text-teal-700" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {chip.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="glass absolute -bottom-5 -left-4 hidden rounded-2xl px-4 py-3 sm:block"
            >
              <p className="text-xs font-semibold text-teal-800">
                "ಕನ್ನಡದಲ್ಲಿ ಪ್ರಶ್ನೆ ಪತ್ರಿಕೆ ಸಿದ್ಧ!"
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="border-t border-border/60 bg-white/50">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-20">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="mx-auto max-w-2xl text-center"
          >
            <Badge className="mb-4 rounded-full border-orange-200 bg-orange-50 px-3 py-1 text-orange-700">
              Everything a teacher needs
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              One AI toolkit for your{" "}
              <span className="text-brand-gradient">entire teaching day</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              From planning to assessments, reports to communication — 27 tools
              built for the way Karnataka&apos;s teachers actually work.
            </p>
          </motion.div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                custom={i % 3}
                whileHover={{ y: -4 }}
                className="group rounded-2xl border border-border/70 bg-background/80 p-6 transition-colors hover:border-teal-200"
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/15 to-emerald-500/15 text-teal-700 transition-transform group-hover:scale-110">
                  <feature.icon className="size-5" />
                </div>
                <h3 className="flex items-center gap-2 text-base font-bold tracking-tight">
                  {feature.title}
                  <span className="text-xs font-medium text-muted-foreground">
                    · {feature.titleKn}
                  </span>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Tools preview ---------- */}
      <section id="tools" className="border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-20">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="flex flex-col items-center gap-4 text-center"
          >
            <Badge className="mb-2 rounded-full border-teal-200 bg-teal-50 px-3 py-1 text-teal-800">
              27 tools · 6 categories
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Every tool. One generator.
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Each tool has its own fields and validation — teaching,
              assessment, reports, communication, utility and career. One
              dynamic engine powers them all.
            </p>
            <div className="mt-8 flex max-w-2xl flex-wrap justify-center gap-2">
              {TOOL_SNIPPETS.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-border bg-white/70 px-4 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:border-teal-300 hover:text-teal-800"
                >
                  {name}
                </span>
              ))}
              <span className="rounded-full bg-brand-gradient px-4 py-1.5 text-sm font-semibold text-white">
                + 17 more
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="border-t border-border/60 bg-white/50">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-20">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              From sign-up to saved document in{" "}
              <span className="text-brand-gradient">3 steps</span>
            </h2>
          </motion.div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                icon: GraduationCap,
                title: "Create your profile",
                desc: "Tell us your role, subjects, level and district — AI uses it to personalise everything.",
              },
              {
                step: "2",
                icon: Wand2,
                title: "Pick a tool",
                desc: "Choose from 27 tools, fill a few fields, pick English or ಕನ್ನಡ — hit Generate.",
              },
              {
                step: "3",
                icon: MessagesSquare,
                title: "Copy or save",
                desc: "Streaming output lands in My Documents. Copy it, favourite it, reuse it.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                custom={i}
                className="relative rounded-2xl border border-border/70 bg-background/80 p-6"
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-gradient text-white">
                  <item.icon className="size-5" />
                </div>
                <span className="absolute top-5 right-5 text-4xl font-extrabold text-teal-100">
                  {item.step}
                </span>
                <h3 className="text-base font-bold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      <section className="border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-20">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Loved by teachers across{" "}
              <span className="text-brand-gradient">Karnataka</span>
            </h2>
          </motion.div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((item, i) => (
              <motion.figure
                key={item.name}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                custom={i}
                className="glass flex flex-col rounded-2xl p-6"
              >
                <div className="mb-3 flex gap-0.5 text-orange-500">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <span key={j} className="text-sm">★</span>
                  ))}
                </div>
                <blockquote className="flex-1 text-sm leading-relaxed text-foreground/90">
                  "{item.quote}"
                </blockquote>
                <figcaption className="mt-4 border-t border-border/70 pt-4">
                  <p className="text-sm font-bold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.role}</p>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="px-4 pb-20 md:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          className="bg-brand-gradient soft-shadow relative mx-auto max-w-5xl overflow-hidden rounded-3xl px-6 py-14 text-center text-white md:px-12 md:py-16"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -left-16 size-64 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -right-10 size-72 rounded-full bg-orange-400/30 blur-2xl"
          />
          <h2 className="relative text-3xl font-extrabold tracking-tight md:text-4xl">
            Your Sunday evenings, back.
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-teal-50/90">
            Join thousands of teachers who create lesson plans, worksheets and
            question papers in minutes — in the language they teach in.
          </p>
          <Button
            size="lg"
            className="relative mt-8 cursor-pointer bg-white text-teal-800 hover:bg-teal-50"
            onClick={primaryCta}
          >
            {isAuthenticated ? "Go to Dashboard" : "Create your free account"}
            <ArrowRight className="size-4" />
          </Button>
        </motion.div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-border/60 bg-white/50">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-8">
          <GuruShaktiLogo iconSize={30} wordmarkClassName="h-5" />
          <p className="text-xs text-muted-foreground">
            Made with 💗 for Karnataka&apos;s teachers · English &amp; ಕನ್ನಡ
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by Aibility
          </p>
        </div>
      </footer>
    </div>
  );
}
