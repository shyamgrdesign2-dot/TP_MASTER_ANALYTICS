import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { message } from "antd";
import {
  addWaitingBanner,
  removeWaitingBanner,
  setAppointmentTeleconsultStatus,
  setLastShownStatusKey,
} from "../redux/teleconsultNotificationSlice";
import TeleconsultWaitingBanner from "./TeleconsultWaitingBanner";

/** Event name for teleconsult notification payloads (e.g. from push or other sources). */
const TELECONSULT_NOTIFICATION_EVENT = "teleconsult-notification";

const STATUS = {
  CREATED: "CREATED",
  WAITING: "WAITING",
  ONGOING: "ONGOING",
  ENDED: "ENDED",
};

function statusKey(payload) {
  return payload ? `${payload.consultationId}-${payload.status}` : null;
}

export default function TeleconsultNotificationHandler() {
  const dispatch = useDispatch();
  const { waitingBanners } = useSelector((state) => state.teleconsultNotification);
  const lastToastKeyRef = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      const payload = event?.detail ?? null;
      if (!payload?.consultationId) return;

      const { appointmentId, status } = payload;
      const key = statusKey(payload);

      dispatch(setAppointmentTeleconsultStatus({ appointmentId, status }));

      switch (status) {
        case STATUS.WAITING:
          dispatch(addWaitingBanner(payload));
          if (key !== lastToastKeyRef.current) {
            lastToastKeyRef.current = key;
            dispatch(setLastShownStatusKey(key));
            message.info({
              content: "Patient is waiting for the call.",
              key: "teleconsult-waiting",
              duration: 4,
            });
          }
          break;
        case STATUS.ONGOING:
          if (key !== lastToastKeyRef.current) {
            lastToastKeyRef.current = key;
            dispatch(setLastShownStatusKey(key));
            message.info({
              content: "Meeting in progress.",
              key: "teleconsult-ongoing",
              duration: 3,
            });
          }
          break;
        case STATUS.ENDED:
          lastToastKeyRef.current = null;
          dispatch(removeWaitingBanner(payload.consultationId));
          break;
        case STATUS.CREATED:
          break;
        default:
          break;
      }
    };

    window.addEventListener(TELECONSULT_NOTIFICATION_EVENT, handler);
    return () => {
      window.removeEventListener(TELECONSULT_NOTIFICATION_EVENT, handler);
    };
  }, [dispatch]);

  if (waitingBanners.length === 0) return null;

  return (
    <div className="teleconsult-waiting-banners-stack">
      {waitingBanners.map((payload) => (
        <TeleconsultWaitingBanner
          key={payload.consultationId}
          payload={payload}
          onClose={() => {}}
        />
      ))}
    </div>
  );
}

export { STATUS };
