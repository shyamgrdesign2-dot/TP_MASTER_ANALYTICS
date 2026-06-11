import moment from "moment";

export const VITALS_ROW_DATE_FORMAT = "YYYY-MM-DD";

/** Vitals keys as stored on prescription rows / CashManagerContext (matches VitalsBox). */
const RX_VITALS_ROW_KEYS = [
  "temp",
  "pres",
  "resp_rate",
  "systolic",
  "diastolic",
  "blood_press",
  "spo2",
  "height",
  "weight",
  "ofc",
  "fib4",
  "waist_circumference",
  "bmi",
  "bmr",
  "bsa",
  "general_rbs",
];

const VITALS_META_KEYS = new Set([
  "tcv_id",
  "tcbc_id",
  "dev_unique_id",
  "pam_id",
  "date",
  "_doc",
]);

/**
 * API / symptom-collector may send each vital as `{ value, unit }` or a plain scalar (legacy).
 */
export function unwrapVitalsFieldValue(v) {
  if (v == null) return v;
  if (
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.prototype.hasOwnProperty.call(v, "value")
  ) {
    return v.value;
  }
  return v;
}

/** Trimmed string for comparisons and normalization; empty string if absent. */
export function vitalScalarString(v) {
  const u = unwrapVitalsFieldValue(v);
  if (u == null) return "";
  return String(u).trim();
}

/** Label/value lines for UI when API sends `{ value, unit }`. */
export function formatVitalDisplayForUi(v) {
  if (v == null) return "";
  if (
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.prototype.hasOwnProperty.call(v, "value")
  ) {
    const val = vitalScalarString(v);
    const u = v.unit != null ? String(v.unit).trim() : "";
    if (!val && !u) return "";
    return u ? `${val} ${u}`.trim() : val;
  }
  return vitalScalarString(v);
}

export function hasVitalsAndBodyCompositionData(vbc) {
  if (!vbc || typeof vbc !== "object") return false;
  return Object.entries(vbc).some(([k, v]) => {
    if (VITALS_META_KEYS.has(k)) return false;
    return vitalScalarString(v) !== "";
  });
}

/**
 * Normalize symptom-collector / API vitals into the same field names as `vitalsData` rows
 * (snake_case: temp, pres, resp_rate, …). Safe to call on objects that are already normalized.
 */
export function normalizeVitalsAndBodyCompositionToRxRowFields(vbc) {
  if (!vbc || typeof vbc !== "object") return {};

  const patch = {};
  const take = (field, val) => {
    const s = vitalScalarString(val);
    if (s !== "") patch[field] = s;
  };

  for (const k of RX_VITALS_ROW_KEYS) {
    if (Object.prototype.hasOwnProperty.call(vbc, k)) {
      take(k, vbc[k]);
    }
  }

  if (!patch.temp) take("temp", vbc.temperature);
  if (!patch.pres) take("pres", vbc.pulse);
  if (!patch.resp_rate)
    take("resp_rate", vbc.respiratoryRate ?? vbc.respRate);
  if (!patch.spo2) take("spo2", vbc.spo2);
  if (!patch.height) take("height", vbc.height);
  if (!patch.weight) take("weight", vbc.weight);
  if (!patch.ofc) take("ofc", vbc.headCircumference);
  if (!patch.fib4) take("fib4", vbc.fib4);
  if (!patch.waist_circumference) take("waist_circumference", vbc.waistCircumference);
  if (!patch.bmi) take("bmi", vbc.bmi);
  if (!patch.bmr) take("bmr", vbc.bmr);
  if (!patch.bsa) take("bsa", vbc.bsa);

  let systolic = vitalScalarString(patch.systolic ?? vbc.systolic);
  let diastolic = vitalScalarString(patch.diastolic ?? vbc.diastolic);

  const bpCombined = vitalScalarString(
    patch.blood_press ?? vbc.bloodPressure ?? vbc.blood_press ?? ""
  );
  if (bpCombined.includes("/")) {
    const parts = bpCombined.split("/").map((p) => p.trim());
    if (!systolic && parts[0]) systolic = parts[0];
    if (!diastolic && parts[1]) diastolic = parts[1];
  }

  if (systolic) patch.systolic = systolic;
  else delete patch.systolic;
  if (diastolic) patch.diastolic = diastolic;
  else delete patch.diastolic;

  if (systolic && diastolic) {
    patch.blood_press = `${systolic}/${diastolic}`;
  } else if (systolic) {
    patch.blood_press = `${systolic}/`;
  } else if (diastolic) {
    patch.blood_press = `/${diastolic}`;
  } else if (patch.blood_press && !String(patch.blood_press).includes("/")) {
    delete patch.blood_press;
  }

  if (!patch.general_rbs) {
    if (vitalScalarString(vbc.generalRBS) !== "") {
      take("general_rbs", vbc.generalRBS);
    } else if (vitalScalarString(vbc.randomBloodSugar) !== "") {
      take("general_rbs", vbc.randomBloodSugar);
    }
  }

  return patch;
}

/**
 * SCPopup uses `VITAL_DISPLAY_ORDER` keys (camelCase). After autofill, Redux may store rx row keys
 * (`temp`, `pres`, …). Map stored vitals to those display keys so checkboxes match on reopen.
 */
export function rxVitalsPatchToCollectorDisplayKeys(vbc) {
  if (!vbc || typeof vbc !== "object") return [];
  const n = normalizeVitalsAndBodyCompositionToRxRowFields(vbc);
  const s = [];
  const add = (k) => {
    if (k && !s.includes(k)) s.push(k);
  };
  if (n.temp) add("temperature");
  if (n.pres) add("pulse");
  if (n.resp_rate) add("respiratoryRate");
  if (n.systolic) add("systolic");
  if (n.diastolic) add("diastolic");
  if (
    vitalScalarString(vbc.bloodPressure) !== "" &&
    !n.systolic &&
    !n.diastolic
  ) {
    add("bloodPressure");
  }
  if (n.spo2) add("spo2");
  if (n.general_rbs) {
    if (vitalScalarString(vbc.randomBloodSugar) !== "") {
      add("randomBloodSugar");
    } else {
      add("generalRBS");
    }
  }
  if (n.height) add("height");
  if (n.weight) add("weight");
  if (n.ofc) add("headCircumference");
  if (n.waist_circumference) add("waistCircumference");
  if (n.bmi) add("bmi");
  if (n.bmr) add("bmr");
  if (n.bsa) add("bsa");
  if (n.fib4) add("fib4");
  return s;
}

/** Build merge patch from Redux `vitalsAndBodyComposition` (normalized at source in SCPopup when possible). */
export function mapVitalsAndBodyCompositionToRowPatch(vbc, calculate) {
  const patch = normalizeVitalsAndBodyCompositionToRxRowFields(vbc);
  if (Object.keys(patch).length === 0) return null;

  const height = String(patch.height ?? "").trim();
  const weight = String(patch.weight ?? "").trim();
  const cal = calculate(height, weight);
  if (!patch.bmi && height && weight) patch.bmi = cal.bmi;
  if (!patch.bmr && height && weight) patch.bmr = cal.bmr;
  if (!patch.bsa && height && weight) patch.bsa = cal.bsa;

  return patch;
}

function defaultEmptyVitalsRow(calculate, dateFormat) {
  return {
    date: moment().format(dateFormat),
    dev_unique_id: 0,
    tcv_id: 0,
    tcbc_id: 0,
    temp: "",
    pres: "",
    resp_rate: "",
    systolic: "",
    diastolic: "",
    spo2: "",
    height: "",
    weight: "",
    fib4: "",
    waist_circumference: "",
    ofc: "",
    ...calculate("", ""),
  };
}

/**
 * Merge symptom-collector vitals into context rows after Redux `selectedVitalsList` sync.
 * When `patch` is null, returns `apiRows` only (same as before autofill).
 */
export function mergeVitalsRowsWithSymptomCollectorPatch(
  prev,
  apiRows,
  patch,
  calculate,
  dateFormat = VITALS_ROW_DATE_FORMAT
) {
  if (!patch) {
    return apiRows;
  }
  if (apiRows.length > 0) {
    const first = { ...apiRows[0], ...patch };
    const h = first.height || "";
    const w = first.weight || "";
    const cal2 = calculate(h, w);
    if (!first.bmi) first.bmi = cal2.bmi;
    if (!first.bmr) first.bmr = cal2.bmr;
    if (!first.bsa) first.bsa = cal2.bsa;
    return [first, ...apiRows.slice(1)];
  }
  const defaults = defaultEmptyVitalsRow(calculate, dateFormat);
  const first =
    Array.isArray(prev) && prev.length > 0 ? { ...prev[0] } : defaults;
  const merged = { ...first, ...patch };
  const h = merged.height || "";
  const w = merged.weight || "";
  const cal2 = calculate(h, w);
  if (!merged.bmi) merged.bmi = cal2.bmi;
  if (!merged.bmr) merged.bmr = cal2.bmr;
  if (!merged.bsa) merged.bsa = cal2.bsa;
  const rest =
    Array.isArray(prev) && prev.length > 1 ? prev.slice(1) : [];
  return [merged, ...rest];
}
