/**
 * Application Environment Configuration
 * 
 * Strict Production Policy:
 * - Real Backend Only (Configured via FRAPPE_BASE_URL)
 * - NO Demo Mode
 * - NO Mock Business Data
 * - NO V1 Fallbacks
 */

export function getFrappeBaseUrl(): string {
  const url = process.env.FRAPPE_BASE_URL;
  if (!url) {
    throw new Error("Backend address not configured: FRAPPE_BASE_URL is missing.");
  }
  return url.replace(/\/$/, "");
}

export function isDemoMode(): boolean {
  // In production branch, demo mode is strictly prohibited
  return false;
}

export function setDemoModeOverride(_enabled: boolean | null): void {
  // Purge any legacy localStorage override
  if (typeof window !== "undefined") {
    localStorage.removeItem("DEMO_MODE_OVERRIDE");
  }
}

export const DEMO_MODE = false;

// Auto-purge any stale localStorage override immediately upon module load
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("DEMO_MODE_OVERRIDE");
  } catch {}
}
