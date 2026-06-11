import React from "react";
import { Text, View } from "@react-pdf/renderer";
import moment from "moment";
import { getIndianLanguageFont } from "../../../utils/utils";

function GynecHistoryInlineView({ PX_TO_PT, printSettings, gynecHistoryData }) {
  return (
    <View style={{ marginTop: PX_TO_PT * 15 }}>
      <Text
        fixed
        style={{
          color: "#171725",
          fontFamily: printSettings?.page_format?.font_family,
          fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
          fontWeight: 700,
        }}
      >
        Menstrual details&nbsp;:&nbsp;
      </Text>

      <Text style={{ marginTop: PX_TO_PT * 6, lineHeight: 1.4 }}>
        {gynecHistoryData?.lmp && (
          <>
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
              }}
            >
              LMP&nbsp;&nbsp;:&nbsp;
            </Text>
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 400,
              }}
            >
              {moment(gynecHistoryData?.lmp).format("DD MMM YYYY")}
            </Text>
          </>
        )}

        {(gynecHistoryData?.cycle ||
          gynecHistoryData?.intervalOfCycle ||
          gynecHistoryData?.cycleNotes ||
          gynecHistoryData?.cycleNotes) && (
          <>
            {gynecHistoryData?.lmp && (
              <Text
                style={{
                  color: "#171725",
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                }}
              >
                ,&nbsp;
              </Text>
            )}
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
              }}
            >
              Cycle&nbsp;(
            </Text>

            {gynecHistoryData?.cycle && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Type&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    textTransform: "capitalize",
                  }}
                >
                  {gynecHistoryData?.cycle}
                </Text>
                {(gynecHistoryData?.intervalOfCycle ||
                  gynecHistoryData?.cycleNotes) && (
                  <Text
                    style={{
                      color: "#171725",
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 400,
                      textTransform: "capitalize",
                    }}
                  >
                    &nbsp;|&nbsp;
                  </Text>
                )}
              </>
            )}

            {gynecHistoryData?.intervalOfCycle && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Interval of cycle&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                  }}
                >
                  {gynecHistoryData?.intervalOfCycle}&nbsp;
                  {Number(gynecHistoryData?.intervalOfCycle) > 1
                    ? "days"
                    : "day"}
                </Text>
                {gynecHistoryData?.cycleNotes && (
                  <Text
                    style={{
                      color: "#171725",
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 400,
                    }}
                  >
                    &nbsp;|&nbsp;
                  </Text>
                )}
              </>
            )}

            {gynecHistoryData?.cycleNotes && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Notes&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: getIndianLanguageFont(
                      gynecHistoryData?.cycleNotes,
                      printSettings?.page_format?.font_family
                    ),
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                  }}
                >
                  {gynecHistoryData?.cycleNotes}
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

        {(gynecHistoryData?.flow ||
          gynecHistoryData?.durationOfMenstrualFlow ||
          "clots" in gynecHistoryData ||
          gynecHistoryData?.numberOfPadsPerDay ||
          gynecHistoryData?.flowNotes) && (
          <>
            {(gynecHistoryData?.cycle ||
              gynecHistoryData?.intervalOfCycle ||
              gynecHistoryData?.cycleNotes ||
              gynecHistoryData?.cycleNotes) && (
              <Text
                style={{
                  color: "#171725",
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                }}
              >
                ,&nbsp;
              </Text>
            )}
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
              }}
            >
              Flow&nbsp;(
            </Text>

            {gynecHistoryData?.flow && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Volume&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    textTransform: "capitalize",
                  }}
                >
                  {gynecHistoryData?.flow}
                </Text>
                {(gynecHistoryData?.durationOfMenstrualFlow ||
                  "clots" in gynecHistoryData ||
                  gynecHistoryData?.numberOfPadsPerDay ||
                  gynecHistoryData?.flowNotes) && (
                  <Text
                    style={{
                      color: "#171725",
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 400,
                      textTransform: "capitalize",
                    }}
                  >
                    &nbsp;|&nbsp;
                  </Text>
                )}
              </>
            )}

            {gynecHistoryData?.durationOfMenstrualFlow && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Duration of menstrual flow&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                  }}
                >
                  {gynecHistoryData?.durationOfMenstrualFlow}&nbsp;
                  {Number(gynecHistoryData?.durationOfMenstrualFlow) > 1
                    ? "days"
                    : "day"}
                </Text>
                {("clots" in gynecHistoryData ||
                  gynecHistoryData?.numberOfPadsPerDay ||
                  gynecHistoryData?.flowNotes) && (
                  <Text
                    style={{
                      color: "#171725",
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 400,
                      textTransform: "capitalize",
                    }}
                  >
                    &nbsp;|&nbsp;
                  </Text>
                )}
              </>
            )}

            {"clots" in gynecHistoryData && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Clots&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                  }}
                >
                  {Boolean(gynecHistoryData?.clots) ? "Yes" : "No"}
                </Text>
                {(gynecHistoryData?.numberOfPadsPerDay ||
                  gynecHistoryData?.flowNotes) && (
                  <Text
                    style={{
                      color: "#171725",
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 400,
                      textTransform: "capitalize",
                    }}
                  >
                    &nbsp;|&nbsp;
                  </Text>
                )}
              </>
            )}

            {gynecHistoryData?.numberOfPadsPerDay && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Number of pads per day&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                  }}
                >
                  {gynecHistoryData?.numberOfPadsPerDay}
                </Text>
                {gynecHistoryData?.flowNotes && (
                  <Text
                    style={{
                      color: "#171725",
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 400,
                      textTransform: "capitalize",
                    }}
                  >
                    &nbsp;|&nbsp;
                  </Text>
                )}
              </>
            )}

            {gynecHistoryData?.flowNotes && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Notes&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: getIndianLanguageFont(
                      gynecHistoryData?.flowNotes,
                      printSettings?.page_format?.font_family
                    ),
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                  }}
                >
                  {gynecHistoryData?.flowNotes}
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

        {(gynecHistoryData?.pain ||
          gynecHistoryData?.occurrenceOfPain ||
          gynecHistoryData?.painNotes) && (
          <>
            {(gynecHistoryData?.flow ||
              gynecHistoryData?.durationOfMenstrualFlow ||
              "clots" in gynecHistoryData ||
              gynecHistoryData?.numberOfPadsPerDay ||
              gynecHistoryData?.flowNotes) && (
              <Text
                style={{
                  color: "#171725",
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                }}
              >
                ,&nbsp;
              </Text>
            )}
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
              }}
            >
              Pain&nbsp;(
            </Text>

            {gynecHistoryData?.pain && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Level&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    textTransform: "capitalize",
                  }}
                >
                  {gynecHistoryData?.pain}
                </Text>
                {(gynecHistoryData?.occurrenceOfPain ||
                  gynecHistoryData?.painNotes) && (
                  <Text
                    style={{
                      color: "#171725",
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 400,
                      textTransform: "capitalize",
                    }}
                  >
                    &nbsp;|&nbsp;
                  </Text>
                )}
              </>
            )}

            {gynecHistoryData?.occurrenceOfPain && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Occurrence of pain&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    textTransform: "capitalize",
                  }}
                >
                  {gynecHistoryData?.occurrenceOfPain}
                </Text>
                {gynecHistoryData?.painNotes && (
                  <Text
                    style={{
                      color: "#171725",
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 400,
                      textTransform: "capitalize",
                    }}
                  >
                    &nbsp;|&nbsp;
                  </Text>
                )}
              </>
            )}

            {gynecHistoryData?.painNotes && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Notes&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: getIndianLanguageFont(
                      gynecHistoryData?.painNotes,
                      printSettings?.page_format?.font_family
                    ),
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                  }}
                >
                  {gynecHistoryData?.painNotes}
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

        {(gynecHistoryData?.ageAtMenarche ||
          gynecHistoryData?.menarcheNotes) && (
          <>
            {(gynecHistoryData?.pain ||
              gynecHistoryData?.occurrenceOfPain ||
              gynecHistoryData?.painNotes) && (
              <Text
                style={{
                  color: "#171725",
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                }}
              >
                ,&nbsp;
              </Text>
            )}
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
              }}
            >
              Menarche&nbsp;(
            </Text>

            {gynecHistoryData?.ageAtMenarche && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Age at&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                  }}
                >
                  {gynecHistoryData?.ageAtMenarche} years
                </Text>
                {gynecHistoryData?.menarcheNotes && (
                  <Text
                    style={{
                      color: "#171725",
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 400,
                      textTransform: "capitalize",
                    }}
                  >
                    &nbsp;|&nbsp;
                  </Text>
                )}
              </>
            )}

            {gynecHistoryData?.menarcheNotes && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Notes&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: getIndianLanguageFont(
                      gynecHistoryData?.menarcheNotes,
                      printSettings?.page_format?.font_family
                    ),
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                  }}
                >
                  {gynecHistoryData?.menarcheNotes}
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

        {(gynecHistoryData?.ageAtMenopause ||
          gynecHistoryData?.typeOfMenopause ||
          gynecHistoryData?.reproductiveNotes) && (
          <>
            {(gynecHistoryData?.ageAtMenarche ||
              gynecHistoryData?.menarcheNotes) && (
              <Text
                style={{
                  color: "#171725",
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                }}
              >
                ,&nbsp;
              </Text>
            )}
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
              }}
            >
              {gynecHistoryData?.reproductiveLifeStages?.toLowerCase() ===
              "menopause"
                ? "Menopause"
                : gynecHistoryData?.reproductiveLifeStages?.toLowerCase() ===
                  "perimenopause"
                ? "Perimenopause"
                : "Lactational amenorrhea"}
              &nbsp;(
            </Text>

            {gynecHistoryData?.ageAtMenopause && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Age at&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                  }}
                >
                  {gynecHistoryData?.ageAtMenopause} years
                </Text>
                {(gynecHistoryData?.typeOfMenopause ||
                  gynecHistoryData?.reproductiveNotes) && (
                  <Text
                    style={{
                      color: "#171725",
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 400,
                      textTransform: "capitalize",
                    }}
                  >
                    &nbsp;|&nbsp;
                  </Text>
                )}
              </>
            )}

            {gynecHistoryData?.typeOfMenopause && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Type of{" "}
                  {gynecHistoryData?.reproductiveLifeStages?.toLowerCase() ===
                  "menopause"
                    ? "menopause"
                    : gynecHistoryData?.reproductiveLifeStages?.toLowerCase() ===
                      "perimenopause"
                    ? "perimenopause"
                    : "lactational amenorrhea"}
                  &nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    textTransform: "capitalize",
                  }}
                >
                  {gynecHistoryData?.typeOfMenopause}
                </Text>
                {gynecHistoryData?.reproductiveNotes && (
                  <Text
                    style={{
                      color: "#171725",
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 400,
                      textTransform: "capitalize",
                    }}
                  >
                    &nbsp;|&nbsp;
                  </Text>
                )}
              </>
            )}

            {gynecHistoryData?.reproductiveNotes && (
              <>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                  }}
                >
                  Notes&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: getIndianLanguageFont(
                      gynecHistoryData?.reproductiveNotes,
                      printSettings?.page_format?.font_family
                    ),
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                  }}
                >
                  {gynecHistoryData?.reproductiveNotes}
                </Text>

                {!gynecHistoryData?.notes && (
                  <Text
                    style={{
                      color: "#171725",
                      fontFamily: printSettings?.page_format?.font_family,
                      fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                      fontWeight: 500,
                    }}
                  >
                    {`)`}
                  </Text>
                )}
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

        {gynecHistoryData?.notes && (
          <>
            {(gynecHistoryData?.ageAtMenopause ||
              gynecHistoryData?.typeOfMenopause ||
              gynecHistoryData?.reproductiveNotes) && (
              <Text
                style={{
                  color: "#171725",
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                }}
              >
                ,&nbsp;
              </Text>
            )}
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
              }}
            >
              Menstruation note&nbsp;:&nbsp;
            </Text>
            <Text
              style={{
                color: "#171725",
                fontFamily: getIndianLanguageFont(
                  gynecHistoryData?.notes,
                  printSettings?.page_format?.font_family
                ),
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 400,
              }}
            >
              {gynecHistoryData?.notes}
            </Text>
          </>
        )}
      </Text>
    </View>
  );
}

export default GynecHistoryInlineView;
