import { useState } from "react";
import { ArrowLeft2, ArrowRight2, CloseCircle, Microphone2, Note1, User } from "iconsax-reactjs";
import { cn } from "../../../utils";
import {
  Drawer as TPDrawer,
  DrawerContent as TPDrawerContent,
} from "../../../molecules/Drawer";
import styles from "./SessionHistoryDrawer.module.scss";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_SESSIONS = [
  {
    id: "s-2026-10-12",
    dateLabel: "12 Oct'26",
    time: "10:30 AM",
    mode: "Conversation Mode",
    summary: "Follow-up for CKD G5 — pedal oedema worsening, fatigue.",
    transcript: [
      { speaker: "doctor", text: "How are you feeling since the last visit?" },
      {
        speaker: "patient",
        text: "Pedal oedema has come back this past week. Fatigue is also more.",
      },
      { speaker: "doctor", text: "Any breathlessness or chest discomfort?" },
      {
        speaker: "patient",
        text: "Mild breathlessness on exertion. No chest pain.",
      },
      {
        speaker: "doctor",
        text: "Okay, we'll review the diuretic dose and check labs.",
      },
    ],
    tpmr: [
      {
        title: "Subjective",
        bullets: ["Pedal oedema 1 week", "Fatigue 2 weeks", "Reduced appetite 1 week"],
      },
      {
        title: "Objective",
        bullets: ["BP 138/86", "Pulse 84", "SpO₂ 96%"],
      },
      { title: "Assessment", bullets: ["CKD G5 on PD — fluid overload likely"] },
      {
        title: "Plan",
        bullets: [
          "Increase Furosemide to 60mg",
          "Repeat KFT in 1 week",
          "Strict fluid log",
        ],
      },
    ],
    rxSections: [
      {
        title: "Symptoms",
        items: [
          { name: "Pedal oedema", detail: "1 week | Mild | Bilateral" },
          { name: "Fatigue", detail: "2 weeks | Moderate" },
        ],
      },
      {
        title: "Medication (Rx)",
        items: [
          {
            name: "Furosemide 60mg",
            detail: "1 Tablet | 1-0-0 | Empty Stomach | 7 Days",
          },
        ],
      },
    ],
  },
  {
    id: "s-2026-10-10",
    dateLabel: "10 Oct'26",
    time: "2:15 PM",
    mode: "Conversation Mode",
    summary: "Follow-up — PD adequacy review.",
    transcript: [
      {
        speaker: "doctor",
        text: "How is the PD going? Any issues with the catheter site?",
      },
      {
        speaker: "patient",
        text: "No issues. Site is clean. Six exchanges a day as advised.",
      },
      {
        speaker: "doctor",
        text: "Good. Let's continue same regimen and review labs next visit.",
      },
    ],
    tpmr: [
      { title: "Subjective", bullets: ["PD on schedule, no infections"] },
      {
        title: "Plan",
        bullets: ["Continue current PD regimen", "KFT + electrolytes next visit"],
      },
    ],
    rxSections: [],
  },
  {
    id: "s-2026-10-05",
    dateLabel: "05 Oct'26",
    time: "9:00 AM",
    mode: "Dictation Mode",
    summary: "Initial consult — CKD established, baseline workup.",
    transcript: [
      {
        speaker: "doctor",
        text: "76 year old male, known diabetic 18 years, hypertensive 12 years. Presents with fatigue, reduced appetite, mild pedal oedema. Started on Furosemide 40mg, Insulin Glargine 18U. Allergic to iodinated contrast and sulfonamides.",
      },
    ],
    tpmr: [
      {
        title: "Subjective",
        bullets: ["Fatigue, reduced appetite, pedal oedema"],
      },
      {
        title: "Objective",
        bullets: ["BP 142/88", "Cr 5.2 mg/dL", "eGFR 11"],
      },
      { title: "Assessment", bullets: ["CKD Stage 5"] },
      {
        title: "Plan",
        bullets: ["Initiate PD", "Strict glycemic control", "Avoid contrast"],
      },
    ],
    rxSections: [
      {
        title: "Diagnosis",
        items: [
          { name: "CKD Stage 5", detail: "Confirmed | 5 years" },
          { name: "Type 2 Diabetes Mellitus", detail: "Confirmed | 18 years" },
        ],
      },
    ],
  },
];

/** Replace with real data hook when /sessions is wired. */
export function getMockSessions() {
  return MOCK_SESSIONS;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SessionHistoryDrawer({
  open,
  onOpenChange,
  sessions = MOCK_SESSIONS,
  patientName = "Ramesh Kumar",
  patientMeta = "Male · 76y",
}) {
  const [activeId, setActiveId] = useState(null);
  const [detailTab, setDetailTab] = useState("transcript");

  const active = activeId
    ? sessions.find((s) => s.id === activeId) ?? null
    : null;

  function handleOpenChange(next) {
    onOpenChange(next);
    if (!next) {
      setActiveId(null);
      setDetailTab("transcript");
    }
  }

  return (
    <TPDrawer open={open} onOpenChange={handleOpenChange}>
      <TPDrawerContent side="right" size="md" className={styles.drawerContent}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className={styles.drawerHeader}>
          <button
            type="button"
            onClick={() =>
              active
                ? (setActiveId(null), setDetailTab("transcript"))
                : handleOpenChange(false)
            }
            className={styles.headerBackBtn}
            aria-label={
              active ? "Back to session list" : "Close session history"
            }
          >
            {active ? (
              <ArrowLeft2 size={18} variant="Linear" />
            ) : (
              <CloseCircle size={18} variant="Linear" />
            )}
          </button>
          <h2 className={styles.headerTitle}>
            {active
              ? `${active.dateLabel} · ${active.time}`
              : "Session history"}
          </h2>
        </div>
        <div className={styles.divider} />

        {/* ── Patient identity row ───────────────────────────────────── */}
        <div className={styles.patientRow}>
          <span className={styles.patientAvatar}>
            <User size={16} variant="Bulk" />
          </span>
          <div className={styles.patientInfo}>
            <span className={styles.patientName}>{patientName}</span>
            <span className={styles.patientMeta}>{patientMeta}</span>
          </div>
        </div>
        <div className={styles.divider} />

        {/* Slide track */}
        <div className={styles.slideTrack}>
          <div
            className={styles.slidePanes}
            style={{
              transform: active ? "translateX(-50%)" : "translateX(0)",
              transition: "transform 300ms cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {/* ── List pane ──────────────────────────────────────────── */}
            <div className={styles.listPane}>
              <ul className={styles.sessionList}>
                {sessions.map((s) => {
                  const isConversation = s.mode === "Conversation Mode";
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(s.id)}
                        className={styles.sessionRow}
                      >
                        <span
                          className={cn(
                            styles.sessionIcon,
                            isConversation
                              ? styles.sessionIconConversation
                              : styles.sessionIconDictation
                          )}
                        >
                          {isConversation ? (
                            <Microphone2 size={18} variant="Bulk" />
                          ) : (
                            <Note1 size={18} variant="Bulk" />
                          )}
                        </span>
                        <div className={styles.sessionMeta}>
                          <div className={styles.sessionTopRow}>
                            <span className={styles.sessionDate}>
                              {s.dateLabel}
                            </span>
                            <span className={styles.sessionTime}>{s.time}</span>
                          </div>
                          <span
                            className={cn(
                              styles.sessionModeBadge,
                              isConversation
                                ? styles.badgeConversation
                                : styles.badgeDictation
                            )}
                          >
                            {s.mode.replace(" Mode", "")}
                          </span>
                          <span className={styles.sessionSummary}>
                            {s.summary}
                          </span>
                        </div>
                        <ArrowRight2
                          size={14}
                          className={styles.sessionChevron}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* ── Detail pane ─────────────────────────────────────────── */}
            <div className={styles.detailPane}>
              {active ? (
                <div className={styles.detailInner}>
                  {/* Tab strip */}
                  <div className={styles.tabStrip}>
                    {[
                      { id: "transcript", label: "Transcript" },
                      { id: "tpmr", label: "TPMR" },
                      { id: "sections", label: "Sections" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setDetailTab(t.id)}
                        className={cn(
                          styles.tabBtn,
                          detailTab === t.id
                            ? styles.tabBtnActive
                            : styles.tabBtnInactive
                        )}
                      >
                        {t.label}
                        {detailTab === t.id ? (
                          <span className={styles.tabUnderline} />
                        ) : null}
                      </button>
                    ))}
                  </div>

                  <div className={styles.tabContent}>
                    {detailTab === "transcript" ? (
                      <ul className={styles.transcriptList}>
                        {active.transcript.map((line, i) => (
                          <li
                            key={i}
                            className={cn(
                              styles.transcriptLine,
                              line.speaker === "doctor"
                                ? styles.transcriptDoctor
                                : styles.transcriptPatient
                            )}
                            style={{
                              alignSelf:
                                line.speaker === "doctor"
                                  ? "flex-start"
                                  : "flex-end",
                            }}
                          >
                            <span className={styles.transcriptSpeaker}>
                              {line.speaker}
                            </span>
                            <span>{line.text}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {detailTab === "tpmr" ? (
                      <div className={styles.tpmrList}>
                        {active.tpmr.map((section) => (
                          <div key={section.title} className={styles.tpmrCard}>
                            <div className={styles.tpmrCardTitle}>
                              {section.title}
                            </div>
                            <ul className={styles.tpmrBullets}>
                              {section.bullets.map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {detailTab === "sections" ? (
                      active.rxSections.length === 0 ? (
                        <div className={styles.emptyState}>
                          No structured Rx sections were captured in this
                          session.
                        </div>
                      ) : (
                        <div className={styles.sectionsList}>
                          {active.rxSections.map((sec) => (
                            <div key={sec.title} className={styles.tpmrCard}>
                              <div className={styles.tpmrCardTitle}>
                                {sec.title}
                              </div>
                              <ul className={styles.tpmrBullets}>
                                {sec.items.map((item, i) => (
                                  <li key={i}>
                                    <span className={styles.itemName}>
                                      {item.name}
                                    </span>
                                    {item.detail ? (
                                      <span className={styles.itemDetail}>
                                        ({item.detail})
                                      </span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </TPDrawerContent>
    </TPDrawer>
  );
}
