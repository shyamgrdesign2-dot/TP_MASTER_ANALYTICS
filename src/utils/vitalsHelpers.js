import moment from "moment";

const VITALS_CAPTURE_KEYS = [
  "temp",
  "pres",
  "resp_rate",
  "blood_press",
  "systolic",
  "diastolic",
  "spo2",
  "general_rbs",
  "height",
  "weight",
  "ofc",
  "fib4",
  "waist_circumference",
  "bmi",
  "bmr",
  "bsa",
];

function hasVitalsValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function firstVitalsValue(...values) {
  for (const value of values) {
    if (hasVitalsValue(value)) return String(value).trim();
  }
  return "";
}

export function getCopiedVitalsObject(value) {
  if (Array.isArray(value)) return value.find((item) => item && typeof item === "object") || null;
  return value && typeof value === "object" ? value : null;
}

function humanizeVitalsKey(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

export function pickVitalsRowForLabel(rawRow, label) {
  if (!rawRow || typeof rawRow !== "object") return rawRow;
  const itemLabel = String(label || "").trim().toLowerCase();
  if (!itemLabel) return rawRow;

  const matchedKey = Object.keys(rawRow).find(
    (key) => humanizeVitalsKey(key).toLowerCase() === itemLabel
  );
  if (!matchedKey) return rawRow;

  const selectedRow = { [matchedKey]: rawRow[matchedKey] };
  if (["blood_pressure", "blood_press"].includes(matchedKey)) {
    if (rawRow.systolic !== undefined) selectedRow.systolic = rawRow.systolic;
    if (rawRow.diastolic !== undefined) selectedRow.diastolic = rawRow.diastolic;
  }
  return selectedRow;
}

export function getVitalsRowDate(row = {}) {
  return row.date || row.createdAt || row.created_at || row.bodyCreatedAt || "";
}

export function getVitalsRowSortId(row = {}) {
  return Math.max(
    Number(row.tcv_id) || 0,
    Number(row.tcbc_id) || 0,
    Number(row.dev_unique_id) || 0
  );
}

export function sortVitalsRowsForDisplay(rows = []) {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const aDate = moment(getVitalsRowDate(a.row));
      const bDate = moment(getVitalsRowDate(b.row));
      if (aDate.isValid() && bDate.isValid()) {
        const dateDiff = bDate.valueOf() - aDate.valueOf();
        if (dateDiff !== 0) return dateDiff;
        const aSortId = getVitalsRowSortId(a.row);
        const bSortId = getVitalsRowSortId(b.row);
        const idDiff = bSortId - aSortId;
        if (aSortId > 0 && bSortId > 0 && idDiff !== 0) return idDiff;
        return b.index - a.index;
      }
      if (aDate.isValid()) return -1;
      if (bDate.isValid()) return 1;
      return b.index - a.index;
    });
}

export function normalizeCopiedVitalsRow(rawVitals, existingRow = {}, patientData = {}) {
  const vitals = getCopiedVitalsObject(rawVitals);
  if (!vitals) return null;

  const incomingSystolic = firstVitalsValue(vitals.systolic, vitals.Systolic);
  const incomingDiastolic = firstVitalsValue(vitals.diastolic, vitals.Diastolic);
  const incomingBloodPress = firstVitalsValue(
    vitals.blood_pressure,
    vitals.blood_press,
    (incomingSystolic || incomingDiastolic) ? `${incomingSystolic}/${incomingDiastolic}` : ""
  );
  const bloodPress = firstVitalsValue(incomingBloodPress, existingRow.blood_press);
  const [bpSystolic = "", bpDiastolic = ""] = bloodPress ? bloodPress.split("/") : [];
  const height = firstVitalsValue(vitals.height, existingRow.height);
  const weight = firstVitalsValue(vitals.weight, existingRow.weight);
  const age = Number(patientData?.ageYears || 0);
  const numericHeight = Number(height);
  const numericWeight = Number(weight);
  const calculatedBmi = numericHeight && numericWeight ? ((numericWeight / numericHeight / numericHeight) * 10000).toFixed(2) : "";
  const calculatedBmr = numericHeight && numericWeight
    ? ((10 * numericWeight) + (6.25 * numericHeight) - (5 * age) + (patientData?.pm_gender === "Male" ? 5 : -161)).toFixed(2)
    : "";
  const calculatedBsa = numericHeight && numericWeight ? Math.sqrt((numericHeight * numericWeight) / 3600).toFixed(2) : "";

  const row = {
    date: firstVitalsValue(vitals.date, existingRow.date) || moment().format("YYYY-MM-DD"),
    dev_unique_id: existingRow.dev_unique_id ?? vitals.dev_unique_id ?? 0,
    tcv_id: existingRow.tcv_id ?? vitals.tcv_id ?? 0,
    tcbc_id: existingRow.tcbc_id ?? vitals.tcbc_id ?? 0,
    temp: firstVitalsValue(vitals.temperature, vitals.temp, existingRow.temp),
    pres: firstVitalsValue(vitals.pulse, vitals.pres, existingRow.pres),
    resp_rate: firstVitalsValue(vitals.respiratory_rate, vitals.respiratoryRate, vitals.resp_rate, existingRow.resp_rate),
    blood_press: bloodPress,
    systolic: firstVitalsValue(incomingSystolic, bpSystolic, existingRow.systolic),
    diastolic: firstVitalsValue(incomingDiastolic, bpDiastolic, existingRow.diastolic),
    spo2: firstVitalsValue(vitals.spo2, vitals.SpO2, existingRow.spo2),
    height,
    weight,
    ofc: firstVitalsValue(vitals.head_circumference, vitals.ofc, vitals.OFC, existingRow.ofc),
    general_rbs: firstVitalsValue(
      vitals.general_rbs,
      vitals.random_blood_sugar,
      vitals.randomBloodSugar,
      vitals.rbs,
      existingRow.general_rbs
    ),
    fib4: firstVitalsValue(vitals.fib4, vitals.FIB4, existingRow.fib4),
    waist_circumference: firstVitalsValue(vitals.waist_circumference, vitals.waistCircumference, existingRow.waist_circumference),
    bmi: firstVitalsValue(vitals.bmi, vitals.BMI, existingRow.bmi, calculatedBmi),
    bmr: firstVitalsValue(vitals.bmr, vitals.BMR, existingRow.bmr, calculatedBmr),
    bsa: firstVitalsValue(vitals.bsa, vitals.BSA, existingRow.bsa, calculatedBsa),
  };

  const ignoredKeys = new Set(["date", "dev_unique_id", "tcv_id", "tcbc_id"]);
  const hasValue = Object.entries(row).some(([key, value]) => !ignoredKeys.has(key) && hasVitalsValue(value));
  return hasValue ? row : null;
}

export function normalizeVitalsInputRow(row = {}, patientData = {}) {
  const bloodPress = firstVitalsValue(
    row.blood_press,
    row.blood_pressure,
    (hasVitalsValue(row.systolic) || hasVitalsValue(row.diastolic)) ? `${row.systolic || ""}/${row.diastolic || ""}` : ""
  );
  return normalizeCopiedVitalsRow(
    {
      ...row,
      blood_press: bloodPress,
      temperature: row.temperature ?? row.temp,
      pulse: row.pulse ?? row.pres,
      respiratory_rate: row.respiratory_rate ?? row.respiratoryRate ?? row.resp_rate,
      head_circumference: row.head_circumference ?? row.ofc,
      random_blood_sugar: row.random_blood_sugar ?? row.randomBloodSugar ?? row.general_rbs,
    },
    row,
    patientData
  ) || row;
}

export function prepareVitalsRowForSave(row = {}) {
  const systolic = firstVitalsValue(row.systolic, row.Systolic);
  const diastolic = firstVitalsValue(row.diastolic, row.Diastolic);
  const bloodPress = (systolic || diastolic)
    ? `${systolic}/${diastolic}`
    : firstVitalsValue(row.blood_press, row.blood_pressure);
  return {
    ...row,
    blood_press: bloodPress,
  };
}

export function vitalsRowHasCapturedData(row = {}) {
  return VITALS_CAPTURE_KEYS.some((key) => hasVitalsValue(row?.[key]));
}

export function findLatestVitalsRowIndexForDate(rows = [], date) {
  let targetIndex = -1;
  let targetScore = -1;
  rows.forEach((row, index) => {
    const rowDate = getVitalsRowDate(row);
    if (!rowDate || !moment(rowDate).isSame(date, "day") || !vitalsRowHasCapturedData(row)) return;
    const idScore = getVitalsRowSortId(row);
    const score = idScore > 0 ? idScore : index;
    if (score >= targetScore) {
      targetScore = score;
      targetIndex = index;
    }
  });
  return targetIndex;
}

function copiedVitalsComparableKeys(row = {}) {
  return VITALS_CAPTURE_KEYS.filter(
    (key) => !["bmi", "bmr", "bsa"].includes(key) &&
      !(key === "blood_press" && (hasVitalsValue(row.systolic) || hasVitalsValue(row.diastolic))) &&
      hasVitalsValue(row?.[key])
  );
}

function rowMatchesCopiedVitals(row = {}, copiedRow = {}) {
  const keys = copiedVitalsComparableKeys(copiedRow);
  if (!keys.length) return false;
  return keys.every((key) => String(row?.[key] ?? "").trim() === String(copiedRow?.[key] ?? "").trim());
}

export function hasMatchingVitalsRow(rows = [], copiedRow = {}) {
  const copiedDate = getVitalsRowDate(copiedRow);
  return rows.some((row) => {
    if (!moment(getVitalsRowDate(row)).isSame(copiedDate, "day")) return false;
    return rowMatchesCopiedVitals(row, copiedRow);
  });
}

export function moveCopiedVitalsRowToEnd(rows = [], copiedRow = {}) {
  let matchIndex = -1;
  let matchScore = -1;
  rows.forEach((row, index) => {
    if (!moment(getVitalsRowDate(row)).isSame(getVitalsRowDate(copiedRow), "day")) return;
    if (!rowMatchesCopiedVitals(row, copiedRow)) return;
    const score = getVitalsRowSortId(row) || index;
    if (score >= matchScore) {
      matchScore = score;
      matchIndex = index;
    }
  });
  if (matchIndex === -1) return rows;
  const nextRows = [...rows];
  const [matchedRow] = nextRows.splice(matchIndex, 1);
  nextRows.push(matchedRow);
  return nextRows;
}
