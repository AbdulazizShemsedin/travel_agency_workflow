"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Lock, Mail, ArrowRight, Plane, AlertCircle, Loader2, Sun, Moon, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [failedAttempts, setFailedAttempts] = React.useState(0);
  const [lockoutSeconds, setLockoutSeconds] = React.useState(0);

  React.useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Restore failed attempts and lockout state from sessionStorage on mount
  React.useEffect(() => {
    try {
      const storedAttempts = parseInt(sessionStorage.getItem("login_failed_attempts") || "0", 10);
      if (!isNaN(storedAttempts)) setFailedAttempts(storedAttempts);

      const lockoutUntil = parseInt(sessionStorage.getItem("login_lockout_until") || "0", 10);
      if (!isNaN(lockoutUntil) && lockoutUntil > Date.now()) {
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        setLockoutSeconds(remaining);
      }
    } catch {
      // Ignore sessionStorage unavailability
    }
  }, []);

  // Lockout countdown timer
  React.useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          try {
            sessionStorage.removeItem("login_lockout_until");
            sessionStorage.removeItem("login_failed_attempts");
          } catch {}
          setFailedAttempts(0);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const recordFailure = () => {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      try {
        sessionStorage.setItem("login_failed_attempts", String(nextAttempts));
      } catch {}

      if (nextAttempts >= 5) {
        const lockoutTime = Date.now() + 60 * 1000;
        try {
          sessionStorage.setItem("login_lockout_until", String(lockoutTime));
        } catch {}
        setLockoutSeconds(60);
      }
    };

    try {
      const userContext = await login(email.trim(), password);
      if (!userContext) {
        recordFailure();
        if (failedAttempts + 1 < 5) {
          setError(`Invalid login credentials. Please verify your email/username and password. (${5 - (failedAttempts + 1)} attempts remaining)`);
        }
        setIsSubmitting(false);
      } else {
        // Reset counters upon successful authentication
        try {
          sessionStorage.removeItem("login_failed_attempts");
          sessionStorage.removeItem("login_lockout_until");
        } catch {}
        setFailedAttempts(0);
      }
    } catch (err: any) {
      recordFailure();
      if (failedAttempts + 1 < 5) {
        setError(formatCleanErrorMessage(err) || "Failed to sign in. Please verify your credentials.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden px-4 py-12 transition-colors duration-200">
      {/* Theme toggle in top corner */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs backdrop-blur-md transition-colors cursor-pointer"
        >
          {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </button>
      </div>

      {/* Background glowing gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-600/20 dark:shadow-emerald-900/40 text-white mb-4">
            <Plane className="h-7 w-7 transform -rotate-45" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Travel Agency Portal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Sign in to your agency workflow account
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-2xl">
          {(error || lockoutSeconds > 0) && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>
                {lockoutSeconds > 0
                  ? `Too many failed attempts. Please wait ${lockoutSeconds} seconds before trying again.`
                  : error}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Email Address / Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input
                  id="login-email"
                  type="text"
                  placeholder="e.g. officer@agency.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={lockoutSeconds > 0}
                  className="pl-10 h-11 bg-white dark:bg-slate-950/60 border-slate-300 dark:border-slate-700/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus-visible:ring-emerald-500 focus-visible:border-emerald-500 disabled:opacity-50"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={lockoutSeconds > 0}
                  className="pl-10 pr-10 h-11 bg-white dark:bg-slate-950/60 border-slate-300 dark:border-slate-700/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus-visible:ring-emerald-500 focus-visible:border-emerald-500 disabled:opacity-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting || lockoutSeconds > 0}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white font-semibold rounded-xl transition duration-150 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : lockoutSeconds > 0 ? (
                <>
                  Locked out ({lockoutSeconds}s)
                </>
              ) : (
                <>
                  Sign In to Agency Portal
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
