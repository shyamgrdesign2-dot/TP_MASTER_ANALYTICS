export const SIDE_NAVBAR_DIGITIZATION_RESPONSE_CONTRACT = {
  envelope: {
    acceptedResponsePaths: [
      "response.data.documents[0].data",
      "response.data.document.data",
      "response.data",
      "response",
    ],
    normalizedPayloadKey: "clinicalData",
    sectionIdKey: "section",
    note: "Phase 5 can adapt any accepted envelope into the normalized section payloads below.",
  },
  sections: {
    pastVisits: {
      section: "pastVisits",
      target: "visits[0].payload",
      inputExample: {
        symptoms: [
          { name: "Fever", duration: "2 days", severity: "High", notes: "No measured temperature" },
        ],
        examinations: [
          { name: "Lung Infection", notes: "Mild crepitations in bilateral lower zones" },
        ],
        diagnosis: [
          { name: "Viral Fever", since: "2 days", status: "Confirmed", notes: "Moderate" },
        ],
        medications: [
          {
            name: "Telma20 Tablet",
            frequency: "1-0-0-1",
            dosage: "1 Tablet(s)",
            schedule: "Before Food",
            duration: "4 Days",
            notes: "Stop if no fever",
            quantity: 8,
          },
        ],
        advice: ["Hydration and eye hygiene."],
        labInvestigation: [{ name: "CBC", instruction: "", notes: "" }],
        followUp: "2 Weeks",
        others: ["Voice section note."],
        dynamicFields: [{ title: "Work restrictions", notes: "Avoid night shifts for 3 days." }],
      },
      targetDisplayExample: {
        dateLabel: "Current Visit",
        digitalRx: {
          symptoms: [{ label: "Fever", detail: "2 days, High, No measured temperature" }],
          examinations: [{ label: "Lung Infection", detail: "Mild crepitations in bilateral lower zones" }],
          diagnoses: [{ label: "Viral Fever", detail: "2 days, Confirmed, Moderate" }],
          medications: [{ label: "Telma20 Tablet", detail: "1 Tablet(s), 1-0-0-1, Before Food, 4 Days, Stop if no fever, 8" }],
          advice: "Hydration and eye hygiene.",
          labInvestigations: ["CBC"],
          followUp: "After 2 Weeks",
          additionalNotes: "Voice section note.",
        },
      },
    },
    vitals: {
      section: "vitals",
      target: "visits[0].payload.vitalsAndBodyComposition",
      inputExample: {
        vitalsAndBodyComposition: {
          temperature: "99.2",
          pulse: "84",
          respiratoryRate: "20",
          bloodPressure: "124/78",
          systolic: "124",
          diastolic: "78",
          spo2: "97",
          randomBloodSugar: "116",
          height: "172",
          weight: "68.4",
          bmi: "23.1",
          bmr: "1680",
          bsa: "1.82",
          fib4: "",
        },
      },
      targetDisplayExample: {
        dateLabel: "Current Visit",
        rows: [
          { label: "Temperature", unit: "Frh", value: "99.2" },
          { label: "Pulse", unit: "/min", value: "84" },
          { label: "Resp. Rate", unit: "/min", value: "20" },
          { label: "Systolic", unit: "mmhg", value: "124" },
          { label: "Diastolic", unit: "mmhg", value: "78" },
          { label: "SpO2", unit: "%", value: "97" },
          { label: "RBS", unit: "mg/dL", value: "116" },
        ],
      },
    },
    history: {
      section: "history",
      target: "visits[0].payload.medicalHistory",
      inputExample: {
        medicalHistory: [
          { name: "Type 2 Diabetes", type: "Medical condition", duration: "2 Year(s)", relation: "", enable: "Y", notes: "" },
          { name: "Ibuprofen", type: "Allergies", duration: "5 Year(s)", relation: "", enable: "Y", notes: "Gastric intolerance" },
          { name: "Diabetes Mellitus", type: "Family History", duration: "", relation: "Father", enable: "Y", notes: "" },
          { name: "Appendectomy", type: "Surgical History", duration: "", relation: "", enable: "Y", notes: "2018, laparoscopic" },
          { name: "Smoking", type: "Lifestyle", duration: "10 Year(s)", relation: "", enable: "N", notes: "Quit target 3 months" },
          { name: "Diet", type: "Additional Notes", duration: "", relation: "", enable: "Y", notes: "Irregular meal timing" },
        ],
      },
      targetDisplayExample: {
        groups: [
          { title: "Medical Conditions", items: [{ name: "Type 2 Diabetes", detail: "2 Year(s), Active" }] },
          { title: "Allergies", items: [{ name: "Ibuprofen", detail: "5 Year(s), Active, Gastric intolerance" }] },
          { title: "Family History", items: [{ name: "Diabetes Mellitus", detail: "Father" }] },
          { title: "Surgeries", items: [{ name: "Appendectomy", detail: "2018, laparoscopic" }] },
          { title: "Lifestyle", items: [{ name: "Smoking", detail: "10 Year(s), Negated, Quit target 3 months" }] },
          { title: "Additional Notes", items: [{ name: "Diet", detail: "Irregular meal timing" }] },
        ],
      },
    },
    labResults: {
      section: "labResults",
      target: "visits[0].payload.labResults",
      inputExample: {
        labResults: [
          { testname: "TSH", value: "5.2", unit: "mIU/L", notes: "High", abnormal: true, direction: "high" },
          { testname: "Vitamin D", value: "20", unit: "ng/mL", notes: "Low", abnormal: true, direction: "low" },
          { testname: "Haemoglobin", value: "11.2", unit: "g/dL", notes: "" },
        ],
      },
      targetDisplayExample: {
        dateLabel: "Current Visit",
        rows: [
          { label: "TSH", unit: "(mIU/L)", value: "5.2", abnormal: true, direction: "high" },
          { label: "Vitamin D", unit: "(ng/mL)", value: "20", abnormal: true, direction: "low" },
          { label: "Haemoglobin", unit: "(g/dL)", value: "11.2" },
        ],
      },
    },
    gynec: {
      section: "gynec",
      target: "visits[0].payload.gyneacHistory",
      inputExample: {
        gyneacHistory: {
          lastMenstrualPeriod: "15 Feb'26",
          ageAtMenarche: 13,
          cycle: "Irregular",
          intervalCycle: 35,
          intervalNotes: "35-40 days",
          flow: "Heavy",
          durationOfMenstrualFlow: 5,
          clotsDuringFlow: "Yes",
          numberOfPadsPerDay: 5,
          pain: "None",
          occurrenceOfPain: "Before Menses",
          notes: "Tracks cycles on mobile app.",
        },
      },
      targetDisplayExample: {
        cards: [
          { title: "LMP", lines: ["LMP: 15 Feb'26"] },
          { title: "Menarche", lines: ["Age at: 13 years"] },
          { title: "Cycle", lines: ["Type: Irregular | Interval: 35-40 days"] },
          { title: "Flow", lines: ["Volume: Heavy | Duration: 5 days | Clots: Yes | Pads/day: 5"] },
          { title: "Pain", lines: ["Severity: None | Occurrence: Before Menses"] },
          { title: "Notes", lines: ["Tracks cycles on mobile app."] },
        ],
      },
    },
    obstetric: {
      section: "obstetric",
      target: "visits[0].payload.obstetricHistory",
      inputExample: {
        obstetricHistory: {
          gravidity: 1,
          parity: 0,
          livingChildren: 0,
          abortions: 0,
          ectopicPregnancies: 0,
          lastMenstrualPeriod: "14 Jan'26",
          expectedDateOfDelivery: "21 Oct'26",
          calculatedExpectedDateOfDelivery: "25 Oct'26",
          gestationWeeks: 14,
          gestationDays: 2,
          bloodGroup: "B+ve",
          husbandsBloodGroup: "O+ve",
          antenatalExamination: [
            { date: "17 Jan'26", pallor: "Absent", oedema: "Mild", bmi: "23", bp: "128/82", fhr: "142" },
          ],
          ancHistory: [
            { name: "Complete Blood Count", weekRange: "8-12 Weeks", dueDate: "11 Mar'26", status: "Done" },
          ],
          immunisationHistory: [
            { name: "Tetanus Toxoid (TT-1)", status: "Done", givenDate: "20 Feb'26" },
          ],
        },
      },
      targetDisplayExample: {
        cards: [
          { title: "Patient Info", lines: ["LMP: 14 Jan'26 | EDD: 21 Oct'26 | C.E.D.D: 25 Oct'26", "Gestation: 14 Weeks 2 Days | Patient Blood Group: B+ve | Husband's Blood Group: O+ve"] },
          { title: "GPLAE", lines: ["G: 1 | P: 0 | L: 0 | A: 0 | E: 0"] },
          { title: "Current Examination", lines: ["17 Jan'26 | Pallor: Absent | Oedema: Mild | BMI: 23 Kg/m2 | BP: 128/82 mmHg | FHR: 142 bpm"] },
          { title: "ANC Scheduler", lines: ["Complete Blood Count | Week Range: 8-12 Weeks | Due Date: 11 Mar'26 | Status: Done"] },
          { title: "Immunisation History", lines: ["Tetanus Toxoid (TT-1) | Status: Done | Given Date: 20 Feb'26"] },
        ],
      },
    },
  },
};

export function getDigitizationSectionContract(sectionId) {
  return SIDE_NAVBAR_DIGITIZATION_RESPONSE_CONTRACT.sections[sectionId] || null;
}
