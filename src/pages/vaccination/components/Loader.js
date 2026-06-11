import React from "react";
import { Spin } from "antd";

const FullPageLoader = () => {
  return (
    <div style={styles.loaderContainer}>
      <Spin size="large" />
    </div>
  );
};

const styles = {
  loaderContainer: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    zIndex: 9999,
  },
};

export default FullPageLoader;
