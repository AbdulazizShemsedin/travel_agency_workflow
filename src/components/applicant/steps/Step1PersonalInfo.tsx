"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { Camera, DollarSign, Image as ImageIcon, Loader2 } from "lucide-react";
import { BaseApplicantFormValues, GENDER_OPTIONS, RELIGION_OPTIONS, MARITAL_STATUS_OPTIONS } from "@/lib/validations/applicant.schema";
import { uploadFileApi } from "@/lib/api/applicantApi";
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
  const profilePhotoValue = watch("profile_photo_url") || watch("photo_passport");
  const fullBodyPhotoValue = watch("photo_full_body");

  const [photoPreview, setPhotoPreview] = React.useState<string | null>(profilePhotoValue || null);
  const [fullBodyPreview, setFullBodyPreview] = React.useState<string | null>(fullBodyPhotoValue || null);
  const [isUploadingPassport, setIsUploadingPassport] = React.useState(false);
  const [isUploadingFullBody, setIsUploadingFullBody] = React.useState(false);

  React.useEffect(() => {
    if (profilePhotoValue && !photoPreview) {
      setPhotoPreview(profilePhotoValue);
    }
  }, [profilePhotoValue, photoPreview]);

  React.useEffect(() => {
    if (fullBodyPhotoValue && !fullBodyPreview) {
      setFullBodyPreview(fullBodyPhotoValue);
    }
  }, [fullBodyPhotoValue, fullBodyPreview]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Local immediate preview - guaranteed to show instantly
      const localUrl = URL.createObjectURL(file);
      setPhotoPreview(localUrl);
      setIsUploadingPassport(true);

      try {
        const res = await uploadFileApi(file, "Applicant", "", "photo_passport");
        if (res?.message?.file_url) {
          setValue("profile_photo_url", res.message.file_url, { shouldDirty: true });
          setValue("photo_passport", res.message.file_url, { shouldDirty: true });
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            setValue("profile_photo_url", base64, { shouldDirty: true });
            setValue("photo_passport", base64, { shouldDirty: true });
          };
          reader.readAsDataURL(file);
        }
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setValue("profile_photo_url", base64, { shouldDirty: true });
          setValue("photo_passport", base64, { shouldDirty: true });
        };
        reader.readAsDataURL(file);
      } finally {
        setIsUploadingPassport(false);
      }
    }
  };

  const handleFullBodyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setFullBodyPreview(localUrl);
      setIsUploadingFullBody(true);

      try {
        const res = await uploadFileApi(file, "Applicant", "", "photo_full_body");
        if (res?.message?.file_url) {
          setValue("photo_full_body", res.message.file_url, { shouldDirty: true });
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            setValue("photo_full_body", base64, { shouldDirty: true });
          };
          reader.readAsDataURL(file);
        }
      } catch {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setValue("photo_full_body", base64, { shouldDirty: true });
        };
        reader.readAsDataURL(file);
      } finally {
        setIsUploadingFullBody(false);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column: Photo Uploads & Fee Settings */}
      <div className="space-y-6 lg:col-span-4">
        {/* Passport / Portrait Photo Card */}
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
              Candidate Photo (Passport Size)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Clear face photo for CV and profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-2">
            <label
              htmlFor="profile-photo-upload"
              className="group relative flex h-36 w-36 cursor-pointer flex-col items-center justify-center rounded-full border-2 border-dashed border-slate-300 dark:border-[#2a2a32] bg-slate-50 dark:bg-[#16161b] transition hover:border-emerald-700 hover:bg-emerald-50/50 overflow-hidden"
            >
              {isUploadingPassport ? (
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-700 dark:text-emerald-400" />
                  <span className="text-[10px] text-slate-500 mt-1">Uploading...</span>
                </div>
              ) : photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="Profile headshot"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#202028] shadow-xs group-hover:scale-105">
                    <Camera className="h-5 w-5 text-slate-500 group-hover:text-emerald-800 dark:text-zinc-400" />
                  </div>
                  <span className="mt-2 text-xs font-medium text-slate-600 dark:text-zinc-300">
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
                disabled={isUploadingPassport}
              />
            </label>
            <p className="mt-3 text-center text-xs text-slate-500 dark:text-zinc-400">
              JPG, PNG format (passport photo)
            </p>
          </CardContent>
        </Card>

        {/* Full Body Photo Card */}
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
              Full Body Photo (CV Page 2)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Full length portrait required for employer CV.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-2">
            <label
              htmlFor="fullbody-photo-upload"
              className="group relative flex h-40 w-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-[#2a2a32] bg-slate-50 dark:bg-[#16161b] transition hover:border-emerald-700 hover:bg-emerald-50/50 overflow-hidden"
            >
              {isUploadingFullBody ? (
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-700 dark:text-emerald-400" />
                  <span className="text-[10px] text-slate-500 mt-1">Uploading...</span>
                </div>
              ) : fullBodyPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fullBodyPreview}
                  alt="Full body photo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-3 text-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-[#202028] shadow-xs group-hover:scale-105">
                    <ImageIcon className="h-4 w-4 text-slate-500 group-hover:text-emerald-800 dark:text-zinc-400" />
                  </div>
                  <span className="mt-2 text-[11px] font-medium text-slate-600 dark:text-zinc-300">
                    Full Body
                  </span>
                </div>
              )}
              <input
                id="fullbody-photo-upload"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="sr-only"
                onChange={handleFullBodyUpload}
                disabled={isUploadingFullBody}
              />
            </label>
            <p className="mt-2 text-center text-xs text-slate-500 dark:text-zinc-400">
              Standing full-body portrait
            </p>
          </CardContent>
        </Card>

        {/* Application Settings Card */}
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
              Application Settings
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Registration fee options.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] p-3">
              <div className="space-y-0.5">
                <Label htmlFor="fee_required" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Fee Required
                </Label>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Registration fee required for applicant
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
              <div className="space-y-3 rounded-lg border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-3">
                <div className="space-y-1">
                  <Label htmlFor="fee_type" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Fee Type
                  </Label>
                  <select
                    id="fee_type"
                    {...register("fee_type")}
                    className="w-full h-8 rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2.5 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="Registration Fee">Registration Fee</option>
                    <option value="Processing Fee">Processing Fee</option>
                    <option value="Visa Fee">Visa Fee</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="registration_fee_amount" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Amount ($ USD) *
                    </Label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                        <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <Input
                        id="registration_fee_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7 h-8 text-xs"
                        {...register("registration_fee_amount", { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="fee_direction" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Direction
                    </Label>
                    <select
                      id="fee_direction"
                      {...register("fee_direction")}
                      className="w-full h-8 rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2 text-xs text-slate-900 dark:text-slate-100"
                    >
                      <option value="Income">Income (Agency Received)</option>
                      <option value="Expense">Expense (Agency Paid)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="fee_status" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Payment Status
                    </Label>
                    <select
                      id="fee_status"
                      {...register("fee_status")}
                      className="w-full h-8 rounded-md border border-slate-300 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2 text-xs text-slate-900 dark:text-slate-100"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Expired">Expired</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="fee_payment_date" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Payment Date
                    </Label>
                    <Input
                      id="fee_payment_date"
                      type="date"
                      className="h-8 text-xs px-2"
                      {...register("fee_payment_date")}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="fee_notes" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Notes / Receipt Reference
                  </Label>
                  <Input
                    id="fee_notes"
                    placeholder="e.g. Receipt #REC-88192"
                    className="h-8 text-xs"
                    {...register("fee_notes")}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Personal & Contact Information */}
      <div className="space-y-6 lg:col-span-8">
        <Card className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                  Personal Information
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                  Enter candidate details as written on their official passport and ID.
                </CardDescription>
              </div>
              <span className="rounded-md bg-emerald-50 dark:bg-emerald-950 px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Step 1 • Basic Details
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Full Name Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  First Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  placeholder="e.g., Abebe"
                  {...register("first_name")}
                  className={errors.first_name ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.first_name && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="middle_name" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Middle Name / Father Name
                </Label>
                <Input
                  id="middle_name"
                  placeholder="e.g., Bekele"
                  {...register("middle_name")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Last Name / Grandfather <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  placeholder="e.g., Kebede"
                  {...register("last_name")}
                  className={errors.last_name ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.last_name && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            {/* Demographics: Gender, Religion, Marital Status */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="gender" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
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
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.gender.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="religion" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
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
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.religion.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="marital_status" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
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
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.marital_status.message}</p>
                )}
              </div>
            </div>

            {/* Children & Nationality */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="children" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Number of Children <span className="text-rose-500">*</span>
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
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.children.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nationality" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Nationality <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="nationality"
                  placeholder="e.g., Ethiopia"
                  {...register("nationality")}
                  className={errors.nationality ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.nationality && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.nationality.message}</p>
                )}
              </div>
            </div>

            {/* Contact Details: Phone, Alternate Phone, Email */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone_number" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Phone Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="phone_number"
                  placeholder="+251911223344"
                  {...register("phone_number")}
                  className={errors.phone_number ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.phone_number && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.phone_number.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="alternate_phone" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Alternate Phone (Optional)
                </Label>
                <Input
                  id="alternate_phone"
                  placeholder="+251922334455"
                  {...register("alternate_phone")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Email Address (Optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="applicant@example.com"
                  {...register("email")}
                  className={errors.email ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Address Details */}
            <div className="border-t border-slate-100 dark:border-[#222227] pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-3">
                Home Address & Location
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    Country <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="country"
                    placeholder="e.g., Ethiopia"
                    {...register("country")}
                    className={errors.country ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                  />
                  {errors.country && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{errors.country.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    City <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    placeholder="e.g., Addis Ababa"
                    {...register("city")}
                    className={errors.city ? "border-rose-500 focus-visible:ring-rose-500/20" : ""}
                  />
                  {errors.city && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{errors.city.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="region" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Region / State
                  </Label>
                  <Input
                    id="region"
                    placeholder="e.g., Oromia, Amhara"
                    {...register("region")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sub_region" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Sub-City / Zone / Woreda
                  </Label>
                  <Input
                    id="sub_region"
                    placeholder="e.g., Bole, Sub-city 03"
                    {...register("sub_region")}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <Label htmlFor="address_line_1" className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Address Line
                </Label>
                <Input
                  id="address_line_1"
                  placeholder="Street address or house number"
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
