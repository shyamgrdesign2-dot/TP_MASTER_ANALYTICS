import React, { useState, useEffect, useRef } from 'react';
import { Drawer, Checkbox, Button, message } from 'antd';
import { useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import moment from 'moment';

import { handlePrintClick } from '../../utils/utils';
import './MobileAncPrintPreview.scss';
import { ASSETS } from "../../assets";
const {
  close2: closeIcon,
  print: printIcon,
} = ASSETS.mobile;

/**
 * Mobile Print Preview for ANC Scheduler (Bottom Sheet)
 * Allows selecting tests to print and generates a printable view
 */
const MobileAncPrintPreview = ({
  visible,
  onClose,
  ancSchedulerData = [], // Array of trimester arrays
}) => {
  const { patients_details } = useSelector((state) => state.records);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const printableRef = useRef(null);

  // Initialize with items that have enablePrint = true
  useEffect(() => {
    if (visible && ancSchedulerData?.length) {
      const enabledItems = ancSchedulerData.flatMap((trimesterList) =>
        (trimesterList || [])
          .filter((item) => item?.enablePrint === true)
          .map((item) => item.masterId)
      );
      setSelectedItems(enabledItems);
    }
  }, [visible, ancSchedulerData]);

  // Get all items flattened
  const allItems = ancSchedulerData.flatMap((trimesterList) =>
    (trimesterList || []).map((item) => item.masterId)
  );

  // Handle select all
  const handleSelectAll = () => {
    if (selectedItems.length === allItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(allItems);
    }
  };

  // Handle individual item selection
  const handleItemSelect = (masterId) => {
    setSelectedItems((prev) => {
      if (prev.includes(masterId)) {
        return prev.filter((id) => id !== masterId);
      }
      return [...prev, masterId];
    });
  };

  // Get selected data for printing
  const getSelectedPrintData = () => {
    return ancSchedulerData.flatMap((trimesterList) =>
      (trimesterList || []).filter((item) => selectedItems.includes(item.masterId))
    );
  };

  // Print handler using react-to-print
  // Note: onAfterPrint fires both when print completes AND when user cancels
  // So we don't show success message to avoid confusion
  const handlePrintWeb = useReactToPrint({
    content: () => printableRef.current,
    onAfterPrint: () => {
      setIsPrinting(false);
      // Don't show message here as it fires on cancel too
    },
    onPrintError: (error) => {
      setIsPrinting(false);
      message.error('Print failed. Please try again.');
      console.error('Print error:', error);
    },
  });

  const handlePrint = () => {
    if (selectedItems.length === 0) {
      message.warning('Please select at least one test to print');
      return;
    }
    if (!printableRef.current) {
      message.error('Content not ready. Please try again.');
      return;
    }
    setIsPrinting(true);
    // In app WebView: handlePrintClick uses html2pdf → upload → sendMessageToParent(EVENTS.PRINT).
    // In tunnel/browser: handlePrintClick calls handlePrintWeb() (react-to-print).
    handlePrintClick(
      printableRef.current,
      setIsPrinting,
      handlePrintWeb,
      'ancScheduler'
    );
  };

  // Patient info
  const patientName = patients_details?.patient_name || 'N/A';
  const patientAge = `${patients_details?.ageYears ? patients_details.ageYears + ' Years' : ''} ${patients_details?.ageMonths ? patients_details.ageMonths + ' Months' : ''}`.trim() || 'N/A';

  // Trimester labels
  const trimesterLabels = ['First Trimester', 'Second Trimester', 'Third Trimester'];

  return (
    <>
      <Drawer
        placement="bottom"
        open={visible}
        onClose={onClose}
        closable={false}
        height="85vh"
        className="mobile-anc-print-drawer"
        destroyOnClose
      >
        <div className="print-preview-container">
          {/* Header */}
          <div className="print-preview-header">
            <h3>Print ANC Scheduler</h3>
            <button className="close-btn" onClick={onClose}>
              <img src={closeIcon} alt="Close" />
            </button>
          </div>

          {/* Select All */}
          <div className="select-all-row">
            <Checkbox
              checked={selectedItems.length === allItems.length && allItems.length > 0}
              indeterminate={selectedItems.length > 0 && selectedItems.length < allItems.length}
              onChange={handleSelectAll}
            >
              Select All ({selectedItems.length}/{allItems.length})
            </Checkbox>
          </div>

          {/* Test List by Trimester */}
          <div className="print-items-list">
            {ancSchedulerData.map((trimesterList, trimesterIndex) => (
              <div key={trimesterIndex} className="trimester-section">
                <div className="trimester-header">
                  {trimesterLabels[trimesterIndex] || `Trimester ${trimesterIndex + 1}`}
                </div>
                {(trimesterList || []).map((item, index) => {
                  const { masterId, master, weekRange, status, dueDate, notes } = item;
                  return (
                    <div 
                      key={index} 
                      className={`print-item ${selectedItems.includes(masterId) ? 'selected' : ''}`}
                      onClick={() => handleItemSelect(masterId)}
                    >
                      <span onClick={(e) => e.stopPropagation()} role="presentation">
                        <Checkbox
                          checked={selectedItems.includes(masterId)}
                          onChange={() => handleItemSelect(masterId)}
                        />
                      </span>
                      <div className="item-details">
                        <span className="item-name">{master?.name}</span>
                        <div className="item-meta">
                          <span className="week-range">{weekRange?.start}-{weekRange?.end} wks</span>
                          {dueDate && (
                            <span className="due-date">
                              Due: {moment(dueDate).format('DD/MM/YY')}
                            </span>
                          )}
                          <span className={`status status-${status?.toLowerCase()}`}>{status}</span>
                        </div>
                        {notes && <span className="item-notes">{notes}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="print-preview-footer">
            <Button onClick={onClose} className="cancel-btn">
              Cancel
            </Button>
            <Button 
              type="primary" 
              onClick={handlePrint}
              loading={isPrinting}
              disabled={selectedItems.length === 0}
              className="print-btn"
              icon={<img src={printIcon} alt="print" style={{ width: 16, height: 16, marginRight: 8 }} />}
            >
              Print ({selectedItems.length})
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Hidden Printable Content */}
      <div style={{ display: 'none' }}>
        <div ref={printableRef} className="anc-print-content">
          <style>
            {`
              /* Applied always so html2pdf (html2canvas) on mobile captures styled content.
                 html2canvas does not use @media print, so styles must be in default context. */
              .anc-print-content {
                padding: 20px;
                font-family: 'Poppins', sans-serif;
                width: 100%;
                min-width: 600px;
                box-sizing: border-box;
              }
              .anc-print-content .print-header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #4b4ad5;
                padding-bottom: 15px;
              }
              .anc-print-content .print-header h1 {
                font-size: 24px;
                color: #4b4ad5;
                margin: 0 0 10px 0;
              }
              .anc-print-content .patient-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                font-size: 14px;
              }
              .anc-print-content .print-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
                table-layout: fixed;
              }
              .anc-print-content .print-table th {
                background-color: #f1f1f5;
                padding: 10px;
                text-align: left;
                font-weight: 600;
                border: 1px solid #ddd;
              }
              .anc-print-content .print-table td {
                padding: 8px 10px;
                border: 1px solid #ddd;
              }
              .anc-print-content .print-table tr:nth-child(even) {
                background-color: #f9f9f9;
              }
              @media print {
                @page { size: A4; margin: 0.5in; }
              }
            `}
          </style>
          <div className="print-header">
            <h1>ANC Scheduler</h1>
          </div>
          <div className="patient-info">
            <div><strong>Patient:</strong> {patientName}</div>
            <div><strong>Age:</strong> {patientAge}</div>
            <div><strong>Date:</strong> {moment().format('DD/MM/YYYY')}</div>
          </div>
          <table className="print-table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Week Range</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {getSelectedPrintData().map((item, index) => (
                <tr key={index}>
                  <td>{item.master?.name}</td>
                  <td>{item.weekRange?.start} - {item.weekRange?.end} weeks</td>
                  <td>{item.dueDate ? moment(item.dueDate).format('DD/MM/YYYY') : '-'}</td>
                  <td>{item.status}</td>
                  <td>{item.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default MobileAncPrintPreview;
