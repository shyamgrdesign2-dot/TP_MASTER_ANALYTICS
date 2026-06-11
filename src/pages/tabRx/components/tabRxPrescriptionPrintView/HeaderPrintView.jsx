import React, { useMemo } from "react";
import { Navbar } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Dropdown } from "antd";
import { useSelector, useDispatch } from "react-redux";

import {
  errorMessage,
  makeDefaultLogo,
  stopAllActiveRecorders,
} from "../../../../utils/utils";
import { sendCashsheetWhatsapp } from "../../../../redux/caseManagerSlice";
import { resetVaccineState } from "../../../../redux/vaccineSlice";
import { resetGrowthChartState } from "../../../../redux/growthChartSlice";
import { resetObstetricState } from "../../../../redux/obstetricSlice";
import {
  syncDigitizationStatus,
  updateVisitStatus,
} from "../../../../api/services/VisitService";
import { resetUploadDocState } from "../../../../redux/uploadDocSlice";
import { resetDDxState } from "../../../../redux/ddxSlice";
import {
  LANGUAGE_LIST,
  NEO_NATOLOGISTS_DP_ID,
} from "../../../../utils/constants";
import { useChikitsalay } from "../../../chikitsalay/useChikitsalay";
import { ASSETS } from "../../../../assets";
const {
  profileImg,
  hPlayIcon: playIcon,
  tutorial: tutorial2,
  settings: settingsIcon,
  languageIcon,
  shadedArrow,
} = ASSETS.images;

function HeaderPrintView({
  patient_data,
  tcm_id,
  printUrl,
  handleGoToAppointment,
  pam_id,
  isSnapRx,
  selectedLang,
  isVoiceOrAmbientFlow,
  onOpenPrintSettings,
  onSelectLanguage,
  showDigitalRx,
}) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { profile } = useSelector((state) => state.doctors);
  const { loadingEndVisit } = useSelector((state) => state.caseManager);
  const dispatch = useDispatch();
  const urlParams = new URLSearchParams(window.location.search);
  const isReceptionist = urlParams.has("receptionist");
  const isChikitsalayAccessable = useChikitsalay();

  const selectedLangValueRaw =
    typeof selectedLang === "object" && selectedLang !== null
      ? selectedLang.value
      : selectedLang;

  const selectedLangValue =
    typeof selectedLangValueRaw === "string" && selectedLangValueRaw.trim() !== ""
      ? Number(selectedLangValueRaw)
      : selectedLangValueRaw;

  const currentLanguageLabel = useMemo(() => {
    if (
      typeof selectedLang === "object" &&
      selectedLang !== null &&
      selectedLang.label
    ) {
      return selectedLang.label;
    }
    return (
      LANGUAGE_LIST.find((item) => item.value == selectedLangValue)?.label ||
      "English"
    );
  }, [selectedLang, selectedLangValue]);

  const languageMenuItems = LANGUAGE_LIST.map((item) => ({
    key: String(item.value),
    label: item.label,
  }));

  const onEndVisitClick = async () => {
    if (isVoiceOrAmbientFlow) {
      stopAllActiveRecorders();
    }

    if (handleGoToAppointment) {
      handleGoToAppointment();
    } else {
      var sendData = {
        patient_unique_id:
          patient_data !== undefined ? patient_data.patient_unique_id : 0,
        pm_pid: patient_data !== undefined ? patient_data.pm_pid : 0,
        tcm_id: tcm_id,
        lg:
          selectedLang !== undefined && selectedLang !== "English"
            ? btoa(selectedLang.toString())
            : "",
      };
      if (!isChikitsalayAccessable) {
        const action = await dispatch(sendCashsheetWhatsapp(sendData));
      }
      if (pam_id || tcm_id) {
        updateVisitStatus({
          status: 3,
          isSnapRx: true,
          appointment_id: pam_id,
          prescriptionUrl: printUrl,
          tcm_id: tcm_id,
        });
        if (state?.page === "digitise") {
          const urlObj = new URL(printUrl);
          const isRxdigitised = urlObj.searchParams.get("rxDigitize");
          if (isRxdigitised !== "true") {
            urlObj.searchParams.set("rxDigitize", "true");
          }
          syncDigitizationStatus({
            appointment_id: pam_id,
            tcm_id: tcm_id,
            is_digitized: true,
            digitized_prescription_url: urlObj?.toString(),
          });
        }
      }
      // if (action.meta.requestStatus === "fulfilled") {
        dispatch(resetVaccineState());
        dispatch(resetGrowthChartState());
        dispatch(resetObstetricState());
        dispatch(resetUploadDocState());
        dispatch(resetDDxState());
        navigate("/", { replace: true });
      // } else {
      //   errorMessage(action.error);
      // }
    }
  };

  const genderAge = (patient_data) => {
    var value = `${patient_data?.pm_gender[0].toUpperCase()}, `;
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
        value += `${patient_data?.ageYears}y`;
      } else if (patient_data?.ageMonths != 0) {
        value += ` ${patient_data?.ageMonths}m`;
      } else if (patient_data?.ageDays != 0) {
        value += ` ${patient_data?.ageDays}d`;
      }
    }
    return value;
  };

  return (
    <Navbar className="justify-content-between headerprescription p-0">
      <div className="border-end text-center h-100 flex align-items-center">
        {/* <Button
          type="text"
          className="close-drawer-btn h-100"
          onClick={onEndVisitClick}
        >
          <i className="icon-Cross" style={{ fontSize: "30px" }}></i>
        </Button> */}
      </div>
      <div className="align-items-center d-flex w-100 justify-content-between">
        <div>
          <div className={"align-items-center d-flex h-100 ps-3"}>
            <div className="rounded-pill patientProfile border me-3">
              <img src={profileImg} alt="Profile" />
            </div>
            <div>
              <div className="patientName">
                {`${patient_data !== undefined ? patient_data.pm_fullname : "Hello Guest"}`}
                <div className="text-2">
                  {patient_data !== undefined
                    ? genderAge(patient_data)
                    : `M, 30y`}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="align-items-center d-flex">
          {/* <Popover
              open={popOverVideo}
              onOpenChange={showHideVideoListPopover}
              content={VIDEO_CONTENT}
              trigger="click"
              overlayClassName="pop-430 pp-0 videoTutorial"
              placement="bottom"
          > */}
          <button className="icon-btn bg-transparent border-0 p-0">
            <img
              src={tutorial2}
              alt="Tutorial"
              style={{ width: 42, height: 42 }}
            />
          </button>
          {/* </Popover> */}

          <div
            className="rx-header-divider"
            style={{ margin: "0 14px 0 8px" }}
          />

          {!isReceptionist && onOpenPrintSettings && (
            <button
              type="button"
              onClick={onOpenPrintSettings}
              className="d-flex align-items-center"
              style={{
                border: "none",
                outline: "none",
                borderRadius: 10,
                backgroundColor: "#F1F1F5",
                padding: "8px 16px",
                display: "inline-flex",
                alignItems: "center",
                cursor: "pointer",
                height: "42px",
              }}
            >
              <img className="me-2" src={settingsIcon} alt="Settings" />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#374151",
                }}
              >
                Print Settings
              </span>
            </button>
          )}

          {showDigitalRx && (
            <>
              <div className="rx-header-divider mx-3" />
              <div className="d-flex align-items-center" style={{ height: "42px" }}>
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: languageMenuItems,
                    onClick: ({ key }) => {
                      if (onSelectLanguage) {
                        onSelectLanguage(Number(key));
                      }
                    },
                  }}
                >
                  <div
                    style={{
                      borderRadius: 10,
                      backgroundColor: "#F3F4F6",
                      padding: "8px 16px",
                      display: "inline-flex",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9,
                        // border: "1px solid #D1D5DB",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        className="me-1"
                        src={languageIcon}
                        alt="Language"
                        // style={{ width: 16, height: 16 }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#374151",
                        marginRight: 6,
                      }}
                    >
                      {currentLanguageLabel}
                    </span>
                    <i className="fs-3 icon-right iconrotate270" />
                  </div>
                </Dropdown>
              </div>
            </>
          )}

          <div className="rx-header-divider mx-3" />

          <Button
            onClick={onEndVisitClick}
            loading={loadingEndVisit}
            className={`btn align-items-center d-flex btn-41 me-3 px-4 btn-primary3`}
          >
            Done
          </Button>
        </div>
      </div>
    </Navbar>
  );
}

export default React.memo(HeaderPrintView);
