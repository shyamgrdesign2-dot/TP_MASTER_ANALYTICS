import React from "react";
import { DrAgentPanel } from "../DrAgentPanel";
import { useRxPadSync } from "../RxPadSyncContext";
import { DrAgentFab } from "./DrAgentFab";
import styles from "./DrAgentRuntime.module.scss";

export function DrAgentRuntime({
  isOpen,
  onOpen,
  onClose,
  overlayClassName,
  patientId,
  doctorId,
  patientData,
  voiceHydrationStatus,
  symptomCollectorStatus
}) {
  const {
    collapsedVoiceSession,
    activeVoiceModule,
    headerDictation,
    copyOverlayActive,
    requestVoicePauseToggle,
    requestVoiceSubmit
  } = useRxPadSync();

  const headerDictationBusy = headerDictation?.status === "recording" || headerDictation?.status === "transcribing";
  const collapsedVoiceActive = !isOpen && !!collapsedVoiceSession.active;
  const showPageAura = collapsedVoiceActive || copyOverlayActive;
  const showIdleFab = !isOpen && !collapsedVoiceSession.active;
  const handleActiveVoiceSubmit = () => {
    onOpen?.();
    requestVoiceSubmit();
  };

  return (
    <>
      {showPageAura && (
        <div
          className={[
            styles.activeBackdrop,
            copyOverlayActive && !collapsedVoiceActive ? styles.copyBackdrop : ""
          ].filter(Boolean).join(" ")}
          data-dr-agent="true"
          aria-hidden="true"
        />
      )}

      <div
        className={[
          overlayClassName,
          !isOpen ? styles.hiddenPanel : ""
        ].filter(Boolean).join(" ")}
        data-dr-agent="true"
      >
        <DrAgentPanel
          isPanelVisible={isOpen}
          voiceRxMode
          patientId={patientId}
          doctorId={doctorId}
          patientData={patientData}
          voiceHydrationStatus={voiceHydrationStatus}
          symptomCollectorStatus={symptomCollectorStatus}
          onClose={onClose}
          onOpen={onOpen}
        />
      </div>

      {showIdleFab && (
        <DrAgentFab disabled={!!activeVoiceModule || headerDictationBusy} onClick={onOpen} />
      )}

      {collapsedVoiceActive && (
        <DrAgentFab
          activeVoiceSession
          activeVoicePaused={!!collapsedVoiceSession.paused}
          activeVoiceStatusLabel={collapsedVoiceSession.statusLabel}
          activeVoiceElapsedLabel={collapsedVoiceSession.elapsedLabel}
          activeVoiceAudioLevel={collapsedVoiceSession.audioLevel}
          onPauseToggle={requestVoicePauseToggle}
          onActiveSubmit={handleActiveVoiceSubmit}
          onClick={onOpen}
        />
      )}
    </>
  );
}
