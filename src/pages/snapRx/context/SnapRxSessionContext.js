import React, { createContext, useContext, useEffect, useState } from "react";
import { getOrCreateSessionId, clearSessionId } from "../utils/sessionUtils";

const SnapRxSessionContext = createContext();

export const SnapRxSessionProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(null);
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);

  useEffect(() => {
    // Generate or get existing session ID when context mounts
    const currentSessionId = getOrCreateSessionId();
    setSessionId(currentSessionId);

  }, []);

  const refreshSessionId = () => {
    clearSessionId();
    const newSessionId = getOrCreateSessionId();
    setSessionId(newSessionId);
    return newSessionId;
  };

  const value = {
    sessionId,
    refreshSessionId,
    hasUploadedFiles,
    setHasUploadedFiles,
  };

  return (
    <SnapRxSessionContext.Provider value={value}>
      {children}
    </SnapRxSessionContext.Provider>
  );
};

export const useSnapRxSession = () => {
  const context = useContext(SnapRxSessionContext);
  if (!context) {
    throw new Error(
      "useSnapRxSession must be used within a SnapRxSessionProvider"
    );
  }
  return context;
};
