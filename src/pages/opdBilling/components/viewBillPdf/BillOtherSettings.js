import { Image, Text, View } from "@react-pdf/renderer";
import { PX_TO_PT, styles } from "./constants";
import { useEffect, useState } from "react";
import config from "../../../../config";
import QRCode from "qrcode";

const BillOtherSettings = ({ printSettings, profile, doctorName }) => {
  const { headerFooter } = printSettings;
  const { header, otherSettings } = headerFooter || {};
  const { doctorInfo } = header || {};
  const { signature, qrCode } = otherSettings || {};

  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    if (qrCode?.enabled) {
      const qrUrl = getQrCodeUrl();
      if (qrUrl) {
        setQrCodeUrl(qrUrl);
      }
    }
  }, []);

  const getQrCodeUrl = async () => {
    return await QRCode.toDataURL(
      `${config.doctor_website_url}${parseInt(
        printSettings?.um_contact,
        10
      ).toString(36)}_${printSettings?.hm_refer_code}`
    );
  };

  return (
    <View style={{ marginTop: PX_TO_PT * 29 }} wrap={false}>
      {signature?.enabled && signature?.file && (
        <View
          style={{
            alignSelf: signature?.position === "right" && "flex-end",
          }}
        >
          <Image
            style={{ width: 139, height: 60, objectFit: "contain" }}
            src={signature?.file}
          />
        </View>
      )}

      {qrCode?.enabled && signature?.enabled ? (
        signature?.position === "right" ? (
          <View style={styles.directionCasemanager}>
            <View style={[styles.directionCasemanager, { flex: 1 }]}>
              {qrCodeUrl && (
                <>
                  <Image
                    style={{ width: 61, height: 61, objectFit: "contain" }}
                    src={qrCodeUrl}
                  />
                  <Text
                    style={{
                      fontSize: PX_TO_PT * 10,
                      color: "#000",
                      fontFamily: "Roboto",
                      fontWeight: 400,
                    }}
                  >
                    {`Scan QR code to book an appointment\nwith your doctor or download your old\ndigital prescription`}
                  </Text>
                </>
              )}
            </View>
            <View style={{ flex: 1, textAlign: "right" }}>
              {doctorInfo?.enabled && (
                <Text
                  style={[styles.extraText, { fontWeight: 700, color: "#000" }]}
                >
                  {profile?.um_name || doctorName}
                </Text>
              )}
              {signature?.registrationEnabled && (
                <Text
                  style={[styles.extraText, { fontWeight: 400, color: "#000" }]}
                >
                  Medical Registration No.: {profile?.gmc_no}
                </Text>
              )}
              {signature?.qualificationEnabled && (
                <Text
                  style={[styles.extraText, { fontWeight: 400, color: "#000" }]}
                >
                  {signature?.qualification ?? profile?.um_qualifications}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              {signature?.doctorNameEnabled && (
                <Text
                  style={[styles.extraText, { fontWeight: 700, color: "#000" }]}
                >
                  {profile?.um_name}
                </Text>
              )}
              {signature?.registrationEnabled && (
                <Text
                  style={[styles.extraText, { fontWeight: 400, color: "#000" }]}
                >
                  Medical Registration No.: {profile?.gmc_no}
                </Text>
              )}
              {signature?.qualificationEnabled && (
                <Text
                  style={[styles.extraText, { fontWeight: 400, color: "#000" }]}
                >
                  {signature?.qualification ?? profile?.um_qualifications}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.directionCasemanager,
                { flex: 1, justifyContent: "flex-end" },
              ]}
            >
              {qrCodeUrl && (
                <>
                  <Image
                    style={{ width: 61, height: 61, objectFit: "contain" }}
                    src={qrCodeUrl}
                  />
                  <Text
                    style={{
                      fontSize: PX_TO_PT * 10,
                      color: "#000",
                      fontFamily: "Roboto",
                      fontWeight: 400,
                    }}
                  >
                    {`Scan QR code to book an appointment\nwith your doctor or download your old\ndigital prescription`}
                  </Text>
                </>
              )}
            </View>
          </View>
        )
      ) : (
        (qrCode?.enabled || signature?.enabled) && (
          <View style={{ flexDirection: "row" }}>
            {qrCode?.enabled && (
              <View style={styles.directionCasemanager}>
                {qrCodeUrl && (
                  <>
                    <Image
                      style={{
                        width: 61,
                        height: 61,
                        objectFit: "contain",
                      }}
                      src={qrCodeUrl}
                    />
                    <Text
                      style={{
                        fontSize: PX_TO_PT * 10,
                        color: "#000",
                        fontFamily: "Roboto",
                        fontWeight: 400,
                      }}
                    >
                      {`Scan QR code to book an appointment\nwith your doctor or download your old\ndigital prescription`}
                    </Text>
                  </>
                )}
              </View>
            )}
            {signature?.enabled && (
              <View
                style={{
                  flex: 1,
                  textAlign: signature?.position === "right" && "right",
                }}
              >
                {signature?.doctorNameEnabled && (
                  <Text
                    style={[
                      styles.extraText,
                      { fontWeight: 700, color: "#000" },
                    ]}
                  >
                    {profile?.um_name}
                  </Text>
                )}
                {signature?.registrationEnabled && (
                  <Text
                    style={[
                      styles.extraText,
                      { fontWeight: 400, color: "#000" },
                    ]}
                  >
                    Medical Registration No.: {profile?.gmc_no}
                  </Text>
                )}
                {signature?.qualificationEnabled && (
                  <Text
                    style={[
                      styles.extraText,
                      { fontWeight: 400, color: "#000" },
                    ]}
                  >
                    {signature?.qualification ?? profile?.um_qualifications}
                  </Text>
                )}
              </View>
            )}
          </View>
        )
      )}
    </View>
  );
};

export default BillOtherSettings;
