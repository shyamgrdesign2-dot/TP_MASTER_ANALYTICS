import { Button, Col, Row } from "antd";
import CommonModal from "../../../../common/CommonModal";
import { Cropper } from "react-cropper";
import "cropperjs/dist/cropper.css";
import React, { useCallback, useEffect, useState } from "react";
import { dataUrlToFileUsingFetch, errorMessage } from "../../../../utils/utils";
import { ASSETS } from "../../../../assets";
const defaultprofile = ASSETS.images.defaultProfile;

const LetterheadUpload = ({ setPrintSettings, headerFooter }) => {
  const [fileFooter, setFileFooter] = useState(null);
  const [fileHeader, setFileHeader] = useState(null);
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [isFooterModalOpen, setIsFooterModalOpen] = useState(false);

  const cropperHeaderRef = React.createRef();
  const inputHeaderFile = React.createRef();
  const inputFooterFile = React.createRef();
  const cropperFooterRef = React.createRef();

  useEffect(() => {
    const headerFile = headerFooter?.header?.file;
    if (headerFile) {
      setFileHeader({
        imageShow: true,
        file: headerFile,
        originalFile: headerFile,
      });
    }
    const footerFile = headerFooter?.footer?.file;
    if (footerFile) {
      setFileFooter({
        imageShow: true,
        file: footerFile,
        originalFile: footerFile,
      });
    }
  }, [headerFooter]);

  //Upload Letterhead
  const showHideHeaderModal = useCallback(() => {
    setIsHeaderModalOpen(!isHeaderModalOpen);
  }, [isHeaderModalOpen]);

  const handleHeaderChange = (e) => {
    if (e.target.files?.length > 0) {
      const fileUrl = e.target.files[0];
      if (
        fileUrl.size <= 2000000 &&
        (fileUrl.type == "image/png" ||
          fileUrl.type == "image/jpeg" ||
          fileUrl.type == "image/jpg")
      ) {
        const reader = new FileReader();
        reader.onerror = () => {};
        reader.onload = () => {
          const dataUrl = reader.result;
          setFileHeader({
            imageShow: false,
            crop: true,
            file: dataUrl,
            originalFile: fileUrl,
          });
          showHideHeaderModal();
        };
        reader.readAsDataURL(fileUrl);
      } else {
        errorMessage(
          "Please upload only jpg, jpeg or png files with the max size 2mb."
        );
      }
    }
  };

  const getHeaderCropData = async () => {
    if (typeof cropperHeaderRef.current?.cropper !== "undefined") {
      const croppedCanvas = cropperHeaderRef.current?.cropper.getCroppedCanvas();
      const trimData = croppedCanvas?.toDataURL(fileHeader.originalFile.type);
      const uploadFile = await dataUrlToFileUsingFetch(
        trimData,
        "header.png",
        "image/png"
      );
      setFileHeader({
        ...fileHeader,
        crop: false,
        file: trimData,
        uploadFile: uploadFile,
      });
    }
  };

  const getHeaderCropChangeData = () => {
    if (fileHeader && !fileHeader?.crop) {
      const reader = new FileReader();
      reader.onload = () => {
        setFileHeader({
          ...fileHeader,
          imageShow: false,
          crop: true,
          file: reader.result,
        });
      };
      reader.readAsDataURL(fileHeader.originalFile);
    }
  };

  const onHeaderImageSubmit = () => {
    setFileHeader({ ...fileHeader, imageShow: true });
    setPrintSettings((prev) => {
      return {
        ...prev,
        headerFooter: {
          ...prev?.headerFooter,
          header: {
            ...prev?.headerFooter?.header,
            file: fileHeader?.uploadFile,
          },
        },
      };
    });
    showHideHeaderModal();
  };

  //Footer Image
  const showHideFooterModal = useCallback(() => {
    setIsFooterModalOpen(!isFooterModalOpen);
  }, [isFooterModalOpen]);

  const handleFooterChange = (e) => {
    if (e.target.files?.length > 0) {
      const fileUrl = e.target.files[0];
      if (
        fileUrl.size <= 2000000 &&
        (fileUrl.type == "image/png" ||
          fileUrl.type == "image/jpeg" ||
          fileUrl.type == "image/jpg")
      ) {
        const reader = new FileReader();
        reader.onerror = () => {};
        reader.onload = () => {
          const dataUrl = reader.result;
          setFileFooter({
            imageShow: false,
            crop: true,
            file: dataUrl,
            originalFile: fileUrl,
          });
          showHideFooterModal();
        };
        reader.readAsDataURL(fileUrl);
      } else {
        errorMessage(
          "Please upload only jpg, jpeg or png files with the max size 2mb."
        );
      }
    }
  };

  const getFooterCropData = async () => {
    if (typeof cropperFooterRef.current?.cropper !== "undefined") {
      const croppedCanvas = cropperFooterRef.current?.cropper.getCroppedCanvas();
      const trimData = croppedCanvas?.toDataURL(fileFooter.originalFile.type);
      const uploadFile = await dataUrlToFileUsingFetch(
        trimData,
        "footer.png",
        "image/png"
      );
      setFileFooter({
        ...fileFooter,
        crop: false,
        file: trimData,
        uploadFile: uploadFile,
      });
    }
  };

  const getFooterCropChangeData = () => {
    if (fileFooter && !fileFooter?.crop) {
      const reader = new FileReader();
      reader.onload = () => {
        setFileFooter({
          ...fileFooter,
          imageShow: false,
          crop: true,
          file: reader.result,
        });
      };
      reader.readAsDataURL(fileFooter.originalFile);
    }
  };

  const onFooterImageSubmit = () => {
    setFileFooter({ ...fileFooter, imageShow: true });
    setPrintSettings((prev) => {
      return {
        ...prev,
        headerFooter: {
          ...prev?.headerFooter,
          footer: {
            ...prev?.headerFooter?.footer,
            file: fileFooter?.uploadFile,
          },
        },
      };
    });
    showHideFooterModal();
  };

  return (
    <div className="mt-5">
      <Row
        justify="space-between"
        className="align-items-center form_addnewpatient mb-1"
      >
        <Col lg="24">
          <div className="title-common">
            Upload your header and footer image
          </div>
        </Col>
      </Row>
      <div className="upload-headfoot">
        {fileHeader && fileHeader?.imageShow ? (
          <>
            <img
              style={{
                width: "100%",
                objectFit: "contain",
                overflow: "hidden",
              }}
              src={
                fileHeader?.file instanceof File
                  ? URL.createObjectURL(fileHeader?.file)
                  : fileHeader?.file
              }
            />
            <Button
              className="btn btn-headfoot"
              onClick={() => inputHeaderFile.current?.click()}
            >
              <i className="icon-Edit me-1"></i>Edit
            </Button>
          </>
        ) : (
          <>
            <div
              className="fw-medium text-decoration-underline cursor-pointer"
              onClick={() => inputHeaderFile.current?.click()}
            >
              Upload Header
            </div>
            <div className="fs-12-1 fontroboto">
              {" "}
              Only jpg, jpeg or png files with the max size 2mb.
            </div>
          </>
        )}
        <input
          key={Math.random()}
          ref={inputHeaderFile}
          style={{ display: "none" }}
          type="file"
          accept="image/*"
          onChange={handleHeaderChange}
        />
        <CommonModal
          handleCancel={true}
          isModalOpen={isHeaderModalOpen}
          onCancel={showHideHeaderModal}
          modalWidth={744}
          title={
            <div className="d-flex">
              <div className="align-items-center d-flex w-100">
                <div className="text-truncate-twolines">{"Crop Image"}</div>
              </div>
              <Button
                type="button"
                disabled={fileHeader && !fileHeader?.crop ? false : true}
                className="btn-41 btn px-4 btn-primary3 me-4"
                onClick={onHeaderImageSubmit}
              >
                Submit
              </Button>
            </div>
          }
          modalBody={
            <>
              <div className="d-flex image-crop bg-dark justify-content-center align-items-center">
                {fileHeader && fileHeader.crop ? (
                  <Cropper
                    ref={cropperHeaderRef}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                    preview=".img-preview"
                    src={fileHeader ? fileHeader?.file : defaultprofile}
                    viewMode={3}
                    background={false}
                    autoCropArea={0.3}
                    guides={false}
                  />
                ) : (
                  <img
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                    src={fileHeader ? fileHeader?.file : defaultprofile}
                  />
                )}
              </div>
              <div className="mt-4">
                <div className="d-flex align-items-center mt-2 justify-content-between">
                  <div
                    className="fw-normal text-decoration-underline btn p-0 text-main"
                    onClick={showHideHeaderModal}
                  >
                    {fileHeader && !fileHeader?.crop ? "" : "Discard"}
                  </div>
                  <div
                    className="fw-normal text-decoration-underline btn p-0 text-main"
                    onClick={() =>
                      fileHeader && !fileHeader?.crop
                        ? getHeaderCropChangeData()
                        : getHeaderCropData()
                    }
                  >
                    {fileHeader && !fileHeader?.crop ? "Change" : "Save"}
                  </div>
                </div>
              </div>
            </>
          }
        />
      </div>
      <div className="upload-headfoot">
        {fileFooter && fileFooter?.imageShow ? (
          <>
            <img
              style={{
                width: "100%",
                objectFit: "contain",
                overflow: "hidden",
              }}
              src={
                fileFooter?.file instanceof File
                  ? URL.createObjectURL(fileFooter?.file)
                  : fileFooter?.file
              }
            />
            <Button
              className="btn btn-headfoot"
              onClick={() => inputFooterFile.current?.click()}
            >
              <i className="icon-Edit me-1"></i>Edit
            </Button>
          </>
        ) : (
          <>
            <div
              className="fw-medium text-decoration-underline cursor-pointer"
              onClick={() => inputFooterFile.current?.click()}
            >
              Upload Footer
            </div>
            <div className="fs-12-1 fontroboto">
              {" "}
              Only jpg, jpeg or png files with the max size 2mb.
            </div>
          </>
        )}
        <input
          key={Math.random()}
          ref={inputFooterFile}
          style={{ display: "none" }}
          type="file"
          accept="image/*"
          onChange={handleFooterChange}
        />
        <CommonModal
          handleCancel={true}
          isModalOpen={isFooterModalOpen}
          onCancel={showHideFooterModal}
          modalWidth={744}
          title={
            <div className="d-flex">
              <div className="align-items-center d-flex w-100">
                <div className="text-truncate-twolines">{"Crop Image"}</div>
              </div>
              <Button
                type="button"
                disabled={fileFooter && !fileFooter?.crop ? false : true}
                className="btn-41 btn px-4 btn-primary3 me-4"
                onClick={onFooterImageSubmit}
              >
                Submit
              </Button>
            </div>
          }
          modalBody={
            <>
              <div className="d-flex image-crop bg-dark justify-content-center align-items-center">
                {fileFooter && fileFooter.crop ? (
                  <Cropper
                    ref={cropperFooterRef}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                    preview=".img-preview"
                    src={fileFooter ? fileFooter?.file : defaultprofile}
                    viewMode={3}
                    background={false}
                    autoCropArea={0.3}
                    guides={false}
                  />
                ) : (
                  <img
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                    src={fileFooter ? fileFooter?.file : defaultprofile}
                  />
                )}
              </div>
              <div className="mt-4">
                <div className="d-flex align-items-center mt-2 justify-content-between">
                  <div
                    className="fw-normal text-decoration-underline btn p-0 text-main"
                    onClick={showHideFooterModal}
                  >
                    {fileFooter && !fileFooter?.crop ? "" : "Discard"}
                  </div>
                  <div
                    className="fw-normal text-decoration-underline btn p-0 text-main"
                    onClick={() =>
                      fileFooter && !fileFooter?.crop
                        ? getFooterCropChangeData()
                        : getFooterCropData()
                    }
                  >
                    {fileFooter && !fileFooter?.crop ? "Change" : "Save"}
                  </div>
                </div>
              </div>
            </>
          }
        />
      </div>
    </div>
  );
};

export default LetterheadUpload;
