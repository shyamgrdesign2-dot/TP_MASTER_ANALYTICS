import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureIsOn } from "@growthbook/growthbook-react";

import { GB_VOICE_RX_NEW_UI } from "./constants";

export function getVoiceRxNavigationPath(isVoiceRxNewFromGB) {
  return isVoiceRxNewFromGB ? "/prescription" : "/voice-rx-consult";
}

export function getVoiceRxNavigationState(isVoiceRxNewFromGB, state = {}, voiceRxEntryPoint) {
  return {
    ...(state || {}),
    ...(isVoiceRxNewFromGB
      ? {
          isVoiceRxNewUiFlow: true,
          ...(voiceRxEntryPoint ? { voiceRxEntryPoint } : {}),
        }
      : {}),
  };
}

export function useVoiceRxNavigation() {
  const navigate = useNavigate();
  const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);

  return useCallback(
    (state = {}, options = {}, voiceRxEntryPoint) => {
      navigate(getVoiceRxNavigationPath(isVoiceRxNewFromGB), {
        ...options,
        state: getVoiceRxNavigationState(isVoiceRxNewFromGB, state, voiceRxEntryPoint),
      });
    },
    [isVoiceRxNewFromGB, navigate]
  );
}
