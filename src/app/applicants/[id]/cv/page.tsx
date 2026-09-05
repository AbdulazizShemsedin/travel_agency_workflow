"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Loader2,
  FileCheck2,
  RefreshCw,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  MapPin,
  Calendar,
  Globe2,
  Award,
  HeartPulse,
  UserCheck,
  Share2,
  Copy,
  FileText,
} from "lucide-react";
import { getApplicantV2, generateCvV2, V2ApplicantDetails } from "@/lib/api/v2";
import { StageFeeSection } from "@/components/operational/StageFeeSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CandidateCvPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const applicantId = typeof params?.id === "string" ? decodeURIComponent(params.id) : "";

  const { data: applicant, isLoading, refetch } = useQuery<V2ApplicantDetails>({
    queryKey: ["applicant", applicantId],
    queryFn: () => getApplicantV2(applicantId),
    enabled: !!applicantId,
  });

  const refreshCvMutation = useMutation({
    mutationFn: () => generateCvV2(applicantId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applicant", applicantId] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      toast.success(data.message || "Official CV generated successfully!");
      refetch();
    },
    onError: (err: Error) => {
      toast.error("Failed to generate CV", { description: err.message });
    },
  });

  const resolvePhotoUrl = (url?: string | null, fallback: string = "") => {
    if (!url || typeof url !== "string") return fallback;
    const clean = url.trim();
    if (
      clean === "" ||
      clean === "null" ||
      clean === "undefined" ||
      clean.includes("placeholder-user") ||
      clean.includes("default-avatar")
    ) {
      return fallback;
    }
    return clean;
  };

  const portraitSrc = resolvePhotoUrl(
    applicant?.photo_passport || applicant?.profile_photo_url || applicant?.photo_url,
    "/cv-template/page_0_img_1.png"
  );

  const fullBodySrc = resolvePhotoUrl(
    applicant?.photo_full_body,
    "/cv-template/page_0_img_2.png"
  );

  const passportScanSrc = resolvePhotoUrl(
    applicant?.passport_scan,
    "/cv-template/page_1_img_0.png"
  );

  const [portraitImg, setPortraitImg] = React.useState(portraitSrc);
  const [fullBodyImg, setFullBodyImg] = React.useState(fullBodySrc);
  const [passportScanImg, setPassportScanImg] = React.useState(passportScanSrc);

  React.useEffect(() => {
    setPortraitImg(portraitSrc);
  }, [portraitSrc]);

  React.useEffect(() => {
    setFullBodyImg(fullBodySrc);
  }, [fullBodySrc]);

  React.useEffect(() => {
    setPassportScanImg(passportScanSrc);
  }, [passportScanSrc]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
        <span className="ml-2 text-sm text-slate-600 dark:text-zinc-300 font-medium">
          Loading Official Candidate CV Dossier...
        </span>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-6 text-center">
        <h3 className="text-base font-semibold text-rose-800 dark:text-rose-300">Applicant Not Found</h3>
        <Link href="/applicants" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Applicants
          </Button>
        </Link>
      </div>
    );
  }

  const destination = (applicant.destination_country || "Saudi Arabia").trim();
  const isSaudi = destination.toLowerCase().includes("saudi") || destination.toLowerCase().includes("ksa");
  const isKuwait = destination.toLowerCase().includes("kuwait");

  // Experience normalization
  const rawCountry = (applicant.experience_country || "").trim();
  const rawPeriod = (applicant.experience_period || "").trim();
  const isExperienced = Boolean(
    rawCountry &&
    rawCountry.toLowerCase() !== "none" &&
    rawCountry.toLowerCase() !== "first time" &&
    rawCountry.toLowerCase() !== "first time applicant" &&
    rawCountry.toLowerCase() !== "overseas"
  );
  const expCountryDisplay = isExperienced ? rawCountry.toUpperCase() : "NONE";
  const expDurationDisplay = isExperienced
    ? (rawPeriod && rawPeriod !== "0" && rawPeriod !== "0 years" ? rawPeriod : `${applicant.years_of_experience || 2} Years`)
    : "FIRST TIME";

  // Skills normalization
  const checkSkill = (val: any) => val === 1 || val === "1" || val === "YES" || val === "Yes" || val === true;

  // Format Dates DD/MM/YYYY
  const formatDate = (dStr?: string) => {
    if (!dStr) return "—";
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dStr;
    }
  };

  const currentDateStr = formatDate(new Date().toISOString());

  const handlePrint = () => {
    window.print();
  };

  const handleSavePdf = () => {
    const rawPdfUrl = (applicant as any)?.cv_pdf_url || (applicant as any)?.cv_file_url;
    if (rawPdfUrl && typeof rawPdfUrl === "string" && rawPdfUrl.toLowerCase().endsWith(".pdf")) {
      const a = document.createElement("a");
      a.href = rawPdfUrl;
      a.download = `CV_${fullName.replace(/[^a-zA-Z0-9]/g, "_")}_${passportNumber}.pdf`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Official CV PDF downloaded successfully!");
      return;
    }

    toast.info("Preparing PDF Export...", {
      description: "In the browser dialog, select 'Save as PDF' from the Destination dropdown.",
    });
    setTimeout(() => {
      window.print();
    }, 350);
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Official CV share link copied to clipboard!");
    }
  };

  const isDraft = applicant.applicant_state === "Draft";

  // Passport Names Split
  const fullName = (
    applicant.full_name ||
    `${applicant.first_name || ""} ${applicant.middle_name || ""} ${applicant.last_name || ""}`.trim() ||
    applicant.name
  ).toUpperCase();

  const passportNumber = (applicant.passport_number || "N/A").toUpperCase();
  const nationality = (applicant.nationality || "Ethiopia").toUpperCase();
  const religion = (applicant.religion || "N/A").toUpperCase();
  const jobApplied = (applicant.target_job || applicant.job_applied || "House Maid").toUpperCase();
  const salaryDisplay = applicant.monthly_salary
    ? `${applicant.monthly_salary} ${isKuwait ? "KD" : "SR"}`
    : isKuwait
    ? "120 KD"
    : "1,000 SR";

  return (
    <div className="w-full space-y-6 pb-24 text-slate-900">
      
      {/* Top Action Header (Hidden during Print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#222227] pb-4">
        <div>
          <Link
            href={`/applicants/${encodeURIComponent(applicant.name)}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 hover:text-blue-900 transition mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Applicant Details
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="h-6 w-6 text-blue-900 dark:text-blue-400" />
              Official Bilateral CV Dossier
            </h1>
            <Badge variant="default" className="text-xs bg-blue-900 font-bold">
              {applicant.applicant_state}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Candidate Ref: <strong className="font-mono text-slate-800 dark:text-zinc-200">{applicant.name}</strong> • Destination:{" "}
            <strong>{destination}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs border-slate-300 dark:border-[#26262d]"
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Share Link
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshCvMutation.mutate()}
            disabled={refreshCvMutation.isPending}
            className="text-xs border-slate-300 dark:border-[#26262d]"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshCvMutation.isPending ? "animate-spin" : ""}`} />
            {refreshCvMutation.isPending ? "Generating..." : "Regenerate Official CV"}
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="text-xs border-slate-300 dark:border-[#26262d] font-semibold text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5 text-slate-600 dark:text-zinc-400" />
            Print
          </Button>

          <Button
            onClick={handleSavePdf}
            className="bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold shadow-sm"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Save as PDF
          </Button>
        </div>
      </div>

      {/* If Draft, prompt generation */}
      {isDraft && (
        <div className="print:hidden rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-sm font-bold text-amber-950 dark:text-amber-100">Draft Candidate Profile</strong>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                Click below to compile and generate the official bilateral recruitment CV dossier.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => refreshCvMutation.mutate()}
            disabled={refreshCvMutation.isPending}
            className="bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold shrink-0 shadow-xs"
          >
            {refreshCvMutation.isPending ? "Generating..." : "Generate Official CV Now"}
          </Button>
        </div>
      )}

      {/* Stage Fee Logging (Print Hidden - Routes to Finance) */}
      <div className="print:hidden max-w-4xl mx-auto">
        <StageFeeSection
          placementId={applicant.active_placement}
          stageName="CV Generation & Processing"
          defaultDirection="Expense"
        />
      </div>

      {/* ========================================================================= */}
      {/* PAGE 1: OFFICIAL BILATERAL RECRUITMENT CV (EXACT MATCH TO ASNEKECH SAMPLE)*/}
      {/* ========================================================================= */}
      <div className="mx-auto max-w-4xl bg-white text-black shadow-2xl p-6 sm:p-8 font-sans border border-slate-300 print:border-none print:shadow-none print:p-2 print:m-0 print:max-w-none print:page-break-after-always">
        
        {/* TOP HEADER SECTION */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3">
          {/* Left: Authentic AS Agency Logo */}
          <div className="w-28 flex items-center">
            <img
              src="/cv-template/header_left_logo.png"
              alt="AS Agency"
              className="h-16 sm:h-20 w-auto object-contain"
            />
          </div>

          {/* Center: ANWAR SULTAN KEMAL & Destination Box */}
          <div className="text-center flex-1 px-2 space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-[#002f6c] tracking-wide underline underline-offset-4 uppercase font-serif">
              ANWAR SULTAN KEMAL
            </h2>
            <div className="inline-block border-2 border-[#00509d] text-[#00509d] font-extrabold px-6 py-0.5 rounded text-sm sm:text-base uppercase tracking-wider">
              {isSaudi ? "SAUDI ARABIA" : isKuwait ? "KUWAIT" : destination.toUpperCase()}
            </div>
          </div>

          {/* Right: Candidate Circular Portrait with Swoosh (No partner logo next to it) */}
          <div className="w-28 flex items-center justify-end">
            <div className="relative flex items-center justify-center w-20 h-20">
              {/* Blue curved wave accent below circle */}
              <div className="absolute -bottom-1 right-0 w-20 h-10 bg-[#125488] rounded-b-full -z-0 transform scale-105" />
              <div className="w-18 h-18 rounded-full overflow-hidden border-2 border-[#125488] bg-slate-100 flex items-center justify-center shadow-xs z-10 relative">
                <img
                  src={portraitImg}
                  onError={() => setPortraitImg("/cv-template/page_0_img_1.png")}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* MAIN 2-COLUMN BODY GRID */}
        <div className="grid grid-cols-12 gap-3">
          
          {/* ========================================================================= */}
          {/* LEFT COLUMN: FULL LENGTH PHOTO + WORK EXP + SKILLS TABLE                   */}
          {/* ========================================================================= */}
          <div className="col-span-5 flex flex-col space-y-2.5">
            
            {/* Full Length Standing Photo */}
            <div className="w-full h-[370px] rounded border border-black overflow-hidden bg-white flex items-center justify-center p-1 shadow-xs">
              <img
                src={fullBodyImg}
                onError={() => setFullBodyImg("/cv-template/page_0_img_2.png")}
                alt="Full Body Posture"
                className="w-full h-full object-contain object-top"
              />
            </div>

            {/* Work Experience Table */}
            <div className="border border-black overflow-hidden text-xs">
              <div className="bg-[#125488] text-white font-bold py-1 px-2 flex items-center justify-between text-[11px]">
                <span>Work Experience</span>
                <span className="font-arabic" dir="rtl">خبرة في العمل</span>
              </div>
              <table className="w-full border-collapse text-left text-[11px]">
                <tbody>
                  <tr className="border-t border-black">
                    <td className="w-1/3 py-1 px-2 font-bold border-r border-black">Period</td>
                    <td className="w-1/3 py-1 px-2 text-center font-bold text-[#002f6c]">{expDurationDisplay}</td>
                    <td className="w-1/3 py-1 px-2 text-right font-arabic border-l border-black" dir="rtl">المدة</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="w-1/3 py-1 px-2 font-bold border-r border-black">Country</td>
                    <td className="w-1/3 py-1 px-2 text-center font-bold text-[#002f6c]">{expCountryDisplay}</td>
                    <td className="w-1/3 py-1 px-2 text-right font-arabic border-l border-black" dir="rtl">البلد</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Skills & Experience Table */}
            <div className="border border-black overflow-hidden text-xs">
              <div className="bg-[#125488] text-white font-bold py-1 px-2 flex items-center justify-between text-[11px]">
                <span>Skills & Experience</span>
                <span className="font-arabic" dir="rtl">خبرة العمل</span>
              </div>
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  {[
                    { en: "Coocking", ar: "الطبخ", check: checkSkill(applicant.skill_cooking) },
                    { en: "Cleaning", ar: "التنظيف", check: checkSkill(applicant.skill_cleaning) },
                    { en: "Washing", ar: "الغسيل", check: checkSkill(applicant.skill_washing) },
                    { en: "Ironing", ar: "الكوي", check: checkSkill(applicant.skill_ironing) },
                    { en: "Baby Sitting", ar: "عناية الرضيع", check: checkSkill(applicant.skill_baby_sitting) },
                    { en: "Children Care", ar: "عناية الأطفال", check: checkSkill(applicant.skill_children_care) },
                    { en: "Arabic Cooking", ar: "الطبخ العربي", check: checkSkill(applicant.skill_arabic_cooking) },
                    { en: "Sewing", ar: "خياطة", check: checkSkill(applicant.skill_sewing) },
                  ].map((s) => (
                    <tr key={s.en} className="border-t border-black">
                      <td className="w-1/3 py-0.5 px-2 font-bold border-r border-black text-left">{s.en}</td>
                      <td className="w-1/3 py-0.5 px-2 text-center font-bold text-[#002f6c]">
                        {s.check ? "YES" : "NO"}
                      </td>
                      <td className="w-1/3 py-0.5 px-2 text-right font-arabic border-l border-black" dir="rtl">{s.ar}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-black bg-slate-50 font-bold">
                    <td className="py-1 px-2 border-r border-black text-left">Remarks</td>
                    <td className="py-1 px-2 text-center text-[#002f6c]">{applicant.remarks || applicant.cv_remarks || ""}</td>
                    <td className="py-1 px-2 text-right font-arabic border-l border-black" dir="rtl">ملاحظات</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: RECRUITMENT DETAILS, PASSPORT, LANGUAGES, APPLICANT BIO      */}
          {/* ========================================================================= */}
          <div className="col-span-7 flex flex-col space-y-2.5">
            
            {/* Top Identity Block */}
            <div className="border border-black overflow-hidden">
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="w-1/4 py-1 px-2 font-bold border-r border-black">Ref No.</td>
                    <td className="w-1/2 py-1 px-2 font-mono font-bold text-center text-[#002f6c]">{applicant.ref_no || applicant.reference_number || ""}</td>
                    <td className="w-1/4 py-1 px-2 text-right font-arabic border-l border-black" dir="rtl"></td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="py-1 px-2 font-bold border-r border-black">Job</td>
                    <td className="py-1 px-2 font-extrabold text-center text-[#002f6c]">{jobApplied}</td>
                    <td className="py-1 px-2 text-right font-arabic border-l border-black" dir="rtl">الوظيفة</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="py-1 px-2 font-bold border-r border-black">Name</td>
                    <td className="py-1 px-2 font-extrabold text-center text-black">{fullName}</td>
                    <td className="py-1 px-2 text-right font-arabic border-l border-black" dir="rtl">الإسم</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2 font-bold border-r border-black">Salary</td>
                    <td className="py-1 px-2 font-extrabold text-center text-[#002f6c]">{salaryDisplay}</td>
                    <td className="py-1 px-2 text-right font-arabic border-l border-black" dir="rtl">الراتب</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* DETAILS OF PASSPORT */}
            <div className="border border-black overflow-hidden">
              <div className="bg-[#125488] text-white font-bold py-1 px-2 flex items-center justify-between text-[11px]">
                <span>DETAILS OF PASSPORT</span>
                <span className="font-arabic" dir="rtl">تفاصيل جواز السفر</span>
              </div>
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  <tr className="border-t border-black">
                    <td className="w-1/4 py-1 px-2 font-bold border-r border-black">Passport No.</td>
                    <td className="w-1/2 py-1 px-2 font-mono font-extrabold text-center text-[#002f6c]">{passportNumber}</td>
                    <td className="w-1/4 py-1 px-2 text-right font-arabic border-l border-black" dir="rtl">رقم الجواز</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-1 px-2 font-bold border-r border-black">Issue Date</td>
                    <td className="py-1 px-2 font-bold text-center">{formatDate(applicant.passport_issue_date)}</td>
                    <td className="py-1 px-2 text-right font-arabic border-l border-black" dir="rtl">تاريخ الإصدار</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-1 px-2 font-bold border-r border-black">Expiry Date</td>
                    <td className="py-1 px-2 font-bold text-center">{formatDate(applicant.passport_expiry)}</td>
                    <td className="py-1 px-2 text-right font-arabic border-l border-black" dir="rtl">تاريخ الانتهاء</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-1 px-2 font-bold border-r border-black">Place of Issue</td>
                    <td className="py-1 px-2 font-extrabold text-center uppercase">{applicant.place_of_issue || ""}</td>
                    <td className="py-1 px-2 text-right font-arabic border-l border-black" dir="rtl">مكان الإصدار</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* LANGUAGES */}
            <div className="border border-black overflow-hidden">
              <div className="bg-[#125488] text-white font-bold py-1 px-2 flex items-center justify-between text-[11px]">
                <span>LANGUAGES</span>
                <span className="font-arabic" dir="rtl">اللغات</span>
              </div>
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  <tr className="border-t border-black">
                    <td className="w-1/4 py-1 px-2 font-bold border-r border-black">English</td>
                    <td className="w-1/2 py-1 px-2 text-center font-bold text-[#002f6c]">{applicant.english_level || ""}</td>
                    <td className="w-1/4 py-1 px-2 text-right font-arabic border-l border-black" dir="rtl">الإنجليزية</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-1 px-2 font-bold border-r border-black">Arabic</td>
                    <td className="py-1 px-2 text-center font-bold text-[#002f6c]">{applicant.arabic_level || ""}</td>
                    <td className="py-1 px-2 text-right font-arabic border-l border-black" dir="rtl">العربية</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* EDUCATIONAL QUALIFICATION */}
            <div className="border border-black overflow-hidden">
              <div className="bg-[#125488] text-white font-bold py-1 px-2 flex items-center justify-between text-[11px]">
                <span>EDUCATIONAL QUALIFICATION</span>
                <span className="font-arabic" dir="rtl">المؤهل العلمي</span>
              </div>
              <div className="py-1.5 px-2 text-center font-extrabold text-xs uppercase bg-white text-black">
                {applicant.education || applicant.education_level || ""}
              </div>
            </div>

            {/* DETAILS OF APPLICANT */}
            <div className="border border-black overflow-hidden">
              <div className="bg-[#125488] text-white font-bold py-1 px-2 flex items-center justify-between text-[11px]">
                <span>DETAILS OF APPLICANT</span>
                <span className="font-arabic" dir="rtl">بيانات مقدم الطلب</span>
              </div>
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  <tr className="border-t border-black">
                    <td className="w-1/4 py-0.5 px-2 font-bold border-r border-black">Nationality</td>
                    <td className="w-1/2 py-0.5 px-2 font-extrabold text-center text-[#002f6c]">{nationality}</td>
                    <td className="w-1/4 py-0.5 px-2 text-right font-arabic border-l border-black" dir="rtl">الجنسية</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-0.5 px-2 font-bold border-r border-black">Religion</td>
                    <td className="py-0.5 px-2 font-extrabold text-center">{religion}</td>
                    <td className="py-0.5 px-2 text-right font-arabic border-l border-black" dir="rtl">الديانة</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-0.5 px-2 font-bold border-r border-black">Date of Birth</td>
                    <td className="py-0.5 px-2 font-bold text-center">{formatDate(applicant.date_of_birth)}</td>
                    <td className="py-0.5 px-2 text-right font-arabic border-l border-black" dir="rtl">تاريخ الولادة</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-0.5 px-2 font-bold border-r border-black">Place of Birth</td>
                    <td className="py-0.5 px-2 font-bold text-center uppercase">{applicant.place_of_birth || applicant.leaving_town || ""}</td>
                    <td className="py-0.5 px-2 text-right font-arabic border-l border-black" dir="rtl">مكان الولادة</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-0.5 px-2 font-bold border-r border-black">Leaving Town</td>
                    <td className="py-0.5 px-2 font-bold text-center uppercase">{applicant.leaving_town || applicant.place_of_birth || ""}</td>
                    <td className="py-0.5 px-2 text-right font-arabic border-l border-black" dir="rtl">مغادرة المدينة</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-0.5 px-2 font-bold border-r border-black">Civil Status</td>
                    <td className="py-0.5 px-2 font-bold text-center uppercase">{applicant.marital_status || ""}</td>
                    <td className="py-0.5 px-2 text-right font-arabic border-l border-black" dir="rtl">العنوان الكامل</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-0.5 px-2 font-bold border-r border-black">No. of Children</td>
                    <td className="py-0.5 px-2 font-bold text-center">{applicant.number_of_children ?? applicant.children_count ?? ""}</td>
                    <td className="py-0.5 px-2 text-right font-arabic border-l border-black" dir="rtl">عدد الاطفال</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-0.5 px-2 font-bold border-r border-black">Height</td>
                    <td className="py-0.5 px-2 font-bold text-center">{applicant.height ? `${applicant.height} cm` : ""}</td>
                    <td className="py-0.5 px-2 text-right font-arabic border-l border-black" dir="rtl">ارتفاع</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-0.5 px-2 font-bold border-r border-black">Weight</td>
                    <td className="py-0.5 px-2 font-bold text-center">{applicant.weight ? `${applicant.weight} kg` : ""}</td>
                    <td className="py-0.5 px-2 text-right font-arabic border-l border-black" dir="rtl">الوزن</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-0.5 px-2 font-bold border-r border-black">Complexion</td>
                    <td className="py-0.5 px-2 font-bold text-center uppercase">{applicant.complexion || ""}</td>
                    <td className="py-0.5 px-2 text-right font-arabic border-l border-black" dir="rtl">البشرة</td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-0.5 px-2 font-bold border-r border-black">Age</td>
                    <td className="py-0.5 px-2 font-extrabold text-center text-[#002f6c]">{applicant.age || ""}</td>
                    <td className="py-0.5 px-2 text-right font-arabic border-l border-black" dir="rtl"></td>
                  </tr>
                  <tr className="border-t border-black">
                    <td className="py-0.5 px-2 font-bold border-r border-black">Date</td>
                    <td className="py-0.5 px-2 font-mono text-center">{currentDateStr}</td>
                    <td className="py-0.5 px-2 text-right font-arabic border-l border-black" dir="rtl">تاريخ</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: OFFICIAL ETHIOPIAN PASSPORT SCAN ATTACHMENT                       */}
      {/* ========================================================================= */}
      <div className="mx-auto max-w-4xl bg-white text-black shadow-2xl p-6 sm:p-10 font-sans border border-slate-300 print:border-none print:shadow-none print:p-4 print:m-0 print:max-w-none flex flex-col items-center justify-center min-h-[900px]">
        
        <div className="w-full text-center pb-3 border-b border-slate-200 mb-6">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#002f6c]">
            OFFICIAL PASSPORT SCAN ATTACHMENT / وثيقة جواز السفر الرسمية
          </h3>
          <p className="text-[11px] text-slate-500">
            Federal Democratic Republic of Ethiopia • Ministry of Foreign Affairs
          </p>
        </div>

        {/* Passport Scan Display */}
        <div className="w-full max-w-xl rounded-xl border-2 border-slate-300 overflow-hidden bg-white p-3 shadow-md flex items-center justify-center">
          <img
            src={passportScanImg}
            onError={() => setPassportScanImg("/cv-template/page_1_img_0.png")}
            alt="Ethiopian Passport Scan"
            className="w-full h-auto max-h-[750px] object-contain rounded"
          />
        </div>

      </div>

    </div>
  );
}
