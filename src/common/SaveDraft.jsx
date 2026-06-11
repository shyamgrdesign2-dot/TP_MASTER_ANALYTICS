import { Button, Tour } from "antd";

import { useEffect, useRef, useState } from "react";

import LoopingVideo from "../components/common/LoopingVideo";
import { upsertDoctorSettingFlag } from "../redux/doctorsSlice";
import { useDispatch, useSelector } from "react-redux";
import { ASSETS } from "../assets";
const {
  draftPrimary: draftIcon,
  newGif_3: tagNewWebm,
  newGif_2: tagNewMp4,
} = ASSETS.images;

const SaveDraft = ({ onSaveAsDraft, loading, label }) => {
  const tourRef = useRef(null);
  const [tourOpen, setTourOpen] = useState(false);
  const dispatch = useDispatch();
  const { profile } = useSelector((state) => state.doctors);

  useEffect(() => {
    if (
      profile?.userSettingFlag?.find((e) => e?.type === "save_draft_tour")
        ?.status !== 1
    ) {
      tourRef?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        setTourOpen(true);
      }, 1000);
    }
  }, [profile]);

  const handleSaveDraft = () => {
    onSaveAsDraft();
  };

  const onTourHandle = () => {
    dispatch(upsertDoctorSettingFlag({ type: "save_draft_tour", status: 1 }));
    setTourOpen(!tourOpen);
  };

  const steps = [
    {
      description: (
        <>
          <div className="fs-18 fw-semibold pt-3 text-black">
            Save as Draft
            <LoopingVideo
              className="img-fluid ms-2"
              width={60}
              height={50}
              webm={tagNewWebm}
              mp4={tagNewMp4}
              ariaLabel="New"
            />
          </div>
          <div className="pt-1">
            This feature lets you save the visit without <br /> completing it.
            You can come back, make <br /> changes, and end the visit later.
          </div>
        </>
      ),
      target: () => tourRef.current,
      nextButtonProps: {
        children: "Got It",
        onClick: onTourHandle,
      },
    },
  ];

  return (
    <div className="me-3">
      <Button
        type="button"
        ref={tourRef}
        className="save-as-draft-btn"
        onClick={handleSaveDraft}
        loading={loading}
        disabled={loading}
      >
        <img src={draftIcon} width={20} height={20} alt="Save as Draft" />
        <span>{label}</span>
      </Button>
      <Tour
        placement="bottom"
        closeIcon={false}
        open={tourOpen}
        steps={steps}
        onClose={onTourHandle}
      />
    </div>
  );
};

export default SaveDraft;
