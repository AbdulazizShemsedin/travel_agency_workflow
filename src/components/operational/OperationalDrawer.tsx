"use client";

import * as React from "react";
import {
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  User,
  ShieldCheck,
  Calendar,
  CreditCard,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OperationalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  applicantName: string;
  applicantId: string;
  passportNumber?: string;
  statusBadge?: React.ReactNode;
  children: React.ReactNode;
  isSaving?: boolean;
  canEdit?: boolean;
  onSave?: () => void;
  leftAction?: React.ReactNode;
  saveButtonText?: string;
}

export function OperationalDrawer({
  isOpen,
  onClose,
  title = "Application Details",
  applicantName,
  applicantId,
  passportNumber,
  statusBadge,
  children,
  isSaving = false,
  canEdit = true,
  onSave,
  leftAction,
  saveButtonText = "Save Changes",
}: OperationalDrawerProps) {
  // ESC key listener to close drawer
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Derives 2-letter initials from name
  const initials = applicantName
    ? applicantName
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AP";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Dimmed Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl bg-white dark:bg-[#121216] shadow-2xl border-l border-slate-200 dark:border-[#272730] flex flex-col transition-transform duration-300 ease-out animate-in slide-in-from-right">
          {/* --------------------------------------------------------- */}
          {/* Drawer Header (Applicant Identity)                        */}
          {/* --------------------------------------------------------- */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#222227] bg-slate-50/70 dark:bg-[#15151b]">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Avatar circle */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-800 to-emerald-950 text-white font-bold text-sm shadow-xs border border-emerald-700/50">
                {initials}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {applicantName || "Applicant Details"}
                  </h3>
                  {statusBadge}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                  <span className="font-mono text-emerald-800 dark:text-emerald-400 font-semibold">
                    {applicantId}
                  </span>
                  {passportNumber && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-slate-600 dark:text-zinc-300">
                        Passport: {passportNumber}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Close (X) button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-[#202028] dark:hover:text-zinc-200 transition-colors"
              title="Close Drawer (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* --------------------------------------------------------- */}
          {/* Section Indicator Banner                                  */}
          {/* --------------------------------------------------------- */}
          <div className="flex items-center justify-between px-6 py-2.5 bg-slate-100/60 dark:bg-[#181820] border-b border-slate-100 dark:border-[#222227] text-xs">
            <h4 className="font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider text-[11px]">
              {title}
            </h4>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
              <Lock className="h-3 w-3 text-slate-400" />
              Fields marked grey are read-only
            </span>
          </div>

          {/* --------------------------------------------------------- */}
          {/* Scrollable Content Body                                   */}
          {/* --------------------------------------------------------- */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {children}
          </div>

          {/* --------------------------------------------------------- */}
          {/* Sticky Bottom Action Bar                                  */}
          {/* --------------------------------------------------------- */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-[#272730] bg-slate-50 dark:bg-[#15151b]">
            <div>{leftAction}</div>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSaving}
                className="h-9 px-4 text-xs font-semibold border-slate-300 dark:border-[#2c2c36] text-slate-700 dark:text-zinc-300"
              >
                Cancel
              </Button>

              {canEdit && onSave && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onSave}
                  disabled={isSaving}
                  className="h-9 px-5 text-xs font-semibold gap-1.5 bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{saveButtonText}</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper Components for Read-Only vs Editable Form Field Inputs in Drawer
// ---------------------------------------------------------------------------

export interface DrawerFieldProps {
  label: string;
  value?: string | number | null;
  isReadOnly?: boolean;
  children?: React.ReactNode;
  className?: string;
  helperText?: string;
}

export function DrawerField({
  label,
  value,
  isReadOnly = true,
  children,
  className,
  helperText,
}: DrawerFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wide">
        {label}
      </label>

      {children ? (
        children
      ) : isReadOnly ? (
        <div className="h-9 px-3 py-2 rounded-md border border-slate-200 dark:border-[#2b2b35] bg-slate-100 dark:bg-[#1a1a20] text-xs font-medium text-slate-700 dark:text-zinc-300 select-all truncate">
          {value !== undefined && value !== null && String(value).trim() !== "" ? String(value) : "—"}
        </div>
      ) : (
        <div className="h-9 px-3 py-2 rounded-md border border-slate-200 dark:border-[#2b2b35] bg-white dark:bg-[#121216] text-xs font-medium text-slate-800 dark:text-zinc-200 truncate">
          {value !== undefined && value !== null && String(value).trim() !== "" ? String(value) : "—"}
        </div>
      )}

      {helperText && (
        <span className="text-[10px] text-slate-400 dark:text-zinc-500">{helperText}</span>
      )}
    </div>
  );
}

export function DrawerSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: any;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-100 dark:border-[#222228]">
        {Icon && <Icon className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />}
        <h5 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
          {title}
        </h5>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">{children}</div>
    </div>
  );
}
