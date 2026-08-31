"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------------- */
/* 1. Radix UI Headless Select Primitives (Custom Theme-Styled Dropdowns)   */
/* ------------------------------------------------------------------------- */

const RadixSelect = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    error?: boolean;
  }
>(({ className, children, error, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-white dark:bg-[#141418] px-3 py-2 text-xs font-medium text-slate-800 dark:text-zinc-200 shadow-xs transition-all duration-150 cursor-pointer select-none",
      "border-slate-200 dark:border-[#272730] hover:border-slate-300 dark:hover:border-[#383844] hover:bg-slate-50 dark:hover:bg-[#18181f]",
      "focus:outline-none focus:ring-2 focus:ring-emerald-700/20 dark:focus:ring-emerald-500/20 focus:border-emerald-700 dark:focus:border-emerald-500",
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-[#101014]",
      "[&>span]:line-clamp-1 text-left",
      error && "border-rose-500 focus:ring-rose-500/20 focus:border-rose-500",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0 transition-transform duration-200 text-slate-500 dark:text-zinc-400" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1 text-slate-500 dark:text-zinc-400",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = "SelectScrollUpButton";

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1 text-slate-500 dark:text-zinc-400",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = "SelectScrollDownButton";

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-80 min-w-[8rem] overflow-hidden rounded-xl border bg-white dark:bg-[#131317] text-slate-900 dark:text-zinc-100 shadow-2xl transition-all",
        "border-slate-200/90 dark:border-[#272732]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1.5 space-y-0.5",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500", className)}
    {...props}
  />
));
SelectLabel.displayName = "SelectLabel";

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-xs font-medium text-slate-700 dark:text-zinc-200 outline-none transition-colors duration-100",
      "hover:bg-slate-100 dark:hover:bg-[#1d1d25] hover:text-slate-900 dark:hover:text-white",
      "focus:bg-emerald-50 dark:focus:bg-emerald-950/60 focus:text-emerald-950 dark:focus:text-emerald-300",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      className
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 font-bold" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-slate-100 dark:bg-[#22222a]", className)}
    {...props}
  />
));
SelectSeparator.displayName = "SelectSeparator";

/* ------------------------------------------------------------------------- */
/* 2. High-Level SimpleSelect (Radix-Powered Styled Dropdown with Options)     */
/* ------------------------------------------------------------------------- */

export interface SimpleSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SimpleSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  placeholder?: string;
  options: (SimpleSelectOption | string)[];
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
  error?: boolean;
  name?: string;
  "aria-label"?: string;
}

export function SimpleSelect({
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select option...",
  options,
  className,
  triggerClassName,
  contentClassName,
  disabled,
  error,
  "aria-label": ariaLabel,
}: SimpleSelectProps) {
  const normalizedOptions: SimpleSelectOption[] = React.useMemo(() => {
    return options.map((opt) =>
      typeof opt === "string" ? { value: opt, label: opt } : opt
    );
  }, [options]);

  return (
    <RadixSelect
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(triggerClassName, className)}
        error={error}
        aria-label={ariaLabel}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {normalizedOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex items-center gap-2">
              {opt.icon && <span className="shrink-0">{opt.icon}</span>}
              <span>{opt.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </RadixSelect>
  );
}

/* ------------------------------------------------------------------------- */
/* 3. Themed Native Form Select (Direct RHF Support with Styled UI)          */
/* ------------------------------------------------------------------------- */

export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
  error?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, placeholder, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            "flex h-9.5 w-full appearance-none rounded-lg border bg-white dark:bg-[#141418] px-3.5 pr-10 py-2 text-xs font-medium text-slate-900 dark:text-zinc-100 shadow-xs transition-all duration-150 cursor-pointer",
            "border-slate-300 dark:border-[#26262d] hover:border-slate-400 dark:hover:border-[#383842]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 dark:focus-visible:ring-emerald-500/20 focus-visible:border-emerald-700 dark:focus-visible:border-emerald-500",
            "disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-[#0e0e11] disabled:text-slate-400 dark:disabled:text-zinc-600",
            error && "border-rose-500 focus-visible:ring-rose-500/20 focus-visible:border-rose-500",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-slate-400 dark:text-zinc-500 bg-white dark:bg-[#141418]">
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          <ChevronDown className="h-4 w-4 text-slate-400 dark:text-zinc-400" />
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";

const NativeSelect = Select;

export {
  Select,
  NativeSelect,
  RadixSelect,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
