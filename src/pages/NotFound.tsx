import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { GuruShaktiLogo } from "@/components/GuruShaktiLogo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-screen flex-col items-center justify-center bg-background px-4"
    >
      <GuruShaktiLogo iconSize={48} wordmarkClassName="h-6 mb-8" />
      <div className="text-center">
        <p className="text-6xl font-extrabold tracking-tight text-brand-gradient">
          404
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          This page seems to have wandered off like a student during assembly.
          Let&apos;s get you back to class.
        </p>
        <Button
          asChild
          className="mt-6 cursor-pointer bg-brand-gradient text-white hover:opacity-90"
        >
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}
