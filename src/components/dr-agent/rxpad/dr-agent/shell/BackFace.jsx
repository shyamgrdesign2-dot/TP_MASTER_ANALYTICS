import React from "react";
import { cn } from "../../../utils";
import { VoiceRxCanvas } from "../../../voicerx/VoiceRxCanvas";
import { VoiceRxActiveAgent } from "../../../voicerx/VoiceRxActiveAgent";
import { VoiceStructuredRxCard } from "../cards/action/VoiceStructuredRxCard";
import { SoapNoteCard } from "../../../voicerx/SoapNoteCard";
import { useDispatch, useSelector } from "react-redux";
import { updateVoiceSoapHtml } from "../../../../../redux/voiceDigitizationSlice";

class VoiceErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[VoiceRx] render crashed:", error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Voice consultation could not start</div>
          <div style={{ fontSize: 12, color: "#64748b", maxWidth: 280, lineHeight: 1.5 }}>{String(this.state.error?.message || this.state.error)}</div>
          <button type="button" onClick={() => { this.setState({ error: null }); this.props.onCancel?.(); }} style={{ padding: "8px 16px", borderRadius: 8, background: "#4B4AD5", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Close</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function BackFace({
  isFlipped,
  isPanelVisible,
  voiceRxResult,
  voiceRxDialogChoice,
  voiceRxLiveTranscript,
  voiceRxSubmittedTranscript,
  voiceRxProcessingTranscript,
  voiceRxAwaitingResponse,
  voiceRxHandoffExiting,
  patientName,
  patientId,
  doctorId,
  onCancel,
  onSubmit,
  onCollapse,
  onExpand,
  onPauseChange,
  onBack,
  onMinimize,
  onAddDetailsByVoice,
  onQuickEditSubmit,
  onCopyResult,
  onCopyAll,
  voiceLocked = false,
}) {
  const dispatch = useDispatch();
  const liveSoapHtml = useSelector((s) => s.voiceDigitization?.soapHtml || "");
  const liveSoapRaw = useSelector((s) => s.voiceDigitization?.soap || null);
  const voiceSessionId = useSelector((s) => s.voiceDigitization?.sessionId);
  // liveSoapHtml updates on every RichEditor edit; prefer over the static voiceRxResult snapshot
  const effectiveSoapHtml = liveSoapHtml || voiceRxResult?.soapHtml || "";
  const effectiveSoap = voiceRxResult?.soap || liveSoapRaw;
  const effectiveSoapStatus = voiceRxResult?.soapStatus || (effectiveSoap || effectiveSoapHtml ? "fulfilled" : undefined);
  return (
    <div
      className={cn(
        "absolute inset-0 w-full h-full bg-white",
        (!isFlipped || !isPanelVisible) && "pointer-events-none invisible"
      )}
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(180deg) translate3d(0,0,1px)",
        WebkitTransform: "rotateY(180deg) translate3d(0,0,1px)",
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        background: "#fff",
      }}
    >
      <div style={{ height: "100%", width: "100%", overflow: "hidden" }}>
        {isFlipped && voiceRxResult ? (
          <VoiceRxCanvas
            modeLabel={voiceRxResult.modeLabel}
            transcript={voiceRxResult.transcript}
            transcriptSegments={voiceRxResult.transcriptSegments}
            emrCard={
              <VoiceStructuredRxCard
                data={voiceRxResult.structured}
                onCopy={onCopyResult}
                hideHeader={true}
              />
            }
            soapCard={
              <SoapNoteCard
                status={effectiveSoapStatus}
                html={effectiveSoapHtml}
                error={voiceRxResult.soapError}
                onChange={(html) => dispatch(updateVoiceSoapHtml(html))}
              />
            }
            soapStatus={effectiveSoapStatus}
            soapHtml={effectiveSoapHtml}
            onCopyToRx={onCopyAll}
            onBack={onBack}
            onMinimize={onMinimize}
            onAddDetailsByVoice={onAddDetailsByVoice}
            onQuickEditSubmit={onQuickEditSubmit}
            audioChunkContext={{
              sessionId: voiceSessionId,
              doctorId,
              patientId,
            }}
            voiceLocked={voiceLocked}
          />
        ) : isFlipped ? (
          <VoiceErrorBoundary onCancel={onCancel}>
            <VoiceRxActiveAgent
              mode={voiceRxDialogChoice}
              sectionLabel="Dr Agent"
              transcript={voiceRxLiveTranscript}
              submittedTranscript={voiceRxSubmittedTranscript}
              processingTranscript={voiceRxProcessingTranscript}
              isAwaitingResponse={voiceRxAwaitingResponse}
              isHandoffExiting={voiceRxHandoffExiting}
              onCancel={onCancel}
              onSubmit={onSubmit}
              onCollapse={onCollapse}
              onExpand={onExpand}
              isPanelVisible={isPanelVisible}
              onPauseChange={onPauseChange}
              patientName={patientName}
              audioChunkContext={{
                sessionId: voiceSessionId,
                doctorId,
                patientId,
              }}
            />
          </VoiceErrorBoundary>
        ) : null}
      </div>
    </div>
  );
}
