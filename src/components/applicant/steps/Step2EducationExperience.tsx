"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { GraduationCap, Briefcase, Award, User, Globe, Car, Check } from "lucide-react";
import {
  BaseApplicantFormValues,
  EDUCATION_OPTIONS,
  JOB_APPLIED_OPTIONS,
  DESTINATION_COUNTRY_OPTIONS,
} from "@/lib/validations/applicant.schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

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

  const currentJob = watch("job_applied") || "House worker";
  const expCountry = watch("experience_country");
  const expPeriod = watch("experience_period");
  const yearsExp = watch("years_of_experience");

  const [hasExperience, setHasExperience] = React.useState<boolean>(() => {
    return Boolean(expCountry || expPeriod || (yearsExp && Number(yearsExp) > 0));
  });

  React.useEffect(() => {
    if (expCountry || expPeriod || (yearsExp && Number(yearsExp) > 0)) {
      setHasExperience(true);
    }
  }, [expCountry, expPeriod, yearsExp]);

  const isCooking = Boolean(
    watch("skill_cooking") === 1 ||
    watch("skill_cooking") === "1" ||
    watch("skill_cooking") === "YES" ||
    watch("skill_cooking") === "yes" ||
    watch("skill_cooking") === true
  );
  const isCleaning = Boolean(
    watch("skill_cleaning") === 1 ||
    watch("skill_cleaning") === "1" ||
    watch("skill_cleaning") === "YES" ||
    watch("skill_cleaning") === "yes" ||
    watch("skill_cleaning") === true
  );
  const isWashing = Boolean(
    watch("skill_washing") === 1 ||
    watch("skill_washing") === "1" ||
    watch("skill_washing") === "YES" ||
    watch("skill_washing") === "yes" ||
    watch("skill_washing") === true
  );
  const isIroning = Boolean(
    watch("skill_ironing") === 1 ||
    watch("skill_ironing") === "1" ||
    watch("skill_ironing") === "YES" ||
    watch("skill_ironing") === "yes" ||
    watch("skill_ironing") === true
  );
  const isBabySitting = Boolean(
    watch("skill_baby_sitting") === 1 ||
    watch("skill_baby_sitting") === "1" ||
    watch("skill_baby_sitting") === "YES" ||
    watch("skill_baby_sitting") === "yes" ||
    watch("skill_baby_sitting") === true
  );
  const isChildrenCare = Boolean(
    watch("skill_children_care") === 1 ||
    watch("skill_children_care") === "1" ||
    watch("skill_children_care") === "YES" ||
    watch("skill_children_care") === "yes" ||
    watch("skill_children_care") === true
  );
  const isArabicCooking = Boolean(
    watch("skill_arabic_cooking") === 1 ||
    watch("skill_arabic_cooking") === "1" ||
    watch("skill_arabic_cooking") === "YES" ||
    watch("skill_arabic_cooking") === "yes" ||
    watch("skill_arabic_cooking") === true
  );
  const isSewing = Boolean(
    watch("skill_sewing") === 1 ||
    watch("skill_sewing") === "1" ||
    watch("skill_sewing") === "YES" ||
    watch("skill_sewing") === "yes" ||
    watch("skill_sewing") === true
  );
  const isElderlyCare = Boolean(
    watch("skill_elderly_care") === 1 ||
    watch("skill_elderly_care") === "1" ||
    watch("skill_elderly_care") === "YES" ||
    watch("skill_elderly_care") === "yes" ||
    watch("skill_elderly_care") === true
  );
  const isDriving = Boolean(
    watch("skill_driving") === 1 ||
    watch("skill_driving") === "1" ||
    watch("skill_driving") === "YES" ||
    watch("skill_driving") === "yes" ||
    watch("skill_driving") === true
  );

  const isAllSkills =
    isCooking &&
    isCleaning &&
    isWashing &&
    isIroning &&
    isBabySitting &&
    isChildrenCare &&
    isArabicCooking &&
    isSewing &&
    isElderlyCare &&
    isDriving;

  const handleToggleAllSkills = (checked: boolean) => {
    const val = checked ? 1 : 0;
    setValue("skill_cleaning", val, { shouldDirty: true });
    setValue("skill_washing", val, { shouldDirty: true });
    setValue("skill_ironing", val, { shouldDirty: true });
    setValue("skill_cooking", val, { shouldDirty: true });
    setValue("skill_arabic_cooking", val, { shouldDirty: true });
    setValue("skill_baby_sitting", val, { shouldDirty: true });
    setValue("skill_baby_care" as any, val, { shouldDirty: true });
    setValue("skill_children_care", val, { shouldDirty: true });
    setValue("skill_elder_care" as any, val, { shouldDirty: true });
    setValue("skill_elderly_care", val, { shouldDirty: true });
    setValue("skill_driving", val, { shouldDirty: true });
    setValue("skill_sewing", val, { shouldDirty: true });
  };

  return (
    <div className="space-y-6">
      {/* 1. Job Role & Education Profile */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Job Role & Education Profile
              </CardTitle>
            </div>
            <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Primary Role & Qualifications
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="job_applied" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Job / Position Applied <span className="text-rose-500">*</span>
              </Label>
              <Select
                id="job_applied"
                {...register("job_applied")}
                error={!!errors.job_applied}
              >
                {JOB_APPLIED_OPTIONS.map((job) => (
                  <option key={job} value={job}>
                    {job} {job === "House worker" ? "(Default)" : ""}
                  </option>
                ))}
              </Select>
              {errors.job_applied && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.job_applied.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="highest_education" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Highest Education <span className="text-rose-500">*</span>
              </Label>
              <Select
                id="highest_education"
                {...register("highest_education")}
                error={!!errors.highest_education}
              >
                <option value="">Select education level</option>
                {EDUCATION_OPTIONS.map((edu) => (
                  <option key={edu} value={edu}>
                    {edu}
                  </option>
                ))}
              </Select>
              {errors.highest_education && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.highest_education.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Skills Matrix Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Candidate Skills Matrix
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleAllSkills(!isAllSkills)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                  isAllSkills
                    ? "bg-emerald-800 text-white border-emerald-900 shadow-xs"
                    : "bg-white dark:bg-[#181820] text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50"
                }`}
              >
                {isAllSkills ? "✓ All Selected" : "Select All"}
              </button>
              <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                CV Skills Matrix
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {/* Cleaning */}
            <label
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                isCleaning
                  ? "border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-700"
                  : "border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isCleaning}
                  onChange={(e) => setValue("skill_cleaning", e.target.checked ? 1 : 0, { shouldDirty: true })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
                />
                <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200">Cleaning</span>
              </div>
              {isCleaning && <span className="text-[10px] text-emerald-700 font-bold">✓</span>}
            </label>

            {/* Washing */}
            <label
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                isWashing
                  ? "border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-700"
                  : "border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isWashing}
                  onChange={(e) => setValue("skill_washing", e.target.checked ? 1 : 0, { shouldDirty: true })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
                />
                <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200">Washing</span>
              </div>
              {isWashing && <span className="text-[10px] text-emerald-700 font-bold">✓</span>}
            </label>

            {/* Driving */}
            <label
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                isDriving
                  ? "border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-700"
                  : "border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isDriving}
                  onChange={(e) => setValue("skill_driving", e.target.checked ? 1 : 0, { shouldDirty: true })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
                />
                <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200">Driving</span>
              </div>
              {isDriving && <span className="text-[10px] text-emerald-700 font-bold">✓</span>}
            </label>

            {/* Cooking */}
            <label
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                isCooking
                  ? "border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-700"
                  : "border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isCooking}
                  onChange={(e) => setValue("skill_cooking", e.target.checked ? 1 : 0, { shouldDirty: true })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
                />
                <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200">Cooking</span>
              </div>
              {isCooking && <span className="text-[10px] text-emerald-700 font-bold">✓</span>}
            </label>

            {/* Ironing */}
            <label
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                isIroning
                  ? "border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-700"
                  : "border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isIroning}
                  onChange={(e) => setValue("skill_ironing", e.target.checked ? 1 : 0, { shouldDirty: true })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
                />
                <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200">Ironing</span>
              </div>
              {isIroning && <span className="text-[10px] text-emerald-700 font-bold">✓</span>}
            </label>

            {/* Baby Sitting */}
            <label
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                isBabySitting
                  ? "border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-700"
                  : "border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isBabySitting}
                  onChange={(e) => setValue("skill_baby_sitting", e.target.checked ? 1 : 0, { shouldDirty: true })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
                />
                <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200">Baby Sitting</span>
              </div>
              {isBabySitting && <span className="text-[10px] text-emerald-700 font-bold">✓</span>}
            </label>

            {/* Children Care */}
            <label
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                isChildrenCare
                  ? "border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-700"
                  : "border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isChildrenCare}
                  onChange={(e) => setValue("skill_children_care", e.target.checked ? 1 : 0, { shouldDirty: true })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
                />
                <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200">Children Care</span>
              </div>
              {isChildrenCare && <span className="text-[10px] text-emerald-700 font-bold">✓</span>}
            </label>

            {/* Arabic Cooking */}
            <label
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                isArabicCooking
                  ? "border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-700"
                  : "border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isArabicCooking}
                  onChange={(e) => setValue("skill_arabic_cooking", e.target.checked ? 1 : 0, { shouldDirty: true })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
                />
                <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200">Arabic Cooking</span>
              </div>
              {isArabicCooking && <span className="text-[10px] text-emerald-700 font-bold">✓</span>}
            </label>

            {/* Sewing */}
            <label
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                isSewing
                  ? "border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-700"
                  : "border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isSewing}
                  onChange={(e) => setValue("skill_sewing", e.target.checked ? 1 : 0, { shouldDirty: true })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
                />
                <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200">Sewing</span>
              </div>
              {isSewing && <span className="text-[10px] text-emerald-700 font-bold">✓</span>}
            </label>

            {/* Elderly Care */}
            <label
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                isElderlyCare
                  ? "border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-700"
                  : "border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isElderlyCare}
                  onChange={(e) => setValue("skill_elderly_care", e.target.checked ? 1 : 0, { shouldDirty: true })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-800"
                />
                <span className="font-semibold text-xs text-slate-800 dark:text-zinc-200">Elderly Care</span>
              </div>
              {isElderlyCare && <span className="text-[10px] text-emerald-700 font-bold">✓</span>}
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 3. Languages & Work Experience Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Languages & Overseas Work Experience
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Languages */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="english_level" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                English Level <span className="text-rose-500">*</span>
              </Label>
              <Select
                id="english_level"
                {...register("english_level")}
                error={!!errors.english_level}
              >
                <option value="">Select English level</option>
                {LANGUAGE_OPTIONS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </Select>
              {errors.english_level && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.english_level.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="arabic_level" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Arabic Level <span className="text-rose-500">*</span>
              </Label>
              <Select
                id="arabic_level"
                {...register("arabic_level")}
                error={!!errors.arabic_level}
              >
                <option value="">Select Arabic level</option>
                {LANGUAGE_OPTIONS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </Select>
              {errors.arabic_level && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.arabic_level.message}</p>
              )}
            </div>
          </div>

          {/* Has Experience Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-[#26262d] bg-slate-50/70 dark:bg-[#16161b] p-3.5 mt-2">
            <div className="space-y-0.5">
              <Label htmlFor="has_experience_toggle" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer">
                Has Experience ?
              </Label>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Enable if candidate has previous overseas, Gulf, or domestic work experience.
              </p>
            </div>
            <Switch
              id="has_experience_toggle"
              checked={hasExperience}
              onCheckedChange={(checked) => {
                setHasExperience(checked);
                if (!checked) {
                  setValue("experience_country", "", { shouldDirty: true });
                  setValue("experience_period", "", { shouldDirty: true });
                  setValue("years_of_experience", undefined, { shouldDirty: true });
                  setValue("monthly_salary", "1000", { shouldDirty: true });
                } else {
                  setValue("monthly_salary", "1200", { shouldDirty: true });
                }
              }}
            />
          </div>

          {/* Overseas Experience Country & Period (Only when toggled ON) */}
          {hasExperience && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="experience_country" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Previous Work Country
                </Label>
                <Input
                  id="experience_country"
                  placeholder="e.g., Saudi Arabia, UAE, Kuwait, Jordan"
                  {...register("experience_country")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="experience_period" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Experience Duration
                </Label>
                <Input
                  id="experience_period"
                  placeholder="e.g., 2 Years, 4 Years"
                  {...register("experience_period")}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Physical Attributes & Salary Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Physical Attributes & Expected Salary
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="height" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Height <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="height"
                placeholder="e.g., 160 CM"
                {...register("height")}
                className={errors.height ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.height && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.height.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="weight" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Weight <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="weight"
                placeholder="e.g., 55 KG"
                {...register("weight")}
                className={errors.weight ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.weight && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.weight.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="complexion" className="text-xs font-bold text-slate-900 dark:text-white">
                Complexion / Skin <span className="text-rose-500">*</span>
              </Label>
              <Select id="complexion" {...register("complexion")} error={!!errors.complexion}>
                {COMPLEXION_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c} {c === "Fair" ? "(Default)" : ""}
                  </option>
                ))}
              </Select>
              {errors.complexion && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.complexion.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="place_of_birth" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Place of Birth <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="place_of_birth"
                placeholder="e.g., Oromia, Amhara"
                {...register("place_of_birth")}
                className={errors.place_of_birth ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.place_of_birth && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.place_of_birth.message}</p>
              )}
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
              <div className="flex items-center justify-between">
                <Label htmlFor="monthly_salary" className="text-xs font-bold text-slate-900 dark:text-white">
                  Monthly Salary (SAR) <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                  1,000 fresh / 1,200 exp
                </span>
              </div>
              <Input
                id="monthly_salary"
                placeholder="e.g., 1000 or 1200"
                {...register("monthly_salary")}
                className={errors.monthly_salary ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.monthly_salary && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.monthly_salary.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Education Background & Remarks Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Education Background & Remarks
              </CardTitle>
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
              placeholder="e.g., PASSED, Recommended for House worker"
              {...register("remarks")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
