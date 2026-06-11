import React from "react";
import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";
import {
  clearChunkReloadState,
  isChunkLoadError,
  shouldReloadForChunkFailure,
} from "../utils/chunkReloadGuard";

export default function ErrorFallback({ error, resetErrorBoundary }) {
  const navigate = useNavigate();
  const [isRecovering, setIsRecovering] = React.useState(false);

  const message = error?.message || "";
  const isChunk = isChunkLoadError(message);

  React.useEffect(() => {
    if (!isChunk) return;
    if (!shouldReloadForChunkFailure(`boundary:${message}`)) return;

    const recover = async () => {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (e) {
        console.warn("Cleanup failed:", e);
      }

      window.location.reload();
    };

    setIsRecovering(true);
    recover();
  }, [isChunk, message]);

  // Show minimal UI while recovering
  if (isRecovering) {
    return (
      <div style={{ textAlign: "center", marginTop: 100 }}>
        Updating app… please wait
      </div>
    );
  }

  return (
    <Result
      status="error"
      title="Something went wrong"
      subTitle={
        isChunk
          ? "We updated the app. Please refresh to continue."
          : message || "An unexpected error occurred."
      }
      extra={[
        <Button
          type="primary"
          key="retry"
          onClick={() => {
            clearChunkReloadState();
            if (isChunk) {
              window.location.reload();
              return;
            }
            resetErrorBoundary();
          }}
        >
          {isChunk ? "Reload now" : "Try Again"}
        </Button>,
        <Button
          key="home"
          onClick={() => {
            clearChunkReloadState();
            resetErrorBoundary();
            navigate("/");
          }}
        >
          Go Home
        </Button>,
      ]}
    />
  );
}