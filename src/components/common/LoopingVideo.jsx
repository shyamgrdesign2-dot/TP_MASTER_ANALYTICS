import React from "react";

const LoopingVideo = ({
  webm,
  mp4,
  className,
  style,
  width,
  height,
  ariaLabel,
  poster,
}) => {
  return (
    <video
      className={className}
      style={style}
      width={width}
      height={height}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      poster={poster}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {webm ? <source src={webm} type="video/webm" /> : null}
      {mp4 ? <source src={mp4} type="video/mp4" /> : null}
    </video>
  );
};

export default LoopingVideo;
