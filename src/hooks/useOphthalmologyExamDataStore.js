import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { setVisualAcuityData } from "../redux/ophthalmologyExamSlice";

const normalizeEyeKey = (value) => {
  const normalized = (value || "").toString().trim().toLowerCase();
  if (normalized === "od" || normalized === "right") return "od";
  if (normalized === "os" || normalized === "left") return "os";
  return "";
};

const pickFirst = (...values) => values.find((value) => value !== undefined);

const mapRowToFields = (row = {}) => ({
  ucDistance: pickFirst(row.ucDistance, row.uc_distance, row.ucDist, row.ucdist, row["uc distance"]),
  ucNear: pickFirst(row.ucNear, row.uc_near, row.ucNearVision, row["uc near"]),
  pinhole: pickFirst(row.pinhole, row.pinHole, row.pin_hole, row["pin hole"]),
  cDistance: pickFirst(row.cDistance, row.c_distance, row.cd, row["c distance"]),
  cNear: pickFirst(row.cNear, row.c_near, row.cn, row["c near"]),
});

export const mapVisualAcuityFromDigitization = (data) => {
  if (!data) return null;

  const direct = data.visualAcuityTest || data.visualAcuity || data.visualAcuityData || {};
  const byEye = direct?.byEye || direct?.eyes || direct;
  const mapped = { od: {}, os: {} };

  if (Array.isArray(byEye)) {
    byEye.forEach((row) => {
      const eyeKey = normalizeEyeKey(row?.eye || row?.side);
      if (!eyeKey) return;
      mapped[eyeKey] = mapRowToFields(row);
    });
    return mapped;
  }

  if (typeof byEye === "object") {
    ["od", "os"].forEach((eyeKey) => {
      if (byEye[eyeKey]) {
        mapped[eyeKey] = mapRowToFields(byEye[eyeKey]);
      }
    });

    if (byEye.right || byEye.left) {
      if (byEye.right) mapped.od = mapRowToFields(byEye.right);
      if (byEye.left) mapped.os = mapRowToFields(byEye.left);
    }
  }

  const hasValues = Object.values(mapped).some((eye) =>
    Object.values(eye || {}).some((value) => value !== undefined)
  );

  return hasValues ? mapped : null;
};

export const useOphthalmologyExamDataStore = () => {
  const dispatch = useDispatch();

  const addDataToStore = useCallback(
    (data) => {
      const visualAcuity = mapVisualAcuityFromDigitization(data);
      if (visualAcuity) {
        dispatch(setVisualAcuityData(visualAcuity));
      }
    },
    [dispatch]
  );

  return { addDataToStore };
};
