/**
 * Gets the current user data from JWT token in local storage
 * @returns {Object} User data from token or default values if not available
 */
export const getUserMobileNumber = () => {
  try {
    const mobileNumber = localStorage.getItem("mobileNumber");

    if (!mobileNumber) {
      return "";
    }

    return mobileNumber;
  } catch (error) {
    console.error("Error getting user data:", error);
    return "";
  }
};

/**
 * Gets UTM parameters from URL or local storage
 * @returns {Object} UTM parameters
 */
export const getUtmParams = () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);

    return {
      utm_source: urlParams.get("utm_source") || "",
      utm_campaign: urlParams.get("utm_campaign") || "",
      utm_term: urlParams.get("utm_term") || "",
      utm_content: urlParams.get("utm_content") || "",
      utm_medium: urlParams.get("utm_medium") || "",
    };
  } catch (error) {
    console.error("Error getting UTM params:", error);
    return null;
  }
};
