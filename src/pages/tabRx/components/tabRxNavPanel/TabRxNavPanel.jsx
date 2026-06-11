import React, { useRef } from "react";
import "./TabRxNavPanel.scss";
import { ASSETS } from "../../../../assets";
const {
  ddxTabVector: ddxVector,
  groundingWhite: groundingImgWhite,
  groundingPurple: groundingImgDark,
  genRxMic: genRxImg,
  voiceRxDefault,
  ddx: ddxImg,
  tabDdxInactive: ddxInactiveImg,
  vitalsPrimary: vitalsDark,
  vitalsSecondary: vitalsWhite,
  historyPrimary: medicalHistoryDark,
  historySecondary: medicalHistoryWhite,
  vaccinePrimary: vaccinationDark,
  vaccineSecondary: vaccinationWhite,
  personalNotesPrimary: privateNotesDark,
  personalNotesSecondary: privateNotesWhite,
  scalePrimary: growthChartDark,
  scaleSecondary: growthChart,
  obstetricPrimary: obstetricDark,
  obstetricSecondary: obstetricWhite,
  recordsPrimary: medicalRecordsDark,
  recordsSecondary: medicalRecordsWhite,
  labParameters: labParamsDark,
  labParametersWhite: labParamsWhite,
  carePlanActiveSolid: carePlanIconDark,
  carePlan: carePlanIcon,
} = ASSETS.images;

// Reusing existing image path imports from TabRx.jsx
// Ensure all correct paths are mapped (Vitals, Medical History, etc.)

const TabRxNavPanel = ({
    isApexAISelected,
    handleApexAIClose,
    isGroundingAccessableForZydus,
    tp_monetization_enable,
    isFreeVoiceRxUser,
    isApexAIAccessable,
    openCollapsed,
    collapsedFlag,
    customizedPadLeftList,
    vitalsData,
    vitalsPastList,
    patientBirthWeight,
    handleDrawerVital,
    medicalHistoryData,
    updatedGynecHistory,
    handleDrawerMedicalHistory,
    isVaccinationAccessable,
    handleDrawerVaccination,
    privateNotesList,
    handleDrawerPrivateNotes,
    isGrowthChartAccessable,
    handleDrawerGrowth,
    isGynaecHistoryAccessable,
    examinationHistory,
    shouldShowAncHistory,
    shouldShowImmunisation,
    obstetricDetails,
    handleDrawerObstetric,
    allUploadedDocs,
    handleAddClick,
    fileInputRef,
    handleFileUpload,
    labParamsData,
    handleAddLabParamsDrawer,
    isCarePlanEnabled,
}) => {
    return (
        <div
            className={`tabrx-nav-panel ${isApexAISelected ? "ai-mode" : ""}`}
        >
            {isApexAISelected ? (
                <>
                    {/* Background Vectors for AI mode */}
                    <img
                        src={ddxVector}
                        alt="ddxVector"
                        className="prescription-sidebar-ai-vector"
                    />
                    <img
                        src={ddxVector}
                        alt="ddxVectorReverse"
                        className="prescription-sidebar-ai-vector-reverse"
                    />

                    {/* Close Button */}
                    <button
                        type="button"
                        className="nav-item"
                        onClick={handleApexAIClose}
                    >
                        <div className="item-content">
                            <div
                                className="icon-container"
                                style={{
                                    backgroundColor: "white",
                                    borderRadius: "16px",
                                }}
                            >
                                <i className="icon-Cross" style={{ color: "#7742FE" }} />
                            </div>
                        </div>
                    </button>

                    {/* AI Formulation */}
                    {isGroundingAccessableForZydus && (
                        <button
                            type="button"
                            className={`nav-item ${collapsedFlag === 12 ? "active" : ""}`}
                            onClick={() => openCollapsed(12)}
                        >
                            <div className="item-content">
                                <div className="icon-container">
                                    <img
                                        src={
                                            collapsedFlag === 12
                                                ? groundingImgDark
                                                : groundingImgWhite
                                        }
                                        alt="Grounding"
                                    />
                                </div>
                                <label className="item-label">AI Formu..</label>
                            </div>
                        </button>
                    )}

                    {/* Voice Rx */}
                    {(tp_monetization_enable || isFreeVoiceRxUser) && (
                        <button
                            type="button"
                            className={`nav-item ${collapsedFlag === 10 ? "active" : ""}`}
                            onClick={() => openCollapsed(10)}
                        >
                            <div className="item-content">
                                <div className="icon-container">
                                    <img
                                        src={collapsedFlag === 10 ? genRxImg : voiceRxDefault}
                                        alt="VoiceRx"
                                    />
                                </div>
                                <label className="item-label">Voice Rx</label>
                            </div>
                        </button>
                    )}

                    {/* DDx */}
                    {(isApexAIAccessable || tp_monetization_enable) && (
                        <button
                            type="button"
                            className={`nav-item ${collapsedFlag === 9 ? "active" : ""}`}
                            onClick={() => openCollapsed(9)}
                        >
                            <div className="item-content">
                                <div className="icon-container">
                                    <img
                                        src={collapsedFlag === 9 ? ddxImg : ddxInactiveImg}
                                        alt="DDx"
                                    />
                                </div>
                                <label className="item-label">DDx</label>
                            </div>
                        </button>
                    )}
                </>
            ) : (
                <>
                    {customizedPadLeftList?.map((e, i) => {
                        if (e.tmdpm_id === 1 && e.tmdpm_status === 0) {
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    className={`nav-item ${collapsedFlag === 1 ? "active" : ""}`}
                                    onClick={() =>
                                        vitalsData?.length === 0 &&
                                            vitalsPastList?.length === 0 &&
                                            !patientBirthWeight
                                            ? handleDrawerVital()
                                            : openCollapsed(1)
                                    }
                                >
                                    <div className="item-content">
                                        <div className="icon-container">
                                            <img
                                                src={collapsedFlag === 1 ? vitalsDark : vitalsWhite}
                                                alt="Vitals"
                                            />
                                        </div>
                                        <label className="item-label">Vitals</label>
                                    </div>
                                </button>
                            );
                        }

                        if (e.tmdpm_id === 3 && e.tmdpm_status === 0) {
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    className={`nav-item ${collapsedFlag === 2 ? "active" : ""}`}
                                    onClick={() =>
                                        medicalHistoryData?.length === 0 && !updatedGynecHistory
                                            ? handleDrawerMedicalHistory()
                                            : openCollapsed(2)
                                    }
                                >
                                    <div className="item-content">
                                        <div className="icon-container">
                                            <img
                                                src={
                                                    collapsedFlag === 2
                                                        ? medicalHistoryDark
                                                        : medicalHistoryWhite
                                                }
                                                alt="History"
                                            />
                                        </div>
                                        <label className="item-label">History</label>
                                    </div>
                                </button>
                            );
                        }

                        if (e.tmdpm_id === 8 && e.tmdpm_status === 0) {
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    className={`nav-item ${collapsedFlag === 4 ? "active" : ""}`}
                                    onClick={() =>
                                        privateNotesList?.length === 0
                                            ? handleDrawerPrivateNotes()
                                            : openCollapsed(4)
                                    }
                                >
                                    <div className="item-content">
                                        <div className="icon-container">
                                            {privateNotesList?.length > 0 && (
                                                <div className="dot-badge">
                                                    {privateNotesList?.length > 5
                                                        ? "5+"
                                                        : privateNotesList?.length}
                                                </div>
                                            )}
                                            <img
                                                src={
                                                    collapsedFlag === 4
                                                        ? privateNotesDark
                                                        : privateNotesWhite
                                                }
                                                alt="Notes"
                                            />
                                        </div>
                                        <label className="item-label">Private Notes</label>
                                    </div>
                                </button>
                            );
                        }

                        if (
                            e.tmdpm_id === 7 &&
                            e.tmdpm_status === 0 &&
                            isVaccinationAccessable
                        ) {
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    className={`nav-item ${collapsedFlag === 3 ? "active" : ""}`}
                                    onClick={handleDrawerVaccination}
                                >
                                    <div className="item-content">
                                        <div className="icon-container">
                                            <img
                                                src={
                                                    collapsedFlag === 3 ? vaccinationDark : vaccinationWhite
                                                }
                                                alt="Vaccine"
                                            />
                                        </div>
                                        <label className="item-label">Vaccine</label>
                                    </div>
                                </button>
                            );
                        }

                        if (
                            e.tmdpm_id === 16 &&
                            e.tmdpm_status === 0 &&
                            isGrowthChartAccessable
                        ) {
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    className={`nav-item ${collapsedFlag === 5 ? "active" : ""}`}
                                    onClick={handleDrawerGrowth}
                                >
                                    <div className="item-content">
                                        <div className="icon-container">
                                            <img
                                                src={collapsedFlag === 5 ? growthChartDark : growthChart}
                                                alt="Growth"
                                            />
                                        </div>
                                        <label className="item-label">Growth</label>
                                    </div>
                                </button>
                            );
                        }

                        if (
                            e.tmdpm_id === 17 &&
                            e.tmdpm_status === 0 &&
                            isGynaecHistoryAccessable
                        ) {
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    className={`nav-item ${collapsedFlag === 6 ? "active" : ""}`}
                                    onClick={() =>
                                        examinationHistory?.length === 0 &&
                                            !shouldShowAncHistory &&
                                            !shouldShowImmunisation &&
                                            !obstetricDetails?.lmp &&
                                            !obstetricDetails?.edd &&
                                            !obstetricDetails?.gravidity &&
                                            !obstetricDetails?.parity &&
                                            !obstetricDetails?.livingChildren &&
                                            !obstetricDetails?.abortion &&
                                            !obstetricDetails?.ectopicPregnancies &&
                                            !obstetricDetails?.ceed
                                            ? handleDrawerObstetric()
                                            : openCollapsed(6)
                                    }
                                >
                                    <div className="item-content">
                                        <div className="icon-container">
                                            <img
                                                src={
                                                    collapsedFlag === 6 ? obstetricDark : obstetricWhite
                                                }
                                                alt="Obstetric"
                                            />
                                        </div>
                                        <label className="item-label">Obstetric</label>
                                    </div>
                                </button>
                            );
                        }

                        if (e.tmdpm_id === 18 && e.tmdpm_status === 0) {
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    className={`nav-item ${collapsedFlag === 7 ? "active" : ""}`}
                                    onClick={() =>
                                        allUploadedDocs?.length === 0
                                            ? handleAddClick()
                                            : openCollapsed(7)
                                    }
                                >
                                    <input
                                        type="file"
                                        multiple
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept="image/png, image/jpeg, image/jpg, image/gif, application/pdf, video/mp4, video/quicktime, video/x-msvideo"
                                        style={{ display: "none" }}
                                    />
                                    <div className="item-content">
                                        <div className="icon-container">
                                            <img
                                                src={
                                                    collapsedFlag === 7
                                                        ? medicalRecordsDark
                                                        : medicalRecordsWhite
                                                }
                                                alt="Records"
                                            />
                                        </div>
                                        <label className="item-label">Records</label>
                                    </div>
                                </button>
                            );
                        }

                        if (e.tmdpm_id === 19 && e.tmdpm_status === 0) {
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    className={`nav-item ${collapsedFlag === 8 ? "active" : ""}`}
                                    onClick={() =>
                                        labParamsData?.length === 0
                                            ? handleAddLabParamsDrawer()
                                            : openCollapsed(8)
                                    }
                                >
                                    <div className="item-content">
                                        <div className="icon-container">
                                            <span className={`lab-icon ${collapsedFlag === 8 ? "active" : ""}`} role="img" aria-label="Lab"></span>
                                        </div>  
                                        <label className="item-label">Lab Results</label>
                                    </div>
                                </button>
                            );
                        }

                        if (
                            e.tmdpm_id === 22 &&
                            e.tmdpm_status === 0 &&
                            isCarePlanEnabled
                        ) {
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    className={`nav-item ${collapsedFlag === 11 ? "active" : ""}`}
                                    onClick={() => openCollapsed(11)}
                                >
                                    <div className="item-content">
                                        <div className="icon-container">
                                            <img
                                                src={
                                                    collapsedFlag === 11 ? carePlanIconDark : carePlanIcon
                                                }
                                                alt="Care Plan"
                                            />
                                        </div>
                                        <label className="item-label">Care Plan</label>
                                    </div>
                                </button>
                            );
                        }

                        return null;
                    })}
                </>
            )}

            {/* Fade out bottom effect for scrolling */}
            <div className="bottom-gradient" />
        </div>
    );
};

export default TabRxNavPanel;
