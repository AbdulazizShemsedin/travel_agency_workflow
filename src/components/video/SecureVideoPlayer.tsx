"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

export interface SecureVideoPlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src?: string;
  onRefreshUrl?: () => Promise<any> | void;
  maxRetries?: number;
}

/**
 * Robust HTML5 Video Player compliant with Go backend 2-hour signed media URLs.
 * Automatically recovers playback after URL expiration by recording currentTime,
 * fetching a fresh temporary signed URL via onRefreshUrl, and seeking back on loadedmetadata.
 * Guarantees zero infinite error loops even on non-existent media or broken links.
 */
export function SecureVideoPlayer({
  src,
  onRefreshUrl,
  maxRetries = 3,
  className,
  ...props
}: SecureVideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const savedTimeRef = React.useRef<number>(0);
  const retryCountRef = React.useRef<number>(0);
  const lastFailedSrcRef = React.useRef<string | null>(null);
  const [isRecovering, setIsRecovering] = React.useState(false);
  const [hasFatalError, setHasFatalError] = React.useState(false);

  // Reset retry counters when a new valid src is provided
  React.useEffect(() => {
    if (src && src.trim() !== "" && src !== lastFailedSrcRef.current) {
      retryCountRef.current = 0;
      setHasFatalError(false);
    }
  }, [src]);

  const handleError = React.useCallback(
    async (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const video = videoRef.current;
      if (video) {
        savedTimeRef.current = video.currentTime || 0;
      }

      if (!src || !src.trim()) {
        setHasFatalError(true);
        props.onError?.(e);
        return;
      }

      // If this exact URL has already failed or retry budget is exhausted, halt retries
      if (lastFailedSrcRef.current === src || retryCountRef.current >= maxRetries || !onRefreshUrl) {
        setHasFatalError(true);
        props.onError?.(e);
        return;
      }

      lastFailedSrcRef.current = src;
      retryCountRef.current += 1;
      setIsRecovering(true);

      try {
        await onRefreshUrl();
      } catch (err) {
        console.warn("[SecureVideoPlayer] Could not refresh video link:", err);
        setHasFatalError(true);
      } finally {
        setIsRecovering(false);
      }
    },
    [maxRetries, onRefreshUrl, props, src]
  );

  const handleLoadedMetadata = React.useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const video = videoRef.current;
      if (video && savedTimeRef.current > 0) {
        try {
          video.currentTime = savedTimeRef.current;
        } catch {
          // Seek fallback
        }
      }
      props.onLoadedMetadata?.(e);
    },
    [props]
  );

  const handleTimeUpdate = React.useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      if (retryCountRef.current > 0 && videoRef.current && videoRef.current.currentTime > 1) {
        retryCountRef.current = 0;
        lastFailedSrcRef.current = null;
      }
      props.onTimeUpdate?.(e);
    },
    [props]
  );

  if (!src || !src.trim() || hasFatalError) {
    return (
      <div className="w-full py-12 text-center text-xs text-slate-400 bg-black rounded-lg">
        Video file is processing or unavailable.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <video
        ref={videoRef}
        src={src}
        className={className}
        onError={handleError}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        {...props}
      />
      {isRecovering && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-2 text-white text-xs z-10 pointer-events-none">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
          <span>Refreshing playback session...</span>
        </div>
      )}
    </div>
  );
}
