import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { useSelector } from "react-redux";

export const useOpdBilling = () => {
  const { shouldShowOpdBilling } = useSelector((state) => state.billing);
  const { profile } = useSelector((state) => state.doctors);

  const isOpdBillingAccessableFromGB = useFeatureIsOn("new-opd-billing");

  const isOpdBillingEnabledInPhp = profile?.module_data?.find(
    (module) => module.type === "opd_billing"
  );

  return {
    isOpdBillingAccessable:
      (isOpdBillingAccessableFromGB || shouldShowOpdBilling) &&
      isOpdBillingEnabledInPhp,
  };
};
