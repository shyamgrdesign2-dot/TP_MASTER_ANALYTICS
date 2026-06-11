import { Text, View } from "@react-pdf/renderer";
import { PX_TO_PT, styles } from "./constants";
import React from "react";
import { formatDateWithOrdinal } from "../../utils/helper";
import dayjs from "dayjs";

const BillDetails = ({
  pageFormat,
  billData,
  totalAdvanceBalance,
  isIpdBill,
}) => {
  const {
    billItems,
    subTotal,
    lineItemDiscount,
    extraDiscount,
    extraDiscountType,
    applicableGst,
    payableAmount,
    paymentModes = [],
    paidAmount,
    dueFromPreviousBill,
    dueAmount,
    notes,
    paymentStatus,
    refundedAmount,
    refundModes = [],
    refundNotes,
    nextBillNumber,
    paidDues,
  } = billData || {};

  const totalBillAmount = billItems?.reduce(
    (sum, service) => sum + (Number(service.totalAmount) || 0),
    0
  );

  const extraDiscountAmount =
    extraDiscountType === "percentage"
      ? (totalBillAmount * (Number(extraDiscount) || 0)) / 100 // Percentage based
      : Number(extraDiscount) || 0; // Flat/Rupee based

  const billInfo = [
    { label: "Subtotal:", value: `₹${subTotal}` },
    { label: "Line Item Discount:", value: `₹${lineItemDiscount}` },
    {
      label: "Applicable GST:",
      value: `₹${applicableGst}`,
      divider: dueFromPreviousBill === 0,
    },
    { label: "Extra Discount:", value: `₹${extraDiscountAmount?.toFixed(2)}` },
    dueFromPreviousBill > 0
      ? {
          label: "Due from Previous bill:",
          value: `₹${dueFromPreviousBill?.toFixed(2)}`,
          divider: true,
        }
      : undefined,
    {
      label: "Total Payable Amount:",
      value: `₹${payableAmount?.toFixed(2)}`,
      bold: true,
      divider: true,
    },
    ...paymentModes?.map((mode, index) => ({
      label: `Paid Via ${mode.paymentMode}:`,
      value: `₹${mode.amount.toFixed(2)}`,
      divider: index === paymentModes.length - 1,
    })),
    {
      label: "Total Amount Paid:",
      value: `₹${paidAmount?.toFixed(2)}`,
      color: "#3D8C40",
      bold: true,
      divider: true,
    },
    paymentStatus === "Refunded"
      ? {
          label: "Total Refund Amount:",
          value: `₹${refundedAmount?.toFixed(2)}`,
          color: "#FC5A5A",
          bold: true,
          divider: true,
        }
      : undefined,
    ...refundModes?.map((mode) => ({
      label: `Refunded Via ${mode.paymentMode}:`,
      value: `₹${mode.amount.toFixed(2)}`,
      divider: true,
    })),
    // Add dues items - each due gets its payment modes and cleared total
    ...(paidDues && paidDues.length > 0
      ? paidDues.flatMap((due, dueIndex) => {
          const hasPaymentModes =
            due?.paymentModes && due.paymentModes.length > 0;
          const dueAmount = Number(due?.paidAmount) || 0;

          if (!hasPaymentModes && dueAmount === 0) {
            return [];
          }

          const items = [];

          // Add payment modes for this due
          if (hasPaymentModes) {
            items.push({
              isDueCard: true,
              dueIndex,
              paymentModes: due.paymentModes,
            });
          }

          // Add due cleared total for this due
          if (dueAmount > 0) {
            items.push({
              label: `Due Cleared (${formatDateWithOrdinal(due?.date)}):`,
              value: `₹${dueAmount?.toFixed(2)}`,
              color: "#3D8C40",
              bold: true,
              isDueCleared: true,
              divider: true,
            });
          }

          return items;
        })
      : []),
    dueAmount > 0
      ? {
          label: "Total Payment Due:",
          value: `₹${dueAmount?.toFixed(2)}`,
          color: "#ED8A00",
          bold: true,
          textDecoration: nextBillNumber,
        }
      : undefined,
    totalAdvanceBalance > 0
      ? {
          label: "Advance Balance:",
          value: `₹${totalAdvanceBalance?.toFixed(2)}`,
          color: "#A461D8",
          bold: true,
        }
      : undefined,
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
          {isIpdBill && (
            <Text
              style={[
                styles.cell,
                {
                  flex: 0.3,
                  fontFamily: pageFormat?.fontFamily,
                  fontSize: PX_TO_PT * pageFormat?.fontSize,
                  fontWeight: 500,
                  color: "#000",
                  backgroundColor: "#F1F1F5",
                },
              ]}
            >
              DATE
            </Text>
          )}
          <Text
            style={[
              styles.cell,
              {
                flex: 0.8,
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
                flex: isIpdBill ? 0.2 : 0.4,
                fontFamily: pageFormat?.fontFamily,
                fontSize: PX_TO_PT * pageFormat?.fontSize,
                fontWeight: 500,
                color: "#000",
                backgroundColor: "#F1F1F5",
              },
            ]}
          >
            QTY
          </Text>
          <Text
            style={[
              styles.cell,
              {
                flex: isIpdBill ? 0.3 : 0.4,
                fontFamily: pageFormat?.fontFamily,
                fontSize: PX_TO_PT * pageFormat?.fontSize,
                fontWeight: 500,
                color: "#000",
                backgroundColor: "#F1F1F5",
              },
            ]}
          >
            AMOUNT
          </Text>
          <Text
            style={[
              styles.cell,
              {
                flex: 0.4,
                fontFamily: pageFormat?.fontFamily,
                fontSize: PX_TO_PT * pageFormat?.fontSize,
                fontWeight: 500,
                color: "#000",
                backgroundColor: "#F1F1F5",
              },
            ]}
          >
            DISCOUNT
          </Text>
          <Text
            style={[
              styles.cell,
              {
                flex: 0.4,
                fontFamily: pageFormat?.fontFamily,
                fontSize: PX_TO_PT * pageFormat?.fontSize,
                fontWeight: 500,
                color: "#000",
                backgroundColor: "#F1F1F5",
              },
            ]}
          >
            GST(%)
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
        {billItems?.map((item, i) => (
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
            {isIpdBill && (
              <Text
                style={[
                  styles.cell,
                  {
                    flex: 0.3,
                    color: "#171725",
                    fontFamily: pageFormat?.fontFamily,
                    fontSize: PX_TO_PT * pageFormat?.fontSize,
                    fontWeight: 400,
                  },
                ]}
              >
                {item?.itemDate
                  ? dayjs(item?.itemDate).format("DD-MM-YYYY")
                  : ""}
              </Text>
            )}
            <Text
              style={[
                styles.cell,
                {
                  flex: 0.8,
                  color: "#171725",
                  fontFamily: pageFormat?.fontFamily,
                  fontSize: PX_TO_PT * pageFormat?.fontSize,
                  fontWeight: 400,
                },
              ]}
            >
              {item?.name ?? ""}
            </Text>
            <Text
              style={[
                styles.cell,
                {
                  flex: isIpdBill ? 0.2 : 0.4,
                  color: "#171725",
                  fontFamily: pageFormat?.fontFamily,
                  fontSize: PX_TO_PT * pageFormat?.fontSize,
                  fontWeight: 400,
                },
              ]}
            >
              {item?.quantity ?? ""}
            </Text>
            <Text
              style={[
                styles.cell,
                {
                  flex: isIpdBill ? 0.3 : 0.4,
                  color: "#171725",
                  fontFamily: pageFormat?.fontFamily,
                  fontSize: PX_TO_PT * pageFormat?.fontSize,
                  fontWeight: 400,
                },
              ]}
            >
              {item?.amount ? `₹${item?.amount}` : "₹0"}
            </Text>
            <Text
              style={[
                styles.cell,
                {
                  flex: 0.4,
                  color: "#171725",
                  fontFamily: pageFormat?.fontFamily,
                  fontSize: PX_TO_PT * pageFormat?.fontSize,
                  fontWeight: 400,
                },
              ]}
            >
              {item?.discount && item?.discountType === "flat"
                ? `₹${item?.discount}`
                : item?.discount
                ? `${item?.discount}%`
                : ""}
            </Text>
            <Text
              style={[
                styles.cell,
                {
                  flex: 0.4,
                  color: "#171725",
                  fontFamily: pageFormat?.fontFamily,
                  fontSize: PX_TO_PT * pageFormat?.fontSize,
                  fontWeight: 400,
                },
              ]}
            >
              {item.gst ? `${item?.gst}%` : ""}
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
              {item?.totalAmount ? `₹${item?.totalAmount}` : "₹0"}
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
        {billInfo.map((item, index) => {
          // Handle due card rendering
          if (item.isDueCard) {
            return (
              <View
                key={`due-card-${item.dueIndex}-${index}`}
                style={{
                  width: "45%",
                  backgroundColor: "#F1F1F5",
                  borderRadius: 10,
                  padding: PX_TO_PT * 12,
                  marginBottom: PX_TO_PT * 8,
                  opacity: 0.8,
                }}
              >
                {item.paymentModes.map((mode, modeIndex, array) => (
                  <View
                    key={modeIndex}
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom:
                        modeIndex < array.length - 1 ? PX_TO_PT * 8 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: pageFormat?.fontFamily,
                        fontSize: PX_TO_PT * pageFormat?.fontSize,
                        color: "#454551",
                        fontWeight: 400,
                      }}
                    >
                      Due Paid Via "{mode.paymentMode}":
                    </Text>
                    <Text
                      style={{
                        fontFamily: pageFormat?.fontFamily,
                        fontSize: PX_TO_PT * pageFormat?.fontSize,
                        color: "#454551",
                        fontWeight: 400,
                      }}
                    >
                      ₹{mode.amount?.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          }

          // Regular bill info item
          return (
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
                    textDecoration: item.textDecoration
                      ? "line-through"
                      : "none",
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
                    textDecoration: item.textDecoration
                      ? "line-through"
                      : "none",
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
          );
        })}

        {nextBillNumber && (
          <Text
            style={{
              fontFamily: pageFormat?.fontFamily,
              fontSize: PX_TO_PT * pageFormat?.fontSize,
              lineHeight: 1.4,
              width: "45%",
              backgroundColor: "#F1F1F5",
              borderRadius: 6,
              padding: 6,
              marginTop: 5,
              textAlign: "left",
            }}
          >
            This due amount of{" "}
            <Text style={{ fontWeight: 500 }}>₹{dueAmount?.toFixed(2)}</Text>{" "}
            has been automatically added to the patients next bill (Bill No:{" "}
            <Text style={{ fontWeight: 500 }}>{nextBillNumber}</Text>
            ).
          </Text>
        )}
      </View>

      {(paidDues?.some((due) => !!due?.notes) || refundNotes || notes) && (
        <View
          style={{
            backgroundColor: "rgba(241, 241, 245, 0.5)",
            borderRadius: 10,
            padding: PX_TO_PT * 12,
            marginTop: PX_TO_PT * 10,
            width: "100%",
            opacity: 0.8,
            gap: PX_TO_PT * 6,
          }}
        >
          {paidDues
            ?.filter((due) => !!due?.notes)
            ?.map((due, index, arr) => (
              <React.Fragment key={`due-remarks-${index}`}>
                <Text
                  style={{
                    fontFamily: pageFormat?.fontFamily,
                    fontSize: (pageFormat?.fontSize || 12) * PX_TO_PT,
                    color: "#454551",
                  }}
                >
                  <Text style={{ fontWeight: 600 }}>Due Remarks:</Text>
                  <Text style={{ fontWeight: 400 }}> {due?.notes}</Text>
                </Text>
                {(index < arr.length - 1 || refundNotes || notes) && (
                  <View
                    style={{
                      width: "100%",
                      borderBottom: "1px solid #E2E2EA",
                      marginVertical: PX_TO_PT * 2,
                    }}
                  />
                )}
              </React.Fragment>
            ))}

          {refundNotes && (
            <>
              <Text
                style={{
                  fontFamily: pageFormat?.fontFamily,
                  fontSize: (pageFormat?.fontSize || 12) * PX_TO_PT,
                  color: "#454551",
                }}
              >
                <Text style={{ fontWeight: 600 }}>Refund Remarks:</Text>
                <Text style={{ fontWeight: 400 }}> {refundNotes}</Text>
              </Text>
              {notes && (
                <View
                  style={{
                    width: "100%",
                    borderBottom: "1px solid #E2E2EA",
                    marginVertical: PX_TO_PT * 2,
                  }}
                />
              )}
            </>
          )}

          {notes && (
            <Text
              style={{
                fontFamily: pageFormat?.fontFamily,
                fontSize: (pageFormat?.fontSize || 12) * PX_TO_PT,
                color: "#454551",
              }}
            >
              <Text style={{ fontWeight: 600 }}>Notes:</Text>
              <Text style={{ fontWeight: 400 }}> {notes}</Text>
            </Text>
          )}
        </View>
      )}
    </>
  );
};

export default BillDetails;
