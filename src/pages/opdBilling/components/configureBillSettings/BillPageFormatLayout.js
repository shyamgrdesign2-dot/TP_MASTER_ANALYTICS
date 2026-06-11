import { Form, Radio, Select } from "antd";
import {
  FONTS_FAMILY_LIST,
  FONTS_SIZE_LIST,
} from "../../../../utils/constants";
import { isMobile } from "react-device-detect";

const BillPageFormatLayout = ({ pageFormat, setPrintSettings }) => {
  const {
    fontFamily,
    fontSize,
    pageType = "A5",
    patientInfoFontSize,
  } = pageFormat || {};
  const onSelectPageFormat = (data, key) => {
    setPrintSettings((prev) => {
      return {
        ...prev,
        pageFormat: {
          ...prev.pageFormat,
          [key]: data,
        },
      };
    });
  };

  return (
    <div className="px-3 form_addnewpatient">
      <div className="titleprint mb-3">Page Layout</div>
      <label className="mb-1">Page Size</label>
      <Form.Item>
        <Radio.Group
          className={`d-flex gender-radio ${
            isMobile ? "segmented-radio-mobile" : ""
          }`}
          onChange={(e) => onSelectPageFormat(e.target.value, "pageType")}
          value={pageType}
        >
          <Radio.Button className="w-100 text-center" value="A4">
            A4
          </Radio.Button>
          <Radio.Button className="w-100 text-center" value="A5">
            A5
          </Radio.Button>
        </Radio.Group>
      </Form.Item>
      <Form.Item>
        <label className="mb-1">Font Family</label>
        <Select
          className="autocomplete-custom"
          placeholder="Select font family"
          options={FONTS_FAMILY_LIST}
          value={fontFamily}
          onSelect={(data) => onSelectPageFormat(data, "fontFamily")}
          allowClear
        />
      </Form.Item>

      <Form.Item>
        <label className="mb-1">Font Size</label>
        <Select
          className="autocomplete-custom"
          placeholder="Select font size"
          options={FONTS_SIZE_LIST}
          value={fontSize}
          onSelect={(data) => onSelectPageFormat(data, "fontSize")}
          allowClear
        />
      </Form.Item>

      <Form.Item>
        <label className="mb-1">Patient Info Font Size</label>
        <Select
          className="autocomplete-custom"
          placeholder="Select font size"
          options={FONTS_SIZE_LIST}
          value={patientInfoFontSize}
          onSelect={(data) =>
            onSelectPageFormat(data, "patientInfoFontSize")
          }
          allowClear
        />
      </Form.Item>
    </div>
  );
};

export default BillPageFormatLayout;
