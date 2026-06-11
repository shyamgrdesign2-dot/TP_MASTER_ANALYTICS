import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from "react";
import {
  Button,
  Card,
  Row,
  Col,
  Input,
  Select,
  Segmented,
  Form,
  Radio,
  Drawer,
  Tabs,
  Dropdown,
  message
} from "antd";
import {
  Button as BSButton,
  ButtonGroup as BSButtonGroup,
} from "react-bootstrap";
import { InfoCircleOutlined } from "@ant-design/icons";

import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import { errorMessage, onlyNumberFormat, onlyDecimalFormat, isNumeric, hasNumber, removeBeforeWhiteSpace, capitalizeAfterSentence, replaceCommasAndSemicolons, capitalize, calculateDose } from "../../utils/utils";

import CashManagerContext from "../../context/CashManagerContext";
import {
  getMedicineDetails,
  getFrequentlySearchedMedication,
  searchMedication,
  searchGeneric,
  addMedicine,
  editMedicine,
  updateFrequentlyMedication,
  clearGenericList
} from "../../redux/medicationSlice";

import TabSearchHeader from "./TabSearchHeader";
import TabMedicationMoreModal from "./TabMedicationMoreModal";

import { EXTRA_OPTIONS, MESSAGE_KEY, NEO_NATOLOGISTS_DP_ID } from "../../utils/constants";
import { useChikitsalay } from "../../pages/chikitsalay/useChikitsalay";

import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import DoseCalculator from "../dose_calculator/doseCalculator";
import FreeBadge from "../../common/FreeBadge";
import { ASSETS } from "../../assets";
const {
  noRecordRound: noRecordFound,
  calculatorBlue: calculatorIconBlue,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

function TabMedicationSearch({ passIndex, onClose }) {
  const isChikitsalayAccessable = useChikitsalay();
  const renderLowStockBadge = useCallback((med) => {
    if (!isChikitsalayAccessable) return null;
    const available = Number(med?.quantity);
    if (!Number.isFinite(available)) return null;
    let label = null;
    if (available <= 0) {
      label = "No stock";
    } else if (available <= 200) {
      label = `Qty: ${available}`;
    }
    if (!label) return null;
    const isQtyLabel = label.startsWith("Qty:");
    return (
      <span
        className={`stock-pill-badge stock-pill-badge-inside ${isQtyLabel ? "stock-pill-badge-qty" : ""}`}
      >
        {label}
      </span>
    );
  }, [isChikitsalayAccessable]);

  const { profile, frequencyList, timingList, medicineTypeList } = useSelector((state) => state.doctors);
  const { dosesList, parentOptionsList, childOptionsList, genericList, loading } = useSelector((state) => state.medication);
  const { todayData } = useSelector((state) => state.vitals);
  const dispatch = useDispatch();

  const { medicationData, setMedicationData } = useContext(CashManagerContext);

  const [searchChildQuery, setSearchChildQuery] = useState("");
  const [childSearchOptions, setChildSearchOptions] = useState([]);

  const [selectedIndex, setSelectedIndex] = useState(passIndex);
  const SINCE_OPTIONS = [
    { value: "Day(s)", label: "D" },
    { value: "Week(s)", label: "W" },
    { value: "Month(s)", label: "M" },
    { value: "Year(s)", label: "Y" },
  ];

  const [sinceValue, setSinceValue] = useState(medicationData[passIndex] !== undefined && medicationData[passIndex].tmm_days ? parseInt(medicationData[passIndex].tmm_days) : 1);
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
    setEditDoseId(isNumeric(value) ? value : 0)
    setSearchMLQuery("")
    setMedicationLibrary([])
    setAddCustom(null)
  }

  //Taper Dose
  const [selectedIndex1, setSelectedIndex1] = useState(null);
  const [childIndex, setChildIndex] = useState(null);
  const [activeKey, setActiveKey] = useState(medicationData[passIndex] !== undefined && medicationData[passIndex].unique_id ? medicationData[passIndex].unique_id : null);

  const filteredTitles = frequencyList.filter((item) => item.tmf_block !== 0);

  useEffect(() => {
    if (passIndex != null) {
      const setArray = medicationData.reduce((acc, curr) => acc?.at(-1)?.tmm_id == curr.tmm_id ? acc : [...acc, curr], [])
      setSelectedIndex1(setArray?.length - 1)
      setChildIndex(medicationData.findIndex(e => e.unique_id == setArray.at(-1)?.unique_id));
    }
  }, [passIndex]);

  useEffect(() => {
    if (selectedIndex != null) {
      const selectedMedication = medicationData[selectedIndex];
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
  }, [selectedIndex]);

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
        label: <div><span className="fw-medium">{e.tmm_medicine_name}</span>, <span>{e.tmm_generic}</span></div>,
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
  }, [doseCalculatorDrawer, parentOptionsList]);

  //Child AutoComplete
  useEffect(() => {
    if (searchChildQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(
          searchMedication({
            searchQuery: searchChildQuery,
            type: "child",
            isChikitsalayAccessable,
          })
        );
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    }
  }, [isChikitsalayAccessable, searchChildQuery]);

  useEffect(() => {
    const data = [];
    childOptionsList.map((e) => {
      return data.push({
        key: JSON.stringify({ ...e, unique_id: uuidv4() }),
        value: e.tmm_medicine_name,
      });
    });
    if (searchChildQuery.length > 0) {
      searchChildQuery &&
        data.push({
          key: JSON.stringify({
            unique_id: uuidv4(),
            tmm_id: 0,
            tmm_medicine_name: searchChildQuery
          }),
          value: `${searchChildQuery}${Math.random()}`,
        });
    }
    setChildSearchOptions(data);
  }, [childOptionsList]);

  const onSearchParent = useCallback(
    (query) => {
      doseCalculatorDrawer ?
        setSearchMLQuery(query) :
        setSearchChildQuery(query);
    },
    [doseCalculatorDrawer, searchMLQuery, searchChildQuery]
  );

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
            // tmm_unit_name:unitObj && unitObj !== undefined? JSON.parse(unitObj.key).tmu_title : "",
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
          setActiveKey(updatedData[0]?.unique_id);

          const setArray = medicationData.reduce((acc, curr) => acc?.at(-1)?.tmm_id == curr.tmm_id ? acc : [...acc, curr], [])
          setSelectedIndex1(setArray?.length - 1)
          setChildIndex(medicationData.findIndex(e => e.unique_id == setArray.at(-1)?.unique_id));

          setSinceValue(updatedData[0].tmm_days ? parseInt(updatedData[0].tmm_days) : 1);
          setSearchChildQuery("");
          setAddCustom(null);
        }
      } else {
        errorMessage(action.error)
      }
    }
  }

  const innerMedication = (index) => {
    const mainArray = []
    for (var i = index; i < medicationData.length; i++) {
      if (medicationData[i]?.tmm_id == medicationData[index]?.tmm_id) {
        mainArray.push(medicationData[i])
      } else {
        break;
      }
    }
    return mainArray
  }

  const onRemoveRow = async (index) => {
    const childData = await innerMedication(index)
    childData.map((e) => {
      const mainIndex = medicationData.findIndex(x => x.unique_id == e.unique_id);
      if (mainIndex != -1) {
        medicationData.splice(mainIndex, 1)
      }
    })
    setMedicationData((prev) => [...prev]);
    setSelectedIndex(null);
    setActiveKey(null);
    setSelectedIndex1(null);
    setChildIndex(null);
  };

  //Child Componet

  const SortableItem = SortableElement(({ item }) => {
    let tmm_freq_type_name = `${item.tmm_dosage && item.tmm_unit_name ? `${item.tmm_dosage} ${item.tmm_unit_name}` + " | " : ""}${item.tcm_tmm_freq_morning ? item.tcm_tmm_freq_morning + " - " : "0 -"}${item.tcm_tmm_freq_afternoon ? item.tcm_tmm_freq_afternoon + " - " : "0 -"}${item.tcm_tmm_freq_evening ? item.tcm_tmm_freq_evening + " - " : selectedTab != 'man' ? "0 -" : ""}${item.tcm_tmm_freq_night ? item.tcm_tmm_freq_night + " | " : "0 |"}${item.tmm_time_name ? item.tmm_time_name : ""}`;
    tmm_freq_type_name = tmm_freq_type_name === `0 -0 -0 |None` ? "" : tmm_freq_type_name;
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
        zIndex: 9999,
      }}
      className={`${selectedIndex1 == item?.index1 && "closable-chips-active"
        } position-relative d-flex align-items-center justify-content-between closable-chips`}
    >
      <div
        className="text-truncate p-2"
        onClick={() => {
          setSelectedIndex(item?.index);
          setActiveKey(item?.unique_id);

          setSelectedIndex1(item?.index1);
          setChildIndex(item?.index);

          setSinceValue(item.tmm_days ? parseInt(item.tmm_days) : 1);
          setAddCustom(null);
        }}
      >
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
            item={{ ...item, index1: index }}
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
  }, [medicationData, selectedIndex, selectedIndex1, childIndex, selectedTab]);

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
  //           className={`${selectedIndex1 == index && "closable-chips-active"
  //             } d-flex align-items-center justify-content-between text-truncate closable-chips`}
  //         >
  //           <div
  //             className="text-truncate p-2"
  //             onClick={() => {
  //               setSelectedIndex(item?.index);
  //               setActiveKey(item?.unique_id);

  //               setSelectedIndex1(index);
  //               setChildIndex(item?.index);

  //               setSinceValue(item.tmm_days ? parseInt(item.tmm_days) : 1);
  //               setAddCustom(null);
  //             }}
  //           >
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
  // }, [medicationData, selectedIndex, selectedIndex1, childIndex, selectedTab]);

  const onChangeDosageChild = useCallback(
    (e) => {
      const updateQuery = onlyDecimalFormat(e.target.value);
      medicationData[selectedIndex].tmm_dosage = updateQuery;
      setMedicationData((prev) => [...prev]);
    },
    [selectedIndex, medicationData]
  );

  const onSelectMedicineUnitChild = useCallback(
    (data) => {
      const obj = medicationData[selectedIndex].medicineUnit
        ? medicationData[selectedIndex].medicineUnit.find(
          (e) => e.value == data
        )
        : null;
      if (obj && obj !== undefined) {
        const objParse = JSON.parse(obj.key);
        medicationData[selectedIndex].tmm_unit = objParse.tmu_id;
        medicationData[selectedIndex].tmm_unit_name = objParse.tmu_title;
        medicationData[selectedIndex].tmu_id = objParse.tmu_id;
        setMedicationData((prev) => [...prev]);
      }
    },
    [selectedIndex, medicationData]
  );

  const morningDecrement = useCallback(() => {
    if (parseInt(medicationData[selectedIndex].tcm_tmm_freq_morning) > 0) {
      medicationData[selectedIndex].tcm_tmm_freq_morning =
        parseInt(medicationData[selectedIndex].tcm_tmm_freq_morning) - 1;
      setMedicationData((prev) => [...prev]);
    }
  }, [selectedIndex, medicationData]);

  const morningClick = useCallback(() => {
    medicationData[selectedIndex].tcm_tmm_freq_morning = 1;
    setMedicationData((prev) => [...prev]);
  }, [selectedIndex, medicationData]);

  const onChangeInputMorningChild = useCallback(
    (e) => {
      const updateQuery = onlyDecimalFormat(e.target.value);
      medicationData[selectedIndex].tcm_tmm_freq_morning = updateQuery;
      setMedicationData((prev) => [...prev]);
    },
    [selectedIndex, medicationData]
  );

  const morningIncrement = useCallback(() => {
    medicationData[selectedIndex].tcm_tmm_freq_morning =
      parseInt(medicationData[selectedIndex].tcm_tmm_freq_morning) + 1;
    setMedicationData((prev) => [...prev]);
  }, [selectedIndex, medicationData]);

  const afternoonDecrement = useCallback(() => {
    if (parseInt(medicationData[selectedIndex].tcm_tmm_freq_afternoon) > 0) {
      medicationData[selectedIndex].tcm_tmm_freq_afternoon =
        parseInt(medicationData[selectedIndex].tcm_tmm_freq_afternoon) - 1;
      setMedicationData((prev) => [...prev]);
    }
  }, [selectedIndex, medicationData]);

  const afternoonClick = useCallback(() => {
    medicationData[selectedIndex].tcm_tmm_freq_afternoon = 1;
    setMedicationData((prev) => [...prev]);
  }, [selectedIndex, medicationData]);

  const onChangeInputAfternoonChild = useCallback(
    (e) => {
      const updateQuery = onlyDecimalFormat(e.target.value);
      medicationData[selectedIndex].tcm_tmm_freq_afternoon = updateQuery;
      setMedicationData((prev) => [...prev]);
    },
    [selectedIndex, medicationData]
  );

  const afternoonIncrement = useCallback(() => {
    medicationData[selectedIndex].tcm_tmm_freq_afternoon =
      parseInt(medicationData[selectedIndex].tcm_tmm_freq_afternoon) + 1;
    setMedicationData((prev) => [...prev]);
  }, [selectedIndex, medicationData]);

  const eveningDecrement = useCallback(() => {
    if (parseInt(medicationData[selectedIndex].tcm_tmm_freq_evening) > 0) {
      medicationData[selectedIndex].tcm_tmm_freq_evening =
        parseInt(medicationData[selectedIndex].tcm_tmm_freq_evening) - 1;
      setMedicationData((prev) => [...prev]);
    }
  }, [selectedIndex, medicationData]);

  const eveningClick = useCallback(() => {
    medicationData[selectedIndex].tcm_tmm_freq_evening = 1;
    setMedicationData((prev) => [...prev]);
  }, [selectedIndex, medicationData]);

  const onChangeInputEveningChild = useCallback(
    (e) => {
      const updateQuery = onlyDecimalFormat(e.target.value);
      medicationData[selectedIndex].tcm_tmm_freq_evening = updateQuery;
      setMedicationData((prev) => [...prev]);
    },
    [selectedIndex, medicationData]
  );

  const eveningIncrement = useCallback(() => {
    medicationData[selectedIndex].tcm_tmm_freq_evening =
      parseInt(medicationData[selectedIndex].tcm_tmm_freq_evening) + 1;
    setMedicationData((prev) => [...prev]);
  }, [selectedIndex, medicationData]);

  const nightDecrement = useCallback(() => {
    if (parseInt(medicationData[selectedIndex].tcm_tmm_freq_night) > 0) {
      medicationData[selectedIndex].tcm_tmm_freq_night =
        parseInt(medicationData[selectedIndex].tcm_tmm_freq_night) - 1;
      setMedicationData((prev) => [...prev]);
    }
  }, [selectedIndex, medicationData]);

  const nightClick = useCallback(() => {
    medicationData[selectedIndex].tcm_tmm_freq_night = 1;
    setMedicationData((prev) => [...prev]);
  }, [selectedIndex, medicationData]);

  const onChangeInputNightChild = useCallback(
    (e) => {
      const updateQuery = onlyDecimalFormat(e.target.value);
      medicationData[selectedIndex].tcm_tmm_freq_night = updateQuery;
      setMedicationData((prev) => [...prev]);
    },
    [selectedIndex, medicationData]
  );

  const nightIncrement = useCallback(() => {
    medicationData[selectedIndex].tcm_tmm_freq_night =
      parseInt(medicationData[selectedIndex].tcm_tmm_freq_night) + 1;
    setMedicationData((prev) => [...prev]);
  }, [selectedIndex, medicationData]);

  const handleRadioChange = useCallback(
    (e) => {
      setSelectedTab(e.target.value);
      if (e.target.value !== "other") {
        medicationData[selectedIndex].tmf_block = 0;
      } else {
        medicationData[selectedIndex].tmf_block = 1;
      }
      medicationData[selectedIndex].tmm_freq_type = 0;
      medicationData[selectedIndex].tmm_freq_type_name = "";
      medicationData[selectedIndex].tcm_tmm_freq_afternoon = 0;
      medicationData[selectedIndex].tcm_tmm_freq_evening = 0;
      medicationData[selectedIndex].tcm_tmm_freq_morning = 0;
      medicationData[selectedIndex].tcm_tmm_freq_night = 0;
      setMedicationData((prev) => [...prev]);
    },
    [selectedTab, medicationData]
  );

  const onChangeFrequencyChild = useCallback(
    (item) => {
      if (item.tmf_id != medicationData[selectedIndex].tmm_freq_type) {
        medicationData[selectedIndex].tmm_freq_type = item.tmf_id;
        medicationData[selectedIndex].tmm_freq_type_name = item.tmf_title;
        medicationData[selectedIndex].tmf_block_val = item.tmf_block_val;
      } else {
        medicationData[selectedIndex].tmm_freq_type = 0;
        medicationData[selectedIndex].tmm_freq_type_name = "";
        medicationData[selectedIndex].tmf_block_val = "";
      }
      setMedicationData((prev) => [...prev]);
    },
    [selectedIndex, medicationData]
  );

  const handleFrequencyMoreOptionsVisible = useCallback(
    () => {
      setFrequencyMoreOptionsVisible(!frequencyMoreOptionsVisible)
    },
    [frequencyMoreOptionsVisible]
  );

  const onChangeTimingChild = useCallback(
    (item) => {
      if (item.tmt_id != medicationData[selectedIndex].tmm_time) {
        medicationData[selectedIndex].tmm_time = item.tmt_id;
        medicationData[selectedIndex].tmm_time_name = item.tmt_title;
      } else {
        medicationData[selectedIndex].tmm_time = 0;
        medicationData[selectedIndex].tmm_time_name = "";
      }
      setMedicationData((prev) => [...prev]);
    },
    [selectedIndex, medicationData]
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
      medicationData[selectedIndex].tmm_days = 0;
      medicationData[selectedIndex].tmm_duration_type = "";
      setMedicationData((prev) => [...prev]);
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
    [inputSince, sinceOptions, medicationData]
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
      medicationData[selectedIndex].tmm_days = 0;
      medicationData[selectedIndex].tmm_duration_type = "";
      setMedicationData((prev) => [...prev]);
    },
    [sinceValue, selectedIndex, medicationData]
  );

  const onChangeSinceChild = useCallback(
    (key) => {
      if (hasNumber(key)) {
        if (key != medicationData[selectedIndex].tmm_days_duration_type) {
          medicationData[selectedIndex].tmm_days_duration_type = key;
          medicationData[selectedIndex].tmm_days = key.split(" ")[0];
          medicationData[selectedIndex].tmm_duration_type = key.split(" ")[1];
        } else {
          medicationData[selectedIndex].tmm_days_duration_type = "";
          medicationData[selectedIndex].tmm_days = 0;
          medicationData[selectedIndex].tmm_duration_type = "";
        }
        setMedicationData((prev) => [...prev]);
      }
    },
    [selectedIndex, medicationData]
  );

  const onChangeDurationChild = useCallback(
    (item) => {
      if (item.value != medicationData[selectedIndex].tmm_days_duration_type) {
        medicationData[selectedIndex].tmm_days_duration_type = item.value;
        medicationData[selectedIndex].tmm_days = 0;
        medicationData[selectedIndex].tmm_duration_type = item.value;
      } else {
        medicationData[selectedIndex].tmm_days_duration_type = "";
        medicationData[selectedIndex].tmm_days = 0;
        medicationData[selectedIndex].tmm_duration_type = "";
      }
      setMedicationData((prev) => [...prev]);
    },
    [selectedIndex, medicationData]
  );

  const onAutoFillDuration = () => {
    const { tmm_days_duration_type, tmm_days, tmm_duration_type } = medicationData[selectedIndex]
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
      medicationData[selectedIndex].tmm_remarks = e.target.value;
      setMedicationData((prev) => [...prev]);
    },
    [selectedIndex, medicationData]
  );

  const onChange = (unique_id) => {
    setActiveKey(unique_id);
    setSelectedIndex(medicationData?.findIndex(e => e.unique_id == unique_id))
    const data = medicationData?.find(e => e.unique_id == unique_id)
    setSinceValue(data && data?.tmm_days ? parseInt(data?.tmm_days) : 1);
  }

  const taperDoseAdd = async (item) => {
    const array = await innerMedication(childIndex).map(e1 => ({ ...e1, index: medicationData.findIndex(e => e.unique_id == e1.unique_id) }))
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
    medicationData.splice(parseInt(array.at(-1).index) + 1, 0, updatedData);
    setMedicationData((prev) => [...prev]);
    setSelectedIndex(parseInt(array.at(-1).index) + 1);
    setSinceValue(updatedData.tmm_days ? parseInt(updatedData.tmm_days) : 1);
    setSearchChildQuery("");
    setAddCustom(null);
    setActiveKey(updatedData.unique_id);
  };

  const onEdit = (unique_id, action, item) => {
    if (action === 'add') {
      taperDoseAdd(item);
    } else {
      const index = medicationData.findIndex(e => e.unique_id == unique_id)
      if (index != -1) {
        medicationData.splice(index, 1);
        setMedicationData((prev) => [...prev]);
        const checkIndex = medicationData.findIndex(e => e.unique_id == activeKey)
        if (checkIndex != -1) {
          setSelectedIndex(checkIndex);
        } else {
          setSelectedIndex(childIndex);
          setActiveKey(medicationData[childIndex]?.unique_id);
        }
      }
    }
  };

  // Dose Calc Dropdown
  const items = [
    (profile?.dp_id === 9 || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) && {
      label: dosesList.some((e1) => e1.medicine_id == medicationData[selectedIndex]?.tmm_id) ?
        <div onClick={() => handleViewDoseCalcDrawer("1", medicationData[selectedIndex]?.tmm_id)}>
          <img src={calculatorIconBlue} alt="Dose calcultor" className="me-2" width={16} />Edit Calculation</div>
        :
        <div onClick={() => handleViewDoseCalcDrawer("1", 0)}>
          <img src={calculatorIconBlue} alt="Dose calcultor" className="me-2" width={16} />Dose Calculator</div>,
      key: 'Dose Calculator',
    },
    !medicationData[selectedIndex]?.pms_default &&
    {
      label: <div onClick={() => {
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
      }}> <i className="icon-Edit text-primary fs-18 me-2"></i>Edit</div>,
      key: 'Edit',
    },
  ];

  //Child Componet
  const CHILD_DRAWER_DATA = useMemo(() => {
    return (
      selectedIndex != null && medicationData[selectedIndex] !== undefined && (
        <>
          <div className="h-100">
            <div className="selectedchip-header d-flex align-items-center justify-content-between title px-20">
              <div className="text-truncate title-common fontroboto">
                {selectedIndex != null &&
                  medicationData[selectedIndex]?.tmm_medicine_name}
                <div className="text-truncate fs-14 fw-normal fontroboto mt-1">
                  {selectedIndex != null &&
                    medicationData[selectedIndex]?.tmm_generic}
                </div>
              </div>
              {((profile?.dp_id === 9 || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) || !medicationData[selectedIndex]?.pms_default) && (
                <Dropdown className='btn btn-outline btn-more pe-0' menu={{ items }} trigger={['click']}>
                  <a onClick={(e) => e.preventDefault()}>
                    <i className='icon-More'></i>
                  </a>
                </Dropdown>
              )}
            </div>
            <Tabs
              type="editable-card"
              onChange={onChange}
              activeKey={activeKey}
              onEdit={(targetKey, action) => onEdit(targetKey, action, medicationData[childIndex])}
              items={childIndex != null && innerMedication(childIndex).map((e, i) => {
                return {
                  key: e.unique_id,
                  label: `Dose ${i + 1}`,
                  children: null,
                };
              })}
              className="tablet-medication-tabs"
            />
            <i className="icon-Add custom-tapper-button" onClick={() => taperDoseAdd(medicationData[childIndex])} />
            <div className="p-4">
              <div>
                <label className="title-common mb-1">Unit/Dose</label>
                <Row gutter={20} className="mb-3">
                  <Col md={12}>
                    <Input
                      placeholder="e.g. 1"
                      value={
                        medicationData[selectedIndex]?.tmm_dosage
                          ? medicationData[selectedIndex].tmm_dosage
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
                        medicationData[selectedIndex]?.medicineUnit
                          ? medicationData[selectedIndex].medicineUnit.findIndex(
                            (e) => e.value == medicationData[selectedIndex].tmm_unit
                          ) !== -1
                            ? parseInt(medicationData[selectedIndex].tmm_unit)
                            : null
                          : null
                      }
                      value={
                        medicationData[selectedIndex]?.medicineUnit
                          ? medicationData[selectedIndex].medicineUnit.findIndex(
                            (e) => e.value == medicationData[selectedIndex].tmm_unit
                          ) !== -1
                            ? parseInt(medicationData[selectedIndex].tmm_unit)
                            : null
                          : null
                      }
                      onSelect={onSelectMedicineUnitChild}
                      options={medicationData[selectedIndex].medicineUnit}
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
                        className="inputheight45 border rounded-0"
                      >
                        {medicationData[selectedIndex].tcm_tmm_freq_morning !== undefined &&
                          medicationData[selectedIndex].tcm_tmm_freq_morning != 0 && (
                            <BSButton
                              variant="outline-light"
                              className="rounded-0 dateoutline px-2 bg-white"
                              disabled={medicationData[selectedIndex].tmf_block}
                              onClick={morningDecrement}
                            >
                              <i className="icon-minus fs-18 d-block text-main"></i>
                            </BSButton>
                          )}
                        <BSButton
                          variant="outline-light"
                          className="rounded-0 dateoutline p-0 bg-white"
                          disabled={medicationData[selectedIndex].tmf_block}
                          onClick={() =>
                            !medicationData[selectedIndex].tcm_tmm_freq_morning && morningClick()
                          }
                        >
                          <Input
                            placeholder="Morning"
                            inputMode="numeric"
                            value={
                              medicationData[selectedIndex].tcm_tmm_freq_morning
                                ? medicationData[selectedIndex].tcm_tmm_freq_morning
                                : ""
                            }
                            className="rounded-0 h-100 text-center text-main"
                            onChange={onChangeInputMorningChild}
                          />
                        </BSButton>
                        {medicationData[selectedIndex].tcm_tmm_freq_morning !== undefined &&
                          medicationData[selectedIndex].tcm_tmm_freq_morning != 0 && (
                            <BSButton
                              variant="outline-light"
                              className="rounded-0 dateoutline px-2 bg-white"
                              disabled={medicationData[selectedIndex].tmf_block}
                              onClick={morningIncrement}
                            >
                              <i className="icon-Add fs-18 text-main d-block"></i>
                            </BSButton>
                          )}
                      </BSButtonGroup>
                    </Col>
                    <Col sm={8}>
                      <BSButtonGroup
                        aria-label="Basic example"
                        className="inputheight45 border rounded-0 border-start-0"
                      >
                        {medicationData[selectedIndex].tcm_tmm_freq_afternoon !== undefined &&
                          medicationData[selectedIndex].tcm_tmm_freq_afternoon != 0 && (
                            <BSButton
                              variant="outline-light"
                              className="rounded-0 dateoutline px-2 bg-white"
                              disabled={medicationData[selectedIndex].tmf_block}
                              onClick={afternoonDecrement}
                            >
                              <i className="icon-minus fs-18 d-block text-main"></i>
                            </BSButton>
                          )}
                        <BSButton
                          variant="outline-light"
                          className="rounded-0 dateoutline p-0 bg-white"
                          disabled={medicationData[selectedIndex].tmf_block}
                          onClick={() =>
                            !medicationData[selectedIndex].tcm_tmm_freq_afternoon && afternoonClick()
                          }
                        >
                          <Input
                            placeholder="Afternoon"
                            inputMode="numeric"
                            value={
                              medicationData[selectedIndex].tcm_tmm_freq_afternoon
                                ? medicationData[selectedIndex].tcm_tmm_freq_afternoon
                                : ""
                            }
                            className="rounded-0 h-100 text-center text-main"
                            onChange={onChangeInputAfternoonChild}
                          />
                        </BSButton>
                        {medicationData[selectedIndex].tcm_tmm_freq_afternoon !== undefined &&
                          medicationData[selectedIndex].tcm_tmm_freq_afternoon != 0 && (
                            <BSButton
                              variant="outline-light"
                              className="rounded-0 dateoutline px-2 bg-white"
                              disabled={medicationData[selectedIndex].tmf_block}
                              onClick={afternoonIncrement}
                            >
                              <i className="icon-Add fs-18 text-main d-block"></i>
                            </BSButton>
                          )}
                      </BSButtonGroup>
                    </Col>
                    <Col sm={8}>
                      <BSButtonGroup
                        aria-label="Basic example"
                        className="inputheight45 border rounded-0 border-start-0"
                      >
                        {medicationData[selectedIndex].tcm_tmm_freq_night !== undefined &&
                          medicationData[selectedIndex].tcm_tmm_freq_night != 0 && (
                            <BSButton
                              variant="outline-light"
                              className="rounded-0 dateoutline px-2 bg-white"
                              disabled={medicationData[selectedIndex].tmf_block}
                              onClick={nightDecrement}
                            >
                              <i className="icon-minus fs-18 d-block text-main"></i>
                            </BSButton>
                          )}
                        <BSButton
                          variant="outline-light"
                          className="rounded-0 dateoutline p-0 bg-white"
                          disabled={medicationData[selectedIndex].tmf_block}
                          onClick={() =>
                            !medicationData[selectedIndex].tcm_tmm_freq_night && nightClick()
                          }
                        >
                          <Input
                            placeholder="Night"
                            inputMode="numeric"
                            value={
                              medicationData[selectedIndex].tcm_tmm_freq_night
                                ? medicationData[selectedIndex].tcm_tmm_freq_night
                                : ""
                            }
                            className="rounded-0 h-100 text-center text-main"
                            onChange={onChangeInputNightChild}
                          />
                        </BSButton>
                        {medicationData[selectedIndex].tcm_tmm_freq_night !== undefined &&
                          medicationData[selectedIndex].tcm_tmm_freq_night != 0 && (
                            <BSButton
                              variant="outline-light"
                              className="rounded-0 dateoutline px-2 bg-white"
                              disabled={medicationData[selectedIndex].tmf_block}
                              onClick={nightIncrement}
                            >
                              <i className="icon-Add fs-18 text-main d-block"></i>
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
                        {medicationData[selectedIndex].tcm_tmm_freq_morning !== undefined &&
                          medicationData[selectedIndex].tcm_tmm_freq_morning != 0 && (
                            <BSButton
                              variant="outline-light"
                              className="rounded-0 dateoutline px-1 bg-white"
                              disabled={medicationData[selectedIndex].tmf_block}
                              onClick={morningDecrement}
                            >
                              <i className="icon-minus fs-18 d-block text-main"></i>
                            </BSButton>
                          )}
                        <BSButton
                          variant="outline-light"
                          className="rounded-0 dateoutline p-0 bg-white"
                          disabled={medicationData[selectedIndex].tmf_block}
                          onClick={() =>
                            !medicationData[selectedIndex].tcm_tmm_freq_morning && morningClick()
                          }
                        >
                          <Input
                            placeholder="Morning"
                            inputMode="numeric"
                            value={
                              medicationData[selectedIndex].tcm_tmm_freq_morning
                                ? medicationData[selectedIndex].tcm_tmm_freq_morning
                                : ""
                            }
                            className="rounded-0 h-100 px-1 text-center text-main"
                            onChange={onChangeInputMorningChild}
                          />
                        </BSButton>
                        {medicationData[selectedIndex].tcm_tmm_freq_morning !== undefined &&
                          medicationData[selectedIndex].tcm_tmm_freq_morning != 0 && (
                            <BSButton
                              variant="outline-light"
                              className="rounded-0 dateoutline px-1 bg-white"
                              disabled={medicationData[selectedIndex].tmf_block}
                              onClick={morningIncrement}
                            >
                              <i className="icon-Add fs-18 text-main d-block"></i>
                            </BSButton>
                          )}
                      </BSButtonGroup>
                    </Col>
                    <Col sm={6}>
                      <BSButtonGroup
                        aria-label="Basic example"
                        className="inputheight45 border rounded-0 border-start-0"
                      >
                        {medicationData[selectedIndex].tcm_tmm_freq_afternoon !== undefined &&
                          medicationData[selectedIndex].tcm_tmm_freq_afternoon != 0 && (
                            <BSButton
                              variant="outline-light"
                              className="rounded-0 dateoutline px-1 bg-white"
                              disabled={medicationData[selectedIndex].tmf_block}
                              onClick={afternoonDecrement}
                            >
                              <i className="icon-minus fs-18 d-block text-main"></i>
                            </BSButton>
                          )}
                        <BSButton
                          variant="outline-light"
                          className="rounded-0 dateoutline p-0 bg-white"
                          disabled={medicationData[selectedIndex].tmf_block}
                          onClick={() =>
                            !medicationData[selectedIndex].tcm_tmm_freq_afternoon && afternoonClick()
                          }
                        >
                          <Input
                            placeholder="Afternoon"
                            inputMode="numeric"
                            value={
                              medicationData[selectedIndex].tcm_tmm_freq_afternoon
                                ? medicationData[selectedIndex].tcm_tmm_freq_afternoon
                                : ""
                            }
                            className="rounded-0 h-100 px-1 text-center text-main"
                            onChange={onChangeInputAfternoonChild}
                          />
                        </BSButton>
                        {medicationData[selectedIndex].tcm_tmm_freq_afternoon !== undefined &&
                          medicationData[selectedIndex].tcm_tmm_freq_afternoon != 0 && (
                            <BSButton
                              variant="outline-light"
                              className="rounded-0 dateoutline px-1 bg-white"
                              disabled={medicationData[selectedIndex].tmf_block}
                              onClick={afternoonIncrement}
                            >
                              <i className="icon-Add fs-18 text-main d-block"></i>
                            </BSButton>
                          )}
                      </BSButtonGroup>
                    </Col>
                    <Col sm={6}>
                      <BSButtonGroup
                        aria-label="Basic example"
                        className="inputheight45 border rounded-0 border-start-0"
                      >
                        {medicationData[selectedIndex].tcm_tmm_freq_evening !== undefined &&
                          medicationData[selectedIndex].tcm_tmm_freq_evening != 0 && (
                            <BSButton
                              variant="outline-light"
                              className="rounded-0 dateoutline px-1 bg-white"
                              disabled={medicationData[selectedIndex].tmf_block}
                              onClick={eveningDecrement}
                            >
                              <i className="icon-minus fs-18 d-block text-main"></i>
                            </BSButton>
                          )}
                        <BSButton
                          variant="outline-light"
                          className="rounded-0 dateoutline p-0 bg-white"
                          disabled={medicationData[selectedIndex].tmf_block}
                          onClick={() =>
                            !medicationData[selectedIndex].tcm_tmm_freq_evening && eveningClick()
                          }
                        >
                          <Input
                            placeholder="Evening"
                            inputMode="numeric"
                            value={
                              medicationData[selectedIndex].tcm_tmm_freq_evening
                                ? medicationData[selectedIndex].tcm_tmm_freq_evening
                                : ""
                            }
                            className="rounded-0 px-1 h-100 text-center text-main"
                            onChange={onChangeInputEveningChild}
                          />
                        </BSButton>
                        {medicationData[selectedIndex].tcm_tmm_freq_evening !== undefined &&
                          medicationData[selectedIndex].tcm_tmm_freq_evening != 0 && (
                            <BSButton
                              variant="outline-light"
                              className="rounded-0 dateoutline px-1 bg-white"
                              disabled={medicationData[selectedIndex].tmf_block}
                              onClick={eveningIncrement}
                            >
                              <i className="icon-Add fs-18 text-main d-block"></i>
                            </BSButton>
                          )}
                      </BSButtonGroup>
                    </Col>
                    <Col sm={6}>
                      <BSButtonGroup
                        aria-label="Basic example"
                        className="inputheight45 border rounded-0 border-start-0"
                      >
                        {medicationData[selectedIndex].tcm_tmm_freq_night !== undefined &&
                          medicationData[selectedIndex].tcm_tmm_freq_night != 0 && (
                            <BSButton
                              variant="outline-light"
                              className="rounded-0 dateoutline px-1 bg-white"
                              disabled={medicationData[selectedIndex].tmf_block}
                              onClick={nightDecrement}
                            >
                              <i className="icon-minus fs-18 d-block text-main"></i>
                            </BSButton>
                          )}
                        <BSButton
                          variant="outline-light"
                          className="rounded-0 dateoutline p-0 bg-white"
                          disabled={medicationData[selectedIndex].tmf_block}
                          onClick={() =>
                            !medicationData[selectedIndex].tcm_tmm_freq_night && nightClick()
                          }
                        >
                          <Input
                            placeholder="Night"
                            inputMode="numeric"
                            value={
                              medicationData[selectedIndex].tcm_tmm_freq_night
                                ? medicationData[selectedIndex].tcm_tmm_freq_night
                                : ""
                            }
                            className="rounded-0 h-100 px-1 text-center text-main"
                            onChange={onChangeInputNightChild}
                          />
                        </BSButton>
                        {medicationData[selectedIndex].tcm_tmm_freq_night !== undefined &&
                          medicationData[selectedIndex].tcm_tmm_freq_night != 0 && (
                            <BSButton
                              variant="outline-light"
                              className="rounded-0 dateoutline px-1 bg-white"
                              disabled={medicationData[selectedIndex].tmf_block}
                              onClick={nightIncrement}
                            >
                              <i className="icon-Add fs-18 text-main d-block"></i>
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
                              className={`btn text-truncate px-1 ${selectedIndex != null && medicationData[selectedIndex].tmm_freq_type == item.tmf_id &&
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
                                className={`btn text-truncate segment-more px-1 ${selectedIndex != null && filteredTitles
                                  .slice(2, filteredTitles.length)
                                  .some(
                                    (e) =>
                                      e.tmf_id == medicationData[selectedIndex].tmm_freq_type
                                  ) &&
                                  "btn-segement"
                                  }`}
                                onClick={handleFrequencyMoreOptionsVisible}
                              >
                                {selectedIndex != null && filteredTitles
                                  .slice(2, filteredTitles.length)
                                  .some(
                                    (e) =>
                                      e.tmf_id == medicationData[selectedIndex].tmm_freq_type
                                  ) ? (
                                  <span id="selected">
                                    <i className="icon-Edit me-2 fs-21"></i>
                                    {medicationData[selectedIndex].tmm_freq_type_name}
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
                      width='41.5%'
                      title={'Frequency'}
                      onClose={handleFrequencyMoreOptionsVisible}
                      onClick={(item) => {
                        setFrequencyMoreOptionsVisible(false);
                        onChangeFrequencyChild(item);
                      }}
                      label={'tmf_title'}
                      value={'tmf_id'}
                      selectedValue={medicationData[selectedIndex].tmm_freq_type}
                      array={filteredTitles.slice(2, filteredTitles.length)} />
                  )}
                </div>
                <div className="segement-static d-flex flex-wrap">
                  {timingList.slice(0, 5).map((item, i) => {
                    return (
                      <>
                        <button
                          key={i}
                          type="button"
                          className={`btn mt-3 text-truncate px-1 ${selectedIndex != null && medicationData[selectedIndex].tmm_time == item.tmt_id &&
                            "btn-segement"
                            }`}
                          onClick={() => onChangeTimingChild(item)}
                        >
                          {item.tmt_title}
                        </button>
                        {i == timingList.slice(0, 5).length - 1 && (
                          <button
                            key={-1}
                            type="button"
                            className={`btn mt-3 text-truncate px-1 segment-more ${selectedIndex != null && timingList
                              .slice(5, timingList.length)
                              .some(
                                (e) => e.tmt_id == medicationData[selectedIndex].tmm_time
                              ) &&
                              "btn-segement"
                              }`}
                            onClick={handleTimingMoreOptionsVisible}
                          >
                            {selectedIndex != null && timingList
                              .slice(5, timingList.length)
                              .some(
                                (e) => e.tmt_id == medicationData[selectedIndex].tmm_time
                              ) ? (
                              <span id="selected">
                                <i className="icon-Edit me-2 fs-21"></i>
                                {medicationData[selectedIndex].tmm_time_name}
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
                    width='41.5%'
                    title={'Timings'}
                    onClose={handleTimingMoreOptionsVisible}
                    onClick={(item) => {
                      setTimingMoreOptionsVisible(false);
                      onChangeTimingChild(item);
                    }}
                    label={'tmt_title'}
                    value={'tmt_id'}
                    selectedValue={medicationData[selectedIndex].tmm_time}
                    array={timingList.slice(5, timingList.length)} />
                )}
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
              <div className="mt-3 mb-2">
                <div className="segement-static d-flex">
                  {sinceOptions.map((item, i) => {
                    return (
                      <>
                        <button key={i}
                          type="button"
                          className={`btn ${selectedIndex != null && medicationData[selectedIndex].tmm_days_duration_type == item.value && 'btn-segement'}`}
                          onClick={() => onChangeSinceChild(item.value)}>
                          {item.label}
                        </button>
                        {i == sinceOptions.length - 1 && (
                          <button
                            key={-1}
                            type="button"
                            className={`btn text-truncate px-1 segment-more ${selectedIndex != null && EXTRA_OPTIONS.some((e) => e.value == medicationData[selectedIndex].tmm_days_duration_type) && "btn-segement"}`}
                            onClick={handleDurationMoreOptionsVisible}
                          >
                            {selectedIndex != null && EXTRA_OPTIONS.some((e) => e.value == medicationData[selectedIndex].tmm_days_duration_type) ? (
                              <span id="selected">
                                <i className="icon-Edit me-2 fs-21"></i>
                                {hasNumber(medicationData[selectedIndex].tmm_days_duration_type) ? medicationData[selectedIndex].tmm_days_duration_type : capitalize(medicationData[selectedIndex].tmm_days_duration_type, true)}
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
                    width='41.5%'
                    title={'Duration'}
                    onClose={handleDurationMoreOptionsVisible}
                    onClick={(item) => {
                      setDurationMoreOptionsVisible(false);
                      onChangeDurationChild(item);
                    }}
                    label={'label'}
                    value={'value'}
                    selectedValue={medicationData[selectedIndex].tmm_days_duration_type}
                    array={EXTRA_OPTIONS} />
                )}
                {/* <Segmented
                  value={
                    medicationData[selectedIndex].tmm_duration_type !==
                    undefined && medicationData[selectedIndex].tmm_days !==
                    undefined &&
                    `${medicationData[selectedIndex].tmm_days} ${medicationData[selectedIndex].tmm_duration_type}`
                  }
                  className="search-segment"
                  options={sinceOptions}
                  onChange={onChangeSinceChild}
                /> */}
              </div>

              {medicationData[selectedIndex].tmm_days_duration_type && (
                <div className="text-primary d-flex align-items-center"><i className="icon-copyIcon fs-16 me-1" /> <span className="text-primary text-decoration-underline" onClick={onAutoFillDuration}>Autofill this duration for all added meds.</span></div>
              )}

              <label className="title-common mb-1 mt-3">Note</label>
              <Input.TextArea
                value={
                  medicationData[selectedIndex].tmm_remarks
                    ? medicationData[selectedIndex].tmm_remarks
                    : ""
                }
                placeholder="Enter any specific notes here"
                className="textareaPlaceholder"
                rows={3}
                onChange={onChangeInputNoteChild}
              />
            </div>
          </div>
        </>
      )
    );
  }, [
    selectedIndex,
    medicationData,
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
            // tmm_unit_name:unitObj && unitObj !== undefined? JSON.parse(unitObj.key).tmu_title : "",
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
        } else {
          medicationData.push({
            ...updatedData[0],
          });

          setSelectedIndex(medicationData.length - 1);
          setActiveKey(updatedData[0]?.unique_id);

          const setArray = medicationData.reduce((acc, curr) => acc?.at(-1)?.tmm_id == curr.tmm_id ? acc : [...acc, curr], [])
          setSelectedIndex1(setArray?.length - 1)
          setChildIndex(medicationData.findIndex(e => e.unique_id == setArray.at(-1)?.unique_id));

          setSinceValue(updatedData[0].tmm_days ? parseInt(updatedData[0].tmm_days) : 1);
        }
      }
      if (doseCalculatorDrawer) {
        setMedicationLibrary((prev) => [...prev]);
        setSearchMLQuery("");
      } else {
        setMedicationData((prev) => [...prev]);
        setSearchChildQuery("");
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
          <div className={`${doseCalculatorDrawer ? 'modalCard-header' : 'selectedchip-header'} align-items-center justify-content-between d-flex`}>
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
          {/* <div className="selectedchip-header d-flex flex-column justify-content-center title px-20">
            <div className="text-truncate title-common fontroboto">
              {`${addCustom?.tmm_id ? 'Edit' : 'Add'} Custom Medicine`}
            </div>
          </div> */}
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

  return (
    <>
      <Card bordered={false} className="search-modalCard h-100">
        <TabSearchHeader
          placeholder="Search Medicines by Name"
          searchQuery={searchChildQuery}
          onSearchParent={onSearchParent}
          disabled={medicationData.length > 0 && !addCustom ? false : true}
          onClose={onClose}
        />
        <div className="modalcard-body">
          <Row gutter={0} className="h-100">
            <Col md={14}>
              <div className="bg-white h-100 p-14">
                {medicationData.length > 0 && !searchChildQuery && (
                  <>
                    <div className="title2">Added</div>
                    <div className="d-flex flex-wrap mt-3">
                      {TABLE_MEDICATION}
                    </div>
                  </>
                )}
                <div>
                  <div className="title2">
                    {searchChildQuery.length > 0
                      ? "Search Results"
                      : "Frequently Used"}
                  </div>
                  <div className="mt-3 d-flex flex-wrap">
                    {searchChildQuery.length > 0 ? (
                      childSearchOptions.length > 0 &&
                      childSearchOptions.filter((e) => ![...medicationData.map((e1) => e1.tmm_medicine_name)].includes(e.value)).map((item, i) => {
                        return (
                          <div className="position-relative">
                            {JSON.parse(item.key).tmm_id === 0 ? (
                              <Button
                                key={i}
                                type="text"
                                className="btn btn-primary2 chips-custom mb-14 me-14 d-flex align-items-center chips-addCustom"
                                onClick={() => onSelectParent({ ...JSON.parse(item.key) })}>
                                {JSON.parse(item.key).tmm_medicine_name} <i className="icon-Add mx-1 fs-6"></i> <a className="text-decoration-underline"> Add Custom</a>
                              </Button>
                            ) : (
                              <Button
                                key={i}
                                type="text"
                                style={{ width: item.value.length > 26 && "280px" }}
                                className={`${item.value.length > 26 && "chips-custom-break chips-custom-break-inside"} btn btn-primary2 chips-custom mb-14 me-14`}
                                onClick={() => onSelectParent({ ...JSON.parse(item.key) })}>
                                <span className="chip-med-content">
                                  <span className="chip-med-name">{item.value}</span>
                                  {renderLowStockBadge(JSON.parse(item.key))}
                                </span>
                              </Button>
                            )}
                            {(JSON.parse(item.key)?.tmm_hm_type === 1 && JSON.parse(item.key)?.um_id === 0) && <span className="position-absolute align-items-center small fs-12-1 d-inline-flex justify-content-center rounded-circle text-white" style={{width: 18, height: 18, background: '#c44ea2', right: 6, top: -6}}>Z</span>}
                            {(JSON.parse(item.key)?.tmm_hm_type == 15 && Number(JSON.parse(item.key)?.um_id) === 0 && isChikitsalayAccessable) && <span className="position-absolute align-items-center small fs-12-1 d-inline-flex justify-content-center rounded-pill text-white" style={{minWidth: 24, height: 18, padding: '0 5px', lineHeight: '16px', background: '#c44ea2', right: 6, top: -6}}>VC</span>}
                            <FreeBadge show={item?.is_free} className="position-absolute" style={{ right: 0, top: -10 }} />
                          </div>
                        )
                      })
                    ) : (
                      parentOptionsList.length > 0 &&
                      parentOptionsList.filter((e) => ![...medicationData.map((e1) => e1.tmm_medicine_name)].includes(e.tmm_medicine_name)).map((item, i) => {
                        return (
                          <div className="position-relative">
                            <Button
                              key={i}
                              type="text"
                              style={{ width: item.tmm_medicine_name.length > 26 && "280px" }}
                              className={`${item.tmm_medicine_name.length > 26 && "chips-custom-break chips-custom-break-inside"} btn btn-primary2 chips-custom mb-14 me-14`}
                              onClick={() => onSelectParent(item)}>
                              <span className="chip-med-content">
                                <span className="chip-med-name">{item.tmm_medicine_name}</span>
                                {renderLowStockBadge(item)}
                              </span>
                            </Button>
                            {(item?.tmm_hm_type === 1 && item?.um_id === 0) && <span className="position-absolute align-items-center small lh-1 fs-12-1 d-inline-flex justify-content-center rounded-circle text-white" style={{width: 18, height: 18, background: '#c44ea2', right: 6, top: -6}}>Z</span>}
                            {(item?.tmm_hm_type == 15 && Number(item?.um_id) === 0 && isChikitsalayAccessable) && <span className="position-absolute align-items-center small lh-1 fs-12-1 d-inline-flex justify-content-center rounded-pill text-white" style={{minWidth: 24, height: 18, padding: '0 5px', lineHeight: '16px', background: '#c44ea2', right: 6, top: -6}}>VC</span>}
                            <FreeBadge show={item?.is_free} className="position-absolute" style={{ right: 0, top: -10 }} />
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </Col>
            <Col md={10}>{addCustom && !doseCalculatorDrawer ? ADD_MEDICINE_DATA : CHILD_DRAWER_DATA}</Col>
          </Row>
        </div>
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
      </Card>
    </>
  );
}

export default React.memo(TabMedicationSearch);