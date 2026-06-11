import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Container, Navbar, Row, Col } from "react-bootstrap";
import axios from "axios";
import {
  Button,
  Tooltip,
  Popover,
} from "antd";
import { useNavigate } from "react-router-dom";

import CommonModal from "./CommonModal";

import { useSelector, useDispatch } from "react-redux";
import VideoModal from "./VideoModal";
import { ASSETS } from "../assets";
const {
  alerticon: alertIcon,
  tutorial,
  tubeIcon: playIcons,
} = ASSETS.images;

function HeaderAppointmentAgent({
  onSubmit,
  isNextDisabled = false,
  validationMessage = "",
  showSummaryOnly = false,
  // enableEditMode = false,
}) {
  const { templates, loading } = useSelector((state) => state.caseManager);
  const { profile, videoList } = useSelector((state) => state.doctors);
  const [videoLink, setVideoLink] = useState(null);

  const dispatch = useDispatch();

  const navigate = useNavigate();

  const [isBackModalOpen, setIsBackModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [popOverVideo, setPopOverVideo] = useState(false);
  const [clicked, setClicked] = useState(false);

  const showHideBackModal = useCallback(() => {
    setIsBackModalOpen(!isBackModalOpen);
  }, [isBackModalOpen]);

  const handleSubmitClick = async () => {
    if (!clicked && !isNextDisabled) {
      onSubmit();
    }
  };

  //PopOverVideo function
  const showHideVideoListPopover = useCallback(() => {
    setPopOverVideo(!popOverVideo);
  }, [popOverVideo]);

  //Video Componet
  const VIDEO_CONTENT = useCallback(() => {
    return (
      <>
        <div className="video-contant rounded-4 p-20" key="oneclickrx-video">
          <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
            <div className="title-common lh-base">Video Tutorial</div>
            <Button
              className="btn btn-videoClose p-0"
              onClick={showHideVideoListPopover}
            >
              <i className="icon-Cross" />
            </Button>
          </div>
          {videoList
            ?.filter((e) => e.category_id === 9)[0]
            ?.video?.map((item1, i1) => {
              return (
                <div
                  key={i1}
                  className={`d-flex ${
                    i1 !==
                      videoList?.filter((e) => e.category_id === 9)[0]?.video
                        ?.length -
                        1 && "pb-3 mb-15 border-bottom"
                  }`}
                >
                  <div className="tutorial-play me-14">
                    <button type="button" onClick={() => setVideoLink(item1)}>
                      <img src={playIcons} />
                    </button>
                    <span className="tutorial-thumb">
                      <img src={item1.thumbnail} />
                    </span>
                  </div>
                  <div>
                    <h3 className="title-common text-welcome">
                      {item1?.tmv_title}
                    </h3>
                    <div className="fs-12 fontroboto fw-normal text-main">
                      {item1?.tmv_description}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </>
    );
  }, [popOverVideo]);

  const handleBackClick = () => {
    if (showSummaryOnly) {
      // If in summary-only mode, navigate back to appointment data
      navigate("/", { replace: true });
    } else {
      showHideBackModal();
    }
  };

  return (
    <Navbar className="justify-content-between headerprescription p-0">
      <Container fluid className="h-100 gx-0 w-100">
        <Row className="h-100 align-items-center w-100 justify-content-between">
          <Col lg="auto" className="h-100">
            <div className="align-items-center d-flex h-100">
              <div className="border-end h-100 text-center">
                <div
                  onClick={handleBackClick}
                  className="btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer"
                >
                  <i className="icon-right"></i>
                </div>
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
                          <span>
                            Are you sure you want to leave? <br />
                            You will permanently lose your data.
                          </span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="d-flex align-items-center mt-2 justify-content-end">
                          <div
                            onClick={() => navigate("/", { replace: true })}
                            className="me-4 text-decoration-underline btn p-0 text-main"
                          >
                            Yes Leave
                          </div>
                          <Button
                            onClick={showHideBackModal}
                            className="lh-lg btn btn-primary3 btn-41 px-4"
                          >
                            <span>No, Stay</span>
                          </Button>
                        </div>
                      </div>
                    </>
                  }
                />
              </div>
              <span className="title" style={{ marginLeft: "1rem" }}>
                {showSummaryOnly ? "Your AI Receptionist" : "Configure Your AI Receptionist"}
              </span>
            </div>
          </Col>
          <Col lg="auto">
            <div className="align-items-center d-flex h-100">
            {/* Will uncomment this code once the videos are ready*/}
              {/* <Popover
                open={popOverVideo}
                onOpenChange={showHideVideoListPopover}
                content={VIDEO_CONTENT}
                trigger="click"
                overlayClassName="pop-430 pp-0 videoTutorial"
                placement="bottom"
              >
                <button className="btn d-flex align-items-center btn-text me-10 tutorial">
                  <span className="text-decoration-none rounded-5 pe-3 bg-white shadow2">
                    <img height={42} src={tutorial} />
                    Tutorial
                  </span>
                </button>
              </Popover> */}
              {videoLink && (
                <VideoModal
                  videoLink={videoLink}
                  onCancel={() => setVideoLink(null)}
                />
              )}

              {/* {(!showSummaryOnly || enableEditMode) && ( */}
                <Tooltip
                  title={isNextDisabled ? validationMessage : ""}
                  placement="bottom"
                  open={isNextDisabled ? undefined : false}
                >
                  <Button
                    type="button"
                    className="btn align-items-center d-flex btn-41 btn-primary3 me-20 px-4"
                    onClick={handleSubmitClick}
                    disabled={isNextDisabled}
                    style={{
                      opacity: isNextDisabled ? 0.6 : 1,
                      cursor: isNextDisabled ? "not-allowed" : "pointer",
                    }}
                    // loading={loading || loader}
                    // disabled={(!prescription && clicked) || loader}
                  >
                    Next
                  </Button>
                </Tooltip>
              {/* )} */}
            </div>
          </Col>
        </Row>
      </Container>
    </Navbar>
  );
}

export default React.memo(HeaderAppointmentAgent);
