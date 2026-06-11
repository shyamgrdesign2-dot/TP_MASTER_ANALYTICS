import { Image, Text, View } from "@react-pdf/renderer";
import {
  billDataShow,
  getBillInfoTitleToShow,
  patientDataShow,
  patientIpdDataShow,
} from "./helper";
import { PX_TO_PT, styles } from "./constants";

const BillHeader = ({
  printSettings,
  isDepositReceipt,
  patientData,
  billData,
  profile,
  gstIn,
  isIpdBill,
}) => {
  const { headerFooter, pageFormat } = printSettings || {};
  const { header, otherSettings, patientInfo, billInfo } = headerFooter || {};
  const { clinicInfo, doctorInfo, logo } = header || {};
  const { waterMark } = otherSettings || {};
  const { patientInfoFontSize } = pageFormat || {};

  return (
    <>
      <View
        style={{
          marginBottom:
            PX_TO_PT * (headerFooter?.letterHeadFormat != 2 ? 15 : 0),
        }}
        fixed
      >
        {headerFooter?.letterHeadFormat === 0 ? (
          <View>
            {doctorInfo?.enabled && clinicInfo?.enabled ? (
              <View style={styles.directionCasemanager}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mainTitle}>
                    {doctorInfo?.position === "left"
                      ? doctorInfo?.header
                      : clinicInfo?.header}
                  </Text>
                  <Text style={[styles.subTitle, { marginTop: PX_TO_PT * 4 }]}>
                    {doctorInfo?.position === "left"
                      ? doctorInfo?.subheader
                      : clinicInfo?.subheader}
                  </Text>
                </View>
                {logo?.enabled && (
                  <View
                    style={{
                      width: 82,
                      height: 82,
                      overflow: "hidden",
                      marginHorizontal: 16,
                    }}
                  >
                    {logo?.enabled && logo?.file && (
                      <Image
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                        src={
                          logo?.file instanceof File
                            ? URL.createObjectURL(logo?.file)
                            : logo?.file
                        }
                      />
                    )}
                  </View>
                )}
                <View style={{ flex: 1, textAlign: "right" }}>
                  <Text style={styles.mainTitle}>
                    {doctorInfo?.position === "right"
                      ? doctorInfo?.header
                      : clinicInfo?.header}
                  </Text>
                  <Text style={[styles.subTitle, { marginTop: PX_TO_PT * 4 }]}>
                    {doctorInfo?.position === "right"
                      ? doctorInfo?.subheader
                      : clinicInfo?.subheader}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {logo?.enabled && (
                  <View
                    style={{
                      width: 82,
                      height: 82,
                      overflow: "hidden",
                      marginLeft: 8,
                    }}
                  >
                    {logo?.enabled && logo?.file && (
                      <Image
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                        src={
                          logo?.file instanceof File
                            ? URL.createObjectURL(logo?.file)
                            : logo?.file
                        }
                      />
                    )}
                  </View>
                )}
                {doctorInfo?.enabled ? (
                  <View
                    style={{
                      flex: 1,
                      textAlign:
                        doctorInfo?.position === "left" ? "left" : "right",
                      weight: "189px",
                    }}
                  >
                    <Text style={styles.mainTitle}>
                      {doctorInfo?.enabled
                        ? doctorInfo?.header
                        : clinicInfo?.header}
                    </Text>
                    <Text
                      style={[styles.subTitle, { marginTop: PX_TO_PT * 4 }]}
                    >
                      {doctorInfo?.enabled
                        ? doctorInfo?.subheader
                        : clinicInfo?.subheader}
                    </Text>
                  </View>
                ) : (
                  clinicInfo?.enabled && (
                    <View
                      style={{
                        flex: 1,
                        textAlign:
                          clinicInfo?.position === "left" ? "left" : "right",
                        weight: "130px",
                      }}
                    >
                      <Text style={styles.mainTitle}>
                        {doctorInfo?.enabled
                          ? doctorInfo?.header
                          : clinicInfo?.header}
                      </Text>
                      <Text
                        style={[styles.subTitle, { marginTop: PX_TO_PT * 4 }]}
                      >
                        {doctorInfo?.enabled
                          ? doctorInfo?.subheader
                          : clinicInfo?.subheader}
                      </Text>
                    </View>
                  )
                )}
              </View>
            )}
          </View>
        ) : (
          headerFooter?.letterHeadFormat === 1 &&
          headerFooter?.header?.file && (
            <Image
              style={{ width: "100%", objectFit: "contain" }}
              src={
                headerFooter?.header?.file instanceof File
                  ? URL.createObjectURL(headerFooter?.header?.file)
                  : headerFooter?.header?.file
              }
            />
          )
        )}
      </View>

      {waterMark?.enabled && waterMark?.file && (
        <Image
          style={{
            width: 100,
            height: 100,
            objectFit: "contain",
            zIndex: -1,
            opacity: 0.1,
            position: "absolute",
            top: "50%",
            left: "40%",
          }}
          src={
            waterMark?.file instanceof File
              ? URL.createObjectURL(waterMark?.file)
              : waterMark?.file
          }
          fixed
        />
      )}

      <View
        style={{
          backgroundColor: "#171725",
          height: PX_TO_PT * 2,
          width: "100%",
        }}
      />

      <View
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          marginTop: 6,
        }}
      >
        <Text style={[styles.subTitle, { fontWeight: 700 }]}>
          {isDepositReceipt ? "Advance Deposit Receipt" : "Bill Cum Receipt"}
        </Text>
      </View>

      <View style={{ flexDirection: "row", marginVertical: PX_TO_PT * 5 }}>
        <View style={{ flex: 0.7, marginRight: PX_TO_PT * 8 }}>
          {patientInfo
            ?.filter((e) => e.enabled)
            ?.map((item, i) => {
              return (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    paddingVertical: PX_TO_PT * 3,
                    flexWrap: "wrap",
                    width: "65%",
                  }}
                >
                  <Text
                    style={[
                      styles.displayPatient,
                      {
                        fontWeight: 500,
                        fontSize: patientInfoFontSize * PX_TO_PT,
                      },
                    ]}
                  >{`${item.title}: `}</Text>
                  <Text
                    style={[
                      styles.displayPatient,
                      {
                        fontWeight: 400,
                        fontSize: patientInfoFontSize * PX_TO_PT,
                      },
                    ]}
                  >
                    {isIpdBill ? patientIpdDataShow(item.id, patientData, billData, profile) : patientDataShow(item.id, patientData, billData, profile)}
                  </Text>
                </View>
              );
            })}
        </View>
        <View style={{ flex: 0.3, marginLeft: PX_TO_PT * 8 }}>
          {billInfo
            ?.filter(
              (item, index) =>
                item.enabled && (!isDepositReceipt || index !== 0)
            )
            ?.map((item, i) => {
              return (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    paddingVertical: PX_TO_PT * 3,
                    flexWrap: "wrap",
                  }}
                >
                  <Text
                    style={[
                      styles.displayPatient,
                      {
                        fontWeight: 500,
                        fontSize: patientInfoFontSize * PX_TO_PT,
                      },
                    ]}
                  >{`${getBillInfoTitleToShow(
                    item.id,
                    item.title,
                    isDepositReceipt
                  )}: `}</Text>
                  <Text
                    style={[
                      styles.displayPatient,
                      {
                        fontWeight: 400,
                        fontSize: patientInfoFontSize * PX_TO_PT,
                      },
                    ]}
                  >
                    {billDataShow(item.id, billData, gstIn)}
                  </Text>
                </View>
              );
            })}
        </View>
      </View>

      <View
        style={{
          backgroundColor: "#171725",
          height: PX_TO_PT * 1,
          width: "100%",
        }}
      />
    </>
  );
};

export default BillHeader;
