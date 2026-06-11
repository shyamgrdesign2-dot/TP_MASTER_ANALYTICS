import React from "react";
import { Skeleton } from "antd";

const SkeletonComponent = () => {
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        padding: "24px",
      }}
    >
      {/* First row - large card */}
      <Skeleton.Node
        active
        style={{
          width: "37.10244rem",
          height: "37.26031rem",
          borderRadius: "1rem",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "1rem",
          }}
        />
      </Skeleton.Node>

      {/* Second row - smaller card */}
      <Skeleton.Node
        active
        style={{
          width: "31.37744rem",
          height: "7.68656rem",
          flexShrink: 0,
          borderRadius: "1rem",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "1rem",
          }}
        />
      </Skeleton.Node>
    </div>
  );
};

export default SkeletonComponent;
