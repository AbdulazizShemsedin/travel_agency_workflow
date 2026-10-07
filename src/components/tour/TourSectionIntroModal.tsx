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
  Play,
  SkipForward,
  Layers,
  ArrowLeft,
  X,
  Compass,
} from "lucide-react";
import { TourSection } from "./tourConfig";

interface TourSectionIntroModalProps {
  isOpen: boolean;
  section: TourSection;
  sectionIndex: number;
  totalSections: number;
  onStartSection: () => void;
  onSkipSection: () => void;
  onPrevSection?: () => void;
  onOpenSectionMenu: () => void;
  onExit: () => void;
}

export function TourSectionIntroModal({
  isOpen,
  section,
  sectionIndex,
  totalSections,
  onStartSection,
  onSkipSection,
  onPrevSection,
  onOpenSectionMenu,
  onExit,
}: TourSectionIntroModalProps) {
  const Icon = section.icon || Compass;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onExit()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-slate-200 dark:border-[#26262e] bg-white dark:bg-[#111116] shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-[#1e1e26] bg-slate-50/50 dark:bg-[#14141a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-900 dark:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider">
                Section {sectionIndex + 1} of {totalSections}
              </Badge>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-mono font-medium text-slate-500 dark:text-zinc-400">
                {section.steps.length} {section.steps.length === 1 ? "Demonstration Step" : "Demonstration Steps"}
              </span>
            </div>
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              title="Exit presentation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-start gap-3.5 mt-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {section.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                {section.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Steps Included in This Section */}
        <div className="p-6 space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            What will be demonstrated in this section:
          </h4>
          <div className="space-y-2">
            {section.steps.map((st, i) => (
              <div
                key={st.id}
                className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-100 dark:border-[#1c1c24] bg-slate-50/60 dark:bg-[#141419]"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-900 dark:bg-emerald-700 text-white font-mono text-[10px] font-bold">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {st.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                    {st.subtitle || st.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-[#1e1e26] bg-slate-50/70 dark:bg-[#141419] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenSectionMenu}
              className="text-xs h-8 gap-1.5 border-slate-200 dark:border-[#282832]"
              title="Open table of contents (shortcut: m)"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Table of Contents</span>
            </Button>
            {onPrevSection && sectionIndex > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onPrevSection}
                className="text-xs h-8 gap-1 text-slate-600 dark:text-zinc-400"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Prev Section</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSkipSection}
              className="text-xs h-8 text-slate-600 dark:text-zinc-400 gap-1"
            >
              <span>Skip Section</span>
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onStartSection}
              className="text-xs h-8 px-3.5 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-bold gap-1.5 shadow-xs"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Start Section</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
