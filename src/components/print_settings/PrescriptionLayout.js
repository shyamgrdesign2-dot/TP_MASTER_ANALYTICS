import React, { useCallback, useContext, useMemo, useState } from "react";
import { Col, Radio, Row, Form, Table, Collapse, Checkbox, Button, Modal, Tooltip } from "antd";

import { MenuOutlined } from "@ant-design/icons";
import { DndContext } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import PrintSettingsContext from "../../context/PrintSettingsContext";
import PageBreakComponent from "./PageBreakComponent";

import { isMobile } from "react-device-detect";
import { useAccess } from "../../pages/vaccination/useAccess";
import { graphsToPrintData } from "../../pages/growthChart/growthChartHelper";
import { getDecodedToken } from "../../utils/localStorage";
import { env } from "../../EnvironmentConfig";
import { INVESTIGATION_PRINT_ID, INVESTIGATION_TITLE } from "../../utils/constants";
// const CustomRow = ({ children, ...props }) => {
//     const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
//         id: props['data-row-key'],
//     });
//     const style = {
//         ...props.style,
//         transform: CSS.Transform.toString(
//             transform && {
//                 ...transform,
//                 scaleY: 1,
//             }
//         ),
//         transition,
//         ...(isDragging ? {
//             position: 'relative',
//             zIndex: 9999,
//         } : {}),
//     };
//     return (
//         <tr {...props} ref={setNodeRef} style={style} {...attributes}>
//             {React.Children.map(children, (child) => {
//                 if (child.key === 'sort') {
//                     return React.cloneElement(child, {
//                         children: (
//                             <MenuOutlined
//                                 ref={setActivatorNodeRef}
//                                 style={{
//                                     touchAction: 'none',
//                                     cursor: 'move',
//                                     display: 'flex',
//                                     justifyContent: 'center',
//                                     alignItems: 'center',
//                                 }}
//                                 {...listeners}
//                             />
//                         ),
//                     });
//                 } else if (child.key === 'enable') {
//                     return React.cloneElement(child, {
//                         style: {
//                             display: 'flex',
//                             justifyContent: 'center',
//                             alignItems: 'center',
//                         },
//                     });
//                 }
//                 return child;
//             })}
//         </tr>
//     );
// };

const RowContext = React.createContext({});
const DragHandle = () => {
  const { setActivatorNodeRef, listeners } = useContext(RowContext);
  return (
    <MenuOutlined
      ref={setActivatorNodeRef}
      style={{
        touchAction: "none",
        cursor: "move",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      {...listeners}
    />
  );
};
const CustomRow = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props["data-row-key"],
  });
  const style = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging
      ? {
        position: "relative",
        zIndex: 9999,
      }
      : {}),
  };
  const contextValue = useMemo(
    () => ({
      setActivatorNodeRef,
      listeners,
    }),
    [setActivatorNodeRef, listeners]
  );
  return (
    <RowContext.Provider value={contextValue}>
      <tr {...props} ref={setNodeRef} style={style} {...attributes} />
    </RowContext.Provider>
  );
};

const checkboxOptions = [
  {
    label: "DOSE",
    value: "dose",
  },
  {
    label: "FREQUENCY",
    value: "frequency", // ✅ Added
  },
  {
    label: "DURATION",
    value: "duration",
  },
  {
    label: "QUANTITY",
    value: "quantity",
  },
  {
    label: "NOTE",
    value: "note",
  },

];

const obsHistoryCheckboxOptions = [
  {
    label: "GPLAE",
    value: "gplae",
  },
  {
    label: "Patient Info",
    value: "diagnosis",
  },
  {
    label: "History",
    value: "history",
  },
  {
    label: "Examination",
    value: "examination",
  },
  {
    label: "ANC Scheduler",
    value: "ancHistory",
  },
  {
    label: "Immunisation History",
    value: "immunisationHistory",
  },
];

const vitalsCheckboxOptions = [
  {
    label: "BMI",
    value: "bmi",
  },
  {
    label: "BMR",
    value: "bmr",
  },
  {
    label: "BSA",
    value: "bsa",
  },
];

const diagnosisCheckboxOptions = [
  {
    label: "ICD Code",
    value: "show_icd_code",
  },
];

function PrescriptionLayout({ todayVaccines, growthChartDetails, obstetricDetails, patientBills }) {
  const contextValue = useContext(PrintSettingsContext);
  const { caseManagerData, printSettings, setPrintSettings, medicalHistoryCheckboxOptions, labParamsData, zydusSelectedLabParams, customModules, carePlanAssignments, ophthalModuleData, smartRxFile, isDigitisedPrintConfig } = contextValue || {};
  const { isVaccinationAccessable, isGrowthChartAccessable, isGynaecHistoryAccessable } = useAccess(
    caseManagerData?.patient_data?.patient_age
  );
  const [showPageBreakerModal, setShowPageBreakerModal] = useState(false);
  const [expandedOphthalmologySections, setExpandedOphthalmologySections] = useState({});
  let tokenData = null;
  try {
    const decodedToken = getDecodedToken();
    tokenData = decodedToken?.result;
  } catch (error) {
    console.warn('Failed to decode token for Zydus check:', error);
    tokenData = null;
  }

  const customModulesMap = new Map(
    customModules?.map((module) => [module.module_id, module.name])
  );

  const customModulesRxData = caseManagerData?.moduleContents?.filter((module) => module.content.length).map((content) => ({
    ...content,
    module_name: customModulesMap.get(content.module_id),
  }))

  const onMainCaseOptionChange = useCallback(
    (e) => {
      const updatedData = printSettings.prescription.case_option.map((x) => {
        if (x.type === "page_break") {
          return x;
        }
        return { ...x, format: e.target.value };
      });

      setPrintSettings((prev) => {
        return {
          ...prev,
          prescription: {
            case_option: updatedData,
          },
        };
      });
    },
    [printSettings]
  );

  if (!caseManagerData || !printSettings) {
    return <div>Loading...</div>;
  }

  const onCaseOptionChange = (record, flag, i) => {
    if (printSettings.prescription.case_option[i]?.type === "page_break") {
      return;
    }
    setPrintSettings((prev) => {
      const caseOption = prev?.prescription?.case_option || [];
      const option = caseOption[i];
      if (!option) return prev;
      const updatedOption = flag === "radio"
        ? { ...option, format: record.target.value }
        : { ...option, enable: record.enable === "Y" ? "N" : "Y" };
      const newCaseOption = [...caseOption];
      newCaseOption[i] = updatedOption;
      return {
        ...prev,
        prescription: {
          ...prev.prescription,
          case_option: newCaseOption,
        },
      };
    });
  };

  const onMedicationWithGenericChange = (e, i) => {
    printSettings.prescription.case_option[i].medicine_with_generic =
      e.target.value;
    setPrintSettings((prev) => {
      return {
        ...prev,
      };
    });
  };

  const onFollowUpWithDateFormat = (e, i) => {
    printSettings.prescription.case_option[i].followup_dateformat =
      e.target.value;
    setPrintSettings((prev) => {
      return {
        ...prev,
      };
    });
  };

  const onMedicationWithNumericFormat = (e, i) => {
    printSettings.prescription.case_option[i].numeric_frequency =
      e.target.value;
    setPrintSettings((prev) => {
      return {
        ...prev,
      };
    });
  };

  const onMedicationWithUnitPerDoseFormat = (e, i) => {
    printSettings.prescription.case_option[i].is_dosage_decimal =
      e.target.value;
    setPrintSettings((prev) => {
      return {
        ...prev,
      };
    });
  };

  const onMedicationOptionChange = (checkedValues, i) => {
    printSettings.prescription.case_option[i].medicine_option = checkedValues;
    setPrintSettings((prev) => {
      return {
        ...prev,
      };
    });
  };

  const onMedicalHistoryOptionChange = (checkedValues, i) => {
    printSettings.prescription.case_option[i].medical_history_option = checkedValues;
    setPrintSettings((prev) => {
      return {
        ...prev,
      };
    });
  };

  const onOphthalmologyOptionChange = (checkedValues, i) => {
    // Update the ophthalmology_option visibility based on checked values
    const currentOption = printSettings.prescription.case_option[i];
    if (currentOption.ophthalmology_option) {
      currentOption.ophthalmology_option = currentOption.ophthalmology_option.map(subSection => {
        const isChecked = checkedValues.includes(subSection.id);
        return {
          ...subSection,
          visible: isChecked
        };
      });
    }
    setPrintSettings((prev) => {
      return {
        ...prev,
      };
    });
  };


  const growthChartOptions = graphsToPrintData
    .map((item) => ({
      label: item.label === "Height Vs Weight" ? "H & W" : item.label,
      value: item?.id === "HeightVsWeight" ? "heightVsWeight" : item.id?.toLowerCase(),
    }));

  const onGrowthChartOptionChange = (checkedValues, i) => {
    setPrintSettings((prev) => {
      prev.prescription.case_option[i].growth_chart_option = checkedValues;
      return {
        ...prev,
      };
    });
  };

  const onObsHistoryOptionChange = (checkedValues, i) => {
    setPrintSettings((prev) => {
      prev.prescription.case_option[i].obs_history_option = checkedValues;
      return {
        ...prev,
      };
    });
  };

  const onVitalsOptionChange = (checkedValues, i) => {
    setPrintSettings((prev) => {
      prev.prescription.case_option[i].vitals_option = checkedValues;
      return {
        ...prev,
      };
    });
  };

  const onDiagnosisOptionChange = (checkedValues, i) => {
    setPrintSettings((prev) => {
      prev.prescription.case_option[i].show_icd_code = checkedValues.includes("show_icd_code");
      return {
        ...prev,
      };
    });
  };

  const diagnosisAccordionItems = (record, i) => [
    {
      key: "1",
      label: (
        <div className="text-start">
          <div className="fw-semibold">Customise Options</div>
          <div className="subtitle-customize">
            Select/deselect the parameters need to be printed
          </div>
        </div>
      ),
      children: (
        <div className="d-flex align-items-center">
          <Checkbox.Group
            style={{ columnGap: "4px" }}
            options={diagnosisCheckboxOptions}
            value={record?.show_icd_code === false ? [] : ["show_icd_code"]}
            onChange={(checkedValues) =>
              onDiagnosisOptionChange(checkedValues, i)
            }
          />
        </div>
      ),
    },
  ];

  const accordionItems = (record, i) => [
    {
      key: "1",
      label: (
        <div className="text-start">
          <div className="fw-semibold">Customise Options</div>
          <div className="subtitle-customize">
            Selected/deselect medication columns need to be printed
          </div>
        </div>
      ),
      children: (
        <>
          <div className="fw-medium text-start py-2">MEDICINE</div>
          <div className="d-flex align-items-center text-start">
            <Radio.Group
              value={record?.medicine_with_generic}
              onChange={(e) => onMedicationWithGenericChange(e, i)}
            >
              <Radio className="mb-2" value={true}>
                Medicine with Generic Name
              </Radio>
              <Radio value={false}>Only Medicine Name</Radio>
            </Radio.Group>
          </div>
          <hr />
          <div className="fw-medium text-start py-2">FREQUENCY FORMAT</div>
          <div className="d-flex align-items-center text-start">
            <Radio.Group
              value={record?.numeric_frequency}
              onChange={(e) => onMedicationWithNumericFormat(e, i)}
            >
              <Radio className="mb-2" value={true}>
                Numeric format (e.g., 1-0-0)
              </Radio>
              <Radio value={false}>Text format (e.g., Morning)</Radio>
            </Radio.Group>
          </div>
          <hr />
          <div className="fw-medium text-start py-2">UNIT PER DOSE</div>
          <div className="d-flex align-items-center text-start">
            <Radio.Group
              value={!!record?.is_dosage_decimal}
              onChange={(e) => onMedicationWithUnitPerDoseFormat(e, i)}
            >
              <Radio className="mb-2" value={false}>
                Fractional (e.g., ½ tablet)
              </Radio>
              <Radio value={true}>Decimal (e.g., 0.5 tablet)</Radio>
            </Radio.Group>
          </div>
          <hr />
          <div className="d-flex align-items-center">
            <Checkbox.Group
              options={checkboxOptions}
              value={record?.medicine_option}
              onChange={(checkedValues) =>
                onMedicationOptionChange(checkedValues, i)
              }
            />
          </div>
          <div className="subtitle-customize text-start mt-3">
            <span>Note:</span> The printed information will always include the
            name of the medicine (brand or generic). and the frequency.
          </div>
        </>
      ),
    },
  ];

   const vitalsAccordionItems = (record, i) => [
     {
       key: "1",
       label: (
         <div className="text-start">
           <div className="fw-semibold">Customise Options</div>
           <div className="subtitle-customize">
             Select/deselect the parameters need to be printed
           </div>
         </div>
       ),
       children: (
         <div className="d-flex align-items-center">
           <Checkbox.Group
             style={{ columnGap: "4px" }}
             options={vitalsCheckboxOptions}
             value={record?.vitals_option ? record?.vitals_option : ["bmi", "bmr", "bsa"]}
             onChange={(checkedValues) =>
               onVitalsOptionChange(checkedValues, i)
             }
           />
         </div>
       ),
     },
   ];

  const accordionItemsFollowUp = (record, i) => [
    {
      key: "1",
      label: (
        <div className="text-start">
          <div className="fw-semibold">Customise Options</div>
          <div className="subtitle-customize">
            Select the parameters to be displayed
          </div>
        </div>
      ),
      children: (
        <>
          <div className="fw-medium text-start py-2">FOLLOW UP FORMAT</div>
          <div className="d-flex align-items-center text-start">
            <Radio.Group
              value={record?.followup_dateformat}
              onChange={(e) => onFollowUpWithDateFormat(e, i)}
            >
              <Radio className="mb-2" value={true}>Date format (e.g., 24/12/2024)</Radio>
              <Radio value={false}>Duration format (e.g., 2 days/weeks/months)</Radio>
            </Radio.Group>
          </div>
        </>
      ),
    },
  ];

  const medicalHistoryAccordionItems = (record, i) => [
    {
      key: "1",
      label: (
        <div className="text-start">
          <div className="fw-semibold">Customise Options</div>
          <div className="subtitle-customize">
            Selected/deselect medical history need to be printed
          </div>
        </div>
      ),
      children: (
        <>
          <div className="d-flex align-items-center pt-2">
            <Checkbox.Group
              options={medicalHistoryCheckboxOptions}
              value={record?.medical_history_option}
              onChange={(checkedValues) =>
                onMedicalHistoryOptionChange(checkedValues, i)
              }
            />
          </div>
        </>
      ),
    },
  ];
  
  const ophthalmologyAccordionItems = (record, i) => {
    const toggleSection = (sectionId) => {
      const key = `${i}_${sectionId}`;
      setExpandedOphthalmologySections(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    };

    const handleMainSectionChange = (sectionId, checked) => {
      const currentOption = printSettings.prescription.case_option[i];
      if (currentOption.ophthalmology_option) {
        const section = currentOption.ophthalmology_option.find(sub => sub.id === sectionId);
        if (section) {
          section.visible = checked;
          // If section has subSections, update all subSections visibility
          if (section.subSections && Array.isArray(section.subSections)) {
            section.subSections.forEach(subSub => {
              subSub.visible = checked;
            });
          }
        }
      }
      setPrintSettings((prev) => ({ ...prev }));
    };

    const handleSubSectionChange = (sectionId, subSectionId, checked) => {
      const currentOption = printSettings.prescription.case_option[i];
      if (currentOption.ophthalmology_option) {
        const section = currentOption.ophthalmology_option.find(sub => sub.id === sectionId);
        if (section && section.subSections) {
          const subSection = section.subSections.find(subSub => subSub.id === subSectionId);
          if (subSection) {
            subSection.visible = checked;
            // Update parent section visibility based on sub-sections
            const allSubSectionsVisible = section.subSections.every(subSub => subSub.visible !== false);
            section.visible = allSubSectionsVisible;
          }
        }
      }
      setPrintSettings((prev) => ({ ...prev }));
    };

    const isSectionVisible = (section) => {
      return section.visible !== false;
    };

    const isSubSectionVisible = (subSection) => {
      return subSection.visible !== false;
    };

    // return [
    //   {
    //     key: "1",
    //     label: (
    //       <div className="text-start">
    //         <div className="fw-semibold">Customise Options</div>
    //         <div className="subtitle-customize">
    //           Select/deselect ophthalmology sections to be printed
    //         </div>
    //       </div>
    //     ),
    //     // children: (
    //     //   <>
    //     //     <div className="pt-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    //     //       {record?.ophthalmology_option?.map((section) => {
    //     //         const hasSubSections = section.subSections && Array.isArray(section.subSections) && section.subSections.length > 0;
    //     //         const key = `${i}_${section.id}`;
    //     //         const isExpanded = expandedOphthalmologySections[key];
    //     //         const isChecked = isSectionVisible(section);

    //     //         return (
    //     //           <div key={section.id} style={{ display: 'flex', flexDirection: 'column' }}>
    //     //             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    //     //               <Checkbox
    //     //                 checked={isChecked}
    //     //                 onChange={(e) => handleMainSectionChange(section.id, e.target.checked)}
    //     //               >
    //     //                 <span style={{ fontWeight: 500 }}>{section.label}</span>
    //     //               </Checkbox>
    //     //               {hasSubSections && (
    //     //                 <span
    //     //                   onClick={() => toggleSection(section.id)}
    //     //                   style={{
    //     //                     cursor: 'pointer',
    //     //                     marginLeft: 'auto',
    //     //                     fontSize: '12px',
    //     //                     color: '#6B7280',
    //     //                     transition: 'transform 0.2s',
    //     //                     display: 'inline-flex',
    //     //                     alignItems: 'center'
    //     //                   }}
    //     //                 >
    //     //                   <i 
    //     //                     className={`icon-right ${isExpanded ? 'iconrotate270' : 'iconrotatehistory90'}`}
    //     //                     style={{ 
    //     //                       fontSize: '12px',
    //     //                       transition: 'transform 0.3s ease'
    //     //                     }}
    //     //                   ></i>
    //     //                 </span>
    //     //               )}
    //     //             </div>
    //     //             {hasSubSections && isExpanded && (
    //     //               <div style={{ marginLeft: '24px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
    //     //                 {section.subSections.map((subSection) => (
    //     //                   <Checkbox
    //     //                     key={subSection.id}
    //     //                     checked={isSubSectionVisible(subSection)}
    //     //                     onChange={(e) => handleSubSectionChange(section.id, subSection.id, e.target.checked)}
    //     //                   >
    //     //                     <span style={{ fontSize: '14px' }}>{subSection.label}</span>
    //     //                   </Checkbox>
    //     //                 ))}
    //     //               </div>
    //     //             )}
    //     //           </div>
    //     //         );
    //     //       })}
    //     //     </div>
    //     //   </>
    //     // ),
    //   },
    // ];
  };

  const growthChartAccordionItems = (record, i) => [
    {
      key: "1",
      label: (
        <div className="text-start">
          <div className="fw-semibold">Customise Options</div>
          <div className="subtitle-customize">
            Select/deselect the parameters need to be printed
          </div>
        </div>
      ),
      children: (
        <div
          className="d-flex align-items-center"
          style={{ paddingTop: "12px" }}
        >
          <Checkbox.Group
            options={growthChartOptions
              .filter(({ value }) => printSettings?.prescription?.case_option?.[i]?.format === "table" ? value !== "heightVsWeight" : growthChartDetails?.growthChartImageData?.[value])}
            defaultValue={record?.growth_chart_option}
            onChange={(checkedValues) => onGrowthChartOptionChange(checkedValues, i)}
          />
        </div>
      ),
    },
  ];

  const obsHistoryAccordionItems = (record, i) => [
    {
      key: "1",
      label: (
        <div className="text-start">
          <div className="fw-semibold">Customise Options</div>
          <div className="subtitle-customize">
            Select/deselect the parameters need to be printed
          </div>
        </div>
      ),
      children: (
        <div className="d-flex align-items-center">
          <Checkbox.Group
            style={{ columnGap: "4px" }}
            options={obsHistoryCheckboxOptions}
            value={record?.obs_history_option}
            onChange={(checkedValues) =>
              onObsHistoryOptionChange(checkedValues, i)
            }
          />
        </div>
      ),
    },
  ];

  //Display Patient Info
  const caseOptionTable = [
    {
      key: "sort",
      // colSpan: 2,
      align: "center",
      dataIndex: "sort",
      width: 40,
      render: () => <DragHandle />,
    },
    {
      // colSpan: 0,
      dataIndex: "title",
      key: "title",
      render: (text, record, i) => {
        if (record.type === "page_break") {
          return (
            <div className="d-flex align-items-center justify-content-between text-start">
              <div className="d-flex align-items-center" style={{ width: '100%', justifyContent: "space-around" }}>
                <PageBreakComponent onRemove={() => removePageBreak(record.id)} />
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<i className="icon-delete" style={{ color: "#FC5A5A" }}></i>}
                  onClick={() => removePageBreak(record.id)}
                  style={{
                    fontSize: '12px',
                    color: '#ff4d4f',
                    border: 'none',
                    boxShadow: 'none'
                  }}
                />
              </div>
            </div>
          );
        }

        // Handle Ophthalmology option with sub-sections
        if (record.id === 20 && record.ophthalmology_option) {
          const recordIndex = printSettings?.prescription?.case_option?.findIndex(x => x.id === record.id);
          const expandKey = `ophth_${record.id}`;
          const isExpanded = expandedOphthalmologySections[expandKey];

          return (
            <>
              <div className="d-flex align-items-center justify-content-between text-start ophthal-option-row">
                <div className="d-flex align-items-center ophthal-option-title">
                  <div
                    className="d-flex align-items-center cursor-pointer Preview-color-icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onCaseOptionChange(record, "visible", recordIndex);
                    }}
                  >
                    <i
                      className={`icon-Preview ${record.enable === "N" && "disable-preview"
                        } me-1`}
                    ></i>
                    <span className="ophthal-option-text">{record.title}</span>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2 ophthal-option-actions">
                <Form.Item className="mb-0 form_addnewpatient ">
                  <Radio.Group
                    className={`d-flex gender-radio all-change-radio ${isMobile ? "segmented-radio-mobile" : ""
                      }`}
                    onChange={(e) => onCaseOptionChange(e, "radio", printSettings?.prescription?.case_option?.findIndex(x => x.id === record.id))}
                    value={record.format}
                  >
                    <Radio.Button className="w-100 text-center" value="inline" disabled={record?.id === 17}>
                      {record?.id === 12 ? "Graph View" : "Inline"}
                    </Radio.Button>
                    {record?.id !== 12 &&
                      <Radio.Button className="w-100 text-center" value="listview" disabled={record?.id === 17}>
                        List View
                      </Radio.Button>
                    }
                    <Radio.Button className="w-100 text-center" value="table" disabled={record?.id === 17}>
                      Table
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>
                <span
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setExpandedOphthalmologySections(prev => ({
                        ...prev,
                        [expandKey]: !prev[expandKey]
                      }));
                    }}
                    style={{
                      cursor: 'pointer',
                      // marginRight: '8px',
                      fontSize: '18px',
                      color: '#6B7280',
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px'
                    }}
                  >
                    <i 
                      className={`icon-right ${isExpanded ? 'iconrotate270' : 'iconrotatehistory90'}`}
                      style={{ 
                        fontSize: '18px',
                        transition: 'transform 0.3s ease'
                      }}
                    ></i>
                  </span>
              </div>
            </div>
            {isExpanded && (
              <div style={{ marginLeft: '-25px', marginTop: '8px' }}>
                <DndContext 
                  modifiers={[restrictToVerticalAxis]} 
                  onDragEnd={(e) => onDragEndOphthalmologySubSections(e, recordIndex)}
                >
                  <SortableContext
                    items={record.ophthalmology_option?.map((i) => i.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                  {record.ophthalmology_option?.map((section) => {
                    const SortableSubSectionRow = ({ section }) => {
                      const {
                        attributes,
                        listeners,
                        setNodeRef,
                        setActivatorNodeRef,
                        transform,
                        transition,
                        isDragging,
                      } = useSortable({
                        id: section.id,
                      });
                      
                      const style = {
                        transform: CSS.Translate.toString(transform),
                        transition,
                        ...(isDragging ? {
                          position: "relative",
                          zIndex: 9999,
                          opacity: 0.5,
                        } : {}),
                      };

                      return (
                        <div 
                          ref={setNodeRef} 
                          style={{ ...style, marginBottom: '4px' }}
                          {...attributes}
                        >
                            <div className="d-flex align-items-center justify-content-between text-start ophthal-option-row" style={{ padding: '8px 0' }}>
                              <div className="d-flex align-items-center ophthal-option-title">
                                <div 
                                  style={{ 
                                    width: '40px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    minWidth: '40px',
                                    flexShrink: 0,
                                    height: '100%',
                                    position: 'relative',
                                    top:"-30px",
                                  }}
                                >
                                  <MenuOutlined
                                    ref={setActivatorNodeRef}
                                    {...listeners}
                                    style={{
                                      touchAction: "none",
                                      cursor: "move",
                                      color: '#8c8c8c',
                                      fontSize: '16px',
                                      display: 'inline-flex !important',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      opacity: '1 !important',
                                      visibility: 'visible !important',
                                      pointerEvents: 'auto',
                                      userSelect: 'none',
                                      WebkitUserSelect: 'none',
                                      width: '16px',
                                      height: '16px'
                                    }}
                                  />
                                </div>
                                <div
                                  className="d-flex align-items-center cursor-pointer Preview-color-icon"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const currentOption = printSettings.prescription.case_option[recordIndex];
                                    if (currentOption.ophthalmology_option) {
                                      const sectionOption = currentOption.ophthalmology_option.find(sub => sub.id === section.id);
                                      if (sectionOption) {
                                        sectionOption.visible = sectionOption.visible === false ? true : false;
                                        setPrintSettings((prev) => ({ ...prev }));
                                      }
                                    }
                                  }}
                                >
                                  <i
                                    className={`icon-Preview ${section.visible === false && "disable-preview"} me-3`}
                                  ></i>
                                  <span className="ophthal-option-text">{section.label}</span>
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-2 ophthal-option-actions">
                                <Form.Item className="mb-0 form_addnewpatient">
                                  <Radio.Group
                                    className={`d-flex gender-radio all-change-radio ${isMobile ? "segmented-radio-mobile" : ""}`}
                                    onChange={(e) => {
                                      const currentOption = printSettings.prescription.case_option[recordIndex];
                                      if (currentOption.ophthalmology_option) {
                                        const sectionOption = currentOption.ophthalmology_option.find(sub => sub.id === section.id);
                                        if (sectionOption) {
                                          sectionOption.view = e.target.value === "inline" ? 1 : e.target.value === "listview" ? 2 : 3;
                                          setPrintSettings((prev) => ({ ...prev }));
                                        }
                                      }
                                    }}
                                    value={section.view === 1 ? "inline" : section.view === 2 ? "listview" : "table"}
                                  >
                                    <Radio.Button className="w-100 text-center" value="inline">Inline</Radio.Button>
                                    <Radio.Button className="w-100 text-center" value="listview">List View</Radio.Button>
                                    <Radio.Button className="w-100 text-center" value="table">Table</Radio.Button>
                                  </Radio.Group>
                                </Form.Item>
                              </div>
                            </div>
                          </div>
                        );
                      };

                      return <SortableSubSectionRow key={section.id} section={section} />;
                    })}
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </>
          );
        }

        return (
          <>
            <div className="d-flex align-items-center justify-content-between text-start">
              <div
                className="d-flex align-items-center cursor-pointer Preview-color-icon"
                onClick={() => onCaseOptionChange(record, "visible", printSettings?.prescription?.case_option?.findIndex(x => x.id === record.id))}
              >
                <i
                  className={`icon-Preview ${record.enable === "N" && "disable-preview"
                    } me-3`}
                ></i>
                <span style={{ wordBreak: "break-word" }}>{record?.id === 11 && caseManagerData?.smart_prescription_filename?.includes("tab_rx") ? "Tab Rx" : record?.id === INVESTIGATION_PRINT_ID ? INVESTIGATION_TITLE : record.title}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Form.Item className="mb-0 form_addnewpatient ">
                  <Radio.Group
                    className={`d-flex gender-radio all-change-radio ${isMobile ? "segmented-radio-mobile" : ""
                      }`}
                    onChange={(e) => onCaseOptionChange(e, "radio", printSettings?.prescription?.case_option?.findIndex(x => x.id === record.id))}
                    value={record.format}
                  >
                    <Radio.Button className="w-100 text-center" value="inline" disabled={record?.id === 17}>
                      {record?.id === 12 ? "Graph View" : "Inline"}
                    </Radio.Button>
                    {record?.id !== 12 &&
                      <Radio.Button className="w-100 text-center" value="listview" disabled={record?.id === 17}>
                        List View
                      </Radio.Button>
                    }
                    <Radio.Button className="w-100 text-center" value="table" disabled={record?.id === 17}>
                      Table
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </div>
            </div>
          {record.id === 3 && (
            <div style={{ marginLeft: -40, display: "flex" }}>
              <div style={{ flex: 1 }}>
                <div className="border mt-3 rounded-4 p-3 bg-white ">
                  <Collapse
                    items={diagnosisAccordionItems(record, printSettings?.prescription?.case_option?.findIndex(x => x.id === record.id))}
                    defaultActiveKey={["1"]}
                    className="prescriptiontab-accordian"
                    expandIconPosition={"end"}
                  />
                </div>
              </div>
            </div>
          )}
          {record.id === 4 && (
            <div style={{ marginLeft: -40, display: "flex" }}>
              <div style={{ flex: 1 }}>
                <div className="border mt-3 rounded-4 p-3 bg-white ">
                  <Collapse
                    items={accordionItems(record, printSettings?.prescription?.case_option?.findIndex(x => x.id === record.id))}
                    defaultActiveKey={["1"]}
                    className="prescriptiontab-accordian"
                    expandIconPosition={"end"}
                  />
                </div>
              </div>
            </div>
          )}
          {record.id === 9 && (
            <div style={{ marginLeft: -40, display: "flex" }}>
              <div style={{ flex: 1 }}>
                <div className="border mt-3 rounded-4 p-3 bg-white ">
                  <Collapse
                    items={accordionItemsFollowUp(record, printSettings?.prescription?.case_option?.findIndex(x => x.id === record.id))}
                    defaultActiveKey={["1"]}
                    className="prescriptiontab-accordian"
                    expandIconPosition={"end"}
                  />
                </div>
              </div>
            </div>
          )}
          {record.id === 7 && (
            <div style={{ marginLeft: -40, display: "flex" }}>
              <div style={{ flex: 1 }}>
                <div className="border mt-3 rounded-4 p-3 bg-white ">
                  <Collapse
                    items={vitalsAccordionItems(record, printSettings?.prescription?.case_option?.findIndex(x => x.id === record.id))}
                    defaultActiveKey={["1"]}
                    className="prescriptiontab-accordian"
                    expandIconPosition={"end"}
                  />
                </div>
              </div>
            </div>
          )}
          {record.id === 8 && (
            <div style={{ marginLeft: -40, display: "flex" }}>
              <div style={{ flex: 1 }}>
                <div className="border mt-3 rounded-4 p-3 bg-white ">
                  <Collapse
                    items={medicalHistoryAccordionItems(record, printSettings?.prescription?.case_option?.findIndex(x => x.id === record.id))}
                    defaultActiveKey={["1"]}
                    className="prescriptiontab-accordian"
                    expandIconPosition={"end"}
                  />
                </div>
              </div>
            </div>
          )}
          {record.id === 12 && (
            <div style={{ marginLeft: -40, display: "flex" }}>
              <div style={{ flex: 1 }}>
                <div className="border mt-3 rounded-4 p-3 bg-white ">
                  <Collapse
                    items={growthChartAccordionItems(record, printSettings?.prescription?.case_option?.findIndex(x => x.id === record.id))}
                    defaultActiveKey={["1"]}
                    className="prescriptiontab-accordian"
                    expandIconPosition={"end"}
                  />
                </div>
              </div>
            </div>
          )}
          {record.id === 14 && (
            <div style={{ marginLeft: -40, display: "flex" }}>
              <div style={{ flex: 1 }}>
                <div className="border mt-3 rounded-4 p-3 bg-white ">
                  <Collapse
                    items={obsHistoryAccordionItems(record, printSettings?.prescription?.case_option?.findIndex(x => x.id === record.id))}
                    defaultActiveKey={["1"]}
                    className="prescriptiontab-accordian"
                    expandIconPosition={"end"}
                  />
                </div>
              </div>
            </div>
          )}
          </>
        );
      },
    },
  ];

  const onDragEndCaseOption = ({ active, over }) => {
    if (active.id !== over?.id) {
      setPrintSettings((prev) => {
        const activeIndex = prev.prescription.case_option.findIndex((i) => i.id === active.id);
        const overIndex = prev.prescription.case_option.findIndex((i) => i.id === over?.id);
        if (activeIndex === -1 || overIndex === -1) {
          console.warn('Invalid drag operation: activeIndex or overIndex not found');
          return prev;
        }
        return {
          ...prev,
          prescription: {
            case_option: arrayMove(prev.prescription.case_option, activeIndex, overIndex)
          }
        };
      });
    }
  };

  const onDragEndOphthalmologySubSections = ({ active, over }, recordIndex) => {
    if (active.id !== over?.id) {
      setPrintSettings((prev) => {
        const currentOption = prev.prescription.case_option[recordIndex];
        if (!currentOption || !currentOption.ophthalmology_option) {
          return prev;
        }
        
        const activeIndex = currentOption.ophthalmology_option.findIndex((i) => i.id === active.id);
        const overIndex = currentOption.ophthalmology_option.findIndex((i) => i.id === over?.id);
        
        if (activeIndex === -1 || overIndex === -1) {
          console.warn('Invalid drag operation: activeIndex or overIndex not found for ophthalmology sub-sections');
          return prev;
        }
        
        const newOphthalmologyOption = arrayMove(currentOption.ophthalmology_option, activeIndex, overIndex);
        
        return {
          ...prev,
          prescription: {
            ...prev.prescription,
            case_option: prev.prescription.case_option.map((option, index) => 
              index === recordIndex 
                ? { ...option, ophthalmology_option: newOphthalmologyOption }
                : option
            )
          }
        };
      });
    }
  };

  const addPageBreak = (index) => {
    setPrintSettings((prev) => {
      const newCaseOption = [...prev.prescription.case_option];
      const existingPageBreaks = newCaseOption.filter(item => item.type === "page_break");
      if (existingPageBreaks.length >= 10) {
        console.warn('Maximum page breaks limit reached (10)');
        return prev;
      }
      const pageBreakItem = {
        id: `page_break_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        title: "Page Breaker",
        type: "page_break",
        enable: "Y",
        format: "page_break"
      };
      newCaseOption.push(pageBreakItem);
      return {
        ...prev,
        prescription: {
          case_option: newCaseOption
        }
      };
    });
    setShowPageBreakerModal(true);
  };

  const confirmAddPageBreak = () => {
    setShowPageBreakerModal(false);
  };

  const removePageBreak = (pageBreakId) => {
    setPrintSettings((prev) => {
      const newCaseOption = prev.prescription.case_option.filter(item => item.id !== pageBreakId);
      return {
        ...prev,
        prescription: {
          case_option: newCaseOption
        }
      };
    });
  };

  return (
    <div className="px-3">
      <div className="titleprint mb-3">Format Style</div>
      <Row justify="space-between" className="align-items-center form_addnewpatient mb-3">
        <Col>
          All Change to
        </Col>
        <Col className={`${isMobile ? 'radio-width-static' : 'radio-width-static-web'}`}>
          <Form.Item className="mb-0">
            <Radio.Group className={`d-flex gender-radio all-change-radio ${isMobile ? 'segmented-radio-mobile' : ''}`} onChange={onMainCaseOptionChange}
              value={
                printSettings?.prescription?.case_option.every(e => e.format === 'inline') ? 'inline'
                  : printSettings?.prescription?.case_option.every(e => e.format === 'listview') ? 'listview'
                    : printSettings?.prescription?.case_option.every(e => e.format === 'table') ? 'table'
                      : null}>
              <Radio.Button className="w-100 text-center" value="inline">Inline</Radio.Button>
              <Radio.Button className="w-100 text-center" value="listview">List View</Radio.Button>
              <Radio.Button className="w-100 text-center" value="table">Table</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Col>
      </Row>
      {printSettings?.prescription?.case_option?.length > 0 && (
        <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEndCaseOption}>
          <SortableContext
            // rowKey array
            items={printSettings?.prescription?.case_option?.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <Table
              className={`customize-table customize-table-format table-display-patient dragicon-position ${isMobile ? 'radio-width-static' : 'radio-width-static-web'}`}
              pagination={false}
              components={{
                body: {
                  row: CustomRow,
                },
              }}
              rowKey="id"
              columns={caseOptionTable}
              // dataSource={printSettings?.prescription?.case_option.map((e) => ({ ...e, key: e.id }))}
              dataSource={(() => {
                const filtered = printSettings?.prescription?.case_option?.filter((option, index) => {
                  if (option.type === "page_break") {
                    return tokenData?.hospital_business_id == env.zydus_business_id;
                  }
                  // Show vaccination (id 10) when module vaccines OR prescription vaccines exist – same condition as symptoms
                  if (option.id === 10) {
                    const hasModuleVaccines = isVaccinationAccessable && (todayVaccines?.given?.length || todayVaccines?.due?.length);
                    const hasPrescriptionVaccines = caseManagerData?.vaccinations?.length > 0;
                    return hasModuleVaccines || hasPrescriptionVaccines;
                  }
                  return (caseManagerData.symptoms.length > 0 && option.id === 1) ||
                    (caseManagerData.examination.length > 0 && option.id === 2) ||
                    (caseManagerData.diagnosis.length > 0 && option.id === 3) ||
                    (caseManagerData.medicine.length > 0 && option.id === 4) ||
                    (caseManagerData.advice.length > 0 && option.id === 5) ||
                    (caseManagerData.investigation.length > 0 && option.id === 6) ||
                    ((caseManagerData.vitals.length > 0 || caseManagerData?.patient_birth_weight) && option.id === 7) ||
                    (caseManagerData.medical_history.length > 0 && option.id === 8) ||
                    (caseManagerData.follow_up_date && option.id === 9) ||
                    (caseManagerData.visit_advice && option.id === 91) ||
                    (!isDigitisedPrintConfig && (caseManagerData?.smart_prescription_filename?.length || (smartRxFile && smartRxFile.length > 0)) && option.id === 11) ||
                    (isGrowthChartAccessable && option.id === 12 && growthChartDetails?.growthChartImageData && Object.keys(growthChartDetails?.growthChartImageData)?.length > 0 && growthChartDetails?.todayGrowthChartData?.length > 0) ||
                    (caseManagerData.gynecHistoryData && isGynaecHistoryAccessable && option.id === 13) ||
                    (option.id === 14 && isGynaecHistoryAccessable && obstetricDetails?.id) ||
                    ((caseManagerData?.labParamsData?.length > 0 || (labParamsData && labParamsData.length > 0)) && option.id === 15) ||
                    (caseManagerData?.surgeries?.length > 0 && option.id === 16) ||
                    (zydusSelectedLabParams?.length > 0 && option.id === 18) ||
                    (option.is_custom_module === true && customModulesRxData?.find((e) => e?.module_id === option?.id)?.content?.length > 0) ||
                    (patientBills?.length > 0 && option.id === 17) ||
                    ((option.id === 19) && (Array.isArray(carePlanAssignments) ? carePlanAssignments.length > 0 : false)) ||
                    (option.id === 20 && ophthalModuleData && Object.keys(ophthalModuleData).length > 0)
                }).map(option => ({ ...option, key: option.id }));
                return filtered;
              })()}
              showHeader={false}
            />
          </SortableContext>
        </DndContext>
      )}
      <div style={{ margin: '16px 16px 40px 16px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <div
            onClick={() => addPageBreak(printSettings?.prescription?.case_option?.length - 1)}
            style={{ 
              fontSize: '14px',
              height: '40px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            className="add-page-break"
          >
            + <span className="add-page-break" style={{ marginLeft: '5px', textDecoration: 'underline' }}>Add Page Break</span>
          </div>
          
          <Tooltip 
            title={
              <div style={{ padding: '8px 4px' }}>
                <div style={{ fontWeight: '400', fontSize: '14px', lineHeight: '1.4', textAlign:'justify' }}>
                  Page Break lets you control where the content starts on a new page in the printed or PDF output. Move it anywhere in the Format Style list and all sections placed below the Page Breaker will begin on the next page.
                </div>
              </div>
            }
            placement="top"
            overlayStyle={{ maxWidth: '300px' }}
            overlayClassName="page-break-tooltip"
          >
            <i 
              className="icon-info" 
              style={{ 
                cursor: 'pointer',
                color: '#6B7280',
                fontSize: '16px',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#4B5563'}
              onMouseLeave={(e) => e.target.style.color = '#6B7280'}
            />
          </Tooltip>
        </div>
      </div>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Page Breaker</span>
            <span className="new-btn">
              New
            </span>
          </div>
        }
        open={showPageBreakerModal}
        onCancel={() => setShowPageBreakerModal(false)}
        footer={[
          <Button
            key="okay"
            type="primary"
            onClick={confirmAddPageBreak}
            style={{
              backgroundColor: '#000',
              borderColor: '#000',
              width: '100%',
              height: '39px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Okey
          </Button>
        ]}
        width={360}
        centered
        closable={false}
        style={{ height: '443px' }}
      >
        <div>
          <p style={{ fontSize: '14px', lineHeight: '1.5', color: '#666' }}>
            Hold and drag anywhere in the format Style list and all sections placed below the Page Breaker will begin on the next page.
            <br/><br/>
            <span style={{fontSize: "12px", fontWeight: '600'}}>Note:</span> Page breaks at the end of the list won't create blank pages.
          </p>
          <div style={{ maxHeight: '254px', padding: '0 16px', backgroundColor:'#F1F1F5', borderRadius: '14px', overflowY: 'auto' }}>
            {(() => {
              const hasVaccinationData = (isVaccinationAccessable && (todayVaccines?.given?.length || todayVaccines?.due?.length)) || (caseManagerData?.vaccinations?.length > 0);
              const filteredItems = printSettings?.prescription?.case_option?.filter(option => {
                if (option.id === 91) return false;
                return (
                  option.type === "page_break" ||
                  (caseManagerData?.symptoms?.length > 0 && option.id === 1) ||
                  (caseManagerData?.examination?.length > 0 && option.id === 2) ||
                  (caseManagerData?.diagnosis?.length > 0 && option.id === 3) ||
                  (caseManagerData?.medicine?.length > 0 && option.id === 4) ||
                  (caseManagerData?.advice?.length > 0 && option.id === 5) ||
                  (caseManagerData?.investigation?.length > 0 && option.id === 6) ||
                  ((caseManagerData?.vitals?.length > 0 || caseManagerData?.patient_birth_weight) && option.id === 7) ||
                  (caseManagerData?.medical_history?.length > 0 && option.id === 8) ||
                  (caseManagerData?.follow_up_date && option.id === 9) ||
                  (hasVaccinationData && option.id === 10) ||
                  (!isDigitisedPrintConfig && (caseManagerData?.smart_prescription_filename?.length || (smartRxFile && smartRxFile.length > 0)) && option.id === 11) ||
                  (isGrowthChartAccessable && option.id === 12 && growthChartDetails?.growthChartImageData && Object.keys(growthChartDetails?.growthChartImageData)?.length > 0 && growthChartDetails?.todayGrowthChartData?.length > 0) ||
                  (caseManagerData?.gynecHistoryData && isGynaecHistoryAccessable && option.id === 13) ||
                  (option.id === 14 && isGynaecHistoryAccessable && obstetricDetails?.id) ||
                  ((caseManagerData?.labParamsData?.length > 0 || (labParamsData && labParamsData.length > 0)) && option.id === 15) ||
                  (caseManagerData?.surgeries?.length > 0 && option.id === 16) ||
                  (zydusSelectedLabParams?.length > 0 && option.id === 18) ||
                  (option.is_custom_module === true && customModulesRxData?.find((e) => e?.module_id === option?.id)?.content?.length > 0) ||
                  (patientBills?.length > 0 && option.id === 17) ||
                  (option.id === 20 && ((ophthalModuleData && Object.keys(ophthalModuleData).length > 0) || true))
                );
              }) || [];

              return (
                <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEndCaseOption}>
                  <SortableContext
                    items={filteredItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredItems.map((option, index) => (
                   <div key={option.id} style={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     padding: '12px 0',
                     borderBottom: '1px solid #E2E2EA'
                   }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginRight: '12px',
                      cursor: 'grab',
                      color: '#8c8c8c'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '2px',
                        fontSize: '12px'
                      }}>
                        <div style={{ width: '12px', height: '1px', backgroundColor: '#8c8c8c' }}></div>
                        <div style={{ width: '12px', height: '1px', backgroundColor: '#8c8c8c' }}></div>
                        <div style={{ width: '12px', height: '1px', backgroundColor: '#8c8c8c' }}></div>
                      </div>
                    </div>
                    {option.type !== "page_break" && (
                      <div 
                        style={{ 
                          marginRight: '12px',
                          cursor: 'pointer'
                        }}
                        onClick={() => onCaseOptionChange(option, "visible", printSettings?.prescription?.case_option?.findIndex(x => x.id === option.id))}
                      >
                          <i 
                            className={`icon-Preview ${option.enable === 'N' && 'disable-preview'}`} 
                            style={{ 
                              fontSize: '16px', 
                              color: option.enable === 'N' ? '#d9d9d9' : '#4B4AD5',
                              lineHeight: 'unset'
                            }}
                          ></i>
                      </div>
                    )}
                    <div style={{ 
                      flex: 1, 
                      marginRight: '12px',
                      minWidth: 0,
                      overflow: 'hidden'
                    }}>
                      {option.type === "page_break" ? (
                        <div style={{
                          borderRadius: '6px',
                          textAlign: 'center',
                          color: '#8c8c8c',
                          fontSize: '9px'
                        }}>
                          ---------- Page Breaker ----------
                        </div>
                      ) : (
                        <span style={{ 
                          fontSize: '9px', 
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                          width: '100%'
                        }}>
                          {option?.id === INVESTIGATION_PRINT_ID ? INVESTIGATION_TITLE : option.title}
                        </span>
                      )}
                    </div>
                    {option.type !== "page_break" && (
                      <div style={{ 
                        marginRight: '12px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <Radio.Group 
                          size="small" 
                          value={option.format || 'inline'}
                          onChange={(e) => onCaseOptionChange(e, 'radio', printSettings?.prescription?.case_option?.findIndex(x => x.id === option.id))}
                          style={{ display: 'flex', alignItems: 'center' }}
                        >
                          <Radio.Button value="inline" style={{ 
                            fontSize: '9px', 
                            padding: '2px 8px',
                            height: '24px',
                            lineHeight: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>Inline</Radio.Button>
                          <Radio.Button value="listview" style={{ 
                            fontSize: '9px', 
                            padding: '2px 8px',
                            height: '24px',
                            lineHeight: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>List View</Radio.Button>
                          <Radio.Button value="table" style={{ 
                            fontSize: '9px', 
                            padding: '2px 8px',
                            height: '24px',
                            lineHeight: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>Table</Radio.Button>
                        </Radio.Group>
                      </div>
                    )}
                    {option.type === "page_break" && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<i className="icon-delete" style={{ color: "#FC5A5A", fontSize: '13px'}}></i>}
                        onClick={() => removePageBreak(option.id)}
                        style={{
                          color: '#ff4d4f',
                          border: 'none',
                          boxShadow: 'none'
                        }}
                      />
                    )}
                  </div>
                ))}
              </SortableContext>
            </DndContext>
              );
            })()}
          </div>
        </div>
      </Modal>

      {/* {printSettings?.prescription?.case_option?.map((e, i) => {
                return (
                    e?.custom_status === 'Y' && (
                        <Row key={i} justify="space-between" className="align-items-center form_addnewpatient mb-28">
                            <Col lg={10}>
                                <div className="d-flex align-items-center cursor-pointer Preview-color-icon" onClick={() => onCaseOptionChange(e, 'visible', i)}>
                                    <i className={`icon-Preview ${e.enable === 'N' && 'disable-preview'} me-2`}></i>
                                    <span>{e.title}</span>
                                </div>
                            </Col>
                            <Col lg={14}>
                                <Form.Item className="mb-0">
                                    <Radio.Group className={`d-flex gender-radio all-change-radio ${isMobile ? 'segmented-radio-mobile' : ''}`} onChange={(e) => onCaseOptionChange(e, 'radio', i)} value={e.format}>
                                        <Radio.Button className="w-100 text-center" value="inline">Inline</Radio.Button>
                                        <Radio.Button className="w-100 text-center" value="listview">List View</Radio.Button>
                                        <Radio.Button className="w-100 text-center" value="table">Table</Radio.Button>
                                    </Radio.Group>
                                </Form.Item>
                            </Col>
                        </Row>
                    )
                )
            })} */}
    </div>
  );
}

export default React.memo(PrescriptionLayout);
