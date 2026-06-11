import { Button, Checkbox, Col, Form, Input, Radio, Row, Switch } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { Cropper } from "react-cropper";
import SignatureCanvas from "react-signature-canvas";
import { dataUrlToFileUsingFetch, errorMessage } from "../../../../utils/utils";
import CommonModal from "../../../../common/CommonModal";

import { isMobile } from "react-device-detect";
import { ASSETS } from "../../../../assets";
const defaultprofile = ASSETS.images.defaultProfile;

const OtherSetttings = ({ otherSettings, setPrintSettings }) => {
  const { TextArea } = Input;
  const [fileSignature, setFileSignature] = useState(null);
  const [fileWatermark, setFileWatermark] = useState(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureMode, setSignatureMode] = useState("left");
  const [settingsShowHide, setSettingsShowHide] = useState(false);

  const inputSignatureFile = React.createRef();
  const signatureRef = React.createRef();
  const cropperSignatureRef = React.createRef();
  const inputWatermarkFile = React.createRef();

  useEffect(() => {
    const signatureFile = otherSettings?.signature?.file;
    if (signatureFile) {
      setFileSignature({
        imageShow: true,
        showFile:
          signatureFile instanceof File
            ? URL.createObjectURL(signatureFile)
            : signatureFile,
        uploadFile: signatureFile,
      });
    }

    const watermarkFile = otherSettings?.waterMark?.file;
    if (watermarkFile) {
      setFileWatermark({
        imageShow: true,
        showFile:
          watermarkFile instanceof File
            ? URL.createObjectURL(watermarkFile)
            : watermarkFile,
        uploadFile: watermarkFile,
      });
    }
  }, [otherSettings]);

  //Other Settings
  const onSwitchChange = (value, type, key) => {
    setPrintSettings((prev) => {
      return {
        ...prev,
        headerFooter: {
          ...prev?.headerFooter,
          otherSettings: {
            ...prev?.headerFooter?.otherSettings,
            [type]: {
              ...prev?.headerFooter?.otherSettings?.[type],
              [key]: value,
            },
          },
        },
      };
    });
  };

  // Watermark Image
  const handleWatermarkChange = (e) => {
    if (e.target.files?.length > 0) {
      const fileUrl = e.target.files[0];
      if (
        fileUrl.size <= 2000000 &&
        (fileUrl.type == "image/png" ||
          fileUrl.type == "image/jpeg" ||
          fileUrl.type == "image/jpg")
      ) {
        setFileWatermark({
          imageShow: true,
          showFile: URL.createObjectURL(fileUrl),
          uploadFile: fileUrl,
        });
        onSwitchChange(fileUrl, "waterMark", "file");
      } else {
        errorMessage(
          "Please upload only jpg, jpeg or png files with the max size 2mb."
        );
      }
    }
  };

  //Signature Image
  const showHideSignatureModal = useCallback(() => {
    setIsSignatureModalOpen(!isSignatureModalOpen);
  }, [isSignatureModalOpen]);

  const onSignatureModeChange = useCallback(
    (e) => {
      setSignatureMode(e.target.value);
      setFileSignature(null);
    },
    [signatureMode]
  );

  const handleSignatureChange = (e) => {
    if (e.target.files?.length > 0) {
      const fileUrl = e.target.files[0];
      if (
        fileUrl.size <= 2000000 &&
        (fileUrl.type == "image/png" ||
          fileUrl.type == "image/jpeg" ||
          fileUrl.type == "image/jpg")
      ) {
        const reader = new FileReader();
        reader.onload = () => {
          setFileSignature({
            imageShow: false,
            crop: true,
            readFile: reader.result,
            originalFile: fileUrl,
            uploadFile: fileUrl,
          });
        };
        reader.readAsDataURL(fileUrl);
      } else {
        errorMessage(
          "Please upload only jpg, jpeg or png files with the max size 2mb."
        );
      }
    }
  };

  const onSignatureImageSubmit = () => {
    setFileSignature({ ...fileSignature, imageShow: true });
    onSwitchChange(fileSignature?.uploadFile, "signature", "file");
    onSwitchChange(true, "signature", "enabled");
    showHideSignatureModal();
  };

  const onRemoveSignature = () => {
    if (signatureRef.current) {
      signatureRef.current?.clear();
    }
    setFileSignature(null);
    onSwitchChange("", "signature", "file");
  };

  const onResetSignature = () => {
    if (signatureRef.current) {
      signatureRef.current?.clear();
    }
    setFileSignature(null);
  };

  const handleTrim = async () => {
    if (signatureMode === "left") {
      if (signatureRef.current?.isEmpty()) {
        alert("Please provide signature");
        return;
      }
      const trimData = signatureRef.current
        ?.getTrimmedCanvas()
        .toDataURL("image/png");
      const uploadFile = await dataUrlToFileUsingFetch(
        trimData,
        "signature.png",
        "image/png"
      );
      setFileSignature({
        ...fileSignature,
        preview: true,
        showFile: trimData,
        uploadFile: uploadFile,
      });
    } else {
      if (typeof cropperSignatureRef.current?.cropper !== "undefined") {
        const trimData = cropperSignatureRef.current?.cropper
          .getCroppedCanvas()
          .toDataURL(fileSignature.originalFile.type);
        const uploadFile = await dataUrlToFileUsingFetch(
          trimData,
          "signature.png",
          "image/png"
        );
        setFileSignature({
          ...fileSignature,
          preview: true,
          showFile: trimData,
          uploadFile: uploadFile,
        });
      }
    }
  };

  const onSettingsClick = useCallback(() => {
    setSettingsShowHide(!settingsShowHide);
  }, [settingsShowHide]);

  return (
    <div className="mb-3">
      <Row
        justify="space-between"
        className="align-items-center form_addnewpatient mb-1"
      >
        <Col lg="18">
          <div className="titleprint">Other Settings</div>
        </Col>
        <Col lg="6">
          <Button
            className="btn rounded-10px px-1 border px-3-15"
            style={{
              transform: settingsShowHide ? "rotate(90deg)" : "rotate(-90deg)",
            }}
            onClick={onSettingsClick}
          >
            <i className="icon-right"></i>
          </Button>
        </Col>
      </Row>
      <div>Customize your watermark, signature, and QR code</div>

      {settingsShowHide && (
        <div className="mt-4">
          <div className="mb-3">
            <Row
              justify="space-between"
              className="align-items-center form_addnewpatient"
            >
              <Col lg="18">
                <div className="title-common">Watermark</div>
              </Col>
              <Col lg="6">
                <Switch
                  onChange={() =>
                    onSwitchChange(
                      !otherSettings?.waterMark?.enabled,
                      "waterMark",
                      "enabled"
                    )
                  }
                  checked={otherSettings?.waterMark?.enabled}
                />
              </Col>
            </Row>
            {otherSettings?.waterMark?.enabled && (
              <div className="upload-headfoot upload-headfoot1 p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <img
                    style={{
                      height: 62,
                      objectFit: "contain",
                      overflow: "hidden",
                    }}
                    src={
                      fileWatermark && fileWatermark?.imageShow
                        ? fileWatermark?.showFile
                        : defaultprofile
                    }
                  />
                  <div
                    className="btn btn-input btn-41 d-flex align-items-center justify-content-center"
                    onClick={() => inputWatermarkFile.current?.click()}
                  >
                    <input
                      key={Math.random()}
                      ref={inputWatermarkFile}
                      style={{ display: "none" }}
                      type="file"
                      accept="image/png"
                      onChange={handleWatermarkChange}
                    />
                    <span>
                      <i className="icon-upload me-2"></i>
                      {fileWatermark && fileWatermark?.imageShow
                        ? "Change"
                        : "Upload New"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4">
            <Row
              justify="space-between"
              className="align-items-center form_addnewpatient mb-3"
            >
              <Col lg="18">
                <div className="title-common">Signature</div>
              </Col>
              <Col lg="6">
                <Switch
                  onChange={() =>
                    onSwitchChange(
                      !otherSettings?.signature?.enabled,
                      "signature",
                      "enabled"
                    )
                  }
                  checked={otherSettings?.signature?.enabled}
                />
              </Col>
            </Row>
            {otherSettings?.signature?.enabled && (
              <div>
                <Form.Item className="mb-0 mt-3">
                  <Radio.Group
                    className={`d-flex gender-radio ${
                      isMobile ? "segmented-radio-mobile" : ""
                    }`}
                    onChange={(e) =>
                      onSwitchChange(e.target.value, "signature", "position")
                    }
                    value={otherSettings?.signature?.position}
                  >
                    <Radio.Button className="w-100 text-center" value="left">
                      Left
                    </Radio.Button>
                    <Radio.Button className="w-100 text-center" value="right">
                      Right
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>
                <div className="border rounded-10px mt-3">
                  <div className="upload-headfoot border-0 border-bottom rounded-bottom-0 mt-0">
                    {fileSignature && fileSignature?.imageShow ? (
                      <>
                        <img
                          style={{
                            width: "100%",
                            objectFit: "contain",
                            overflow: "hidden",
                          }}
                          src={fileSignature?.showFile}
                        />
                        <Button
                          className="btn btn-headfoot btn-headfoot2 px-2"
                          onClick={onRemoveSignature}
                        >
                          <i className="icon-delete"></i>
                        </Button>
                        <Button
                          className="btn btn-headfoot px-2"
                          onClick={showHideSignatureModal}
                        >
                          <i className="icon-Edit"></i>
                        </Button>
                      </>
                    ) : (
                      <div
                        className="fw-medium text-decoration-underline cursor-pointer"
                        onClick={showHideSignatureModal}
                      >
                        Draw or Upload Signature
                      </div>
                    )}
                    <CommonModal
                      handleCancel={true}
                      isModalOpen={isSignatureModalOpen}
                      onCancel={showHideSignatureModal}
                      modalWidth={744}
                      title={
                        <div className="d-flex">
                          <div className="align-items-center d-flex w-100">
                            <div className="text-truncate-twolines">
                              {"Signature Image"}
                            </div>
                          </div>
                          <Button
                            type="button"
                            disabled={
                              fileSignature && fileSignature?.preview
                                ? false
                                : true
                            }
                            className="btn-41 btn px-4 btn-primary3 me-4"
                            onClick={onSignatureImageSubmit}
                          >
                            Submit
                          </Button>
                        </div>
                      }
                      modalBody={
                        <>
                          <div>
                            <div className="rounded-top-3 bg-body border border-bottom-0 d-flex align-items-center justify-content-between p-2">
                              <div className="fw-medium fontroboto text-main ms-2">
                                {"Draw Signature"}
                              </div>
                              <div>
                                <Form.Item className="mb-0">
                                  <Radio.Group
                                    className={`d-flex gender-radio draw-upload ${
                                      isMobile ? "segmented-radio-mobile" : ""
                                    }`}
                                    onChange={onSignatureModeChange}
                                    value={signatureMode}
                                  >
                                    <Radio.Button
                                      className="w-100 text-center"
                                      value="left"
                                    >
                                      <div className="d-flex align-items-center">
                                        <i className="fs-18 icon-Edit me-1"></i>
                                        <span className="fontroboto fs-12-1 fw-medium">
                                          Draw
                                        </span>
                                      </div>
                                    </Radio.Button>
                                    <Radio.Button
                                      className="w-100 text-center"
                                      value="right"
                                    >
                                      <div className="d-flex align-items-center">
                                        <i className="fs-16 icon-upload me-1"></i>
                                        <span className="fontroboto fs-12-1 fw-medium">
                                          Upload
                                        </span>
                                      </div>
                                    </Radio.Button>
                                  </Radio.Group>
                                </Form.Item>
                              </div>
                            </div>
                            <div className="d-flex image-crop border justify-content-center align-items-center">
                              {signatureMode === "left" ? (
                                <SignatureCanvas
                                  ref={signatureRef}
                                  canvasProps={{ width: 694, height: 189 }}
                                />
                              ) : (
                                <>
                                  {fileSignature && fileSignature.crop ? (
                                    <Cropper
                                      ref={cropperSignatureRef}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "contain",
                                      }}
                                      preview=".img-preview"
                                      src={
                                        fileSignature
                                          ? fileSignature?.readFile
                                          : defaultprofile
                                      }
                                      viewMode={3}
                                      background={false}
                                      autoCropArea={0.3}
                                      guides={false}
                                    />
                                  ) : (
                                    <>
                                      <div
                                        className="fw-medium text-decoration-underline cursor-pointer"
                                        onClick={() =>
                                          inputSignatureFile.current?.click()
                                        }
                                      >
                                        Upload Signature
                                      </div>
                                      <input
                                        key={Math.random()}
                                        ref={inputSignatureFile}
                                        style={{ display: "none" }}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleSignatureChange}
                                      />
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="d-flex align-items-center justify-content-between rounded-bottom-3 border border-top-0 p-2">
                              <div
                                className="fw-medium text-decoration-underline btn p-0 text-main"
                                onClick={onResetSignature}
                              >
                                {"Reset"}
                              </div>
                              <div
                                className="fw-medium text-decoration-underline btn p-0 text-main"
                                onClick={handleTrim}
                              >
                                {fileSignature && fileSignature?.preview
                                  ? "Change"
                                  : "Save"}
                              </div>
                            </div>
                            <div className="mt-4">
                              <div className="fw-normal text-main fw-medium fontroboto mb-1">
                                {"Signature Preview"}
                              </div>
                              <div
                                style={{
                                  height: 100,
                                  width: 200,
                                  border: "1px solid",
                                  borderColor: "#E2E2EA",
                                  backgroundColor: "#FAFAFB",
                                  borderRadius: "10px",
                                }}
                              >
                                {fileSignature && fileSignature?.preview && (
                                  <img
                                    style={{
                                      width: "100%",
                                      height: "100px",
                                      objectFit: "contain",
                                      overflow: "hidden",
                                    }}
                                    src={fileSignature?.showFile}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      }
                    />
                  </div>
                  <div className="p-3">
                    <div className="title-common mb-3">
                      Include in signature
                    </div>
                    <div className="mb-3">
                      <Checkbox
                        className="switch-name-check"
                        onChange={(e) =>
                          onSwitchChange(
                            e.target.checked,
                            "signature",
                            "doctorNameEnabled"
                          )
                        }
                        checked={otherSettings?.signature?.doctorNameEnabled}
                      >
                        Name of Doctor
                      </Checkbox>
                    </div>
                    <div className="mb-3">
                      <Checkbox
                        className="switch-name-check"
                        onChange={(e) =>
                          onSwitchChange(
                            e.target.checked,
                            "signature",
                            "registrationEnabled"
                          )
                        }
                        checked={otherSettings?.signature?.registrationEnabled}
                      >
                        Medical Registration Number
                      </Checkbox>
                    </div>
                    <div className="mb-3">
                      <Checkbox
                        className="switch-name-check"
                        onChange={(e) =>
                          onSwitchChange(
                            e.target.checked,
                            "signature",
                            "qualificationEnabled"
                          )
                        }
                        checked={otherSettings?.signature?.qualificationEnabled}
                      >
                        Qualifications
                      </Checkbox>
                    </div>
                    <TextArea
                      className="endreason-textarea h-76"
                      placeholder="Enter qualification e.g. MBBS, MS, MD"
                      style={{
                        resize: "none",
                      }}
                      onChange={(e) =>
                        onSwitchChange(
                          e.target.value,
                          "signature",
                          "qualification"
                        )
                      }
                      value={otherSettings?.signature?.qualification}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4">
            <Row
              justify="space-between"
              className="align-items-center form_addnewpatient mb-3"
            >
              <Col lg="18">
                <div className="title-common">Show QR code</div>
              </Col>
              <Col lg="6">
                <Switch
                  onChange={() =>
                    onSwitchChange(
                      !otherSettings?.qrCode?.enabled,
                      "qrCode",
                      "enabled"
                    )
                  }
                  checked={otherSettings?.qrCode?.enabled}
                />
              </Col>
            </Row>
          </div>
        </div>
      )}
    </div>
  );
};

export default OtherSetttings;
