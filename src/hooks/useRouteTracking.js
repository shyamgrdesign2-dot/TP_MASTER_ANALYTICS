import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const normalizePath = (path) =>
  path.replace(/\d+/g, ":id");

export default function useRouteTracking() {
  const location = useLocation();
  const prevPathRef = useRef("");

  useEffect(() => {
    const pathname = location.pathname || "/";

    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    const normalizedPath = normalizePath(pathname);

    window?.Moengage?.track_event?.("route_mount", {
      pathname: normalizedPath,
    });
  }, [location.pathname]);
}