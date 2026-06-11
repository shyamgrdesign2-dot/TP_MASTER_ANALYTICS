import React, { createContext, useContext, useEffect, useState } from "react";
import { getOrCreateSessionId, clearSessionId } from "../utils/sessionUtils";

const OphthalSnapRxSessionContext = createContext();

export const OphthalSnapRxSessionProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(null);
  const [hasUploadedFiles, setHasUploadedFiles] = useState(false);

  useEffect(() => {
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
    <OphthalSnapRxSessionContext.Provider value={value}>
      {children}
    </OphthalSnapRxSessionContext.Provider>
  );
};

export const useOphthalSnapRxSession = () => {
  const context = useContext(OphthalSnapRxSessionContext);
  if (!context) {
    throw new Error(
      "useOphthalSnapRxSession must be used within a OphthalSnapRxSessionProvider"
    );
  }
  return context;
};
