import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../../utils";
import { AiBrandSparkIcon } from "../../../shared/AiBrandSparkIcon";
import styles from "./TypingIndicator.module.scss";

// -----------------------------------------------------------------
// TypingIndicator — rotating "thinking" copy for clinicians
// -----------------------------------------------------------------

const HOLD_MS = 900;
const TRANSITION_MS = 260;

const DEFAULT_THINKING_SEQUENCE = [
  "Stitching the chart into a coherent story",
  "Skipping the fluff — surfacing what matters",
  "Like a sharp ward round, minus the pager beeps",
  "Correlating vitals, history, and the question you asked",
  "Pulling the signal out of the noise",
  "Almost there — bedside manner loading",
];

const HINT_FOLLOWUPS = {
  "Checking drug interactions": [
    "Cross-checking doses with age and renal function",
    "Scanning for awkward pairings you'd flag yourself",
    "No white coat — still obsessive about safety",
  ],
  "Fetching lab results": [
    "Trends beat single snapshots — grabbing both",
    "Separating 'watch' from 'act now'",
    "Numbers first, interpretation on deck",
  ],
  "Looking up patient records": [
    "Skimming encounters without missing the pivot",
    "Demographics, problems, recent trajectory",
    "The chart is thick — the answer won't be",
  ],
  "Loading intake data": [
    "Patient-reported symptoms — reading carefully",
    "Triaging what's new vs chronic backdrop",
    "Pre-visit forms, decoded",
  ],
  "Reviewing clinical guidelines": [
    "Guidelines in one tab, your patient in the other",
    "Evidence first, then how it fits this case",
    "DDx seasoning — not cookbook medicine",
  ],
  "Reviewing investigation protocols": [
    "Right test, right urgency",
    "Avoiding the 'scan everything' reflex",
    "Who ordered what, and was it enough?",
  ],
  "Analyzing document": [
    "OCR and sense-making in parallel",
    "Tables, impressions, fine print",
    "If it's illegible, we still squint politely",
  ],
  "Reviewing clinical data": [
    "Vitals, labs, narrative — one thread",
    "Teaching-file brain, real-shift speed",
    "Connecting dots the EMR scattered",
  ],
  "Comparing clinical data": [
    "Then vs now — what actually moved?",
    "Same patient, different chapter",
    "Delta matters more than absolutes",
  ],
  "Fetching clinic data": [
    "Queue, revenue, reality — operational lens",
    "Big-picture clinic pulse",
    "From the waiting room to the spreadsheet",
  ],
  "Preparing response": [
    "Compressing thought into something you can skim",
    "Attending-grade summary, intern-grade latency",
    "Almost clipboard-ready",
  ],
};

const GENERIC_FOLLOWUPS = [
  "Still thinking — medicine isn't multiple choice",
  "Organizing thoughts like a quiet pre-clinic huddle",
  "Brewing something concise enough for a busy OPD",
];

function buildThinkingSequence(queryHint) {
  const hint = queryHint?.trim();
  if (!hint) return [...DEFAULT_THINKING_SEQUENCE];
  const extras = HINT_FOLLOWUPS[hint] ?? GENERIC_FOLLOWUPS;
  const seen = new Set([hint]);
  const uniqueExtras = extras.filter((x) => {
    if (seen.has(x)) return false;
    seen.add(x);
    return true;
  });
  return [hint, ...uniqueExtras];
}

export function TypingIndicator({ className, queryHint }) {
  const messages = useMemo(() => buildThinkingSequence(queryHint), [queryHint]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("in");
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    setIdx(0);
    setPhase("in");
  }, [messages]);

  useEffect(() => {
    clearTimers();
    if (messages.length <= 1) return;

    const schedule = (fn, ms) => {
      const id = setTimeout(fn, ms);
      timersRef.current.push(id);
      return id;
    };

    const step = () => {
      schedule(() => {
        setPhase("out");
        schedule(() => {
          setIdx((i) => (i + 1) % messages.length);
          setPhase("in");
          schedule(step, HOLD_MS);
        }, TRANSITION_MS);
      }, HOLD_MS);
    };

    schedule(step, HOLD_MS);

    return () => {
      clearTimers();
    };
  }, [messages]);

  const displayText = messages[idx] ?? "";

  return (
    <div className={cn(styles.root, className)}>
      {/* Quirky front-back coin-flip spark with a soft AI gradient halo */}
      <span
        className="da-spark-loader"
        style={{ position: "relative", marginTop: 1, display: "inline-flex", flexShrink: 0, alignItems: "center", justifyContent: "center" }}
        aria-hidden
      >
        <span className="da-spark-halo" />
        <AiBrandSparkIcon size={22} className="da-spark-flip" style={{ position: "relative" }} />
      </span>

      <div className="typing-carousel-wrap" style={{ minWidth: 0, flex: 1 }}>
        <span
          className={cn(
            "typing-carousel-item",
            phase === "out" ? "typing-slide-out" : "typing-slide-in"
          )}
        >
          {displayText}
          <span className="typing-ellipsis" aria-hidden="true">
            <span className={cn("typing-ellipsis-dot", styles.dot1)}>.</span>
            <span className={cn("typing-ellipsis-dot", styles.dot2)}>.</span>
            <span className={cn("typing-ellipsis-dot", styles.dot3)}>.</span>
          </span>
        </span>
      </div>
      {/* da-* styles live in globals.css */}
    </div>
  );
}
