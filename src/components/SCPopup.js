import { Button, Checkbox, Divider, message, Modal } from "antd";
import { useContext, useState } from "react";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { useSelector } from "react-redux";

import { useDispatch } from "react-redux";
import {
  setSelectAutofill,
  setSelectedSymptomsCollector,
} from "../redux/ddxSlice";
import { GB_VOICE_RX_FREE, NEO_NATOLOGISTS_DP_ID, PAEDIATRICS } from "../utils/constants";
import { getClinicName, getTokenData, isVoiceRxFree, shouldMonetizationDisabled, trackEvent } from "../utils/utils";
import dayjs from "dayjs";
import CashManagerContext from "../context/CashManagerContext";
import { ASSETS } from "../assets";
import {
  normalizeVitalsAndBodyCompositionToRxRowFields,
  rxVitalsPatchToCollectorDisplayKeys,
  vitalScalarString,
} from "../utils/symptomCollectorVitalsMerge";
import { addUpdateVitals, getPatientBirthWeight } from "../redux/vitalsSlice";
const {
  scHeaderBg,
  scRx: autoFillRx,
  scBg,
  closeSquare: close,
  scStrip,
  symptoms,
  customModule: custom,
  medicalHistoryDark: medicalHistory,
  messageQuestion: questions,
  endVisit: successIcon,
  closeVisit: closeIcon,
} = ASSETS.images;

const VALID_TYPES = {
  medical_condition: "Medical Condition",
  "medical condition": "Medical Condition",
  allergies: "Allergies",
  allergy: "Allergies",
  "family history": "Family History",
  lifestyle: "Lifestyle",
};

const VITAL_FIELD_LABELS = {
  temperature: "Temperature",
  pulse: "Pulse",
  respiratoryRate: "Respiratory rate",
  bloodPressure: "Blood pressure",
  systolic: "Systolic",
  diastolic: "Diastolic",
  spo2: "SpO₂",
  randomBloodSugar: "Random blood sugar",
  height: "Height",
  weight: "Weight",
  headCircumference: "Head circumference",
  waistCircumference: "Waist circumference",
  bmi: "BMI",
  bmr: "BMR",
  bsa: "BSA",
  fib4: "FIB-4",
  generalRBS: "General RBS",
};

const VITAL_DISPLAY_ORDER = Object.keys(VITAL_FIELD_LABELS);

const getNonEmptyVitalKeys = (vitals) => {
  if (!vitals || typeof vitals !== "object") return [];
  return Object.keys(vitals).filter(
    (k) => vitalScalarString(vitals[k]) !== ""
  );
};

const segregateDataByType = (data) => {
  const segregatedData = {
    "Medical Condition": [],
    Allergies: [],
    "Family History": [],
    Lifestyle: [],
    "Additional History": [],
  };

  data.forEach((item) => {
    const normalizedType = item.type.toLowerCase();
    const mappedType = VALID_TYPES[normalizedType];

    const newItem = {
      name: item.name,
      duration: item.duration || "",
      notes: item.notes || "",
      relation: item.relation || "",
      status: "Active",
      medication: normalizedType === "medical_condition" ? "Yes" : "",
      lineItem: item.lineItem || "",
    };

    if (mappedType) {
      segregatedData[mappedType].push(newItem);
    } else {
      // Add to Additional History as notes
      segregatedData["Additional History"].push({
        notes: `${item.name}${item.notes ? `: ${item.notes}` : ""}`,
      });
    }
  });

  return {
    symptoms: [], // Keep existing symptoms if any
    medicalHistory: [
      {
        title: "Medical Condition ",
        tmmhs_id: 2,
        items: segregatedData["Medical Condition"].map((item) => ({
          name: item.name,
          duration: item.duration,
          status: item.status,
          medication: item.medication,
          notes: item.notes,
          lineItem: item.lineItem,
        })),
      },
      {
        title: "Allergies",
        tmmhs_id: 4,
        items: segregatedData["Allergies"].map((item) => ({
          name: item.name,
          duration: item.duration,
          status: item.status,
          notes: item.notes,
          lineItem: item.lineItem,
        })),
      },
      {
        title: "Family History",
        tmmhs_id: 3,
        items: segregatedData["Family History"].map((item) => ({
          name: item.name,
          duration: item.duration,
          relation: item.relation,
          notes: item.notes,
          lineItem: item.lineItem,
        })),
      },
      {
        title: "Lifestyle",
        tmmhs_id: 1,
        items: segregatedData["Lifestyle"].map((item) => ({
          name: item.name,
          duration: item.duration,
          status: item.status,
          notes: item.notes,
          lineItem: item.lineItem,
        })),
      },
      {
        title: "Additional History",
        items: segregatedData["Additional History"].map((item) => ({
          notes: item.notes,
        })),
      },
    ].filter((section) => section.items.length > 0), // Only include sections with items
    notes: "",
  };
};

const formatMedicalHistoryForDisplay = (data) => {
  if (!data) return [];

  const groupedData = {
    "Medical Condition": [],
    Allergies: [],
    "Family History": [],
    Lifestyle: [],
    "Additional History": [],
  };

  data.forEach((item) => {
    const normalizedType = item.type?.toLowerCase();
    const mappedType = VALID_TYPES[normalizedType] || "Additional History";

    let displayText = item.name;
    const additionalInfo = [];

    if (item.relation) additionalInfo.push(`Relation: ${item.relation}`);
    if (item.duration) additionalInfo.push(`Since: ${item.duration}`);
    if (item.notes) additionalInfo.push(`Notes: ${item.notes}`);

    if (additionalInfo.length > 0) {
      displayText += ` (${additionalInfo.join(", ")})`;
    }

    groupedData[mappedType].push({
      ...item,
      displayText,
    });
  });

  // Convert to array format with titles and filter out empty sections
  return Object.entries(groupedData)
    .filter(([_, items]) => items.length > 0)
    .map(([title, items]) => ({
      title,
      items,
    }));
};

const SCPopup = ({
  handlePopup,
  handleGenRx,
  onVoiceAutofill,
  onAmbientAutofill,
}) => {
  const dispatch = useDispatch();
  const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
  const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);
  const tp_monetization_enable = !shouldMonetizationDisabled();
  const isSmartPrescription =
    window.location.href.includes("smart-prescription");
  const { symptomCollector, selectedSymptomsCollector } = useSelector(
    (state) => state.ddx
  );
  const { profile, userId } = useSelector((state) => state.doctors);
  const { patient_data, pamId } = useContext(CashManagerContext);
  const clinic_name = getClinicName(profile?.hospital_data);
  const tokenData = getTokenData();
  const {
    patientBirthWeight: storedPatientBirthWeight,
  } = useSelector((state) => state.vitals);
  const { vitalsData } = useContext(CashManagerContext);
  const patientBirthWeight = vitalsData?.[0]?.patient_birth_weight || storedPatientBirthWeight;
  const moengageData = {
    clinic_name,
    appointment_id:
      patient_data !== undefined
        ? patient_data.hasOwnProperty("pam_id")
          ? patient_data.pam_id
          : pamId
        : 0,
    hospital_id: tokenData?.clinic_id,
    timestamp: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    doctor_id: userId,
    doctor_name: profile?.um_name,
    doctor_speciality: profile?.dp_name,
  };

  // Get appointment agent data from localStorage
  const getAppointmentAgentData = () => {
    try {
      const storedData = localStorage.getItem("appointmentAgentsData");
      if (storedData) {
        return JSON.parse(storedData);
      }
    } catch (error) {
      console.error("Error parsing appointment agent data:", error);
    }
    return null;
  };

  const appointmentAgentData = getAppointmentAgentData();

  const symptomsCollectorData =
    selectedSymptomsCollector?.symptoms?.length > 0 ||
    selectedSymptomsCollector?.medicalHistory?.length > 0 ||
    getNonEmptyVitalKeys(selectedSymptomsCollector?.vitalsAndBodyComposition)
      .length > 0
      ? selectedSymptomsCollector
      : symptomCollector;

  // Initialize with all symptoms selected
  const [selectedSymptoms, setSelectedSymptoms] = useState(
    symptomsCollectorData?.symptoms?.map((s) => s.name) || []
  );

  // Initialize selected medical history based on the data structure
  const [selectedMedicalHistory, setSelectedMedicalHistory] = useState(() => {
    if (!symptomsCollectorData?.medicalHistory) return [];

    // Handle array of objects format (first structure)
    if (
      Array.isArray(symptomsCollectorData.medicalHistory) &&
      !symptomsCollectorData.medicalHistory[0]?.items
    ) {
      return symptomsCollectorData.medicalHistory.map((item) => item.name);
    }

    // Handle nested structure with items array (second structure)
    if (
      Array.isArray(symptomsCollectorData.medicalHistory) &&
      symptomsCollectorData.medicalHistory[0]?.items
    ) {
      return symptomsCollectorData.medicalHistory.reduce((acc, section) => {
        const sectionItems = section.items.map((item) => item.name);
        return [...acc, ...sectionItems];
      }, []);
    }

    return [];
  });

  const [selectedVitalKeys, setSelectedVitalKeys] = useState(() => {
    const stored = symptomsCollectorData?.vitalsAndBodyComposition;
    if (stored && typeof stored === "object" && Object.keys(stored).length > 0) {
      const fromRx = rxVitalsPatchToCollectorDisplayKeys(stored);
      if (fromRx.length > 0) return fromRx;
    }
    return getNonEmptyVitalKeys(symptomCollector?.vitalsAndBodyComposition);
  });

  const [selectedNotes, setSelectedNotes] = useState(true);

  // Format medical history for display
  const formattedMedicalHistory = formatMedicalHistoryForDisplay(
    symptomCollector?.medicalHistory
  );

  const hasVoiceAutofill = typeof onVoiceAutofill === "function";
  const hasAmbientAutofill = typeof onAmbientAutofill === "function";
  const shouldShowVoiceOptions =
    !isSmartPrescription &&
    (tp_monetization_enable || isFreeVoiceRxUser) &&
    (hasVoiceAutofill || hasAmbientAutofill);

  const buildSelectedData = () => {
    if (!symptomCollector) return null;
    const allSymptoms = symptomCollector?.symptoms || [];
    const allMedicalHistory = symptomCollector?.medicalHistory || [];

    // Filter and format selected symptoms
    const selectedSymptomData = allSymptoms.filter((symptom) =>
      selectedSymptoms.includes(symptom.name)
    );

    // Filter and format selected medical history
    const selectedMedicalHistoryData = allMedicalHistory.filter(
      (item) => selectedMedicalHistory.includes(item.name)
    );

    const medicalHistoryPayload = selectedMedicalHistoryData.map((item) => ({
      type: item.type,
      name: item.name,
      duration: item.duration,
      relation: item.relation,
      notes: item.notes,
      status: item.status,
      lineItem: item.lineItem,
    }));

    // Combine and segregate the data
    const formattedData = segregateDataByType(medicalHistoryPayload);

    // Add selected symptoms to the formatted data
    formattedData.symptoms = selectedSymptomData;
    formattedData.notes = selectedNotes ? symptomCollector.notes : "";

    const vitalsSource =
      symptomsCollectorData?.vitalsAndBodyComposition ||
      symptomCollector?.vitalsAndBodyComposition ||
      {};
    const vitalsAndBodyComposition = {};
    selectedVitalKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(vitalsSource, key)) {
        vitalsAndBodyComposition[key] = vitalsSource[key];
      }
    });
    if (Object.keys(vitalsAndBodyComposition).length > 0) {
      formattedData.vitalsAndBodyComposition =
        normalizeVitalsAndBodyCompositionToRxRowFields(vitalsAndBodyComposition);
    }

    const voicePayload = {
      symptoms: selectedSymptomData.map((symptom) => {
        const payload = {
          name: symptom.name,
          duration: symptom.duration || symptom.since || "",
          severity: symptom.severity || "",
          notes: symptom.notes || "",
          lineItem: symptom.lineItem || "",
        };
        if (symptom.since) {
          payload.since = symptom.since;
        }
        return payload;
      }),
      medicalHistory: medicalHistoryPayload,
      others: selectedNotes && symptomCollector.notes ? symptomCollector.notes : "",
    };

    if (Object.keys(vitalsAndBodyComposition).length > 0) {
      voicePayload.vitalsAndBodyComposition =
        normalizeVitalsAndBodyCompositionToRxRowFields(vitalsAndBodyComposition);
    }

    return { formattedData, voicePayload };
  };

  const applySelectionToRxPad = (formattedData) => {
    dispatch(setSelectedSymptomsCollector(formattedData));
    dispatch(setSelectAutofill(true));
    handlePopup();
    toastMessage();
    trackEvent("SC_Doctor_SentoRxPad", moengageData);
  };

  const onAddUpdateClicked = async (vitalsAndBodyComposition) => {
    // Voice / Ambient / Snap / Smart only: use listVitalsTodayIds, direct addVitals, setVitalsIdsFromAddVitals (same ids for update)
    // if (isVoiceAmbientSnapSmartFlow) {
    //     if (!patient_data?.patient_unique_id) {
    //         errorMessage('Patient is required to save vitals.');
    //         return;
    //     }
    //     setVoiceAmbientSaving(true);
    //     try {
    //         const today = moment().format('YYYY-MM-DD');
    //         const ids = resolveVitalsIds(listVitalsTodayIds, patient_data.patient_unique_id, childVitalsData[0]);
    //         const dataWithIds = childVitalsData.map((row, i) => ({
    //             ...row,
    //             tcv_id: i === 0 ? ids.tcv_id : (row.tcv_id ?? 0),
    //             tcbc_id: i === 0 ? ids.tcbc_id : (row.tcbc_id ?? 0),
    //             dev_unique_id: i === 0 ? ids.dev_unique_id : (row.dev_unique_id ?? 0)
    //         }));
    //         const sendData = {
    //             patient_unique_id: patient_data.patient_unique_id,
    //             pm_pid: patient_data.pm_pid ?? 0,
    //             pm_id: patient_data.pm_id ?? 0,
    //             pam_id: patient_data.pam_id ?? 0,
    //             patient_birth_weight: patientBirthWeight,
    //             data: dataWithIds
    //         };
    //         const addRes = await ApiVitals.addUpdateVitals(sendData);
    //         if (addRes?.status !== false && addRes?.statusCode !== 400) {
    //             const savedVitals = addRes?.data && Array.isArray(addRes.data) ? addRes.data : [];
    //             const todaySaved = savedVitals.find(v => (v.date || '').toString().startsWith(today)) || savedVitals[0];
    //             const responseIds = {
    //                 tcv_id: todaySaved?.tcv_id ?? 0,
    //                 tcbc_id: todaySaved?.tcbc_id ?? 0,
    //                 dev_unique_id: todaySaved?.dev_unique_id ?? 0
    //             };
    //             dispatch(setVitalsIdsFromAddVitals({ flow: flowForRedux, patient_unique_id: patient_data.patient_unique_id, tcv_id: responseIds.tcv_id, tcbc_id: responseIds.tcbc_id, dev_unique_id: responseIds.dev_unique_id }));
    //             dispatch(clearListVitalsToday()); // form first row (via parent state) is source of truth after save
    //             const vitalsObject = childVitalsDataToVitalsObject(childVitalsData);
    //             const vitalsObjectWithIds = { ...vitalsObject, ...responseIds };
    //             if (typeof onVitalsSave === 'function') {
    //                 onVitalsSave(vitalsObjectWithIds);
    //             }
    //             if (typeof handleCollapsed === 'function') handleCollapsed(1);
    //             if (typeof handleDrawerVital === 'function') handleDrawerVital();
    //         } else {
    //             errorMessage(addRes?.error || addRes?.message || 'Failed to save vitals');
    //         }
    //     } catch (err) {
    //         errorMessage(err?.message || err?.response?.data?.error || 'Failed to save vitals');
    //     } finally {
    //         setVoiceAmbientSaving(false);
    //     }
    //     return;
    // }

    const clinic_name = getClinicName(profile?.hospital_data);
    window.Moengage.track_event("TP_vitals_updated", {
        clinic_name,
        "patient_number": patient_data?.pm_contact_no,
        "patient_id": patient_data?.patient_unique_id
    });
    const row = {
      "date": dayjs().format("YYYY-MM-DD"),
      "dev_unique_id": 0,
      "tcv_id": 0,
      "tcbc_id": 0,
      "temp": vitalsAndBodyComposition?.temp ?? "",
      "pres": vitalsAndBodyComposition?.pres ?? "",
      "resp_rate": vitalsAndBodyComposition?.resp_rate ?? "",
      "systolic": vitalsAndBodyComposition?.systolic ?? "",
      "diastolic": vitalsAndBodyComposition?.diastolic ?? "",
      "spo2": vitalsAndBodyComposition?.spo2 ?? "",
      "height": vitalsAndBodyComposition?.height ?? "",
      "weight": vitalsAndBodyComposition?.weight ?? "",
      "fib4": vitalsAndBodyComposition?.fib4 ?? "",
      "waist_circumference": vitalsAndBodyComposition?.waist_circumference ?? "",
      "ofc": vitalsAndBodyComposition?.ofc ?? "",
      "bmi": vitalsAndBodyComposition?.bmi ?? "",
      "bmr": vitalsAndBodyComposition?.bmr ?? "",
      "bsa": vitalsAndBodyComposition?.bsa ?? "",
      "general_rbs": vitalsAndBodyComposition?.general_rbs ?? "",
  }
    var sendData = {
        patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
        pm_pid: patient_data !== undefined ? patient_data.pm_pid : 0,
        pm_id: patient_data !== undefined ? patient_data.pm_id : 0,
        pam_id: patient_data !== undefined && patient_data.pam_id !== undefined ? patient_data.pam_id : 0,
        patient_birth_weight: patientBirthWeight,
        data: [row],
    };
    const action = await dispatch(addUpdateVitals(sendData));
    if ((profile?.dp_name === PAEDIATRICS || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) && patient_data?.ageMonths <= 12 && patient_data?.ageYears === 0) {
      dispatch(
        getPatientBirthWeight({
          patient_unique_id:
            patient_data !== undefined ? patient_data.patient_unique_id : 0,
          pam_id:
            patient_data !== undefined && patient_data.pam_id !== undefined
              ? patient_data.pam_id
              : 0,
        })
      );
    }
}

  const handleAutofill = () => {
    const payloads = buildSelectedData();
    if (Object.keys(payloads?.voicePayload?.vitalsAndBodyComposition).length > 0) {
      onAddUpdateClicked(payloads.voicePayload.vitalsAndBodyComposition);
    }
    if (!payloads) return;
    applySelectionToRxPad(payloads.formattedData);
  };

  const handleVoiceAutofillClick = () => {
    const supportsVoiceAutofill = typeof onVoiceAutofill === "function";
    if (!supportsVoiceAutofill) {
      handleGenRx();
      handleAutofill();
      return;
    }
    const payloads = buildSelectedData();
    if (!payloads) return;
    handlePopup();
    toastMessage();
    trackEvent("SC_Doctor_SentToVoiceRx", moengageData);
    onVoiceAutofill(payloads.voicePayload);
  };

  const handleAmbientAutofillClick = () => {
    const supportsAmbientAutofill = typeof onAmbientAutofill === "function";
    if (!supportsAmbientAutofill) {
      handleAutofill();
      return;
    }
    const payloads = buildSelectedData();
    if (!payloads) return;
    handlePopup();
    toastMessage();
    trackEvent("SC_Doctor_SentToAmbientVoiceRx", moengageData);
    onAmbientAutofill(payloads.voicePayload);
  };

  const toastMessage = () => {
    message.open({
      key: "sc-popup-message",
      type: "",
      className: "message-appointment",
      content: (
        <div className="d-flex align-items-center">
          <img src={successIcon} className="me-3" alt="Success" />
          <div>
            <div className="title-common text-start fontroboto">
              Successfully Autofilled Symptoms and Medical History
            </div>
          </div>
          <img
            src={closeIcon}
            className="ms-3 cursor-pointer"
            onClick={() => message.destroy("sc-popup-message")}
            alt="Close"
          />
        </div>
      ),
      duration: 5,
    });
  };

  const vitalsForUi = symptomCollector?.vitalsAndBodyComposition;
  const filledVitalKeysForUi = getNonEmptyVitalKeys(vitalsForUi);
  const orderedVitalKeysForUi =
    filledVitalKeysForUi.length > 0
      ? [
          ...VITAL_DISPLAY_ORDER.filter((k) =>
            filledVitalKeysForUi.includes(k)
          ),
          ...filledVitalKeysForUi.filter(
            (k) => !VITAL_DISPLAY_ORDER.includes(k)
          ),
        ]
      : [];

  return (
    <Modal
      width={"730px"}
      height={"100%"}
      centered
      open={true}
      closeIcon={null}
      onCancel={handlePopup}
      className="sc-popup modalcommon"
      style={{
        top: "32px",
        right: "32px",
        bottom: "32px",
        margin: 0,
        position: "fixed",
        height: "calc(100vh - 64px)",
        padding: "0",
        borderRadius: "20px",
        overflow: "hidden",
      }}
      title={
        <div
          className="d-flex justify-content-between align-items-center"
          style={{
            background: `url(${scHeaderBg})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            height: "100%",
            padding: "0px 24px",
            width: "100%",
          }}
        >
          <div
            className="d-flex justify-content-between align-items-center w-100"
            style={{ height: 88 }}
          >
            <div className="d-flex justify-content-between align-items-center gap-3">
              <div>
                <img width={42} height={42} src={scStrip} alt="close" />
              </div>
              <div>
                <div
                  className="text-white"
                  style={{ fontSize: 18, fontWeight: 500 }}
                >
                  {appointmentAgentData?.name || "Agent Mira"}
                </div>
                <span
                  className="text-white"
                  style={{ fontSize: 14, fontWeight: 400 }}
                >
                  Your personal medical assistant
                </span>
              </div>
            </div>
            <div>
              <img
                src={close}
                alt="close"
                className="cursor-pointer"
                onClick={() => {
                  handlePopup();
                  trackEvent("SC_Doctor_DismissedSummary", moengageData);
                }}
              />
            </div>
          </div>
        </div>
      }
      footer={null}
    >
      <div
        style={{
          height: "calc(100vh - 240px)",
          background: `url(${scBg})`,
          objectFit: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          padding: 24,
          overflow: "auto",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 600 }}>
          Symptoms & Medical History Shared by Patient
        </div>
        <div style={{ fontSize: 16, paddingBottom: 20 }}>
          You can edit these details after they are autofilled into the Rx Pad
          or Voice Rx.
        </div>
        {symptomCollector?.symptoms?.length > 0 && (
          <div
            style={{
              overflow: "auto",
              background: "white",
              padding: 18,
              borderRadius: 10,
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex gap-3 patient-details">
                <img src={symptoms} alt="symptoms" />
                <span style={{ color: "#454551" }}>Symptoms</span>
              </div>

              <span
                className="hyperling-text-style cursor-pointer"
                onClick={() => {
                  if (
                    selectedSymptoms.length === symptomCollector.symptoms.length
                  ) {
                    setSelectedSymptoms([]); // Unselect all
                  } else {
                    setSelectedSymptoms(
                      symptomCollector.symptoms.map((s) => s.name)
                    ); // Select all
                  }
                }}
              >
                {selectedSymptoms.length === symptomCollector.symptoms.length
                  ? "Unselect All"
                  : "Select All"}
              </span>
            </div>
            <Divider style={{ margin: "15px 0px" }} />
            <div className="space-y-6">
              {symptomCollector?.symptoms?.map((symptom, index) => (
                <div
                  key={index}
                  className="ml-3 mb-2 relative pl-4 d-flex gap-2"
                >
                  <span className="text-[14px] font-medium text-gray-900 mb-1">
                    <Checkbox
                      className="me-2"
                      checked={selectedSymptoms.includes(symptom.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSymptoms([
                            ...selectedSymptoms,
                            symptom.name,
                          ]);
                        } else {
                          setSelectedSymptoms(
                            selectedSymptoms.filter(
                              (name) => name !== symptom.name
                            )
                          );
                        }
                      }}
                    />
                    {symptom.name}
                  </span>
                  {(symptom.duration || symptom.severity || symptom.notes) && (
                    <span className="text-gray-400">
                      (
                      {symptom.duration && (
                        <>
                          Since:{" "}
                          <span className="text-gray-600">
                            {symptom.duration}
                          </span>{" "}
                          {symptom.severity && (
                            <span className="text-black">, </span>
                          )}
                        </>
                      )}
                      {symptom.severity && (
                        <span className="text-gray-600">
                          {symptom.severity}
                        </span>
                      )}
                      {symptom.notes && (
                        <span className="text-gray-600">{symptom.notes}</span>
                      )}
                      )
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {formattedMedicalHistory.length > 0 && (
          <div
            style={{
              overflow: "auto",
              background: "white",
              padding: 18,
              borderRadius: 10,
              marginTop: 20,
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex gap-3 patient-details">
                <img src={medicalHistory} alt="medical history" />
                <span style={{ color: "#454551" }}>Medical History</span>
              </div>
            </div>

            {formattedMedicalHistory.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-[16px] font-medium text-gray-900">
                    {section.title}
                  </span>
                  <span
                    className="text-primary cursor-pointer"
                    style={{ textDecoration: "underline" }}
                    onClick={() => {
                      const sectionItems = section.items.map(
                        (item) => item.name
                      );
                      if (
                        sectionItems.every((name) =>
                          selectedMedicalHistory.includes(name)
                        )
                      ) {
                        setSelectedMedicalHistory(
                          selectedMedicalHistory.filter(
                            (name) => !sectionItems.includes(name)
                          )
                        );
                      } else {
                        const newSelected = [
                          ...new Set([
                            ...selectedMedicalHistory,
                            ...sectionItems,
                          ]),
                        ];
                        setSelectedMedicalHistory(newSelected);
                      }
                    }}
                  >
                    Unselect All
                  </span>
                </div>

                <div
                  className="space-y-2"
                  style={{
                    background: "#fff",
                    borderRadius: "8px",
                    padding: "16px",
                    border: "1px solid #F1F1F5",
                  }}
                >
                  {section.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="d-flex align-items-start gap-2"
                      style={{
                        borderBottom:
                          itemIndex !== section.items.length - 1
                            ? "1px solid #F1F1F5"
                            : "none",
                        paddingBottom:
                          itemIndex !== section.items.length - 1 ? "12px" : "0",
                        marginBottom:
                          itemIndex !== section.items.length - 1 ? "12px" : "0",
                      }}
                    >
                      <Checkbox
                        className="me-2"
                        checked={selectedMedicalHistory.includes(item.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMedicalHistory([
                              ...selectedMedicalHistory,
                              item.name,
                            ]);
                          } else {
                            setSelectedMedicalHistory(
                              selectedMedicalHistory.filter(
                                (name) => name !== item.name
                              )
                            );
                          }
                        }}
                      />
                      {section.title === "Additional History" ? (
                        <div className="text-[14px] text-gray-900">
                          {item.displayText}
                        </div>
                      ) : (
                        <div className="text-[14px] text-gray-900">
                          <div className="d-flex gap-2 align-items-center flex-wrap">
                            <span className="font-medium">Issue :</span>
                            <span>{item.name}</span>
                            {item.duration && (
                              <>
                                <span className="font-medium">| Since :</span>
                                <span>{item.duration}</span>
                              </>
                            )}
                            {item.status && (
                              <>
                                <span className="font-medium">| Status :</span>
                                <span>{item.status}</span>
                              </>
                            )}
                            {item.medication && (
                              <>
                                <span className="font-medium">
                                  | Medication :
                                </span>
                                <span>{item.medication}</span>
                              </>
                            )}
                            {item.relation && (
                              <>
                                <span className="font-medium">
                                  | Relative :
                                </span>
                                <span>{item.relation}</span>
                              </>
                            )}
                          </div>
                          {item.notes && (
                            <div className="d-flex gap-2 align-items-center mt-1">
                              <span className="font-medium">Notes :</span>
                              <span>{item.notes}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {orderedVitalKeysForUi.length > 0 && (
          <div
            style={{
              overflow: "auto",
              background: "white",
              padding: 18,
              borderRadius: 10,
              marginTop: 20,
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex gap-3 patient-details">
                <img src={custom} alt="vitals" />
                <span style={{ color: "#454551" }}>
                  Vitals & body composition
                </span>
              </div>
              <span
                className="hyperling-text-style cursor-pointer"
                onClick={() => {
                  if (
                    selectedVitalKeys.length === orderedVitalKeysForUi.length
                  ) {
                    setSelectedVitalKeys([]);
                  } else {
                    setSelectedVitalKeys([...orderedVitalKeysForUi]);
                  }
                }}
              >
                {selectedVitalKeys.length === orderedVitalKeysForUi.length
                  ? "Unselect All"
                  : "Select All"}
              </span>
            </div>
            <Divider style={{ margin: "15px 0px" }} />
            <div className="space-y-6">
              {orderedVitalKeysForUi.map((key) => (
                <div
                  key={key}
                  className="ml-3 mb-2 relative pl-4 d-flex gap-2 align-items-start"
                >
                  <Checkbox
                    className="me-2"
                    checked={selectedVitalKeys.includes(key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedVitalKeys([...selectedVitalKeys, key]);
                      } else {
                        setSelectedVitalKeys(
                          selectedVitalKeys.filter((k) => k !== key)
                        );
                      }
                    }}
                  />
                  <span className="text-[14px] font-medium text-gray-900">
                    <span className="font-medium">
                      {VITAL_FIELD_LABELS[key] || key}
                      {": "}
                    </span>
                    <span className="text-gray-600">{vitalsForUi?.[key]?.value + " " + vitalsForUi?.[key]?.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {symptomCollector?.notes?.length > 0 && (
          <div
            style={{
              overflow: "auto",
              background: "white",
              padding: 18,
              borderRadius: 10,
              marginTop: 20,
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex gap-3 patient-details">
                <img src={custom} alt="custom" />
                <span style={{ color: "#454551" }}>Additional Notes</span>
              </div>

              <span
                className="hyperling-text-style cursor-pointer"
                onClick={() => {
                  setSelectedNotes((prev) => !prev);
                }}
              >
                {selectedNotes ? "Unselect All" : "Select All"}
              </span>
            </div>
            <Divider style={{ margin: "15px 0px" }} />
            <div className="space-y-6">
              <div className="ml-3 mb-2 relative pl-4 d-flex gap-2">
                <span className="text-[14px] font-medium text-gray-900 mb-1">
                  <Checkbox
                    className="me-2"
                    checked={selectedNotes}
                    onChange={() => setSelectedNotes((prev) => !prev)}
                  />
                  {symptomCollector?.notes}
                </span>
              </div>
            </div>
          </div>
        )}

        {symptomCollector?.questions?.length > 0 && (
          <div
            style={{
              overflow: "auto",
              background: "white",
              padding: 18,
              borderRadius: 10,
              marginTop: 20,
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex gap-3 patient-details">
                <img src={questions} alt="questions" />
                <span style={{ color: "#454551" }}>
                  Questions from patients
                </span>
              </div>
              <span className="section-title-color" style={{ fontWeight: 500 }}>
                Read only
              </span>
            </div>
            <Divider style={{ margin: "15px 0px" }} />
            <div className="space-y-6">
              <div className="ml-3 mb-2 relative pl-4">
                {symptomCollector?.questions?.map((question, index) => (
                  <div
                    key={index}
                    className="d-flex align-items-start gap-2 mb-2"
                  >
                    <span className="bullet-point">•</span>
                    <span className="text-[14px] font-medium text-gray-900">
                      {question}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className="d-flex align-items-center justify-content-center"
        style={{
          height: 88,
          padding: "18px 32px",
          gap: 32,
        }}
      >
         {!shouldShowVoiceOptions ? (
          <Button
            className="btn btn-primary3 btn-41 px-4 d-flex align-items-center justify-content-center"
            style={{ gap: "8px", width: (tp_monetization_enable || isFreeVoiceRxUser) ? "80%" : "100%" }}
            onClick={handleAutofill}
          >
             <img src={autoFillRx} alt="auto-fill" />
             <span>{"Autofill to Rx Pad"}</span>
          </Button>
        ) : (
          <>
             {hasVoiceAutofill && (
               <Button
                 type="button"
                 className="btn-41 btn ant-btn-text btn-input d-flex align-items-center justify-content-center sc-popup-btn"
                 style={{
                   width: hasAmbientAutofill ? "50%" : "100%",
                   gap: "8px",
                 }}
                 onClick={handleVoiceAutofillClick}
               >
                 <img src={autoFillRx} alt="auto-fill" />
                 <span>{"Autofill to Voice Rx"}</span>
               </Button>
             )}
             {hasAmbientAutofill && (
               <Button
                 type="button"
                 className="btn-41 btn ant-btn-text btn-input d-flex align-items-center justify-content-center sc-popup-btn"
                 style={{
                   gap: "8px",
                   width: hasVoiceAutofill ? "50%" : "100%",
                 }}
                 onClick={handleAmbientAutofillClick}
               >
                 <img src={autoFillRx} alt="auto-fill" />
                 <span>{"Autofill to Ambient Voice Rx"}</span>
               </Button>
             )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default SCPopup;
