import { useEffect, useRef, useState } from "react";
import { cn } from "../../../utils";

import { ChatBubble } from "./ChatBubble";
import { TypingIndicator } from "./TypingIndicator";
import styles from "./ChatThread.module.scss";

export function ChatThread({
  messages,
  isTyping = false,
  onFeedback,
  onPillTap,
  onCopy,
  onSidebarNav,
  className,
  activeSpecialty,
  patientDocuments,
  onPatientSelect,
  typingHint,
  onEditMessage,
}) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  // Track which message IDs have already been "seen" — skip animation for those
  const seenRef = useRef(new Set());
  const prevMessageCountRef = useRef(0);
  const [, forceRender] = useState(0);

  // Mark all current messages as seen on mount (so initial load doesn't animate)
  useEffect(() => {
    if (seenRef.current.size === 0 && messages.length > 0) {
      messages.forEach((m) => seenRef.current.add(m.id));
      forceRender((n) => n + 1);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on typing indicator OR when a new voice-entry user message lands
  useEffect(() => {
    const prev = prevMessageCountRef.current;
    const lastMessage = messages[messages.length - 1];
    const landedVoice =
      messages.length > prev &&
      lastMessage?.voiceEntryAnimation;
    const landedShimmerAssistant =
      messages.length > prev &&
      lastMessage?.role === "assistant" &&
      lastMessage?.shimmerReveal;
    if (isTyping || landedVoice || landedShimmerAssistant) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, isTyping]);

  return (
    <div
      ref={containerRef}
      className={cn(styles.threadRoot, className)}
    >
      {messages.map((message, index) => {
        // Voice cards in chat history: only the LATEST voice_structured_rx is kept.
        const isStaleVoiceCard =
          message.rxOutput?.kind === "voice_structured_rx" &&
          messages.some(
            (m, i) => i > index && m.rxOutput?.kind === "voice_structured_rx"
          );
        if (isStaleVoiceCard) return null;

        const prevMessage = index > 0 ? messages[index - 1] : null;
        const isSameRole = prevMessage?.role === message.role;
        const spacing =
          index === 0 ? "" : isSameRole ? styles.spacingSame : styles.spacingDiff;

        const isNew = !seenRef.current.has(message.id);
        const isAssistant = message.role === "assistant";
        if (isNew) seenRef.current.add(message.id);
        const animate = isNew && isAssistant && !message.text;
        const voiceEnter = isNew && !isAssistant && message.voiceEntryAnimation;

        return (
          <div
            key={message.id}
            className={cn(
              spacing,
              animate && "chat-stream-in",
              voiceEnter && "chat-voice-in"
            )}
            style={
              animate
                ? {
                    animationDelay: `${
                      (index - (messages.length - 1)) * 0 + 50
                    }ms`,
                  }
                : undefined
            }
          >
            <ChatBubble
              message={message}
              isStale={isStaleVoiceCard}
              onFeedback={onFeedback}
              onPillTap={onPillTap}
              onCopy={onCopy}
              onSidebarNav={onSidebarNav}
              activeSpecialty={activeSpecialty}
              patientDocuments={patientDocuments}
              onPatientSelect={onPatientSelect}
              onEditMessage={onEditMessage}
            />
          </div>
        );
      })}

      {/* Typing indicator — contextual thinking state */}
      {isTyping && (
        <div className={styles.typingWrap}>
          <TypingIndicator queryHint={typingHint} />
        </div>
      )}

      {/* Bottom sentinel for auto-scroll */}
      <div ref={bottomRef} />

      {/* Stream-in animation for new assistant messages */}
      {/* da-* styles live in globals.css */}
    </div>
  );
}
