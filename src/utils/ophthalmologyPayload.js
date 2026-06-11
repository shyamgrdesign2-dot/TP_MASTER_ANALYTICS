const buildTableMap = (sections) => {
  return (sections || []).reduce((acc, section) => {
    (section.tables || []).forEach((table) => {
      acc[table.id] = table;
    });
    return acc;
  }, {});
};

const buildEyeRowsPayload = (table, tableValues) => {
  if (!table) return [];
  return table.rows.map((row) => {
    const rowData = { eye: row.label };
    table.columns.forEach((column) => {
      if (column.type === "label") return;
      const cellKey = `${row.key}-${column.key}`;
      rowData[column.key] = tableValues?.[cellKey] ?? "";
    });
    return rowData;
  });
};

const buildSectionRowsPayload = (table, tableValues) => {
  if (!table) return [];
  return table.rows.map((row) => {
    const rowData = { section: row.label };
    table.columns.forEach((column) => {
      if (column.type === "label") return;
      const cellKey = `${row.key}-${column.key}`;
      const value = tableValues?.[cellKey] ?? "";
      if (column.key === "od") {
        rowData.OD = value;
      } else if (column.key === "os") {
        rowData.OS = value;
      } else {
        rowData[column.key] = value;
      }
    });
    return rowData;
  });
};

export const buildOpthalPayload = ({
  sections,
  tables,
  extraFields,
  visualAcuity,
  tcmId,
}) => {
  const tableById = buildTableMap(sections);
  const visualAcuityPayload = [
    {
      eye: "OD",
      ...(visualAcuity?.od || {}),
    },
    {
      eye: "OS",
      ...(visualAcuity?.os || {}),
    },
  ];

  const undilated = buildEyeRowsPayload(
    tableById["autoRefractionUndilated"],
    tables?.autoRefractionUndilated
  ).map((row) => ({ ...row, type: "Undilated" }));

  const dilated = buildEyeRowsPayload(
    tableById["autoRefractionDilated"],
    tables?.autoRefractionDilated
  ).map((row) => ({ ...row, type: "Dilated" }));

  const lensometerValues = buildEyeRowsPayload(
    tableById["lensometerTable"],
    tables?.lensometerTable
  );

  const glassPrescription = buildEyeRowsPayload(
    tableById["glassPrescriptionTable"],
    tables?.glassPrescriptionTable
  );

  const intraOcularPressure = buildEyeRowsPayload(
    tableById["iopTable"],
    tables?.iopTable
  ).map(({ cct, ...rest }) => ({
    ...rest,
    cc: cct ?? "",
  }));

  const slitLampExamination = buildSectionRowsPayload(
    tableById["slitLampTable"],
    tables?.slitLampTable
  );

  const fundusExamination = buildSectionRowsPayload(
    tableById["fundusTable"],
    tables?.fundusTable
  );

  return {
    ...(tcmId !== undefined ? { tcm_id: tcmId } : {}),
    visualAcuity: visualAcuityPayload,
    autoRefraction: [...undilated, ...dilated],
    lensometerValues,
    glassPrescription,
    pd: extraFields?.pd || "",
    intraOcularPressure,
    slitLampExamination,
    fundusExamination,
  };
};
