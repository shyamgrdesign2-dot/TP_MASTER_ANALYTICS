import React from "react";
import { Text, View } from "@react-pdf/renderer";

function OphthalmologyTableView({
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
      if (trimmed === "" || /^[-–—]+$/.test(trimmed)) return false;
      if (/^(n\/?a|nil)$/i.test(trimmed)) return false;
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

  // Get autoRefraction subsection options
  const autoRefractionSubOptions = getAutoRefractionSubOptions();

  const borderColor = "#E6E9F2";
  const headerBg = "#F7F8FB";
  const borderRightColor = borderColor;
  const fontFamily = printSettings?.page_format?.font_family;
  const fontSize = PX_TO_PT * (printSettings?.page_format?.font_size || 12);
  const baseTextStyle = {
    fontFamily,
    fontSize,
    color: "#1f1f2a",
  };

  const normalizeEye = (eye) => {
    const normalized = String(eye || "").toUpperCase();
    if (normalized === "RE") return "OD";
    if (normalized === "LE") return "OS";
    return normalized;
  };

  const getEyeData = (dataArray, eye) => {
    return dataArray.find((item) => normalizeEye(item.eye) === eye) || {};
  };

  const formatValue = (value) => {
    if (value === 0 || value === "0") return "0";
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  };

  const formatDistance = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const str = String(value);
    if (str.includes("/") || /[a-zA-Z]/.test(str)) return str;
    return `6/${str}`;
  };

  const formatNear = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const str = String(value);
    if (/^[0-9.]+$/.test(str)) return `N${str}`;
    return str;
  };

  const formatAxis = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const str = String(value);
    if (str.includes("deg") || /[a-zA-Z]/.test(str)) return str;
    return `${str} deg`;
  };

  const formatUnit = (value, unit) => {
    if (value === null || value === undefined || value === "") return "-";
    const str = String(value);
    return str.includes(unit) ? str : `${str} ${unit}`;
  };

  const renderSection = (title, renderContent, options = {}) => {
    const { addColon = true } = options;
    return (
      <View style={{ marginTop: PX_TO_PT * 6, marginBottom: PX_TO_PT * 6 }}>
        <Text
          style={{
            ...baseTextStyle,
            fontWeight: 700,
            marginBottom: PX_TO_PT * 6,
          }}
        >
          {addColon ? `${title}:` : title}
        </Text>
        {renderContent()}
      </View>
    );
  };

  const renderSubTitle = (title) => (
    <Text
      style={{
        ...baseTextStyle,
        fontWeight: 500,
        marginTop: PX_TO_PT * 6,
        marginBottom: PX_TO_PT * 6,
      }}
    >
      {title}
    </Text>
  );

  const renderTable = (headers, rows, columnWidths) => {
    const widths =
      columnWidths ||
      headers.map(() => `${Math.round(100 / headers.length)}%`);
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <View style={{ flexDirection: "row", backgroundColor: headerBg }}>
          {headers.map((header, index) => (
            <Text
              key={header}
              style={{
                ...baseTextStyle,
                fontWeight: 500,
                padding: PX_TO_PT * 6,
                width: widths[index],
                borderRightWidth: index === headers.length - 1 ? 0 : 1,
                borderRightColor,
              }}
            >
              {header.toUpperCase()}
            </Text>
          ))}
        </View>
        {rows.map((row, rowIndex) => (
          <View
            key={`${rowIndex}-${row[0]}`}
            style={{
              flexDirection: "row",
              borderTopWidth: 1,
              borderTopColor: borderColor,
            }}
          >
            {row.map((cell, cellIndex) => (
              <Text
                key={`${rowIndex}-${cellIndex}`}
                style={{
                  ...baseTextStyle,
                  padding: PX_TO_PT * 6,
                  width: widths[cellIndex],
                  borderRightWidth: cellIndex === row.length - 1 ? 0 : 1,
                  borderRightColor,
                }}
              >
                {formatValue(cell)}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderEyeTable = (headers, rows) => {
    const widths = headers.map((header, index) =>
      index === 0 ? "14%" : `${Math.floor(86 / (headers.length - 1))}%`
    );
    return renderTable(headers, rows, widths);
  };

  const renderPdRow = (value) => (
    <View
      style={{
        borderWidth: 1,
        borderColor,
        borderRadius: 6,
        overflow: "hidden",
        marginTop: PX_TO_PT * 6,
      }}
    >
      <View style={{ flexDirection: "row" }}>
        <Text
          style={{
            ...baseTextStyle,
            fontWeight: 500,
            padding: PX_TO_PT * 6,
            width: "40%",
            borderRightWidth: 1,
            borderRightColor,
            backgroundColor: headerBg,
          }}
        >
          PD
        </Text>
        <Text
          style={{
            ...baseTextStyle,
            padding: PX_TO_PT * 6,
            width: "60%",
          }}
        >
          {formatValue(value)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ marginTop: PX_TO_PT * 6 }}>
      {/* Visual Acuity Test */}
      {isSectionVisible("visualAcuity") &&
        hasVisualAcuityData &&
        renderSection("Visual Acuity Test", () => {
          const rows = ["OD", "OS"].map((eye) => {
            const data = getEyeData(visualAcuity, eye);
            return [
              eye,
              formatDistance(data.ucDistance),
              formatNear(data.ucNear),
              formatDistance(data.pinhole),
              formatDistance(data.cDistance),
              formatNear(data.cNear),
            ];
          });
          return renderEyeTable(
            ["Eye", "UC Distance", "UC Near", "Pinhole", "C Distance", "C Near"],
            rows
          );
        })}

      {/* Subjective Refraction */}
      {isSectionVisible("autoRefraction") &&
        hasAutoRefractionData &&
        renderSection("Subjective Refraction", () => {
          const undilated = autoRefraction.filter(
            (item) => String(item.type || "").toLowerCase() === "undilated"
          );
          const dilated = autoRefraction.filter(
            (item) => String(item.type || "").toLowerCase() === "dilated"
          );
          const undilatedHasData = hasArrayData(undilated, [
            "sphere",
            "cylinder",
            "axis",
            "add",
            "distance",
            "near",
          ]);
          const dilatedHasData = hasArrayData(dilated, [
            "sphere",
            "cylinder",
            "axis",
            "add",
            "distance",
            "near",
          ]);

          const buildRefractionRows = (rows) => {
            return ["OD", "OS"].map((eye) => {
              const data = getEyeData(rows, eye);
              return [
                eye,
                formatValue(data.sphere),
                formatValue(data.cylinder),
                formatAxis(data.axis),
                formatValue(data.add),
                formatDistance(data.distance),
                formatNear(data.near),
              ];
            });
          };

          const headers = [
            "Eye",
            "Sphere",
            "Cylinder",
            "Axis",
            "Add",
            "Distance",
            "Near",
          ];

          return (
            <View>
              {autoRefractionSubOptions.undilated && undilatedHasData && (
                <>
                  {renderSubTitle("Undilated")}
                  {renderEyeTable(headers, buildRefractionRows(undilated))}
                </>
              )}
              {autoRefractionSubOptions.dilated && dilatedHasData && (
                <>
                  {renderSubTitle("Dilated")}
                  {renderEyeTable(headers, buildRefractionRows(dilated))}
                </>
              )}
            </View>
          );
        })}

      {/* Lensometer Values */}
      {isSectionVisible("lensometerValues") &&
        hasLensometerValuesData &&
        renderSection("Lensometer Values", () => {
          const rows = ["OD", "OS"].map((eye) => {
            const data = getEyeData(lensometerValues, eye);
            return [
              eye,
              formatValue(data.sphere),
              formatValue(data.cylinder),
              formatAxis(data.axis),
              formatValue(data.add),
              formatDistance(data.distance),
              formatNear(data.near),
            ];
          });
          return renderEyeTable(
            ["Eye", "Sphere", "Cylinder", "Axis", "Add", "Distance", "Near"],
            rows
          );
        })}

      {/* Glass Prescription */}
      {isSectionVisible("glassPrescription") &&
        hasGlassPrescriptionData &&
        renderSection("Glass Prescription", () => {
          const rows = ["OD", "OS"].map((eye) => {
            const data = getEyeData(glassPrescription, eye);
            return [
              eye,
              formatValue(data.sphere),
              formatValue(data.cylinder),
              formatAxis(data.axis),
              formatValue(data.add),
              formatDistance(data.distance),
              formatNear(data.near),
            ];
          });
          return (
            <View>
              {renderEyeTable(
                ["Eye", "Sphere", "Cylinder", "Axis", "Add", "Distance", "Near"],
                rows
              )}
              {ophthalModuleData?.pd !== undefined &&
              ophthalModuleData?.pd !== null &&
              ophthalModuleData?.pd !== ""
                ? renderPdRow(ophthalModuleData.pd)
                : null}
            </View>
          );
        })}

      {/* Intra Ocular Pressure */}
      {isSectionVisible("intraOcularPressure") &&
        hasIntraOcularPressureData &&
        renderSection(
          "Intra Ocular Pressure",
          () => {
            const rows = ["OD", "OS"].map((eye) => {
              const data = getEyeData(intraOcularPressure, eye);
              const cctValue = data.cct ?? data.cc;
              return [
                eye,
                formatUnit(data.nct, "mmHg"),
                formatUnit(data.gat, "mmHg"),
                formatUnit(cctValue, "um"),
                formatUnit(data.ciop, "mmHg"),
              ];
            });
            return renderEyeTable(["Eye", "NCT", "GAT", "CCT", "CIOP"], rows);
          },
          { addColon: false }
        )}

      {/* Slit Lamp Examination */}
      {isSectionVisible("slitLampExamination") &&
        hasSlitLampExaminationData &&
        renderSection("Slit Lamp Examination", () => {
          const rows = slitLampExamination
            .filter(
              (item) =>
                hasValue(item?.OD ?? item?.od) ||
                hasValue(item?.OS ?? item?.os) ||
                hasValue(item?.remarks)
            )
            .map((item) => [
            item.section,
            item.OD === "0" || item.OD === 0
              ? "Normal"
              : formatValue(item.OD || item.od),
            item.OS === "0" || item.OS === 0
              ? "Normal"
              : formatValue(item.OS || item.os),
            formatValue(item.remarks),
          ]);
          return renderTable(
            ["Test", "OD", "OS", "Remarks"],
            rows,
            ["32%", "22%", "22%", "24%"]
          );
        })}

      {/* Fundus Examination */}
      {isSectionVisible("fundusExamination") &&
        hasFundusExaminationData &&
        renderSection("Fundus Examination", () => {
          const rows = fundusExamination
            .filter(
              (item) =>
                hasValue(item?.OD ?? item?.od) ||
                hasValue(item?.OS ?? item?.os) ||
                hasValue(item?.remarks)
            )
            .map((item) => [
            item.section,
            item.OD === "0" || item.OD === 0
              ? "Normal"
              : formatValue(item.OD || item.od),
            item.OS === "0" || item.OS === 0
              ? "Normal"
              : formatValue(item.OS || item.os),
            formatValue(item.remarks),
          ]);
          return renderTable(
            ["Test", "OD", "OS", "Remarks"],
            rows,
            ["32%", "22%", "22%", "24%"]
          );
        })}
    </View>
  );
}

export default OphthalmologyTableView;
