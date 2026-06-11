import { Col, Input, Row } from "antd";

import { onlyDecimalFormat } from "../../../../utils/utils";
import { ASSETS } from "../../../../assets";
const rxDisplayArea = ASSETS.images.rxDisplayArea;

const LetterheadOwn = ({ headerFooter, setPrintSettings, marginType }) => {
  //Own Letterhead
  const onMarginChange = (value, key) => {
    if (
      ((key === "top" || key === "bottom") && value <= 15) ||
      ((key === "left" || key === "right") && value <= 10)
    ) {
      setPrintSettings((prev) => {
        return {
          ...prev,
          headerFooter: {
            ...prev?.headerFooter,
            [marginType]: {
              ...prev?.headerFooter?.[marginType],
              [key]: value,
            },
          },
        };
      });
    }
  };

  return (
    <div className="mt-5">
      <Row
        justify="space-between"
        className="align-items-center form_addnewpatient mb-1"
      >
        <Col lg="24">
          <div className="title-common">
            Set page margins to display your own letterhead
          </div>
        </Col>
      </Row>
      <div className="">
        <div className="my-3 text-center">
          <label className="mb-1">Top (cm)</label> <br />
          <Input
            className="inputheight41-group"
            value={headerFooter?.[marginType]?.top}
            onChange={(e) => {
              const value = onlyDecimalFormat(e.target.value);
              onMarginChange(value ? parseFloat(value) : 0, "top");
            }}
            style={{ width: 70 }}
            inputMode="decimal"
          />
        </div>
        <Row className="align-items-center justify-content-around form_addnewpatient mb-1">
          <Col lg="6">
            <div className="text-center">
              <label className="mb-1">Left (cm)</label> <br />
              <Input
                className="inputheight41-group"
                value={headerFooter?.[marginType]?.left}
                onChange={(e) => {
                  const value = onlyDecimalFormat(e.target.value);
                  onMarginChange(value ? parseFloat(value) : 0, "left");
                }}
                style={{ width: 70 }}
                inputMode="decimal"
              />
            </div>
          </Col>
          <Col lg="12">
            <img src={rxDisplayArea} />
          </Col>
          <Col lg="6">
            <div className="text-center">
              <label className="mb-1">Right (cm)</label> <br />
              <Input
                className="inputheight41-group"
                value={headerFooter?.[marginType]?.right}
                onChange={(e) => {
                  const value = onlyDecimalFormat(e.target.value);
                  onMarginChange(value ? parseFloat(value) : 0, "right");
                }}
                style={{ width: 70 }}
                inputMode="decimal"
              />
            </div>
          </Col>
        </Row>
        <div className="my-3 text-center">
          <Input
            className="inputheight41-group"
            value={headerFooter?.[marginType]?.bottom}
            onChange={(e) => {
              const value = onlyDecimalFormat(e.target.value);
              onMarginChange(value ? parseFloat(value) : 0, "bottom");
            }}
            style={{ width: 70 }}
            inputMode="decimal"
          />
          <br />
          <label className="mb-1">Bottom (cm)</label>
        </div>
      </div>
    </div>
  );
};

export default LetterheadOwn;
