let _handler = null;

export const toast = {
  warning: (msg) => {
    if (_handler) {
      _handler({ type: "warning", msg });
    } else {
      console.warn("[toast]", msg);
    }
  },
  success: (msg) => {
    if (_handler) {
      _handler({ type: "success", msg });
    } else {
      console.log("[toast]", msg);
    }
  },
  error: (msg) => {
    if (_handler) {
      _handler({ type: "error", msg });
    } else {
      console.error("[toast]", msg);
    }
  },
  setHandler: (fn) => {
    _handler = fn;
  },
};
