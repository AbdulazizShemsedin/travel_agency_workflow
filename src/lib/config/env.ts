/**
 * Application Environment Configuration
 * 
 * Strict Production Policy:
 * - Real Backend Only (https://travelagency-production-b48d.up.railway.app)
 * - NO Demo Mode
 * - NO Mock Business Data
 * - NO V1 Fallbacks
 */

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
