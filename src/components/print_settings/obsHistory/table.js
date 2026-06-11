import React from "react";
import moment from "moment";
import { Text, View } from "@react-pdf/renderer";
import {
  getPregnancyOutcome,
  getTypeOfAbortion,
} from "../../../pages/obstetric/utils/helper";
import { getIndianLanguageFont } from "../../../utils/utils";

function ObsHistoryTableView({
  PX_TO_PT,
  styles,
  printSettings,
  options,
  obsHistoryData,
  consultationDate
}) {
  const pregnancyHistory = obsHistoryData?.pregnancyHistory || [];
  obsHistoryData = obsHistoryData?.currentPregnancy || {};
  const ancPrintEnabled = obsHistoryData?.ancHistory?.filter(
    (item) => item?.enablePrint
  );
  const immunisationPrintEnabled = obsHistoryData?.immunisationHistory?.filter(
    (item) => item?.enablePrint
  );
  const today = moment(consultationDate);
  const lmpDate = obsHistoryData?.lmp ? moment(obsHistoryData.lmp) : null;

  let gestationWeeks = null;
  let gestationDays = null;

  if (obsHistoryData?.ceed) {
    const gestationAge =
      40 * 7 -
      Math.ceil(
        Math.abs(
          moment(obsHistoryData?.ceed)
            .startOf("day")
            .diff(moment(today).startOf("day"), "days")
        )
      );

    // Convert to weeks and days
    gestationWeeks = Math.floor(gestationAge / 7);
    gestationDays = gestationAge % 7;
  } else if (lmpDate) {
    gestationWeeks = today.diff(lmpDate, "weeks");
    const adjustedLmpDate = lmpDate.clone().add(gestationWeeks, "weeks");
    gestationDays = today.diff(adjustedLmpDate, "days");
  }

  return (
    <View style={{ marginTop: PX_TO_PT * 15 }}>
      <Text
        style={[styles.lineHeight2, {
          color: "#171725",
          fontFamily: printSettings?.page_format?.font_family,
          fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
          fontWeight: 700,
          marginTop: 5,
          marginBottom: 5,
          lineHeight: 2,
        }]}
        fixed
      >
        Obstetric History&nbsp;:&nbsp;
      </Text>

      {options?.includes("gplae") && (("gravidity" in obsHistoryData &&
        obsHistoryData?.gravidity != null) || ("gravidaNumber" in obsHistoryData &&
                obsHistoryData?.gravidaNumber != null) ||
        ("parity" in obsHistoryData && obsHistoryData?.parity != null) ||
        ("livingChildren" in obsHistoryData &&
          obsHistoryData?.livingChildren != null) ||
        ("abortion" in obsHistoryData &&
          obsHistoryData?.abortion != null) ||
        ("ectopicPregnancies" in obsHistoryData &&
          obsHistoryData?.ectopicPregnancies != null) ||
        ("diagnosisNotes" in obsHistoryData &&
          obsHistoryData?.diagnosisNotes != null)) && (
        <View wrap={false} style={{ break: "avoid" }}>
          <Text
            style={{
              color: "#000",
              marginTop: PX_TO_PT * 12,
              fontFamily: printSettings?.page_format?.font_family,
              fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
              fontWeight: 500,
              padding: 6,
              borderTop: "1px solid #171725",
              borderLeft: "1px solid #171725",
              borderRight: "1px solid #171725",
              backgroundColor: "#E2E2EA",
            }}
          >
            GPLAE
          </Text>
          <View style={[styles.table, { marginTop: 0 }]}>
            {Number(obsHistoryData?.gravidity) === 1 &&
            (!obsHistoryData?.parity || Number(obsHistoryData?.parity) === 0) &&
            (!obsHistoryData?.livingChildren ||
              Number(obsHistoryData?.livingChildren) === 0) &&
            (!obsHistoryData?.abortion ||
              Number(obsHistoryData?.abortion) === 0) &&
            (!obsHistoryData?.ectopicPregnancies ||
              Number(obsHistoryData?.ectopicPregnancies) === 0) ? (
              <>
                <Text
                  style={{
                    color: "#000",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    padding: 6,
                    border: "1px solid #171725",
                  }}
                >
                  Primigravida
                </Text>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.row,
                    { alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <Text
                    style={[
                      styles.cell,
                      {
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                      },
                    ]}
                  >
                    Gravida
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                      },
                    ]}
                  >
                    Para
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                      },
                    ]}
                  >
                    Living
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                      },
                    ]}
                  >
                    Abortion
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                      },
                    ]}
                  >
                    Ectopic
                  </Text>
                </View>

                <View
                  style={[
                    styles.row,
                    { alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <Text
                    style={[
                      styles.cell,
                      {
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                      },
                    ]}
                  >
                    {"gravidity" in obsHistoryData
                      ? obsHistoryData?.gravidity?.toString().padStart(2, "0")
                      : `-`}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                      },
                    ]}
                  >
                    {"parity" in obsHistoryData
                      ? obsHistoryData?.parity?.toString()?.padStart(2, "0")
                      : `-`}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                      },
                    ]}
                  >
                    {"livingChildren" in obsHistoryData
                      ? obsHistoryData?.livingChildren
                          ?.toString()
                          ?.padStart(2, "0")
                      : `-`}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                      },
                    ]}
                  >
                    {"abortion" in obsHistoryData
                      ? obsHistoryData?.abortion?.toString()?.padStart(2, "0")
                      : `-`}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                      },
                    ]}
                  >
                    {"ectopicPregnancies" in obsHistoryData
                      ? obsHistoryData?.ectopicPregnancies
                          ?.toString()
                          ?.padStart(2, "0")
                      : `-`}
                  </Text>
                </View>
              </>
            )}

            <Text
              style={{
                color: "#000",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
                padding: 6,
                borderBottom: "1px solid #171725",
                borderRight: "1px solid #171725",
                borderLeft: "1px solid #171725",
              }}
            >
              Notes&nbsp;:&nbsp;
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: getIndianLanguageFont(obsHistoryData?.diagnosisNotes, printSettings?.page_format?.font_family),
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                  },
                ]}
              >
                {"diagnosisNotes" in obsHistoryData
                  ? obsHistoryData?.diagnosisNotes
                  : `-`}&nbsp;
              </Text>
            </Text>
          </View>
        </View>
      )}

      {options?.includes("diagnosis") && (obsHistoryData?.lmp ||
        "edd" in obsHistoryData ||
        "ceed" in obsHistoryData ||
        gestationWeeks != null ||
        gestationDays != null ||
        "blood" in obsHistoryData ||
        "husbandsBlood" in obsHistoryData ||
        "consang" in obsHistoryData ||
        "maritialStatus" in obsHistoryData ||
        ("marriageDurationYears" in obsHistoryData &&
          obsHistoryData?.marriageDurationYears != null) ||
        ("marriageDurationMonths" in obsHistoryData &&
          obsHistoryData?.marriageDurationMonths != null)) && (
        <View wrap={false} style={{ break: "avoid" }}>
          <Text
            style={[styles.lineHeight2, {
              color: "#000",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
              fontWeight: 500,
              padding: 6,
              border: "1px solid #171725",
              backgroundColor: "#E2E2EA",
            }]}
          >
            Patient Information
          </Text>
          <View style={[styles.table, { marginTop: 0 }]}>
            <View
              style={[
                styles.row,
                { alignItems: "center", justifyContent: "center" },
                styles.minHeight38
              ]}
            >
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.lineHeight2,
                ]}
              >
                LMP
              </Text>
              {!obsHistoryData?.ceed && (<Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.lineHeight2,
                ]}
              >
                E.D.D.
              </Text>)}
              {obsHistoryData?.ceed && (<Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.lineHeight2,
                ]}
              >
                C.E.E.D.
              </Text>)}
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.lineHeight2,
                ]}
              >
                Gestation
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.lineHeight2,
                ]}
              >
                Blood group
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.lineHeight2,
                ]}
              >
                Husband's blood group
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.lineHeight2,
                ]}
              >
                Consang
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.lineHeight2,
                ]}
              >
                Marital status
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.lineHeight2,
                ]}
              >
                Marriage duration
              </Text>
            </View>

            <View
              style={[
                styles.row,
                { alignItems: "center", justifyContent: "center" },
              ]}
            >
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.minHeight38,
                ]}
              >
                {obsHistoryData?.lmp
                  ? moment(obsHistoryData?.lmp).format("DD MMM YYYY")
                  : `-`}
              </Text>
              {!obsHistoryData?.ceed && (<Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.minHeight38,
                ]}
              >
                {"edd" in obsHistoryData
                  ? moment(obsHistoryData?.edd).format("DD MMM YYYY")
                  : `-`}
              </Text>)}
              {obsHistoryData?.ceed && (<Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.minHeight38,
                ]}
              >
                {"ceed" in obsHistoryData
                  ? moment(obsHistoryData?.ceed).format("DD MMM YYYY")
                  : `-`}
              </Text>)}
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.minHeight38,
                ]}
              >
                {gestationWeeks != null
                  ? `${gestationWeeks}W`
                  : ""}
                {gestationWeeks != null &&
                gestationDays != null
                  ? `,`
                  : `-`}
                {gestationDays != null
                  ? `${gestationDays}D`
                  : ""}
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.minHeight38,
                ]}
              >
                {"blood" in obsHistoryData ? obsHistoryData?.blood : `-`}
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.minHeight38,
                ]}
              >
                {"husbandsBlood" in obsHistoryData
                  ? obsHistoryData?.husbandsBlood
                  : `-`}
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.minHeight38,
                ]}
              >
                  {obsHistoryData?.consang ? `Yes` : obsHistoryData?.consang === false ? `No` : `-`}
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.minHeight38,
                ]}
              >
                {"maritialStatus" in obsHistoryData
                  ? obsHistoryData?.maritialStatus
                  : `-`}
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                    textAlign: "center",
                  },
                  styles.minHeight38,
                ]}
              >
                {"marriageDurationYears" in obsHistoryData &&
                obsHistoryData?.marriageDurationYears != null
                  ? obsHistoryData?.marriageDurationYears
                  : ``}
                {"marriageDurationYears" in obsHistoryData &&
                obsHistoryData?.marriageDurationYears != null &&
                "marriageDurationMonths" in obsHistoryData &&
                obsHistoryData?.marriageDurationMonths != null
                  ? `.`
                  : ``}
                {"marriageDurationMonths" in obsHistoryData &&
                obsHistoryData?.marriageDurationMonths != null
                  ? obsHistoryData?.marriageDurationMonths
                  : ``}
                {"marriageDurationYears" in obsHistoryData &&
                obsHistoryData?.marriageDurationYears != null &&
                "marriageDurationMonths" in obsHistoryData &&
                obsHistoryData?.marriageDurationMonths != null
                  ? ` years`
                  : "marriageDurationYears" in obsHistoryData &&
                    obsHistoryData?.marriageDurationYears != null &&
                    (!obsHistoryData.hasOwnProperty("marriageDurationMonths") ||
                      obsHistoryData?.marriageDurationMonths == null)
                  ? ` years`
                  : (!obsHistoryData.hasOwnProperty("marriageDurationYears") ||
                      obsHistoryData?.marriageDurationYears == null) &&
                    "marriageDurationMonths" in obsHistoryData &&
                    obsHistoryData?.marriageDurationMonths != null
                  ? ` months`
                  : ``}
              </Text>
            </View>
          </View>
        </View>
      )}

      {options?.includes("history") &&
        pregnancyHistory?.length > 0 && (
          <View>
            <Text
              style={{
                color: "#000",
                marginTop: PX_TO_PT * 12,
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
                padding: 6,
                border: "1px solid #171725",
                backgroundColor: "#E2E2EA",
              }}
              fixed
            >
              Pregnancy history
            </Text>
            {pregnancyHistory?.map((item, i) => {
              return (
                <View key={i} wrap={false}>
                  <View style={[styles.table, { marginTop: 0 }]}>
                    <View
                      style={[
                        styles.row,
                        { alignItems: "center", justifyContent: "center" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cell,
                          {
                            fontFamily: printSettings?.page_format?.font_family,
                            fontSize:
                              PX_TO_PT * printSettings?.page_format?.font_size,
                            fontWeight: 500,
                            color: "#000",
                            textAlign: "center",
                          },
                        ]}
                      >
                        Gravida no
                      </Text>
                      <Text
                        style={[
                          styles.cell,
                          {
                            fontFamily: printSettings?.page_format?.font_family,
                            fontSize:
                              PX_TO_PT * printSettings?.page_format?.font_size,
                            fontWeight: 500,
                            color: "#000",
                            textAlign: "center",
                          },
                        ]}
                      >
                        Outcome
                      </Text>
                      <Text
                        style={[
                          styles.cell,
                          {
                            fontFamily: printSettings?.page_format?.font_family,
                            fontSize:
                              PX_TO_PT * printSettings?.page_format?.font_size,
                            fontWeight: 500,
                            color: "#000",
                            textAlign: "center",
                          },
                        ]}
                      >
                        Term length
                      </Text>
                      {"deliveryMode" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          Delivery mode
                        </Text>
                      )}

                      {"gestationPeriod" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          Period of gestation
                        </Text>
                      )}

                      {"location" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          Location
                        </Text>
                      )}

                      {"modeOfManagement" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          Management mode
                        </Text>
                      )}

                      {"typeOfAbortion" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          Type of Miscarriage
                        </Text>
                      )}

                      {"modeOfAbortion" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          Mode of Miscarriage
                        </Text>
                      )}

                      {"dateOfDelivery" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          Delivery date
                        </Text>
                      )}

                      {"ageOfDelivery" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          Age
                        </Text>
                      )}

                      {"gender" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          Gender
                        </Text>
                      )}

                      {"babysWeight" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          Baby's weight
                        </Text>
                      )}
                    </View>

                    <View
                      style={[
                        styles.row,
                        { alignItems: "center", justifyContent: "center" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cell,
                          {
                            fontFamily: printSettings?.page_format?.font_family,
                            fontSize:
                              PX_TO_PT * printSettings?.page_format?.font_size,
                            fontWeight: 400,
                            color: "#000",
                            textAlign: "center",
                          },
                        ]}
                      >
                        {"gravidity" in item
                          ? item?.gravidity?.toString()?.padStart(2, "0")
                          : "gravidaNumber" in item
                          ? item?.gravidaNumber?.toString()?.padStart(2, "0")
                          : `-`}
                      </Text>
                      <Text
                        style={[
                          styles.cell,
                          {
                            fontFamily: printSettings?.page_format?.font_family,
                            fontSize:
                              PX_TO_PT * printSettings?.page_format?.font_size,
                            fontWeight: 400,
                            color: "#000",
                            textAlign: "center",
                          },
                        ]}
                      >
                        {"outcome" in item
                          ? getPregnancyOutcome(item?.outcome)
                          : `-`}
                      </Text>
                      <Text
                        style={[
                          styles.cell,
                          {
                            fontFamily: printSettings?.page_format?.font_family,
                            fontSize:
                              PX_TO_PT * printSettings?.page_format?.font_size,
                            fontWeight: 400,
                            color: "#000",
                            textAlign: "center",
                          },
                        ]}
                      >
                        {"termLength" in item ? item?.termLength : `-`}
                      </Text>

                      {"deliveryMode" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          {"deliveryMode" in item ? item?.deliveryMode : `-`}
                        </Text>
                      )}

                      {"gestationPeriod" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          {"gestationPeriod" in item
                            ? `${item?.gestationPeriod} ${
                                Number(item?.gestationPeriod) > 1
                                  ? "weeks"
                                  : "week"
                              }`
                            : "-"}
                        </Text>
                      )}

                      {"location" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          {"location" in item ? item?.location : `-`}
                        </Text>
                      )}

                      {"modeOfManagement" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          {"modeOfManagement" in item
                            ? item?.modeOfManagement
                            : `-`}
                        </Text>
                      )}

                      {"typeOfAbortion" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          {"typeOfAbortion" in item
                            ? getTypeOfAbortion(item?.typeOfAbortion)
                            : `-`}
                        </Text>
                      )}

                      {"modeOfAbortion" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          {"modeOfAbortion" in item
                            ? item?.modeOfAbortion
                            : `-`}
                        </Text>
                      )}

                      {"dateOfDelivery" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          {"dateOfDelivery" in item
                            ? moment(item?.dateOfDelivery).format("DD MMM YYYY")
                            : `-`}
                        </Text>
                      )}

                      {"ageOfDelivery" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          {"ageOfDelivery" in item ? item?.ageOfDelivery : `-`}
                        </Text>
                      )}

                      {"gender" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          {"gender" in item ? item?.gender : `-`}
                        </Text>
                      )}

                      {"babysWeight" in item && (
                        <Text
                          style={[
                            styles.cell,
                            {
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                              color: "#000",
                              textAlign: "center",
                            },
                          ]}
                        >
                          {"babysWeight" in item ? item?.babysWeight : ``}
                          {"babysWeight" in item ? `kgs` : `-`}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text
                    style={{
                      color: "#000",
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize:
                        PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 500,
                      padding: 6,
                      borderBottom: "1px solid #171725",
                      borderLeft: "1px solid #171725",
                      borderRight: "1px solid #171725",
                    }}
                  >
                    Notes&nbsp;:&nbsp;
                    <Text
                      style={[
                        styles.cell,
                        {
                          fontFamily: getIndianLanguageFont(item?.remarks, printSettings?.page_format?.font_family),
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                          color: "#000",
                        },
                      ]}
                    >
                      {"remarks" in item ? item?.remarks : `-`}&nbsp;
                    </Text>
                  </Text>
                </View>
              );
            })}
          </View>
        )}

      {options?.includes("examination") && obsHistoryData?.examinationHistory?.length > 0 && (
        <View>
          <Text
            style={{
              color: "#000",
              marginTop: PX_TO_PT * 12,
              fontFamily: printSettings?.page_format?.font_family,
              fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
              fontWeight: 500,
              padding: 6,
              border: "1px solid #171725",
              backgroundColor: "#E2E2EA",
            }}
            fixed
          >
            Examination
          </Text>
          {obsHistoryData?.examinationHistory.map((item, i) => (
            <View key={i}>
              <View style={[styles.table, { marginTop: 0 }]}>
                <View
                  style={[
                    styles.row,
                    { alignItems: "center", justifyContent: "center" },
                  ]}
                  fixed
                >
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 1.1,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                        height: "100%"
                      },
                    ]}
                  >
                    Date
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.6,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                        height: "100%"
                      },
                    ]}
                  >
                    Pallor
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.8,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                        height: "100%"
                      },
                    ]}
                  >
                    Oedema
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.7,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                        height: "100%"
                      },
                    ]}
                  >
                    Height
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.7,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                        height: "100%"
                      },
                    ]}
                  >
                    Weight
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.7,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                        height: "100%"
                      },
                    ]}
                  >
                    BMI
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.9,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                        height: "100%"
                      },
                    ]}
                  >
                    BP
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.8,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                        height: "100%"
                      },
                    ]}
                  >
                    Fundus
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 1.2,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                        height: "100%"
                      },
                    ]}
                  >
                    Presentation
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.8,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                        height: "100%"
                      },
                    ]}
                  >
                    Liquor
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.7,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                        color: "#000",
                        textAlign: "center",
                        height: "100%"
                      },
                    ]}
                  >
                    FHR
                  </Text>
                </View>

                <View
                  style={[
                    styles.row,
                    { alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 1.1,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                        height: "100%",
                      },
                    ]}
                  >
                    {item?.date ? moment(item?.date).format("DD MMM YYYY") : ""}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.6,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                        height: "100%",
                      },
                    ]}
                  >
                    {Boolean(item?.pallor) ? `Yes` : `No`}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.8,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                        height: "100%",
                      },
                    ]}
                  >
                    {Boolean(item?.oedema) ? `Yes` : `No`}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.7,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                        height: "100%",
                      },
                    ]}
                  >
                    {"mothersHeight" in item ? item?.mothersHeight : ``}
                    {"mothersHeight" in item ? ` cm` : `-`}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.7,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                        height: "100%",
                      },
                    ]}
                  >
                    {"mothersWeight" in item ? item?.mothersWeight : ``}
                    {"mothersWeight" in item ? ` kg` : `-`}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.7,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                        height: "100%",
                      },
                    ]}
                  >
                    {"mothersBMI" in item ? item?.mothersBMI : ``}
                    {"mothersBMI" in item ? ` kg/m2` : `-`}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.9,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                        height: "100%",
                      },
                    ]}
                  >
                    {"systolic" in item ? item?.systolic : ``}
                    {"systolic" in item && "diastolic" in item ? `/` : `-`}
                    {"diastolic" in item ? item?.diastolic : ``}
                    {"systolic" in item || "diastolic" in item ? ` mmHg` : ``}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.8,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                        height: "100%",
                      },
                    ]}
                  >
                    {"heightOfFundus" in item ? item?.heightOfFundus : ``}
                    {"heightOfFundus" in item && "heightOfFundusUnit" in item
                      ? ` ${item?.heightOfFundusUnit}`
                      : `-`}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 1.2,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                        height: "100%",
                      },
                    ]}
                  >
                    {"presentation" in item ? item?.presentation : `-`}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.8,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                        height: "100%",
                      },
                    ]}
                  >
                    {"liquor" in item ? item?.liquor : `-`}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      {
                        flex: 0.7,
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                        color: "#000",
                        textAlign: "center",
                        height: "100%",
                      },
                    ]}
                  >
                    {"foetalHeartRate" in item ? item?.foetalHeartRate : ``}
                    {"foetalHeartRate" in item ? ` BPM` : `-`}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  color: "#000",
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                  padding: 6,
                  borderBottom: "1px solid #171725",
                  borderLeft: "1px solid #171725",
                  borderRight: "1px solid #171725",
                }}
                wrap={false}
              >
                Notes&nbsp;:&nbsp;
                <Text
                  style={[
                    styles.cell,
                    {
                      fontFamily: getIndianLanguageFont(item?.notes, printSettings?.page_format?.font_family),
                      fontSize:
                        PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 400,
                      color: "#000",
                    },
                  ]}
                >
                  {"notes" in item ? item?.notes : `-`}&nbsp;
                </Text>
              </Text>
            </View>
          ))}
        </View>
      )}
      {options?.includes("ancHistory") && ancPrintEnabled?.length > 0 && (
        <View>
          <Text
            style={{
              color: "#000",
              marginTop: PX_TO_PT * 12,
              fontFamily: printSettings?.page_format?.font_family,
              fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
              fontWeight: 500,
              padding: 6,
              border: "1px solid #171725",
              backgroundColor: "#E2E2EA",
              // minHeight: '100%'
            }}
            wrap={false}
            fixed
          >
            ANC Scheduler
          </Text>
          <View style={[styles.table, { marginTop: 0 }]}>
            <View style={styles.row} fixed>
              <Text
                style={[
                  styles.cell,
                  {
                    flex: 1.3,
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                ]}
              >
                Test Name
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    flex: 0.6,
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                ]}
              >
                Due Date
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    flex: 0.6,
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                ]}
              >
                Status
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    flex: 1.3,
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                ]}
              >
                Remarks
              </Text>
            </View>
            {ancPrintEnabled?.map((item, i) => {
              if (item?.enablePrint) {
                return (
                  <View style={styles.row} key={i} wrap={false}>
                    <Text
                      style={[
                        styles.cell,
                        {
                          flex: 1.3,
                          color: "#171725",
                          fontFamily: getIndianLanguageFont(item?.master?.name, printSettings?.page_format?.font_family),
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                          textAlign: "center",
                        },
                      ]}
                    >
                      {item?.master?.name ?? ""}&nbsp;
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        {
                          flex: 0.6,
                          color: "#171725",
                          fontFamily: printSettings?.page_format?.font_family,
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                          textAlign: "center",
                        },
                      ]}
                    >
                      {item?.dueDate
                        ? moment(item?.dueDate).format("DD/MM/YYYY")
                        : "-"}
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        {
                          flex: 0.6,
                          color: "#171725",
                          fontFamily: printSettings?.page_format?.font_family,
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                          textAlign: "center",
                        },
                      ]}
                    >
                      {item?.status ?? "-"}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        {
                          flex: 1.3,
                          color: "#171725",
                          fontFamily: getIndianLanguageFont(item?.notes, printSettings?.page_format?.font_family),
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                          textAlign: "center",
                        },
                      ]}
                    >
                      {item?.notes ?? "-"}&nbsp;
                    </Text>
                  </View>
                );
            }})}
          </View>
        </View>
      )}

      {options?.includes("immunisationHistory") && immunisationPrintEnabled?.length > 0 && (
        <View>
          <Text
            style={{
              color: "#000",
              marginTop: PX_TO_PT * 12,
              fontFamily: printSettings?.page_format?.font_family,
              fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
              fontWeight: 500,
              padding: 6,
              border: "1px solid #171725",
              backgroundColor: "#E2E2EA",
            }}
            wrap={false}
            fixed
          >
            Immunisation Vaccine
          </Text>
          <View style={[styles.table, { marginTop: 0 }]}>
            <View style={styles.row} fixed>
              <Text
                style={[
                  styles.cell,
                  {
                    flex: 1,
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                ]}
              >
                Vaccine Name
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    flex: 0.5,
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                ]}
              >
                Status
              </Text>
              <Text
                style={[
                  styles.cell,
                  {
                    flex: 1.5,
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                    textAlign: "center",
                  },
                ]}
              >
                Remarks
              </Text>
            </View>
            {immunisationPrintEnabled?.map((item, i) => {
              if (item?.enablePrint) {
                return (
                  <View style={styles.row} key={i} wrap={false}>
                    <Text
                      style={[
                        styles.cell,
                        {
                          flex: 1,
                          color: "#171725",
                          fontFamily: printSettings?.page_format?.font_family,
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                          textAlign: "center",
                        },
                      ]}
                    >
                      {item?.master?.name ?? ""}
                    </Text>
                    <Text
                      style={[
                        styles.cell,
                        {
                          flex: 0.5,
                          color: "#171725",
                          fontFamily: printSettings?.page_format?.font_family,
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                          textAlign: "center",
                        },
                      ]}
                    >
                      {item?.status === "Given" && item?.givenDate
                        ? `Given on ${moment(item?.givenDate).format(
                            "DD/MM/YYYY"
                          )}`
                        : item?.status}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        {
                          flex: 1.5,
                          color: "#171725",
                          fontFamily: getIndianLanguageFont(item?.notes, printSettings?.page_format?.font_family),
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                          textAlign: "center",
                        },
                      ]}
                    >
                      {item?.notes ?? "-"}&nbsp;
                    </Text>
                  </View>
                )}
            })}
          </View>
        </View>
      )}
    </View>
  );
}

export default ObsHistoryTableView;
