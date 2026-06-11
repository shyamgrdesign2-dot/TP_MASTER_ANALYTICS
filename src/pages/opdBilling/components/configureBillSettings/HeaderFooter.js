import { Button, Col, Form, Radio, Row } from "antd";
import React, { useCallback, useState } from "react";
import { isMobile } from "react-device-detect";
import LetterheadOwn from "./LetterheadOwn";
import LetterheadCustom from "./LetterheadCustom";
import LetterheadUpload from "./LetterheadUpload";

const HeaderFooter = ({ headerFooter, setPrintSettings }) => {
  const [headerFooterShowHide, setHeaderFooterShowHide] = useState(false);

  //TAB_HEADER_FOOTER
  const onHeaderFooterClick = useCallback(() => {
    setHeaderFooterShowHide(!headerFooterShowHide);
  }, [headerFooterShowHide]);

  const onLetterheadFormatChange = (e) => {
    setPrintSettings((prev) => {
      return {
        ...prev,
        headerFooter: {
          ...prev?.headerFooter,
          letterHeadFormat: e.target.value,
        },
      };
    });
  };

  return (
    <div className="border-bottom pb-3 mb-3">
      <Row
        justify="space-between"
        className="align-items-center form_addnewpatient mb-1"
      >
        <Col lg="18">
          <div className="titleprint">Header & Footer</div>
        </Col>
        <Col lg="6">
          <Button
            className="btn rounded-10px px-1 border px-3-15"
            style={{
              transform: headerFooterShowHide
                ? "rotate(90deg)"
                : "rotate(-90deg)",
            }}
            onClick={onHeaderFooterClick}
          >
            <i className="icon-right"></i>
          </Button>
        </Col>
      </Row>
      <div>Setup your header and Footer</div>

      {headerFooterShowHide && (
        <div className="mt-4">
          <div className="mt-3">
            <Form.Item className="mb-0">
              <label className="mb-1 title-common">
                Select Letterhead Format
              </label>
              <Radio.Group
                className={`d-flex gender-radio all-change-radio ${
                  isMobile ? "segmented-radio-mobile" : ""
                }`}
                onChange={onLetterheadFormatChange}
                value={headerFooter?.letterHeadFormat}
              >
                <Radio.Button className="w-100 text-center" value={2}>
                  Own Letterhead
                </Radio.Button>
                <Radio.Button className="w-100 text-center" value={1}>
                  Upload Letterhead
                </Radio.Button>
                <Radio.Button className="w-100 text-center" value={0}>
                  Custom
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
          </div>

          {headerFooter?.letterHeadFormat === 0 ? (
            // For Custom tab
            <>
              <LetterheadCustom
                headerFooter={headerFooter}
                setPrintSettings={setPrintSettings}
              />
              <LetterheadOwn
                headerFooter={headerFooter}
                setPrintSettings={setPrintSettings}
                marginType={"customLetterHeadMargin"}
              />
            </>
          ) : headerFooter?.letterHeadFormat === 1 ? (
            //For Upload Letter head tab
            <>
              <LetterheadUpload
                headerFooter={headerFooter}
                setPrintSettings={setPrintSettings}
              />
              <LetterheadOwn
                headerFooter={headerFooter}
                setPrintSettings={setPrintSettings}
                marginType={"uploadedLetterHeadMargin"}
              />
            </>
          ) : (
            headerFooter?.letterHeadFormat === 2 && (
              // For Own Letterhead tab
              <LetterheadOwn
                headerFooter={headerFooter}
                setPrintSettings={setPrintSettings}
                marginType={"margin"}
              />
            )
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderFooter;
