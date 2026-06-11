import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useGrowthBook } from "@growthbook/growthbook-react";

/**
 * Syncs doctor's phone number to GrowthBook attributes so rules can target by phone.
 * Sends both raw and normalized (last 10 digits) versions.
 */
export default function GrowthBookPhoneSync() {
  const doctorProfile = useSelector((state) => state.doctors?.profile);
  const growthbook = useGrowthBook();
  const lastPhoneRef = useRef(null);

  useEffect(() => {
    if (!growthbook) return;

    const phone = doctorProfile?.um_contact || "";
    const phoneNormalized = String(phone).replace(/\D/g, "").slice(-10);
    
    // Only update if phone actually changed to avoid unnecessary re-renders
    if (lastPhoneRef.current === phoneNormalized) return;
    lastPhoneRef.current = phoneNormalized;

    const existingAttributes =
      typeof growthbook.getAttributes === "function"
        ? growthbook.getAttributes() || {}
        : {};

    growthbook.setAttributes({
      ...existingAttributes,
      doctor_phone: phone,
      doctor_phone_normalized: phoneNormalized,
    });
  }, [doctorProfile?.um_contact, growthbook]);

  return null;
}