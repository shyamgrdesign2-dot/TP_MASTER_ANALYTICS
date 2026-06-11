import { useState, useEffect } from 'react';

const TABLET_QUERY = '(min-width: 600px) and (max-width: 1280px)';

export function useTabletViewport() {
  const [isTabletViewport, setIsTabletViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(TABLET_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(TABLET_QUERY);
    const update = (e) => setIsTabletViewport(e.matches);

    mql.addEventListener('change', update);

    return () => mql.removeEventListener('change', update);
  }, []);

  return isTabletViewport;
}

export default useTabletViewport;