const FreeBadge = ({ show, className, style }) => {
  if (!show) return null;
  return (
    <span
      className={`d-inline-flex align-items-center justify-content-center rounded text-white small ${className || ""}`}
      style={{
        fontSize: 12,
        fontWeight: 600,
        background: "#c44ea2",
        padding: "2px 4px",
        height: 22,
        ...style,
      }}
    >
      Free
    </span>
  );
};

export default FreeBadge;
