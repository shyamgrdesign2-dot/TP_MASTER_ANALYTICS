import { isProductionEnv } from "../../../utils/environment";

/**
 * Get ABHA domain suffix based on environment
 * @returns {string} "@abdm" for production, "@sbx" for other environments
 */
export const getAbhaDomainSuffix = () => {
    return isProductionEnv() ? "@abdm" : "@sbx";
};
