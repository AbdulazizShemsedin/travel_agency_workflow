import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

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
            "flex h-9.5 w-full appearance-none rounded-lg border bg-white dark:bg-[#141418] px-3.5 pr-10 py-2 text-xs font-medium text-slate-900 dark:text-zinc-100 shadow-xs transition-all duration-150",
            "border-slate-300 dark:border-[#26262d] hover:border-slate-400 dark:hover:border-[#383842]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 dark:focus-visible:ring-emerald-500/20 focus-visible:border-emerald-700 dark:focus-visible:border-emerald-500",
            "disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-[#0e0e11] disabled:text-slate-400 dark:disabled:text-zinc-600",
            error && "border-rose-500 focus-visible:ring-rose-500/20 focus-visible:border-rose-500",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-slate-400 dark:text-zinc-500">
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

export { Select };
