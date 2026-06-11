import React, { useState, useEffect } from "react";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import { isMobile, isTablet } from "react-device-detect";
import axios from "axios";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../../utils/constants";
import styles from "./DocumentVerificationPopup.module.css";
import config from "../../config";
import { useSelector } from "react-redux";
import moment from "moment";
import { fetchSubscriptionDetails } from "../../redux/subscriptionSlice";
import { useDispatch } from "react-redux";

const DISMISS_TIMESTAMP_KEY = "document_verification_dismissed_at";
const DISMISS_HOURS = 12; // Show popup again after 12 hours

const DocumentVerificationPopup = () => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [docStatus, setDocStatus] = useState({
    bothMissing: false,
    idProofMissing: false,
    mrcMissing: false,
    daysLeft: 0,
  });
  const navigate = useNavigate();
  const { planDetails } = useSelector((state) => state.subscription);
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isReceptionist) {
      dispatch(fetchSubscriptionDetails()); // Fetch subscription details on every reload
    }
  }, [dispatch]);

  useEffect(() => {
    if (planDetails?.onboarding_date) {
      checkDocumentStatus();
    }
  }, [planDetails]);

  const checkDocumentStatus = async () => {
    try {
      setLoading(true);

      // Get JWT token from localStorage
      const rawToken = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
      if (!rawToken) return;

      let token;
      try {
        token = JSON.parse(rawToken);
      } catch (e) {
        console.error("Error parsing token:", e);
        return;
      }

      const cleanedToken = token?.replace(/['"]+/g, '');

      const response = await axios.get(
        `${config.user_management_api_url}/user/tatva/v2/documents`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cleanedToken}`,
          },
        }
      );

      // Check the response
      if (response.data && response.data.status === 200) {
        const body = response.data.body;
        const mrcExists = !!body?.mrc?.certificatePreviewUrl;
        const idProofExists = !!body?.pi?.doc_url;
        let daysLeft = 0;
        if (planDetails?.onboarding_date) {
          const deadline = moment(planDetails?.onboarding_date).add(8, "days");
          daysLeft = Math.ceil(moment(deadline).diff(moment(), "hours") / 24);
        }

        setDocStatus({
          bothMissing: !mrcExists && !idProofExists,
          idProofMissing: !idProofExists && mrcExists,
          mrcMissing: !mrcExists && idProofExists,
          daysLeft: daysLeft > 0 ? daysLeft : 0,
        });

        // Show popup if any document is missing and dismiss timeout has passed (desktop/tablet only, not mobile)
        if (!mrcExists || !idProofExists) {
          const shouldShowPopup = checkDismissTimeout();
          const isDesktopOrTablet = !(isMobile && !isTablet);
          if (shouldShowPopup && isDesktopOrTablet) {
            setVisible(true);
          }
        }
      }
    } catch (error) {
      console.error("Error checking document status:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check if the dismiss timeout has passed
  const checkDismissTimeout = () => {
    const dismissedAt = localStorage.getItem(DISMISS_TIMESTAMP_KEY);
    if (!dismissedAt) {
      return true; // No timestamp found, show the popup
    }

    const dismissedTime = parseInt(dismissedAt, 10);
    const currentTime = Date.now();
    const hoursPassed = (currentTime - dismissedTime) / (1000 * 60 * 60);

    // If more than DISMISS_HOURS have passed, show the popup again
    return hoursPassed >= DISMISS_HOURS;
  };

  const getPopupTitle = () => {
    let title = "";

    if (docStatus.bothMissing) {
      title = "Upload Proof";
    } else if (docStatus.idProofMissing) {
      title = "Upload ID Proof";
    } else if (docStatus.mrcMissing) {
      title = "Upload MRC Certificate";
    }

    return (
      <div className={styles.titleContainer}>
        <span className={styles.title}>
          {title}
          <span className={styles.daysLeft}>
            &nbsp;
            {docStatus.daysLeft > 0 ? `(${docStatus.daysLeft} Days left)` : ""}
          </span>
        </span>
      </div>
    );
  };

  const getPopupContent = () => {
    if (docStatus.bothMissing) {
      return `Complete your profile by uploading proof or else your access will be blocked ${
        docStatus.daysLeft > 0 ? `in ${docStatus.daysLeft} days` : ""
      }`;
    } else if (docStatus.idProofMissing) {
      return `Complete your profile by uploading ID proof or else your access will be blocked ${
        docStatus.daysLeft > 0 ? `in ${docStatus.daysLeft} days` : ""
      }`;
    } else if (docStatus.mrcMissing) {
      return `Complete your profile by uploading MRC Certificate or else your access will be blocked ${
        docStatus.daysLeft > 0 ? `in ${docStatus.daysLeft} days` : ""
      }`;
    }
    return "";
  };

  const handleUploadNow = () => {
    setVisible(false);
    navigate("/doctor_profile", {
      state: {
        scrollToDocuments: true,
      },
    });
  };

  const handleLater = () => {
    // Store the current timestamp when user clicks "Do later"
    localStorage.setItem(DISMISS_TIMESTAMP_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.popup}>
        <div className={styles.contentContainer}>
          <div className={styles.iconContainer}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="31"
              height="31"
              viewBox="0 0 31 31"
              fill="none"
            >
              <path
                d="M15.3452 9.68683V15.3452M15.3452 21.0037H15.3594M29.4913 15.3452C29.4913 23.1579 23.1579 29.4913 15.3452 29.4913C7.53261 29.4913 1.19922 23.1579 1.19922 15.3452C1.19922 7.53261 7.53261 1.19922 15.3452 1.19922C23.1579 1.19922 29.4913 7.53261 29.4913 15.3452Z"
                stroke="white"
                stroke-width="2.1219"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div className={styles.contentWrapper}>
            {getPopupTitle()}
            <p className={styles.paragraph}>{getPopupContent()}</p>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <Button onClick={handleLater} className={styles.laterButton}>
            Do later
          </Button>
          <Button onClick={handleUploadNow} className={styles.uploadButton}>
            Upload Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DocumentVerificationPopup;
