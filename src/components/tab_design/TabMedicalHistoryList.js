import React, { useState, useEffect, useContext } from "react";
import { Button, Collapse } from 'antd';
import dayjs from "dayjs";

import CashManagerContext from '../../context/CashManagerContext';
import { GB_GYNEC_HISTORY } from "../../utils/constants";
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import TabGynecHistoryList from "./TabGynecHistoryList";
import { useAccess } from "../../pages/vaccination/useAccess";
import { useSelector } from "react-redux";

import LoopingVideo from "../common/LoopingVideo";
import TabSiderEmptyState from "./TabSiderEmptyState";
import { ASSETS } from "../../assets";
const {
  genRxBg_2: genRxBgWebm,
  genRxBg: genRxBgMp4,
} = ASSETS.images;

// Read More content
const ReadMore = ({ children }) => {
    const text = children;
    const [isReadMore, setIsReadMore] = useState(true);
    const toggleReadMore = () => {
        setIsReadMore(!isReadMore);
    };
    return (
        <p className="text mb-0 fontroboto lh-base">
            {isReadMore && text.length > 70 ? text.slice(0, 70) : text}
            <span onClick={toggleReadMore} className="read-or-hide">
                {text.length > 70 ? isReadMore ? "... View More" : " View Less" : ""}
            </span>
        </p>
    );
};

function TabMedicalHistoryList(props) {

    const { handleDrawerMedicalHistory, handleCollapsed, isTabRx } = props

    const { medicalHistoryData } = useContext(CashManagerContext);

    const {gynecHistory} = props
    const [accordionItems, setAccordionItems] = useState([]);
    const [showShimmer, setShowShimmer] = useState(false);

    const {isGynaecHistoryAccessable} = useAccess();
    const {
    isAutofillSelected,
    selectedSymptomsCollector,
    } = useSelector((state) => state.ddx);

    useEffect(() => {
    if (isAutofillSelected) {
        setShowShimmer(true);
        if (selectedSymptomsCollector?.medicalHistory?.length > 0) {
        }
        const timer = setTimeout(() => {
        setShowShimmer(false);
        }, 1000); // 1 seconds

        return () => clearTimeout(timer); // Cleanup timeout
    }
    }, [isAutofillSelected]);

    const MedicalHistoryShimmer = () => {
        return (
          <div className="medical-history-shimmer genrx-shimmer" style={{ padding: "2px" }}>
            <LoopingVideo
              webm={genRxBgWebm}
              mp4={genRxBgMp4}
              className="genrx-shimmer-video"
              ariaLabel="Background"
            />
            <div className="genrx-shimmer-content">
            <div style={{ background: "white", borderRadius: "17px", padding: "16px" }}>
              {/* Medical Condition Section */}
              <div className="section-shimmer">
                <div className="section-title-shimmer">
                  <div className="title-bar-shimmer" />
                  <div className="icon-shimmer" />
                </div>
                <div className="content-line-shimmer medium" />
                <div className="content-line-shimmer long" />
              </div>

              <div className="divider-shimmer" />

              {/* Allergies Section */}
              <div className="section-shimmer">
                <div className="section-title-shimmer">
                  <div className="title-bar-shimmer" />
                  <div className="icon-shimmer" />
                </div>
                <div className="content-line-shimmer short" />
                <div className="content-line-shimmer medium" />
                <div className="content-line-shimmer short" />
              </div>

              <div className="divider-shimmer" />

              {/* Family History Section */}
              <div>
                <div className="section-title-shimmer">
                  <div className="title-bar-shimmer" />
                  <div className="icon-shimmer" />
                </div>
                <div className="content-line-shimmer short" />
                <div className="content-line-shimmer medium" />
              </div>
            </div>
            </div>
          </div>
        );
    };

    useEffect(() => {
        if (medicalHistoryData.length > 0) {
            const data = []
            medicalHistoryData?.map((e, i) => {
                if (e?.no_know_history || e?.tags?.length > 0) {
                    return data.push({
                        key: `${i + 1}`,
                        label: <div className="fw-semibold">{e?.title}</div>,
                        children:
                            !e?.no_know_history ? (
                                e?.tags?.map((e1, i1) => {
                                    return (
                                        e1?.enable == 'Y' ? (
                                            <>
                                                <div key={Math.random()} className="d-flex my-2">
                                                    <div className="text-history font-roboto fw-medium">Issue&nbsp;:&nbsp;</div>
                                                    <div className="fontroboto text-history fw-normal">{e1?.title}</div>
                                                </div>
                                                {e1?.since && e?.tmmhs_id != 5 && (
                                                    <div key={Math.random()} className="d-flex my-2">
                                                        <div className="text-history fontroboto fw-medium">Since&nbsp;:&nbsp;</div>
                                                        <div className="fontroboto text-history fw-normal">{e1?.since}</div>
                                                    </div>
                                                )}
                                                {e1?.date && e?.tmmhs_id == 5 && (
                                                    <div key={Math.random()} className="d-flex my-2">
                                                        <div className="text-history fontroboto fw-medium">Date of Surgery&nbsp;:&nbsp;</div>
                                                        <div className="fontroboto text-history fw-normal">{e1?.date}</div>
                                                    </div>
                                                )}
                                                                                                            {e?.tmmhs_id != 3 && e?.tmmhs_id != 5 && (
                                                    <>
                                                        {e1?.status && (
                                                            <div key={Math.random()} className="d-flex my-2">
                                                                <div className="text-history fontroboto fw-medium">Status&nbsp;:&nbsp;</div>
                                                                <div className="fontroboto text-history fw-normal">{e1?.status}</div>
                                                            </div>
                                                        )}
                                                        {e1?.medication && (
                                                            <div key={Math.random()} className="d-flex my-2">
                                                                <div className="text-history fontroboto fw-medium">Medication&nbsp;:&nbsp;</div>
                                                                <div className="fontroboto text-history fw-normal">{e1?.medication}</div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                {e?.tmmhs_id == 3 && e1?.relationship && (
                                                    <div key={Math.random()} className="d-flex my-2">
                                                        <div className="text-history fontroboto fw-medium">Relationship&nbsp;:&nbsp;</div>
                                                        <div className="fontroboto text-history fw-normal">{e1?.relationship}</div>
                                                    </div>
                                                )}
                                                {e1?.note && (
                                                    <div key={Math.random()} className="my-2">
                                                        <div className="text-history fontroboto fw-medium">
                                                            {e?.tmmhs_id == 5 ? "Remarks" : "Notes"}&nbsp;:&nbsp;
                                                        </div>
                                                        <div className="border rounded-3 px-2 py-5px-3px">
                                                            <ReadMore>
                                                                {e1?.note}
                                                            </ReadMore>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : e1?.enable == 'N' ? (
                                            <div key={Math.random()} className="fontroboto text-history fw-normal">{`No ${e1?.title}`}</div>
                                        ) : (
                                            null
                                        )
                                    )
                                })
                            ) : (
                                <div className="fontroboto border rounded p-1 my-2 text-history fw-normal">{`No known history`}</div>
                            )
                    });
                }
            });
            if(medicalHistoryData?.[0]?.medical_history_remarks) {
                data.push({
                    key: "5",
                    label: <div className="fw-semibold">Additional History</div>,
                    children: <div className="fontroboto border rounded p-2 my-2 text-history fw-normal overflow-auto d-flex text-wrap">{medicalHistoryData?.[0]?.medical_history_remarks}</div>
                })
            }
            setAccordionItems(data)
        } else {
            setAccordionItems([])
        }
    }, [medicalHistoryData]);

    const filteredGynecHistory = Object.keys(gynecHistory || {}).reduce((acc, key) => {
        if (
            key !== 'createdAt' && key !== 'createdBy' && key !== 'reproductiveLifeStages'
        ) {
            acc[key] = gynecHistory[key];
        }
        return acc;
    }, {});

    const hasGynecHistory = gynecHistory && Object.keys(filteredGynecHistory).length > 0;
    const hasMedicalHistory = medicalHistoryData && medicalHistoryData.length > 0;
    const hasHistoryContent = (hasGynecHistory && isGynaecHistoryAccessable) || hasMedicalHistory;

    return (
        <>
            <div className={`text-white align-items-center bg-secondary d-flex justify-content-between lh-lg px-2 py-2 ${isTabRx ? 'tab-rx-header' : ''}`}>
                History
                <Button type="text" className="btn p-0 btn-outline" onClick={handleCollapsed}>
                    <i className='icon-Contract fs-21 text-white p-0'></i>
                </Button>
            </div>
            <div className="overflow-y-auto" style={{ height: "calc(100vh - 108px)" }}>
                <div className="p-10">
                    {showShimmer ? <MedicalHistoryShimmer /> : hasHistoryContent ? (
                        <>
                        <Button className='btn btn-input d-flex w-100 align-items-center btn-41' onClick={handleDrawerMedicalHistory}>
                            <i className='icon-Add me-2 fs-21'></i>
                            Add or Edit History
                        </Button>
                        <div className="border rounded-3 bg-body mt-3 p-10">
                            {hasGynecHistory && isGynaecHistoryAccessable && (
                                <TabGynecHistoryList gynecHistory={gynecHistory} />
                            )}
                            {hasMedicalHistory && (
                                <Collapse 
                                    items={accordionItems} 
                                    defaultActiveKey={['1', '2', '3', '4', '5']} 
                                    className="prescriptiontab-accordian history-sider-box" 
                                    expandIconPosition="end" 
                                />
                            )}
                        </div>
                        </>
                    ) : (
                        <TabSiderEmptyState
                            title="No History!"
                            description="It looks like there is no medical history added for this patient yet."
                            actionLabel="Add History"
                            onAction={handleDrawerMedicalHistory}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

export default React.memo(TabMedicalHistoryList);
