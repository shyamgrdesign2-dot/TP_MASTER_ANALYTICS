import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import moment from "moment";
import ApiTeleconsult from "../api/services/ApiTeleconsult";
import ApiAppointments from "../api/services/ApiAppointments";

import { removeWaitingBanner, setActiveTeleconsultAppointmentId, setActiveTeleconsultConsultationId, setJoinToken} from "../redux/teleconsultNotificationSlice";
import { TAB_QUEUE, TAB_FINISHED, TAB_DRAFT_RX } from "../utils/constants";
import "./TeleconsultWaitingBanner.scss";
import { ASSETS } from "../assets";
const videoGreenIcon = ASSETS.images.videoGreen;

const DATE_FORMAT = "YYYY-MM-DD";

async function findAppointmentByPamIdInList(pamId, dateStr, apStatus) {
  try {
    const result = await ApiAppointments.getAllAppointment({
      startDate: dateStr,
      endDate: dateStr,
      apStatue: apStatus,
      page: 0,
    });
    const list = result?.data?.app_data ?? [];
    const record = list.find((e) => String(e?.pam_id) === String(pamId));
    return record || null;
  } catch {
    return null;
  }
}

async function findAppointmentByPamId(pamId) {
  if (pamId == null || pamId === "") return null;
  const tabs = [TAB_QUEUE, TAB_FINISHED, TAB_DRAFT_RX];
  const dates = [
    moment().format(DATE_FORMAT),
    moment().subtract(1, "day").format(DATE_FORMAT),
    moment().add(1, "day").format(DATE_FORMAT),
  ];
  for (const dateStr of dates) {
    for (const apStatus of tabs) {
      const record = await findAppointmentByPamIdInList(pamId, dateStr, apStatus);
      if (record) return record;
    }
  }
  return null;
}

export default function TeleconsultWaitingBanner({ payload, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [joinLoading, setJoinLoading] = useState(false);

  const hasRealName = payload?.patientName && String(payload.patientName).trim();
  const patientLabel = hasRealName ? `Patient ${payload.patientName.trim()}` : "Patient";
  const appointmentTime = payload?.appointmentTime ?? "";

  const handleClose = () => {
    onClose?.();
    if (payload?.consultationId) {
      dispatch(removeWaitingBanner(payload.consultationId));
    }
  };

  const handleJoinCall = async () => {
    const appointmentId = payload?.appointmentId ?? payload?.prescriptionContext?.pam_id;
    if (!appointmentId || joinLoading) return;
    setJoinLoading(true);
    try {
      const response = await ApiTeleconsult.checkVideoAvailability(appointmentId);
      const data = response?.data ?? response;
      const joinPayload = data?.joinPayload;
      const token = joinPayload?.token ?? data?.token;
      if (token) {
        let patientData =
          payload?.prescriptionContext &&
          (payload.prescriptionContext.pam_id != null ||
            payload.prescriptionContext.patient_unique_id != null)
            ? payload.prescriptionContext
            : null;

        if (!patientData) {
          patientData = await findAppointmentByPamId(appointmentId);
        }

        if (!patientData) {
          patientData = {
            pam_id: appointmentId,
            ...(payload?.patient_unique_id != null && {
              patient_unique_id: payload.patient_unique_id,
            }),
          };
        }

        const videoConsultData = {
          pam_id: patientData.pam_id ?? appointmentId,
          pam_status_type_appointment: 2,
        };
        const pamId = patientData.pam_id ?? appointmentId;
        const consultationId = data?.consultationId;
        dispatch(setJoinToken(token));
        dispatch(setActiveTeleconsultAppointmentId(pamId));
        if (consultationId) {
          dispatch(setActiveTeleconsultConsultationId(consultationId));
        }
        navigate("/prescription", {
          state: {
            patient_data: patientData,
            videoConsultData,
            teleconsultAutoJoin: { consultationId, token },
          },
        });
        if (consultationId) {
          dispatch(removeWaitingBanner(consultationId));
        }
      } else {
        message.error(
          data?.joinWindowExpired
            ? "Join window has ended."
            : "Cannot join this video consultation."
        );
      }
    } catch (error) {
      message.error("Cannot join this video consultation.");
      console.error("[TeleconsultWaitingBanner] Join failed", error);
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="teleconsult-waiting-banner">
      <div className="teleconsult-waiting-banner__content">
        <img
          src={videoGreenIcon}
          alt=""
          className="teleconsult-waiting-banner__icon"
        />
        <p className="teleconsult-waiting-banner__text">
          <strong>{patientLabel}</strong> has joined the Tele-Consultation
          scheduled at <strong>{appointmentTime || "—"}</strong>!
        </p>
      </div>
      <div className="teleconsult-waiting-banner__actions">
        <button
          type="button"
          className="teleconsult-waiting-banner__btn teleconsult-waiting-banner__btn--close"
          onClick={handleClose}
        >
          Close
        </button>
        <button
          type="button"
          className="teleconsult-waiting-banner__btn teleconsult-waiting-banner__btn--join"
          onClick={handleJoinCall}
          disabled={joinLoading}
        >
          {joinLoading ? (
            <>
              <LoadingOutlined className="me-2" />
              Joining…
            </>
          ) : (
            "Join the Call"
          )}
        </button>
      </div>
    </div>
  );
}
