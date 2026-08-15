"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { ShieldCheck, PhoneCall, Image as ImageIcon, Briefcase } from "lucide-react";
import { BaseApplicantFormValues, JOB_APPLIED_OPTIONS } from "@/lib/validations/applicant.schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface Step3IdentificationContactProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<BaseApplicantFormValues, any, any>;
}

export function Step3IdentificationContact({ form }: Step3IdentificationContactProps) {
  const {
    register,
    formState: { errors },
  } = form;

  const todayISO = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Official Identification Documents Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                  Identification & Travel Documents
                </CardTitle>
                <CardDescription className="mt-0.5 text-slate-500 dark:text-zinc-400">
                  Passport details, issue place/date, and National/Fayda ID.
                </CardDescription>
              </div>
            </div>
            <span className="rounded-md bg-amber-50 dark:bg-amber-950/60 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Stage 2 • Required for Registration
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Date of Birth & National ID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date_of_birth" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Date of Birth <span className="text-amber-600 font-bold">*</span>
              </Label>
              <Input
                id="date_of_birth"
                type="date"
                max={todayISO}
                {...register("date_of_birth")}
                className={errors.date_of_birth ? "border-rose-500" : ""}
              />
              {errors.date_of_birth && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.date_of_birth.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="national_id" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                National ID / Fayda ID (FAN) <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="national_id"
                placeholder="e.g., FAN-123456789 or Kebele ID"
                {...register("national_id")}
              />
            </div>
          </div>

          {/* Passport Number, Issue Date, Expiry & Place of Issue */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="passport_number" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Passport Number <span className="text-amber-600 font-bold">*</span>
              </Label>
              <Input
                id="passport_number"
                placeholder="e.g., EP1234567"
                style={{ textTransform: "uppercase" }}
                {...register("passport_number", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
                className={errors.passport_number ? "border-rose-500" : ""}
              />
              {errors.passport_number && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.passport_number.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="passport_issue_date" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Passport Issue Date
              </Label>
              <Input
                id="passport_issue_date"
                type="date"
                max={todayISO}
                {...register("passport_issue_date")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="passport_expiry" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Passport Expiry Date <span className="text-amber-600 font-bold">*</span>
              </Label>
              <Input
                id="passport_expiry"
                type="date"
                {...register("passport_expiry")}
                className={errors.passport_expiry ? "border-rose-500" : ""}
              />
              {errors.passport_expiry && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.passport_expiry.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="place_of_issue" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Place of Issue
              </Label>
              <Input
                id="place_of_issue"
                placeholder="e.g., Addis Ababa"
                {...register("place_of_issue")}
              />
            </div>
          </div>

          {/* Job Applied & Labour ID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="job_applied" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Job Applied Profession
              </Label>
              <Select id="job_applied" {...register("job_applied")}>
                <option value="">Select target profession</option>
                {JOB_APPLIED_OPTIONS.map((job) => (
                  <option key={job} value={job}>
                    {job}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="labour_id" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Ministry Labour ID <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="labour_id"
                placeholder="e.g., LBR-998844"
                {...register("labour_id")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency & Reference Contact Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                  Emergency / Reference Contact
                </CardTitle>
                <CardDescription className="mt-0.5 text-slate-500 dark:text-zinc-400">
                  Designated family member or guarantor contact.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact_person_name" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Contact Person Full Name
              </Label>
              <Input
                id="contact_person_name"
                placeholder="e.g., Fatima Muhammed"
                {...register("contact_person_name")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact_person_phone" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Contact Person Phone Number
              </Label>
              <Input
                id="contact_person_phone"
                placeholder="+251911889900"
                {...register("contact_person_phone")}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
