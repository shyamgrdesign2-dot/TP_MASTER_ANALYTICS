// ─────────────────────────────────────────────────────────────
// Doctor Agent v0 — Mock Patient Data (7 patients)
// ─────────────────────────────────────────────────────────────



export const SMART_SUMMARY_BY_CONTEXT = {
  // ═══════════════ 1. SHYAM GR — GP (Viral Fever + DM + HTN) ═══════════════
  "__patient__": {
    specialtyTags: ["General Medicine", "Diabetology"],
    followUpOverdueDays: 5,
    patientNarrative: "25-year-old male presenting with Fever since 3 days with evening spikes, Dry Cough 2 days, and Eye Redness bilateral. Known Diabetes (1yr) and Hypertension (6mo), on Telma 20mg and Metsmail 500mg. Allergic to Dust and Egg.",
    sbarSituation: "25M, 3-day fever with evening spikes, dry cough, bilateral conjunctivitis. Known Diabetes 1yr + Hypertension 6mo. BP 70/60, SpO2 93%, Temp 104°F. Working Dx: Viral fever, conjunctivitis.",
    familyHistory: ["Thyroid (Mom, Aunt)", "Diabetes (Father)"],
    lifestyleNotes: ["Smoking (2yr, Active)", "Alcohol (occasional, Active)"],
    allergies: ["Dust", "Egg"],
    chronicConditions: ["Diabetes (1yr, Active, on Metsmail 500mg)", "Hypertension (6mo, Active)"],
    lastVisit: {
      date: "27 Jan'26",
      vitals: "BP: 120/78 | Pulse: 82 | SpO2: 97% | Temp: 101°F | Wt: 94kg",
      symptoms: "Fever (2d, high, evening spikes), Eye redness (2d, bilateral)",
      examination: "Eyes: Conjunctival congestion bilateral mild, Chest: Clear, Throat: Mild pharyngeal congestion",
      diagnosis: "Viral fever, Conjunctivitis",
      medication: "Telma 20mg (Twice daily | Before food), Metsmail 500mg (Once daily | Before food), Paracetamol 650mg (As needed)",
      labTestsSuggested: "CBC, LFT",
      advice: "Rest, fluids 3L/day, avoid dust exposure, return if fever persists >3d",
      followUp: "2 weeks · Fri, 10 Feb'26"
    },
    labFlagCount: 7,
    todayVitals: { bp: "70/60", pulse: "78", spo2: "93", temp: "104", weight: "94", height: "175", bmi: "30.7" },
    activeMeds: ["Telma 20mg (Twice daily)", "Metsmail 500mg (Once daily)"],
    keyLabs: [
    { name: "HbA1c", value: "8.1", unit: "%", flag: "high", refRange: "<7%" },
    { name: "Fasting Glucose", value: "168", unit: "mg/dL", flag: "high", refRange: "70-100" },
    { name: "TSH", value: "5.8", unit: "mIU/L", flag: "high", refRange: "0.4-4.0" },
    { name: "LDL", value: "142", unit: "mg/dL", flag: "high", refRange: "<100" },
    { name: "Vitamin D", value: "18", unit: "ng/mL", flag: "low", refRange: "30-100" },
    { name: "Creatinine", value: "1.4", unit: "mg/dL", flag: "high", refRange: "0.7-1.2" },
    { name: "Microalbumin", value: "45", unit: "mg/L", flag: "high", refRange: "<30" }],

    dueAlerts: ["HbA1c recheck (quarterly)", "Lipid Profile (6-monthly)"],
    recordAlerts: ["Uploaded Rx from Dr. Sharma (Cardiology) not reviewed"],
    concernTrend: { label: "SpO₂", values: [97, 96, 94, 93], labels: ["20 Jan", "22 Jan", "24 Jan", "27 Jan"], unit: "%", tone: "red" }
    // No symptomCollectorData — shows "Good morning" welcome screen on open
  },

  // ═══════════════ 2. NEHA GUPTA — MASTER PATIENT (ALL specialties, ALL card types) ═══════════════
  // Demonstrates: Returning patient with COMPREHENSIVE data covering every specialty and card type.
  // NO symptomCollectorData — patient came directly without filling intake form.
  // Agent shows Patient Summary directly on open (no Patient Reported card).
  // 32F: Asthma + Hypothyroid + Early Pregnancy (12wk) + PCOS history + Mild Myopia
  "apt-neha": {
    specialtyTags: ["General Medicine", "Pulmonology", "Gynecology", "Obstetrics", "Ophthalmology"],
    followUpOverdueDays: 3,
    patientNarrative: "32-year-old female with bronchial asthma since childhood and hypothyroidism. Recently confirmed pregnancy (12 weeks). PCOS history (resolved). Presenting for asthma follow-up and early ANC.",
    sbarSituation: "32F, G1P0 12wk gestation, bronchial asthma (childhood) + hypothyroidism (3yr). Inhaler use increased this week. Presenting for asthma follow-up and early ANC. Multi-specialty review needed.",
    familyHistory: ["Asthma (Mother)", "Thyroid (Maternal Aunt)", "Gestational DM (Elder Sister)", "Breast Cancer (Paternal Aunt)"],
    lifestyleNotes: ["Yoga 3x/week (Active)", "Vegetarian (Active)", "Non-smoker", "No alcohol"],
    allergies: ["Aspirin", "Penicillin"],
    chronicConditions: ["Bronchial Asthma (since childhood, Active, on Budecort 200mcg)", "Hypothyroidism (3yr, Active, on Thyronorm 50mcg)"],
    receptionistIntakeNotes: ["Pregnancy test positive 2 weeks ago", "Wants to discuss medication safety in pregnancy", "Inhaler use increased this week"],
    lastVisit: {
      date: "18 Feb'26",
      vitals: "BP: 110/72 | Pulse: 76 | SpO2: 97% | Temp: 98.4°F | Wt: 56kg",
      symptoms: "Nocturnal cough 1wk, mild wheeze on exertion",
      examination: "Chest: Bilateral scattered rhonchi (no crepts), Lungs: PEFR 320 (expected 380), Abdomen: Soft, non-tender",
      diagnosis: "Acute exacerbation of bronchial asthma, Hypothyroid on Rx",
      medication: "Budecort 200mcg (Twice daily), Deriphyllin retard 150mg (Twice daily), Thyronorm 50mcg (Once daily, Before food), Montelukast 10mg (At bedtime)",
      labTestsSuggested: "PEFR monitoring, TSH, IgE, CBC, Vitamin D",
      advice: "Avoid dust exposure, use inhaler before exercise, steam inhalation, continue thyroid medication",
      followUp: "2 weeks · 4 Mar'26"
    },
    labFlagCount: 5,
    todayVitals: { bp: "112/74", pulse: "78", spo2: "96", temp: "98.6", weight: "57", height: "160", bmi: "22.3", bloodSugar: "108" },
    activeMeds: ["Budecort 200mcg (Twice daily)", "Deriphyllin 150mg (Twice daily)", "Thyronorm 50mcg (Once daily)", "Montelukast 10mg (At bedtime)", "Folic Acid 5mg (Once daily)"],
    keyLabs: [
    { name: "TSH", value: "5.2", unit: "mIU/L", flag: "high", refRange: "0.4-4.0" },
    { name: "IgE", value: "380", unit: "IU/mL", flag: "high", refRange: "<100" },
    { name: "Hemoglobin", value: "10.8", unit: "g/dL", flag: "low", refRange: "12-16" },
    { name: "Vitamin D", value: "16", unit: "ng/mL", flag: "low", refRange: "30-100" },
    { name: "Fasting Blood Sugar", value: "108", unit: "mg/dL", flag: "high", refRange: "70-100" }],

    dueAlerts: ["PEFR recheck due", "TSH recheck (quarterly)", "NT Scan due (11-14wk)", "First trimester screening", "Td/TT vaccine due"],
    recordAlerts: ["Allergy testing report from City Chest Hospital uploaded", "USG confirmation of pregnancy (8wk) uploaded"],
    concernTrend: { label: "SpO₂", values: [98, 97, 97, 96], labels: ["Dec'25", "Jan'26", "Feb'26", "Mar'26"], unit: "%", tone: "amber" },
    gynecData: {
      menarche: "13 years",
      lmp: "28 Dec'25",
      cycleLength: "30-35 days",
      cycleRegularity: "Irregular",
      flowDuration: "4-5 days",
      flowIntensity: "Moderate",
      flowClots: "No",
      padsPerDay: "3",
      painScore: "None",
      alerts: ["PCOS history (Monitor for GDM in pregnancy)", "Irregular cycles normalized post-treatment"]
    },
    obstetricData: {
      gravida: 1, para: 0, living: 0, abortion: 0, ectopic: 0,
      lmp: "28 Dec'25",
      edd: "4 Oct'26",
      gestationalWeeks: "12wk 2d",
      bloodGroupPatient: "B+ve",
      bloodGroupHusband: "O+ve",
      maritalStatus: "Married",
      marriageDuration: "2 years",
      consanguineous: "No",
      currentExam: {
        pallor: "Nil",
        oedema: "Nil",
        bmi: "22.3",
        bp: "112/74",
        fundusHeight: "Not palpable",
        presentation: "Not applicable (early)",
        liquor: "Normal (USG)",
        fetalHeartRate: "162 bpm",
        note: "Early pregnancy, routine ANC"
      },
      ancScheduler: [
      { testName: "NT Scan", weekRange: "11-14wk", status: "Due" },
      { testName: "First Trimester Screening", weekRange: "11-13wk", status: "Due" },
      { testName: "Dating Scan", weekRange: "6-9wk", status: "Completed" }],

      alerts: ["Asthma in pregnancy (Use pregnancy-safe inhalers only)", "TSH elevated (Adjust Thyronorm dose for pregnancy)", "PCOS history (Screen for GDM at 24-28wk)", "Family hx gestational DM (High alert)"]
    },
    ophthalData: {
      vaRight: "6/9",
      vaLeft: "6/12",
      nearVaRight: "N6",
      nearVaLeft: "N8",
      iop: "14/14",
      slitLamp: "Normal",
      fundus: "Normal",
      lastExamDate: "Oct 2025",
      glassPrescription: "RE: -1.25DS, LE: -1.75DS",
      alerts: ["Mild myopia (Stable)", "Screen for pregnancy-related vision changes", "Review refraction post-delivery"]
    }
  },

  // ═══════════════ 3. ANJALI PATEL — GP + Gynec + Ophthal ═══════════════
  "apt-anjali": {
    specialtyTags: ["General Medicine", "Ophthalmology"],
    followUpOverdueDays: 0,
    patientNarrative: "28-year-old female with Headache since 4 days with eye strain. Known Migraine without Aura, on Sumatriptan and Naproxen. Mild Myopia (stable). Last seen 22 Jan for routine eye check.",
    familyHistory: ["Migraine (Mother)"],
    lifestyleNotes: ["Screen time >8hr/day (Active)", "No exercise (Active)"],
    allergies: [],
    chronicConditions: ["Migraine (3yr, Active, on Sumatriptan 50mg)"],
    lastVisit: {
      date: "15 Jan'26",
      symptoms: "Headache frontal, photophobia, nausea",
      examination: "Neuro: Normal, Fundus: No papilledema",
      diagnosis: "Migraine without aura",
      medication: "Sumatriptan 50mg (As needed), Paracetamol 500mg (As needed)",
      labTestsSuggested: "Vitamin D, B12",
      doctorName: "Dr. Meera Joshi (Paediatrics)"
    },
    labFlagCount: 1,
    todayVitals: { bp: "110/70", pulse: "72", spo2: "99", temp: "98.4", weight: "58", height: "162" },
    activeMeds: ["Sumatriptan 50mg (As needed)"],
    keyLabs: [
    { name: "Vitamin D", value: "18", unit: "ng/mL", flag: "low", refRange: "30-100" }],

    dueAlerts: [],
    // No symptomCollectorData — apt-anjali should open to a clean
    // welcome screen, not a pre-filled symptom intake.
    gynecData: {
      menarche: "13 years",
      lmp: "10 Feb'26",
      cycleLength: "28-30 days",
      cycleRegularity: "Regular",
      flowDuration: "4 days",
      flowIntensity: "Moderate",
      flowClots: "No",
      padsPerDay: "3",
      painScore: "Mild (Before Menses)"
    },
    ophthalData: {
      vaRight: "6/6",
      vaLeft: "6/6",
      nearVaRight: "N8",
      nearVaLeft: "N8",
      slitLamp: "Normal",
      fundus: "Normal",
      lastExamDate: "15 Jan'26",
      alerts: ["Digital eye strain, recommend 20-20-20 rule"]
    }
  },

  // ═══════════════ 3. VIKRAM SINGH — GP + Ophthal (F/U overdue) ═══════════════
  "apt-vikram": {
    specialtyTags: ["General Medicine", "Cardiology"],
    followUpOverdueDays: 12,
    patientNarrative: "42-year-old male with Fatigue since 2 weeks, Poor Sleep quality, and late meals. Known Hypertension (3yr) and Dyslipidemia (2yr), on Amlodipine 5mg and Atorvastatin 10mg. Follow-up overdue by 12 days.",
    familyHistory: ["CAD (Father)", "DM (Mother)"],
    lifestyleNotes: ["Sedentary (Active)", "Late dinners (Active)", "Alcohol (weekends, Active)"],
    allergies: ["Sulfa drugs"],
    chronicConditions: ["Hypertension (3yr, Active, on Telma 40mg)", "Dyslipidemia (1yr, Active)"],
    lastVisit: {
      date: "20 Dec'25",
      symptoms: "Fatigue, poor sleep, occasional chest heaviness on exertion",
      examination: "CVS: S1S2 normal (no murmur), Chest: Clear",
      diagnosis: "HTN Stage I, Dyslipidemia, Fatigue syndrome",
      medication: "Telma 40mg (Once daily | Before food), Rosuvastatin 10mg (At bedtime), Melatonin 3mg (At bedtime)",
      labTestsSuggested: "Lipid Panel, HbA1c, TSH, ECG",
      followUp: "2 weeks · Fri, 3 Jan'26"
    },
    labFlagCount: 3,
    todayVitals: { bp: "138/88", pulse: "84", spo2: "97", temp: "98.6", weight: "82", height: "172", bmi: "27.7" },
    activeMeds: ["Telma 40mg (Once daily)", "Rosuvastatin 10mg (At bedtime)", "Melatonin 3mg (At bedtime)"],
    keyLabs: [
    { name: "LDL", value: "138", unit: "mg/dL", flag: "high", refRange: "<100" },
    { name: "HbA1c", value: "6.2", unit: "%", flag: "high", refRange: "<5.7" },
    { name: "Triglycerides", value: "195", unit: "mg/dL", flag: "high", refRange: "<150" }],

    dueAlerts: ["ECG pending", "Lipid recheck overdue"],
    // No symptomCollectorData — apt-vikram opens to clean welcome screen.
    ophthalData: {
      vaRight: "6/9",
      vaLeft: "6/9",
      nearVaRight: "N8",
      nearVaLeft: "N8",
      iop: "14/16",
      fundus: "Grade I arteriolar narrowing",
      lastExamDate: "20 Dec'25",
      alerts: ["Presbyopia onset", "Arteriolar narrowing, correlate with HTN control"]
    }
  },

  // ═══════════════ 4. PRIYA RAO — Obstetric (37wk Primigravida) ═══════════════
  "apt-priya": {
    specialtyTags: ["Obstetrics", "High-risk Pregnancy"],
    followUpOverdueDays: 0,
    patientNarrative: "26-year-old Primigravida at 38 weeks gestation. Pedal Edema since 3 days, Back Pain 2 days, occasional Braxton-Hicks. BP trending high (138/88). Known Hypothyroid, on Thyronorm 50mcg. High-risk: advanced gestation with edema.",
    familyHistory: ["Pre-eclampsia (Mother)", "GDM (Sister)"],
    lifestyleNotes: [],
    allergies: ["Sulfa drugs"],
    chronicConditions: ["Hypothyroid (2yr, Active, on Thyronorm 50mcg)"],
    lastVisit: {
      date: "25 Feb'26",
      symptoms: "Routine ANC, mild ankle swelling",
      examination: "Uterus: 36wk (cephalic), FHS: 142/min, BP: 128/82",
      diagnosis: "Routine ANC, Hypothyroid on Rx",
      medication: "Thyronorm 50mcg (Once daily | Before food), Folic Acid 5mg (Once daily), Iron+Folic (Once daily | After food), Calcium 500mg (Twice daily)",
      labTestsSuggested: "CBC, TSH, Urine routine",
      followUp: "1 week · Tue, 4 Mar'26"
    },
    labFlagCount: 2,
    todayVitals: { bp: "130/85", pulse: "88", spo2: "98", temp: "98.2", weight: "68" },
    activeMeds: ["Thyronorm 50mcg (Once daily)", "Folic Acid 5mg (Once daily)", "Iron+Folic (Once daily)", "Calcium 500mg (Twice daily)"],
    keyLabs: [
    { name: "Hemoglobin", value: "11.2", unit: "g/dL", flag: "low", refRange: "12-16" },
    { name: "TSH", value: "4.8", unit: "mIU/L", flag: "high", refRange: "0.4-4.0" }],

    dueAlerts: ["Dating scan overdue", "TSH recheck due"],
    symptomCollectorData: {
      reportedAt: "Today, 09:00 AM",
      symptoms: [
      { name: "Pedal Edema", duration: "3 days", severity: "Mild" },
      { name: "Back Pain", duration: "2 days", severity: "Moderate" }],

      medicalHistory: ["Hypothyroid (2yr)"],
      allergies: ["Sulfa drugs"],
      questionsToDoctor: [
      "Is my swelling normal at 38 weeks?",
      "When should we plan delivery?"]

    },
    obstetricData: {
      gravida: 1, para: 0, living: 0, abortion: 0, ectopic: 0,
      lmp: "14 Jun'25",
      edd: "21 Mar'26",
      gestationalWeeks: "38wk 2d",
      bloodGroupPatient: "A+ve",
      bloodGroupHusband: "B+ve",
      maritalStatus: "Married",
      marriageDuration: "3 years",
      consanguineous: "No",
      currentExam: {
        pallor: "Mild",
        oedema: "Pedal edema (Grade I)",
        bmi: "25.8",
        bp: "130/85",
        fundusHeight: "36cm",
        presentation: "Cephalic",
        liquor: "Adequate",
        fetalHeartRate: "142 bpm",
        note: "Term pregnancy, monitor BP"
      },
      ancScheduler: [
      { testName: "NST", weekRange: "37-40wk", status: "Due" },
      { testName: "GBS Screening", weekRange: "35-37wk", status: "Completed" },
      { testName: "Growth Scan", weekRange: "34-36wk", status: "Completed" }],

      alerts: ["BP borderline, monitor for pre-eclampsia", "Family history of pre-eclampsia"]
    }
  },

  // ═══════════════ 5. ARJUN S — Pediatric (4y, growth concerns) ═══════════════
  "apt-arjun": {
    specialtyTags: ["Pediatrics"],
    followUpOverdueDays: 0,
    patientNarrative: "4-year-old male with Dry Cough 3 days and Reduced Appetite since 1 week. Weight at 25th percentile, Height at 15th percentile — growth monitoring in progress. Vaccine: MMR-2 overdue.",
    familyHistory: ["Asthma (Father)"],
    lifestyleNotes: ["Picky eater", "Screen time 3hr/day"],
    allergies: [],
    chronicConditions: [],
    lastVisit: {
      date: "10 Feb'26",
      symptoms: "URTI, mild wheeze",
      examination: "Chest: Bilateral wheeze (no crepts), Throat: Congested, Ears: Normal",
      diagnosis: "Acute URTI with reactive airways",
      medication: "Amoxicillin 250mg (Three times daily, 5 days), Salbutamol syrup 2ml (Three times daily, 3 days), Cetirizine syrup 2.5ml (Once daily, 5 days)",
      labTestsSuggested: "CBC if no improvement"
    },
    labFlagCount: 0,
    todayVitals: { bp: "90/60", pulse: "110", spo2: "97", temp: "99.2", weight: "14", height: "98" },
    activeMeds: [],
    keyLabs: [],
    dueAlerts: ["MMR-2 overdue"],
    symptomCollectorData: {
      reportedAt: "Today, 10:30 AM",
      symptoms: [
      { name: "Dry Cough", duration: "3 days", severity: "Mild" },
      { name: "Reduced Appetite", duration: "1 week", severity: "Moderate" }],

      medicalHistory: ["Recurrent wheezing episodes (6mo)"],
      allergies: ["Egg allergy"],
      questionsToDoctor: [
      "Why is he eating less than before?",
      "Is the cough due to allergy or infection?"]

    },
    pediatricsData: {
      ageDisplay: "4 years",
      heightCm: 98,
      heightPercentile: "25th",
      weightKg: 14,
      weightPercentile: "15th",
      ofcCm: 50,
      bmiPercentile: "20th",
      vaccinesPending: 3,
      vaccinesOverdue: 1,
      overdueVaccineNames: ["MMR-2"],
      milestoneNotes: ["Speech delay noted by parent, 2-word sentences only"],
      feedingNotes: ["Picky eater", "Milk-dependent", "Poor solid intake"],
      lastGrowthDate: "10 Feb'26",
      alerts: ["Weight below expected (15th %ile)", "Speech delay, consider eval"]
    }
  },

  // ═══════════════ 6. LAKSHMI K — Gynec (Heavy bleeding, perimenopause) ═══════════════
  "apt-lakshmi": {
    specialtyTags: ["Gynecology", "Endocrinology"],
    followUpOverdueDays: 0,
    patientNarrative: "45-year-old female with Heavy Menstrual Bleeding since 6 months, increasing Fatigue, and Irregular Cycles (35-40 days). Known Hypothyroid and Iron Deficiency Anemia, on Thyronorm 75mcg and Autrin. Perimenopause evaluation needed.",
    familyHistory: ["Breast cancer (Aunt)", "Thyroid (Mother)"],
    lifestyleNotes: ["Vegetarian (Active)", "Walks 20min/day (Active)"],
    allergies: ["Ibuprofen"],
    chronicConditions: ["Hypothyroid (Active, on Thyronorm 75mcg)", "PCOS (8yr, Inactive)"],
    lastVisit: {
      date: "20 Jan'26",
      symptoms: "Heavy flow 7 days, fatigue, hair thinning",
      examination: "General: Pallor +, Thyroid scar noted, P/A: Soft, P/V: Uterus bulky (no tenderness)",
      diagnosis: "AUB-Ovulatory dysfunction, Iron deficiency anemia, Hypothyroid",
      medication: "Thyronorm 75mcg (Once daily | Before food), Autrin capsule (Once daily | After food), Tranexamic acid 500mg (Three times daily | During flow)",
      labTestsSuggested: "CBC, TSH, Iron studies, USG pelvis",
      followUp: "6 weeks · Mon, 3 Mar'26"
    },
    labFlagCount: 3,
    todayVitals: { bp: "118/76", pulse: "92", spo2: "98", temp: "98.4", weight: "65", height: "158" },
    activeMeds: ["Thyronorm 75mcg (Once daily)", "Autrin capsule (Once daily)", "Tranexamic acid 500mg (Three times daily)"],
    keyLabs: [
    { name: "Hemoglobin", value: "9.2", unit: "g/dL", flag: "low", refRange: "12-16" },
    { name: "TSH", value: "6.8", unit: "mIU/L", flag: "high", refRange: "0.4-4.0" },
    { name: "Fasting Blood Sugar", value: "112", unit: "mg/dL", flag: "high", refRange: "70-100" }],

    dueAlerts: ["USG pelvis pending"],
    symptomCollectorData: {
      reportedAt: "Today, 11:00 AM",
      symptoms: [
      { name: "Heavy Menstrual Bleeding", duration: "6 months", severity: "Moderate" },
      { name: "Fatigue", duration: "6 months", severity: "Moderate" }],

      medicalHistory: ["Hypothyroid (on Thyronorm 75mcg)"],
      allergies: ["Ibuprofen"],
      questionsToDoctor: [
      "Is this perimenopause?",
      "Will my anaemia improve with iron supplements?"]

    },
    gynecData: {
      menarche: "13 years",
      lmp: "02 Nov'25",
      cycleLength: "35-40 days",
      cycleRegularity: "Irregular",
      flowDuration: "7 days",
      flowIntensity: "Heavy",
      flowClots: "Yes",
      padsPerDay: "5",
      painScore: "Moderate (During Menses)",
      lifecycle: "Perimenopause",
      alerts: ["Heavy flow + low Hb (compound alert)", "Pap smear overdue (>1yr)"]
    }
  },

  // ═══════════════ 7. RAMESH M — Zero Data (New Patient) ═══════════════
  "apt-zerodata": {
    specialtyTags: [],
    followUpOverdueDays: 0,
    patientNarrative: "New patient. Patient reports Joint Pain and morning stiffness since 1 week. Allergic to Sulfonamides. No prior clinical history available.",
    allergies: ["Sulfonamides"],
    chronicConditions: [],
    labFlagCount: 0,
    keyLabs: [],
    dueAlerts: [],
    symptomCollectorData: {
      reportedAt: "Today, 09:30 AM",
      symptoms: [
      { name: "Joint Pain", duration: "1 week", severity: "Moderate" },
      { name: "Morning stiffness", duration: "1 week", severity: "Mild" }],

      medicalHistory: [],
      allergies: ["Sulfonamides"],
      isNewPatient: true,
      questionsToDoctor: [
      "Is this arthritis?",
      "Do I need any tests today?"]

    }
  },

  // ═══════════════ 8. SURESH NAIR — Returning patient, NO symptom collector ═══════════════
  // Demonstrates: Full historical data available but patient did NOT fill symptom collector
  // Agent must work with historical context only, no self-reported symptoms
  "reg-suresh": {
    specialtyTags: ["General Medicine", "Cardiology"],
    followUpOverdueDays: 0,
    patientNarrative: "58-year-old male with stable ischemic heart disease and controlled hypertension. Post-angioplasty (2024), on dual antiplatelet therapy.",
    familyHistory: ["MI (Father, age 55)", "Stroke (Mother, age 68)"],
    lifestyleNotes: ["Ex-smoker (quit 2023, Inactive)", "Walks 20 min/day (Active)"],
    allergies: ["Aspirin (GI intolerance, switched to Clopidogrel)"],
    chronicConditions: ["Ischemic Heart Disease (2yr, Active, on Clopidogrel 75mg)", "Hypertension (5yr, Active, on Telmisartan 40mg)"],
    lastVisit: {
      date: "10 Feb'26",
      vitals: "BP: 128/82 | Pulse: 72 | SpO2: 98% | Temp: 98.4°F | Wt: 76kg",
      symptoms: "Routine follow-up, no new complaints",
      examination: "CVS: S1S2 normal (no murmur), Chest: Clear, Extremities: Mild pedal edema resolved",
      diagnosis: "Stable IHD on Rx, HTN controlled",
      medication: "Clopidogrel 75mg (Once daily), Atorvastatin 40mg (At bedtime), Metoprolol 25mg (Twice daily), Telmisartan 40mg (Once daily)",
      labTestsSuggested: "Lipid Profile, Renal Panel, ECG",
      advice: "Continue exercise, low-salt diet, medication compliance",
      followUp: "3 months · 10 May'26",
      doctorName: "Dr. Ravi Mehta (Cardiology)"
    },
    labFlagCount: 2,
    todayVitals: { bp: "132/84", pulse: "74", spo2: "98", temp: "98.6", weight: "76", bmi: "26.1" },
    activeMeds: ["Clopidogrel 75mg (Once daily)", "Atorvastatin 40mg (At bedtime)", "Metoprolol 25mg (Twice daily)", "Telmisartan 40mg (Once daily)"],
    keyLabs: [
    { name: "LDL", value: "118", unit: "mg/dL", flag: "high", refRange: "<100" },
    { name: "Triglycerides", value: "178", unit: "mg/dL", flag: "high", refRange: "<150" }],

    dueAlerts: ["ECG due (annual)", "Echo follow-up (post-angioplasty)"],
    recordAlerts: ["Angioplasty records from City Heart Hospital (2024) uploaded"],
    concernTrend: { label: "LDL", values: [142, 128, 118], labels: ["Jun 25", "Oct 25", "Feb 26"], unit: "mg/dL", tone: "teal" }
    // NO symptomCollectorData — patient came for routine cardiology follow-up, did not fill intake form.
  },

  // ═══════════════ CKD STAGE 5 — SBAR/POMR/PARTIAL DATA DEMO ═══════════════
  "apt-ramesh-ckd": {
    specialtyTags: ["Nephrology", "Cardiology", "Endocrinology", "General Medicine"],
    followUpOverdueDays: 8,
    patientNarrative:
    "76-year-old male with CKD Stage 5 on peritoneal dialysis since Jan 2024, Type 2 DM 18 years, Hypertension 12 years, IHD post-MI (2021). 2 ER admissions in past 12 months for acute fluid overload. Routine nephrology review today.",
    familyHistory: ["CKD (Father, died age 68)", "Diabetes (Mother, Brother)", "Stroke (Paternal Uncle)"],
    lifestyleNotes: ["Non-smoker", "No alcohol", "Renal diet (Low K+, low phosphate, protein restricted, Active)", "CAPD 4 exchanges/day, 2L bags (Active)"],
    allergies: ["Iodinated Contrast", "Sulfonamides"],
    chronicConditions: [
    "CKD Stage 5 (5yr, Active, on Furosemide 40mg)",
    "Type 2 Diabetes Mellitus (18yr, Active, on Insulin Glargine 18U)"],

    lastVisit: {
      date: "02 Mar'26",
      vitals: "BP 162/96, Pulse 84, SpO₂ 95%, Wt 73kg",
      symptoms: "Routine nephrology review, mild pedal oedema",
      examination: "Extremities: Bilateral pitting oedema (grade 1), JVP: Normal, Lungs: Clear",
      diagnosis: "CKD G5 on PD (Stable)",
      medication: "Insulin Glargine 18U (At bedtime), Amlodipine 10mg, Telmisartan 40mg, Furosemide 40mg (Twice daily), EPO 4000U 2x/wk",
      labTestsSuggested: "KFT, CBC, Iron panel, PTH, Phosphorus, HbA1c",
      advice: "Continue renal diet, monitor BP daily, fluid intake <1.5L/day",
      followUp: "2 weeks · Mon, 16 Mar'26 (Review labs and PD adequacy)"
    },
    labFlagCount: 13,
    todayVitals: { bp: "158/92", pulse: "88", spo2: "94", temp: "98.2", weight: "72", height: "168", bmi: "25.5" },
    activeMeds: [
    "Insulin Glargine 18U (At bedtime)",
    "Insulin Aspart 8-8-8U (Before meals)",
    "Amlodipine 10mg (Once daily)",
    "Telmisartan 40mg (Once daily)",
    "Furosemide 40mg (Twice daily)",
    "EPO 4000U SC 2x/wk",
    "Calcium Acetate 667mg (Three times daily)",
    "Calcitriol 0.25mcg (Once daily)",
    "Atorvastatin 40mg (At bedtime)",
    "Aspirin 75mg (Once daily)",
    "Sevelamer 800mg (Three times daily)"],

    keyLabs: [
    { name: "eGFR", value: "11", unit: "mL/min", flag: "critical", refRange: ">60" },
    { name: "Creatinine", value: "8.2", unit: "mg/dL", flag: "high", refRange: "0.7-1.3" },
    { name: "BUN", value: "68", unit: "mg/dL", flag: "high", refRange: "7-20" },
    { name: "K+", value: "5.8", unit: "mEq/L", flag: "high", refRange: "3.5-5.0" },
    { name: "Phosphorus", value: "6.2", unit: "mg/dL", flag: "high", refRange: "2.5-4.5" },
    { name: "Calcium", value: "8.1", unit: "mg/dL", flag: "low", refRange: "8.5-10.5" },
    { name: "PTH", value: "480", unit: "pg/mL", flag: "high", refRange: "10-65" },
    { name: "Hb", value: "9.2", unit: "g/dL", flag: "low", refRange: "13-17" },
    { name: "HbA1c", value: "7.8", unit: "%", flag: "high", refRange: "<7.0" },
    { name: "Albumin", value: "3.1", unit: "g/dL", flag: "low", refRange: "3.5-5.5" },
    { name: "Bicarbonate", value: "18", unit: "mEq/L", flag: "low", refRange: "22-28" },
    { name: "Ferritin", value: "42", unit: "ng/mL", flag: "low", refRange: "100-500" },
    { name: "FBS", value: "186", unit: "mg/dL", flag: "high", refRange: "70-100" }],

    dueAlerts: [
    "PD adequacy test (Kt/V, quarterly, overdue)",
    "Peritoneal equilibration test (PET, overdue)",
    "2D Echocardiogram (Ordered post-ER, not done)",
    "Retinal screening (Diabetic + CKD, >14 months overdue)",
    "Fistula maturity assessment (HD transition planning)"],

    recordAlerts: [
    "ER discharge summary (Feb 2026, fluid overload episode, not yet reviewed in EMR)",
    "Cardiology opinion from Dr. Mehta (Oct 2025, uploaded as scanned PDF)"],

    concernTrend: { label: "eGFR", values: [18, 16, 14, 11], labels: ["Jun'25", "Sep'25", "Dec'25", "Mar'26"], unit: "mL/min", tone: "red" },
    // ── SBAR / Provenance fields (Phase 3 — new for this patient) ──
    sbarSituation:
    "76M CKD5 on PD, K+ 5.8 (HIGH), eGFR 11 (declining), BP 158/92. 2 ER admissions in 12mo for fluid overload. Assess PD adequacy and fluid status.",
    dataCompleteness: { emr: 45, ai: 30, missing: 25 },
    dataProvenance: {
      "eGFR": { source: "emr", confidence: "high" },
      "Creatinine": { source: "emr", confidence: "high" },
      "BUN": { source: "emr", confidence: "high" },
      "K+": { source: "emr", confidence: "high" },
      "Phosphorus": { source: "emr", confidence: "high" },
      "Calcium": { source: "emr", confidence: "high" },
      "PTH": { source: "emr", confidence: "high" },
      "Hb": { source: "ai_extracted", confidence: "medium", extractedFrom: "Lab report PDF (Feb 2026)" },
      "HbA1c": { source: "ai_extracted", confidence: "medium", extractedFrom: "Printed lab report PDF (Feb 2026)" },
      "Albumin": { source: "emr", confidence: "high" },
      "Bicarbonate": { source: "emr", confidence: "high" },
      "Ferritin": { source: "ai_extracted", confidence: "medium", extractedFrom: "External clinic report (Jan 2026)" },
      "FBS": { source: "ai_extracted", confidence: "medium", extractedFrom: "Printed lab report PDF (Feb 2026)" },
      "Furosemide": { source: "ai_extracted", confidence: "medium", extractedFrom: "Handwritten Rx, Aug 2025 (dose ambiguous)" },
      "bp": { source: "emr", confidence: "high" },
      "spo2": { source: "emr", confidence: "high" },
      "Kt/V": { source: "not_available" },
      "PET": { source: "not_available" },
      "Echo": { source: "not_available" },
      "Retinal screening": { source: "not_available" }
    },
    sectionCompleteness: [
    { sectionId: "vitals", filled: 7, total: 7, status: "complete" },
    { sectionId: "labs-nephro", filled: 7, total: 9, status: "partial" },
    { sectionId: "labs-diabetes", filled: 2, total: 3, status: "partial" },
    { sectionId: "labs-anemia", filled: 2, total: 4, status: "partial" },
    { sectionId: "cardiology", filled: 1, total: 3, status: "partial" },
    { sectionId: "ophthalmology", filled: 0, total: 2, status: "missing" }],

    crossProblemFlags: [
    { text: "Metformin contraindicated in CKD5, verify no prescriptions from other specialists", problems: ["CKD", "DM"], severity: "high" },
    { text: "K+ 5.8 + on Telmisartan (ARB), monitor closely, consider dose reduction", problems: ["CKD", "HTN"], severity: "high" },
    { text: "Furosemide losing efficacy as eGFR declines below 15, consider PD ultrafiltration adjustment", problems: ["CKD", "HTN"], severity: "medium" },
    { text: "Insulin clearance reduced in dialysis, hypoglycaemia risk, monitor closely", problems: ["CKD", "DM"], severity: "medium" }],

    missingExpectedFields: [
    { field: "Kt/V (PD adequacy)", reason: "Quarterly PD adequacy test not found in EMR or uploads", prompt: "Order Kt/V sample this visit" },
    { field: "Peritoneal Equilibration Test", reason: "PET overdue, membrane function assessment needed", prompt: "Schedule PET within 2 weeks" },
    { field: "2D Echocardiogram", reason: "Ordered post-Feb 2026 ER admission, result not in EMR", prompt: "Chase echo result or re-order" },
    { field: "Retinal screening", reason: "Diabetic + CKD patient, last screening >14 months ago", prompt: "Refer to ophthalmology" },
    { field: "Transferrin saturation", reason: "Required for EPO dosing decisions, not in any source", prompt: "Order iron studies with next labs" }],

    recommendationTiers: [
    { text: "Hyperkalaemia (K+ 5.8), review dietary compliance, adjust sevelamer dose", tier: "act", gatedBy: "K+ from EMR" },
    { text: "BP uncontrolled at 158/92, review antihypertensive regimen and PD fluid strategy", tier: "act", gatedBy: "BP from EMR" },
    { text: "Metabolic acidosis (Bicarb 18), consider oral sodium bicarbonate supplementation", tier: "act", gatedBy: "Bicarbonate from EMR" },
    { text: "ESA dose review, Hb 9.2 g/dL below PD target 10-12. Confirm Hb from lab PDF before adjusting EPO", tier: "verify", gatedBy: "Hb from AI-extracted lab PDF" },
    { text: "Glycaemic review, HbA1c 7.8%. Verify from uploaded lab report before endocrinology referral", tier: "verify", gatedBy: "HbA1c from AI-extracted report" },
    { text: "Order Ferritin + Transferrin saturation, iron panel not in any source", tier: "gather", gatedBy: "Ferritin not available" },
    { text: "Chase echo result, ordered post-ER Feb 2026, not returned to EMR", tier: "gather", gatedBy: "Echo not available" },
    { text: "Refer ophthalmology, retinal screening overdue >14 months", tier: "gather", gatedBy: "Retinal screening not available" }],

    pomrProblems: [
    {
      problem: "CKD Stage 5 / Peritoneal Dialysis",
      status: "Active (Critical)",
      statusColor: "#EF4444",
      completeness: { emr: 70, ai: 15, missing: 15 },
      labKeys: ["eGFR", "Creatinine", "BUN", "K+", "Phosphorus", "Bicarbonate"],
      missingKeys: ["Kt/V", "PET"]
    },
    {
      problem: "Hypertension",
      status: "Uncontrolled",
      statusColor: "#D97706",
      completeness: { emr: 50, ai: 30, missing: 20 },
      labKeys: [],
      vitalKeys: ["bp"],
      medKeys: ["Amlodipine 10mg (Once daily)", "Telmisartan 40mg (Once daily)", "Furosemide 40mg (Twice daily)"],
      missingKeys: ["Echo"]
    },
    {
      problem: "Type 2 Diabetes Mellitus",
      status: "Poorly controlled",
      statusColor: "#D97706",
      completeness: { emr: 30, ai: 55, missing: 15 },
      labKeys: ["HbA1c", "FBS"],
      medKeys: ["Insulin Glargine 18U (At bedtime)", "Insulin Aspart 8-8-8U (Before meals)"],
      missingKeys: ["Retinal screening"]
    },
    {
      problem: "Anaemia of CKD",
      status: "Suboptimal",
      statusColor: "#D97706",
      completeness: { emr: 40, ai: 20, missing: 40 },
      labKeys: ["Hb", "Ferritin"],
      medKeys: ["EPO 4000U SC 2x/wk"],
      missingKeys: ["Transferrin saturation"]
    }],

    symptomCollectorData: {
      reportedAt: "15 Mar'26, 09:12 AM",
      symptoms: [
      { name: "Pedal oedema", duration: "1 week", severity: "mild" },
      { name: "Fatigue", duration: "2 weeks", severity: "moderate" }],

      medicalHistory: ["Type 2 Diabetes (18yr)"],
      allergies: ["Sulfa drugs"],
      questionsToDoctor: ["Is my kidney function getting worse?", "Do I need to change my dialysis?"]
    }
  }
};

// ─────────────────────────────────────────────────────────────
// Patient Tooltip Summaries — used by appointment page AI tooltip
// ─────────────────────────────────────────────────────────────

export const PATIENT_TOOLTIP_SUMMARIES = {
  "__patient__":
  "Patient with Type 2 Diabetes 2yr and Hypertension 3yr, on Metformin 500mg and Telma 20mg, last visited on 27 Jan'26 with fever and eye redness, diagnosed Viral Fever and Conjunctivitis, suggested Paracetamol 650mg and Azithromycin 500mg.",
  "apt-anjali":
  "Patient with Migraine 3yr, on Sumatriptan 50mg, last visited on 15 Jan'26 with headache and eye strain, diagnosed Migraine without Aura, suggested Naproxen 250mg and Vitamin D 60K.",
  "apt-vikram":
  "Patient with Hypertension 3yr and Dyslipidemia 1yr, on Telma 40mg and Atorvastatin 10mg, last visited on 20 Dec'25 with fatigue and poor sleep, diagnosed Fatigue Syndrome, suggested Melatonin 3mg and CoQ10 100mg.",
  "apt-priya":
  "Patient with Hypothyroidism 2yr, G2P1 at 34 weeks, on Thyronorm 50mcg, last visited on 25 Feb'26 with pedal edema, diagnosed Routine ANC with mild edema, suggested Folic Acid 5mg and Calcium 500mg.",
  "apt-arjun":
  "4-year-old male, last visited on 10 Feb'26 with dry cough and reduced appetite, diagnosed Acute URTI with reactive airways, suggested Amoxicillin 250mg and Salbutamol syrup.",
  "apt-lakshmi":
  "Patient with Hypothyroidism 5yr and Fibroid Uterus 2yr, on Thyronorm 75mcg, last visited on 20 Jan'26 with heavy bleeding and fatigue, diagnosed AUB-Ovulatory Dysfunction and Iron Deficiency Anemia, suggested Autrin capsule and Tranexamic Acid 500mg.",
  "apt-neha":
  "Patient with Bronchial Asthma since childhood and Hypothyroidism 3yr, newly confirmed pregnancy 12wk, on Budecort 200mcg and Thyronorm 50mcg, last visited on 18 Feb'26 with nocturnal cough, TSH 5.2 and Hb 10.8. NT Scan due.",
  "apt-zerodata":
  "New patient presenting with knee pain and morning stiffness since 1 week. Allergy to Sulfonamides. On Vitamin D3 60K weekly.",
  "reg-suresh":
  "Patient with IHD 2yr (post-angioplasty 2024) and Hypertension 5yr, on Clopidogrel 75mg and Atorvastatin 40mg, last visited on 10 Feb'26 with stable angina, LDL 118 above target.",
  "apt-ramesh-ckd":
  "Patient with CKD Stage 5 5yr and Type 2 DM 18yr, on peritoneal dialysis since Jan 2024, Hypertension 12yr, IHD post-MI (2021), eGFR 11, K+ 5.8, Hb 9.2. 2 ER admissions for fluid overload. Kt/V and Echo overdue."
};

// ═══════════════ PATIENT DOCUMENTS (per-patient EMR uploads) ═══════════════

export const PATIENT_DOCUMENTS = {
  "__patient__": [
  { id: "doc-1", fileName: "CBC_Report_Mar2026.pdf", docType: "pathology", uploadedAt: "05 Mar'26", uploadedBy: "Apollo Diagnostics", pageCount: 2, size: "340 KB" },
  { id: "doc-2", fileName: "X-Ray_Chest_Feb2026.pdf", docType: "radiology", uploadedAt: "18 Feb'26", uploadedBy: "Dr. Sharma", pageCount: 1, size: "1.2 MB" },
  { id: "doc-3", fileName: "Previous_Rx_Jan2026.pdf", docType: "prescription", uploadedAt: "10 Jan'26", uploadedBy: "Dr. Meera", pageCount: 1, size: "180 KB" },
  { id: "doc-4", fileName: "Lipid_Panel_Dec2025.pdf", docType: "pathology", uploadedAt: "22 Dec'25", uploadedBy: "SRL Diagnostics", pageCount: 3, size: "520 KB" },
  { id: "doc-5", fileName: "ECG_Report_Dec2025.pdf", docType: "other", uploadedAt: "15 Dec'25", uploadedBy: "Patient", pageCount: 1, size: "890 KB" },
  { id: "doc-6", fileName: "Discharge_Summary_Nov2025.pdf", docType: "discharge_summary", uploadedAt: "02 Nov'25", uploadedBy: "City Hospital", pageCount: 4, size: "1.1 MB" },
  { id: "doc-7", fileName: "Thyroid_Panel_Oct2025.pdf", docType: "pathology", uploadedAt: "18 Oct'25", uploadedBy: "Metropolis Lab", pageCount: 2, size: "280 KB" },
  { id: "doc-8", fileName: "MRI_Brain_Sep2025.pdf", docType: "radiology", uploadedAt: "05 Sep'25", uploadedBy: "Dr. Reddy", pageCount: 6, size: "3.2 MB" }],

  "apt-neha": [
  { id: "doc-n1", fileName: "Lab_Results_Mar2026.pdf", docType: "pathology", uploadedAt: "09 Mar'26", uploadedBy: "Metropolis Lab", pageCount: 2, size: "420 KB" },
  { id: "doc-n2", fileName: "Chest_Xray_Feb2026.pdf", docType: "radiology", uploadedAt: "27 Feb'26", uploadedBy: "City Imaging", pageCount: 1, size: "1.4 MB" },
  { id: "doc-n3", fileName: "Pathology_Panel_Feb2026.pdf", docType: "pathology", uploadedAt: "25 Feb'26", uploadedBy: "Apollo Diagnostics", pageCount: 3, size: "560 KB" },
  { id: "doc-n4", fileName: "Previous_Rx_Feb2026.pdf", docType: "prescription", uploadedAt: "18 Feb'26", uploadedBy: "Dr. Meera", pageCount: 1, size: "190 KB" },
  { id: "doc-n5", fileName: "Insurance_PreAuth_Feb2026.pdf", docType: "other", uploadedAt: "16 Feb'26", uploadedBy: "Patient", pageCount: 2, size: "300 KB" }],

  "apt-lakshmi": [
  { id: "doc-l1", fileName: "Pap_Smear_Report_Feb2026.pdf", docType: "pathology", uploadedAt: "12 Feb'26", uploadedBy: "Path Lab", pageCount: 2, size: "410 KB" },
  { id: "doc-l2", fileName: "Pelvic_Ultrasound_Jan2026.pdf", docType: "radiology", uploadedAt: "25 Jan'26", uploadedBy: "Dr. Anitha", pageCount: 3, size: "1.8 MB" },
  { id: "doc-l3", fileName: "Hormone_Panel_Jan2026.pdf", docType: "pathology", uploadedAt: "18 Jan'26", uploadedBy: "Thyrocare", pageCount: 2, size: "320 KB" },
  { id: "doc-l4", fileName: "Previous_Rx_Dec2025.pdf", docType: "prescription", uploadedAt: "10 Dec'25", uploadedBy: "Dr. Kavitha", pageCount: 1, size: "150 KB" },
  { id: "doc-l5", fileName: "CA125_Report_Nov2025.pdf", docType: "pathology", uploadedAt: "28 Nov'25", uploadedBy: "SRL Diagnostics", pageCount: 1, size: "220 KB" }],

  "apt-anjali": [
  { id: "doc-a1", fileName: "OCT_Scan_Mar2026.pdf", docType: "radiology", uploadedAt: "03 Mar'26", uploadedBy: "Dr. Patel", pageCount: 4, size: "2.1 MB" },
  { id: "doc-a2", fileName: "Visual_Field_Test_Feb2026.pdf", docType: "other", uploadedAt: "15 Feb'26", uploadedBy: "Eye Care Centre", pageCount: 2, size: "680 KB" },
  { id: "doc-a3", fileName: "IOP_Chart_Jan2026.pdf", docType: "other", uploadedAt: "20 Jan'26", uploadedBy: "Dr. Patel", pageCount: 1, size: "180 KB" },
  { id: "doc-a4", fileName: "Fundus_Photo_Dec2025.pdf", docType: "radiology", uploadedAt: "12 Dec'25", uploadedBy: "Retina Clinic", pageCount: 2, size: "3.5 MB" }],

  "apt-priya": [
  { id: "doc-p1", fileName: "NT_Scan_Report_Mar2026.pdf", docType: "radiology", uploadedAt: "08 Mar'26", uploadedBy: "Dr. Sunita", pageCount: 3, size: "1.6 MB" },
  { id: "doc-p2", fileName: "First_Trimester_Screen_Feb2026.pdf", docType: "pathology", uploadedAt: "22 Feb'26", uploadedBy: "Metropolis Lab", pageCount: 2, size: "450 KB" },
  { id: "doc-p3", fileName: "Blood_Group_Rh_Feb2026.pdf", docType: "pathology", uploadedAt: "10 Feb'26", uploadedBy: "Apollo Lab", pageCount: 1, size: "120 KB" },
  { id: "doc-p4", fileName: "ANC_Registration_Jan2026.pdf", docType: "other", uploadedAt: "15 Jan'26", uploadedBy: "Dr. Rao", pageCount: 2, size: "340 KB" },
  { id: "doc-p5", fileName: "Thyroid_Panel_Jan2026.pdf", docType: "pathology", uploadedAt: "12 Jan'26", uploadedBy: "Thyrocare", pageCount: 1, size: "210 KB" },
  { id: "doc-p6", fileName: "Previous_Rx_Dec2025.pdf", docType: "prescription", uploadedAt: "28 Dec'25", uploadedBy: "Dr. Rao", pageCount: 1, size: "180 KB" }],

  "apt-arjun": [
  { id: "doc-ar1", fileName: "Vaccination_Record_Mar2026.pdf", docType: "vaccination", uploadedAt: "01 Mar'26", uploadedBy: "Dr. Nair", pageCount: 2, size: "280 KB" },
  { id: "doc-ar2", fileName: "Growth_Chart_Feb2026.pdf", docType: "other", uploadedAt: "15 Feb'26", uploadedBy: "Dr. Nair", pageCount: 1, size: "350 KB" },
  { id: "doc-ar3", fileName: "CBC_Report_Jan2026.pdf", docType: "pathology", uploadedAt: "20 Jan'26", uploadedBy: "Path Lab", pageCount: 2, size: "310 KB" },
  { id: "doc-ar4", fileName: "Hearing_Screen_Dec2025.pdf", docType: "other", uploadedAt: "10 Dec'25", uploadedBy: "ENT Clinic", pageCount: 1, size: "190 KB" },
  { id: "doc-ar5", fileName: "Previous_Rx_Nov2025.pdf", docType: "prescription", uploadedAt: "25 Nov'25", uploadedBy: "Dr. Nair", pageCount: 1, size: "140 KB" }],

  "apt-ramesh-ckd": [
  { id: "doc-rk1", fileName: "KFT_CBC_Panel_Mar2026.pdf", docType: "pathology", uploadedAt: "12 Mar'26", uploadedBy: "Apollo Diagnostics", pageCount: 3, size: "480 KB" },
  { id: "doc-rk2", fileName: "ER_Discharge_Summary_Feb2026.pdf", docType: "discharge_summary", uploadedAt: "28 Feb'26", uploadedBy: "City Hospital", pageCount: 4, size: "1.3 MB" },
  { id: "doc-rk3", fileName: "Cardiology_Opinion_Oct2025.pdf", docType: "other", uploadedAt: "18 Oct'25", uploadedBy: "Dr. Mehta (scanned)", pageCount: 2, size: "890 KB" },
  { id: "doc-rk4", fileName: "HbA1c_Lab_Report_Feb2026.pdf", docType: "pathology", uploadedAt: "15 Feb'26", uploadedBy: "Patient (uploaded photo)", pageCount: 1, size: "340 KB" },
  { id: "doc-rk5", fileName: "Handwritten_Rx_Aug2025.jpg", docType: "prescription", uploadedAt: "22 Aug'25", uploadedBy: "External Clinic", pageCount: 1, size: "1.1 MB" },
  { id: "doc-rk6", fileName: "PD_Monthly_Log_Jan2026.pdf", docType: "other", uploadedAt: "05 Jan'26", uploadedBy: "Dr. Sharma", pageCount: 2, size: "420 KB" },
  { id: "doc-rk7", fileName: "External_Lab_Iron_Panel_Jan2026.pdf", docType: "pathology", uploadedAt: "10 Jan'26", uploadedBy: "SRL Diagnostics (external)", pageCount: 1, size: "260 KB" }]

};

/**
 * Check whether a patient has symptom-collector intake data.
 *
 * Used by VoiceRxFlow to decide whether the VoiceRx panel starts
 * collapsed (no intake) or open (intake present → show intro).
 *
 * Previously lived in RxPadFloatingAgent.tsx (8,779 LOC dead file).
 */
export function patientHasSymptomCollectorData(patientId) {
  const entry = SMART_SUMMARY_BY_CONTEXT[patientId];
  return !!entry?.symptomCollectorData?.symptoms?.length;
}
