import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from "react";
import {
  Button,
  Input,
  Tooltip,
  Tabs,
  Table,
  AutoComplete,
  message
} from "antd";
import "./doseCalculator.scss";
import {
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { isMobile } from "react-device-detect";
import { calculateDose, errorMessage, onlyDecimalFormat, removeBeforeWhiteSpace } from "../../utils/utils";
import { useDispatch, useSelector } from "react-redux";
import CashManagerContext from "../../context/CashManagerContext";
import { MESSAGE_KEY, NEO_NATOLOGISTS_DP_ID, PAEDIATRICS } from "../../utils/constants";
import {
  createDose,
  updateDose,
  deleteDose
} from "../../redux/medicationSlice";
import { addUpdateVitals, getPatientBirthWeight, updateList, updateTodayWeight } from "../../redux/vitalsSlice";

import CommonModal from "../../common/CommonModal";
import moment from "moment";
import { ASSETS } from "../../assets";
const {
  edit: editIcon,
  doseCalc: doseCalculatorImg,
  alerticon: alertIcon,
  endVisit: visitEnd,
  closeVisit: imgCloseVisit,
} = ASSETS.images;

const dateFormat = 'YYYY-MM-DD'

const DoseCalculator = ({ handleViewDoseCalcDrawer, activeTab, setActiveTab, searchMLQuery, setSearchMLQuery, medicationLibrary, setMedicationLibrary, parentSearchOptions, onSearchParent, onSelectParent, showHideAddMedicineModal, setAddCustom, editDoseId, isModalOpen2, showHideModal2 }) => {

  const { medicineTypeList } = useSelector((state) => state.doctors);
  const { profile } = useSelector((state) => state.doctors);
  const { dosesList } = useSelector((state) => state.medication);
  const dispatch = useDispatch();

  const {
    patient_data,
    medicationData,
    setMedicationData,
    vitalsData,
    setVitalsData,
  } = useContext(CashManagerContext);

  const {
    selectedVitalsList,
    vitalsPastList,
    todayData,
    patientBirthWeight: storedPatientBirthWeight } = useSelector((state) => state.vitals);

  const { TabPane } = Tabs;

  const [vitalsUpdate, setVitalsUpdate] = useState(null);
  const [patientBirthWeight, setPatientBirthWeight] = useState(
    vitalsData?.[0]?.patient_birth_weight || storedPatientBirthWeight
  );

  const [todayWeight, setTodayWeight] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editedData, setEditedData] = useState(null);
  const [deletedData, setDeletedData] = useState(null);
  const [doseLibrary, setDoseLibrary] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (medicationData?.length > 0) {
      const uniqueData = medicationData.reduce((acc, item) => acc.find(i => i.tmm_id == item.tmm_id) ? acc : [...acc, item], [])
      const updatedData = uniqueData.map(e => {
        return {
          ...e,
          id: dosesList.findIndex((e1) => e1.medicine_id == e.tmm_id) !== -1 ? dosesList.find((e1) => e1.medicine_id == e.tmm_id)?.id : "",
          medicine_id: e.tmm_id,
          dosage: dosesList.findIndex((e1) => e1.medicine_id == e.tmm_id) !== -1 ? dosesList.find((e1) => e1.medicine_id == e.tmm_id)?.dosage : "",
          dosage_unit: "mg/kg/dose",
          concentration: dosesList.findIndex((e1) => e1.medicine_id == e.tmm_id) !== -1 ? dosesList.find((e1) => e1.medicine_id == e.tmm_id)?.concentration : "",
          concentration_unit: "mg/ml",
          medicine_name: e.tmm_medicine_name,
          medicine_generic_name: e.tmm_generic,
          exist: dosesList.some((e1) => e1.medicine_id == e.tmm_id) ? true : false,
          edit: e.tmm_id == editDoseId ? true : false
        }
      })
      if (editDoseId) {
        const data = dosesList.find((e) => e.medicine_id == editDoseId);
        if (data && data !== undefined) {
          setEditedData(data);
        }
      }
      setMedicationLibrary(updatedData)
    }
  }, [medicationData, editDoseId]);

  useEffect(() => {
    // const todayDate = new Date().toISOString().split("T")[0];
    // // Find today's entry in vitalsData and extract the weight
    // const todayVitals = vitalsData.find((vital) => vital.date === todayDate);
    // // const todayVitals = [...vitalsPastList, ...selectedVitalsList].findLast((vital) => vital.date === todayDate);
    // if (todayVitals && todayVitals.weight) {
    //   setVitalsUpdate(todayVitals)
    //   setTodayWeight(todayVitals.weight);
    // }
    if (todayData) {
      setVitalsUpdate(todayData)
      setTodayWeight(todayData?.weight);
    }
  }, [todayData]);

  const clearData = () => {
    setEditedData(null)
    setSearchMLQuery("")
    setSearchQuery("")
    handleViewDoseCalcDrawer()
  }

  const calculate = (H, W) => {
    var height = 0, weight = 0, bmi = "", bmr = "", bsa = ""

    if (H != '' && H != 0) {
      height = parseFloat(H)
    } else {
      height = 0
    }

    if (W != '' && W != 0) {
      weight = parseFloat(W)
    } else {
      weight = 0
    }

    const calBMI = (weight / height / height) * 10000
    bmi = weight && height ? isFinite(calBMI) ? calBMI.toFixed(2) : '' : '';

    var age = patient_data !== undefined && patient_data.ageYears !== undefined ? patient_data.ageYears : 0
    if (patient_data !== undefined && patient_data.pm_gender == 'Male') {
      const calBMR = (10 * weight) + (6.25 * height) - (5 * age) + 5;
      bmr = weight && height ? isFinite(calBMR) ? calBMR.toFixed(2) : '' : '';
    } else {
      const calBMR = (10 * weight) + (6.25 * height) - (5 * age) - 161;
      bmr = weight && height ? isFinite(calBMR) ? calBMR.toFixed(2) : '' : '';
    }

    const calBSA = Math.sqrt(height * weight / 3600);
    bsa = weight && height ? isFinite(calBSA) ? calBSA.toFixed(2) : '' : '';

    return { bmi: bmi, bmr: bmr, bsa: bsa }
  }

  const handleSaveMedicineDoses = async () => {
    const sanitizedDosesData = medicationLibrary?.filter(e => !e.exist)?.map(
      ({ dosage, dosage_unit, concentration, concentration_unit, medicine_id }) => ({ dosage, dosage_unit, concentration, concentration_unit, medicine_id })
    )

    if (!todayWeight) {
      message.open({
        key: MESSAGE_KEY,
        type: '',
        className: 'message-appointment',
        content: (
          <div className='d-flex align-items-center'>
            <InfoCircleOutlined className="fs-21 me-2 circle-outlined-custom" />
            <div>
              <div className='text-start fs-18 fontroboto'>Please fill patient's current weight</div>
            </div>
            <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
          </div>
        ),
        duration: 3,
      });
    } else if (sanitizedDosesData.filter(e => !e.dosage)?.length > 0 || sanitizedDosesData.filter(e => !e.concentration)?.length > 0) {
      message.open({
        key: MESSAGE_KEY,
        type: '',
        className: 'message-appointment',
        content: (
          <div className='d-flex align-items-center'>
            <InfoCircleOutlined className="fs-21 me-2 circle-outlined-custom" />
            <div>
              <div className='text-start fs-18 fontroboto'>Please fill in all required fields before saving</div>
            </div>
            <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
          </div>
        ),
        duration: 3,
      });
    } else if (medicationLibrary?.length > 0) {

      const action = sanitizedDosesData?.length > 0 ? await dispatch(createDose(sanitizedDosesData)) : { meta: { requestStatus: 'fulfilled' } }
      if (action.meta.requestStatus === "fulfilled") {

        const collectOriginalData = new Set(medicationData.map(item => parseInt(item.tmm_id)));
        const findDataWithoutOriginalData = medicationLibrary.filter(item => !collectOriginalData.has(parseInt(item.medicine_id)));
        medicationData.push(...findDataWithoutOriginalData);
        setMedicationData((prev) => [...prev]);

        medicationLibrary?.map(e => {
          const findTmmId = medicationData.findIndex(e1 => e1.tmm_id == e.medicine_id)
          if (findTmmId === -1) return e;
          // if (!medicationData[findTmmId].tmm_dosage) {
          const medicine = medicationData[findTmmId];
          const medicineUnits = Array.isArray(medicine?.medicineUnit) ? medicine.medicineUnit : [];
          const tmm_unit = medicine?.tmm_unit;
          const dose = calculateDose(e.dosage, todayWeight, e.concentration, medicine?.tmm_type)
          if (isMobile) {
            const unitObj = medicineUnits.find((x) => x.value == tmm_unit) || medicineUnits[0];
            const unitData = unitObj?.key ? JSON.parse(unitObj.key) : unitObj;

            medicationData[findTmmId].tmm_dosage_unit_name = `${dose ? `${dose} ${unitData?.tmu_title || ""}` : ""}`;
            medicationData[findTmmId].tmm_dosage = dose ? dose : "";
            medicationData[findTmmId].tmm_unit = unitData?.tmu_id || "";
            medicationData[findTmmId].tmm_unit_name = unitData?.tmu_title || "";
            medicationData[findTmmId].tmu_id = unitData?.tmu_id || "";
          } else {
            const unitObj = medicineUnits.find((x) => x.tmu_id == tmm_unit) || medicineUnits[0];

            medicationData[findTmmId].tmm_dosage_unit_name = `${dose ? `${dose} ${unitObj?.tmu_title || ""}` : ""}`;
            medicationData[findTmmId].tmm_dosage = dose ? dose : "";
            medicationData[findTmmId].tmm_unit = unitObj?.tmu_id || "";
            medicationData[findTmmId].tmm_unit_name = unitObj?.tmu_title || "";
            medicationData[findTmmId].tmu_id = unitObj?.tmu_id || "";
          }
          // }
          return e;
        })
        setMedicationData((prev) => [...prev]);

        vitalsUpdate?.weight != todayWeight && onAddUpdateClicked()

        clearData()
        message.open({
          key: MESSAGE_KEY,
          type: '',
          className: 'message-appointment',
          content: (
            <div className='d-flex align-items-center'>
              <img src={visitEnd} className='me-2' />
              <div>
                <div className='text-start fs-18 fontroboto'>Dose calculation saved successfully</div>
              </div>
              <img src={imgCloseVisit} className='ms-3' onClick={() => message.destroy()} />
            </div>
          ),
          duration: 3,
        });
      }
    }
  };

  const onAddUpdateClicked = async () => {
    let updateVitals = []
    if (vitalsUpdate) {
      if (selectedVitalsList?.length > 0) {
        updateVitals = selectedVitalsList?.map(item =>
          item.dev_unique_id === vitalsUpdate.dev_unique_id ? { ...item, weight: todayWeight } : item
        );
        await dispatch(updateList({ status: 'selected', data: updateVitals, weight: todayWeight }))
      } else {
        updateVitals = vitalsPastList?.map(item =>
          item.dev_unique_id === vitalsUpdate.dev_unique_id ? { ...item, weight: todayWeight } : item
        );
        await dispatch(updateList({ status: 'past', data: updateVitals, weight: todayWeight }))
      }

      var sendData = {
        patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
        pm_pid: patient_data !== undefined ? patient_data.pm_pid : 0,
        pm_id: patient_data !== undefined ? patient_data.pm_id : 0,
        pam_id: patient_data !== undefined && patient_data.pam_id !== undefined ? patient_data.pam_id : 0,
        weight: todayWeight,
      };
      await dispatch(updateTodayWeight(sendData));
    } else {
      let cal = calculate('', todayWeight);
      updateVitals.push({
        date: moment().format(dateFormat),
        dev_unique_id: 0,
        tcv_id: 0,
        tcbc_id: 0,
        temp: '',
        pres: '',
        resp_rate: '',
        systolic: '',
        diastolic: '',
        spo2: '',
        height: '',
        weight: todayWeight || '',
        ofc: '',
        fib4:'',
        waist_circumference:'',
        bmi: cal.bmi,
        bmr: cal.bmr,
        bsa: cal.bsa,
        general_rbs: ''
      });

      var sendData = {
        patient_unique_id: patient_data !== undefined ? patient_data.patient_unique_id : 0,
        pm_pid: patient_data !== undefined ? patient_data.pm_pid : 0,
        pm_id: patient_data !== undefined ? patient_data.pm_id : 0,
        pam_id: patient_data !== undefined && patient_data.pam_id !== undefined ? patient_data.pam_id : 0,
        patient_birth_weight: patientBirthWeight,
        data: updateVitals,
      };
      const action = await dispatch(addUpdateVitals(sendData));
      if ((profile?.dp_name === PAEDIATRICS || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) && patient_data?.ageMonths <= 12 && patient_data?.ageYears === 0) {
        dispatch(
          getPatientBirthWeight({
            patient_unique_id:
              patient_data !== undefined ? patient_data.patient_unique_id : 0,
            pam_id:
              patient_data !== undefined && patient_data.pam_id !== undefined
                ? patient_data.pam_id
                : 0,
          })
        );
      }
    }
  }

  const onTabChange = (key) => {
    if (key === "1" && medicationLibrary?.length > 0) {
      const updatedData = medicationLibrary.map((e, i) => {
        const findDoseData = dosesList.find((e1) => e1?.medicine_id == e?.tmm_id)
        return findDoseData !== undefined ? { ...e, ...findDoseData, exist: true } : { ...e, exist: false };
      });
      setMedicationLibrary(updatedData)
    }
    setEditedData(null)
    setSearchMLQuery("")
    setSearchQuery("")
    setActiveTab(key);
  };

  // First Tab
  const tooltipTitle = (
    <div>
      <div className="fw-semibold fs-16 mb-3">How Dose calculator works?</div>
      <img className="img-fluid mb-2" src={doseCalculatorImg} alt="Dose Calculator" />
      <ul className="px-3 mb-0">
        <li className="fw-normal mb-2 text-black"><span className="fw-semibold">Weight:</span> Auto-fetched from body composition, e.g., 10 kg. </li>
        <li className="fw-normal mb-2 text-black"><span className="fw-semibold">Dosage:</span> Define for each medicine, e.g., 10 mg/kg for ibuprofen. </li>
        <li className="fw-normal mb-2 text-black"><span className="fw-semibold">Concentration:</span> Set per medicine, e.g., ibuprofen 100 mg/tablet. </li>
        <li className="fw-normal text-black"><span className="fw-semibold">Calculated Dose:</span> Auto-calculated by the system, e.g., 1 tablets. </li>
      </ul>
    </div>
  );

  const onChangeWeight = useCallback(
    (e) => {
      const updateQuery = removeBeforeWhiteSpace(onlyDecimalFormat(e.target.value))
      setTodayWeight(updateQuery);
    },
    [todayWeight]
  );

  const handleInputChange = (value, key, i) => {
    medicationLibrary[i][key] = onlyDecimalFormat(value);
    setMedicationLibrary((prev) => [...prev]);
  };

  const deleteMedicine = (tmm_id) => {
    setMedicationLibrary((prev) => prev.filter((e) => e.tmm_id !== tmm_id));
  };

  // Second Tab
  useEffect(() => {
    if (searchQuery) {
      const searchTimeOutId = setTimeout(() => {
        const newData = dosesList.filter((item) => {
          return item.medicine_name.toLowerCase().includes(searchQuery.toLowerCase())
        });
        setDoseLibrary(newData)
      }, 500);
      return () => {
        clearTimeout(searchTimeOutId);
      };
    } else {
      setDoseLibrary(dosesList)
    }

    if (activeTab === "1" && medicationLibrary?.length > 0) {
      const updatedData = medicationLibrary.map((e, i) => {
        const findDoseData = dosesList.find((e1) => e1?.medicine_id == e?.tmm_id)
        return findDoseData !== undefined ? { ...e, ...findDoseData, exist: true } : { ...e, exist: false };
      });
      setMedicationLibrary(updatedData)
    }
  }, [dosesList, searchQuery]);

  const onSearch = useCallback(
    (e) => {
      const updateQuery = removeBeforeWhiteSpace(e.target.value)
      setSearchQuery(updateQuery)
    },
    [searchQuery]
  );

  const handleSaveClick = async () => {
    if (editedData.dosage && editedData.concentration) {
      var sendData = {
        id: editedData.id,
        medicine_id: editedData.medicine_id,
        dosage: editedData.dosage,
        dosage_unit: editedData.dosage_unit,
        concentration: editedData.concentration,
        concentration_unit: editedData.concentration_unit,
        medicine_name: editedData.medicine_name,
        medicine_generic_name: editedData.medicine_generic_name
      }
      await dispatch(updateDose(sendData))
      setEditedData(null);
    }
  };

  const handleDoseLibInputChange = (value, field) => {
    setEditedData((prevData) => ({ ...prevData, [field]: onlyDecimalFormat(value) }));
  };

  const handleCancelClick = () => {
    setEditedData(null);
  };

  const deleteDoseLibMedicine = async (id) => {
    await dispatch(deleteDose(id))
    setDeletedData(null)
    showHideModal()
  };

  const showHideModal = useCallback(() => {
    setIsModalOpen(!isModalOpen);
  }, [isModalOpen]);

  //Mixed Tab
  const firstColumn = (text, record, index) => {
    return (
      <>
        <div className="text-truncate">{record.medicine_name}</div>
        <div className="text-truncate dose-generic">{record.medicine_generic_name}</div>
      </>
    )
  }

  const secondColumn = (text, record, index) => {
    return (
      editedData?.id === record.id ? (
        <Input
          className="inputheight41-group"
          placeholder="00"
          value={editedData?.dosage}
          onChange={(e) => handleDoseLibInputChange(e.target.value, "dosage")}
          addonAfter={record.dosage_unit}
          status={`${!editedData?.dosage && 'error'}`}
        />
      ) : (
        <Input className="inputheight41-group" value={text} addonAfter={record.dosage_unit} disabled />
      )
    )
  }

  const thirdColumn = (text, record, index) => {
    return (
      editedData?.id === record.id ? (
        <Input
          className="inputheight41-group"
          placeholder="00"
          value={editedData?.concentration}
          onChange={(e) => handleDoseLibInputChange(e.target.value, "concentration")}
          addonAfter={record.concentration_unit}
          status={`${!editedData?.concentration && 'error'}`}
        />
      ) : (
        <Input className="inputheight41-group" value={text} addonAfter={record.concentration_unit} disabled />
      )
    )
  }

  const fourColumn = (text, record, index) => {
    return (
      editedData?.id === record?.id ? (
        <div className="d-flex">
          <Button
            icon={<CheckOutlined className="check-icon fs-20" />}
            className="btn py-0 btn-delete-prescription px-0 me-2"
            onClick={handleSaveClick}>
          </Button>
          <Button
            icon={<CloseOutlined className="close-icon fs-20" />}
            className="btn py-0 btn-delete-prescription px-0"
            onClick={handleCancelClick}>
          </Button>
        </div>
      ) : (
        <div className="d-flex">
          <Button
            icon={<img src={editIcon} alt="edit" />}
            className="btn py-0 btn-delete-prescription px-0 me-2"
            onClick={() => setEditedData(record)}>
          </Button>
          <Button
            icon={<i className="icon-delete text-main fs-20"></i>}
            className="btn py-0 btn-delete-prescription px-0"
            onClick={() => {
              if (activeTab === "1") {
                deleteMedicine(record.tmm_id)
              } else {
                setDeletedData(record)
                showHideModal()
              }
            }}>
          </Button>
        </div>
      )
    )
  }

  const addMedicineColumns = [
    {
      title: "Medicine",
      dataIndex: "name",
      key: "name",
      render: (text, record, index) =>
        record.exist ?
          firstColumn(text, record, index)
          : (
            <>
              <div className="d-flex">
                <div className="text-truncate">{record.tmm_medicine_name}</div>
                {!record.pms_default &&
                  <i className="icon-Edit fs-18"
                    onClick={() => {
                      const medicineType = medicineTypeList.find(x => x?.tmy_id == record?.tmm_type)
                      const makeData = {
                        unique_id: record.unique_id,
                        tmm_id: record.tmm_id,
                        tmm_medicine_name: record.tmm_medicine_name,
                        tmm_generic: record.tmm_generic,
                        tmm_company: record.tmm_company
                      }
                      const updateItem = medicineType !== undefined ? { ...makeData, ...medicineType } : makeData
                      !isMobile && showHideAddMedicineModal()
                      setAddCustom(updateItem);
                    }}
                  ></i>
                }
              </div>
              <div className="text-truncate dose-generic">{record.tmm_generic}</div>
            </>
          ),
    },
    {
      title: <>Recommended Dose <sup className="text-danger-custom">*</sup></>,
      dataIndex: "dosage",
      key: "dosage",
      render: (text, record, index) =>
        record.exist ?
          secondColumn(text, record, index)
          : (
            <Input
              className="inputheight41-group"
              placeholder="00"
              value={record.dosage}
              onChange={(e) => handleInputChange(e.target.value, "dosage", index)}
              addonAfter={record.dosage_unit}
              style={{ width: "180px" }} // Styling for the input
            />
          ),
    },
    {
      title: <>Concentration <sup className="text-danger-custom">*</sup></>,
      dataIndex: "concentration",
      key: "concentration",
      render: (text, record, index) =>
        record.exist ?
          thirdColumn(text, record, index)
          : (
            <Input
              className="inputheight41-group"
              placeholder="00"
              value={record.concentration}
              onChange={(e) => handleInputChange(e.target.value, "concentration", index)}
              addonAfter={record.concentration_unit}
              style={{ width: "170px" }} // Inline styling for the input
            />
          ),
    },
    {
      title: "",
      key: "actions",
      render: (text, record, index) =>
        record.exist ?
          fourColumn(text, record, index)
          : (
            <Button
              className="btn py-0 btn-delete-prescription px-0"
              onClick={() => deleteMedicine(record.tmm_id)}
            >
              <i className="icon-delete text-main"></i>
            </Button>
          ),
    },
  ];

  //Second Tab
  const doseLibraryColumns = [
    {
      title: "Medicine",
      dataIndex: "name",
      key: "name",
      render: (text, record, index) => firstColumn(text, record, index),
    },
    {
      title: <>Recommended Dose <sup className="text-danger-custom">*</sup></>,
      dataIndex: "dosage",
      key: "dosage",
      render: (text, record, index) => secondColumn(text, record, index),
    },
    {
      title: <>Concentration <sup className="text-danger-custom">*</sup></>,
      dataIndex: "concentration",
      key: "concentration",
      render: (text, record, index) => thirdColumn(text, record, index),
    },
    {
      title: "",
      key: "actions",
      render: (text, record, index) => fourColumn(text, record, index),
    },
  ];

  const CustomRow = useCallback((props) => {
    const { children, ...restProps } = props;

    if (props['data-row-key'] == medicationLibrary.sort((a, b) => a.exist - b.exist).find(e => e.exist)?.medicine_id) {
      return (
        <>
          <tr>
            <td className="text-start existing-doses-line" colSpan={addMedicineColumns?.length}>
              <span className="badge-then">Existing Doses</span>
            </td>
          </tr>
          <tr {...restProps}>{children}</tr>
        </>
      );
    }

    return <tr {...restProps}>{children}</tr>;
  }, [medicationLibrary?.length]);

  return (
    <div>
      <div
        className="modalCard-header h-60 align-items-center justify-content-between d-flex"
        style={{ position: "sticky", top: "0", zIndex: "999" }}
      >
        <div className="align-items-center d-flex">
          <Button
            type="text"
            className="btn btn-delete-prescription px-3 focus-none h-100"
            onClick={showHideModal2}
          >
            <i className="icon-Cross fs-3"></i>
          </Button>
          <div
            className="modal-title d-flex align-items-center"
            style={{ fontSize: "24px" }}
          >
            Dose Calculator
            <Tooltip
              title={tooltipTitle}
              overlayClassName="dose-calc-tooltip"
              placement="bottom"
              autoAdjustOverflow={true}
              getPopupContainer={(trigger) => trigger.parentElement}
            >
              <i
                className="icon-info text-greycolor ms-2 fs-21"
              />
            </Tooltip>
          </div>
        </div>
        {activeTab == "1" && (
          <Button
            className="btn btn-primary3 btn-41 px-4 me-20"
            onClick={handleSaveMedicineDoses}
            disabled={!todayWeight || medicationLibrary?.length === 0}
          >
            Save
          </Button>
        )}
      </div>

      <Tabs defaultActiveKey={activeTab} className="dose-tab" onChange={onTabChange}>
        <TabPane
          tab="Add new dose"
          key="1"
        >
          <div style={{ marginTop: "-1rem" }}>
            <div className="d-flex mt-5 ms-4 align-items-center">
              <div className={`px-2 fw-medium ${!todayWeight && 'text-danger-custom'}`}>
                Patient’s Current weight
              </div>
              <div className="d-flex align-items-center px-2">
                <Input
                  className="inputheight41-group"
                  placeholder="0"
                  inputMode="numeric"
                  value={todayWeight}
                  addonAfter="kgs"
                  onChange={onChangeWeight}
                  style={{ width: 120 }}
                  status={`${!todayWeight && 'error'}`}
                />
              </div>
            </div>

            {/* Search Bar */}
            <div className="m-4">
              <AutoComplete
                // defaultValue={searchMLQuery}
                value={searchMLQuery}
                onSearch={onSearchParent}
                options={parentSearchOptions}
                className="autocomplete-custom w-100"
                onSelect={onSelectParent}
                defaultActiveFirstOption={true}
                popupClassName={!searchMLQuery && "boxpopup"}
              >
                <Input
                  placeholder="Search & add new medication"
                  prefix={<i className="icon-search"></i>}
                />
              </AutoComplete>
            </div>

            {/* Medicines Table */}
            {medicationLibrary?.length > 0 && (
              <div className="m-4 mb-0">
                <Table
                  columns={addMedicineColumns}
                  // dataSource={medicationLibrary.sort((a, b) => a.exist - b.exist)}
                  dataSource={medicationLibrary.sort((a, b) => (a.exist - b.exist) || (b.edit - a.edit))}
                  rowKey="medicine_id"
                  pagination={false}
                  className="dose-table"
                  scroll={{
                    y: `calc(100vh - 358px)`,
                  }}
                  components={{
                    body: medicationLibrary?.filter(e => e.exist)?.length > 0 && {
                      row: CustomRow // Use the custom row component
                    }
                  }}
                />
                <div className="text-greycolor mt-3"><span className="text-greycolor fw-semibold">Note:</span> The Dose per unit is Auto-calculated by the system  based on above data.</div>
              </div>
            )}

          </div>
        </TabPane>
        <TabPane
          tab="Dose library"
          key="2"
        >
          {/* Search Bar */}
          <div className="m-4">
            <Input
              className="inputheight38"
              placeholder="Search by medication name"
              value={searchQuery}
              prefix={<i className="icon-search" />}
              onChange={onSearch}
            />
          </div>

          {/* DoseLibrary Table */}
          <div className="m-4 mb-0">
            <Table
              columns={doseLibraryColumns}
              dataSource={doseLibrary}
              rowKey="id"
              pagination={false}
              rowClassName={(record) => (editedData?.id === record.id ? 'edited-row' : '')}
              className="dose-table"
              scroll={{
                y: `calc(100vh - 232px)`,
              }}
            />
          </div>
        </TabPane>
      </Tabs>

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
                  Are you sure you want to delete ?
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div onClick={() => deleteDoseLibMedicine(deletedData?.id)}
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

      <CommonModal
        isModalOpen={isModalOpen2}
        onCancel={showHideModal2}
        modalWidth={500}
        title={"You may lose your data"}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className='me-3' src={alertIcon} alt="Warning" />
                <span>
                  Are you sure you want to close without saving?
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div onClick={() => {
                  clearData()
                  showHideModal2()
                }}
                  className="me-4 text-decoration-underline btn p-0 text-main">
                  Yes, Close
                </div>
                <Button onClick={showHideModal2} className="lh-lg btn btn-primary3 btn-41 px-4">
                  <span>No</span>
                </Button>
              </div>
            </div>
          </>
        }
      />

    </div>
  );
};

export default React.memo(DoseCalculator);
