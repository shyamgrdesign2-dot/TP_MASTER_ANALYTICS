import { StyleSheet } from "@react-pdf/renderer";

export const PX_TO_PT = 0.75;

export const styles = StyleSheet.create({
  mainTitle: {
    fontSize: PX_TO_PT * 18,
    color: "#A461D8",
    fontFamily: "Roboto",
    fontWeight: 700,
  },
  subTitle: {
    fontSize: PX_TO_PT * 14,
    color: "#454551",
    fontFamily: "Roboto",
    fontWeight: 500,
    lineHeight: 1.4,
  },
  displayPatient: {
    fontSize: PX_TO_PT * 12,
    color: "#171725",
    fontFamily: "Roboto",
  },
  mainCasemanager: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  extraText: {
    fontSize: PX_TO_PT * 12,
    color: "#171725",
    fontFamily: "Roboto",
  },
  directionCasemanager: {
    flexDirection: "row",
    alignItems: "center",
  },
  table: {
    marginTop: PX_TO_PT * 4, // Remove the borderTop and borderLeft styles
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FCFCFC",
    zIndex: 1,
  },
  row: {
    flexDirection: "row", // Remove the borderBottom style
  },
  cell: {
    flex: 1,
    padding: 6, // Remove the borderRight style
  },
  minHeight50: {
    minHeight: 50,
  },
  minHeight38: {
    minHeight: 38,
  },
});
