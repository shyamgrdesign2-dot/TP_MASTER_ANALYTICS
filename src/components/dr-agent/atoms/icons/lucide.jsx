import React from "react";
import { ArrowLeft2, ArrowRight2, ArrowDown2, ArrowUp2, Copy, Microphone2, Stop, Send2, Refresh, TickCircle, InfoCircle, Warning2, CloseSquare, Eye, EyeSlash } from "iconsax-reactjs";

/* Plain X (no circle) — matches Lucide's X icon */
export const X = ({ size = 16, className, style, strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const ChevronLeft = (p) => <ArrowLeft2 {...p} variant="Linear" />;
export const ChevronRight = (p) => <ArrowRight2 {...p} variant="Linear" />;
export const ChevronDown = (p) => <ArrowDown2 {...p} variant="Linear" />;
export const ChevronUp = (p) => <ArrowUp2 {...p} variant="Linear" />;
export const Clipboard = (p) => <Copy {...p} variant="Linear" />;
export const Mic = (p) => <Microphone2 {...p} variant="Linear" />;
/* MicOff — slash through mic SVG, matches Lucide MicOff exactly */
export const MicOff = ({ size = 16, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
    <line x1="2" y1="2" x2="22" y2="22"/>
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
    <path d="M5 10v2a7 7 0 0 0 12 4.9"/>
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
  </svg>
);
export const Square = (p) => <Stop {...p} variant="Linear" />;
export const Send = (p) => <Send2 {...p} variant="Linear" />;
export const RotateCcw = (p) => <Refresh {...p} variant="Linear" />;
export const EyeIcon = (p) => <Eye {...p} variant="Linear" />;
export const EyeOff = (p) => <EyeSlash {...p} variant="Linear" />;
export const Check = (p) => <TickCircle {...p} variant="Linear" />;
export const Info = (p) => <InfoCircle {...p} variant="Linear" />;
export const AlertTriangle = (p) => <Warning2 {...p} variant="Linear" />;
export const XSquare = (p) => <CloseSquare {...p} variant="Linear" />;
export const Loader2 = ({ size = 16, className, style }) => (
  <span className={className} style={{ display: "inline-block", width: size, height: size, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.75s linear infinite", ...style }} />
);
export const WifiOff = ({ size = 16, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
    <line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
  </svg>
);
export const AlertCircle = ({ size = 16, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
export const Download = ({ size = 16, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
export const MoreVertical = ({ size = 16, className, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
);
