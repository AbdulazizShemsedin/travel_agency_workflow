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
            "flex h-10 w-full appearance-none rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30 focus-visible:border-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
            error ? "border-rose-500 focus-visible:ring-rose-500/20" : "border-slate-300",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
