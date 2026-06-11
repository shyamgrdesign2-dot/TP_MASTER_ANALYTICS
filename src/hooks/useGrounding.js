import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { getTokenData } from "../utils/utils";
import { GB_DISABLE_GROUNDING, GB_ZYDUS_USER } from "../utils/constants";
import config from "../config";
import { env } from "../EnvironmentConfig";

export const useGrounding = () => {
  const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
  const tokenData = getTokenData();
  const { hospital_business_id } = tokenData || {};
  const isApollo = config.APOLLO_BUSINESS_IDS.includes(hospital_business_id);

  const isGroundingAccessable =
    (tokenData?.hospital_business_id == env.zydus_business_id &&
      isZydusUserAccessableFromGB) ||
    isApollo;

  const isGroundingDisabledFromGB = useFeatureIsOn(GB_DISABLE_GROUNDING);

  return isGroundingAccessable;
};
