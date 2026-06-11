import { Col, Form, Input, Radio, Row, Select, Switch } from "antd";
import React from "react";
import { isMobile } from "react-device-detect";
import { errorMessage } from "../../../../utils/utils";
import { FONTS_SIZE_LIST } from "../../../../utils/constants";

const LetterheadCustom = ({ headerFooter, setPrintSettings }) => {
  const { TextArea } = Input;
  const inputLogoFile = React.createRef();

  const { doctorInfo, clinicInfo, logo } = headerFooter?.header || {};

  const onInfoChange = (value, key, infoType) => {
    const crossInfo =
      infoType === "logo"
        ? infoType
        : infoType === "doctorInfo"
        ? "clinicInfo"
        : "doctorInfo";
    setPrintSettings((prev) => {
      return {
        ...prev,
        headerFooter: {
          ...prev?.headerFooter,
          header: {
            ...prev?.headerFooter?.header,
            [infoType]: {
              ...prev?.headerFooter?.header?.[infoType],
              [key]: value,
            },
          },
        },
      };
    });
    if (key === "position") {
      setPrintSettings((prev) => {
        return {
          ...prev,
          headerFooter: {
            ...prev?.headerFooter,
            header: {
              ...prev?.headerFooter?.header,
              [crossInfo]: {
                ...prev?.headerFooter?.header?.[crossInfo],
                [key]: value === "left" ? "right" : "left",
              },
            },
          },
        };
      });
    }
  };

  //Logo on Header
  const onLogoSwitchChange = (checked) => {
    setPrintSettings((prev) => {
      return {
        ...prev,
        headerFooter: {
          ...prev?.headerFooter,
          header: {
            ...prev?.headerFooter?.header,
            logo: {
              ...prev?.headerFooter?.header?.logo,
              enabled: checked,
            },
          },
        },
      };
    });
  };

  // Logo Image
  const handleLogoChange = (e) => {
    if (e.target.files?.length > 0) {
      const fileUrl = e.target.files[0];
      if (
        fileUrl.size <= 2000000 &&
        (fileUrl.type == "image/png" ||
          fileUrl.type == "image/jpeg" ||
          fileUrl.type == "image/jpg")
      ) {
        setPrintSettings((prev) => {
          return {
            ...prev,
            headerFooter: {
              ...prev?.headerFooter,
              header: {
                ...prev?.headerFooter?.header,
                logo: {
                  ...prev?.headerFooter?.header?.logo,
                  file: fileUrl,
                },
              },
            },
          };
        });
      } else {
        errorMessage(
          "Please upload only jpg, jpeg or png files with the max size 2mb."
        );
      }
    }
  };

  //Footer
  const onFooterChange = (value, key) => {
    setPrintSettings((prev) => {
      return {
        ...prev,
        headerFooter: {
          ...prev?.headerFooter,
          footer: {
            ...prev?.headerFooter?.footer,
            [key]: value,
          },
        },
      };
    });
  };

  return (
    <div className="mt-5">
      <Row
        justify="space-between"
        className="align-items-center form_addnewpatient mb-3"
      >
        <Col lg="18">
          <div className="title-common">Doctor’s information</div>
        </Col>
        <Col lg="6">
          <span className="fw-medium me-2 text-greycolor fs-16">
            {doctorInfo?.enabled ? "Show" : "Hide"}
          </span>
          <Switch
            onChange={() =>
              onInfoChange(!doctorInfo?.enabled, "enabled", "doctorInfo")
            }
            checked={doctorInfo?.enabled}
          />
        </Col>
      </Row>

      {doctorInfo?.enabled && (
        <>
          <Form.Item>
            <Radio.Group
              className={`d-flex gender-radio ${
                isMobile ? "segmented-radio-mobile" : ""
              }`}
              onChange={(e) =>
                onInfoChange(e.target.value, "position", "doctorInfo")
              }
              value={doctorInfo?.position}
            >
              <Radio.Button className="w-100 text-center" value="left">
                Left
              </Radio.Button>
              <Radio.Button className="w-100 text-center" value="right">
                Right
              </Radio.Button>
            </Radio.Group>
          </Form.Item>
          <div className="mt-3">
            <Form.Item>
              <label className="mb-1">Header</label>
              <Input
                className="inputheight41-group"
                placeholder="Enter Doctor Name"
                onChange={(e) =>
                  onInfoChange(e.target.value, "header", "doctorInfo")
                }
                value={doctorInfo?.header}
              />
            </Form.Item>
          </div>
          <div className="mt-3">
            <Form.Item>
              <label className="mb-1">Subheader</label>
              <TextArea
                className="endreason-textarea subheader-textarea"
                placeholder="Enter Information (Ex: MBBS, MD)"
                style={{
                  resize: "none",
                }}
                onChange={(e) =>
                  onInfoChange(e.target.value, "subheader", "doctorInfo")
                }
                value={doctorInfo?.subheader}
              />
            </Form.Item>
          </div>
        </>
      )}

      <Row
        justify="space-between"
        className="align-items-center form_addnewpatient mb-3"
      >
        <Col lg="18">
          <div className="title-common">Clinic's information</div>
        </Col>
        <Col lg="6">
          <span className="fw-medium me-2 text-greycolor fs-16">
            {clinicInfo?.enabled ? "Show" : "Hide"}
          </span>
          <Switch
            onChange={() =>
              onInfoChange(!clinicInfo?.enabled, "enabled", "clinicInfo")
            }
            checked={clinicInfo?.enabled}
          />
        </Col>
      </Row>

      {clinicInfo?.enabled && (
        <>
          <Form.Item>
            <Radio.Group
              className={`d-flex gender-radio ${
                isMobile ? "segmented-radio-mobile" : ""
              }`}
              onChange={(e) =>
                onInfoChange(e.target.value, "position", "clinicInfo")
              }
              value={clinicInfo?.position}
            >
              <Radio.Button className="w-100 text-center" value="left">
                Left
              </Radio.Button>
              <Radio.Button className="w-100 text-center" value="right">
                Right
              </Radio.Button>
            </Radio.Group>
          </Form.Item>
          <div className="mt-3">
            <Form.Item>
              <label className="mb-1">Header</label>
              <Input
                className="inputheight41-group"
                placeholder="Enter Clinic Name"
                onChange={(e) =>
                  onInfoChange(e.target.value, "header", "clinicInfo")
                }
                value={clinicInfo?.header}
              />
            </Form.Item>
          </div>
          <div className="mt-3">
            <Form.Item>
              <label className="mb-1">Subheader</label>
              <TextArea
                className="endreason-textarea subheader-textarea"
                placeholder="Enter Clinic Address"
                style={{
                  resize: "none",
                }}
                onChange={(e) =>
                  onInfoChange(e.target.value, "subheader", "clinicInfo")
                }
                value={clinicInfo?.subheader}
              />
            </Form.Item>
          </div>
        </>
      )}

      <Row
        justify="space-between"
        className="align-items-center form_addnewpatient mb-3"
      >
        <Col lg="18">
          <div className="title-common">Logo on Header</div>
        </Col>
        <Col lg="6">
          <span className="fw-medium me-2 text-greycolor fs-16">
            {logo?.enabled ? "Show" : "Hide"}
          </span>
          <Switch
            onChange={() => onInfoChange(!logo?.enabled, "enabled", "logo")}
            checked={logo?.enabled}
          />
        </Col>
      </Row>

      {logo?.enabled && (
        <div className="upload-headfoot upload-headfoot2 p-3">
          <div className="d-flex align-items-center justify-content-between">
            {logo && logo?.enabled ? (
              <img
                style={{
                  height: 62,
                  objectFit: "contain",
                  overflow: "hidden",
                }}
                src={
                  logo?.file instanceof File
                    ? URL.createObjectURL(logo?.file)
                    : logo?.file
                }
                alt="logo-file"
              />
            ) : (
              <div className="text-start fontroboto">
                Upload a picture of your
                <br /> Logo
              </div>
            )}
            <div
              className="btn btn-input btn-41 d-flex align-items-center justify-content-center"
              onClick={() => inputLogoFile.current?.click()}
            >
              <input
                key={Math.random()}
                ref={inputLogoFile}
                style={{ display: "none" }}
                type="file"
                accept="image/png"
                onChange={handleLogoChange}
              />
              <span>
                <i className="icon-upload me-2"></i>
                {logo?.file ? "Change" : "Upload"}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3">
        <Form.Item>
          <label className="mb-1">Footer Text</label>
          <Input
            className="inputheight41-group"
            placeholder="Enter Footer Text"
            onChange={(e) => onFooterChange(e.target.value, "title")}
            value={headerFooter?.footer?.title}
          />
        </Form.Item>
      </div>

      <div className="mt-3">
        <Form.Item>
          <label className="mb-1">Footer Font Size</label>
          <Select
            className="autocomplete-custom"
            placeholder="Select footer font size"
            options={FONTS_SIZE_LIST}
            value={headerFooter?.footer?.fontSize}
            onSelect={(e) => onFooterChange(e, "fontSize")}
            allowClear
          />
        </Form.Item>
      </div>
    </div>
  );
};

export default LetterheadCustom;
