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
  Layers,
  CheckCircle2,
  ArrowRight,
  Play,
  RotateCcw,
  X,
  Compass,
} from "lucide-react";
import { TourSection } from "./tourConfig";
import { cn } from "@/lib/utils";

interface TourSectionMenuModalProps {
  isOpen: boolean;
  sections: TourSection[];
  activeSectionIndex: number;
  visitedSections: Set<string>;
  onSelectSection: (sectionId: string) => void;
  onClose: () => void;
  onRestart: () => void;
}

export function TourSectionMenuModal({
  isOpen,
  sections,
  activeSectionIndex,
  visitedSections,
  onSelectSection,
  onClose,
  onRestart,
}: TourSectionMenuModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] p-0 flex flex-col overflow-hidden border-slate-200 dark:border-[#26262e] bg-white dark:bg-[#111116] shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-[#1e1e26] bg-slate-50/50 dark:bg-[#14141a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-900 dark:bg-emerald-600 text-white shadow-xs">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Presentation Table of Contents
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
                    Jump to Section
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Select any module to navigate directly and demonstrate that workflow.
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              title="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Section List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {sections.map((sec, idx) => {
            const isCurrent = idx === activeSectionIndex;
            const isVisited = visitedSections.has(sec.id);
            const Icon = sec.icon || Compass;

            return (
              <div
                key={sec.id}
                onClick={() => {
                  onSelectSection(sec.id);
                  onClose();
                }}
                className={cn(
                  "group flex items-center justify-between p-3 rounded-xl border transition cursor-pointer",
                  isCurrent
                    ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs ring-1 ring-emerald-500"
                    : isVisited
                    ? "border-slate-200 dark:border-[#22222b] bg-slate-50/40 dark:bg-[#141419] hover:border-emerald-300 dark:hover:border-emerald-800"
                    : "border-slate-100 dark:border-[#1a1a22] bg-white dark:bg-[#121216] hover:border-slate-200 dark:hover:border-[#282833]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {/* Status Indicator / Number */}
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition",
                      isCurrent
                        ? "bg-emerald-900 dark:bg-emerald-600 text-white"
                        : isVisited
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                        : "bg-slate-100 dark:bg-[#1e1e26] text-slate-500 dark:text-zinc-400"
                    )}
                  >
                    {isVisited ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4
                        className={cn(
                          "text-xs font-bold truncate",
                          isCurrent
                            ? "text-emerald-950 dark:text-emerald-300"
                            : "text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400"
                        )}
                      >
                        {sec.title}
                      </h4>
                      {isCurrent && (
                        <Badge className="bg-emerald-900 dark:bg-emerald-700 text-[9px] uppercase px-1.5 py-0 font-bold">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                      {sec.subtitle}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                    {sec.steps.length} {sec.steps.length === 1 ? "step" : "steps"}
                  </span>
                  <ArrowRight
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      isCurrent
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-slate-300 dark:text-zinc-600 group-hover:translate-x-0.5 group-hover:text-emerald-600"
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-[#1e1e26] bg-slate-50/70 dark:bg-[#141419] flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRestart}
            className="text-xs h-8 gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Restart From Beginning</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-semibold"
          >
            Close Menu (Esc)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
