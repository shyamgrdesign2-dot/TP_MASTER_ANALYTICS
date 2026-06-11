import React from "react";
import moment from "moment";
import { Text, View } from "@react-pdf/renderer";
import {
  getPregnancyOutcome,
  getTypeOfAbortion,
} from "../../../pages/obstetric/utils/helper";
import { getIndianLanguageFont } from "../../../utils/utils";

function ObsHistoryInlineView({
  PX_TO_PT,
  printSettings,
  options,
  obsHistoryData,
  consultationDate
}) {
  const pregnancyHistory = obsHistoryData?.pregnancyHistory || [];
  obsHistoryData = obsHistoryData?.currentPregnancy || {};
  const ancPrintEnabled = obsHistoryData?.ancHistory?.filter((item) => item?.enablePrint);
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
        style={{
          color: "#171725",
          fontFamily: printSettings?.page_format?.font_family,
          fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
          fontWeight: 700,
          marginTop: 5,
        }}
        fixed
      >
        Obstetric History&nbsp;:&nbsp;
      </Text>

      {options?.includes("gplae") && (
        <View>
          <Text style={{ marginTop: PX_TO_PT * 6, lineHeight: 1.4 }}>
            {(("gravidity" in obsHistoryData &&
              obsHistoryData?.gravidity != null) ||
              ("parity" in obsHistoryData && obsHistoryData?.parity != null) ||
              ("livingChildren" in obsHistoryData &&
                obsHistoryData?.livingChildren != null) ||
              ("abortion" in obsHistoryData &&
                obsHistoryData?.abortion != null) ||
              ("ectopicPregnancies" in obsHistoryData &&
                obsHistoryData?.ectopicPregnancies != null) ||
              ("diagnosisNotes" in obsHistoryData &&
                obsHistoryData?.diagnosisNotes != null)) && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  GPLAE&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  (
                </Text>

                {Number(obsHistoryData?.gravidity) === 1 &&
                (!obsHistoryData?.parity ||
                  Number(obsHistoryData?.parity) === 0) &&
                (!obsHistoryData?.livingChildren ||
                  Number(obsHistoryData?.livingChildren) === 0) &&
                (!obsHistoryData?.abortion ||
                  Number(obsHistoryData?.abortion) === 0) &&
                (!obsHistoryData?.ectopicPregnancies ||
                  Number(obsHistoryData?.ectopicPregnancies) === 0) ? (
                  <>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                      }}
                    >
                      Primigravida
                    </Text>

                    {"diagnosisNotes" in obsHistoryData &&
                      obsHistoryData?.diagnosisNotes != null && (
                        <Text
                          style={{
                            color: "#171725",
                            fontFamily: printSettings?.page_format?.font_family,
                            fontSize:
                              PX_TO_PT * printSettings?.page_format?.font_size,
                            fontWeight: 400,
                          }}
                        >
                          &nbsp;|&nbsp;
                        </Text>
                      )}
                  </>
                ) : (
                  <>
                    {"gravidity" in obsHistoryData &&
                      obsHistoryData?.gravidity != null && (
                        <>
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                            }}
                          >
                            Gravida&nbsp;:&nbsp;
                          </Text>
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                            }}
                          >
                            {obsHistoryData?.gravidity
                              ?.toString()
                              .padStart(2, "0")}
                          </Text>
                          {(("parity" in obsHistoryData &&
                            obsHistoryData?.parity != null) ||
                            ("livingChildren" in obsHistoryData &&
                              obsHistoryData?.livingChildren != null) ||
                            ("abortion" in obsHistoryData &&
                              obsHistoryData?.abortion != null) ||
                            ("ectopicPregnancies" in obsHistoryData &&
                              obsHistoryData?.ectopicPregnancies != null) ||
                            ("diagnosisNotes" in obsHistoryData &&
                              obsHistoryData?.diagnosisNotes != null)) && (
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              &nbsp;|&nbsp;
                            </Text>
                          )}
                        </>
                      )}

                    {"parity" in obsHistoryData &&
                      obsHistoryData?.parity != null && (
                        <>
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                            }}
                          >
                            Para&nbsp;:&nbsp;
                          </Text>
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                            }}
                          >
                            {obsHistoryData?.parity
                              ?.toString()
                              .padStart(2, "0")}
                          </Text>
                          {(("livingChildren" in obsHistoryData &&
                            obsHistoryData?.livingChildren != null) ||
                            ("abortion" in obsHistoryData &&
                              obsHistoryData?.abortion != null) ||
                            ("ectopicPregnancies" in obsHistoryData &&
                              obsHistoryData?.ectopicPregnancies != null) ||
                            ("diagnosisNotes" in obsHistoryData &&
                              obsHistoryData?.diagnosisNotes != null)) && (
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              &nbsp;|&nbsp;
                            </Text>
                          )}
                        </>
                      )}

                    {"livingChildren" in obsHistoryData &&
                      obsHistoryData?.livingChildren != null && (
                        <>
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                            }}
                          >
                            Living&nbsp;:&nbsp;
                          </Text>
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                            }}
                          >
                            {obsHistoryData?.livingChildren
                              ?.toString()
                              .padStart(2, "0")}
                          </Text>
                          {(("abortion" in obsHistoryData &&
                            obsHistoryData?.abortion != null) ||
                            ("ectopicPregnancies" in obsHistoryData &&
                              obsHistoryData?.ectopicPregnancies != null) ||
                            ("diagnosisNotes" in obsHistoryData &&
                              obsHistoryData?.diagnosisNotes != null)) && (
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              &nbsp;|&nbsp;
                            </Text>
                          )}
                        </>
                      )}

                    {"abortion" in obsHistoryData &&
                      obsHistoryData?.abortion != null && (
                        <>
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                            }}
                          >
                            Abortion&nbsp;:&nbsp;
                          </Text>
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                            }}
                          >
                            {obsHistoryData?.abortion
                              ?.toString()
                              .padStart(2, "0")}
                          </Text>
                          {(("ectopicPregnancies" in obsHistoryData &&
                            obsHistoryData?.ectopicPregnancies != null) ||
                            ("diagnosisNotes" in obsHistoryData &&
                              obsHistoryData?.diagnosisNotes != null)) && (
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              &nbsp;|&nbsp;
                            </Text>
                          )}
                        </>
                      )}

                    {"ectopicPregnancies" in obsHistoryData &&
                      obsHistoryData?.ectopicPregnancies != null && (
                        <>
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                            }}
                          >
                            Ectopic&nbsp;:&nbsp;
                          </Text>
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                            }}
                          >
                            {obsHistoryData?.ectopicPregnancies
                              ?.toString()
                              .padStart(2, "0")}
                          </Text>
                          {"diagnosisNotes" in obsHistoryData &&
                            obsHistoryData?.diagnosisNotes != null && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                        </>
                      )}
                  </>
                )}

                {"diagnosisNotes" in obsHistoryData &&
                  obsHistoryData?.diagnosisNotes != null && (
                    <>
                      <Text
                        style={{
                          color: "#171725",
                          fontFamily: printSettings?.page_format?.font_family,
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 500,
                        }}
                      >
                        Notes&nbsp;:&nbsp;
                      </Text>
                      <Text
                        style={{
                          color: "#171725",
                          fontFamily: getIndianLanguageFont(obsHistoryData?.diagnosisNotes, printSettings?.page_format?.font_family),
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                        }}
                      >
                        {obsHistoryData?.diagnosisNotes}
                      </Text>
                    </>
                  )}

                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  )
                </Text>
              </>
            )}
          </Text>
        </View>
      )}

      {options?.includes("diagnosis") && (
        <View>
          <Text style={{ marginTop: PX_TO_PT * 6, lineHeight: 1.4 }}>
            {(obsHistoryData?.lmp ||
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
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Patient Information&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  (
                </Text>
                {obsHistoryData?.lmp && (
                  <>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                      }}
                    >
                      LMP&nbsp;:&nbsp;
                    </Text>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                      }}
                    >
                      {moment(obsHistoryData?.lmp).format("DD MMM YYYY")}
                    </Text>

                    {("edd" in obsHistoryData ||
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
                      <Text
                        style={{
                          color: "#171725",
                          fontFamily: printSettings?.page_format?.font_family,
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                        }}
                      >
                        &nbsp;|&nbsp;
                      </Text>
                    )}
                  </>
                )}

                {"edd" in obsHistoryData && !obsHistoryData?.ceed && (
                  <>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                      }}
                    >
                      E.D.D.&nbsp;:&nbsp;
                    </Text>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                      }}
                    >
                      {moment(obsHistoryData?.edd).format("DD MMM YYYY")}
                    </Text>
                    {("ceed" in obsHistoryData ||
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
                      <Text
                        style={{
                          color: "#171725",
                          fontFamily: printSettings?.page_format?.font_family,
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                        }}
                      >
                        &nbsp;|&nbsp;
                      </Text>
                    )}
                  </>
                )}

                {"ceed" in obsHistoryData && (
                  <>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                      }}
                    >
                      C.E.D.D.&nbsp;:&nbsp;
                    </Text>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                      }}
                    >
                      {moment(obsHistoryData?.ceed).format("DD MMM YYYY")}
                    </Text>
                    {(gestationWeeks != null ||
                      gestationDays != null ||
                      "blood" in obsHistoryData ||
                      "husbandsBlood" in obsHistoryData ||
                      "consang" in obsHistoryData ||
                      "maritialStatus" in obsHistoryData ||
                      ("marriageDurationYears" in obsHistoryData &&
                        obsHistoryData?.marriageDurationYears != null) ||
                      ("marriageDurationMonths" in obsHistoryData &&
                        obsHistoryData?.marriageDurationMonths != null)) && (
                      <Text
                        style={{
                          color: "#171725",
                          fontFamily: printSettings?.page_format?.font_family,
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                        }}
                      >
                        &nbsp;|&nbsp;
                      </Text>
                    )}
                  </>
                )}

                {(gestationWeeks != null || gestationDays != null) && (
                  <>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                      }}
                    >
                      Gestation&nbsp;:&nbsp;
                    </Text>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                      }}
                    >
                      {gestationWeeks
                        ? `${gestationWeeks}W`
                        : ""}
                      {gestationWeeks
                        ? `,`
                        : ``}
                      {gestationDays
                        ? `${gestationDays}D`
                        : ""}
                    </Text>
                    {("blood" in obsHistoryData ||
                      "husbandsBlood" in obsHistoryData ||
                      "consang" in obsHistoryData ||
                      "maritialStatus" in obsHistoryData ||
                      ("marriageDurationYears" in obsHistoryData &&
                        obsHistoryData?.marriageDurationYears != null) ||
                      ("marriageDurationMonths" in obsHistoryData &&
                        obsHistoryData?.marriageDurationMonths != null)) && (
                      <Text
                        style={{
                          color: "#171725",
                          fontFamily: printSettings?.page_format?.font_family,
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                        }}
                      >
                        &nbsp;|&nbsp;
                      </Text>
                    )}
                  </>
                )}

                {"blood" in obsHistoryData && (
                  <>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                      }}
                    >
                      Blood group&nbsp;:&nbsp;
                    </Text>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                      }}
                    >
                      {obsHistoryData?.blood}
                    </Text>
                    {("husbandsBlood" in obsHistoryData ||
                      "consang" in obsHistoryData ||
                      "maritialStatus" in obsHistoryData ||
                      ("marriageDurationYears" in obsHistoryData &&
                        obsHistoryData?.marriageDurationYears != null) ||
                      ("marriageDurationMonths" in obsHistoryData &&
                        obsHistoryData?.marriageDurationMonths != null)) && (
                      <Text
                        style={{
                          color: "#171725",
                          fontFamily: printSettings?.page_format?.font_family,
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                        }}
                      >
                        &nbsp;|&nbsp;
                      </Text>
                    )}
                  </>
                )}

                {"husbandsBlood" in obsHistoryData && (
                  <>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                      }}
                    >
                      Husband's blood group&nbsp;:&nbsp;
                    </Text>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                      }}
                    >
                      {obsHistoryData?.husbandsBlood}
                    </Text>
                    {("consang" in obsHistoryData ||
                      "maritialStatus" in obsHistoryData ||
                      ("marriageDurationYears" in obsHistoryData &&
                        obsHistoryData?.marriageDurationYears != null) ||
                      ("marriageDurationMonths" in obsHistoryData &&
                        obsHistoryData?.marriageDurationMonths != null)) && (
                      <Text
                        style={{
                          color: "#171725",
                          fontFamily: printSettings?.page_format?.font_family,
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                        }}
                      >
                        &nbsp;|&nbsp;
                      </Text>
                    )}
                  </>
                )}

                {"consang" in obsHistoryData && (
                  <>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                      }}
                    >
                      Consanguineous&nbsp;:&nbsp;
                    </Text>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                      }}
                    >
                        {obsHistoryData?.consang ? `Yes` : obsHistoryData?.consang === false ? `No` : `-`}
                    </Text>
                    {("maritialStatus" in obsHistoryData ||
                      ("marriageDurationYears" in obsHistoryData &&
                        obsHistoryData?.marriageDurationYears != null) ||
                      ("marriageDurationMonths" in obsHistoryData &&
                        obsHistoryData?.marriageDurationMonths != null)) && (
                      <Text
                        style={{
                          color: "#171725",
                          fontFamily: printSettings?.page_format?.font_family,
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                        }}
                      >
                        &nbsp;|&nbsp;
                      </Text>
                    )}
                  </>
                )}

                {"maritialStatus" in obsHistoryData && (
                  <>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                      }}
                    >
                      Marital status&nbsp;:&nbsp;
                    </Text>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                      }}
                    >
                      {obsHistoryData?.maritialStatus}
                    </Text>
                    {(("marriageDurationYears" in obsHistoryData &&
                      obsHistoryData?.marriageDurationYears != null) ||
                      ("marriageDurationMonths" in obsHistoryData &&
                        obsHistoryData?.marriageDurationMonths != null)) && (
                      <Text
                        style={{
                          color: "#171725",
                          fontFamily: printSettings?.page_format?.font_family,
                          fontSize:
                            PX_TO_PT * printSettings?.page_format?.font_size,
                          fontWeight: 400,
                        }}
                      >
                        &nbsp;|&nbsp;
                      </Text>
                    )}
                  </>
                )}

                {(("marriageDurationYears" in obsHistoryData &&
                  obsHistoryData?.marriageDurationYears != null) ||
                  ("marriageDurationMonths" in obsHistoryData &&
                    obsHistoryData?.marriageDurationMonths != null)) && (
                  <>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 500,
                      }}
                    >
                      Marriage duration&nbsp;:&nbsp;
                    </Text>
                    <Text
                      style={{
                        color: "#171725",
                        fontFamily: printSettings?.page_format?.font_family,
                        fontSize:
                          PX_TO_PT * printSettings?.page_format?.font_size,
                        fontWeight: 400,
                      }}
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
                          (!obsHistoryData.hasOwnProperty(
                            "marriageDurationMonths"
                          ) ||
                            obsHistoryData?.marriageDurationMonths == null)
                        ? ` years`
                        : (!obsHistoryData.hasOwnProperty(
                            "marriageDurationYears"
                          ) ||
                            obsHistoryData?.marriageDurationYears == null) &&
                          "marriageDurationMonths" in obsHistoryData &&
                          obsHistoryData?.marriageDurationMonths != null
                        ? ` months`
                        : ``}
                    </Text>
                  </>
                )}

                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  )
                </Text>
              </>
            )}
          </Text>
        </View>
      )}

      {options?.includes("history") && (
        <View>
          <Text style={{ marginTop: PX_TO_PT * 6, lineHeight: 1.4 }}>
            {pregnancyHistory.length > 0 && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    marginTop: 5,
                  }}
                >
                  Pregnancy history
                </Text>

                {pregnancyHistory.map((item, i) => (
                  <View key={i}>
                    {("gravidity" in item ||
                      "gravidaNumber" in item ||
                      "outcome" in item ||
                      "termLength" in item ||
                      "deliveryMode" in item ||
                      "gestationPeriod" in item ||
                      "location" in item ||
                      "modeOfManagement" in item ||
                      "typeOfAbortion" in item ||
                      "modeOfAbortion" in item ||
                      "typOfDelivery" in item ||
                      "dateOfDelivery" in item ||
                      "ageOfDelivery" in item ||
                      "gender" in item ||
                      "babysWeight" in item ||
                      "remarks" in item) && (
                      <>
                        <Text
                          style={{
                            color: "#171725",
                            fontFamily: printSettings?.page_format?.font_family,
                            fontSize:
                              PX_TO_PT * printSettings?.page_format?.font_size,
                            fontWeight: 500,
                          }}
                        >
                          <>
                            {i > 0 ? (
                              <Text style={{ marginTop: 15 }}>
                                &nbsp;{`\n`}(
                              </Text>
                            ) : (
                              <Text>&nbsp;(</Text>
                            )}
                          </>
                        </Text>

                        {("gravidity" in item || "gravidaNumber" in item) && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Gravida number&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.gravidity ? item?.gravidity?.toString().padStart(2, "0") : item?.gravidaNumber?.toString().padStart(2, "0")}
                            </Text>
                            {("outcome" in item ||
                              "termLength" in item ||
                              "deliveryMode" in item ||
                              "gestationPeriod" in item ||
                              "location" in item ||
                              "modeOfManagement" in item ||
                              "typeOfAbortion" in item ||
                              "modeOfAbortion" in item ||
                              "typOfDelivery" in item ||
                              "dateOfDelivery" in item ||
                              "ageOfDelivery" in item ||
                              "gender" in item ||
                              "babysWeight" in item ||
                              "remarks" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"outcome" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Outcome&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {getPregnancyOutcome(item?.outcome)}
                            </Text>
                            {("termLength" in item ||
                              "deliveryMode" in item ||
                              "gestationPeriod" in item ||
                              "location" in item ||
                              "modeOfManagement" in item ||
                              "typeOfAbortion" in item ||
                              "modeOfAbortion" in item ||
                              "typOfDelivery" in item ||
                              "dateOfDelivery" in item ||
                              "ageOfDelivery" in item ||
                              "gender" in item ||
                              "babysWeight" in item ||
                              "remarks" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"termLength" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Term length&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.termLength}
                            </Text>
                            {("deliveryMode" in item ||
                              "gestationPeriod" in item ||
                              "location" in item ||
                              "modeOfManagement" in item ||
                              "typeOfAbortion" in item ||
                              "modeOfAbortion" in item ||
                              "typOfDelivery" in item ||
                              "dateOfDelivery" in item ||
                              "ageOfDelivery" in item ||
                              "gender" in item ||
                              "babysWeight" in item ||
                              "remarks" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"deliveryMode" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Delivery mode&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.deliveryMode}
                            </Text>
                            {("gestationPeriod" in item ||
                              "location" in item ||
                              "modeOfManagement" in item ||
                              "typeOfAbortion" in item ||
                              "modeOfAbortion" in item ||
                              "typOfDelivery" in item ||
                              "dateOfDelivery" in item ||
                              "ageOfDelivery" in item ||
                              "gender" in item ||
                              "babysWeight" in item ||
                              "remarks" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"gestationPeriod" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Period of gestation&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.gestationPeriod}{" "}
                              {Number(item?.gestationPeriod) > 1
                                ? `weeks`
                                : `week`}
                            </Text>
                            {("location" in item ||
                              "modeOfManagement" in item ||
                              "typeOfAbortion" in item ||
                              "modeOfAbortion" in item ||
                              "typOfDelivery" in item ||
                              "dateOfDelivery" in item ||
                              "ageOfDelivery" in item ||
                              "gender" in item ||
                              "babysWeight" in item ||
                              "remarks" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"location" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Location&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.location}
                            </Text>
                            {("modeOfManagement" in item ||
                              "typeOfAbortion" in item ||
                              "modeOfAbortion" in item ||
                              "typOfDelivery" in item ||
                              "dateOfDelivery" in item ||
                              "ageOfDelivery" in item ||
                              "gender" in item ||
                              "babysWeight" in item ||
                              "remarks" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"modeOfManagement" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Management mode&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.modeOfManagement}
                            </Text>
                            {("typeOfAbortion" in item ||
                              "modeOfAbortion" in item ||
                              "typOfDelivery" in item ||
                              "dateOfDelivery" in item ||
                              "ageOfDelivery" in item ||
                              "gender" in item ||
                              "babysWeight" in item ||
                              "remarks" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"typeOfAbortion" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Type of Miscarriage&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {getTypeOfAbortion(item?.typeOfAbortion)}
                            </Text>
                            {("modeOfAbortion" in item ||
                              "typOfDelivery" in item ||
                              "dateOfDelivery" in item ||
                              "ageOfDelivery" in item ||
                              "gender" in item ||
                              "babysWeight" in item ||
                              "remarks" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"modeOfAbortion" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Mode of Miscarriage&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.modeOfAbortion}
                            </Text>
                            {("typOfDelivery" in item ||
                              "dateOfDelivery" in item ||
                              "ageOfDelivery" in item ||
                              "gender" in item ||
                              "babysWeight" in item ||
                              "remarks" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"dateOfDelivery" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Date of delivery&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {moment(item?.dateOfDelivery).format(
                                "DD MMM YYYY"
                              )}
                            </Text>
                            {("gender" in item ||
                              "babysWeight" in item ||
                              "remarks" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"ageOfDelivery" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Age&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.ageOfDelivery}
                            </Text>
                            {("gender" in item ||
                              "babysWeight" in item ||
                              "remarks" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"gender" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Gender&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.gender}
                            </Text>
                            {("babysWeight" in item || "remarks" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"babysWeight" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Baby's weight&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.babysWeight}
                              {`kgs`}
                            </Text>
                            {"remarks" in item && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"remarks" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Remarks&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily: getIndianLanguageFont(item?.remarks, printSettings?.page_format?.font_family),
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.remarks}
                            </Text>
                          </>
                        )}

                        <Text
                          style={{
                            color: "#171725",
                            fontFamily: printSettings?.page_format?.font_family,
                            fontSize:
                              PX_TO_PT * printSettings?.page_format?.font_size,
                            fontWeight: 500,
                          }}
                        >
                          )
                        </Text>
                      </>
                    )}
                  </View>
                ))}
              </>
            )}
          </Text>
        </View>
      )}

      {options?.includes("examination") && obsHistoryData?.examinationHistory?.length > 0 && (
        <View>
          <Text style={{ marginTop: PX_TO_PT * 6, lineHeight: 1.4 }}>
            {obsHistoryData?.examinationHistory.length > 0 && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Examination
                </Text>
                {obsHistoryData?.examinationHistory.map((item, i) => (
                  <View key={i}>
                    {("pallor" in item ||
                      "oedema" in item ||
                      "mothersBMI" in item ||
                      "mothersHeight" in item ||
                      "mothersWeight" in item ||
                      "diastolic" in item ||
                      "systolic" in item ||
                      "heightOfFundus" in item ||
                      "presentation" in item ||
                      "foetalHeartRate" in item ||
                      "liquor" in item ||
                      "notes" in item) && (
                      <>
                        <Text
                          style={{
                            color: "#171725",
                            fontFamily: printSettings?.page_format?.font_family,
                            fontSize:
                              PX_TO_PT * printSettings?.page_format?.font_size,
                            fontWeight: 500,
                          }}
                        >
                          {/* {("pallor" in item ||
                            "oedema" in item ||
                            "mothersBMI" in item) && ( */}
                          <>
                            {i > 0 ? (
                              <Text style={{ marginTop: 15 }}>
                                &nbsp;{`\n`}(
                              </Text>
                            ) : (
                              <Text>&nbsp;(</Text>
                            )}
                          </>
                          {/* )} */}
                        </Text>

                        <Text
                          style={{
                            color: "#171725",
                            fontFamily: printSettings?.page_format?.font_family,
                            fontSize:
                              PX_TO_PT * printSettings?.page_format?.font_size,
                            fontWeight: 500,
                          }}
                        >
                          {item?.date ? moment(item?.date).format("DD MMM YYYY") : ""}
                        </Text>
                        {"pallor" in item ||
                        "oedema" in item ||
                        "mothersBMI" in item || "mothersHeight" in item || "mothersWeight" in item ? (
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                            }}
                          >
                            &nbsp;|&nbsp;
                          </Text>
                        ) : (
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                            }}
                          >
                            )
                          </Text>
                        )}

                        {"pallor" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Pallor&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {Boolean(item?.pallor) ? `Yes` : `No`}
                            </Text>
                            {("oedema" in item || "mothersBMI" in item || "mothersHeight" in item || "mothersWeight" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"oedema" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Oedema&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {Boolean(item?.oedema) ? `Yes` : `No`}
                            </Text>
                            {("mothersBMI" in item || "mothersHeight" in item || "mothersWeight" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"mothersHeight" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Mother's Height&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.mothersHeight}{"cm"}
                            </Text>
                            {("mothersBMI" in item || "mothersWeight" in item) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {"mothersWeight" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Mother's Weight&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.mothersWeight}{"kg"}
                            </Text>
                            {"mothersBMI" in item && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                &nbsp;|&nbsp;
                              </Text>
                            )}
                          </>
                        )}                        

                        {"mothersBMI" in item && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              Mother's BMI&nbsp;:&nbsp;
                            </Text>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.mothersBMI}
                              {`kg/m2`}
                            </Text>
                          </>
                        )}

                        {("pallor" in item ||
                          "oedema" in item ||
                          "mothersBMI" in item || "mothersHeight" in item || "mothersWeight" in item) && (
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                            }}
                          >
                            )
                          </Text>
                        )}

                        {("diastolic" in item ||
                          "systolic" in item ||
                          "heightOfFundus" in item ||
                          "presentation" in item ||
                          "foetalHeartRate" in item ||
                          "liquor" in item ||
                          "notes" in item) && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              &nbsp;(
                            </Text>

                            {("diastolic" in item || "systolic" in item) && (
                              <>
                                <Text
                                  style={{
                                    color: "#171725",
                                    fontFamily:
                                      printSettings?.page_format?.font_family,
                                    fontSize:
                                      PX_TO_PT *
                                      printSettings?.page_format?.font_size,
                                    fontWeight: 500,
                                  }}
                                >
                                  BP&nbsp;:&nbsp;
                                </Text>
                                <Text
                                  style={{
                                    color: "#171725",
                                    fontFamily:
                                      printSettings?.page_format?.font_family,
                                    fontSize:
                                      PX_TO_PT *
                                      printSettings?.page_format?.font_size,
                                    fontWeight: 400,
                                  }}
                                >
                                  {item?.systolic}
                                  {"systolic" in item && "diastolic" in item
                                    ? `/`
                                    : ``}
                                  {item?.diastolic}
                                  {` mmHg`}
                                </Text>
                                {("heightOfFundus" in item ||
                                  "presentation" in item ||
                                  "foetalHeartRate" in item ||
                                  "liquor" in item ||
                                  "notes" in item) && (
                                  <Text
                                    style={{
                                      color: "#171725",
                                      fontFamily:
                                        printSettings?.page_format?.font_family,
                                      fontSize:
                                        PX_TO_PT *
                                        printSettings?.page_format?.font_size,
                                      fontWeight: 400,
                                    }}
                                  >
                                    &nbsp;|&nbsp;
                                  </Text>
                                )}
                              </>
                            )}

                            {"heightOfFundus" in item && (
                              <>
                                <Text
                                  style={{
                                    color: "#171725",
                                    fontFamily:
                                      printSettings?.page_format?.font_family,
                                    fontSize:
                                      PX_TO_PT *
                                      printSettings?.page_format?.font_size,
                                    fontWeight: 500,
                                  }}
                                >
                                  Fundus height&nbsp;:&nbsp;
                                </Text>
                                <Text
                                  style={{
                                    color: "#171725",
                                    fontFamily:
                                      printSettings?.page_format?.font_family,
                                    fontSize:
                                      PX_TO_PT *
                                      printSettings?.page_format?.font_size,
                                    fontWeight: 400,
                                  }}
                                >
                                  {item?.heightOfFundus}
                                  {item?.heightOfFundusUnit}
                                </Text>
                                {("presentation" in item ||
                                  "foetalHeartRate" in item ||
                                  "liquor" in item ||
                                  "notes" in item) && (
                                  <Text
                                    style={{
                                      color: "#171725",
                                      fontFamily:
                                        printSettings?.page_format?.font_family,
                                      fontSize:
                                        PX_TO_PT *
                                        printSettings?.page_format?.font_size,
                                      fontWeight: 400,
                                    }}
                                  >
                                    &nbsp;|&nbsp;
                                  </Text>
                                )}
                              </>
                            )}

                            {"presentation" in item && (
                              <>
                                <Text
                                  style={{
                                    color: "#171725",
                                    fontFamily:
                                      printSettings?.page_format?.font_family,
                                    fontSize:
                                      PX_TO_PT *
                                      printSettings?.page_format?.font_size,
                                    fontWeight: 500,
                                  }}
                                >
                                  Presentation&nbsp;:&nbsp;
                                </Text>
                                <Text
                                  style={{
                                    color: "#171725",
                                    fontFamily:
                                      printSettings?.page_format?.font_family,
                                    fontSize:
                                      PX_TO_PT *
                                      printSettings?.page_format?.font_size,
                                    fontWeight: 400,
                                  }}
                                >
                                  {item?.presentation}
                                </Text>
                                {("foetalHeartRate" in item ||
                                  "liquor" in item ||
                                  "notes" in item) && (
                                  <Text
                                    style={{
                                      color: "#171725",
                                      fontFamily:
                                        printSettings?.page_format?.font_family,
                                      fontSize:
                                        PX_TO_PT *
                                        printSettings?.page_format?.font_size,
                                      fontWeight: 400,
                                    }}
                                  >
                                    &nbsp;|&nbsp;
                                  </Text>
                                )}
                              </>
                            )}

                            {"foetalHeartRate" in item && (
                              <>
                                <Text
                                  style={{
                                    color: "#171725",
                                    fontFamily:
                                      printSettings?.page_format?.font_family,
                                    fontSize:
                                      PX_TO_PT *
                                      printSettings?.page_format?.font_size,
                                    fontWeight: 500,
                                  }}
                                >
                                  Fetal heart rate&nbsp;:&nbsp;
                                </Text>
                                <Text
                                  style={{
                                    color: "#171725",
                                    fontFamily:
                                      printSettings?.page_format?.font_family,
                                    fontSize:
                                      PX_TO_PT *
                                      printSettings?.page_format?.font_size,
                                    fontWeight: 400,
                                  }}
                                >
                                  {item?.foetalHeartRate}
                                  {` BPM`}
                                </Text>
                                {("liquor" in item || "notes" in item) && (
                                  <Text
                                    style={{
                                      color: "#171725",
                                      fontFamily:
                                        printSettings?.page_format?.font_family,
                                      fontSize:
                                        PX_TO_PT *
                                        printSettings?.page_format?.font_size,
                                      fontWeight: 400,
                                    }}
                                  >
                                    &nbsp;|&nbsp;
                                  </Text>
                                )}
                              </>
                            )}

                            {"liquor" in item && (
                              <>
                                <Text
                                  style={{
                                    color: "#171725",
                                    fontFamily:
                                      printSettings?.page_format?.font_family,
                                    fontSize:
                                      PX_TO_PT *
                                      printSettings?.page_format?.font_size,
                                    fontWeight: 500,
                                  }}
                                >
                                  Liquor&nbsp;:&nbsp;
                                </Text>
                                <Text
                                  style={{
                                    color: "#171725",
                                    fontFamily:
                                      printSettings?.page_format?.font_family,
                                    fontSize:
                                      PX_TO_PT *
                                      printSettings?.page_format?.font_size,
                                    fontWeight: 400,
                                  }}
                                >
                                  {item?.liquor}
                                </Text>
                                {"notes" in item && (
                                  <Text
                                    style={{
                                      color: "#171725",
                                      fontFamily:
                                        printSettings?.page_format?.font_family,
                                      fontSize:
                                        PX_TO_PT *
                                        printSettings?.page_format?.font_size,
                                      fontWeight: 400,
                                    }}
                                  >
                                    &nbsp;|&nbsp;
                                  </Text>
                                )}
                              </>
                            )}

                            {"notes" in item && (
                              <>
                                <Text
                                  style={{
                                    color: "#171725",
                                    fontFamily:
                                      printSettings?.page_format?.font_family,
                                    fontSize:
                                      PX_TO_PT *
                                      printSettings?.page_format?.font_size,
                                    fontWeight: 500,
                                  }}
                                >
                                  Notes&nbsp;:&nbsp;
                                </Text>
                                <Text
                                  style={{
                                    color: "#171725",
                                    fontFamily:
                                      getIndianLanguageFont(item?.notes, printSettings?.page_format?.font_family),
                                    fontSize:
                                      PX_TO_PT *
                                      printSettings?.page_format?.font_size,
                                    fontWeight: 400,
                                  }}
                                >
                                  {item?.notes}
                                </Text>
                              </>
                            )}
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              )
                            </Text>
                          </>
                        )}
                      </>
                    )}
                  </View>
                ))}
              </>
            )}
          </Text>
        </View>
      )}

      {options?.includes("ancHistory") && ancPrintEnabled?.length > 0 && (
        <View>
          <Text style={{ marginTop: PX_TO_PT * 6, lineHeight: 1.4 }}>
            {ancPrintEnabled?.length > 0 && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  ANC Scheduler:&nbsp;
                </Text>
                {ancPrintEnabled?.map((item, i) => (
                  <View key={i}>
                    {item?.enablePrint && (
                      <>
                        <Text
                          style={{
                            color: "#171725",
                            fontFamily: printSettings?.page_format?.font_family,
                            fontSize:
                              PX_TO_PT * printSettings?.page_format?.font_size,
                            fontWeight: 500,
                          }}
                        >
                          {item?.master?.name}
                        </Text>

                        <Text
                          style={{
                            color: "#171725",
                            fontFamily: printSettings?.page_format?.font_family,
                            fontSize:
                              PX_TO_PT * printSettings?.page_format?.font_size,
                            fontWeight: 500,
                          }}
                        >
                          <Text>&nbsp;(</Text>
                        </Text>

                        {item?.dueDate && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              Due date on{" "}
                              {moment(item?.dueDate).format("DD/MM/YYYY")}
                            </Text>
                            {(item?.status || item?.notes) && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                ,&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {item?.status && (
                          <>
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.status}
                            </Text>
                            {item?.notes && (
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                ,&nbsp;
                              </Text>
                            )}
                          </>
                        )}

                        {item?.notes && (
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily: getIndianLanguageFont(item?.notes, printSettings?.page_format?.font_family),
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 400,
                            }}
                          >
                            {item?.notes}
                          </Text>
                        )}

                        {(item?.master ||
                          item?.dueDate ||
                          item?.status ||
                          item?.notes) && (
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                            }}
                          >
                            <Text>{`)`}</Text>
                          </Text>
                        )}

                        {i !== ancPrintEnabled?.length - 1 && (
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily:
                                printSettings?.page_format?.font_family,
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                            }}
                          >
                            ,&nbsp;
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                ))}
              </>
            )}
          </Text>
        </View>
      )}

      {options?.includes("immunisationHistory") &&
        immunisationPrintEnabled?.length > 0 && (
          <View>
            <Text style={{ marginTop: PX_TO_PT * 6, lineHeight: 1.4 }}>
              {immunisationPrintEnabled?.length > 0 && (
                <>
                  <Text
                    style={{
                      color: "#171725",
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize:
                        PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 500,
                    }}
                  >
                    Immunisation Vaccine:&nbsp;
                  </Text>
                  {immunisationPrintEnabled?.map((item, i) => (
                    <View key={i}>
                      {item?.enablePrint && (
                        <>
                          <Text
                            style={{
                              color: "#171725",
                              fontFamily: getIndianLanguageFont(item?.master?.name, printSettings?.page_format?.font_family),
                              fontSize:
                                PX_TO_PT *
                                printSettings?.page_format?.font_size,
                              fontWeight: 500,
                            }}
                          >
                            {item?.master?.name}
                          </Text>

                          {(item?.givenDate || item?.notes || item?.status) && (
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              <Text>&nbsp;(</Text>
                            </Text>
                          )}
                          {(item?.givenDate || item?.status) && (
                            <>
                              <Text
                                style={{
                                  color: "#171725",
                                  fontFamily:
                                    printSettings?.page_format?.font_family,
                                  fontSize:
                                    PX_TO_PT *
                                    printSettings?.page_format?.font_size,
                                  fontWeight: 400,
                                }}
                              >
                                {item?.status === "Given" && item?.givenDate
                                  ? `Given on ${moment(item?.givenDate).format(
                                      "DD/MM/YYYY"
                                    )}`
                                  : item?.status}
                              </Text>
                              {item?.notes && (
                                <Text
                                  style={{
                                    color: "#171725",
                                    fontFamily:
                                      printSettings?.page_format?.font_family,
                                    fontSize:
                                      PX_TO_PT *
                                      printSettings?.page_format?.font_size,
                                    fontWeight: 400,
                                  }}
                                >
                                  ,&nbsp;
                                </Text>
                              )}
                            </>
                          )}

                          {item?.notes && (
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily: getIndianLanguageFont(item?.notes, printSettings?.page_format?.font_family),
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 400,
                              }}
                            >
                              {item?.notes}
                            </Text>
                          )}

                          {(item?.givenDate || item?.notes || item?.status) && (
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              <Text>{`)`}</Text>
                            </Text>
                          )}

                          {i !== immunisationPrintEnabled?.length - 1 && (
                            <Text
                              style={{
                                color: "#171725",
                                fontFamily:
                                  printSettings?.page_format?.font_family,
                                fontSize:
                                  PX_TO_PT *
                                  printSettings?.page_format?.font_size,
                                fontWeight: 500,
                              }}
                            >
                              ,&nbsp;
                            </Text>
                          )}
                        </>
                      )}
                    </View>
                  ))}
                </>
              )}
            </Text>
          </View>
        )}
    </View>
  );
}

export default ObsHistoryInlineView;
