import { Button, Collapse, Tabs } from "antd";

import { setIsDiagnosisBox, setIsLabTestBox } from "../redux/ddxSlice";
import { useDispatch } from "react-redux";
import { useContext, useEffect, useRef, useState } from "react";
import CashManagerContext from "../context/CashManagerContext";
import { useLocation } from "react-router-dom";
import { addResultImpression } from "../api/services/ApiDDx";
import TabPane from "antd/es/tabs/TabPane";
import { getClinicName } from "../utils/utils";
import { useSelector } from "react-redux";
import { useAccess } from "../pages/vaccination/useAccess";
import { ASSETS } from "../assets";
const {
  apexai: apexAI,
  diagnosisWhite: diagnoses,
  shadedArrow: arrow,
  lab,
  tick: selectedTick,
  shadedLike,
  shadedDislike,
  like,
  dislike,
} = ASSETS.images;

export const WarningColor = {
  "can't miss": "rgba(194, 159, 0, 1)",
  extended: "rgba(239, 125, 25, 1)",
  "most likely": "rgba(239, 25, 65, 1)",
};

export const WarningRank = {
  "can't miss": 2,
  extended: 3,
  "most likely": 4,
};

const ImpressionType = {
  extended: "extended",
  "can't miss": "cantMiss",
  "most likely": "mostLikely",
};

export const ImpressionText = {
  extended: "Extended Differential Diagnosis",
  "can't miss": "Can’t Miss Differential Diagnosis",
  "most likely": "Most Likely Diagnosis",
};

const formatItem = (item) => {
  return item.replace(/([a-z])([A-Z])/g, "$1 $2");
};

const DifferentialDiagnosisDrawer = ({
  handleDDxDrawer,
  generatedDDx,
  includeExcludeInput,
  likeDislike,
  setLikeDislike,
}) => {
  const dispatch = useDispatch();
  const { included, excluded } = includeExcludeInput || {};
  const {
    diagnosisData,
    setDiagnosisData,
    investigationData,
    setInvestigationData,
  } = useContext(CashManagerContext);
  const { profile } = useSelector((state) => state.doctors);
  const { state } = useLocation();
  const { patient_data } = state;
  const { isGynaecHistoryAccessable } = useAccess(patient_data?.ageYears);
  let filteredExcluded = excluded;
  if (
    patient_data?.pm_gender?.toLowerCase() === "male" ||
    !isGynaecHistoryAccessable && patient_data?.pm_gender?.toLowerCase() === "female"
  ) {
    filteredExcluded = excluded.filter(
      (item) => item !== "gynecHistory" && item !== "obsHistory"
    );
  }

  const [shouldShowInputWarning, setShowInputWarning] = useState(true);
  const [activeKey, setActiveKey] = useState("mostLikely");

  const sectionsRef = useRef({
    mostLikely: null,
    extended: null,
    cantMiss: null,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let closestSection = null;
        let minDistance = Number.MAX_VALUE;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const distance = Math.abs(entry.boundingClientRect.top); // Distance from the top of the viewport
            if (distance < minDistance) {
              minDistance = distance;
              closestSection = entry.target.id; // Update the closest section
            }
          }
        });

        if (closestSection) {
          setActiveKey(closestSection); // Update the active key
        }
      },
      {
        root: null, // Default is the viewport
        threshold: 0, // Trigger as soon as the section starts intersecting
        rootMargin: `0px`, // Focus on sections near the top of the viewport
      }
    );

    // Observe all sections
    Object.values(sectionsRef.current).forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      // Cleanup observer
      Object.values(sectionsRef.current).forEach((section) => {
        if (section) observer.unobserve(section);
      });
    };
  }, []);

  const handleLikeAndDislike = async (resultId, index, impression) => {
    const updatedLikeDislike = [...likeDislike];
    updatedLikeDislike[index] = impression;
    setLikeDislike(updatedLikeDislike);
    const payload = {
      patientId: patient_data?.patient_unique_id,
      resultId: resultId,
      impression: impression,
    };
    await addResultImpression(payload);
  };

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const formattedIncludedData = included?.map(formatItem);
  const formattedExcludedData = filteredExcluded?.map(formatItem);

  return (
    <div className="drawer-container">
      <div className="drawer-header">
        <div
          className="modalCard-header h-60 align-items-center justify-content-between d-flex"
          style={{
            position: "sticky",
            top: "0px",
            zIndex: 2,
          }}
        >
          <div className="align-items-center d-flex">
            <Button
              type="text"
              className="btn btn-delete-prescription px-3 focus-none h-100"
              onClick={handleDDxDrawer}
            >
              <i className="icon-Cross fs-3"></i>
            </Button>
            <div className="modal-title">Differential Diagnosis</div>
            <img className="me-3" src={apexAI} alt="apex-AI" />
          </div>
        </div>

        <div className="drawer-tabs">
          <Tabs activeKey={activeKey} onChange={(key) => scrollToSection(key)}>
            <TabPane tab="Most Likely" key="mostLikely" />
            <TabPane tab="Extended" key="extended" />
            <TabPane tab="Can’t Miss " key="cantMiss" />
          </Tabs>
        </div>
      </div>

      <div
        className="drawer-scrollable-content"
        style={{ backgroundColor: "white", paddingTop: 25 }}
      >
        <div
          className="d-flex justify-content-center align-items-center flex-column"
          style={{ padding: "0px 40px" }}
        >
          {shouldShowInputWarning && (
            <div
              className="d-flex justify-content-between align-items-center"
              style={{
                borderRadius: 16,
                padding: 18,
                marginBottom: 20,
                marginTop: 10,
                backgroundColor: "#FEFBEB",
              }}
            >
              <h6
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: "22px",
                  color: "#938120",
                }}
              >
                <b style={{ fontWeight: 600 }}>Note:</b>
                {" The below results are generated based on the patient’s "}
                {formattedIncludedData?.map((item, index) => (
                  <span key={index} className="warning-txt-cdss">
                    <b
                      style={{
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      {item}
                    </b>
                    {index < formattedIncludedData?.length - 2 && ", "}
                    {index === formattedIncludedData?.length - 2 ? " and " : ""}
                  </span>
                ))}
                .
                {formattedExcludedData?.length > 0 ? (
                  <>
                    {" Factors like "}
                    {formattedExcludedData?.map((item, index) => (
                      <span key={index} className="warning-txt-cdss">
                        <b
                          style={{
                            fontWeight: 600,
                            textTransform: "capitalize",
                            color: "#938120",
                          }}
                        >
                          {item}
                        </b>
                        {index < formattedExcludedData?.length - 2 && ", "}
                        {index === formattedExcludedData?.length - 2
                          ? " and "
                          : ""}
                      </span>
                    ))}
                    {" are not included, as they are not available."}
                  </>
                ) : null}
              </h6>
              <Button
                type="text"
                className="btn btn-delete-prescription focus-none h-100"
                style={{ padding: 5 }}
                onClick={() => setShowInputWarning(false)}
              >
                <i
                  className="icon-Cross"
                  style={{ color: "#938120", width: 12, height: 12 }}
                />
              </Button>
            </div>
          )}
          <div className="d-flex flex-column w-100" style={{ rowGap: 44 }}>
            {generatedDDx.map((item, index) => {
              const accordionItems = [
                {
                  key: "1",
                  label: (
                    <div
                      className="d-flex justify-content-between align-items-center"
                      style={{
                        paddingBottom: 8,
                      }}
                    >
                      <div className="d-flex flex-column gap-1">
                        <div className="d-flex">
                          <img
                            className="me-3"
                            src={diagnoses}
                            alt="diagnosis"
                          />
                          <div style={{ textTransform: "capitalize" }}>
                            {item?.differentialDiagnosisName}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <div className="d-flex" style={{ columnGap: 2 }}>
                            {Array.from({
                              length: WarningRank[item?.likelihood] || 0,
                            }).map((_, index) => (
                              <div
                                key={index}
                                style={{
                                  width: 13,
                                  height: 4,
                                  border: `2px solid ${
                                    WarningColor[item?.likelihood]
                                  }`,
                                  borderRadius: 2,
                                }}
                              />
                            ))}
                          </div>
                          <h6
                            style={{
                              color: WarningColor[item.likelihood],
                              fontSize: 12,
                              marginBottom: 0,
                            }}
                          >
                            {ImpressionText[item?.likelihood]}
                          </h6>
                        </div>
                      </div>
                      {diagnosisData
                        ?.map((item) => item?.tds_name)
                        ?.includes(item?.differentialDiagnosisName) ? (
                        <div
                          style={{ marginRight: 40 }}
                          className="d-flex align-items-center gap-2"
                        >
                          <img
                            src={selectedTick}
                            alt="tick"
                            width={18}
                            height={18}
                          />
                          <div
                            className="document-date"
                            style={{ fontWeight: 600 }}
                          >
                            Added
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginRight: 40 }}>
                          <Button
                            type="primary"
                            className="btn d-flex w-100 align-items-center justify-content-center btn-41"
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch(
                                setIsDiagnosisBox(
                                  item?.differentialDiagnosisName
                                )
                              );
                              diagnosisData.push({
                                tds_id: item?._id,
                                unique_id: item?._id,
                                tds_name: item?.differentialDiagnosisName,
                                pms_default: 1,
                                usage_count: 0,
                                isDDx: true,
                                since: "",
                                status: "",
                                note: "",
                              });
                              setDiagnosisData((prev) => [...prev]);
                              window.Moengage.track_event(
                                "TP_CDSS_Ddx_selected",
                                {
                                  clinic_name: getClinicName(
                                    profile?.hospital_data
                                  ),
                                  doctor_id: profile?.doctor_unique_id,
                                  patient_number: patient_data?.pm_contact_no,
                                  patient_id: patient_data?.patient_unique_id,
                                  field: "detailDrawer",
                                }
                              );
                            }}
                          >
                            Add to Rx
                          </Button>
                        </div>
                      )}
                    </div>
                  ),
                  children: (
                    <>
                      <div
                        className="evidence"
                        style={{
                          color: "rgba(29, 29, 29, 0.65)",
                          padding: "15px 0",
                        }}
                      >
                        {item?.evidence}
                      </div>
                      {item?.labTests?.length > 0 && (
                        <div className="d-flex gap-4">
                          <div
                            className="d-flex flex-column justify-content-between gap-4 w-75"
                            style={{
                              backgroundColor: "#FAF8F6",
                              padding: "11px 15px 21px",
                              borderRadius: 16,
                            }}
                          >
                            <div>
                              <div className="d-flex mb-4">
                                <img className="me-2" src={lab} alt="lab" />
                                <div
                                  className="modal-title"
                                  style={{ fontSize: 16 }}
                                >
                                  Suggested Tests
                                </div>
                              </div>
                              <div
                                className="d-flex flex-column"
                                style={{ gap: 18 }}
                              >
                                {item?.labTests?.map((labTest) => (
                                  <div
                                    key={labTest}
                                    className="d-flex align-items-center justify-content-between"
                                  >
                                    <span
                                      style={{
                                        textTransform: "capitalize",
                                        width: "75%",
                                      }}
                                    >
                                      {labTest}
                                    </span>
                                    {investigationData
                                      ?.map((item) => item?.investigation_name)
                                      ?.includes(labTest) ? (
                                      <div className="d-flex align-items-center gap-2">
                                        <img
                                          src={selectedTick}
                                          alt="tick"
                                          width={18}
                                          height={18}
                                        />
                                        <div
                                          className="document-date"
                                          style={{ fontWeight: 600 }}
                                        >
                                          Added
                                        </div>
                                      </div>
                                    ) : (
                                      <div
                                        className="d-flex align-items-center"
                                        style={{
                                          columnGap: 8,
                                          cursor: "pointer",
                                        }}
                                      >
                                        <div
                                          className="text-primary"
                                          style={{ fontWeight: 600 }}
                                          onClick={() => {
                                            dispatch(
                                              setIsLabTestBox(item?._id)
                                            );
                                            investigationData.push({
                                              investigation_name: labTest,
                                              hm_type: 1,
                                              pms_default: 1,
                                              isDDx: true,
                                              note: "",
                                            });
                                            setInvestigationData((prev) => [
                                              ...prev,
                                            ]);
                                            window.Moengage.track_event(
                                              "TP_CDSS_addtoRx",
                                              {
                                                clinic_name: getClinicName(
                                                  profile?.hospital_data
                                                ),
                                                doctor_id:
                                                  profile?.doctor_unique_id,
                                                patient_number:
                                                  patient_data?.pm_contact_no,
                                                patient_id:
                                                  patient_data?.patient_unique_id,
                                                field: "detailDrawer",
                                              }
                                            );
                                          }}
                                        >
                                          Add To Rx
                                        </div>
                                        <img src={arrow} alt="arrow" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div
                        className="d-flex align-items-center"
                        style={{ gap: 10, marginTop: 15 }}
                      >
                        {likeDislike[index] === "dislike" ? (
                          <>
                            <img src={shadedDislike} alt="shaded-dislike" />
                            <span className="likeDislike-text">
                              Feedback Taken
                            </span>
                            <div
                              className="likeDislike-text"
                              style={{
                                fontWeight: 600,
                                textDecoration: "underline",
                                cursor: "pointer",
                              }}
                              onClick={() =>
                                handleLikeAndDislike(item?._id, index, "undo")
                              }
                            >
                              Undo
                            </div>
                          </>
                        ) : likeDislike[index] === "like" ? (
                          <>
                            <img src={shadedLike} alt="shaded-like" />
                            <span className="likeDislike-text">
                              Feedback Taken
                            </span>
                            <div
                              className="likeDislike-text"
                              style={{
                                fontWeight: 600,
                                textDecoration: "underline",
                                cursor: "pointer",
                              }}
                              onClick={() =>
                                handleLikeAndDislike(item?._id, index, "undo")
                              }
                            >
                              Undo
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="likeDislike-text">
                              Was this result useful?
                            </span>
                            <img
                              style={{ cursor: "pointer" }}
                              src={dislike}
                              alt="dislike"
                              width={22}
                              height={22}
                              onClick={() =>
                                handleLikeAndDislike(
                                  item?._id,
                                  index,
                                  "dislike"
                                )
                              }
                            />
                            <img
                              style={{ cursor: "pointer" }}
                              src={like}
                              alt="like"
                              width={22}
                              height={22}
                              onClick={() =>
                                handleLikeAndDislike(item?._id, index, "like")
                              }
                            />
                          </>
                        )}
                      </div>
                    </>
                  ),
                },
              ];
              return (
                <div
                  key={index}
                  id={ImpressionType[item?.likelihood]}
                  ref={(el) =>
                    (sectionsRef.current[ImpressionType[item?.likelihood]] = el)
                  }
                  className="d-flex"
                  style={{ columnGap: 24 }}
                >
                  <div
                    style={{
                      border: "2px solid rgba(34, 0, 60, 0.04)",
                      borderRadius: "4px",
                    }}
                  />
                  <div className="d-flex flex-column gap-4 w-100">
                    <Collapse
                      items={accordionItems}
                      defaultActiveKey={["1"]}
                      className="prescriptiontab-accordian ddx-drawer-collapse"
                      expandIconPosition={"end"}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className="disclaimer-txt"
            style={{
              fontSize: 12,
              fontWeight: 500,
              margin: "44px 40px 0px",
            }}
          >
            <b>Disclaimer</b>: These results are generated by AI and should be
            used as a guide, not the final source for patient treatment
            decisions.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DifferentialDiagnosisDrawer;
