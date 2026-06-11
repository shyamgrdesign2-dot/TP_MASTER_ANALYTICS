import moment from "moment";
import { useEffect, useState } from "react";
import { getAllGrowthChartParams, getGrowthChartImages, getTodayGrowthChartParams } from "./service";
import { useAccess } from "../vaccination/useAccess";
import dayjs from "dayjs";

export const useGrowthChart = (caseManagerData) => {
  const { isGrowthChartAccessable } = useAccess(
    caseManagerData?.patient_data?.patient_age
  );
  const [growthChartData, setGrowthChartData] = useState([]);
  const [todayGrowthChartData, setTodayGrowthChartData] = useState([]);
  const [growthChartImageData, setGrowthChartImageData] = useState({});

  useEffect(() => {
    if (isGrowthChartAccessable) {
      getGrowthChartDetails();
      getTodayGrowthChartDetails();
    }
  }, []);

  const getGrowthChartDetails = async () => {
    const allGrowthChartParams = await getAllGrowthChartParams({
      pm_id: caseManagerData?.patient_data?.pm_id || 0,
      pm_pid: caseManagerData?.patient_data?.patient_id || 0,
    });
    if (
      allGrowthChartParams &&
      allGrowthChartParams.find(
        (p) =>
          Math.abs(
            (new Date(p.tcbc_created_date).getTime() - new Date().getTime()) /
              86400000
          ) < 1.5
      )
    ) {
      setGrowthChartData(allGrowthChartParams);
      getGrowthChartImageData();
    }
  };

    const getTodayGrowthChartDetails = async () => {
      const today = dayjs().format("YYYY-MM-DD");
      const todayGrowthChartParams = await getTodayGrowthChartParams({
        pm_id: caseManagerData?.patient_data?.pm_id || 0,
        pm_pid: caseManagerData?.patient_data?.patient_id || 0,
        date: today,
        source: "GROWTH_CHART",
      });
        setTodayGrowthChartData(todayGrowthChartParams);
    };

  const getGrowthChartImageData = async () => {
    const growthChartImageData = await getGrowthChartImages({
      pm_id: caseManagerData?.patient_data?.pm_id || 0,
      pm_pid: caseManagerData?.patient_data?.patient_id || 0,
    });
    setGrowthChartImageData(growthChartImageData);
  };

  return {
    growthChartData,
    growthChartImageData,
    todayGrowthChartData,
    getGrowthChartDetails,
  };
};
