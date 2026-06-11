import React from "react";
import { Text, View } from "@react-pdf/renderer";

function OphthalmologyInlineView({
  PX_TO_PT,
  styles,
  printSettings,
  ophthalModuleData,
  options,
}) {
  const visualAcuity = ophthalModuleData?.visualAcuity || [];
  const autoRefraction = ophthalModuleData?.autoRefraction || [];
  const lensometerValues = ophthalModuleData?.lensometerValues || [];
  const glassPrescription = ophthalModuleData?.glassPrescription || [];
  const intraOcularPressure = ophthalModuleData?.intraOcularPressure || [];
  const slitLampExamination = ophthalModuleData?.slitLampExamination || [];
  const fundusExamination = ophthalModuleData?.fundusExamination || [];
  const hasValue = (value) => {
    if (value === 0 || value === "0") return true;
    if (value === null || value === undefined) return false;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "" || trimmed === "-" || trimmed === "--") return false;
      return true;
    }
    return Boolean(value);
  };
  const hasArrayData = (items, keys) =>
    Array.isArray(items) &&
    items.some((item) => keys.some((key) => hasValue(item?.[key])));
  const hasVisualAcuityData = hasArrayData(visualAcuity, [
    "ucDistance",
    "ucNear",
    "pinhole",
    "cDistance",
    "cNear",
  ]);
  const hasAutoRefractionData = hasArrayData(autoRefraction, [
    "sphere",
    "cylinder",
    "axis",
    "add",
    "distance",
    "near",
  ]);
  const hasLensometerValuesData = hasArrayData(lensometerValues, [
    "sphere",
    "cylinder",
    "axis",
    "add",
    "distance",
    "near",
  ]);
  const hasGlassPrescriptionData =
    hasArrayData(glassPrescription, [
      "sphere",
      "cylinder",
      "axis",
      "add",
      "distance",
      "near",
    ]) || hasValue(ophthalModuleData?.pd);
  const hasIntraOcularPressureData = hasArrayData(intraOcularPressure, [
    "nct",
    "gat",
    "cc",
    "cct",
    "ciop",
  ]);
  const hasSlitLampExaminationData = hasArrayData(slitLampExamination, [
    "OD",
    "OS",
    "remarks",
  ]);
  const hasFundusExaminationData = hasArrayData(fundusExamination, [
    "OD",
    "OS",
    "remarks",
  ]);

  // Helper to check if a section should be visible
  const isSectionVisible = (sectionId) => {
    if (!options || !Array.isArray(options)) return true;
    const sectionOption = options.find((opt) => {
      if (typeof opt === "string") return opt === sectionId;
      if (typeof opt === "object") return opt.id === sectionId;
      return false;
    });
    if (!sectionOption) return false;
    if (typeof sectionOption === "string") return true;
    return sectionOption.visible !== false;
  };

  // Helper to get subsection options for autoRefraction
  const getAutoRefractionSubOptions = () => {
    if (!options || !Array.isArray(options)) {
      return { undilated: true, dilated: true };
    }
    const autoRefractionOption = options.find((opt) => {
      const id = typeof opt === "object" ? opt.id : opt;
      return id === "autoRefraction";
    });
    if (!autoRefractionOption || typeof autoRefractionOption !== "object") {
      return { undilated: false, dilated: false };
    }
    const subSections = autoRefractionOption.subSections || [];
    return {
      undilated: subSections.some((sub) => {
        const subId = typeof sub === "object" ? sub.id : sub;
        return (
          subId === "undilated" &&
          (typeof sub === "string" || sub.visible !== false)
        );
      }),
      dilated: subSections.some((sub) => {
        const subId = typeof sub === "object" ? sub.id : sub;
        return (
          subId === "dilated" &&
          (typeof sub === "string" || sub.visible !== false)
        );
      }),
    };
  };

  const autoRefractionSubOptions = getAutoRefractionSubOptions();

  const getEyeData = (dataArray, eye) => {
    return dataArray.find((item) => item.eye === eye) || {};
  };

  const formatInlineValue = (label, odValue, osValue) => {
    return `${label}: OD: ${odValue || "--"}, OS: ${osValue || "--"}`;
  };

  const formatEyeDataInline = (odData, osData, fields) => {
    const odValues = fields
      .map((field) => {
        const value = odData[field.key];
        if (!value && value !== 0) return null;
        
        if (field.format === "distance") {
          return `${field.label}: 6/${value}`;
        }
        if (field.format === "near") {
          return `${field.label}: N${value}`;
        }
        if (field.format === "axis") {
          return `${field.label}: ${value} deg`;
        }
        if (field.format === "pressure") {
          return `${field.label}: ${value} mmHg`;
        }
        if (field.format === "cct") {
          return `${field.label}: ${value} um`;
        }
        if (field.format === "ciop") {
          return `${field.label}: ${value} mmHg`;
        }
        return `${field.label}: ${value}`;
      })
      .filter(Boolean);
    
    const osValues = fields
      .map((field) => {
        const value = osData[field.key];
        if (!value && value !== 0) return null;
        
        if (field.format === "distance") {
          return `${field.label}: 6/${value}`;
        }
        if (field.format === "near") {
          return `${field.label}: N${value}`;
        }
        if (field.format === "axis") {
          return `${field.label}: ${value} deg`;
        }
        if (field.format === "pressure") {
          return `${field.label}: ${value} mmHg`;
        }
        if (field.format === "cct") {
          return `${field.label}: ${value} um`;
        }
        if (field.format === "ciop") {
          return `${field.label}: ${value} mmHg`;
        }
        return `${field.label}: ${value}`;
      })
      .filter(Boolean);
    
    const odFormatted = odValues.length > 0 ? `OD (${odValues.join(", ")})` : "OD (--)";
    const osFormatted = osValues.length > 0 ? `OS (${osValues.join(", ")})` : "OS (--)";
    
    return `${odFormatted} | ${osFormatted}`;
  };

  return (
    <View style={{ marginTop: PX_TO_PT * 6 }}>
      {/* Visual Acuity Test */}
      {isSectionVisible("visualAcuity") && hasVisualAcuityData && (
        <View style={{ marginBottom: PX_TO_PT * 6 }}>
          <Text
            style={{
              color: "#171725",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize:
                PX_TO_PT * (printSettings?.page_format?.font_size || 12),
              fontWeight: 700,
              marginBottom: PX_TO_PT * 6,
            }}
          >
            Visual Acuity Test:
          </Text>
          {(() => {
            const odData = getEyeData(visualAcuity, "OD");
            const osData = getEyeData(visualAcuity, "OS");
            return (
              <Text
                style={{
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize:
                    PX_TO_PT *
                    (printSettings?.page_format?.font_size || 12),
                  color: "#000",
                  // marginBottom: PX_TO_PT * 3,
                }}
              >
                {formatEyeDataInline(odData, osData, [
                  { key: "ucDistance", label: "UC DISTANCE", format: "distance" },
                  { key: "ucNear", label: "UC NEAR", format: "near" },
                  { key: "pinhole", label: "PINHOLE", format: "distance" },
                  { key: "cDistance", label: "C DISTANCE", format: "distance" },
                  { key: "cNear", label: "C NEAR", format: "near" },
                ])}
              </Text>
            );
          })()}
        </View>
      )}

      {/* Subjective Refraction */}
      {isSectionVisible("autoRefraction") && hasAutoRefractionData && (
        <View style={{ marginBottom: PX_TO_PT * 6 }}>
          <Text
            style={{
              color: "#171725",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize:
                PX_TO_PT * (printSettings?.page_format?.font_size || 12),
              fontWeight: 700,
              marginBottom: PX_TO_PT * 6,
            }}
          >
            Subjective Refraction:
          </Text>
          {(() => {
            const undilatedOD = autoRefraction.find(
              (item) => item.eye === "OD" && item.type === "Undilated"
            );
            const undilatedOS = autoRefraction.find(
              (item) => item.eye === "OS" && item.type === "Undilated"
            );
            const dilatedOD = autoRefraction.find(
              (item) => item.eye === "OD" && item.type === "Dilated"
            );
            const dilatedOS = autoRefraction.find(
              (item) => item.eye === "OS" && item.type === "Dilated"
            );

            const undilatedHasData = hasArrayData(
              [undilatedOD, undilatedOS].filter(Boolean),
              ["sphere", "cylinder", "axis", "add", "distance", "near"]
            );
            const dilatedHasData = hasArrayData(
              [dilatedOD, dilatedOS].filter(Boolean),
              ["sphere", "cylinder", "axis", "add", "distance", "near"]
            );

            return (
              <View>
                {autoRefractionSubOptions.undilated && undilatedHasData && (
                  <Text
                    style={{
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize:
                        PX_TO_PT *
                        (printSettings?.page_format?.font_size || 12),
                      color: "#000",
                      // marginBottom: PX_TO_PT * 3,
                    }}
                  >
                    Undilated: {formatEyeDataInline(undilatedOD || {}, undilatedOS || {}, [
                      { key: "sphere", label: "SPHERE" },
                      { key: "cylinder", label: "CYLINDER" },
                      { key: "axis", label: "AXIS", format: "axis" },
                      { key: "add", label: "C ADD" },
                      { key: "distance", label: "DISTANCE", format: "distance" },
                      { key: "near", label: "NEAR", format: "near" },
                    ])}
                  </Text>
                )}

                {autoRefractionSubOptions.dilated && dilatedHasData && (
                  <Text
                    style={{
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize:
                        PX_TO_PT *
                        (printSettings?.page_format?.font_size || 12),
                      color: "#000",
                      // marginBottom: PX_TO_PT * 3,
                    }}
                  >
                    Dilated: {formatEyeDataInline(dilatedOD || {}, dilatedOS || {}, [
                      { key: "sphere", label: "SPHERE" },
                      { key: "cylinder", label: "CYLINDER" },
                      { key: "axis", label: "AXIS", format: "axis" },
                      { key: "add", label: "C ADD" },
                      { key: "distance", label: "DISTANCE", format: "distance" },
                      { key: "near", label: "NEAR", format: "near" },
                    ])}
                  </Text>
                )}
              </View>
            );
          })()}
        </View>
      )}

      {/* Lensometer Values */}
      {isSectionVisible("lensometerValues") && hasLensometerValuesData && (
        <View style={{ marginBottom: PX_TO_PT * 6 }}>
          <Text
            style={{
              color: "#171725",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize:
                PX_TO_PT * (printSettings?.page_format?.font_size || 12),
              fontWeight: 700,
              marginBottom: PX_TO_PT * 6,
            }}
          >
            Lensometer Values:
          </Text>
          {(() => {
            const odData = getEyeData(lensometerValues, "OD");
            const osData = getEyeData(lensometerValues, "OS");
            return (
              <Text
                style={{
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize:
                    PX_TO_PT *
                    (printSettings?.page_format?.font_size || 12),
                  color: "#000",
                  // marginBottom: PX_TO_PT * 3,
                }}
              >
                {formatEyeDataInline(odData, osData, [
                  { key: "sphere", label: "SPHERE" },
                  { key: "cylinder", label: "CYLINDER" },
                  { key: "axis", label: "AXIS", format: "axis" },
                  { key: "add", label: "C ADD" },
                  { key: "distance", label: "DISTANCE", format: "distance" },
                  { key: "near", label: "NEAR", format: "near" },
                ])}
              </Text>
            );
          })()}
        </View>
      )}

      {/* Glass Prescription */}
      {isSectionVisible("glassPrescription") && hasGlassPrescriptionData && (
        <View style={{ marginBottom: PX_TO_PT * 6 }}>
          <Text
            style={{
              color: "#171725",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize:
                PX_TO_PT * (printSettings?.page_format?.font_size || 12),
              fontWeight: 700,
              marginBottom: PX_TO_PT * 6,
            }}
          >
            Glass Prescription:
          </Text>
          {(() => {
            const odData = getEyeData(glassPrescription, "OD");
            const osData = getEyeData(glassPrescription, "OS");
            const pd = ophthalModuleData?.pd;
            const eyeData = formatEyeDataInline(odData, osData, [
              { key: "sphere", label: "SPHERE" },
              { key: "cylinder", label: "CYLINDER" },
              { key: "axis", label: "AXIS", format: "axis" },
              { key: "add", label: "C ADD" },
              { key: "distance", label: "DISTANCE", format: "distance" },
              { key: "near", label: "NEAR", format: "near" },
            ]);
            return (
              <Text
                style={{
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize:
                    PX_TO_PT *
                    (printSettings?.page_format?.font_size || 12),
                  color: "#000",
                  // marginBottom: PX_TO_PT * 3,
                }}
              >
                {eyeData}{pd ? ` | PD (${pd})` : ""}
              </Text>
            );
          })()}
        </View>
      )}

      {/* Intra Ocular Pressure */}
      {isSectionVisible("intraOcularPressure") &&
        hasIntraOcularPressureData && (
        <View style={{ marginBottom: PX_TO_PT * 6 }}>
          <Text
            style={{
              color: "#171725",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize:
                PX_TO_PT * (printSettings?.page_format?.font_size || 12),
              fontWeight: 700,
              marginBottom: PX_TO_PT * 6,
            }}
          >
            Intra Ocular Pressure:
          </Text>
          {(() => {
            const odData = getEyeData(intraOcularPressure, "OD");
            const osData = getEyeData(intraOcularPressure, "OS");
            return (
              <Text
                style={{
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize:
                    PX_TO_PT *
                    (printSettings?.page_format?.font_size || 12),
                  color: "#000",
                  // marginBottom: PX_TO_PT * 3,
                }}
              >
                {formatEyeDataInline(odData, osData, [
                  { key: "nct", label: "NCT", format: "pressure" },
                  { key: "gat", label: "GAT", format: "pressure" },
                  { key: "cc", label: "CCT", format: "cct" },
                  { key: "ciop", label: "CIOP", format: "ciop" },
                ])}
              </Text>
            );
          })()}
        </View>
      )}

      {/* Slit Lamp Examination */}
      {isSectionVisible("slitLampExamination") &&
        hasSlitLampExaminationData && (
        <View style={{ marginBottom: PX_TO_PT * 6 }}>
          <Text
            style={{
              color: "#171725",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize:
                PX_TO_PT * (printSettings?.page_format?.font_size || 12),
              fontWeight: 700,
              marginBottom: PX_TO_PT * 6,
            }}
          >
            Slit Lamp Examination:
          </Text>
          {slitLampExamination.map((item, index) => {
            const rawOd = item?.OD ?? item?.od;
            const rawOs = item?.OS ?? item?.os;
            if (
              !hasValue(rawOd) &&
              !hasValue(rawOs) &&
              !hasValue(item?.remarks)
            ) {
              return null;
            }

            const odValue =
              rawOd === "0" || rawOd === 0
                ? "Normal"
                : hasValue(rawOd)
                ? rawOd
                : "--";
            const osValue =
              rawOs === "0" || rawOs === 0
                ? "Normal"
                : hasValue(rawOs)
                ? rawOs
                : "--";
            const values = [];
            if (odValue !== "--") values.push(`OD: ${odValue}`);
            if (osValue !== "--") values.push(`OS: ${osValue}`);
            if (hasValue(item?.remarks)) values.push(`Remarks: ${item.remarks}`);
            const formattedValue =
              values.length > 0 ? `(${values.join(", ")})` : "--";
            return (
              <Text
                key={index}
                style={{
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize:
                    PX_TO_PT *
                    (printSettings?.page_format?.font_size || 12),
                  color: "#000",
                  // marginBottom: PX_TO_PT * 3,
                }}
              >
                {item.section}: {formattedValue}
              </Text>
            );
          })}
        </View>
      )}

      {/* Fundus Examination */}
      {isSectionVisible("fundusExamination") && hasFundusExaminationData && (
        <View style={{ marginBottom: PX_TO_PT * 6 }}>
          <Text
            style={{
              color: "#171725",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize:
                PX_TO_PT * (printSettings?.page_format?.font_size || 12),
              fontWeight: 700,
              marginBottom: PX_TO_PT * 6,
            }}
          >
            Fundus Examination:
          </Text>
          {fundusExamination.map((item, index) => {
            const rawOd = item?.OD ?? item?.od;
            const rawOs = item?.OS ?? item?.os;
            if (
              !hasValue(rawOd) &&
              !hasValue(rawOs) &&
              !hasValue(item?.remarks)
            ) {
              return null;
            }

            const odValue =
              rawOd === "0" || rawOd === 0
                ? "Normal"
                : hasValue(rawOd)
                ? rawOd
                : "--";
            const osValue =
              rawOs === "0" || rawOs === 0
                ? "Normal"
                : hasValue(rawOs)
                ? rawOs
                : "--";
            const values = [];
            if (odValue !== "--") values.push(`OD: ${odValue}`);
            if (osValue !== "--") values.push(`OS: ${osValue}`);
            if (hasValue(item?.remarks)) values.push(`Remarks: ${item.remarks}`);
            const formattedValue =
              values.length > 0 ? `(${values.join(", ")})` : "--";
            return (
              <Text
                key={index}
                style={{
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize:
                    PX_TO_PT *
                    (printSettings?.page_format?.font_size || 12),
                  color: "#000",
                  // marginBottom: PX_TO_PT * 3,
                }}
              >
                {item.section}: {formattedValue}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default OphthalmologyInlineView;
