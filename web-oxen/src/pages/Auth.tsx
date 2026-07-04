import { motion } from "framer-motion";
import { Globe, Mail, ArrowLeft, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import TravelIllustration from "@/components/TravelIllustration";

const OXEN_LOGO =
  "https://r2-pub.rork.com/projects/jllemngulgwm5pb7uoc46/assets/b64891ed-f7c0-43c7-9079-36d87076a4c7.png";

export default function Auth() {
  return (
    <div className="relative flex min-h-screen flex-col md:flex-row">
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-[#0a0f1e]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.15),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_90%_80%,rgba(59,130,246,0.08),transparent_50%)]" />

      {/* ── Back link ── */}
      <Link
        to="/"
        className="absolute left-6 top-6 z-30 flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back to Globe</span>
      </Link>

      {/* ── Left Panel: Coming Soon ── */}
      <div className="relative z-10 flex w-full items-center justify-center px-6 py-12 md:w-1/2 md:px-12 lg:px-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Logo + heading */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 22 }}
              className="mb-6 flex items-center gap-3"
            >
              <img
                src={OXEN_LOGO}
                alt="OXEN"
                className="h-10 w-10 rounded-xl object-contain shadow-lg shadow-blue-500/20"
              />
              <span className="font-display text-lg font-bold tracking-wider text-white">OXEN</span>
            </motion.div>

            <h1 className="font-display text-3xl font-bold tracking-tight text-white lg:text-4xl">
              Authentication Coming Soon
            </h1>
            <p className="mt-2 text-slate-400">
              We&apos;re configuring Supabase to enable Google, Apple, and email sign-in.
              While you wait, explore the world freely as a guest.
            </p>
          </div>

          {/* Coming soon card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="auth-card rounded-2xl p-6 lg:p-8"
          >
            <div className="space-y-5">
              {/* Status indicator */}
              <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4">
                <div className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                  <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-amber-400/60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-300">Configuration in Progress</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Supabase setup is being finalized. Check back soon for full account access.
                  </p>
                </div>
              </div>

              {/* Feature cards */}
              <div className="space-y-3">
                {[
                  {
                    icon: Mail,
                    title: "Email & Password",
                    desc: "Classic sign-in with secure password storage",
                    provider: "email",
                  },
                  {
                    icon: GoogleMark,
                    title: "Google Sign-In",
                    desc: "One-tap authentication with your Google account",
                    provider: "google",
                  },
                  {
                    icon: AppleMark,
                    title: "Apple Sign-In",
                    desc: "Private, secure sign-in with Face ID / Touch ID",
                    provider: "apple",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.provider}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.08 }}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-slate-400">
                      <item.icon />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                      Soon
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Explore button */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="pt-2"
              >
                <Link
                  to="/"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-blue-600 hover:shadow-blue-500/30 active:scale-[0.98]"
                >
                  <Globe className="h-4 w-4" />
                  Continue as Guest Explorer
                </Link>
                <p className="mt-3 text-center text-xs text-slate-500">
                  No account needed — explore 200+ countries, plan trips with AI, and discover the world.
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Bottom note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-center text-xs text-slate-600"
          >
            <Sparkles className="inline h-3 w-3 text-amber-500" />{" "}
            Full authentication with Google, Apple, and email will be available after Supabase setup is complete.
          </motion.p>
        </motion.div>
      </div>

      {/* ── Right Panel: Illustration ── */}
      <div className="relative z-10 hidden w-1/2 overflow-hidden md:block">
        <TravelIllustration />

        {/* Floating glass cards over the illustration */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-10">
          {/* Main tagline card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="glass-auth mb-6 rounded-2xl px-6 py-4 shadow-2xl"
          >
            <p className="text-center font-display text-xl font-bold text-white lg:text-2xl">
              Travel the world
            </p>
            <p className="text-center text-sm text-blue-300">with OXEN</p>
          </motion.div>

          {/* Feature cards */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: "\uD83C\uDF0D", label: "200+ Countries" },
              { icon: "\u2708\uFE0F", label: "AI Planner" },
              { icon: "\uD83D\uDCCD", label: "Local Guides" },
              { icon: "\uD83D\uDDFA\uFE0F", label: "Offline Maps" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                className="glass-auth flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Bottom tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="mt-8 max-w-xs text-center text-sm leading-relaxed text-slate-400"
          >
            Discover destinations, plan with AI, and explore every corner of the world — all in one place.
          </motion.p>
        </div>
      </div>
    </div>
  );
}

/* ── Inline SVG brand marks ── */

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
