"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { GraduationCap, Briefcase, Award, User, Globe } from "lucide-react";
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

const LANGUAGE_OPTIONS = ["None", "Basic", "Fair", "Good", "Fluent"];
const COMPLEXION_OPTIONS = ["Fair", "Medium", "Dark", "Other"];

export function Step2EducationExperience({
  form,
}: Step2EducationExperienceProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const isCooking = watch("skill_cooking") === "YES" || watch("skill_cooking") === true;
  const isCleaning = watch("skill_cleaning") === "YES" || watch("skill_cleaning") === true;
  const isWashing = watch("skill_washing") === "YES" || watch("skill_washing") === true;
  const isIroning = watch("skill_ironing") === "YES" || watch("skill_ironing") === true;
  const isBabySitting = watch("skill_baby_sitting") === "YES" || watch("skill_baby_sitting") === true;
  const isChildrenCare = watch("skill_children_care") === "YES" || watch("skill_children_care") === true;
  const isArabicCooking = watch("skill_arabic_cooking") === "YES" || watch("skill_arabic_cooking") === true;
  const isSewing = watch("skill_sewing") === "YES" || watch("skill_sewing") === true;
  const isElderlyCare = watch("skill_elderly_care") === "YES" || watch("skill_elderly_care") === true;

  return (
    <div className="space-y-6">
      {/* 1. Skills Matrix Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                  Candidate Skills Matrix
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                  Select candidate practical capabilities for official recruitment CV.
                </CardDescription>
              </div>
            </div>
            <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Optional CV Skills
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {/* Cooking */}
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-emerald-600 hover:bg-emerald-50/30 cursor-pointer transition">
              <input
                type="checkbox"
                checked={isCooking}
                onChange={(e) => setValue("skill_cooking", e.target.checked ? "YES" : "", { shouldDirty: true })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-zinc-200 block">Cooking</span>
              </div>
            </label>

            {/* Cleaning */}
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-emerald-600 hover:bg-emerald-50/30 cursor-pointer transition">
              <input
                type="checkbox"
                checked={isCleaning}
                onChange={(e) => setValue("skill_cleaning", e.target.checked ? "YES" : "", { shouldDirty: true })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-zinc-200 block">Cleaning</span>
              </div>
            </label>

            {/* Washing */}
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-emerald-600 hover:bg-emerald-50/30 cursor-pointer transition">
              <input
                type="checkbox"
                checked={isWashing}
                onChange={(e) => setValue("skill_washing", e.target.checked ? "YES" : "", { shouldDirty: true })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-zinc-200 block">Washing</span>
              </div>
            </label>

            {/* Ironing */}
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-emerald-600 hover:bg-emerald-50/30 cursor-pointer transition">
              <input
                type="checkbox"
                checked={isIroning}
                onChange={(e) => setValue("skill_ironing", e.target.checked ? "YES" : "", { shouldDirty: true })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-zinc-200 block">Ironing</span>
              </div>
            </label>

            {/* Baby Sitting */}
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-emerald-600 hover:bg-emerald-50/30 cursor-pointer transition">
              <input
                type="checkbox"
                checked={isBabySitting}
                onChange={(e) => setValue("skill_baby_sitting", e.target.checked ? "YES" : "", { shouldDirty: true })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-zinc-200 block">Baby Sitting</span>
              </div>
            </label>

            {/* Children Care */}
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-emerald-600 hover:bg-emerald-50/30 cursor-pointer transition">
              <input
                type="checkbox"
                checked={isChildrenCare}
                onChange={(e) => setValue("skill_children_care", e.target.checked ? "YES" : "", { shouldDirty: true })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-zinc-200 block">Children Care</span>
              </div>
            </label>

            {/* Arabic Cooking */}
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-emerald-600 hover:bg-emerald-50/30 cursor-pointer transition">
              <input
                type="checkbox"
                checked={isArabicCooking}
                onChange={(e) => setValue("skill_arabic_cooking", e.target.checked ? "YES" : "", { shouldDirty: true })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-zinc-200 block">Arabic Cooking</span>
              </div>
            </label>

            {/* Sewing */}
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-emerald-600 hover:bg-emerald-50/30 cursor-pointer transition">
              <input
                type="checkbox"
                checked={isSewing}
                onChange={(e) => setValue("skill_sewing", e.target.checked ? "YES" : "", { shouldDirty: true })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-zinc-200 block">Sewing</span>
              </div>
            </label>

            {/* Elderly Care */}
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-emerald-600 hover:bg-emerald-50/30 cursor-pointer transition">
              <input
                type="checkbox"
                checked={isElderlyCare}
                onChange={(e) => setValue("skill_elderly_care", e.target.checked ? "YES" : "", { shouldDirty: true })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-zinc-200 block">Elderly Care</span>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 2. Languages & Work Experience Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Languages & Overseas Work Experience
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                Language fluency and previous employment in GCC or overseas countries.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Languages */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="english_level" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                English Level
              </Label>
              <Select id="english_level" {...register("english_level")}>
                <option value="">Select English level</option>
                {LANGUAGE_OPTIONS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="arabic_level" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Arabic Level
              </Label>
              <Select id="arabic_level" {...register("arabic_level")}>
                <option value="">Select Arabic level</option>
                {LANGUAGE_OPTIONS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Overseas Experience Country & Period */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="experience_country" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Experience Country <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="experience_country"
                placeholder="e.g., Saudi Arabia, UAE, Kuwait, England"
                {...register("experience_country")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="experience_period" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Experience Period <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="experience_period"
                placeholder="e.g., 2 Years, 9 Months"
                {...register("experience_period")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Physical Attributes & Location Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Physical Attributes & Location Details
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                Candidate physical measurements and origin details for CV.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="height" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Height <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="height"
                placeholder="e.g., 160 CM"
                {...register("height")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="weight" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Weight <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="weight"
                placeholder="e.g., 55 KG"
                {...register("weight")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="complexion" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Complexion <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Select id="complexion" {...register("complexion")}>
                <option value="">Select complexion</option>
                {COMPLEXION_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="place_of_birth" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Place of Birth <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="place_of_birth"
                placeholder="e.g., Addis Ababa"
                {...register("place_of_birth")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="leaving_town" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Leaving Town <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="leaving_town"
                placeholder="e.g., Addis Ababa"
                {...register("leaving_town")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="monthly_salary" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Monthly Salary <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="monthly_salary"
                placeholder="e.g., 1000"
                {...register("monthly_salary")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Education Background & Remarks Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                  Education Background & Remarks
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                  Academic qualifications and official CV remarks.
                </CardDescription>
              </div>
            </div>
            <span className="rounded-md bg-amber-50 dark:bg-amber-950/60 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Education Level *
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="highest_education" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Highest Education Level <span className="text-amber-600 font-bold">*</span>
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
                Institution Name <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="institution"
                placeholder="e.g., Primary School, High School"
                {...register("institution")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="remarks" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Official Remarks <span className="text-slate-400 font-normal">(Optional - defaults to PASSED)</span>
            </Label>
            <Input
              id="remarks"
              placeholder="e.g., PASSED, Recommended for Housemaid"
              {...register("remarks")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
