import { useState } from "react";

const ReadMore = ({
  text,
  textLimit,
  textSize,
  labelSize,
  isInfo = false,
  title,
}) => {
  const [isReadMore, setIsReadMore] = useState(true);
  const toggleReadMore = () => {
    setIsReadMore(!isReadMore);
  };
  return (
    <div
      className="text mb-0 fontroboto lh-base"
      style={{ wordBreak: "break-word" }}
    >
      {isReadMore && text.length > textLimit ? (
        <span style={{ fontSize: labelSize, fontWeight: 400 }}>
          {title ? <span style={{ fontWeight: 600 }}>{title}</span> : null}
          {text.slice(0, textLimit)}
        </span>
      ) : (
        <span style={{ fontSize: labelSize, fontWeight: 400 }}>
          {title ? <span style={{ fontWeight: 600 }}>{title}</span> : null}
          {`${text}${isInfo ? ")" : ""}`}
        </span>
      )}
      <span
        onClick={toggleReadMore}
        className="read-or-hide"
        style={{ cursor: "pointer", fontSize: textSize }}
      >
        {text.length > textLimit
          ? isReadMore
            ? "... view more"
            : " view less"
          : ""}
        {!!(text.length > textLimit && isReadMore && isInfo) && <span>)</span>}
      </span>
    </div>
  );
};

export default ReadMore;
