import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { useSelector } from "react-redux";
import { GB_GYNEC_HISTORY, NEO_NATOLOGISTS_DP_ID, PAEDIATRICS, PAEDIATRICS_DP_ID } from "../../utils/constants";

export const useAccess = (patientAge = 0) => {
  const { profile } = useSelector((state) => state.doctors);
  const isVaccinationAccessableFromGB = useFeatureIsOn(
    "vaccination-new-design"
  );
  const isGrowthChartAccessableFromGB = useFeatureIsOn(
    "growth-chart-new-design"
  );
  const isGynaecAccessableFromGB = useFeatureIsOn(
    GB_GYNEC_HISTORY
  );

  return {
    isVaccinationAccessable: true,
      // isVaccinationAccessableFromGB ||
      // profile?.dp_name === PAEDIATRICS ||
      // profile?.dp_id === NEO_NATOLOGISTS_DP_ID,
    isGrowthChartAccessable:
      (isGrowthChartAccessableFromGB || profile?.dp_name === PAEDIATRICS || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) &&
      patientAge <= 18,
    isGynaecHistoryAccessable: isGynaecAccessableFromGB || profile?.dp_id === 8,
    isPediatricAccessable: profile?.dp_id === PAEDIATRICS_DP_ID || profile?.dp_id === NEO_NATOLOGISTS_DP_ID,
  };
};
