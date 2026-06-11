import React from "react";
import { Text, View } from "@react-pdf/renderer";
import moment from "moment";
import { getIndianLanguageFont } from "../../../utils/utils";

function GynecHistoryTableView({
  PX_TO_PT,
  styles,
  printSettings,
  gynecHistoryData,
}) {
  const hasValue = (value) =>
    value !== undefined &&
    value !== null &&
    !(typeof value === "string" && value.trim() === "");
  const hasValidDate = (value) => hasValue(value) && moment(value).isValid();
  const reproductiveLifeStage = gynecHistoryData?.reproductiveLifeStages?.toLowerCase();

  const hasLmpData = hasValidDate(gynecHistoryData?.lmp);
  const hasCycleData =
    hasValue(gynecHistoryData?.cycle) ||
    hasValue(gynecHistoryData?.intervalOfCycle) ||
    hasValue(gynecHistoryData?.cycleNotes);
  const hasFlowData =
    hasValue(gynecHistoryData?.flow) ||
    hasValue(gynecHistoryData?.durationOfMenstrualFlow) ||
    hasValue(gynecHistoryData?.numberOfPadsPerDay) ||
    typeof gynecHistoryData?.clots === "boolean" ||
    hasValue(gynecHistoryData?.flowNotes);
  const hasPainData =
    hasValue(gynecHistoryData?.pain) ||
    hasValue(gynecHistoryData?.occurrenceOfPain) ||
    hasValue(gynecHistoryData?.painNotes);
  const hasMenarcheData =
    hasValue(gynecHistoryData?.ageAtMenarche) ||
    hasValue(gynecHistoryData?.menarcheNotes);
  const hasReproductiveData =
    hasValue(gynecHistoryData?.reproductiveLifeStages) ||
    hasValue(gynecHistoryData?.ageAtMenopause) ||
    hasValue(gynecHistoryData?.typeOfMenopause) ||
    hasValue(gynecHistoryData?.reproductiveNotes);

  return (
    <View style={{ marginTop: PX_TO_PT * 15 }}>
      <Text
        style={{
          color: "#171725",
          fontFamily: printSettings?.page_format?.font_family,
          fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
          fontWeight: 700,
        }}
        wrap={false}
      >
        Menstrual details&nbsp;:&nbsp;
      </Text>
      {hasLmpData && <View wrap={false} style={{ break: "avoid" }}>
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
          LMP
        </Text>
        <View style={[styles.table, { marginTop: 0 }]}>
          <View
            style={[
              styles.headerRow,
              { alignItems: "center", justifyContent: "center" },
            ]}
          >
            <Text
              style={[
                styles.headerCell,
                {
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                  color: "#000",
                },
              ]}
            >
              Date
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
                },
              ]}
            >
              {gynecHistoryData?.lmp
                ? moment(gynecHistoryData?.lmp).format("DD MMM YYYY")
                : `-`}
            </Text>
          </View>
        </View>
      </View>}
      {hasCycleData && <View wrap={false} style={{ break: "avoid" }}>
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
          Cycle
        </Text>
        <View style={[styles.table, { marginTop: 0 }]}>
          <View
            style={[
              styles.headerRow,
              { alignItems: "center", justifyContent: "center" },
            ]}
          >
            <Text
              style={[
                styles.headerCell,
                {
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                  color: "#000",
                  textAlign: "center",
                },
              ]}
            >
              Type
            </Text>
            <Text
              style={[
                styles.headerCell,
                {
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                  color: "#000",
                  textAlign: "center",
                },
              ]}
            >
              Interval
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
                  textTransform: "capitalize",
                },
              ]}
            >
              {gynecHistoryData?.cycle || `-`}
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
              ]}
            >
              {gynecHistoryData?.intervalOfCycle || ``}&nbsp;
              {gynecHistoryData?.intervalOfCycle
                ? Number(gynecHistoryData?.intervalOfCycle) > 1
                  ? `days`
                  : `day`
                : `-`}
            </Text>
          </View>

          <View style={[styles.row]}>
            <Text style={[styles.cell]}>
              <Text
                style={[
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                  },
                ]}
              >
                Notes&nbsp;:&nbsp;
              </Text>

              <Text
                style={[
                  {
                    fontFamily: getIndianLanguageFont(
                      gynecHistoryData?.cycleNotes,
                      printSettings?.page_format?.font_family
                    ),
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                  },
                ]}
              >
                {gynecHistoryData?.cycleNotes || `-`}&nbsp;
              </Text>
            </Text>
          </View>
        </View>
      </View>}
      {hasFlowData && <View wrap={false} style={{ break: "avoid" }}>
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
          Flow
        </Text>
        <View style={[styles.table, { marginTop: 0 }]}>
          <View
            style={[
              styles.headerRow,
              { alignItems: "center", justifyContent: "center" },
            ]}
          >
            <Text
              style={[
                styles.headerCell,
                {
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                  color: "#000",
                  textAlign: "center",
                },
              ]}
            >
              Volume
            </Text>
            <Text
              style={[
                styles.headerCell,
                {
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                  color: "#000",
                  textAlign: "center",
                },
              ]}
            >
              Duration flow
            </Text>
            <Text
              style={[
                styles.headerCell,
                {
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                  color: "#000",
                  textAlign: "center",
                },
              ]}
            >
              Clots
            </Text>
            <Text
              style={[
                styles.headerCell,
                {
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                  color: "#000",
                  textAlign: "center",
                },
              ]}
            >
              Pads per day
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
                  textTransform: "capitalize",
                },
              ]}
            >
              {gynecHistoryData?.flow || `-`}
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
              ]}
            >
              {gynecHistoryData?.durationOfMenstrualFlow || ``}&nbsp;
              {gynecHistoryData?.durationOfMenstrualFlow
                ? Number(gynecHistoryData?.durationOfMenstrualFlow) > 1
                  ? `days`
                  : `day`
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
              ]}
            >
              {Boolean(gynecHistoryData?.clots) ? `Yes` : `No`}
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
              ]}
            >
              {gynecHistoryData?.numberOfPadsPerDay || `-`}
            </Text>
          </View>

          <View style={[styles.row]}>
            <Text style={[styles.cell]}>
              <Text
                style={[
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                  },
                ]}
              >
                Notes&nbsp;:&nbsp;
              </Text>

              <Text
                style={[
                  {
                    fontFamily: getIndianLanguageFont(
                      gynecHistoryData?.flowNotes,
                      printSettings?.page_format?.font_family
                    ),
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                  },
                ]}
              >
                {gynecHistoryData?.flowNotes || `-`}&nbsp;
              </Text>
            </Text>
          </View>
        </View>
      </View>}
      {hasPainData && <View wrap={false} style={{ break: "avoid" }}>
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
          Pain
        </Text>
        <View style={[styles.table, { marginTop: 0 }]}>
          <View
            style={[
              styles.headerRow,
              { alignItems: "center", justifyContent: "center" },
            ]}
          >
            <Text
              style={[
                styles.headerCell,
                {
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                  color: "#000",
                  textAlign: "center",
                },
              ]}
            >
              Level
            </Text>
            <Text
              style={[
                styles.headerCell,
                {
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                  color: "#000",
                  textAlign: "center",
                },
              ]}
            >
              Occurrence
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
                  textTransform: "capitalize",
                },
              ]}
            >
              {gynecHistoryData?.pain || `-`}
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
                  textTransform: "capitalize",
                },
              ]}
            >
              {gynecHistoryData?.occurrenceOfPain || `-`}
            </Text>
          </View>

          <View style={[styles.row]}>
            <Text style={[styles.cell]}>
              <Text
                style={[
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                  },
                ]}
              >
                Notes&nbsp;:&nbsp;
              </Text>

              <Text
                style={[
                  {
                    fontFamily: getIndianLanguageFont(
                      gynecHistoryData?.painNotes,
                      printSettings?.page_format?.font_family
                    ),
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                  },
                ]}
              >
                {gynecHistoryData?.painNotes || `-`}&nbsp;
              </Text>
            </Text>
          </View>
        </View>
      </View>}
      {hasMenarcheData && <View wrap={false} style={{ break: "avoid" }}>
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
          Menarche
        </Text>
        <View style={[styles.table, { marginTop: 0 }]}>
          <View
            style={[
              styles.headerRow,
              { alignItems: "center", justifyContent: "center" },
            ]}
          >
            <Text
              style={[
                styles.headerCell,
                {
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                  color: "#000",
                },
              ]}
            >
              Age at
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
                },
              ]}
            >
              {gynecHistoryData?.ageAtMenarche || ``}{" "}
              {gynecHistoryData?.ageAtMenarche ? `years` : `-`}
            </Text>
          </View>

          <View style={[styles.row]}>
            <Text style={[styles.cell]}>
              <Text
                style={[
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                  },
                ]}
              >
                Notes&nbsp;:&nbsp;
              </Text>

              <Text
                style={[
                  {
                    fontFamily: getIndianLanguageFont(
                      gynecHistoryData?.menarcheNotes,
                      printSettings?.page_format?.font_family
                    ),
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                  },
                ]}
              >
                {gynecHistoryData?.menarcheNotes || `-`}&nbsp;
              </Text>
            </Text>
          </View>
        </View>
      </View>}
      {hasReproductiveData && <View wrap={false} style={{ break: "avoid" }}>
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
          {reproductiveLifeStage ===
          "menopause"
            ? "Menopause"
            : reproductiveLifeStage ===
              "perimenopause"
            ? "Perimenopause"
            : "Lactational amenorrhea"}
        </Text>
        <View style={[styles.table, { marginTop: 0 }]}>
          <View
            style={[
              styles.headerRow,
              { alignItems: "center", justifyContent: "center" },
            ]}
          >
            <Text
              style={[
                styles.headerCell,
                {
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                  color: "#000",
                  textAlign: "center",
                },
              ]}
            >
              Age
            </Text>
            <Text
              style={[
                styles.headerCell,
                {
                  fontFamily: printSettings?.page_format?.font_family,
                  fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                  fontWeight: 500,
                  color: "#000",
                  textAlign: "center",
                },
              ]}
            >
              Type of{" "}
              {reproductiveLifeStage ===
              "menopause"
                ? "menopause"
                : reproductiveLifeStage ===
                  "perimenopause"
                ? "perimenopause"
                : "lactational amenorrhea"}
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
              ]}
            >
              {gynecHistoryData?.ageAtMenopause || ``}{" "}
              {gynecHistoryData?.ageAtMenopause ? `years` : `-`}
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
                  textTransform: "capitalize",
                },
              ]}
            >
              {gynecHistoryData?.typeOfMenopause || `-`}
            </Text>
          </View>

          <View style={[styles.row]}>
            <Text style={[styles.cell]}>
              <Text
                style={[
                  {
                    fontFamily: printSettings?.page_format?.font_family,
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 500,
                    color: "#000",
                  },
                ]}
              >
                Notes&nbsp;:&nbsp;
              </Text>

              <Text
                style={[
                  {
                    fontFamily: getIndianLanguageFont(
                      gynecHistoryData?.reproductiveNotes,
                      printSettings?.page_format?.font_family
                    ),
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                  },
                ]}
              >
                {gynecHistoryData?.reproductiveNotes || `-`}&nbsp;
              </Text>
            </Text>
          </View>
        </View>
      </View>}
      {gynecHistoryData?.notes && (
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
            wrap={false}
          >
            Menstruation note
          </Text>
          <View style={[styles.table, { marginTop: 0 }]}>
            <View style={[styles.headerRow]} wrap={false}>
              <Text
                style={[
                  styles.cell,
                  {
                    fontFamily: getIndianLanguageFont(
                      gynecHistoryData?.notes,
                      printSettings?.page_format?.font_family
                    ),
                    fontSize: PX_TO_PT * printSettings?.page_format?.font_size,
                    fontWeight: 400,
                    color: "#000",
                  },
                ]}
              >
                {gynecHistoryData?.notes || `-`}&nbsp;
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export default GynecHistoryTableView;
