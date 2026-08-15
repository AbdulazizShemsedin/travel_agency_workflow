"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { Camera, DollarSign, UploadCloud } from "lucide-react";
import { BaseApplicantFormValues, GENDER_OPTIONS, RELIGION_OPTIONS, MARITAL_STATUS_OPTIONS } from "@/lib/validations/applicant.schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Step1PersonalInfoProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<BaseApplicantFormValues, any, any>;
}

export function Step1PersonalInfo({ form }: Step1PersonalInfoProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const feeRequired = watch("fee_required");
  const profilePhotoValue = watch("profile_photo_url");
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(profilePhotoValue || null);

  React.useEffect(() => {
    if (profilePhotoValue) {
      setPhotoPreview(profilePhotoValue);
    }
  }, [profilePhotoValue]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        setValue("profile_photo_url", result, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column: Photo Upload & Application Settings (matching Figma) */}
      <div className="space-y-6 lg:col-span-4">
        {/* Profile Photo Card */}
        <Card className="border-slate-200/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">
              Profile Photo
            </CardTitle>
            <CardDescription>
              Upload a recent, professional headshot.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-2">
            <label
              htmlFor="profile-photo-upload"
              className="group relative flex h-36 w-36 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-emerald-700 hover:bg-emerald-50/50"
            >
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="Profile headshot"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-xs group-hover:scale-105">
                    <Camera className="h-5 w-5 text-slate-500 group-hover:text-emerald-800" />
                  </div>
                  <span className="mt-2 text-xs font-medium text-slate-600">
                    Upload Photo
                  </span>
                </div>
              )}
              <input
                id="profile-photo-upload"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="sr-only"
                onChange={handlePhotoUpload}
              />
            </label>
            <p className="mt-3 text-center text-xs text-slate-500">
              JPG, PNG max 5MB
            </p>
          </CardContent>
        </Card>

        {/* Application Settings Card (from Figma) */}
        <Card className="border-slate-200/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">
              Application Settings
            </CardTitle>
            <CardDescription>
              Configure fee requirements and payment context.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="fee_required" className="text-xs font-semibold text-slate-800">
                  Fee Required
                </Label>
                <p className="text-xs text-slate-500">
                  Enable initial registration processing fee
                </p>
              </div>
              <Switch
                id="fee_required"
                checked={feeRequired}
                onCheckedChange={(checked) =>
                  setValue("fee_required", checked, { shouldDirty: true })
                }
              />
            </div>

            {feeRequired && (
              <div className="space-y-1.5 animate-in fade-in-50 duration-200">
                <Label htmlFor="registration_fee_amount" className="text-xs font-semibold text-slate-700">
                  Registration Fee Amount ($)
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input
                    id="registration_fee_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-8"
                    {...register("registration_fee_amount", { valueAsNumber: true })}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Standard fee is typically handled in processing stage.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Personal & Contact Information (Stage 1 Mandatory + Optional) */}
      <div className="space-y-6 lg:col-span-8">
        <Card className="border-slate-200/80">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Personal Information
                </CardTitle>
                <CardDescription className="mt-1">
                  Enter the applicant&apos;s primary identification details as they appear on official documents.
                </CardDescription>
              </div>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                Stage 1 • Mandatory to Draft
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Full Name Row (First, Middle, Last) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-xs font-semibold text-slate-800">
                  First Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  placeholder="e.g., Abebe"
                  {...register("first_name")}
                  className={errors.first_name ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.first_name && (
                  <p className="text-xs text-rose-600">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="middle_name" className="text-xs font-semibold text-slate-700">
                  Middle Name <span className="text-slate-400 font-normal">(Grandfather)</span>
                </Label>
                <Input
                  id="middle_name"
                  placeholder="e.g., Bekele"
                  {...register("middle_name")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-xs font-semibold text-slate-800">
                  Last Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  placeholder="e.g., Kebede"
                  {...register("last_name")}
                  className={errors.last_name ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.last_name && (
                  <p className="text-xs text-rose-600">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            {/* Demographics: Gender, Religion, Marital Status */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="gender" className="text-xs font-semibold text-slate-800">
                  Gender <span className="text-rose-500">*</span>
                </Label>
                <Select
                  id="gender"
                  placeholder="Select gender"
                  {...register("gender")}
                  error={!!errors.gender}
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
                {errors.gender && (
                  <p className="text-xs text-rose-600">{errors.gender.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="religion" className="text-xs font-semibold text-slate-800">
                  Religion <span className="text-rose-500">*</span>
                </Label>
                <Select
                  id="religion"
                  placeholder="Select religion"
                  {...register("religion")}
                  error={!!errors.religion}
                >
                  {RELIGION_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
                {errors.religion && (
                  <p className="text-xs text-rose-600">{errors.religion.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="marital_status" className="text-xs font-semibold text-slate-800">
                  Marital Status <span className="text-rose-500">*</span>
                </Label>
                <Select
                  id="marital_status"
                  placeholder="Select status"
                  {...register("marital_status")}
                  error={!!errors.marital_status}
                >
                  {MARITAL_STATUS_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
                {errors.marital_status && (
                  <p className="text-xs text-rose-600">{errors.marital_status.message}</p>
                )}
              </div>
            </div>

            {/* Children & Nationality */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="children" className="text-xs font-semibold text-slate-800">
                  Children Count <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="children"
                  type="number"
                  min="0"
                  placeholder="0"
                  {...register("children", { valueAsNumber: true })}
                  className={errors.children ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.children && (
                  <p className="text-xs text-rose-600">{errors.children.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nationality" className="text-xs font-semibold text-slate-800">
                  Nationality <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="nationality"
                  placeholder="e.g., Ethiopia"
                  {...register("nationality")}
                  className={errors.nationality ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.nationality && (
                  <p className="text-xs text-rose-600">{errors.nationality.message}</p>
                )}
              </div>
            </div>

            {/* Contact Details: Phone, Alternate Phone, Email */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone_number" className="text-xs font-semibold text-slate-800">
                  Phone Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="phone_number"
                  placeholder="+251911223344"
                  {...register("phone_number")}
                  className={errors.phone_number ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.phone_number && (
                  <p className="text-xs text-rose-600">{errors.phone_number.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="alternate_phone" className="text-xs font-semibold text-slate-700">
                  Alternate Phone <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="alternate_phone"
                  placeholder="+251922334455"
                  {...register("alternate_phone")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="applicant@example.com"
                  {...register("email")}
                  className={errors.email ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-rose-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Address Details: Country, City, Region, Sub-region, Address Line 1 */}
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Residential Location
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-xs font-semibold text-slate-800">
                    Country <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="country"
                    placeholder="e.g., Ethiopia"
                    {...register("country")}
                    className={errors.country ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                  />
                  {errors.country && (
                    <p className="text-xs text-rose-600">{errors.country.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-semibold text-slate-800">
                    City <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    placeholder="e.g., Addis Ababa"
                    {...register("city")}
                    className={errors.city ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                  />
                  {errors.city && (
                    <p className="text-xs text-rose-600">{errors.city.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="region" className="text-xs font-semibold text-slate-700">
                    Region / State <span className="text-slate-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="region"
                    placeholder="e.g., Oromia, Amhara"
                    {...register("region")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sub_region" className="text-xs font-semibold text-slate-700">
                    Sub-Region / Zone / Woreda <span className="text-slate-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="sub_region"
                    placeholder="e.g., Bole, Sub-city 03"
                    {...register("sub_region")}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <Label htmlFor="address_line_1" className="text-xs font-semibold text-slate-700">
                  Address Line 1 <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  id="address_line_1"
                  placeholder="Street address, building, or house number"
                  {...register("address_line_1")}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
