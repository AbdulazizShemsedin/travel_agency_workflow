"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExcelTextInputProps {
  value: string | number | undefined | null;
  onSave: (newValue: string) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
  uppercase?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function ExcelTextInput({
  value,
  onSave,
  placeholder = "—",
  disabled = false,
  uppercase = false,
  className,
  ariaLabel,
}: ExcelTextInputProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [currentValue, setCurrentValue] = React.useState(
    value !== undefined && value !== null ? String(value) : ""
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setCurrentValue(value !== undefined && value !== null ? String(value) : "");
  }, [value]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCommit = async () => {
    setIsEditing(false);
    const trimmed = uppercase ? currentValue.trim().toUpperCase() : currentValue.trim();
    const original = value !== undefined && value !== null ? String(value).trim() : "";
    if (trimmed !== original && !disabled) {
      try {
        setIsSaving(true);
        await onSave(trimmed);
      } catch {
        setCurrentValue(original);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setCurrentValue(value !== undefined && value !== null ? String(value) : "");
      setIsEditing(false);
    }
  };

  if (disabled) {
    return (
      <span
        className={cn(
          "text-slate-600 dark:text-zinc-400 font-medium select-none text-xs block truncate",
          className
        )}
      >
        {value || placeholder}
      </span>
    );
  }

  if (!isEditing) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className={cn(
          "group/excel-cell w-full min-h-[26px] px-1.5 py-1 text-xs text-slate-800 dark:text-zinc-200 truncate cursor-pointer rounded transition-all flex items-center justify-between",
          "hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 hover:ring-1 hover:ring-emerald-400 dark:hover:ring-emerald-700/60",
          className
        )}
        title="Click to edit"
      >
        <span
          className={cn(
            "truncate",
            uppercase && "uppercase",
            !currentValue && "text-slate-400 dark:text-zinc-500 italic"
          )}
        >
          {currentValue || placeholder}
        </span>
        {isSaving && (
          <Loader2 className="h-3 w-3 animate-spin text-emerald-600 shrink-0 ml-1" />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="relative flex items-center w-full min-w-[80px]"
    >
      <input
        ref={inputRef}
        type="text"
        value={currentValue}
        aria-label={ariaLabel || "Excel editable cell"}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        onChange={(e) =>
          setCurrentValue(uppercase ? e.target.value.toUpperCase() : e.target.value)
        }
        placeholder={placeholder}
        className={cn(
          "w-full h-7 px-1.5 py-0.5 text-xs rounded bg-white dark:bg-[#121216] border border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs z-10 font-semibold outline-hidden",
          uppercase && "uppercase",
          className
        )}
      />
      {isSaving && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20">
          <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
        </span>
      )}
    </div>
  );
}

export interface ExcelSelectOption {
  value: string;
  label: string;
  badgeClass?: string;
}

interface ExcelSelectProps {
  value: string | undefined | null;
  options: ExcelSelectOption[];
  onSave: (newValue: string) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function ExcelSelect({
  value,
  options,
  onSave,
  disabled = false,
  className,
  ariaLabel,
}: ExcelSelectProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const currentVal = value || options[0]?.value || "";
  const selectRef = React.useRef<HTMLSelectElement>(null);

  const selectedOpt =
    options.find((o) => o.value.toLowerCase() === currentVal.toLowerCase()) || options[0];

  React.useEffect(() => {
    if (isEditing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [isEditing]);

  const handleChange = async (newVal: string) => {
    setIsEditing(false);
    if (newVal === currentVal || disabled) return;
    try {
      setIsSaving(true);
      await onSave(newVal);
    } finally {
      setIsSaving(false);
    }
  };

  if (disabled) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold select-none",
          selectedOpt?.badgeClass || "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300",
          className
        )}
      >
        {selectedOpt?.label || currentVal || "—"}
      </span>
    );
  }

  if (!isEditing) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all border",
          selectedOpt?.badgeClass ||
            "bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-700",
          "hover:ring-1 hover:ring-emerald-500/50 hover:border-emerald-500",
          className
        )}
        title="Click to change"
      >
        <span>{selectedOpt?.label || currentVal || "—"}</span>
        {isSaving && (
          <Loader2 className="h-3 w-3 animate-spin text-emerald-600 shrink-0 ml-1.5" />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="relative inline-flex items-center"
    >
      <select
        ref={selectRef}
        value={currentVal}
        disabled={isSaving}
        aria-label={ariaLabel || "Excel select dropdown"}
        onBlur={() => setIsEditing(false)}
        onChange={(e) => handleChange(e.target.value)}
        className={cn(
          "h-6 px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer appearance-none outline-hidden border border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-[#15151a] text-slate-900 dark:text-zinc-100",
          className
        )}
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-white dark:bg-[#15151a] text-slate-900 dark:text-zinc-100 font-normal"
          >
            {opt.label}
          </option>
        ))}
      </select>
      {isSaving && (
        <span className="ml-1.5">
          <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
        </span>
      )}
    </div>
  );
}

interface ExcelDateInputProps {
  value: string | undefined | null;
  onSave: (newDate: string) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function ExcelDateInput({
  value,
  onSave,
  disabled = false,
  className,
  ariaLabel,
}: ExcelDateInputProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [dateVal, setDateVal] = React.useState(value || "");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDateVal(value || "");
  }, [value]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleChange = async (newVal: string) => {
    setDateVal(newVal);
    setIsEditing(false);
    if (newVal !== value && !disabled) {
      try {
        setIsSaving(true);
        await onSave(newVal);
      } catch {
        setDateVal(value || "");
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (disabled) {
    return (
      <span
        className={cn(
          "text-slate-600 dark:text-zinc-400 font-mono text-xs select-none block truncate",
          className
        )}
      >
        {value || "—"}
      </span>
    );
  }

  if (!isEditing) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className={cn(
          "w-full min-h-[26px] px-1.5 py-1 text-xs font-mono text-slate-700 dark:text-zinc-300 truncate cursor-pointer rounded transition-all flex items-center justify-between",
          "hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 hover:ring-1 hover:ring-emerald-400 dark:hover:ring-emerald-700/60",
          className
        )}
        title="Click to edit date"
      >
        <span className={!dateVal ? "text-slate-400 dark:text-zinc-500 italic" : undefined}>
          {dateVal || "—"}
        </span>
        {isSaving && (
          <Loader2 className="h-3 w-3 animate-spin text-emerald-600 shrink-0 ml-1" />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="relative inline-flex items-center min-w-[110px]"
    >
      <input
        ref={inputRef}
        type="date"
        value={dateVal}
        disabled={isSaving}
        aria-label={ariaLabel || "Excel editable date"}
        onBlur={() => setIsEditing(false)}
        onChange={(e) => handleChange(e.target.value)}
        className={cn(
          "w-full h-6 px-1.5 py-0 text-xs font-mono rounded outline-hidden border border-emerald-600 dark:border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-[#121216] text-slate-900 dark:text-zinc-100",
          className
        )}
      />
      {isSaving && (
        <span className="ml-1">
          <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
        </span>
      )}
    </div>
  );
}
