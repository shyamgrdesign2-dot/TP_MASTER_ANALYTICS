import React from "react";
import { QRCodeSVG } from "qrcode.react";
import "./QRCodeGenerator.scss";

const QRCodeGenerator = ({ data, size = 120 }) => {
  return (
    <div className="qr-code-container">
      <div className="qr-code-wrapper">
        {/* Corner arrows/brackets */}
        <div className="qr-corner qr-corner-tl"></div>
        <div className="qr-corner qr-corner-tr"></div>
        <div className="qr-corner qr-corner-bl"></div>
        <div className="qr-corner qr-corner-br"></div>

        {/* QR Code */}
        {data ? (
          <QRCodeSVG
          value={data || ""}
          size={size}
          bgColor="#F8F8FD"
          fgColor="#000000"
          level="M"
          />
        ) : (
          <div className="qr-code-placeholder ">
            <div className="shimmer-content">
              <div className="shimmer"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodeGenerator;
