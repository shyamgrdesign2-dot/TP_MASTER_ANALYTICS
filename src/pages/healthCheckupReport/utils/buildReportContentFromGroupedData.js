import { HEALTH_CHECKUP_REPORT_TEMPLATE_HTML } from "../constants";

const PATIENT_HISTORY_ROW_NAMES = [
  "Medical Condition",
  "Allergies",
  "Lifestyle",
  "Family History",
  "Surgical History",
  "Additional History",
];

const RADIOLOGY_ROW_NAMES = [
  "X ray Chest",
  "USG Whole Abdomen",
  "Mammography",
  "BMD",
  "CT Coronary Angio",
  "Carotid Colour Doppler",
  "MRI",
];

const GENERAL_RECOMMENDATIONS_TEXT =
  "Regular health check ups can identify any early warning signs of major health issues.\nWhen you have a health check up, you doctor will talk to you about your and your family’s medical history, enlisting your lifestyle and conditions including your diet, weight, physical activity, alcohol use and smoking habits etc.\nYour doctor may advise relevant vaccines as they are a part of preventive medicine.They lower the chances of <b>acquiring</b> and <b>spreading</b> of vaccine preventable disease and <b>reduces its severity</b>.\nYour doctor may include health check up as an advice even if you are here for any other illnesses.\n\nTeam of Zydus hospitals is grateful to you for your trust in us and we shall do our best to assure your complete well being.";

function escapeHtml(str) {
  if (str == null) return "";
  const s = String(str);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Converts \n to <br/> and supports basic markdown bold (**text**) and allows <b> tags. */
function formatReportText(str) {
  if (!str) return "";
  const escaped = escapeHtml(str);
  return escaped
    .replace(/\n/g, "<br>")
    // Support **bold**
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Support __bold__
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    // Re-allow <b> tags if they were escaped
    .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/g, "<b>$1</b>")
    .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/g, "<strong>$1</strong>");
}

function formatDate(d) {
  if (!d) return "";
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    return isNaN(date.getTime())
      ? String(d)
      : date
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, "/");
  } catch (_) {
    return String(d);
  }
}

function getPatientInfo(consultations, patient_data) {
  const first = consultations?.[0];
  const patient = patient_data || first?.patientData || {};
  const name =
    patient_data?.pm_fullname ||
    patient?.patient_name ||
    patient?.name ||
    patient?.pm_name ||
    "";
  const age = patient_data?.ageYears || patient?.age || patient?.patient_age || "";
  const gender =
    patient_data?.pm_gender ||
    patient?.gender ||
    patient?.patient_gender ||
    "";
  const contact =
    patient_data?.pm_contact_no ??
    patient?.contact_no ??
    patient?.phone ??
    "";
  const date = first?.consultation_date
    ? formatDate(first.consultation_date)
    : formatDate(new Date());
  const mrno = patient?.pm_reference_id || patient?.mrn || "";
  const packageDetails =
    patient?.package_name ?? patient?.package_details ?? "";
  return {
    name: name || "",
    ageGender: [age, gender].filter(Boolean).join(", ") || "",
    contact: contact || "",
    date: date || "",
    patientId: mrno || "",
    packageDetails: packageDetails || "",
  };
}

/**
 * Format one consultation as plain text (Symptoms, Examinations, Medical History, Diagnosis, Medicines, Advice).
 */
function formatConsultationAsPrintViewNotes(consultation) {
  if (!consultation || typeof consultation !== "object") return "";
  const parts = [];
  const syms = consultation.symptoms ?? [];
  if (syms.length > 0) {
    const lines = syms.map((item) => {
      const name = item.symptom_name ?? item.name ?? "";
      const since = item.since ?? "";
      const severity = item.severity ?? "";
      const note = item.note ?? "";
      const extra = [since && `since: ${since}`, severity && `severity: ${severity}`, note]
        .filter(Boolean)
        .join(", ");
      return extra ? `${name} (${extra})` : name;
    });
    parts.push("SYMPTOMS:\n" + lines.join(", "));
  }
  const exams = consultation.examination ?? [];
  if (exams.length > 0) {
    const lines = exams.map((item) => {
      const name = item.examination_name ?? item.name ?? "";
      const note = item.note ?? "";
      return note ? `${name} (${note})` : name;
    });
    parts.push("EXAMINATIONS:\n" + lines.join(", "));
  }
  const diag = consultation.diagnosis ?? [];
  if (diag.length > 0) {
    const lines = diag.map((item) => {
      const name = item.tds_name ?? item.name ?? "";
      const code = item.icd_code ?? "";
      const note = item.note ?? "";
      return code
        ? `${name} (${code})${note ? ` - ${note}` : ""}`
        : name + (note ? ` - ${note}` : "");
    });
    parts.push("DIAGNOSIS:\n" + lines.join(", "));
  }
  const meds = consultation.medicine ?? [];
  if (meds.length > 0) {
    const lines = meds.map((item) => {
      const name =
        item.tmm_medicine_name ?? item.medicine_name ?? item.name ?? "";
      const dosage = item.tmm_dosage ?? item.dosage ?? "";
      const unit =
        item.medicineUnit?.find(
          (x) => x.tmu_id === (item.tmm_unit ?? item.unit)
        )?.tmu_title ?? "";
      const freq =
        item.tcm_tmm_freq_morning ??
          item.tcm_tmm_freq_afternoon ??
          item.tcm_tmm_freq_evening ??
          item.tcm_tmm_freq_night
          ? [
            item.tcm_tmm_freq_morning,
            item.tcm_tmm_freq_afternoon,
            item.tcm_tmm_freq_evening,
            item.tcm_tmm_freq_night,
          ]
            .filter(Boolean)
            .join("-")
          : "";
      const duration =
        item.tmm_days && item.tmm_duration_type
          ? `${item.tmm_days} ${item.tmm_duration_type}`
          : item.tmm_duration_type ?? "";
      const bits = [
        name,
        dosage && unit ? `${dosage} ${unit}` : dosage || unit,
        freq,
        duration,
      ].filter(Boolean);
      return bits.join(", ");
    });
    parts.push("MEDICINES:\n" + lines.join("\n"));
  }
  const adv = consultation.advice ?? [];
  if (adv.length > 0) {
    const lines = adv
      .map((a) =>
        typeof a === "string" ? a : a?.advice_name ?? a?.advice ?? a?.text ?? ""
      )
      .filter(Boolean);
    if (lines.length) parts.push("ADVICE:\n" + lines.join("\n"));
  }
  const visitAdvice = consultation.visit_advice;
  if (
    visitAdvice &&
    typeof visitAdvice === "string" &&
    visitAdvice.trim()
  ) {
    parts.push("VISIT ADVICE:\n" + visitAdvice.trim());
  }

  const moduleContents = consultation.moduleContents ?? [];
  if (moduleContents.length > 0) {
    moduleContents.forEach((mod) => {
      const modName = mod.module_name || "Custom Module";
      const contentArr = mod.content || [];
      if (!Array.isArray(contentArr) || contentArr.length === 0) return;

      const lines = contentArr.map(item => {
        if (!item || typeof item !== "object") return String(item);
        
        if (mod.module_version === "v1") {
          const title = item.title ? String(item.title).trim() : "";
          const notes = item.notes ? String(item.notes).trim() : "";
          return [title, notes].filter(Boolean).join(" - ");
        } else {
          // For v2 and others, extract all stringable key-value pairs
          return Object.entries(item)
            .map(([key, val]) => {
              if (val === null || val === undefined || val === '') return null;
              if (typeof val === "object" && !Array.isArray(val)) return null;
              // Formatting key: e.g. "blood_pressure" -> "Blood Pressure"
              const formattedKey = key
                .replace(/_/g, " ")
                .replace(/\b\w/g, l => l.toUpperCase());
              return `${formattedKey}: ${val}`;
            })
            .filter(Boolean)
            .join(", ");
        }
      }).filter(Boolean);

      if (lines.length > 0) {
        parts.push(`${modName}:\n` + lines.join("\n"));
      }
    });
  }

  return parts.join("\n\n");
}

function symptomsToHtmlList(symptoms) {
  if (!symptoms || symptoms.length === 0) return "<p><br></p>";

  const seenIds = new Set();
  const seenFallback = new Set();

  const items = symptoms
    .filter((item) => {
      if (item.symptom_name) {
        if (seenIds.has(item.symptom_name)) return false;
        seenIds.add(item.symptom_name);
        return true;
      }
      const name = item.symptom_name ?? item.name ?? item.value ?? "";
      const duration = item.duration ?? item.since ?? "";
      const severity = item.severity ?? item.status ?? "";
      const notes = item.notes ?? item.remark ?? "";
      
      const fallbackKey = name + "|" + duration + "|" + severity + "|" + notes;
      if (seenFallback.has(fallbackKey)) return false;
      seenFallback.add(fallbackKey);
      return true;
    })
    .map((item) => {
      const name = escapeHtml(
        item.symptom_name ?? item.name ?? item.value ?? ""
      );
      const duration = item.duration ?? item.since ?? "";
      const severity = item.severity ?? item.status ?? "";
      const notes = item.notes ?? item.remark ?? "";
      const details = [duration, severity, notes].filter(Boolean).join(", ");
      const detailStr = details ? ` (${escapeHtml(details)})` : "";
      return `<li><strong>${name}</strong>${detailStr}</li>`;
    })
    .join("");
  return `<ul>${items}</ul>`;
}

export function medicalHistoryToHtmlList(items, rowName = "") {
  if (!items || items.length === 0) return "<p><br></p>";
  const seenIds = new Set();
  const seenFallback = new Set();

  const flatten = (item) => {
    if (typeof item === "string") {
      if (seenFallback.has(item)) return "";
      seenFallback.add(item);
      return `<li>${escapeHtml(item)}</li>`;
    }
    const title = item.title ?? item.name ?? item.conditionName ?? "";
    const since = item.since ?? item.duration ?? "";
    const status = item.status ?? item.state ?? "";
    const medication = item.medication ?? "";
    const notes =
      item.notes ??
      item.details ??
      item.value ??
      item.remarks ??
      item.medical_history_remarks ??
      "";
    const detailParts = [];
    if (since) detailParts.push(`Since: ${escapeHtml(since)}`);
    if (status) detailParts.push(`Status: ${escapeHtml(status)}`);
    if (medication) detailParts.push(`Medication: ${escapeHtml(medication)}`);
    if (notes) detailParts.push(escapeHtml(notes));
    const details = detailParts.join(" | ");

    if (Array.isArray(item.tags) && item.tags.length > 0) {
      return item.tags
        .filter((tag) => {
          if (tag.tmmhst_id) {
            if (seenIds.has(tag.tmmhst_id)) return false;
            seenIds.add(tag.tmmhst_id);
            return true;
          }
          const tagName = tag.title ?? tag.conditionName ?? tag.name ?? "";
          const fallbackKey = tagName + "|" + (tag.details ?? tag.value ?? "");
          if (seenFallback.has(fallbackKey)) return false;
          seenFallback.add(fallbackKey);
          return true;
        })
        .map((tag) => {
          const tagName = escapeHtml(
            tag.title ?? tag.conditionName ?? tag.name ?? ""
          );
          const tagDetails = tag.details ?? tag.value ?? "";
          const tagSince = tag.since ?? "";
          const tagStatus = tag.status ?? "";
          const tagMeds = tag.medication ?? "";
          const tagNote = tag.note ?? "";
          const tagParts = [];
          
          if (tagSince) tagParts.push(`Since: ${escapeHtml(tagSince)}`);
          if (tagStatus) tagParts.push(`Status: ${escapeHtml(tagStatus)}`);
          if (tagMeds) tagParts.push(`Medication: ${escapeHtml(tagMeds)}`);
          if (tagNote) tagParts.push(escapeHtml(tagNote));
          if (tagDetails) tagParts.push(escapeHtml(tagDetails));
          const tagDetailsStr = tagParts.join(" | ");
          
          return `<li><strong>${tagName}</strong>${tagDetailsStr ? ` (${tagDetailsStr})` : ""}</li>`;
        })
        .join("");
    }

    if (item.tmmhst_id) {
      if (seenIds.has(item.tmmhst_id)) return "";
      seenIds.add(item.tmmhst_id);
    } else {
      const fallbackKey = title + "|" + details;
      if (seenFallback.has(fallbackKey)) return "";
      seenFallback.add(fallbackKey);
    }
    const titleHtml = (title && title.trim().toLowerCase() !== rowName.trim().toLowerCase()) 
      ? `<strong>${escapeHtml(title)}</strong>` : "";
    const detailHtml = details ? ` (${details})` : "";
    if (!titleHtml && !detailHtml) return "";
    return `<li>${titleHtml}${detailHtml}</li>`;
  };

  const lis = items.map(flatten).flat().join("");
  if (!lis) return "<p><br></p>";
  return `<ol>${lis}</ol>`;
}

/**
 * Returns full report body HTML built from grouped consultation data.
 * If no groupedConsultationData, returns the blank template HTML.
 */
export function buildReportContentFromGroupedData(
  groupedConsultationData,
  patient_data,
  profile = null
) {
  if (!groupedConsultationData) {
    return HEALTH_CHECKUP_REPORT_TEMPLATE_HTML;
  }

  const {
    symptoms = [],
    medical_history = [],
    vitals = [],
    advice = [],
    consultations = [],
  } = groupedConsultationData;

  const patientInfo = getPatientInfo(consultations, patient_data);
  const doctorName = profile?.um_name || profile?.name || profile?.doctorName || "";
  const normalizedDoctorName = doctorName.trim().replace(/^Dr\.?\s*/i, "");
  const impressionText = doctorName
    ? `Impression (Dr. ${escapeHtml(normalizedDoctorName)})`
    : "Impression (Dr. ______________)";

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
  const preparedBy = doctorName ? escapeHtml(doctorName).toUpperCase() : "";

  // Patient info table
  const patientTable = `
  <table class="report-patient-table">
  <tr style="height: 0px !important;"><td colspan="2"><p class="report-divider">&#8203;</p></td></tr>
  <tr>
    <td class="report-patient-left">
      <p>Patient Name: <strong>${escapeHtml(patientInfo.name)}</strong></p>
      <p>Age/Gender: ${escapeHtml(patientInfo.ageGender)}</p>
      <p>Contact No: ${escapeHtml(patientInfo.contact)}</p>
    </td>
    <td class="report-patient-right">
      <p>Date: <strong>${escapeHtml(patientInfo.date)}</strong></p>
      <p>MRN: <strong>${escapeHtml(patientInfo.patientId)}</strong></p>
      <p>Package Details: <strong>${escapeHtml(patientInfo.packageDetails)}</strong></p>
    </td>
  </tr>
  <tr style="height: 0px !important;"><td colspan="2"><p class="report-divider">&#8203;</p></td></tr>
</table>
`;

  // Chief Complaints — show only symptoms entered by the Health Checkup doctor
  const healthCheckupTcmIds = new Set(
    consultations
      .filter((c) => {
        const doc = c.doctor_data || {};
        const dp = (doc.dp_name ?? "").trim().toLowerCase();
        return dp === "health check up";
      })
      .map((c) => c.tcm_id)
      .filter(Boolean)
  );
  const healthCheckupSymptoms = healthCheckupTcmIds.size > 0
    ? symptoms.filter((s) => healthCheckupTcmIds.has(s.tcm_id))
    : [];
  const chiefHtml =
    healthCheckupSymptoms.length > 0 ? symptomsToHtmlList(healthCheckupSymptoms) : "<p><br></p>";
  const chiefSection = `
<div class="print-section-group">
<h2 class="report-section-title">Chief Complaints:</h2>
<table class="report-section-box"><tbody><tr><td>
${chiefHtml}
</td></tr></tbody></table>
</div>
`;


  // Patient History: aggregate by row name
  const historyByRowName = {};
  PATIENT_HISTORY_ROW_NAMES.forEach((name) => {
    historyByRowName[name] = [];
  });
  medical_history.forEach((entry) => {
    const data = entry?.data;
    const items = Array.isArray(data)
      ? data
      : data && typeof data === "object"
        ? [data]
        : [];
    items.forEach((item) => {
      const title = (item?.title ?? item?.name ?? "").trim();
      if (!title && !item?.tags) return;
      const rowName =
        PATIENT_HISTORY_ROW_NAMES.find(
          (r) => r.toLowerCase() === title.toLowerCase()
        ) ?? title;
      if (!historyByRowName[rowName]) historyByRowName[rowName] = [];
      const formattedMedicalHistoryRemarks = (() => {
        const remarks = item?.medical_history_remarks;
        if (remarks === null || remarks === undefined) return "";
        return String(remarks).trim();
      })();

      if (
        rowName === "Medical Condition" &&
        formattedMedicalHistoryRemarks
      ) {
        historyByRowName["Additional History"].push({
          tags: [
            {
              title: formattedMedicalHistoryRemarks,
            },
          ],
        });

        const { medical_history_remarks: _, ...rest } = item || {};
        historyByRowName[rowName].push(rest);
        return;
      }

      historyByRowName[rowName].push(item);
    });
  });

  const historyRows = PATIENT_HISTORY_ROW_NAMES.map((rowName) => {
    const items = historyByRowName[rowName] || [];
    const cellContent =
      items.length > 0 ? medicalHistoryToHtmlList(items, rowName) : "<p><br></p>";
    return `    <tr><td><p>${escapeHtml(rowName)}</p></td><td>${cellContent}</td></tr>`;
  }).join("\n");

  const patientHistorySection = `
<div class="print-section-group">
<h2 class="report-section-title">Patient History</h2>
<table class="report-data-table">
  <tbody>
${historyRows}
  </tbody>
</table>
</div>`;

  // General Examination vitals
  const latestVital =
    [...vitals].reverse().find(
      (v) =>
        v &&
        typeof v === "object" &&
        (v.temp != null || v.blood_press != null || v.spo2 != null)
    ) ?? vitals[vitals.length - 1];
  const v = typeof latestVital === "object" ? latestVital : {};

  const generalExaminationSection = `
<div class="print-section-group">
<h2 class="report-section-title">General Examination</h2>
<table class="report-data-table report-general-exam-grid top-row-grid">
  <tbody>
    <tr>
      <th><p>Temp</p></th><td><p>${escapeHtml(v.temp ?? "") || "<br>"}</p></td>
      <th><p>BP</p></th><td><p>${escapeHtml(v.blood_press ?? "") || "<br>"}</p></td>
      <th><p>SPO2</p></th><td><p>${escapeHtml(v.spo2 ?? "") || "<br>"}</p></td>
      <th><p>RR</p></th><td><p>${escapeHtml(v.resp_rate ?? "") || "<br>"}</p></td>
      <th><p>Pulse</p></th><td><p>${escapeHtml(v.pres ?? "") || "<br>"}</p></td>
    </tr>
  </tbody>
</table>
<table class="report-data-table report-general-exam-grid bottom-row-grid" style="margin-top: 24px;">
  <tbody>
    <tr>
      <th><p>Weight</p></th><td><p>${escapeHtml(v.weight ?? "") || "<br>"}</p></td>
      <th><p>Height</p></th><td><p>${escapeHtml(v.height ?? "") || "<br>"}</p></td>
      <th><p>BMI</p></th><td><p>${escapeHtml(v.bmi ?? "") || "<br>"}</p></td>
    </tr>
  </tbody>
</table>
</div>`;

  // Radiology table (static row names, empty notes for now unless we have a mapping)
  const radiologyRows = RADIOLOGY_ROW_NAMES.map(
    (name) => `    <tr><td><p>${escapeHtml(name)}</p></td><td><p><br></p></td></tr>`
  ).join("\n");

  /* Wrapper keeps heading + table atomic for print iframe pagination (avoids h2 alone on prior page). */
  const radiologySection = `
<div class="print-section-group print-page-break">
<h2 class="report-section-title">RADIOLOGY / SONOLOGY IMAGING FINDINGS</h2>
<table class="report-data-table">
  <thead><tr><th><p>Modality</p></th><th><p>Impressions</p></th></tr></thead>
  <tbody>
${radiologyRows}
  </tbody>
</table>
</div>`;

  const consultationsByDept = {};
  consultations.forEach((c) => {
    const docData = c.doctor_data || {};
    let dpName = (docData.dp_name ?? "").trim();
    if (!dpName) dpName = "Consultation";
    // Skip "Health Check Up" specialty from the Consultation table
    if (dpName.toLowerCase() === "health check up") return;
    if (!consultationsByDept[dpName]) {
      consultationsByDept[dpName] = [];
    }
    consultationsByDept[dpName].push(c);
  });

  const consultationRows = Object.keys(consultationsByDept).length > 0
    ? Object.keys(consultationsByDept).map(
      (deptName) => {
        const matching = consultationsByDept[deptName];
        const latest =
          matching.length > 0
            ? matching.reduce((a, b) =>
              (a?.tcm_id ?? 0) >= (b?.tcm_id ?? 0) ? a : b
            )
            : null;
        let doctorName = "";
        let notesCell = "<p><br></p>";
        if (latest) {
          const docData = latest.doctor_data || latest.doctorData || {};
          const docName =
            docData.doctor_name ?? docData.name ?? docData.doctorName ?? "";
          if (docName) doctorName = docName;
          const notes = formatConsultationAsPrintViewNotes(latest);
          if (notes) notesCell = `<p>${escapeHtml(notes).replace(/\n/g, "<br>")}</p>`;
        }
        return `<tr><td><p>${escapeHtml(deptName) + (doctorName ? "<br>" + escapeHtml(doctorName) : "")}</p></td><td>${notesCell}</td></tr>`;
      }
    ).join("\n")
    : `<tr><td><p><br></p></td><td><p><br></p></td></tr>`;

  const consultationsSection = `
<div class="print-section-group print-page-break">
<h2 class="report-section-title">Consultations</h2>
<table class="report-data-table">
  <thead><tr><th><p>DEPARTMENT & DOCTOR NAME</p></th><th><p>NOTES</p></th></tr></thead>
  <tbody>
${consultationRows}
  </tbody>
</table>
</div>`;

  // Impression
  const impressionSection = `
<div class="print-section-group print-page-break">
<h2 class="report-section-title">${impressionText}</h2>
<table class="report-section-box"><tbody><tr><td><p><br></p></td></tr></tbody></table>
</div>`;

  // Advice
  const adviceText = advice
    .map((a) => (typeof a === "string" ? a : a?.value ?? a?.advice ?? a?.text ?? ""))
    .filter(Boolean)
    .join("\n\n");
  const adviceSection = `
<div class="print-section-group">
<h2 class="report-section-title">Advice</h2>
<table class="report-section-box"><tbody><tr><td>
${adviceText ? adviceText.split('\n').map(line => `<p>${escapeHtml(line)}</p>`).join('') : "<p><br></p>"}
</td></tr></tbody></table>
</div>`;

  const generalRecHtml = formatReportText(GENERAL_RECOMMENDATIONS_TEXT) || "<p><br></p>";
  const generalRecSection = `
<div class="print-section-group print-page-break">
<h2 class="report-section-title">General Recommendations</h2>
<table class="report-section-box"><tbody><tr><td>
${generalRecHtml}
</td></tr></tbody></table>
</div>`;


  // Prepared By / Verified By
  const preparedBySection = `
<table class="report-data-table">
  <thead><tr><th>PREPARED BY</th><th>DATE</th></tr></thead>
  <tbody>
    <tr><td>${preparedBy}</td><td>${escapeHtml(dateStr)}</td></tr>
  </tbody>
  <thead><tr><th>VERIFIED BY</th><th>DATE</th></tr></thead>
  <tbody>
    <tr><td>${preparedBy}</td><td>${escapeHtml(dateStr)}</td></tr>
  </tbody>
</table>`;

  const headerSection = `<div class="report-doc-header">
  <p class="report-doc-header-title">HEALTH CHECK-UP SUMMARY</p>
</div>`;

  return [
    headerSection,
    patientTable,
    chiefSection,
    patientHistorySection,
    generalExaminationSection,
    radiologySection,
    consultationsSection,
    impressionSection,
    adviceSection,
    generalRecSection,
    preparedBySection,
  ].join("\n\n");
}
