import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AutoComplete,
  Button,
  Collapse,
  Dropdown,
  Input,
  Popover,
  Select,
  Spin,
  Tabs,
  Tooltip,
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./OphthalmologyExamPanel.module.scss";
import {
  OPHTHALMOLOGY_OPTIONS,
  OPHTHALMOLOGY_SECTIONS,
} from "../../utils/ophthalmologyExamConstants";

import CommonModal from "../../common/CommonModal";

import { errorMessage, removeBeforeWhiteSpace } from "../../utils/utils";
import {
  resetVisualAcuity,
  setVisualAcuityData,
  updateVisualAcuityField,
  setTableValue,
  setTableValues as setOpthalTableValues,
  resetTable,
  setExtraField,
  resetExtraField,
  setLastOpthalPrescriptionData,
} from "../../redux/ophthalmologyExamSlice";
import { getLastOpthalPrescription } from "../../pages/ophthalmology/service";
import {
  addSlitLampTemplate,
  updateSlitLampTemplate,
  deleteSlitLampTemplate,
  getSlitLampTemplates,
} from "../../redux/slitLampTemplateSlice";
import {
  addFundusTemplate,
  updateFundusTemplate,
  deleteFundusTemplate,
  getFundusTemplates,
} from "../../redux/fundusTemplateSlice";
import { ASSETS } from "../../assets";
const {
  visualAcuityTest: visualAcuityIcon,
  autoRefractionTest: autoRefractionIcon,
  lensometerValues: lensometerIcon,
  glassPrescription: glassPrescriptionIcon,
  intraOcularPressure: iopIcon,
  slitLampExamination: slitLampIcon,
  fundusExamination: fundusIcon,
  autofillblue: autoFillBlueIcon,
  opthalicon: opthalIcon,
  arrowBoxDown: arrowDownIcon,
  downArrowBlue: autofillArrowIcon,
  alerticon: alertIcon,
} = ASSETS.images;

const SECTION_ICONS = {
  visualAcuity: visualAcuityIcon,
  autoRefraction: autoRefractionIcon,
  lensometerValues: lensometerIcon,
  glassPrescription: glassPrescriptionIcon,
  iop: iopIcon,
  slitLamp: slitLampIcon,
  fundus: fundusIcon,
};

const resolveOptionsKey = (optionsKey) => {
  if (!optionsKey) {
    return undefined;
  }
  return optionsKey.split(".").reduce((acc, part) => {
    if (!acc) {
      return undefined;
    }
    return acc[part];
  }, OPHTHALMOLOGY_OPTIONS);
};

const parseNumericValue = (value) => {
  if (value === null || value === undefined) return null;
  const match = String(value).match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isNaN(parsed) ? null : parsed;
};

const formatCiopValue = (value) => {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
};

const computeCiopValue = ({ nct, gat, cct }) => {
  const nctValue = parseNumericValue(nct);
  const gatValue = parseNumericValue(gat);
  const cctValue = parseNumericValue(cct);
  if (cctValue === null) return "";
  const baseValue = gatValue ?? nctValue;
  if (baseValue === null) return "";
  const correction = ((520 - cctValue) / 10) * 0.7;
  return formatCiopValue(baseValue + correction);
};

const DropdownInput = ({
  value,
  placeholder,
  options,
  onChange,
  onAdvance,
  inputRef,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!options || options.length === 0) {
      return [];
    }
    return options.map((option) => ({ value: option }));
  }, [options]);

  return (
    <AutoComplete
      className={styles.autoComplete}
      value={value}
      options={filteredOptions}
      open={isOpen}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setTimeout(() => setIsOpen(false), 120)}
      onChange={onChange}
      onSelect={(nextValue) => {
        onChange(nextValue);
        setIsOpen(false);
        if (onAdvance) {
          onAdvance();
        }
      }}
      filterOption={(inputValue, option) =>
        option?.value?.toLowerCase().includes(inputValue.toLowerCase())
      }
      getPopupContainer={() => document.body}
      dropdownMatchSelectWidth
      dropdownClassName={styles.dropdown}
    >
      <Input
        ref={inputRef}
        className={styles.input}
        bordered={false}
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            setIsOpen(false);
            if (onAdvance) {
              onAdvance();
            }
          }
        }}
      />
    </AutoComplete>
  );
};

const InlineField = ({ field, value, onChange }) => {
  const options = field.optionsKey
    ? resolveOptionsKey(field.optionsKey)
    : field.options || [];

  if (field.variant === "inlineRow") {
    return (
      <div className={styles.inlineRowField}>
        <div className={styles.inlineRowLabel}>
          {field.shortLabel || field.label}
        </div>
        <div className={styles.inlineRowInput}>
          <DropdownInput
            value={value}
            placeholder={field.placeholder}
            options={options}
            onChange={onChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.inlineField}>
      <div className={styles.inlineLabel}>{field.label}</div>
      <DropdownInput
        value={value}
        placeholder={field.placeholder}
        options={options}
        onChange={onChange}
      />
    </div>
  );
};

const OphthalmologyTable = ({
  table,
  values: externalValues,
  onChange,
  resetKey,
}) => {
  const { columns, rows } = table;
  const isAutoRefractionEyeTable =
    table.id === "autoRefractionDilated" ||
    table.id === "autoRefractionUndilated" ||
    table.id === "visualAcuityTable" ||
    table.id === "lensometerTable" ||
    table.id === "glassPrescriptionTable" ||
    table.id === "iopTable";
  const isColumnEyeAutofillTable =
    table.id === "slitLampTable" || table.id === "fundusTable";
  const inputColumnKeys = useMemo(
    () => columns.filter((column) => column.type !== "label").map((c) => c.key),
    [columns]
  );
  const cellRefs = useMemo(() => {
    const refs = {};
    rows.forEach((row) => {
      inputColumnKeys.forEach((columnKey) => {
        refs[`${row.key}-${columnKey}`] = React.createRef();
      });
    });
    return refs;
  }, [rows, inputColumnKeys]);

  const initialValues = useMemo(() => {
    const nextValues = {};
    rows.forEach((row) => {
      columns.forEach((column) => {
        if (column.type === "label") {
          return;
        }
        nextValues[`${row.key}-${column.key}`] = "";
      });
    });
    return nextValues;
  }, [columns, rows]);

  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues, resetKey]);

  const handleChange = (rowKey, columnKey, nextValue) => {
    if (onChange) {
      onChange(rowKey, columnKey, nextValue);
      return;
    }
    setValues((prev) => ({
      ...prev,
      [`${rowKey}-${columnKey}`]: nextValue,
    }));
  };

  const handleAdvance = (rowKey, columnKey) => {
    const currentIndex = inputColumnKeys.indexOf(columnKey);
    if (currentIndex === -1 || currentIndex === inputColumnKeys.length - 1) {
      return;
    }
    const nextKey = inputColumnKeys[currentIndex + 1];
    const nextRef = cellRefs[`${rowKey}-${nextKey}`];
    if (nextRef?.current) {
      nextRef.current.focus();
    }
  };

  const getOptions = (row, column) => {
    if (column.optionsFromRow && row.optionsKey) {
      return resolveOptionsKey(row.optionsKey) || [];
    }
    if (column.optionsKey) {
      return resolveOptionsKey(column.optionsKey) || [];
    }
    if (column.options) {
      return column.options;
    }
    return [];
  };

  const handleEyeAutofill = (targetRowKey) => {
    const sourceRowKey = targetRowKey === "od" ? "os" : "od";
    const editableColumns = columns.filter((column) => column.type !== "label");
    if (onChange) {
      editableColumns.forEach((column) => {
        const sourceCellKey = `${sourceRowKey}-${column.key}`;
        const sourceValue = externalValues
          ? externalValues[sourceCellKey] ?? ""
          : values[sourceCellKey] ?? "";
        onChange(targetRowKey, column.key, sourceValue);
      });
      return;
    }
    setValues((prev) => {
      const nextValues = { ...prev };
      editableColumns.forEach((column) => {
        const sourceCellKey = `${sourceRowKey}-${column.key}`;
        const targetCellKey = `${targetRowKey}-${column.key}`;
        nextValues[targetCellKey] = prev[sourceCellKey] ?? "";
      });
      return nextValues;
    });
  };

  const handleEyeColumnAutofill = (targetColumnKey) => {
    const sourceColumnKey = targetColumnKey === "od" ? "os" : "od";
    if (onChange) {
      rows.forEach((row) => {
        const sourceCellKey = `${row.key}-${sourceColumnKey}`;
        const sourceValue = externalValues
          ? externalValues[sourceCellKey] ?? ""
          : values[sourceCellKey] ?? "";
        onChange(row.key, targetColumnKey, sourceValue);
      });
      return;
    }
    setValues((prev) => {
      const nextValues = { ...prev };
      rows.forEach((row) => {
        const sourceCellKey = `${row.key}-${sourceColumnKey}`;
        const targetCellKey = `${row.key}-${targetColumnKey}`;
        nextValues[targetCellKey] = prev[sourceCellKey] ?? "";
      });
      return nextValues;
    });
  };

  return (
    <div className={styles.tableWrapper}>
      {table.title && <div className={styles.tableTitle}>{table.title}</div>}
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => {
              const showColumnAutofill =
                isColumnEyeAutofillTable &&
                (column.key === "od" || column.key === "os");
              if (!showColumnAutofill) {
                return <th key={column.key}>{column.label}</th>;
              }

              const sourceEyeLabel = column.key === "od" ? "OS" : "OD";
              return (
                <th
                  key={column.key}
                  className={styles.columnHeaderAutofill}
                >
                  <div className={styles.columnHeaderContent}>
                    <span>{column.label}</span>
                    <button
                      type="button"
                      className={styles.columnAutofillCta}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEyeColumnAutofill(column.key);
                      }}
                    >
                      Autofill from {sourceEyeLabel}
                    </button>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {columns.map((column) => {
                if (column.type === "label") {
                  const showEyeAutofill =
                    isAutoRefractionEyeTable &&
                    (row.key === "od" || row.key === "os");
                  const sourceEyeLabel = row.key === "od" ? "OS" : "OD";
                  return (
                    <td
                      key={column.key}
                      className={`${styles.rowLabel} ${
                        showEyeAutofill ? styles.rowLabelAutofill : ""
                      }`}
                    >
                      <div className={styles.rowLabelContent}>
                        <span>{row.label}</span>
                        {showEyeAutofill && (
                          <button
                            type="button"
                            className={styles.rowAutofillCta}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEyeAutofill(row.key);
                            }}
                          >
                            Autofill from {sourceEyeLabel}
                          </button>
                        )}
                      </div>
                    </td>
                  );
                }
                const cellKey = `${row.key}-${column.key}`;
                const cellValue = externalValues
                  ? externalValues[cellKey] ?? ""
                  : values[cellKey];
                return (
                  <td key={column.key}>
                    <DropdownInput
                      value={cellValue}
                      placeholder={column.placeholder}
                      options={getOptions(row, column)}
                      onChange={(nextValue) =>
                        handleChange(row.key, column.key, nextValue)
                      }
                      onAdvance={() => handleAdvance(row.key, column.key)}
                      inputRef={cellRefs[cellKey]}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const OphthalmologySectionCard = ({
  section,
  onAction,
  getTableProps,
  autofillMenu,
  extraFieldValues,
  onExtraFieldChange,
  isCollapsed,
  onToggleCollapse,
  showCollapseToggle,
  showLoadFromPrev,
  renderAction,
}) => {
  const iconSrc = SECTION_ICONS[section.id];

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.headerLeft}>
          <div
            className={styles.headerIcon}
            style={{ width: section.iconSize, height: section.iconSize }}
          >
            {iconSrc ? (
              <img
                src={iconSrc}
                alt={`${section.title} icon`}
                className={styles.headerIconImage}
              />
            ) : (
              <div className={styles.iconPlaceholder} />
            )}
          </div>
          <div className={styles.headerTitle}>{section.title}</div>
        </div>
        <div className={styles.headerActions}>
          {section.chips?.map((chip) => (
            chip === "Autofill" ? (
              <Dropdown
                key={chip}
                menu={autofillMenu}
                trigger={["click"]}
                placement="bottomRight"
              >
                <button type="button" className={styles.headerChipButton}>
                  <img
                    src={autoFillBlueIcon}
                    alt=""
                    className={styles.chipIconImage}
                  />
                  <span>{chip}</span>
                  <img
                    src={autofillArrowIcon}
                    alt=""
                    className={styles.chipArrowIcon}
                  />
                </button>
              </Dropdown>
            ) : (
              <div key={chip} className={styles.headerChip}>
                <span className={styles.chipIcon} />
                {chip}
              </div>
            )
          ))}
          {section.actions?.map((action) => {
            const isLoadFromPrev = action === "Load from Prev.";
            const isDisabled = isLoadFromPrev && !showLoadFromPrev;
            const customAction = renderAction?.(section, action);
            if (customAction) {
              return customAction;
            }
            return (
            <button
              key={action}
              type="button"
              className={styles.headerAction}
              disabled={isDisabled}
              title={isDisabled ? "No prev data found" : undefined}
              onClick={() => {
                if (!isDisabled) {
                  onAction?.(section, action);
                }
              }}
            >
              {action === "Load from Prev." ? (
                <>
                  <i className="icon-reload"></i>
                  <span className={styles.headerActionUnderline}>Load from Prev.</span>
                </>
              ) : action === "Clear" ? (
                <>
                  <i className="icon-eraser1"></i>
                  <span>Clear</span>
                </>
              ) : action === "Templates" ? (
                <>
                  <i className="icon-template"></i>
                  <span>Templates</span>
                </>
              ) : action === "Save" ? (
                <>
                  <i className="icon-save"></i>
                  <span>Save</span>
                </>
              ) : (
                <>
                  <span className={styles.actionIcon} />
                  {action}
                </>
              )}
            </button>
            );
          })}
          {showCollapseToggle && (
            <button
              type="button"
              className={styles.sectionCollapseToggle}
              onClick={() => onToggleCollapse?.(section.id)}
            >
                <img
                  src={arrowDownIcon}
                  alt=""
                  className={`${styles.sectionCollapseIcon} ${
                  !isCollapsed ? styles.sectionCollapseIconOpen : ""
                }`}
                />
            </button>
          )}
        </div>
      </div>

      {/* {section.topFields && (
        <div className={styles.topFields}>
          {section.topFields.map((field) => (
            <InlineField key={field.label} field={field} />
          ))}
        </div>
      )} */}

      {!isCollapsed && (
        <>
          <div className={styles.tablesStack}>
            {section.tables.map((table) => (
              <OphthalmologyTable
                key={table.id}
                table={table}
                {...(getTableProps ? getTableProps(section, table) : {})}
              />
            ))}
          </div>

          {section.extraFields && (
            <div className={styles.extraFields}>
              {section.extraFields.map((field) => (
                <InlineField
                  key={field.label}
                  field={field}
                  value={extraFieldValues?.[field.key] || ""}
                  onChange={(nextValue) =>
                    onExtraFieldChange?.(field.key, nextValue)
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const OphthalmologyExamPanel = ({
  patientData,
  showHeader = false,
  headerTitle = "Opthal",
  enableSectionCollapse = false,
  loadPrevAllSignal = 0,
  clearAllSignal = 0,
  fetchLastOnMount = true,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { visualAcuity, tables, extraFields, resetCounter } = useSelector(
    (state) => state.ophthalmologyExam
  );
  const { templates: slitLampTemplates, loading: slitLampLoading } = useSelector(
    (state) => state.slitLampTemplates
  );
  const { templates: fundusTemplates, loading: fundusLoading } = useSelector(
    (state) => state.fundusTemplates
  );
  const lastOpthalPrescriptionData = useSelector(
    (state) => state.ophthalmologyExam.lastOpthalPrescriptionData
  );
  const [tableResets, setTableResets] = useState({});
  const [isExpanded, setIsExpanded] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [slitLampTemplatesOpen, setSlitLampTemplatesOpen] = useState(false);
  const [slitLampSaveOpen, setSlitLampSaveOpen] = useState(false);
  const [fundusTemplatesOpen, setFundusTemplatesOpen] = useState(false);
  const [fundusSaveOpen, setFundusSaveOpen] = useState(false);
  const [slitLampMatchedTemplates, setSlitLampMatchedTemplates] = useState([]);
  const [fundusMatchedTemplates, setFundusMatchedTemplates] = useState([]);
  const [slitLampAllTemplates, setSlitLampAllTemplates] = useState([]);
  const [fundusAllTemplates, setFundusAllTemplates] = useState([]);
  const [slitLampTemplateInput, setSlitLampTemplateInput] = useState(null);
  const [fundusTemplateInput, setFundusTemplateInput] = useState(null);
  const TAB_ADD_TEMPLATE = 1;
  const TAB_UPDATE_TEMPLATE = 2;
  const ADD_EDIT_TEMPLATE_TABS = [
    { key: TAB_ADD_TEMPLATE, label: "New Template" },
    { key: TAB_UPDATE_TEMPLATE, label: "Update Template" },
  ];
  const [slitLampTab, setSlitLampTab] = useState(TAB_ADD_TEMPLATE);
  const [fundusTab, setFundusTab] = useState(TAB_ADD_TEMPLATE);
  const [templateDeleteModal, setTemplateDeleteModal] = useState({
    isOpen: false,
    type: null,
    templateId: null,
  });
  const glassPrescriptionTableId = "glassPrescriptionTable";
  const sourceTableIds = useMemo(
    () => ({
      undilated: "autoRefractionUndilated",
      dilated: "autoRefractionDilated",
      lensometer: "lensometerTable",
    }),
    []
  );

  const buildEmptyTableValues = useCallback((table) => {
    const nextValues = {};
    table.rows.forEach((row) => {
      table.columns.forEach((column) => {
        if (column.type === "label") {
          return;
        }
        nextValues[`${row.key}-${column.key}`] = "";
      });
    });
    return nextValues;
  }, []);

  const initialTableValues = useMemo(() => {
    const values = {};
    OPHTHALMOLOGY_SECTIONS.forEach((section) => {
      section.tables.forEach((table) => {
        if (table.id === "visualAcuityTable") {
          return;
        }
        values[table.id] = buildEmptyTableValues(table);
      });
    });
    return values;
  }, [buildEmptyTableValues]);

  const [tableValues, setLocalTableValues] = useState(initialTableValues);

  useEffect(() => {
    if (!tables || Object.keys(tables).length === 0) return;
    setLocalTableValues((prev) => ({ ...prev, ...tables }));
  }, [tables]);

  const hasPrevDataBySection = useMemo(() => {
    const data = lastOpthalPrescriptionData || {};
    const hasOphthalValue = (value) => {
      if (value === 0 || value === "0") return true;
      if (value === null || value === undefined) return false;
      return typeof value === "string"
        ? value.trim().length > 0
        : Boolean(value);
    };
    const hasOphthalArrayData = (items, keys) =>
      Array.isArray(items) &&
      items.some((item) => keys.some((key) => hasOphthalValue(item?.[key])));

    return {
      visualAcuity: hasOphthalArrayData(data.visualAcuity, [
        "ucDistance",
        "ucNear",
        "pinhole",
        "cDistance",
        "cNear",
      ]),
      autoRefraction:
        hasOphthalArrayData(data.autoRefraction, [
          "sphere",
          "cylinder",
          "axis",
          "add",
          "distance",
          "near",
        ]) || hasOphthalValue(data.pd),
      lensometerValues: hasOphthalArrayData(data.lensometerValues, [
        "sphere",
        "cylinder",
        "axis",
        "add",
        "distance",
        "near",
      ]),
      glassPrescription:
        hasOphthalArrayData(data.glassPrescription, [
          "sphere",
          "cylinder",
          "axis",
          "add",
          "distance",
          "near",
        ]) || hasOphthalValue(data.pd),
      iop: hasOphthalArrayData(data.intraOcularPressure, [
        "nct",
        "gat",
        "cc",
        "cct",
        "ciop",
      ]),
      slitLamp: hasOphthalArrayData(data.slitLampExamination, [
        "OD",
        "OS",
        "remarks",
      ]),
      fundus: hasOphthalArrayData(data.fundusExamination, [
        "OD",
        "OS",
        "remarks",
      ]),
    };
  }, [lastOpthalPrescriptionData]);

  const tableById = useMemo(() => {
    return OPHTHALMOLOGY_SECTIONS.reduce((acc, section) => {
      section.tables.forEach((table) => {
        acc[table.id] = table;
      });
      return acc;
    }, {});
  }, []);

  useEffect(() => {
    if (!fetchLastOnMount) {
      return () => {};
    }
    let isMounted = true;
    const fetchLastOpthal = async () => {
      try {
        const response = await getLastOpthalPrescription({
          patientId: patientData?.patient_unique_id || location.state?.patient_data?.patient_unique_id,
        });
        if (!isMounted) return;
        const payload = response?.data ?? response;
        dispatch(setLastOpthalPrescriptionData(payload || null));
      } catch (error) {
        console.error("Error fetching last opthal prescription:", error);
      }
    };
    fetchLastOpthal();
    return () => {
      isMounted = false;
    };
  }, [dispatch, fetchLastOnMount, location.state?.patient_data?.patient_unique_id, patientData?.patient_unique_id]);

  useEffect(() => {
    dispatch(getSlitLampTemplates());
    dispatch(getFundusTemplates());
  }, [dispatch]);

  useEffect(() => {
    setSlitLampMatchedTemplates(slitLampTemplates);
    setSlitLampAllTemplates(slitLampTemplates);
  }, [slitLampTemplates]);

  useEffect(() => {
    setFundusMatchedTemplates(fundusTemplates);
    setFundusAllTemplates(fundusTemplates);
  }, [fundusTemplates]);

  const visualAcuityValues = useMemo(() => {
    const map = {};
    const rows = [
      { key: "od", data: visualAcuity?.od || {} },
      { key: "os", data: visualAcuity?.os || {} },
    ];
    rows.forEach((row) => {
      Object.entries(row.data).forEach(([columnKey, value]) => {
        map[`${row.key}-${columnKey}`] = value ?? "";
      });
    });
    return map;
  }, [visualAcuity]);

  const handleAction = (section, action) => {
    if (section.id === "visualAcuity" && action === "SnapRx") {
      navigate("/ophthal-snap-rx", {
        state: {
          ...location.state,
          patient_data: patientData || location.state?.patient_data,
          returnPath: location.pathname,
          snapRxSchemaKey: "VISUAL_ACUITY_TEST",
        },
      });
      return;
    }

    if (action === "Templates" || action === "Save") {
      return;
    }

    if (section.id === "visualAcuity" && action === "Clear") {
      dispatch(resetVisualAcuity());
    }

    if (action === "Load from Prev.") {
      loadFromPrev(section);
    }

    if (action === "Clear") {
      if (section.tables?.length) {
        setLocalTableValues((prev) => {
          const next = { ...prev };
          section.tables.forEach((table) => {
            if (initialTableValues[table.id]) {
              next[table.id] = { ...initialTableValues[table.id] };
            }
          });
          return next;
        });
        section.tables.forEach((table) => {
          dispatch(resetTable({ tableId: table.id }));
        });
      }
      if (section.extraFields?.length) {
        section.extraFields.forEach((field) => {
          if (field.key) {
            dispatch(resetExtraField({ key: field.key }));
          }
        });
      }
      setTableResets((prev) => ({
        ...prev,
        [section.id]: (prev[section.id] || 0) + 1,
      }));
    }
  };

  const updateTableValues = useCallback((tableId, values) => {
    setLocalTableValues((prev) => ({
      ...prev,
      [tableId]: values,
    }));
    dispatch(
      setOpthalTableValues({
        tableId,
        values,
      })
    );
  }, [dispatch]);

  const buildEyeTableValues = useCallback((tableId, rows, keyMap = {}) => {
    const table = tableById[tableId];
    if (!table) return {};
    const nextValues = buildEmptyTableValues(table);
    table.rows.forEach((row) => {
      const entry = rows?.find(
        (item) => String(item.eye || "").toUpperCase() === row.label
      );
      table.columns.forEach((column) => {
        if (column.type === "label") return;
        const cellKey = `${row.key}-${column.key}`;
        const sourceKey = keyMap[column.key] || column.key;
        nextValues[cellKey] = entry?.[sourceKey] ?? "";
      });
    });
    return nextValues;
  }, [buildEmptyTableValues, tableById]);

  const buildSectionTableValues = useCallback((tableId, rows) => {
    const table = tableById[tableId];
    if (!table) return {};
    const nextValues = buildEmptyTableValues(table);
    const normalize = (value) => String(value || "").toLowerCase();
    table.rows.forEach((row) => {
      const entry = rows?.find((item) => {
        const labelMatch = normalize(item?.section ?? item?.title ?? item?.name);
        const keyMatch = normalize(
          item?.sectionKey ?? item?.section_key ?? item?.key ?? item?.id
        );
        return (
          labelMatch === normalize(row.label) || keyMatch === normalize(row.key)
        );
      });
      table.columns.forEach((column) => {
        if (column.type === "label") return;
        const cellKey = `${row.key}-${column.key}`;
        if (column.key === "od") {
          nextValues[cellKey] = entry?.OD ?? entry?.od ?? "";
          return;
        }
        if (column.key === "os") {
          nextValues[cellKey] = entry?.OS ?? entry?.os ?? "";
          return;
        }
        nextValues[cellKey] = entry?.[column.key] ?? "";
      });
    });
    return nextValues;
  }, [buildEmptyTableValues, tableById]);

  const buildSectionTemplateRows = useCallback((tableId) => {
    const table = tableById[tableId];
    if (!table) return [];
    const values = tableValues[tableId] || {};
    return table.rows
      .map((row) => {
        const od = values[`${row.key}-od`] ?? "";
        const os = values[`${row.key}-os`] ?? "";
        const remarks = values[`${row.key}-remarks`] ?? "";
        return {
          section: row.label,
          sectionKey: row.key,
          OD: od,
          OS: os,
          remarks,
        };
      })
      .filter((row) => row.OD || row.OS || row.remarks);
  }, [tableById, tableValues]);

  const formatTemplatePreview = useCallback((rows = []) => {
    const preview = rows
      .map((row) => {
        const label =
          row.section ?? row.title ?? row.name ?? row.sectionLabel ?? row.key;
        const od = row.OD ?? row.od;
        const os = row.OS ?? row.os;
        const remarks = row.remarks;
        const eyeValues = [od, os].filter(Boolean).join(" / ");
        const detail = [eyeValues, remarks].filter(Boolean).join(" | ");
        if (!label) {
          return null;
        }
        return detail ? `${label}: ${detail}` : label;
      })
      .filter(Boolean)
      .join(", ");
    return preview || "No values saved yet";
  }, []);

  const applySectionTemplate = useCallback(
    (tableId, rows) => {
      const nextValues = buildSectionTableValues(tableId, rows || []);
      updateTableValues(tableId, nextValues);
    },
    [buildSectionTableValues, updateTableValues]
  );

  const loadFromPrev = useCallback((section) => {
    const lastData = lastOpthalPrescriptionData;
    if (!lastData || !section) {
      return;
    }

    if (section.id === "visualAcuity") {
      const visualAcuityData = {
        od: {},
        os: {},
      };
      (lastData.visualAcuity || []).forEach((entry) => {
        const eyeKey = String(entry.eye || "").toLowerCase();
        if (!visualAcuityData[eyeKey]) return;
        visualAcuityData[eyeKey] = {
          ...visualAcuityData[eyeKey],
          ucDistance: entry.ucDistance ?? "",
          ucNear: entry.ucNear ?? "",
          pinhole: entry.pinhole ?? "",
          cDistance: entry.cDistance ?? "",
          cNear: entry.cNear ?? "",
        };
      });
      dispatch(setVisualAcuityData(visualAcuityData));
    }

    if (section.id === "autoRefraction") {
      const undilatedRows = (lastData.autoRefraction || []).filter(
        (item) => String(item.type || "").toLowerCase() === "undilated"
      );
      const dilatedRows = (lastData.autoRefraction || []).filter(
        (item) => String(item.type || "").toLowerCase() === "dilated"
      );
      updateTableValues(
        "autoRefractionUndilated",
        buildEyeTableValues("autoRefractionUndilated", undilatedRows)
      );
      updateTableValues(
        "autoRefractionDilated",
        buildEyeTableValues("autoRefractionDilated", dilatedRows)
      );
      if (lastData.pd !== undefined) {
        dispatch(setExtraField({ key: "pd", value: lastData.pd || "" }));
      }
    }

    if (section.id === "lensometerValues") {
      updateTableValues(
        "lensometerTable",
        buildEyeTableValues(
          "lensometerTable",
          lastData.lensometerValues || []
        )
      );
    }

    if (section.id === "glassPrescription") {
      updateTableValues(
        "glassPrescriptionTable",
        buildEyeTableValues(
          "glassPrescriptionTable",
          lastData.glassPrescription || []
        )
      );
      if (lastData.pd !== undefined) {
        dispatch(setExtraField({ key: "pd", value: lastData.pd || "" }));
      }
    }

    if (section.id === "iop") {
      updateTableValues(
        "iopTable",
        buildEyeTableValues("iopTable", lastData.intraOcularPressure || [], {
          cct: "cc",
        })
      );
    }

    if (section.id === "slitLamp") {
      updateTableValues(
        "slitLampTable",
        buildSectionTableValues(
          "slitLampTable",
          lastData.slitLampExamination || []
        )
      );
    }

    if (section.id === "fundus") {
      updateTableValues(
        "fundusTable",
        buildSectionTableValues(
          "fundusTable",
          lastData.fundusExamination || []
        )
      );
    }
  }, [
    lastOpthalPrescriptionData,
    updateTableValues,
    buildEyeTableValues,
    buildSectionTableValues,
    dispatch,
  ]);

  const slitLampTemplateRows = useMemo(
    () => buildSectionTemplateRows("slitLampTable"),
    [buildSectionTemplateRows]
  );
  const fundusTemplateRows = useMemo(
    () => buildSectionTemplateRows("fundusTable"),
    [buildSectionTemplateRows]
  );

  const handleSlitLampTemplateSearch = (event) => {
    const query = event.target.value;
    if (query) {
      setSlitLampMatchedTemplates(
        slitLampTemplates.filter((template) =>
          template.tsl_template_name?.toLowerCase().includes(query.toLowerCase())
        )
      );
    } else {
      setSlitLampMatchedTemplates(slitLampTemplates);
    }
  };

  const handleFundusTemplateSearch = (event) => {
    const query = event.target.value;
    if (query) {
      setFundusMatchedTemplates(
        fundusTemplates.filter((template) =>
          template.tft_template_name?.toLowerCase().includes(query.toLowerCase())
        )
      );
    } else {
      setFundusMatchedTemplates(fundusTemplates);
    }
  };

  const handleSlitLampTemplateSelected = (template) => {
    applySectionTemplate("slitLampTable", template.slitLampExamination);
    setSlitLampTemplatesOpen(false);
  };

  const handleFundusTemplateSelected = (template) => {
    applySectionTemplate("fundusTable", template.fundusExamination);
    setFundusTemplatesOpen(false);
  };

  const handleTemplateDeleteModal = (type, templateId) => {
    setTemplateDeleteModal({ isOpen: true, type, templateId });
  };

  const closeTemplateDeleteModal = () => {
    setTemplateDeleteModal({ isOpen: false, type: null, templateId: null });
  };

  const confirmTemplateDelete = async () => {
    const { type, templateId } = templateDeleteModal;
    if (!type || !templateId) {
      closeTemplateDeleteModal();
      return;
    }
    const action =
      type === "slitLamp"
        ? await dispatch(deleteSlitLampTemplate(templateId))
        : await dispatch(deleteFundusTemplate(templateId));
    if (action.meta.requestStatus === "rejected") {
      errorMessage(action.error);
    }
    closeTemplateDeleteModal();
  };

  const handleSlitLampSaveOpen = (nextOpen) => {
    if (nextOpen) {
      setSlitLampTemplateInput(null);
    }
    setSlitLampSaveOpen(nextOpen);
  };

  const handleFundusSaveOpen = (nextOpen) => {
    if (nextOpen) {
      setFundusTemplateInput(null);
    }
    setFundusSaveOpen(nextOpen);
  };

  const handleSlitLampTemplateInput = (event) => {
    const nextValue = removeBeforeWhiteSpace(event.target.value);
    setSlitLampTemplateInput(nextValue);
  };

  const handleFundusTemplateInput = (event) => {
    const nextValue = removeBeforeWhiteSpace(event.target.value);
    setFundusTemplateInput(nextValue);
  };

  const handleSlitLampTemplateSelect = (data, option) => {
    setSlitLampTemplateInput(option.key);
  };

  const handleFundusTemplateSelect = (data, option) => {
    setFundusTemplateInput(option.key);
  };

  const handleSlitLampTabChange = (key) => {
    setSlitLampTemplateInput(null);
    setSlitLampTab(key);
  };

  const handleFundusTabChange = (key) => {
    setFundusTemplateInput(null);
    setFundusTab(key);
  };

  const handleSlitLampAddTemplate = async () => {
    if (!slitLampTemplateRows.length) {
      errorMessage("At least 1 slit lamp entry added");
      return;
    }
    if (!slitLampTemplateInput) {
      errorMessage("Please enter template name");
      return;
    }
    const payload = {
      tsl_template_name: slitLampTemplateInput,
      slitLampExamination: slitLampTemplateRows,
    };
    const action = await dispatch(addSlitLampTemplate(payload));
    if (action.meta.requestStatus === "fulfilled") {
      setSlitLampTemplateInput(null);
      dispatch(getSlitLampTemplates());
      handleSlitLampSaveOpen(false);
    }
  };

  const handleFundusAddTemplate = async () => {
    if (!fundusTemplateRows.length) {
      errorMessage("At least 1 fundus entry added");
      return;
    }
    if (!fundusTemplateInput) {
      errorMessage("Please enter template name");
      return;
    }
    const payload = {
      tft_template_name: fundusTemplateInput,
      fundusExamination: fundusTemplateRows,
    };
    const action = await dispatch(addFundusTemplate(payload));
    if (action.meta.requestStatus === "fulfilled") {
      setFundusTemplateInput(null);
      dispatch(getFundusTemplates());
      handleFundusSaveOpen(false);
    }
  };

  const handleSlitLampUpdateTemplate = async () => {
    if (!slitLampTemplateRows.length) {
      errorMessage("At least 1 slit lamp entry added");
      return;
    }
    if (!slitLampTemplateInput) {
      errorMessage("Please select template");
      return;
    }
    const data = JSON.parse(slitLampTemplateInput);
    const payload = {
      tsl_id: data.tsl_id,
      tsl_template_name: data.tsl_template_name,
      slitLampExamination: slitLampTemplateRows,
    };
    const action = await dispatch(updateSlitLampTemplate(payload));
    if (action.meta.requestStatus === "fulfilled") {
      setSlitLampTemplateInput(null);
      dispatch(getSlitLampTemplates());
      handleSlitLampSaveOpen(false);
    }
  };

  const handleFundusUpdateTemplate = async () => {
    if (!fundusTemplateRows.length) {
      errorMessage("At least 1 fundus entry added");
      return;
    }
    if (!fundusTemplateInput) {
      errorMessage("Please select template");
      return;
    }
    const data = JSON.parse(fundusTemplateInput);
    const payload = {
      tft_id: data.tft_id,
      tft_template_name: data.tft_template_name,
      fundusExamination: fundusTemplateRows,
    };
    const action = await dispatch(updateFundusTemplate(payload));
    if (action.meta.requestStatus === "fulfilled") {
      setFundusTemplateInput(null);
      dispatch(getFundusTemplates());
      handleFundusSaveOpen(false);
    }
  };

  const loadFromPrevAll = useCallback(() => {
    OPHTHALMOLOGY_SECTIONS.forEach((section) => {
      loadFromPrev(section);
    });
  }, [loadFromPrev]);

  useEffect(() => {
    if (loadPrevAllSignal > 0) {
      loadFromPrevAll();
    }
  }, [loadPrevAllSignal, loadFromPrevAll]);

  useEffect(() => {
    if (clearAllSignal > 0) {
      setLocalTableValues(initialTableValues);
    }
  }, [clearAllSignal, initialTableValues]);

  useEffect(() => {
    if (resetCounter <= 0) return;
    setLocalTableValues(initialTableValues);
    setTableResets((prev) => {
      const next = { ...prev };
      OPHTHALMOLOGY_SECTIONS.forEach((section) => {
        next[section.id] = (next[section.id] || 0) + 1;
      });
      return next;
    });
  }, [resetCounter, initialTableValues]);

  const getTableProps = (section, table) => {
    const baseProps = {
      resetKey: tableResets[section.id] || 0,
    };
    if (section.id !== "visualAcuity" || table.id !== "visualAcuityTable") {
      if (tableValues[table.id]) {
        return {
          ...baseProps,
          values: tableValues[table.id],
          onChange: (rowKey, columnKey, nextValue) => {
            const nextTableValues = {
              ...(tableValues[table.id] || {}),
              [`${rowKey}-${columnKey}`]: nextValue,
            };
            let nextCiopValue = null;
            if (table.id === "iopTable" && ["nct", "gat", "cct"].includes(columnKey)) {
              nextCiopValue = computeCiopValue({
                nct: nextTableValues[`${rowKey}-nct`],
                gat: nextTableValues[`${rowKey}-gat`],
                cct: nextTableValues[`${rowKey}-cct`],
              });
              nextTableValues[`${rowKey}-ciop`] = nextCiopValue;
            }
            setLocalTableValues((prev) => ({
              ...prev,
              [table.id]: nextTableValues,
            }));
            dispatch(
              setTableValue({
                tableId: table.id,
                cellKey: `${rowKey}-${columnKey}`,
                value: nextValue,
              })
            );
            if (nextCiopValue !== null) {
              dispatch(
                setTableValue({
                  tableId: table.id,
                  cellKey: `${rowKey}-ciop`,
                  value: nextCiopValue,
                })
              );
            }
          },
        };
      }
      return baseProps;
    }
    return {
      ...baseProps,
      values: visualAcuityValues,
      onChange: (rowKey, columnKey, nextValue) => {
        dispatch(
          updateVisualAcuityField({
            eye: rowKey,
            field: columnKey,
            value: nextValue,
          })
        );
      },
    };
  };

  const handleAutofill = (sourceTableId) => {
    const sourceValues = tableValues[sourceTableId];
    if (!sourceValues || !tableValues[glassPrescriptionTableId]) {
      return;
    }
    const allowedKeys = new Set([
      "sphere",
      "cylinder",
      "axis",
      "add",
      "distance",
      "near",
    ]);
    const nextGlassValues = { ...tableValues[glassPrescriptionTableId] };
    Object.entries(sourceValues).forEach(([cellKey, value]) => {
      const columnKey = cellKey.split("-")[1];
      if (allowedKeys.has(columnKey)) {
        nextGlassValues[cellKey] = value || "";
      }
    });
    setLocalTableValues((prev) => ({
      ...prev,
      [glassPrescriptionTableId]: nextGlassValues,
    }));
    dispatch(
      setOpthalTableValues({
        tableId: glassPrescriptionTableId,
        values: nextGlassValues,
      })
    );
  };

  const autofillMenu = {
    items: [
      {
        key: sourceTableIds.undilated,
        label: "Auto Refraction Test - Undilated",
      },
      {
        key: sourceTableIds.dilated,
        label: "Auto Refraction Test - Dilated",
      },
      {
        key: sourceTableIds.lensometer,
        label: "Lensometer Values",
      },
    ],
    onClick: ({ key }) => handleAutofill(key),
  };

  const SLIT_LAMP_TEMPLATE_CONTENT = useMemo(() => {
    return (
      <>
        <div className="pop-header" key="slit-lamp-template">
          <div className="align-items-center d-flex justify-content-between">
            <div className="title-common">Slit Lamp Templates</div>
            <Button
              className="btn btn-delete-prescription p-0"
              onClick={() => setSlitLampTemplatesOpen(false)}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          <div className="mt-3" key="slit-lamp-template-search">
            <Input
              className="popinput"
              onChange={handleSlitLampTemplateSearch}
              placeholder="Search Templates"
              allowClear
              prefix={<i className="icon-search me-2" />}
            />
          </div>
        </div>
        <div className="pop-body">
          {slitLampMatchedTemplates.length > 0 &&
            slitLampMatchedTemplates.map((template) => (
              <div
                className="align-items-center d-flex medicine-templates"
                key={template.tsl_id}
              >
                <div
                  className="round-box"
                  onClick={() => handleSlitLampTemplateSelected(template)}
                >
                  <i className="icon-template"></i>
                </div>
                <div
                  className="text-truncate w-100"
                  onClick={() => handleSlitLampTemplateSelected(template)}
                >
                  <div className="title text-main2">
                    {template.tsl_template_name}
                  </div>
                  <div className="text-truncate">
                    {formatTemplatePreview(template.slitLampExamination)}
                  </div>
                </div>
                <Button
                  className="btn btn-delete-prescription p-0 ms-2"
                  onClick={() => {
                    handleTemplateDeleteModal("slitLamp", template.tsl_id);
                    setSlitLampTemplatesOpen(false);
                  }}
                >
                  {template.loading ? (
                    <Spin
                      indicator={<LoadingOutlined style={{ fontSize: 22 }} spin />}
                    />
                  ) : (
                    <i className="icon-delete"></i>
                  )}
                </Button>
              </div>
            ))}
        </div>
      </>
    );
  }, [slitLampMatchedTemplates, formatTemplatePreview]);

  const FUNDUS_TEMPLATE_CONTENT = useMemo(() => {
    return (
      <>
        <div className="pop-header" key="fundus-template">
          <div className="align-items-center d-flex justify-content-between">
            <div className="title-common">Fundus Templates</div>
            <Button
              className="btn btn-delete-prescription p-0"
              onClick={() => setFundusTemplatesOpen(false)}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          <div className="mt-3" key="fundus-template-search">
            <Input
              className="popinput"
              onChange={handleFundusTemplateSearch}
              placeholder="Search Templates"
              allowClear
              prefix={<i className="icon-search me-2" />}
            />
          </div>
        </div>
        <div className="pop-body">
          {fundusMatchedTemplates.length > 0 &&
            fundusMatchedTemplates.map((template) => (
              <div
                className="align-items-center d-flex medicine-templates"
                key={template.tft_id}
              >
                <div
                  className="round-box"
                  onClick={() => handleFundusTemplateSelected(template)}
                >
                  <i className="icon-template"></i>
                </div>
                <div
                  className="text-truncate w-100"
                  onClick={() => handleFundusTemplateSelected(template)}
                >
                  <div className="title text-main2">
                    {template.tft_template_name}
                  </div>
                  <div className="text-truncate">
                    {formatTemplatePreview(template.fundusExamination)}
                  </div>
                </div>
                <Button
                  className="btn btn-delete-prescription p-0 ms-2"
                  onClick={() => {
                    handleTemplateDeleteModal("fundus", template.tft_id);
                    setFundusTemplatesOpen(false);
                  }}
                >
                  {template.loading ? (
                    <Spin
                      indicator={<LoadingOutlined style={{ fontSize: 22 }} spin />}
                    />
                  ) : (
                    <i className="icon-delete"></i>
                  )}
                </Button>
              </div>
            ))}
        </div>
      </>
    );
  }, [fundusMatchedTemplates, formatTemplatePreview]);

  const SLIT_LAMP_SAVE_CONTENT = useMemo(() => {
    return (
      <>
        <div className="d-flex justify-content-between align-items-center border-bottom templatepopover">
          <Tabs
            defaultActiveKey={TAB_ADD_TEMPLATE}
            items={ADD_EDIT_TEMPLATE_TABS}
            onChange={handleSlitLampTabChange}
            className="w-100"
          />
          <Button
            className="btn btn-delete-prescription"
            onClick={() => handleSlitLampSaveOpen(false)}
          >
            <i className="icon-Cross"></i>
          </Button>
        </div>
        {slitLampTab === TAB_ADD_TEMPLATE ? (
          <div className="pop-header d-flex">
            <Input
              allowClear
              value={slitLampTemplateInput && slitLampTemplateInput}
              className="popinput inputheight41"
              placeholder="Template Name"
              onChange={handleSlitLampTemplateInput}
            />
            <Button
              className="btn btn-primary3 btn-41 ms-3"
              loading={slitLampLoading}
              disabled={!slitLampTemplateInput}
              onClick={handleSlitLampAddTemplate}
            >
              {" Save "}
            </Button>
          </div>
        ) : (
          <div className="pop-header d-flex">
            <Select
              showSearch
              value={
                slitLampTemplateInput &&
                JSON.parse(slitLampTemplateInput).tsl_template_name
              }
              className="autocomplete-custom w-100 popinput inputheight41"
              placeholder="Select Template"
              onSelect={handleSlitLampTemplateSelect}
              optionLabelProp="label"
              options={slitLampAllTemplates.map((template) => ({
                key: JSON.stringify(template),
                value: template.tsl_template_name,
                label: <div key={template.tsl_id}>{template.tsl_template_name}</div>,
              }))}
              optionRender={(option) => (
                <div className="align-items-center d-flex text-truncate w-100">
                  <div className="round-box">
                    <i className="icon-template"></i>
                  </div>
                  <div className="text-truncate w-100">
                    <div className="title text-main2">{option.data.value}</div>
                    <div className="text-truncate">
                      {formatTemplatePreview(
                        JSON.parse(option.data.key).slitLampExamination
                      )}
                    </div>
                  </div>
                </div>
              )}
            />
            <Button
              className="btn btn-primary3 btn-41 ms-3"
              loading={slitLampLoading}
              disabled={!slitLampTemplateInput}
              onClick={handleSlitLampUpdateTemplate}
            >
              {" Update "}
            </Button>
          </div>
        )}
      </>
    );
  }, [
    slitLampTab,
    slitLampTemplateInput,
    slitLampLoading,
    slitLampAllTemplates,
    handleSlitLampTabChange,
    handleSlitLampTemplateInput,
    handleSlitLampTemplateSelect,
    handleSlitLampAddTemplate,
    handleSlitLampUpdateTemplate,
    formatTemplatePreview,
  ]);

  const FUNDUS_SAVE_CONTENT = useMemo(() => {
    return (
      <>
        <div className="d-flex justify-content-between align-items-center border-bottom templatepopover">
          <Tabs
            defaultActiveKey={TAB_ADD_TEMPLATE}
            items={ADD_EDIT_TEMPLATE_TABS}
            onChange={handleFundusTabChange}
            className="w-100"
          />
          <Button
            className="btn btn-delete-prescription"
            onClick={() => handleFundusSaveOpen(false)}
          >
            <i className="icon-Cross"></i>
          </Button>
        </div>
        {fundusTab === TAB_ADD_TEMPLATE ? (
          <div className="pop-header d-flex">
            <Input
              allowClear
              value={fundusTemplateInput && fundusTemplateInput}
              className="popinput inputheight41"
              placeholder="Template Name"
              onChange={handleFundusTemplateInput}
            />
            <Button
              className="btn btn-primary3 btn-41 ms-3"
              loading={fundusLoading}
              disabled={!fundusTemplateInput}
              onClick={handleFundusAddTemplate}
            >
              {" Save "}
            </Button>
          </div>
        ) : (
          <div className="pop-header d-flex">
            <Select
              showSearch
              value={
                fundusTemplateInput &&
                JSON.parse(fundusTemplateInput).tft_template_name
              }
              className="autocomplete-custom w-100 popinput inputheight41"
              placeholder="Select Template"
              onSelect={handleFundusTemplateSelect}
              optionLabelProp="label"
              options={fundusAllTemplates.map((template) => ({
                key: JSON.stringify(template),
                value: template.tft_template_name,
                label: <div key={template.tft_id}>{template.tft_template_name}</div>,
              }))}
              optionRender={(option) => (
                <div className="align-items-center d-flex text-truncate w-100">
                  <div className="round-box">
                    <i className="icon-template"></i>
                  </div>
                  <div className="text-truncate w-100">
                    <div className="title text-main2">{option.data.value}</div>
                    <div className="text-truncate">
                      {formatTemplatePreview(
                        JSON.parse(option.data.key).fundusExamination
                      )}
                    </div>
                  </div>
                </div>
              )}
            />
            <Button
              className="btn btn-primary3 btn-41 ms-3"
              loading={fundusLoading}
              disabled={!fundusTemplateInput}
              onClick={handleFundusUpdateTemplate}
            >
              {" Update "}
            </Button>
          </div>
        )}
      </>
    );
  }, [
    fundusTab,
    fundusTemplateInput,
    fundusLoading,
    fundusAllTemplates,
    handleFundusTabChange,
    handleFundusTemplateInput,
    handleFundusTemplateSelect,
    handleFundusAddTemplate,
    handleFundusUpdateTemplate,
    formatTemplatePreview,
  ]);

  const DELETE_TEMPLATE_MODAL = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={templateDeleteModal.isOpen}
        onCancel={closeTemplateDeleteModal}
        modalWidth={500}
        title={"You may lose your data"}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>Are you sure you want to delete this template?</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={confirmTemplateDelete}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  Yes Delete
                </div>
                <Button
                  onClick={closeTemplateDeleteModal}
                  className="lh-lg btn btn-primary3 btn-41 px-4"
                >
                  <span>No</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    );
  }, [templateDeleteModal, confirmTemplateDelete, closeTemplateDeleteModal]);

  const sectionsContent = (
    <div className={styles.panel}>
      {DELETE_TEMPLATE_MODAL}
      {OPHTHALMOLOGY_SECTIONS.map((section) => (
        <OphthalmologySectionCard
          key={section.id}
          section={section}
          onAction={handleAction}
          getTableProps={getTableProps}
          autofillMenu={autofillMenu}
          extraFieldValues={extraFields}
          onExtraFieldChange={(fieldKey, nextValue) =>
            dispatch(setExtraField({ key: fieldKey, value: nextValue }))
          }
          isCollapsed={!!collapsedSections[section.id]}
          showLoadFromPrev={hasPrevDataBySection[section.id]}
          renderAction={(currentSection, action) => {
            if (currentSection.id === "slitLamp" && action === "Templates") {
              return (
                <Popover
                  key={`${currentSection.id}-${action}`}
                  open={slitLampTemplatesOpen}
                  onOpenChange={setSlitLampTemplatesOpen}
                  content={SLIT_LAMP_TEMPLATE_CONTENT}
                  trigger="click"
                  overlayClassName="pop-350 pp-0"
                  placement="bottom"
                >
                  <button type="button" className={styles.headerAction}>
                    <i className="icon-template"></i>
                    <span>Templates</span>
                  </button>
                </Popover>
              );
            }
            if (currentSection.id === "slitLamp" && action === "Save") {
              return (
                <Tooltip
                  key={`${currentSection.id}-${action}`}
                  placement="bottom"
                  title={
                    slitLampTemplateRows.length > 0
                      ? ""
                      : "Please enter some slit lamp values to save a template"
                  }
                >
                  <Popover
                    open={slitLampSaveOpen}
                    onOpenChange={(open) =>
                      slitLampTemplateRows.length > 0 && handleSlitLampSaveOpen(open)
                    }
                    content={SLIT_LAMP_SAVE_CONTENT}
                    trigger="click"
                    overlayClassName="pop-450 pp-0"
                    placement="bottom"
                  >
                    <button type="button" className={styles.headerAction}>
                      <i className="icon-save"></i>
                      <span>Save</span>
                    </button>
                  </Popover>
                </Tooltip>
              );
            }
            if (currentSection.id === "fundus" && action === "Templates") {
              return (
                <Popover
                  key={`${currentSection.id}-${action}`}
                  open={fundusTemplatesOpen}
                  onOpenChange={setFundusTemplatesOpen}
                  content={FUNDUS_TEMPLATE_CONTENT}
                  trigger="click"
                  overlayClassName="pop-350 pp-0"
                  placement="bottom"
                >
                  <button type="button" className={styles.headerAction}>
                    <i className="icon-template"></i>
                    <span>Templates</span>
                  </button>
                </Popover>
              );
            }
            if (currentSection.id === "fundus" && action === "Save") {
              return (
                <Tooltip
                  key={`${currentSection.id}-${action}`}
                  placement="bottom"
                  title={
                    fundusTemplateRows.length > 0
                      ? ""
                      : "Please enter some fundus values to save a template"
                  }
                >
                  <Popover
                    open={fundusSaveOpen}
                    onOpenChange={(open) =>
                      fundusTemplateRows.length > 0 && handleFundusSaveOpen(open)
                    }
                    content={FUNDUS_SAVE_CONTENT}
                    trigger="click"
                    overlayClassName="pop-450 pp-0"
                    placement="bottom"
                  >
                    <button type="button" className={styles.headerAction}>
                      <i className="icon-save"></i>
                      <span>Save</span>
                    </button>
                  </Popover>
                </Tooltip>
              );
            }
            return null;
          }}
          onToggleCollapse={(sectionId) =>
            setCollapsedSections((prev) => ({
              ...prev,
              [sectionId]: !prev[sectionId],
            }))
          }
          showCollapseToggle={enableSectionCollapse}
        />
      ))}
    </div>
  );

  if (!showHeader) {
    return sectionsContent;
  }

  return (
    <Collapse
      className={styles.panelCollapse}
      activeKey={isExpanded ? ["opthal"] : []}
      expandIcon={() => null}
      showArrow={false}
      items={[
        {
          key: "opthal",
          label: (
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderLeft}>
                <img
                  src={opthalIcon}
                  alt=""
                  className={styles.panelHeaderIcon}
                />
                <div className={styles.panelHeaderTitle}>{headerTitle}</div>
              </div>
              <button
                type="button"
                className={styles.panelHeaderAction}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsExpanded((prev) => !prev);
                }}
              >
                <img
                  src={arrowDownIcon}
                  alt=""
                  className={`${styles.panelHeaderArrow} ${
                    isExpanded ? styles.panelHeaderArrowOpen : ""
                  }`}
                />
              </button>
            </div>
          ),
          children: sectionsContent,
        },
      ]}
    />
  );
};

export default OphthalmologyExamPanel;
