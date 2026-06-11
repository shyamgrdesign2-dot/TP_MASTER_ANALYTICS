import React, { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { Input, Button, Drawer, Tabs, Select, Card, Spin, Segmented, Tooltip } from 'antd';

import { LoadingOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';

import CommonModal from '../../common/CommonModal';

import CashManagerContext from '../../context/CashManagerContext';
import { errorMessage, onlyNumberFormat, removeBeforeWhiteSpace, hasNumber, capitalizeAfterSentence } from "../../utils/utils";

import {
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getSymptomsTemplates,
    getFrequentlySearchedSymptoms,
    singleTemplateDetails,
} from "../../redux/symptomsSlice";

import TabSymptomsSearch from "../../components/tab_design/TabSymptomsSearch";

import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import DifferentialDiagnosis from "../DifferentialDiagnosis";
import { setIsDDxReadyToGenerate, setIsSymptomsBox } from "../../redux/ddxSlice";
import { ASSETS } from "../../assets";
const {
  alerticon: alertIcon,
  symptoms: Symptomsicon,
} = ASSETS.images;

function TabSymptomsBox({ handleDDxDrawer, generatedDDx }) {
    const {
        selectedSymptomsList,
        parentOptionsList,
        templates,
        loading,
    } = useSelector((state) => state.symptoms);
    const { isSymptomsBox } = useSelector((state) => state.ddx);
    const dispatch = useDispatch();

    const { symptomsData, setSymptomsData, examinationData } = useContext(CashManagerContext);
    // const [ symptomsData, setSymptomsData] = useState([]);

    // const associatedSymptoms = generatedDDx?.map(
    //     (item) => item.assocSymptoms
    // );

    // const uniqueSymptoms = [...new Set(associatedSymptoms.flat())];

    // const ddxOptionsList = uniqueSymptoms
    //     ?.map((item) => {
    //     return {
    //         symptom_name: item,
    //         usage_count: 0,
    //         isDDx: true,
    //     };
    //     })
    //     ?.filter(
    //     (e) =>
    //         ![...symptomsData.map((e1) => e1.symptom_name)].includes(
    //         e.symptom_name
    //         )
    //     );

    const [parentDrawer, setParentDrawer] = useState(false);
    const [childDrawer, setChildDrawer] = useState(false);
    const [childDrawerData, setChildDrawerData] = useState(null);

    const [templateDrawer, setTemplateDrawer] = useState(false);
    const [allTemplates, setAllTemplates] = useState([]);
    const [matchedTemplates, setMatchedTemplates] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isModalOpen1, setIsModalOpen1] = useState(false);
    const [removeTemplateId, setRemoveTemplateId] = useState(null);
    const [saveDrawer, setSaveDrawer] = useState(false);
    const [showShimmer, setShowShimmer] = useState(false);
    const [inputTemplateName, setInputTemplateName] = useState(null);
    const TAB_ADD_TEMPLATE = 1;
    const TAB_UPDATE_TEMPLATE = 2;
    const ADD_EDIT_TEMPLATE_TABS = [
        { key: TAB_ADD_TEMPLATE, label: "New Template" },
        { key: TAB_UPDATE_TEMPLATE, label: "Update Template" },
    ];
    const [tabChange, setTabChange] = useState(TAB_ADD_TEMPLATE);

    const [selectedIndex, setSelectedIndex] = useState(null);
    const SINCE_OPTIONS = [
        { value: "Hour", label: "H" },
        { value: "Day", label: "D" },
        { value: "Week", label: "W" },
        { value: "Month", label: "M" },
        { value: "Year", label: "Y" },
    ];
    const [sinceValue, setSinceValue] = useState(1);
    const [inputSince, setInputSince] = useState('');
    const [sinceOptions, setSinceOptions] = useState([]);
    const { isAutofillSelected, selectedSymptomsCollector } = useSelector(
      (state) => state.ddx
    );

    useEffect(() => {
        if (isAutofillSelected) {
            setShowShimmer(true);
            const timer = setTimeout(() => {
            setShowShimmer(false);
            }, 1000); // 1 seconds

            return () => clearTimeout(timer); // Cleanup timeout
        }
    }, [isAutofillSelected]);

    useEffect(() => {
    if (
        isAutofillSelected &&
        selectedSymptomsCollector &&
        Object.keys(selectedSymptomsCollector)?.length > 0
    ) {
        selectedSymptomsCollector?.symptoms?.map((symptom) => {
        symptomsData.push({
            symptom_name: symptom.name,
            since: symptom.duration,
            severity: symptom.severity,
            note: symptom.notes,
        });
        setSymptomsData((prev) => [...prev]);
        });
    }
    }, [isAutofillSelected, selectedSymptomsCollector]);

    useEffect(() => {
        if (selectedSymptomsList.length > 0) {
            const updatedData = symptomsData.map((e, i) => {
                return { ...e, ...selectedSymptomsList[i] };
            });
            setSymptomsData(updatedData);
        }
    }, [selectedSymptomsList]);

    useEffect(() => {
        dispatch(getSymptomsTemplates());
        dispatch(getFrequentlySearchedSymptoms());
    }, []);

    useEffect(() => {
        setMatchedTemplates(templates);
        setAllTemplates(templates);
    }, [templates]);

    const onRemoveRow = (index) => {
        symptomsData.splice(index, 1);
        setSymptomsData((prev) => [...prev]);
        setSelectedIndex(null);
        if (symptomsData?.length > 0) {
            dispatch(setIsDDxReadyToGenerate(true));
        } else if (examinationData?.length === 0) {
            dispatch(setIsDDxReadyToGenerate(false));
        }
    };

    // Handle Parent Drawer
    const handleDrawerParent = useCallback(() => {
        setParentDrawer(!parentDrawer);
        if (isSymptomsBox) {
            dispatch(setIsSymptomsBox(false));
        }
    }, [parentDrawer]);

    const onSelectParent = useCallback(
        (e) => {
            window.Moengage.track_event("symptom_select", {
                "value": e.symptom_name
            });
            symptomsData.push({
                ...e,
                since: "",
                severity: "",
                note: "",
            });
            setSymptomsData((prev) => [...prev]);
            setSelectedIndex(symptomsData.length - 1);
            handleDrawerParent()
        },
        [symptomsData, selectedIndex, parentDrawer]
    );

    // Handle Child Drawer
    const handleDrawerChild = useCallback((item) => {
        setChildDrawer(!childDrawer);
        setChildDrawerData(item)
        setSinceValue(item && item.since ? parseInt(item.since.split(" ")[0]) : 1)
    }, [childDrawer, childDrawerData, sinceValue]);

    // Handle Template Drawer
    const handleDrawerTemplate = useCallback(() => {
        setTemplateDrawer(!templateDrawer);
    }, [templateDrawer]);

    // Handle Save Drawer
    const handleDrawerSave = useCallback(() => {
        setInputTemplateName(null);
        setSaveDrawer(!saveDrawer);
    }, [saveDrawer]);

    const onTabChange = useCallback(
        (key) => {
            setInputTemplateName(null);
            setTabChange(key);
        },
        [tabChange]
    );

    const onSearch = (e) => {
        const searchQuery = e.target.value;
        if (searchQuery) {
            let filteredTemplates = templates.filter((template) => {
                return template.tst_template_name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());
            });
            setMatchedTemplates(filteredTemplates);
        } else {
            setMatchedTemplates(templates);
        }
    };

    const onTemplateSelected = async (template) => {
        window.Moengage.track_event("symptom_template_used", {
            "template_name": template.tst_template_name
        });
        const action = await dispatch(singleTemplateDetails(template.tst_id));
        if (action.meta.requestStatus === "fulfilled") {
            const updatedData = action?.payload;
            setSymptomsData([...symptomsData, ...updatedData]);
            handleDrawerTemplate();
        } else {
            errorMessage(action.error)
        }
    };

    const onDeleteTemplateClicked = async (tst_id) => {
        const action = await dispatch(deleteTemplate(tst_id));
        if (action.meta.requestStatus === "rejected") {
            errorMessage(action.error)
        }
    };

    const onChangeSaveTemplate = useCallback(
        (e) => {
            const updateQuery = removeBeforeWhiteSpace(e.target.value)
            setInputTemplateName(updateQuery);
        },
        [inputTemplateName]
    );

    const onAddTemplateClicked = async () => {
        if (symptomsData.length === 0) {
            errorMessage('At least 1 symptom added')
        } else if (symptomsData.filter(e => e.symptom_name == "").length > 0) {
            errorMessage('Please fillup symptom name')
        } else {
            var sendData = {
                tst_template_name: inputTemplateName,
                symptoms: symptomsData,
            };
            const action = await dispatch(addTemplate(sendData));
            if (action.meta.requestStatus === "fulfilled") {
                setInputTemplateName(null);
                handleDrawerSave();
            }
        }
    };

    const onSearchTemplate = useCallback(() => {
        setInputTemplateName(null);
    }, [inputTemplateName]);

    const onSelectTemplate = useCallback(
        (data, e) => {
            setInputTemplateName(e.key);
        },
        [inputTemplateName]
    );

    const onUpdateTemplateClicked = async () => {
        if (symptomsData.length === 0) {
            errorMessage('At least 1 symptom added')
        } else if (symptomsData.filter(e => e.symptom_name == "").length > 0) {
            errorMessage('Please fillup symptom name')
        } else {
            var data = JSON.parse(inputTemplateName);
            var sendData = {
                tst_id: data.tst_id,
                tst_template_name: data.tst_template_name,
                symptoms: symptomsData,
            };
            const action = await dispatch(updateTemplate(sendData));
            if (action.meta.requestStatus === "fulfilled") {
                setInputTemplateName(null);
                handleDrawerSave();
            }
        }
    };

    const showHideModal = useCallback((template_id) => {
        template_id !== undefined ? setRemoveTemplateId(template_id) : setRemoveTemplateId(null)
        setIsModalOpen(!isModalOpen);
    }, [isModalOpen]);

    //Template Remove
    const DELETE_MODAL = useMemo(() => {
        return (
            <CommonModal
                isModalOpen={isModalOpen}
                onCancel={showHideModal}
                modalWidth={500}
                title={"You may lose your data"}
                modalBody={
                    <>
                        <div className="alert-warning rounded-10px p-2 patient-details">
                            <div className="d-flex align-items-center">
                                <img className='me-3' src={alertIcon} alt="Warning" />
                                <span>
                                    Are you sure you want to delete this template?
                                </span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="d-flex align-items-center mt-2 justify-content-end">
                                <div onClick={() => {
                                    onDeleteTemplateClicked(removeTemplateId)
                                    showHideModal()
                                }}
                                    className="me-4 text-decoration-underline btn p-0 text-main">
                                    Yes Delete
                                </div>
                                <Button onClick={showHideModal} className="lh-lg btn btn-primary3 btn-41 px-4">
                                    <span>No</span>
                                </Button>
                            </div>
                        </div>
                    </>
                }
            />
        );
    }, [isModalOpen]);

    //Child Componet
    // const TABLE_SYMPTOMS = useMemo(() => {
    //     return (
    //         symptomsData.length > 0 &&
    //         symptomsData.map((item, index) => {
    //             return (
    //                 <div key={index} style={{ width: item.symptom_name.length > 12 && item.symptom_name.length < 24 ? `${item.symptom_name.length * 10.5}px` : item.symptom_name.length >= 24 ? '256px' : '150px' }} className={"d-flex align-items-center justify-content-between text-truncate closable-chips closable-chips-active"}>
    //                     <div className="text-truncate p-2" onClick={() => handleDrawerChild({ ...item, index: index })}>
    //                         <div className="text-truncate">{item.symptom_name}
    //                             {(item.since || item.severity || item.note) ? (
    //                                 <div className="text-truncate small">{`${item.since ? item.since + ' | ' : ''}${item.severity ? item.severity + ' | ' : ''}${item.note ? item.note : ''}`}</div>
    //                             ) : (
    //                                 <div className="text-truncate small">Add Details</div>
    //                             )}
    //                         </div>
    //                     </div>
    //                     <Button type="text" className="rounded-0 btn-close-chips" onClick={() => onRemoveRow(index)}>
    //                         <i className="icon-Cross"></i>
    //                     </Button>
    //                 </div>
    //             );
    //         })
    //     );
    // }, [symptomsData, childDrawerData]);

    const SortableItem = SortableElement(({ item }) => (
        <div
            style={{
                width: item.symptom_name.length > 12 && item.symptom_name.length < 24
                    ? `${item.symptom_name.length * 10.5}px`
                    : item.symptom_name.length >= 24
                        ? '256px'
                        : '150px'
            }}
            className={"d-flex align-items-center justify-content-between text-truncate closable-chips closable-chips-active"}
        >
            <div className="text-truncate p-2" onMouseEnter={() => handleDrawerChild(item)}>
                <div className="text-truncate">{item.symptom_name}
                    {(item.since || item.severity || item.note) ? (
                        <div className="text-truncate small">{`${item.since ? item.since + ' | ' : ''}${item.severity ? item.severity + ' | ' : ''}${item.note ? item.note : ''}`}</div>
                    ) : (
                        <div className="text-truncate small">Add Details</div>
                    )}
                </div>
            </div>
            <Button type="text" className="rounded-0 btn-close-chips" onMouseEnter={() => onRemoveRow(item.index)}>
                <i className="icon-Cross"></i>
            </Button>
        </div>
    ));

    const SortableList = SortableContainer(({ items }) => {
        return (
            <div className="d-flex flex-wrap">
                {items.map((item, index) => (
                    <SortableItem
                        key={`item-${index}`}
                        index={index}
                        item={{ ...item, index }}
                    />
                ))}
            </div>
        );
    });

    const TABLE_SYMPTOMS = useMemo(() => {
        return (
            symptomsData.length > 0 && (
                <SortableList
                    items={symptomsData}
                    onSortEnd={({ oldIndex, newIndex }) => {
                        const newSymptomsData = [...symptomsData];
                        const [movedItem] = newSymptomsData.splice(oldIndex, 1);
                        newSymptomsData.splice(newIndex, 0, movedItem);
                        setSymptomsData(newSymptomsData);
                    }}
                    axis="xy"
                    pressDelay={100}
                />
            )
        );
    }, [symptomsData, childDrawerData]);

    //Template Componet
    const TEMPLATE_CONTENT = useMemo(() => {
        return (
            <>
                <div>
                    <div className="medicine-templates">
                        <Input className="popinput" onChange={onSearch} placeholder="Search Templates" prefix={<i className='icon-search me-2'></i>} allowClear />
                    </div>
                    <div className="tab-template-height" >
                        {matchedTemplates.length > 0 &&
                            matchedTemplates.map((template, i) => {
                                return (
                                    <div className="align-items-center d-flex justify-content-between medicine-templates" key={i}>
                                        <div className="align-items-center d-flex text-truncate w-100" onClick={() => onTemplateSelected(template)}>
                                            <div className="round-box"><i className="icon-template"></i></div>
                                            <div className="text-truncate w-100">
                                                <div className="title text-main2">{template.tst_template_name}</div>
                                                <div className="text-truncate">
                                                    <span>{template.symptoms}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button className="btn btn-delete-prescription p-0 ms-3" onClick={() => showHideModal(template.tst_id)}>
                                            {template.loading ? (
                                                <Spin
                                                    indicator={
                                                        <LoadingOutlined style={{ fontSize: 22 }} spin />
                                                    }
                                                />
                                            ) : (
                                                <i className="icon-delete"></i>
                                            )}
                                        </Button>
                                    </div>
                                )
                            })}
                    </div>
                </div>
            </>
        );
    }, [templateDrawer, matchedTemplates]);

    //Save Componet
    const SAVE_CONTENT = useMemo(() => {
        return (
            <>
                <div className="d-flex justify-content-between align-items-center border-bottom templatepopover">
                    <Tabs
                        defaultActiveKey={TAB_ADD_TEMPLATE}
                        items={ADD_EDIT_TEMPLATE_TABS}
                        onChange={onTabChange}
                        className="w-100" />
                </div>
                {tabChange === TAB_ADD_TEMPLATE ? (
                    <div className="medicine-templates d-flex">
                        <Input
                            allowClear
                            value={inputTemplateName && inputTemplateName}
                            className="popinput inputheight41"
                            placeholder="Template Name"
                            onChange={onChangeSaveTemplate}
                        />
                        <Button
                            className="btn btn-primary3 btn-41 ms-3"
                            loading={loading}
                            disabled={inputTemplateName ? false : true}
                            onClick={onAddTemplateClicked}
                        >
                            {" Save "}
                        </Button>
                    </div>
                ) : (
                    <div className="medicine-templates d-flex">
                        <Select
                            showSearch
                            value={inputTemplateName && JSON.parse(inputTemplateName).tst_template_name}
                            className="autocomplete-custom w-100 popinput inputheight41"
                            placeholder="Select Template"
                            onSearch={onSearchTemplate}
                            onSelect={onSelectTemplate}
                            optionLabelProp="label"
                            options={allTemplates.map((template) => {
                                return {
                                    key: JSON.stringify(template),
                                    value: template.tst_template_name,
                                    label: (
                                        <div key={template.tst_id}>
                                            {template.tst_template_name}
                                        </div>
                                    ),
                                };
                            })}
                            optionRender={(option) => (
                                <div className="align-items-center d-flex text-truncate w-100">
                                    <div className="round-box"><i className="icon-template"></i></div>
                                    <div className="text-truncate w-100">
                                        <div className="title text-main2">{option.data.value}</div>
                                        <div className="text-truncate">
                                            <span>{JSON.parse(option.data.key).symptoms}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        />
                        <Button
                            className="btn btn-primary3 btn-41 ms-3"
                            loading={loading}
                            disabled={inputTemplateName ? false : true}
                            onClick={onUpdateTemplateClicked}
                        >
                            {" Update "}
                        </Button>
                    </div>
                )}
            </>
        );
    }, [tabChange, saveDrawer, inputTemplateName, loading, allTemplates]);

    useEffect(() => {
        if (sinceValue !== -1) {
            const options = SINCE_OPTIONS.map((option) => {
                return {
                    key: Math.random(),
                    value: `${sinceValue} ${sinceValue <= 1 ? option.value : `${option.value}(s)`}`,
                    label: <>{`${sinceValue}${option.label}`}</>,
                };
            });
            setSinceOptions(options);
        } else if (inputSince.length > 0) {
            const options = SINCE_OPTIONS.map((option) => {
                return {
                    key: Math.random(),
                    value: `${inputSince} ${inputSince <= 1 ? option.value : `${option.value}(s)`}`,
                    label: <>{`${inputSince}${option.label}`}</>,
                };
            });
            setSinceOptions(options);
        } else {
            const options = SINCE_OPTIONS.map((option) => {
                return {
                    key: Math.random(),
                    value: `${option.value}`,
                    label: <>{`${option.label}`}</>,
                };
            });
            setSinceOptions(options);
        }
    }, [sinceValue]);

    const onChangeInputSinceChild = useCallback(
        (e) => {
            const updateQuery = onlyNumberFormat(e.target.value);
            setInputSince(updateQuery);
            setChildDrawerData({ ...childDrawerData, since: '' })
            if (updateQuery.length > 0) {
                const options = SINCE_OPTIONS.map((option) => {
                    return {
                        key: Math.random(),
                        value: `${updateQuery} ${updateQuery <= 1 ? option.value : `${option.value}(s)`}`,
                        label: <>{`${updateQuery}${option.label}`}</>,
                    };
                });
                setSinceOptions(options);
            } else {
                const options = SINCE_OPTIONS.map((option) => {
                    return {
                        key: Math.random(),
                        value: `${option.value}`,
                        label: <>{`${option.label}`}</>,
                    };
                });
                setSinceOptions(options);
            }
        },
        [inputSince, sinceOptions, childDrawerData]
    );

    const SINCE_LIST = [
        { value: 1, label: 1 },
        { value: 2, label: 2 },
        { value: 3, label: 3 },
        { value: 4, label: 4 },
        { value: 5, label: 5 },
        { value: -1, label: <Input className="w-100 custom-segment-input inputheight45 border-0" placeholder="Custom" value={inputSince} inputMode="numeric" onChange={onChangeInputSinceChild} onClick={() => onChangeSegmentedSinceChild(-1)} /> }
    ];

    const SEVERITY_LIST = [
        { value: "Severe", label: "Severe" },
        { value: "Moderate", label: "Moderate" },
        { value: "Mild", label: "Mild" },
    ];

    const onChangeSegmentedSinceChild = useCallback(
        (key) => {
            setSinceValue(key)
            setChildDrawerData({ ...childDrawerData, since: '' })
        },
        [sinceValue, childDrawerData]
    );

    const onChangeSinceChild = useCallback(
        (key) => {
            if (hasNumber(key)) {
                if (key != childDrawerData.since) {
                    setChildDrawerData({ ...childDrawerData, since: key })
                } else {
                    setChildDrawerData({ ...childDrawerData, since: '' })
                }
            }
        },
        [childDrawerData]
    );

    const onChangeSeverityChild = useCallback(
        (key) => {
            if (key != childDrawerData.severity) {
                setChildDrawerData({ ...childDrawerData, severity: key })
            } else {
                setChildDrawerData({ ...childDrawerData, severity: '' })
            }
        },
        [childDrawerData]
    );
    const onChangeInputNoteChild = useCallback(
        (e) => {
            setChildDrawerData({ ...childDrawerData, note: e.target.value })
            // ?.replace(/,/g, '')
        },
        [childDrawerData]
    );

    const updateChild = (item) => {
        const { index, ...updatedReqData } = item;
        symptomsData[item.index] = { ...symptomsData[item.index], ...updatedReqData };
        setSymptomsData((prev) => [...prev]);
        handleDrawerChild();
        dispatch(setIsDDxReadyToGenerate(true));
    }

    //Child Componet
    const CHILD_DRAWER_DATA = useMemo(() => {
        return (
            childDrawerData && (
                <>
                    <Card bordered={false} className="search-modalCard">
                        <div className='modalCard-header align-items-center justify-content-between d-flex'>
                            <div className='align-items-center d-flex'>
                                <Button type="text" className='btn btn-delete-prescription px-3 focus-none h-100' onClick={handleDrawerChild}>
                                    <i className='icon-Cross fs-3'></i>
                                </Button>
                                <div className="modal-title text-truncate-twolines">{childDrawerData.symptom_name}</div>
                            </div>
                            <Button className='btn btn-primary3 btn-41 px-4 me-20' onClick={() => updateChild(childDrawerData)}>
                                Done
                            </Button>
                        </div>
                    </Card>
                    <div className="p-4">
                        <div>
                            <label className="title-common">
                                Since
                            </label>
                            <div className="segement-static d-flex">
                                {SINCE_LIST.map((item, i) => {
                                    return (
                                        <button key={i}
                                            type="button"
                                            className={`btn w-100 p-0 ${sinceValue > 5 ? item.value == -1 && 'btn-segement custom-input-selected' : sinceValue == item.value && 'btn-segement'}`}
                                            onClick={() => onChangeSegmentedSinceChild(item.value)}>
                                            {item.label}
                                        </button>
                                    )
                                })}
                            </div>
                            {/* <Segmented
                                value={sinceValue > 5 ? -1 : sinceValue}
                                className="search-segment"
                                options={SINCE_LIST}
                                onChange={onChangeSegmentedSinceChild}
                            /> */}
                        </div>
                        <div className="mt-3">
                            <div className="segement-static d-flex">
                                {sinceOptions.map((item, i) => {
                                    return (
                                        <button key={i}
                                            type="button"
                                            className={`btn w-100 ${childDrawerData.since !== undefined && childDrawerData.since == item.value && 'btn-segement'}`}
                                            onClick={() => onChangeSinceChild(item.value)}>
                                            {item.label}
                                        </button>
                                    )
                                })}
                            </div>
                            {/* <Segmented
                                value={childDrawerData.since !== undefined && childDrawerData.since}
                                className="search-segment"
                                options={sinceOptions}
                                onChange={onChangeSinceChild}
                            /> */}
                        </div>
                        <div className="mt-5">
                            <label className="title-common">
                                Severity
                            </label>
                            <div className="segement-static d-flex">
                                {SEVERITY_LIST.map((item, i) => {
                                    return (
                                        <button key={i}
                                            type="button"
                                            className={`btn w-100 ${childDrawerData.severity !== undefined && childDrawerData.severity == item.value && 'btn-segement'}`}
                                            onClick={() => onChangeSeverityChild(item.value)}>
                                            {item.label}
                                        </button>
                                    )
                                })}
                            </div>
                            {/* <Segmented
                                value={childDrawerData.severity !== undefined && childDrawerData.severity}
                                className="search-segment"
                                options={SEVERITY_LIST}
                                onChange={onChangeSeverityChild}
                            /> */}
                        </div>
                        <div className="mt-5">
                            <label className="title-common">
                                Add Details
                            </label>
                            <Input.TextArea value={childDrawerData.note !== undefined && childDrawerData.note} placeholder="Enter any specific details here" className="textareaPlaceholder" rows={3} onChange={onChangeInputNoteChild} />
                        </div>
                    </div>
                </>
            )
        );
    }, [childDrawer, childDrawerData, sinceValue, inputSince, sinceOptions]);

    const showHideClearData = useCallback(() => {
        setIsModalOpen1(!isModalOpen1);
    }, [isModalOpen1]);

    const onRemoveRows = () => {
        setSymptomsData([])
        showHideClearData()
    };

    //Remove All Rows
    const REMOVE_ALL_ROWS = useMemo(() => {
        return (
            <CommonModal
                isModalOpen={isModalOpen1}
                onCancel={showHideClearData}
                modalWidth={500}
                title={"You may lose your data"}
                modalBody={
                    <>
                        <div className="alert-warning rounded-10px p-2 patient-details">
                            <div className="d-flex align-items-center">
                                <img className='me-3' src={alertIcon} alt="Warning" />
                                <span>
                                    Are you sure you want to Clear Selected <b>Symptoms</b>?
                                </span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="d-flex align-items-center mt-2 justify-content-end">
                                <div onClick={onRemoveRows}
                                    className="me-4 text-decoration-underline btn p-0 text-main">
                                    <span>Yes, Clear</span>
                                </div>
                                <Button onClick={showHideClearData} className="lh-lg btn btn-primary3 btn-41 px-4">
                                    <span>No</span>
                                </Button>
                            </div>
                        </div>
                    </>
                }
            />
        );
    }, [isModalOpen1]);

    const TableShimmerLoader = () => {
      return (
        <div className="sc-shimmer-container-table p-14">
          {/* First row */}
          <div className="shimmer-row">
            <div className="shimmer-cell" />
            <div className="shimmer-cell" />
            <div className="shimmer-cell" />
            <div className="shimmer-cell" />
          </div>

          {/* Second row */}
          <div className="shimmer-row">
            <div className="shimmer-cell" />
            <div className="shimmer-cell" />
            <div className="shimmer-cell" />
            <div className="shimmer-cell" />
          </div>
        </div>
      );
    };

    return (
        <>
            <div>
                <div className="d-flex align-items-center justify-content-between p-14-pb0">
                    <div className="d-flex align-items-center">
                        <img className='me-2' src={Symptomsicon} alt="Symptoms" />
                        <div className="title-common">Symptoms</div>
                    </div>

                    <div className="d-flex align-items-center">
                        <button className='btn d-flex align-items-center btn-text' onClick={handleDrawerTemplate}> <i className="icon-template me-2"></i> <span>Templates</span></button>
                        <Tooltip placement="bottom" title={(symptomsData.length > 0) ? "" : "Please enter some Symptoms to save a template"}>
                            <button className='btn d-flex align-items-center btn-text' onClick={() => (symptomsData.length > 0) && handleDrawerSave()} > <i className="icon-save me-2"></i> <span>Save</span></button>
                        </Tooltip>
                        <button onClick={showHideClearData} className="btn btn-text clear-text d-flex align-items-center" disabled={symptomsData.length > 0 ? false : true}>
                            <i className="icon-eraser1 me-2"></i> <span>Clear</span>
                        </button>
                    </div>
                    <Drawer title="Symptoms Templates" placement="right" onClose={handleDrawerTemplate} open={templateDrawer} className="modalWidth-563" width="auto">
                        {TEMPLATE_CONTENT}
                    </Drawer>

                    <Drawer title="Save Template" placement="right" onClose={handleDrawerSave} open={saveDrawer} className="modalWidth-563" width="auto">
                        {SAVE_CONTENT}
                    </Drawer>
                </div>
                {showShimmer ? <TableShimmerLoader /> : (
                <>
                <div className="d-flex flex-wrap p-14-pb0">
                    {TABLE_SYMPTOMS}
                    <Drawer closeIcon={false} placement="right" onClose={handleDrawerChild} open={childDrawer} className="modalWidth-563" width="auto">
                        {CHILD_DRAWER_DATA}
                    </Drawer>
                </div>
                <div className="p-14 py-0">
                    <div className="inputheight38 border rounded-10px d-flex align-items-center" onClick={handleDrawerParent}>
                        <i className='icon-search mx-2'></i>
                        <span className="fontroboto backbar fw-normal">Search Symptoms</span>
                    </div>
                    {/* { ddxOptionsList?.length > 0 && <DifferentialDiagnosis handleDDxDrawer={handleDDxDrawer} ddxOptionsList={ddxOptionsList} onSelectParent={onSelectParent} isSymptoms={true} />} */}
                </div>
                <Drawer closeIcon={false} placement="right" onClose={handleDrawerParent} open={parentDrawer || isSymptomsBox} width={'100%'} className="searchdrawer-content">
                    {(parentDrawer || isSymptomsBox) && (<TabSymptomsSearch passIndex={selectedIndex} onClose={handleDrawerParent} />)}
                </Drawer>
                <div className="d-flex flex-wrap p-14-pb0 overflow-hidden" style={{ maxHeight: '114px' }}>
                    {parentOptionsList.length > 0 &&
                        parentOptionsList.filter(e => ![...symptomsData.map(e1 => e1.symptom_name)].includes(e.symptom_name)).map((item, i) => {
                            return (
                                <Button key={i} type="text" style={{ width: item.symptom_name.length > 26 && '250px' }} className={`${item.symptom_name.length > 26 && 'chips-custom-break'} btn btn-primary2 chips-custom mb-14 me-14`} onClick={() => onSelectParent({ ...item, unique_id: uuidv4() })}>{`${item.symptom_name}`}</Button>
                            )
                        })}
                </div>
                {DELETE_MODAL}
                {REMOVE_ALL_ROWS}
                </>)}
            </div>
        </>
    );
}

export default React.memo(TabSymptomsBox);
