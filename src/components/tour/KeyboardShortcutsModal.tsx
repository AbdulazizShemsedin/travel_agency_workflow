"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Keyboard, Search, Sparkles, X } from "lucide-react";
import { SHORTCUTS_LIST } from "./tourConfig";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartOnboarding: () => void;
  onStartPresentation: () => void;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  onStartOnboarding,
  onStartPresentation,
}: KeyboardShortcutsModalProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredShortcuts = React.useMemo(() => {
    if (!searchQuery.trim()) return SHORTCUTS_LIST;
    const q = searchQuery.toLowerCase().trim();
    return SHORTCUTS_LIST.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.key.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const categories = ["Tour & Presentation", "Navigation", "Quick Actions", "General"] as const;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col overflow-hidden border-slate-200 dark:border-[#26262e] bg-white dark:bg-[#111116] shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-[#1e1e26]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <Keyboard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Keyboard Shortcuts
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800">
                    Productivity
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Navigate, control the presentation tour, and trigger quick agency actions.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Quick Filter */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts (e.g. tour, applicants, next)..."
              className="pl-8 h-8 text-xs bg-slate-50 dark:bg-[#18181f] border-slate-200 dark:border-[#26262e]"
              autoFocus
            />
          </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {categories.map((cat) => {
            const items = filteredShortcuts.filter((s) => s.category === cat);
            if (items.length === 0) return null;

            return (
              <div key={cat} className="space-y-2.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-2">
                  <span>{cat}</span>
                  <span className="h-px flex-1 bg-slate-100 dark:bg-[#1f1f27]" />
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((shortcut) => (
                    <div
                      key={shortcut.label}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-[#1c1c24] bg-slate-50/60 dark:bg-[#141419] hover:border-slate-200 dark:hover:border-[#282833] transition"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-medium text-slate-800 dark:text-zinc-200 truncate">
                          {shortcut.description}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        {shortcut.key.split(" ").map((token, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <span className="text-[10px] text-slate-400">then</span>}
                            <kbd className="inline-flex items-center justify-center min-w-[22px] h-6 px-1.5 rounded bg-white dark:bg-[#1e1e26] border border-slate-200 dark:border-[#32323e] text-[11px] font-mono font-bold text-slate-700 dark:text-zinc-300 shadow-2xs">
                              {token}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                No shortcuts found matching &ldquo;{searchQuery}&rdquo;.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-[#1e1e26] bg-slate-50/60 dark:bg-[#141419] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onStartOnboarding();
              }}
              className="text-xs h-8 border-slate-200 dark:border-[#282832]"
            >
              Start Onboarding Tour
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onClose();
                onStartPresentation();
              }}
              className="text-xs h-8 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Start Client Presentation
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs h-8"
          >
            Close (Esc)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
