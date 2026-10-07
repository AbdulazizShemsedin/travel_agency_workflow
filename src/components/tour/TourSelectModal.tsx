"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Compass,
  Presentation,
  Sparkles,
  Keyboard,
  ArrowRight,
  CheckCircle2,
  Layers,
  GraduationCap,
} from "lucide-react";

interface TourSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOnboarding: () => void;
  onSelectPresentation: () => void;
  onOpenShortcuts: () => void;
}

export function TourSelectModal({
  isOpen,
  onClose,
  onSelectOnboarding,
  onSelectPresentation,
  onOpenShortcuts,
}: TourSelectModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-slate-200 dark:border-[#26262e] bg-white dark:bg-[#111116] shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-[#1e1e26] bg-slate-50/50 dark:bg-[#14141a]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 dark:bg-emerald-600 text-white shadow-xs">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Interactive System Tour & Guides
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Choose the mode tailored for your current purpose.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Option 1: Client Presentation Tour */}
          <div
            onClick={() => {
              onClose();
              onSelectPresentation();
            }}
            className="group relative p-4 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition cursor-pointer shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-900 dark:bg-emerald-700 text-white shadow-xs group-hover:scale-105 transition-transform">
                  <Presentation className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Client Presentation / Demo Mode
                    </h4>
                    <Badge className="bg-emerald-900 dark:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wide">
                      Recommended for Client
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1">
                    Structured 11-section walkthrough designed for presenting the entire system to a client. Includes narrative section introductions, table of contents for jumping between sections, pause/resume, and progress indicators.
                  </p>
                  <div className="flex items-center gap-3 mt-2.5 text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" /> 11 Logical Sections
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Live Demonstrations
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Non-Destructive
                    </span>
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0 group-hover:translate-x-1 transition-transform mt-1" />
            </div>
          </div>

          {/* Option 2: Normal Onboarding Tour */}
          <div
            onClick={() => {
              onClose();
              onSelectOnboarding();
            }}
            className="group relative p-4 rounded-xl border border-slate-200 dark:border-[#26262e] bg-slate-50/50 dark:bg-[#141419] hover:bg-slate-100/70 dark:hover:bg-[#1a1a22] transition cursor-pointer shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-700 dark:bg-zinc-700 text-white shadow-xs group-hover:scale-105 transition-transform">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      User Onboarding Tour
                    </h4>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500">
                      8 Quick Steps
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
                    A concise tour for operational staff introducing the dashboard, candidate intake, clearance workspaces, real-time messaging, and daily essentials.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform mt-1" />
            </div>
          </div>
        </div>

        {/* Footer with Shortcut Prompt */}
        <div className="p-4 border-t border-slate-100 dark:border-[#1e1e26] bg-slate-50/70 dark:bg-[#141419] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenShortcuts();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
          >
            <Keyboard className="h-3.5 w-3.5 text-slate-400" />
            <span>Keyboard Shortcuts</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-[#1e1e24] border border-slate-200 dark:border-[#32323e]">
              ?
            </kbd>
          </button>

          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
