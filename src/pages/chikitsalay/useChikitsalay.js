import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_CHIKITSALAY } from "../../utils/constants";

/**
 * Determines if Chikitsalay should be shown for the current doctor.
 * GrowthBook feature `chikitsalay` (GB_CHIKITSALAY) is on
 */
export function useChikitsalay() {
  const isEnabledByGrowthBook = useFeatureIsOn(GB_CHIKITSALAY);
  return isEnabledByGrowthBook;
}