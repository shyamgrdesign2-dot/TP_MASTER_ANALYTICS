import React, { useState, useEffect, useContext } from "react";
import { Button } from 'antd';
import moment from "moment";

import { useSelector, useDispatch } from "react-redux";
import { updatePrivateNotesList } from "../../redux/medicalhistorySlice";
import TabSiderEmptyState from "./TabSiderEmptyState";

import CashManagerContext from '../../context/CashManagerContext';

// Read More content
const ReadMore = ({ children }) => {
    const text = children;
    const [isReadMore, setIsReadMore] = useState(true);
    const toggleReadMore = () => {
        setIsReadMore(!isReadMore);
    };
    return (
        <p className="text mb-0 fontroboto lh-base fs-14">
            {isReadMore && text.length > 63 ? text.slice(0, 63) : text}
            <span onClick={toggleReadMore} className="read-or-hide">
                {text.length > 63 ? isReadMore ? "... View More" : " View Less" : ""}
            </span>
        </p>
    );
};

function TabPrivateNotesList(props) {

    const { handleDrawerPrivateNotes, handleCollapsed, isTabRx } = props
    const { privateNotesList } = useSelector((state) => state.medicalhistory);
    const dispatch = useDispatch();

    const { privateNotesData } = useContext(CashManagerContext);
    const hasPrivateNotes = privateNotesList?.length > 0;

    const onExpandCollapseClick = (i) => {
        dispatch(updatePrivateNotesList({ index: i }));
    };

    return (
        <>
            <div className={`text-white align-items-center bg-secondary d-flex justify-content-between lh-lg px-2 py-2 ${isTabRx ? 'tab-rx-header' : ''}`}>
                Private Notes
                <Button type="text" className="btn p-0 btn-outline" onClick={handleCollapsed}>
                    <i className='icon-Contract fs-21 text-white p-0'></i>
                </Button>
            </div>
            <div className="overflow-y-auto" style={{ height: "calc(100vh - 108px)" }}>
                <div className={`${privateNotesData && "pt-0"} p-10`}>
                    {hasPrivateNotes ? privateNotesList?.map((e, i) => {
                        return (
                            <div className="border rounded-3 bg-body mt-3 p-10" key={i}>
                                <div>
                                    <div className="fw-semibold d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center">
                                            <div className="title fs-14 fw-semibold">
                                                {!moment(moment(e?.date).format('YYYY-MM-DD')).isSame(moment().format('YYYY-MM-DD'), 'day') ? moment(e?.date).format('DD MMMYYYY') : 'Today'}
                                            </div>
                                            <Button className="privatebtn px-2 py-0" onClick={() => handleDrawerPrivateNotes(e)}>
                                                <i className="icon-Edit fs-21"></i>
                                            </Button>
                                        </div>
                                        <Button className="btn border rounded-3 collapseButton p-0" style={{ width: 23, height: 23 }} onClick={() => onExpandCollapseClick(i)}>
                                            <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 mt-0 ${e?.isExpand ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                        </Button>
                                    </div>
                                    {e?.isExpand && (
                                        <div className="cardbody-data">
                                            <div className='rounded my-2'>
                                                <ReadMore>
                                                    {e?.notes}
                                                </ReadMore>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    }) : (
                        <TabSiderEmptyState
                            title="No Private Notes!"
                            description="It looks like there are no private notes added for this patient yet."
                            actionLabel="Add Private Notes"
                            onAction={handleDrawerPrivateNotes}
                        />
                    )}
                </div>
            </div>
        </>
    );
}


export default React.memo(TabPrivateNotesList);
