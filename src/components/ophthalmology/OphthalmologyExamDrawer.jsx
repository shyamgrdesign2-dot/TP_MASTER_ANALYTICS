import React, { useCallback, useEffect, useState } from "react";
import { Button, Drawer, Dropdown } from "antd";
import { useDispatch, useSelector } from "react-redux";
import OphthalmologyExamPanel from "./OphthalmologyExamPanel";
import styles from "./OphthalmologyExamDrawer.module.scss";
import { OPHTHALMOLOGY_SECTIONS } from "../../utils/ophthalmologyExamConstants";
import { buildOpthalPayload } from "../../utils/ophthalmologyPayload";
import {
  createOpthalPrescription,
  getOpthalPrescriptionDetails,
  updateOpthalPrescription,
} from "../../pages/ophthalmology/service";
import {
  resetOpthalForm,
  setLastOpthalPrescriptionData,
  setOpthalPrescriptionId,
} from "../../redux/ophthalmologyExamSlice";
import { ASSETS } from "../../assets";
const moreIcon = ASSETS.images.more;

const OphthalmologyExamDrawer = ({
  open,
  onClose,
  patientData,
  tcmId,
  title = "Opthal Details",
}) => {
  const dispatch = useDispatch();
  const { visualAcuity, tables, extraFields, opthalPrescriptionId } =
    useSelector((state) => state.ophthalmologyExam);
  const [isSaving, setIsSaving] = useState(false);
  const [loadPrevAllSignal, setLoadPrevAllSignal] = useState(0);
  const [clearAllSignal, setClearAllSignal] = useState(0);

  useEffect(() => {
    if (!tcmId) {
      return;
    }
    let isMounted = true;
    const fetchExisting = async () => {
      try {
        const response = await getOpthalPrescriptionDetails({
          tcm_id: tcmId,
          patientId: patientData?.patient_unique_id,
        });
        const data = response?.data ?? response;
        const payload = Array.isArray(data) ? data[0] : data;
        if (!isMounted || !payload) {
          return;
        }
        dispatch(setLastOpthalPrescriptionData(payload));
        if (payload?._id) {
          dispatch(setOpthalPrescriptionId(payload._id));
        }
        setLoadPrevAllSignal((prev) => prev + 1);
      } catch (error) {
        console.error("Error fetching opthal prescription details:", error);
      }
    };
    fetchExisting();
    return () => {
      isMounted = false;
    };
  }, [dispatch, tcmId, patientData?.patient_unique_id]);

  const buildPayload = useCallback(() => {
    return buildOpthalPayload({
      sections: OPHTHALMOLOGY_SECTIONS,
      tables,
      extraFields,
      visualAcuity,
      tcmId,
    });
  }, [extraFields, tables, tcmId, visualAcuity]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = buildPayload();
      const patientId = patientData?.patient_unique_id;
      const response = opthalPrescriptionId
        ? await updateOpthalPrescription(opthalPrescriptionId, payload, { patientId })
        : await createOpthalPrescription(payload, { patientId });
      const resolvedId =
        response?._id || response?.data?._id || response?.result?._id || null;
      if (resolvedId && !opthalPrescriptionId) {
        dispatch(setOpthalPrescriptionId(resolvedId));
      }
    } catch (error) {
      console.error("Error saving opthal prescription:", error);
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  const handleClearAll = () => {
    dispatch(resetOpthalForm());
    setClearAllSignal((prev) => prev + 1);
  };

  const menu = {
    items: [
      {
        key: "clearAll",
        label: "Clear All",
      },
    ],
    onClick: ({ key }) => {
      if (key === "clearAll") {
        handleClearAll();
      }
    },
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      closeIcon={false}
      placement="right"
      width="100%"
      className={styles.drawer}
      bodyStyle={{ padding: 0 }}
    >
      <div className={styles.drawerHeader}>
        <button type="button" className={styles.backButton} onClick={onClose}>
          <i className="icon-right text-main"></i>
        </button>
        <div className={styles.drawerTitle}>{title}</div>
        <div className={styles.drawerActions}>
          <button
            type="button"
            className={styles.prevButton}
            onClick={() => setLoadPrevAllSignal((prev) => prev + 1)}
          >
            <i className="icon-reload"></i>
            <span>Load from Prev.</span>
          </button>
          <Button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
            loading={isSaving}
          >
            Save
          </Button>
          <Dropdown menu={menu} trigger={["click"]} placement="bottomRight">
            <button type="button" className={styles.moreButton}>
              <img src={moreIcon} alt="More" />
            </button>
          </Dropdown>
        </div>
      </div>
      <div className={styles.drawerBody}>
        <OphthalmologyExamPanel
          patientData={patientData}
          enableSectionCollapse
          loadPrevAllSignal={loadPrevAllSignal}
          clearAllSignal={clearAllSignal}
          fetchLastOnMount={false}
        />
      </div>
    </Drawer>
  );
};

export default OphthalmologyExamDrawer;
