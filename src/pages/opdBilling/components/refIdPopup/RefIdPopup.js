import { Button, Input } from "antd";
import CommonModal from "../../../../common/CommonModal";

import { useCallback, useState } from "react";
import { getClinic, trackEvent } from "../../../../utils/utils";
import { useSelector } from "react-redux";
import { ASSETS } from "../../../../assets";
const alertIcon = ASSETS.images.alerticon;

const { TextArea } = Input;

const RefIdPopup = ({ index, refId, showHideModal, handleModeChange }) => {
  const [refIdData, setRefId] = useState(refId);
  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const {profile} = useSelector(state => state.subscription);

  const showHideBackModal = useCallback(() => {
    setIsBackModalOpen(!isBackModalOpen);
  }, [isBackModalOpen]);
  return (
    <>
      <CommonModal
        isModalOpen={true}
        onCancel={showHideModal}
        modalWidth={500}
        title={"Add UPI Ref ID"}
        modalBody={
          <>
            <TextArea
              placeholder="Enter Ref ID"
              autoSize
              style={{
                minHeight: 38,
                maxHeight: 180,
                overflowY: "auto",
              }}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 150) {
                  setRefId(value);
                }
              }}
              value={refIdData}
            />
            <div className="d-flex justify-content-between align-items-center mt-4">
              <div>
                <Button
                  className="btn btn-delete-prescription p-0"
                  onClick={showHideBackModal}
                >
                  <i className="icon-delete" style={{ color: "#FC5A5A" }} />
                </Button>
              </div>
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={() => {
                    showHideModal();
                    setRefId("");
                  }}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  Cancel
                </div>
                <Button
                  onClick={() => {
                    const clinic = getClinic();
                    const urlParams = new URLSearchParams(window.location.search);
                    const receptionistId = urlParams.get("receptionistId");
                    const receptionistName = urlParams.get("receptionistName");
                    trackEvent("TP_Billing_AddinUPIRef", {
                      doctorSpeciality: profile?.dp_name,
                      doctorId: profile?.doctor_unique_id,
                      doctorContact: profile?.um_contact,
                      city: clinic?.hm_city,
                      pincode: clinic?.hm_pincode,
                      receptionistId: receptionistId,
                      receptionistName: receptionistName,
                    });
                    handleModeChange(refIdData, index, "refId");
                    showHideModal();
                  }}
                  className="lh-lg btn btn-primary3 btn-41 px-4"
                >
                  <span>Add</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
      <CommonModal
        isModalOpen={isBackModalOpen}
        onCancel={showHideBackModal}
        modalWidth={500}
        title={"You may lose your data"}
        modalBody={
          <>
            <div className="alert-warning rounded-10px p-2 patient-details">
              <div className="d-flex align-items-center">
                <img className="me-3" src={alertIcon} alt="Warning" />
                <span>Are you sure you want to delete ?</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="d-flex align-items-center mt-2 justify-content-end">
                <div
                  onClick={() => {
                    handleModeChange("", index, "refId");
                    showHideModal();
                  }}
                  className="me-4 text-decoration-underline btn p-0 text-main"
                >
                  Yes Delete
                </div>
                <Button
                  onClick={showHideBackModal}
                  className="lh-lg btn btn-primary3 btn-41 px-4"
                >
                  <span>No</span>
                </Button>
              </div>
            </div>
          </>
        }
      />
    </>
  );
};

export default RefIdPopup;
