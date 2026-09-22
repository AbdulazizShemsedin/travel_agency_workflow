"use client";

import * as React from "react";
import {
  UploadCloud,
  FileText,
  Camera,
  User,
  Video,
  FileSpreadsheet,
  Trash2,
  Crop,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  RefreshCw,
  Film,
  FileUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type DropzoneVariant =
  | "passport"
  | "portrait"
  | "full_body"
  | "video"
  | "document"
  | "spreadsheet"
  | "compact";

export interface PremiumDropzoneProps {
  id?: string;
  variant?: DropzoneVariant;
  accept?: string;
  maxSizeMB?: number;
  value?: string | File | null;
  fileName?: string;
  fileSize?: number;
  onFileSelect: (file: File) => void;
  onRemove?: () => void;
  onCrop?: () => void;
  isLoading?: boolean;
  loadingText?: string;
  label?: string;
  description?: string;
  enablePaste?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  aspectRatioClass?: string;
}

export function PremiumDropzone({
  id,
  variant = "document",
  accept,
  maxSizeMB = 0,
  value,
  fileName,
  fileSize,
  onFileSelect,
  onRemove,
  onCrop,
  isLoading = false,
  loadingText,
  label,
  description,
  enablePaste = true,
  disabled = false,
  error,
  className,
  aspectRatioClass,
}: PremiumDropzoneProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [dragError, setDragError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dragCounterRef = React.useRef(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Compute accept string default per variant
  const effectiveAccept = React.useMemo(() => {
    if (accept) return accept;
    switch (variant) {
      case "passport":
      case "portrait":
      case "full_body":
        return "image/png, image/jpeg, image/jpg, image/webp";
      case "video":
        return "video/mp4, video/webm, video/quicktime, video/*";
      case "spreadsheet":
        return ".csv, text/csv";
      case "document":
      case "compact":
      default:
        return ".pdf, image/png, image/jpeg, image/webp";
    }
  }, [accept, variant]);

  // Compute preview URL whenever value changes
  React.useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    if (typeof value === "string") {
      setPreviewUrl(value);
    } else if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [value]);

  // Extract display file name & size
  const displayFileName = React.useMemo(() => {
    if (fileName) return fileName;
    if (value instanceof File) return value.name;
    if (typeof value === "string") {
      const parts = value.split("/");
      return parts[parts.length - 1] || "Uploaded File";
    }
    return "";
  }, [fileName, value]);

  const displayFileSize = React.useMemo(() => {
    if (fileSize !== undefined) {
      return fileSize > 1024 * 1024
        ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
        : `${(fileSize / 1024).toFixed(1)} KB`;
    }
    if (value instanceof File) {
      return value.size > 1024 * 1024
        ? `${(value.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(value.size / 1024).toFixed(1)} KB`;
    }
    return null;
  }, [fileSize, value]);

  // Validate and handle file
  const processFile = React.useCallback(
    (file: File) => {
      setDragError(null);

      // Check file size (unlimited for video uploads or when maxSizeMB <= 0 / Infinity)
      const isVideo = variant === "video";
      const hasSizeLimit = !isVideo && maxSizeMB !== undefined && maxSizeMB > 0 && isFinite(maxSizeMB);
      if (hasSizeLimit) {
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
          setDragError(`File exceeds ${maxSizeMB}MB limit`);
          return;
        }
      }

      // Check file type
      if (effectiveAccept && effectiveAccept !== "*") {
        const acceptedTypes = effectiveAccept
          .split(",")
          .map((t) => t.trim().toLowerCase());
        const fileType = (file.type || "").toLowerCase();
        const fileExt = `.${(file.name.split(".").pop() || "").toLowerCase()}`;

        const isMatch = acceptedTypes.some((pattern) => {
          if (pattern.startsWith(".")) {
            return fileExt === pattern;
          }
          if (pattern.endsWith("/*")) {
            const prefix = pattern.replace("/*", "");
            return fileType.startsWith(prefix);
          }
          return fileType === pattern;
        });

        if (!isMatch) {
          setDragError(`Please provide a valid file format (${effectiveAccept})`);
          return;
        }
      }

      onFileSelect(file);
    },
    [effectiveAccept, maxSizeMB, onFileSelect]
  );

  // Drag event handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDragOver(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    if (disabled || isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
      e.dataTransfer.clearData();
    }
  };

  // Clipboard Paste listener (Ctrl+V support)
  React.useEffect(() => {
    if (!enablePaste || disabled || isLoading) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (!isHovered && document.activeElement !== containerRef.current) return;
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        processFile(file);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [enablePaste, isHovered, disabled, isLoading, processFile]);

  // Click handler
  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isLoading) return;
    fileInputRef.current?.click();
  };

  // Variant Icon & Defaults
  const renderVariantGraphic = () => {
    switch (variant) {
      case "passport":
        return (
          <div className="relative flex items-center justify-center">
            <div className="h-14 w-20 rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/40 flex flex-col items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <div className="h-1.5 w-8 rounded-full bg-emerald-500/40 mb-1" />
              <Camera className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              <div className="h-1 w-12 rounded-full bg-emerald-500/20 mt-1" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-800 text-white shadow-md">
              <FileUp className="h-3.5 w-3.5" />
            </div>
          </div>
        );
      case "portrait":
        return (
          <div className="relative flex items-center justify-center">
            <div className="h-14 w-12 rounded-lg border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/40 flex flex-col items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Camera className="h-6 w-6 text-blue-700 dark:text-blue-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-800 text-white shadow-md">
              <User className="h-3 w-3" />
            </div>
          </div>
        );
      case "full_body":
        return (
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-11 rounded-lg border border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/40 flex flex-col items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <User className="h-8 w-8 text-purple-700 dark:text-purple-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-800 text-white shadow-md">
              <Camera className="h-3 w-3" />
            </div>
          </div>
        );
      case "video":
        return (
          <div className="relative flex items-center justify-center">
            <div className="h-14 w-16 rounded-xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/40 flex flex-col items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Film className="h-7 w-7 text-rose-700 dark:text-rose-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-800 text-white shadow-md">
              <Video className="h-3.5 w-3.5" />
            </div>
          </div>
        );
      case "spreadsheet":
        return (
          <div className="relative flex items-center justify-center">
            <div className="h-14 w-14 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/40 flex flex-col items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <FileSpreadsheet className="h-7 w-7 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-800 text-white shadow-md">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
        );
      case "compact":
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/40 text-emerald-800 dark:text-emerald-300">
            <UploadCloud className="h-5 w-5" />
          </div>
        );
      case "document":
      default:
        return (
          <div className="relative flex items-center justify-center">
            <div className="h-14 w-12 rounded-lg border border-slate-300 dark:border-[#2e2e38] bg-slate-100 dark:bg-[#1c1c24] flex flex-col items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <FileText className="h-7 w-7 text-slate-600 dark:text-zinc-300" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-800 text-white shadow-md">
              <UploadCloud className="h-3.5 w-3.5" />
            </div>
          </div>
        );
    }
  };

  const defaultTitle = React.useMemo(() => {
    if (label) return label;
    switch (variant) {
      case "passport":
        return "Upload Passport Scan";
      case "portrait":
        return "Upload Passport Photo";
      case "full_body":
        return "Upload Full Body Photo";
      case "video":
        return "Upload Video Interview";
      case "spreadsheet":
        return "Upload Bank Statement CSV";
      case "compact":
        return "Choose File to Upload";
      case "document":
      default:
        return "Upload Document";
    }
  }, [label, variant]);

  const defaultSubtitle = React.useMemo(() => {
    if (description) return description;
    switch (variant) {
      case "passport":
        return "JPG, PNG, or PDF";
      case "portrait":
        return "Standard 35x45mm ID photo";
      case "full_body":
        return "Full-length standing photo";
      case "video":
        return "MP4, WebM, or MOV video";
      case "spreadsheet":
        return "CSV with date, reference & amount";
      case "compact":
        return "PDF or image";
      case "document":
      default:
        return "PDF, PNG, JPG or WebP";
    }
  }, [description, variant]);

  const isImagePreview =
    previewUrl &&
    (variant === "passport" ||
      variant === "portrait" ||
      variant === "full_body" ||
      (!previewUrl.endsWith(".pdf") && !previewUrl.endsWith(".csv")));

  const isVideoPreview =
    previewUrl &&
    (variant === "video" ||
      previewUrl.endsWith(".mp4") ||
      previewUrl.endsWith(".webm") ||
      previewUrl.endsWith(".mov"));

  const isDocumentPreview =
    previewUrl && (previewUrl.endsWith(".pdf") || variant === "document" || variant === "compact");

  const isSpreadsheetPreview =
    previewUrl && (previewUrl.endsWith(".csv") || variant === "spreadsheet");

  return (
    <div
      ref={containerRef}
      id={id}
      tabIndex={0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "group relative w-full rounded-2xl transition-all duration-300 outline-hidden select-none",
        "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
        className
      )}
    >
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={effectiveAccept}
        disabled={disabled || isLoading}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            processFile(f);
            e.target.value = "";
          }
        }}
      />

      {/* Main Container */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 transition-all duration-300",
          // Normal Idle state (Distinct, inviting dropzone for non-technical users)
          !isDragOver &&
            !error &&
            !dragError &&
            "border-dashed border-2 border-emerald-600/40 dark:border-emerald-500/40 bg-emerald-50/20 dark:bg-[#101814]/40 hover:border-emerald-600 dark:hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-[#14231b]/60 shadow-xs",
          // Drag Over state (WOW Factor)
          isDragOver &&
            "border-solid border-emerald-500 dark:border-emerald-400 bg-emerald-500/15 dark:bg-emerald-500/20 ring-4 ring-emerald-500/30 scale-[1.01] shadow-xl",
          // Error state
          (error || dragError) &&
            "border-rose-500/80 bg-rose-50/40 dark:bg-rose-950/20 ring-2 ring-rose-500/20",
          // Loading state
          isLoading && "border-emerald-500/60 bg-emerald-50/30 dark:bg-emerald-950/20",
          aspectRatioClass
        )}
      >
        {/* LASER SCANNING BEAM ANIMATION for Passport / OCR scanning */}
        {isLoading && variant === "passport" && (
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_12px_#10b981] animate-[scan_2s_ease-in-out_infinite] z-30" />
        )}

        {/* ACTIVE DRAG OVERLAY */}
        {isDragOver && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-emerald-900/90 dark:bg-emerald-950/95 backdrop-blur-xs text-white p-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-800 text-emerald-300 ring-4 ring-emerald-600/50 mb-3 animate-bounce">
              <UploadCloud className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold tracking-wide uppercase text-emerald-100">
              Release to drop file here
            </p>
            <p className="text-xs text-emerald-300/90 mt-1">
              File will be processed immediately
            </p>
          </div>
        )}

        {/* LOADING OVERLAY */}
        {isLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/80 dark:bg-[#121217]/85 backdrop-blur-xs p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/40 animate-pulse">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="mt-3 text-xs font-bold text-slate-800 dark:text-zinc-200">
              {loadingText || "Processing file..."}
            </p>
            <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
              <div className="h-full w-full bg-emerald-600 rounded-full animate-pulse" />
            </div>
          </div>
        )}

        {/* CONTENT DISPLAY: PREVIEW STATE VS EMPTY UPLOAD STATE */}
        {previewUrl ? (
          <div className="relative flex flex-col items-center justify-center p-3 sm:p-4 min-h-[160px] w-full">
            {/* 1. Image Preview (Passport, Portrait, Full Body) */}
            {isImagePreview && (
              <div
                className={cn(
                  "relative group/img flex items-center justify-center rounded-xl overflow-hidden bg-slate-900/5 dark:bg-black/30 border border-slate-200 dark:border-[#22222a] shadow-xs",
                  variant === "portrait" && "h-36 w-28",
                  variant === "full_body" && "h-44 w-32",
                  variant === "passport" && "h-40 w-full max-w-sm",
                  variant === "compact" && "h-24 w-24",
                  variant === "document" && "h-40 w-full max-w-sm"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={displayFileName || "Preview"}
                  className={cn(
                    "h-full w-full object-contain transition-transform duration-300 group-hover/img:scale-105",
                    variant === "full_body" && "object-cover"
                  )}
                />
                {/* Floating Quick Action Overlay */}
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-md transition hover:scale-110"
                    title="Open full size preview"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                  {onCrop && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCrop();
                      }}
                      className="p-1.5 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-md transition hover:scale-110"
                      title="Crop / adjust image"
                    >
                      <Crop className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleTriggerClick}
                    className="p-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition hover:scale-110"
                    title="Replace with another file"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* 2. Video Preview */}
            {isVideoPreview && (
              <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-[#22222a] bg-slate-900 shadow-xs">
                <video
                  src={previewUrl}
                  controls={isVideoPlaying}
                  className="w-full max-h-[180px] object-cover"
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                />
              </div>
            )}

            {/* 3. Document / Spreadsheet / PDF Preview */}
            {(isDocumentPreview || isSpreadsheetPreview) && !isImagePreview && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#1a1a22] border border-slate-200/80 dark:border-[#262630] shadow-xs w-full max-w-md">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold text-xs uppercase shadow-xs",
                    isSpreadsheetPreview
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  )}
                >
                  {isSpreadsheetPreview ? (
                    <FileSpreadsheet className="h-6 w-6" />
                  ) : (
                    <FileText className="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {displayFileName || "Document Attached"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    {displayFileSize || "Ready for processing"}
                  </p>
                </div>
                {typeof previewUrl === "string" && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                    title="View document"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}

            {/* Bottom Actions Bar for Attached File */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-300/80 dark:border-emerald-700/80 shadow-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {displayFileName ? `${displayFileName} attached` : "File attached"}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTriggerClick}
                className="h-7 px-2.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Replace File
              </Button>

              {onCrop && isImagePreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCrop();
                  }}
                  className="h-7 px-2.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  <Crop className="h-3 w-3 mr-1" /> Crop
                </Button>
              )}

              {onRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="h-7 px-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Remove
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* EMPTY UPLOAD STATE (Highly Obvious & Intuitive for Non-Technical Users) */
          <div
            onClick={handleTriggerClick}
            className="cursor-pointer text-center transition-all duration-200"
          >
            {variant === "compact" ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3 text-left">
                  {renderVariantGraphic()}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {defaultTitle}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Drag & drop file here or click to browse • {defaultSubtitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-transform group-hover:scale-105 active:scale-95">
                    <FileUp className="h-3.5 w-3.5" />
                    Browse File
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 flex flex-col items-center justify-center">
                {/* Graphic Icon */}
                {renderVariantGraphic()}

                {/* Primary Title */}
                <h4 className="mt-3 text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
                  {defaultTitle}
                </h4>

                {/* Obvious Drag & Drop Callout */}
                <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-400">
                  <UploadCloud className="h-4 w-4 shrink-0 animate-bounce" />
                  <span>Drag & drop file here</span>
                </div>

                {/* "OR" Divider */}
                <div className="my-2.5 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  <span className="h-px w-10 bg-slate-300 dark:bg-[#2b2b35]" />
                  <span>or</span>
                  <span className="h-px w-10 bg-slate-300 dark:bg-[#2b2b35]" />
                </div>

                {/* Big Action Button */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition-all group-hover:scale-105 active:scale-95 ring-2 ring-emerald-600/20">
                    <FileUp className="h-4 w-4" />
                    Browse device
                  </span>

                  {enablePaste && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1a1a22] text-slate-600 dark:text-zinc-400 text-[11px] font-mono font-medium border border-slate-200 dark:border-[#2b2b35] shadow-xs">
                      <kbd className="font-sans font-bold text-[10px]">Ctrl</kbd>+<kbd className="font-sans font-bold text-[10px]">V</kbd> to paste
                    </span>
                  )}
                </div>

                {/* Format & Size Requirements */}
                <p className="mt-3 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                  {defaultSubtitle}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {(error || dragError) && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error || dragError}</span>
        </div>
      )}
    </div>
  );
}
