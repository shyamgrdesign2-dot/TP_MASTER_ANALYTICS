import moment from "moment";

export const dummyData = {
  datasets: [
    {
      key: "P3",
      label: "P 03",
      borderColor: "rgba(240, 69, 69, 0.3)",
      backgroundColor: "rgba(240, 69, 69, 1)",
      fill: true,
      pointRadius: 0, // Remove points
      pointHoverRadius: 0, // Remove points on hover
      hidden: false,
    },
    {
      key: "P10",
      label: "P 10",
      borderColor: "rgba(75, 74, 213, 0.3)",
      backgroundColor: "rgba(75, 74, 213, 1)",
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 0,
      hidden: false,
    },
    {
      key: "P50",
      label: "P 50",
      borderColor: "rgba(25, 187, 122, 0.3)",
      backgroundColor: "rgba(25, 187, 122, 1)",
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 0,
      hidden: false,
    },
    {
      key: "P90",
      label: "P 90",
      borderColor: "rgba(186, 125, 233, 0.3)",
      backgroundColor: "rgba(164, 97, 216, 1)",
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 0,
      hidden: false,
    },
    {
      key: "P97",
      label: "P 97",
      borderColor: "rgba(237, 138, 0, 0.3)",
      backgroundColor: "rgba(237, 138, 0, 1)",
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 0,
      hidden: false,
    },
  ],
};

export const getGrowthChartData = (
  growthChartData,
  DOB,
  patientAgeInMonths
) => {
  return growthChartData.reduce(
    (acc, entry, index) => {
      const createdDate = moment(entry.tcbc_created_date);
      const monthsDiff = createdDate.diff(DOB, "months");

      if (patientAgeInMonths > 60) {
        if (monthsDiff <= 60) {
          return acc;
        }
      } else if (patientAgeInMonths >= 24) {
        if (monthsDiff < 24) {
          return acc;
        }
      }

      acc.Height.push({
        x: monthsDiff,
        y: entry.height,
        isMalnutrition:
          index && entry.height > growthChartData[index - 1].height,
        data: entry,
      });
      acc.Weight.push({
        x: monthsDiff,
        y: entry.weight,
        isMalnutrition:
          index && entry.weight > growthChartData[index - 1].weight,
        data: entry,
      });
      acc.BMI.push({
        x: monthsDiff,
        y: entry.bmi,
        isMalnutrition: index && entry.bmi > growthChartData[index - 1].bmi,
        data: entry,
      });
      acc.OFC.push({
        x: monthsDiff,
        y: entry.ofc,
        isMalnutrition: index && entry.ofc > growthChartData[index - 1].ofc,
        data: entry,
      });
      acc.HeightVsWeight.push({
        x: entry.height,
        y: entry.weight,
        isMalnutrition:
          index && entry.weight > growthChartData[index - 1].weight,
        data: entry,
      });

      return acc;
    },
    {
      Height: [],
      Weight: [],
      BMI: [],
      OFC: [],
      HeightVsWeight: [],
    }
  );
};

export const getOrdinalSuffix = (n) => {
  const s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const getAge = (tcbcCreatedDate, patientDOB) => {
  const createdDate = moment(tcbcCreatedDate);
  const DOB = moment(patientDOB, "YYYY-MM-DD");

  // Difference in years
  const diffInYears = createdDate.diff(DOB, "years");
  const tempDate = DOB.clone().add(diffInYears, "years");

  // Difference in months after subtracting the years
  const diffInMonths = createdDate.diff(tempDate, "months");
  tempDate.add(diffInMonths, "months");

  // Difference in weeks after subtracting the months
  const diffInWeeks = createdDate.diff(tempDate, "weeks");
  tempDate.add(diffInWeeks, "weeks");

  if (diffInYears) {
    return `${getOrdinalSuffix(diffInYears)} Year`;
  } else if (diffInMonths) {
    return `${getOrdinalSuffix(diffInMonths)} Month`;
  } else {
    return `${getOrdinalSuffix(diffInWeeks)} Week`;
  }
};

export const getMidParentalHeight = (fatherHeight, motherHeight) => {
  const maleChildHeight = (fatherHeight + motherHeight + 13) / 2;
  const femaleChildHeight = (fatherHeight + motherHeight - 13) / 2;

  return {
    maleChildHeight,
    femaleChildHeight,
  };
};
export const graphsToPrintData = [
  {
    id: "Height",
    label: "Height",
    isPrintEnabled: true,
  },
  {
    id: "Weight",
    label: "Weight",
    isPrintEnabled: true,
  },
  {
    id: "BMI",
    label: "BMI",
    isPrintEnabled: true,
  },
  {
    id: "OFC",
    label: "OFC",
    isPrintEnabled: true,
  },
  {
    id: "HeightVsWeight",
    label: "Height Vs Weight",
    isPrintEnabled: true,
  },
];

export const UNITS = {
  Height: "cm",
  Weight: "kg",
  BMI: "kg/m2",
  OFC: "cm",
};

export const ageIntervals = {
  "0To2": 2,
  "2To5": 4,
  "5To18": 6,
};

export const getAgeInMonths = (patientDOB) => {
  const today = moment(new Date());
  return today.diff(patientDOB, "months");
};

export const disableFutureDates = (current) => {
  return current && current >= moment().add(1, "days").startOf("day");
};
