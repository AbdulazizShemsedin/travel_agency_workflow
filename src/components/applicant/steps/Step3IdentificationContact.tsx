"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { ShieldCheck, PhoneCall, Calendar } from "lucide-react";
import { BaseApplicantFormValues } from "@/lib/validations/applicant.schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Step3IdentificationContactProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<BaseApplicantFormValues, any, any>;
}

export function Step3IdentificationContact({ form }: Step3IdentificationContactProps) {
  const {
    register,
    formState: { errors },
  } = form;

  // Maximum allowed date for date of birth is today
  const todayISO = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Official Identification Documents Card */}
      <Card className="border-slate-200/80">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Identification & Travel Documents
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Official passport, National/Fayda ID, and Ministry of Labour ID details.
                </CardDescription>
              </div>
            </div>
            <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 border border-amber-200">
              Stage 2 • Required for Registration
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Date of Birth & National ID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date_of_birth" className="text-xs font-semibold text-slate-800">
                Date of Birth <span className="text-amber-600 font-bold">*</span>
              </Label>
              <Input
                id="date_of_birth"
                type="date"
                max={todayISO}
                {...register("date_of_birth")}
                className={errors.date_of_birth ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.date_of_birth && (
                <p className="text-xs text-rose-600">{errors.date_of_birth.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="national_id" className="text-xs font-semibold text-slate-700">
                National ID / Fayda ID (FAN) <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="national_id"
                placeholder="e.g., FAN-123456789 or Kebele ID"
                {...register("national_id")}
              />
            </div>
          </div>

          {/* Passport Number & Expiry */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="passport_number" className="text-xs font-semibold text-slate-800">
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
                className={errors.passport_number ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.passport_number && (
                <p className="text-xs text-rose-600">{errors.passport_number.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="passport_expiry" className="text-xs font-semibold text-slate-700">
                Passport Expiry Date <span className="text-slate-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="passport_expiry"
                type="date"
                {...register("passport_expiry")}
              />
            </div>
          </div>

          {/* Ministry Labour ID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="labour_id" className="text-xs font-semibold text-slate-800">
                Labour ID Number <span className="text-amber-600 font-bold">*</span>
              </Label>
              <Input
                id="labour_id"
                placeholder="e.g., LBR-998844"
                {...register("labour_id")}
                className={errors.labour_id ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.labour_id && (
                <p className="text-xs text-rose-600">{errors.labour_id.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency & Reference Contact Card */}
      <Card className="border-slate-200/80">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Emergency / Reference Contact
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Designated family member or guarantor contact.
                </CardDescription>
              </div>
            </div>
            <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 border border-amber-200">
              Stage 2 • Required for Registration
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact_person_name" className="text-xs font-semibold text-slate-800">
                Contact Person Full Name <span className="text-amber-600 font-bold">*</span>
              </Label>
              <Input
                id="contact_person_name"
                placeholder="e.g., Fatima Muhammed"
                {...register("contact_person_name")}
                className={errors.contact_person_name ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.contact_person_name && (
                <p className="text-xs text-rose-600">{errors.contact_person_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact_person_phone" className="text-xs font-semibold text-slate-800">
                Contact Person Phone Number <span className="text-amber-600 font-bold">*</span>
              </Label>
              <Input
                id="contact_person_phone"
                placeholder="+251911889900"
                {...register("contact_person_phone")}
                className={errors.contact_person_phone ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
              />
              {errors.contact_person_phone && (
                <p className="text-xs text-rose-600">{errors.contact_person_phone.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
