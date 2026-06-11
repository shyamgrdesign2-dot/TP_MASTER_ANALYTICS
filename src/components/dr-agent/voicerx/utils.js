/**
 * VoiceRx session utilities — labels, loader hints, demo transcripts.
 * Colocated since they're all consumed only by the voicerx/ flow.
 */

/** How VoiceRx captures audio — chosen before consultation starts. */
export const VOICE_CONSULT_LABELS = {
    ambient_consultation: "Ambient consultation",
    dictation_consultation: "Dictation consultation",
  };
  
  /** Simulated post-submit processing delay — matches real engine latency feel. */
  export const VOICE_RX_LOADER_MS = 11000;
  
  /** Loader hints rotated inside the chat + Rx pad overlays while processing. */
  export const VOICE_RX_LOADER_HINTS = [
    "Extracting symptoms…",
    "Structuring medications…",
    "Drafting advice…",
    "Finalising follow-up…",
  ];
  
  /** Simulated streaming chunks while VoiceRx recording (demo).
   *  Dictation mode: single-voice clinical narration (the doctor dictating
   *  into the mic). Rendered in chat as a flat paragraph. */
  export const VOICE_RX_DICTATION_CHUNKS = [
    "The patient presents with mild headache for the last three days, ",
    "associated with occasional nausea and dizziness but no vomiting or ",
    "vision issues. On examination, blood pressure is 140 by 90, pulse 82, ",
    "temperature normal, and no neurological or ENT abnormalities. ",
    "My diagnosis is tension-type headache, likely stress-related, ",
    "and mild hypertension, newly detected. I'm prescribing Paracetamol 500 mg ",
    "to be taken as needed for headache, Telmisartan 40 mg once daily in the ",
    "morning for blood pressure, and Pantoprazole 40 mg once daily before breakfast ",
    "for seven days. I've advised routine investigations — CBC, fasting blood sugar, ",
    "serum creatinine, and lipid profile — to evaluate overall metabolic health.",
  ];
  
  /** Ambient mode: doctor-patient conversation. Each chunk explicitly tagged
   *  with `Doctor:` / `Patient:` so the chat transcript card can parse turns
   *  and render alternating bubbles. */
  export const VOICE_RX_AMBIENT_CHUNKS = [
    "Doctor: Good morning! What brings you in today? ",
    "Patient: Good morning, doctor. I've been having a mild headache for the past few days. ",
    "Doctor: Hmm, how long has it been? ",
    "Patient: Around three days. It feels like tightness around my temples. ",
    "Doctor: Any nausea, vomiting, or vision issues? ",
    "Patient: Mild nausea, but no vomiting or vision problems. ",
    "Doctor: Alright. Let's check your vitals… Blood pressure is a bit high — 140 by 90. Any history of hypertension? ",
    "Patient: No, I've never had high BP before. ",
    "Doctor: Okay. I'll note that. Neurological and ENT exams are normal. It seems like a tension-type headache, possibly due to stress and work posture. ",
    "Patient: That sounds right — I've been working long hours at my desk. ",
    "Doctor: I'll start you on Paracetamol 500 mg as needed, and Telmisartan 40 mg for the BP. ",
  ];
  
  /** @deprecated Backwards-compat alias — prefer the mode-specific chunk
   *  arrays above. Kept so older imports don't break. */
  export const VOICE_RX_STREAM_CHUNKS = VOICE_RX_DICTATION_CHUNKS;
  