import React from "react";
import { Text, View } from "@react-pdf/renderer";

const PX_TO_PT = 0.75;

const ThenConnector = ({ printSettings }) => {
  return (
    <View
      style={{
        position: "absolute",
        bottom: -PX_TO_PT * 9,
        left: -PX_TO_PT * 18,
        right: 0,
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        zIndex: 1,
      }}
    >
      <View
        style={{
          borderRadius: PX_TO_PT * 8,
          backgroundColor: "#f1f1f5",
          border: "1px solid #353536",
          paddingHorizontal: PX_TO_PT * 8,
          paddingVertical: PX_TO_PT * 2,
          minWidth: PX_TO_PT * 30,
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        <Text
          style={{
            color: "#171725",
            fontFamily: printSettings?.page_format?.font_family,
            fontSize: PX_TO_PT * printSettings?.page_format?.font_size - 2,
            fontWeight: 400,
          }}
        >
          Then
        </Text>
      </View>
    </View>
  );
};

export default ThenConnector;
