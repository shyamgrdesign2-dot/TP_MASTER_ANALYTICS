import { useState, useEffect } from 'react';
import { isMobile, isIOS, isAndroid, isTablet } from 'react-device-detect';

/**
 * Custom hook to detect device type, platform, and viewport information
 * Enhanced for mobile PWA design with responsive breakpoints and orientation detection
 * 
 * @returns {Object} Device information object
 * @property {boolean} isMobile - True if device is mobile
 * @property {boolean} isTablet - True if device is tablet
 * @property {boolean} isIOS - True if device is iOS
 * @property {boolean} isAndroid - True if device is Android
 * @property {boolean} isPWA - True if app is running as PWA (standalone mode)
 * @property {number} width - Current window width in pixels
 * @property {number} height - Current window height in pixels
 * @property {string} orientation - 'portrait' or 'landscape'
 * @property {string} screenSize - 'small' (< 464px), 'medium' (464-1024px), 'large' (> 1024px)
 * @property {boolean} isSmallScreen - True if width < 464px (mobile breakpoint)
 * @property {boolean} isMediumScreen - True if width >= 464px and < 1024px (tablet breakpoint)
 * @property {boolean} isLargeScreen - True if width >= 1024px (desktop breakpoint)
 * @property {number} devicePixelRatio - Device pixel ratio (for retina displays)
 * @property {boolean} isTouchDevice - True if device supports touch
 */
export const useDeviceType = () => {
  const [isPWA, setIsPWA] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined') {
      return;
    }

    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    const checkPWA = () => {
      const standalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone ||
        document.referrer.includes('android-app://');
      setIsPWA(standalone);
    };

    const handleOrientationChange = () => {
      // Delay to allow orientation change to complete
      setTimeout(() => {
        updateDimensions();
        checkPWA();
      }, 100);
    };

    // Initial checks
    checkPWA();
    updateDimensions();

    // Event listeners
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Listen for display mode changes (PWA install/uninstall)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      checkPWA();
    };
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      } else {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
    };
  }, []);

  const { width, height } = dimensions;
  
  // Determine orientation
  const orientation = width > height ? 'landscape' : 'portrait';
  
  // Screen size categories based on common breakpoints used in the codebase
  const isSmallScreen = width < 464; // Mobile breakpoint
  const isMediumScreen = width >= 464 && width < 1024; // Tablet breakpoint
  const isLargeScreen = width >= 1024; // Desktop breakpoint
  
  // Screen size label
  const screenSize = isSmallScreen ? 'small' : isMediumScreen ? 'medium' : 'large';
  
  // Device pixel ratio for retina displays
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  
  // Touch device detection
  const isTouchDevice = 
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0);

  return {
    // Device type (from react-device-detect)
    isMobile,
    isTablet,
    isIOS,
    isAndroid,
    isPWA,
    
    // Viewport dimensions
    width,
    height,
    orientation,
    
    // Screen size categories
    screenSize,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    
    // Display properties
    devicePixelRatio,
    isTouchDevice,
  };
};

export default useDeviceType;

