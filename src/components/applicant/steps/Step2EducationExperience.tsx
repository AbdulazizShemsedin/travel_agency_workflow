"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { GraduationCap, Briefcase } from "lucide-react";
import { BaseApplicantFormValues, EDUCATION_OPTIONS } from "@/lib/validations/applicant.schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Step2EducationExperienceProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<BaseApplicantFormValues, any, any>;
  isRegistrationAttempt?: boolean;
}

export function Step2EducationExperience({
  form,
}: Step2EducationExperienceProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-6">
      {/* Education Background Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                  Education Background
                </CardTitle>
                <CardDescription className="mt-0.5 text-slate-500 dark:text-zinc-400">
                  Academic qualifications and degree information.
                </CardDescription>
              </div>
            </div>
            <span className="rounded-md bg-amber-50 dark:bg-amber-950/60 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Stage 2 • Required for Registration
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="highest_education" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Highest Education Level{" "}
                <span className="text-amber-600 font-bold">*</span>
              </Label>
              <Select
                id="highest_education"
                placeholder="Select highest level"
                {...register("highest_education")}
                error={!!errors.highest_education}
              >
                {EDUCATION_OPTIONS.map((edu) => (
                  <option key={edu} value={edu}>
                    {edu}
                  </option>
                ))}
              </Select>
              {errors.highest_education && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errors.highest_education.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="institution" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Institution Name <span className="text-slate-400 dark:text-zinc-500 font-normal">(Optional)</span>
              </Label>
              <Input
                id="institution"
                placeholder="e.g., Addis Ababa University, Technical College"
                {...register("institution")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="graduation_year" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Graduation Year <span className="text-slate-400 dark:text-zinc-500 font-normal">(Optional)</span>
              </Label>
              <Input
                id="graduation_year"
                type="number"
                placeholder="e.g., 2020"
                min="1950"
                max={new Date().getFullYear() + 5}
                {...register("graduation_year")}
                className={errors.graduation_year ? "border-rose-500 dark:border-rose-500" : ""}
              />
              {errors.graduation_year && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errors.graduation_year.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Experience & Skills Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-[#1c1c22] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#26262d]">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Work Experience & Remarks
              </CardTitle>
              <CardDescription className="mt-0.5 text-slate-500 dark:text-zinc-400">
                Past employment history and candidate qualifications.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="current_employer" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Current / Last Employer <span className="text-slate-400 dark:text-zinc-500 font-normal">(Optional)</span>
              </Label>
              <Input
                id="current_employer"
                placeholder="e.g., General Hospital, Logistics Co."
                {...register("current_employer")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="years_of_experience" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Years of Experience <span className="text-slate-400 dark:text-zinc-500 font-normal">(Optional)</span>
              </Label>
              <Input
                id="years_of_experience"
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g., 3.5"
                {...register("years_of_experience")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="education_remarks" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Education & Experience Remarks <span className="text-slate-400 dark:text-zinc-500 font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="education_remarks"
              placeholder="Add relevant vocational training certifications, language proficiencies, or specialized skills..."
              rows={3}
              {...register("education_remarks")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
