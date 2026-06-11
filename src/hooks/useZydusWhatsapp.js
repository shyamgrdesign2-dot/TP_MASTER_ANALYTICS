import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { GB_ZYDUS_WHATSAPP } from "../utils/constants";

/**
 * Determines if Zydus WhatsApp should be shown for the current doctor.
 * GrowthBook feature `zydus-doctor-whatsapp-enablement` (GB_ZYDUS_WHATSAPP) is on
 */
export function useZydusWhatsapp() {
  const isEnabledByGrowthBook = useFeatureIsOn(GB_ZYDUS_WHATSAPP);
  return isEnabledByGrowthBook;
}