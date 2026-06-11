export const HARDWARE_A4_MAP = {
  canvasWidth: 720,
  canvasHeight: 980,
  deviceXMin: 10,
  deviceXMax: 464,
  deviceYMin: 1,
  deviceYMax: 640,
  // Symmetric vertical compensation to align pen strokes over template.
  yBowSymmetricFrac: 0.012,
  // Progressive horizontal pull to fix right-edge drift.
  xRightDriftFrac: 0.012,
};

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Map one hardware point to canvas pixels (origin top-left). */
export const hardwarePointToCanvas = (deviceX, deviceY, config = HARDWARE_A4_MAP) => {
  const {
    canvasWidth,
    canvasHeight,
    deviceXMin,
    deviceXMax,
    deviceYMin,
    deviceYMax,
    yBowSymmetricFrac,
    xRightDriftFrac,
  } = config;

  const xSpan = deviceXMax - deviceXMin;
  const ySpan = deviceYMax - deviceYMin;
  const nx = xSpan > 0 ? (deviceX - deviceXMin) / xSpan : 0;
  const ny = ySpan > 0 ? (deviceY - deviceYMin) / ySpan : 0;

  const linearX = nx * canvasWidth;
  const xRightPull = xRightDriftFrac > 0 ? xRightDriftFrac * canvasWidth * nx : 0;
  const linearY = ny * canvasHeight;
  const bow = yBowSymmetricFrac > 0 ? yBowSymmetricFrac * canvasHeight * (1 - 2 * ny) : 0;

  return {
    x: clamp(linearX - xRightPull, 0, canvasWidth),
    y: clamp(linearY + bow, 0, canvasHeight),
  };
};

// Effective scales after removing device margins (for any legacy/debug use)
export const getScaleFactors = (config = HARDWARE_A4_MAP) => {
  const { canvasWidth, canvasHeight, deviceXMin, deviceXMax, deviceYMin, deviceYMax } = config;
  const xSpan = deviceXMax - deviceXMin;
  const ySpan = deviceYMax - deviceYMin;
  return {
    xScaleFactor: xSpan > 0 ? canvasWidth / xSpan : 1,
    yScaleFactor: ySpan > 0 ? canvasHeight / ySpan : 1,
  };
};

export const getScaleFactor = (config = HARDWARE_A4_MAP) => {
  const { xScaleFactor, yScaleFactor } = getScaleFactors(config);
  return (xScaleFactor + yScaleFactor) / 2;
};

export const configureCanvasContext = (ctx) => {
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) {
    ctx.imageSmoothingQuality = "high";
  }
  return ctx;
};
