import { useCallback, useEffect, useRef, useState } from "react";

export function useNetConnection() {
  const [online, setOnline] = useState(true);
  const checkRef = useRef(null);

  const verifyConnection = useCallback(async () => {
    try {
      const res = await fetch("/favicon.ico", { method: "HEAD", cache: "no-store" });
      setOnline(res.ok);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      checkRef.current = setTimeout(verifyConnection, 500);
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    verifyConnection();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (checkRef.current) clearTimeout(checkRef.current);
    };
  }, [verifyConnection]);

  return { online };
}
