import React from "react";

/* TP AI linear gradient — used when `gradientId` prop is supplied */
function TpAiGradient({ id }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#D565EA" />
      <stop offset="55%" stopColor="#673AAC" />
      <stop offset="100%" stopColor="#1A1994" />
    </linearGradient>
  );
}

/* VoiceRx icon — 5 vertical bars (equalizer). Generic voice glyph. */
export function VoiceRxIcon({ size = 24, color = "currentColor", className, style, gradientId }) {
  const fill = gradientId ? `url(#${gradientId})` : color;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style} aria-hidden>
      {gradientId && <defs><TpAiGradient id={gradientId} /></defs>}
      <path d="M6.2865 17.7156C5.75939 17.7156 5.32227 17.2785 5.32227 16.7514V11.236C5.32227 10.7088 5.75939 10.2717 6.2865 10.2717C6.81362 10.2717 7.25074 10.7088 7.25074 11.236V16.7514C7.25074 17.2914 6.81362 17.7156 6.2865 17.7156Z" fill={fill} />
      <path d="M10.1434 19.5539C9.61632 19.5539 9.1792 19.1168 9.1792 18.5897V9.41015C9.1792 8.88303 9.61632 8.44591 10.1434 8.44591C10.6706 8.44591 11.1077 8.88303 11.1077 9.41015V18.5897C11.1077 19.1297 10.6706 19.5539 10.1434 19.5539Z" fill={fill} />
      <path d="M14.0004 21.3924C13.4733 21.3924 13.0361 20.9553 13.0361 20.4281V7.57166C13.0361 7.04454 13.4733 6.60742 14.0004 6.60742C14.5275 6.60742 14.9646 7.04454 14.9646 7.57166V20.4281C14.9646 20.9553 14.5275 21.3924 14.0004 21.3924Z" fill={fill} />
      <path d="M17.8574 19.5539C17.3303 19.5539 16.8932 19.1168 16.8932 18.5897V9.41015C16.8932 8.88303 17.3303 8.44591 17.8574 8.44591C18.3845 8.44591 18.8216 8.88303 18.8216 9.41015V18.5897C18.8216 19.1297 18.3845 19.5539 17.8574 19.5539Z" fill={fill} />
      <path d="M21.7142 17.7156C21.1871 17.7156 20.75 17.2785 20.75 16.7514V11.236C20.75 10.7088 21.1871 10.2717 21.7142 10.2717C22.2414 10.2717 22.6785 10.7088 22.6785 11.236V16.7514C22.6785 17.2914 22.2414 17.7156 21.7142 17.7156Z" fill={fill} />
    </svg>
  );
}

/* Conversation icon — two people (used in mode picker) */
export function ConversationIcon({ size = 24, color = "currentColor", className, gradientId }) {
  const fill = gradientId ? `url(#${gradientId})` : color;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      {gradientId && <defs><TpAiGradient id={gradientId} /></defs>}
      <path d="M11.7813 7.33325C9.84374 7.33325 8.26855 8.75325 8.26855 10.4999C8.26855 12.2133 9.75499 13.5999 11.6925 13.6599C11.7517 13.6533 11.8109 13.6533 11.8552 13.6599C11.87 13.6599 11.8774 13.6599 11.8922 13.6599C11.8996 13.6599 11.8996 13.6599 11.907 13.6599C13.8002 13.5999 15.2866 12.2133 15.294 10.4999C15.294 8.75325 13.7188 7.33325 11.7813 7.33325Z" fill={fill} />
      <path d="M15.5382 15.4334C13.4749 14.1934 10.1101 14.1934 8.03205 15.4334C7.09286 16.0001 6.5752 16.7668 6.5752 17.5868C6.5752 18.4068 7.09286 19.1668 8.02466 19.7268C9.05999 20.3534 10.4207 20.6668 11.7814 20.6668C13.1422 20.6668 14.5029 20.3534 15.5382 19.7268C16.47 19.1601 16.9877 18.4001 16.9877 17.5734C16.9803 16.7534 16.47 15.9934 15.5382 15.4334Z" fill={fill} />
      <path d="M19.9084 10.8933C20.0268 12.1867 19.0062 13.32 17.5937 13.4733C17.5864 13.4733 17.5863 13.4733 17.579 13.4733H17.5568C17.5124 13.4733 17.468 13.4733 17.431 13.4867C16.7137 13.52 16.0555 13.3133 15.5601 12.9333C16.3218 12.32 16.7581 11.4 16.6693 10.4C16.6176 9.85998 16.4105 9.36665 16.0999 8.94665C16.3809 8.81999 16.7063 8.73999 17.0391 8.71332C18.4886 8.59999 19.7827 9.57332 19.9084 10.8933Z" fill={fill} />
      <path d="M21.3879 17.0599C21.3287 17.7066 20.8702 18.2666 20.1011 18.6466C19.3616 19.0133 18.4298 19.1866 17.5054 19.1666C18.0378 18.7333 18.3484 18.1933 18.4076 17.6199C18.4815 16.7933 18.0452 15.9999 17.1726 15.3666C16.6771 15.0133 16.1003 14.7333 15.4717 14.5266C17.106 14.0999 19.1619 14.3866 20.4265 15.3066C21.1068 15.7999 21.4544 16.4199 21.3879 17.0599Z" fill={fill} />
    </svg>
  );
}

/* Dictation icon — single person + sound wave on right */
export function DictationIcon({ size = 24, color = "currentColor", className, gradientId }) {
  const fill = gradientId ? `url(#${gradientId})` : color;
  const stroke = gradientId ? `url(#${gradientId})` : color;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      {gradientId && <defs><TpAiGradient id={gradientId} /></defs>}
      {/* head */}
      <circle cx="11" cy="10" r="3.5" fill={fill} />
      {/* shoulders / bust */}
      <path d="M11 14.5c-3.6 0-6.5 2.4-6.5 5.4 0 .3.2.5.5.5h12c.3 0 .5-.2.5-.5 0-3-2.9-5.4-6.5-5.4Z" fill={fill} />
      {/* sound waves on the right */}
      <path d="M18.6 10.5c.6.8 1 1.7 1 2.7s-.4 2-1 2.7" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M21 8.5c1.3 1.3 2 3 2 4.7s-.7 3.4-2 4.7" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function VoiceConsultKindIcon({ kind, size = 24, gradientId }) {
  if (kind === "dictation_consultation") {
    return <DictationIcon size={size} gradientId={gradientId} />;
  }
  return <ConversationIcon size={size} gradientId={gradientId} />;
}
