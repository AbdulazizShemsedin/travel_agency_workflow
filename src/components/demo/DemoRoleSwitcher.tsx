"use client";

import * as React from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { isDemoMode, setDemoModeOverride } from "@/lib/config/env";
import { DEMO_USERS } from "@/lib/demo/users";
import { Shield, Sparkles, CheckCircle2, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DemoRoleSwitcher() {
  if (!isDemoMode()) {
    return null;
  }

  const { demoUserKey, switchDemoUser } = useAuth();
  const [activeMode, setActiveMode] = React.useState<boolean>(false);
  const [open, setOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    setActiveMode(isDemoMode());
  }, []);

  if (!activeMode) {
    return null;
  }

  const currentProfile = demoUserKey && DEMO_USERS[demoUserKey] ? DEMO_USERS[demoUserKey] : DEMO_USERS.admin;

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/40 hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            <span className="hidden md:inline font-mono text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Demo:
            </span>
            <span className="truncate max-w-[120px] font-medium">{currentProfile.full_name.split(" ")[0]} ({currentProfile.roles[0]})</span>
            <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-72 p-1.5 shadow-2xl border-amber-500/30 bg-white dark:bg-[#121216]">
          <div className="px-2 py-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                V2 Role Persona
              </span>
              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                16 Canonical Roles
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 font-normal">
              Switch caller identity to test real-time role gating, drawer permissions, and corridor workspaces.
            </p>
          </div>
          <div className="h-px bg-slate-100 dark:bg-[#222228] my-1" />

          <div className="max-h-80 overflow-y-auto space-y-0.5">
            {Object.entries(DEMO_USERS).map(([key, profile]) => {
              const isSelected = demoUserKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (switchDemoUser) switchDemoUser(key);
                    setOpen(false);
                  }}
                  className={`w-full text-left flex items-start gap-2 px-2 py-2 rounded-md cursor-pointer transition text-xs ${
                    isSelected
                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold"
                      : "text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#1c1c22]"
                  }`}
                >
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${isSelected ? "bg-amber-500" : "bg-slate-300 dark:bg-zinc-600"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{profile.full_name}</span>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0 ml-1" />}
                    </div>
                    <span className="block text-[10px] text-slate-400 dark:text-zinc-500 truncate font-mono">
                      {profile.roles.join(", ")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="h-px bg-slate-100 dark:bg-[#222228] my-1" />
          <div className="px-2 py-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>Demo Mode Active</span>
            <button
              type="button"
              onClick={() => {
                setDemoModeOverride(false);
                window.location.reload();
              }}
              className="text-[10px] text-slate-400 hover:text-rose-500 underline cursor-pointer"
            >
              Disable
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
