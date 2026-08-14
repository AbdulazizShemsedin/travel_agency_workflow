"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepItem {
  id: number;
  title: string;
  subtitle?: string;
}

export const FORM_STEPS: StepItem[] = [
  { id: 1, title: "Personal Info", subtitle: "Core identification & contact" },
  { id: 2, title: "Education and Experience", subtitle: "Academic & work history" },
  { id: 3, title: "Additional Form 1", subtitle: "Passport & emergency contact" },
  { id: 4, title: "Additional Form 2", subtitle: "COC & medical validity" },
  { id: 5, title: "Review", subtitle: "Verify & register applicant" },
];

interface ApplicantStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  maxCompletedStep?: number;
}

export function ApplicantStepper({
  currentStep,
  onStepClick,
  maxCompletedStep = 1,
}: ApplicantStepperProps) {
  return (
    <div className="w-full rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
      <nav aria-label="Progress">
        <ol className="flex flex-wrap items-center justify-between gap-2 md:flex-nowrap">
          {FORM_STEPS.map((step, index) => {
            const isCurrent = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            const isAccessible = step.id <= maxCompletedStep || isCompleted;

            return (
              <li
                key={step.id}
                className={cn(
                  "flex flex-1 items-center",
                  index !== FORM_STEPS.length - 1 && "pr-2"
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isAccessible && onStepClick) {
                      onStepClick(step.id);
                    }
                  }}
                  disabled={!isAccessible}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all",
                    isCurrent && "bg-emerald-900 text-white shadow-xs",
                    !isCurrent && isCompleted && "hover:bg-slate-100 cursor-pointer text-slate-800",
                    !isCurrent && !isCompleted && isAccessible && "hover:bg-slate-50 cursor-pointer text-slate-600",
                    !isAccessible && "opacity-50 cursor-not-allowed text-slate-400"
                  )}
                >
                  {/* Step Number or Check Icon */}
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      isCurrent && "bg-white text-emerald-900 font-bold",
                      !isCurrent && isCompleted && "bg-emerald-100 text-emerald-800",
                      !isCurrent && !isCompleted && "bg-slate-100 text-slate-600 border border-slate-300"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    ) : (
                      step.id
                    )}
                  </span>

                  {/* Step Label */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-xs font-medium",
                        isCurrent && "font-semibold text-white",
                        !isCurrent && isCompleted && "text-slate-900",
                        !isCurrent && !isCompleted && "text-slate-500"
                      )}
                    >
                      {step.title}
                    </p>
                  </div>
                </button>

                {/* Connecting horizontal line for desktop */}
                {index !== FORM_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "hidden h-0.5 w-4 shrink-0 lg:block",
                      isCompleted ? "bg-emerald-700" : "bg-slate-200"
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
