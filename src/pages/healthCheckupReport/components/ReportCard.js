import React, { useCallback } from "react";
import { Dropdown } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import "./ReportCard.scss";
import { ASSETS } from "../../../assets";
const {
  documentDownload: download,
  documentEdit: edit,
  preview,
  whatsappPurple: send,
} = ASSETS.images;

function ReportCard({
  report,
  onEdit,
  onPreview,
  onDelete,
  onDownload,
  onSendToPatient,
  onClick,
  thumbnailUrl,
  isSending = false,
}) {
  const handleCardClick = useCallback(() => {
    if (typeof onClick === "function") {
      onClick(report);
    }
  }, [onClick, report]);

  const handleEdit = useCallback(() => {
    if (typeof onEdit === "function") {
      onEdit(report);
    }
  }, [onEdit, report]);

  const handlePreview = useCallback(() => {
    if (typeof onPreview === "function") {
      onPreview(report);
    }
  }, [onPreview, report]);

  const handleDownload = useCallback(() => {
    if (typeof onDownload === "function") {
      onDownload(report);
    }
  }, [onDownload, report]);

  const handleSendToPatient = useCallback(() => {
    if (typeof onSendToPatient === "function") {
      onSendToPatient(report);
    }
  }, [onSendToPatient, report]);

  const menuItems = [
    {
      key: "preview",
      label: "Preview",
      icon: <img src={preview} alt="preview" />,
      disabled: isSending,
    },
    {
      key: "download",
      label: "Print",
      icon: <img src={download} alt="download" />,
      disabled: isSending,
    },
    // {
    //   key: "send",
    //   label: isSending ? "Sending..." : "Send to Patient",
    //   icon: isSending ? <LoadingOutlined /> : <img src={send} alt="send" />,
    //   disabled: isSending,
    // },
    {
      key: "edit",
      label: "Edit",
      icon: <img src={edit} alt="edit" />,
      disabled: isSending,
    },
  ];

  const handleMenuClick = useCallback(
    (e) => {
      e.domEvent.stopPropagation();

      switch (e.key) {
        case "edit":
          handleEdit();
          break;
        case "preview":
          handlePreview();
          break;
        case "download":
          handleDownload();
          break;
        case "send":
          handleSendToPatient();
          break;
        default:
          break;
      }
    },
    [handleEdit, handlePreview, handleDownload, handleSendToPatient],
  );

  const [isImageLoaded, setIsImageLoaded] = React.useState(false);
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setIsImageLoaded(false);
    setImageFailed(false);
  }, [thumbnailUrl]);

  // Format date from report metadata or createdAt
  const reportDate = report?.createdAt || report?.created_at || report?.date;
  const formattedDate =
    reportDate && dayjs(reportDate).isValid()
      ? dayjs(reportDate).format("DD MMM, YYYY")
      : "N/A";

  const handleCardKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCardClick();
      }
    },
    [handleCardClick]
  );

  return (
    <div
      className="report-card"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleCardKeyDown}
    >
      {/* Thumbnail preview */}
      <div className="report-card__thumbnail">
        {thumbnailUrl && !imageFailed ? (
          <>
            {!isImageLoaded && (
              <div className="report-card__thumbnail-skeleton" />
            )}
            <img
              src={thumbnailUrl}
              alt="Report preview"
              className="report-card__thumbnail-img"
              style={{ display: isImageLoaded ? 'block' : 'none' }}
              onLoad={() => setIsImageLoaded(true)}
              onError={() => {
                setImageFailed(true);
                setIsImageLoaded(true);
              }}
            />
          </>
        ) : (
          <div className="report-card__thumbnail-placeholder">
            <span>Health Check-up Report</span>
          </div>
        )}
      </div>

      {/* Footer with date and menu */}
      <div className="report-card__footer">
        <div className="report-card__date">{formattedDate}</div>
        <Dropdown
          menu={{ items: menuItems, onClick: handleMenuClick }}
          trigger={["click"]}
          placement="bottomRight"
          overlayClassName="report-card__dropdown"
        >
          <button
            className="report-card__menu-btn"
            onClick={(e) => e.stopPropagation()}
            aria-label="Report actions"
          >
            <i className="icon-More" />
          </button>
        </Dropdown>
      </div>
    </div>
  );
}

export default React.memo(ReportCard);
