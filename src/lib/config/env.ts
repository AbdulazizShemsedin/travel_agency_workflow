/**
 * Application Environment Configuration
 * 
 * NEXT_PUBLIC_DEMO_MODE:
 * - When true: Activates centralized demo adapter layer for unpopulated/demonstration records while maintaining 100% V2 schema compliance.
 * - When false: Strictly queries live V2 Railway Frappe backend.
 */

export function isDemoMode(): boolean {
  if (typeof window !== "undefined") {
    const override = localStorage.getItem("DEMO_MODE_OVERRIDE");
    if (override !== null) {
      return override === "true";
    }
  }
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}

export function setDemoModeOverride(enabled: boolean | null): void {
  if (typeof window === "undefined") return;
  if (enabled === null) {
    localStorage.removeItem("DEMO_MODE_OVERRIDE");
  } else {
    localStorage.setItem("DEMO_MODE_OVERRIDE", String(enabled));
  }
}

export const DEMO_MODE = typeof process !== "undefined" && (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "1");
