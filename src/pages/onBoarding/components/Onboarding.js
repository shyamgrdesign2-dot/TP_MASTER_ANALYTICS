import React, { Suspense, useEffect, useState } from "react";
import SignUp from "./SignUp";
import SetPassword from "./SetPassword";
import VerifyOTP from "./VerifyOTP";
import VerifyPassword from "./VerifyPassword.js";
// Below-the-fold sections are lazy-loaded to keep the login bundle small.

import "./Onboarding.scss";
import "./FeatureTabCard/FeatureTabCard.scss";
import { getUtmParams } from "../../../components/userOnboarding/services/userDataService.js";
import { Spin } from "antd";
import { ASSETS } from "../../../assets";
import { lazyRetry } from "../../../utils/lazyRetry";
import { isZyPreprodOrZyProdEnv } from "../../../utils/environment";
const Carousel = React.lazy(() =>
  lazyRetry(() => import("./OnboardCarousel"))
);
const FeatureTabCard = React.lazy(() =>
  lazyRetry(() => import("./FeatureTabCard/FeatureTabCard.js"))
);
const TrustBy = React.lazy(() =>
  lazyRetry(() => import("./TrustBy/TrustedBy.js"))
);
const Testimonials = React.lazy(() =>
  lazyRetry(() => import("./Testimonials/Testimonials.js"))
);
const FAQ = React.lazy(() =>
  lazyRetry(() => import("./FAQ/FAQ.js"))
);
const OurScale = React.lazy(() =>
  lazyRetry(() => import("./OurScale/OurScale.js"))
);
const Footer = React.lazy(() =>
  lazyRetry(() => import("./Footer/Footer.js"))
);
const Hook = ASSETS.images.websiteImages.hook;
const Hook2 = ASSETS.images.websiteImages.hook2;
const Logo = ASSETS.images.websiteImages.logo;
const WebStructureBg = ASSETS.images.webstructure;

const Onboarding = () => {
  const isSignupDisabled = isZyPreprodOrZyProdEnv();
  const defaultAuthView = isSignupDisabled ? "loginOTP" : "signup";
  const [view, setView] = useState(defaultAuthView);
  const [mobileNumber, setMobileNumber] = useState("");
  const [isLoginFlow, setIsLoginFlow] = useState(true);
  const [isUserExists, setIsUserExists] = useState(false);
  const [utmParams, setUtmParams] = useState(null);
  const [isFromCampaign, setIsFromCampaign] = useState(false);
  const [isPasswordSetFlow, setIsPasswordSetFlow] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [reqId, setReqId] = useState("");
  const [footerImage, setFooterImage] = useState(Hook);
  const [showFloatingSignup, setShowFloatingSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Load data from localStorage
        const storedMobileNumber = localStorage.getItem("mobileNumber");
        const storedView = localStorage.getItem("currentView");
        const storedLoginFlow = localStorage.getItem("isLoginFlow");
        const storedUserExists = localStorage.getItem("isUserExists");
        const normalizedStoredView =
          isSignupDisabled && storedView === "signup"
            ? "loginOTP"
            : storedView;

        if (storedMobileNumber) setMobileNumber(storedMobileNumber);
        if (normalizedStoredView) setView(normalizedStoredView);
        if (isSignupDisabled && storedView === "signup") {
          localStorage.setItem("currentView", "loginOTP");
          localStorage.setItem("isLoginFlow", "true");
        }
        if (storedLoginFlow) {
          setIsLoginFlow(isSignupDisabled ? true : storedLoginFlow === "true");
        }
        if (storedUserExists) setIsUserExists(storedUserExists === "true");

        // Get UTM params
        const utm = getUtmParams();
        setUtmParams(utm);
        const campaign = utm.utm_campaign;
        const shouldShowSignupFlow = !!campaign && !isSignupDisabled;
        setIsFromCampaign(shouldShowSignupFlow);
        if (shouldShowSignupFlow) {
          setIsFromCampaign(true);
          setIsLoginFlow(false);
        } else {
          setIsFromCampaign(false);
          setIsLoginFlow(true);
        }
      } finally {
        // Render immediately; removing artificial delay improves FCP/LCP
        setIsLoading(false);
      }
    };

    initializeData();
  }, [isSignupDisabled]);

  useEffect(() => {
    const handleResize = () => {
      setFooterImage(window.innerWidth <= 768 ? Hook2 : Hook);
    };

    // Set initial image
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const onboardingContainer = document.querySelector(
        ".onboarding-container"
      );
      if (onboardingContainer) {
        const containerBottom =
          onboardingContainer.getBoundingClientRect().bottom;
        setShowFloatingSignup(
          !isSignupDisabled && containerBottom < 0 && window.innerWidth > 768
        );
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isSignupDisabled]);

  // Preload the LCP background artwork with high priority to speed up first paint.
  useEffect(() => {
    const preloadId = "preload-webstructure-bg";
    if (document.getElementById(preloadId)) return;
    const link = document.createElement("link");
    link.id = preloadId;
    link.rel = "preload";
    link.as = "image";
    link.href = WebStructureBg;
    link.fetchPriority = "high";
    document.head.appendChild(link);
  }, []);

  const handleViewChange = (
    newView,
    number = "",
    isUserExists = false,
    isPasswordSetFlow = false,
    password = "",
    reqId = ""
  ) => {
    const nextView = isSignupDisabled && newView === "signup" ? "loginOTP" : newView;
    // Store values in localStorage
    localStorage.setItem("currentView", nextView);
    localStorage.setItem("isLoginFlow", String(nextView === "loginOTP"));
    localStorage.setItem("isUserExists", String(isUserExists));

    setView(nextView);
    if (nextView === "loginOTP") {
      setIsLoginFlow(true);
    } else if (nextView === "signup") {
      setIsLoginFlow(false);
    }
    if (number) {
      localStorage.setItem("mobileNumber", number);
      setMobileNumber(number);
    }
    if (isUserExists) {
      setIsUserExists(isUserExists);
    }
    if (password) {
      setTempPassword(password);
    }
    if (isPasswordSetFlow) {
      setIsPasswordSetFlow(isPasswordSetFlow);
    }
    if (reqId) {
      setReqId(reqId);
    }
  };

  if (isLoading) {
    return (
      <div className="spinner-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      {showFloatingSignup && !isSignupDisabled && (
        <div className="floating-signup-container">
          <div className="floating-signup-content">
            <div className="logo-section">
              <img src={Logo} alt="Tatva Practice" />
            </div>
            <div className="signup-section">
              <button
                className="sign-up-btn"
                onClick={() => {
                  const onboardingContainer = document.querySelector(
                    ".onboarding-container"
                  );
                  if (onboardingContainer) {
                    onboardingContainer.scrollIntoView({ behavior: "smooth" });
                    setView("signup");
                    setIsLoginFlow(false);
                    setTimeout(() => {
                      const mobileInput = document.querySelector(
                        'input[placeholder="Enter your mobile number"]'
                      );
                      if (mobileInput) {
                        mobileInput.focus();
                      }
                    }, 100);
                  }
                }}
              >
                Sign Up for free
              </button>
              {/* <button className="chat-btn">
                  Chat with us
                </button> */}
            </div>
          </div>
        </div>
      )}
      <div className="onboarding-container">
        <div className="onboarding-left">
          <Suspense fallback={null}>
            <Carousel />
          </Suspense>
        </div>
        <div className="onboarding-right">
          {(view === "signup" || view === "loginOTP") && (
            <SignUp
              onViewChange={handleViewChange}
              isLoginFlow={isLoginFlow}
              mobileNumber={mobileNumber}
            />
          )}
          {view === "verifyOTP" && (
            <VerifyOTP
              onViewChange={handleViewChange}
              mobileNumber={mobileNumber}
              isLoginFlow={isLoginFlow}
              isUserExists={isUserExists}
              isPasswordSetFlow={isPasswordSetFlow}
              tempPassword={tempPassword}
              reqId={reqId}
            />
          )}
          {view === "verifyPassword" && (
            <VerifyPassword
              onViewChange={handleViewChange}
              mobileNumber={mobileNumber}
              // isLoginFlow={isLoginFlow}
              // isUserExists={isUserExists}
            />
          )}
          {view === "setPassword" && (
            <SetPassword
              onViewChange={handleViewChange}
              mobileNumber={mobileNumber}
            />
          )}
          {view === "loginPassword" && (
            <VerifyPassword
              onViewChange={handleViewChange}
              mobileNumber={mobileNumber}
            />
          )}
        </div>
      </div>
      <div className="feature-tab-card-container">
        <Suspense fallback={null}>
          <TrustBy className="m-2" />
        </Suspense>
        <div className="feature-tab-card-container-inner">
          <Suspense fallback={null}>
            <OurScale className="m-2" />
            <FeatureTabCard
              className="m-2"
              feature="EMR Features"
              title="An EMR that streamlines"
              subTitle="all your needs"
              tabs={["Clinical Care", "Admin Tasks", "Analytics"]}
            />
            <FeatureTabCard
              className="m-2"
              feature="Ai Features"
              title="Empower your"
              subTitle="practice with AI features"
              tabs={["DDx", "Smart Sync", "Voice Rx", "TatvaAI"]}
            />{" "}
            <FeatureTabCard
              className="m-2"
              feature="Digital Features"
              title="Grow your"
              subTitle="practice with us"
              tabs={["Digital Presence", "Remote Care", "ABDM"]}
            />
            <Testimonials className="m-2" />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <FAQ className="m-2" />
        </Suspense>
        <div className="onboarding-footer">
          <div className="onboarding-footer-container">
            <img src={footerImage} alt="footer banner" />
            {!isSignupDisabled && (
              <div className="elevation-card">
                <h2 className="gradient-card-text">
                  Ready To Elevate Your Practice?
                </h2>
                <p>
                  Sign up for free now or chat with us to get more personalized
                  insights and updates.
                </p>
                <div className="button-group">
                  <button
                    className="sign-up-btn"
                    onClick={() => {
                      const onboardingContainer = document.querySelector(
                        ".onboarding-container"
                      );
                      if (onboardingContainer) {
                        onboardingContainer.scrollIntoView({
                          behavior: "smooth",
                        });
                        setView("signup");
                        setIsLoginFlow(false);
                        setTimeout(() => {
                          const mobileInput = document.querySelector(
                            'input[placeholder="Enter your mobile number"]'
                          );
                          if (mobileInput) {
                            mobileInput.focus();
                          }
                        }, 100);
                      }
                    }}
                  >
                    Sign Up
                  </button>
                  {/* <button className="chat-btn">Chat with us</button> */}
                </div>
              </div>
            )}
          </div>
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
        </div>
      </div>
    </>
  );
};

export default Onboarding;
