import React, { useEffect, useState, useCallback, useMemo } from "react";
import { AutoComplete, Button, Col, Input, Row, Select } from "antd";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import dayjs from "dayjs";
import { clearSearch, getCaseTypes, listCategories, searchPatients } from "../../../redux/appointmentsSlice";
import { clearAbhaDetails } from "../../../redux/abhaSlice";
import { isAlphabet, isNumeric } from "../../../utils/utils";

function ConfirmAppointment({
    handleConfirmAppointment,
    searchQuery,
    setSearchQuery,
    selectedDoctor,
    selectedDate,
    selectedTimeSlot,
    clickedPatient,
    setClickedPatient,
    selectedCaseType,
    setSelectedCaseType,
    selectedCategories,
    setSelectedCategories,
    remarks,
    setRemarks,
    isTeleConsultSlot
}) {

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const { patients, error, caseTypes, categoriesList } = useSelector((state) => state.records);
    const { profile } = useSelector((state) => state.doctors);
    const { doctorList } = useSelector((state) => state.bulkMessages);

    const [searchOptions, setSearchOptions] = useState([]);

    useEffect(() => {
        categoriesList?.length === 0 && dispatch(listCategories())
        caseTypes?.length === 0 && dispatch(getCaseTypes())
    }, []);

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
        data.push({
            key: -1,
            value: "Add New Patient",
            label: AddPatientPlank(),
        });
        setSearchOptions(data);
    }, [patients, selectedDoctor, selectedDate, selectedTimeSlot, selectedCaseType, selectedCategories, remarks]);

    const onSearchParent = useCallback(
        (query) => {
            setSearchQuery(query);
        },
        [searchQuery]
    );

    const BoldWordInName = ({ name, boldWord }) => {
        const parts = name.split(new RegExp(`(${boldWord})`, "i"));
        const formattedName = parts.map((part, index) => {
            if (part.toLowerCase() === boldWord.toLowerCase()) {
                return (
                    <span key={index} className="fw-medium">
                        {part}
                    </span>
                );
            } else {
                return <span key={index}>{part}</span>;
            }
        });

        return formattedName;
    };

    const PatientPlank = (patient) => {
        return (
            <>
                <div className="d-flex align-items-center" onClick={() => setClickedPatient(patient)}>
                    <div className="list-patientName d-flex align-items-center me-4">
                        <i className="icon-patients backbar me-2"></i>{" "}
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
                        <BoldWordInName
                            name={patient.pm_contact_no}
                            boldWord={searchQuery}
                        />
                    </div>
                    <div className="list-patientName d-flex align-items-center me-4">
                        <i className="icon-Id backbar me-2"></i>
                        <BoldWordInName name={patient.pm_pid} boldWord={searchQuery} />
                    </div>
                </div>
            </>
        );
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

    function goToAddPatient() {
        dispatch(clearAbhaDetails());
        // Track the event with appropriate data
        window.Moengage.track_event("TP_AddAppointments_AddNewPatient", {
            "Doctor_specialty": profile?.dp_name,
            "Doctor_unique_id": profile?.doctor_unique_id,
            "Doctor_Name": profile?.um_name,
            "Doctor_mobile_No": profile?.um_contact,
        });

        if (searchQuery.length === 10 && isNumeric(searchQuery)) {
            navigate("/add_patient", {
                replace: true,
                state: {
                    patient_data: { pm_fullname: '', pm_contact_no: searchQuery },
                    from: '/add-appointment',
                    selectedDoctor: selectedDoctor,
                    selectedDate: dayjs(selectedDate).format("YYYY-MM-DD"),
                    selectedTimeSlot: selectedTimeSlot,
                    selectedCaseType: selectedCaseType,
                    selectedCategories: selectedCategories,
                    remarks: remarks,
                    appointmentMode: isTeleConsultSlot ? "teleconsult" : "in_clinic"
                }
            });
        } else if (searchQuery.length > 0 && isAlphabet(searchQuery)) {
            navigate("/add_patient", {
                replace: true,
                state: {
                    patient_data: { pm_fullname: searchQuery, pm_contact_no: '' },
                    from: '/add-appointment',
                    selectedDoctor: selectedDoctor,
                    selectedDate: dayjs(selectedDate).format("YYYY-MM-DD"),
                    selectedTimeSlot: selectedTimeSlot,
                    selectedCaseType: selectedCaseType,
                    selectedCategories: selectedCategories,
                    remarks: remarks,
                    appointmentMode: isTeleConsultSlot ? "teleconsult" : "in_clinic"
                }
            });
        } else {
            navigate("/add_patient", {
                replace: true,
                state: {
                    from: '/add-appointment',
                    selectedDoctor: selectedDoctor,
                    selectedDate: dayjs(selectedDate).format("YYYY-MM-DD"),
                    selectedTimeSlot: selectedTimeSlot,
                    selectedCaseType: selectedCaseType,
                    selectedCategories: selectedCategories,
                    remarks: remarks,
                    appointmentMode: isTeleConsultSlot ? "teleconsult" : "in_clinic"
                }
            });
        }
    }

    const onSelectCaseType = useCallback(
        (data) => {
            setSelectedCaseType(data);
        },
        [selectedCaseType]
    );

    const onSelectCategories = useCallback(
        (data) => {
            setSelectedCategories(data);
        },
        [selectedCategories]
    );


    const onChangeInputRemarks = useCallback(
        (e) => {
            setRemarks(e.target.value)
        },
        [remarks]
    );

    return (
        <div className="bg-white h-100 p-20">
            <div className="d-flex align-items-center rounded-10px mb-4" style={{ backgroundColor: '#F2F4F7' }}>
                <i className="bg-custom-purple fs-4 rounded-start-3 icon-patients p-3 text-primary"></i>
                <div className="flex-grow-1 py-3 px-2 text-truncate fw-semibold fs-16">{doctorList?.find(doctor => doctor.um_id == selectedDoctor)?.um_name}</div>
                {/* {doctorList?.length > 1 && ( */}
                <i className="text-primary icon-Edit cursor-pointer p-3" onClick={() => handleConfirmAppointment('edit_doctor')}></i>
                {/* )} */}
            </div>
            <div className="d-flex align-items-center rounded-10px mb-4" style={{ backgroundColor: '#F2F4F7' }}>
                <i className="icon-Queue text-primary rounded-start-3 p-3 bg-custom-purple"></i>
                <div className="flex-grow-1 py-3 px-2 text-truncate fw-semibold fs-16">
                    {selectedTimeSlot?.start && (
                        <>
                            {dayjs(selectedTimeSlot.start, "HH:mm:ss").format("hh:mm A")}
                            {selectedDate.isSame(dayjs(), 'day') && " (Today)"}
                            {selectedDate.isSame(dayjs().add(1, 'day'), 'day') && " (Tomorrow)"}
                            <span className="fw-normal"> | {selectedDate.format("Do MMM YYYY")}{isTeleConsultSlot ? " | Tele-Consultation" : ""} </span>
                        </>
                    )}
                </div>
                <i className="icon-Edit text-primary cursor-pointer p-3" onClick={() => handleConfirmAppointment('edit_time')}></i>
            </div>

            <div className='mb-4'>
                <label className="mb-2">
                    Patient Name, Mobile no & ID <sup className="text-danger-custom">*</sup>
                </label>
                <br />
                {clickedPatient ? (
                    <div className="d-flex align-items-center border py-2 px-3 rounded-10px" onClick={() => setClickedPatient(null)}>
                        <div className="d-flex align-items-center me-4">
                            <i className="icon-patients backbar me-2"></i>{" "}
                            <span className="fw-medium lh-1">{clickedPatient?.pm_salutation} {clickedPatient?.pm_fullname}</span>
                        </div>
                        <div className="d-flex align-items-center me-4">
                            <i className="icon-phone backbar me-2"></i>
                            <span className="fw-medium lh-1">{clickedPatient?.pm_contact_no}</span>
                        </div>
                        <div className="d-flex align-items-center me-4">
                            <i className="icon-Id backbar me-2"></i>
                            <span className="fw-medium lh-1">{clickedPatient?.pm_pid}</span>
                        </div>
                    </div>
                ) : (
                    <div className="align-items-center d-flex position-relative">
                        <AutoComplete
                            value={searchQuery}
                            onSearch={onSearchParent}
                            options={searchOptions}
                            className='w-100 autocomplete-custom'
                            popupClassName='walkincomplete'
                        >
                            <Input
                                placeholder="Search by Patient's Name, Phone number or Id"
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
                    </div>
                )}
            </div>

            <Row gutter={20} className="mb-4">
                <Col span={12}>
                    <label className="d-block mb-2">Case Type<sup className="text-danger-custom">*</sup></label>
                    <Select
                        className="autocomplete-custom w-100"
                        placeholder="Select Case Type"
                        options={caseTypes?.map((item) => {
                            return {
                                key: item.toct_id,
                                value: item.toct_id,
                                label: (
                                    <div key={item.toct_id}>
                                        {item.toct_type}
                                    </div>
                                ),
                            };
                        })}
                        value={selectedCaseType}
                        onSelect={onSelectCaseType}
                    />
                </Col>
                <Col span={12}>
                    <label className="d-block mb-2">Category</label>
                    <Select
                        className="autocomplete-custom w-100"
                        placeholder="Select Category"
                        options={categoriesList?.map((item) => {
                            return {
                                key: item.pt_id,
                                value: item.pt_id,
                                label: (
                                    <div key={item.pt_id}>
                                        {item.pt_name}
                                    </div>
                                ),
                            };
                        })}
                        value={selectedCategories}
                        onSelect={onSelectCategories}
                        allowClear={true}
                        onChange={(value) => setSelectedCategories(value)}
                    />
                </Col>
            </Row>
            <label className="d-block mb-2">Remarks for Receptionist</label>
            <Input.TextArea placeholder="Write your remarks" value={remarks} className="textareaPlaceholder fontroboto text-main" rows={3} onChange={onChangeInputRemarks} />
        </div>
    )
}

export default ConfirmAppointment