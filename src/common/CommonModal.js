import React from "react";
import { Modal, Card } from "antd";

function CommonModal({ handleCancel, isModalOpen, title, modalBody, modalWidth, onCancel, zIndex }) {
  return (
    <Modal
      open={isModalOpen}
      centered
      closeIcon={false}
      footer={null}
      className="modalcommon"
      width={modalWidth}
      zIndex={zIndex}
      onCancel={!handleCancel ? onCancel : null}
      destroyOnClose
    >
      <Card
        title={title}
        extra={
          <button className="btn p-1 lh-1 btnclose closeButton" onClick={onCancel}>
            <i className="icon-Cross"></i>
          </button>
        }
      >
        {modalBody}
      </Card>
    </Modal>
  );
}

export default React.memo(CommonModal);
