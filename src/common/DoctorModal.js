import React from "react";
import { Modal } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { closeModal } from "../redux/doctorModalSlice";
import UserDetailsForm from "./UserDetailsForm";

const DoctorModal = () => {
  const dispatch = useDispatch();
  const { isVisible } = useSelector((state) => state.doctorModal);

  const handleClose = () => {
    dispatch(closeModal());
  };

  return (
    <Modal
      open={isVisible}
      title={"Request a call back"}
      footer={null}
      onCancel={handleClose}
      destroyOnClose
    >
      <UserDetailsForm />
    </Modal>
  );
};

export default DoctorModal;
