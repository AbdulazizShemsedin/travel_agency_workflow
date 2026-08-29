"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { PhoneCall, ShieldCheck, Briefcase } from "lucide-react";
import { BaseApplicantFormValues, JOB_APPLIED_OPTIONS, DESTINATION_COUNTRY_OPTIONS } from "@/lib/validations/applicant.schema";
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

  return (
    <div className="space-y-6">
      {/* 1. National & Ministry Identification Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                National ID & Target Profession
              </CardTitle>
            </div>
            <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Identification & Contacts
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="national_id" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                National ID / Fayda ID (Optional)
              </Label>
              <Input
                id="national_id"
                placeholder="e.g., FAN-123456789"
                {...register("national_id")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="labour_id" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Ministry Labour ID (Optional)
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

      {/* 2. Emergency Reference & Next of Kin Card */}
      <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
        <CardHeader className="pb-4">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
              Emergency Reference & Next of Kin
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact_person_name" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Contact Person Full Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="contact_person_name"
                placeholder="e.g., Almaz Bekele"
                {...register("contact_person_name")}
                className={errors.contact_person_name ? "border-rose-500" : ""}
              />
              {errors.contact_person_name && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.contact_person_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact_person_phone" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Contact Person Phone <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="contact_person_phone"
                placeholder="+251911002233"
                {...register("contact_person_phone")}
                className={errors.contact_person_phone ? "border-rose-500" : ""}
              />
              {errors.contact_person_phone && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.contact_person_phone.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emergency_relationship" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Relationship
              </Label>
              <Input
                id="emergency_relationship"
                placeholder="e.g., Parent, Spouse, Sibling"
                {...register("emergency_relationship")}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
