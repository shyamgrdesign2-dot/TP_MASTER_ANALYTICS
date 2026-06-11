/**
 * Utility functions to calculate BMI, BSA, and BMR from patient vitals
 */

function extractNumericValue(value) {
  if (!value || typeof value !== 'string') return null;

  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/cm|kg|m|g|lb|lbs|inches|in|feet|ft|'|"/g, '')
    .replace(/[^\d.]/g, '');
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
function convertWeightToKg(weight) {
  const weightNum = extractNumericValue(weight);
  if (weightNum === null) return null;
  
  if (weightNum > 200) {
    return weightNum / 1000;
  }
  return weightNum;
}

export function calculateBMI(height, weight) {
  const heightNum = extractNumericValue(height);
  const weightKg = convertWeightToKg(weight);
  
  if (heightNum === null || weightKg === null || heightNum <= 0 || weightKg <= 0) {
    return null;
  }
  
  const heightCm = heightNum > 3 ? heightNum : heightNum * 100;
  const calBMI = (weightKg / heightCm / heightCm) * 10000;
  
  if (!isFinite(calBMI)) return null;
  return parseFloat(calBMI.toFixed(2));
}

export function calculateBSA(height, weight) {
  const heightNum = extractNumericValue(height);
  const weightKg = convertWeightToKg(weight);
  
  if (heightNum === null || weightKg === null || heightNum <= 0 || weightKg <= 0) {
    return null;
  }
  
  const heightCm = heightNum > 3 ? heightNum : heightNum * 100;
  const calBSA = Math.sqrt(heightCm * weightKg / 3600);
  
  if (!isFinite(calBSA)) return null;
  return parseFloat(calBSA.toFixed(2));
}

export function calculateBMR(height, weight, age, gender) {
  const heightNum = extractNumericValue(height);
  const weightKg = convertWeightToKg(weight);
  
  let ageNum = 0;
  if (age !== undefined && age !== null) {
    if (typeof age === 'number') {
      ageNum = age;
    } else {
      const extractedAge = extractNumericValue(String(age));
      ageNum = extractedAge !== null ? extractedAge : 0;
    }
  }
  
  if (heightNum === null || weightKg === null || heightNum <= 0 || weightKg <= 0) {
    return null;
  }
  
  const heightCm = heightNum > 3 ? heightNum : heightNum * 100;
  
  const isMale = gender && typeof gender === 'string' && 
    gender.trim() === 'Male';
  
  const calBMR = isMale 
    ? (10 * weightKg) + (6.25 * heightCm) - (5 * ageNum) + 5
    : (10 * weightKg) + (6.25 * heightCm) - (5 * ageNum) - 161;
  
  if (!isFinite(calBMR)) return null;
  return parseFloat(calBMR.toFixed(2));
}

/**
 * BMI / BMR / BSA as strings for the rx pad and symptom-collector merge (same shape as VitalsBox `calculate`).
 */
export function computeRxPadVitalsDerivedMetrics(H, W, patientData) {
  const hasDim = (v) =>
    v !== "" && v !== undefined && v !== null && v !== 0;
  if (!hasDim(H) || !hasDim(W)) {
    return { bmi: "", bmr: "", bsa: "" };
  }
  const hStr = String(H).trim();
  const wStr = String(W).trim();
  if (!hStr || !wStr) {
    return { bmi: "", bmr: "", bsa: "" };
  }

  const bmiNum = calculateBMI(hStr, wStr);
  const bsaNum = calculateBSA(hStr, wStr);
  const age =
    patientData !== undefined && patientData?.ageYears !== undefined
      ? patientData.ageYears
      : 0;
  const bmrNum = calculateBMR(hStr, wStr, age, patientData?.pm_gender);

  return {
    bmi: bmiNum != null ? String(bmiNum) : "",
    bmr: bmrNum != null ? String(bmrNum) : "",
    bsa: bsaNum != null ? String(bsaNum) : "",
  };
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function getVitalValue(enriched, lowerKey, upperKey) {
  return hasValue(enriched[lowerKey]) ? String(enriched[lowerKey]).trim() : 
         hasValue(enriched[upperKey]) ? String(enriched[upperKey]).trim() : null;
}

export function enrichVitalsWithCalculations(vitals, patientDetails) {
  if (!vitals || typeof vitals !== 'object') {
    return vitals || {};
  }
  
  const enriched = { ...vitals };
  const height = enriched.height;
  const weight = enriched.weight;
  
  if (!height || !weight) {
    return enriched;
  }
  
  const bmiValue = getVitalValue(enriched, 'bmi', 'BMI');
  if (!bmiValue) {
    const bmi = calculateBMI(height, weight);
    if (bmi !== null) {
      enriched.bmi = String(bmi);
    }
  } else {
    enriched.bmi = bmiValue;
  }
  
  const bsaValue = getVitalValue(enriched, 'bsa', 'BSA');
  if (!bsaValue) {
    const bsa = calculateBSA(height, weight);
    if (bsa !== null) {
      enriched.bsa = String(bsa);
    }
  } else {
    enriched.bsa = bsaValue;
  }
  
  const bmrValue = getVitalValue(enriched, 'bmr', 'BMR');
  if (!bmrValue && patientDetails) {
    const bmr = calculateBMR(height, weight, patientDetails.age, patientDetails.gender);
    if (bmr !== null) {
      enriched.bmr = String(bmr);
    }
  } else if (bmrValue) {
    enriched.bmr = bmrValue;
  }
  
  return enriched;
}