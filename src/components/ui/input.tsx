import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onClick, onKeyDown, ...props }, ref) => {
    const isDateType = type === "date" || type === "datetime-local" || type === "time";

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      if (isDateType && !props.disabled && !props.readOnly) {
        if (typeof (e.currentTarget as any).showPicker === "function") {
          try {
            (e.currentTarget as any).showPicker();
          } catch {
            // Browser picker already active or dismissed
          }
        }
      }
      onClick?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isDateType && !props.disabled && !props.readOnly) {
        if (e.key === " " || e.key === "ArrowDown") {
          if (typeof (e.currentTarget as any).showPicker === "function") {
            try {
              (e.currentTarget as any).showPicker();
            } catch {
              // Browser picker already active or dismissed
            }
          }
        }
      }
      onKeyDown?.(e);
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30 focus-visible:border-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
          isDateType && "cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer",
          className
        )}
        ref={ref}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
