import { Modal } from "antd";
import React from "react";

import LoopingVideo from "../../../components/common/LoopingVideo";
import { ASSETS } from "../../../assets";
const {
  successAnimation_2: successWebm,
  successAnimation: successMp4,
} = ASSETS.images;

const SuccessPopup = ({ show, setShow }) => {
  return (
    <Modal
      open={show}
      width={300}
      footer={null}
      closeIcon={null}
      onCancel={() => setShow(false)}
    >
      <div className="d-flex flex-column align-items-center py-3">
        <LoopingVideo
          webm={successWebm}
          mp4={successMp4}
          width={100}
          ariaLabel="Success"
        />
        Details updated successfully
      </div>
    </Modal>
  );
};

export default React.memo(SuccessPopup);
