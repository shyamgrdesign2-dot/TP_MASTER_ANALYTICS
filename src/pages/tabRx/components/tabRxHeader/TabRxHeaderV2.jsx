import React, {
    useState,
    useEffect,
    useCallback,
    useContext,
    useMemo,
} from "react";
import { Container, Navbar, Row, Col } from "react-bootstrap";
import {
    Button,
    Dropdown,
    Tooltip,
    Popover,
    Input,
    Spin,
    Tabs,
    Select,
    Drawer,
    message,
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { isMobile, isDesktop } from "react-device-detect";
import { v4 as uuidv4 } from "uuid";
import { useFeatureIsOn } from "@growthbook/growthbook-react";

import "./TabRxHeaderV2.scss";

import CustomizeSetting from "../../../../common/CustomizeSetting";

import ProfilePopover from "../../../../common/ProfilePopover";
import CommonModal from "../../../../common/CommonModal";

// import videoimg1 from '../assets/images/tutorial-img1.png';
// import videoimg2 from '../assets/images/tutorial-img2.png';

import VideoModal from "../../../../common/VideoModal";
import TabVoiceRxButton from "../../../../components/tab_design/TabVoiceRxButton";

import {
    errorMessage,
    getClinicName,
    shouldMonetizationDisabled,
    removeBeforeWhiteSpace,
    isVoiceRxFree,
    filterCustomModuleContent,
} from "../../../../utils/utils";

import {
    EXTRA_OPTIONS,
    GB_PILLUP_MEDICINE,
    GB_ZYDUS_USER,
    GB_CARE_PLAN,
    MESSAGE_KEY,
    S_DDX,
    S_VOICE_RX,
    OPTHAL_PAD_MODULE_ID,
    GB_VOICE_RX_FREE,
} from "../../../../utils/constants";
import {
    assignCarePlan,
    updateCarePlanName,
} from "../../../../pages/smartSync/services/carePlanService";

import { useSelector, useDispatch } from "react-redux";

import {
    oneClickAddTemplate,
    oneClickUpdateTemplate,
    oneClickDeleteTemplate,
    oneClickTemplatesList,
    oneClickSingleTemplateDetails,
    addCaseManager,
    editCaseManager,
    getInvestigationAndMedicine,
} from "../../../../redux/caseManagerSlice";
import { customizedPad, listVideo } from "../../../../redux/doctorsSlice";
import GenRxButton from "../../../../components/GenRxButton";

import { placeIctOrder } from "../../../../redux/appointmentsSlice";
import { getDecodedToken } from "../../../../utils/localStorage";
import { env } from "../../../../EnvironmentConfig";
import { updateCredits } from "../../../../redux/monetizationSlice";
import { setAddToRx } from "../../../../api/services/ApiGenRx";
import { setSelectAutofill } from "../../../../redux/ddxSlice";
import VideoConsultButton from "../../../../components/VideoConsultButton";
import { OPHTHALMOLOGY_SECTIONS } from "../../../../utils/ophthalmologyExamConstants";
import { buildOpthalPayload } from "../../../../utils/ophthalmologyPayload";
import {
    createOpthalPrescription,
    updateOpthalPrescription,
} from "../../../../pages/ophthalmology/service";
import {
    resetOpthalForm,
    setTableValues as setOpthalTableValues,
} from "../../../../redux/ophthalmologyExamSlice";
import useTabletViewport from "../../../../hooks/useTabletViewport";
import CashManagerContext from "../../../../context/CashManagerContext";
import { getTabRxFiles, upsertTabRxRx } from "../../services/tabRxService";
import {
    getMetadata,
    setMetadata,
    getTemplates,
} from "../../services/templateService";
import { setDefaultCustomSyncPadTemplate } from "../../../smartSync/services/uploadService";
import { ASSETS } from "../../../../assets";
const {
  alerticon: alertIcon,
  tutorial: tutorial2,
  tubeIcon: playIcons,
  fullIcon: fullicon,
  settingsIcon,
  endIcon,
  notesMultiple,
  settingsNew,
  video: videoSvg,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

var oneClickCosultationTemplateId = 0;

function TabRxHeaderV2({
    isVaccinationEnabled,
    isGrowthChartEnabled,
    gynecHistory,
    labParamsData,
    zydusSelectedLabParams,
    handleGenRx,
    labReportID,
    selectedCarePlan,
    hasExistingCarePlan = false,
    handleVideoConsult,
    isVideoConsultLoading,
    smartRxFiles = [],
    isCustomSSRX = false,
    selectedTemplateId = null,
    canvasData = null,
    canvasRef = null,
    hasCanvasContent = false,
    onCanvasClear = null,
    onCanvasSubmit = null,
    onToggleTemplateDrawer = null,
    isEndVisitLoading = false,
    setIsEndVisitLoading = null,
    showTeleconsultIcon,
    onTeleconsultClick,
    isTeleconsultJoinLoading,
    isTeleconsultActive,
    isSelectLetterHead = false,
}) {
    const {
        profile,
        siteId,
        storeCode,
        customizedPadLeftList,
        customizedPadRightList,
        opthalModuleAutoAdded,
    } = useSelector((state) => state.doctors);

    const { frequencyList, timingList, videoList } = useSelector(
        (state) => state.doctors,
    );
    const vaccines = useSelector((state) => state.vaccines);
    const { givenVaccines, updatedDueVaccines } = vaccines;
    const { measurements } = useSelector((state) => state.growthChart);
    const { isObstetricDetailsUpdated } = useSelector((state) => state.obstetric);
    const { templates, loading } = useSelector((state) => state.caseManager);
    const dispatch = useDispatch();

    const { customModules } = useSelector((state) => state.customModules);

    const navigate = useNavigate();
    const isTablet = useTabletViewport();
    const {
        patient_data,
        send_path,
        tcmId,
        pamId,
        consultationDate,
        symptomsData,
        setSymptomsData,
        examinationData,
        setExaminationData,
        surgeriesData,
        setSurgeriesData,
        diagnosisData,
        setDiagnosisData,
        adviceData,
        setAdviceData,
        investigationData,
        setInvestigationData,
        medicationData,
        setMedicationData,
        vitalsData,
        setVitalsData,
        medicalHistoryData,
        setMedicalHistoryData,
        privateNotesData,
        setPrivateNotesData,
        followUpDate,
        setFollowUpDate,
        additionalNote,
        setAdditionalNote,
        startTime,
        customModuleContents,
        setCustomModuleContents,
        pillupSwitch,
        useVoiceRx,
        useDDX,
        isDraft,
    } = useContext(CashManagerContext);
    const { isAutofillSelected, selectedSymptomsCollector, symptomCollector } =
        useSelector((state) => state.ddx);
    const ophthalmologyExam = useSelector((state) => state.ophthalmologyExam);

    const [isBackModalOpen, setIsBackModalOpen] = useState(false);

    //PopOver1
    const [popOver1, setPopOver1] = useState(false);
    const [allTemplates, setAllTemplates] = useState([]);
    const [matchedTemplates, setMatchedTemplates] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [removeTemplateId, setRemoveTemplateId] = useState(null);

    //PopOver2
    const [popOver2, setPopOver2] = useState(false);
    const [inputTemplateName, setInputTemplateName] = useState(null);
    const TAB_ADD_TEMPLATE = 1;
    const TAB_UPDATE_TEMPLATE = 2;
    const ADD_EDIT_TEMPLATE_TABS = [
        { key: TAB_ADD_TEMPLATE, label: "New Template" },
        { key: TAB_UPDATE_TEMPLATE, label: "Update Template" },
    ];
    const [tabChange, setTabChange] = useState(TAB_ADD_TEMPLATE);

    const [templateDrawer, setTemplateDrawer] = useState(false);
    const [saveDrawer, setSaveDrawer] = useState(false);

    const [customizeDrawer, setCustomizeDrawer] = useState(false);

    //PopOverVideo function
    const [popOverVideo, setPopOverVideo] = useState(false);
    const [videoLink, setVideoLink] = useState(null);
    const tp_monetization_enable = !shouldMonetizationDisabled();

    const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);
    const isPillUpAccessableFromGB = useFeatureIsOn(GB_PILLUP_MEDICINE);
    const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
    const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);

    useEffect(() => {
        dispatch(oneClickTemplatesList());
        dispatch(listVideo());
    }, []);

    useEffect(() => {
        setMatchedTemplates(templates);
        setAllTemplates(templates);
    }, [templates]);

    useEffect(() => {
        if (
            isAutofillSelected &&
            selectedSymptomsCollector?.medicalHistory?.length > 0
        ) {
            // Create a new array to store the updated medical history
            let updatedMedicalHistory = [...medicalHistoryData];

            if (updatedMedicalHistory.length === 0) {
                updatedMedicalHistory = selectedSymptomsCollector.medicalHistory?.map(
                    (e, i) => {
                        return {
                            title: e?.title,
                            tmmhs_id: e?.tmmhs_id,
                            no_know_history: false,
                            tags: [],
                        };
                    },
                );
            }

            // Process each section from selectedSymptomsCollector
            selectedSymptomsCollector.medicalHistory.forEach((section) => {
                // Find the matching section in medicalHistoryData
                const sectionIndex = updatedMedicalHistory.findIndex(
                    (item) => item.title === section.title,
                );

                if (sectionIndex !== -1) {
                    // Process each item in the section
                    section.items.forEach((newItem) => {
                        // Check if item already exists in the section
                        const itemExists = updatedMedicalHistory[sectionIndex].tags.some(
                            (existingTag) =>
                                existingTag.title?.toLowerCase() ===
                                newItem.name?.toLowerCase(),
                        );

                        // Only add if item doesn't exist
                        if (!itemExists) {
                            // Create tag based on section type
                            const newTag = {
                                tmmhst_id: Math.floor(Math.random() * 10000),
                                title: newItem.name,
                                pms_default: 0,
                                enable: "Y",
                                note: newItem.notes || "",
                            };

                            // Add specific fields based on section type
                            switch (section.title) {
                                case "Medical Condition":
                                    newTag.since = newItem.duration || "";
                                    newTag.status = "Active";
                                    newTag.medication = "Yes";
                                    newTag.MonthYear = "April 2025"; // Or use dynamic date
                                    newTag.oldSince = newItem.duration || "";
                                    break;

                                case "Allergies":
                                    newTag.since = newItem.duration || "";
                                    newTag.status = "Active";
                                    newTag.MonthYear = "April 2025";
                                    newTag.oldSince = newItem.duration || "";
                                    break;

                                case "Family History":
                                    newTag.relationship = newItem.relation || "";
                                    newTag.newSince = "";
                                    newTag.MonthYear = "";
                                    break;

                                case "Lifestyle":
                                    newTag.since = newItem.duration || "";
                                    newTag.status = "Active";
                                    newTag.MonthYear = "April 2025";
                                    newTag.oldSince = newItem.duration || "";
                                    break;

                                default:
                                    break;
                            }

                            // Add the new tag to the section
                            updatedMedicalHistory[sectionIndex].tags.push(newTag);
                        }
                    });
                }
            });

            // Update the medical history state
            setMedicalHistoryData(updatedMedicalHistory);
        }
    }, [isAutofillSelected, selectedSymptomsCollector]);

    const items = [
        {
            label: <div onClick={onResetClick}>Clear</div>,
            key: "clear",
        },
    ];
    async function onResetClick() {
        setSymptomsData([]);
        setExaminationData([]);
        setDiagnosisData([]);
        setAdviceData([]);
        setInvestigationData([]);
        setMedicationData([]);
        // setVitalsData([])
        // setMedicalHistoryData([])
        setPrivateNotesData(null);
        setFollowUpDate(null);
        setAdditionalNote("");
        setSurgeriesData([]);
        setCustomModuleContents([]);
        dispatch(resetOpthalForm());
    }
    // const languageItems = [
    //     {
    //         label: '1st menu item',
    //         key: '0',
    //     },
    //     {
    //         label: '2nd menu item',
    //         key: '1',
    //     },
    //     {
    //         label: '3rd menu item',
    //         key: '3',
    //     },
    // ];

    // Helper function to check if custom module content has data (supports both V1 and V2)
    const hasCustomModuleContent = useCallback(() => {
        return customModuleContents?.some((e) => {
            return e?.content?.some((row) => {
                if (e.module_version === "v2") {
                    // For V2 modules, check if any named field has content
                    const { id, ...fields } = row;
                    return Object.values(fields).some(
                        (value) => value && value.toString().trim().length > 0,
                    );
                } else {
                    // For V1 modules, check for title or notes
                    return row.title || row.notes;
                }
            });
        });
    }, [customModuleContents]);

    const showHideBackModal = useCallback(() => {
        setIsBackModalOpen(!isBackModalOpen);
    }, [isBackModalOpen]);

    // Handle Template Drawer
    const handleDrawerTemplate = useCallback(() => {
        setTemplateDrawer(!templateDrawer);
    }, [templateDrawer]);

    // Handle Save Drawer
    const handleDrawerSave = useCallback(() => {
        setInputTemplateName(null);
        setSaveDrawer(!saveDrawer);
    }, [saveDrawer]);

    //PopOver1 function
    const showHideTemplatesListPopover = useCallback(() => {
        setPopOver1(!popOver1);
    }, [popOver1]);

    const onSearch = (e) => {
        const searchQuery = e.target.value;
        if (searchQuery) {
            let filteredTemplates = templates.filter((template) => {
                return template.tmoc_template_name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());
            });
            setMatchedTemplates(filteredTemplates);
        } else {
            setMatchedTemplates(templates);
        }
    };

    const onTemplateSelected = async (tmoc_id, tmoc_template_name) => {
        oneClickCosultationTemplateId = tmoc_id;
        window.Moengage.track_event("one_click_template_select", {
            template_name: tmoc_template_name,
        });
        const action = await dispatch(oneClickSingleTemplateDetails(tmoc_id));
        if (action.meta.requestStatus === "fulfilled") {
            const data = action.payload;
            if (data !== undefined) {
                if (data?.opthalModuleData) {
                    const slitLampRows = data.opthalModuleData?.slitLampExamination;
                    const fundusRows = data.opthalModuleData?.fundusExamination;
                    if (hasSectionData(slitLampRows)) {
                        const values = buildSectionTableValues(
                            "slitLampTable",
                            slitLampRows,
                        );
                        dispatch(
                            setOpthalTableValues({ tableId: "slitLampTable", values }),
                        );
                    }
                    if (hasSectionData(fundusRows)) {
                        const values = buildSectionTableValues("fundusTable", fundusRows);
                        dispatch(setOpthalTableValues({ tableId: "fundusTable", values }));
                    }
                }
                if (data.symptoms.length > 0) {
                    const updatedData = data.symptoms.map((e) => {
                        return {
                            ...e,
                            unique_id: uuidv4(),
                            since: "",
                            severity: "",
                            note: "",
                        };
                    });
                    setSymptomsData([...symptomsData, ...updatedData]);
                }
                if (data.examination.length > 0) {
                    const updatedData = data.examination.map((e) => {
                        return { ...e, unique_id: uuidv4(), note: "" };
                    });
                    setExaminationData([...examinationData, ...updatedData]);
                }
                if (data?.surgeries && data.surgeries?.length > 0) {
                    const updatedData = data.surgeries.map((e) => {
                        return { ...e, unique_id: uuidv4(), notes: "" };
                    });
                    setSurgeriesData([...surgeriesData, ...updatedData]);
                }
                if (data.diagnosis.length > 0) {
                    const updatedData = data.diagnosis.map((e) => {
                        return {
                            ...e,
                            unique_id: uuidv4(),
                            since: "",
                            status: e.hasOwnProperty("status") ? e.status : "",
                            note: "",
                        };
                    });
                    setDiagnosisData([...diagnosisData, ...updatedData]);
                }
                if (data.advice.length > 0) {
                    const updatedData = data.advice.map((e) => {
                        return { ...e, unique_id: uuidv4() };
                    });
                    setAdviceData([...adviceData, ...updatedData]);
                }
                if (data.investigation.length > 0) {
                    const updatedData = data.investigation.map((e) => {
                        return { ...e, unique_id: uuidv4(), note: "" };
                    });
                    setInvestigationData([...investigationData, ...updatedData]);
                }
                if (data.medicine.length > 0) {
                    if (!isMobile) {
                        const updatedData = data.medicine.map((e) => {
                            const unitObj = e?.medicineUnit
                                ? e?.medicineUnit.find((x) => x.tmu_id == e.tmm_unit)
                                : null;
                            const frequencyObj = frequencyList.find(
                                (x) => x.tmf_id == e.tmm_freq_type,
                            );
                            const timingObj = timingList.find((x) => x.tmt_id == e.tmm_time);

                            return {
                                ...e,
                                tmm_unit_name:
                                    unitObj && unitObj !== undefined ? unitObj.tmu_title : "",
                                tmm_freq_type_name:
                                    e.tmf_block == 0
                                        ? `${e.tcm_tmm_freq_morning && e.tcm_tmm_freq_morning != 0
                                            ? e.tcm_tmm_freq_morning + " - "
                                            : "0 -"
                                        }${e.tcm_tmm_freq_afternoon &&
                                            e.tcm_tmm_freq_afternoon != 0
                                            ? e.tcm_tmm_freq_afternoon + " - "
                                            : "0 -"
                                        }${e.tcm_tmm_freq_evening && e.tcm_tmm_freq_evening != 0
                                            ? e.tcm_tmm_freq_evening + " - "
                                            : ""
                                        }${e.tcm_tmm_freq_night && e.tcm_tmm_freq_night != 0
                                            ? e.tcm_tmm_freq_night
                                            : "0"
                                        }`
                                        : frequencyObj !== undefined
                                            ? frequencyObj.tmf_title
                                            : "",
                                tmf_block_val:
                                    frequencyObj !== undefined ? frequencyObj.tmf_block_val : "",
                                tmm_time_name:
                                    timingObj !== undefined ? timingObj.tmt_title : "",
                                tmm_dosage_unit_name: `${e.tmm_dosage ? `${e.tmm_dosage} ${unitObj && unitObj !== undefined ? unitObj.tmu_title : ""}` : ""}`,
                                tmm_days_duration_type: EXTRA_OPTIONS.some(
                                    (x) => x.value == e.tmm_duration_type,
                                )
                                    ? e.tmm_duration_type
                                    : e.tmm_days
                                        ? `${e.tmm_days} ${e.tmm_duration_type}`
                                        : "",
                                unique_id: uuidv4(),
                            };
                        });
                        setMedicationData([...medicationData, ...updatedData]);
                    } else {
                        const updatedData = data.medicine.map((e) => {
                            const medicineUnit = e?.medicineUnit.map((e1) => {
                                return {
                                    key: JSON.stringify({ ...e1 }),
                                    value: e1.tmu_id,
                                    label: <>{e1.tmu_title}</>,
                                };
                            });

                            const unitObj = medicineUnit
                                ? medicineUnit.find((x) => x.value == e.tmm_unit)
                                : null;
                            const frequencyObj = frequencyList.find(
                                (x) => x.tmf_id == e.tmm_freq_type,
                            );
                            const timingObj = timingList.find((x) => x.tmt_id == e.tmm_time);

                            return {
                                ...e,
                                tmm_unit_name:
                                    unitObj && unitObj !== undefined
                                        ? JSON.parse(unitObj.key).tmu_title
                                        : "",
                                tmm_freq_type_name:
                                    frequencyObj !== undefined ? frequencyObj.tmf_title : "",
                                tmf_block_val:
                                    frequencyObj !== undefined ? frequencyObj.tmf_block_val : "",
                                tmm_time_name:
                                    timingObj !== undefined ? timingObj.tmt_title : "",
                                medicineUnit: medicineUnit,
                                tmm_days_duration_type: EXTRA_OPTIONS.some(
                                    (x) => x.value == e.tmm_duration_type,
                                )
                                    ? e.tmm_duration_type
                                    : e.tmm_days
                                        ? `${e.tmm_days} ${e.tmm_duration_type}`
                                        : "",
                                unique_id: uuidv4(),
                            };
                        });
                        setMedicationData([...medicationData, ...updatedData]);
                    }
                }
                if (data?.userModules?.length > 0) {
                    const moduleMap = new Map();

                    // First, preserve ALL existing custom module data (both V1 and V2)
                    customModuleContents.forEach((module) => {
                        // Filter content based on module version
                        let filteredContent;
                        if (module.module_version === "v2") {
                            // For V2 modules, check if any named field has content
                            filteredContent = module?.content?.filter((row) => {
                                const { id, ...fields } = row;
                                return Object.values(fields).some(
                                    (value) => value && value.toString().trim().length > 0,
                                );
                            });
                        } else {
                            // For V1 modules, check for title or notes
                            filteredContent = module?.content?.filter(
                                (e) => e.title || e.notes,
                            );
                        }
                        moduleMap.set(module.module_id, {
                            ...module,
                            content: filteredContent || [],
                        });
                    });

                    // Then, add template module data to existing modules
                    data?.userModules?.forEach((module) => {
                        if (customModules?.find((x) => x.module_id == module.module_id)) {
                            if (moduleMap.has(module.module_id)) {
                                const existingModule = moduleMap.get(module.module_id);
                                moduleMap.set(module.module_id, {
                                    ...existingModule,
                                    content: [...existingModule.content, ...module.content],
                                });
                            } else {
                                moduleMap.set(module.module_id, { ...module });
                            }
                        }
                    });
                    setCustomModuleContents(Array.from(moduleMap.values()));
                }
            }
            !isMobile ? showHideTemplatesListPopover() : handleDrawerTemplate();
        } else {
            errorMessage(action.error);
        }
    };

    const onDeleteTemplateClicked = async (tmoc_id) => {
        const action = await dispatch(oneClickDeleteTemplate(tmoc_id));
        if (action.meta.requestStatus === "rejected") {
            errorMessage(action.error);
        }
    };

    //PopOver2 function
    const showHideSaveTemplatePopOver = useCallback(() => {
        setPopOver2(!popOver2);
    }, [popOver2]);

    const onTabChange = useCallback(
        (key) => {
            setInputTemplateName(null);
            setTabChange(key);
        },
        [tabChange],
    );

    const onChangeSaveTemplate = useCallback(
        (e) => {
            const updateQuery = removeBeforeWhiteSpace(e.target.value);
            setInputTemplateName(updateQuery);
        },
        [inputTemplateName],
    );

    const onAddTemplateClicked = async () => {
        let updatedMedication = [];
        if (!isMobile) {
            updatedMedication = [...medicationData];
        } else {
            updatedMedication = medicationData.map((e) => {
                const medicineUnit = e?.medicineUnit.map((e1) => {
                    return {
                        tmu_id: JSON.parse(e1.key).tmu_id,
                        tmu_title: JSON.parse(e1.key).tmu_title,
                    };
                });

                return {
                    ...e,
                    medicineUnit: medicineUnit,
                };
            });
        }

        var sendData = {
            tmoc_template_name: inputTemplateName,
            data: {
                symptoms: symptomsData.map(({ symptom_name, change }) => ({
                    symptom_name,
                    ...(change !== undefined && { change }),
                })),
                examination: examinationData.map(({ examination_name, change }) => ({
                    examination_name,
                    ...(change !== undefined && { change }),
                })),
                surgeries: surgeriesData.map(({ name, change, masterId, notes }) => ({
                    name,
                    masterId,
                    notes,
                    ...(change !== undefined && { change }),
                })),
                diagnosis: diagnosisData.map(
                    ({ tds_id, tds_name, icd_code, status, pms_default, change }) => ({
                        tds_id,
                        tds_name,
                        icd_code,
                        status,
                        pms_default,
                        ...(change !== undefined && { change }),
                    }),
                ),
                medicine: updatedMedication,
                advice: adviceData.map(({ advice_name, change }) => ({
                    advice_name,
                    ...(change !== undefined && { change }),
                })),
                investigation: investigationData.map(({ investigation_name, change, id, service_code }) => ({
                    investigation_name,
                    ...(change !== undefined && { change }),
                    ...(id != null && String(id).trim() !== "" && { id }),
                    ...(service_code != null && String(service_code).trim() !== "" && { service_code }),
                })),
                userModules: customModuleContents?.map((e) => {
                    // Filter content based on module version
                    let filteredContent;
                    if (e.module_version === "v2") {
                        // For V2 modules, filter rows with content and remove 'id' field
                        filteredContent = e.content
                            ?.filter((row) => {
                                const { id, ...fields } = row;
                                return Object.values(fields).some(
                                    (value) => value && value.toString().trim().length > 0,
                                );
                            })
                            .map((row) => {
                                // Remove 'id' field from the actual payload
                                const { id, ...cleanRow } = row;
                                return cleanRow;
                            });
                    } else {
                        // For V1 modules, check for title or notes
                        filteredContent = e.content?.filter((c) => c?.title || c?.notes);
                    }
                    return { ...e, content: filteredContent };
                }),
                opthalModuleData: buildOpthalTemplatePayload(),
            },
        };

        const action = await dispatch(oneClickAddTemplate(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            // const updatedData = symptomsData.map(e => {
            //     const obj = { ...e };
            //     delete obj['change'];
            //     return obj;
            //     return { ...e, change: 0 }
            // })
            if (symptomsData.length > 0) {
                const updatedData = symptomsData.map((e) => {
                    return { ...e, change: 0 };
                });
                setSymptomsData(updatedData);
            }

            if (examinationData.length > 0) {
                const updatedData = examinationData.map((e) => {
                    return { ...e, change: 0 };
                });
                setExaminationData(updatedData);
            }

            if (surgeriesData.length > 0) {
                const updatedData = surgeriesData.map((e) => {
                    return { ...e, change: 0 };
                });
                setSurgeriesData(updatedData);
            }

            if (diagnosisData.length > 0) {
                const fetchDiagnosisList = action.payload.diagnosis;
                const updatedData = diagnosisData.map((e, i) => {
                    return { ...e, ...fetchDiagnosisList[i], change: 0 };
                });
                setDiagnosisData(updatedData);
            }

            if (adviceData.length > 0) {
                const updatedData = adviceData.map((e) => {
                    return { ...e, change: 0 };
                });
                setAdviceData(updatedData);
            }

            if (investigationData.length > 0) {
                const updatedData = investigationData.map((e) => {
                    return { ...e, change: 0 };
                });
                setInvestigationData(updatedData);
            }

            if (customModuleContents?.length > 0) {
                const updatedData = customModuleContents?.map((e) => {
                    return { ...e, change: 0 };
                });
                setCustomModuleContents(updatedData);
            }

            setInputTemplateName(null);
            !isMobile ? showHideSaveTemplatePopOver() : handleDrawerSave();
        }
    };

    const onSearchTemplate = useCallback(() => {
        setInputTemplateName(null);
    }, [inputTemplateName]);

    const onSelectTemplate = useCallback(
        (data, e) => {
            setInputTemplateName(e.key);
        },
        [inputTemplateName],
    );

    const onUpdateTemplateClicked = async () => {
        let updatedMedication = [];
        if (!isMobile) {
            updatedMedication = [...medicationData];
        } else {
            updatedMedication = medicationData.map((e) => {
                const medicineUnit = e?.medicineUnit.map((e1) => {
                    return {
                        tmu_id: JSON.parse(e1.key).tmu_id,
                        tmu_title: JSON.parse(e1.key).tmu_title,
                    };
                });

                return {
                    ...e,
                    medicineUnit: medicineUnit,
                };
            });
        }

        var data = JSON.parse(inputTemplateName);
        var sendData = {
            tmoc_id: data.tmoc_id,
            tmoc_template_name: data.tmoc_template_name,
            data: {
                symptoms: symptomsData.map(({ symptom_name, change }) => ({
                    symptom_name,
                    ...(change !== undefined && { change }),
                })),
                examination: examinationData.map(({ examination_name, change }) => ({
                    examination_name,
                    ...(change !== undefined && { change }),
                })),
                surgeries: surgeriesData.map(({ name, change, masterId, notes }) => ({
                    name,
                    masterId,
                    notes,
                    ...(change !== undefined && { change }),
                })),
                diagnosis: diagnosisData.map(
                    ({ tds_id, tds_name, status, pms_default }) => ({
                        tds_id,
                        tds_name,
                        status,
                        pms_default,
                    }),
                ),
                medicine: updatedMedication,
                advice: adviceData.map(({ advice_name, change }) => ({
                    advice_name,
                    ...(change !== undefined && { change }),
                })),
                investigation: investigationData.map(({ investigation_name, change, id, service_code }) => ({
                    investigation_name,
                    ...(change !== undefined && { change }),
                    ...(id != null && String(id).trim() !== "" && { id }),
                    ...(service_code != null && String(service_code).trim() !== "" && { service_code }),
                })),
                userModules: customModuleContents?.map((e) => {
                    // Filter content based on module version
                    let filteredContent;
                    if (e.module_version === "v2") {
                        // For V2 modules, filter rows with content and remove 'id' field
                        filteredContent = e.content
                            ?.filter((row) => {
                                const { id, ...fields } = row;
                                return Object.values(fields).some(
                                    (value) => value && value.toString().trim().length > 0,
                                );
                            })
                            .map((row) => {
                                // Remove 'id' field from the actual payload
                                const { id, ...cleanRow } = row;
                                return cleanRow;
                            });
                    } else {
                        // For V1 modules, check for title or notes
                        filteredContent = e.content?.filter((c) => c?.title || c?.notes);
                    }
                    return { ...e, content: filteredContent };
                }),
                opthalModuleData: buildOpthalTemplatePayload(),
            },
        };
        const action = await dispatch(oneClickUpdateTemplate(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            // const updatedData = symptomsData.map(e => {
            //     const obj = { ...e };
            //     delete obj['change'];
            //     return obj;
            //     return { ...e, change: 0 }
            // })
            if (symptomsData.length > 0) {
                const updatedData = symptomsData.map((e) => {
                    return { ...e, change: 0 };
                });
                setSymptomsData(updatedData);
            }

            if (examinationData.length > 0) {
                const updatedData = examinationData.map((e) => {
                    return { ...e, change: 0 };
                });
                setExaminationData(updatedData);
            }

            if (surgeriesData.length > 0) {
                const updatedData = surgeriesData.map((e) => {
                    return { ...e, change: 0 };
                });
                setSurgeriesData(updatedData);
            }

            if (diagnosisData.length > 0) {
                const fetchDiagnosisList = action.payload.diagnosis;
                const updatedData = diagnosisData.map((e, i) => {
                    return { ...e, ...fetchDiagnosisList[i] };
                });
                setDiagnosisData(updatedData);
            }

            if (adviceData.length > 0) {
                const updatedData = adviceData.map((e) => {
                    return { ...e, change: 0 };
                });
                setAdviceData(updatedData);
            }

            if (investigationData.length > 0) {
                const updatedData = investigationData.map((e) => {
                    return { ...e, change: 0 };
                });
                setInvestigationData(updatedData);
            }

            if (customModuleContents?.length > 0) {
                const updatedData = customModuleContents?.map((e) => {
                    return { ...e, change: 0 };
                });
                setCustomModuleContents(updatedData);
            }

            setInputTemplateName(null);
            !isMobile ? showHideSaveTemplatePopOver() : handleDrawerSave();
        }
    };

    const showHideModal = useCallback(
        (template_id) => {
            template_id !== undefined
                ? setRemoveTemplateId(template_id)
                : setRemoveTemplateId(null);
            setIsModalOpen(!isModalOpen);
        },
        [isModalOpen],
    );

    //Template Remove
    const DELETE_MODAL = useMemo(() => {
        return (
            <CommonModal
                isModalOpen={isModalOpen}
                onCancel={showHideModal}
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
                                    onClick={() => {
                                        onDeleteTemplateClicked(removeTemplateId);
                                        showHideModal();
                                    }}
                                    className="me-4 text-decoration-underline btn p-0 text-main"
                                >
                                    Yes Delete
                                </div>
                                <Button
                                    onClick={showHideModal}
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
    }, [isModalOpen]);

    //Template Componet Web
    const TEMPLATE_CONTENT_WEB = useCallback(() => {
        return (
            <>
                <div className="pop-header" key="oneclickrx-template">
                    <div className="align-items-center d-flex justify-content-between">
                        <div className="title-common">One Click Rx Templates</div>
                        <Button
                            className="btn btn-delete-prescription p-0"
                            onClick={showHideTemplatesListPopover}
                        >
                            <i className="icon-Cross" />
                        </Button>
                    </div>
                    <div className="mt-3" key="symptoms-template-search">
                        <Input
                            allowClear
                            className="popinput"
                            onChange={onSearch}
                            placeholder="Search Templates"
                            prefix={<i className="icon-search me-2" />}
                        />
                    </div>
                </div>
                <div className="pop-body">
                    {matchedTemplates.length > 0 &&
                        matchedTemplates.map((template, i) => {
                            return (
                                <div
                                    className="align-items-center d-flex medicine-templates"
                                    key={i}
                                >
                                    <div
                                        className="round-box"
                                        onClick={() =>
                                            onTemplateSelected(
                                                template.tmoc_id,
                                                template.tmoc_template_name,
                                            )
                                        }
                                    >
                                        <i className="icon-template"></i>
                                    </div>
                                    <div
                                        className="text-truncate w-100"
                                        onClick={() =>
                                            onTemplateSelected(
                                                template.tmoc_id,
                                                template.tmoc_template_name,
                                            )
                                        }
                                    >
                                        <div className="title text-main2">
                                            {template.tmoc_template_name}
                                        </div>
                                        <div className="text-truncate">
                                            {template.medicine_name}
                                        </div>
                                    </div>
                                    <Button
                                        className="btn btn-delete-prescription p-0 ms-2"
                                        onClick={() => {
                                            showHideModal(template.tmoc_id);
                                            showHideTemplatesListPopover();
                                        }}
                                    >
                                        {template.loading ? (
                                            <Spin
                                                indicator={
                                                    <LoadingOutlined style={{ fontSize: 22 }} spin />
                                                }
                                            />
                                        ) : (
                                            <i className="icon-delete"></i>
                                        )}
                                    </Button>
                                </div>
                            );
                        })}
                </div>
            </>
        );
    }, [popOver1, matchedTemplates]);

    //Save Componet Web
    const SAVE_CONTENT_WEB = useCallback(() => {
        return (
            <>
                <div className="d-flex justify-content-between align-items-center border-bottom templatepopover">
                    <Tabs
                        defaultActiveKey={TAB_ADD_TEMPLATE}
                        items={ADD_EDIT_TEMPLATE_TABS}
                        onChange={onTabChange}
                        className="w-100"
                    />
                    <Button
                        className="btn btn-delete-prescription"
                        onClick={showHideSaveTemplatePopOver}
                    >
                        <i className="icon-Cross"></i>
                    </Button>
                </div>
                {tabChange === TAB_ADD_TEMPLATE ? (
                    <div className="pop-header d-flex">
                        <Input
                            allowClear
                            value={inputTemplateName && inputTemplateName}
                            className="popinput inputheight41"
                            placeholder="Template Name"
                            onChange={onChangeSaveTemplate}
                        />
                        <Button
                            className="btn btn-primary3 btn-41 ms-3"
                            loading={loading}
                            disabled={inputTemplateName ? false : true}
                            onClick={onAddTemplateClicked}
                        >
                            {" Save "}
                        </Button>
                    </div>
                ) : (
                    <div className="pop-header d-flex">
                        <Select
                            showSearch
                            value={
                                inputTemplateName &&
                                JSON.parse(inputTemplateName).tmoc_template_name
                            }
                            className="autocomplete-custom w-100 popinput inputheight41"
                            placeholder="Select Template"
                            onSearch={onSearchTemplate}
                            onSelect={onSelectTemplate}
                            optionLabelProp="label"
                            options={allTemplates.map((template) => {
                                return {
                                    key: JSON.stringify(template),
                                    value: template.tmoc_template_name,
                                    label: (
                                        <div key={template.tst_id}>
                                            {template.tmoc_template_name}
                                        </div>
                                    ),
                                };
                            })}
                            optionRender={(option) => (
                                <div className="align-items-center d-flex text-truncate w-100">
                                    <div className="round-box">
                                        <i className="icon-template"></i>
                                    </div>
                                    <div className="text-truncate w-100">
                                        <div className="title text-main2">{option.data.value}</div>
                                        <div className="text-truncate">
                                            {JSON.parse(option.data.key).medicine_name}
                                        </div>
                                    </div>
                                </div>
                            )}
                        />
                        <Button
                            className="btn btn-primary3 btn-41 ms-3"
                            loading={loading}
                            disabled={inputTemplateName ? false : true}
                            onClick={onUpdateTemplateClicked}
                        >
                            {" Update "}
                        </Button>
                    </div>
                )}
            </>
        );
    }, [tabChange, popOver2, inputTemplateName, loading, allTemplates]);

    //Template Componet Tab
    const TEMPLATE_CONTENT_TAB = useMemo(() => {
        return (
            <>
                <div>
                    <div className="medicine-templates">
                        <Input
                            className="popinput"
                            onChange={onSearch}
                            placeholder="Search Templates"
                            prefix={<i className="icon-search me-2"></i>}
                            allowClear
                        />
                    </div>
                    <div className="tab-template-height">
                        {matchedTemplates.length > 0 &&
                            matchedTemplates.map((template, i) => {
                                return (
                                    <div
                                        className="align-items-center d-flex justify-content-between medicine-templates"
                                        key={i}
                                    >
                                        <div
                                            className="align-items-center d-flex text-truncate w-100"
                                            onClick={() =>
                                                onTemplateSelected(
                                                    template.tmoc_id,
                                                    template.tmoc_template_name,
                                                )
                                            }
                                        >
                                            <div className="round-box">
                                                <i className="icon-template"></i>
                                            </div>
                                            <div className="text-truncate w-100">
                                                <div className="title text-main2">
                                                    {template.tmoc_template_name}
                                                </div>
                                                <div className="text-truncate">
                                                    {template.medicine_name}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            className="btn btn-delete-prescription p-0 ms-3"
                                            onClick={() => showHideModal(template.tmoc_id)}
                                        >
                                            {template.loading ? (
                                                <Spin
                                                    indicator={
                                                        <LoadingOutlined style={{ fontSize: 22 }} spin />
                                                    }
                                                />
                                            ) : (
                                                <i className="icon-delete"></i>
                                            )}
                                        </Button>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </>
        );
    }, [templateDrawer, matchedTemplates]);

    //Save Componet Tab
    const SAVE_CONTENT_TAB = useMemo(() => {
        return (
            <>
                <div className="d-flex justify-content-between align-items-center border-bottom templatepopover">
                    <Tabs
                        defaultActiveKey={TAB_ADD_TEMPLATE}
                        items={ADD_EDIT_TEMPLATE_TABS}
                        onChange={onTabChange}
                        className="w-100"
                    />
                </div>
                {tabChange === TAB_ADD_TEMPLATE ? (
                    <div className="medicine-templates d-flex">
                        <Input
                            allowClear
                            value={inputTemplateName && inputTemplateName}
                            className="popinput inputheight41"
                            placeholder="Template Name"
                            onChange={onChangeSaveTemplate}
                        />
                        <Button
                            className="btn btn-primary3 btn-41 ms-3"
                            loading={loading}
                            disabled={inputTemplateName ? false : true}
                            onClick={onAddTemplateClicked}
                        >
                            {" Save "}
                        </Button>
                    </div>
                ) : (
                    <div className="medicine-templates d-flex">
                        <Select
                            showSearch
                            value={
                                inputTemplateName &&
                                JSON.parse(inputTemplateName).tmoc_template_name
                            }
                            className="autocomplete-custom w-100 popinput inputheight41"
                            placeholder="Select Template"
                            onSearch={onSearchTemplate}
                            onSelect={onSelectTemplate}
                            optionLabelProp="label"
                            options={allTemplates.map((template) => {
                                return {
                                    key: JSON.stringify(template),
                                    value: template.tmoc_template_name,
                                    label: (
                                        <div key={template.tst_id}>
                                            {template.tmoc_template_name}
                                        </div>
                                    ),
                                };
                            })}
                            optionRender={(option) => (
                                <div className="align-items-center d-flex text-truncate w-100">
                                    <div className="round-box">
                                        <i className="icon-template"></i>
                                    </div>
                                    <div className="text-truncate w-100">
                                        <div className="title text-main2">{option.data.value}</div>
                                        <div className="text-truncate">
                                            {JSON.parse(option.data.key).medicine_name}
                                        </div>
                                    </div>
                                </div>
                            )}
                        />
                        <Button
                            className="btn btn-primary3 btn-41 ms-3"
                            loading={loading}
                            disabled={inputTemplateName ? false : true}
                            onClick={onUpdateTemplateClicked}
                        >
                            {" Update "}
                        </Button>
                    </div>
                )}
            </>
        );
    }, [tabChange, saveDrawer, inputTemplateName, loading, allTemplates]);

    // Handle Customize Drawer
    const handleDrawerCustomize = useCallback(() => {
        setCustomizeDrawer(!customizeDrawer);
    }, [customizeDrawer]);

    const CUSTOMIZE_CONTENT_TAB = useMemo(() => {
        return (
            <CustomizeSetting
                handleDrawerCustomize={handleDrawerCustomize}
                isVaccinationEnabled={isVaccinationEnabled}
                isGrowthChartEnabled={isGrowthChartEnabled}
                isTabRx
            />
        );
    }, [customizeDrawer]);

    const handleSelectLetterHead = () => {
        if (onToggleTemplateDrawer) {
            onToggleTemplateDrawer();
        }
    }

    const hasOpthalValues = useCallback(() => {
        return (
            Object.values(ophthalmologyExam?.visualAcuity || {}).some((eye) =>
                Object.values(eye || {}).some((value) => value),
            ) ||
            Object.values(ophthalmologyExam?.tables || {}).some((table) =>
                Object.values(table || {}).some((value) => value),
            ) ||
            Object.values(ophthalmologyExam?.extraFields || {}).some((value) => value)
        );
    }, [ophthalmologyExam]);

    const opthalTablesById = useMemo(() => {
        return OPHTHALMOLOGY_SECTIONS.reduce((acc, section) => {
            section.tables.forEach((table) => {
                acc[table.id] = table;
            });
            return acc;
        }, {});
    }, []);

    const hasOphthalValue = useCallback((value) => {
        if (value === 0 || value === "0") return true;
        if (value === null || value === undefined) return false;
        return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
    }, []);

    const hasSectionData = useCallback(
        (items) => {
            if (!Array.isArray(items)) return false;
            return items.some((item) =>
                ["OD", "OS", "od", "os", "remarks"].some((key) =>
                    hasOphthalValue(item?.[key]),
                ),
            );
        },
        [hasOphthalValue],
    );

    const hasOphthalPayloadData = useCallback(
        (data) => {
            if (!data) return false;
            const hasOphthalArrayData = (items, keys) =>
                Array.isArray(items) &&
                items.some((item) => keys.some((key) => hasOphthalValue(item?.[key])));

            return (
                hasOphthalArrayData(data.visualAcuity, [
                    "ucDistance",
                    "ucNear",
                    "pinhole",
                    "cDistance",
                    "cNear",
                ]) ||
                hasOphthalArrayData(data.autoRefraction, [
                    "sphere",
                    "cylinder",
                    "axis",
                    "add",
                    "distance",
                    "near",
                ]) ||
                hasOphthalArrayData(data.lensometerValues, [
                    "sphere",
                    "cylinder",
                    "axis",
                    "add",
                    "distance",
                    "near",
                ]) ||
                hasOphthalArrayData(data.glassPrescription, [
                    "sphere",
                    "cylinder",
                    "axis",
                    "add",
                    "distance",
                    "near",
                ]) ||
                hasOphthalArrayData(data.intraOcularPressure, [
                    "nct",
                    "gat",
                    "cc",
                    "cct",
                    "ciop",
                ]) ||
                hasOphthalArrayData(data.slitLampExamination, [
                    "OD",
                    "OS",
                    "remarks",
                ]) ||
                hasOphthalArrayData(data.fundusExamination, ["OD", "OS", "remarks"]) ||
                hasOphthalValue(data.pd)
            );
        },
        [hasOphthalValue],
    );

    const buildSectionTableValues = useCallback(
        (tableId, rows) => {
            const table = opthalTablesById[tableId];
            if (!table) return {};
            const nextValues = {};
            const normalize = (value) => String(value || "").toLowerCase();
            table.rows.forEach((row) => {
                const entry = rows?.find((item) => {
                    const labelMatch = normalize(
                        item?.section ?? item?.title ?? item?.name,
                    );
                    const keyMatch = normalize(
                        item?.sectionKey ?? item?.section_key ?? item?.key ?? item?.id,
                    );
                    return (
                        labelMatch === normalize(row.label) ||
                        keyMatch === normalize(row.key)
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
        },
        [opthalTablesById],
    );

    const buildOpthalTemplatePayload = useCallback(() => {
        const payload = buildOpthalPayload({
            sections: OPHTHALMOLOGY_SECTIONS,
            tables: ophthalmologyExam?.tables,
            extraFields: ophthalmologyExam?.extraFields,
            visualAcuity: ophthalmologyExam?.visualAcuity,
        });
        return {
            slitLampExamination: payload.slitLampExamination || [],
            fundusExamination: payload.fundusExamination || [],
        };
    }, [ophthalmologyExam]);

    async function onEndVisitClick() {

        // Set loading state to show full-page spinner
        if (setIsEndVisitLoading) {
            setIsEndVisitLoading(true);
        }

        try {
            // Sync pad template preference: metadata format 1/2/3 vs set-default for custom UUIDs
            if (selectedTemplateId && selectedTemplateId !== "none") {
                let currentFormat = null;
                try {
                    const metaResult = await getMetadata();
                    if (metaResult?.success && metaResult?.data) {
                        const raw = metaResult.data.format;
                        if (
                            raw !== null &&
                            raw !== undefined &&
                            raw !== ""
                        ) {
                            const n = Number(raw);
                            if (Number.isFinite(n)) {
                                currentFormat = n;
                            }
                        }
                    }
                } catch (metaErr) {
                    console.error(
                        "[TabRxHeaderV2] getMetadata on end visit failed:",
                        metaErr,
                    );
                }

                const letterHeadFlag =
                    isSelectLetterHead === true || isSelectLetterHead === 1;

                if (selectedTemplateId === "blank") {
                    if (currentFormat !== 1) {
                        await setMetadata(1, letterHeadFlag);
                    }
                } else if (selectedTemplateId === "standard") {
                    if (currentFormat !== 2) {
                        await setMetadata(2, letterHeadFlag);
                    }
                } else {
                    if (currentFormat !== 3) {
                        await setMetadata(3, letterHeadFlag);
                    }
                    let defaultTemplateId = null;
                    try {
                        const templatesResult = await getTemplates();
                        const list =
                            templatesResult?.success &&
                            Array.isArray(templatesResult?.data)
                                ? templatesResult.data
                                : [];
                        const defaultTemplate = list.find(
                            (t) => t?.default === true,
                        );
                        defaultTemplateId = defaultTemplate?.id ?? null;
                    } catch (tplErr) {
                        console.error(
                            "[TabRxHeaderV2] getTemplates on end visit failed:",
                            tplErr,
                        );
                    }
                    const sameAsServerDefault =
                        defaultTemplateId != null &&
                        String(selectedTemplateId) ===
                            String(defaultTemplateId);
                    if (!sameAsServerDefault) {
                        await setDefaultCustomSyncPadTemplate(
                            selectedTemplateId,
                        );
                    }
                }
            }

            // Handle canvas submission before end visit if canvas submit handler is provided
            // This should match SmartPrescription flow: upload files first, then use them in case manager
            let canvasFiles = [];
            let canvasBlobs = [];
            let freshCanvasData = null;

            if (onCanvasSubmit) {
                try {
                    const result = await onCanvasSubmit();
                    canvasFiles = result?.files || [];
                    canvasBlobs = result?.blobs || [];

                    // Get fresh canvas data after upload
                    if (canvasRef && canvasRef.current) {
                        try {
                            freshCanvasData = canvasRef.current.getCanvasData();
                        } catch (err) {
                            console.error('❌ [TabRxHeaderV2] Error getting fresh canvas data:', err);
                        }
                    }
                } catch (error) {
                    console.error('❌ [TabRxHeaderV2] Error submitting canvas:', error);
                    // Continue with end visit even if canvas submission fails
                }
            } else {
            }

            // Use uploaded canvas files if available, otherwise fall back to smartRxFiles prop
            const finalSmartRxFiles = canvasFiles.length > 0 ? canvasFiles : smartRxFiles;

            // Use fresh canvas data if available, otherwise use prop
            const finalCanvasData = freshCanvasData || canvasData;

            // Validation checks - return early if validation fails
            if (
                symptomsData.length > 0 &&
                symptomsData.filter((e) => e.symptom_name == "").length > 0
            ) {
                errorMessage("Please fillup symptom name");
                return;
            } else if (
                examinationData.length > 0 &&
                examinationData.filter((e) => e.examination_name == "").length > 0
            ) {
                errorMessage("Please fillup examination name");
            } else if (
                surgeriesData.length > 0 &&
                surgeriesData.filter((e) => e.name == "").length > 0
            ) {
                errorMessage("Please fillup surgery name");
            } else if (
                diagnosisData.length > 0 &&
                diagnosisData.filter((e) => e.tds_name == "").length > 0
            ) {
                errorMessage("Please fillup diagnosis name");
            } else if (
                medicationData.length > 0 &&
                medicationData.filter((e) => e.tmm_medicine_name == "").length > 0
            ) {
                errorMessage("Please fillup medication name");
            } else if (
                adviceData.length > 0 &&
                adviceData.filter((e) => e.advice_name == "").length > 0
            ) {
                errorMessage("Please fillup advice name");
            } else if (
                investigationData.length > 0 &&
                investigationData.filter((e) => e.investigation_name == "").length > 0
            ) {
                errorMessage("Please fillup investigation name");
                return;
            }

            var sendData = {
                action: tcmId == 0 ? "add" : "edit",
                tcm_id: tcmId,
                patient_unique_id:
                    patient_data !== undefined ? patient_data.patient_unique_id : 0,
                pam_id:
                    patient_data !== undefined
                        ? patient_data.hasOwnProperty("pam_id")
                            ? patient_data.pam_id
                            : pamId
                        : 0,
                consultation_date: consultationDate,
                symptoms: symptomsData,
                examination: examinationData,
                surgeries: surgeriesData,
                diagnosis: diagnosisData,
                medicine: medicationData.map(({ medicineUnit, ...rest }) => rest),
                advice: adviceData,
                investigation: investigationData,
                vitals: vitalsData,
                follow_up_date: followUpDate,
                visit_advice: additionalNote,
                medical_history: medicalHistoryData,
                private_notes_id:
                    privateNotesData?.id !== undefined ? privateNotesData?.id : 0,
                consultation_start_datetime: startTime,
                oneclick_cosultation_template_id: oneClickCosultationTemplateId,
                vaccines: {
                    given: givenVaccines,
                    due: updatedDueVaccines,
                },
                moduleContents: (customModuleContents || [])
                    .map((e) => {
                        if (!e) return null;
                        // Filter content based on module version
                        let filteredContent;
                        if (e.module_version === "v2") {
                            // For V2 modules, filter rows with content and remove 'id' field
                            filteredContent =
                                e.content
                                    ?.filter((row) => {
                                        // Check if any field (except 'id') has content
                                        const { id, ...fields } = row || {};
                                        return Object.values(fields).some(
                                            (value) => value && value.toString().trim().length > 0,
                                        );
                                    })
                                    .map((row) => {
                                        // Remove 'id' field from the actual payload
                                        const { id, ...cleanRow } = row || {};
                                        return cleanRow;
                                    }) || [];
                        } else {
                            // For V1 modules, check for title or notes
                            filteredContent = (e.content || []).filter(
                                (e1) => e1.title || e1.notes,
                            );
                        }

                        // Skip modules with no content after filtering
                        if (!filteredContent || filteredContent.length === 0) {
                            return null;
                        }

                        return { ...e, content: filteredContent };
                    })
                    .filter(Boolean),
                pillup_fulfilment: isPillUpAccessableFromGB && pillupSwitch ? 1 : 0,
                labReportID: labReportID,
                zydusSelectedLabParams: zydusSelectedLabParams,
                smart_prescription_filename: finalSmartRxFiles?.map(f => f.name) || [],
                isCustomSSRX: ((finalSmartRxFiles && finalSmartRxFiles.length > 0) || isCustomSSRX) ? "1" : "0",
                custom_ss_data: (() => {

                    // Only send custom_ss_data if:
                    // 1. Files were uploaded (finalSmartRxFiles.length > 0), OR
                    // 2. There's actual canvas content (strokes or text)
                    const hasUploadedFiles = finalSmartRxFiles && finalSmartRxFiles.length > 0;

                    // Check if there's actual canvas content using fresh data
                    let hasCanvasContent = false;
                    if (finalCanvasData) {
                        const hasStrokes = finalCanvasData.strokesByPage &&
                            Object.values(finalCanvasData.strokesByPage).some(strokes =>
                                Array.isArray(strokes) && strokes.length > 0
                            );
                        const hasTextElements = finalCanvasData.textElementsByPage &&
                            Object.values(finalCanvasData.textElementsByPage).some(textElements =>
                                Array.isArray(textElements) && textElements.length > 0 &&
                                textElements.some(el => el.content && el.content.trim().length > 0)
                            );
                        hasCanvasContent = hasStrokes || hasTextElements;
                    }

                    // Don't send custom_ss_data if no files uploaded and no canvas content
                    if (!hasUploadedFiles && !hasCanvasContent) {
                        return null;
                    }

                    // Only send if we have pages metadata
                    if (!finalCanvasData || !finalCanvasData.pagesMetadata || finalCanvasData.pagesMetadata.length === 0) {
                        return null;
                    }

                    const customSSData = {
                            template_id: selectedTemplateId && selectedTemplateId !== 'blank' ? selectedTemplateId : null,
                            template_title: selectedTemplateId && selectedTemplateId !== 'blank' && templates?.length > 0 ? (templates.find(t => t.id === selectedTemplateId)?.title || null) : null,
                            pages: finalCanvasData.pagesMetadata.map((meta, index) => ({
                                page_order: index + 1,
                                page_type: meta.type || 'blank',
                                template_page_index: meta.templateImageIndex !== null && meta.templateImageIndex !== undefined ? meta.templateImageIndex : null
                            }))
                    };

                    return customSSData;
                })(),
            };

            const decodedToken = getDecodedToken();
            const tokenData = decodedToken?.result;
            if (
                tokenData?.hospital_business_id == env.zydus_business_id &&
                isZydusUserAccessableFromGB
            ) {
                sendData["zydus_details"] = {
                    departmentId: patient_data?.departmentId,
                    encounterId: patient_data?.encounterId,
                    mrno: patient_data?.mrno,
                    doctorCode: patient_data?.employeeId,
                    zydusSelectedLabParams: zydusSelectedLabParams,
                };
            }

            const clinic_name = getClinicName(profile?.hospital_data);
            tcmId == 0
                ? window.Moengage.track_event("TP_Consultation_ended", {
                    clinic_name,
                    patient_number: patient_data?.pm_contact_no,
                    patient_id: patient_data?.patient_unique_id,
                    tcm_id: tcmId,
                })
                : window.Moengage.track_event("TP_Consultation_edited", {
                    clinic_name,
                    patient_number: patient_data?.pm_contact_no,
                    patient_id: patient_data?.patient_unique_id,
                    tcm_id: tcmId,
                });

            const caseManagerPromise = tcmId == 0
                ? dispatch(addCaseManager(sendData))
                : dispatch(editCaseManager(sendData));
            let action = await caseManagerPromise;

            if (action.meta.requestStatus === "fulfilled") {

                try {
                    // Ensure care plan is linked to the definitive consultation id
                    const decodedToken = getDecodedToken();
                    const tokenData = decodedToken?.result;
                    const generatedTcmId = action?.payload?.tcm_id ?? tcmId;

                    if (generatedTcmId > 0 && selectedCarePlan) {
                        if (hasExistingCarePlan && selectedCarePlan?.plan_name) {
                            await updateCarePlanName(parseInt(generatedTcmId), selectedCarePlan.plan_name);
                        } else if (
                            !hasExistingCarePlan &&
                            selectedCarePlan?.plan_id &&
                            patient_data?.patient_unique_id &&
                            tokenData?.user_id &&
                            tokenData?.clinic_id
                        ) {
                            await assignCarePlan({
                                plan_id: selectedCarePlan.plan_id,
                                um_id: tokenData.user_id,
                                patient_unique_id: patient_data.patient_unique_id,
                                hm_id: tokenData.clinic_id,
                                tcm_id: parseInt(generatedTcmId),
                            });
                        }
                    }
                } catch (error) {
                    console.error('Care plan sync after submit failed:', error);
                }

                message.open({
                    key: MESSAGE_KEY,
                    type: "",
                    className: "message-appointment",
                    content: (
                        <div className="d-flex align-items-center">
                            <img src={visitEnd} className="me-3" />
                            <div>
                                <div className="title-common text-start fontroboto">{`${patient_data?.pm_first_name}'s visit ended successfully.`}</div>
                                <div className="fontroboto text-start fw-normal mt-1">
                                    View completed visits in finished tab.
                                </div>
                            </div>
                            <img
                                src={imgCloseVisit}
                                className="ms-3"
                                onClick={() => message.destroy()}
                            />
                        </div>
                    ),
                    duration: 5,
                });

                if (tcmId == 0) {
                    await upsertTabRxRx({
                        patient_unique_id: patient_data?.patient_unique_id,
                        tcm_id: action.payload?.tcm_id,
                        pam_id: action.payload?.pam_id,
                    });
                }

                if (isAutofillSelected) {
                    await setAddToRx({
                        _id: symptomCollector?._id,
                        addToRx: true,
                    });
                    dispatch(setSelectAutofill(false));
                }
                // const filesResponse = await getTabRxFiles(action.payload?.tcm_id, patient_data?.patient_unique_id);

                navigate("/tab-rx-prescription", {
                    replace: true,
                    state: {
                        ...action.payload,
                        patient_data: patient_data,
                        page: "tabrx",
                        // smartRxFilesData: canvasFiles.length > 0 ? canvasFiles : smartRxFiles,
                    },
                });
            } else {
                errorMessage(action.error);
            }
        } catch (error) {
            console.error('❌ [TabRxHeaderV2] Error in onEndVisitClick:', error);
            errorMessage('Failed to end visit. Please try again.');
        } finally {
            // Reset loading state
            if (setIsEndVisitLoading) {
                setIsEndVisitLoading(false);
            }
        }
    }

    const checkDataFillOrNot = () => {
        if (
            symptomsData.length > 0 ||
            examinationData.length > 0 ||
            surgeriesData.length > 0 ||
            diagnosisData.length > 0 ||
            medicationData.length > 0 ||
            adviceData.length > 0 ||
            investigationData.length > 0 ||
            vitalsData.length > 0 ||
            medicalHistoryData.length > 0 ||
            privateNotesData ||
            (gynecHistory && Object.keys(gynecHistory).length > 0) ||
            isObstetricDetailsUpdated ||
            labParamsData?.length > 0 ||
            zydusSelectedLabParams?.length > 0 ||
            hasOpthalValues() ||
            hasCustomModuleContent() ||
            followUpDate ||
            additionalNote ||
            givenVaccines?.length > 0 ||
            updatedDueVaccines?.length > 0 ||
            measurements?.length > 0 ||
            selectedCarePlan?.plan_name
        ) {
            showHideBackModal();
        } else {
            if (send_path !== undefined) {
                navigate(-1);
            } else {
                navigate("/", { replace: true });
            }
        }
    };

    //PopOverVideo function
    const showHideVideoListPopover = useCallback(() => {
        setPopOverVideo(!popOverVideo);
    }, [popOverVideo]);

    //Video Componet
    const VIDEO_CONTENT = useCallback(() => {
        return (
            <>
                <div className="video-contant rounded-4 p-20" key="oneclickrx-video">
                    <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
                        <div className="title-common lh-base">Video Tutorial</div>
                        <Button
                            className="btn btn-delete-prescription p-0"
                            onClick={showHideVideoListPopover}
                        >
                            <i className="icon-Cross" />
                        </Button>
                    </div>
                    {videoList
                        ?.filter((e) => e.category_id === 1)[0]
                        ?.video?.map((item1, i1) => {
                            return (
                                <div
                                    key={i1}
                                    className={`d-flex ${i1 !== videoList?.filter((e) => e.category_id === 1)[0]?.video?.length - 1 && "pb-3 mb-15 border-bottom"}`}
                                >
                                    <div className="tutorial-play me-14">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setVideoLink(item1);
                                                const clinic_name = getClinicName(
                                                    profile?.hospital_data,
                                                );
                                                window.Moengage.track_event("TP_Tutorial_Viewed", {
                                                    clinic_name,
                                                    tutorial_type: videoList[0]?.category,
                                                });
                                            }}
                                        >
                                            <img src={playIcons} />
                                        </button>
                                        <span className="tutorial-thumb">
                                            <img src={item1.thumbnail} />
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="title-common text-welcome">
                                            {item1?.tmv_title}
                                        </h3>
                                        <div className="fs-12 fontroboto fw-normal text-main">
                                            {item1?.tmv_description}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </>
        );
    }, [popOverVideo]);
    // Helper function to check if canvas has content
    const checkCanvasContent = () => {
        // First check the prop (reactive state from parent)
        if (hasCanvasContent) return true;

        // Fallback: Try to get fresh canvas data from ref if available
        let currentCanvasData = canvasData;
        if (canvasRef && canvasRef.current) {
            try {
                currentCanvasData = canvasRef.current.getCanvasData();
            } catch (error) {
                // If ref call fails, use prop data
                currentCanvasData = canvasData;
            }
        }

        if (!currentCanvasData) return false;

        // Check if there are any strokes on any page
        const hasStrokes = currentCanvasData.strokesByPage &&
            Object.values(currentCanvasData.strokesByPage).some(strokes =>
                Array.isArray(strokes) && strokes.length > 0
            );

        // Check if there are any text elements on any page
        const hasTextElements = currentCanvasData.textElementsByPage &&
            Object.values(currentCanvasData.textElementsByPage).some(textElements =>
                Array.isArray(textElements) && textElements.length > 0 &&
                textElements.some(el => el.content && el.content.trim().length > 0)
            );

        return hasStrokes || hasTextElements;
    };

    const hasEnteredData = () => {
        return (
            symptomsData.length > 0 ||
            examinationData.length > 0 ||
            surgeriesData.length > 0 ||
            diagnosisData.length > 0 ||
            adviceData.length > 0 ||
            investigationData.length > 0 ||
            medicationData.length > 0 ||
            vitalsData.length > 0 ||
            medicalHistoryData.length > 0 ||
            smartRxFiles?.length > 0 ||
            checkCanvasContent() ||
            privateNotesData ||
            followUpDate ||
            additionalNote ||
            givenVaccines.length > 0 ||
            updatedDueVaccines?.length > 0 ||
            measurements.length > 0 ||
            (gynecHistory && Object.keys(gynecHistory).length > 0) ||
            isObstetricDetailsUpdated ||
            labParamsData?.length > 0 ||
            zydusSelectedLabParams?.length > 0 ||
            customModuleContents?.some((e) => {
                return (
                    e?.content?.length &&
                    e?.content?.some((c) => c.title || c.notes)
                );
            }) ||
            hasOpthalValues() ||
            hasCustomModuleContent()
        );
    };

    return (
        <>
            <div className="tab-rx-header-v2">
                {/* Left Section: Back & Profile */}
                <div className="header-left">
                    <div onClick={checkDataFillOrNot} className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer back-btn-wrapper'>
                        <i className="icon-right"></i>
                    </div>

                    {/* <div
                        onClick={checkDataFillOrNot}
                        className="btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer"
                        style={{ width: "63px" }}
                    >
                        <i className="icon-right"></i>
                    </div> */}
                    <CommonModal
                        isModalOpen={isBackModalOpen}
                        onCancel={showHideBackModal}
                        modalWidth={500}
                        title={"You may lose your data"}
                        modalBody={
                            <>
                                <div className="alert-warning rounded-10px p-2 patient-details">
                                    <div className="d-flex align-items-center">
                                        <img className="me-3" src={alertIcon} alt="Warning" />
                                        <span>
                                            You’ve entered few details that hasn’t been saved
                                            yet. What would you like to do?
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="d-flex align-items-center mt-2 justify-content-end">
                                        <div
                                            onClick={() =>
                                                send_path !== undefined
                                                    ? navigate(-1)
                                                    : navigate("/", { replace: true })
                                            }
                                            className="me-4 text-decoration-underline btn p-0 color-red"
                                        >
                                            Yes, Leave
                                        </div>
                                        <Button
                                            onClick={() => {
                                                showHideBackModal();
                                            }}
                                            className="lh-lg btn btn-primary3 btn-41 px-4"
                                        >
                                            No, Stay
                                        </Button>
                                    </div>
                                </div>
                            </>
                        }
                    />

                    <div className="user-info-container">
                        <ProfilePopover patient_data={patient_data} isPrescriptionPage>
                            {/* <div className="user-info-container">
                    <div className="avatar-ring">
                        {patient_data?.profile_pic ? (
                            <img src={patient_data.profile_pic} alt="Patient Profile" />
                        ) : (
                            <i className="icon-User-1"></i>
                        )}
                </div>
                    <div className="user-details">
                        <div className="user-name-wrapper">
                            <h2 className="user-name">
                                {patient_data?.patient_name || patient_data?.pm_fullname || "Unknown Patient"}
                            </h2>
                            <i className="icon-down-arrow font-10"></i>
                        </div>
                        <p className="user-meta">
                            <span>{patient_data?.gender ? patient_data?.gender.charAt(0).toUpperCase() : (patient_data?.pm_gender ? patient_data?.pm_gender.charAt(0).toUpperCase() : "U")}</span>
                            {((patient_data?.gender || patient_data?.pm_gender) && (patient_data?.age || patient_data?.ageYears)) ? <span className="separator">|</span> : ""}
                            <span>{patient_data?.age ? patient_data?.age + "y" : (patient_data?.ageYears ? patient_data?.ageYears + "y" : "")}</span>
                        </p>
                    </div>
                </div> */}
                        </ProfilePopover>
                    </div>
                </div>

                {/* Right Section: Actions */}
                <div className="header-right">
                    {/* Tutorial / Help */}
                    <Popover
                        open={popOverVideo}
                        onOpenChange={showHideVideoListPopover}
                        content={VIDEO_CONTENT}
                        trigger="click"
                        overlayClassName="pop-430 pp-0 videoTutorial"
                        placement="bottom"
                    >
                        <button className="icon-btn bg-transparent border-0 p-0">
                            <img src={tutorial2} alt="Tutorial" style={{ width: 42, height: 42 }} />
                        </button>
                    </Popover>

                    <div className="divider"></div>

                    {/* Template Selection Dropdown mimic */}
                    {/* {!isMobile ? (
                <Popover
                    open={popOver1}
                    onOpenChange={showHideTemplatesListPopover}
                    content={TEMPLATE_CONTENT_WEB}
                    trigger="click"
                    overlayClassName="pop-350 pp-0"
                    placement="bottom"
                >
                    <button className="icon-btn">
                        <i className="icon-template"></i>
                    </button>
                </Popover>
            ) : (
                <button
                    className="icon-btn"
                    onClick={handleDrawerTemplate}
                >
                    <i className="icon-template"></i>
                </button>
            )} */}

                    {/* Save Template */}
                    {/* {!isMobile ? (
                 <Tooltip
                    placement="bottom"
                    title={
                      hasEnteredData() ? "" : "Please enter some data to save a template"
                    }
                  >
                    <Popover
                      open={popOver2}
                      onOpenChange={() =>
                        hasEnteredData() && showHideSaveTemplatePopOver()
                      }
                      content={SAVE_CONTENT_WEB}
                      trigger="click"
                      overlayClassName="pop-450 pp-0"
                      placement="bottom"
                    >
                        <button className="icon-btn">
                            <i className="icon-save"></i>
                        </button>
                    </Popover>
                 </Tooltip>
            ) : (
                 <Tooltip
                    placement="bottom"
                    title={
                      hasEnteredData() ? "" : "Please enter some data to save a template"
                    }
                  >
                    <button
                        className="icon-btn"
                        onClick={() => hasEnteredData() && handleDrawerSave()}
                    >
                        <i className="icon-save"></i>
                    </button>
                 </Tooltip>
            )} */}

                    {/* Custom Settings Drawer Trigger */}
                    <button
                        className="icon-btn"
                        onClick={handleDrawerCustomize}
                    >
                        <img src={settingsNew} alt="Settings" />
                    </button>

                    <button
                        className="icon-btn"
                        onClick={handleSelectLetterHead}
                    >
                        <img src={notesMultiple} alt="Notes" />
                    </button>

                    {showTeleconsultIcon && (
                        <Tooltip
                            placement="bottom"
                            title={isTeleconsultActive ? "Meeting in progress" : "Tele-Consultation"}
                            destroyTooltipOnHide
                        >
                            <span className={isTeleconsultActive ? "d-inline-block" : ""}>
                                <button
                                    type="button"
                                    className="btn align-items-center justify-content-center d-flex btn-41 teleconsult-video-btn me-20"
                                    onClick={onTeleconsultClick}
                                    disabled={isTeleconsultJoinLoading || isTeleconsultActive}
                                >
                                    {isTeleconsultJoinLoading ? (
                                        <LoadingOutlined style={{ fontSize: 24 }} />
                                    ) : (
                                        <img
                                            src={videoSvg}
                                            alt="Tele-Consultation"
                                            width={26}
                                            height={26}
                                        />
                                    )}
                                </button>
                            </span>
                        </Tooltip>
                    )}

                    <div className="divider"></div>

                    {/* End Visit Logic */}
                    <Tooltip
                        placement="bottom"
                        title={
                            hasEnteredData() ? "" : "Please fill your prescription to end visit."
                        }
                    >
                        <button
                            type="button"
                            className="pill-btn end-visit"
                            onClick={() =>
                                hasEnteredData() && onEndVisitClick()
                            }
                            disabled={loading}
                        >
                            <img src={endIcon} alt="End" /> End
                        </button>
                    </Tooltip>

                    {/* Modals from old header */}
                    {DELETE_MODAL}

                    <Drawer
                        title="One Click Rx Templates"
                        placement="right"
                        onClose={handleDrawerTemplate}
                        open={templateDrawer}
                        className="modalWidth-563"
                        width="auto"
                    >
                        {TEMPLATE_CONTENT_TAB}
                    </Drawer>
                    <Drawer
                        title="Save Template"
                        placement="right"
                        onClose={handleDrawerSave}
                        open={saveDrawer}
                        className="modalWidth-563"
                        width="auto"
                    >
                        {SAVE_CONTENT_TAB}
                    </Drawer>
                    <Drawer
                        placement="right"
                        closeIcon={false}
                        onClose={handleDrawerCustomize}
                        open={customizeDrawer}
                        width="auto"
                    >
                        {CUSTOMIZE_CONTENT_TAB}
                    </Drawer>

                    {videoLink && (
                        <VideoModal
                            videoLink={videoLink}
                            onCancel={() => setVideoLink(null)}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

export default React.memo(TabRxHeaderV2);
