import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { Button, Card, Row, Col, Form, Radio, AutoComplete, Checkbox, Input, Spin, Popover, Tabs, DatePicker } from 'antd';

import { isMobile } from 'react-device-detect';

import { LoadingOutlined } from "@ant-design/icons";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';

import CashManagerContext from '../context/CashManagerContext';
import { errorMessage, removeBeforeWhiteSpace, onlyNumberFormat, hasNumber, capitalizeAfterSentence, isNumeric } from "../utils/utils";

import moment from "moment";
import dayjs from "dayjs";

import {
    listSectionwithTag,
    addTag,
    searchTag
} from "../redux/medicalhistorySlice";
import { useLocation } from "react-router-dom";
import { getGynecDetails, postGynecDetails, updateGynecDetails } from "../api/services/ApiGynec";
import { PERSISTANT_STORAGE_KEY_AUTH_TOKEN } from "../utils/constants";
import { jwtDecode } from "jwt-decode";
import { CLOTS_LIST, CYCLE_KEY_LIST, FLOW_LIST, GYNEC_SECTION_ENABLE_LIST, PAIN_LIST, PAIN_OCCURANCE_LIST, REPRODUCTIVE_LIFE_STAGES_LIST, TYPES_REPRODUCTIVE_STAGES } from "../utils/gynec_constants";
import { useAccess } from "../pages/vaccination/useAccess";
import { getClinicName } from "../utils/utils";
import VideoModal from "../common/VideoModal";
import TextArea from "antd/es/input/TextArea";
import { ASSETS } from "../assets";
const {
  noRecordRound: noRecordFound,
  verticleUpDown,
  activeVerticleUpDown: ActiveverticleUpDown,
  inactiveVerticleUpDown: InActiveverticleUpDown,
  noHypertension: NoHypertension,
  tubeIcon: playIcons,
  tutorial2,
} = ASSETS.images;

const dateFormat = 'YYYY-MM-DD'
const showDateFormat = 'DD-MM-YYYY'

function MedicalHistoryBoxMobile(props) {

    const { handleDrawerMedicalHistory, handleCollapsed, onSave, initialActiveKey, hideMenstrualHistoryTab, overrideMedicalHistoryData, gynecOnly = false, initialGynecHistory } = props
    const { TabPane } = Tabs;
    const {
        searchList,
        defaultList,
        loading,
    } = useSelector((state) => state.medicalhistory);
    const { profile, userId } = useSelector((state) => state.doctors);
    const dispatch = useDispatch();

    const { isGynaecHistoryAccessable } = useAccess();

    const { medicalHistoryData, setMedicalHistoryData } = useContext(CashManagerContext);
    // const [ medicalHistoryData, setMedicalHistoryData] = useState([]);
    const [cloneMedicalHistoryData, setCloneMedicalHistoryData] = useState([])

    const MEDICAL_PROBLEM = {
        since: '',
        status: '',
        medication: '',
        note: ''
    }
    const FAMILY_HISTORY = {
        relationship: '',
        note: ''
    }
    const OTHERS = {
        since: '',
        status: '',
        note: ''
    }

    const SURGICAL_HISTORY = {
        since: '',
        status: '',
        note: '',
        dateType: 'year',
        date: ''
    }

    const videoLink = {
        link: "https://www.youtube.com/embed/Y91zuWBeao4",
        thumbnail: "https://i.ytimg.com/vi/o6ALwX9hPMM/hqdefault.jpg",
        tmv_description: "Gynec History",
        tmv_title: "Gynec History",
    };

    const [shouldShowVideo, setShowVideo] = useState(false);
    const [popOverVideo, setPopOverVideo] = useState(false);
    const [selectData, setSelectData] = useState(null);
    const [addEditData, setAddEditData] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchOptions, setSearchOptions] = useState([]);

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
    const [gynecEditState, setGynecEditState] = useState("CREATE");
    const [sectionState, setSectionState] = useState({ ...GYNEC_SECTION_ENABLE_LIST });

    const [inputCycles, setInputCycles] = useState(null);
    const [inputMenarche, setInputMenarche] = useState(null);
    const [inputMenopause, setInputMenopause] = useState(null);
    const [inputCyclesDays, setInputCyclesDays] = useState(null);
    const [inputPadsNum, setInputPadsNum] = useState(null);
    const { state } = useLocation();
    const { patient_data, caseManagerData } = state ;
    const [gynecLoading, setGynecLoading] = useState(false);
    const [gynecHistory, setGynecHistory] = useState({});
    const [expandRemarks,setExpandRemarks] = useState(true);
    const [remarks,setRemarks] = useState(medicalHistoryData?.[0]?.medical_history_remarks || "");
    const [surgicalDateType, setSurgicalDateType] = useState('year');
    const [surgicalDate, setSurgicalDate] = useState(null);

    const datePickerRef = useRef(null);
    // Function to handle custom input changes
    const onChangeCustomInput = (type) => (e) => {
        const value = onlyNumberFormat(e.target.value);;
        if (type === "Cycle") {
            setInputCycles(value);
            handleGynecValueChange("intervalOfCycle", value);
        }
        if (type === "Menarche") {
            setInputMenarche(value);
            handleGynecValueChange("ageAtMenarche", value);
        }
        if (type === "Menopause") {
            setInputMenopause(value);
            handleGynecValueChange("ageAtMenopause", value);
        }
        if (type === "cyclesDays") {
            setInputCyclesDays(value);
            handleGynecValueChange("durationOfMenstrualFlow", value);
        }
        if (type === "padsNum") {
            setInputPadsNum(value);
            handleGynecValueChange("numberOfPadsPerDay", value);
        }
    };

    // Common function to handle segment click changes
    const onChangeSegmentedChild = (type, value, setInputFunction) => {
        if (value === 'custom') {
            setInputFunction(''); // Reset custom input value when clicked
        } else {
            handleGynecValueChange(type, value); // Handle predefined segment value
        }
    };

    // handles for specific case
    const onChangeSegmentedCyclesChild = (value) => onChangeSegmentedChild("intervalOfCycle", value, setInputCycles);
    const onChangeSegmentedMenarcheChild = (value) => onChangeSegmentedChild("ageAtMenarche", value, setInputMenarche);
    const onChangeSegmentedMenopauseChild = (value) => onChangeSegmentedChild("ageAtMenopause", value, setInputMenopause);
    const onChangeSegmentedCyclesDaysChild = (value) => onChangeSegmentedChild("durationOfMenstrualFlow", value, setInputCyclesDays);
    const onChangeSegmentedPadNumChild = (value) => onChangeSegmentedChild("numberOfPadsPerDay", value, setInputPadsNum);

    const SINCE_OPTIONS_WEB = [
        { value: "Hour", label: "Hour" },
        { value: "Day", label: "Day" },
        { value: "Week", label: "Week" },
        { value: "Month", label: "Month" },
        { value: "Year", label: "Year" },
    ];
    const SURGICAL_DATE_TYPE_OPTIONS = [
        { value: "year", label: "Year Only" },
        { value: "full", label: "Full Date" },
    ];

    const STATUS_LIST = [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
    ];
    const MEDICATION_LIST = [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
    ];

    const customCyclesValue = gynecHistory?.intervalOfCycle > 32 ? gynecHistory.intervalOfCycle : inputCycles;
    const CYCLES_LIST = Array.from({ length: 11 }, (_, i) => ({
        value: 22 + i,
        label: (22 + i).toString()
    })).concat({
        value: -1,
        label: (
            <Input
                className="w-100 custom-segment-input-gynec inputheight45 border-0"
                placeholder="Custom"
                value={customCyclesValue}
                inputMode="numeric"
                onChange={onChangeCustomInput("Cycle")}
                onClick={() => onChangeSegmentedCyclesChild(-1)}
            />
        )
    })

    const customMenarcheValue = gynecHistory?.ageAtMenarche > 17 ? gynecHistory.ageAtMenarche : inputMenarche;
    const MENARCHE_LIST = Array?.from({ length: 11 }, (_, i) => ({
        value: 7 + i,
        label: (7 + i).toString()
    })).concat({
        value: 'custom',
        label: (
            <Input
                className="w-100 custom-segment-input-gynec inputheight45 border-0"
                placeholder="Custom"
                value={customMenarcheValue}
                inputMode="numeric"
                onChange={onChangeCustomInput("Menarche")}
                onClick={() => onChangeSegmentedMenarcheChild('custom')}
            />
        )
    });

    const customMenoPause = (gynecHistory?.ageAtMenopause > 49 || gynecHistory?.ageAtMenopause < 45) ? gynecHistory.ageAtMenopause : inputMenopause;
    const MENOPAUSE_LIST = Array.from({ length: 5 }, (_, i) => ({
        value: 45 + i,
        label: (45 + i).toString()
    })).concat({
        value: 'custom',
        label: (
            <Input
                className="w-100 custom-segment-input-gynec inputheight45 border-0"
                placeholder="Custom"
                value={customMenoPause}
                inputMode="numeric"
                onChange={onChangeCustomInput("Menopause")}
                onClick={() => onChangeSegmentedMenopauseChild('custom')}
            />
        )
    });

    const customCyclesDaysValue = gynecHistory?.durationOfMenstrualFlow > 5 ? gynecHistory.durationOfMenstrualFlow : inputCyclesDays;
    const DURATION_OF_CYCLE_LIST = Array.from({ length: 5 }, (_, i) => ({
        value: 1 + i,
        label: (1 + i).toString()
    })).concat({
        value: 'custom',
        label: (
            <Input
                className="w-100 custom-segment-input-gynec inputheight45 border-0"
                placeholder="Custom"
                value={customCyclesDaysValue}
                inputMode="numeric"
                onChange={onChangeCustomInput("cyclesDays")}
                onClick={() => onChangeSegmentedCyclesDaysChild('custom')}
            />
        )
    });

    const customPadNumValue = gynecHistory?.numberOfPadsPerDay > 5 ? gynecHistory.numberOfPadsPerDay : inputPadsNum;
    const PAD_NUM_LIST = Array.from({ length: 5 }, (_, i) => ({
        value: 1 + i,
        label: (1 + i).toString()
    })).concat({
        value: 'custom',
        label: (
            <Input
                className="w-100 custom-segment-input-gynec inputheight45 border-0"
                placeholder="Custom"
                value={customPadNumValue}
                inputMode="numeric"
                onChange={onChangeCustomInput("padsNum")}
                onClick={() => onChangeSegmentedPadNumChild('custom')}
            />
        )
    });

    const [popOver, setPopOver] = useState(false);
    const RELATIONSHIP_LIST = ['Father', 'Mother', 'Maternity Grandfather', 'Maternity Grandmother', 'Paternity Grandfather', 'Paternity Grandmother', 'Uncle', 'Aunty', 'Sibling', 'Relatives'];
    const [selectedRelationship, setSelectedRelationship] = useState([]);
    const [activeTab, setActiveTab] = useState('gynec');
    const [tokenData, setTokenData] = useState(null);

    const onTabChange = (key) => {
        setActiveTab(key);
    };

    useEffect(() => {
        dispatch(listSectionwithTag());
    }, [dispatch]);

    useEffect(() => {
        const token = localStorage.getItem(PERSISTANT_STORAGE_KEY_AUTH_TOKEN);
        try {
            var decoded = jwtDecode(token);
            setTokenData(decoded.result)
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
      if (defaultList?.length > 0) {
        try {
            const data1 = defaultList ? JSON.parse(JSON.stringify(defaultList)) : [];
            const isPrescriptionOnly = overrideMedicalHistoryData != null;
            let data2;
            if (isPrescriptionOnly) {
                // Merge context (patient's history) with override (prescription) so sidebar shows all chips
                const ctx = medicalHistoryData ? JSON.parse(JSON.stringify(medicalHistoryData)) : [];
                const ovr = overrideMedicalHistoryData ? JSON.parse(JSON.stringify(overrideMedicalHistoryData)) : [];
                const combinedBySection = (a, b) => {
                    const byId = (arr) => (arr || []).reduce((acc, s) => ({ ...acc, [s.tmmhs_id]: s }), {});
                    const aMap = byId(a);
                    const bMap = byId(b);
                    const ids = new Set([...Object.keys(aMap), ...Object.keys(bMap)]);
                    return Array.from(ids, (id) => {
                        const sa = aMap[id];
                        const sb = bMap[id];
                        if (!sa) return sb;
                        if (!sb) return sa;
                        const existingIds = new Set((sa.tags || []).map((t) => t.tmmhst_id));
                        const newTags = (sb.tags || []).filter((t) => !existingIds.has(t.tmmhst_id));
                        return { ...sa, ...sb, tags: [...(sa.tags || []), ...newTags] };
                    });
                };
                data2 = combinedBySection(ctx, ovr);
            } else {
                const sourceData = medicalHistoryData;
                data2 = sourceData ? JSON.parse(JSON.stringify(sourceData)) : [];
            }
            const mergedArray = data1?.map(e => {
                const sectionFromSource = data2?.find(x => x?.tmmhs_id === e?.tmmhs_id);
                if (isPrescriptionOnly) {
                    // Voice/ambient/snap/smart: same as consult – merge defaultList section with prescription so all chips show
                    if (!sectionFromSource || !data2?.length) {
                        return { ...e, ...(sectionFromSource || {}), tags: e?.tags ?? [] };
                    }
                    return {
                        ...e,
                        ...(sectionFromSource || {}),
                        tags: [
                            ...(e?.tags || [])?.map(tag => ({
                                ...tag,
                                ...(sectionFromSource?.tags?.find(x1 => x1?.tmmhst_id === tag?.tmmhst_id) || {})
                            })),
                            ...(sectionFromSource?.tags || [])?.filter(item2 =>
                                !(e?.tags || [])?.find(item1 => item1?.tmmhst_id === item2?.tmmhst_id)
                            )
                        ],
                    };
                }
                // Consult: merge defaultList with context (prod behavior)
                if (!data2?.length) {
                    return e;
                }
                return {
                    ...e,
                    ...(sectionFromSource || {}),
                    tags: [
                        ...(e?.tags || [])?.map(tag => ({
                            ...tag,
                            ...(sectionFromSource?.tags?.find(x1 => x1?.tmmhst_id === tag?.tmmhst_id) || {})
                        })),
                        ...(sectionFromSource?.tags || [])?.filter(item2 =>
                            !(e?.tags || [])?.find(item1 => item1?.tmmhst_id === item2?.tmmhst_id)
                        )
                    ],
                };
            }) ?? data1;
            setCloneMedicalHistoryData(mergedArray ? JSON.parse(JSON.stringify(mergedArray)) : []);
        } catch (error) {
            console.error("Error merging medical history data:", error);
            setCloneMedicalHistoryData([]);
        }
      }
    // defaultList always; overrideMedicalHistoryData for voice/snap/smart; medicalHistoryData for voice merge and consult.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultList, overrideMedicalHistoryData, medicalHistoryData]);

    const onNoKnownHistoryChange = useCallback((e, i) => {
        cloneMedicalHistoryData[i].no_know_history = e.target.checked
        setCloneMedicalHistoryData((prev) => [...prev]);
    }, [cloneMedicalHistoryData]);

    const onExpandCollapseClick = useCallback((i) => {
        cloneMedicalHistoryData[i].isExpand = !cloneMedicalHistoryData[i].isExpand
        setCloneMedicalHistoryData((prev) => [...prev]);
    }, [cloneMedicalHistoryData]);

    const onTagClick = useCallback((tmmhs_id, tmmhst_id, i, i1) => {
        setAddEditData(null)
        setSelectData({
            tmmhs_id: tmmhs_id,
            tmmhst_id: tmmhst_id,
            section_index: i,
            tag_index: i1
        });
        let initial = {}
        if (tmmhs_id === 2) {
            initial = { ...MEDICAL_PROBLEM }
        } else if (tmmhs_id === 3) {
            initial = { ...FAMILY_HISTORY }
        } else if (tmmhs_id === 5) {
            initial = { ...SURGICAL_HISTORY }
        } else {
            initial = { ...OTHERS }
        }
        if (cloneMedicalHistoryData[i].tags[i1].enable === undefined || cloneMedicalHistoryData[i].tags[i1].enable === "-") {
            setCloneMedicalHistoryData((prev) => {
                const newArray = [...prev];
                newArray[i].tags[i1] = {
                    ...newArray[i].tags[i1],
                    ...initial,
                    enable: "Y"
                };
                return newArray;
            })
        }
        if (tmmhs_id === 5) {
            try {
                const dateType = cloneMedicalHistoryData[i].tags[i1].dateType;
                const dateValue = cloneMedicalHistoryData[i].tags[i1].date;
                if (dateType && dateValue) {
                    if (dateType === 'onlyYear') {
                        setSurgicalDateType('year');
                        setSurgicalDate(dateValue);
                    } else if (dateType === 'fullDate') {
                        setSurgicalDateType('full');
                        try {
                            const parsedDate = dayjs(dateValue, 'DD-MM-YYYY');
                            if (parsedDate.isValid()) {
                                setSurgicalDate(parsedDate);
                            } else {
                                setSurgicalDate(null);
                            }
                        } catch (error) {
                            console.error('Error parsing surgical date:', error);
                            setSurgicalDate(null);
                        }
                    }
                } else {
                    const sinceValue = cloneMedicalHistoryData[i].tags[i1].since;
                    if (sinceValue) {
                        if (/^\d{4}$/.test(sinceValue)) {
                            setSurgicalDateType('year');
                            setSurgicalDate(sinceValue);
                        } else {
                            setSurgicalDateType('full');
                            try {
                                const parsedDate = dayjs(sinceValue, 'DD-MM-YYYY');
                                if (parsedDate.isValid()) {
                                    setSurgicalDate(parsedDate);
                                } else {
                                    setSurgicalDate(null);
                                }
                            } catch (error) {
                                console.error('Error parsing surgical date:', error);
                                setSurgicalDate(null);
                            }
                        }
                    } else {
                        setSurgicalDateType('year');
                        setSurgicalDate(null);
                    }
                }
            } catch (error) {
                console.error('Error initializing surgical history:', error);
                setSurgicalDateType('year');
                setSurgicalDate(null);
            }
        } else {
            setSinceValue(cloneMedicalHistoryData[i].tags[i1].since ? parseInt(cloneMedicalHistoryData[i].tags[i1].since.split(" ")[0]) : 1)
            setSelectedRelationship(cloneMedicalHistoryData[i].tags[i1].relationship ? cloneMedicalHistoryData[i].tags[i1].relationship.split(', ') : [])
        }
    }, [addEditData, selectData, cloneMedicalHistoryData]);

    const onEnableClick = useCallback((tmmhs_id, tmmhst_id, i, i1) => {
        setAddEditData(null)
        setSelectData({
            tmmhs_id: tmmhs_id,
            tmmhst_id: tmmhst_id,
            section_index: i,
            tag_index: i1
        });
        let initial = {}
        if (tmmhs_id === 2) {
            initial = { ...MEDICAL_PROBLEM }
        } else if (tmmhs_id === 3) {
            initial = { ...FAMILY_HISTORY }
        } else if (tmmhs_id === 5) {
            initial = { ...SURGICAL_HISTORY }
        } else {
            initial = { ...OTHERS }
        }
        setCloneMedicalHistoryData((prev) => {
            const newArray = [...prev];
            newArray[i].tags[i1] = {
                ...newArray[i].tags[i1],
                ...initial,
                enable: newArray[i].tags[i1].enable !== undefined ?
                    newArray[i].tags[i1].enable === "Y" ? "N"
                        : newArray[i].tags[i1].enable === "N" ? "-" : "Y"
                    : "Y"
            };
            return newArray;
        })
        if (tmmhs_id === 5) {
            try {
                const dateType = cloneMedicalHistoryData[i].tags[i1].dateType;
                const dateValue = cloneMedicalHistoryData[i].tags[i1].date;
                if (dateType && dateValue) {
                    if (dateType === 'onlyYear') {
                        setSurgicalDateType('year');
                        setSurgicalDate(dateValue);
                    } else if (dateType === 'fullDate') {
                        setSurgicalDateType('full');
                        try {
                            const parsedDate = dayjs(dateValue, 'DD-MM-YYYY');
                            if (parsedDate.isValid()) {
                                setSurgicalDate(parsedDate);
                            } else {
                                setSurgicalDate(null);
                            }
                        } catch (error) {
                            console.error('Error parsing surgical date:', error);
                            setSurgicalDate(null);
                        }
                    }
                } else {
                    const sinceValue = cloneMedicalHistoryData[i].tags[i1].since;
                    if (sinceValue) {
                        if (/^\d{4}$/.test(sinceValue)) {
                            setSurgicalDateType('year');
                            setSurgicalDate(sinceValue);
                        } else {
                            setSurgicalDateType('full');
                            try {
                                const parsedDate = dayjs(sinceValue, 'DD-MM-YYYY');
                                if (parsedDate.isValid()) {
                                    setSurgicalDate(parsedDate);
                                } else {
                                    setSurgicalDate(null);
                                }
                            } catch (error) {
                                console.error('Error parsing surgical date:', error);
                                setSurgicalDate(null);
                            }
                        }
                    } else {
                        setSurgicalDateType('year');
                        setSurgicalDate(null);
                    }
                }
            } catch (error) {
                console.error('Error initializing surgical history:', error);
                setSurgicalDateType('year');
                setSurgicalDate(null);
            }
        } else {
            setSinceValue(cloneMedicalHistoryData[i].tags[i1].since ? parseInt(cloneMedicalHistoryData[i].tags[i1].since.split(" ")[0]) : 1)
            setSelectedRelationship(cloneMedicalHistoryData[i].tags[i1].relationship ? cloneMedicalHistoryData[i].tags[i1].relationship.split(', ') : [])
        }
    }, [addEditData, selectData, cloneMedicalHistoryData]);

    const onAddEditClick = useCallback((e) => {
        let modifyData = JSON.parse(JSON.stringify(e))
        modifyData.tags.map((e) => {
            e.unique_id = uuidv4()
            return e
        })
        setAddEditData(modifyData)
    }, [addEditData]);

    useEffect(() => {
        if (searchQuery) {
            const timeOutId = setTimeout(() => {
                dispatch(searchTag({ section_id: addEditData?.tmmhs_id, keyword: searchQuery }));
            }, 500);
            return () => {
                clearTimeout(timeOutId);
            };
        }
    }, [searchQuery]);

    useEffect(() => {
        const data = [];
        searchList.map((e) => {
            return data.push({
                key: JSON.stringify({ ...e, unique_id: uuidv4() }),
                value: e.title
            });
        });
        if (searchQuery.length > 0) {
            searchQuery &&
                data.push({
                    key: JSON.stringify({
                        unique_id: uuidv4(),
                        tmmhst_id: 0,
                        pms_default: 1,
                        title: searchQuery
                    }),
                    value: searchQuery
                });
        }
        setSearchOptions(data);
    }, [searchList]);

    const onSearch = useCallback((e) => {
        setSearchQuery(removeBeforeWhiteSpace(e.target.value));
    }, [searchQuery]);

    const onSelectParent = useCallback((e) => {
        addEditData.tags.push({
            ...e
        });
        setAddEditData((prev) => {
            return { ...prev };
        })
        setSearchQuery("")
    }, [addEditData]);

    const onRemoveTag = useCallback((e, i) => {
        if (e.tmmhst_id == 0) {
            addEditData.tags.splice(i, 1);
        } else {
            e.delete = true
        }
        setAddEditData((prev) => {
            return { ...prev };
        })
    }, [addEditData]);

    const onSurgicalDateTypeChange = useCallback((value) => {
        setSurgicalDateType(value);
        setSurgicalDate(null);
    }, []);
    const onSurgicalDateChange = useCallback((date) => {
        setSurgicalDate(date);
    }, []);
    const onSurgicalYearChange = useCallback((value) => {
        setSurgicalDate(value);
    }, []);

    const onAddEditSaveClick = async () => {
        const sendData = JSON.parse(JSON.stringify(addEditData));
        const action = await dispatch(addTag(sendData));
        if (action.meta.requestStatus === "fulfilled") {
            setAddEditData(null)
            if (action.payload.tags.length > 0) {
                const updatedData = action.payload?.tags?.map((e) => {
                    const data = sendData?.tags?.find(e1 => e1.unique_id == e.unique_id)
                    return { ...data, ...e };
                });
                const index = cloneMedicalHistoryData?.findIndex(e => e.tmmhs_id == sendData.tmmhs_id)
                setCloneMedicalHistoryData((prev) => {
                    const newArray = [...prev];
                    newArray[index].tags = [
                        ...updatedData.map(({ unique_id, ...rest }) => rest),
                    ];
                    return newArray;
                })
            } else {
                const index = cloneMedicalHistoryData?.findIndex(e => e.tmmhs_id == sendData.tmmhs_id)
                setCloneMedicalHistoryData((prev) => {
                    const newArray = [...prev];
                    newArray[index].tags = [];
                    return newArray;
                })
            }
        } else {
            errorMessage(action.error)
        }
    }

    // Since Tab
    useEffect(() => {
        if (isMobile) {
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
        }
    }, [sinceValue]);

    const onChangeInputSinceChild = useCallback(
        (e) => {
            const updateQuery = onlyNumberFormat(e.target.value);
            setInputSince(updateQuery);
            cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].since = ''
            setCloneMedicalHistoryData((prev) => [...prev]);
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
        [selectData, inputSince, sinceOptions, cloneMedicalHistoryData]
    );

    const SINCE_LIST = [
        { value: 1, label: 1 },
        { value: 2, label: 2 },
        { value: 3, label: 3 },
        { value: 4, label: 4 },
        { value: 5, label: 5 },
        { value: -1, label: <Input className="w-100 custom-segment-input inputheight45 border-0" placeholder="Custom" value={inputSince} inputMode="numeric" onChange={onChangeInputSinceChild} onClick={() => onChangeSegmentedSinceChild(-1)} /> }
    ];

    const onChangeSegmentedSinceChild = useCallback(
        (key) => {
            setSinceValue(key)
            cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].since = ''
            setCloneMedicalHistoryData((prev) => [...prev]);
        },
        [selectData, sinceValue, cloneMedicalHistoryData]
    );

    const onChangeSinceChild = useCallback(
        (key) => {
            if (hasNumber(key)) {
                if (key != cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.since) {
                    cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].since = key
                } else {
                    cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].since = ''
                }
                setCloneMedicalHistoryData((prev) => [...prev]);
            }
        },
        [selectData, cloneMedicalHistoryData]
    );

    // Since Web
    const onSearchSinceChid = useCallback(
        (query) => {
            const updateQuery = onlyNumberFormat(query);
            cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].since = updateQuery
            setCloneMedicalHistoryData((prev) => [...prev]);
            if (updateQuery) {
                const options = SINCE_OPTIONS_WEB.map((option) => {
                    return {
                        key: Math.random(),
                        value: `${updateQuery} ${updateQuery <= 1 ? option.value : `${option.value}(s)`}`,
                        label: <>{`${updateQuery} ${updateQuery <= 1 ? option.label : `${option.label}(s)`}`}</>,
                    };
                });
                setSinceOptions(options);
            } else {
                setSinceOptions([]);
            }
        },
        [selectData, sinceOptions, cloneMedicalHistoryData]
    );

    const onBlurSinceChid = useCallback(
        () => {
            if (isNumeric(cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].since)) {
                cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].since = `${cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].since} ${parseInt(cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].since) <= 1 ? 'Day' : 'Day(s)'}`;
                setCloneMedicalHistoryData((prev) => [...prev]);
            }
        },
        [selectData, cloneMedicalHistoryData]
    );

    const onSelectSinceChild = useCallback(
        (data) => {
            setSinceOptions([]);
            cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].since = data;
            setCloneMedicalHistoryData((prev) => [...prev]);
        },
        [selectData, sinceOptions, cloneMedicalHistoryData]
    );

    const onChangeStatus = useCallback((key) => {
        if (key != cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.status) {
            cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].status = key
        } else {
            cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].status = ''
        }
        setCloneMedicalHistoryData((prev) => [...prev]);
    }, [selectData, cloneMedicalHistoryData]);

    const onChangeMedication = useCallback((key) => {
        if (key != cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.medication) {
            cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].medication = key
        } else {
            cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].medication = ''
        }
        setCloneMedicalHistoryData((prev) => [...prev]);
    }, [selectData, cloneMedicalHistoryData]);

    const onChangeInputNote = useCallback((e) => {
        cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].note = capitalizeAfterSentence(e.target.value)
        setCloneMedicalHistoryData((prev) => [...prev]);
    }, [selectData, cloneMedicalHistoryData]);

    const showHidePopover = useCallback(() => {
        setPopOver(!popOver);
    }, [popOver]);

    const onCheckboxClick = (e) => {
        const index = selectedRelationship.indexOf(e);
        if (index !== -1) {
            selectedRelationship.splice(index, 1);
        } else {
            selectedRelationship.push(e)
        }
        setSelectedRelationship((prev) => [...prev])
    }

    const onChangeRelationship = () => {
        cloneMedicalHistoryData[selectData?.section_index].tags[selectData?.tag_index].relationship = selectedRelationship.join(', ')
        setCloneMedicalHistoryData((prev) => [...prev]);
    }

    const RELATIONSHIP_CONTENT = useCallback(() => {
        return (
            <div className="pop-body pop-h-none">
                {RELATIONSHIP_LIST.map((e, i) => {
                    return (
                        <div className="px-3 py-2" key={i}>
                            <Checkbox className="advice-check" checked={selectedRelationship.includes(e)} onClick={() => onCheckboxClick(e)}>{e}</Checkbox>
                        </div>
                    )
                })}
                <div className="d-flex justify-content-end align-items-center my-2 pt-2 border-top">
                    <Button className='btn mx-3 p-0 shadow-none border-0' onClick={showHidePopover}>
                        Cancel
                    </Button>
                    <Button className='btn mx-3 p-0 btn-save' onClick={() => {
                        showHidePopover()
                        onChangeRelationship()
                    }}>
                        Save
                    </Button>
                </div>
            </div>
        );
    }, [popOver, selectedRelationship]);

    const onSaveClicked = async () => {
        const clinic_name = getClinicName(profile?.hospital_data);
        window.Moengage.track_event("TP_Medical_history_updated", {
            clinic_name,
            "patient_number": patient_data?.pm_contact_no,
            "patient_id": patient_data?.patient_unique_id
        });
        handleSave();
        if (selectData && selectData.tmmhs_id === 5) {
            const sectionIndex = selectData.section_index;
            const tagIndex = selectData.tag_index;
            if (cloneMedicalHistoryData[sectionIndex] && cloneMedicalHistoryData[sectionIndex].tags[tagIndex]) {
                cloneMedicalHistoryData[sectionIndex].tags[tagIndex].dateType = surgicalDateType === 'year' ? 'onlyYear' : 'fullDate';
                if (surgicalDateType === 'year' && surgicalDate) {
                    cloneMedicalHistoryData[sectionIndex].tags[tagIndex].date = surgicalDate.toString();
                } else if (surgicalDateType === 'full' && surgicalDate) {
                    cloneMedicalHistoryData[sectionIndex].tags[tagIndex].date = dayjs(surgicalDate).format('DD-MM-YYYY');
                } else {
                    cloneMedicalHistoryData[sectionIndex].tags[tagIndex].date = '';
                }
                cloneMedicalHistoryData[sectionIndex].tags[tagIndex].since = '';
            }
        }
        
        const medicalHistory = cloneMedicalHistoryData?.map((e, i) => {
            return {
                title: e?.title,
                tmmhs_id: e?.tmmhs_id,
                no_know_history: e?.no_know_history !== undefined ? e?.no_know_history : false,
                tags: !e?.no_know_history ? e?.tags?.filter(x => x.enable == 'Y' || x.enable == 'N') : [],
                ...remarks && i === 0 && {medical_history_remarks: remarks?.trim()}
            }
        })
        if (!remarks && medicalHistory.filter(e => !e?.no_know_history && e?.tags?.length === 0).length === medicalHistory.length) {
            if (typeof setMedicalHistoryData === 'function') setMedicalHistoryData([]);
            handleDrawerMedicalHistory()
        } else {
            if (typeof setMedicalHistoryData === 'function') setMedicalHistoryData(JSON.parse(JSON.stringify(medicalHistory)));
            handleCollapsed(2)
        }
    }

    const handleSelectionChange = (key, value) => {
        setActiveMenstrualData(key)
        if (key === "pain" && value === "None") {
            setGynecHistory(prevState => ({ ...prevState, ["occurrenceOfPain"]: null }));
        }

        setGynecHistory(prevState => {
            if (!prevState) {
                return { [key]: value }; // Handle case when prevState is null or undefined
            }

            setPrevActiveMentrualData(activeMenstrualData)
            if (prevState[key] === value && activeMenstrualData === key) {
                setActiveMenstrualData("");

                switch (activeMenstrualData) {
                    case 'cycle':
                        setRightPanelTitle('Cycle');
                        break;
                    case 'flow':
                        setRightPanelTitle('Flow');
                        break;
                    case 'pain':
                        setRightPanelTitle('Pain');
                        break;
                    case 'ageAtMenarche':
                        setRightPanelTitle('Age at menarche');
                        break;
                    case 'reproductiveLifeStages':
                        setRightPanelTitle("Lifecycle Hormonal Changes");
                        break;
                    case 'notes':
                        setRightPanelTitle('Enter the notes');
                        break;
                    default:
                        setRightPanelTitle('Please select data from left pan');
                        break;
                }

                const updatedState = { ...prevState, [key]: null };

                // Check for specific keys and set corresponding fields to null
                if (key === "cycle") {
                    updatedState.intervalOfCycle = null;
                    setInputCycles('')
                    updatedState.cycleNotes = null;
                }
                if (key === "flow") {
                    updatedState.durationOfMenstrualFlow = null;
                    setInputCyclesDays('')
                    updatedState.clots = null;
                    updatedState.numberOfPadsPerDay = null;
                    setInputPadsNum('')
                    updatedState.flowNotes = null;
                }
                if (key === "pain") {
                    updatedState.occurrenceOfPain = null;
                    updatedState.painNotes = null;
                }
                if (key === "reproductiveLifeStages") {
                    updatedState.ageAtMenopause = null;
                    setInputMenopause('')
                    updatedState.typeOfMenopause = null;
                    updatedState.reproductiveNotes = null;
                }
                if (key === "ageAtMenarche") {
                    updatedState.ageAtMenarche = null;
                    updatedState.menarcheNotes = null
                    setInputMenarche('')
                }

                return updatedState;
            } else {
                setActiveMenstrualData(key);
                switch (key) {
                    case 'cycle':
                        setRightPanelTitle('Cycle');
                        break;
                    case 'flow':
                        setRightPanelTitle('Flow');
                        break;
                    case 'pain':
                        setRightPanelTitle('Pain');
                        break;
                    case 'ageAtMenarche':
                        setRightPanelTitle('Age at menarche');
                        break;
                    case 'reproductiveLifeStages':
                        setRightPanelTitle("Lifecycle Hormonal Changes");
                        break;
                    case 'notes':
                        setRightPanelTitle('Enter the notes');
                        break;
                    default:
                        setRightPanelTitle('No Data');
                        break;
                }
                return {
                    ...prevState,
                    [key]: value
                };
            }
        });
    };

    const handleGynecValueChange = (key, value) => {
        setGynecHistory(prevState => {
            if (!prevState) {
                return { [key]: value };
            }
            if (prevState[key] !== value) {
                return { ...prevState, [key]: value };
            } else {
                return { ...prevState, [key]: '' };
            }
        });
    };

    const [activeMenstrualData, setActiveMenstrualData] = useState(null);
    const [prevActiveMentrualData, setPrevActiveMentrualData] = useState("cycle");
    const [rightPanelTitle, setRightPanelTitle] = useState("No Record");

    const disabledDate = (current) => {
        // Disable dates after today
        return current && current > moment().endOf('day');
    };

    const formatDate = (dateString) => {
        return dateString ? moment(dateString, showDateFormat).format(dateFormat) : '';
    };

    const onDateChanged = (date, dateString) => {
        handleGynecValueChange("lmp", formatDate(dateString))
        setSelectedDate(formatDate(dateString))
    };

    const handleNoteChange = (key, value) => {
        setGynecHistory(prevState => ({ ...prevState, [key]: value }));
    };

    const handleSave = () => {
        if (gynecOnly) {
            const filteredGynecHistory = Object.keys(gynecHistory || {}).reduce((acc, key) => {
                if (
                    key !== 'createdAt' && key !== 'createdBy' &&
                    gynecHistory[key] !== '' && gynecHistory[key] !== null &&
                    gynecHistory[key] !== 'custom' && gynecHistory[key] !== 'number'
                ) {
                    acc[key] = gynecHistory[key];
                }
                return acc;
            }, {});
            const lmpRaw = filteredGynecHistory.lmp ?? filteredGynecHistory.lastMenstrualPeriod;
            if (lmpRaw) {
                const parsed = moment(lmpRaw, [showDateFormat, dateFormat, 'YYYY-MM-DD']);
                if (parsed.isValid()) filteredGynecHistory.lastMenstrualPeriod = parsed.format(showDateFormat);
            }
            if (onSave) onSave(filteredGynecHistory);
            if (patient_data?.patient_unique_id) handleSaveClick();
            return;
        }
        if (hideMenstrualHistoryTab) {
            if (typeof setMedicalHistoryData === 'function') setMedicalHistoryData(cloneMedicalHistoryData);
            if (onSave) {
                onSave(cloneMedicalHistoryData);
            }
        } else {
        const filteredGynecHistory = Object.keys(gynecHistory || {}).reduce((acc, key) => {
            if (
                key !== 'createdAt' && key !== 'createdBy' &&
                gynecHistory[key] !== '' && gynecHistory[key] !== null &&
                gynecHistory[key] !== 'custom' && gynecHistory[key] !== 'number'
            ) {
                acc[key] = gynecHistory[key];
            }
            return acc;
        }, {});
        onSave(filteredGynecHistory);
        }
        handleSaveClick()
    };

    const onExpandCollapseGynecClick = useCallback((key) => {
        setSectionState(prevState => ({ ...prevState, [key]: !prevState[key] }));
    }, []);

    useEffect(() => {
        if (isGynaecHistoryAccessable && !gynecOnly) {
            fetchGynecHistory();
        }
    }, [isGynaecHistoryAccessable, gynecOnly]);

    // Rx pad (voice/ambient/snap/smart): sync initial gynec data when drawer opens so Menstrual History tab shows it
    useEffect(() => {
        if (gynecOnly && initialGynecHistory != null && typeof initialGynecHistory === 'object' && Object.keys(initialGynecHistory).length > 0) {
            setGynecHistory({ ...initialGynecHistory });
        }
    }, [gynecOnly, initialGynecHistory]);

    const fetchGynecHistory = async () => {
        if (!patient_data?.patient_unique_id) return;
        try {
            const data = await getGynecDetails(patient_data.patient_unique_id, userId);
            if (data) {
                setGynecEditState("UPDATE");
                if (Object.keys(data).length > 2) {
                    setActiveMenstrualData("cycle")
                    setRightPanelTitle('Cycle')
                }
            }
            setGynecHistory(data);
            setGynecLoading(false);
        } catch (error) {
            console.error('Error fetching gynec history:', error);
            setGynecLoading(false);
        }
    };

    // Function to check if gynecHistory has any meaningful entries except createdAt and createdBy
    const hasGynecHistoryData = (gynecHistory) => {
        if (!gynecHistory) return false;
        const { createdAt, createdBy, ...rest } = gynecHistory;
        return Object.keys(rest).length > 0;
    };

    const trackUpdateEvent = () => {
        const clinic_name = getClinicName(profile?.hospital_data);
        window.Moengage.track_event("TP_Gynec_history_updated", {
            clinic_name,
            doctor_id: profile?.doctor_unique_id,
            patient_number: patient_data?.pm_contact_no,
            patient_id: patient_data?.patient_unique_id,
        })
    }

    const handleSaveClick = async () => {
        setGynecEditState("UPDATE");
        setGynecLoading(true);
        const today = moment().toISOString();
        const hasData = hasGynecHistoryData(gynecHistory);

        if (!hasData) {
            setGynecLoading(false);
            return;
        }

        // Filter out keys with empty string values
        const filteredGynecHistory = Object.keys(gynecHistory).reduce((acc, key) => {
            if (gynecHistory[key] !== '' && gynecHistory[key] !== null && gynecHistory[key] !== "custom" && gynecHistory[key] !== "number") {
                acc[key] = gynecHistory[key];
            }
            return acc;
        }, {});

        setGynecHistory(filteredGynecHistory)
        handleCollapsed(2)

        if (gynecEditState === "CREATE") {
            const payload = {
                patientId: patient_data.patient_unique_id,
                timeline: [{
                    ...filteredGynecHistory,
                    createdAt: today,
                    createdBy: tokenData?.user_id,
                }],
                createdAt: today,
                createdBy: tokenData?.user_id,
            };
            try {
                const response = await postGynecDetails(payload);
                if (response?.data) {
                    trackUpdateEvent();
                }
            } catch (error) {
                console.error('Error:', error);
                errorMessage("Unable to create gynec history for you. please try again.")
            } finally {
                setGynecLoading(false);
            }
        } else {
            const payload = {
                ...filteredGynecHistory,
                createdAt: today,
                createdBy: tokenData?.user_id,
            };
            try {
                const response = await updateGynecDetails(patient_data.patient_unique_id, payload, userId);
                if (response?.data) {
                    trackUpdateEvent();
                }
            } catch (error) {
                console.error('Error:', error);
                errorMessage("Unable able to update gynecdetail for you. please try again.")
            } finally {
                setGynecLoading(false);
            }
        }
    };

    const isCustomOrNumberOrUndefined = (value) => {
        return value === undefined || value === '' || value === 'number' || value === 'custom' || value === null || value === -1;
    };

    const [selectedDate, setSelectedDate] = useState(null);
    useEffect(() => {
        if (gynecHistory?.lmp) {
            setSelectedDate(moment(gynecHistory.lmp).format(showDateFormat));
        }
    }, [gynecHistory]);

    const showHideVideoListPopover = useCallback(() => {
        setPopOverVideo(!popOverVideo);
    }, [popOverVideo]);

    const VIDEO_CONTENT = useCallback(() => {
        return (
            <>
                <div
                    className="video-contant rounded-4 p-20"
                    key="oneclickrx-video"
                >
                    <div className="align-items-center d-flex justify-content-between border-bottom mb-20 pb-2">
                        <div className="title-common lh-base">Video Tutorial</div>
                        <Button
                            className="btn btn-delete-prescription p-0"
                            onClick={showHideVideoListPopover}
                        >
                            <i className="icon-Cross" />
                        </Button>
                    </div>

                    <div className={`d-flex`}>
                        <div className="tutorial-play me-14">
                            <button type="button" onClick={() => setShowVideo(true)}>
                                <img src={playIcons} />
                            </button>
                            <span className="tutorial-thumb">
                                <img src={videoLink.thumbnail} />
                            </span>
                        </div>
                        <div>
                            <h3 className="title-common text-welcome">
                                {videoLink.tmv_title}
                            </h3>
                            <div className="fs-12 fontroboto fw-normal text-main">
                                {videoLink.tmv_description}
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }, [popOverVideo]);
    
    
    const onExpandCollapseRemarks = () => {
        setExpandRemarks(!expandRemarks);
    }

    const onRemarksChange = (e) => {
        setRemarks(e.target.value);
    }

    return (
        <>
            {hideMenstrualHistoryTab && (
                <style>{`
                    .hide-tabs-nav .ant-tabs-nav {
                        display: none !important;
                    }
                    .hide-tabs-nav .ant-tabs-content-holder {
                        margin-top: 16px;
                    }
                    .hide-tabs-nav .ant-tabs-content {
                        padding-top: 0;
                    }
                `}</style>
            )}
            <Card bordered={false} className="search-modalCard">
                <div className='modalCard-header h-60 align-items-center justify-content-between d-flex'>
                    <div className='align-items-center d-flex h-100'>
                        <div className='border-end h-100 text-center me-3'>
                            <div
                                onClick={onSaveClicked}
                                // onClick={handleDrawerMedicalHistory} 
                                className='btn-headerback align-items-center d-flex h-100 justify-content-around cursor-pointer'>
                                <i className='icon-right'></i>
                            </div>
                        </div>
                        <div className="title-common">
                            {(isGynaecHistoryAccessable && !hideMenstrualHistoryTab) ? `Gynec History` : `Medical History`}
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        {isGynaecHistoryAccessable && (
                            <Popover
                                open={popOverVideo}
                                onOpenChange={showHideVideoListPopover}
                                content={VIDEO_CONTENT}
                                trigger="click"
                                overlayClassName="pop-430 pp-0 videoTutorial"
                                placement="bottom"
                            >
                                <button className="btn d-flex align-items-center btn-text p-0 me-20">
                                    <span>
                                        <img src={tutorial2} />
                                    </span>
                                </button>
                            </Popover>
                        )}
                        <Button className='btn btn-primary3 btn-41 px-4 me-20' onClick={onSaveClicked}>
                            Save
                        </Button>
                    </div>
                </div>
                <Tabs 
                    defaultActiveKey={initialActiveKey || "gynec"} 
                    onChange={onTabChange}
                    className={(hideMenstrualHistoryTab || gynecOnly) ? "hide-tabs-nav" : ""}
                >
                    {((isGynaecHistoryAccessable && !hideMenstrualHistoryTab) || gynecOnly) &&
                        <TabPane tab="Menstrual History" key="gynec">
                            <div style={{ marginTop: "-1rem" }}>
                                <Row>
                                    <Col lg={12}>
                                        <div className="bg-white overflow-y-auto medical-history-section" style={{ height: 'calc(100vh - 115px)' }}>
                                            <div className="border-bottom px-4 pt-3 pb-2">
                                                <div className="d-flex align-items-center lmp-gynec">
                                                    <label className="pe-3">Last menstrual period :</label>
                                                    <DatePicker
                                                        style={{
                                                            border: "1px solid #fff",
                                                            borderRadius: "18px",
                                                        }}
                                                        placeholder={showDateFormat.toLowerCase()}
                                                        value={
                                                            selectedDate
                                                                ? dayjs(selectedDate, "DD-MM-YYYY")
                                                                : ""
                                                        }
                                                        format={{
                                                            format: showDateFormat,
                                                            type: 'mask',
                                                        }}

                                                        onChange={onDateChanged}
                                                        disabledDate={disabledDate}
                                                    />
                                                </div>
                                            </div>

                                            <div className="border-bottom px-4 pt-3 pb-2">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className="titleprint">Age at menarche</div>
                                                        <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={() => onExpandCollapseGynecClick('ageAtMenarche')}>
                                                            <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${sectionState.ageAtMenarche ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                                {sectionState.ageAtMenarche &&
                                                    <div className="d-flex flex-wrap">
                                                        <div key="regular" className={`history-badge gynec-history-badge ${activeMenstrualData === "ageAtMenarche" && gynecHistory?.[activeMenstrualData] ? 'history-selected' : gynecHistory?.ageAtMenarche ? 'history-active' : ''}`}>
                                                            <div onClick={() => handleSelectionChange('ageAtMenarche', gynecHistory?.ageAtMenarche || 'number')}>
                                                                {isCustomOrNumberOrUndefined(gynecHistory?.ageAtMenarche) ? `+Add` : `${gynecHistory?.ageAtMenarche} years`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                }
                                            </div>

                                            <div className="border-bottom px-4 pt-3 pb-2">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className="titleprint">Cycle</div>
                                                        <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={() => onExpandCollapseGynecClick('cycle')}>
                                                            <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${sectionState.cycle ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                                {sectionState.cycle &&
                                                    <div className="d-flex flex-wrap">
                                                        <div className="segement-static-gynec d-flex">
                                                            {CYCLE_KEY_LIST.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    // className={`btn p-0 ${ activeMenstrualData ==="cycle" && gynecHistory?.[activeMenstrualData] === item.value ? 'history-selected' : gynecHistory?.cycle === item.value ? 'history-active' : ''}`}
                                                                    className={`btn p-0 ${activeMenstrualData === "cycle" && gynecHistory?.[activeMenstrualData] === item.value ? 'history-selected' : gynecHistory?.cycle === item.value ? 'history-active' : ''}`}
                                                                    onClick={() => handleSelectionChange('cycle', item.value)}
                                                                >
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                }
                                            </div>

                                            <div className="border-bottom px-4 pt-3 pb-2">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className="titleprint">Flow</div>
                                                        <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={() => onExpandCollapseGynecClick('flow')}>
                                                            <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${sectionState.flow ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                                {sectionState.flow &&
                                                    <div className="d-flex flex-wrap">
                                                        <div className="segement-static-gynec d-flex">
                                                            {FLOW_LIST.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    className={`btn w-100 p-0 ${activeMenstrualData === "flow" && gynecHistory?.[activeMenstrualData] === item.value ? 'history-selected' : gynecHistory?.flow === item.value ? 'history-active' : ''}`}
                                                                    onClick={() => handleSelectionChange('flow', item.value)}
                                                                >
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                }
                                            </div>

                                            <div className="border-bottom px-4 pt-3 pb-2">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className="titleprint">Pain</div>
                                                        <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={() => onExpandCollapseGynecClick('pain')}>
                                                            <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${sectionState.pain ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                                {sectionState.pain &&
                                                    <div className="d-flex flex-wrap">
                                                        <div className="segement-static-gynec d-flex">
                                                            {PAIN_LIST.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    className={`btn p-0 ${activeMenstrualData === "pain" && gynecHistory?.[activeMenstrualData] === item.value ? 'history-selected' : gynecHistory?.pain === item.value ? 'history-active' : ''}`}
                                                                    onClick={() => handleSelectionChange('pain', item.value)}
                                                                >
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                }
                                            </div>

                                            <div className="border-bottom px-4 pt-3 pb-2">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className="titleprint">Lifecycle Hormonal Changes</div>
                                                        <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={() => onExpandCollapseGynecClick('reproductiveStages')}>
                                                            <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${sectionState.reproductiveStages ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                                {sectionState.reproductiveStages &&
                                                    <div className="d-flex flex-wrap">
                                                        <div className="segement-static-gynec d-flex">
                                                            {REPRODUCTIVE_LIFE_STAGES_LIST.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    className={`btn p-0 btn-padding ${activeMenstrualData === "reproductiveLifeStages" && gynecHistory?.[activeMenstrualData] === item.value ? 'history-selected' : gynecHistory?.reproductiveLifeStages === item.value ? 'history-active' : ''}`}
                                                                    onClick={() => handleSelectionChange('reproductiveLifeStages', item.value)}
                                                                >
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                }
                                            </div>

                                            <div className="border-bottom px-4 pt-3 pb-2">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className="titleprint">Note</div>
                                                        <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={() => onExpandCollapseGynecClick('note')}>
                                                            <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${sectionState.note ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                                {sectionState.note ? !isCustomOrNumberOrUndefined(gynecHistory?.notes) ? (
                                                    <div className="gynec-notes d-flex">
                                                        <div className='pe-0'>
                                                            {gynecHistory?.notes}
                                                        </div>
                                                        <button className='btn d-flex pe-0' onClick={() => handleSelectionChange('notes', gynecHistory?.notes || 'number')}>
                                                            <span className="px-1">Edit</span><i className="icon-Edit" style={{ fontSize: "18px" }}></i>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="d-flex flex-wrap">
                                                        <div key="regular" className={`history-badge gynec-history-badge ${activeMenstrualData === "notes" && isCustomOrNumberOrUndefined(gynecHistory?.notes) ? 'history-selected' : gynecHistory?.notes ? 'history-active' : ''}`}>
                                                            <div onClick={() => handleSelectionChange('notes', gynecHistory?.notes || 'number')}>
                                                                +Add
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    ""
                                                )
                                                }
                                            </div>
                                        </div>
                                    </Col>
                                    {/* Options for the selected values */}
                                    <Col lg={12}>
                                        <div className="bg-body overflow-y-auto" style={{ height: 'calc(100vh - 61px)' }}>
                                            <h4 className="border-bottom px-4 pt-3 pb-3">{(activeMenstrualData === "reproductiveLifeStages" && !gynecHistory?.reproductiveLifeStages) ? `Lifecycle Hormonal Changes` : rightPanelTitle}</h4>
                                            <div className="mb-2 mx-4">
                                                {/* Cycle Options */}
                                                {activeMenstrualData === "cycle" && (
                                                    <div>
                                                        <h6 className="pb-1">Interval of cycle (in days)</h6>
                                                        <div className="segement-static d-flex flex-wrap">
                                                            {CYCLES_LIST.map((item, i) => {
                                                                const isCustomButton = i === CYCLES_LIST.length - 1;
                                                                const isActive = gynecHistory?.intervalOfCycle === item.value || (isCustomButton && gynecHistory?.intervalOfCycle !== "" && (gynecHistory?.intervalOfCycle === customCyclesValue || gynecHistory?.intervalOfCycle === inputCycles));
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        className={`btn cycles-intervals p-0 ${isActive ? 'btn-segement' : ''}`}
                                                                        onClick={() => handleGynecValueChange("intervalOfCycle", item.value)}
                                                                    >
                                                                        {item.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                            <label className="title-common mb-1">Note</label>

                                                        </div>
                                                        <Input.TextArea
                                                            value={gynecHistory?.cycleNotes}
                                                            placeholder="Enter any specific cycle notes here"
                                                            className="textareaPlaceholder"
                                                            rows={3}
                                                            onChange={(e) => handleNoteChange('cycleNotes', e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                                {/* Flow Options */}
                                                {activeMenstrualData === "flow" && (
                                                    <div>
                                                        <h6 className="pb-1">Duration of menstrual flow (in days)</h6>
                                                        <div className="segement-static d-flex mb-3">
                                                            {DURATION_OF_CYCLE_LIST.map((item, i) => {
                                                                const isCustomButton = i === DURATION_OF_CYCLE_LIST.length - 1;
                                                                const isActive = gynecHistory?.durationOfMenstrualFlow === item.value || (isCustomButton && gynecHistory?.durationOfMenstrualFlow !== "" && (gynecHistory?.durationOfMenstrualFlow === customCyclesDaysValue || gynecHistory?.durationOfMenstrualFlow === inputCyclesDays));
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        className={`btn cycles-intervals p-0 ${isActive ? 'btn-segement' : ''}`}
                                                                        onClick={() => handleGynecValueChange('durationOfMenstrualFlow', item.value)}
                                                                    >
                                                                        {item.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <h6 className="pt-2 pb-1">Clots During Flow</h6>
                                                        <div className="segement-static d-flex mb-3">
                                                            {CLOTS_LIST.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    className={`btn p-0 ${gynecHistory?.clots === item.value ? 'btn-segement' : ''}`}
                                                                    onClick={() => handleGynecValueChange('clots', item.value)}
                                                                >
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <h6 className="pt-2 pb-1">Number of Pads Per Day</h6>
                                                        <div className="segement-static d-flex">
                                                            {PAD_NUM_LIST.map((item, i) => {
                                                                const isCustomButton = i === PAD_NUM_LIST.length - 1;
                                                                const isActive = gynecHistory?.numberOfPadsPerDay === item.value || (isCustomButton && gynecHistory?.numberOfPadsPerDay !== "" && (gynecHistory?.numberOfPadsPerDay === customPadNumValue || gynecHistory?.numberOfPadsPerDay === inputPadsNum));
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        className={`btn cycles-intervals p-0 ${isActive ? 'btn-segement' : ''}`}
                                                                        onClick={() => handleGynecValueChange('numberOfPadsPerDay', item.value)}
                                                                    >
                                                                        {item.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                            <label className="title-common mb-1">Note</label>
                                                            <Input.TextArea
                                                                value={gynecHistory?.flowNotes}
                                                                placeholder="Enter any specific flow notes here"
                                                                className="textareaPlaceholder"
                                                                rows={3}
                                                                onChange={(e) => handleNoteChange('flowNotes', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Pain Options */}
                                                {activeMenstrualData === "pain" && (
                                                    <div>
                                                        <h6 className="pb-1">Occurrence of pain</h6>
                                                        <div className="segement-static d-flex flex-wrap">
                                                            {PAIN_OCCURANCE_LIST.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    className={`btn p-0 pain-occurance ${gynecHistory?.occurrenceOfPain === item.value ? 'btn-segement' : ''}
                                                                    }`}
                                                                    onClick={() => handleGynecValueChange('occurrenceOfPain', item.value)}
                                                                >
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                            <label className="title-common mb-1">Note</label>
                                                            <Input.TextArea
                                                                value={gynecHistory?.painNotes}
                                                                placeholder="Enter any specific pain notes here"
                                                                className="textareaPlaceholder"
                                                                rows={3}
                                                                onChange={(e) => handleNoteChange('painNotes', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Age at Menarche */}
                                                {activeMenstrualData === "ageAtMenarche" && (
                                                    <div>
                                                        <h6 className="pb-1">Age at Menarche</h6>
                                                        <div className="segement-static d-flex flex-wrap">
                                                            {MENARCHE_LIST.map((item, i) => {
                                                                const isCustomButton = i === MENARCHE_LIST.length - 1;
                                                                const isActive = gynecHistory?.ageAtMenarche === item.value || (isCustomButton && gynecHistory?.ageAtMenarche !== "" && (gynecHistory?.ageAtMenarche === customMenarcheValue || gynecHistory?.ageAtMenarche === inputMenarche));
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        className={`btn cycles-intervals p-0 ${isActive ? 'btn-segement' : ''}`}
                                                                        onClick={() => handleGynecValueChange('ageAtMenarche', item.value)}
                                                                    >
                                                                        {item.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                            <label className="title-common mb-1">Note</label>
                                                            <Input.TextArea
                                                                value={gynecHistory?.menarcheNotes}
                                                                placeholder="Enter any specific menarche notes here"
                                                                className="textareaPlaceholder"
                                                                rows={3}
                                                                onChange={(e) => handleNoteChange('menarcheNotes', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Reproductive Life stages*/}
                                                {activeMenstrualData === "reproductiveLifeStages" && gynecHistory?.reproductiveLifeStages && (
                                                    <div>
                                                        <h6 className="pb-1">Age at {gynecHistory?.reproductiveLifeStages}</h6>
                                                        <div className="segement-static d-flex mb-2">
                                                            {MENOPAUSE_LIST.map((item, i) => {
                                                                const isCustomButton = i === MENOPAUSE_LIST.length - 1;
                                                                const isActive = gynecHistory?.ageAtMenopause === item.value || (isCustomButton && gynecHistory?.ageAtMenopause !== "" && (gynecHistory?.ageAtMenopause === customMenoPause || gynecHistory?.ageAtMenopause === inputMenopause));
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        className={`btn cycles-intervals p-0 ${isActive ? 'btn-segement' : ''}`}
                                                                        onClick={() => handleGynecValueChange('ageAtMenopause', item.value)}
                                                                    >
                                                                        {item.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <h6 className="pt-4 pb-1">Type of {gynecHistory?.reproductiveLifeStages}</h6>
                                                        <div className="segement-static d-flex flex-wrap">
                                                            {TYPES_REPRODUCTIVE_STAGES.map((item, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    className={`btn p-0 types-reproductive-stages ${gynecHistory?.typeOfMenopause === item.value ? 'btn-segement' : ''} ${gynecHistory?.typeOfMenopause === 'custom' && item.value === 'custom' ? 'custom-input-selected' : ''
                                                                        }`}
                                                                    onClick={() => handleGynecValueChange('typeOfMenopause', item.value)}
                                                                >
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                            <label className="title-common mb-1">Note</label>
                                                            <Input.TextArea
                                                                value={gynecHistory?.reproductiveNotes}
                                                                placeholder="Enter any specific reproductive notes here"
                                                                className="textareaPlaceholder"
                                                                rows={3}
                                                                onChange={(e) => handleNoteChange('reproductiveNotes', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {gynecHistory && activeMenstrualData === "reproductiveLifeStages" && !gynecHistory?.[activeMenstrualData] && (
                                                    <div className="text-center">
                                                        <img className="my-4" style={{ width: 194 }} src={noRecordFound} alt="No Result Found" />
                                                        <div className="fontroboto text-main title-common"> No selected data Found! </div>
                                                        <div className="fontroboto text-main title fw-normal mt-2"> Please select data from the left panel. </div>
                                                    </div>
                                                )}
                                                {activeMenstrualData === "notes" && (
                                                    <div>
                                                        <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                            <Input.TextArea
                                                                value={!isCustomOrNumberOrUndefined(gynecHistory?.notes) ? `${gynecHistory?.notes}` : ``}
                                                                placeholder="Write notes"
                                                                className="textareaPlaceholder"
                                                                rows={3}
                                                                onChange={(e) => handleNoteChange('notes', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {!activeMenstrualData && (
                                                    <div className="text-center">
                                                        <img className="my-4" style={{ width: 194 }} src={noRecordFound} alt="No Result Found" />
                                                        <div className="fontroboto text-main title-common"> No Records Found! </div>
                                                        <div className="fontroboto text-main title fw-normal mt-2"> You haven't added any gynec history. </div>
                                                    </div>
                                                )
                                                }
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                        </TabPane>
                    }
                    {!gynecOnly && (
                    <TabPane tab="Medical History" key="medical">
                        <div style={{ marginTop: hideMenstrualHistoryTab ? "16px" : "-1rem" }}>
                            <Row>
                                <Col lg={15}>
                                    <div className="bg-white overflow-y-auto medical-history-section" style={{ height: 'calc(100vh - 115px)' }}>
                                        {cloneMedicalHistoryData.length > 0 ? (
                                            cloneMedicalHistoryData?.map((e, i) => {
                                                return (
                                                    <div key={i} className="border-bottom px-4 pt-3 pb-2">
                                                        <div className="d-flex align-items-center justify-content-between mb-3">
                                                            <div className="d-flex align-items-center">
                                                                <div className="titleprint">{e?.title}</div>
                                                                <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={() => onExpandCollapseClick(i)}>
                                                                    <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${e?.isExpand ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                                                </Button>
                                                            </div>
                                                            <div className="d-flex align-items-center">
                                                                <Checkbox className="fontroboto" checked={e?.no_know_history} onChange={(e) => onNoKnownHistoryChange(e, i)}>No known history</Checkbox>
                                                                <button className='btn d-flex ms-1 align-items-center btn-text pe-0' onClick={() => onAddEditClick(e)}>
                                                                    <i className="icon-setting me-2"></i> <span>Edit & Add</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="d-flex flex-wrap">
                                                            {!e?.no_know_history && !e?.isExpand && e?.tags?.map((e1, i1) => {
                                                                return (
                                                                    <div key={Math.random()} className={`history-badge ${e1?.enable !== undefined ? e1?.enable === "Y" ? 'history-active' : e1?.enable === "N" ? 'history-inactive' : '' : ''}`}>
                                                                        <div onClick={() => onTagClick(e?.tmmhs_id, e1?.tmmhst_id, i, i1)}>{e1?.title}</div>
                                                                        <span onClick={() => onEnableClick(e?.tmmhs_id, e1?.tmmhst_id, i, i1)}>{e1?.enable !== undefined ? e1?.enable : "-"}<img src={e1?.enable !== undefined ? e1?.enable === "Y" ? ActiveverticleUpDown : e1?.enable === "N" ? InActiveverticleUpDown : verticleUpDown : verticleUpDown} />
                                                                        </span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                        {i===cloneMedicalHistoryData?.length-1 && (
                                                            <div key={i} className="pt-3 pb-4">
                                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                                    <div className="d-flex align-items-center">
                                                                        <div className="titleprint">Additional History</div>
                                                                        <Button className="btn border rounded-3 px-1 ms-3 collapseButton" onClick={onExpandCollapseRemarks}>
                                                                            <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 ${!expandRemarks ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                                {expandRemarks &&
                                                                    <div style={{ position: "relative", width: "100%" }}>
                                                                        <TextArea
                                                                            value={remarks}
                                                                            placeholder="Write your additional history"
                                                                            className="textareaPlaceholder"
                                                                            rows={3}
                                                                            onChange={onRemarksChange}
                                                                            maxLength={5000}
                                                                            autoSize={{ minRows: 3, maxRows: 6 }}
                                                                        />
                                                                        <div className="additional-history-count">
                                                                            {remarks?.length || 0}/{5000}
                                                                        </div>
                                                                    </div>
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <div className="d-flex align-items-center justify-content-center h-100">
                                                <Spin />
                                            </div>
                                        )}
                                    </div>
                                </Col>
                                <Col lg={9}>
                                    <div className="bg-body overflow-y-auto" style={{ height: 'calc(100vh - 61px)' }}>
                                        {addEditData ? (
                                            <div>
                                                <div className="selectedchip-header1 d-flex flex-column justify-content-center title px-20">
                                                    <span className="text-truncate">{addEditData?.title}</span>
                                                </div>
                                                <div className="p-3">
                                                    <div className="mt-1 mb-3">
                                                        <Input className="popinput" onChange={onSearch} value={searchQuery} placeholder={`Search ${addEditData?.title}`} prefix={<i className='icon-search me-2'></i>} allowClear />
                                                    </div>
                                                    <div className="d-flex flex-wrap">
                                                        {searchQuery.length > 0 ? (
                                                            searchOptions?.map((item, i) => {
                                                                return (
                                                                    i === searchOptions.length - 1 ? (
                                                                        <Button
                                                                            key={i}
                                                                            type="text"
                                                                            className="btn btn-primary2 chips-custom mb-14 chips-addCustom chips-height"
                                                                            onClick={() => onSelectParent({ ...JSON.parse(item.key) })}>
                                                                            "{item.value}" <i className="icon-Add mx-2 fs-6"></i> <a className="fw-medium text-decoration-underline text-primary"> Add Custom</a>
                                                                        </Button>
                                                                    ) : (
                                                                        <Button
                                                                            key={i}
                                                                            type="text"
                                                                            style={{ width: item.value.length > 26 && '250px' }}
                                                                            className={`${item.value.length > 26 && 'chips-custom-break'} btn btn-primary2 chips-custom mb-14 me-14`}
                                                                            onClick={() => onSelectParent({ ...JSON.parse(item.key) })}>
                                                                            {item.value}
                                                                        </Button>
                                                                    )
                                                                )
                                                            })
                                                        ) : (
                                                            addEditData?.tags?.filter(e => !e.delete).map((e, i) => {
                                                                return (
                                                                    <div key={Math.random()} className="border rounded-10px px-2 py-1 d-flex align-items-center me-3 mb-2 bg-white fontroboto">
                                                                        {e?.title}
                                                                        <i className="ms-2 icon-Cross fs-18" onClick={() => onRemoveTag(e, i)}></i>
                                                                    </div>
                                                                )
                                                            })
                                                        )}
                                                    </div>
                                                    <div className="d-flex justify-content-end align-items-center mt-4">
                                                        <Button className='btn btn-text me-4 p-0 shadow-none border-0' onClick={() => setAddEditData(null)}>
                                                            Cancel
                                                        </Button>
                                                        <Button className='btn btn-primary3 btn-41 px-4' onClick={onAddEditSaveClick} loading={loading}>
                                                            Save
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            selectData ? (
                                                cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.enable == 'Y' ? (
                                                    <div>
                                                        <div className="selectedchip-header1 d-flex flex-column justify-content-center title px-20">
                                                            <span className="text-truncate">{cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.title}</span>
                                                        </div>

                                                        <div className="p-3">
                                                            {isMobile ? (
                                                                selectData?.tmmhs_id !== 3 && selectData?.tmmhs_id !== 5 &&
                                                                <>
                                                                    <div className="mt-2">
                                                                        <label className="title-common mb-1"> Since</label>
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
                                                                    </div>
                                                                    <div className="mt-3">
                                                                        <div className="segement-static d-flex">
                                                                            {sinceOptions.map((item, i) => {
                                                                                return (
                                                                                    <button key={i}
                                                                                        type="button"
                                                                                        className={`btn w-100 ${cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.since !== undefined && cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.since == item.value && 'btn-segement'}`}
                                                                                        onClick={() => onChangeSinceChild(item.value)}>
                                                                                        {item.label}
                                                                                    </button>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <Row gutter={20} className="mt-2">
                                                                    {selectData?.tmmhs_id !== 3 && selectData?.tmmhs_id !== 5 &&
                                                                        <Col lg={24} >
                                                                            <label className="title-common mb-1"> Since</label>
                                                                            <AutoComplete
                                                                                defaultValue={cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.since !== undefined && cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.since}
                                                                                value={cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.since !== undefined && cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.since}
                                                                                placeholder="Since"
                                                                                defaultOpen={false}
                                                                                onSearch={(query) => onSearchSinceChid(query)}
                                                                                onBlur={() => onBlurSinceChid()}
                                                                                options={sinceOptions}
                                                                                className="autocomplete-custom w-100"
                                                                                defaultActiveFirstOption={true}
                                                                                onSelect={(data) => onSelectSinceChild(data)}
                                                                            />
                                                                        </Col>
                                                                    }
                                                                    {selectData?.tmmhs_id == 3 && (
                                                                        <Col lg={24}>
                                                                            <label className="title-common mb-1"> Relationship</label>
                                                                            <Popover
                                                                                open={popOver}
                                                                                onOpenChange={showHidePopover}
                                                                                content={RELATIONSHIP_CONTENT}
                                                                                trigger="click"
                                                                                arrow={false}
                                                                                overlayClassName="pp-0 poover-13"
                                                                                placement="bottom">
                                                                                <div>
                                                                                    <Input className="popinput input-tuncate" readOnly value={cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.relationship !== undefined ? cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.relationship : ''} placeholder="Select relationship" suffix={<i className='icon-right iconrotate270'></i>} />
                                                                                </div>
                                                                            </Popover>
                                                                        </Col>
                                                                    )}
                                                                </Row>

                                                            )}
                                                            {selectData?.tmmhs_id != 3 && selectData?.tmmhs_id != 5 && (
                                                                <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                                    <label className="title-common mb-1">Status</label>
                                                                    {/* <div className="segement-static d-flex">
                                                                        {STATUS_LIST.map((item, i) => {
                                                                            return (
                                                                                <button key={i}
                                                                                    type="button"
                                                                                    className={`btn w-100 ${cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.status !== undefined && cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.status == item.value && 'btn-segement'}`}
                                                                                    onClick={() => onChangeStatus(item.value)}>
                                                                                    {item.label}
                                                                                </button>
                                                                            )
                                                                        })}
                                                                    </div> */}
                                                                    <Form.Item className="form_addnewpatient">
                                                                        <Radio.Group
                                                                            className={`d-flex gender-radio all-change-radio ${isMobile ? 'segmented-radio-mobile' : ''}`}
                                                                            value={cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.status !== undefined && cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.status}>
                                                                            {STATUS_LIST.map((item, i) => {
                                                                                return (
                                                                                    <Radio.Button key={i} className={`w-100 text-center ${isMobile ? 'segment-47' : 'text-segment'}`} value={item.value} onClick={() => onChangeStatus(item.value)}>{item.label}</Radio.Button>
                                                                                )
                                                                            })}
                                                                        </Radio.Group>
                                                                    </Form.Item>
                                                                </div>
                                                            )}
                                                            {selectData?.tmmhs_id == 2 && cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.status == 'Active' && (
                                                                <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                                    <label className="title-common mb-1"> Medication</label>
                                                                    {/* <div className="segement-static d-flex">
                                                                        {MEDICATION_LIST.map((item, i) => {
                                                                            return (
                                                                                <button key={i}
                                                                                    type="button"
                                                                                    className={`btn w-100 ${cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.medication !== undefined && cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.medication == item.value && 'btn-segement'}`}
                                                                                    onClick={() => onChangeMedication(item.value)}>
                                                                                    {item.label}
                                                                                </button>
                                                                            )
                                                                        })}
                                                                    </div> */}
                                                                    <Form.Item className="form_addnewpatient">
                                                                        <Radio.Group
                                                                            className={`d-flex gender-radio all-change-radio ${isMobile ? 'segmented-radio-mobile' : ''}`}
                                                                            value={cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.medication !== undefined && cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.medication}>
                                                                            {MEDICATION_LIST.map((item, i) => {
                                                                                return (
                                                                                    <Radio.Button key={i} className={`w-100 text-center ${isMobile ? 'segment-47' : 'text-segment'}`} value={item.value} onClick={() => onChangeMedication(item.value)}>{item.label}</Radio.Button>
                                                                                )
                                                                            })}
                                                                        </Radio.Group>
                                                                    </Form.Item>
                                                                </div>
                                                            )}
                                                            {selectData?.tmmhs_id == 3 && isMobile && (
                                                                <div>
                                                                    <label className="title-common mb-1"> Relationship</label>
                                                                    <Popover
                                                                        open={popOver}
                                                                        onOpenChange={showHidePopover}
                                                                        content={RELATIONSHIP_CONTENT}
                                                                        trigger="click"
                                                                        arrow={false}
                                                                        overlayClassName="poover-34 pp-0"
                                                                        placement="bottom">
                                                                        <div>
                                                                            <Input className="popinput" readOnly value={cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.relationship !== undefined ? cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.relationship : ''} placeholder="Select relationship" suffix={<i className='icon-right iconrotate270 ms-2'></i>} />
                                                                        </div>
                                                                    </Popover>
                                                                </div>
                                                            )}
                                                            {selectData?.tmmhs_id == 5 && (
                                                                <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                                    <label className="title-common mb-1">Date of Surgery</label>
                                                                    <div className="mb-3">
                                                                        <Radio.Group
                                                                            className="d-flex gender-radio all-change-radio"
                                                                            value={surgicalDateType}
                                                                            onChange={(e) => onSurgicalDateTypeChange(e.target.value)}
                                                                        >
                                                                            {SURGICAL_DATE_TYPE_OPTIONS.map((item, i) => (
                                                                                <Radio.Button 
                                                                                    key={i} 
                                                                                    className="w-100 text-center text-segment" 
                                                                                    value={item.value}
                                                                                >
                                                                                    {item.label}
                                                                                </Radio.Button>
                                                                            ))}
                                                                        </Radio.Group>
                                                                    </div>
                                                                    {surgicalDateType === 'year' ? (
                                                                        <Input
                                                                            className="popinput"
                                                                            placeholder="Enter year (e.g., 2020)"
                                                                            value={surgicalDate || ''}
                                                                            onChange={(e) => onSurgicalYearChange(e.target.value)}
                                                                            maxLength={4}
                                                                        />
                                                                    ) : (
                                                                        <DatePicker
                                                                            className="popinput w-100"
                                                                            placeholder="Select date"
                                                                            format={showDateFormat}
                                                                            value={surgicalDate}
                                                                            onChange={onSurgicalDateChange}
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className={`${isMobile ? 'mt-5' : 'mt-20'}`}>
                                                                <label className="title-common mb-1">
                                                                    {selectData?.tmmhs_id == 5 ? "Surgical History Remarks" : "Note"}
                                                                </label>
                                                                <Input.TextArea 
                                                                    value={cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.note !== undefined && cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.note} 
                                                                    placeholder={selectData?.tmmhs_id == 5 ? "Enter surgical history remarks here" : "Enter any specific notes here"} 
                                                                    className="textareaPlaceholder" 
                                                                    rows={3} 
                                                                    onChange={onChangeInputNote} 
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.enable == 'N' && (
                                                    <div className="text-center">
                                                        <img className="mt-4 mb-3" style={{ width: 135 }} src={NoHypertension} alt="No Result Found" />
                                                        <div className="title-hypertension">{`No ${cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.title} !`}</div>
                                                        <div className="fontroboto text-main title fw-normal mt-2">
                                                            You have selected as patient does not <br />
                                                            have {cloneMedicalHistoryData[selectData?.section_index]?.tags[selectData?.tag_index]?.title}
                                                        </div>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="text-center">
                                                    <img className="my-4" style={{ width: 194 }} src={noRecordFound} alt="No Result Found" />
                                                    <div className="fontroboto text-main title-common"> No Records Found! </div>
                                                    <div className="fontroboto text-main title fw-normal mt-2"> You haven't added any medical history. </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    </TabPane>
                    )}
                </Tabs>
            </Card>
            {shouldShowVideo && (
                <VideoModal
                    videoLink={videoLink}
                    onCancel={() => setShowVideo(false)}
                />
            )}
        </>
    );
}

export default React.memo(MedicalHistoryBoxMobile);
