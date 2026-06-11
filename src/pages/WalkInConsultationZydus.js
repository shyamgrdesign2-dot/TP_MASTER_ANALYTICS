import React, {
    useEffect,
    useState,
    useCallback,
    useMemo,
    useRef,
} from "react";
import { AutoComplete, Input, Button, Dropdown } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { useDeviceType } from "../utils/deviceDetection";

import TabHeader from "../components/tab_design/TabHeader";
import CommonModal from "../common/CommonModal";
import { clearSearch, searchPatients, synczyduspatient } from "../redux/appointmentsSlice";
import { isNumeric, isAlphabet, calculateAge, errorMessage, removeSpecialCharectorWithoutDotSpace, getClinic, isVoiceRxFree, shouldMonetizationDisabled } from "../utils/utils";
import { resetVaccineState } from "../redux/vaccineSlice";

import { GB_ISCRIBE, GB_SNAP_RX, PAID, S_VOICE_RX, GB_VOICE_RX_FREE, GB_VOICE_RX_NEW_UI } from "../utils/constants";
import { resetGrowthChartState } from "../redux/growthChartSlice";
import { resetObstetricState } from "../redux/obstetricSlice";
import moment from "moment";
import { resetUploadDocState } from "../redux/uploadDocSlice";
import { resetDDxState } from "../redux/ddxSlice";
import PrimaryActionButton from "../components/PrimaryActionButton";

function WalkInConsultationZydus() {
    const navigate = useNavigate();
    const { isMobile: isMobileDevice, isTablet } = useDeviceType();
    const isMobileOnly = isMobileDevice && !isTablet;
    const isMobile = isMobileDevice;

    const { profile, userId } = useSelector((state) => state.doctors);
    const { patients, error } = useSelector((state) => state.records);
    const { planDetails } = useSelector((state) => state.subscription);
    const { service_mappings } = planDetails || {};
    const VOICE_RX_planDetails = service_mappings?.find(
        (service) => service.service_name === S_VOICE_RX
    );
    const isVoiceRxPaid = VOICE_RX_planDetails?.plan_tier === PAID;

    const dispatch = useDispatch();

    const [searchQuery, setSearchQuery] = useState("");
    const [searchOptions, setSearchOptions] = useState([]);
    const [clickedPatient, setClickedPatient] = useState(null);
    const [autoCompleteFlag, setAutoCompleteFlag] = useState(false);
    const [isLoadingPatientDetails, setIsLoadingPatientDetails] = useState(false);
    const isSmartSyncAccessableFromGB = useFeatureIsOn(
        GB_ISCRIBE
    );
    const isSnapRxAccessable = useFeatureIsOn(GB_SNAP_RX);
    const isVoiceRxFreeFromGB = useFeatureIsOn(GB_VOICE_RX_FREE);
    const isVoiceRxNewFromGB = useFeatureIsOn(GB_VOICE_RX_NEW_UI);
    const isFreeVoiceRxUser = isVoiceRxFree(isVoiceRxFreeFromGB);
    const tp_monetization_enable = !shouldMonetizationDisabled();

    const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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
        if (!name || typeof name !== 'string') {
            return <span>{name || ''}</span>;
        }
        if (!boldWord || typeof boldWord !== 'string') {
            return <span>{name}</span>;
        }
        // Split the name into parts based on the bold word
        const parts = name.split(new RegExp(`(${removeSpecialCharectorWithoutDotSpace(boldWord)})`, "i"));

        // Map through the parts and apply different styles to the bold word
        const formattedName = parts.map((part, index) => {
            if (part.toLowerCase() === removeSpecialCharectorWithoutDotSpace(boldWord).toLowerCase()) {
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
        const action = await dispatch(synczyduspatient(record));
        if (action.meta.requestStatus === "fulfilled") {
            const result = action.payload
            window.Moengage.track_event("walkin_consult_start", {
                "doctor_id": profile?.doctor_unique_id,
                "patient_type": 'Existing',
                "patient_id": result?.patient_unique_id
            });
            navigate("/prescription", { state: { patient_data: { ...result, mrno: record.mrno } } })
        } else {
            errorMessage(action.error)
        }
    };

    const onSmartRxClick = async (record) => {
        const action = await dispatch(synczyduspatient(record));
        if (action.meta.requestStatus === "fulfilled") {
            const result = action.payload
            // window.Moengage.track_event("patient_search_consult", {
            //     doctor_id: profile?.doctor_unique_id,
            //     patient_id: result?.patient_unique_id,
            // });
            navigate("/smart-prescription", { state: { patient_data: { ...result, mrno: record.mrno } } })
        } else {
            errorMessage(action.error)
        }
    };

    const onSnapRxClick = async (record) => {
        const action = await dispatch(synczyduspatient(record));
        if (action.meta.requestStatus === "fulfilled") {
            const result = action.payload;
            navigate("/snap-rx", { state: { patient_data: { ...result, mrno: record.mrno } } });
        } else {
            errorMessage(action.error);
        }
    };

    const onVoiceRxClick = async (record) => {
        const clinic = getClinic(profile?.hospital_data);
        window.Moengage.track_event("TP_AV_Entry", {
          patient_id: record?.patient_unique_id || "",
          patient_name: record?.pm_fullname || "",
          patient_mobile_number: record?.pm_contact_no || "",
          doctor_id: profile?.doctor_unique_id,
          user_id: userId,
          doctor_name: profile?.um_name,
          doctor_specialty: profile?.dp_name,
          doctor_mobile_number: profile?.um_contact,
          hm_id: clinic?.hm_id,
          clinic_name: clinic?.hm_name,
          source: "Patient Selected",
        });
        const action = await dispatch(synczyduspatient(record));
        if (action.meta.requestStatus === "fulfilled") {
            const result = action.payload;
            navigate(isVoiceRxNewFromGB ? "/prescription" : "/voice-rx-consult", {
                state: {
                    patient_data: { ...result, mrno: record.mrno },
                    isFromTabView: isMobile,
                    ...(isVoiceRxNewFromGB && {
                        isVoiceRxNewUiFlow: true,
                        voiceRxEntryPoint: "zydus_walk_in_patient_selected",
                    }),
                },
            });
        } else {
            errorMessage(action.error);
        }
    };

    const onTabRxClick = async (record) => {
        const action = await dispatch(synczyduspatient(record));
        if (action.meta.requestStatus === "fulfilled") {
            const result = action.payload;
            navigate("/tab-rx", { state: { patient_data: { ...result, mrno: record.mrno } } });
        } else {
            errorMessage(action.error);
        }
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
            } else if (isVoiceRxPaid) {
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
                                {patient.prefix && patient.prefix}{" "}
                                <BoldWordInName
                                    name={patient.patientname}
                                    boldWord={searchQuery}
                                />{" "}
                                ({patient.gender}, {calculateAge(moment(patient.dob).format('YYYY-MM-DD')).years}y)
                            </span>
                        </div>
                        {patient.mobilenumber && (
                            <div className="list-patientName d-flex align-items-center me-4">
                                <i className="icon-phone backbar me-2"></i>
                                {/* <span>{patient.pm_contact_no}</span> */}
                                <BoldWordInName
                                    name={patient.mobilenumber}
                                    boldWord={searchQuery}
                                />
                            </div>
                        )}
                        <div className="list-patientName d-flex align-items-center me-4">
                            <i className="icon-Id backbar me-2"></i>
                            {/* <span>{patient.pm_pid}</span> */}
                            <BoldWordInName name={patient.mrno} boldWord={searchQuery} />
                        </div>
                    </div>
                    <div className="d-flex align-items-center">
                        <Button
                            type="text"
                            className="btn btn-primary2 me-4 align-items-center d-flex"
                            icon={<i className="icon-Preview"></i>}
                            loading={isLoadingPatientDetails}
                            disabled={isLoadingPatientDetails}
                            onClick={() => onPatientDetailsClick(patient)}
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
                                buttonStyle="walkin"
                            />
                        ) : (
                          <Button
                            type="text"
                            className="btn btn-primary3 align-items-center d-flex"
                            icon={<i className="icon-Consult"></i>}
                            onClick={() => onConsultClick(patient)}
                          >
                            Start Consult
                          </Button>
                        )}
                    </div>
                </div>
            </>
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
                dispatch(searchPatients({ searchQuery: searchQuery, company: "zydus" }));
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
                    label: <div>{'No Data Found'}</div>,
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
        setSearchOptions(data);
    }, [patients]);

    const onSearchParent = useCallback(
        (query) => {
            setSearchQuery(query);
        },
        [searchQuery]
    );

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
                                    {clickedPatient?.patientname}{" "}
                                    <span className="fw-normal ms-2">
                                        {/* ({clickedPatient?.pm_gender}, {clickedPatient?.ageYears}y) */}
                                        ({clickedPatient?.gender}, {calculateAge(moment(clickedPatient?.dob).format('YYYY-MM-DD')).years}y)
                                    </span>
                                </span>
                            </div>
                            <div className="mt-2 d-flex align-items-center">
                                {clickedPatient?.mobilenumber && (
                                    <>
                                        <i className="icon-phone me-2" />{" "}
                                        <span>{clickedPatient?.mobilenumber}</span>
                                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                                    </>
                                )}
                                <i className="icon-Id me-2" />{" "}
                                <span>{clickedPatient?.mrno}</span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <span className="title-common">Choose Action</span>
                            <div className="d-flex align-items-center mt-2">
                                <div className="w-50">
                                    <Button
                                        type="text"
                                        className="btn btn-primary2 align-items-center d-flex btn-41 w-100"
                                        icon={<i className="icon-Preview" />}
                                        loading={isLoadingPatientDetails}
                                        disabled={isLoadingPatientDetails}
                                        onClick={() => onPatientDetailsClick(clickedPatient)}
                                    >
                                        View Patient Details{" "}
                                        <i className="icon-right iconrotate180 ms-auto" />
                                    </Button>
                                </div>
                                <div className="w-50 ms-4">
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
                                            patient={clickedPatient}
                                            setAutoCompleteFlag={setAutoCompleteFlag}
                                            buttonStyle="walkin"
                                            fullWidth={true}
                                        />
                                    ) : (
                                        <Button
                                            type="text"
                                            className="btn btn-primary3 align-items-center d-flex btn-41 w-100"
                                            icon={<i className="icon-Consult"></i>}
                                            onClick={() => onConsultClick(clickedPatient)}
                                        >
                                            Start Consult{" "}
                                            <i className="icon-right iconrotate180 ms-auto"></i>
                                        </Button>
                                    )}
                                    </div>
                            </div>
                        </div>
                    </>
                }
            />
        );
    }, [clickedPatient]);

    const onPatientDetailsClick = async (record) => {
        // Prevent multiple clicks
        if (isLoadingPatientDetails) return;
        setIsLoadingPatientDetails(true);
        try {
            const action = await dispatch(synczyduspatient(record));
            if (action.meta.requestStatus === "fulfilled") {
                const result = action.payload;
                // Validate patient data before navigation
                if (!result?.patient_unique_id) {
                    errorMessage('Invalid patient data received. Please try again.');
                    return;
                }
                // Safe analytics tracking
                try {
                    if (window.Moengage && typeof window.Moengage.track_event === 'function') {
                        window.Moengage.track_event("TP_Patient_details", {
                            patient_number: record?.mobilenumber,
                            patient_id: result?.patient_unique_id
                        });
                    }
                } catch (error) {
                    console.warn('Analytics error:', error);
                }
                navigate("/patient_details", { 
                    state: { patient_data: { ...result, mrno: record.mrno } } 
                });
            } else {
                errorMessage(action.error);
            }
        } finally {
            setIsLoadingPatientDetails(false);
        }
    };

    return (
        <>
            {isMobileOnly && <TabHeader flag={3} title="Start Walk-in Consultation" />}
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
                            placeholder="Search via name, phn No or MRN (use * followed by last 6 digits of MRN eg: *234567)"
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
        </>
    );
}
export default React.memo(WalkInConsultationZydus);
