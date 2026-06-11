import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef
} from "react";
import {
  InputNumber,
  Input,
  Button,
  Drawer,
  Tabs,
  Select,
  Card,
  Spin,
  Row,
  Col,
  Form,
  Radio,
  Segmented,
  Tooltip,
  message,
  Switch,
  Tour,
  Popover
} from "antd";
import {
  Button as BSButton,
  ButtonGroup as BSButtonGroup,
} from "react-bootstrap";
import { InfoCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import CommonModal from '../../common/CommonModal';

import CashManagerContext from "../../context/CashManagerContext";

import {
  errorMessage,
  onlyNumberFormat,
  onlyDecimalFormat,
  removeBeforeWhiteSpace,
  isNumeric,
  hasNumber,
  capitalizeAfterSentence,
  capitalize,
  replaceCommasAndSemicolons,
  calculateDose
} from "../../utils/utils";

import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { useFeatureIsOn } from "@growthbook/growthbook-react";

import {
  searchMedication,
  addTemplate,
  updateTemplate,
  deleteTemplate,
  getMedicationTemplates,
  singleTemplateDetails,
  getMedicineDetails,
  getFrequentlySearchedMedication,
  getLoadPreviousRx,
  searchGeneric,
  addMedicine,
  editMedicine,
  updateFrequentlyMedication,
  clearGenericList,
  getAllDoses
} from "../../redux/medicationSlice";

import TabMedicationSearch from "./TabMedicationSearch";
import TabMedicationMoreModal from "./TabMedicationMoreModal";
import { EXTRA_OPTIONS, GB_PILLUP_MEDICINE, MESSAGE_KEY, NEO_NATOLOGISTS_DP_ID } from "../../utils/constants";
import { getDecodedToken } from "../../utils/localStorage";
import { useChikitsalay } from "../../pages/chikitsalay/useChikitsalay";
import { env } from "../../EnvironmentConfig";
import DoseCalculator from "../dose_calculator/doseCalculator";
import { upsertDoctorSettingFlag } from "../../redux/doctorsSlice";
import FreeBadge from "../../common/FreeBadge";
import { ASSETS } from "../../assets";
const {
  alerticon: alertIcon,
  calculator: calculatorIcon,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
  tagNew,
  pillup: Pillup,
  eazydoseLogo: EazyDoseLogo,
  medication: Medicationicon,
} = ASSETS.images;

function TabMedicationBox() {
  const isChikitsalayAccessable = useChikitsalay();
  const renderLowStockBadge = useCallback((med) => {
    if (!isChikitsalayAccessable) return null;
    const available = Number(med?.quantity);
    if (!Number.isFinite(available)) return null;

    let label = null;
    if (available <= 0) {
      label = "No stock";
    } else {
      const required = 200;
      if (available <= required) {
        label = `Qty: ${available}`;
      }
    }

    if (!label) return null;
    const isQtyLabel = label.startsWith("Qty:");
    return (
      <span className={`stock-pill-badge stock-pill-badge-outside ${isQtyLabel ? "stock-pill-badge-qty" : ""}`}>
        {label}
      </span>
    );
  }, [isChikitsalayAccessable]);

  const { profile, frequencyList, timingList, medicineTypeList } = useSelector((state) => state.doctors);
  const {
    dosesList,
    selectedMedicationList,
    parentOptionsList,
    templates,
    genericList,
    loading,
  } = useSelector((state) => state.medication);
  const { todayData } = useSelector((state) => state.vitals);
  const dispatch = useDispatch();

  const { patient_data, medicationData, setMedicationData, pillupSwitch, setPillupSwitch, tcmId } =
    useContext(CashManagerContext);

  const isPillUpAccessableFromGB = useFeatureIsOn(GB_PILLUP_MEDICINE);

  const [parentDrawer, setParentDrawer] = useState(false);
  const [childDrawer, setChildDrawer] = useState(false);
  const [childDrawerData, setChildDrawerData] = useState(null);

  const [templateDrawer, setTemplateDrawer] = useState(false);
  const [allTemplates, setAllTemplates] = useState([]);
  const [matchedTemplates, setMatchedTemplates] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalOpen1, setIsModalOpen1] = useState(false);
  const [removeTemplateId, setRemoveTemplateId] = useState(null);
  const [saveDrawer, setSaveDrawer] = useState(false);

  const [inputTemplateName, setInputTemplateName] = useState(null);
  const TAB_ADD_TEMPLATE = 1;
  const TAB_UPDATE_TEMPLATE = 2;
  const ADD_EDIT_TEMPLATE_TABS = [
    { key: TAB_ADD_TEMPLATE, label: "New Template" },
    { key: TAB_UPDATE_TEMPLATE, label: "Update Template" },
  ];
  const [tabChange, setTabChange] = useState(TAB_ADD_TEMPLATE);
  const [tourOpen, setTourOpen] = useState(false);
  const [popOver3, setPopOver3] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const SINCE_OPTIONS = [
    { value: "Day(s)", label: "D" },
    { value: "Week(s)", label: "W" },
    { value: "Month(s)", label: "M" },
    { value: "Year(s)", label: "Y" },
  ];
  const [sinceValue, setSinceValue] = useState(1);
  const [inputSince, setInputSince] = useState("");
  const [sinceOptions, setSinceOptions] = useState([]);

  const [selectedTab, setSelectedTab] = useState(null);
  const [timingMoreOptionsVisible, setTimingMoreOptionsVisible] = useState(false);
  const [frequencyMoreOptionsVisible, setFrequencyMoreOptionsVisible] = useState(false);
  const [durationMoreOptionsVisible, setDurationMoreOptionsVisible] = useState(false);

  const [parentSearchOptions, setParentSearchOptions] = useState([]);

  //Add Custom
  const [addCustom, setAddCustom] = useState(null);
  const [medicineTypeMoreOptionsVisible, setMedicineTypeMoreOptionsVisible] = useState(false);
  const [genericDrawer, setGenericDrawer] = useState(false);
  const [genericQuery, setGenericQuery] = useState('');

  //Dose Calculator
  const [activeTab, setActiveTab] = useState("1");
  const [doseCalculatorDrawer, setDoseCalculatorDrawer] = useState(false);
  const [searchMLQuery, setSearchMLQuery] = useState("");
  const [medicationLibrary, setMedicationLibrary] = useState([]);
  const [editDoseId, setEditDoseId] = useState(0);
  const [isModalOpen2, setIsModalOpen2] = useState(false);

  const handleViewDoseCalcDrawer = (value) => {
    setDoseCalculatorDrawer(!doseCalculatorDrawer)
    setActiveTab(typeof value == 'string' ? value : '1')
    setSearchMLQuery("")
    setMedicationLibrary([])
    setAddCustom(null)
  }

  //Taper Dose
  const [childIndex, setChildIndex] = useState(null);
  const [activeKey, setActiveKey] = useState(null);

  const filteredTitles = frequencyList.filter((item) => item.tmf_block !== 0);

  // useEffect(() => {
  //   const onEditPreFillMedicationData = () => {
  //     const updatedData = medicationData.map((e) => {
  //       const medicineUnit = e?.medicineUnit.map((e1) => {
  //         return {
  //           key: JSON.stringify({ ...e1 }),
  //           value: e1.tmu_id,
  //           label: <>{e1.tmu_title}</>,
  //         };
  //       });

  //       const unitObj = medicineUnit
  //         ? medicineUnit.find((x) => x.value == e.tmm_unit)
  //         : null;
  //       const frequencyObj = frequencyList.find(
  //         (x) => x.tmf_id == e.tmm_freq_type
  //       );
  //       const timingObj = timingList.find((x) => x.tmt_id == e.tmm_time);

  //       return {
  //         ...e,
  //         tmm_unit_name:
  //           unitObj && unitObj !== undefined
  //             ? JSON.parse(unitObj.key).tmu_title
  //             : "",
  //         tmm_freq_type_name:
  //           frequencyObj !== undefined ? frequencyObj.tmf_title : "",
  //         tmm_time_name: timingObj !== undefined ? timingObj.tmt_title : "",
  //         medicineUnit: medicineUnit,
  //         tmm_days_duration_type: EXTRA_OPTIONS.some((x) => x.value == e.tmm_duration_type) ? e.tmm_duration_type : e.tmm_days ? `${e.tmm_days} ${e.tmm_duration_type}` : "",
  //         unique_id: uuidv4(),
  //       };
  //     });
  //     setMedicationData([...updatedData]);
  //   };
  //   medicationData.length > 0 && onEditPreFillMedicationData()
  // }, []);

  useEffect(() => {
    dispatch(getMedicationTemplates());
    dispatch(getAllDoses())
    dispatch(getFrequentlySearchedMedication({ isChikitsalayAccessable }));
  }, []);

  //Parent AutoComplete
  useEffect(() => {
    if (searchMLQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(
          searchMedication({
            searchQuery: searchMLQuery,
            type: "parent",
            isChikitsalayAccessable,
          })
        );
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    } else {
      dispatch(getFrequentlySearchedMedication({ isChikitsalayAccessable }));
    }
  }, [doseCalculatorDrawer, isChikitsalayAccessable, searchMLQuery]);

  useEffect(() => {
    const data = [];
    parentOptionsList.map((e) => {
      return data.push({
        key: JSON.stringify({ ...e, unique_id: uuidv4() }),
        value: e.tmm_medicine_name,
        label: <div><span className="fw-medium">{e.tmm_medicine_name}</span>, <span>{e.tmm_generic}</span>{renderLowStockBadge(e)}</div>,
      });
    });
    if (doseCalculatorDrawer) {
      if (searchMLQuery.length == 0) {
        data.unshift({
          key: -1,
          label: (
            <>
              <div>FREQUENTLY USED</div>
            </>
          ),
        });
      } else {
        searchMLQuery &&
          data.push({
            key: JSON.stringify({
              unique_id: uuidv4(),
              tmm_id: 0,
              tmm_medicine_name: searchMLQuery
            }),
            value: `${searchMLQuery}${Math.random()}`,
            label: (
              <>
                <div className="text-primary fontroboto fs-16"> <i className="icon-Add mx-1 fs-6"></i> Add <span className="fw-medium fontroboto text-primary">"{searchMLQuery}"</span> <a className="text-primary fontroboto">as a new medicine</a></div>
              </>
            ),
          });
      }
    }
    setParentSearchOptions(data);
  }, [doseCalculatorDrawer, parentOptionsList, renderLowStockBadge]);

  const onSearchParent = useCallback(
    (query) => {
      doseCalculatorDrawer && setSearchMLQuery(query)
    },
    [doseCalculatorDrawer, searchMLQuery]
  );

  useEffect(() => {
    setMatchedTemplates(templates);
    setAllTemplates(templates);
  }, [templates]);

  const innerMedication = (index) => {
    const mainArray = []
    for (var i = index; i < medicationData.length; i++) {
      if (medicationData[i].tmm_id == medicationData[index].tmm_id) {
        mainArray.push(medicationData[i])
      } else {
        break;
      }
    }
    return mainArray
  }

  const onRemoveRow = async (index, data = []) => {
    const childData = await innerMedication(index)
    childData.map((e) => {
      const mainIndex = medicationData.findIndex(x => x.unique_id == e.unique_id);
      if (mainIndex != -1) {
        medicationData.splice(mainIndex, 1)
      }
    })
    if (data?.length > 0) {
      medicationData.splice(selectedIndex, 0, ...data)
    }
    setMedicationData((prev) => [...prev]);
    setSelectedIndex(null);
  };

  // Handle Parent Drawer
  const handleDrawerParent = useCallback(() => {
    setParentDrawer(!parentDrawer);
  }, [parentDrawer]);

  const onParentSelectParent = async (data, item) => {
    onSelectParent({ ...JSON.parse(item.key) })
  }

  const onSelectParent = async (item) => {
    if (item.tmm_id === 0) {
      setAddCustom(item);
    } else {
      window.Moengage.track_event("medicine_select", {
        "value": item.tmm_medicine_name
      });

      if (doseCalculatorDrawer) {
        const medicineExists = medicationLibrary.some((med) => med.tmm_id == item.tmm_id);

        if (medicineExists) {
          message.open({
            key: MESSAGE_KEY,
            type: '',
            className: 'message-appointment',
            content: (
              <div className='d-flex align-items-center'>
                <InfoCircleOutlined className="fs-21 me-2 circle-outlined-custom" />
                <div>
                  <div className='text-start fs-18 fontroboto'>This medicine is already added. You can't add it again</div>
                </div>
                <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
              </div>
            ),
            duration: 3,
          });
          return;
        }
      }

      const action = await dispatch(getMedicineDetails(item.tmm_id));
      if (action.meta.requestStatus === "fulfilled") {
        const updatedData = action.payload.map((e) => {
          const medicineUnit = e?.medicineUnit.map((e1) => {
            return {
              key: JSON.stringify({ ...e1 }),
              value: e1.tmu_id,
              label: <>{e1.tmu_title}</>,
            };
          });

          const unitObj = medicineUnit ? medicineUnit.find((x) => x.value == e.tmm_unit) : null;
          const frequencyObj = frequencyList.find((x) => x.tmf_id == e.tmm_freq_type);
          const timingObj = timingList.find((x) => x.tmt_id == e.tmm_time);

          let doseCalData = {}
          const objDose = dosesList.find((e1) => e1.medicine_id == e.tmm_id)
          if (objDose !== undefined) {
            const dose = calculateDose(objDose?.dosage, todayData?.weight, objDose?.concentration, e?.tmm_type)
            doseCalData['tmm_dosage_unit_name'] = `${dose ? `${dose} ${unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_title : ""}` : ""}`;
            doseCalData['tmm_dosage'] = dose ? dose : "";
            doseCalData['tmm_unit_name'] = unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_title : "";
            doseCalData['tmm_unit'] = unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_id : "";
            doseCalData['tmu_id'] = unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_id : "";
          } else {
            doseCalData['tmm_dosage_unit_name'] = `${e.tmm_dosage ? `${e.tmm_dosage} ${unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_title : ""}` : ""}`;
            doseCalData['tmm_unit_name'] = unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_title : "";
          }

          return {
            ...e,
            objectID: item.objectID,
            quantity: item.quantity,
            tmm_hm_type: e.tmm_hm_type ?? item.tmm_hm_type,
            um_id: e.um_id ?? item.um_id,
            // tmm_unit_name: unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_title : "",
            tmm_freq_type_name:
              frequencyObj !== undefined ? frequencyObj.tmf_title : "",
            tmf_block_val:
              frequencyObj !== undefined ? frequencyObj.tmf_block_val : "",
            tmm_time_name: timingObj !== undefined ? timingObj.tmt_title : "",
            medicineUnit: medicineUnit,
            // tmm_dosage_unit_name: `${e.tmm_dosage ? `${e.tmm_dosage} ${unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_title : ""}` : ""}`,
            tmm_days_duration_type: EXTRA_OPTIONS.some((x) => x.value == e.tmm_duration_type) ? e.tmm_duration_type : e.tmm_days ? `${e.tmm_days} ${e.tmm_duration_type}` : "",
            unique_id: uuidv4(),
            ...doseCalData
          };
        });
        if (doseCalculatorDrawer) {
          const modifyData = updatedData[0]
          const objDose = dosesList.find((e1) => e1.medicine_id == modifyData.tmm_id)
          medicationLibrary.push({
            ...modifyData,
            tmm_dosage_unit_name: "",
            tmm_dosage: '',
            tmm_unit: 0,
            tmm_unit_name: '',
            tmu_id: 0,
            id: objDose !== undefined ? objDose?.id : "",
            medicine_id: modifyData.tmm_id,
            dosage: objDose !== undefined ? objDose?.dosage : "",
            dosage_unit: "mg/kg/dose",
            concentration: objDose !== undefined ? objDose?.concentration : "",
            concentration_unit: "mg/ml",
            medicine_name: modifyData.tmm_medicine_name,
            medicine_generic_name: modifyData.tmm_generic,
            exist: dosesList.some((e1) => e1.medicine_id == modifyData.tmm_id) ? true : false
          });
          setMedicationLibrary((prev) => [...prev]);
          setSearchMLQuery("");
          setAddCustom(null);
        } else {
          medicationData.push({
            ...updatedData[0],
          });
          setMedicationData((prev) => [...prev]);
          setSelectedIndex(medicationData.length - 1);
          handleDrawerParent();
        }
      } else {
        errorMessage(action.error)
      }
    }
  };

  // const innerMedication = (index) => {
  //   const mainArray = []
  //   for (var i = index; i < medicationData.length; i++) {
  //     if (medicationData[i].tmm_id == medicationData[index].tmm_id) {
  //       mainArray.push(medicationData[i])
  //     } else {
  //       break;
  //     }
  //   }
  //   return mainArray
  // }

  // Handle Child Drawer
  const handleDrawerChild = (data, index) => {
    setChildDrawer(!childDrawer);
    setChildDrawerData(data);
    if (data && data?.length > 0) {
      if (data[0]?.tmf_block > 0) {
        setSelectedTab("other");
      } else {
        if (data[0]?.tcm_tmm_freq_evening) {
          setSelectedTab("mean");
        } else {
          setSelectedTab("man");
        }
      }
    }
    setSinceValue(data && data?.length > 0 && data[0].tmm_days ? parseInt(data[0].tmm_days) : 1);
    setSelectedIndex(index);
    setChildIndex(data && data?.length > 0 ? 0 : null)
    setActiveKey(data && data?.length > 0 ? data[0].unique_id : null)
    setAddCustom(null);
  }

  const mainMedicationSelect = async (index) => {
    const childData = await innerMedication(index)
    handleDrawerChild(childData, index)
  }

  // Handle Template Drawer
  const handleDrawerTemplate = useCallback(() => {
    setTemplateDrawer(!templateDrawer);
  }, [templateDrawer]);

  // Handle Save Drawer
  const handleDrawerSave = useCallback(() => {
    setInputTemplateName(null);
    setSaveDrawer(!saveDrawer);
  }, [saveDrawer]);

  const onTabChange = useCallback(
    (key) => {
      setInputTemplateName(null);
      setTabChange(key);
    },
    [tabChange]
  );

  const onSearch = (e) => {
    const searchQuery = e.target.value;
    if (searchQuery) {
      let filteredTemplates = templates.filter((template) => {
        return template.tmtd_template_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      });
      setMatchedTemplates(filteredTemplates);
    } else {
      setMatchedTemplates(templates);
    }
  };

  const loadPreviousRxClick = async () => {
    var sendData = {
      patient_unique_id:
        patient_data !== undefined ? patient_data.patient_unique_id : 0,
      tcm_id: tcmId,
    };
    const action = await dispatch(getLoadPreviousRx(sendData));
    if (action.meta.requestStatus === "fulfilled") {
      const updatedData = action.payload.map((e) => {
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
          (x) => x.tmf_id == e.tmm_freq_type
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
          tmm_time_name: timingObj !== undefined ? timingObj.tmt_title : "",
          medicineUnit: medicineUnit,
          tmm_days_duration_type: EXTRA_OPTIONS.some((x) => x.value == e.tmm_duration_type) ? e.tmm_duration_type : e.tmm_days ? `${e.tmm_days} ${e.tmm_duration_type}` : "",
          unique_id: uuidv4(),
        };
      });
      setMedicationData([...medicationData, ...updatedData]);
    } else {
      errorMessage(action.error)
    }
  };

  const onTemplateSelected = async (tmtd_id) => {
    window.Moengage.track_event("medication_template_used", {
      "template_name": tmtd_id.tmtd_template_name
    });
    const action = await dispatch(singleTemplateDetails(tmtd_id));
    if (action.meta.requestStatus === "fulfilled") {
      const updatedData = action.payload.map((e) => {
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
          (x) => x.tmf_id == e.tmm_freq_type
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
          tmm_time_name: timingObj !== undefined ? timingObj.tmt_title : "",
          medicineUnit: medicineUnit,
          tmm_days_duration_type: EXTRA_OPTIONS.some((x) => x.value == e.tmm_duration_type) ? e.tmm_duration_type : e.tmm_days ? `${e.tmm_days} ${e.tmm_duration_type}` : "",
          unique_id: uuidv4(),
        };
      });
      setMedicationData([...medicationData, ...updatedData]);
      handleDrawerTemplate();
    } else {
      errorMessage(action.error)
    }
  };

  const onDeleteTemplateClicked = async (tmtd_id) => {
    const action = await dispatch(deleteTemplate(tmtd_id));
    if (action.meta.requestStatus === "rejected") {
      errorMessage(action.error)
    }
  };

  const onChangeSaveTemplate = useCallback(
    (e) => {
      const updateQuery = removeBeforeWhiteSpace(e.target.value);
      setInputTemplateName(updateQuery);
    },
    [inputTemplateName]
  );

  const onAddTemplateClicked = async () => {
    if (medicationData.length === 0) {
      errorMessage("At least 1 medication added")
    } else if (
      medicationData.filter((e) => e.tmm_medicine_name == "").length > 0
    ) {
      errorMessage("Please fillup medication name")
    } else {
      var sendData = {
        tmtd_template_name: inputTemplateName,
        data: medicationData,
      };
      const action = await dispatch(addTemplate(sendData));
      if (action.meta.requestStatus === "fulfilled") {
        setInputTemplateName(null);
        handleDrawerSave();
      }
    }
  };

  const onSearchTemplate = useCallback(() => {
    setInputTemplateName(null);
  }, [inputTemplateName]);

  const onSelectTemplate = useCallback(
    (data, e) => {
      setInputTemplateName(e.key);
    },
    [inputTemplateName]
  );

  const onUpdateTemplateClicked = async () => {
    if (medicationData.length === 0) {
      errorMessage("At least 1 medication added")
    } else if (
      medicationData.filter((e) => e.tmm_medicine_name == "").length > 0
    ) {
      errorMessage("Please fillup medication name")
    } else {
      var data = JSON.parse(inputTemplateName);
      var sendData = {
        tmtd_id: data.tmtd_id,
        tmtd_template_name: data.tmtd_template_name,
        data: medicationData,
      };
      const action = await dispatch(updateTemplate(sendData));
      if (action.meta.requestStatus === "fulfilled") {
        setInputTemplateName(null);
        handleDrawerSave();
      }
    }
  };

  const showHideModal = useCallback((template_id) => {
    template_id !== undefined ? setRemoveTemplateId(template_id) : setRemoveTemplateId(null)
    setIsModalOpen(!isModalOpen);
  }, [isModalOpen]);

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
                <img className='me-3' src={alertIcon} alt="Warning" />
                <span>
                  Are you sure you want to delete this template?
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div onClick={() => {
                  onDeleteTemplateClicked(removeTemplateId)
                  showHideModal()
                }}
                  className="me-4 text-decoration-underline btn p-0 text-main">
                  Yes Delete
                </div>
                <Button onClick={showHideModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                  <span>No</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    );
  }, [isModalOpen]);

  const SortableItem = SortableElement(({ item }) => {
    let tmm_freq_type_name = `${item.tmm_dosage && item.tmm_unit_name ? `${item.tmm_dosage} ${item.tmm_unit_name}` + " | " : ""}${item.tcm_tmm_freq_morning ? item.tcm_tmm_freq_morning + " - " : "0 -"}${item.tcm_tmm_freq_afternoon ? item.tcm_tmm_freq_afternoon + " - " : "0 -"}${item.tcm_tmm_freq_evening ? item.tcm_tmm_freq_evening + " - " : selectedTab != 'man' ? "0 -" : ""}${item.tcm_tmm_freq_night ? item.tcm_tmm_freq_night + " | " : "0 |"}${item.tmm_time_name ? item.tmm_time_name : ""}`
    tmm_freq_type_name = tmm_freq_type_name === `0 -0 -0 -0 |None` || tmm_freq_type_name === `0 -0 -0 |None` ? "" : tmm_freq_type_name;
    const hmType = item?.tmm_hm_type ?? item?.hm_type;
    const showVC = hmType == 15 && Number(item?.um_id) === 0 && isChikitsalayAccessable;
    const available = Number(item?.quantity);
    const selectedChipStockLabel = Number.isFinite(available)
      ? available <= 0
        ? "No stock"
        : available <= 200
          ? `Qty: ${available}`
          : ""
      : "";
    const isQtyLabel = selectedChipStockLabel.startsWith("Qty:");

    return (
    <div
      style={{
        width:
          item.tmm_medicine_name.length > 12 &&
            item.tmm_medicine_name.length < 24
            ? `${item.tmm_medicine_name.length * 10.5}px`
            : item.tmm_medicine_name.length >= 24
              ? "256px"
              : "150px",
      }}
      className="position-relative d-flex align-items-center justify-content-between closable-chips closable-chips-active"
    >
      <div
        className="text-truncate p-2"
        onClick={() => mainMedicationSelect(item?.index)}>
        <div>
          <div className="d-flex align-items-center gap-1">
            <span className="chip-text text-truncate">{item.tmm_medicine_name}</span>
            {selectedChipStockLabel && (
              <span
                className="flex-shrink-0"
                style={{
                  marginLeft: 4,
                  padding: "1px 7px",
                  borderRadius: 7,
                  background: isQtyLabel ? "#FC5A5A" : "#ED8A00",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                  lineHeight: "13px",
                  display: "inline-flex",
                  alignItems: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {selectedChipStockLabel}
              </span>
            )}
          </div>
          {innerMedication(item?.index)?.length > 1 ? (
            <div className="text-truncate small">Taper Dose</div>
          ) : (
            (item.tmm_dosage || item.tmm_unit_name) ? (
              isNumeric(item.tmf_block) && item.tmf_block == 0 ? (
                <div className="text-truncate small">{tmm_freq_type_name}</div>
              ) : (
                <div className="text-truncate small">{`
                        ${item.tmm_dosage && item.tmm_unit_name ? `${item.tmm_dosage} ${item.tmm_unit_name}` + " | " : ""}
                        ${item.tmm_freq_type_name ? item.tmm_freq_type_name + " | " : ""}
                        ${item.tmm_time_name ? item.tmm_time_name : ""}
                        `}</div>
              )
            ) : (
              <div className="text-truncate small">Note</div>
            )
          )}
        </div>
      </div>
      {showVC && (
        <span
          className="position-absolute align-items-center small fs-12-1 d-inline-flex justify-content-center rounded-pill text-white chip-vc-badge"
          style={{ minWidth: 24, height: 18, padding: "0 5px", lineHeight: "16px", background: "#c44ea2", right: 36, top: -6 }}
        >
          VC
        </span>
      )}
      <Button
        type="text"
        className="rounded-0 btn-close-chips"
        onClick={() => onRemoveRow(item?.index)}
      >
        <i className="icon-Cross"></i>
      </Button>
    </div>
  )});

  const SortableList = SortableContainer(({ items }) => {
    return (
      <div className="d-flex flex-wrap">
        {medicationData.map((e, index) => ({ ...e, index: index })).reduce((acc, curr) => acc?.at(-1)?.tmm_id == curr.tmm_id ? acc : [...acc, curr], []).map((item, index) => (
          <SortableItem
            key={`item-${index}`}
            index={index}
            item={{ ...item }}
          />
        ))}
      </div>
    );
  });

  const TABLE_MEDICATION = useMemo(() => {
    return (
      medicationData.length > 0 && (
        <SortableList
          items={medicationData}
          onSortEnd={async ({ oldIndex, newIndex }) => {

            const result = Array.from(medicationData);

            const findMedicationIndex = medicationData.map((e, index) => ({ ...e, index: index })).reduce((acc, curr) => acc?.at(-1)?.tmm_id == curr.tmm_id ? acc : [...acc, curr], [])

            const array = await innerMedication(findMedicationIndex[oldIndex].index)
            const array1 = await innerMedication(findMedicationIndex[newIndex].index)

            const removedArray = result.filter(item => !array.some((x) => x.unique_id === item.unique_id));

            if (findMedicationIndex[oldIndex].index > findMedicationIndex[newIndex].index) {
              const dragIndex = removedArray.findIndex(x => x.unique_id == array1.at(0).unique_id)
              removedArray.splice(dragIndex, 0, ...array)
            }
            else {
              const dragIndex = removedArray.findIndex(x => x.unique_id == array1.at(-1).unique_id)
              removedArray.splice(dragIndex + 1, 0, ...array)
            }

            setMedicationData(removedArray);
          }}
          axis="xy"
          pressDelay={150}
        />
      )
    );
  }, [medicationData, childDrawerData, selectedTab]);

  // const TABLE_MEDICATION = useMemo(() => {
  //   return (
  //     medicationData.length > 0 &&
  //     medicationData.map((e, index) => ({ ...e, index: index })).reduce((acc, curr) => acc?.at(-1)?.tmm_id == curr.tmm_id ? acc : [...acc, curr], []).map((item, index) => {
  //       return (
  //         <div
  //           key={index}
  //           style={{
  //             width:
  //               item.tmm_medicine_name.length > 12 &&
  //                 item.tmm_medicine_name.length < 24
  //                 ? `${item.tmm_medicine_name.length * 10.5}px`
  //                 : item.tmm_medicine_name.length >= 24
  //                   ? "256px"
  //                   : "150px",
  //           }}
  //           className="d-flex align-items-center justify-content-between text-truncate closable-chips closable-chips-active"
  //         >
  //           <div
  //             className="text-truncate p-2"
  //             onClick={() => mainMedicationSelect(item?.index)}>
  //             <div className="text-truncate">
  //               {item.tmm_medicine_name}
  //               {innerMedication(item?.index)?.length > 1 ? (
  //                 <div className="text-truncate small">Taper Dose</div>
  //               ) : (
  //                 (item.tmm_dosage || item.tmm_unit_name) ? (
  //                   isNumeric(item.tmf_block) && item.tmf_block == 0 ? (
  //                     <div className="text-truncate small">{`
  //                     ${item.tmm_dosage && item.tmm_unit_name ? `${item.tmm_dosage} ${item.tmm_unit_name}` + " | " : ""}
  //                     ${item.tcm_tmm_freq_morning ? item.tcm_tmm_freq_morning + " - " : "0 -"}
  //                     ${item.tcm_tmm_freq_afternoon ? item.tcm_tmm_freq_afternoon + " - " : "0 -"}
  //                     ${item.tcm_tmm_freq_evening ? item.tcm_tmm_freq_evening + " - " : selectedTab != 'man' ? "0 -" : ""}
  //                     ${item.tcm_tmm_freq_night ? item.tcm_tmm_freq_night + " | " : "0 |"}
  //                     ${item.tmm_time_name ? item.tmm_time_name : ""}`}</div>
  //                   ) : (
  //                     <div className="text-truncate small">{`
  //                       ${item.tmm_dosage && item.tmm_unit_name ? `${item.tmm_dosage} ${item.tmm_unit_name}` + " | " : ""}
  //                       ${item.tmm_freq_type_name ? item.tmm_freq_type_name + " | " : ""}
  //                       ${item.tmm_time_name ? item.tmm_time_name : ""}
  //                       `}</div>
  //                   )
  //                 ) : (
  //                   <div className="text-truncate small">Note</div>
  //                 )
  //               )}
  //             </div>
  //           </div>
  //           <Button
  //             type="text"
  //             className="rounded-0 btn-close-chips"
  //             onClick={() => onRemoveRow(item?.index)}
  //           >
  //             <i className="icon-Cross"></i>
  //           </Button>
  //         </div>
  //       );
  //     })
  //   );
  // }, [medicationData, childDrawerData, selectedTab]);

  //Template Componet
  const TEMPLATE_CONTENT = useMemo(() => {
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
                      onClick={() => onTemplateSelected(template.tmtd_id)}
                    >
                      <div className="round-box">
                        <i className="icon-template"></i>
                      </div>
                      <div className="text-truncate w-100">
                        <div className="title text-main2">{template.tmtd_template_name}</div>
                        <div className="text-truncate">{template.medicine_name}</div>
                      </div>
                    </div>
                    <Button
                      className="btn btn-delete-prescription p-0 ms-3"
                      onClick={() => showHideModal(template.tmtd_id)}
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

  //Save Componet
  const SAVE_CONTENT = useMemo(() => {
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
              value={inputTemplateName && JSON.parse(inputTemplateName).tmtd_template_name}
              className="autocomplete-custom w-100 popinput inputheight41"
              placeholder="Select Template"
              onSearch={onSearchTemplate}
              onSelect={onSelectTemplate}
              optionLabelProp="label"
              options={allTemplates.map((template) => {
                return {
                  key: JSON.stringify(template),
                  value: template.tmtd_template_name,
                  label: (
                    <div key={template.tmtd_id}>
                      {template.tmtd_template_name}
                    </div>
                  ),
                };
              })}
              optionRender={(option) => (
                <div className="align-items-center d-flex text-truncate w-100">
                  <div className="round-box"><i className="icon-template"></i></div>
                  <div className="text-truncate w-100">
                    <div className="title text-main2">{option.data.value}</div>
                    <div className="text-truncate">{JSON.parse(option.data.key).medicine_name}</div>
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

  const onChangeDosageChild = useCallback(
    (e) => {
      const updateQuery = onlyDecimalFormat(e.target.value);
      childDrawerData[childIndex].tmm_dosage = updateQuery;
      setChildDrawerData((prev) => [...prev]);
    },
    [childIndex, childDrawerData]
  );

  const onSelectMedicineUnitChild = useCallback(
    (data) => {
      const obj = childDrawerData[childIndex].medicineUnit
        ? childDrawerData[childIndex].medicineUnit.find(
          (e) => e.value == data
        )
        : null;
      if (obj && obj !== undefined) {
        const objParse = JSON.parse(obj.key);
        childDrawerData[childIndex].tmm_unit = objParse.tmu_id;
        childDrawerData[childIndex].tmm_unit_name = objParse.tmu_title;
        childDrawerData[childIndex].tmu_id = objParse.tmu_id;
        setChildDrawerData((prev) => [...prev]);
      }
    },
    [childIndex, childDrawerData]
  );

  const morningDecrement = useCallback(() => {
    if (parseInt(childDrawerData[childIndex].tcm_tmm_freq_morning) > 0) {
      childDrawerData[childIndex].tcm_tmm_freq_morning =
        parseInt(childDrawerData[childIndex].tcm_tmm_freq_morning) - 1;
      setChildDrawerData((prev) => [...prev]);
    }
  }, [childIndex, childDrawerData]);

  const morningClick = useCallback(() => {
    childDrawerData[childIndex].tcm_tmm_freq_morning = 1;
    setChildDrawerData((prev) => [...prev]);
  }, [childIndex, childDrawerData]);

  const onChangeInputMorningChild = useCallback(
    (e) => {
      const updateQuery = onlyDecimalFormat(e.target.value);
      childDrawerData[childIndex].tcm_tmm_freq_morning = updateQuery;
      setChildDrawerData((prev) => [...prev]);
    },
    [childIndex, childDrawerData]
  );

  const morningIncrement = useCallback(() => {
    childDrawerData[childIndex].tcm_tmm_freq_morning =
      parseInt(childDrawerData[childIndex].tcm_tmm_freq_morning) + 1;
    setChildDrawerData((prev) => [...prev]);
  }, [childIndex, childDrawerData]);

  const afternoonDecrement = useCallback(() => {
    if (parseInt(childDrawerData[childIndex].tcm_tmm_freq_afternoon) > 0) {
      childDrawerData[childIndex].tcm_tmm_freq_afternoon =
        parseInt(childDrawerData[childIndex].tcm_tmm_freq_afternoon) - 1;
      setChildDrawerData((prev) => [...prev]);
    }
  }, [childIndex, childDrawerData]);

  const afternoonClick = useCallback(() => {
    childDrawerData[childIndex].tcm_tmm_freq_afternoon = 1;
    setChildDrawerData((prev) => [...prev]);
  }, [childIndex, childDrawerData]);

  const onChangeInputAfternoonChild = useCallback(
    (e) => {
      const updateQuery = onlyDecimalFormat(e.target.value);
      childDrawerData[childIndex].tcm_tmm_freq_afternoon = updateQuery;
      setChildDrawerData((prev) => [...prev]);
    },
    [childIndex, childDrawerData]
  );

  const afternoonIncrement = useCallback(() => {
    childDrawerData[childIndex].tcm_tmm_freq_afternoon =
      parseInt(childDrawerData[childIndex].tcm_tmm_freq_afternoon) + 1;
    setChildDrawerData((prev) => [...prev]);
  }, [childIndex, childDrawerData]);

  const eveningDecrement = useCallback(() => {
    if (parseInt(childDrawerData[childIndex].tcm_tmm_freq_evening) > 0) {
      childDrawerData[childIndex].tcm_tmm_freq_evening =
        parseInt(childDrawerData[childIndex].tcm_tmm_freq_evening) - 1;
      setChildDrawerData((prev) => [...prev]);
    }
  }, [childIndex, childDrawerData]);

  const eveningClick = useCallback(() => {
    childDrawerData[childIndex].tcm_tmm_freq_evening = 1;
    setChildDrawerData((prev) => [...prev]);
  }, [childIndex, childDrawerData]);

  const onChangeInputEveningChild = useCallback(
    (e) => {
      const updateQuery = onlyDecimalFormat(e.target.value);
      childDrawerData[childIndex].tcm_tmm_freq_evening = updateQuery;
      setChildDrawerData((prev) => [...prev]);
    },
    [childIndex, childDrawerData]
  );

  const eveningIncrement = useCallback(() => {
    childDrawerData[childIndex].tcm_tmm_freq_evening =
      parseInt(childDrawerData[childIndex].tcm_tmm_freq_evening) + 1;
    setChildDrawerData((prev) => [...prev]);
  }, [childIndex, childDrawerData]);

  const nightDecrement = useCallback(() => {
    if (parseInt(childDrawerData[childIndex].tcm_tmm_freq_night) > 0) {
      childDrawerData[childIndex].tcm_tmm_freq_night =
        parseInt(childDrawerData[childIndex].tcm_tmm_freq_night) - 1;
      setChildDrawerData((prev) => [...prev]);
    }
  }, [childIndex, childDrawerData]);

  const nightClick = useCallback(() => {
    childDrawerData[childIndex].tcm_tmm_freq_night = 1;
    setChildDrawerData((prev) => [...prev]);
  }, [childIndex, childDrawerData]);

  const onChangeInputNightChild = useCallback(
    (e) => {
      const updateQuery = onlyDecimalFormat(e.target.value);
      childDrawerData[childIndex].tcm_tmm_freq_night = updateQuery;
      setChildDrawerData((prev) => [...prev]);
    },
    [childIndex, childDrawerData]
  );

  const nightIncrement = useCallback(() => {
    childDrawerData[childIndex].tcm_tmm_freq_night =
      parseInt(childDrawerData[childIndex].tcm_tmm_freq_night) + 1;
    setChildDrawerData((prev) => [...prev]);
  }, [childIndex, childDrawerData]);

  const handleRadioChange = useCallback(
    (e) => {
      setSelectedTab(e.target.value);
      if (e.target.value !== "other") {
        childDrawerData[childIndex].tmf_block = 0;
      } else {
        childDrawerData[childIndex].tmf_block = 1;
      }
      childDrawerData[childIndex].tmm_freq_type = 0;
      childDrawerData[childIndex].tmm_freq_type_name = "";
      childDrawerData[childIndex].tcm_tmm_freq_afternoon = 0;
      childDrawerData[childIndex].tcm_tmm_freq_evening = 0;
      childDrawerData[childIndex].tcm_tmm_freq_morning = 0;
      childDrawerData[childIndex].tcm_tmm_freq_night = 0;
      setChildDrawerData((prev) => [...prev]);
    },
    [selectedTab, childDrawerData]
  );

  const onChangeFrequencyChild = useCallback(
    (item) => {
      if (item.tmf_id != childDrawerData[childIndex].tmm_freq_type) {
        childDrawerData[childIndex].tmm_freq_type = item.tmf_id;
        childDrawerData[childIndex].tmm_freq_type_name = item.tmf_title;
        childDrawerData[childIndex].tmf_block_val = item.tmf_block_val;
      } else {
        childDrawerData[childIndex].tmm_freq_type = 0;
        childDrawerData[childIndex].tmm_freq_type_name = "";
        childDrawerData[childIndex].tmf_block_val = "";
      }
      setChildDrawerData((prev) => [...prev]);
    },
    [childIndex, childDrawerData]
  );

  const handleFrequencyMoreOptionsVisible = useCallback(
    () => {
      setFrequencyMoreOptionsVisible(!frequencyMoreOptionsVisible)
    },
    [frequencyMoreOptionsVisible]
  );

  const onChangeTimingChild = useCallback(
    (item) => {
      if (item.tmt_id != childDrawerData[childIndex].tmm_time) {
        childDrawerData[childIndex].tmm_time = item.tmt_id;
        childDrawerData[childIndex].tmm_time_name = item.tmt_title;
      } else {
        childDrawerData[childIndex].tmm_time = 0;
        childDrawerData[childIndex].tmm_time_name = "";
      }
      setChildDrawerData((prev) => [...prev]);
    },
    [childIndex, childDrawerData]
  );

  const handleTimingMoreOptionsVisible = useCallback(
    () => {
      setTimingMoreOptionsVisible(!timingMoreOptionsVisible)
    },
    [timingMoreOptionsVisible]
  );

  useEffect(() => {
    if (sinceValue !== -1) {
      const options = SINCE_OPTIONS.map((option) => {
        return {
          key: Math.random(),
          value: `${sinceValue} ${option.value}`,
          label: <>{`${sinceValue}${option.label}`}</>,
        };
      });
      setSinceOptions(options);
    } else if (inputSince.length > 0) {
      const options = SINCE_OPTIONS.map((option) => {
        return {
          key: Math.random(),
          value: `${inputSince} ${option.value}`,
          label: <>{`${inputSince}${option.label}`}</>,
        };
      });
      setSinceOptions(options);
    } else {
      const options = SINCE_OPTIONS.map((option) => {
        return {
          key: Math.random(),
          value: `${option.value}`,
          label: <>{`${option.label}`}</>,
        };
      });
      setSinceOptions(options);
    }
  }, [sinceValue]);

  const onChangeInputSinceChild = useCallback(
    (e) => {
      const updateQuery = onlyNumberFormat(e.target.value);
      setInputSince(updateQuery);
      childDrawerData[childIndex].tmm_days = 0;
      childDrawerData[childIndex].tmm_duration_type = "";
      setChildDrawerData((prev) => [...prev]);
      if (updateQuery.length > 0) {
        const options = SINCE_OPTIONS.map((option) => {
          return {
            key: Math.random(),
            value: `${updateQuery} ${option.value}`,
            label: <>{`${updateQuery}${option.label}`}</>,
          };
        });
        setSinceOptions(options);
      } else {
        const options = SINCE_OPTIONS.map((option) => {
          return {
            key: Math.random(),
            value: option.value,
            label: <>{`${option.label}`}</>,
          };
        });
        setSinceOptions(options);
      }
    },
    [inputSince, sinceOptions, childDrawerData]
  );

  const SINCE_LIST = [
    { value: 1, label: 1 },
    { value: 2, label: 2 },
    { value: 3, label: 3 },
    { value: 4, label: 4 },
    { value: 5, label: 5 },
    {
      value: -1,
      label: (
        <Input
          className="w-100 custom-segment-input inputheight45 border-0"
          placeholder="Custom"
          value={inputSince}
          inputMode="numeric"
          onChange={onChangeInputSinceChild}
          onClick={() => onChangeSegmentedSinceChild(-1)}
        />
      ),
    },
  ];

  const onChangeSegmentedSinceChild = useCallback(
    (key) => {
      setSinceValue(key);
      childDrawerData[childIndex].tmm_days = 0;
      childDrawerData[childIndex].tmm_duration_type = "";
      setChildDrawerData((prev) => [...prev]);
    },
    [sinceValue, childIndex, childDrawerData]
  );

  const onChangeSinceChild = useCallback(
    (key) => {
      if (hasNumber(key)) {
        if (key != childDrawerData[childIndex].tmm_days_duration_type) {
          childDrawerData[childIndex].tmm_days_duration_type = key;
          childDrawerData[childIndex].tmm_days = key.split(" ")[0];
          childDrawerData[childIndex].tmm_duration_type = key.split(" ")[1];
        } else {
          childDrawerData[childIndex].tmm_days_duration_type = "";
          childDrawerData[childIndex].tmm_days = 0;
          childDrawerData[childIndex].tmm_duration_type = "";
        }
        setChildDrawerData((prev) => [...prev]);
      }
    },
    [childIndex, childDrawerData]
  );

  const onChangeDurationChild = useCallback(
    (item) => {
      if (item.value != childDrawerData[childIndex].tmm_days_duration_type) {
        childDrawerData[childIndex].tmm_days_duration_type = item.value;
        childDrawerData[childIndex].tmm_days = 0;
        childDrawerData[childIndex].tmm_duration_type = item.value;
      } else {
        childDrawerData[childIndex].tmm_days_duration_type = "";
        childDrawerData[childIndex].tmm_days = 0;
        childDrawerData[childIndex].tmm_duration_type = "";
      }
      setChildDrawerData((prev) => [...prev]);
    },
    [childIndex, childDrawerData]
  );

  const onAutoFillDuration = () => {
    const { tmm_days_duration_type, tmm_days, tmm_duration_type } = childDrawerData[childIndex]
    childDrawerData.forEach(e => {
      e.tmm_days_duration_type = tmm_days_duration_type;
      e.tmm_days = tmm_days;
      e.tmm_duration_type = tmm_duration_type;
    });
    setChildDrawerData((prev) => [...prev]);
    medicationData.forEach(e => {
      e.tmm_days_duration_type = tmm_days_duration_type;
      e.tmm_days = tmm_days;
      e.tmm_duration_type = tmm_duration_type;
    });
    setMedicationData((prev) => [...prev]);
    message.open({
      key: MESSAGE_KEY,
      type: '',
      className: 'message-appointment',
      content: (
        <div className='d-flex align-items-center'>
          <img src={visitEnd} className='me-2' />
          <div>
            <div className='text-start fs-18 fontroboto'>Autofilled this Duration to all medicines</div>
          </div>
          <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
        </div>
      ),
      duration: 3,
    });
  }

  const handleDurationMoreOptionsVisible = useCallback(
    () => {
      setDurationMoreOptionsVisible(!durationMoreOptionsVisible)
    },
    [durationMoreOptionsVisible]
  );

  const onChangeInputNoteChild = useCallback(
    (e) => {
      childDrawerData[childIndex].tmm_remarks = e.target.value;
      setChildDrawerData((prev) => [...prev]);
    },
    [childIndex, childDrawerData]
  );

  const updateChild = async (item) => {
    if (item?.length > 0) {
      onRemoveRow(selectedIndex, item);
    } else {
      onRemoveRow(selectedIndex);
    }
    handleDrawerChild();
  };

  useEffect(() => {
    if (childIndex != null) {
      const selectedMedication = childDrawerData[childIndex];
      if (selectedMedication?.tmf_block > 0) {
        setSelectedTab("other");
      } else {
        if (selectedMedication?.tcm_tmm_freq_evening) {
          setSelectedTab("mean");
        } else {
          setSelectedTab("man");
        }
      }
    }
  }, [childIndex]);

  const onChange = (unique_id) => {
    setActiveKey(unique_id);
    setChildIndex(childDrawerData?.findIndex(e => e.unique_id == unique_id))
    const data = childDrawerData?.find(e => e.unique_id == unique_id)
    setSinceValue(data && data?.tmm_days ? parseInt(data?.tmm_days) : 1);
  }

  const taperDoseAdd = (item) => {
    let updatedData = {
      ...item,
      tmf_block: 0,
      tmm_freq_type: 0,
      tmm_freq_type_name: "",
      tmf_block_val: "",
      tcm_tmm_freq_afternoon: 0,
      tcm_tmm_freq_evening: 0,
      tcm_tmm_freq_morning: 0,
      tcm_tmm_freq_night: 0,
      tmm_days: 0,
      tmm_days_duration_type: "",
      tmm_duration_type: "",
      tmm_dosage: "",
      tmm_remarks: "",
      tmm_time: 0,
      tmm_time_name: "",
      tmm_unit: 0,
      tmm_unit_name: "",
      tmu_id: 0,
      unique_id: uuidv4(),
    }
    childDrawerData.push(updatedData);
    setChildDrawerData((prev) => [...prev]);
    setChildIndex(childDrawerData.length - 1);
    setSinceValue(updatedData.tmm_days ? parseInt(updatedData.tmm_days) : 1);
    setActiveKey(updatedData.unique_id);
  };

  const onEdit = (unique_id, action, item) => {
    if (action === 'add') {
      taperDoseAdd(item);
    } else {
      const index = childDrawerData.findIndex(e => e.unique_id == unique_id)
      if (index != -1) {
        childDrawerData.splice(index, 1);
        setChildDrawerData((prev) => [...prev]);
        const checkIndex = childDrawerData.findIndex(e => e.unique_id == activeKey)
        if (checkIndex != -1) {
          setChildIndex(checkIndex);
        } else {
          setChildIndex(selectedIndex);
          setActiveKey(childDrawerData[selectedIndex]?.unique_id);
        }
      }
    }
  };

  //Child Componet
  const CHILD_DRAWER_DATA = useMemo(() => {
    return (
      <>
        <Card bordered={false} className="search-modalCard">
          <div className="modalCard-header align-items-center justify-content-between d-flex">
            <div className="align-items-center d-flex text-truncate">
              <Button
                type="text"
                className="btn btn-delete-prescription px-3 focus-none h-100"
                onClick={handleDrawerChild}
              >
                <i className="icon-Cross fs-3"></i>
              </Button>
              <div className="text-truncate title-common fontroboto">
                {medicationData[selectedIndex]?.tmm_medicine_name}
                <div className="text-truncate fs-14 fw-normal fontroboto mt-1">
                  {medicationData[selectedIndex]?.tmm_generic}
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center">
              {!medicationData[selectedIndex]?.pms_default &&
                <i className="icon-Edit ms-2"
                  onClick={() => {
                    const medicineType = medicineTypeList.find(x => x?.tmy_id == medicationData[selectedIndex]?.tmm_type)
                    const makeData = {
                      unique_id: medicationData[selectedIndex]?.unique_id,
                      tmm_id: medicationData[selectedIndex]?.tmm_id,
                      tmm_medicine_name: medicationData[selectedIndex]?.tmm_medicine_name,
                      tmm_generic: medicationData[selectedIndex]?.tmm_generic,
                      tmm_company: medicationData[selectedIndex]?.tmm_company
                    }
                    const updateItem = medicineType !== undefined ? { ...makeData, ...medicineType } : makeData
                    setAddCustom(updateItem);
                  }}
                ></i>
              }
              <Button
                className="btn btn-primary3 btn-41 px-4 ms-3 me-20"
                onClick={() => updateChild(childDrawerData)}
              >
                Done
              </Button>
            </div>
          </div>
        </Card>
        <Tabs
          type="editable-card"
          onChange={onChange}
          activeKey={activeKey}
          onEdit={(targetKey, action) => onEdit(targetKey, action, childDrawerData[childIndex])}
          items={childDrawerData && childDrawerData?.length > 0 && childDrawerData?.map((e, i) => {
            return {
              key: e.unique_id,
              label: `Dose ${i + 1}`,
              children: null,
            };
          })}
          className="tablet-medication-tabs"
        />
        <i className="icon-Add custom-tapper-button" onClick={() => taperDoseAdd(childDrawerData && childDrawerData?.length > 0 ? childDrawerData[childIndex] : medicationData[selectedIndex])} />
        {childDrawerData && childDrawerData?.length > 0 && (
          <div className="p-4">
            <div>
              <label className="title-common mb-1">Unit/Dose</label>
              <Row gutter={20} className="mb-3">
                <Col md={12}>
                  <Input
                    placeholder="e.g. 1"
                    value={
                      childDrawerData[childIndex].tmm_dosage
                        ? childDrawerData[childIndex].tmm_dosage
                        : ""
                    }
                    inputMode="decimal"
                    onChange={onChangeDosageChild}
                    className="inputheight38 rounded-10px"
                  />
                </Col>
                <Col md={12}>
                  <Select
                    className="autocomplete-custom w-100 popinput inputheight38"
                    placeholder="Select"
                    defaultValue={
                      childDrawerData[childIndex]?.medicineUnit
                        ? childDrawerData[childIndex].medicineUnit.findIndex(
                          (e) => e.value == childDrawerData[childIndex].tmm_unit
                        ) !== -1
                          ? parseInt(childDrawerData[childIndex].tmm_unit)
                          : null
                        : null
                    }
                    value={
                      childDrawerData[childIndex]?.medicineUnit
                        ? childDrawerData[childIndex].medicineUnit.findIndex(
                          (e) => e.value == childDrawerData[childIndex].tmm_unit
                        ) !== -1
                          ? parseInt(childDrawerData[childIndex].tmm_unit)
                          : null
                        : null
                    }
                    onSelect={onSelectMedicineUnitChild}
                    options={childDrawerData[childIndex].medicineUnit}
                  />
                </Col>
              </Row>
              <div className="d-flex align-items-center justify-content-between mt-3 mb-2">
                <label className="title-common">Frequency</label>
                <div className="mb-1 man-mean">
                  <Radio.Group
                    size="small"
                    onChange={handleRadioChange}
                    value={selectedTab}
                  >
                    <Radio.Button
                      value="man"
                      className={`${selectedTab === "man" ? "selected-tab" : ""} fw-medium`}
                    >
                      <span
                        className={`${selectedTab === "man" ? "selected-tab" : ""} fw-medium`}
                      >
                        MAN
                      </span>
                    </Radio.Button>
                    <Radio.Button
                      value="mean"
                      className={`${selectedTab === "mean" ? "selected-tab" : ""} fw-medium`}
                    >
                      <span
                        className={`${selectedTab === "mean" ? "selected-tab" : ""} fw-medium`}
                      >
                        MEAN
                      </span>
                    </Radio.Button>
                    <Radio.Button
                      value="other"
                      className={`${selectedTab === "other" ? "selected-tab" : ""} fw-medium`}
                    >
                      <span
                        className={`${selectedTab === "other" ? "selected-tab" : ""} fw-medium`}
                      >
                        Hrs a Day
                      </span>
                    </Radio.Button>
                  </Radio.Group>
                </div>
              </div>
              {selectedTab === "man" && (
                <Row className="input-dark">
                  <Col sm={8}>
                    <BSButtonGroup
                      aria-label="Basic example"
                      className="inputheight45 border w-100 rounded-0"
                    >
                      {childDrawerData[childIndex].tcm_tmm_freq_morning !== undefined &&
                        childDrawerData[childIndex].tcm_tmm_freq_morning != 0 && (
                          <BSButton
                            variant="outline-light"
                            className="rounded-0 dateoutline px-2 bg-white"
                            disabled={childDrawerData[childIndex].tmf_block}
                            onClick={morningDecrement}
                          >
                            <i className="icon-minus d-block text-main"></i>
                          </BSButton>
                        )}
                      <BSButton
                        variant="outline-light"
                        className="rounded-0 dateoutline p-0 bg-white"
                        disabled={childDrawerData[childIndex].tmf_block}
                        onClick={() =>
                          !childDrawerData[childIndex].tcm_tmm_freq_morning && morningClick()
                        }
                      >
                        <Input
                          placeholder="Morning"
                          inputMode="numeric"
                          value={
                            childDrawerData[childIndex].tcm_tmm_freq_morning
                              ? childDrawerData[childIndex].tcm_tmm_freq_morning
                              : ""
                          }
                          className="rounded-0 h-100 border-0 text-center text-main"
                          onChange={onChangeInputMorningChild}
                        />
                      </BSButton>
                      {childDrawerData[childIndex].tcm_tmm_freq_morning !== undefined &&
                        childDrawerData[childIndex].tcm_tmm_freq_morning != 0 && (
                          <BSButton
                            variant="outline-light"
                            className="rounded-0 dateoutline px-2 bg-white"
                            disabled={childDrawerData[childIndex].tmf_block}
                            onClick={morningIncrement}
                          >
                            <i className="icon-Add text-main d-block"></i>
                          </BSButton>
                        )}
                    </BSButtonGroup>
                  </Col>
                  <Col sm={8}>
                    <BSButtonGroup
                      aria-label="Basic example"
                      className="inputheight45 w-100 border rounded-0 border-start-0"
                    >
                      {childDrawerData[childIndex].tcm_tmm_freq_afternoon !== undefined &&
                        childDrawerData[childIndex].tcm_tmm_freq_afternoon != 0 && (
                          <BSButton
                            variant="outline-light"
                            className="rounded-0 dateoutline px-2 bg-white"
                            disabled={childDrawerData[childIndex].tmf_block}
                            onClick={afternoonDecrement}
                          >
                            <i className="icon-minus d-block text-main"></i>
                          </BSButton>
                        )}
                      <BSButton
                        variant="outline-light"
                        className="rounded-0 dateoutline p-0 bg-white"
                        disabled={childDrawerData[childIndex].tmf_block}
                        onClick={() =>
                          !childDrawerData[childIndex].tcm_tmm_freq_afternoon && afternoonClick()
                        }
                      >
                        <Input
                          placeholder="Afternoon"
                          inputMode="numeric"
                          value={
                            childDrawerData[childIndex].tcm_tmm_freq_afternoon
                              ? childDrawerData[childIndex].tcm_tmm_freq_afternoon
                              : ""
                          }
                          className="rounded-0 h-100 border-0 text-center text-main"
                          onChange={onChangeInputAfternoonChild}
                        />
                      </BSButton>
                      {childDrawerData[childIndex].tcm_tmm_freq_afternoon !== undefined &&
                        childDrawerData[childIndex].tcm_tmm_freq_afternoon != 0 && (
                          <BSButton
                            variant="outline-light"
                            className="rounded-0 dateoutline px-2 bg-white"
                            disabled={childDrawerData[childIndex].tmf_block}
                            onClick={afternoonIncrement}
                          >
                            <i className="icon-Add text-main d-block"></i>
                          </BSButton>
                        )}
                    </BSButtonGroup>
                  </Col>
                  <Col sm={8}>
                    <BSButtonGroup
                      aria-label="Basic example"
                      className="inputheight45 w-100 border rounded-0 border-start-0"
                    >
                      {childDrawerData[childIndex].tcm_tmm_freq_night !== undefined &&
                        childDrawerData[childIndex].tcm_tmm_freq_night != 0 && (
                          <BSButton
                            variant="outline-light"
                            className="rounded-0 dateoutline px-2 bg-white"
                            disabled={childDrawerData[childIndex].tmf_block}
                            onClick={nightDecrement}
                          >
                            <i className="icon-minus d-block text-main"></i>
                          </BSButton>
                        )}
                      <BSButton
                        variant="outline-light"
                        className="rounded-0 dateoutline p-0 bg-white"
                        disabled={childDrawerData[childIndex].tmf_block}
                        onClick={() =>
                          !childDrawerData[childIndex].tcm_tmm_freq_night && nightClick()
                        }
                      >
                        <Input
                          placeholder="Night"
                          inputMode="numeric"
                          value={
                            childDrawerData[childIndex].tcm_tmm_freq_night
                              ? childDrawerData[childIndex].tcm_tmm_freq_night
                              : ""
                          }
                          className="rounded-0 h-100 border-0 text-center text-main"
                          onChange={onChangeInputNightChild}
                        />
                      </BSButton>
                      {childDrawerData[childIndex].tcm_tmm_freq_night !== undefined &&
                        childDrawerData[childIndex].tcm_tmm_freq_night != 0 && (
                          <BSButton
                            variant="outline-light"
                            className="rounded-0 dateoutline px-2 bg-white"
                            disabled={childDrawerData[childIndex].tmf_block}
                            onClick={nightIncrement}
                          >
                            <i className="icon-Add d-block text-main"></i>
                          </BSButton>
                        )}
                    </BSButtonGroup>
                  </Col>
                </Row>
              )}
              {selectedTab === "mean" && (
                <Row className="input-dark">
                  <Col sm={6}>
                    <BSButtonGroup
                      aria-label="Basic example"
                      className="inputheight45 border rounded-0"
                    >
                      {childDrawerData[childIndex].tcm_tmm_freq_morning !== undefined &&
                        childDrawerData[childIndex].tcm_tmm_freq_morning != 0 && (
                          <BSButton
                            variant="outline-light"
                            className="rounded-0 dateoutline px-2 bg-white"
                            disabled={childDrawerData[childIndex].tmf_block}
                            onClick={morningDecrement}
                          >
                            <i className="icon-minus d-block text-main"></i>
                          </BSButton>
                        )}
                      <BSButton
                        variant="outline-light"
                        className="rounded-0 dateoutline p-0 bg-white"
                        disabled={childDrawerData[childIndex].tmf_block}
                        onClick={() =>
                          !childDrawerData[childIndex].tcm_tmm_freq_morning && morningClick()
                        }
                      >
                        <Input
                          placeholder="Morning"
                          inputMode="numeric"
                          value={
                            childDrawerData[childIndex].tcm_tmm_freq_morning
                              ? childDrawerData[childIndex].tcm_tmm_freq_morning
                              : ""
                          }
                          className="rounded-0 h-100 border-0 text-center text-main"
                          onChange={onChangeInputMorningChild}
                        />
                        {/* <InputNumber
                          placeholder="Morning"
                          value={
                            childDrawerData[childIndex].tcm_tmm_freq_morning
                              ? childDrawerData[childIndex].tcm_tmm_freq_morning
                              : ""
                          }
                          style={{ paddingLeft:"5%", textAlign: 'center', fontSize: '18px' }}
                          className="rounded-0 h-100 border-0 text-center text-main"
                          onChange={onChangeInputMorningChild}
                          step={0.1}
                        /> */}
                      </BSButton>
                      {childDrawerData[childIndex].tcm_tmm_freq_morning !== undefined &&
                        childDrawerData[childIndex].tcm_tmm_freq_morning != 0 && (
                          <BSButton
                            variant="outline-light"
                            className="rounded-0 dateoutline px-2 bg-white"
                            disabled={childDrawerData[childIndex].tmf_block}
                            onClick={morningIncrement}
                          >
                            <i className="icon-Add text-main d-block"></i>
                          </BSButton>
                        )}
                    </BSButtonGroup>
                  </Col>
                  <Col sm={6}>
                    <BSButtonGroup
                      aria-label="Basic example"
                      className="inputheight45 border rounded-0 border-start-0"
                    >
                      {childDrawerData[childIndex].tcm_tmm_freq_afternoon !== undefined &&
                        childDrawerData[childIndex].tcm_tmm_freq_afternoon != 0 && (
                          <BSButton
                            variant="outline-light"
                            className="rounded-0 dateoutline px-2 bg-white"
                            disabled={childDrawerData[childIndex].tmf_block}
                            onClick={afternoonDecrement}
                          >
                            <i className="icon-minus d-block text-main"></i>
                          </BSButton>
                        )}
                      <BSButton
                        variant="outline-light"
                        className="rounded-0 dateoutline p-0 bg-white"
                        disabled={childDrawerData[childIndex].tmf_block}
                        onClick={() =>
                          !childDrawerData[childIndex].tcm_tmm_freq_afternoon && afternoonClick()
                        }
                      >
                        <Input
                          placeholder="Afternoon"
                          inputMode="numeric"
                          value={
                            childDrawerData[childIndex].tcm_tmm_freq_afternoon
                              ? childDrawerData[childIndex].tcm_tmm_freq_afternoon
                              : ""
                          }
                          className="rounded-0 h-100 border-0 text-center text-main"
                          onChange={onChangeInputAfternoonChild}
                        />
                        {/* <InputNumber
                          placeholder="Afternoon"
                          value={
                            childDrawerData[childIndex].tcm_tmm_freq_afternoon
                              ? childDrawerData[childIndex].tcm_tmm_freq_afternoon
                              : ""
                          }
                          style={{ paddingLeft:"5%", textAlign: 'center', fontSize: '18px' }}
                          className="rounded-0 h-100 border-0 text-center text-main"
                          onChange={onChangeInputAfternoonChild}
                          step={0.1}
                        /> */}
                      </BSButton>
                      {childDrawerData[childIndex].tcm_tmm_freq_afternoon !== undefined &&
                        childDrawerData[childIndex].tcm_tmm_freq_afternoon != 0 && (
                          <BSButton
                            variant="outline-light"
                            className="rounded-0 dateoutline px-2 bg-white"
                            disabled={childDrawerData[childIndex].tmf_block}
                            onClick={afternoonIncrement}
                          >
                            <i className="icon-Add text-main d-block"></i>
                          </BSButton>
                        )}
                    </BSButtonGroup>
                  </Col>
                  <Col sm={6}>
                    <BSButtonGroup
                      aria-label="Basic example"
                      className="inputheight45 border rounded-0 border-start-0"
                    >
                      {childDrawerData[childIndex].tcm_tmm_freq_evening !== undefined &&
                        childDrawerData[childIndex].tcm_tmm_freq_evening != 0 && (
                          <BSButton
                            variant="outline-light"
                            className="rounded-0 dateoutline px-2 bg-white"
                            disabled={childDrawerData[childIndex].tmf_block}
                            onClick={eveningDecrement}
                          >
                            <i className="icon-minus d-block text-main"></i>
                          </BSButton>
                        )}
                      <BSButton
                        variant="outline-light"
                        className="rounded-0 dateoutline p-0 bg-white"
                        disabled={childDrawerData[childIndex].tmf_block}
                        onClick={() =>
                          !childDrawerData[childIndex].tcm_tmm_freq_evening && eveningClick()
                        }
                      >
                        <Input
                          placeholder="Evening"
                          inputMode="numeric"
                          value={
                            childDrawerData[childIndex].tcm_tmm_freq_evening
                              ? childDrawerData[childIndex].tcm_tmm_freq_evening
                              : ""
                          }
                          className="rounded-0 h-100 border-0 text-center text-main"
                          onChange={onChangeInputEveningChild}
                        />
                        {/* <InputNumber
                          placeholder="Evening"
                          value={
                            childDrawerData[childIndex].tcm_tmm_freq_evening
                              ? childDrawerData[childIndex].tcm_tmm_freq_evening
                              : ""
                          }
                          style={{ paddingLeft:"5%", textAlign: 'center', fontSize: '18px' }}
                          className="rounded-0 h-100 border-0 text-center text-main"
                          onChange={onChangeInputEveningChild}
                          step={0.1}
                        /> */}
                      </BSButton>
                      {childDrawerData[childIndex].tcm_tmm_freq_evening !== undefined &&
                        childDrawerData[childIndex].tcm_tmm_freq_evening != 0 && (
                          <BSButton
                            variant="outline-light"
                            className="rounded-0 dateoutline px-2 bg-white"
                            disabled={childDrawerData[childIndex].tmf_block}
                            onClick={eveningIncrement}
                          >
                            <i className="icon-Add text-main d-block"></i>
                          </BSButton>
                        )}
                    </BSButtonGroup>
                  </Col>
                  <Col sm={6}>
                    <BSButtonGroup
                      aria-label="Basic example"
                      className="inputheight45 border rounded-0 border-start-0"
                    >
                      {childDrawerData[childIndex].tcm_tmm_freq_night !== undefined &&
                        childDrawerData[childIndex].tcm_tmm_freq_night != 0 && (
                          <BSButton
                            variant="outline-light"
                            className="rounded-0 dateoutline px-2 bg-white"
                            disabled={childDrawerData[childIndex].tmf_block}
                            onClick={nightDecrement}
                          >
                            <i className="icon-minus d-block text-main"></i>
                          </BSButton>
                        )}
                      <BSButton
                        variant="outline-light"
                        className="rounded-0 dateoutline p-0 bg-white"
                        disabled={childDrawerData[childIndex].tmf_block}
                        onClick={() =>
                          !childDrawerData[childIndex].tcm_tmm_freq_night && nightClick()
                        }
                      >
                        <Input
                          placeholder="Night"
                          inputMode="numeric"
                          value={
                            childDrawerData[childIndex].tcm_tmm_freq_night
                              ? childDrawerData[childIndex].tcm_tmm_freq_night
                              : ""
                          }
                          className="rounded-0 h-100 border-0 text-center text-main"
                          onChange={onChangeInputNightChild}
                        />
                        {/* <InputNumber
                          placeholder="Night"
                          value={childDrawerData[childIndex].tcm_tmm_freq_night}
                          style={{ paddingLeft:"5%", textAlign: 'center', fontSize: '18px' }}
                          className="rounded-0 h-100 border-0 text-center text-main"
                          onChange={onChangeInputNightChild}
                          step={0.1}
                        /> */}
                      </BSButton>
                      {childDrawerData[childIndex].tcm_tmm_freq_night !== undefined &&
                        childDrawerData[childIndex].tcm_tmm_freq_night != 0 && (
                          <BSButton
                            variant="outline-light"
                            className="rounded-0 dateoutline px-2 bg-white"
                            disabled={childDrawerData[childIndex].tmf_block}
                            onClick={nightIncrement}
                          >
                            <i className="icon-Add text-main d-block"></i>
                          </BSButton>
                        )}
                    </BSButtonGroup>
                  </Col>
                </Row>
              )}
              <div>
                {selectedTab === "other" && (
                  <div className="segement-static d-flex flex-wrap">
                    {filteredTitles.slice(0, 2).map((item, i) => {
                      return (
                        <>
                          <button
                            key={i}
                            type="button"
                            className={`btn text-truncate ${childDrawerData[childIndex].tmm_freq_type == item.tmf_id &&
                              "btn-segement"
                              }`}
                            onClick={() => onChangeFrequencyChild(item)}
                          >
                            {item.tmf_title}
                          </button>
                          {i == filteredTitles.slice(0, 2).length - 1 && (
                            <button
                              key={-1}
                              type="button"
                              className={`btn segment-more ${filteredTitles
                                .slice(2, filteredTitles.length)
                                .some(
                                  (e) => e.tmf_id == childDrawerData[childIndex].tmm_freq_type
                                ) && "btn-segement"
                                }`}
                              onClick={handleFrequencyMoreOptionsVisible}
                            >
                              {filteredTitles
                                .slice(2, filteredTitles.length)
                                .some(
                                  (e) => e.tmf_id == childDrawerData[childIndex].tmm_freq_type
                                ) ? (
                                <span id="selected">
                                  <i className="icon-Edit me-2 fs-21"></i>{" "}
                                  {childDrawerData[childIndex].tmm_freq_type_name}
                                </span>
                              ) : (
                                "More"
                              )}
                            </button>
                          )}
                        </>
                      );
                    })}
                  </div>
                )}
                {frequencyMoreOptionsVisible && (
                  <TabMedicationMoreModal
                    width='563px'
                    title={'Frequency'}
                    onClose={handleFrequencyMoreOptionsVisible}
                    onClick={(item) => {
                      setFrequencyMoreOptionsVisible(false);
                      onChangeFrequencyChild(item);
                    }}
                    label={'tmf_title'}
                    value={'tmf_id'}
                    selectedValue={childDrawerData[childIndex].tmm_freq_type}
                    array={filteredTitles.slice(2, filteredTitles.length)} />
                )}
              </div>
              <div>
                <div className="segement-static d-flex flex-wrap">
                  {timingList.slice(0, 5).map((item, i) => {
                    return (
                      <>
                        <button
                          key={i}
                          type="button"
                          className={`btn mt-3 ${childDrawerData[childIndex].tmm_time == item.tmt_id
                            ? "btn-segement"
                            : ""
                            }`}
                          onClick={() => onChangeTimingChild(item)}
                        >
                          {item.tmt_title}
                        </button>
                        {i == timingList.slice(0, 5).length - 1 && (
                          <button
                            key={-1}
                            type="button"
                            className={`btn mt-3 segment-more ${timingList
                              .slice(5, timingList.length)
                              .some(
                                (e) => e.tmt_id == childDrawerData[childIndex].tmm_time
                              ) && "btn-segement"
                              }`}
                            onClick={handleTimingMoreOptionsVisible}
                          >
                            {timingList
                              .slice(5, timingList.length)
                              .some(
                                (e) => e.tmt_id == childDrawerData[childIndex].tmm_time
                              ) ? (
                              <span id="selected">
                                <i className="icon-Edit me-2 fs-21"></i>
                                {childDrawerData[childIndex].tmm_time_name}
                              </span>
                            ) : (
                              "More"
                            )}
                          </button>
                        )}
                      </>
                    );
                  })}
                </div>
                {timingMoreOptionsVisible && (
                  <TabMedicationMoreModal
                    width='563px'
                    title={'Timings'}
                    onClose={handleTimingMoreOptionsVisible}
                    onClick={(item) => {
                      setTimingMoreOptionsVisible(false);
                      onChangeTimingChild(item);
                    }}
                    label={'tmt_title'}
                    value={'tmt_id'}
                    selectedValue={childDrawerData[childIndex].tmm_time}
                    array={timingList.slice(5, timingList.length)} />
                )}
              </div>
            </div>
            <div className="mt-3">
              <label className="title-common mb-1">Duration</label>
              <div className="segement-static d-flex">
                {SINCE_LIST.map((item, i) => {
                  return (
                    <button key={i}
                      type="button"
                      className={`btn w-100 p-0 ${sinceValue > 5 ? item.value == -1 && 'btn-segement custom-input-selected' : sinceValue == item.value && 'btn-segement'}`}
                      onClick={() => onChangeSegmentedSinceChild(item.value)}>
                      {item.label}
                    </button>
                  )
                })}
              </div>
              {/* <Segmented
                value={sinceValue > 5 ? -1 : sinceValue}
                className="search-segment"
                options={SINCE_LIST}
                onChange={onChangeSegmentedSinceChild}
              /> */}
            </div>
            <div className="mt-3 mb-3">
              <div className="segement-static d-flex">
                {sinceOptions.map((item, i) => {
                  return (
                    <>
                      <button key={i}
                        type="button"
                        className={`btn ${childDrawerData[childIndex].tmm_days_duration_type == item.value && 'btn-segement'}`}
                        onClick={() => onChangeSinceChild(item.value)}>
                        {item.label}
                      </button>
                      {i == sinceOptions.length - 1 && (
                        <button
                          key={-1}
                          type="button"
                          className={`btn text-truncate px-1 segment-more ${EXTRA_OPTIONS.some((e) => e.value == childDrawerData[childIndex].tmm_days_duration_type) && "btn-segement"}`}
                          onClick={handleDurationMoreOptionsVisible}
                        >
                          {EXTRA_OPTIONS.some((e) => e.value == childDrawerData[childIndex].tmm_days_duration_type) ? (
                            <span id="selected">
                              <i className="icon-Edit me-2 fs-21"></i>
                              {hasNumber(childDrawerData[childIndex].tmm_days_duration_type) ? childDrawerData[childIndex].tmm_days_duration_type : capitalize(childDrawerData[childIndex].tmm_days_duration_type, true)}
                            </span>
                          ) : (
                            "More"
                          )}
                        </button>
                      )}
                    </>
                  )
                })}
              </div>
              {durationMoreOptionsVisible && (
                <TabMedicationMoreModal
                  width='563px'
                  title={'Duration'}
                  onClose={handleDurationMoreOptionsVisible}
                  onClick={(item) => {
                    setDurationMoreOptionsVisible(false);
                    onChangeDurationChild(item);
                  }}
                  label={'label'}
                  value={'value'}
                  selectedValue={childDrawerData[childIndex].tmm_days_duration_type}
                  array={EXTRA_OPTIONS} />
              )}
              {/* <Segmented
                value={
                  childDrawerData[childIndex].tmm_duration_type !== undefined && childDrawerData[childIndex].tmm_days !== undefined &&
                  `${childDrawerData[childIndex].tmm_days} ${childDrawerData[childIndex].tmm_duration_type}`
                }
                className="search-segment"
                options={sinceOptions}
                onChange={onChangeSinceChild}
              /> */}
            </div>

            {childDrawerData[childIndex].tmm_days_duration_type && (
              <div className="text-primary d-flex align-items-center"><i className="icon-copyIcon fs-16 me-1" /> <span className="text-primary text-decoration-underline" onClick={onAutoFillDuration}>Autofill this duration for all added meds.</span></div>
            )}

            <label className="title-common mb-1 mt-3">Note</label>
            <Input.TextArea
              value={
                childDrawerData[childIndex].tmm_remarks
                  ? childDrawerData[childIndex].tmm_remarks
                  : ""
              }
              placeholder="Enter any specific notes here"
              className="textareaPlaceholder"
              rows={3}
              onChange={onChangeInputNoteChild}
            />
          </div>
        )}
      </>
    );
  }, [
    childDrawer,
    childDrawerData,
    sinceValue,
    inputSince,
    sinceOptions,
    selectedTab,
    timingMoreOptionsVisible,
    frequencyMoreOptionsVisible,
    durationMoreOptionsVisible,
    activeKey,
    childIndex
  ]);

  const showHideClearData = useCallback(() => {
    setIsModalOpen1(!isModalOpen1);
  }, [isModalOpen1]);

  const onRemoveRows = () => {
    setMedicationData([])
    showHideClearData()
  };

  //Remove All Rows
  const REMOVE_ALL_ROWS = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={isModalOpen1}
        onCancel={showHideClearData}
        modalWidth={500}
        title={"You may lose your data"}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className='me-3' src={alertIcon} alt="Warning" />
                <span>
                  Are you sure you want to Clear Selected <b>Medications (Rx)</b>?
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div onClick={onRemoveRows}
                  className="me-4 text-decoration-underline btn p-0 text-main">
                  <span>Yes, Clear</span>
                </div>
                <Button onClick={showHideClearData} className="lh-lg btn btn-primary3 btn-41 px-4">
                  <span>No</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    );
  }, [isModalOpen1]);

  //Add Custom
  const handleDrawerGeneric = useCallback(() => {
    setGenericDrawer(!genericDrawer);
  }, [genericDrawer]);

  const onChangeMedicineName = useCallback(
    (e) => {
      setAddCustom({ ...addCustom, tmm_medicine_name: e.target.value });
    },
    [addCustom]
  );

  const onChangeCompanyName = useCallback(
    (e) => {
      setAddCustom({ ...addCustom, tmm_company: e.target.value });
    },
    [addCustom]
  );

  const onChangeMedicineType = useCallback(
    (item) => {
      setAddCustom({ ...addCustom, ...item });
    },
    [addCustom]
  );

  const handleMedicineTypeMoreOptionsVisible = useCallback(
    () => {
      setMedicineTypeMoreOptionsVisible(!medicineTypeMoreOptionsVisible)
    },
    [medicineTypeMoreOptionsVisible]
  );

  useEffect(() => {
    if (genericQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(searchGeneric(genericQuery));
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    }
  }, [genericQuery]);

  const onSearchGeneric = useCallback(
    (e) => {
      setGenericQuery(replaceCommasAndSemicolons(removeBeforeWhiteSpace(e.target.value)))
    },
    [genericQuery]
  );

  const onSelectGeneric = async (item) => {
    setAddCustom({ ...addCustom, ...item });
    setGenericQuery("")
    await dispatch(clearGenericList())
    handleDrawerGeneric()
  }

  const onAddEditMedicineClick = async () => {
    var sendData = {
      tmm_id: addCustom?.tmm_id,
      tmm_medicine_name: addCustom?.tmm_medicine_name,
      tmm_type: addCustom?.tmy_id,
      tmm_generic: addCustom?.tmm_generic !== undefined ? addCustom?.tmm_generic : '',
      tmm_company: addCustom?.tmm_company !== undefined ? addCustom?.tmm_company : ''
    };
    const action = addCustom?.tmm_id ? await dispatch(editMedicine(sendData)) : await dispatch(addMedicine(sendData))
    if (action.meta.requestStatus === "fulfilled") {
      if (addCustom?.tmm_id) {
        const modifyData = action.payload[0]

        await dispatch(updateFrequentlyMedication(modifyData))

        const medicineUnit = modifyData?.medicineUnit.map((e1) => {
          return {
            key: JSON.stringify({ ...e1 }),
            value: e1.tmu_id,
            label: <>{e1.tmu_title}</>,
          };
        });

        if (doseCalculatorDrawer) {
          medicationLibrary.map(item => {
            if (item.tmm_id == modifyData.tmm_id) {
              item.tmm_medicine_name = modifyData.tmm_medicine_name;
              item.tmm_generic = modifyData.tmm_generic;
              item.tmm_company = modifyData.tmm_company;
              item.tmm_type = modifyData.tmm_type;
              item.tmm_dosage_unit_name = '';
              item.tmm_dosage = '';
              item.tmm_unit = 0;
              item.tmm_unit_name = '';
              item.tmu_id = 0;
              item.medicineUnit = medicineUnit;
            }
            return item;
          });
        } else {
          medicationData.map(item => {
            if (item.tmm_id == modifyData.tmm_id) {
              item.tmm_medicine_name = modifyData.tmm_medicine_name;
              item.tmm_generic = modifyData.tmm_generic;
              item.tmm_company = modifyData.tmm_company;
              item.tmm_type = modifyData.tmm_type;
              item.tmm_dosage_unit_name = '';
              item.tmm_dosage = '';
              item.tmm_unit = 0;
              item.tmm_unit_name = '';
              item.tmu_id = 0;
              item.medicineUnit = medicineUnit;
            }
            return item;
          });
        }
      } else {
        const updatedData = action.payload.map((e) => {
          const medicineUnit = e?.medicineUnit.map((e1) => {
            return {
              key: JSON.stringify({ ...e1 }),
              value: e1.tmu_id,
              label: <>{e1.tmu_title}</>,
            };
          });

          const unitObj = medicineUnit ? medicineUnit.find((x) => x.value == e.tmm_unit) : null;
          const frequencyObj = frequencyList.find((x) => x.tmf_id == e.tmm_freq_type);
          const timingObj = timingList.find((x) => x.tmt_id == e.tmm_time);

          let doseCalData = {}
          const objDose = dosesList.find((e1) => e1.medicine_id == e.tmm_id)
          if (objDose !== undefined) {
            const dose = calculateDose(objDose?.dosage, todayData?.weight, objDose?.concentration, e?.tmm_type)
            doseCalData['tmm_dosage_unit_name'] = `${dose ? `${dose} ${unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_title : ""}` : ""}`;
            doseCalData['tmm_dosage'] = dose ? dose : "";
            doseCalData['tmm_unit_name'] = unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_title : "";
            doseCalData['tmm_unit'] = unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_id : "";
            doseCalData['tmu_id'] = unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_id : "";
          } else {
            doseCalData['tmm_dosage_unit_name'] = `${e.tmm_dosage ? `${e.tmm_dosage} ${unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_title : ""}` : ""}`;
            doseCalData['tmm_unit_name'] = unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_title : "";
          }

          return {
            ...e,
            // tmm_unit_name: unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_title : "",
            tmm_freq_type_name:
              frequencyObj !== undefined ? frequencyObj.tmf_title : "",
            tmf_block_val:
              frequencyObj !== undefined ? frequencyObj.tmf_block_val : "",
            tmm_time_name: timingObj !== undefined ? timingObj.tmt_title : "",
            medicineUnit: medicineUnit,
            // tmm_dosage_unit_name: `${e.tmm_dosage ? `${e.tmm_dosage} ${unitObj && unitObj !== undefined ? JSON.parse(unitObj.key).tmu_title : ""}` : ""}`,
            tmm_days_duration_type: EXTRA_OPTIONS.some((x) => x.value == e.tmm_duration_type) ? e.tmm_duration_type : e.tmm_days ? `${e.tmm_days} ${e.tmm_duration_type}` : "",
            unique_id: uuidv4(),
            ...doseCalData
          };
        });
        if (doseCalculatorDrawer) {
          const modifyData = updatedData[0]
          const objDose = dosesList.find((e1) => e1.medicine_id == modifyData.tmm_id)
          medicationLibrary.push({
            ...modifyData,
            tmm_dosage_unit_name: "",
            tmm_dosage: '',
            tmm_unit: 0,
            tmm_unit_name: '',
            tmu_id: 0,
            id: objDose !== undefined ? objDose?.id : "",
            medicine_id: modifyData.tmm_id,
            dosage: objDose !== undefined ? objDose?.dosage : "",
            dosage_unit: "mg/kg/dose",
            concentration: objDose !== undefined ? objDose?.concentration : "",
            concentration_unit: "mg/ml",
            medicine_name: modifyData.tmm_medicine_name,
            medicine_generic_name: modifyData.tmm_generic,
            exist: dosesList.some((e1) => e1.medicine_id == modifyData.tmm_id) ? true : false
          });
        }
      }
      if (doseCalculatorDrawer) {
        setMedicationLibrary((prev) => [...prev]);
        setSearchMLQuery("");
      } else {
        setMedicationData((prev) => [...prev]);
        const childData = await innerMedication(selectedIndex)
        setChildDrawerData(childData);
      }
      setAddCustom(null);
    } else {
      errorMessage(action.error)
    }
  }

  const ADD_MEDICINE_DATA = useMemo(() => {
    return (
      <>
        <Card bordered={false} className="search-modalCard">
          <div className="modalCard-header align-items-center justify-content-between d-flex">
            <div className="align-items-center d-flex text-truncate">
              <Button
                type="text"
                className="btn btn-delete-prescription px-3 focus-none h-100"
                onClick={() => setAddCustom(null)}
              >
                <i className="icon-Cross fs-3"></i>
              </Button>
              <div className="text-truncate title-common fontroboto">
                {`${addCustom?.tmm_id ? 'Edit' : 'Add'} Custom Medicine`}
              </div>
            </div>
          </div>
        </Card>
        <div className="h-100">
          <div className="p-4">
            <div>
              <label className="title-common mb-1">Medicine Name<span className="text-danger fs-18">*</span></label>
              <Input
                placeholder="Medicine Name"
                value={addCustom?.tmm_medicine_name}
                onChange={onChangeMedicineName}
                className="inputheight38 rounded-10px fw-medium"
              />
            </div>
            <div className="my-5">
              <label className="title-common">Medicine Type<span className="text-danger fs-18">*</span></label>
              <div className="segement-static segement-static-four d-flex flex-wrap">
                {medicineTypeList.slice(0, 7).map((item, i) => {
                  return (
                    <>
                      <button
                        key={i}
                        type="button"
                        className={`btn mt-3 text-truncate px-1 ${addCustom?.tmy_id == item.tmy_id && "btn-segement"}`}
                        onClick={() => onChangeMedicineType(item)}>
                        {item.tmy_title}
                      </button>
                      {i == medicineTypeList.slice(0, 7).length - 1 && (
                        <button
                          key={-1}
                          type="button"
                          className={`btn mt-3 text-truncate px-1 segment-more ${medicineTypeList.slice(7, medicineTypeList.length).some((e) => e.tmy_id == addCustom?.tmy_id) && "btn-segement"}`}
                          onClick={handleMedicineTypeMoreOptionsVisible}
                        >
                          {medicineTypeList.slice(7, medicineTypeList.length).some((e) => e.tmy_id == addCustom?.tmy_id) ? (
                            <span id="selected">
                              <i className="icon-Edit me-2 fs-21"></i>
                              {addCustom?.tmy_title}
                            </span>
                          ) : (
                            "More"
                          )}
                        </button>
                      )}
                    </>
                  );
                })}
              </div>
            </div>
            {medicineTypeMoreOptionsVisible && (
              <TabMedicationMoreModal
                width='41.5%'
                title={'Medicine Type'}
                onClose={handleMedicineTypeMoreOptionsVisible}
                onClick={(item) => {
                  setMedicineTypeMoreOptionsVisible(false);
                  onChangeMedicineType(item);
                }}
                label={'tmy_title'}
                value={'tmy_id'}
                selectedValue={addCustom?.tmy_id}
                array={medicineTypeList.slice(7, medicineTypeList.length)} />
            )}
            <div className="my-5">
              <label className="title-common mb-1">Select Generic Name</label>
              <div className="inputheight38 border rounded-10px d-flex align-items-center bg-white" onClick={handleDrawerGeneric}>
                <div className="d-flex align-items-center w-100 justify-content-between">
                  <span className={`${addCustom?.tmm_generic ? 'text-main fw-medium' : ''} fontroboto backbar fw-normal px-2`}>{addCustom?.tmm_generic ? addCustom?.tmm_generic : 'Generic Name'}</span>
                  <span className="iconrotate270 mb-2">
                    <i className="icon-right textcolor-29 me-2"></i>
                  </span>
                </div>
              </div>
            </div>
            <Drawer title="Select Generic Name" placement="right" onClose={handleDrawerGeneric} open={genericDrawer} className="modalWidth-563" width="auto">
              <div className="medicine-templates h-100 p-3">
                <Input className="popinput" placeholder="Search Generic Name" onChange={onSearchGeneric} value={genericQuery} prefix={<i className='icon-search me-2'></i>} allowClear />
                <div className="mt-3">
                  {/* {genericList.length > 0 ? (
                    genericList.map((item, i) => {
                      return (
                        <Button
                          key={i}
                          type="text"
                          style={{ width: item.tmm_generic.length > 26 && "250px" }}
                          className={`${item.tmm_generic.length > 26 && "chips-custom-break"} btn btn-primary2 chips-custom mb-14 me-14`}
                          onClick={() => onSelectGeneric(item)}>
                          {item.tmm_generic}
                        </Button>
                      )
                    })
                  ) : (
                    genericQuery.length > 0 &&
                    <div className="text-center">
                      <img className="mb-4" src={noRecordFound} alt="No Result Found" />
                      <div className="title-common fontroboto mb-3">Sorry ! No results found</div>
                      <div className="fontroboto text-greycolor">The generic name is currently not listed in our database <br /> We will add it soon. </div>
                    </div>
                  )} */}
                  {[...genericList, { tmm_generic: genericQuery }].filter(e => e.tmm_generic).map((item, i) => {
                    return (
                      i === [...genericList, { tmm_generic: genericQuery }].filter(e => e.tmm_generic).length - 1 && genericQuery.length > 0 ? (
                        <Button
                          key={i}
                          type="text"
                          className="btn btn-primary2 chips-custom mb-14 me-14 d-flex align-items-center chips-addCustom"
                          onClick={() => onSelectGeneric(item)}>
                          {item.tmm_generic} <i className="icon-Add mx-1 fs-6"></i> <a className="text-decoration-underline"> Add Custom</a>
                        </Button>
                      ) : (
                        <Button
                          key={i}
                          type="text"
                          style={{ width: item.tmm_generic.length > 26 && "250px" }}
                          className={`${item.tmm_generic.length > 26 && "chips-custom-break"} btn btn-primary2 chips-custom mb-14 me-14`}
                          onClick={() => onSelectGeneric(item)}>
                          {item.tmm_generic}
                        </Button>
                      )
                    )
                  })}
                </div>
              </div>
            </Drawer>
            <div className="my-5">
              <label className="title-common mb-1">Company Name</label>
              <Input
                placeholder="Company Name"
                value={addCustom?.tmm_company}
                onChange={onChangeCompanyName}
                className="inputheight38 rounded-10px text-main fw-medium"
              />
            </div>
            <div className="text-end">
              {addCustom?.tmm_id ? (
                <Button className='me-4 btn p-0 text-main btn-text' onClick={() => setAddCustom(null)}>
                  Cancel
                </Button>
              ) : null}
              <Button className='btn btn-primary3 btn-41 px-4' onClick={onAddEditMedicineClick} loading={loading} disabled={addCustom?.tmm_medicine_name && addCustom?.tmy_id ? false : true}>
                {`${addCustom?.tmm_id ? 'Update' : 'Add'} Custom Medicine`}
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }, [addCustom, medicineTypeMoreOptionsVisible, genericDrawer, genericQuery, genericList, loading]);

  const showHideModal2 = useCallback(() => {
    setIsModalOpen2(!isModalOpen2);
  }, [isModalOpen2]);

  // Tour Pillup
  const tourRef = useRef(null);

  useEffect(() => {
    if (isPillUpAccessableFromGB && profile?.userSettingFlag?.find(e => e?.type === 'pillup')?.status !== 1) {
      tourRef?.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        setTourOpen(true)
      }, 1500);
    }
  }, [isPillUpAccessableFromGB]);

  const PILLUP_CONTENT = useCallback(() => {
    const decodedToken = getDecodedToken();
    const tokenData = decodedToken?.result;
    const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
    
    const serviceName = isZydusUser ? "eaZY Dose" : "PillUp";
    const serviceNameTitle = isZydusUser ? "eaZY Dose Fulfilment" : "Pillup Fulfilment";
    
    return (
      <div className="p-2">
        <div className="fs-18 fw-semibold text-black">{serviceNameTitle} <img className="img-fluid ms-2" src={tagNew} /></div>
        <div className="pt-1">You can now activate <b>{serviceName}</b> medicine <br /> fulfilment for the patient by enabling <br /> the toggle</div>
        <Button className="w-100 mt-2 border-0 rounded-3 bg-black h-38" onClick={showHidePillUpPopover}><span className="text-white">Okay</span></Button>
      </div>
    );
  }, [popOver3]);

  //PopOver3 function
  const showHidePillUpPopover = useCallback(() => {
    setPopOver3(!popOver3);
  }, [popOver3]);

  const onTourHandle = () => {
    dispatch(upsertDoctorSettingFlag({ type: 'pillup', status: 1 }))
    setTourOpen(!tourOpen)
  }

  const steps = [
    {
      description:
        <>
          <div className="fs-18 fw-semibold pt-3 text-black">
            {(() => {
              const decodedToken = getDecodedToken();
              const tokenData = decodedToken?.result;
              const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
              return isZydusUser ? "eaZY Dose Fulfilment" : "Pillup Fulfilment";
            })()} <img className="img-fluid ms-2" src={tagNew} />
          </div>
          <div className="pt-1">You can now activate <b>
            {(() => {
              const decodedToken = getDecodedToken();
              const tokenData = decodedToken?.result;
              const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
              return isZydusUser ? "eaZY Dose" : "PillUp";
            })()}</b> medicine <br /> fulfilment for the patient by enabling <br /> the toggle</div>
        </>,
      target: () => tourRef.current,
      nextButtonProps: {
        children: 'Okay',
        onClick: onTourHandle
      }
    }
  ];

  const pillUpChange = (checked) => {
    setPillupSwitch(checked)
  };

  return (
    <>
      <div>
        <div className="d-flex align-items-center justify-content-between p-14-pb0">
          <div className="d-flex align-items-center">
            <img className="me-2" src={Medicationicon} alt="Medication" />
            <div className="title-common">{isPillUpAccessableFromGB ? 'Meds' : 'Medications'} (Rx)</div>
            {isPillUpAccessableFromGB &&
              <div ref={tourRef} className="ms-2 border rounded-20px px-2 py-1 d-flex align-items-center" style={{ backgroundColor: 'rgb(226, 226, 234, 0.2)' }}>
                {(() => {
                  const decodedToken = getDecodedToken();
                  const tokenData = decodedToken?.result;
                  const isZydusUser = tokenData?.hospital_business_id == env.zydus_business_id;
                  return isZydusUser ? <img src={EazyDoseLogo} alt="eaZY Dose" style={{ height: '20px' }} /> : <img src={Pillup} />;
                })()}
                <Popover
                  open={popOver3}
                  onOpenChange={showHidePillUpPopover}
                  content={profile?.userSettingFlag?.find(e => e?.type === 'pillup')?.status === 1 ? PILLUP_CONTENT() : null}
                  trigger="hover"
                  placement="bottom"
                >
                  <i className="icon-info opacity-50 fs-18 mx-1"></i>
                </Popover>
                <Switch className="switch-custom" value={pillupSwitch} onChange={pillUpChange} />
                <Tour placement="bottom" closeIcon={false} open={tourOpen} steps={steps} onClose={onTourHandle} />
              </div>
            }
          </div>

          <div className="d-flex align-items-center">
            {(profile?.dp_id === 9 || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) && (
              <button
                className="btn d-flex align-items-center btn-text"
                onClick={handleViewDoseCalcDrawer}
              >
                {" "}
                <img src={calculatorIcon} alt="Dose calcultor" className="svg-hovered me-2" /><span>{isPillUpAccessableFromGB ? 'Dose calc' : 'Dose calculator'}</span>
              </button>
            )}
            <button
              className="btn d-flex align-items-center btn-text"
              onClick={loadPreviousRxClick}
            >
              {" "}
              <i className="icon-reload me-2"></i> <span>{isPillUpAccessableFromGB ? 'Prev. Rx ' : 'Load Prev. Rx'}</span>
            </button>
            <button
              className="btn d-flex align-items-center btn-text"
              onClick={handleDrawerTemplate}
            >
              {" "}
              <i className="icon-template me-2"></i> <span>{isPillUpAccessableFromGB ? 'Temp' : 'Templates'}</span>
            </button>
            <Tooltip
              placement="bottom"
              title={
                medicationData.length > 0
                  ? ""
                  : "Please enter some Medications to save a template"
              }
            >
              <button
                className="btn d-flex align-items-center btn-text"
                onClick={() => medicationData.length > 0 && handleDrawerSave()}
              >
                {" "}
                <i className="icon-save me-2"></i><span>Save</span>
              </button>
            </Tooltip>
            <button onClick={showHideClearData} className="btn btn-text clear-text d-flex align-items-center" disabled={medicationData.length > 0 ? false : true}>
              <i className="icon-eraser1 me-2"></i> {!isPillUpAccessableFromGB && <span>Clear</span>}
            </button>
          </div>
          <Drawer
            title="Medication Templates"
            placement="right"
            onClose={handleDrawerTemplate}
            open={templateDrawer}
            className="modalWidth-563"
            width="auto"
          >
            {TEMPLATE_CONTENT}
          </Drawer>

          <Drawer
            title="Save Template"
            placement="right"
            onClose={handleDrawerSave}
            open={saveDrawer}
            className="modalWidth-563"
            width="auto"
          >
            {SAVE_CONTENT}
          </Drawer>
        </div>
        <div className="d-flex flex-wrap p-14-pb0">
          {TABLE_MEDICATION}
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={handleDrawerChild}
            open={childDrawer}
            className="modalWidth-563"
            width="auto"
          >
            {addCustom ? ADD_MEDICINE_DATA : CHILD_DRAWER_DATA}
          </Drawer>
        </div>
        <div className="p-14 py-0">
          <div
            className="inputheight38 border rounded-10px d-flex align-items-center"
            onClick={handleDrawerParent}
          >
            <i className="icon-search mx-2"></i>
            <span className="fontroboto backbar fw-normal">
              Search Medicines by Name
            </span>
          </div>
        </div>
        <Drawer
          closeIcon={false}
          placement="right"
          onClose={handleDrawerParent}
          open={parentDrawer}
          width={"100%"}
          className="searchdrawer-content"
        >
          {parentDrawer && (
            <TabMedicationSearch
              passIndex={selectedIndex}
              onClose={handleDrawerParent}
            />
          )}
        </Drawer>
        <div
          className="d-flex flex-wrap p-14-pb0 overflow-hidden"
          style={{ maxHeight: "114px" }}
        >
          {parentOptionsList.length > 0 &&
            parentOptionsList
              .filter(
                (e) =>
                  ![
                    ...medicationData.map(
                      (e1) => e1.tmm_medicine_name
                    ),
                  ].includes(e.tmm_medicine_name)
              ).map((item, i) => {
                return (
                  <div className="position-relative">
                    <Button
                      key={i}
                      type="text"
                      className="btn btn-primary2 chips-custom mb-14 me-14"
                      onClick={() => onSelectParent(item)}
                    >
                      <span className="chip-med-content">
                        <span className="chip-med-name">{`${item.tmm_medicine_name}`}</span>
                        {renderLowStockBadge(item)}
                      </span>
                    </Button>
                    {(item?.tmm_hm_type === 1 && item?.um_id === 0) && <span className="position-absolute align-items-center small fs-12-1 d-inline-flex justify-content-center rounded-circle text-white" style={{ width: 18, height: 18, background: '#c44ea2', right: 6, top: -6 }}>Z</span>}
                    {(item?.tmm_hm_type == 15 && Number(item?.um_id) === 0 && isChikitsalayAccessable) && <span className="position-absolute align-items-center small fs-12-1 d-inline-flex justify-content-center rounded-pill text-white" style={{ minWidth: 24, height: 18, padding: '0 5px', lineHeight: '16px', background: '#c44ea2', right: 6, top: -6 }}>VC</span>}
                    <FreeBadge show={item?.is_free} className="position-absolute" style={{ right: 0, top: -10 }} />
                  </div>
                );
              })}
        </div>
        {DELETE_MODAL}
        {REMOVE_ALL_ROWS}
        {/* Dose Calc Drawer */}
        {doseCalculatorDrawer &&
          <Drawer
            closeIcon={false}
            className="modalWidth-800"
            placement="right"
            open={doseCalculatorDrawer}
            onClose={showHideModal2}
            width="auto"
            styles={{
              body: {
                backgroundColor: "white",
              }
            }}
          >
            {addCustom ?
              ADD_MEDICINE_DATA :
              <DoseCalculator
                handleViewDoseCalcDrawer={handleViewDoseCalcDrawer}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                searchMLQuery={searchMLQuery}
                setSearchMLQuery={setSearchMLQuery}
                medicationLibrary={medicationLibrary}
                setMedicationLibrary={setMedicationLibrary}
                parentSearchOptions={parentSearchOptions}
                onSearchParent={onSearchParent}
                onSelectParent={onParentSelectParent}
                setAddCustom={setAddCustom}
                editDoseId={editDoseId}
                isModalOpen2={isModalOpen2}
                showHideModal2={showHideModal2}
              />
            }
          </Drawer>
        }
      </div>
    </>
  );
}

export default React.memo(TabMedicationBox);