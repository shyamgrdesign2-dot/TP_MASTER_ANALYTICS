import React from "react";
import { Button } from "antd";

function TabMedicationMoreModal({ width, onClose, onClick, selectedValue, array }) {
    return (
        <>
            <div
                className="modal-overlay"
                style={{
                    position: "fixed",
                    top: "0",
                    left: "0",
                    width: "100vw",
                    height: "100%",
                    background: "rgba(0, 0, 0, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: "998",
                }}
                onClick={() => onClose()}
            ></div>
            <div
                className="more-options-container"
                style={{
                    position: "fixed",
                    bottom: "0px",
                    left: "0px",
                    padding: "10px",
                    width: width,
                    backgroundColor: "white",
                    border: "1px solid lightgrey",
                    borderRadius: "6px",
                    zIndex: "999",
                    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                    }}>
                    <div
                        className="title2"
                        style={{
                            margin: "8px",
                            fontSize: "16px",
                        }}>
                        Select More Languages
                    </div>
                    <button
                        type="button"
                        onClick={() => onClose()}
                        className="ant-btn ant-btn-text btn btn-delete-prescription px-3 focus-none h-100">
                        <i className="icon-Cross fs-3"></i>
                    </button>
                </div>
                <div className="mt-3 d-flex flex-wrap">
                    {array.map((e, i) => (
                        <div
                            key={`${e?.title + "-" + i}`}
                            className={`${selectedValue.includes(e?.title) && 'language-chips'} border rounded-10px p-2 me-2 mb-2 h-100 cursor-pointer`}
                            onClick={() => onClick(e)}>
                            <div className='d-flex align-items-cnter fontroboto text-primary' style={{ lineHeight: 1.3 }}>
                                {e?.title}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

export default React.memo(TabMedicationMoreModal);
