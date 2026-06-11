import { ABORTION, MISCARRIAGE } from "../../../utils/constants";

export const isNumberCheck = (e) => {
  const { value } = e.target;
  const reg = /^[0-9]*$/;
  if (reg.test(value) || value === "") {
    return true;
  }
  return false;
};

export const isNumberCheckWithHyphen = (e) => {
  const { value } = e.target;
  const reg = /^[0-9-]*$/; // regex to accept numbers and hyphen
  if (reg.test(value) || value === "") {
    return true;
  }
  return false;
};

export const isDecimalCheck = (e) => {
  const { value } = e.target;
  const reg = /^[0-9]*\.?[0-9]*$/;
  if (reg.test(value) || value === "") {
    return true;
  }
  return false;
};

export const isPrimigravida = (pastPregnancyData) => {
  const gravidityValue = pastPregnancyData?.find(
    (item) => item.key === "gravidity"
  )?.value;
  const otherValuesEmpty = pastPregnancyData?.every((item) => {
    if (item.key !== "gravidity") {
      return [0, "0", "", null, undefined].includes(item.value);
    }
    return true;
  });

  return gravidityValue == 1 && otherValuesEmpty;
};

export const getPregnancyOutcome = (outcome) => {
  return outcome === ABORTION ? MISCARRIAGE : outcome;
};

export const getTypeOfAbortion = (typeOfAbortion) => {
  return typeOfAbortion === "Missed abortion"
    ? "Missed Miscarriage"
    : typeOfAbortion;
};

export const updateEnablePrint = (ancHistory) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0); // Start of today (12:00 AM)
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999); // End of today (11:59 PM)

  // removing Deleted Entry
  const updatedAncHistory = ancHistory?.filter((item) => !item?.deleted);

  return updatedAncHistory.map((item) => {
    const modifiedAt = new Date(item.modifiedAt);

    // Check if updated_at is within today's range
    if (
      modifiedAt >= todayStart &&
      modifiedAt <= todayEnd &&
      item.enablePrint
    ) {
      return { ...item, enablePrint: true };
    } else {
      return { ...item, enablePrint: false };
    }
  });
};

export const splitByTrimester = (data) => {
  const firstTrimester = data?.filter(
    (item) => item?.weekRange?.start >= 1 && item?.weekRange?.start <= 12
  );
  const secondTrimester = data?.filter(
    (item) => item.weekRange?.start >= 13 && item?.weekRange?.start <= 27
  );
  const thirdTrimester = data?.filter((item) => item?.weekRange?.start >= 28);

  return [firstTrimester, secondTrimester, thirdTrimester];
};

export function mergeDefaultAndDoctorList(
  arrayData,
  defaultData,
  ancDoctorList,
  userId,
  isAncScheduler
) {
  // Start with a copy of the existing arrayData
  const updatedArrayData = [...arrayData];

  // Loop through defaultData and check if each item is present in arrayData
  defaultData.forEach((defaultItem) => {
    const isPresent = arrayData.some(
      (arrayItem) =>
        arrayItem.masterId === defaultItem.id &&
        arrayItem.master.name === defaultItem.name
    );

    // If not present, add it to updatedArrayData
    if (!isPresent) {
      const updatedObject = {
        masterId: defaultItem.id,
        master: {
          name: defaultItem.name,
          default: true,
        },
        status: "Due",
        notes: null,
        enablePrint: false,
        createdAt: new Date().toISOString(),
        createdBy: userId,
        modifiedAt: new Date().toISOString(),
        modifiedBy: userId,
      };

      // Conditionally add weekRange if it should be included
      if (isAncScheduler) {
        updatedObject.weekRange = {
          start: defaultItem.weekRange.start,
          end: defaultItem.weekRange.end,
        };
        updatedObject.dueDate = null;
      } else {
        updatedObject.givenDate = null;
        updatedObject.dueDate = null;
      }
      updatedArrayData.push(updatedObject);
    }
  });

  ancDoctorList.forEach((defaultItem) => {
    const isPresent = arrayData.some(
      (arrayItem) =>
        arrayItem.masterId === defaultItem.id &&
        arrayItem.master.name === defaultItem.name
    );

    // If not present, add it to updatedArrayData
    if (
      !isPresent &&
      defaultItem.id &&
      defaultItem?.weekRange?.start &&
      defaultItem?.weekRange?.end
    ) {
      const updatedObject = {
        masterId: defaultItem.id,
        master: {
          name: defaultItem.name,
          default: false,
        },
        status: "Due",
        notes: null,
        enablePrint: false,
        createdAt: new Date().toISOString(),
        createdBy: userId,
        modifiedAt: new Date().toISOString(),
        modifiedBy: userId,
      };

      // Conditionally add weekRange if it should be included
      if (isAncScheduler) {
        updatedObject.weekRange = {
          start: defaultItem.weekRange.start,
          end: defaultItem.weekRange.end,
        };
        updatedObject.dueDate = null;
      } else {
        updatedObject.givenDate = null;
        updatedObject.dueDate = null;
      }
      updatedArrayData.push(updatedObject);
    }
  });

  return updatedArrayData;
}
