"use client";

import { useQuery } from "@tanstack/react-query";
import { getMoneySettingsV2 } from "@/lib/api/v2/finance";

/**
 * Checks if Birr conversion is enabled on this system.
 * Off by default on this system (D-30 / 2026-10-05 specification).
 * When off, screens do not display Exchange Rates buttons/windows,
 * do not show "awaiting FX" banners, do not display Birr totals,
 * and never add different currencies together.
 */
export function useBirrConversion() {
  const { data, isLoading } = useQuery({
    queryKey: ["finance-money-settings"],
    queryFn: () => getMoneySettingsV2(),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  // While loading or if error, default to false (Birr conversion off)
  const isBirrConversionEnabled = Boolean(data?.birr_conversion);

  return {
    isBirrConversionEnabled,
    isLoading,
  };
}
