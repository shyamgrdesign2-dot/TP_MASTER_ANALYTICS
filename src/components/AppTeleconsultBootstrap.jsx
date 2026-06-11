import React, { useCallback, useEffect, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { message } from "antd";
import ApiTeleconsult from "../api/services/ApiTeleconsult";
import { getTokenData } from "../utils/utils";
import TeleconsultNotificationHandler from "./TeleconsultNotificationHandler";
import TeleconsultFloatingWindow from "./TeleconsultFloatingWindow";
import {
  setAppointmentTeleconsultStatus,
  setJoinToken,
} from "../redux/teleconsultNotificationSlice";

export default function AppTeleconsultBootstrap() {
  const dispatch = useDispatch();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const joinToken = useSelector((state) => state.teleconsultNotification?.joinToken);
  const activeTeleconsultAppointmentId = useSelector(
    (state) => state.teleconsultNotification?.activeTeleconsultAppointmentId
  );
  const activeTeleconsultConsultationId = useSelector(
    (state) => state.teleconsultNotification?.activeTeleconsultConsultationId
  );
  const profile = useSelector((state) => state.doctors?.profile);

  const isLoginPage = location.pathname === "/login";
  const isVoiceRxRoute = location.pathname.startsWith("/voice-rx");
  const isReceptionist = searchParams.has("receptionist");
  const showFloatingWindow = joinToken && !isLoginPage && !isReceptionist && !isVoiceRxRoute;
  const doctorName = profile?.um_name || profile?.doctor_name || "Doctor";

  const doctorLeftFiredRef = useRef(false);
  useEffect(() => {
    if (joinToken) doctorLeftFiredRef.current = false;
  }, [joinToken]);

  const leaveTeleconsult = useCallback(async () => {
    if (doctorLeftFiredRef.current) {
      if (activeTeleconsultAppointmentId != null) {
        dispatch(
          setAppointmentTeleconsultStatus({
            appointmentId: activeTeleconsultAppointmentId,
            status: "ENDED",
          })
        );
      }
      dispatch(setJoinToken(null));
      return;
    }
    doctorLeftFiredRef.current = true;
    const tokenData = getTokenData();

    window?.Moengage?.track_event("TP_TC_endTC", {
      doctor_name: profile?.um_name,
      doctor_number: profile?.um_contact,
      doctor_specialty: profile?.dp_name,
      um_id: tokenData?.user_id,
    });

    try {
      if (activeTeleconsultConsultationId) {
        await ApiTeleconsult.doctorLeft(activeTeleconsultConsultationId);
      }
    } catch (error) {
      console.log("[teleconsult] doctorLeft during close failed", {
        consultationId: activeTeleconsultConsultationId,
        message: error?.message,
      });
    } finally {
      if (activeTeleconsultAppointmentId != null) {
        dispatch(
          setAppointmentTeleconsultStatus({
            appointmentId: activeTeleconsultAppointmentId,
            status: "ENDED",
          })
        );
      }
      dispatch(setJoinToken(null));
    }
  }, [activeTeleconsultAppointmentId, activeTeleconsultConsultationId, dispatch, profile]);

  // If user navigates into any Voice Rx consult route while a teleconsult call is active,
  // automatically drop the video call so they can proceed with the Voice Rx flow.
  useEffect(() => {
    if (isVoiceRxRoute && joinToken) {
      message.info("Voice Rx does not support tele consultation", 3);
      console.log("[AppTeleconsultBootstrap] Clearing joinToken on Voice Rx route.", {
        path: location.pathname,
      });
      leaveTeleconsult();
    }
  }, [isVoiceRxRoute, joinToken, leaveTeleconsult, location.pathname]);

  return (
    <>
      <TeleconsultNotificationHandler />
      {showFloatingWindow && (
        <TeleconsultFloatingWindow
          authToken={joinToken}
          doctorName={doctorName}
          onClose={leaveTeleconsult}
        />
      )}
    </>
  );
}