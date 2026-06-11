import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout, Button, Spin, Drawer } from "antd";
import { isMobile } from 'react-device-detect';

import SidebarPatient from '../common/SidebarPatient'
import Welcome1 from '../common/Welcome1'
import VitalsBodyComposition from '../components/VitalsBodyComposition';
// import LabParameters from '../components/LabParameters';
import MedicalHistory from '../components/MedicalHistory';
import CarePlanBox from '../components/CarePlanBox';
// import Vaccination from '../components/Vaccination';
import Cardiology from '../components/Cardiology';

import { useSelector, useDispatch } from "react-redux";

import {
    viewCaseManager,
    listConsultations,
    resetConsultations,
    resetViewCaseManagerData,
} from "../redux/caseManagerSlice";
import { checkPatientAdmitted } from "../redux/ipdSlice";
import VisitVaccination from "./vaccination/components/visitVaccination/VisitVaccination";
import CertificateDetails from "../components/medical_certificate/CertificateDetails";
import VisitGrowthChart from "./growthChart/components/visitGrowthChart/VisitGrowthChart";
import { useAccess } from "./vaccination/useAccess";
import VisitObstetric from "./obstetric/components/visitObstetric/VisitObstetric";
import { getClinicName } from "../utils/utils";
import VisitMedicalRecords from "./medicalRecords/components/visitMedicalRecords/VisitMedicalRecords";
import { PATIENT_DETAILS_SIDEBAR_KEYS } from "../utils/constants";
import { GB_ZYDUS_USER } from "../utils/constants";
import {
    setAllUploadedDocs,
    setPatientUploadedDocs,
    resetUploadDocState,
    zydusDocsList,
    zydusRadioList,
} from "../redux/uploadDocSlice";
import { fetchAllPatientDocs, fetchDocsUploadedByPatient } from "./medicalRecords/service";
import { mergeDocuments } from "./medicalRecords/utils/helper";
import VisitLabParameters from "../components/VisitLabParameters";
import UploadDocPopup from "./medicalRecords/components/uploadDocPopup/UploadDocPopup";
import CommonModal from "../common/CommonModal";
import UploadDocument from "./medicalRecords/UploadDocument";
import AbhaRecords from "./abhaRecords/AbhaRecords";
import HealthCheckupReport from "./healthCheckupReport/HealthCheckupReport";
import { fetchPrintSetting } from "./opdBilling/service";
import { setBillPrintSettings, setIpdBillPrintSettings } from "../redux/billingSlice";
import { useConsultationNavigation } from "../hooks/useConsultationNavigation";
import { getOpthalPrescriptionDetails } from "./ophthalmology/service";
import { resetPatientsDetails } from "../redux/appointmentsSlice";
import { lazyRetry } from "../utils/lazyRetry";
import { searchPatients, synczyduspatient } from "../redux/appointmentsSlice";
import { errorMessage } from "../utils/utils";
import { getDecodedToken } from "../utils/localStorage";
import { env } from "../EnvironmentConfig";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { ASSETS } from "../assets";
const variables = ASSETS.scss.variables;
const alertIcon = ASSETS.images.alerticon;
const BillingDashboard = React.lazy(() =>
  lazyRetry(() => import("./opdBilling/components/billingDashboard/BillingDashboard"))
);

const { Sider, Content } = Layout;

function PatientDetails() {

    const { profile, userId } = useSelector((state) => state.doctors);
    const { isLoading } = useSelector((state) => state.uploadDoc);
    const {
        viewCaseManagerData,
        loading,
        consultations: consultationsFromRedux,
    } = useSelector((state) => state.caseManager);
      const { billPrintSettings, ipdBillPrintSettings } = useSelector(
        (state) => state.billing
      );
    const dispatch = useDispatch();

    const location = useLocation();
    const navigate = useNavigate();
    const locationState = location.state || {};
    const { patient_data, sidebarKey: initialSidebarKey } = locationState || {};
    const resolvedMrno =
      patient_data?.mrno ||
      patient_data?.pm_reference_id ||
      patient_data?.tpml_refrence_id ||
      null;
    const stateMrnNo = locationState?.mrnNo;
    const queryMrnNo = new URLSearchParams(location.search).get("mrnNo");
    const mrnNo = queryMrnNo || stateMrnNo;
    const { isVaccinationAccessable, isGrowthChartAccessable } = useAccess(
      patient_data?.ageYears
    );
    const isZydusUserAccessableFromGB = useFeatureIsOn(GB_ZYDUS_USER);

    const [sidebarKey, setSidebarKey] = useState(initialSidebarKey || PATIENT_DETAILS_SIDEBAR_KEYS.VISIT_SUMMARY);

    const [locationPath, setLocationPath] = useState("/");
    const [collapsed, setCollapsed] = useState(isMobile ? true : false);
    const [filesData, setFilesData] = useState([]);
    
    // Use consultation navigation hook
    const {
        currentConsultation,
        handleNext: handleNextConsultation,
        handlePrev: handlePrevConsultation,
        isFirstConsultation,
        isLastConsultation,
        currentPageDisplay,
    } = useConsultationNavigation(patient_data?.patient_unique_id, consultationsFromRedux);
    
    const [shouldShowUploadDocPopup, setShowUploadDocPopup] = useState(false);
    const [isFileSizeError, setIsFileSizeError] = useState(false);
    const [isFileLimitError, setIsFileLimitError] = useState(false);
    const [isFileTypeError, setIsFileTypeError] = useState(null);
    const [uploadDocDrawer, setUploadDocDrawer] = useState(false);
    const [shouldShowDeletePopup, setShowDeletePopup] = useState(false);
    const [isEditDocument, setIsEditDocument] = useState(false);
    const abhaRecordsRef = useRef(null);
    const [abhaHeaderActions, setAbhaHeaderActions] = useState(null);
    const [abhaConsentsCount, setAbhaConsentsCount] = useState(null);
    const [patientAdmissionStatus, setPatientAdmissionStatus] = useState(null);
    const [isCheckingAdmission, setIsCheckingAdmission] = useState(false);
    const [opthalPrescriptionHistory, setOpthalPrescriptionHistory] = useState([]);
    const [showHealthCheckupReportDrawer, setShowHealthCheckupReportDrawer] = useState(false);
    const hasFetchedFromMrn = useRef(false);

    useEffect(() => {
        const fetchPatientFromMrn = async () => {
            const isEmptyPatientData = (() => {
                if (!patient_data) return true;
                if (Array.isArray(patient_data)) return patient_data.length === 0;
                if (typeof patient_data === "object") {
                    return Object.keys(patient_data).length === 0;
                }
                return true;
            })();
            if (!mrnNo || !isEmptyPatientData || hasFetchedFromMrn.current) {
                return;
            }
            hasFetchedFromMrn.current = true;
            const searchAction = await dispatch(
                searchPatients({ searchQuery: mrnNo, company: "zydus" })
            );
            if (searchAction.meta.requestStatus !== "fulfilled") {
                errorMessage("No patient data found for this MRN.");
                return;
            }
            const searchResult = searchAction.payload;
            const record = Array.isArray(searchResult) ? searchResult[0] : searchResult;
            if (!record) {
                errorMessage("No patient data found for this MRN.");
                return;
            }
            const syncAction = await dispatch(synczyduspatient(record));
            if (syncAction.meta.requestStatus === "fulfilled") {
                const result = syncAction.payload;
                if (!result?.patient_unique_id) {
                    errorMessage('Invalid patient data received. Please try again.');
                    return;
                }
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
                    replace: true,
                    state: {
                        patient_data: { ...result, mrno: record.mrno },
                        sidebarKey: initialSidebarKey,
                        mrnNo: mrnNo,
                    },
                });
            } else {
                errorMessage(syncAction.error);
            }
        };

        fetchPatientFromMrn();
    }, [dispatch, mrnNo, patient_data, navigate, initialSidebarKey]);

    useEffect(() => {
        dispatch(resetViewCaseManagerData());
    }, []);
    // Fetch consultations on mount
    useEffect(() => {
        if (patient_data?.patient_unique_id) {
            dispatch(listConsultations({
                patient_unique_id: patient_data?.patient_unique_id,
                limit: 10,
                page: 1
            }));
        }
    }, [patient_data?.patient_unique_id, dispatch]);

    useEffect(() => {
        setLocationPath(location.pathname);
    }, [location]);

    // Update abhaHeaderActions when sidebarKey changes or ref becomes available
    useEffect(() => {
        if (sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.ABHA_RECORDS) {
            const updateActions = () => {
                if (abhaRecordsRef.current) {
                    setAbhaHeaderActions({
                        fetchConsents: abhaRecordsRef.current.fetchConsents,
                        loading: abhaRecordsRef.current.loading,
                        handleRequestRecords: abhaRecordsRef.current.handleRequestRecords,
                    });

                    if (typeof abhaRecordsRef.current.getConsentCount === "function") {
                        setAbhaConsentsCount(abhaRecordsRef.current.getConsentCount());
                    }
                }
            };
            
            // Use setTimeout to check after component mounts
            const timer = setTimeout(updateActions, 0);
            
            // Update every 200ms to catch loading state changes
            const interval = setInterval(updateActions, 200);
            
            return () => {
                clearTimeout(timer);
                clearInterval(interval);
            };
        } else {
            setAbhaHeaderActions(null);
        }
    }, [sidebarKey]);

    // Call viewCaseManager when currentConsultation changes
    useEffect(() => {
        if (currentConsultation?.tcm_id && patient_data?.patient_unique_id) {
            const clinic_name = getClinicName(profile?.hospital_data);
            window.Moengage.track_event("TP_Patient_detail_landing", {
                clinic_name,
                patient_number: patient_data?.pm_contact_no,
                patient_id: patient_data?.patient_unique_id,
            });
            var sendData = {
                patient_unique_id: patient_data?.patient_unique_id,
                tcm_id: currentConsultation.tcm_id
            };
            dispatch(viewCaseManager(sendData));
        }
    }, [currentConsultation?.tcm_id, patient_data?.patient_unique_id, dispatch]);

    useEffect(() => {
        const tcmId = viewCaseManagerData?.tcm_id;
        const patientId = patient_data?.patient_unique_id;
        
        if (!tcmId || !patientId) {
            return;
        }
        
        let isMounted = true;
        const abortController = new AbortController();
        
        const fetchOpthalPrescription = async () => {
            try {
                const response = await getOpthalPrescriptionDetails({
                    tcm_id: tcmId,
                    patientId: patientId,
                    signal: abortController.signal,
                });
                
                if (!isMounted) {
                    return;
                }
                
                const data = response?.data ?? response;
                const payload = Array.isArray(data) ? data[0] : data;
                
                setOpthalPrescriptionHistory((prev) => {
                    const next = Array.isArray(prev) ? [...prev] : [];
                    const index = next.findIndex((item) => item?.tcm_id === tcmId);
                    const entry = { tcm_id: tcmId, data: payload || null, timestamp: Date.now() };
                    if (index >= 0) {
                        next[index] = entry;
                    } else {
                        next.push(entry);
                    }
                    return next;
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error("Error fetching opthal prescription details:", error);
                }
            }
        };
        
        fetchOpthalPrescription();
        
        return () => {
            isMounted = false;
            abortController.abort();
        };
    }, [viewCaseManagerData?.tcm_id, patient_data?.patient_unique_id]);

    useEffect(() => {
        return () => {
            setOpthalPrescriptionHistory([]);
            dispatch(resetConsultations());
            dispatch(resetViewCaseManagerData());
        };
    }, []);

    useEffect(() => {
        if (patient_data?.patient_unique_id) {
            getAllPatientDocs();
        }
        if (
          (billPrintSettings && Object.keys(billPrintSettings).length === 0)
        ) {
          getBillPrintSettings();
        }
        if (
          (ipdBillPrintSettings && Object.keys(ipdBillPrintSettings).length === 0)
        ) {
          getIpdBillPrintSettings();
        }
    }, [patient_data?.patient_unique_id, resolvedMrno, isZydusUserAccessableFromGB]);

    // Check patient admission status on mount
    useEffect(() => {
        const checkAdmissionStatus = async () => {
            const patientId = patient_data?.patient_unique_id || patient_data?.pm_pid || "";
            if (patientId) {
                setIsCheckingAdmission(true);
                try {
                    const result = await dispatch(
                        checkPatientAdmitted({
                            patientId: patientId,
                        })
                    );
                    if (result.payload) {
                        setPatientAdmissionStatus(result.payload);
                    }
                } catch (error) {
                    console.warn("Could not check patient admission status:", error);
                    setPatientAdmissionStatus(null);
                } finally {
                    setIsCheckingAdmission(false);
                }
            }
        };

        checkAdmissionStatus();
    }, [patient_data?.patient_unique_id, patient_data?.pm_pid, dispatch]);

    const getBillPrintSettings = async () => {
        const printSettingsResponse = await fetchPrintSetting(userId);
        if (printSettingsResponse) {
            dispatch(setBillPrintSettings(printSettingsResponse));
        }
    };

    const getIpdBillPrintSettings = async () => {
        const printSettingsResponse = await fetchPrintSetting(userId, "ipdBill");
        if (printSettingsResponse) {
            dispatch(setIpdBillPrintSettings(printSettingsResponse));
        }
    };

    const getAllPatientDocs = async () => {
        if (!patient_data?.patient_unique_id) {
            return;
        }
        const doctorUploadedDocs = await fetchAllPatientDocs(patient_data.patient_unique_id);
        const patientUploadedDocs = await fetchDocsUploadedByPatient(
          patient_data.patient_unique_id
        );
        dispatch(setPatientUploadedDocs(patientUploadedDocs));
        dispatch(
          setAllUploadedDocs(
            mergeDocuments(doctorUploadedDocs, patientUploadedDocs)
          )
        );

        const tokenData = getDecodedToken()?.result;
        if (
            tokenData?.hospital_business_id == env.zydus_business_id &&
            isZydusUserAccessableFromGB &&
            resolvedMrno != null
        ) {
            dispatch(
                zydusDocsList({
                    mrno: resolvedMrno,
                    um_id: tokenData?.user_id,
                })
            );
            dispatch(
                zydusRadioList({
                    mrno: resolvedMrno,
                    um_id: tokenData?.user_id,
                })
            );
        }
    };

    const nextPress = () => {
        window.Moengage.track_event("patient_detail_next", {
            "doctor_id": profile?.doctor_unique_id,
            "patient_id": patient_data?.patient_unique_id || 0
        });
        handleNextConsultation();
    }

    const prevPress = () => {
        window.Moengage.track_event("patient_detail_prev", {
            "doctor_id": profile?.doctor_unique_id,
            "patient_id": patient_data?.patient_unique_id || 0
        });
        handlePrevConsultation();
    }

    const onClickSidebarHandle = useCallback((key) => {
        setSidebarKey(key)
    }, [sidebarKey])

    const handleUploadDocPopup = () => {
        setShowUploadDocPopup((prev) => !prev);
    };

    const handleRetryBtn = () => {
        setFilesData([]);
        setIsFileSizeError(false);
        setIsFileLimitError(false);
        setIsFileTypeError(null);
    };

   const handleDeletePopup = () => {
     setShowDeletePopup(true);
   };

    const handleDrawerUploadDoc = () => {
      setUploadDocDrawer(!uploadDocDrawer);
    };

   const handleGenerateHealthCheckupReport = () => {
    setShowHealthCheckupReportDrawer(true);
   };

    if (!patient_data || (typeof patient_data === "object" && Object.keys(patient_data).length === 0)) {
        return (
            <div className="appointment-wrap PatientDetailswrap m-0">
                <div className="d-flex justify-content-center py-5">
                    {/* Patient Details Not found */}
                </div>
            </div>
        );
    }

    return (
        <>
            <Layout>
                <Sider trigger={null} collapsible collapsed={collapsed} className={collapsed ? 'ant-layout-sider1' : 'ant-layout-sider'}>
                    <div className='d-flex align-items-center justify-content-between'>
                        <button type='button' className={`${isMobile ? 'px-1' : ''} btn btn-action d-flex align-items-center`} onClick={() => { 
                            dispatch(resetPatientsDetails());
                            navigate(-1);
                        }}>
                            {isMobile ? (
                                <><i className="icon-right"></i> <div>{'\u00A0Back'}</div></>
                            ) : (
                                <><i className="icon-right text-main" style={{ color: !collapsed && variables.grayColor }}></i> <div className="backbar text-main">{!collapsed && '\u00A0Back'}</div></>
                            )}

                        </button>
                        {!isMobile && (<Button className={collapsed ? 'collapseborder border rounded-10px' : ''} style={collapsed && { marginRight: -12, backgroundColor: 'white', zIndex: 1, }} type="text" icon={collapsed ? <i className='icon-Expand fs-21'></i> : <i className='icon-Contract fs-21'></i>} onClick={() => setCollapsed(!collapsed)} />)}
                    </div>
                    <SidebarPatient collapsed={collapsed} patient_data={patient_data} viewCaseManagerData={viewCaseManagerData} sidebarKey={sidebarKey} onClickSidebarHandle={onClickSidebarHandle} abhaConsentsCount={abhaConsentsCount} patientAdmissionStatus={patientAdmissionStatus} isCheckingAdmission={isCheckingAdmission} />
                </Sider>

                <Content>
                    <div className='w-100 vh-100 overflow-y-auto'>
                        { sidebarKey !== PATIENT_DETAILS_SIDEBAR_KEYS.BILL_PAYMENT &&
                            <Welcome1
                                locationPath={locationPath}
                                isMobile={isMobile}
                                patient_data={patient_data}
                                viewCaseManagerData={viewCaseManagerData}
                                sidebarKey={sidebarKey}
                                filesData={filesData}
                                setFilesData={setFilesData}
                                handleUploadDocPopup={handleUploadDocPopup}
                                handleDrawerUploadDoc={handleDrawerUploadDoc}
                                abhaHeaderActions={abhaHeaderActions}
                                patientAdmissionStatus={patientAdmissionStatus}
                                handleGenerateHealthCheckupReport={handleGenerateHealthCheckupReport}
                            />
                        }
                        {sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.VISIT_SUMMARY ? (
                            <div className="appointment-wrap PatientDetailsPageWrap">
                                <div className='row'>
                                    <div className='col-lg-5 col-md-12 col-12'>
                                        {viewCaseManagerData && (viewCaseManagerData?.vitals?.length > 0 || viewCaseManagerData?.patient_birth_weight) && (
                                            <VitalsBodyComposition loading={loading} passVitals={viewCaseManagerData ? [...viewCaseManagerData.vitals].slice(0, 2) : viewCaseManagerData} patientBirthWeight={viewCaseManagerData?.patient_birth_weight} />
                                        )}
                                        
                                        <MedicalHistory loading={loading} medicalHistoryData={viewCaseManagerData?.medical_history} doctorId={viewCaseManagerData?.doctor_data?.um_id} />
                                        
                                        {isVaccinationAccessable && <VisitVaccination />}
                                        {isGrowthChartAccessable && <VisitGrowthChart />}
                                        <VisitObstetric doctorId={viewCaseManagerData?.doctor_data?.um_id} />
                                            
                                        {<VisitLabParameters patient_unique_id={patient_data?.patient_unique_id} doc_id={userId}/>}
                                        
                                        {/* Care Plan List - Show assigned care plans for patient */}
                                        <CarePlanBox
                                            patientId={patient_data?.patient_unique_id}
                                            selectedTcmId={currentConsultation?.tcm_id}
                                            readOnly={true}
                                        />
                                        {/*   <LabParameters />
                                            <Vaccination /> */}
                                    </div>
                                    <div className='col-lg-7 col-md-12 col-12'>
                                        <Cardiology 
                                            patient_data={patient_data} 
                                            tcmData={currentConsultation}
                                            loading={loading} 
                                            viewCaseManagerData={viewCaseManagerData} 
                                            nextPress={nextPress} 
                                            prevPress={prevPress}
                                            currentPageDisplay={currentPageDisplay}
                                            isFirstConsultation={isFirstConsultation}
                                            isLastConsultation={isLastConsultation}
                                            opthalPrescriptionHistory={opthalPrescriptionHistory}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.MEDICAL_CERTIFICATE ? (
                            <div className="appointment-wrap PatientDetailswrap">
                                <CertificateDetails patient_data={patient_data} />
                            </div>
                        ) : sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.MEDICAL_RECORDS ? (
                            <div className="appointment-wrap PatientDetailswrap">
                                <VisitMedicalRecords
                                    filesData={filesData}
                                    setUploadDocDrawer={setUploadDocDrawer}
                                    setFilesData={setFilesData}
                                    handleUploadDocPopup={handleUploadDocPopup}
                                    setIsEditDocument={setIsEditDocument}
                                    handleDrawerUploadDoc={handleDrawerUploadDoc}
                                 />
                            </div>
                        ) : sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.BILL_PAYMENT ? (
                            <div className="vh-100">
                                <Suspense fallback={<Spin />}>
                                    <BillingDashboard patientData={patient_data} fromPath="patientDetails" />
                                </Suspense>
                            </div>
                        ) : sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.ABHA_RECORDS ? (
                            <div className="appointment-wrap PatientDetailswrap">
                                <AbhaRecords
                                  ref={abhaRecordsRef}
                                  onConsentCountChange={setAbhaConsentsCount}
                                  abhaAddress={patient_data?.abhaAddress}
                                  patient_data={patient_data}
                                />
                            </div>
                        ) : sidebarKey === PATIENT_DETAILS_SIDEBAR_KEYS.HEALTH_CHECKUP_REPORT ? (
                            <div className="appointment-wrap PatientDetailswrap">
                                <HealthCheckupReport patient_data={patient_data} showHealthCheckupReportDrawer={showHealthCheckupReportDrawer} setShowHealthCheckupReportDrawer={setShowHealthCheckupReportDrawer} />
                            </div>
                        ) : null}
                    </div>
                </Content>

            </Layout>
            {uploadDocDrawer && (
                <Drawer
                    closeIcon={false}
                    placement="right"
                    bodyStyle={{ backgroundColor: "white" }}
                    onClose={handleDeletePopup}
                    open={uploadDocDrawer}
                    className="modalWidth-700"
                    width="auto"
                    push={false}
                >
                    <UploadDocument
                        onClose={handleDeletePopup}
                        handleDrawerUploadDoc={handleDrawerUploadDoc}
                        shouldShowDeletePopup={shouldShowDeletePopup}
                        setShowDeletePopup={setShowDeletePopup}
                        filesData={filesData}
                        setFilesData={setFilesData}
                        isEditDocument={isEditDocument}
                        setIsEditDocument={setIsEditDocument}
                        handleUploadDocPopup={handleUploadDocPopup}
                    />
                </Drawer>
            )}
            {shouldShowUploadDocPopup && (
                <UploadDocPopup
                    shouldShowUploadDocPopup={shouldShowUploadDocPopup}
                    onCancel={handleUploadDocPopup}
                    setFilesData={setFilesData}
                    filesData={filesData}
                    setUploadDocDrawer={setUploadDocDrawer}
                    setIsFileSizeError={setIsFileSizeError}
                    setIsFileLimitError={setIsFileLimitError}
                    setIsFileTypeError={setIsFileTypeError}
                />
            )}
            {isFileSizeError || isFileLimitError || isFileTypeError ? (
                <CommonModal
                    isModalOpen={isFileSizeError || isFileLimitError || isFileTypeError}
                    onCancel={handleRetryBtn}
                    modalWidth={500}
                    title={
                        isFileSizeError
                        ? "Exceeded File Size"
                        : isFileLimitError
                        ? "Exceeded File Upload Limit"
                        : isFileTypeError
                        ? "File format not supported"
                        : "You may lose your data"
                    }
                    modalBody={
                        <>
                        <div className="alert-warning rounded-10px p-2 patient-details">
                            <div className="d-flex align-items-center">
                            <img className="me-3" src={alertIcon} alt="Warning" />
                            <span>
                                {isFileSizeError ? (
                                <>
                                    The file size exceeded{" "}
                                    <span style={{ fontWeight: 700 }}>15MB.</span> Please
                                    upload a file smaller than 15MB
                                </>
                                ) : isFileLimitError ? (
                                <>
                                    You can only upload up to
                                    <span style={{ fontWeight: 700 }}> 5 files.</span>{" "}
                                    Please reduce the number of files and try again.
                                </>
                                ) : isFileTypeError ? (
                                <>
                                    You can't upload
                                    <span style={{ fontWeight: 700 }}>
                                    {" "}
                                    {isFileTypeError}
                                    </span>{" "}
                                    file. Only PDF, JPG, JPEG, and PNG formats are accepted.
                                </>
                                ) : (
                                "Are you sure you want to leave ?"
                                )}
                            </span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <Button
                            onClick={handleRetryBtn}
                            className="w-100 btn btn-primary3 btn-41 px-4"
                            >
                            Retry
                            </Button>
                        </div>
                        </>
                    }
                />
            ) : null}

            {isLoading ? (
                <div>
                    <Spin
                        style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        zIndex: "9999",
                        }}
                        size="large"
                    />
                </div>
            ) : null}
        </>
    );
}

export default PatientDetails;
