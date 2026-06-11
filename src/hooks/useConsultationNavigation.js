import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { listConsultations } from "../redux/caseManagerSlice";

/**
 * Custom hook to manage consultation navigation with pagination
 * @param {string} patientUniqueId - Patient unique ID
 * @param {Object} consultationsFromRedux - Consultations data from Redux (with consultations array and pagination)
 * @returns {Object} Navigation state and functions
 */
export const useConsultationNavigation = (
  patientUniqueId,
  consultationsFromRedux,
) => {
  const dispatch = useDispatch();

  // State for accumulated consultations across all pages
  const [allConsultations, setAllConsultations] = useState([]);

  // Current consultation index (0-based)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Current page number (1-based)
  const [currentPage, setCurrentPage] = useState(1);

  // Loading state for fetching next page
  const [isLoadingNextPage, setIsLoadingNextPage] = useState(false);

  // Total records from pagination
  const [totalRecords, setTotalRecords] = useState(0);

  // Ref to track pending index update after fetching next page
  const pendingNextIndexRef = useRef(null);

  // Initialize consultations when Redux data is available
  useEffect(() => {
    if (
      consultationsFromRedux?.consultations &&
      consultationsFromRedux.consultations.length > 0
    ) {
      const fetchedPage = consultationsFromRedux.pagination?.currentPage || 1;
      const isFirstPage = fetchedPage === 1;

      // If this is the first page, replace all consultations
      if (isFirstPage) {
        setAllConsultations(consultationsFromRedux.consultations);
        setTotalRecords(
          consultationsFromRedux.pagination?.totalRecords ||
            consultationsFromRedux.consultations.length,
        );
        setCurrentPage(1);
        setCurrentIndex(0);
      } else if (fetchedPage === currentPage + 1) {
        // For subsequent pages, append new consultations
        setAllConsultations((prev) => {
          const existingIds = new Set(prev.map((c) => c.tcm_id));
          const newConsultations = consultationsFromRedux.consultations.filter(
            (c) => !existingIds.has(c.tcm_id),
          );
          return [...prev, ...newConsultations];
        });
        setCurrentPage(fetchedPage);
        if (pendingNextIndexRef.current !== null) {
          setCurrentIndex(pendingNextIndexRef.current);
          pendingNextIndexRef.current = null;
        }
      }
    } else {
      setAllConsultations([]);
      setTotalRecords(0);
      setCurrentPage(1);
      setCurrentIndex(0);
    }
  }, [
    consultationsFromRedux,
    currentPage,
    allConsultations.length,
    patientUniqueId,
  ]);

  // Fetch next page of consultations
  const fetchNextPage = useCallback(async () => {
    if (!patientUniqueId || isLoadingNextPage) return;

    const nextPage = currentPage + 1;
    const totalPages = consultationsFromRedux?.pagination?.totalPages || 1;

    // Check if there are more pages to fetch
    if (nextPage > totalPages) {
      return; // No more pages
    }

    setIsLoadingNextPage(true);
    try {
      await dispatch(
        listConsultations({
          patient_unique_id: patientUniqueId,
          limit: 10,
          page: nextPage,
        }),
      );
      // Don't update currentPage here - let the useEffect handle it based on pagination.currentPage
    } catch (error) {
      console.error("Error fetching next page of consultations:", error);
    } finally {
      setIsLoadingNextPage(false);
    }
  }, [
    patientUniqueId,
    currentPage,
    consultationsFromRedux?.pagination?.totalPages,
    dispatch,
    isLoadingNextPage,
  ]);

  // Handle next consultation
  const handleNext = useCallback(() => {
    const nextIndex = currentIndex + 1;

    // If we're at the last consultation of current array, fetch next page
    if (nextIndex >= allConsultations.length) {
      const totalPages = consultationsFromRedux?.pagination?.totalPages || 1;
      if (currentPage < totalPages) {
        // Store the pending index - it will be applied when consultations are added
        pendingNextIndexRef.current = nextIndex;
        // Fetch next page - the useEffect will append new consultations and update index
        fetchNextPage();
      }
    } else {
      // Navigate to next consultation
      setCurrentIndex(nextIndex);
    }
  }, [
    currentIndex,
    allConsultations.length,
    currentPage,
    consultationsFromRedux?.pagination?.totalPages,
    fetchNextPage,
  ]);

  // Handle previous consultation
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  // Get current consultation
  const currentConsultation = allConsultations[currentIndex] || null;

  // Check if we're at the first consultation
  const isFirstConsultation = currentIndex === 0;

  // Check if we're at the last consultation
  const isLastConsultation =
    currentIndex >= allConsultations.length - 1 &&
    currentPage >= (consultationsFromRedux?.pagination?.totalPages || 1);

  // Total consultations count (from pagination or array length)
  const totalConsultations = totalRecords || allConsultations.length;

  return {
    currentConsultation,
    currentIndex,
    totalConsultations,
    allConsultations,
    handleNext,
    handlePrev,
    isFirstConsultation,
    isLastConsultation,
    isLoadingNextPage,
    // Current page display: currentIndex + 1 / totalConsultations
    currentPageDisplay:
      allConsultations.length > 0
        ? `${currentIndex + 1}/${totalConsultations}`
        : "0/0",
  };
};
