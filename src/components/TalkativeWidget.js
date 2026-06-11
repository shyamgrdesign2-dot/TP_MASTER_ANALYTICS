import { useEffect, useMemo } from "react";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { useLocation } from "react-router-dom";
import { GB_TALKATIVE, HIDE_ROUTES } from "../utils/constants";

const TALKATIVE_SCRIPT_ID = "talkative-widget-script";
const TALKATIVE_ARTIFACT_SELECTORS = [
  `#${TALKATIVE_SCRIPT_ID}`,
  'script[src*="engage.app/api/ecs/v1/loader"]',
  'script[src*="talkative-cdn.com"]',
  'iframe[src*="engage.app"]',
  'iframe[src*="talkative"]',
  '[data-talkative]',
  '[id^="talkative"]',
  '[id*="talkative"]',
  '[id^="Talkative"]',
  '[id*="Talkative"]',
  '[class^="talkative"]',
  '[class*=" talkative"]',
  '[class^="Talkative"]',
  '[class*=" Talkative"]',
];

function getTalkativeApi() {
  return window.talkativeApi || window.talaktiveApi;
}

function deactivateTalkativeWidget() {
  const talkativeApi = getTalkativeApi();
  talkativeApi?.ui?.hide?.();
  talkativeApi?.ui?.deactivate?.();
}

function activateTalkativeWidget() {
  const talkativeApi = getTalkativeApi();
  talkativeApi?.ui?.activate?.();
}

function removeTalkativeArtifacts() {
  TALKATIVE_ARTIFACT_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.parentNode?.removeChild(node);
    });
  });
}

function cleanupTalkativeWidget() {
  deactivateTalkativeWidget();
  removeTalkativeArtifacts();
}

const TalkativeWidget = ({
  region = "eu",
  configUuid = "3f5d31d7-aae5-43f2-903a-2dc2d90a36f3",
}) => {
  const location = useLocation();

  const shouldHideWidget = useMemo(() => {
    return HIDE_ROUTES.TALKATIVE.some(
      (route) =>
        location.pathname.includes(route)
    );
  }, [location.pathname]);

  const isTalktiveAccessableFromGB = useFeatureIsOn(GB_TALKATIVE);

  const scriptSrc = useMemo(() => {
    return `https://${region}.engage.app/api/ecs/v1/loader/${configUuid}.js?path=${encodeURIComponent(
      window.location.origin + window.location.pathname
    )}&selectedVersion=${
      new URLSearchParams(window.location.search).get("ecsSelectedVersion") ||
      ""
    }`;
  }, [region, configUuid, location.pathname, location.search]);

  useEffect(() => {
    if (!isTalktiveAccessableFromGB || shouldHideWidget) {
      cleanupTalkativeWidget();
      const cleanupTimer = window.setTimeout(cleanupTalkativeWidget, 500);
      return () => window.clearTimeout(cleanupTimer);
    }

    const existingScript = document.getElementById(TALKATIVE_SCRIPT_ID);
    if (existingScript?.src === scriptSrc) {
      activateTalkativeWidget();
      return () => {
        cleanupTalkativeWidget();
      };
    }

    if (existingScript) {
      existingScript.parentNode?.removeChild(existingScript);
    }

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.id = TALKATIVE_SCRIPT_ID;
    script.addEventListener("load", activateTalkativeWidget);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", activateTalkativeWidget);
      cleanupTalkativeWidget();
    };
  }, [isTalktiveAccessableFromGB, scriptSrc, shouldHideWidget]);

  return null;
};

export default TalkativeWidget;
