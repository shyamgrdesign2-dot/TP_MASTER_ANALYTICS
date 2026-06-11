import React, { useState } from 'react';

import { isValidMongoId } from '../../../../utils/utils';
import PrintOptionsModal from './PrintOptionsModal';
import './VisitActionButtons.scss';
import { ASSETS } from "../../../../assets";
const {
  edit2_2: editIcon,
  arrowDownload: downloadIcon,
  print: printIcon,
  repeat: repeatIcon,
} = ASSETS.mobile;

function VisitActionButtons({
  onEdit,
  onDownload,
  onPrint,
  onPrintIconClick,
  onRepeatRx,
  onPrintMedicinesOnly,
  showEdit = true,
  currentPage = 1,
  totalPages = 1,
  viewCaseManagerData,
  hidePageNumber = false,
  skipPrintModal = false,
}) {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const formatPageNumber = (page, total) => {
    const formattedPage = String(page).padStart(2, '0');
    const formattedTotal = String(total).padStart(2, '0');
    return `${formattedPage}/${formattedTotal}`;
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    if (onEdit && typeof onEdit === 'function') {
      onEdit();
    }
  };

  const handleDownloadClick = (e) => {
    e.preventDefault();
    if (onDownload && typeof onDownload === 'function') {
      onDownload();
    }
  };

  const handlePrintClick = (e) => {
    e.preventDefault();
    if (onPrintIconClick && typeof onPrintIconClick === 'function') {
      onPrintIconClick();
    }
    if (skipPrintModal) {
      if (onPrint && typeof onPrint === 'function') {
        onPrint();
      }
    } else {
      setIsPrintModalOpen(true);
    }
  };

  const handleRepeatRxClick = (e) => {
    e.preventDefault();
    if (onRepeatRx && typeof onRepeatRx === 'function') {
      onRepeatRx();
    }
  };

  const handlePrintFromModal = () => {
    if (onPrint && typeof onPrint === 'function') {
      onPrint();
    }
  };

  const handlePrintMedicinesOnlyFromModal = () => {
    if (onPrintMedicinesOnly && typeof onPrintMedicinesOnly === 'function') {
      onPrintMedicinesOnly();
    }
  };

  const handleClosePrintModal = () => {
    setIsPrintModalOpen(false);
  };

  const smartPrescriptionFilename = viewCaseManagerData?.smart_prescription_filename;
  const isSmartRxFile = smartPrescriptionFilename?.includes('.jpeg');
  const isSnapRx = smartPrescriptionFilename?.includes('snap_rx');
  const isVoiceRx = isValidMongoId(smartPrescriptionFilename);

  const showPrintMedicinesOnly = !isVoiceRx && (!isSmartRxFile && !isSnapRx);

  const shouldShowEdit = showEdit && !isSmartRxFile && isVoiceRx;

  const shouldShowPrint = true;

  const shouldShowRepeatRx = isVoiceRx;

  return (
    <div className="visit-action-buttons">
      <div className="action-buttons-row">
        {shouldShowEdit && (
          <button
            className="action-button icon-button"
            onClick={handleEditClick}
            type="button"
            aria-label="Edit"
          >
            <img src={editIcon} alt="Edit" />
          </button>
        )}
        
        <button
          className="action-button icon-button"
          onClick={handleDownloadClick}
          type="button"
          aria-label="Download"
        >
          <img src={downloadIcon} alt="Download" />
        </button>
        
        {shouldShowPrint && (
          <button
            className="action-button icon-button"
            onClick={handlePrintClick}
            type="button"
            aria-label="Print"
          >
            <img src={printIcon} alt="Print" />
          </button>
        )}
        
        {shouldShowRepeatRx && (
          <button
            className="action-button repeat-button"
            onClick={handleRepeatRxClick}
            type="button"
            aria-label="Repeat Rx"
          >
            <img src={repeatIcon} alt="Repeat" className="repeat-icon" />
            <span className="repeat-text">Repeat Rx</span>
          </button>
        )}
      </div>

      {!hidePageNumber && (
        <div className="page-number-display">
          {formatPageNumber(currentPage, totalPages)}
        </div>
      )}

      <PrintOptionsModal
        visible={isPrintModalOpen}
        onClose={handleClosePrintModal}
        onPrintClick={handlePrintFromModal}
        onPrintMedicinesOnlyClick={handlePrintMedicinesOnlyFromModal}
        showPrintMedicinesOnly={showPrintMedicinesOnly}
      />
    </div>
  );
}

export default VisitActionButtons;

