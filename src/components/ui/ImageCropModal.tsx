"use client";

import * as React from "react";
import {
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crop,
  Check,
  X,
  FileCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Helper to determine default aspect ratio by crop mode
export function getInitialCropAspectRatio(
  mode: "passport" | "portrait" | "fullbody" | "free" = "passport",
  defaultRatio?: number | null
): number | null {
  if (defaultRatio !== undefined && defaultRatio !== null) return defaultRatio;
  if (mode === "portrait") return 35 / 45; // ~0.778 standard 35x45mm passport/visa headshot
  if (mode === "fullbody") return 3 / 4;   // 0.75 standing full body portrait
  if (mode === "passport") return 1.42;    // Landscape passport spread
  return null;
}

// Calculate normalized (0..1) crop rectangle respecting aspect ratio and rotation
export function calculateNormalizedCropBox(
  targetRatio: number | null,
  imgWidth: number,
  imgHeight: number,
  rot: number
): { x: number; y: number; width: number; height: number } {
  if (!targetRatio) {
    return { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };
  }
  const is90or270 = rot === 90 || rot === 270;
  const effW = is90or270 ? (imgHeight || 600) : (imgWidth || 800);
  const effH = is90or270 ? (imgWidth || 800) : (imgHeight || 600);
  const canvasRatio = effW / effH;

  // Normalized width / normalized height K
  const K = targetRatio / canvasRatio;

  let newW = 0.85;
  let newH = newW / K;

  if (newH > 0.85) {
    newH = 0.85;
    newW = newH * K;
  }

  newW = Math.min(0.95, Math.max(0.08, newW));
  newH = Math.min(0.95, Math.max(0.08, newH));

  return {
    x: Math.max(0.02, (1 - newW) / 2),
    y: Math.max(0.02, (1 - newH) / 2),
    width: newW,
    height: newH,
  };
}

export interface ImageCropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File | null;
  imageUrl?: string | null;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cropMode?: "passport" | "portrait" | "fullbody" | "free";
  defaultAspectRatio?: number | null; // width / height, or null for free
  onConfirm: (resultFile: File, isCropped: boolean) => void | Promise<void>;
  onCancel?: () => void;
}

type DragHandle =
  | "move"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | null;

export function ImageCropModal({
  open,
  onOpenChange,
  imageFile,
  imageUrl: externalImageUrl,
  title = "Preview & Crop Document",
  description = "Adjust, rotate, or crop before extraction and upload. You can also proceed with the full original document.",
  confirmLabel = "Apply & Extract Info",
  cropMode = "passport",
  defaultAspectRatio = null,
  onConfirm,
  onCancel,
}: ImageCropModalProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [imageEl, setImageEl] = React.useState<HTMLImageElement | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = React.useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Transform states
  const [rotation, setRotation] = React.useState<number>(0); // 0, 90, 180, 270
  const [zoom, setZoom] = React.useState<number>(1);
  const [aspectRatio, setAspectRatio] = React.useState<number | null>(() =>
    getInitialCropAspectRatio(cropMode, defaultAspectRatio)
  );

  // Normalized crop rectangle: 0 to 1 inside the displayed image bounds
  const [cropRect, setCropRect] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>({
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.9,
  });

  const [activeHandle, setActiveHandle] = React.useState<DragHandle>(null);
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);
  const [initialRect, setInitialRect] = React.useState<typeof cropRect | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Load image when file or url changes
  React.useEffect(() => {
    if (!open) return;

    let objectUrl = "";
    if (imageFile) {
      objectUrl = URL.createObjectURL(imageFile);
      setImageSrc(objectUrl);
    } else if (externalImageUrl) {
      setImageSrc(externalImageUrl);
    } else {
      setImageSrc(null);
    }

    // Reset controls
    setRotation(0);
    setZoom(1);
    const initialRatio = getInitialCropAspectRatio(cropMode, defaultAspectRatio);
    setAspectRatio(initialRatio);

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, imageFile, externalImageUrl, cropMode, defaultAspectRatio]);

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageEl(img);
    const natW = img.naturalWidth || 800;
    const natH = img.naturalHeight || 600;
    setImgNaturalSize({
      width: natW,
      height: natH,
    });

    const activeRatio = getInitialCropAspectRatio(cropMode, defaultAspectRatio);
    setAspectRatio(activeRatio);
    const box = calculateNormalizedCropBox(activeRatio, natW, natH, rotation);
    setCropRect(box);
  };

  const handleRotate = (direction: "cw" | "ccw") => {
    const nextRot = (direction === "cw" ? rotation + 90 : rotation - 90 + 360) % 360;
    setRotation(nextRot);
    if (aspectRatio) {
      const box = calculateNormalizedCropBox(
        aspectRatio,
        imgNaturalSize.width,
        imgNaturalSize.height,
        nextRot
      );
      setCropRect(box);
    }
  };

  const handleReset = () => {
    setRotation(0);
    setZoom(1);
    const initRatio = getInitialCropAspectRatio(cropMode, defaultAspectRatio);
    setAspectRatio(initRatio);
    const box = calculateNormalizedCropBox(
      initRatio,
      imgNaturalSize.width,
      imgNaturalSize.height,
      0
    );
    setCropRect(box);
  };

  // Dragging logic for Pointer events
  const onPointerDown = (handle: DragHandle, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialRect({ ...cropRect });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !dragStart || !initialRect || !containerRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    if (container.width <= 0 || container.height <= 0) return;

    const dx = (e.clientX - dragStart.x) / container.width;
    const dy = (e.clientY - dragStart.y) / container.height;

    const MIN_SIZE = 0.08;
    let newRect = { ...initialRect };

    if (activeHandle === "move") {
      newRect.x = Math.max(0, Math.min(1 - initialRect.width, initialRect.x + dx));
      newRect.y = Math.max(0, Math.min(1 - initialRect.height, initialRect.y + dy));
    } else if (!aspectRatio) {
      // Freeform dragging
      if (activeHandle.includes("left")) {
        const potentialX = Math.min(initialRect.x + initialRect.width - MIN_SIZE, Math.max(0, initialRect.x + dx));
        newRect.width = initialRect.width + (initialRect.x - potentialX);
        newRect.x = potentialX;
      }
      if (activeHandle.includes("right")) {
        newRect.width = Math.max(MIN_SIZE, Math.min(1 - initialRect.x, initialRect.width + dx));
      }
      if (activeHandle.includes("top")) {
        const potentialY = Math.min(initialRect.y + initialRect.height - MIN_SIZE, Math.max(0, initialRect.y + dy));
        newRect.height = initialRect.height + (initialRect.y - potentialY);
        newRect.y = potentialY;
      }
      if (activeHandle.includes("bottom")) {
        newRect.height = Math.max(MIN_SIZE, Math.min(1 - initialRect.y, initialRect.height + dy));
      }
    } else {
      // Ratio-locked corner dragging
      const is90or270 = rotation === 90 || rotation === 270;
      const natW = imgNaturalSize.width || 800;
      const natH = imgNaturalSize.height || 600;
      const effW = is90or270 ? natH : natW;
      const effH = is90or270 ? natW : natH;
      const canvasRatio = effW / effH;
      const K = aspectRatio / canvasRatio;

      if (activeHandle === "bottom-right") {
        let w = Math.max(MIN_SIZE, Math.min(1 - initialRect.x, initialRect.width + dx));
        let h = w / K;
        if (initialRect.y + h > 1) {
          h = 1 - initialRect.y;
          w = h * K;
        }
        newRect.width = Math.max(MIN_SIZE, w);
        newRect.height = Math.max(MIN_SIZE, h);
      } else if (activeHandle === "bottom-left") {
        let w = Math.max(MIN_SIZE, initialRect.width - dx);
        let h = w / K;
        if (initialRect.y + h > 1) {
          h = 1 - initialRect.y;
          w = h * K;
        }
        if (initialRect.x + initialRect.width - w < 0) {
          w = initialRect.x + initialRect.width;
          h = w / K;
        }
        newRect.width = Math.max(MIN_SIZE, w);
        newRect.height = Math.max(MIN_SIZE, h);
        newRect.x = initialRect.x + initialRect.width - newRect.width;
      } else if (activeHandle === "top-right") {
        let w = Math.max(MIN_SIZE, Math.min(1 - initialRect.x, initialRect.width + dx));
        let h = w / K;
        if (initialRect.y + initialRect.height - h < 0) {
          h = initialRect.y + initialRect.height;
          w = h * K;
        }
        newRect.width = Math.max(MIN_SIZE, w);
        newRect.height = Math.max(MIN_SIZE, h);
        newRect.y = initialRect.y + initialRect.height - newRect.height;
      } else if (activeHandle === "top-left") {
        let w = Math.max(MIN_SIZE, initialRect.width - dx);
        let h = w / K;
        if (initialRect.y + initialRect.height - h < 0) {
          h = initialRect.y + initialRect.height;
          w = h * K;
        }
        if (initialRect.x + initialRect.width - w < 0) {
          w = initialRect.x + initialRect.width;
          h = w / K;
        }
        newRect.width = Math.max(MIN_SIZE, w);
        newRect.height = Math.max(MIN_SIZE, h);
        newRect.x = initialRect.x + initialRect.width - newRect.width;
        newRect.y = initialRect.y + initialRect.height - newRect.height;
      }
    }

    setCropRect(newRect);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (activeHandle) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setActiveHandle(null);
      setDragStart(null);
      setInitialRect(null);
    }
  };

  // Perform client-side canvas crop & transformation
  const handleCropAndProceed = async () => {
    if (!imageSrc || !imageEl) {
      if (imageFile) {
        await onConfirm(imageFile, false);
      }
      onOpenChange(false);
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create offscreen canvas for source image rotation
      const natW = imageEl.naturalWidth || 1000;
      const natH = imageEl.naturalHeight || 800;

      const rotatedCanvas = document.createElement("canvas");
      const is90or270 = rotation === 90 || rotation === 270;
      rotatedCanvas.width = is90or270 ? natH : natW;
      rotatedCanvas.height = is90or270 ? natW : natH;

      const rCtx = rotatedCanvas.getContext("2d");
      if (!rCtx) throw new Error("Could not get canvas 2d context");

      rCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
      rCtx.rotate((rotation * Math.PI) / 180);
      rCtx.drawImage(imageEl, -natW / 2, -natH / 2, natW, natH);

      // 2. Crop to target rectangle from rotated canvas
      const cropX = Math.round(cropRect.x * rotatedCanvas.width);
      const cropY = Math.round(cropRect.y * rotatedCanvas.height);
      const cropW = Math.round(cropRect.width * rotatedCanvas.width);
      const cropH = Math.round(cropRect.height * rotatedCanvas.height);

      const targetCanvas = document.createElement("canvas");
      targetCanvas.width = Math.max(10, cropW);
      targetCanvas.height = Math.max(10, cropH);

      const tCtx = targetCanvas.getContext("2d");
      if (!tCtx) throw new Error("Could not get target canvas context");

      tCtx.drawImage(
        rotatedCanvas,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        targetCanvas.width,
        targetCanvas.height
      );

      // 3. Convert target canvas to high-quality Blob & File
      const blob = await new Promise<Blob | null>((resolve) => {
        targetCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.95);
      });

      if (!blob) throw new Error("Canvas toBlob failed");

      const origName = imageFile?.name || "cropped_document.jpg";
      const cleanName = origName.replace(/\.[^/.]+$/, "") + "_cropped.jpg";
      const finalFile = new File([blob], cleanName, { type: "image/jpeg" });

      await onConfirm(finalFile, true);
      onOpenChange(false);
    } catch (err) {
      console.warn("Crop generation failed, falling back to original file:", err);
      if (imageFile) {
        await onConfirm(imageFile, false);
      }
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipAndUseFull = async () => {
    if (imageFile) {
      setIsProcessing(true);
      try {
        await onConfirm(imageFile, false);
        onOpenChange(false);
      } finally {
        setIsProcessing(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] p-0 overflow-hidden max-h-[92vh] flex flex-col border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#121215]">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-[#222228]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                <Crop className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar Controls */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-[#18181f] border-b border-slate-200/80 dark:border-[#26262f] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Rotation and Zoom */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mr-1">Rotate:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRotate("ccw")}
              className="h-7 px-2 text-xs border-slate-200 dark:border-[#33333f] bg-white dark:bg-[#141418]"
              title="Rotate Left 90°"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> -90°
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRotate("cw")}
              className="h-7 px-2 text-xs border-slate-200 dark:border-[#33333f] bg-white dark:bg-[#141418]"
              title="Rotate Right 90°"
            >
              <RotateCw className="h-3.5 w-3.5 mr-1" /> +90°
            </Button>

            <span className="mx-2 h-4 w-px bg-slate-200 dark:bg-[#33333f]" />

            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mr-1">Zoom:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
              className="h-7 w-7 p-0 text-xs border-slate-200 dark:border-[#33333f] bg-white dark:bg-[#141418]"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-300 w-8 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
              className="h-7 w-7 p-0 text-xs border-slate-200 dark:border-[#33333f] bg-white dark:bg-[#141418]"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Dynamic Aspect Ratio Options per Crop Mode */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mr-1">Preset:</span>
            {(() => {
              const presets: { label: string; ratio: number | null }[] =
                cropMode === "portrait"
                  ? [
                      { label: "35x45mm (Passport)", ratio: 35 / 45 },
                      { label: "3:4 Portrait", ratio: 3 / 4 },
                      { label: "1:1 Square", ratio: 1 },
                      { label: "Free", ratio: null },
                    ]
                  : cropMode === "fullbody"
                  ? [
                      { label: "3:4 Full Body", ratio: 3 / 4 },
                      { label: "2:3 Standing", ratio: 2 / 3 },
                      { label: "9:16 Tall", ratio: 9 / 16 },
                      { label: "Free", ratio: null },
                    ]
                  : cropMode === "passport"
                  ? [
                      { label: "1.42 Spread", ratio: 1.42 },
                      { label: "4:3 Document", ratio: 4 / 3 },
                      { label: "A4 (1.414)", ratio: 1.414 },
                      { label: "Free", ratio: null },
                    ]
                  : [
                      { label: "Free", ratio: null },
                      { label: "1:1 Square", ratio: 1 },
                      { label: "4:3", ratio: 4 / 3 },
                      { label: "16:9", ratio: 16 / 9 },
                    ];

              return presets.map((p) => {
                const isSelected =
                  (aspectRatio === null && p.ratio === null) ||
                  (aspectRatio !== null && p.ratio !== null && Math.abs(aspectRatio - p.ratio) < 0.01);
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setAspectRatio(p.ratio);
                      const box = calculateNormalizedCropBox(
                        p.ratio,
                        imgNaturalSize.width,
                        imgNaturalSize.height,
                        rotation
                      );
                      setCropRect(box);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer",
                      isSelected
                        ? "bg-emerald-800 text-white shadow-xs"
                        : "bg-white dark:bg-[#141418] border border-slate-200 dark:border-[#33333f] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#1c1c22]"
                    )}
                  >
                    {p.label}
                  </button>
                );
              });
            })()}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white ml-1"
            >
              <Maximize2 className="h-3 w-3 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* Image Preview & Interactive Cropper Viewport */}
        <div className="relative flex-1 min-h-[340px] max-h-[55vh] bg-slate-950 flex items-center justify-center p-4 overflow-hidden select-none">
          {imageSrc ? (
            <div
              ref={containerRef}
              className="relative max-h-full max-w-full flex items-center justify-center"
              style={{
                transform: `scale(${zoom})`,
                transition: activeHandle ? "none" : "transform 0.15s ease-out",
              }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {/* Displayed Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="Document preview"
                onLoad={handleImageLoaded}
                className="max-h-[50vh] max-w-full object-contain pointer-events-none rounded shadow-md"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-in-out",
                }}
              />

              {/* Darkened Mask Layer with Cutout Crop Box */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle, transparent 0%, transparent 100%)`,
                }}
              >
                {/* Visual active crop bounding box */}
                <div
                  className="absolute border-2 border-emerald-400 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] cursor-move pointer-events-auto"
                  style={{
                    left: `${cropRect.x * 100}%`,
                    top: `${cropRect.y * 100}%`,
                    width: `${cropRect.width * 100}%`,
                    height: `${cropRect.height * 100}%`,
                  }}
                  onPointerDown={(e) => onPointerDown("move", e)}
                >
                  {/* Grid Lines (Rule of thirds) */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    <div className="border-r border-b border-white/60" />
                    <div className="border-r border-b border-white/60" />
                    <div className="border-b border-white/60" />
                    <div className="border-r border-b border-white/60" />
                    <div className="border-r border-b border-white/60" />
                    <div className="border-b border-white/60" />
                    <div className="border-r border-white/60" />
                    <div className="border-r border-white/60" />
                    <div />
                  </div>

                  {/* Corner Resize Handles */}
                  <div
                    className="absolute -top-1.5 -left-1.5 h-3.5 w-3.5 bg-white border-2 border-emerald-600 rounded-xs cursor-nwse-resize shadow"
                    onPointerDown={(e) => onPointerDown("top-left", e)}
                  />
                  <div
                    className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-white border-2 border-emerald-600 rounded-xs cursor-nesw-resize shadow"
                    onPointerDown={(e) => onPointerDown("top-right", e)}
                  />
                  <div
                    className="absolute -bottom-1.5 -left-1.5 h-3.5 w-3.5 bg-white border-2 border-emerald-600 rounded-xs cursor-nesw-resize shadow"
                    onPointerDown={(e) => onPointerDown("bottom-left", e)}
                  />
                  <div
                    className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 bg-white border-2 border-emerald-600 rounded-xs cursor-nwse-resize shadow"
                    onPointerDown={(e) => onPointerDown("bottom-right", e)}
                  />

                  {/* Edge Handles (Only active in Freeform mode to prevent aspect ratio distortion) */}
                  {aspectRatio === null && (
                    <>
                      <div
                        className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-6 bg-white/90 border border-emerald-600 rounded-xs cursor-ns-resize"
                        onPointerDown={(e) => onPointerDown("top", e)}
                      />
                      <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-6 bg-white/90 border border-emerald-600 rounded-xs cursor-ns-resize"
                        onPointerDown={(e) => onPointerDown("bottom", e)}
                      />
                      <div
                        className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 bg-white/90 border border-emerald-600 rounded-xs cursor-ew-resize"
                        onPointerDown={(e) => onPointerDown("left", e)}
                      />
                      <div
                        className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 bg-white/90 border border-emerald-600 rounded-xs cursor-ew-resize"
                        onPointerDown={(e) => onPointerDown("right", e)}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-xs">No image loaded for preview</div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 bg-slate-50 dark:bg-[#18181f] border-t border-slate-100 dark:border-[#26262f] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Drag borders to crop, or use full image directly.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (onCancel) onCancel();
                onOpenChange(false);
              }}
              className="text-xs"
              disabled={isProcessing}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleSkipAndUseFull}
              className="text-xs border border-slate-200 dark:border-[#33333f] bg-white dark:bg-[#1c1c24] hover:bg-slate-100"
              disabled={isProcessing}
            >
              <FileCheck className="h-3.5 w-3.5 mr-1.5 text-slate-600 dark:text-zinc-300" />
              Use Full Image (No Crop)
            </Button>

            <Button
              type="button"
              onClick={handleCropAndProceed}
              className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-sm"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent mr-1.5" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  {confirmLabel}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
