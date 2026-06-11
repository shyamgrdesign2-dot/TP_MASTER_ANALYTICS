import { useEffect, useRef, useState } from "react";
import VaccineHeader from "../vaccination/components/vaccineHeader/VaccineHeader";
import Examination from "./components/examination/Examination";
import PastPregnancy from "./components/PastPregnancy/PastPregnancy";
import PatientDiagnosis from "./components/patientDiagnosis/PatientDiagnosis";
import PregnancyHistory from "./components/pregnancyHistory/PregnancyHistory";
import AddExamination from "./components/AddExamination/AddExamination";

import LoopingVideo from "../../components/common/LoopingVideo";
import { Button, Tabs } from "antd";
import LmpPopup from "./components/lmpPopup/LmpPopup";
import { useSelector, useDispatch } from "react-redux";
import { Drawer } from "antd";
import {
  fetchAncDoctorList,
  fetchDefaultAnc,
  fetchDefaultImmunisation,
  fetchImmunisationDoctorList,
  fetchObstetricDetails,
  fetchPrefillObstetricDetails,
  fetchTour,
  updatePrefillObstetricData,
  updateTour,
  upsertObstetricDetails,
} from "./service";
import {
  addObstetricDetails,
  navigateToObstetric,
  resetUpdatedPatientDiagnosis,
  setAncDoctorList,
  setDefaultAncSchedule,
  setDefaultImmunisation,
  setImmunisationDoctorList,
} from "../../redux/obstetricSlice";
import { useLocation, useNavigate } from "react-router-dom";
import moment from "moment";
import { errorMessage, getClinicName } from "../../utils/utils";
import SuccessPopup from "../growthChart/components/SuccessPopup";
import CommonModal from "../../common/CommonModal";
import { Container, Navbar } from "react-bootstrap";
import ImmunisationHistory from "./components/immunisationHistory/ImmunisationHistory";
import AncScheduler from "./components/ancScheduler/AncScheduler";
import "./Obstetric.scss";
import { ASSETS } from "../../assets";
const {
  alerticon: alertIcon,
  newGif_3: tagNewWebm,
  newGif_2: tagNewMp4,
} = ASSETS.images;

const { TabPane } = Tabs;

const Obstetric = ({
  obstetricDetails,
  obstetricDrawer,
  handleDrawerObstetric,
  handleCollapsed,
  isPreviousPregnancyOverview = false,
  handleDrawerMedicalReport,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { patient_data } = state;
  const {
    isPatientDiagnosisUpdated,
    isNavigateToObstetric,
    defaultAncSchedule,
    defaultImmunisation,
    ancDoctorList,
    immunisationDoctorList,
    obstetricDetails: allObstetricDetails,
  } = useSelector((state) => state.obstetric);
  const isPregnancyCompleted =
    Object.keys(obstetricDetails)?.length === 0 &&
    allObstetricDetails &&
    Object.keys(allObstetricDetails)?.length > 2;

  const {
    gravidity,
    parity,
    livingChildren,
    abortion,
    ectopicPregnancies,
    diagnosisNotes,
    blood,
    ceed,
    lmp,
    consang,
    edd,
    husbandsBlood,
    maritialStatus,
    marriageDurationYears,
    marriageDurationMonths,
  } = obstetricDetails || {};
  const [loader, setLoader] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [examinationDrawer, setExaminationDrawer] = useState(false);
  const [pastPregnancyDrawer, setPastPregancyDrawer] = useState(false);
  const [shouldShowDeletePopup, setShowDeletePopup] = useState(false);
  const [isDataAddedOrEdited, setIsDataAddedOrEdited] = useState(false);
  const [showLmpPopup, setShowLmpPopup] = useState(false);
  const [examinationEditIndex, setExaminationEditIndex] = useState(-1);
  const [pastPregnancyEditIndex, setPastPregnancyEditIndex] = useState(-1);
  const [isFixed, setIsFixed] = useState(false);
  const [isCompletePregnancy, setIsCompletePregnancy] = useState(false);
  const [activeTab, setActiveTab] = useState(
    obstetricDrawer === "ancScheduler"
      ? "ancScheduler"
      : obstetricDrawer === "immunisationHistory"
      ? "immunisationHistory"
      : obstetricDetails?.examinationHistory?.length
      ? "examination"
      : "pregnancyHistory"
  );
  const [lmpDate, setLmpDate] = useState("");

  const [patientDiagnosisNotes, setPatientDiagnosisNotes] =
    useState(diagnosisNotes);
  const [prefillObstetricData, setPrefillObstetricData] = useState({});

  const today = moment();
  const lmpValue = moment(lmp);

  let gestationWeeks = null;
  let gestationDays = null;

  if (ceed) {
    const gestationAge =
      40 * 7 -
      Math.ceil(
        Math.abs(
          moment(ceed)
            .startOf("day")
            .diff(moment(today).startOf("day"), "days")
        )
      );

    // Convert to weeks and days
    gestationWeeks = Math.floor(gestationAge / 7);
    gestationDays = gestationAge % 7;
  } else if (lmp) {
    gestationWeeks = today.diff(lmpValue, "weeks");
    const adjustedLmpDate = lmpValue.clone().add(gestationWeeks, "weeks");
    gestationDays = today.diff(adjustedLmpDate, "days");
  }

  const [patientDiagnosisData, setPatientDiagnosisData] = useState({
    lmp: lmp,
    edd: edd ?? undefined,
    ceed: ceed ?? undefined,
    gestationWeeks: gestationWeeks,
    gestationDays: gestationDays,
    blood: blood,
    husbandsBlood: husbandsBlood,
    consang: consang,
    maritialStatus: maritialStatus,
    marriageDurationYears: marriageDurationYears,
    marriageDurationMonths: marriageDurationMonths,
  });

  const [pastPregnancyData, setPastPregnancyData] = useState([
    { value: gravidity, label: "G", key: "gravidity" },
    { value: parity, label: "P", key: "parity" },
    { value: livingChildren, label: "L", key: "livingChildren" },
    { value: abortion, label: "A", key: "abortion" },
    { value: ectopicPregnancies, label: "E", key: "ectopicPregnancies" },
  ]);
  const [isExaminationUpdated, setIsExaminationUpdated] = useState(false);
  const [isPastPregnancyUpdated, setIsPastPregnancyUpdated] = useState(false);

  const pregnancyRef = useRef(null);
  const examinationRef = useRef(null);
  const { profile, userId } = useSelector((state) => state.doctors);
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    if (examinationEditIndex >= 0) {
      handleExaminationDrawer();
    }
  }, [examinationEditIndex]);

  useEffect(() => {
    if (pastPregnancyEditIndex >= 0) {
      handlePastPregnancyDrawer();
    }
  }, [pastPregnancyEditIndex]);

  useEffect(() => {
    if (!isPreviousPregnancyOverview) {
      getPrefillObstetricDetails();
      getDefaultAndDoctorList();
    }
  }, []);

  const resetDataAfterPregnancyCompleted = () => {
    setLmpDate("");
    setPatientDiagnosisNotes("");
    setPatientDiagnosisData({});
    setPastPregnancyData((prev) => {
      return prev.map((item) => {
        return { ...item, value: null };
      });
    });
  };

  const tourHandler = async () => {
    setRunTour(false);
    await updateTour({
      anc: true,
      immunisation: true,
    });
  };

  const tooltip = () => (
    <div className="tour-container">
      <div className="d-flex align-items-center justify-content-between">
        <div className="title-sami fs-16">
          ANC Scheduler & Immunisation History
        </div>
        <LoopingVideo
          webm={tagNewWebm}
          mp4={tagNewMp4}
          className="img-fluid"
          width={52}
          height={20}
          ariaLabel="New"
        />
      </div>
      <div className="py-3">
        Track and manage your patients' antenatal care (ANC) journey
        effortlessly with the ANC Scheduler. Access immunisation records to
        streamline care and improve outcomes.
      </div>
      <button className="tour-button" onClick={tourHandler}>
        Got it
      </button>
    </div>
  );
  const getDefaultAndDoctorList = async () => {
    if (defaultAncSchedule?.length === 0) {
      const defaultAncResponse = await fetchDefaultAnc();
      if (defaultAncResponse) {
        dispatch(setDefaultAncSchedule(defaultAncResponse));
      }
    }
    if (defaultImmunisation?.length === 0) {
      const defaultImmunisationResponse = await fetchDefaultImmunisation();
      if (defaultImmunisationResponse) {
        dispatch(setDefaultImmunisation(defaultImmunisationResponse));
      }
    }
    if (ancDoctorList?.length === 0) {
      let ancDoctorListResponse = await fetchAncDoctorList();
      ancDoctorListResponse = ancDoctorListResponse?.filter(
        (item) => !item?.deleted
      );
      if (ancDoctorListResponse) {
        dispatch(setAncDoctorList(ancDoctorListResponse));
      }
    }
    if (immunisationDoctorList?.length === 0) {
      let immunisationDoctorListResponse = await fetchImmunisationDoctorList();
      immunisationDoctorListResponse = immunisationDoctorListResponse?.filter(
        (item) => !item?.deleted
      );
      if (immunisationDoctorListResponse) {
        dispatch(setImmunisationDoctorList(immunisationDoctorListResponse));
      }
    }
    const tourResponse = await fetchTour();
    if (
      tourResponse &&
      Object.keys(tourResponse)?.length > 0 &&
      !isPregnancyCompleted
    ) {
      if (!tourResponse.anc) {
        setRunTour(true);
      } else {
        scrollToBottom();
      }
    }
  };

  const getPrefillObstetricDetails = async () => {
    const prefillObstetricResponse = await fetchPrefillObstetricDetails(
      patient_data.patient_unique_id
    );
    if (
      (Object.keys(obstetricDetails).length !== 0 || !isPregnancyCompleted) &&
      !prefillObstetricResponse?.lmp &&
      !obstetricDetails?.lmp &&
      obstetricDetails?.lmp !== null
    ) {
      setShowLmpPopup(true);
    }
    setPrefillObstetricData(prefillObstetricResponse);
    let gestationInWeeks, gestationInDays, newLmp, newEdd;
    if (prefillObstetricResponse?.lmp) {
      newLmp = moment(prefillObstetricResponse?.lmp);
      newEdd = newLmp
        .clone()
        .add(1, "year")
        .subtract(3, "months")
        .add(7, "days")
        .toDate()
        .toISOString();
      gestationInWeeks = today.diff(newLmp, "weeks");
      const tempDate = newLmp.clone().add(gestationInWeeks, "weeks");
      gestationInDays = today.diff(tempDate, "days");
    }
    setPatientDiagnosisData({
      ...patientDiagnosisData,
      lmp: newLmp || lmp,
      edd: newEdd || edd,
      blood:
        prefillObstetricResponse.bloodGroup?.indexOf("(") > 0
          ? prefillObstetricResponse.bloodGroup
              ?.slice(0, prefillObstetricResponse.bloodGroup?.indexOf("("))
              ?.trim()
          : prefillObstetricResponse.bloodGroup || blood,
      maritialStatus: prefillObstetricResponse.marriedStatus || maritialStatus,
    });
  };

  const scrollToBottom = () => {
    if (activeTab === "pregnancyHistory") {
      pregnancyRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      examinationRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const getAllObstetricDetails = async () => {
    const obstetricResponse = await fetchObstetricDetails(
      patient_data.patient_unique_id
    );
    if (obstetricResponse) {
      dispatch(addObstetricDetails(obstetricResponse));
    }
  };

  const handleExaminationDrawer = () => {
    setExaminationDrawer(!examinationDrawer);
  };

  const handlePastPregnancyDrawer = () => {
    setPastPregancyDrawer(!pastPregnancyDrawer);
  };

  const resetExaminationEditIndex = () => {
    setExaminationEditIndex(-1);
  };

  const resetPastPregnancyEditIndex = () => {
    setPastPregnancyEditIndex(-1);
  };

  const continueExaminationHandler = () => {
    setActiveTab("examination");
    if (!obstetricDetails?.examinationHistory?.length)
      handleExaminationDrawer();
  };

  const toggleDeletePopup = () => {
    setShowDeletePopup((prev) => !prev);
  };

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    if (scrollTop > 185) {
      setIsFixed(true);
    } else {
      setIsFixed(false);
    }
  };

  const trackUpdateEvent = () => {
    const clinic_name = getClinicName(profile?.hospital_data);
    const attributes = {
      clinic_name,
      doctor_id: profile?.doctor_unique_id,
      patient_number: patient_data?.pm_contact_no,
      patient_id: patient_data?.patient_unique_id,
    };
    window.Moengage.track_event("TP_Obs_history_updated", attributes);
    if (isExaminationUpdated) {
      window.Moengage.track_event("TP_obs_examination_updated", attributes);
      setIsExaminationUpdated(false);
    }
    if (isPastPregnancyUpdated) {
      window.Moengage.track_event("TP_Past_pregnancy_updated", attributes);
      setIsPastPregnancyUpdated(false);
    }
  };

  const startNewPregnancyHandler = () => {
    setShowLmpPopup(true);
  };

  const obstetricSaveBtnHandler = async () => {
    if (isPatientDiagnosisUpdated) {
      const pastPregnancy = pastPregnancyData.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
      const payload = {
        ...allObstetricDetails,
        currentPregnancy: {
          ...patientDiagnosisData,
          ...pastPregnancy,
          examinationHistory: obstetricDetails?.examinationHistory || [],
          ancHistory: obstetricDetails?.ancHistory || [],
          immunisationHistory: obstetricDetails?.immunisationHistory || [],
          patientId: patient_data.patient_unique_id,
          diagnosisNotes: patientDiagnosisNotes?.trim(),
          createdAt: obstetricDetails?.createdAt || new Date().toISOString(),
          createdBy: obstetricDetails?.createdBy || userId,
          modifiedAt: new Date().toISOString(),
          modifiedBy: userId,
        },
        pregnancyHistory: allObstetricDetails?.pregnancyHistory || [],
      };
      dispatch(addObstetricDetails(payload));
      dispatch(resetUpdatedPatientDiagnosis());
      setLoader(true);
      const obstetricResponse = await upsertObstetricDetails(
        patient_data.patient_unique_id,
        payload
      );
      const prefillObstetricPayload = {};
      Object.keys(prefillObstetricData).forEach((key) => {
        if (prefillObstetricData[key]) {
          prefillObstetricPayload[key] = prefillObstetricData[key];
        }
      });
      await updatePrefillObstetricData(prefillObstetricPayload, userId);
      setLoader(false);
      if (obstetricResponse) {
        trackUpdateEvent();
        setShowSuccess(true);
        getAllObstetricDetails();
      } else {
        errorMessage("Error while adding data");
      }
    }
    setTimeout(() => {
      handleObstetricBackBtn();
    }, 1000);
  };

  const clearObstetricData = () => {
    handleDrawerObstetric();
    getAllObstetricDetails();
    dispatch(resetUpdatedPatientDiagnosis());
    if (isNavigateToObstetric) {
      navigate(-1);
      dispatch(navigateToObstetric(false));
    }
  };

  const tabChangeHandler = (key) => {
    setActiveTab(key);
    scrollToBottom();
  };

  const handleObstetricBackBtn = () => {
    handleDrawerObstetric();
    if (isNavigateToObstetric) {
      navigate(-1);
      dispatch(navigateToObstetric(false));
    }
  };

  return (
    <>
      <div className="vaccinationWrapper">
        {isPreviousPregnancyOverview ? (
          <Navbar className="headerprescription p-0">
            <Container fluid className="h-100 gx-0 w-100">
              <div
                className="d-flex align-items-center"
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  paddingLeft: 16,
                  gap: 8,
                }}
              >
                <Button
                  type="text"
                  className="h-100"
                  onClick={handleObstetricBackBtn}
                >
                  <i className="icon-Cross fs-3" />
                </Button>
                Overview ({gravidity} Pregnancy)
              </div>
            </Container>
          </Navbar>
        ) : (
          <VaccineHeader
            handleDrawerVaccination={obstetricSaveBtnHandler}
            handleObstetricBackBtn={handleObstetricBackBtn}
            clearObstetricData={clearObstetricData}
            startNewPregnancyHandler={startNewPregnancyHandler}
            loader={loader}
            isPregnancyCompleted={isPregnancyCompleted}
            isObstetric={true}
          />
        )}
        {isPregnancyCompleted ? (
          <div className="scrollableContainer">
            <div className="pregnancyHistoryTitle">Pregnancy history</div>
            <PregnancyHistory
              pregnancyHistory={allObstetricDetails?.pregnancyHistory}
              continueExaminationHandler={continueExaminationHandler}
              handlePastPregnancyDrawer={handlePastPregnancyDrawer}
              setEditIndex={setPastPregnancyEditIndex}
              bottomRef={pregnancyRef}
              isPregnancyCompleted={isPregnancyCompleted}
              handleDrawerMedicalReport={handleDrawerMedicalReport}
            />
          </div>
        ) : (
          <div className="scrollableContainer" onScroll={handleScroll}>
            <div style={{ position: "relative" }}>
              <PatientDiagnosis
                lmpDate={lmpDate}
                patientDiagnosisData={patientDiagnosisData}
                pastPregnancyData={pastPregnancyData}
                patientDiagnosisNotes={patientDiagnosisNotes}
                setLmpDate={setLmpDate}
                setPatientDiagnosisData={setPatientDiagnosisData}
                setPastPregnancyData={setPastPregnancyData}
                setPatientDiagnosisNotes={setPatientDiagnosisNotes}
                isFixed={isFixed}
                setPrefillObstetricData={setPrefillObstetricData}
                isPreviousPregnancyOverview={isPreviousPregnancyOverview}
              />

              {runTour && (
                <>
                  {/* Overlay */}
                  <div className="overlay"></div>
                  {/* Tab Focus */}
                  <div className="tab-focus">
                    <span>ANC Scheduler</span>
                    <span>Immunisation History</span>
                  </div>
                  {/* Tooltip */}
                  {tooltip()}
                </>
              )}
            </div>
            <Tabs
              className="obstetricTab"
              activeKey={activeTab}
              onChange={(key) => tabChangeHandler(key)}
            >
              {!isPreviousPregnancyOverview && (
                <TabPane tab="Pregnancy History" key="pregnancyHistory">
                  <PregnancyHistory
                    pregnancyHistory={allObstetricDetails?.pregnancyHistory}
                    continueExaminationHandler={continueExaminationHandler}
                    handlePastPregnancyDrawer={handlePastPregnancyDrawer}
                    setEditIndex={setPastPregnancyEditIndex}
                    bottomRef={pregnancyRef}
                    handleDrawerMedicalReport={handleDrawerMedicalReport}
                  />
                </TabPane>
              )}
              <TabPane
                tab={
                  isPreviousPregnancyOverview
                    ? "Examination History"
                    : "Current Examination"
                }
                key="examination"
              >
                <Examination
                  examinationHistory={obstetricDetails?.examinationHistory}
                  handleExaminationDrawer={handleExaminationDrawer}
                  handlePastPregnancyDrawer={() => {
                    handlePastPregnancyDrawer();
                    setIsCompletePregnancy(true);
                  }}
                  setEditIndex={setExaminationEditIndex}
                  bottomRef={examinationRef}
                  isPreviousPregnancyOverview={isPreviousPregnancyOverview}
                />
              </TabPane>
              <TabPane
                tab={
                  isPreviousPregnancyOverview ? "ANC History" : "ANC Scheduler"
                }
                key="ancScheduler"
              >
                <AncScheduler
                  ancHistory={obstetricDetails?.ancHistory}
                  handleDrawerMedicalReport={handleDrawerMedicalReport}
                  isPreviousPregnancyOverview={isPreviousPregnancyOverview}
                />
              </TabPane>
              <TabPane tab="Immunisation History" key="immunisationHistory">
                <ImmunisationHistory
                  immunisationHistoryData={
                    obstetricDetails?.immunisationHistory
                  }
                  isPreviousPregnancyOverview={isPreviousPregnancyOverview}
                />
              </TabPane>
            </Tabs>
          </div>
        )}
        {showLmpPopup && (
          <LmpPopup
            lmpDate={lmpDate}
            setLmpDate={setLmpDate}
            setShowLmpPopup={setShowLmpPopup}
            isPregnancyCompleted={isPregnancyCompleted}
            setPatientDiagnosisData={setPatientDiagnosisData}
          />
        )}
        {examinationDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={() => {
              if (isDataAddedOrEdited) {
                toggleDeletePopup();
              } else {
                setExaminationEditIndex(-1);
                handleExaminationDrawer();
              }
            }}
            open={examinationDrawer}
            className="modalWidth-563"
            width="auto"
            zIndex={200}
          >
            <AddExamination
              editIndex={examinationEditIndex}
              close={() => {
                handleExaminationDrawer();
                resetExaminationEditIndex();
              }}
              handleCollapsed={handleCollapsed}
              toggleDeletePopup={toggleDeletePopup}
              isDataAddedOrEdited={isDataAddedOrEdited}
              setIsDataAddedOrEdited={setIsDataAddedOrEdited}
              setIsExaminationUpdated={setIsExaminationUpdated}
              prefillObstetricData={prefillObstetricData}
              setPrefillObstetricData={setPrefillObstetricData}
            />
          </Drawer>
        )}
        {pastPregnancyDrawer && (
          <Drawer
            closeIcon={false}
            placement="right"
            onClose={() => {
              setIsCompletePregnancy(false);
              if (isDataAddedOrEdited && !isCompletePregnancy) {
                toggleDeletePopup();
              } else {
                setPastPregnancyEditIndex(-1);
                handlePastPregnancyDrawer();
              }
            }}
            open={pastPregnancyDrawer}
            className="modalWidth-563"
            width="auto"
            zIndex={200}
          >
            <PastPregnancy
              editIndex={pastPregnancyEditIndex}
              close={() => {
                handlePastPregnancyDrawer();
                resetPastPregnancyEditIndex();
                setIsCompletePregnancy(false);
              }}
              toggleDeletePopup={toggleDeletePopup}
              isDataAddedOrEdited={isDataAddedOrEdited}
              setIsDataAddedOrEdited={setIsDataAddedOrEdited}
              setIsPastPregnancyUpdated={setIsPastPregnancyUpdated}
              isCompletePregnancy={isCompletePregnancy}
              isPregnancyCompleted={isPregnancyCompleted}
              gravidity={gravidity}
              setLoader={setLoader}
              resetDataAfterPregnancyCompleted={
                resetDataAfterPregnancyCompleted
              }
            />
          </Drawer>
        )}
        <SuccessPopup show={showSuccess} setShow={setShowSuccess} />
        <CommonModal
          isModalOpen={shouldShowDeletePopup}
          onCancel={toggleDeletePopup}
          modalWidth={500}
          title={"You may lose your data"}
          modalBody={
            <>
              <div className="alert-warning rounded-10px p-2 patient-details">
                <div className="d-flex align-items-center">
                  <img className="me-3" src={alertIcon} alt="Warning" />
                  <span>
                    Are you sure you want to leave? <br />
                    You will permanently lose your
                    {examinationDrawer
                      ? " Examination"
                      : " Past pregnancy"}{" "}
                    data.
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="d-flex align-items-center mt-2 justify-content-end">
                  <div
                    onClick={() => {
                      if (examinationDrawer) {
                        handleExaminationDrawer();
                        resetExaminationEditIndex();
                      } else {
                        handlePastPregnancyDrawer();
                        resetPastPregnancyEditIndex();
                      }
                      setIsDataAddedOrEdited(false);
                      toggleDeletePopup();
                    }}
                    className="me-4 text-decoration-underline btn p-0 text-main"
                  >
                    Yes Leave
                  </div>
                  <Button
                    onClick={toggleDeletePopup}
                    className="lh-lg btn btn-primary3 btn-41 px-4"
                  >
                    <span>No, Stay</span>
                  </Button>
                </div>
              </div>
            </>
          }
        />
      </div>
    </>
  );
};

export default Obstetric;
