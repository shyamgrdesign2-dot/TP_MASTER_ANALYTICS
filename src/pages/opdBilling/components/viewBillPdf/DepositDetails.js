import { Text, View } from "@react-pdf/renderer";
import { PX_TO_PT, styles } from "./constants";
import React from "react";

const DepositDetails = ({ pageFormat, depositData, totalAdvanceBalance }) => {
  const {
    notes,
    paymentModes = [],
    totalAmount,
    transactionType,
  } = depositData;
  const BillData = [
    {
      items: "Advance Deposit",
      notes: notes,
      total: `₹${totalAmount}`,
    },
  ];

  const advanceReceipt = [
    {
      label: "Total Payable Amount:",
      value: `₹${totalAmount.toFixed(2)}`,
      bold: true,
      divider: true,
    },
    ...paymentModes?.map((mode, index) => ({
      label: `Paid Via ${mode.paymentMode}:`,
      value: `₹${mode.amount.toFixed(2)}`,
      divider: index === paymentModes.length - 1,
    })),
    transactionType === "Refund"
      ? {
          label: "Refunded Amount:",
          value: `₹${totalAmount.toFixed(2)}`,
          color: "#FC5A5A",
          bold: true,
        }
      : {
          label: "Total Amount Paid:",
          value: `₹${totalAmount.toFixed(2)}`,
          color: "#3D8C40",
          bold: true,
        },
    {
      label: "Advance Balance:",
      value: `₹${totalAdvanceBalance?.toFixed(2)}`,
      color: "#A461D8",
      bold: true,
    },
  ]?.filter((item) => item);

  return (
    <>
      <View style={styles.table}>
        <View style={styles.row}>
          <Text
            style={[
              styles.cell,
              {
                flex: 0.1,
                fontFamily: pageFormat?.fontFamily,
                fontSize: PX_TO_PT * pageFormat?.fontSize,
                fontWeight: 500,
                color: "#000",
                backgroundColor: "#F1F1F5",
              },
            ]}
          >
            #
          </Text>
          <Text
            style={[
              styles.cell,
              {
                flex: 0.5,
                fontFamily: pageFormat?.fontFamily,
                fontSize: PX_TO_PT * pageFormat?.fontSize,
                fontWeight: 500,
                color: "#000",
                backgroundColor: "#F1F1F5",
              },
            ]}
          >
            ITEMS/SERVICES
          </Text>

          <Text
            style={[
              styles.cell,
              {
                flex: 0.9,
                fontFamily: pageFormat?.fontFamily,
                fontSize: PX_TO_PT * pageFormat?.fontSize,
                fontWeight: 500,
                color: "#000",
                backgroundColor: "#F1F1F5",
              },
            ]}
          >
            NOTES
          </Text>

          <Text
            style={[
              styles.cell,
              {
                flex: 0.5,
                fontFamily: pageFormat?.fontFamily,
                fontSize: PX_TO_PT * pageFormat?.fontSize,
                fontWeight: 500,
                color: "#000",
                backgroundColor: "#F1F1F5",
              },
            ]}
          >
            TOTAL AMOUNT
          </Text>
        </View>
        {BillData?.map((item, i) => (
          <View style={styles.row} key={i}>
            <Text
              style={[
                styles.cell,
                {
                  flex: 0.1,
                  color: "#171725",
                  fontFamily: pageFormat?.fontFamily,
                  fontSize: PX_TO_PT * pageFormat?.fontSize,
                  fontWeight: 400,
                },
              ]}
            >
              {i + 1}
            </Text>
            <Text
              style={[
                styles.cell,
                {
                  flex: 0.5,
                  color: "#171725",
                  fontFamily: pageFormat?.fontFamily,
                  fontSize: PX_TO_PT * pageFormat?.fontSize,
                  fontWeight: 400,
                },
              ]}
            >
              {item?.items ?? ""}
            </Text>
            <Text
              style={[
                styles.cell,
                {
                  flex: 0.9,
                  color: "#171725",
                  fontFamily: pageFormat?.fontFamily,
                  fontSize: PX_TO_PT * pageFormat?.fontSize,
                  fontWeight: 400,
                  lineHeight: 1.4,
                },
              ]}
            >
              {item?.notes ?? ""}
            </Text>

            <Text
              style={[
                styles.cell,
                {
                  flex: 0.5,
                  color: "#171725",
                  fontFamily: pageFormat?.fontFamily,
                  fontSize: PX_TO_PT * pageFormat?.fontSize,
                  fontWeight: 400,
                },
              ]}
            >
              {item?.total ?? ""}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          width: "100%",
          marginTop: 10,
        }}
      >
        {advanceReceipt?.map((item, index) => (
          <React.Fragment key={index}>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "flex-end",
                width: "45%",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: pageFormat?.fontFamily,
                  fontSize:
                    PX_TO_PT * (pageFormat?.fontSize + (item.bold ? 1 : 0)),
                  color: item?.color ?? "#000",
                  fontWeight: item.bold ? "500" : "400",
                  textAlign: "left",
                  width: "60%",
                }}
              >
                {item.label}
              </Text>
              <Text
                style={{
                  fontFamily: pageFormat?.fontFamily,
                  fontSize:
                    PX_TO_PT * (pageFormat?.fontSize + (item.bold ? 1 : 0)),
                  color: item?.color ?? "#000",
                  fontWeight: item.bold ? "500" : "400",
                  textAlign: "right",
                  width: "40%",
                }}
              >
                {item.value}
              </Text>
            </View>

            {item.divider && (
              <View
                style={{
                  width: "45%",
                  borderBottom: "1px solid #F1F1F5",
                  marginBottom: 8,
                }}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    </>
  );
};

export default DepositDetails;
