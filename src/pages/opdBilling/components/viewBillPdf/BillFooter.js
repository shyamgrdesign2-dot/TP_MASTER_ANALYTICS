import { Image, Text, View } from "@react-pdf/renderer";
import { getMarginByFormat } from "./helper";
import { PX_TO_PT } from "./constants";
import moment from "moment";

const BillFooter = ({ printSettings, billData, showCreatedBy }) => {
  const { headerFooter } = printSettings;
  const { footer } = headerFooter || {};

  return (
    <View
      style={{
        position: "absolute",
        bottom: getMarginByFormat(
          headerFooter?.letterHeadFormat,
          headerFooter,
          "bottom",
          0.5
        ),
        left: getMarginByFormat(
          printSettings?.letterhead_format,
          headerFooter,
          "left",
          0.5
        ),
        right: getMarginByFormat(
          headerFooter?.letterHeadFormat,
          headerFooter,
          "right",
          0.5
        ),
      }}
      fixed
    >
      {showCreatedBy && (
        <View>
          <Text
            style={{
              marginTop: PX_TO_PT * 8,
              marginBottom: PX_TO_PT * 8,
              color: "#6A6A74",
              fontFamily: "Roboto",
              fontSize: PX_TO_PT * footer?.fontSize,
              fontWeight: 400,
              maxLines: 1,
            }}
          >
            Bill Created By : {billData?.createdByName} | Created on :{" "}
            {billData?.createdAt
              ? moment(billData.createdAt).format("DD/MM/YYYY")
              : "-"}
          </Text>
        </View>
      )}

      {headerFooter?.letterHeadFormat === 0 ? (
        <View>
          <View
            style={{
              backgroundColor: "#171725",
              height: PX_TO_PT * 2,
              width: "100%",
            }}
          />
          <Text
            style={{
              marginTop: PX_TO_PT * 8,
              color: "#171725",
              fontFamily: "Roboto",
              fontSize: PX_TO_PT * footer?.fontSize,
              fontWeight: 400,
              maxLines: 1,
            }}
          >
            {footer?.title}
          </Text>
        </View>
      ) : (
        headerFooter?.letterHeadFormat === 1 &&
        footer?.file && (
          <Image
            style={{ width: "100%", objectFit: "cover" }}
            src={
              footer?.file instanceof File
                ? URL.createObjectURL(footer?.file)
                : footer?.file
            }
          />
        )
      )}
    </View>
  );
};

export default BillFooter;
