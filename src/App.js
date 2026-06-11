import React, { Suspense, useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useSearchParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import * as Sentry from "@sentry/react";
import { isMobile, isTablet, isChrome, isSafari } from "react-device-detect";
import { GrowthBook, GrowthBookProvider, useFeatureIsOn } from "@growthbook/growthbook-react";
import { useDeviceType } from "./utils/deviceDetection";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import config from "./config";
import {
  FROM_NATIVE_APP,
  GB_VOICE_RX_NEW_UI,
  PERSISTANT_STORAGE_KEY_AUTH_TOKEN,
  PERSISTANT_STORAGE_KEY_BILL_TOKEN,
  PERSISTANT_STORAGE_KEY_MEDECO_TOKEN,
} from "./utils/constants";
import { useLocalStorage } from "./utils/localStorage";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./common/ErrorFallback";
import GrowthBookPhoneSync from "./components/GrowthBookPhoneSync";
import { checkAccountStatus } from "./pages/auth/authService";
import PrivateRoute from "./pages/auth/components/PrivateRoute";
import { DEMO } from "./pages/analytics/demo/demoApi";
import { useTncConsent } from "./hooks/useTncConsent";
import FullPageLoader from "./pages/vaccination/components/Loader";
import { lazyRetry } from "./utils/lazyRetry";
import PatientDetails from "./pages/PatientDetails";
import MobilePatientDetails from "./pages/mobile/PatientDetails/PatientDetails";
import useRouteTracking from "./hooks/useRouteTracking";
import { isProductionEnv } from "./utils/environment";

const AppointmentList = React.lazy(() =>
  lazyRetry(() => import("./pages/AppointmentList"))
);
const Prescription = React.lazy(() =>
  lazyRetry(() => import("./pages/Prescription"))
);
const PrescriptionNew = React.lazy(() =>
  lazyRetry(() => import("./pages/PrescriptionNew"))
);
const SmartPrescription = React.lazy(() =>
  lazyRetry(() => import("./pages/SmartPrescription"))
);
const SmartRxPreview = React.lazy(() =>
  lazyRetry(() => import("./pages/SmartRxPreview"))
);
const TabPrescription = React.lazy(() =>
  lazyRetry(() => import("./pages/tab_design/TabPrescription"))
);
const PrescriptionPrintView = React.lazy(() =>
  lazyRetry(() => import("./pages/PrescriptionPrintView"))
);
const ConfigurePrintSetting = React.lazy(() =>
  lazyRetry(() => import("./pages/ConfigurePrintSetting"))
);
const MedicalCertificate = React.lazy(() =>
  lazyRetry(() => import("./pages/MedicalCertificate"))
);
const CertificatePrintView = React.lazy(() =>
  lazyRetry(() => import("./pages/CertificatePrintView"))
);
const DoctorProfile = React.lazy(() =>
  lazyRetry(() => import("./pages/DoctorProfile"))
);
const DoctorWebsiteSetting = React.lazy(() =>
  lazyRetry(() => import("./pages/DoctorWebsiteSetting"))
);
const MessageCreateCampaign = React.lazy(() =>
  lazyRetry(() => import("./pages/MessageCreateCampaign"))
);
const SmartRxDigitise = React.lazy(() =>
  lazyRetry(() => import("./pages/SmartRxDigitise"))
);
const ApolloConsultations = React.lazy(() =>
  lazyRetry(() => import("./pages/apolloConsultations/ApolloConsultations"))
);
const AnalyticsWorkspace = React.lazy(() =>
  lazyRetry(() => import("./pages/analytics/AnalyticsWorkspace"))
);
const DemoLanding = React.lazy(() =>
  lazyRetry(() => import("./pages/analytics/demo/DemoLanding"))
);
const GenRxPrescriptionPrintView = React.lazy(() =>
  lazyRetry(() => import("./pages/GenRxPrescriptionPrintView"))
);
const BillingDashboard = React.lazy(() =>
  lazyRetry(() => import("./pages/opdBilling/components/billingDashboard/BillingDashboard"))
);
const BillingSettings = React.lazy(() =>
  lazyRetry(() => import("./pages/opdBilling/components/advanceBillSettings/BillingSettings"))
);
const AllPatients = React.lazy(() =>
  lazyRetry(() => import("./pages/allPatients.js/AllPatients"))
);
const AddAppointment = React.lazy(() =>
  lazyRetry(() => import("./pages/addAppointment/AddAppointment"))
);
const GetUnlimitedAccess = React.lazy(() =>
  lazyRetry(() => import("./pages/monetization/GetUnlimitedAccess"))
);
const Onboarding = React.lazy(() =>
  lazyRetry(() => import("./pages/onBoarding/components/Onboarding"))
);
const FinalSetup = React.lazy(() =>
  lazyRetry(() => import("./pages/FinalSetup"))
);
const OurOffering = React.lazy(() =>
  lazyRetry(() => import("./pages/ourOffering/OurOffering"))
);
const SnapRx = React.lazy(() =>
  lazyRetry(() => import("./pages/snapRx/SnapRx"))
);
const UploadRx = React.lazy(() =>
  lazyRetry(() => import("./pages/uploadRx"))
);
const OphthalSnapRx = React.lazy(() =>
  lazyRetry(() => import("./pages/ophthalSnapRx/SnapRx"))
);
const OphthalUploadRx = React.lazy(() =>
  lazyRetry(() => import("./pages/ophthalUploadRx"))
);
const SnapRxPreview = React.lazy(() =>
  lazyRetry(() => import("./pages/snapRx/SnapRxPreview"))
);
const SnapRxDigitise = React.lazy(() =>
  lazyRetry(() => import("./pages/snapRx/SnapRxDigitise"))
);
const AppointmentAgent = React.lazy(() =>
  lazyRetry(() => import("./pages/appointmentAgent/AppointmentAgent"))
);
const AppointmentSuccess = React.lazy(() =>
  lazyRetry(() => import("./pages/appointmentAgent/components/AppointmentSuccess/AppointmentSuccess"))
);
const VoiceRxConsult = React.lazy(() =>
  lazyRetry(() => import("./pages/VoiceRxConsult"))
);
const OpdBill = React.lazy(() =>
  lazyRetry(() => import("./pages/opdBilling/OpdBill"))
);
const HealthRecords = React.lazy(() =>
  lazyRetry(() => import("./pages/abhaRecords/HealthRecords"))
);
const AbhaStandalone = React.lazy(() =>
  lazyRetry(() => import("./pages/abha/AbhaStandalone"))
);
const AddNewPatient = React.lazy(() =>
  lazyRetry(() => import("./pages/AddNewPatient"))
);
const TalkativeWidget = React.lazy(() =>
  lazyRetry(() => import("./components/TalkativeWidget"))
);
const AppTeleconsultBootstrap = React.lazy(() =>
  lazyRetry(() => import("./components/AppTeleconsultBootstrap"))
);
const DemoExpirationBanner = React.lazy(() =>
  lazyRetry(() => import("./common/DemoExpirationBanner"))
);
const PlanExpirationBanner = React.lazy(() =>
  lazyRetry(() => import("./common/PlanExpirationBanner"))
);
const DoctorModal = React.lazy(() =>
  lazyRetry(() => import("./common/DoctorModal"))
);
const ExpiredPlanCard = React.lazy(() =>
  lazyRetry(() => import("./common/ExpiredPlanCard"))
);
const BottomSheetManager = React.lazy(() =>
  lazyRetry(() => import("./components/bottomSheetManager"))
);
const UpgradeServicesModal = React.lazy(() =>
  lazyRetry(() => import("./pages/monetization/components/UpgradeServicesModal"))
);
const MobileAllPatients = React.lazy(() =>
  lazyRetry(() => import("./pages/mobile/AllPatients/AllPatients"))
);
const MobileVoiceRxConsult = React.lazy(() =>
  lazyRetry(() => import("./pages/mobile/VoiceRxConsult/MobileVoiceRxConsult"))
);
const MobileVoiceRecording = React.lazy(() =>
  lazyRetry(() => import("./pages/mobile/VoiceRecording/MobileVoiceRecording"))
);
const AppStoreProvider = React.lazy(() =>
  lazyRetry(() => import("./redux/AppStoreProvider"))
);
const TabRx = React.lazy(() =>
  lazyRetry(() => import("./pages/tabRx/TabRx"))
);
const TabRxCanvas = React.lazy(() =>
  lazyRetry(() => import("./pages/tabRx/components/TabRxCanvas"))
);
const TabRxPrescriptionPrintView = React.lazy(() =>
  lazyRetry(() => import("./pages/tabRx/components/tabRxPrescriptionPrintView/TabRxPrescriptionPrintView"))
);
const TabRxDigitization = React.lazy(() =>
  lazyRetry(() => import("./pages/tabRx/components/Digitization"))
);

const growthbook = new GrowthBook({
  apiHost: "https://cdn.growthbook.io",
  clientKey: config?.GROWTHBOOK_CLIENTKEY,
  enableDevMode: !isProductionEnv(),
});

function PrescriptionRouteElement() {
  const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
  const location = useLocation();
  const isVoiceRxNewUiFlow = Boolean(location.state?.isVoiceRxNewUiFlow);

  if (isVoiceRxNewFromGB && isVoiceRxNewUiFlow) {
    return <PrescriptionNew />;
  }

  return isMobile ? <TabPrescription /> : <Prescription />;
}

function App() {
  const SentryRoutes = useMemo(
    () => Sentry.withSentryReactRouterV6Routing(Routes),
    []
  );
  const [redirectReady, setRedirectReady] = useState(false);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const authToken = searchParams.get("authToken");
  const mrnNo = searchParams.get("mrnNo");
  const redirectTo = searchParams.get("redirectTo");
  const uploadParams = searchParams.get("uploadParams");
  const ophthalUploadParams = searchParams.get("ophthalUploadParams");
  const medecoToken = searchParams.get("medecoToken");
  const fromNative = searchParams.get("fromNative");
  const navigate = useNavigate();
  const { isMobile: isMobileDevice, isPWA } = useDeviceType();
  const [getToken, setToken] = useLocalStorage(
    PERSISTANT_STORAGE_KEY_AUTH_TOKEN
  );

  const [getMedecoToken, setMedecoToken] = useLocalStorage(
    PERSISTANT_STORAGE_KEY_MEDECO_TOKEN
  );
  const [_, setFromNativeFlag] = useLocalStorage(FROM_NATIVE_APP)

  const isLoginPage = location.pathname === "/login";
  const isRootPath = location.pathname === "/";
  const token = getToken();
  const isMobileOrPWA = isMobileDevice || isPWA;

  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");

  useRouteTracking();

  const openUrlsSilently = async (urls) => {
    return Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetch(url, { method: "GET", mode: "no-cors" });
          return { url, status: "success" };
        } catch (error) {
          return { url, status: "error", error };
        }
      })
    );
  };

  const handleLogout = async () => {
    const urlsToOpen = [config.pedia_logout_url, config.tatvaAi_logout_url];

    try {
      if (window.isLoggingOut) return;
      window.isLoggingOut = true;

      try {
        const [{ store }, { clearTeleconsultNotification }] = await Promise.all([
          import("./redux/store"),
          import("./redux/teleconsultNotificationSlice"),
        ]);
        store.dispatch(clearTeleconsultNotification());
      } catch (dispatchError) {
        console.warn(
          "Could not clear teleconsult notification during logout:",
          dispatchError
        );
      }

      const statuses = await openUrlsSilently(urlsToOpen);
      console.log("URL statuses:", statuses);

      const allSuccessful = statuses.every(
        ({ status }) => status === "success"
      );
      if (!allSuccessful) {
        console.warn("Some logout URLs failed:", statuses);
      }

      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    } catch (error) {
      console.error("Error during logout:", error);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    } finally {
      window.isLoggingOut = false;
    }
  };
  useEffect(() => {
    if (medecoToken) {
      setMedecoToken(medecoToken);
    }
    if (fromNative) {
      setFromNativeFlag(fromNative)
    }
  }, []);

  useEffect(() => {
    const checkUserStatus = async () => {
      const token = getToken();
      if (token && !isLoginPage && !isReceptionist) {
        try {
          const decoded = jwtDecode(token);
          const phoneNumber = decoded?.result?.mobile_no;
          const doctorUniqueId = decoded?.result?.doctor_unique_id;

          if (phoneNumber && doctorUniqueId) {
            const response = await checkAccountStatus(
              phoneNumber,
              doctorUniqueId
            );
            if (response?.account_status === false) {
              handleLogout();
            }
          }
        } catch (e) {
          console.error("Error checking account status:", e);
        }
      }
    };

    checkUserStatus();

    const intervalId = setInterval(checkUserStatus, 5 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [location.pathname]);

  useEffect(() => {
    const isUserLocked = async () => {
      try {
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
        // Check account status
        const docResponse = await axios.get(
          `${config.user_management_api_url}/user/v2/pm/info/status`,
          {
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${cleanedToken}`,
            },
          }
        );
        if (docResponse.data && docResponse.data.status === false) {
          if (location.pathname !== "/final-setup") {
            navigate("/final-setup?step=2&isAccountLocked=true");
          }
        }
      } catch (e) {
        console.error("Error checking account status:", e);
      }
    };

    authToken && !isReceptionist && isUserLocked();
  }, [location.pathname, navigate, authToken, isReceptionist]);

  useEffect(() => {
    if (isReceptionist) return;
    // Load features asynchronously when the app renders
    growthbook?.init({ streaming: true });
    const token = authToken || getToken();
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        growthbook?.setAttributes({
          doctorId: decodedToken?.result?.doctor_unique_id,
          id: `${decodedToken?.result?.user_id}`,
          hos_business_id: `${decodedToken?.result?.hospital_business_id}`,
          clinic_id: `${decodedToken?.result?.clinic_id}`,
        });
      } catch (e) {
        console.log(e);
      }
    }
  }, []);

  useEffect(() => {
    // Handle authToken in URL (e.g. from Medeco redirect)
    if (!authToken) return;
    let isEffectActive = true;

    const syncProfileForAuthToken = async () => {
      setToken(authToken);
      localStorage.removeItem(PERSISTANT_STORAGE_KEY_BILL_TOKEN);
      
      if (isReceptionist) return;

      // Only clear cached profile and fetch when the user actually changed
      // so we show the new user and avoid stale data; skip if same user to avoid loading flash
      let tokenDoctorId = null;
      try {
        const decoded = jwtDecode(authToken);
        tokenDoctorId =
          decoded?.result?.doctor_unique_id ?? decoded?.result?.user_id ?? null;
      } catch (_) {
        console.warn("[TP Medeco] Failed to decode authToken");
      }

      try {
        const [{ store }, { clearDoctorProfile, getProfile }] =
          await Promise.all([
            import("./redux/store"),
            import("./redux/doctorsSlice"),
          ]);

        if (!isEffectActive) return;

        const currentProfile = store.getState()?.doctors?.profile;
        const currentDoctorId =
          currentProfile?.doctor_unique_id ?? currentProfile?.user_id ?? null;
        const isSameUser =
          tokenDoctorId &&
          currentDoctorId &&
          String(tokenDoctorId) === String(currentDoctorId);

        if (!isSameUser) {
          store.dispatch(clearDoctorProfile());
          store.dispatch(getProfile());
        }
      } catch (error) {
        console.warn("[TP Medeco] Failed to sync profile for authToken", error);
      }
    };

    syncProfileForAuthToken();

    return () => {
      isEffectActive = false;
    };
  }, [authToken, setToken]);

  useTncConsent({
    authToken,
    getToken,
    setToken,
    isLoginPage,
    isReceptionist,
    pathname: location.pathname,
  });

  useEffect(() => {
    if (authToken && !isReceptionist) {
      const params = new URLSearchParams(location.search);
      const mrnNoParam = mrnNo || params.get("mrnNo");
      params.delete("authToken");
      const afterSearch = params.toString();
      if (location.pathname === "/patient_details" && mrnNoParam) {
        navigate(
          {
            pathname: "/patient_details",
            search: params.toString(),
          },
          { replace: true, state: { mrnNo: mrnNoParam } }
        );
        return;
      }
      if (location.pathname !== "/our-offerings" && location.pathname !== "/abha-standalone") {
        navigate(
          {
            pathname: "/",
            search: afterSearch,
          },
          { replace: true }
        );
      }
    }
  }, [authToken, navigate, location.pathname, location.search, isReceptionist, mrnNo]);

  useEffect(() => {
    if (uploadParams) {
      localStorage.setItem("uploadParams", uploadParams);
      // navigate(
      //   {
      //     pathname: location.pathname,
      //   },
      //   { replace: true }
      // );
    }
  }, [uploadParams]);

  useEffect(() => {
    if (ophthalUploadParams) {
      localStorage.setItem("ophthalUploadParams", ophthalUploadParams);
    }
  }, [ophthalUploadParams]);

  // Add effect to handle redirectTo parameter
  useEffect(() => {
    if (redirectTo) {
      localStorage.setItem("redirectTo", redirectTo);

      // Clean up URL but preserve other params
      const params = new URLSearchParams(location.search);
      params.delete("redirectTo");
      setRedirectReady(true);
      // Update URL without the redirectTo parameter
      navigate(
        {
          pathname: location.pathname,
          search: params.toString(),
        },
        { replace: true }
      );
    } else {
      setRedirectReady(false);
    }
  }, []);

  // Determine where to redirect on root path
  useEffect(() => {
    // DEMO build: no login flow — '/' renders the demo landing page (the
    // OPD / IPD module picker); no auth-driven redirection applies.
    if (DEMO) return;
    // Skip redirection for receptionist or non-relevant paths
    if (isReceptionist || (!isRootPath && !isLoginPage)) {
      return;
    }

    // Check authentication and get stored redirect path
    const hasAuth = token || authToken;
    const localRedirectTo = localStorage.getItem("redirectTo");

    // Handle unauthenticated users
    if (!hasAuth) {
      const urlParams = new URLSearchParams(window.location.search);

      // Only collect UTM params that have values
      const utmParams = new URLSearchParams();
      [
        "utm_source",
        "utm_campaign",
        "utm_medium",
        "utm_content",
        "utm_term",
      ].forEach((param) => {
        const value = urlParams.get(param);
        if (value) {
          utmParams.append(param, value);
        }
      });

      // Construct login URL with UTM parameters
      const loginUrl =
        "/login" + (utmParams.toString() ? "?" + utmParams.toString() : "");

      navigate(loginUrl);
      return;
    }

    if (isMobileOrPWA) {
      if (localRedirectTo && localRedirectTo !== "/" && localRedirectTo !== "") {
        if (localRedirectTo === "profile") {
          navigate("/doctor_profile");
          localStorage.removeItem("redirectTo");
          setRedirectReady(false);
        } else if (redirectReady && localRedirectTo) {
          navigate(localRedirectTo);
          localStorage.removeItem("redirectTo");
          setRedirectReady(false);
        } else {
          navigate("/");
        }
      } else {
        if (location.pathname !== "/") {
          navigate("/");
        }
      }
      return;
    }

    if (isChrome || isSafari) {
      // Determine and execute redirection
      const redirectPath =
        localRedirectTo === "profile"
          ? "/doctor_profile"
          : redirectReady
            ? localRedirectTo
            : "/";

      // Clean up localStorage if redirecting to profile
      if (localRedirectTo === "profile" || redirectReady) {
        localStorage.removeItem("redirectTo");
        setRedirectReady(false);
      }

      navigate(redirectPath);
    }
  }, [isRootPath, token, authToken, navigate, redirectTo, redirectReady, isMobileOrPWA, location.pathname]);

  //Upgraded Services Modal
  const upgrade_services = searchParams.get("upgrade_services");
  const service_list = searchParams.get("service_list");
  const [isUpgradeModal, setIsUpgradeModal] = useState(false);
  const [upgradeList, setUpgradeList] = useState(null);

  useEffect(() => {
    if (upgrade_services) {
      setIsUpgradeModal(true);
      setUpgradeList(service_list.split(",").map((s) => s.trim()));
      searchParams.delete("upgrade_services");
      searchParams.delete("service_list");
      navigate("/", { replace: true });
    }
  }, [upgrade_services]);

  const handleUpgradeModal = () => {
    setIsUpgradeModal(false);
  };

  const appRoutes = (
    <Suspense fallback={<FullPageLoader />}>
      <SentryRoutes>
        {/* Public route */}
        <Route path="/login" element={<Onboarding />} />
        <Route path="/our-offerings" element={<OurOffering />} />
        <Route path="/final-setup" element={<FinalSetup />} />

        {/* Restricted route - authorized only to get/upload snapRx files */}
        <Route path="snap-rx/mobile-upload" element={<UploadRx />} />
        <Route
          path="ophthal-snap-rx/mobile-upload"
          element={<OphthalUploadRx />}
        />

        {/* ABHA Standalone - Can work with URL auth token */}
        <Route path="/abha-standalone" element={<AbhaStandalone />} />

        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          {/* DEMO build: '/' is the demo landing page (OPD / IPD picker) and
              every unknown route falls back to it — the EMR home is not part
              of the demo. Production keeps the appointment-list home. */}
          {DEMO && <Route path="/" element={<DemoLanding />} />}
          {DEMO ? (
            <Route path="/*" element={<Navigate to="/" replace />} />
          ) : (
            <Route path="/*" element={<AppointmentList />} />
          )}
          <Route
            path="create-campaign"
            element={<MessageCreateCampaign />}
          />
          <Route 
            path="patient_details" 
            element={
              isMobileDevice && !isTablet ? (
                <MobilePatientDetails />
              ) : (
                <PatientDetails />
              )
            } 
          />
          <Route
            path="prescription"
            element={<PrescriptionRouteElement />}
          />
          <Route
            path="prescription_print_view"
            element={<PrescriptionPrintView />}
          />
          <Route
            path="configure_print_setting"
            element={<ConfigurePrintSetting />}
          />
          <Route path="certificate" element={<MedicalCertificate />} />
          <Route
            path="certificate_print_view"
            element={<CertificatePrintView />}
          />
          <Route
            path="smart-prescription"
            element={<SmartPrescription />}
          />
          <Route path="tab-rx-prescription" element={<TabRxPrescriptionPrintView />} />
          <Route path="print-smart-rx" element={<SmartRxPreview />} />
          <Route path="doctor_profile" element={<DoctorProfile />} />
          <Route
            path="doctor_website_setting"
            element={<DoctorWebsiteSetting />}
          />
          <Route path="smart-rx-digitise" element={<SmartRxDigitise />} />
          <Route
            path="apollo-consultations"
            element={<ApolloConsultations />}
          />
          <Route path="analytics" element={<AnalyticsWorkspace />} />
          <Route path="analytics/ipd" element={<AnalyticsWorkspace />} />
          <Route
            path="gen-rx-print"
            element={<GenRxPrescriptionPrintView />}
          />
          <Route
            path="billing-dashboard"
            element={<BillingDashboard />}
          />
          <Route 
            path="all_patients" 
            element={(isMobile && !isTablet) ? <MobileAllPatients /> : <AllPatients />} 
          />
          <Route path="billing-settings" element={<BillingSettings />} />
          <Route path="add-appointment" element={<AddAppointment />} />
          {(isReceptionist || (isMobile && !isTablet)) ? <Route path="add_patient" element={<AddNewPatient />} /> : null}
          <Route path="snap-rx" element={<SnapRx />} />
          <Route path="snap-rx/preview" element={<SnapRxPreview />} />
          <Route path="snap-rx/digitise" element={<SnapRxDigitise />} />
          <Route path="ophthal-snap-rx" element={<OphthalSnapRx />} />
          <Route 
            path="voice-rx-consult" 
            element={
              isMobileDevice && !isTablet ? (
                <MobileVoiceRxConsult />
              ) : (
                <VoiceRxConsult />
              )
            } 
          />
          <Route path="voice-recording" element={<MobileVoiceRecording />} />
          <Route
            path="get-unlimited-access"
            element={<GetUnlimitedAccess />}
          />
          <Route
            path="appointment-agent"
            element={<AppointmentAgent />}
          />
          <Route
            path="appointment-agent/success"
            element={<AppointmentSuccess />}
          />
          <Route
            path="abha-records/health-records"
            element={<HealthRecords />}
          />
          <Route path="tab-rx" element={<TabRx />} />
          <Route path="tab-rx-canvas" element={<TabRxCanvas />} />
          <Route
            path="tabrx-digitization"
            element={<TabRxDigitization />}
          />
        </Route>
        <Route path="opd-bill" element={<OpdBill />} />
      </SentryRoutes>
    </Suspense>
  );


  return (
    <GrowthBookProvider growthbook={growthbook}>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={(error) => {
          // You can also log the error to an error reporting service like AppSignal
          // logErrorToMyService(error, errorInfo);
          console.error(error);
        }}
        onReset={(details) => {
          // Reset the state of your app so the error doesn't happen again
          console.error(details);
        }}
      > 
        {!DEMO && !isLoginPage && !isMobileOrPWA && (
          <Suspense fallback={null}>
            <TalkativeWidget
              region="au"
              configUuid="3f5d31d7-aae5-43f2-903a-2dc2d90a36f3"
            />
          </Suspense>
        )}
        {isLoginPage ? (
          appRoutes
        ) : (
          <Suspense fallback={<FullPageLoader />}>
            <AppStoreProvider>
              {/* DEMO build: skip the live-service chrome (teleconsult sync,
                  plan banners, doctor modal) — there is no backend to talk to. */}
              {!DEMO && <GrowthBookPhoneSync />}
              {!DEMO && (
                <Suspense fallback={null}>
                  <AppTeleconsultBootstrap />
                </Suspense>
              )}
              {!DEMO && (
                <Suspense fallback={null}>
                  <div
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 199,
                    }}
                  >
                    {!isMobileOrPWA && (
                      <>
                        <DemoExpirationBanner />
                        <PlanExpirationBanner />
                        <ExpiredPlanCard />
                      </>
                    )}
                    <DoctorModal />
                    <BottomSheetManager />
                  </div>
                </Suspense>
              )}
              {isUpgradeModal && (
                <Suspense fallback={null}>
                  <UpgradeServicesModal
                    isUpgradeModal={isUpgradeModal}
                    upgradeList={upgradeList}
                    handleUpgradeModal={handleUpgradeModal}
                  />
                </Suspense>
              )}
              {appRoutes}
            </AppStoreProvider>
          </Suspense>
        )}
        <div className="no-print app-version-tag">
          v2.1.17
        </div>
      </ErrorBoundary>
    </GrowthBookProvider>
  );
}

export default App;
