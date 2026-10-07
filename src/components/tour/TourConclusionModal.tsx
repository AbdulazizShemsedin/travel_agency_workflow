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
  CheckCircle2,
  RotateCcw,
  Layers,
  Sparkles,
  Award,
  X,
  ExternalLink,
} from "lucide-react";
import { TourSection } from "./tourConfig";

interface TourConclusionModalProps {
  isOpen: boolean;
  sections: TourSection[];
  onRestart: () => void;
  onOpenSectionMenu: () => void;
  onExit: () => void;
}

export function TourConclusionModal({
  isOpen,
  sections,
  onRestart,
  onOpenSectionMenu,
  onExit,
}: TourConclusionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onExit()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden border-slate-200 dark:border-[#26262e] bg-white dark:bg-[#111116] shadow-2xl">
        {/* Banner */}
        <div className="p-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 dark:from-emerald-950 dark:via-emerald-900 dark:to-slate-950 text-white border-b border-emerald-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white hover:bg-white/30 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
                Presentation Completed
              </Badge>
              <span className="text-xs text-emerald-200">•</span>
              <span className="text-xs font-semibold text-emerald-100 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-300" />
                All {sections.length} Modules Explored
              </span>
            </div>
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg p-1 text-white/80 hover:bg-white/10 transition"
              title="Close summary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3">
            <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl flex items-center gap-2">
              System Demonstration Summary
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl">
              Thank you for exploring the Travel Agency Workflow ERP. Below is a recap of the production-ready modules and workflows reviewed during this demonstration.
            </p>
          </div>
        </div>

        {/* Completed Modules Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-emerald-600" />
            Demonstrated Capabilities & Compliance
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {sections.map((sec, idx) => {
              const Icon = sec.icon;
              return (
                <div
                  key={sec.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/20 dark:bg-[#121815]"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {idx + 1}. {sec.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                      {sec.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#22222a] bg-slate-50/80 dark:bg-[#15151c] text-xs text-slate-600 dark:text-zinc-300">
            <p className="font-semibold text-slate-900 dark:text-white mb-1">
              Production Truth & Non-Mock Architecture:
            </p>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              Every workflow presented is 100% integrated with the live Railway Frappe backend, enforcing the 8-stage state machine, corridor clearance rules, native session-cookie RBAC, and double-entry financial ledgers.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-[#1e1e26] bg-slate-50/70 dark:bg-[#141419] flex items-center justify-between flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenSectionMenu}
            className="text-xs h-9 gap-1.5 border-slate-200 dark:border-[#282832]"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Review Table of Contents</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRestart}
              className="text-xs h-9 gap-1.5 border-slate-200 dark:border-[#282832]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restart Tour</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onExit}
              className="text-xs h-9 px-4 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-bold"
            >
              Finish & Return to ERP
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
