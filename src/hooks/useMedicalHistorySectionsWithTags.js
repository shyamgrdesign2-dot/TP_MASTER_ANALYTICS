import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { listSectionwithTag } from "../redux/medicalhistorySlice";

/**
 * Fetches medical history sections with tags via Redux (listSectionwithTag).
 * Returns same shape as before: { data, isLoading, error, refetch } for drop-in replacement.
 */
export function useMedicalHistorySectionsWithTags(options = {}) {
  const dispatch = useDispatch();
  const { defaultList = [], loading } = useSelector((state) => ({
    defaultList: state.medicalhistory?.defaultList ?? [],
    loading: state.medicalhistory?.loading ?? false,
  }));

  const enabled = options.enabled !== false;

  useEffect(() => {
    if (enabled) {
      dispatch(listSectionwithTag());
    }
  }, [dispatch, enabled]);

  const refetch = () => dispatch(listSectionwithTag());

  return {
    data: defaultList,
    isLoading: loading,
    error: null,
    refetch,
  };
}

