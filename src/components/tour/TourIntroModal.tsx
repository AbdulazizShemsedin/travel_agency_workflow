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
  Presentation,
  Play,
  Layers,
  ShieldCheck,
  CheckCircle2,
  X,
  Compass,
} from "lucide-react";
import { TourSection } from "./tourConfig";

interface TourIntroModalProps {
  isOpen: boolean;
  sections: TourSection[];
  onStart: () => void;
  onExit: () => void;
  onSelectSection: (sectionId: string) => void;
}

export function TourIntroModal({
  isOpen,
  sections,
  onStart,
  onExit,
  onSelectSection,
}: TourIntroModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onExit()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden border-slate-200 dark:border-[#26262e] bg-white dark:bg-[#111116] shadow-2xl">
        {/* Header Banner */}
        <div className="p-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 dark:from-emerald-950 dark:via-emerald-900 dark:to-slate-950 text-white border-b border-emerald-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white hover:bg-white/30 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
                Live Client Presentation
              </Badge>
              <span className="text-xs text-emerald-200">•</span>
              <span className="text-xs font-medium text-emerald-100">
                {sections.length} Core Modules
              </span>
            </div>
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg p-1 text-white/80 hover:bg-white/10 transition"
              title="Exit presentation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3">
            <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
              Travel Agency Workflow ERP
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl">
              Complete end-to-end overseas employment placement architecture: from high-speed OCR intake and bilateral CV compilation to multi-corridor clearance, banking reconciliation, and partner invoicing.
            </p>
          </div>
        </div>

        {/* Presentation Agenda (Sections list) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-600" />
              Presentation Demonstration Agenda
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500">
              Click any section to start directly from that area
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {sections.map((sec, idx) => {
              const Icon = sec.icon;
              return (
                <div
                  key={sec.id}
                  onClick={() => onSelectSection(sec.id)}
                  className="group flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-[#1e1e26] bg-slate-50/60 dark:bg-[#141419] hover:border-emerald-300 dark:hover:border-emerald-800/80 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition cursor-pointer"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold text-xs group-hover:scale-105 transition-transform">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                      {sec.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                      {sec.description}
                    </p>
                    <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 mt-1 inline-block">
                      {sec.steps.length} {sec.steps.length === 1 ? "Step" : "Steps"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-[#1e1e26] bg-slate-50/70 dark:bg-[#141419] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Non-destructive demonstration • Zero mock data</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExit}
              className="text-xs h-9 border-slate-200 dark:border-[#282832]"
            >
              Exit
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onStart}
              className="text-xs h-9 px-4 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-bold gap-2 shadow-xs"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Begin Presentation Tour
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
