import React, { useEffect } from "react";
import { message } from "antd";
import { cn } from "../../utils";
import styles from "./DrAgentPanel.module.scss";

import { useRxPadSync } from "./RxPadSyncContext";
import { VoiceRxBottomSheet } from "../../voicerx/VoiceRxBottomSheet";
import { toast } from "../../voicerx/toast";
import { AgentHeader } from "./shell/AgentHeader";
import { SessionHistoryDrawer } from "./shell/SessionHistoryDrawer";
import { ChatThread } from "./chat/ChatThread";
import { DocumentBottomSheet } from "./chat/DocumentBottomSheet";
import { VoiceEmptyState } from "./shell/VoiceEmptyState";
import { BackFace } from "./shell/BackFace";
import { FooterBar } from "./shell/FooterBar";

import { VOICE_RX_CONSULT_OPTIONS } from "./constants";
import { useDrAgentPanel } from "./hooks/useDrAgentPanel";

function isVitalsCopyPayload(payload) {
  const digitization = payload?.digitization;
  return Boolean(
    digitization?.vitals_and_body_composition ||
    digitization?.vitalsAndBodyComposition ||
    digitization?.vitals ||
    payload?.vitals_and_body_composition ||
    payload?.vitalsAndBodyComposition ||
    payload?.vitals
  );
}

export function DrAgentPanel({
  onClose,
  onOpen,
  isPanelVisible = true,
  initialPatientId,
  voiceRxMode = false,
  onVoiceCaptureModeChange,
  headerBrandTitle,
  autoOpenBottomSheet = false,
  patientId,
  doctorId,
  patientData,
  voiceHydrationStatus,
  symptomCollectorStatus
}) {
  const {
    // State
    selectedPatientId,
    messages,
    isTyping,
    typingHint,
    activeSpecialty,
    setActiveSpecialty,
    doctorViewType,
    intakeMode,
    inputValue,
    setInputValue,
    isPrefilled,
    setIsPrefilled,
    isSessionHistoryOpen,
    setIsSessionHistoryOpen,
    showAttachPanel,
    setShowAttachPanel,
    showDocBottomSheet,
    setShowDocBottomSheet,
    voiceRxDialogOpen,
    setVoiceRxDialogOpen,
    voiceRxDialogChoice,
    setVoiceRxDialogChoice,
    voiceRxRecording,
    setVoiceRxRecording,
    beginVoiceAddOn,
    submitQuickEdit,
    flipDeg,
    voiceRxAwaitingResponse,
    voiceRxHandoffExiting,
    voiceRxResult,
    setVoiceRxResult,
    voiceRxResultMinimized,
    setVoiceRxResultMinimized,
    voiceRxLiveTranscript,
    voiceRxSubmittedTranscript,
    voiceRxProcessingTranscript,
    blockedVoiceToast,
    setBlockedVoiceToast,
    chipShaking,
    // Computed
    patient,
    summary,
    voiceEmptyState,
    voiceFirstTimeMode,
    glanceInlinePillsActive,
    pills,
    availableSpecialties,
    showDoctorViewSelector,
    patientDocuments,
    isFlipped,
    // Handlers
    handleSend,
    handlePillTap,
    handleFeedback,
    handlePatientSelect,
    handleCopy,
    handleSidebarNav,
    handleChatPillTap,
    handleDoctorViewChange,
    handleIntakeModeChange,
    handlePatientChange,
    handleLockedChipClick,
    handleEditMessage,
    handleAttach,
    handleSendDocuments,
    handleUploadNew,
    handleFileInputChange,
    handleAttachSelect,
    handleVoiceTranscription,
    handleVoiceRxPauseChange,
    confirmVoiceRxConsult,
    cancelVoiceRxRecording,
    submitVoiceRxRecording,
    handleViewPatientDetails,
    // Refs
    chatScrollRef,
    fileInputRef,
    // RxPad sync
    runCopyWithAura,
    pushHistoricalUpdates
  } = useDrAgentPanel({
    voiceRxMode,
    onVoiceCaptureModeChange,
    initialPatientId,
    isPanelVisible,
    autoOpenBottomSheet,
    onClose,
    onOpen,
    patientId,
    doctorId,
    patientData,
    voiceHydrationStatus,
    symptomCollectorStatus,
  });

  const { activeVoiceModule, headerDictation } = useRxPadSync();
  const headerDictationBusy = headerDictation?.status === "recording" || headerDictation?.status === "transcribing";
  const voiceLocked = !!activeVoiceModule || headerDictationBusy;

  useEffect(() => {
    toast.setHandler(({ type, msg }) => {
      const notify = message[type] || message.info;
      notify({ content: msg, duration: 2.5 });
    });
    return () => toast.setHandler(null);
  }, []);

  return (
    <div
      id="dr-agent-panel-root"
      className={styles.panelRoot}>

      {/* 3D Wrapper — perspective + preserve-3d in CSS; only dynamic rotateY inline */}
      <div
        className={styles.flipWrapper}
        style={{ "--flip-deg": `${flipDeg}deg` }}>

        {/* FRONT FACE */}
        <div
          className={cn(styles.frontFace, isFlipped && styles.frontFaceHidden)}>

          <div className={styles.frontInner}>

            {/* Animated TP AI gradient wash */}
            <div className="vrx-da-gradient-wash pointer-events-none absolute inset-0 z-0" aria-hidden />

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className={styles.fileInput}
              onChange={handleFileInputChange}
            />

            {/* Chat area */}
            <div className={styles.chatArea}>

              <div ref={chatScrollRef} className={cn("da-chat-scroll", styles.chatScroll)}>

                {/* Sticky liquid-glass header */}
                <div className={styles.headerSticky}>
                  <AgentHeader
                    availableSpecialties={availableSpecialties}
                    activeSpecialty={activeSpecialty}
                    onSpecialtyChange={setActiveSpecialty}
                    onPatientChange={handlePatientChange}
                    selectedPatientId={selectedPatientId}
                    onClose={onClose}
                    doctorViewType={doctorViewType}
                    onDoctorViewChange={handleDoctorViewChange}
                    showDoctorViewSelector={showDoctorViewSelector}
                    onViewSessionHistory={() => setIsSessionHistoryOpen(true)}
                    intakeMode={intakeMode}
                    onIntakeModeChange={handleIntakeModeChange}
                    brandTitle={headerBrandTitle}
                  />
                </div>

                {voiceEmptyState ? (
                  <VoiceEmptyState
                    onStartVoice={() => setVoiceRxDialogOpen(true)}
                    onViewPatientDetails={handleViewPatientDetails}
                    hasSymptomCollectorData={!!summary.symptomCollectorData}
                    voiceLocked={voiceLocked}
                  />
                ) : (
                  <ChatThread
                    messages={messages}
                    isTyping={isTyping || voiceRxAwaitingResponse}
                    typingHint={typingHint}
                    onFeedback={handleFeedback}
                    onPillTap={handleChatPillTap}
                    onCopy={handleCopy}
                    onSidebarNav={handleSidebarNav}
                    className={styles.chatThreadFlex}
                    activeSpecialty={activeSpecialty}
                    patientDocuments={patientDocuments}
                    onPatientSelect={handlePatientSelect}
                    onEditMessage={handleEditMessage}
                  />
                )}
              </div>
            </div>

            <FooterBar
              voiceRxMode={voiceRxMode}
              voiceRxRecording={voiceRxRecording}
              voiceFirstTimeMode={voiceFirstTimeMode}
              pills={pills}
              messages={messages}
              isTyping={isTyping}
              glanceInlinePillsActive={glanceInlinePillsActive}
              showAttachPanel={showAttachPanel}
              inputValue={inputValue}
              isPrefilled={isPrefilled}
              isDisabled={isTyping || voiceRxAwaitingResponse}
              patientLabel={patient.label}
              patientGender={patient.gender}
              patientAge={patient.age}
              onPillTap={handlePillTap}
              onAttachSelect={handleAttachSelect}
              onAttachClose={() => setShowAttachPanel(false)}
              onStartVoice={() => setVoiceRxDialogOpen(true)}
              onInputChange={(v) => { setInputValue(v); if (isPrefilled) setIsPrefilled(false); }}
              onSend={() => { setIsPrefilled(false); handleSend(); }}
              onAttach={handleAttach}
              onVoiceTranscription={handleVoiceTranscription}
              onLockedChipClick={handleLockedChipClick}
              voiceLocked={voiceLocked}
            />

            {/* Document Bottom Sheet */}
            {showDocBottomSheet && (
              <DocumentBottomSheet
                documents={patientDocuments}
                onSendDocuments={handleSendDocuments}
                onUploadNew={handleUploadNew}
                onClose={() => setShowDocBottomSheet(false)}
                patientFirstName={patient?.label?.split(" ")[0]}
              />
            )}

            <SessionHistoryDrawer
              open={isSessionHistoryOpen}
              onOpenChange={setIsSessionHistoryOpen}
              patientName={patient.label}
              patientMeta={[patient.gender, patient.age ? `${patient.age}y` : null].filter(Boolean).join(" · ")}
            />

            {voiceRxMode && (
              <VoiceRxBottomSheet
                isOpen={voiceRxDialogOpen}
                onClose={() => setVoiceRxDialogOpen(false)}
                consultOptions={VOICE_RX_CONSULT_OPTIONS}
                selectedOption={voiceRxDialogChoice}
                onSelectOption={setVoiceRxDialogChoice}
                onConfirm={confirmVoiceRxConsult}
              />
            )}

          </div>
        </div>

        <BackFace
          isFlipped={isFlipped}
          isPanelVisible={isPanelVisible}
          voiceRxResult={voiceRxResult}
          voiceRxDialogChoice={voiceRxDialogChoice}
          voiceRxLiveTranscript={voiceRxLiveTranscript}
          voiceRxSubmittedTranscript={voiceRxSubmittedTranscript}
          voiceRxProcessingTranscript={voiceRxProcessingTranscript}
          voiceRxAwaitingResponse={voiceRxAwaitingResponse}
          voiceRxHandoffExiting={voiceRxHandoffExiting}
          patientName={patient.label}
          patientId={patientId}
          doctorId={doctorId}
          onCancel={cancelVoiceRxRecording}
          onSubmit={submitVoiceRxRecording}
          onCollapse={onClose}
          onExpand={onOpen}
          onPauseChange={handleVoiceRxPauseChange}
          onBack={() => setVoiceRxResultMinimized(true)}
          onMinimize={onClose}
          onAddDetailsByVoice={beginVoiceAddOn}
          onQuickEditSubmit={submitQuickEdit}
          voiceLocked={voiceLocked}
          onCopyResult={(payload) => runCopyWithAura(payload, {
            onAfterCopy: isVitalsCopyPayload(payload) ? undefined : () => toast.success("Copied to RxPad")
          })}
          onCopyAll={() => {
            if (!voiceRxResult) return;
            const copyAllPayload = voiceRxResult.digitization
              ? {
                sourceDateLabel: "Voice consult",
                targetSection: "rxpad",
                digitization: voiceRxResult.digitization
              }
              : voiceRxResult.structured?.copyAllPayload;
            if (!copyAllPayload) return;
            runCopyWithAura(copyAllPayload, {
              bulk: true,
              onAfterCopy: () => toast.success("Copied All Fields to RxPad")
            });
            if (voiceRxResult.pendingSidebarBatch) {
              pushHistoricalUpdates(voiceRxResult.pendingSidebarBatch);
              setVoiceRxResult((prev) => prev ? { ...prev, pendingSidebarBatch: undefined } : prev);
            }
          }}
        />

      </div>
      {/* da-* styles live in dr-agent-globals.css */}
    </div>
  );
}
