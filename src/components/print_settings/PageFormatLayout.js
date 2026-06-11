import React, { useCallback, useContext } from "react";
import { Form, Radio, Select, Tooltip } from "antd";

import PrintSettingsContext from '../../context/PrintSettingsContext';
import { FONTS_FAMILY_LIST, FONTS_SIZE_LIST, LANGUAGE_LIST } from "../../utils/constants";

function PageFormatLayout() {

    const { printSettings, setPrintSettings } = useContext(PrintSettingsContext);

    const onSelectFontFamily = useCallback(
        (data) => {
            printSettings.page_format.font_family = data
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onSelectFontSize = useCallback(
        (data) => {
            printSettings.page_format.font_size = data
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onSelectPatientInfoFontSize = useCallback(
        (data) => {
            printSettings.page_format.patient_info_font_size = data
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const onSelectDefaultLanguage = useCallback(
        (data) => {
            printSettings.default_language = data
            setPrintSettings((prev) => {
                return {
                    ...prev
                };
            });
        },
        [printSettings]
    );

    const paginationHandler = useCallback((e) => {
        const paginationValue = e.target.value;
        
        setPrintSettings(prevSettings => ({
          ...prevSettings,
          page_format: {
            ...prevSettings.page_format,
            pagination: paginationValue
          }
        }));
    }, []);

    return (
        <div className="px-3 form_addnewpatient">
            <div className="titleprint mb-3">Page Layout</div>
            {/* <Form.Item>
            <label className="mb-1">Page Size</label>
            <Radio.Group className="d-flex gender-radio">
                <Radio.Button className="w-100 text-center" value="a4">A4</Radio.Button>
                <Radio.Button className="w-100 text-center" value="a5">A5</Radio.Button>
            </Radio.Group>
        </Form.Item> */}
            <Form.Item>
                <label className="mb-1">Font Family</label>
                <Select
                    // showSearch
                    className="autocomplete-custom"
                    placeholder="Select font family"
                    options={FONTS_FAMILY_LIST}
                    value={printSettings?.page_format?.font_family}
                    onSelect={onSelectFontFamily}
                    allowClear
                />
            </Form.Item>

            <Form.Item>
                <label className="mb-1">Consultation Details Font Size</label>
                <Select
                    className="autocomplete-custom"
                    placeholder="Select font size"
                    options={FONTS_SIZE_LIST}
                    value={printSettings?.page_format?.font_size}
                    onSelect={onSelectFontSize}
                    allowClear
                />
            </Form.Item>

            <Form.Item>
                <label className="mb-1">Patient Info Font Size</label>
                <Select
                    className="autocomplete-custom"
                    placeholder="Select font size"
                    options={FONTS_SIZE_LIST}
                    value={printSettings?.page_format?.patient_info_font_size || printSettings?.page_format?.font_size}
                    onSelect={onSelectPatientInfoFontSize}
                    allowClear
                />
            </Form.Item>

             <Form.Item>
                <label className="mb-1">Pagination</label>
                <Radio.Group className="d-flex gender-radio" value={!!printSettings?.page_format?.pagination} onChange={paginationHandler}>
                    <Radio.Button className="w-100 text-center" value={true}>Show</Radio.Button>
                    <Radio.Button className="w-100 text-center" value={false}>Hide</Radio.Button>
                </Radio.Group>
            </Form.Item>

            <Form.Item>
                <div className="d-flex align-items-center mb-1">
                    <label>Default Language</label>
                     <Tooltip
                        placement="bottom"
                        title={"The below selected language will be used by default for all new prescriptions. You can still change it for specific patients while printing their Rx."}
                        >
                    <i className="icon-info ms-1" style={{ fontSize: "18px", cursor: "pointer" }} />
                    </Tooltip>
                </div>
                <Select
                    className="autocomplete-custom"
                    placeholder="Select Default Language"
                    options={LANGUAGE_LIST}
                    value={LANGUAGE_LIST.find(item => item.value == printSettings?.default_language)}
                    onSelect={onSelectDefaultLanguage}
                />
            </Form.Item>
        </div>
    );
}

export default React.memo(PageFormatLayout);
