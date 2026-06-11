import React, { useState } from "react";
import { Button } from 'antd';
import moment from "moment";

import { useSelector, useDispatch } from "react-redux";
import { updatePrivateNotesList } from "../redux/medicalhistorySlice";

// Read More content
const ReadMore = ({ children }) => {
    const text = children;
    const [isReadMore, setIsReadMore] = useState(true);
    const toggleReadMore = () => {
        setIsReadMore(!isReadMore);
    };
    return (
        <p className="text mb-0 fontroboto lh-base">
            {isReadMore && text.length > 160 ? text.slice(0, 160) : text}
            <span onClick={toggleReadMore} className="read-or-hide">
                {text.length > 160 ? isReadMore ? "... View More" : " View Less" : ""}
            </span>
        </p>
    );
};

function PrivateNotesList(props) {

    const { handleDrawerPrivateNotes } = props
    const { privateNotesList } = useSelector((state) => state.medicalhistory);
    const dispatch = useDispatch();

    const onExpandCollapseClick = (i) => {
        dispatch(updatePrivateNotesList({ index: i }));
    };

    return (
        <>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 500px)' }}>
                <div>
                    {privateNotesList?.length > 0 && privateNotesList?.map((e, i) => {
                        return (
                            <div key={i} className="py-2">
                                <div className="fw-semibold d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center">
                                        <div className="title fs-14 fw-semibold">
                                            {moment(e?.date).format('DD MMM YYYY')}
                                        </div>
                                        <Button className="privatebtn px-2 py-0" onClick={() => handleDrawerPrivateNotes(e)}>
                                            <i className="icon-Edit fs-21"></i>
                                        </Button>
                                    </div>
                                    <Button className="btn border rounded-3 collapseButton p-0 me-1" style={{ width: 23, height: 23 }} onClick={() => onExpandCollapseClick(i)}>
                                        <i style={{ transitionDuration: '0.5s' }} className={`icon-right d-block fs-18 mt-0 ${e?.isExpand ? 'iconrotate270' : 'iconrotatehistory90'}`}></i>
                                    </Button>
                                </div>
                                {e?.isExpand && (
                                    <div className="cardbody-data">
                                        <div className='border rounded p-2 fs-14 mt-2'>
                                            <ReadMore>
                                                {e?.notes}
                                            </ReadMore>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </>
    );
}

export default React.memo(PrivateNotesList);
