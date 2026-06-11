import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { AutoComplete, Input, Button, Dropdown } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { useDeviceType } from "../utils/deviceDetection";

import TabHeader from "../components/tab_design/TabHeader";
import CommonModal from "../common/CommonModal";
import { clearSearch, searchPatients } from "../redux/appointmentsSlice";
import { isNumeric, isAlphabet, getClinicName, isVoiceRxFree, shouldMonetizationDisabled } from "../utils/utils";
import { resetVaccineState } from "../redux/vaccineSlice";

import { GB_ISCRIBE, GB_SNAP_RX, GB_CVT_EXT_HOS, NEO_NATOLOGISTS_DP_ID, S_VOICE_RX,GB_VOICE_RX_FREE, GB_VOICE_RX_NEW_UI, PAID } from "../utils/constants";
import { resetGrowthChartState } from "../redux/growthChartSlice";
import { resetObstetricState } from "../redux/obstetricSlice";
import { resetUploadDocState } from "../redux/uploadDocSlice";
import { resetDDxState } from "../redux/ddxSlice";
import {
  getClinic,
  getTokenData
} from "../utils/utils";

import AbhaDrawer from "../components/abha/AbhaDrawer";
import PrimaryActionButton from "../components/PrimaryActionButton";
import { ASSETS } from "../assets";
const {
  smartpad: smartPad,
  abhaSvg: AbhaIcon,
} = ASSETS.images;

function WalkInConsultation() {
  const navigate = useNavigate();
  const { isMobile: isMobileDevice, isTablet } = useDeviceType();
  const isMobileOnly = isMobileDevice && !isTablet;
  const isMobile = isMobileDevice;

  const { profile, userId } = useSelector((state) => state.doctors);
  const { patients, error } = useSelector((state) => state.records);
  const { planDetails } = useSelector((state) => state.subscription);
  const { service_mappings } = planDetails || {};
  const VOICE_RX_planDetails = service_mappings?.find(
    (e) => e.service_name === S_VOICE_RX
  );
  const isVoiceRxPaid = VOICE_RX_planDetails?.plan_tier === PAID;

  const dispatch = useDispatch();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);
  const [clickedPatient, setClickedPatient] = useState(null);
  const [openRowIndex, setOpenRowIndex] = useState(null);
  const [autoCompleteFlag, setAutoCompleteFlag] = useState(false);
  const [onPatientClick, setOnPatientClick] = useState(false);
  const isSmartSyncAccessableFromGB = useFeatureIsOn(
    GB_ISCRIBE
  );
  const isSnapRxAccessable = useFeatureIsOn(
    GB_SNAP_RX
  );
  const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
  const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
  const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);
  const isCvtExtHosAccessableFromGB = useFeatureIsOn(GB_CVT_EXT_HOS);
  const tp_monetization_enable = !shouldMonetizationDisabled();

  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [createAbhaDrawer, setCreateAbhaDrawer] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const currentHeight = window.innerHeight;

      // Compare new height with the original one to detect if the keyboard is open
      if (currentHeight < window.initialHeight) {
        setKeyboardOpen(true);
        // setKeyboardHeight(window.initialHeight - currentHeight);
      } else {
        setKeyboardOpen(false);
        // setKeyboardHeight(0);
      }
    };

    // Save the initial window height
    window.initialHeight = window.innerHeight;

    // Add event listener for resize
    window.addEventListener('resize', handleResize);

    // Cleanup the event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const BoldWordInName = ({ name, boldWord }) => {
    // Split the name into parts based on the bold word
    const parts = name.split(new RegExp(`(${boldWord})`, "i"));

    // Map through the parts and apply different styles to the bold word
    const formattedName = parts.map((part, index) => {
      if (part.toLowerCase() === boldWord.toLowerCase()) {
        // If the part matches the bold word, render it in bold
        return (
          <span key={index} className="fw-medium">
            {part}
          </span>
        );
      } else {
        // Otherwise, render it normally
        return <span key={index}>{part}</span>;
      }
    });

    return formattedName;
  };

  const genderAge = (patient_data) => {
    var value = `${patient_data?.pm_gender}, `;
    if (profile?.dp_id === 9 || profile?.dp_id === NEO_NATOLOGISTS_DP_ID) {
      if (patient_data?.ageYears != 0) {
        value += `${patient_data?.ageYears}y`;
      }
      if (patient_data?.ageMonths != 0) {
        value += ` ${patient_data?.ageMonths}m`;
      }
      if (patient_data?.ageDays != 0) {
        value += ` ${patient_data?.ageDays}d`;
      }
    } else {
      if (patient_data?.ageYears != 0) {
        value += `${patient_data?.ageYears}y`
      } else if (patient_data?.ageMonths != 0) {
        value += ` ${patient_data?.ageMonths}m`
      } else if (patient_data?.ageDays != 0) {
        value += ` ${patient_data?.ageDays}d`
      }
    }
    return value;
  };

  const onFocusParent = useCallback(() => {
    setAutoCompleteFlag(true);
  }, [autoCompleteFlag]);

  const onBlurParent = useCallback(
    () => {
      setAutoCompleteFlag(false);
    },
    [autoCompleteFlag]
  );

  // const onDownArrowClick = (patient, e) => {
  //   //   e.preventDefault();
  //   e.stopPropagation();
  //   // setOpenRowIndex(patient?.patient_unique_id);
  // };

  const onConsultClick = async (record) => {
    // window.Moengage.track_event("patient_search_consult", {
    //   doctor_id: profile?.doctor_unique_id,
    // //   patient_id: record?.patient_unique_id,
    // });
    navigate("/prescription", { state: { patient_data: record } });
  };

  const getMenuItems = (record) => {
    const items = [];
  
    if (isSmartSyncAccessableFromGB && isSnapRxAccessable) {
      items.push({
        label: (
          <span
            style={{
              display: "inline-block",
              cursor: "pointer",
            }}
            onClick={() => {
              setAutoCompleteFlag(false);
              onSnapRxClick(record);
            }}
          >
            SnapRx
          </span>
        ),
        key: "snaprx",
      });
    }

    if (isFreeVoiceRxUser || tp_monetization_enable) {
     
      if (isSmartSyncAccessableFromGB || isSnapRxAccessable) {
        if (isVoiceRxPaid) {
         
          items.push({
            label: (
              <span
                style={{
                  display: "inline-block",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setAutoCompleteFlag(false);
                  onVoiceRxClick(record);
                }}
              >
                Voice Rx
              </span>
            ),
            key: "voicerx",
          });
          items.push({
            label: (
              <span
                style={{
                  cursor: "pointer",
                }}
                onClick={() => {
                  setAutoCompleteFlag(false);
                  onConsultClick(record);
                }}
              >
                Consult
              </span>
            ),
            key: "consult",
          });
        } else {
          
          items.push({
            label: (
              <span
                style={{
                  cursor: "pointer",
                }}
                onClick={() => {
                  setAutoCompleteFlag(false);
                  onConsultClick(record);
                }}
              >
                Consult
              </span>
            ),
            key: "consult",
          });
          items.push({
            label: (
              <span
                style={{
                  display: "inline-block",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setAutoCompleteFlag(false);
                  onVoiceRxClick(record);
                }}
              >
                Voice Rx
              </span>
            ),
            key: "voicerx",
          });
        }
      } else {
       
        if (isVoiceRxPaid) {
          
          items.push({
            label: (
              <span
                style={{
                  cursor: "pointer",
                }}
                onClick={() => {
                  setAutoCompleteFlag(false);
                  onConsultClick(record);
                }}
              >
                Consult
              </span>
            ),
            key: "consult",
          });
        } else {
          // Main button is "Consult", dropdown should only have "Voice Rx"
          items.push({
            label: (
              <span
                style={{
                  display: "inline-block",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setAutoCompleteFlag(false);
                  onVoiceRxClick(record);
                }}
              >
                Voice Rx
              </span>
            ),
            key: "voicerx",
          });
        }
      }
    } else {
      
      items.push({
        label: (
          <span
            style={{
              cursor: "pointer",
            }}
            onClick={() => {
              setAutoCompleteFlag(false);
              onConsultClick(record);
            }}
          >
            Consult
          </span>
        ),
        key: "consult",
      });
    }
  
    return items;
  };
  

  const PatientPlank = (patient) => {
    return (
      <>
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center" onClick={() => {
            setAutoCompleteFlag(false)
            setClickedPatient(patient)
          }}>
            <div className="list-patientName d-flex align-items-center me-4">
              <i className="icon-patients backbar me-2"></i>{" "}
              {/* <span className="fw-medium">
                                {patient.pm_salutation && patient.pm_salutation}{" "}
                                {patient.pm_first_name} {patient.pm_last_name} (
                                {patient.pm_gender}, {patient.ageYears}y)
                            </span> */}
              <span>
                {patient.pm_salutation && patient.pm_salutation}{" "}
                <BoldWordInName
                  name={patient.pm_fullname}
                  boldWord={searchQuery}
                />{" "}
                ({patient.pm_gender}, {patient.ageYears}y)
              </span>
            </div>
            <div className="list-patientName d-flex align-items-center me-4">
              <i className="icon-phone backbar me-2"></i>
              {/* <span>{patient.pm_contact_no}</span> */}
              <BoldWordInName
                name={patient.pm_contact_no}
                boldWord={searchQuery}
              />
            </div>
            <div className="list-patientName d-flex align-items-center me-4">
              <i className="icon-Id backbar me-2"></i>
              {/* <span>{patient.pm_pid}</span> */}
              <BoldWordInName name={patient.pm_pid} boldWord={searchQuery} />
            </div>
          </div>
          <div className="d-flex align-items-center">
            {/* <Link to='/patient_details' state={{ patient_data: patient }}> */}
            <Button
              type="text"
              className="btn btn-primary2 me-4 align-items-center d-flex"
              style={{height:"42px"}}
              icon={<i className="icon-Preview"></i>}
              onClick={() => {
                const clinic_name = getClinicName(profile?.hospital_data);
                window.Moengage.track_event("TP_Patient_details", {
                  clinic_name,
                  "patient_number": patient?.pm_contact_no,
                  "patient_id": patient?.patient_unique_id
                });
                navigate("/patient_details", {
                  state: { patient_data: patient },
                })
              }}
            >
              Patient Details
            </Button>
            {(isSnapRxAccessable || isSmartSyncAccessableFromGB || (isFreeVoiceRxUser || tp_monetization_enable)) && (typeof window !== 'undefined' && window.innerWidth >= 768) ? (
              <PrimaryActionButton
                isSmartRxAccessible={isSmartSyncAccessableFromGB}
                isSnapRxAccessible={isSnapRxAccessable}
                isVoiceRxAccessible={isFreeVoiceRxUser || tp_monetization_enable}
                isVoiceRxPaid={isVoiceRxPaid}
                onSmartRxClick={onSmartRxClick}
                onSnapRxClick={onSnapRxClick}
                onVoiceRxClick={onVoiceRxClick}
                onTabRxClick={onTabRxClick}
                onConsultClick={onConsultClick}
                patient={patient}
                setAutoCompleteFlag={setAutoCompleteFlag}
                buttonStyle="walkin"
              />
            ) : (
              <Button
                type="text"
                className="btn btn-primary3 align-items-center d-flex"
                icon={<i className="icon-Consult"></i>}
                onClick={() => {
                  const clinic_name = getClinicName(profile?.hospital_data);
                  window.Moengage.track_event("TP_Consult_started", {
                    clinic_name,
                    "patient_number": patient?.pm_contact_no,
                    "patient_id": patient?.patient_unique_id
                  });
                  navigate("/prescription", { state: { patient_data: patient } })
                }}
              >
                Start Consult
              </Button>
            )}
          </div>
        </div>
      </>
    );
  };

  const onSuccessAbhaLink = () => {
    goToAddPatient();
  };

  const AddPatientPlank = () => {
    return (
      <Button
        type="text"
        className="btn btn-primary1 btn-41 align-items-center d-flex"
        icon={<i className="icon-Add"></i>}
        onClick={goToAddPatient}
      >
        Add New Patient
      </Button>
    );
  };

  const AddPatientViaAbhaPlank = () => {
    return (
      <Button
        type="text"
        className="btn btn-primary1 btn-41 align-items-center d-flex"
        icon={<i className="icon-Add"></i>}
        onClick={() => {
          handleCreateAbhaDrawer();
        }}
      >
        Add New Patient via ABHA{" "}
        <img src={AbhaIcon} width={15} style={{ marginLeft: "6px" }} />
      </Button>
    );
  };

  useEffect(() => {
    dispatch(resetVaccineState());
    dispatch(resetGrowthChartState());
    dispatch(resetObstetricState());
    dispatch(resetUploadDocState());
    dispatch(resetDDxState());
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const timeOutId = setTimeout(() => {
        dispatch(searchPatients({ searchQuery: searchQuery, company: "" }));
      }, 500);
      return () => {
        clearTimeout(timeOutId);
      };
    } else {
      dispatch(clearSearch());
    }
  }, [searchQuery]);

  useEffect(() => {
    const data = [];
    if (patients) {
      if (patients.length === 0 && searchQuery.length > 0) {
        data.push({
          key: -2,
          label: <div>{error}</div>,
        });
      } else {
        patients.map((patient) => {
          return data.push({
            key: JSON.stringify(patient),
            value: patient.pm_pid,
            label: PatientPlank(patient),
          });
        });
      }
    }
    if (!isMobileOnly) {
      const showRegularAddPatient = !isCvtExtHosAccessableFromGB;
      const showAbhaAddPatient =
        profile?.HipID && profile?.abhaEnable;
      if (showRegularAddPatient || showAbhaAddPatient) {
        data.push({
          key: -1,
          value: "Add New Patient",
          label: (
            <div className="d-flex align-items-center gap-3">
              {showRegularAddPatient && AddPatientPlank()}
              {showAbhaAddPatient ? AddPatientViaAbhaPlank() : null}
            </div>
          ),
        });
      }
    }
    setSearchOptions(data);
  }, [patients, isCvtExtHosAccessableFromGB, profile?.HipID, profile?.abhaEnable]);

  const onSearchParent = useCallback(
    (query) => {
      const clinic_name = getClinicName(profile?.hospital_data);
      window.Moengage.track_event("TP_Patient_searched", {
        clinic_name,
      });
      setSearchQuery(query);
    },
    [searchQuery]
  );

  const onSelect = useCallback(
    (data, e) => {
      e.key !== -1 ? setClickedPatient(JSON.parse(e.key)) : goToAddPatient();
    },
    [clickedPatient, searchQuery]
  );

  const onSmartRxClick = async (patient) => {
    const tokenData = getTokenData();
    const clinic = getClinic(profile?.hospital_data);
    window.Moengage.track_event("TP_SmartRx_Started", {
      patient_id: patient?.patient_unique_id || "",
      patient_name: patient?.pm_fullname,
      doctor_id: profile?.doctor_unique_id,
      doctor_name: profile?.um_name,
      doctor_specialty: profile?.dp_name,
      clinic_id: tokenData?.clinic_id,
      clinic_name: clinic?.hm_name,
      source: "Appointment Landing Page",
      device_details: navigator.userAgent
  });
    // window.Moengage.track_event("patient_search_consult", {
    //   doctor_id: profile?.doctor_unique_id,
    //   //   patient_id: record?.patient_unique_id,
    // });
    navigate("/smart-prescription", { state: { patient_data: patient } });
  };

  const onSnapRxClick = async (patient) => {
    navigate("/snap-rx", { state: { patient_data: patient } });
  };

  const onVoiceRxClick = async (patient) => {
    const clinic = getClinic(profile?.hospital_data);
    window.Moengage.track_event("TP_AV_Entry", {
      patient_id: patient?.patient_unique_id || "",
      patient_name: patient?.pm_fullname || "",
      patient_mobile_number: patient?.pm_contact_no || "",
      doctor_id: profile?.doctor_unique_id,
      user_id: userId,
      doctor_name: profile?.um_name,
      doctor_specialty: profile?.dp_name,
      doctor_mobile_number: profile?.um_contact,
      hm_id: clinic?.hm_id,
      clinic_name: clinic?.hm_name,
      source: "Patient Selected",
    });
    
    navigate(isVoiceRxNewFromGB ? "/prescription" : "/voice-rx-consult", {
      state: {
        patient_data: patient,
        isFromTabView: isMobileOnly,
        ...(isVoiceRxNewFromGB && {
          isVoiceRxNewUiFlow: true,
          voiceRxEntryPoint: "walk_in_patient_selected",
        }),
      },
    });
  };

  const onTabRxClick = async (patient) => {
    navigate("/tab-rx", { state: { patient_data: patient } });
  };

  const COMMON_MODAL = useMemo(() => {
    return (
      <CommonModal
        isModalOpen={clickedPatient != null}
        modalWidth={610}
        title={"Patient Selected"}
        onCancel={() => {
          setClickedPatient(null);
        }}
        modalBody={
          <>
            <div className="border bg-body rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <i className="icon-patients me-2" />
                <span className="title-common fontroboto">
                  {clickedPatient?.pm_fullname}{" "}
                  <span className="fw-normal ms-2">
                    {/* ({clickedPatient?.pm_gender}, {clickedPatient?.ageYears}y) */}
                    ({genderAge(clickedPatient)})
                  </span>
                </span>
              </div>
              <div className="mt-2 d-flex align-items-center">
                <i className="icon-phone me-2" />{" "}
                <span>{clickedPatient?.pm_contact_no}</span>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <i className="icon-Id me-2" />{" "}
                <span>{clickedPatient?.pm_pid}</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="title-common">Choose Action</span>
              <div className="d-flex align-items-center mt-2">
                <div className="w-50">
                  {/* <Link to='/patient_details' state={{ patient_data: clickedPatient }}> */}
                  <Button
                    type="text"
                    className="btn btn-primary2 align-items-center d-flex btn-41 w-100"
                    icon={<i className="icon-Preview" />}
                    onClick={() =>
                      navigate("/patient_details", {
                        state: { patient_data: clickedPatient },
                      })
                    }
                  >
                    View Patient Details{" "}
                    <i className="icon-right iconrotate180 ms-auto" />
                  </Button>
                  {/* </Link> */}
                </div>
                <div className="w-50 ms-4">
                  <PrimaryActionButton
                    isSmartRxAccessible={isSmartSyncAccessableFromGB}
                    isSnapRxAccessible={isSnapRxAccessable}
                    isVoiceRxAccessible={isFreeVoiceRxUser || tp_monetization_enable}
                    isVoiceRxPaid={isVoiceRxPaid}
                    onSmartRxClick={onSmartRxClick}
                    onSnapRxClick={onSnapRxClick}
                    onVoiceRxClick={onVoiceRxClick}
                    onTabRxClick={onTabRxClick}
                    onConsultClick={(patient) => {
                      const clinic_name = getClinicName(profile?.hospital_data);
                      window.Moengage.track_event("TP_Consult_started", {
                        clinic_name,
                        "patient_number": patient?.pm_contact_no,
                        "patient_id": patient?.patient_unique_id
                      });
                      onConsultClick(patient);
                    }}
                    patient={clickedPatient}
                    buttonStyle="walkin"
                    fullWidth={true}
                  />
                </div>
              </div>
            </div>
          </>
        }
      />
    );
  }, [clickedPatient]);

  function goToAddPatient() {
    // window.Moengage.track_event("walkin_consult_start", {
    //   "doctor_id": profile?.doctor_unique_id,
    //   "patient_type": 'New',
    // });
    const clinic_name = getClinicName(profile?.hospital_data);
    window.Moengage.track_event("TP_Add_Patient_clicked", {
      clinic_name,
    });
    if (searchQuery.length === 10 && isNumeric(searchQuery)) {
      navigate("/add_patient", {
        state: {
          patient_data: { pm_fullname: "", pm_contact_no: searchQuery },
        },
      });
    } else if (searchQuery.length > 0 && isAlphabet(searchQuery)) {
      navigate("/add_patient", {
        state: {
          patient_data: { pm_fullname: searchQuery, pm_contact_no: "" },
        },
      });
    } else {
      navigate("/add_patient");
    }
  }

  const handleCreateAbhaDrawer = useCallback(() => {
    setCreateAbhaDrawer(!createAbhaDrawer);
  }, [createAbhaDrawer]);

  return (
    <>
      {isMobileOnly && <TabHeader flag={1} title="Start Walk-in Consultation" onClick={goToAddPatient} />}
      <div
        className={`${!isMobileOnly && "border rounded-4 appointment-wrap"} p-4`}
      >
        <label className="mb-2 fontroboto fs-16 fw-medium">
          {" "}
          Enter Patient’s Name, Phone number or Id
        </label>{" "}
        <br />
        <div className="align-items-center d-flex position-relative">
          <AutoComplete
            value={searchQuery}
            onSearch={onSearchParent}
            options={searchOptions}
            className={`${isMobileOnly ? "autocomplete-ios" : "w-100"
              } autocomplete-custom`}
            // onSelect={onSelect}
            onFocus={onFocusParent}
            onBlur={onBlurParent}
            open={autoCompleteFlag}
            // defaultActiveFirstOption={true}
            defaultOpen
            listHeight={isMobileOnly ? keyboardOpen ? window.innerHeight - 180 : window.innerHeight - 180 : 320}
            autoFocus
            popupClassName={`walkincomplete ${isMobileOnly && "walkincomplete-mobile"
              }`}
          >
            <Input
              placeholder="Search by Patient’s Name, Phone number or Id"
              prefix={<i className="icon-search"></i>}
              suffix={
                searchQuery.length > 0 && (
                  <i
                    className="icon-Cross"
                    onClick={() => onSearchParent("")}
                  ></i>
                )
              }
            />
          </AutoComplete>

          {COMMON_MODAL}
        </div>
      </div>

      {createAbhaDrawer && (
        <AbhaDrawer
          onClose={handleCreateAbhaDrawer}
          open={createAbhaDrawer}
          patientUniqueId={null}
          onSuccess={onSuccessAbhaLink}
        />
      )}
    </>
  );
}
export default React.memo(WalkInConsultation);
