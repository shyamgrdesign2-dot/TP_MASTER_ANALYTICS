import {
  AISENSY_SCRIPT_CONTAINER,
  AISENSY_SCRIPT_ID,
  AISENSY_SCRIPT_SRC,
} from "./constants";

export const aisensybotInjection = (isLoginFlow) => {
  if (isLoginFlow) {
    const existingScript = document.getElementById(AISENSY_SCRIPT_ID);
    if (existingScript) {
      document.body.removeChild(existingScript);
    }

    const widget = document.querySelector(AISENSY_SCRIPT_CONTAINER);
    if (widget) widget.remove();
    if (typeof window.dfToggle === "function") {
      window.dfToggle = () => {};
    }
    return;
  }

  if (!document.getElementById(AISENSY_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.src = AISENSY_SCRIPT_SRC;
    script.id = AISENSY_SCRIPT_ID;
    script.setAttribute("widget-id", "aaa4hg");
    script.async = true;
    document.body.appendChild(script);
  }
};

export const detectOperatingSystem = () => {
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;

  const os = {
    Windows: /Win/.test(platform),
    MacOS: /Mac/.test(platform),
    Linux: /Linux/.test(platform),
    iOS: /iPhone|iPad|iPod/.test(userAgent),
    Android: /Android/.test(userAgent),
  };

  return Object.keys(os).find((key) => os[key]) || "Unknown";
};
