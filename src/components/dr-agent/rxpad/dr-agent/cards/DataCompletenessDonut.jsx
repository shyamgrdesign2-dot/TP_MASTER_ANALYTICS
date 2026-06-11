import React from "react";
export function DataCompletenessDonut({ value, size = 32 }) {
  return <span style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", border: "2px solid #4b4ad5" }} />;
}
