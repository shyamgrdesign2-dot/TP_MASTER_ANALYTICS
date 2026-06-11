import React from 'react';
import Cardiology from '../../../../components/Cardiology';
import VisitActionButtons from './VisitActionButtons';
import './VisitSummaryTab.scss';

// MOBILE OPTIMIZATION: Memoize component to prevent re-renders when props haven't changed
// Parent now provides memoized handlers, so this component can safely skip re-renders
const VisitSummaryTab = React.memo(function VisitSummaryTab({
  patient_data,
  viewCaseManagerData,
  loading,
  tcmData,
  nextPress,
  prevPress,
  isVaccinationAccessable,
  isGrowthChartAccessable,
  userId,
  onEditRx,
  onDownloadRx,
  onPrintRx,
  onPrintIconClick,
  onRepeatRx,
  onPrintMedicinesOnly,
  onCardiologyPrintHandlersReady,
}) {
  return (
    <div className="visit-summary-tab">
      <div className="summary-visit-details">
        <Cardiology
          patient_data={patient_data}
          tcmData={tcmData}
          loading={loading}
          viewCaseManagerData={viewCaseManagerData}
          nextPress={nextPress}
          prevPress={prevPress}
          onPrintHandlersReady={onCardiologyPrintHandlersReady}
        />
      </div>

      {viewCaseManagerData && (
        <VisitActionButtons
          onEdit={onEditRx}
          onDownload={onDownloadRx}
          onPrint={onPrintRx}
          onPrintIconClick={onPrintIconClick}
          onRepeatRx={onRepeatRx}
          onPrintMedicinesOnly={onPrintMedicinesOnly}
          showEdit={viewCaseManagerData?.doctor_data?.editCase}
          currentPage={tcmData?.page || 1}
          totalPages={viewCaseManagerData?.total_consultation || 1}
          viewCaseManagerData={viewCaseManagerData}
        />
      )}
    </div>
  );
});

export default VisitSummaryTab;
