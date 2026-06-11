import React from "react";
import { Modal, Button } from "antd";
import { QRCodeSVG } from "qrcode.react";

/**
 * Reusable QR modal with Print/Download actions.
 *
 * Parent owns:
 * - open/close state
 * - qrValue generation
 * - print/download handlers (can use contentRef)
 */
export default function QrPrintDownloadModal({
  open,
  onClose,
  contentRef,
  title,
  byName,
  logoSrc,
  hospitalLogo,
  qrValue,
  qrSize = 180,
  scanText,
  className = "opd-plan-qr",
  onPrint,
  onDownload,
  printLabel = "Print",
  downloadLabel = "Download",
}) {
  return (
    <Modal
      open={!!open}
      centered
      closeIcon={false}
      onCancel={onClose}
      footer={null}
      title={null}
      destroyOnClose
      className={className}
    >
      <div className="opd-qr">
        <button className="qr-close-btn" onClick={onClose}>
          <i style={{ fontSize: "2rem" }} className="icon-Cross"></i>
        </button>

        <div ref={contentRef} className="opd-plans-inner-contianer">
          {hospitalLogo ? (
            <div
              className="opd-title"
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <img
                src={hospitalLogo}
                alt="Hospital Logo"
                style={{
                  maxHeight: "60px",
                  maxWidth: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          ) : (
            <div
              className="opd-title"
              style={{
                fontWeight: "700",
                fontSize: "1.7rem",
                color: "#1F2933 !important",
              }}
            >
              {title}
            </div>
          )}

          {byName ? (
            <div
              className="opd-byline"
              style={{ marginBottom: "1rem", marginTop: "0.4rem" }}
            >
              by <strong>{byName}</strong>
            </div>
          ) : null}

          <div className="d-flex align-items-center justify-content-center">
            {logoSrc && title !== "Appointment Booking Link" ? (
              <div className="opd-logo log-holder">
                <img
                  src={logoSrc}
                  style={{ height: "1.8rem" }}
                  className="logo-text-icon"
                  alt="Logo"
                />
              </div>
            ) : null}

            {qrValue ? (
              <QRCodeSVG
                className="opd-qr-image"
                value={qrValue}
                size={qrSize}
              />
            ) : null}
          </div>

          {scanText ? (
            <div
              className="opd-scan-text"
              style={{
                marginTop: "1.5rem",
                fontSize: "1rem",
                color: "#454551 !important",
                textAlign: "center",
              }}
            >
              {scanText}
            </div>
          ) : null}
        </div>

        <div className="d-flex align-items-center justify-content-between gap-4 mt-4">
          <Button
            onClick={onPrint}
            className="btn btn-primary1 btn-41 align-items-center d-flex justify-content-center"
            style={{ width: "13rem", height: "3rem" }}
            disabled={!onPrint}
          >
            <span className="fs-18 align-items-center d-flex ">
              <i className="icon-Print me-2"></i>
              {printLabel}
            </span>
          </Button>

          <Button
            onClick={onDownload}
            className="btn btn-primary1 btn-41 align-items-center d-flex justify-content-center"
            style={{ width: "13rem", height: "3rem" }}
            disabled={!onDownload}
          >
            <span className="fs-18 align-items-center d-flex">
              <i className="icon-download me-2"></i>
              {downloadLabel}
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}


