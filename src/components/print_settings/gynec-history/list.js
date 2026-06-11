import React from "react";
import { Text, View } from "@react-pdf/renderer";
import moment from "moment";
import { getIndianLanguageFont } from "../../../utils/utils";

function GynecHistoryListView({ PX_TO_PT, printSettings, gynecHistoryData }) {
  let gynecListViewCounter = 1;

  return (
    <View style={{ marginTop: PX_TO_PT * 15 }}>
      <Text
        style={{
          color: "#171725",
          fontFamily: printSettings?.page_format?.font_family,
          fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
          fontWeight: 700,
        }}
      >
        Menstrual details&nbsp;:&nbsp;
      </Text>

      {gynecHistoryData?.lmp && (
        <Text style={{ marginTop: 5, lineHeight: 1.4 }}>
          <Text
            style={{
              color: "#171725",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
              fontWeight: 500,
            }}
          >
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
              }}
            >
              &nbsp;{gynecListViewCounter++}.&nbsp;LMP&nbsp;:&nbsp;
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
          </Text>
        </Text>
      )}

      {(gynecHistoryData?.cycle ||
        gynecHistoryData?.intervalOfCycle ||
        gynecHistoryData?.cycleNotes ||
        gynecHistoryData?.cycleNotes) && (
        <Text style={{ lineHeight: 1.4 }}>
          <Text
            style={{
              color: "#171725",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
              fontWeight: 500,
            }}
          >
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
              }}
            >
              &nbsp;{gynecListViewCounter++}.&nbsp;Cycle&nbsp;:&nbsp;
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
                  {gynecHistoryData?.intervalOfCycle || ``}&nbsp;
                  {Number(gynecHistoryData?.intervalOfCycle) > 1 ? "days" : "day"}
                </Text>
                {gynecHistoryData?.cycleNotes && (
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
          </Text>
        </Text>
      )}

      {(gynecHistoryData?.flow ||
        gynecHistoryData?.durationOfMenstrualFlow ||
        "clots" in gynecHistoryData ||
        gynecHistoryData?.numberOfPadsPerDay ||
        gynecHistoryData?.flowNotes) && (
        <Text style={{ lineHeight: 1.4 }}>
          <Text
            style={{
              color: "#171725",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
              fontWeight: 500,
            }}
          >
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
              }}
            >
              &nbsp;{gynecListViewCounter++}.&nbsp;Flow&nbsp;:&nbsp;
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
                  Duration of mentrual flow&nbsp;:&nbsp;
                </Text>
                <Text
                  style={{
                    color: "#171725",
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                  }}
                >
                  {gynecHistoryData?.durationOfMenstrualFlow || ``}&nbsp;
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
          </Text>
        </Text>
      )}

      {(gynecHistoryData?.pain ||
        gynecHistoryData?.occurrenceOfPain ||
        gynecHistoryData?.painNotes) && (
        <Text style={{ lineHeight: 1.4 }}>
          <Text
            style={{
              color: "#171725",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
              fontWeight: 500,
            }}
          >
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
              }}
            >
              &nbsp;{gynecListViewCounter++}.&nbsp;Pain&nbsp;:&nbsp;
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
          </Text>
        </Text>
      )}

      {(gynecHistoryData?.ageAtMenarche ||
        gynecHistoryData?.menarcheNotes) && (
        <Text style={{ lineHeight: 1.4 }}>
          <Text
            style={{
              color: "#171725",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
              fontWeight: 500,
            }}
          >
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
              }}
            >
              &nbsp;{gynecListViewCounter++}.&nbsp;Menarche&nbsp;:&nbsp;
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
          </Text>
        </Text>
      )}

      {(gynecHistoryData?.ageAtMenopause ||
        gynecHistoryData?.typeOfMenopause ||
        gynecHistoryData?.reproductiveNotes) && (
        <Text style={{ lineHeight: 1.4 }}>
          <Text
            style={{
              color: "#171725",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
              fontWeight: 500,
            }}
          >
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
              }}
            >
              &nbsp;{gynecListViewCounter++}.&nbsp;
              {gynecHistoryData?.reproductiveLifeStages?.toLowerCase() ===
              "menopause"
                ? "Menopause"
                : gynecHistoryData?.reproductiveLifeStages?.toLowerCase() ===
                  "perimenopause"
                ? "Perimenopause"
                : "Lactational amenorrhea"}
              &nbsp;:&nbsp;
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
              </>
            )}
          </Text>
        </Text>
      )}

      {gynecHistoryData?.notes && (
        <Text style={{ lineHeight: 1.4 }}>
          <Text
            style={{
              color: "#171725",
              fontFamily: printSettings?.page_format?.font_family,
              fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
              fontWeight: 500,
            }}
          >
            <Text
              style={{
                color: "#171725",
                fontFamily: printSettings?.page_format?.font_family,
                fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                fontWeight: 500,
              }}
            >
              &nbsp;{gynecListViewCounter++}.&nbsp;Menstruation note&nbsp;:&nbsp;
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
          </Text>
        </Text>
      )}
    </View>
  );
}

export default GynecHistoryListView;
