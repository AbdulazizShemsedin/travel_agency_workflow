"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  Pause,
  Layers,
  Sparkles,
  Info,
  SkipForward,
  Check,
  AlertCircle,
} from "lucide-react";
import { TourStep, TourSection, TourMode } from "./tourConfig";
import { cn } from "@/lib/utils";

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

interface TourSpotlightOverlayProps {
  mode: TourMode;
  step: TourStep;
  section?: TourSection;
  stepIndex: number;
  totalStepsInSection: number;
  sectionIndex: number;
  totalSections: number;
  isPaused: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkipSection?: () => void;
  onTogglePause: () => void;
  onOpenSectionMenu: () => void;
  onExit: () => void;
}

export function TourSpotlightOverlay({
  mode,
  step,
  section,
  stepIndex,
  totalStepsInSection,
  sectionIndex,
  totalSections,
  isPaused,
  onNext,
  onPrev,
  onSkipSection,
  onTogglePause,
  onOpenSectionMenu,
  onExit,
}: TourSpotlightOverlayProps) {
  const [mounted, setMounted] = React.useState(false);
  const [targetRect, setTargetRect] = React.useState<TargetRect | null>(null);
  const [isTargetMissing, setIsTargetMissing] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = React.useState<{ top: number; left: number; isBottomDocked?: boolean }>({
    top: 100,
    left: 100,
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Locate target and calculate bounding box
  const updateTargetBounds = React.useCallback(() => {
    if (!step?.targetSelector) {
      setTargetRect(null);
      setIsTargetMissing(false);
      return;
    }

    const el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (el) {
      // Element found
      const rect = el.getBoundingClientRect();
      // Ensure visible on screen
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        });
        setIsTargetMissing(false);
        return;
      }
    }

    // Element not found or 0 dimensions
    setTargetRect(null);
    setIsTargetMissing(true);
  }, [step]);

  // Initial scroll into view and polling for target (handles route changes)
  React.useEffect(() => {
    let attempts = 0;
    const maxAttempts = 25; // 25 * 100ms = 2.5s poll
    let timer: NodeJS.Timeout | null = null;

    const findAndScroll = () => {
      attempts++;
      if (!step?.targetSelector) {
        setTargetRect(null);
        setIsTargetMissing(false);
        return;
      }

      const el = document.querySelector(step.targetSelector) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          // Found target: scroll into view
          el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
          setTimeout(updateTargetBounds, 120);
          return;
        }
      }

      if (attempts < maxAttempts) {
        timer = setTimeout(findAndScroll, 100);
      } else {
        // Failed to find target after timeout: graceful fallback
        updateTargetBounds();
      }
    };

    findAndScroll();

    window.addEventListener("resize", updateTargetBounds);
    window.addEventListener("scroll", updateTargetBounds, true);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("resize", updateTargetBounds);
      window.removeEventListener("scroll", updateTargetBounds, true);
    };
  }, [step, updateTargetBounds]);

  // Compute Popover Position relative to target
  React.useEffect(() => {
    const updatePosition = () => {
      const popoverEl = popoverRef.current;
      const popWidth = popoverEl ? popoverEl.offsetWidth : 400;
      const popHeight = popoverEl ? popoverEl.offsetHeight : 240;
      const pad = 16;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // On small screens (<640px), dock cleanly at bottom
      if (vw < 640) {
        setPopoverPos({
          top: vh - popHeight - pad,
          left: pad,
          isBottomDocked: true,
        });
        return;
      }

      // If target missing or center placement requested: center on screen
      if (!targetRect || step.placement === "center" || isTargetMissing) {
        setPopoverPos({
          top: Math.max(pad, (vh - popHeight) / 2),
          left: Math.max(pad, (vw - popWidth) / 2),
          isBottomDocked: false,
        });
        return;
      }

      const placement = step.placement || "bottom";
      let top = 0;
      let left = 0;

      switch (placement) {
        case "top":
          top = targetRect.top - popHeight - 14;
          left = targetRect.left + (targetRect.width - popWidth) / 2;
          break;
        case "bottom":
          top = targetRect.bottom + 14;
          left = targetRect.left + (targetRect.width - popWidth) / 2;
          break;
        case "left":
          top = targetRect.top + (targetRect.height - popHeight) / 2;
          left = targetRect.left - popWidth - 14;
          break;
        case "right":
          top = targetRect.top + (targetRect.height - popHeight) / 2;
          left = targetRect.right + 14;
          break;
      }

      // Auto-flip if overflowing top or bottom
      if (placement === "bottom" && top + popHeight > vh - pad) {
        if (targetRect.top - popHeight - 14 > pad) {
          top = targetRect.top - popHeight - 14;
        }
      } else if (placement === "top" && top < pad) {
        if (targetRect.bottom + popHeight + 14 < vh - pad) {
          top = targetRect.bottom + 14;
        }
      }

      // Clamp within viewport margins
      top = Math.max(pad, Math.min(vh - popHeight - pad, top));
      left = Math.max(pad, Math.min(vw - popWidth - pad, left));

      setPopoverPos({ top, left, isBottomDocked: false });
    };

    updatePosition();
    const timeout = setTimeout(updatePosition, 80);
    return () => clearTimeout(timeout);
  }, [targetRect, step, isTargetMissing]);

  if (!mounted) return null;

  const isPresentation = mode === "presentation";
  const isLastStep = stepIndex === totalStepsInSection - 1;
  const isFirstStep = stepIndex === 0;

  // Spotlight padding
  const p = step.highlightPadding ?? 8;
  const spotX = targetRect ? Math.max(0, targetRect.left - p) : 0;
  const spotY = targetRect ? Math.max(0, targetRect.top - p) : 0;
  const spotW = targetRect ? targetRect.width + p * 2 : 0;
  const spotH = targetRect ? targetRect.height + p * 2 : 0;

  return createPortal(
    <div className="fixed inset-0 z-[9998] pointer-events-none select-none">
      {/* 1. Dark Backdrop Overlay with SVG Cutout Mask */}
      {!isPaused && (
        <svg
          className="fixed inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="tour-spotlight-mask">
              {/* White fills everything (opaque) */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Black cutout over target (transparent hole) */}
              {targetRect && (
                <rect
                  x={spotX}
                  y={spotY}
                  width={spotW}
                  height={spotH}
                  rx="12"
                  ry="12"
                  fill="black"
                  className="transition-all duration-300 ease-out"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(8, 10, 15, 0.72)"
            mask="url(#tour-spotlight-mask)"
            className="pointer-events-auto transition-opacity duration-300"
          />
        </svg>
      )}

      {/* Target Pulsing Highlight Frame */}
      {targetRect && !isPaused && (
        <div
          style={{
            top: spotY,
            left: spotX,
            width: spotW,
            height: spotH,
          }}
          className="fixed rounded-xl border-2 border-emerald-500/90 shadow-[0_0_24px_rgba(16,185,129,0.35)] pointer-events-none z-[9999] transition-all duration-300 ease-out animate-pulse"
        />
      )}

      {/* 2. Paused State Floating Control Bar */}
      {isPaused && (
        <div className="fixed top-4 inset-x-0 z-[10000] flex justify-center pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-slate-900/95 dark:bg-[#14141a]/95 text-white border border-emerald-500/60 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-200">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Presentation Paused
              </span>
              <span className="text-xs text-slate-400">• Free Interaction Active</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <Button
              type="button"
              size="sm"
              onClick={onTogglePause}
              className="h-7 px-3 text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-bold gap-1 rounded-full shadow-xs"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Resume Tour</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenSectionMenu}
              className="h-7 px-2.5 text-xs text-slate-300 hover:text-white rounded-full"
            >
              <Layers className="h-3 w-3 mr-1" />
              <span>Sections</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onExit}
              className="h-7 px-2 text-xs text-slate-400 hover:text-rose-400 rounded-full"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* 3. Popover Card */}
      {!isPaused && (
        <div
          ref={popoverRef}
          style={{
            top: popoverPos.top,
            left: popoverPos.left,
            maxWidth: popoverPos.isBottomDocked ? "calc(100vw - 24px)" : "420px",
            width: popoverPos.isBottomDocked ? "calc(100vw - 24px)" : "400px",
          }}
          className={cn(
            "fixed z-[10000] pointer-events-auto rounded-2xl border border-slate-200/90 dark:border-[#282833] bg-white dark:bg-[#121217] text-slate-900 dark:text-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-200 animate-in fade-in zoom-in-95",
            popoverPos.isBottomDocked ? "bottom-3" : ""
          )}
        >
          {/* Card Header */}
          <div className="p-4 pb-2 border-b border-slate-100 dark:border-[#1e1e26] bg-slate-50/60 dark:bg-[#15151c]/60 rounded-t-2xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isPresentation ? (
                  <Badge className="bg-emerald-900 dark:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider">
                    Sec {sectionIndex + 1}/{totalSections} • Step {stepIndex + 1}/{totalStepsInSection}
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-900 dark:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider">
                    Step {stepIndex + 1} of {totalStepsInSection}
                  </Badge>
                )}
                {isPresentation && section && (
                  <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 truncate max-w-[170px]">
                    {section.title}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {isPresentation && (
                  <button
                    type="button"
                    onClick={onTogglePause}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                    title="Pause presentation (Space)"
                  >
                    <Pause className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onExit}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                  title="Exit tour (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                {step.title}
              </h3>
              {step.subtitle && (
                <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-400 mt-0.5">
                  {step.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              {step.description}
            </p>

            {/* Target Missing Notice (Failsafe) */}
            {isTargetMissing && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-[11px] text-amber-900 dark:text-amber-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>
                  Element not visible with current tab/filter. You can continue or skip to the next step.
                </span>
              </div>
            )}

            {/* Pro Tip */}
            {step.tip && !isTargetMissing && (
              <div className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 dark:border-[#22222a] bg-slate-50/50 dark:bg-[#14141a] text-[11px] text-slate-500 dark:text-zinc-400">
                <Info className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <span>{step.tip}</span>
              </div>
            )}
          </div>

          {/* Card Footer Controls */}
          <div className="p-3 border-t border-slate-100 dark:border-[#1e1e26] bg-slate-50/70 dark:bg-[#141419] rounded-b-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPrev}
                disabled={isFirstStep && (!isPresentation || sectionIndex === 0)}
                className="h-7 px-2 text-xs border-slate-200 dark:border-[#282832]"
                title="Previous step (←)"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                <span>Back</span>
              </Button>

              {isPresentation && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onOpenSectionMenu}
                  className="h-7 px-2 text-xs text-slate-600 dark:text-zinc-400"
                  title="Table of Contents (m)"
                >
                  <Layers className="h-3 w-3 mr-1" />
                  <span>Sections</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {isPresentation && onSkipSection && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onSkipSection}
                  className="h-7 px-2 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                  title="Skip this section"
                >
                  <span>Skip</span>
                  <SkipForward className="h-3 w-3 ml-1" />
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                onClick={onNext}
                className="h-7 px-3 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-bold text-xs gap-1 shadow-xs"
                title="Next step (→ or Enter)"
              >
                <span>{isLastStep ? (isPresentation && sectionIndex === totalSections - 1 ? "Finish" : "Next Section") : "Next"}</span>
                {isLastStep && isPresentation && sectionIndex === totalSections - 1 ? (
                  <Check className="h-3 w-3 ml-0.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
